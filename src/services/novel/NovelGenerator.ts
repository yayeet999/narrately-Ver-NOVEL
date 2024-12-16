import { llm } from './LLMClient';
import { validateAndFillDefaults } from './Validation';
import { NovelParameters } from './NovelParameters';
import { outlinePrompt, chapterDraftPrompt, comparisonPrompt, refinementPrompt } from './PromptTemplates';
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
     const outlineIntegration = generateOutlineInstructions(params);
     const outline = await this.generateOutline(params, outlineIntegration);
     if (!outline || outline.length < 1000) {
       await CheckpointManager.errorState(novelId, 'Insufficient outline.');
       throw new Error('Outline failed.');
     }

     await CheckpointManager.storeOutline(novelId, outline);
     const totalChapters = this.extractTotalChapters(outline);
     if (totalChapters < 10 || totalChapters > 150) {
       await CheckpointManager.errorState(novelId, 'Invalid chapter count.');
       throw new Error('Chapter count invalid.');
     }

     await CheckpointManager.setTotalChapters(novelId, totalChapters);
     let previousChapters: string[] = [];

     for (let chapterNumber = 1; chapterNumber <= totalChapters; chapterNumber++) {
       const outlineSegment = this.extractOutlineSegment(outline, chapterNumber);
       if (!outlineSegment) {
         await CheckpointManager.errorState(novelId, `Missing outline seg for ch${chapterNumber}`);
         throw new Error(`Outline segment missing ch${chapterNumber}`);
       }

       const chapterIntegration = generateChapterInstructions(params, chapterNumber);
       const finalChapterText = await this.generateChapterWithRefinement(params, outlineSegment, previousChapters, chapterNumber, chapterIntegration);
       if (!this.validateChapter(finalChapterText)) {
         await CheckpointManager.errorState(novelId, `Validation fail ch${chapterNumber}`);
         throw new Error(`Chapter ${chapterNumber} invalid`);
       }

       await CheckpointManager.updateChapter(novelId, chapterNumber, finalChapterText);
       await CheckpointManager.storeDraft(novelId, chapterNumber, 'final', finalChapterText);
       previousChapters.push(finalChapterText);
       Logger.info(`Ch${chapterNumber} done for ${novelId}`);
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
       Logger.info('Generating outline...');
       const prompt = trimInput(outlinePrompt(params, integrationNotes), 20000);
       const outline = await llm.generate({ prompt, max_tokens: 3000, temperature: 0.7 });
       if (outline.length > 1000) {
         Logger.info('Outline generated.');
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

 static extractTotalChapters(outline: string): number {
   const match = outline.match(/(\d+)\s+chapters?|total\s+of\s+(\d+)\s+chapters/i);
   if (match) {
     for (let i = 1; i < match.length; i++) {
       if (match[i]) return parseInt(match[i],10);
     }
   }
   Logger.warn('No chapter count found, default 20');
   return 20;
 }

 static extractOutlineSegment(outline: string, chapterNumber: number): string|null {
   const lines = outline.split('\n');
   const chapLineIndex = lines.findIndex(l=>new RegExp(`Chapter\\s+${chapterNumber}\\b`, 'i').test(l));
   if (chapLineIndex<0) return null;
   const nextChapIndex = lines.findIndex((l,i)=> i>chapLineIndex && /Chapter\s+\d+/i.test(l));
   return lines.slice(chapLineIndex, nextChapIndex>0? nextChapIndex: lines.length).join('\n');
 }

 static async generateChapterWithRefinement(params: NovelParameters, outlineSegment: string, previousChapters: string[], chapterNumber: number, integrationNotes: string): Promise<string> {
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
         const instructionsMatch = comparison.match(/Refined Version Needed[\s\S]*?(?=$)/i);
         const instructions = instructionsMatch ? instructionsMatch[0] : 'Improve narrative flow.';
         const refinementNotes = generateRefinementInstructions(params);
         const refined = await llm.generate({
           prompt: trimInput(refinementPrompt(draftA.length>draftB.length?draftA:draftB, instructions, refinementNotes),20000),
           max_tokens:3000, temperature:0.7
         });
         chosenDraft = refined;
       } else {
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

 static validateChapter(chapterContent: string): boolean {
   if (!chapterContent || chapterContent.length<1000) {
     Logger.warn('Chapter validation fail: too short.');
     return false;
   }
   return true;
 }
} 