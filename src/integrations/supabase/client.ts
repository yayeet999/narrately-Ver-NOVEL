import { createClient } from '@supabase/supabase-js';
import { Logger } from '../../services/utils/Logger';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  Logger.error('SUPABASE_URL not set.');
  throw new Error('SUPABASE_URL is required.');
}

if (!SUPABASE_KEY) {
  Logger.error('NEXT_PUBLIC_SUPABASE_ANON_KEY not set.');
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY); 