import { NovelParameters } from './NovelParameters';
import { Logger } from '../utils/Logger';

interface ProcessedMetrics {
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

export class StoryParameterProcessor {
  static processParameters(params: NovelParameters): { metrics: ProcessedMetrics } {
    try {
      if (!params) {
        throw new Error('Parameters object is required');
      }

      const characters = params.characters || [];
      if (!Array.isArray(characters)) {
        throw new Error('Characters must be an array');
      }

      // Calculate recommended chapters based on story complexity
      const baseChapters = 12; // minimum chapters
      const characterComplexity = characters.length * 2;
      const recommendedChapters = Math.min(baseChapters + characterComplexity, 30);

      // Generate subplot distribution
      const subplots = characters
        .filter(char => char.role && char.role !== 'protagonist')
        .map(char => ({
          subplotName: `${char.name || 'Character'}'s Arc`,
          chapters: Array.from(
            { length: Math.floor(recommendedChapters * 0.3) },
            (_, i) => ({
              chapter: i + 1,
              focusLevel: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
              themeLink: `Connection to ${char.name || 'Character'}'s development`
            })
          )
        }));

      // Generate character guidance
      const characterGuidance = characters.map(char => ({
        characterName: char.name || 'Character',
        appearanceFrequency: char.role === 'protagonist' ? 0.8 : 0.5,
        rolesInChapters: Array.from(
          { length: 3 },
          (_, i) => ({
            chapterRange: `Chapters ${i * Math.ceil(recommendedChapters / 3) + 1}-${Math.min((i + 1) * Math.ceil(recommendedChapters / 3), recommendedChapters)}`,
            suggestedActions: [
              i === 0 ? 'Establish character and conflicts' :
              i === 1 ? 'Develop through challenges' :
              'Resolve character arc'
            ]
          })
        )
      }));

      // Generate chapter guidance
      const chapterGuidance = Array.from(
        { length: Math.ceil(recommendedChapters / 3) },
        (_, i) => ({
          chapterRange: `Chapter ${i + 1}`,
          sceneBalance: {
            action: 0.3,
            dialogue: 0.4,
            introspection: 0.3
          },
          tensionLevel: 0.6 + (i * 0.1),
          viewpointDistribution: 'Balanced',
          keyObjectives: ['Advance plot', 'Develop characters', 'Build world'],
          subplotInvolvement: subplots.map(s => s.subplotName),
          characterFocus: characters.map(c => c.name || 'Character')
        })
      );

      return {
        metrics: {
          storyWeight: 1.6, // base complexity metric
          recommendedChapters,
          subplotDistribution: subplots,
          characterGuidance,
          chapterGuidance
        }
      };
    } catch (error) {
      Logger.error('Error in parameter processing:', error);
      throw error;
    }
  }
}

export type { ProcessedMetrics }; 