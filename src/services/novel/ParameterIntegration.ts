import { NovelParameters } from './NovelParameters';
import { StoryParameterProcessor, ProcessedParameters } from './StoryParameterProcessor';

export function generateOutlineInstructions(params: NovelParameters): string {
  const processedParams = StoryParameterProcessor.processParameters(params);
  return `
[INTEGRATION NOTES - OUTLINE]
- Novel Length: ${params.novel_length}
- Genre: ${params.primary_genre}${params.secondary_genre ? ' + ' + params.secondary_genre : ''}, Themes: ${params.primary_theme}${params.secondary_theme ? ' + ' + params.secondary_theme : ''}.
- Story Structure: ${params.story_structure}
- Setting: ${params.setting_type}, World Complexity: ${params.world_complexity}, Cultural Depth: ${params.cultural_depth}, Framework: ${params.cultural_framework}.
- Characters: Reflect archetypes and arcs in the outline.
- Pacing, emotional intensity, and style as per parameters.
- Integrate ${params.story_description ? 'user story description details' : 'no specific user description'}.

[PROCESSED METRICS]
- Story Weight: ${processedParams.metrics.storyWeight}
- Recommended Chapters: ${processedParams.metrics.recommendedChapters}
- Subplot Distribution: ${processedParams.metrics.subplotDistribution.map(s => 
    `\n  * ${s.subplotName}: ${s.chapters.length} appearances`
  ).join('')}
- Character Focus: ${processedParams.metrics.characterGuidance.map(c => 
    `\n  * ${c.characterName}: ${c.appearanceFrequency} frequency`
  ).join('')}
`.trim();
}

export function generateChapterInstructions(params: NovelParameters, chapterNumber: number): string {
  const processedParams = StoryParameterProcessor.processParameters(params);
  const chapterGuidance = processedParams.metrics.chapterGuidance.find(g => g.chapterRange === `Chapter ${chapterNumber}`);
  
  return `
[INTEGRATION NOTES - CHAPTER ${chapterNumber}]
- Genre/Themes: ${params.primary_genre}, ${params.primary_theme}.
- Pacing: Overall ${params.pacing_overall}, Variance ${params.pacing_variance}.
- Emotional Intensity: ${params.emotional_intensity}, Metaphors: ${params.metaphor_frequency}, Flashbacks: ${params.flashback_usage}, Foreshadowing: ${params.foreshadowing_intensity}.
- Language: Complexity ${params.language_complexity}, Sentence Structure: ${params.sentence_structure}, Paragraph Length: ${params.paragraph_length}.
- Content Controls: Violence ${params.violence_level}, Adult ${params.adult_content_level}, Profanity ${params.profanity_level}, Controversial: ${params.controversial_handling}.
- POV: ${params.pov}, Tone Formality ${params.tone_formality}, Descriptive ${params.tone_descriptive}, Dialogue ${params.dialogue_balance}.

${chapterGuidance ? `[CHAPTER GUIDANCE]
- Scene Balance: Action ${chapterGuidance.sceneBalance.action}%, Dialogue ${chapterGuidance.sceneBalance.dialogue}%, Introspection ${chapterGuidance.sceneBalance.introspection}%
- Tension Level: ${chapterGuidance.tensionLevel}
- Viewpoint: ${chapterGuidance.viewpointDistribution}
- Key Objectives: ${chapterGuidance.keyObjectives.join(', ')}
- Subplot Focus: ${chapterGuidance.subplotInvolvement.join(', ')}
- Character Focus: ${chapterGuidance.characterFocus.join(', ')}` : ''}
`.trim();
}

export function generateRefinementInstructions(params: NovelParameters): string {
  const processedParams = StoryParameterProcessor.processParameters(params);
  
  return `
[INTEGRATION NOTES - REFINEMENT]
- Adjust language complexity to ${params.language_complexity}.
- Respect content controls: Violence ${params.violence_level}, Adult ${params.adult_content_level}, Profanity ${params.profanity_level}, Controversial: ${params.controversial_handling}.
- Enhance thematic, structural consistency if needed.
- Maintain genre and thematic depth.

[REFINEMENT METRICS]
- Story Weight Target: ${processedParams.metrics.storyWeight}
- Scene Balance Target: Action/Dialogue/Introspection ratio should align with chapter guidance
- Maintain consistent character voice and subplot progression
- Ensure tension levels match chapter guidance
`.trim();
} 