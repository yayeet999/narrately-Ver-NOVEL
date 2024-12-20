export const CONTENT_VALIDATION = {
  OUTLINE: {
    MIN_LENGTH: 1000,
    MAX_LENGTH: 10000,
    MIN_CHAPTERS: 10,
    MAX_CHAPTERS: 150
  },
  CHAPTER: {
    MIN_LENGTH: 1000,
    MAX_LENGTH: 4000,
    MIN_CHAPTERS_PER_NOVEL: 10,
    MAX_CHAPTERS_PER_NOVEL: 150
  },
  PROMPT: {
    MAX_LENGTH: 20000,
    MAX_TOKENS: 3000
  },
  LLM: {
    TEMPERATURE: 0.7,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
  }
} as const;

export const STATE_TRANSITIONS = {
  NOVEL_STATUS: {
    INITIALIZING: 'initializing',
    OUTLINE_IN_PROGRESS: 'outline_in_progress',
    OUTLINE_COMPLETED: 'outline_completed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    ERROR: 'error'
  },
  OUTLINE_STATUS: {
    INITIAL: 'initial',
    PASS1: 'pass1',
    PASS2: 'pass2',
    COMPLETED: 'completed'
  },
  CHAPTER_STATUS: {
    INITIAL: 'initial',
    REVISION_ONE: 'revision_one',
    REVISION_TWO: 'revision_two',
    COMPLETED: 'completed'
  }
} as const;

export const VALIDATION = {
  STORY_WEIGHT: {
    MIN: 0,
    MAX: 10
  },
  NUMERIC_RANGES: {
    MIN: 1,
    MAX: 5
  }
} as const; 