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
import { generateOutlineInstructions, generateChapterInstructions, generateRefinementInstructions } from './ParameterIntegration';

function trimInput(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return input.substring(0, maxLength);
}

export class NovelGenerator {
  static async generateNovel(user_id: string, inputParams: Partial<NovelParameters>): Promise<{ novelId: string }> {
    const params = validateAndFillDefaults(inputParams);
    const novelId = await CheckpointManager.initNovel(user_id, params.title || 'Untitled Novel', params);

    try {
      // Enhanced Workflow Steps

      // 1. Generate initial outline
      const outlineIntegration = generateOutlineInstructions(params);
      const initialOutline = await this.generateOutline(params, outlineIntegration);
      if (!initialOutline || initialOutline.length < 1000) {
        await CheckpointManager.errorState(novelId, 'Insufficient outline.');
        throw new Error('Outline failed.');
      }

      // 2. Outline Enhancement Pass #1
      const outlineAfterPass1 = await this.refineOutline(params, initialOutline, 1);

      // 3. Outline Enhancement Pass #2
      const finalOutline = await this.refineOutline(params, outlineAfterPass1, 2);

      await CheckpointManager.storeOutline(novelId, finalOutline);

      // Extract total chapters
      const totalChapters = this.extractTotalChapters(finalOutline);
      if (totalChapters < 10 || totalChapters > 150) {
        await CheckpointManager.errorState(novelId, 'Invalid chapter count.');
        throw new Error('Chapter count invalid.');
      }

      await CheckpointManager.setTotalChapters(novelId, totalChapters);
      let previousChapters: string[] = [];

      // Generate each chapter with multi-draft and refinement passes
      for (let chapterNumber = 1; chapterNumber <= totalChapters; chapterNumber++) {
        const outlineSegment = this.extractOutlineSegment(finalOutline, chapterNumber);
        if (!outlineSegment) {
          await CheckpointManager.errorState(novelId, `Missing outline segment for chapter ${chapterNumber}`);
          throw new Error(`Outline segment missing for chapter ${chapterNumber}`);
        }

        const chapterIntegration = generateChapterInstructions(params, chapterNumber);
        const chosenDraft = await this.generateChapterDraftsAndChoose(params, outlineSegment, previousChapters, chapterNumber, chapterIntegration);

        // After choosing final draft, perform two refinement passes
        const refinementNotes = generateRefinementInstructions(params);
        const refinedOnce = await this.refineChapterDraft(chosenDraft, 1, refinementNotes);
        const refinedTwice = await this.refineChapterDraft(refinedOnce, 2, refinementNotes);

        // Validate final chapter
        if (!this.validateChapter(refinedTwice)) {
          await CheckpointManager.errorState(novelId, `Validation fail chapter ${chapterNumber}`);
          throw new Error(`Chapter ${chapterNumber} invalid`);
        }

        await CheckpointManager.updateChapter(novelId, chapterNumber, refinedTwice);
        await CheckpointManager.storeDraft(novelId, chapterNumber, 'final', refinedTwice);
        previousChapters.push(refinedTwice);
        Logger.info(`Chapter ${chapterNumber} done for ${novelId}`);
      }

      await CheckpointManager.finishNovel(novelId);
      Logger.info(`Novel complete ${novelId}`);
      return { novelId };
    } catch (e: any) {
      Logger.error(`Novel gen fail ${novelId}:`, e);
      throw e;
    }
  }

  static async generateOutline(params: NovelParameters, integrationNotes: string): Promise<string> {
    let retries = 0;
    while (retries < 3) {
      try {
        Logger.info('Generating initial outline...');
        const prompt = trimInput(outlinePrompt(params, integrationNotes), 20000);
        const outline = await llm.generate({ prompt, max_tokens: 3000, temperature: 0.7 });
        if (outline.length > 1000) {
          Logger.info('Initial outline generated.');
          return outline;
        }
        throw new Error('Outline too short.');
      } catch (error: any) {
        retries++;
        Logger.warn(`Outline attempt ${retries} fail: ${error.message}`);
        if (retries === 3) throw new Error(`Outline fail: ${error.message}`);
      }
    }
    throw new Error('Outline generation failed.');
  }

  static async refineOutline(params: NovelParameters, currentOutline: string, passNumber: number): Promise<string> {
    Logger.info(`Refining outline (pass ${passNumber})...`);
    const prompt = trimInput(outlineRefinementPrompt(params, currentOutline, passNumber), 20000);
    const refined = await llm.generate({ prompt, max_tokens: 3000, temperature: 0.7 });

    if (refined.length > 1000) {
      Logger.info(`Outline refinement pass ${passNumber} complete.`);
      return refined;
    }
    throw new Error(`Outline refinement pass ${passNumber} failed: insufficient length`);
  }

  static extractTotalChapters(outline: string): number {
    const match = outline.match(/(\d+)\s+chapters?|total\s+of\s+(\d+)\s+chapters/i);
    if (match) {
      for (let i = 1; i < match.length; i++) {
        if (match[i]) return parseInt(match[i],10);
      }
    }
    Logger.warn('No chapter count found, defaulting to 20');
    return 20;
  }

  static extractOutlineSegment(outline: string, chapterNumber: number): string|null {
    const lines = outline.split('\n');
    const chapLineIndex = lines.findIndex(l=>new RegExp(`Chapter\\s+${chapterNumber}\\b`, 'i').test(l));
    if (chapLineIndex<0) return null;
    const nextChapIndex = lines.findIndex((l,i)=> i>chapLineIndex && /Chapter\s+\d+/i.test(l));
    return lines.slice(chapLineIndex, nextChapIndex>0? nextChapIndex: lines.length).join('\n');
  }

  static async generateChapterDraftsAndChoose(params: NovelParameters, outlineSegment: string, previousChapters: string[], chapterNumber: number, integrationNotes: string): Promise<string> {
    let attempts = 0;
    while (attempts<3) {
      try {
        Logger.info(`Ch${chapterNumber} Draft A...`);
        const draftA = await llm.generate({
          prompt: trimInput(chapterDraftPrompt(params, outlineSegment, previousChapters, chapterNumber, integrationNotes), 20000),
          max_tokens:3000, temperature:0.7
        });

        Logger.info(`Ch${chapterNumber} Draft B...`);
        const draftB = await llm.generate({
          prompt: trimInput(chapterDraftPrompt(params, outlineSegment, previousChapters, chapterNumber, integrationNotes), 20000),
          max_tokens:3000, temperature:0.7
        });

        Logger.info(`Ch${chapterNumber} comparing...`);
        const comparison = await llm.generate({
          prompt: trimInput(comparisonPrompt(draftA, draftB),20000),
          max_tokens:1500, temperature:0.4
        });

        let chosenDraft = '';
        if (/CHOSEN:\s*Draft A/i.test(comparison)) {
          chosenDraft = draftA;
        } else if (/CHOSEN:\s*Draft B/i.test(comparison)) {
          chosenDraft = draftB;
        } else if (/CHOSEN:\s*Refined Version Needed/i.test(comparison)) {
          Logger.info(`Refine needed Ch${chapterNumber}`);
          // Extract improvement instructions from comparison text
          const instructionsMatch = comparison.match(/Refined Version Needed[\s\S]*?(?=$)/i);
          const instructions = instructionsMatch ? instructionsMatch[0] : 'Improve narrative flow.';
          const refinementNotes = generateRefinementInstructions(params);
          const refined = await llm.generate({
            prompt: trimInput(refinementPrompt(draftA.length>draftB.length?draftA:draftB, instructions, refinementNotes),20000),
            max_tokens:3000, temperature:0.7
          });
          chosenDraft = refined;
        } else {
          // Default to draftA if no clear choice
          chosenDraft = draftA;
        }

        if (!this.validateChapter(chosenDraft)) throw new Error(`Validation fail ch${chapterNumber}`);
        return chosenDraft;
      } catch (error:any) {
        attempts++;
        Logger.warn(`Ch${chapterNumber} attempt ${attempts} fail: ${error.message}`);
        if (attempts===3) throw new Error(`Ch${chapterNumber} fail: ${error.message}`);
      }
    }
    throw new Error('Chapter gen fail.');
  }

  static async refineChapterDraft(chapterContent: string, passNumber: number, refinementNotes: string): Promise<string> {
    Logger.info(`Refinement pass ${passNumber} for chapter...`);
    const instructions = chapterRefinementInstructions(passNumber);
    const refined = await llm.generate({
      prompt: trimInput(refinementPrompt(chapterContent, instructions, refinementNotes),20000),
      max_tokens:3000, temperature:0.7
    });

    if (this.validateChapter(refined)) {
      Logger.info(`Refinement pass ${passNumber} complete.`);
      return refined;
    }
    throw new Error(`Refinement pass ${passNumber} failed: invalid chapter`);
  }

  static validateChapter(chapterContent: string): boolean {
    if (!chapterContent || chapterContent.length<1000) {
      Logger.warn('Chapter validation fail: too short.');
      return false;
    }
    return true;
  }
} 