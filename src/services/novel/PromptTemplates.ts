import { NovelParameters } from './NovelParameters';

export function outlinePrompt(params: NovelParameters, integrationNotes: string, outlineGuidance?: string): string {
  return `
${integrationNotes}

${outlineGuidance ? `ADDITIONAL OUTLINE GUIDANCE:\n${outlineGuidance}\n\n` : ''}

You are a world-class author creating a detailed, world-class novel outline based on the following parameters.

${parametersAsText(params)}

Your task:
- Produce a very detailed outline for the entire novel.
- Indicate exactly how many chapters there will be.
- Describe each chapter's key events, character developments, conflicts, and thematic progressions.
- Ensure the outline sets the stage for a narrative of high quality, rich complexity, emotional depth, and thematic resonance.
`.trim();
}

export function outlineRefinementPrompt(params: NovelParameters, currentOutline: string, passNumber: number): string {
  return `
You have an existing novel outline (below). This is Outline Refinement Pass #${passNumber}.
Your goal: Improve and refine the outline further based on parameters and instructions.

Focus on:
- Adding more depth to character arcs, emotional states, thematic progressions.
- For pass #1: Enhance detail, clarify pacing, add emotional beats, subplots, thematic checkpoints.
- For pass #2: Add even finer detail on character relationships, subtle foreshadowing, cultural/world richness, and ensuring structural integrity matches the desired story structure.

Current Outline:
${currentOutline}

Parameters:
${parametersAsText(params)}

Refine this outline again. Output the improved outline.
`.trim();
}

export function chapterDraftPrompt(params: NovelParameters, outlineSegment: string, previousChapters: string[], chapterNumber: number, integrationNotes: string): string {
  const prevChaps = previousChapters.map((ch, i) => `CHAPTER ${i + 1}:\n${ch}\n`).join('\n');
  return `
${integrationNotes}

You are continuing to write a top-tier novel following the given outline and parameters. Think internally, then produce only the final chapter text.

Context:
- This is Chapter ${chapterNumber}.
- Outline snippet for this chapter:
${outlineSegment}

Previously written chapters (for continuity):
${prevChaps || 'None so far'}

Parameters:
${parametersAsText(params)}

INSTRUCTIONS:
1. Think internally about coherence and quality (no need to output reasoning).
2. Produce a single, coherent chapter text (~${params.average_chapter_length} words).
3. Output only the final polished chapter text, no extra explanation.
`.trim();
}

export function comparisonPrompt(draftA: string, draftB: string): string {
  return `
You have two chapter drafts (Draft A and Draft B) for the same chapter. Compare them:
- Identify strengths/weaknesses in coherence, thematic depth, character consistency.
- Decide which is superior. If both have strengths, propose a refined combined version.

At the end:
- If Draft A is best: "CHOSEN: Draft A"
- If Draft B is best: "CHOSEN: Draft B"
- If need a combined refinement: "CHOSEN: Refined Version Needed" and provide improvement instructions.
  
Draft A:
${draftA}

Draft B:
${draftB}
`.trim();
}

export function refinementPrompt(chosenDraft: string, critique: string, integrationNotes: string): string {
  return `
${integrationNotes}

You must rewrite the selected chapter draft based on the critique below.

Selected Draft:
${chosenDraft}

Critique / Instructions:
${critique}

Rewrite the chapter with improvements. Output only the improved chapter text.
`.trim();
}

export function chapterRefinementInstructions(passNumber: number): string {
  if (passNumber === 1) {
    return `Refinement Pass 1 Focus:
- Enhance clarity, emotional resonance, characterization details, and ensure alignment with the outline.
- Improve scene-setting, thematic consistency, and linguistic quality.
- Adjust pacing or add missing thematic elements as needed.
`.trim();
  } else {
    return `Refinement Pass 2 Focus:
- Further polish stylistic continuity, subtle thematic layering, dialogue flow.
- Ensure continuity with previous chapters and desired narrative style.
- Final polish for a coherent, high-quality chapter.
`.trim();
  }
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
`.trim();
}

export const outlineGenerationPrompt = (parameters: any) => {
  return `You are a professional novelist tasked with creating a detailed outline for a novel based on the following parameters:

${JSON.stringify(parameters, null, 2)}

Please create a chapter-by-chapter outline that:
1. Follows a clear narrative arc with rising action, climax, and resolution
2. Develops characters and their relationships naturally
3. Incorporates the specified themes and elements
4. Maintains consistent pacing and engagement
5. Balances main plot and subplots effectively

Format each chapter as:

Chapter X: [Title]
[2-3 paragraphs describing key events, character development, and plot progression]

Begin the outline now:`;
}; 