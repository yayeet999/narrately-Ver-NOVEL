// src/services/novel/ValidationUtils.ts

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