import { SupabaseClient } from '@supabase/supabase-js';
import { NovelParameters } from '../../../../services/novel/NovelParameters';

export type ApiResponse = {
  success: boolean;
  novelId?: string;
  error?: string;
  details?: string;
};

export type CheckpointContext = {
  novelId: string;
  userId: string;
  parameters: NovelParameters;
  supabaseClient: SupabaseClient;
};

export type ChapterStatus = 'initial' | 'revision_one' | 'revision_two' | 'completed';

export type OutlineStatus = 'initial' | 'pass1' | 'pass2' | 'completed';

export type NovelStatus = 
  | 'initializing'
  | 'outline_in_progress'
  | 'outline_completed'
  | 'in_progress'
  | 'completed'
  | 'error';

export type ChapterData = {
  chapter_number: number;
  content: string;
  version: number;
  status: ChapterStatus;
  timestamp: string;
};

export type OutlineData = {
  current: string | null;
  iterations: Array<{
    content: string;
    timestamp: string;
  }>;
};

export type ProcessedMetrics = {
  storyWeight: number;
  recommendedChapters: number;
  subplotDistribution: Array<{
    subplotName: string;
    chapters: Array<{
      chapter: number;
      focusLevel: number;
      themeLink: string;
    }>;
  }>;
  characterGuidance: Array<{
    characterName: string;
    appearanceFrequency: number;
    rolesInChapters: Array<{
      chapterRange: string;
      suggestedActions: string[];
    }>;
  }>;
  chapterGuidance: Array<{
    chapterRange: string;
    sceneBalance: {
      action: number;
      dialogue: number;
      introspection: number;
    };
    tensionLevel: number;
    viewpointDistribution: string;
    keyObjectives: string[];
    subplotInvolvement: string[];
    characterFocus: string[];
  }>;
};

export type NovelData = {
  id: string;
  user_id: string;
  title: string;
  parameters: NovelParameters;
  novel_status: NovelStatus;
  outline_status: OutlineStatus;
  outline_version: number;
  outline_data: OutlineData;
  current_chapter: number;
  total_chapters: number;
  chapters_data: {
    chapters: ChapterData[];
  };
  processed_metrics?: ProcessedMetrics;
  error?: string;
  created_at: string;
  updated_at: string;
}; 