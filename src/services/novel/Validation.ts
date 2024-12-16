// src/services/novel/Validation.ts

import { NovelParameters, Genre, Theme } from './NovelParameters';
import { Logger } from '../utils/Logger';

/**
 * ValidationUtils provides auxiliary validation functions.
 * This file previously had placeholders and is now fully implemented.
 */

export class ValidationUtils {
  /**
   * Checks if a string is non-empty and not just whitespace.
   * @param str The string to validate.
   * @returns true if non-empty, false otherwise.
   */
  static isNonEmptyString(str: string): boolean {
    return typeof str === 'string' && str.trim().length > 0;
  }

  /**
   * Validates that a given number is within a specified inclusive range.
   * @param value The number to validate.
   * @param min Minimum allowed value.
   * @param max Maximum allowed value.
   * @returns true if valid, false otherwise.
   */
  static isNumberInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && value >= min && value <= max;
  }

  /**
   * Validates that an array is non-empty.
   * @param arr The array to validate.
   * @returns true if array is non-empty, false otherwise.
   */
  static isNonEmptyArray<T>(arr: T[]): boolean {
    return Array.isArray(arr) && arr.length > 0;
  }

  /**
   * Validates that a value is one of the allowed choices.
   * @param value The value to check.
   * @param choices An array of allowed choices.
   * @returns true if value is in choices, false otherwise.
   */
  static isChoiceValid<T>(value: T, choices: T[]): boolean {
    return choices.includes(value);
  }
}

export function validateAndFillDefaults(params: Partial<NovelParameters>): NovelParameters {
  const validatedParams: NovelParameters = {
    title: params.title || 'Untitled Novel',
    novel_length: params.novel_length || '50k-100k',
    chapter_structure: params.chapter_structure || 'variable',
    average_chapter_length: params.average_chapter_length || 2500,
    chapter_naming_style: params.chapter_naming_style || 'both',
    primary_genre: params.primary_genre || 'Fantasy',
    secondary_genre: params.secondary_genre,
    primary_theme: params.primary_theme || 'Coming of Age',
    secondary_theme: params.secondary_theme,
    characters: params.characters || [],
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

  return validatedParams;
} 