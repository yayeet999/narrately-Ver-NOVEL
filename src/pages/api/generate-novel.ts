import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Logger } from '../../services/utils/Logger';
import { validateAndFillDefaults } from '../../services/novel/Validation';
import { StoryParameterProcessor } from '../../services/novel/StoryParameterProcessor';
import { ProcessedMetrics, NovelStatus } from './novel-checkpoints/shared/types';
import { NovelStateManager } from './novel-checkpoints/shared/state-manager';

type Data = {
  novelId?: string;
  error?: string;
  details?: string;
  processedMetrics?: ProcessedMetrics;
};

class ParameterProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParameterProcessingError';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Debug Request Information ===');
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('================================');

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      Logger.warn('No access token provided in request');
      return res.status(401).json({ error: 'No access token provided' });
    }

    const accessToken = authHeader.replace('Bearer ', '').trim();
    const { user_id, parameters } = req.body;

    if (!user_id || !parameters) {
      Logger.warn('Missing required fields (user_id or parameters)');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      Logger.error('Supabase environment variables not set.');
      return res.status(500).json({ error: 'Internal server error: missing Supabase config' });
    }

    const supabaseServerClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    // Check for OPENAI_API_KEY
    if (!process.env.OPENAI_API_KEY) {
      Logger.error('OPENAI_API_KEY is not set on server.');
      return res.status(500).json({ error: 'Internal server error: missing OpenAI API key' });
    }

    // Validate and process parameters
    try {
      console.log('Starting parameter validation with:', JSON.stringify(parameters, null, 2));
      const validatedParams = validateAndFillDefaults(parameters);
      console.log('Parameters validated successfully:', JSON.stringify(validatedParams, null, 2));
      
      const processedParams = StoryParameterProcessor.processParameters(validatedParams);
      Logger.info('Parameters processed successfully:', { metrics: processedParams.metrics });

      // Create new novel entry
      const { data: novelData, error: insertError } = await supabaseServerClient
        .from('novels')
        .insert({
          user_id,
          title: validatedParams.title,
          parameters: validatedParams,
          novel_status: NovelStatus.Initializing,
          processed_metrics: processedParams.metrics
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      const novelId = novelData.id;

      Logger.info(`Novel generation initialized: ${novelId}`);
      
      return res.status(200).json({ 
        novelId,
        processedMetrics: processedParams.metrics
      });
    } catch (paramError) {
      Logger.error('Parameter processing failed:', paramError);
      throw new ParameterProcessingError(paramError instanceof Error ? paramError.message : 'Parameter processing failed');
    }

  } catch (unhandledError: any) {
    Logger.error('Unhandled error in generate-novel route:', unhandledError);
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (unhandledError instanceof ParameterProcessingError) {
      errorMessage = unhandledError.message;
      statusCode = 400;
    } else if (unhandledError.response?.status === 504) {
      errorMessage = 'Request timed out - please try again';
      statusCode = 504;
    } else if (unhandledError.response?.status === 401) {
      errorMessage = 'Authentication error - please check your API key';
      statusCode = 401;
    } else if (unhandledError.response?.status === 429) {
      errorMessage = 'Rate limit exceeded - please try again later';
      statusCode = 429;
    } else if (unhandledError.message) {
      errorMessage = unhandledError.message;
    }

    return res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? unhandledError.toString() : undefined
    });
  }
} 