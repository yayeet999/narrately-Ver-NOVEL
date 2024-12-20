import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../integrations/supabase/client';
import { Logger } from '../../../../services/utils/Logger';
import { ApiResponse } from '../shared/types';
import { ValidationError, createCheckpointContext } from '../shared/validation';
import { StoryParameterProcessor } from '../../../../services/novel/StoryParameterProcessor';
import { llm } from '../../../../services/novel/LLMClient';
import { outlineGenerationPrompt } from '../../../../services/novel/PromptTemplates';

const MIN_OUTLINE_LENGTH = 1000;
const MAX_RETRIES = 3;

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const context = await createCheckpointContext(req);
  const { novelId, parameters } = context;

  try {
    // Extract only necessary parameters
    const outlineParams: OutlineParameters = {
      title: parameters.title,
      primary_genre: parameters.primary_genre,
      primary_theme: parameters.primary_theme,
      characters: parameters.characters.map(char => ({
        name: char.name,
        role: char.role,
        archetype: char.archetype,
        arc_type: char.arc_type
      })),
      story_description: parameters.story_description,
      story_structure: parameters.story_structure
    };

    // Update status to show we're starting outline generation
    await supabase
      .from('novels')
      .update({
        novel_status: 'outline_in_progress',
        outline_status: 'generating',
        error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', novelId);

    // Process parameters for guidance
    const processedParams = StoryParameterProcessor.processParameters(outlineParams);
    Logger.info('Parameters processed for initial outline');

    // Generate initial outline
    let attempts = 0;
    let initialOutline: string | null = null;
    let lastError: Error | null = null;

    while (attempts < MAX_RETRIES && !initialOutline) {
      try {
        Logger.info(`Attempt ${attempts + 1} to generate initial outline`);
        const prompt = outlineGenerationPrompt(outlineParams).substring(0, 20000);
        const result = await llm.generate({
          prompt,
          max_tokens: 4000, // Increased for more detailed outlines
          temperature: 0.7
        });

        // Validate the outline structure
        try {
          const outlineData = JSON.parse(result);
          if (!outlineData.title || !Array.isArray(outlineData.chapters)) {
            throw new Error('Invalid outline structure');
          }
          initialOutline = result;
          Logger.info('Successfully generated initial outline');
        } catch (parseError) {
          throw new Error('Generated outline is not in valid JSON format');
        }
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        Logger.warn(`Initial outline attempt ${attempts} failed:`, error);
        
        if (attempts < MAX_RETRIES) {
          await supabase
            .from('novels')
            .update({
              error: `Attempt ${attempts} failed: ${lastError.message}. Retrying...`,
              updated_at: new Date().toISOString()
            })
            .eq('id', novelId);
          
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempts), 10000)));
        }
      }
    }

    if (!initialOutline) {
      throw new Error(lastError?.message || 'Failed to generate initial outline after multiple attempts');
    }

    // Store initial outline with updated status
    const { error: updateError } = await supabase
      .from('novels')
      .update({
        novel_status: 'outline_in_progress',
        outline_status: 'initial',
        outline_version: 0,
        outline_data: {
          current: JSON.parse(initialOutline),
          iterations: [
            {
              content: JSON.parse(initialOutline),
              timestamp: new Date().toISOString()
            }
          ]
        },
        error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', novelId);

    if (updateError) {
      throw updateError;
    }

    Logger.info(`Initial outline completed for novel ${novelId}`);
    return res.status(200).json({
      success: true,
      novelId: novelId
    });

  } catch (error) {
    Logger.error('Error in initial outline:', error);
    const statusCode = error instanceof ValidationError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    
    try {
      await supabase
        .from('novels')
        .update({
          novel_status: 'error',
          outline_status: 'error',
          error: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', novelId);
    } catch (updateError) {
      Logger.error('Failed to update error status:', updateError);
    }
    
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
} 