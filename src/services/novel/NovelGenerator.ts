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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'An unknown error occurred';
}

export class NovelGenerator {
  private static readonly MIN_CHAPTER_LENGTH = 1000;
  private static readonly MAX_CHAPTER_LENGTH = 4000;
  private static readonly MIN_OUTLINE_LENGTH = 1000;
  private static readonly MAX_RETRIES = 3;

  static async generateNovel(
    user_id: string, 
    inputParams: Partial<NovelParameters>, 
    supabaseClient: SupabaseClient
  ): Promise<{ novelId: string }> {
    let novelId = '';
    try {
      const params = validateAndFillDefaults(inputParams);
      Logger.info('Starting novel generation with params:', params);
      
      novelId = await CheckpointManager.initNovel(user_id, params.title || 'Untitled Novel', params, supabaseClient);
      Logger.info(`Initialized novel ${novelId}`);

      // Generate and refine outline
      let outline = await this.generateAndRefineOutline(params, novelId, supabaseClient);

      // Extract and validate chapter count
      const totalChapters = this.extractTotalChapters(outline);
      if (totalChapters < 10 || totalChapters > 150) {
        throw new Error(`Invalid chapter count: ${totalChapters}`);
      }

      await CheckpointManager.setTotalChapters(novelId, totalChapters, supabaseClient);
      Logger.info(`Set total chapters: ${totalChapters}`);

      // Generate chapters
      await this.generateAllChapters(params, outline, totalChapters, novelId, supabaseClient);

      await CheckpointManager.finishNovel(novelId, supabaseClient);
      Logger.info(`Novel generation completed: ${novelId}`);
      return { novelId };

    } catch (error) {
      const errorMsg = getErrorMessage(error);
      Logger.error('Novel generation failed:', error);
      if (novelId) {
        await CheckpointManager.errorState(novelId, errorMsg, supabaseClient)
          .catch(cleanupError => {
            Logger.error('Failed to update error state:', cleanupError);
          });
      }
      throw new Error(`Novel generation failed: ${errorMsg}`);
    }
  }

  private static async generateAndRefineOutline(
    params: NovelParameters,
    novelId: string,
    supabaseClient: SupabaseClient
  ): Promise<string> {
    try {
      // Check for existing outline state
      const existingOutline = await CheckpointManager.getLatestOutline(novelId, supabaseClient);
      if (existingOutline) {
        Logger.info(`Resuming outline generation from version ${existingOutline.version} (${existingOutline.status})`);
        return await this.resumeOutlineGeneration(params, novelId, existingOutline, supabaseClient);
      }

      // Initial outline generation
      Logger.info('Generating initial outline...');
      const outlineIntegration = generateOutlineInstructions(params);
      const initialOutline = await this.generateOutline(params, outlineIntegration);
      await CheckpointManager.storeOutline(novelId, initialOutline, 0, 'initial', supabaseClient);

      // First refinement pass
      Logger.info('First outline refinement pass...');
      const outlinePass1 = await this.refineOutline(params, initialOutline, 1);
      await CheckpointManager.storeOutline(novelId, outlinePass1, 1, 'pass1', supabaseClient);

      // Second refinement pass
      Logger.info('Second outline refinement pass...');
      const finalOutline = await this.refineOutline(params, outlinePass1, 2);
      await CheckpointManager.storeOutline(novelId, finalOutline, 2, 'pass2', supabaseClient);

      // Mark as completed
      await CheckpointManager.storeOutline(novelId, finalOutline, 3, 'completed', supabaseClient);

      return finalOutline;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      Logger.error('Error in outline generation:', error);
      throw new Error(`Outline generation failed: ${errorMsg}`);
    }
  }

  private static async resumeOutlineGeneration(
    params: NovelParameters,
    novelId: string,
    currentState: { content: string; version: number; status: OutlineStatus },
    supabaseClient: SupabaseClient
  ): Promise<string> {
    let currentOutline = currentState.content;
    let currentVersion = currentState.version;

    switch (currentState.status) {
      case 'initial':
        // Resume from first refinement
        Logger.info('Resuming from first refinement pass...');
        currentOutline = await this.refineOutline(params, currentOutline, 1);
        await CheckpointManager.storeOutline(novelId, currentOutline, 1, 'pass1', supabaseClient);
        
        // Continue to second pass
        Logger.info('Continuing to second refinement pass...');
        currentOutline = await this.refineOutline(params, currentOutline, 2);
        await CheckpointManager.storeOutline(novelId, currentOutline, 2, 'pass2', supabaseClient);
        break;

      case 'pass1':
        // Resume from second refinement
        Logger.info('Resuming from second refinement pass...');
        currentOutline = await this.refineOutline(params, currentOutline, 2);
        await CheckpointManager.storeOutline(novelId, currentOutline, 2, 'pass2', supabaseClient);
        break;

      case 'pass2':
        // Already at final version, nothing to do
        Logger.info('Outline already at final version');
        break;

      case 'completed':
        Logger.info('Using completed outline');
        return currentOutline;
    }

    // Mark as completed if we got here through refinement
    if (currentState.status !== 'completed') {
      await CheckpointManager.storeOutline(novelId, currentOutline, 3, 'completed', supabaseClient);
    }

    return currentOutline;
  }

  private static async generateAllChapters(
    params: NovelParameters,
    outline: string,
    totalChapters: number,
    novelId: string,
    supabaseClient: SupabaseClient
  ): Promise<void> {
    const previousChapters: string[] = [];

    for (let chapterNumber = 1; chapterNumber <= totalChapters; chapterNumber++) {
      try {
        Logger.info(`Starting generation of chapter ${chapterNumber}`);
        
        const outlineSegment = this.extractOutlineSegment(outline, chapterNumber);
        if (!outlineSegment) {
          throw new Error(`Missing outline segment for chapter ${chapterNumber}`);
        }

        const chapterContent = await this.generateChapterWithRetries(
          params,
          outlineSegment,
          previousChapters,
          chapterNumber,
          this.MAX_RETRIES
        );

        await CheckpointManager.updateChapter(novelId, chapterNumber, chapterContent, supabaseClient);
        await CheckpointManager.storeDraft(novelId, chapterNumber, 'final', chapterContent, supabaseClient);
        
        previousChapters.push(chapterContent);
        Logger.info(`Completed chapter ${chapterNumber}`);

      } catch (error) {
        const errorMsg = getErrorMessage(error);
        Logger.error(`Error generating chapter ${chapterNumber}:`, error);
        throw new Error(`Chapter ${chapterNumber} generation failed: ${errorMsg}`);
      }
    }
  }

  private static async generateOutline(
    params: NovelParameters,
    integrationNotes: string
  ): Promise<string> {
    let attempts = 0;
    while (attempts < this.MAX_RETRIES) {
      try {
        const prompt = trimInput(outlinePrompt(params, integrationNotes), 20000);
        const outline = await llm.generate({
          prompt,
          max_tokens: 3000,
          temperature: 0.7
        });

        if (!outline || outline.length < this.MIN_OUTLINE_LENGTH) {
          throw new Error('Generated outline is too short');
        }

        return outline;
      } catch (error) {
        attempts++;
        Logger.warn(`Outline generation attempt ${attempts} failed:`, error);
        if (attempts === this.MAX_RETRIES) throw error;
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

    if (!refined || refined.length < this.MIN_OUTLINE_LENGTH) {
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

  private static async generateChapterWithRetries(
    params: NovelParameters,
    outlineSegment: string,
    previousChapters: string[],
    chapterNumber: number,
    maxRetries: number
  ): Promise<string> {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        const chapterContent = await this.generateAndRefineChapter(
          params,
          outlineSegment,
          previousChapters,
          chapterNumber
        );

        if (this.validateChapter(chapterContent)) {
          return chapterContent;
        }
        throw new Error('Chapter validation failed');
      } catch (error) {
        attempts++;
        Logger.warn(`Chapter ${chapterNumber} generation attempt ${attempts} failed:`, error);
        if (attempts === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
      }
    }
    throw new Error(`All generation attempts failed for chapter ${chapterNumber}`);
  }

  private static async generateAndRefineChapter(
    params: NovelParameters,
    outlineSegment: string,
    previousChapters: string[],
    chapterNumber: number
  ): Promise<string> {
    // Generate initial drafts
    const chapterIntegration = generateChapterInstructions(params, chapterNumber);
    const [draftA, draftB] = await Promise.all([
      this.generateChapterDraft(params, outlineSegment, previousChapters, chapterNumber, chapterIntegration),
      this.generateChapterDraft(params, outlineSegment, previousChapters, chapterNumber, chapterIntegration)
    ]);

    // Compare drafts
    const comparison = await llm.generate({
      prompt: trimInput(comparisonPrompt(draftA, draftB), 20000),
      max_tokens: 1500,
      temperature: 0.4
    });

    // Choose the best draft
    let chosenDraft = draftA;
    if (/CHOSEN:\s*Draft B/i.test(comparison)) {
      chosenDraft = draftB;
    }

    // Refine the chosen draft
    const refinementNotes = generateRefinementInstructions(params);
    const refinedOnce = await this.refineChapterDraft(chosenDraft, 1, refinementNotes);
    const finalDraft = await this.refineChapterDraft(refinedOnce, 2, refinementNotes);

    if (!this.validateChapter(finalDraft)) {
      throw new Error('Final draft validation failed');
    }

    return finalDraft;
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

    if (!this.validateChapter(draft)) {
      throw new Error('Draft validation failed');
    }

    return draft;
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
      throw new Error(`Refinement pass ${passNumber} validation failed`);
    }

    return refined;
  }

  private static validateChapter(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    if (content.length < this.MIN_CHAPTER_LENGTH || content.length > this.MAX_CHAPTER_LENGTH) {
      Logger.warn(`Chapter validation failed: length ${content.length} outside bounds ${this.MIN_CHAPTER_LENGTH}-${this.MAX_CHAPTER_LENGTH}`);
      return false;
    }

    // Check for basic structure
    if (!content.split('\n').some(line => line.trim().length > 0)) {
      Logger.warn('Chapter validation failed: no non-empty lines');
      return false;
    }

    return true;
  }
}
