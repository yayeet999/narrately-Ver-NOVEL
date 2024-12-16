import { NovelParameters } from './NovelParameters';

export function outlinePrompt(params: NovelParameters, integrationNotes: string): string {
 return `
${integrationNotes}

You are a world-class author creating a detailed, world-class novel outline based on the following parameters.

${parametersAsText(params)}

Your task:
- Produce a very detailed outline covering the entire novel, from start to end.
- Indicate exactly how many chapters there will be.
- Describe each chapter's key events, character developments, conflicts, and thematic progressions.
- Ensure the outline sets the stage for a narrative of world-class literary quality, rich in complexity, emotional depth, and thematic resonance.
`;
}

export function chapterDraftPrompt(params: NovelParameters, outlineSegment: string, previousChapters: string[], chapterNumber: number, integrationNotes: string): string {
 const prevChaps = previousChapters.map((ch, i) => `CHAPTER ${i + 1}:\n${ch}\n`).join('\n');
 return `
${integrationNotes}

You are continuing to write a top-tier novel following the given outline and parameters. Before producing the chapter, perform a chain-of-thought reasoning step internally. Output only the chapter text as the final answer.

Context:
- This is Chapter ${chapterNumber}.
- Outline snippet for this chapter:
${outlineSegment}

Previously written chapters (for continuity):
${prevChaps || 'None so far'}

Parameters (reiterated for clarity):
${parametersAsText(params)}

INSTRUCTIONS:
1. Think through the plot details (internally).
2. Produce a single, coherent chapter text that matches style, theme, narrative quality (~${params.average_chapter_length} words).
3. NO explanations in final output. Just final polished chapter text.
`;
}

export function comparisonPrompt(draftA: string, draftB: string): string {
 return `
You have two chapter drafts (Draft A and Draft B) for the same chapter. Your task:
- Compare both drafts.
- Identify which is superior in narrative coherence, thematic depth, character consistency, instructions alignment.
- If one is clearly better, choose it.
- If both have strengths, propose a refined combined version.
- End with "CHOSEN: Draft A", "CHOSEN: Draft B", or "CHOSEN: Refined Version Needed".
- If "Refined Version Needed", provide improvement instructions.

Draft A:
${draftA}

Draft B:
${draftB}
`;
}

export function refinementPrompt(chosenDraft: string, critique: string, integrationNotes: string): string {
 return `
${integrationNotes}

You must now produce a refined version of the chapter based on the critique and improvement instructions:

Selected Draft:
${chosenDraft}

Critique / Instructions:
${critique}

Rewrite the chapter, incorporating improvements. Output only the improved chapter text.
`;
}

function parametersAsText(params: NovelParameters): string {
 return `
**Core**
- Title: ${params.title || 'No Title'}
- Length: ${params.novel_length}
- Chapter Structure: ${params.chapter_structure}
- Avg Chapter Length: ${params.average_chapter_length}
- Chapter Naming: ${params.chapter_naming_style}

**Genre & Themes**
- Primary Genre: ${params.primary_genre}
- Secondary Genre: ${params.secondary_genre || 'None'}
- Primary Theme: ${params.primary_theme}
- Secondary Theme: ${params.secondary_theme || 'None'}

**Characters**
${params.characters.map((c,i)=>`Character ${i+1}: ${c.role}, ${c.archetype}, ${c.age_range}, Arc: ${c.arc_type}, Rel:${c.relationships.join(', ')}`).join('\n')}

**Setting**
- Type: ${params.setting_type}
- World Complexity: ${params.world_complexity}/5
- Cultural Depth: ${params.cultural_depth}/5
- Cultural Framework: ${params.cultural_framework}

**Narrative Foundation**
- POV: ${params.pov}
- Tone Formality: ${params.tone_formality}/5
- Tone Descriptive: ${params.tone_descriptive}/5
- Dialogue Balance: ${params.dialogue_balance}/5

**Plot**
- Structure: ${params.story_structure}
- Conflicts: ${params.conflict_types.join(', ')}
- Resolution: ${params.resolution_style}

**Style Controls**
- Description Density: ${params.description_density}/5
- Pacing Overall: ${params.pacing_overall}/5
- Pacing Variance: ${params.pacing_variance}/5
- Emotional Intensity: ${params.emotional_intensity}/5
- Metaphor Frequency: ${params.metaphor_frequency}/5
- Flashbacks: ${params.flashback_usage}/5
- Foreshadowing: ${params.foreshadowing_intensity}/5

**Technical**
- Language Complexity: ${params.language_complexity}/5
- Sentence Structure: ${params.sentence_structure}
- Paragraph Length: ${params.paragraph_length}

**Content**
- Violence: ${params.violence_level}/5
- Adult Content: ${params.adult_content_level}/5
- Profanity: ${params.profanity_level}/5
- Controversial: ${params.controversial_handling}

**Description**
${params.story_description}
`;
} 