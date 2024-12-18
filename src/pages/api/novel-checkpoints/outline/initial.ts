import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
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
    // Initialize Supabase client
    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Validate request and create context
    const context = await createCheckpointContext(req, supabaseClient);
    
    // Process parameters
    const processedParams = StoryParameterProcessor.processParameters(context.parameters);
    Logger.info('Parameters processed for outline generation');

    // Generate outline
    let attempts = 0;
    let outline: string | null = null;

    while (attempts < MAX_RETRIES && !outline) {
      try {
        const outlineIntegration = generateOutlineInstructions(context.parameters);
        const prompt = outlinePrompt(
          context.parameters,
          outlineIntegration,
          processedParams.outlineGuidance
        );

        const result = await llm.generate({
          prompt: prompt.substring(0, 20000), // Trim to max length
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

    // Store outline in Supabase
    const { error: updateError } = await supabaseClient
      .from('novels')
      .update({
        outline_status: 'initial',
        outline_version: 0,
        outline_data: {
          current: outline,
          iterations: [{
            content: outline,
            timestamp: new Date().toISOString()
          }]
        }
      })
      .eq('id', context.novelId);

    if (updateError) {
      throw updateError;
    }

    Logger.info(`Initial outline generated and stored for novel ${context.novelId}`);
    return res.status(200).json({
      success: true,
      novelId: context.novelId
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