export interface ProcessedMetrics {
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
}

export interface Character {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  archetype: string;
  age_range: string;
  background_archetype: string;
  arc_type: 'redemption' | 'fall' | 'coming_of_age' | 'internal_discovery' | 'static';
  relationships: string[];
}

export type NovelLength = '50k-100k' | '100k-150k' | '150k+';
export type POVType = 'first' | 'third_limited' | 'third_omniscient' | 'multiple';
export type SentenceStructure = 'varied' | 'consistent' | 'simple' | 'complex';
export type ParagraphLength = 'short' | 'medium' | 'long';
export type ControversialHandling = 'avoid' | 'careful' | 'direct';

export type StoryStructure = 
  | "Three-Act Structure"
  | "Hero's Journey"
  | "Nonlinear"
  | "Parallel"
  | "Five-Act Structure"
  | "Episodic"
  | "Circular"
  | "Framing Device"
  | "In Medias Res";

export type ConflictType = 
  | 'person_vs_person'
  | 'person_vs_nature'
  | 'person_vs_society'
  | 'person_vs_self'
  | 'person_vs_technology'
  | 'person_vs_fate';

export type ResolutionStyle = 
  | 'Conclusive'
  | 'Open-Ended'
  | 'Twist'
  | 'Circular'
  | 'Bittersweet';

export type SettingType = 
  | 'Fantasy'
  | 'Urban'
  | 'Historical'
  | 'Futuristic'
  | 'Contemporary'
  | 'Post-Apocalyptic'
  | 'Space'
  | 'Rural';

export interface NovelParameters {
  title: string;
  novel_length: NovelLength;
  chapter_structure: 'fixed' | 'variable';
  average_chapter_length: number;
  chapter_naming_style: 'numbered' | 'titled' | 'both';
  primary_genre: string;
  secondary_genre?: string;
  primary_theme: string;
  secondary_theme?: string;
  characters: Character[];
  pov: POVType;
  sentence_structure: SentenceStructure;
  paragraph_length: ParagraphLength;
  controversial_handling: ControversialHandling;
  world_complexity: number;
  cultural_depth: number;
  cultural_framework: string;
  tone_formality: number;
  tone_descriptive: number;
  dialogue_balance: number;
  description_density: number;
  pacing_overall: number;
  pacing_variance: number;
  emotional_intensity: number;
  metaphor_frequency: number;
  flashback_usage: number;
  foreshadowing_intensity: number;
  language_complexity: number;
  violence_level: number;
  adult_content_level: number;
  profanity_level: number;
  story_description?: string;
  processed_metrics?: ProcessedMetrics;
  story_structure: StoryStructure;
  conflict_types: ConflictType[];
  resolution_style: ResolutionStyle;
  setting_type: SettingType;
}

export type Genre = 'Fantasy' | 'Science Fiction' | 'Mystery' | 'Romance' | 'Literary Fiction';

export const GenreOptions: Record<Genre, string[]> = {
  'Fantasy': ['High Fantasy', 'Urban Fantasy', 'Dark Fantasy', 'Epic Fantasy'],
  'Science Fiction': ['Space Opera', 'Cyberpunk', 'Post-Apocalyptic', 'Hard Sci-Fi'],
  'Mystery': ['Detective', 'Cozy Mystery', 'Noir', 'Thriller'],
  'Romance': ['Contemporary', 'Historical', 'Paranormal', 'Romantic Comedy'],
  'Literary Fiction': ['Contemporary', 'Historical', 'Experimental', 'Satire']
};

export type Theme = 'Coming of Age' | 'Redemption' | 'Love and Loss' | 'Power and Corruption' | 'Identity' | 'Good vs Evil';

export const ThemeOptions: Theme[] = [
  'Coming of Age',
  'Redemption',
  'Love and Loss',
  'Power and Corruption',
  'Identity',
  'Good vs Evil'
];

export const CharacterArchetypes = [
  'The Hero',
  'The Mentor',
  'The Sidekick',
  'The Love Interest',
  'The Villain',
  'The Anti-Hero',
  'The Trickster',
  'The Sage'
];

export const SettingOptions: SettingType[] = [
  'Fantasy',
  'Urban',
  'Historical',
  'Futuristic',
  'Contemporary',
  'Post-Apocalyptic',
  'Space',
  'Rural'
];

export const ConflictTypeOptions: ConflictType[] = [
  'person_vs_person',
  'person_vs_nature',
  'person_vs_society',
  'person_vs_self',
  'person_vs_technology',
  'person_vs_fate'
];

export const ResolutionStyleOptions: ResolutionStyle[] = [
  'Conclusive',
  'Open-Ended',
  'Twist',
  'Circular',
  'Bittersweet'
];

export const CulturalFrameworks = [
  'Western',
  'Eastern',
  'African',
  'Middle Eastern',
  'Latin American',
  'Nordic',
  'Mediterranean',
  'Indigenous',
  'Multicultural'
]; 