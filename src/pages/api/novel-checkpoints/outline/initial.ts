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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const context = await createCheckpointContext(req);
    const { novelId, parameters } = context;

    // Process parameters for guidance
    const processedParams = StoryParameterProcessor.processParameters(parameters);
    Logger.info('Parameters processed for initial outline');

    // Generate initial outline
    let attempts = 0;
    let initialOutline: string | null = null;

    while (attempts < MAX_RETRIES && !initialOutline) {
      try {
        const prompt = outlineGenerationPrompt(parameters).substring(0, 20000);
        const result = await llm.generate({
          prompt,
          max_tokens: 3000,
          temperature: 0.7
        });

        if (result && result.length >= MIN_OUTLINE_LENGTH) {
          initialOutline = result;
        } else {
          throw new Error('Generated outline is too short');
        }
      } catch (error) {
        attempts++;
        Logger.warn(`Initial outline attempt ${attempts} failed:`, error);
        if (attempts === MAX_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!initialOutline) {
      throw new Error('Failed to generate initial outline after multiple attempts');
    }

    // Store initial outline with updated status and version
    const { error: updateError } = await supabase
      .from('novels')
      .update({
        outline_status: 'initial',
        outline_version: 0,
        outline_data: {
          current: initialOutline,
          iterations: [
            {
              content: initialOutline,
              timestamp: new Date().toISOString()
            }
          ]
        },
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
    
    // Update novel status to error if generation fails
    try {
      const context = await createCheckpointContext(req);
      await supabase
        .from('novels')
        .update({
          novel_status: 'error',
          error: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', context.novelId);
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