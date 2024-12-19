import { Logger } from '../../../../services/utils/Logger';

export interface ValidationConfig {
  minLength: number;
  maxLength: number;
  requiredPatterns?: RegExp[];
  forbiddenPatterns?: RegExp[];
  customValidators?: Array<(content: string) => boolean>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ContentValidator {
  private static readonly DEFAULT_CHAPTER_CONFIG: ValidationConfig = {
    minLength: 1000,
    maxLength: 4000,
    requiredPatterns: [
      /Chapter\s+\d+/i,  // Chapter heading
      /[.!?]\s+[A-Z]/   // At least one proper sentence
    ],
    forbiddenPatterns: [
      /\[.*?\]/g,       // No markdown-style links
      /<.*?>/g,         // No HTML tags
      /\{.*?\}/g        // No template literals
    ]
  };

  private static readonly DEFAULT_OUTLINE_CONFIG: ValidationConfig = {
    minLength: 1000,
    maxLength: 10000,
    requiredPatterns: [
      /Chapter\s+\d+/i,  // Chapter headings
      /Synopsis/i,       // Synopsis section
      /Characters?/i     // Characters section
    ]
  };

  static validateChapter(content: string | null, config?: Partial<ValidationConfig>): ValidationResult {
    const fullConfig = { ...this.DEFAULT_CHAPTER_CONFIG, ...config };
    return this.validate(content, fullConfig);
  }

  static validateOutline(content: string | null, config?: Partial<ValidationConfig>): ValidationResult {
    const fullConfig = { ...this.DEFAULT_OUTLINE_CONFIG, ...config };
    return this.validate(content, fullConfig);
  }

  private static validate(content: string | null, config: ValidationConfig): ValidationResult {
    const errors: string[] = [];

    // Basic content checks
    if (!content) {
      return { isValid: false, errors: ['Content is null or undefined'] };
    }

    if (typeof content !== 'string') {
      return { isValid: false, errors: ['Content is not a string'] };
    }

    // Length validation
    if (content.length < config.minLength) {
      errors.push(`Content length (${content.length}) is below minimum (${config.minLength})`);
    }

    if (content.length > config.maxLength) {
      errors.push(`Content length (${content.length}) exceeds maximum (${config.maxLength})`);
    }

    // Empty content check
    if (!content.split('\n').some(line => line.trim().length > 0)) {
      errors.push('Content contains no non-empty lines');
    }

    // Required patterns
    if (config.requiredPatterns) {
      for (const pattern of config.requiredPatterns) {
        if (!pattern.test(content)) {
          errors.push(`Required pattern not found: ${pattern}`);
        }
      }
    }

    // Forbidden patterns
    if (config.forbiddenPatterns) {
      for (const pattern of config.forbiddenPatterns) {
        if (pattern.test(content)) {
          errors.push(`Forbidden pattern found: ${pattern}`);
        }
      }
    }

    // Custom validators
    if (config.customValidators) {
      for (const validator of config.customValidators) {
        try {
          if (!validator(content)) {
            errors.push('Custom validation failed');
          }
        } catch (error) {
          errors.push(`Custom validator error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Log validation results
    if (errors.length > 0) {
      Logger.warn('Content validation failed:', errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateChapterNumber(chapterNumber: number, totalChapters: number): ValidationResult {
    const errors: string[] = [];

    if (!Number.isInteger(chapterNumber)) {
      errors.push('Chapter number must be an integer');
    }

    if (chapterNumber < 1) {
      errors.push('Chapter number must be positive');
    }

    if (chapterNumber > totalChapters) {
      errors.push(`Chapter number (${chapterNumber}) exceeds total chapters (${totalChapters})`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateTotalChapters(totalChapters: number): ValidationResult {
    const errors: string[] = [];
    const MIN_CHAPTERS = 10;
    const MAX_CHAPTERS = 150;

    if (!Number.isInteger(totalChapters)) {
      errors.push('Total chapters must be an integer');
    }

    if (totalChapters < MIN_CHAPTERS) {
      errors.push(`Total chapters must be at least ${MIN_CHAPTERS}`);
    }

    if (totalChapters > MAX_CHAPTERS) {
      errors.push(`Total chapters cannot exceed ${MAX_CHAPTERS}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 