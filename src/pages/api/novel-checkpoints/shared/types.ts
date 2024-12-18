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

export type NovelStage = 
  | 'outline_initial'
  | 'outline_revision_one'
  | 'outline_revision_two'
  | 'chapter_initial'
  | 'chapter_revision_one'
  | 'chapter_revision_two'
  | 'completed'
  | 'error';

export type NovelStatus = {
  stage: NovelStage;
  currentStep: number;
  totalSteps: number;
  error?: string;
}; 