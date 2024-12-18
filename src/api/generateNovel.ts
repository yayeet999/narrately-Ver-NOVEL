import type { NextApiRequest, NextApiResponse } from 'next';
import { NovelGenerator } from '../services/novel/NovelGenerator';
import { Logger } from '../services/utils/Logger';
import { supabase } from '../integrations/supabase/client';

type Data = {
 status?: string;
 novelId?: string;
 error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
 if (req.method !== 'POST') {
   return res.status(405).json({ error: 'Method Not Allowed' });
 }

 const { user_id, parameters } = req.body;
 if (!user_id || !parameters) {
   Logger.warn('Missing user_id or parameters.');
   return res.status(400).json({ error: 'Missing user_id or parameters.' });
 }

 try {
   const { novelId } = await NovelGenerator.generateNovel(user_id, parameters, supabase);
   Logger.info(`Novel generation started: ${novelId}`);
   return res.status(200).json({ status:'ok', novelId });
 } catch (error:any) {
   Logger.error('Error generating novel:', error);
   return res.status(500).json({ error: error.message || 'Internal Server Error' });
 }
} 