import { NextApiRequest } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../../../services/utils/Logger';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function createAuthenticatedClient(req: NextApiRequest): Promise<SupabaseClient> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    Logger.warn('No access token provided in request');
    throw new AuthError('No access token provided');
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    Logger.error('Supabase environment variables not set.');
    throw new Error('Internal server error: missing Supabase config');
  }

  return createClient(
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
}

export async function validateUserAccess(supabaseClient: SupabaseClient, novelId: string): Promise<void> {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !userData.user) {
    throw new AuthError('Failed to authenticate user');
  }

  const { data: novelData, error: novelError } = await supabaseClient
    .from('novels')
    .select('user_id')
    .eq('id', novelId)
    .single();

  if (novelError || !novelData) {
    throw new Error('Novel not found');
  }

  if (novelData.user_id !== userData.user.id) {
    throw new AuthError('Unauthorized access to novel');
  }
}

export async function validateApiKey(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    Logger.error('OPENAI_API_KEY is not set on server.');
    throw new Error('Internal server error: missing OpenAI API key');
  }
} 