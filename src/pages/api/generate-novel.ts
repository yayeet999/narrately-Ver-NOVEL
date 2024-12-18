import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { NovelGenerator } from '../../services/novel/NovelGenerator';
import { Logger } from '../../services/utils/Logger';

type Data = {
  novelId?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    Logger.warn('No access token provided in request');
    return res.status(401).json({ error: 'No access token provided' });
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();
  const { user_id, parameters } = req.body;

  if (!user_id || !parameters) {
    Logger.warn('Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabaseServerClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );

  try {
    const { novelId } = await NovelGenerator.generateNovel(user_id, parameters, supabaseServerClient);
    Logger.info(`Novel generation started: ${novelId}`);
    return res.status(200).json({ novelId });
  } catch (error: any) {
    Logger.error('Error generating novel:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 