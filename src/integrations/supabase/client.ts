import { createClient } from '@supabase/supabase-js';
import { Logger } from '../../services/utils/Logger';

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is required');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// Add error handling for the Supabase client
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    Logger.warn('User signed out');
  } else if (event === 'SIGNED_IN') {
    Logger.info('User signed in');
  }
});
  