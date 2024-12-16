import { supabase } from '../../integrations/supabase/client';
import { Logger } from '../utils/Logger';

export class CheckpointManager {
  static async initNovel(user_id: string, title: string, parameters: any): Promise<string> {
    const { data, error } = await supabase
      .from('novels')
      .insert([{ user_id, title, parameters }])
      .select('id')
      .single();

    if (error) {
      Logger.error('Error initializing novel:', error);
      throw error;
    }

    const novelId = data.id;

    const { error: stateError } = await supabase
      .from('novel_generation_states')
      .insert([{ novel_id: novelId, status: 'in_progress' }]);

    if (stateError) {
      Logger.error('Error init novel state:', stateError);
      throw stateError;
    }

    Logger.info(`Initialized novel ${novelId}`);
    return novelId;
  }

  static async setTotalChapters(novelId: string, totalChapters: number): Promise<void> {
    const { error } = await supabase
      .from('novel_generation_states')
      .update({ total_chapters: totalChapters })
      .eq('novel_id', novelId);

    if (error) {
      Logger.error(`Error setting total chapters ${novelId}:`, error);
      throw error;
    }

    Logger.info(`Set total chapters ${totalChapters} for ${novelId}`);
  }

  static async updateChapter(novelId: string, chapterNumber: number, content: string): Promise<void> {
    const { error } = await supabase
      .from('novel_chapters')
      .insert([{ novel_id: novelId, chapter_number: chapterNumber, content }]);

    if (error) {
      Logger.error(`Error updating chapter ${chapterNumber} for ${novelId}:`, error);
      throw error;
    }

    const { error: stateError } = await supabase
      .from('novel_generation_states')
      .update({ current_chapter: chapterNumber })
      .eq('novel_id', novelId);

    if (stateError) {
      Logger.error(`Error updating state ${novelId}:`, stateError);
      throw stateError;
    }

    const { error: tempError } = await supabase
      .from('temp_novel_data')
      .upsert(
        {
          novel_id: novelId,
          data_type: `chapter_${chapterNumber}_content`,
          content: content,
          metadata: { chapter_number: chapterNumber }
        },
        { onConflict: 'novel_id,data_type' }
      );

    if (tempError) {
      Logger.error(`Error storing temp data chapter ${chapterNumber} ${novelId}:`, tempError);
      throw tempError;
    }

    Logger.info(`Updated Chapter ${chapterNumber} for ${novelId}`);
  }

  static async storeOutline(novelId: string, outline: string): Promise<void> {
    const { error } = await supabase
      .from('temp_novel_data')
      .upsert(
        {
          novel_id: novelId,
          data_type: 'outline',
          content: outline,
          metadata: {}
        },
        { onConflict: 'novel_id,data_type' }
      );

    if (error) {
      Logger.error(`Error storing outline ${novelId}:`, error);
      throw error;
    }
    Logger.info(`Stored outline for ${novelId}`);
  }

  static async storeDraft(novelId: string, chapterNumber: number, draftType: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('temp_novel_data')
      .upsert(
        {
          novel_id: novelId,
          data_type: `chapter_${chapterNumber}_${draftType}`,
          content: content,
          metadata: { chapter_number: chapterNumber, draft_type: draftType }
        },
        { onConflict: 'novel_id,data_type' }
      );

    if (error) {
      Logger.error(`Error storing ${draftType} for Ch${chapterNumber} ${novelId}:`, error);
      throw error;
    }
    Logger.info(`Stored ${draftType} for Chapter ${chapterNumber} in ${novelId}`);
  }

  static async cleanupTempData(novelId: string): Promise<void> {
    const { error } = await supabase
      .from('temp_novel_data')
      .delete()
      .eq('novel_id', novelId);

    if (error) {
      Logger.error(`Error cleaning temp data ${novelId}:`, error);
    } else {
      Logger.info(`Cleaned temp data for ${novelId}`);
    }
  }

  static async finishNovel(novelId: string): Promise<void> {
    const { error } = await supabase
      .from('novel_generation_states')
      .update({ status: 'completed' })
      .eq('novel_id', novelId);

    if (error) {
      Logger.error(`Error finishing novel ${novelId}:`, error);
      throw error;
    }

    await this.cleanupTempData(novelId);
    Logger.info(`Novel completed ${novelId}`);
  }

  static async errorState(novelId: string, message: string): Promise<void> {
    const { error } = await supabase
      .from('novel_generation_states')
      .update({ status: 'error', error_message: message })
      .eq('novel_id', novelId);

    if (error) {
      Logger.error(`Error marking error state ${novelId}:`, error);
      throw error;
    }

    await this.cleanupTempData(novelId);
    Logger.warn(`Novel errored ${novelId}: ${message}`);
  }
} 