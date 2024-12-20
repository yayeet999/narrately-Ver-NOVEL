import { NovelParameters } from './NovelParameters';
import { Logger } from '../utils/Logger';
import { createClient } from '@supabase/supabase-js';
import { NovelStatus } from '../../pages/api/novel-checkpoints/shared/types';

export class NovelGenerator {
  private supabaseClient;

  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  async generateNovel(userId: string, parameters: NovelParameters): Promise<string> {
    try {
      Logger.info('Starting novel generation with parameters:', parameters);

      // Insert new novel into database
      const { data: novel, error: insertError } = await this.supabaseClient
        .from('novels')
        .insert({
          user_id: userId,
          title: parameters.title,
          parameters: parameters,
          novel_status: NovelStatus.Initializing,
          outline_status: 'initial',
          outline_data: {
            current: null,
            iterations: []
          },
          current_chapter: 0,
          total_chapters: 0,
          chapters_data: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        Logger.error('Failed to insert novel:', insertError);
        throw new Error(`Failed to create novel: ${insertError.message}`);
      }

      if (!novel) {
        throw new Error('Failed to create novel: No data returned');
      }

      Logger.info('Successfully created novel with ID:', novel.id);
      return novel.id;

    } catch (error) {
      Logger.error('Error in novel generation:', error);
      throw error;
    }
  }
} 