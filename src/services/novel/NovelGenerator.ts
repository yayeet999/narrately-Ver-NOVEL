import { llm } from './LLMClient';
import { validateAndFillDefaults } from './Validation';
import { NovelParameters } from './NovelParameters';
import {
  outlinePrompt,
  chapterDraftPrompt,
  comparisonPrompt,
  refinementPrompt,
  outlineRefinementPrompt,
  chapterRefinementInstructions
} from './PromptTemplates';
import { CheckpointManager } from './CheckpointManager';
import { Logger } from '../utils/Logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { generateOutlineInstructions, generateChapterInstructions, generateRefinementInstructions } from './ParameterIntegration';

function trimInput(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return input.substring(0, maxLength);
}

export class NovelGenerator {
  static async generateNovel(
    user_id: string, 
    inputParams: Partial<NovelParameters>, 
    supabaseClient: SupabaseClient
  ): Promise<{ novelId: string }> {
    try {
      const params = validateAndFillDefaults(inputParams);
      Logger.info('Starting novel generation with params:', params);
      
      const novelId = await CheckpointManager.initNovel(user_id, params.title || 'Untitled Novel', params, supabaseClient);
      Logger.info(`Initialized novel ${novelId}`);

      // Generate initial outline
      let initialOutline: string;
      try {
        Logger.info('Generating initial outline...');
        const outlineIntegration = generateOutlineInstructions(params);
        initialOutline = await this.generateOutline(params, outlineIntegration);
        await CheckpointManager.storeOutline(novelId, initialOutline, supabaseClient);
        Logger.info('Initial outline generated and stored');
      } catch (error) {
        Logger.error('Error generating outline:', error);
        await CheckpointManager.errorState(novelId, 'Failed to generate outline', supabaseClient);
        throw error;
      }

      // Refine outline
      try {
        Logger.info('Refining outline...');
        const outlinePass1 = await this.refineOutline(params, initialOutline, 1);
        const finalOutline = await this.refineOutline(params, outlinePass1, 2);
        await CheckpointManager.storeOutline(novelId, finalOutline, supabaseClient);
        initialOutline = finalOutline; // Use refined outline for chapter generation
        Logger.info('Outline refinement complete');
      } catch (error) {
        Logger.error('Error refining outline:', error);
        await CheckpointManager.errorState(novelId, 'Failed to refine outline', supabaseClient);
        throw error;
      }

      const totalChapters = this.extractTotalChapters(initialOutline);
      if (totalChapters < 10 || totalChapters > 150) {
        throw new Error(`Invalid chapter count: ${totalChapters}`);
      }
      
      await CheckpointManager.setTotalChapters(novelId, totalChapters, supabaseClient);
      Logger.info(`Set total chapters: ${totalChapters}`);

      const previousChapters: string[] = [];
      
      for (let chapterNumber = 1; chapterNumber <= totalChapters; chapterNumber++) {
        try {
          Logger.info(`Starting generation of chapter ${chapterNumber}`);
          
          const outlineSegment = this.extractOutlineSegment(initialOutline, chapterNumber);
          if (!outlineSegment) {
            throw new Error(`Missing outline segment for chapter ${chapterNumber}`);
          }

          // Generate chapter drafts and choose best
          const chapterContent = await this.generateChapterDraftsAndChoose(
            params,
            outlineSegment,
            previousChapters,
            chapterNumber
          );

          // Refine the chosen draft
          const refinedContent = await this.refineChapterContent(
            chapterContent,
            params,
            chapterNumber
          );

          // Validate and store the chapter
          if (!this.validateChapter(refinedContent)) {
            throw new Error(`Chapter ${chapterNumber} validation failed`);
          }

          await CheckpointManager.updateChapter(novelId, chapterNumber, refinedContent, supabaseClient);
          await CheckpointManager.storeDraft(novelId, chapterNumber, 'final', refinedContent, supabaseClient);
          
          previousChapters.push(refinedContent);
          Logger.info(`Completed chapter ${chapterNumber}`);
        } catch (error) {
          Logger.error(`Error generating chapter ${chapterNumber}:`, error);
          await CheckpointManager.errorState(novelId, `Failed at chapter ${chapterNumber}: ${error.message}`, supabaseClient);
          throw error;
        }
      }

      await CheckpointManager.finishNovel(novelId, supabaseClient);
      Logger.info(`Novel generation completed: ${novelId}`);
      return { novelId };

    } catch (error) {
      Logger.error('Novel generation failed:', error);
      throw error;
    }
  }

  private static async generateOutline(
    params: NovelParameters,
    integrationNotes: string
  ): Promise<string> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const prompt = trimInput(outlinePrompt(params, integrationNotes), 20000);
        const outline = await llm.generate({
          prompt,
          max_tokens: 3000,
          temperature: 0.7
        });

        if (!outline || outline.length < 1000) {
          throw new Error('Generated outline is too short');
        }

        return outline;
      } catch (error) {
        attempts++;
        Logger.warn(`Outline generation attempt ${attempts} failed:`, error);
        if (attempts === maxAttempts) throw error;
      }
    }

    throw new Error('All outline generation attempts failed');
  }

  private static async refineOutline(
    params: NovelParameters,
    currentOutline: string,
    passNumber: number
  ): Promise<string> {
    const prompt = trimInput(outlineRefinementPrompt(params, currentOutline, passNumber), 20000);
    const refined = await llm.generate({
      prompt,
      max_tokens: 3000,
      temperature: 0.7
    });

    if (!refined || refined.length < 1000) {
      throw new Error(`Outline refinement pass ${passNumber} failed: insufficient length`);
    }

    return refined;
  }

  private static extractTotalChapters(outline: string): number {
    const chapterMatches = outline.match(/Chapter\s+\d+/gi);
    if (!chapterMatches) {
      throw new Error('No chapters found in outline');
    }
    return chapterMatches.length;
  }

  private static extractOutlineSegment(outline: string, chapterNumber: number): string | null {
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

  private static async generateChapterDraftsAndChoose(
    params: NovelParameters,
    outlineSegment: string,
    previousChapters: string[],
    chapterNumber: number
  ): Promise<string> {
    const chapterIntegration = generateChapterInstructions(params, chapterNumber);
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        // Generate two drafts
        const draftA = await this.generateChapterDraft(
          params,
          outlineSegment,
          previousChapters,
          chapterNumber,
          chapterIntegration
        );

        const draftB = await this.generateChapterDraft(
          params,
          outlineSegment,
          previousChapters,
          chapterNumber,
          chapterIntegration
        );

        // Compare drafts
        const comparison = await llm.generate({
          prompt: trimInput(comparisonPrompt(draftA, draftB), 20000),
          max_tokens: 1500,
          temperature: 0.4
        });

        let chosenDraft: string;

        if (/CHOSEN:\s*Draft A/i.test(comparison)) {
          chosenDraft = draftA;
        } else if (/CHOSEN:\s*Draft B/i.test(comparison)) {
          chosenDraft = draftB;
        } else {
          chosenDraft = draftA.length > draftB.length ? draftA : draftB;
        }

        if (this.validateChapter(chosenDraft)) {
          return chosenDraft;
        }

        throw new Error('Generated drafts failed validation');
      } catch (error) {
        attempts++;
        Logger.warn(`Chapter ${chapterNumber} generation attempt ${attempts} failed:`, error);
        if (attempts === maxAttempts) throw error;
      }
    }

    throw new Error(`All chapter ${chapterNumber} generation attempts failed`);
  }

  private static async generateChapterDraft(
    params: NovelParameters,
    outlineSegment: string,
    previousChapters: string[],
    chapterNumber: number,
    integrationNotes: string
  ): Promise<string> {
    const prompt = trimInput(
      chapterDraftPrompt(
        params,
        outlineSegment,
        previousChapters,
        chapterNumber,
        integrationNotes
      ),
      20000
    );

    const draft = await llm.generate({
      prompt,
      max_tokens: 3000,
      temperature: 0.7
    });

    if (!draft || draft.length < 1000) {
      throw new Error(`Generated chapter ${chapterNumber} is too short`);
    }

    return draft;
  }

  private static async refineChapterContent(
    content: string,
    params: NovelParameters,
    chapterNumber: number
  ): Promise<string> {
    const refinementNotes = generateRefinementInstructions(params);
    
    // First refinement pass
    const firstPass = await this.refineChapterDraft(
      content,
      1,
      refinementNotes
    );

    // Second refinement pass
    return await this.refineChapterDraft(
      firstPass,
      2,
      refinementNotes
    );
  }

  private static async refineChapterDraft(
    chapterContent: string,
    passNumber: number,
    refinementNotes: string
  ): Promise<string> {
    const instructions = chapterRefinementInstructions(passNumber);
    const prompt = trimInput(
      refinementPrompt(chapterContent, instructions, refinementNotes),
      20000
    );

    const refined = await llm.generate({
      prompt,
      max_tokens: 3000,
      temperature: 0.7
    });

    if (!this.validateChapter(refined)) {
      throw new Error(`Refinement pass ${passNumber} failed validation`);
    }

    return refined;
  }

  private static validateChapter(content: string): boolean {
    if (!content || content.length < 1000) {
      Logger.warn('Chapter validation failed: content too short');
      return false;
    }

    // Add additional validation as needed
    return true;
  }
}
