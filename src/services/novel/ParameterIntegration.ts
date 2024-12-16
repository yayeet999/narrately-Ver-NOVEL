import { NovelParameters } from './NovelParameters';

export function generateOutlineInstructions(params: NovelParameters): string {
 // Summarize key parameters for outline
 return `
[INTEGRATION NOTES - OUTLINE]
- Novel Length: ${params.novel_length} => Adjust complexity/subplots accordingly.
- Genre: ${params.primary_genre}${params.secondary_genre ? ' + ' + params.secondary_genre : ''}, Themes: ${params.primary_theme}${params.secondary_theme ? ' + ' + params.secondary_theme : ''}.
- Story Structure: ${params.story_structure}, ensure outline matches structural beats.
- Setting: ${params.setting_type}, World Complexity: ${params.world_complexity}, Cultural Depth: ${params.cultural_depth}, Framework: ${params.cultural_framework}.
- Characters: Reflect archetypes and arcs in the outline.
- Consider pacing, emotional intensity, and style as per parameters.
- Integrate ${params.story_description ? 'user story description details' : 'no specific user description'}.
`;
}

export function generateChapterInstructions(params: NovelParameters, chapterNumber: number): string {
 return `
[INTEGRATION NOTES - CHAPTER ${chapterNumber}]
- Maintain Genre/Themes: ${params.primary_genre}, ${params.primary_theme}.
- Pacing Overall: ${params.pacing_overall}, Pacing Variance: ${params.pacing_variance}.
- Emotional Intensity: ${params.emotional_intensity}, Metaphors: ${params.metaphor_frequency}, Flashbacks: ${params.flashback_usage}, Foreshadowing: ${params.foreshadowing_intensity}.
- Language Complexity: ${params.language_complexity}, Sentence Structure: ${params.sentence_structure}, Paragraph Length: ${params.paragraph_length}.
- Content Controls: Violence ${params.violence_level}, Adult ${params.adult_content_level}, Profanity ${params.profanity_level}, Controversial: ${params.controversial_handling}.
- Remember POV: ${params.pov}, Tone: Formality ${params.tone_formality}, Descriptive ${params.tone_descriptive}, Dialogue ${params.dialogue_balance}.
`;
}

export function generateRefinementInstructions(params: NovelParameters): string {
 return `
[INTEGRATION NOTES - REFINEMENT]
- Adjust language to complexity level ${params.language_complexity}.
- Respect content controls: Violence ${params.violence_level}, Adult ${params.adult_content_level}, Profanity ${params.profanity_level}, Controversial: ${params.controversial_handling}.
- Enhance thematic and structural consistency if needed.
- Maintain genre and thematic depth.
`;
} 