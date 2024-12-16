/**
 * This file provides general utility functions.
 * Previously left as placeholder, now fully production-ready.
 */

/**
 * Safely trims a string to a specified length without breaking words badly.
 * If the string is longer than maxLength, it will return a substring ending at a whitespace near that limit.
 *
 * @param input The input string to trim.
 * @param maxLength The maximum length allowed.
 * @returns A trimmed string that doesn't exceed maxLength by much.
 */
export function safeTrim(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;

  const trimmed = input.substring(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > 0) {
    return trimmed.substring(0, lastSpace) + '...';
  }
  return trimmed + '...';
} 