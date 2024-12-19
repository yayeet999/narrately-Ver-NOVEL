import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../../../services/utils/Logger';
import { NovelStatus, OutlineStatus, ChapterStatus, NovelData, ChapterData } from './types';

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

  async updateOutlineStatus(status: OutlineStatus, version: number, content: string): Promise<void> {
    const { data: currentState } = await this.supabaseClient
      .from('novels')
      .select('outline_data')
      .eq('id', this.novelId)
      .single();

    const iterations = currentState?.outline_data?.iterations || [];
    iterations.push({
      content,
      timestamp: new Date().toISOString()
    });

    const { error } = await this.retryOperation(async () => {
      return await this.supabaseClient
        .from('novels')
        .update({
          outline_status: status,
          outline_version: version,
          outline_data: {
            current: content,
            iterations
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', this.novelId);
    });

    if (error) {
      throw new Error(`Failed to update outline status: ${error.message}`);
    }

    Logger.info(`Updated novel ${this.novelId} outline status to ${status} (v${version})`);
  }

  async updateChapter(chapterNumber: number, content: string, status: ChapterStatus = 'initial'): Promise<void> {
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
          novel_status: 'error',
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