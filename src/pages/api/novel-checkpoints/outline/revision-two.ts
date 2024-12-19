import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Logger } from '../../../../services/utils/Logger';
import { ApiResponse } from '../shared/types';
import { ValidationError, createCheckpointContext } from '../shared/validation';
import { StoryParameterProcessor } from '../../../../services/novel/StoryParameterProcessor';
import { llm } from '../../../../services/novel/LLMClient';
import { outlineRefinementPrompt } from '../../../../services/novel/PromptTemplates';

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
    
    // Get the first revision outline
    const { data: outlineData, error: outlineError } = await supabaseClient
      .from('novels')
      .select('outline_data')
      .eq('id', context.novelId)
      .single();

    if (outlineError || !outlineData?.outline_data?.current) {
      throw new Error('Failed to fetch first revision outline');
    }

    const firstRevisionOutline = outlineData.outline_data.current;

    // Process parameters for guidance
    const processedParams = StoryParameterProcessor.processParameters(context.parameters);
    Logger.info('Parameters processed for second outline revision');

    // Perform second revision
    let attempts = 0;
    let revisedOutline: string | null = null;

    while (attempts < MAX_RETRIES && !revisedOutline) {
      try {
        const prompt = outlineRefinementPrompt(
          context.parameters,
          firstRevisionOutline,
          2
        ).substring(0, 20000); // Trim to max length

        const result = await llm.generate({
          prompt,
          max_tokens: 3000,
          temperature: 0.7
        });

        if (result && result.length >= MIN_OUTLINE_LENGTH) {
          revisedOutline = result;
        } else {
          throw new Error('Generated second revision is too short');
        }
      } catch (error) {
        attempts++;
        Logger.warn(`Second outline revision attempt ${attempts} failed:`, error);
        if (attempts === MAX_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!revisedOutline) {
      throw new Error('Failed to generate second outline revision after multiple attempts');
    }

    // Store second revision
    const { error: updateError } = await supabaseClient
      .from('novels')
      .update({
        outline_status: 'pass2',
        outline_version: 2,
        outline_data: {
          ...outlineData.outline_data,
          current: revisedOutline,
          iterations: [
            ...(outlineData.outline_data.iterations || []),
            {
              content: revisedOutline,
              timestamp: new Date().toISOString()
            }
          ]
        }
      })
      .eq('id', context.novelId);

    if (updateError) {
      throw updateError;
    }

    Logger.info(`Second outline revision completed for novel ${context.novelId}`);
    return res.status(200).json({
      success: true,
      novelId: context.novelId
    });

  } catch (error) {
    Logger.error('Error in second outline revision:', error);
    
    const statusCode = error instanceof ValidationError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
} 