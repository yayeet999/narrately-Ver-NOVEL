import { createClient } from '@supabase/supabase-js';
import { Logger } from '../../services/utils/Logger';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
 Logger.error('SUPABASE_URL not set.');
 throw new Error('SUPABASE_URL is required.');
}

if (!SUPABASE_SERVICE_KEY) {
 Logger.error('SUPABASE_SERVICE_KEY not set.');
 throw new Error('SUPABASE_SERVICE_KEY is required.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY); 