import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Logger } from '../../../../services/utils/Logger';
import { ApiResponse, ChapterData } from '../shared/types';
import { ValidationError, createCheckpointContext } from '../shared/validation';
import { StoryParameterProcessor } from '../../../../services/novel/StoryParameterProcessor';
import { llm } from '../../../../services/novel/LLMClient';
import { refinementPrompt, chapterRefinementInstructions } from '../../../../services/novel/PromptTemplates';
import { generateRefinementInstructions } from '../../../../services/novel/ParameterIntegration';

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
    
    // Get the novel data and chapter info
    const { data: novelData, error: novelError } = await supabaseClient
      .from('novels')
      .select('chapters_data, current_chapter')
      .eq('id', context.novelId)
      .single();

    if (novelError || !novelData?.chapters_data?.chapters) {
      throw new Error('Failed to fetch novel data');
    }

    const currentChapter = novelData.current_chapter;
    const chapterData = novelData.chapters_data.chapters.find(
      (ch: ChapterData) => ch.chapter_number === currentChapter
    );

    if (!chapterData || chapterData.status !== 'initial') {
      throw new Error(`Invalid chapter state for revision: ${currentChapter}`);
    }

    // Process parameters for guidance
    const processedParams = StoryParameterProcessor.processParameters(context.parameters);
    Logger.info(`Processing first revision for chapter ${currentChapter}`);

    // Generate revision
    let attempts = 0;
    let revisedContent: string | null = null;

    while (attempts < MAX_RETRIES && !revisedContent) {
      try {
        const refinementNotes = generateRefinementInstructions(context.parameters);
        const instructions = chapterRefinementInstructions(1);
        const prompt = refinementPrompt(
          chapterData.content,
          instructions,
          refinementNotes
        ).substring(0, 20000); // Trim to max length

        const result = await llm.generate({
          prompt,
          max_tokens: 3000,
          temperature: 0.7
        });

        if (validateChapter(result)) {
          revisedContent = result;
        } else {
          throw new Error('Generated revision failed validation');
        }
      } catch (error) {
        attempts++;
        Logger.warn(`Chapter revision attempt ${attempts} failed:`, error);
        if (attempts === MAX_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!revisedContent) {
      throw new Error('Failed to generate chapter revision after multiple attempts');
    }

    // Update chapter with revision
    const updatedChapters = novelData.chapters_data.chapters.map((ch: ChapterData) =>
      ch.chapter_number === currentChapter
        ? {
            ...ch,
            content: revisedContent,
            version: 1,
            status: 'revision_one',
            timestamp: new Date().toISOString()
          }
        : ch
    );

    const { error: updateError } = await supabaseClient
      .from('novels')
      .update({
        chapters_data: {
          ...novelData.chapters_data,
          chapters: updatedChapters
        }
      })
      .eq('id', context.novelId);

    if (updateError) {
      throw updateError;
    }

    Logger.info(`First revision completed for chapter ${currentChapter}`);
    return res.status(200).json({
      success: true,
      novelId: context.novelId
    });

  } catch (error) {
    Logger.error('Error in chapter revision:', error);
    
    const statusCode = error instanceof ValidationError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
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