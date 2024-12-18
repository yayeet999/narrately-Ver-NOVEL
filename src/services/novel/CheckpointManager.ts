import { Logger } from '../utils/Logger';
import { SupabaseClient } from '@supabase/supabase-js';

export type OutlineStatus = 'initial' | 'pass1' | 'pass2' | 'completed';

interface NovelContent {
  outline: {
    version: number;
    status: OutlineStatus;
    current: string | null;
    iterations: Array<{
      version: number;
      content: string;
      status: OutlineStatus;
      timestamp: string;
    }>;
  };
  chapters: Array<{
    number: number;
    content: string | null;
    timestamp?: string;
    drafts: Array<{
      version: string;
      content: string;
      timestamp: string;
    }>;
  }>;
  metadata: {
    current_chapter: number;
    total_chapters: number;
    last_updated: string;
  };
}

export class CheckpointManager {
  static async initNovel(user_id: string, title: string, parameters: any, supabaseClient: SupabaseClient): Promise<string> {
    const { data, error } = await supabaseClient
      .from('novel_sessions')
      .insert([{
        user_id,
        title,
        parameters,
        status: 'in_progress',
        content: {
          outline: {
            version: 0,
            status: 'initial',
            current: null,
            iterations: []
          },
          chapters: [],
          metadata: {
            current_chapter: 0,
            total_chapters: 0,
            last_updated: new Date().toISOString()
          }
        }
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
      .from('novel_sessions')
      .update({
        content: supabaseClient.rpc('jsonb_deep_set', {
          content: {
            outline: {
              version,
              status,
              current: outline,
              iterations: [{
                version,
                content: outline,
                status,
                timestamp
              }]
            }
          }
        })
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
      .from('novel_sessions')
      .select('content')
      .eq('id', novelId)
      .single();

    if (error) {
      Logger.error(`Error getting outline state ${novelId}:`, error);
      throw error;
    }

    if (!data?.content?.outline?.current) {
      return null;
    }

    return {
      content: data.content.outline.current,
      version: data.content.outline.version,
      status: data.content.outline.status
    };
  }

  static async getAllOutlineVersions(novelId: string, supabaseClient: SupabaseClient): Promise<Array<{ content: string; version: number; status: OutlineStatus }>> {
    const { data, error } = await supabaseClient
      .from('novel_sessions')
      .select('content')
      .eq('id', novelId)
      .single();

    if (error) {
      Logger.error(`Error getting all outlines ${novelId}:`, error);
      throw error;
    }

    return (data?.content?.outline?.iterations || []).map((item: { content: string; version: number; status: OutlineStatus }) => ({
      content: item.content,
      version: item.version,
      status: item.status
    }));
  }

  static async setTotalChapters(novelId: string, totalChapters: number, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novel_sessions')
      .update({
        content: supabaseClient.rpc('jsonb_deep_set', {
          content: {
            metadata: {
              total_chapters: totalChapters
            }
          }
        })
      })
      .eq('id', novelId);

    if (error) {
      Logger.error(`Error setting total chapters ${novelId}:`, error);
      throw error;
    }

    Logger.info(`Set total chapters ${totalChapters} for ${novelId}`);
  }

  static async updateChapter(novelId: string, chapterNumber: number, content: string, supabaseClient: SupabaseClient): Promise<void> {
    const timestamp = new Date().toISOString();
    const { error } = await supabaseClient
      .from('novel_sessions')
      .update({
        content: supabaseClient.rpc('jsonb_deep_set', {
          content: {
            chapters: (chapter: NovelContent['chapters']) => {
              const chapters = chapter || [];
              chapters[chapterNumber - 1] = {
                number: chapterNumber,
                content,
                timestamp,
                drafts: [{
                  version: 'final',
                  content,
                  timestamp
                }]
              };
              return chapters;
            },
            metadata: {
              current_chapter: chapterNumber
            }
          }
        })
      })
      .eq('id', novelId);

    if (error) {
      Logger.error(`Error updating chapter ${chapterNumber} for ${novelId}:`, error);
      throw error;
    }

    Logger.info(`Updated Chapter ${chapterNumber} for ${novelId}`);
  }

  static async storeDraft(novelId: string, chapterNumber: number, draftType: string, content: string, supabaseClient: SupabaseClient): Promise<void> {
    const timestamp = new Date().toISOString();
    const { error } = await supabaseClient
      .from('novel_sessions')
      .update({
        content: supabaseClient.rpc('jsonb_deep_set', {
          content: {
            chapters: (chapter: NovelContent['chapters']) => {
              const chapters = chapter || [];
              if (!chapters[chapterNumber - 1]) {
                chapters[chapterNumber - 1] = {
                  number: chapterNumber,
                  content: null,
                  drafts: []
                };
              }
              chapters[chapterNumber - 1].drafts.push({
                version: draftType,
                content,
                timestamp
              });
              return chapters;
            }
          }
        })
      })
      .eq('id', novelId);

    if (error) {
      Logger.error(`Error storing ${draftType} for Ch${chapterNumber} ${novelId}:`, error);
      throw error;
    }
    Logger.info(`Stored ${draftType} for Chapter ${chapterNumber} in ${novelId}`);
  }

  static async finishNovel(novelId: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novel_sessions')
      .update({ status: 'completed' })
      .eq('id', novelId);

    if (error) {
      Logger.error(`Error finishing novel ${novelId}:`, error);
      throw error;
    }

    Logger.info(`Novel completed ${novelId}`);
  }

  static async errorState(novelId: string, message: string, supabaseClient: SupabaseClient): Promise<void> {
    const { error } = await supabaseClient
      .from('novel_sessions')
      .update({
        status: 'error',
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