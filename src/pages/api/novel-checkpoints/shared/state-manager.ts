import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../../../services/utils/Logger';
import { NovelStatus, OutlineStatus, ChapterStatus, NovelData, ChapterData, ProcessedMetrics } from './types';

interface OutlineData {
  current: {
    title: string;
    chapters: Array<{
      number: number;
      title: string;
      summary: string;
      events: string[];
      character_arcs: Array<{
        character: string;
        development: string;
        emotional_state: string;
      }>;
      themes: string[];
      pacing: string;
      setting_details: string;
    }>;
  } | null;
  iterations: Array<{
    content: any;
    timestamp: string;
  }>;
}

export class NovelStateManager {
  private supabaseClient: SupabaseClient;
  private novelId: string;

  constructor(supabaseClient: SupabaseClient, novelId: string) {
    this.supabaseClient = supabaseClient;
    this.novelId = novelId;
  }

  async getNovelState(): Promise<NovelData> {
    const { data, error } = await this.retryOperation(async () => {
      return await this.supabaseClient
        .from('novels')
        .select('*')
        .eq('id', this.novelId)
        .single();
    });

    if (error || !data) {
      throw new Error('Failed to fetch novel state');
    }

    return data as NovelData;
  }

  async updateNovelStatus(status: NovelStatus): Promise<void> {
    const { error } = await this.retryOperation(async () => {
      return await this.supabaseClient
        .from('novels')
        .update({ 
          novel_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.novelId);
    });

    if (error) {
      throw new Error(`Failed to update novel status: ${error.message}`);
    }

    Logger.info(`Updated novel ${this.novelId} status to ${status}`);
  }

  async updateOutlineStatus(
    outline: any,
    status: string,
    version: number
  ): Promise<void> {
    try {
      // Get current outline data
      const { data: currentData, error: fetchError } = await this.supabaseClient
        .from('novels')
        .select('outline_data')
        .eq('id', this.novelId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Prepare the new outline data
      const currentOutlineData: OutlineData = currentData?.outline_data || { current: null, iterations: [] };
      
      // Only store the changes in iterations
      const changes = {
        ...currentOutlineData,
        current: outline,
        iterations: [
          ...currentOutlineData.iterations,
          {
            content: outline,
            timestamp: new Date().toISOString()
          }
        ]
      };

      // Update the novel record
      const { error: updateError } = await this.supabaseClient
        .from('novels')
        .update({
          outline_status: status,
          outline_version: version,
          outline_data: changes,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.novelId);

      if (updateError) {
        throw updateError;
      }

      Logger.info(`Updated outline status to ${status} for novel ${this.novelId}`);
    } catch (error) {
      Logger.error('Error updating outline status:', error);
      throw error;
    }
  }

  async updateChapter(
    chapterNumber: number, 
    content: string, 
    status: ChapterStatus = 'initial' as ChapterStatus
  ): Promise<void> {
    const { data: currentState } = await this.supabaseClient
      .from('novels')
      .select('chapters_data, current_chapter')
      .eq('id', this.novelId)
      .single();

    const chapters: ChapterData[] = currentState?.chapters_data?.chapters || [];
    const chapterIndex = chapters.findIndex((ch: ChapterData) => ch.chapter_number === chapterNumber);
    const chapterData: ChapterData = {
      chapter_number: chapterNumber,
      content,
      version: chapterIndex >= 0 ? chapters[chapterIndex].version + 1 : 1,
      status,
      timestamp: new Date().toISOString()
    };

    if (chapterIndex >= 0) {
      chapters[chapterIndex] = chapterData;
    } else {
      chapters.push(chapterData);
    }

    const { error } = await this.retryOperation(async () => {
      return await this.supabaseClient
        .from('novels')
        .update({
          chapters_data: { chapters },
          current_chapter: chapterNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.novelId);
    });

    if (error) {
      throw new Error(`Failed to update chapter: ${error.message}`);
    }

    Logger.info(`Updated chapter ${chapterNumber} in novel ${this.novelId}`);
  }

  async setTotalChapters(totalChapters: number): Promise<void> {
    if (totalChapters < 0 || totalChapters > 150) {
      throw new Error('Total chapters must be between 0 and 150');
    }

    const { error } = await this.retryOperation(async () => {
      return await this.supabaseClient
        .from('novels')
        .update({
          total_chapters: totalChapters,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.novelId);
    });

    if (error) {
      throw new Error(`Failed to set total chapters: ${error.message}`);
    }

    Logger.info(`Set total chapters to ${totalChapters} for novel ${this.novelId}`);
  }

  async updateProcessedMetrics(metrics: ProcessedMetrics): Promise<void> {
    const { error } = await this.retryOperation(async () => {
      return await this.supabaseClient
        .from('novels')
        .update({
          processed_metrics: metrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.novelId);
    });

    if (error) {
      throw new Error(`Failed to update processed metrics: ${error.message}`);
    }

    Logger.info(`Updated processed metrics for novel ${this.novelId}`);
  }

  async handleError(error: Error): Promise<void> {
    const { error: updateError } = await this.retryOperation(async () => {
      return await this.supabaseClient
        .from('novels')
        .update({
          novel_status: NovelStatus.Error,
          error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.novelId);
    });

    if (updateError) {
      Logger.error('Failed to update error state:', updateError);
    }

    Logger.error(`Novel ${this.novelId} entered error state:`, error);
  }

  async getProgressState(): Promise<{ currentStep: number; totalSteps: number; stage: string }> {
    const { data, error } = await this.supabaseClient
      .rpc('get_novel_progress', { novel_id: this.novelId });

    if (error) {
      throw new Error(`Failed to get progress state: ${error.message}`);
    }

    return {
      currentStep: data?.current_step || 0,
      totalSteps: data?.total_steps || 1,
      stage: data?.current_stage || 'initializing'
    };
  }

  async cleanupAbandonedGeneration(timeoutMinutes: number = 60): Promise<void> {
    const { error } = await this.supabaseClient
      .rpc('cleanup_abandoned_generations', { timeout_minutes: timeoutMinutes });

    if (error) {
      throw new Error(`Failed to cleanup abandoned generation: ${error.message}`);
    }

    Logger.info(`Cleaned up abandoned generations older than ${timeoutMinutes} minutes`);
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Operation failed after retries');
  }
}

export async function validateOutlineStructure(outline: any): Promise<boolean> {
  try {
    if (!outline || typeof outline !== 'object') {
      return false;
    }

    if (!outline.title || !Array.isArray(outline.chapters)) {
      return false;
    }

    for (const chapter of outline.chapters) {
      if (!chapter.number || !chapter.title || !chapter.summary ||
          !Array.isArray(chapter.events) || !Array.isArray(chapter.character_arcs) ||
          !Array.isArray(chapter.themes) || !chapter.pacing || !chapter.setting_details) {
        return false;
      }

      for (const arc of chapter.character_arcs) {
        if (!arc.character || !arc.development || !arc.emotional_state) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    Logger.error('Error validating outline structure:', error);
    return false;
  }
}

export async function getLatestOutline(
  supabase: SupabaseClient,
  novelId: string
): Promise<{ content: any; version: number; status: string } | null> {
  try {
    const { data, error } = await supabase
      .from('novels')
      .select('outline_data, outline_version, outline_status')
      .eq('id', novelId)
      .single();

    if (error) {
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
  } catch (error) {
    Logger.error('Error getting latest outline:', error);
    throw error;
  }
} 