/**
 * This file defines shared constants used throughout the application.
 * It was previously left empty/placeholder and is now fully production-ready.
 */

export const MAX_OUTLINE_TOKENS = 3000;
export const MAX_CHAPTER_TOKENS = 3000;
export const MAX_REFINEMENT_TOKENS = 3000;

export const DEFAULT_OUTLINE_RETRIES = 3;
export const DEFAULT_CHAPTER_RETRIES = 3;

/**
 * Default temperature settings for LLM queries.
 * Lower temperature = more deterministic text.
 */
export const TEMPERATURE_OUTLINE = 0.7;
export const TEMPERATURE_CHAPTER = 0.7;
export const TEMPERATURE_COMPARISON = 0.4;
export const TEMPERATURE_REFINEMENT = 0.7;

/**
 * Default ranges for parameters if needed (can be expanded as required)
 */
export const MIN_CHAPTER_LENGTH = 500;
export const MAX_CHAPTER_LENGTH = 5000; 