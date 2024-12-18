import { NovelParameters, Character, ConflictType } from './NovelParameters';
import { Logger } from '../utils/Logger';

/**
 * @file StoryParameterProcessor.ts
 * @description
 * A simplified but effective story parameter processing system that calculates weights, subplot distribution, character appearances,
 * and scene-level guidance for improved novel generation quality.
 */

/**
 * @typedef ProcessedMetrics
 * Core metrics and guidance that will inform outline and chapter generation.
 */
export interface ProcessedMetrics {
  storyWeight: number;
  recommendedChapters: number;
  subplotDistribution: SubplotGuidance[];
  characterGuidance: CharacterGuidance[];
  chapterGuidance: ChapterGuidance[];
}

/**
 * @typedef SubplotGuidance
 * Guidance for how each subplot should be integrated per chapter.
 */
export interface SubplotGuidance {
  subplotName: string;
  chapters: Array<{ chapter: number; focusLevel: number; themeLink: string }>;
}

/**
 * @typedef CharacterGuidance
 * Guidance for character appearances and involvement.
 */
export interface CharacterGuidance {
  characterName: string;
  appearanceFrequency: number;
  rolesInChapters: Array<{ chapterRange: string; suggestedActions: string[] }>;
}

/**
 * @typedef ChapterGuidance
 * Detailed guidance for a specific chapter or chapter segment.
 */
export interface ChapterGuidance {
  chapterRange: string;
  sceneBalance: { action: number; dialogue: number; introspection: number };
  tensionLevel: number;
  viewpointDistribution: string;
  keyObjectives: string[];
  subplotInvolvement: string[];
  characterFocus: string[];
}

/**
 * @typedef ProcessedParameters
 * The final processed parameters object integrating all guidance.
 */
export interface ProcessedParameters {
  metrics: ProcessedMetrics;
  outlineGuidance: string;
}

export class StoryParameterProcessor {
  /**
   * Process the NovelParameters to produce a final ProcessedParameters object
   * that can be used by NovelGenerator and PromptTemplates for improved novel generation.
   * @param params NovelParameters
   */
  public static processParameters(params: NovelParameters): ProcessedParameters {
    Logger.info('Starting parameter processing for story generation...');
    this.validateParameters(params);

    const recommendedChapters = this.calculateRecommendedChapters(params);
    const storyWeight = this.calculateStoryWeight(params, recommendedChapters);
    
    // Generate subplot guidance
    const subplotDistribution = this.generateSubplotGuidance(params, recommendedChapters);

    // Generate character guidance
    const characterGuidance = this.generateCharacterGuidance(params, recommendedChapters);

    // Generate per-chapter guidance based on the weights and interactions
    const chapterGuidance = this.generateChapterGuidance(params, recommendedChapters, storyWeight, subplotDistribution, characterGuidance);

    // Combine into metrics
    const metrics: ProcessedMetrics = {
      storyWeight,
      recommendedChapters,
      subplotDistribution,
      characterGuidance,
      chapterGuidance
    };

    // Create final outline guidance text
    const outlineGuidance = this.createOutlineGuidanceText(metrics);

    Logger.info('Parameter processing completed successfully.');
    return { metrics, outlineGuidance };
  }

  /**
   * Validate parameters to ensure correctness and consistency.
   */
  private static validateParameters(params: NovelParameters): void {
    Logger.info('Validating NovelParameters...');
    if (!params.primary_genre || typeof params.primary_genre !== 'string') {
      throw new Error('Invalid primary_genre.');
    }
    if (!params.characters || params.characters.length === 0) {
      throw new Error('No characters defined.');
    }
    Logger.info('Parameters validated.');
  }

  /**
   * Calculate recommended chapters based on novel length and structure.
   * Simpler than previous version, focusing on direct impact.
   */
  private static calculateRecommendedChapters(params: NovelParameters): number {
    let baseChapters = 30;
    if (params.novel_length === '50k-100k') baseChapters = 25;
    else if (params.novel_length === '100k-150k') baseChapters = 35;
    else if (params.novel_length === '150k+') baseChapters = 45;

    // World complexity = direct impact on chapters (more complexity -> more chapters)
    baseChapters += Math.round((params.world_complexity - 3) * 2);

    // Ensure not less than 10 or more than 60
    return Math.max(10, Math.min(baseChapters, 60));
  }

  /**
   * Calculate a main story weight metric using a simple formula integrating:
   * genre, theme, structure, character complexity.
   *
   * Formula:
   * storyWeight = (genreBase * themeModifier * structureMultiplier) + characterComplexityImpact
   */
  private static calculateStoryWeight(params: NovelParameters, chapters: number): number {
    // Genre base: simple mapping
    const genreBase = this.getGenreBase(params.primary_genre);
    const themeModifier = this.getThemeModifier(params.primary_theme, params.secondary_theme);
    const structureMultiplier = this.getStructureMultiplier(params.story_structure);
    const characterComplexityImpact = this.getCharacterComplexityImpact(params.characters);

    const storyWeight = (genreBase * themeModifier * structureMultiplier) + characterComplexityImpact;
    return parseFloat(storyWeight.toFixed(2));
  }

  /**
   * Simple genre base value.
   */
  private static getGenreBase(genre: string): number {
    const g = genre.toLowerCase();
    if (g.includes('fantasy')) return 1.2;
    if (g.includes('mystery')) return 1.1;
    if (g.includes('romance')) return 1.0;
    if (g.includes('science') || g.includes('sci-fi')) return 1.3;
    return 1.0;
  }

  /**
   * Theme modifier based on presence of secondary theme and complexity.
   */
  private static getThemeModifier(primary: string, secondary?: string): number {
    let mod = 1.0;
    if (secondary) mod += 0.2;
    // If primary theme is "Power and Corruption" or "Identity" - slightly higher complexity
    if (primary.toLowerCase().includes('power') || primary.toLowerCase().includes('identity')) {
      mod += 0.1;
    }
    return mod;
  }

  /**
   * Structure multiplier for chosen story structure.
   */
  private static getStructureMultiplier(structure: string): number {
    // Nonlinear or Parallel = more complexity
    if (structure === 'Nonlinear' || structure === 'Parallel') return 1.2;
    if (structure === "Hero's Journey" || structure === 'Three-Act Structure') return 1.1;
    return 1.0;
  }

  /**
   * Calculate complexity from characters:
   * More characters + complex archetypes = higher complexity impact.
   */
  private static getCharacterComplexityImpact(chars: Character[]): number {
    let impact = 0;
    for (const c of chars) {
      if (c.archetype === 'The Villain' || c.archetype === 'The Anti-Hero') {
        impact += 0.3;
      } else {
        impact += 0.1;
      }
      // More relationships = higher complexity
      if (c.relationships) impact += Math.min(0.5, c.relationships.length * 0.05);
    }
    return impact;
  }

  /**
   * Generate subplot guidance.
   * We'll assume up to 2-3 subplots based on complexity and world details, spreading them across chapters.
   */
  private static generateSubplotGuidance(params: NovelParameters, chapters: number): SubplotGuidance[] {
    // Decide number of subplots (1 or 2) based on complexity
    const complexityCheck = (params.world_complexity + (params.secondary_theme ? 1 : 0));
    const subplotCount = complexityCheck > 5 ? 2 : 1;

    const subplots: SubplotGuidance[] = [];
    for (let i = 1; i <= subplotCount; i++) {
      const subplotName = `Subplot ${i}`;
      const chaptersData = [];
      for (let ch = 1; ch <= chapters; ch++) {
        // Spread subplot appearances every ~4-5 chapters
        const focusLevel = (ch % 4 === 0) ? 0.8 : (ch % 4 === 2 ? 0.5 : 0.2);
        chaptersData.push({
          chapter: ch,
          focusLevel: parseFloat(focusLevel.toFixed(1)),
          themeLink: i === 1 ? params.primary_theme : params.secondary_theme || params.primary_theme
        });
      }

      subplots.push({ subplotName, chapters: chaptersData });
    }

    return subplots;
  }

  /**
   * Generate character guidance.
   * Distribute character appearances roughly evenly, with protagonists appearing more often.
   */
  private static generateCharacterGuidance(params: NovelParameters, chapters: number): CharacterGuidance[] {
    const guidance: CharacterGuidance[] = [];
    for (const char of params.characters) {
      const freq = char.role === 'protagonist' ? 0.9 : (char.role === 'antagonist' ? 0.7 : 0.5);
      // Suggested actions vary by role
      const actions = char.role === 'protagonist' 
        ? ['Reveal backstory', 'Establish goal', 'Show internal conflict']
        : (char.role === 'antagonist'
          ? ['Heighten conflict', 'Challenge protagonist', 'Foreshadow danger']
          : ['Support main cast', 'Convey thematic subtext', 'Offer respite or insight']
        );

      // Summarize chapter ranges (in groups of roughly chapters/3)
      const segmentSize = Math.max(1, Math.floor(chapters / 3));
      const rolesInChapters: Array<{ chapterRange: string; suggestedActions: string[] }> = [];
      for (let i = 0; i < 3; i++) {
        const start = i * segmentSize + 1;
        const end = (i === 2) ? chapters : (i+1)*segmentSize;
        rolesInChapters.push({
          chapterRange: `Ch${start}-${end}`,
          suggestedActions: actions
        });
      }

      guidance.push({
        characterName: char.name || 'Unnamed Character',
        appearanceFrequency: freq,
        rolesInChapters
      });
    }
    return guidance;
  }

  /**
   * Generate chapter-by-chapter guidance:
   * - Determine scene balance (action/dialogue/introspection) based on storyWeight
   * - Determine tension level from start to end (linear increase)
   * - Assign viewpoint distribution (protagonist-heavy)
   * - Key objectives (influenced by subplots and characters)
   */
  private static generateChapterGuidance(
    params: NovelParameters,
    chapters: number,
    storyWeight: number,
    subplotDistribution: SubplotGuidance[],
    characterGuidance: CharacterGuidance[]
  ): ChapterGuidance[] {
    const chapterGuides: ChapterGuidance[] = [];
    for (let ch = 1; ch <= chapters; ch++) {
      const progress = ch / chapters;
      // Tension: low at start (0.2) high at end (1.0)
      const tensionLevel = parseFloat((0.2 + progress * 0.8).toFixed(2));

      // Scene balance: If storyWeight > 2.0 => more introspection and dialogue
      const actionBase = 40;
      const dialogueBase = 30;
      const introspectionBase = 30;
      let action = actionBase;
      let dialogue = dialogueBase;
      let introspection = introspectionBase;
      if (storyWeight > 2.0) {
        // Shift from action to introspection
        const shift = Math.floor((storyWeight - 2.0) * 10);
        introspection += shift;
        action -= shift;
      }

      // Ensure percentages sum to 100
      const total = action + dialogue + introspection;
      action = Math.round((action / total) * 100);
      dialogue = Math.round((dialogue / total) * 100);
      introspection = Math.round((introspection / total) * 100);

      // Viewpoint: Mostly protagonist POV, occasionally others
      const viewpointDistribution = ch % 5 === 0 
        ? 'Protagonist POV with brief supporting character POV'
        : 'Primarily protagonist POV';

      // Key objectives: 
      const keyObjectives = [`Advance main plot theme: ${params.primary_theme}`];
      if (ch === 1) {
        keyObjectives.push('Establish setting and tone');
      } else if (ch === chapters) {
        keyObjectives.push('Resolve main conflicts');
      }

      // Integrate subplot
      const subplotInvolvements: string[] = [];
      for (const subplot of subplotDistribution) {
        const chData = subplot.chapters.find(c => c.chapter === ch)!;
        if (chData.focusLevel > 0.5) {
          subplotInvolvements.push(`Reinforce ${subplot.subplotName} (focus ${chData.focusLevel}) linked to ${chData.themeLink}`);
        }
      }

      // Character focus: pick 1-2 chars to highlight
      const charFocus: string[] = [];
      const protagonist = characterGuidance.find(c => c.appearanceFrequency > 0.8);
      if (protagonist) charFocus.push(`Highlight ${protagonist.characterName}'s internal struggles`);
      if (ch % 4 === 0) {
        // Every few chapters highlight antagonist or supporting char
        const antagonist = characterGuidance.find(c => c.characterName.toLowerCase().includes('villain') || c.appearanceFrequency === 0.7);
        if (antagonist) charFocus.push(`Confront ${antagonist.characterName} to raise stakes`);
      }

      chapterGuides.push({
        chapterRange: `Chapter ${ch}`,
        sceneBalance: { action, dialogue, introspection },
        tensionLevel,
        viewpointDistribution,
        keyObjectives,
        subplotInvolvement: subplotInvolvements,
        characterFocus: charFocus
      });
    }

    return chapterGuides;
  }

  /**
   * Create a final outline guidance text that the LLM can use for better generation.
   */
  private static createOutlineGuidanceText(metrics: ProcessedMetrics): string {
    const { recommendedChapters, chapterGuidance } = metrics;

    // Summarize the first few and last few chapters for brevity
    const firstThree = chapterGuidance.slice(0, 3);
    const lastThree = chapterGuidance.slice(-3);

    let guidance = `Novel Outline Guidance:
Total Chapters: ${recommendedChapters}

Early Chapters (Example: ${firstThree.map(c => c.chapterRange).join(', ')}):
${firstThree.map(c => `
${c.chapterRange}:
- Key Objectives: ${c.keyObjectives.join(', ')}
- Scene Balance: ${c.sceneBalance.action}% action, ${c.sceneBalance.dialogue}% dialogue, ${c.sceneBalance.introspection}% introspection
- Tension: ${c.tensionLevel}
- Viewpoint: ${c.viewpointDistribution}
- Subplots: ${c.subplotInvolvement.join('; ') || 'N/A'}
- Character Focus: ${c.characterFocus.join('; ') || 'N/A'}
`).join('')}

Final Chapters (Example: ${lastThree.map(c => c.chapterRange).join(', ')}):
${lastThree.map(c => `
${c.chapterRange}:
- Key Objectives: ${c.keyObjectives.join(', ')}
- Scene Balance: ${c.sceneBalance.action}% action, ${c.sceneBalance.dialogue}% dialogue, ${c.sceneBalance.introspection}% introspection
- Tension: ${c.tensionLevel}
- Viewpoint: ${c.viewpointDistribution}
- Subplots: ${c.subplotInvolvement.join('; ') || 'N/A'}
- Character Focus: ${c.characterFocus.join('; ') || 'N/A'}
`).join('')}

Use this guidance to ensure each chapter is planned with clear objectives, balanced scenes, integrated subplots, and proper character spotlighting.
`;

    return guidance.trim();
  }
} 