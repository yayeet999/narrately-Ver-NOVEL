import { NovelParameters } from './NovelParameters';
import { Logger } from '../utils/Logger';

interface OutlineParameters {
  title: string;
  primary_genre: string;
  primary_theme: string;
  characters: Array<{
    name: string;
    role: string;
    archetype: string;
    arc_type: string;
  }>;
  story_description: string;
  story_structure: string;
}

interface ProcessedMetrics {
  storyWeight: number;
  recommendedChapters: number;
  subplotDistribution: Array<{
    subplotName: string;
    chapters: number[];
  }>;
  characterGuidance: Array<{
    characterName: string;
    appearanceFrequency: string;
    arcProgression: string[];
  }>;
}

export class StoryParameterProcessor {
  private static identifyTurningPoints(params: OutlineParameters): string[] {
    const structure = params.story_structure.toLowerCase();
    
    if (structure.includes('three-act')) {
      return [
        'Inciting Incident',
        'First Plot Point',
        'Midpoint',
        'Second Plot Point',
        'Climax'
      ];
    } else if (structure.includes('hero')) {
      return [
        'Call to Adventure',
        'Crossing the Threshold',
        'Tests and Allies',
        'Approach to Inmost Cave',
        'Ordeal',
        'Road Back',
        'Resurrection',
        'Return with Elixir'
      ];
    }
    
    return ['Opening', 'Rising Action', 'Climax', 'Resolution'];
  }

  private static determineEmotionalBeats(params: OutlineParameters): string[] {
    const emotionalBeats: string[] = [];
    
    // Add character-based emotional beats
    params.characters.forEach(char => {
      switch (char.arc_type.toLowerCase()) {
        case 'redemption':
          emotionalBeats.push(`${char.name}'s moral struggle`, `${char.name}'s redemptive moment`);
          break;
        case 'tragedy':
          emotionalBeats.push(`${char.name}'s fatal flaw manifestation`, `${char.name}'s downfall`);
          break;
        case 'growth':
          emotionalBeats.push(`${char.name}'s challenge moment`, `${char.name}'s transformation`);
          break;
        default:
          emotionalBeats.push(`${char.name}'s key character moment`);
      }
    });

    return emotionalBeats;
  }

  static processParameters(params: OutlineParameters): { metrics: ProcessedMetrics } {
    try {
      const turningPoints = this.identifyTurningPoints(params);
      const emotionalBeats = this.determineEmotionalBeats(params);
      
      // Calculate recommended chapters based on story complexity
      const baseChapters = 12; // minimum chapters
      const characterComplexity = params.characters.length * 2;
      const recommendedChapters = Math.min(baseChapters + characterComplexity, 30);

      // Generate subplot distribution
      const subplots = params.characters
        .filter(char => char.role !== 'protagonist')
        .map(char => ({
          subplotName: `${char.name}'s Arc`,
          chapters: Array.from(
            { length: Math.floor(recommendedChapters * 0.3) },
            () => Math.floor(Math.random() * recommendedChapters) + 1
          ).sort((a, b) => a - b)
        }));

      // Generate character guidance
      const characterGuidance = params.characters.map(char => ({
        characterName: char.name,
        appearanceFrequency: char.role === 'protagonist' ? 'high' : 'medium',
        arcProgression: this.generateCharacterArcProgression(char.arc_type, recommendedChapters)
      }));

      return {
        metrics: {
          storyWeight: 1.6, // base complexity metric
          recommendedChapters,
          subplotDistribution: subplots,
          characterGuidance
        }
      };
    } catch (error) {
      Logger.error('Error in parameter processing:', error);
      throw error;
    }
  }

  private static generateCharacterArcProgression(arcType: string, chapters: number): string[] {
    const progression: string[] = [];
    const arcStages = Math.min(5, Math.floor(chapters / 3));
    
    switch (arcType.toLowerCase()) {
      case 'redemption':
        progression.push(
          'Initial moral compromise',
          'Internal conflict',
          'Catalyst for change',
          'Active redemption',
          'Final sacrifice/redemption'
        );
        break;
      case 'tragedy':
        progression.push(
          'Initial success/hubris',
          'Warning signs',
          'Point of no return',
          'Downward spiral',
          'Final fall'
        );
        break;
      case 'growth':
        progression.push(
          'Initial limitations',
          'Challenge acceptance',
          'Learning/adaptation',
          'Testing growth',
          'Mastery/transformation'
        );
        break;
      default:
        progression.push(
          'Introduction',
          'Development',
          'Challenge',
          'Change',
          'Resolution'
        );
    }

    return progression.slice(0, arcStages);
  }
}

export type { ProcessedMetrics, OutlineParameters }; 