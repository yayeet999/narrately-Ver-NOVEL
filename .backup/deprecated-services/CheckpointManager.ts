import { Logger } from '../utils/Logger';
import { SupabaseClient } from '@supabase/supabase-js';

export type OutlineStatus = 'initial' | 'pass1' | 'pass2' | 'completed';

interface NovelData {
  outline_data: {
    current: string | null;
    iterations: Array<{
      content: string;
      timestamp: string;
    }>;
  };
  chapters: Array<{
    number: number;
    content: string;
  }>;
  temp_data: Record<string, any>;
}

export class CheckpointManager {
  static async initNovel(user_id: string, title: string, parameters: any, supabaseClient: SupabaseClient): Promise<string> {
    const { data, error } = await supabaseClient
      .from('novels')
      .insert([{
        user_id,
        title,
        parameters,
        generation_status: 'in_progress',
        outline_status: 'initial',
        outline_version: 0,
        outline_data: {
          current: null,
          iterations: []
        },
        chapters: [],
        temp_data: {}
      }])
      .select('id')
      .single();

    if (error) {
      Logger.error('Error initializing novel:', error);
      throw error;
    }

    Logger.info(`Initialized novel ${data.id}`);
    return data.id;
  }

  static async storeOutline(
    novelId: string,
    outline: string,
    version: number,
    status: OutlineStatus,
    supabaseClient: SupabaseClient
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const { error } = await supabaseClient
      .from('novels')
      .update({
        outline_status: status,
        outline_version: version,
        outline_data: {
          current: outline,
          iterations: [{
            content: outline,
            timestamp
          }]
        }
      })
      .eq('id', novelId);

    if (error) {
      Logger.error(`Error storing outline v${version} ${novelId}:`, error);
      throw error;
    }
    Logger.info(`Stored outline v${version} for ${novelId}`);
  }

  static async getLatestOutline(novelId: string, supabaseClient: SupabaseClient): Promise<{ content: string; version: number; status: OutlineStatus } | null> {
    const { data, error } = await supabaseClient
      .from('novels')
      .select('outline_data, outline_version, outline_status')
      .eq('id', novelId)
      .single();

    if (error) {
      Logger.error(`Error getting outline state ${novelId}:`, error);
      throw error;
    }

    if (!data?.outline_data?.current) {
      return null;
    }

    return {
      content: data.outline_data.current,
      version: data.outline_version,
      status: data.outline_status
    };
  }

  static async getAllOutlineVersions(novelId: string, supabaseClient: SupabaseClient): Promise<Array<{ content: string; version: number; status: OutlineStatus }>> {
    const { data, error } = await supabaseClient
      .from('novels')
      .select('outline_data, outline_version, outline_status')
      .eq('id', novelId)
      .single();

    if (error) {
      Logger.error(`Error getting all outlines ${novelId}:`, error);
      throw error;
    }

    return (data?.outline_data?.iterations || []).map((item: { content: string; timestamp: string }, index: number) => ({
      content: item.content,
      version: index,
      status: index === data.outline_version ? data.outline_status : 'initial'
    }));
  }

  static async setTotalChapters(novelId: string, totalChapters: number, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novels')
      .update({
        total_chapters: totalChapters,
        current_chapter: 0
      })
      .eq('id', novelId);

    if (error) {
      Logger.error(`Error setting total chapters ${novelId}:`, error);
      throw error;
    }
  }

  static async updateChapter(novelId: string, chapterNumber: number, content: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .rpc('upsert_chapter', {
        novel_id: novelId,
        chapter_number: chapterNumber,
        chapter_content: content
      });

    if (error) {
      Logger.error(`Error updating chapter ${chapterNumber} ${novelId}:`, error);
      throw error;
    }

    // Update current chapter count
    await supabaseClient
      .from('novels')
      .update({
        current_chapter: chapterNumber
      })
      .eq('id', novelId);

    Logger.info(`Updated chapter ${chapterNumber} in ${novelId}`);
  }

  static async finishNovel(novelId: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novels')
      .update({ generation_status: 'completed' })
      .eq('id', novelId);

    if (error) {
      Logger.error(`Error finishing novel ${novelId}:`, error);
      throw error;
    }

    Logger.info(`Novel completed ${novelId}`);
  }

  static async errorState(novelId: string, message: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novels')
      .update({
        generation_status: 'error',
        error_message: message
      })
      .eq('id', novelId);

    if (error) {
      Logger.error(`Error marking error state ${novelId}:`, error);
      throw error;
    }

    Logger.warn(`Novel errored ${novelId}: ${message}`);
  }
} 