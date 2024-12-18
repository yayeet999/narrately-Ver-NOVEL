import { NextApiRequest } from 'next';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../../../services/utils/Logger';
import { CheckpointContext } from './types';
import { validateAndFillDefaults } from '../../../../services/novel/Validation';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function validateRequest(
  req: NextApiRequest,
  requireAuth = true
): Promise<{ userId: string; accessToken: string }> {
  if (req.method !== 'POST') {
    throw new ValidationError('Method not allowed');
  }

  const authHeader = req.headers.authorization;
  if (requireAuth && (!authHeader || !authHeader.startsWith('Bearer '))) {
    throw new ValidationError('No access token provided');
  }

  const accessToken = authHeader?.replace('Bearer ', '').trim() || '';
  const { user_id } = req.body;

  if (!user_id) {
    throw new ValidationError('Missing user_id in request body');
  }

  return { userId: user_id, accessToken };
}

export function validateEnvironment(): void {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new ValidationError('Missing Supabase configuration');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new ValidationError('Missing OpenAI API key');
  }
}

export async function createCheckpointContext(
  req: NextApiRequest,
  supabaseClient: SupabaseClient
): Promise<CheckpointContext> {
  const { userId, accessToken } = await validateRequest(req);
  validateEnvironment();

  const { parameters, novelId } = req.body;
  if (!parameters) {
    throw new ValidationError('Missing parameters in request body');
  }

  if (!novelId) {
    throw new ValidationError('Missing novelId in request body');
  }

  // Validate and process parameters
  try {
    const validatedParams = validateAndFillDefaults(parameters);
    Logger.info('Parameters validated successfully');

    return {
      novelId,
      userId,
      parameters: validatedParams,
      supabaseClient
    };
  } catch (error) {
    Logger.error('Parameter validation failed:', error);
    throw new ValidationError(error instanceof Error ? error.message : 'Parameter validation failed');
  }
} 