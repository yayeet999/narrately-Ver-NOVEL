import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Logger } from '../../../../services/utils/Logger';
import { ApiResponse, ChapterData } from '../shared/types';
import { ValidationError, createCheckpointContext } from '../shared/validation';
import { StoryParameterProcessor } from '../../../../services/novel/StoryParameterProcessor';
import { llm } from '../../../../services/novel/LLMClient';
import { chapterDraftPrompt } from '../../../../services/novel/PromptTemplates';
import { generateChapterInstructions } from '../../../../services/novel/ParameterIntegration';

const MIN_CHAPTER_LENGTH = 1000;
const MAX_CHAPTER_LENGTH = 4000;
const MAX_RETRIES = 3;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Validate request and create context
    const context = await createCheckpointContext(req, supabaseClient);
    
    // Get the outline and current chapter info
    const { data: novelData, error: novelError } = await supabaseClient
      .from('novels')
      .select('outline_data, current_chapter, total_chapters, chapters_data')
      .eq('id', context.novelId)
      .single();

    if (novelError || !novelData?.outline_data?.current) {
      throw new Error('Failed to fetch novel data');
    }

    const currentChapter = (novelData.current_chapter || 0) + 1;
    if (currentChapter > novelData.total_chapters) {
      throw new Error('All chapters have been generated');
    }

    // Extract outline segment for current chapter
    const outlineSegment = extractOutlineSegment(novelData.outline_data.current, currentChapter);
    if (!outlineSegment) {
      throw new Error(`Missing outline segment for chapter ${currentChapter}`);
    }

    // Get previous chapters for context
    const previousChapters = novelData.chapters_data?.chapters || [];

    // Process parameters for guidance
    const processedParams = StoryParameterProcessor.processParameters(context.parameters);
    Logger.info(`Processing chapter ${currentChapter} generation`);

    // Generate chapter
    let attempts = 0;
    let chapterContent: string | null = null;

    while (attempts < MAX_RETRIES && !chapterContent) {
      try {
        const chapterIntegration = generateChapterInstructions(context.parameters, currentChapter);
        const prompt = chapterDraftPrompt(
          context.parameters,
          outlineSegment,
          previousChapters.map((ch: ChapterData) => ch.content),
          currentChapter,
          chapterIntegration
        ).substring(0, 20000); // Trim to max length

        const result = await llm.generate({
          prompt,
          max_tokens: 3000,
          temperature: 0.7
        });

        if (validateChapter(result)) {
          chapterContent = result;
        } else {
          throw new Error('Generated chapter failed validation');
        }
      } catch (error) {
        attempts++;
        Logger.warn(`Chapter generation attempt ${attempts} failed:`, error);
        if (attempts === MAX_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!chapterContent) {
      throw new Error('Failed to generate chapter after multiple attempts');
    }

    // Update novel with new chapter
    const updatedChapters = [
      ...(novelData.chapters_data?.chapters || []),
      {
        chapter_number: currentChapter,
        content: chapterContent,
        version: 0,
        status: 'initial',
        timestamp: new Date().toISOString()
      }
    ];

    const { error: updateError } = await supabaseClient
      .from('novels')
      .update({
        current_chapter: currentChapter,
        chapters_data: {
          ...novelData.chapters_data,
          chapters: updatedChapters
        }
      })
      .eq('id', context.novelId);

    if (updateError) {
      throw updateError;
    }

    Logger.info(`Chapter ${currentChapter} generated for novel ${context.novelId}`);
    return res.status(200).json({
      success: true,
      novelId: context.novelId
    });

  } catch (error) {
    Logger.error('Error in chapter generation:', error);
    
    const statusCode = error instanceof ValidationError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}

function extractOutlineSegment(outline: string, chapterNumber: number): string | null {
  const lines = outline.split('\n');
  const chapterPattern = new RegExp(`Chapter\\s+${chapterNumber}\\b`, 'i');
  const startIndex = lines.findIndex(line => chapterPattern.test(line));

  if (startIndex < 0) return null;

  let endIndex = lines.findIndex((line, index) => 
    index > startIndex && /Chapter\s+\d+/i.test(line)
  );

  if (endIndex === -1) endIndex = lines.length;

  return lines.slice(startIndex, endIndex).join('\n');
}

function validateChapter(content: string | null): content is string {
  if (!content || typeof content !== 'string') {
    return false;
  }

  if (content.length < MIN_CHAPTER_LENGTH || content.length > MAX_CHAPTER_LENGTH) {
    Logger.warn(`Chapter validation failed: length ${content.length} outside bounds ${MIN_CHAPTER_LENGTH}-${MAX_CHAPTER_LENGTH}`);
    return false;
  }

  if (!content.split('\n').some(line => line.trim().length > 0)) {
    Logger.warn('Chapter validation failed: no non-empty lines');
    return false;
  }

  return true;
} 