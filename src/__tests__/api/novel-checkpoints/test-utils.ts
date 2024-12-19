import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NovelParameters } from '../../../services/novel/NovelParameters';
import { NovelData, NovelStatus, OutlineStatus, ChapterStatus } from '../../../pages/api/novel-checkpoints/shared/types';

export const TEST_NOVEL_PARAMETERS: NovelParameters = {
  title: 'Test Novel',
  novel_length: '50k-100k',
  primary_genre: 'Science Fiction',
  secondary_genre: 'Mystery',
  primary_theme: 'Identity',
  secondary_theme: 'Power',
  pov: 'third_limited',
  sentence_structure: 'varied',
  paragraph_length: 'medium',
  controversial_handling: 'careful',
  world_complexity: 3,
  cultural_depth: 3,
  cultural_framework: 'Western',
  tone_formality: 3,
  tone_descriptive: 3,
  dialogue_balance: 3,
  description_density: 3,
  pacing_overall: 3,
  pacing_variance: 3,
  emotional_intensity: 3,
  metaphor_frequency: 3,
  flashback_usage: 2,
  foreshadowing_intensity: 3,
  language_complexity: 3,
  violence_level: 2,
  adult_content_level: 1,
  profanity_level: 1,
  characters: [
    {
      name: 'Test Protagonist',
      role: 'protagonist',
      archetype: 'The Hero',
      age_range: 'young adult',
      background_archetype: 'ordinary world',
      arc_type: 'coming_of_age',
      relationships: ['Test Antagonist']
    },
    {
      name: 'Test Antagonist',
      role: 'antagonist',
      archetype: 'The Villain',
      age_range: 'adult',
      background_archetype: 'privileged',
      arc_type: 'fall',
      relationships: ['Test Protagonist']
    }
  ],
  story_description: 'A test novel for automated testing'
};

export function createTestSupabaseClient(): SupabaseClient {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false
      }
    }
  );
}

export async function createTestNovel(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from('novels')
    .insert({
      title: TEST_NOVEL_PARAMETERS.title,
      user_id: 'test-user',
      parameters: TEST_NOVEL_PARAMETERS,
      novel_status: 'initializing' as NovelStatus,
      outline_status: 'initial' as OutlineStatus,
      outline_version: 0,
      outline_data: {
        current: null,
        iterations: []
      },
      current_chapter: 0,
      total_chapters: 0,
      chapters_data: {
        chapters: []
      }
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function cleanupTestNovel(supabase: SupabaseClient, novelId: string): Promise<void> {
  const { error } = await supabase
    .from('novels')
    .delete()
    .eq('id', novelId);

  if (error) throw error;
}

export async function getNovelState(supabase: SupabaseClient, novelId: string): Promise<NovelData> {
  const { data, error } = await supabase
    .from('novels')
    .select('*')
    .eq('id', novelId)
    .single();

  if (error || !data) throw new Error('Failed to fetch novel state');
  return data as NovelData;
}

export function validateNovelState(novel: NovelData): void {
  // Basic validation
  if (!novel.id) throw new Error('Novel missing ID');
  if (!novel.user_id) throw new Error('Novel missing user ID');
  if (!novel.parameters) throw new Error('Novel missing parameters');

  // Status validation
  if (!Object.values(NovelStatus).includes(novel.novel_status as NovelStatus)) {
    throw new Error(`Invalid novel status: ${novel.novel_status}`);
  }

  // Outline validation
  if (novel.outline_data && novel.outline_status !== 'initial') {
    if (!novel.outline_data.current) {
      throw new Error('Missing current outline content');
    }
    if (!Array.isArray(novel.outline_data.iterations)) {
      throw new Error('Invalid outline iterations format');
    }
  }

  // Chapter validation
  if (novel.chapters_data) {
    if (!Array.isArray(novel.chapters_data.chapters)) {
      throw new Error('Invalid chapters format');
    }
    
    novel.chapters_data.chapters.forEach((chapter, index) => {
      if (!chapter.chapter_number) {
        throw new Error(`Chapter ${index} missing number`);
      }
      if (!chapter.content) {
        throw new Error(`Chapter ${chapter.chapter_number} missing content`);
      }
      if (!Object.values(ChapterStatus).includes(chapter.status as ChapterStatus)) {
        throw new Error(`Invalid status for chapter ${chapter.chapter_number}: ${chapter.status}`);
      }
    });
  }
}

export async function waitForNovelStatus(
  supabase: SupabaseClient,
  novelId: string,
  targetStatus: NovelStatus,
  timeoutMs: number = 30000
): Promise<NovelData> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const novel = await getNovelState(supabase, novelId);
    if (novel.novel_status === targetStatus) {
      return novel;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Timeout waiting for novel status ${targetStatus}`);
} 