import { Logger } from '../utils/Logger';
import { SupabaseClient } from '@supabase/supabase-js';

export type OutlineStatus = 'initial' | 'pass1' | 'pass2' | 'completed';

export class CheckpointManager {
  static async initNovel(user_id: string, title: string, parameters: any, supabaseClient: SupabaseClient): Promise<string> {
    const { data, error } = await supabaseClient
      .from('novels')
      .insert([{ user_id, title, parameters }])
      .select('id')
      .single();

    if (error) {
      Logger.error('Error initializing novel:', error);
      throw error;
    }

    const novelId = data.id;

    const { error: stateError } = await supabaseClient
      .from('novel_generation_states')
      .insert([{ 
        novel_id: novelId, 
        status: 'in_progress',
        outline_version: 0,
        outline_status: 'initial'
      }]);

    if (stateError) {
      Logger.error('Error init novel state:', stateError);
      throw stateError;
    }

    Logger.info(`Initialized novel ${novelId}`);
    return novelId;
  }

  static async storeOutline(
    novelId: string, 
    outline: string, 
    version: number,
    status: OutlineStatus,
    supabaseClient: SupabaseClient
  ): Promise<void> {
    const { error } = await supabaseClient
      .from('temp_novel_data')
      .upsert(
        {
          novel_id: novelId,
          data_type: `outline_v${version}`,
          content: outline,
          metadata: { 
            version,
            status,
            timestamp: new Date().toISOString()
          }
        },
        { onConflict: 'novel_id,data_type' }
      );

    if (error) {
      Logger.error(`Error storing outline v${version} ${novelId}:`, error);
      throw error;
    }
    Logger.info(`Stored outline v${version} for ${novelId}`);
  }

  static async getLatestOutline(novelId: string, supabaseClient: SupabaseClient): Promise<{ content: string; version: number; status: OutlineStatus } | null> {
    const { data, error } = await supabaseClient
      .from('novel_generation_states')
      .select('outline_version, outline_status')
      .eq('novel_id', novelId)
      .single();

    if (error) {
      Logger.error(`Error getting outline state ${novelId}:`, error);
      throw error;
    }

    if (!data || data.outline_version === null) {
      return null;
    }

    const { data: outlineData, error: outlineError } = await supabaseClient
      .from('temp_novel_data')
      .select('content, metadata')
      .eq('novel_id', novelId)
      .eq('data_type', `outline_v${data.outline_version}`)
      .single();

    if (outlineError) {
      Logger.error(`Error getting outline content ${novelId}:`, outlineError);
      throw outlineError;
    }

    return {
      content: outlineData.content,
      version: data.outline_version,
      status: data.outline_status as OutlineStatus
    };
  }

  static async getAllOutlineVersions(novelId: string, supabaseClient: SupabaseClient): Promise<Array<{ content: string; version: number; status: OutlineStatus }>> {
    const { data, error } = await supabaseClient
      .from('temp_novel_data')
      .select('content, metadata')
      .eq('novel_id', novelId)
      .like('data_type', 'outline_v%')
      .order('metadata->version', { ascending: true });

    if (error) {
      Logger.error(`Error getting all outlines ${novelId}:`, error);
      throw error;
    }

    return data.map(item => ({
      content: item.content,
      version: parseInt(item.metadata.version),
      status: item.metadata.status as OutlineStatus
    }));
  }

  static async setTotalChapters(novelId: string, totalChapters: number, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novel_generation_states')
      .update({ total_chapters: totalChapters })
      .eq('novel_id', novelId);

    if (error) {
      Logger.error(`Error setting total chapters ${novelId}:`, error);
      throw error;
    }

    Logger.info(`Set total chapters ${totalChapters} for ${novelId}`);
  }

  static async updateChapter(novelId: string, chapterNumber: number, content: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novel_chapters')
      .insert([{ novel_id: novelId, chapter_number: chapterNumber, content }]);

    if (error) {
      Logger.error(`Error updating chapter ${chapterNumber} for ${novelId}:`, error);
      throw error;
    }

    const { error: stateError } = await supabaseClient
      .from('novel_generation_states')
      .update({ current_chapter: chapterNumber })
      .eq('novel_id', novelId);

    if (stateError) {
      Logger.error(`Error updating state ${novelId}:`, stateError);
      throw stateError;
    }

    const { error: tempError } = await supabaseClient
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

  static async storeDraft(novelId: string, chapterNumber: number, draftType: string, content: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
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

  static async cleanupTempData(novelId: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('temp_novel_data')
      .delete()
      .eq('novel_id', novelId);

    if (error) {
      Logger.error(`Error cleaning temp data ${novelId}:`, error);
    } else {
      Logger.info(`Cleaned temp data for ${novelId}`);
    }
  }

  static async finishNovel(novelId: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novel_generation_states')
      .update({ status: 'completed' })
      .eq('novel_id', novelId);

    if (error) {
      Logger.error(`Error finishing novel ${novelId}:`, error);
      throw error;
    }

    await this.cleanupTempData(novelId, supabaseClient);
    Logger.info(`Novel completed ${novelId}`);
  }

  static async errorState(novelId: string, message: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novel_generation_states')
      .update({ status: 'error', error_message: message })
      .eq('novel_id', novelId);

    if (error) {
      Logger.error(`Error marking error state ${novelId}:`, error);
      throw error;
    }

    await this.cleanupTempData(novelId, supabaseClient);
    Logger.warn(`Novel errored ${novelId}: ${message}`);
  }
} 