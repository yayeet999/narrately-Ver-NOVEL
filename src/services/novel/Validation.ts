// src/services/novel/Validation.ts

import { NovelParameters } from './NovelParameters';
import { Logger } from '../utils/Logger';
import { NovelStatus, OutlineStatus, ChapterStatus } from '../../pages/api/novel-checkpoints/shared/types';

/**
 * ValidationUtils provides auxiliary validation functions.
 */
export class ValidationUtils {
  static isNonEmptyString(str: string | undefined | null): boolean {
    return typeof str === 'string' && str.trim().length > 0;
  }

  static isNumberInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && value >= min && value <= max;
  }

  static isNonEmptyArray<T>(arr: T[] | undefined | null): boolean {
    return Array.isArray(arr) && arr.length > 0;
  }

  static isChoiceValid<T>(value: T, choices: T[]): boolean {
    return choices.includes(value);
  }

  static isValidNovelStatus(status: string): status is NovelStatus {
    return ['initializing', 'outline_in_progress', 'outline_completed', 'in_progress', 'completed', 'error'].includes(status);
  }

  static isValidOutlineStatus(status: string): status is OutlineStatus {
    return ['initial', 'pass1', 'pass2', 'completed'].includes(status);
  }

  static isValidChapterStatus(status: string): status is ChapterStatus {
    return ['initial', 'revision_one', 'revision_two', 'completed'].includes(status);
  }

  static isValidJsonbStructure(obj: any): boolean {
    return obj !== null && typeof obj === 'object';
  }
}

export function validateAndFillDefaults(params: Partial<NovelParameters>): NovelParameters {
  // Validate required fields first
  if (!params.title || !ValidationUtils.isNonEmptyString(params.title)) {
    throw new Error('Title is required and must be a non-empty string');
  }

  if (!params.primary_genre || !ValidationUtils.isNonEmptyString(params.primary_genre)) {
    throw new Error('Primary genre is required and must be a non-empty string');
  }

  if (!params.primary_theme || !ValidationUtils.isNonEmptyString(params.primary_theme)) {
    throw new Error('Primary theme is required and must be a non-empty string');
  }

  if (!params.characters || !ValidationUtils.isNonEmptyArray(params.characters)) {
    throw new Error('At least one character is required');
  }

  // Validate enum types
  if (params.novel_length && !['50k-100k', '100k-150k', '150k+'].includes(params.novel_length)) {
    throw new Error('Invalid novel length value');
  }

  if (params.pov && !['first', 'third_limited', 'third_omniscient', 'multiple'].includes(params.pov)) {
    throw new Error('Invalid POV type');
  }

  if (params.sentence_structure && !['varied', 'consistent', 'simple', 'complex'].includes(params.sentence_structure)) {
    throw new Error('Invalid sentence structure');
  }

  if (params.paragraph_length && !['short', 'medium', 'long'].includes(params.paragraph_length)) {
    throw new Error('Invalid paragraph length');
  }

  if (params.controversial_handling && !['avoid', 'careful', 'direct'].includes(params.controversial_handling)) {
    throw new Error('Invalid controversial handling value');
  }

  const validatedParams: NovelParameters = {
    title: params.title,
    novel_length: params.novel_length || '50k-100k',
    chapter_structure: params.chapter_structure || 'variable',
    average_chapter_length: params.average_chapter_length || 2500,
    chapter_naming_style: params.chapter_naming_style || 'both',
    primary_genre: params.primary_genre,
    secondary_genre: params.secondary_genre,
    primary_theme: params.primary_theme,
    secondary_theme: params.secondary_theme,
    characters: params.characters,
    setting_type: params.setting_type || 'Contemporary',
    world_complexity: params.world_complexity || 3,
    cultural_depth: params.cultural_depth || 3,
    cultural_framework: params.cultural_framework || 'Western',
    pov: params.pov || 'third_limited',
    tone_formality: params.tone_formality || 3,
    tone_descriptive: params.tone_descriptive || 3,
    dialogue_balance: params.dialogue_balance || 3,
    story_structure: params.story_structure || "Three-Act Structure",
    conflict_types: params.conflict_types || ['person_vs_self'],
    resolution_style: params.resolution_style || 'Conclusive',
    description_density: params.description_density || 3,
    pacing_overall: params.pacing_overall || 3,
    pacing_variance: params.pacing_variance || 3,
    emotional_intensity: params.emotional_intensity || 3,
    metaphor_frequency: params.metaphor_frequency || 3,
    flashback_usage: params.flashback_usage || 2,
    foreshadowing_intensity: params.foreshadowing_intensity || 3,
    language_complexity: params.language_complexity || 3,
    sentence_structure: params.sentence_structure || 'varied',
    paragraph_length: params.paragraph_length || 'medium',
    violence_level: params.violence_level || 2,
    adult_content_level: params.adult_content_level || 1,
    profanity_level: params.profanity_level || 1,
    controversial_handling: params.controversial_handling || 'careful',
    story_description: params.story_description || ''
  };

  // Validate numeric ranges
  const numericRanges = [
    { field: 'world_complexity', min: 1, max: 5 },
    { field: 'cultural_depth', min: 1, max: 5 },
    { field: 'tone_formality', min: 1, max: 5 },
    { field: 'tone_descriptive', min: 1, max: 5 },
    { field: 'dialogue_balance', min: 1, max: 5 },
    { field: 'description_density', min: 1, max: 5 },
    { field: 'pacing_overall', min: 1, max: 5 },
    { field: 'pacing_variance', min: 1, max: 5 },
    { field: 'emotional_intensity', min: 1, max: 5 },
    { field: 'metaphor_frequency', min: 1, max: 5 },
    { field: 'flashback_usage', min: 1, max: 5 },
    { field: 'foreshadowing_intensity', min: 1, max: 5 },
    { field: 'language_complexity', min: 1, max: 5 },
    { field: 'violence_level', min: 1, max: 5 },
    { field: 'adult_content_level', min: 1, max: 5 },
    { field: 'profanity_level', min: 1, max: 5 }
  ];

  for (const { field, min, max } of numericRanges) {
    const value = validatedParams[field as keyof NovelParameters] as number;
    if (!ValidationUtils.isNumberInRange(value, min, max)) {
      Logger.warn(`Invalid ${field} value: ${value}. Setting to default.`);
      (validatedParams[field as keyof NovelParameters] as number) = 3;
    }
  }

  // Validate arrays are non-empty
  if (!ValidationUtils.isNonEmptyArray(validatedParams.characters)) {
    Logger.warn('No characters provided. Adding default protagonist.');
    validatedParams.characters = [{
      name: 'Protagonist',
      role: 'protagonist',
      archetype: 'The Hero',
      age_range: 'young adult',
      background_archetype: 'ordinary world',
      arc_type: 'coming_of_age',
      relationships: []
    }];
  }

  if (!ValidationUtils.isNonEmptyArray(validatedParams.conflict_types)) {
    Logger.warn('No conflict types provided. Setting to default.');
    validatedParams.conflict_types = ['person_vs_self'];
  }

  // Validate processed metrics structure if present
  if (params.processed_metrics) {
    if (!ValidationUtils.isValidJsonbStructure(params.processed_metrics) ||
        typeof params.processed_metrics.storyWeight !== 'number' ||
        typeof params.processed_metrics.recommendedChapters !== 'number' ||
        !Array.isArray(params.processed_metrics.subplotDistribution) ||
        !Array.isArray(params.processed_metrics.characterGuidance) ||
        !Array.isArray(params.processed_metrics.chapterGuidance)) {
      throw new Error('Invalid processed metrics structure');
    }

    // Validate numeric ranges in processed metrics
    if (params.processed_metrics.storyWeight < 0 || params.processed_metrics.storyWeight > 10) {
      throw new Error('Story weight must be between 0 and 10');
    }

    if (params.processed_metrics.recommendedChapters < 10 || params.processed_metrics.recommendedChapters > 150) {
      throw new Error('Recommended chapters must be between 10 and 150');
    }
  }

  return validatedParams;
} 