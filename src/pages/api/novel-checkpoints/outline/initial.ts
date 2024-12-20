import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../integrations/supabase/client';
import { Logger } from '../../../../services/utils/Logger';
import { ApiResponse } from '../shared/types';
import { ValidationError, createCheckpointContext } from '../shared/validation';
import { StoryParameterProcessor } from '../../../../services/novel/StoryParameterProcessor';
import { llm } from '../../../../services/novel/LLMClient';
import { outlinePrompt } from '../../../../services/novel/PromptTemplates';
import { generateOutlineInstructions } from '../../../../services/novel/ParameterIntegration';

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
    Logger.info('Parameters processed for outline generation');

    // Generate initial outline
    let attempts = 0;
    let outline: string | null = null;

    while (attempts < MAX_RETRIES && !outline) {
      try {
        const outlineInstructions = generateOutlineInstructions(parameters);
        const prompt = outlinePrompt(parameters, outlineInstructions).substring(0, 20000);

        const result = await llm.generate({
          prompt,
          max_tokens: 3000,
          temperature: 0.7
        });

        if (result && result.length >= MIN_OUTLINE_LENGTH) {
          outline = result;
        } else {
          throw new Error('Generated outline is too short');
        }
      } catch (error) {
        attempts++;
        Logger.warn(`Outline generation attempt ${attempts} failed:`, error);
        if (attempts === MAX_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!outline) {
      throw new Error('Failed to generate outline after multiple attempts');
    }

    // Store initial outline
    const { error: updateError } = await supabase
      .from('novels')
      .update({
        outline_data: {
          current: outline,
          iterations: [{
            content: outline,
            timestamp: new Date().toISOString()
          }]
        }
      })
      .eq('id', novelId);

    if (updateError) {
      throw updateError;
    }

    Logger.info(`Initial outline generated for novel ${novelId}`);
    return res.status(200).json({
      success: true,
      novelId: novelId
    });

  } catch (error) {
    Logger.error('Error in outline generation:', error);
    const statusCode = error instanceof ValidationError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
} 