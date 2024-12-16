import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NovelGenerator } from '../../../src/services/novel/NovelGenerator.js';
import { corsHeaders } from '../_shared/cors.ts';
import { Logger } from '../../../src/services/utils/Logger.js';

serve(async (req) => {
 if (req.method === 'OPTIONS') {
   return new Response(null, { headers: corsHeaders });
 }

 if (req.method !== 'POST') {
   return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
 }

 const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
 const SUPABASE_KEY = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
 const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

 if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
   throw new Error('Missing environment variables');
 }

 try {
   const { user_id, parameters } = await req.json();

   if (!user_id || !parameters) {
     Logger.warn('Missing user_id or parameters in request.');
     return new Response(JSON.stringify({ error: 'Missing user_id or parameters.' }), { status: 400, headers: corsHeaders });
   }

   const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
   const { data: subscription, error: subError } = await supabase
     .from('user_subscriptions')
     .select('*')
     .eq('user_id', user_id)
     .single();

   if (subError || !subscription || !subscription.is_active) {
     Logger.warn(`User ${user_id} lacks active subscription.`);
     return new Response(JSON.stringify({ error: 'Active subscription required.' }), { status: 403, headers: corsHeaders });
   }

   const { novelId } = await NovelGenerator.generateNovel(user_id, parameters);
   Logger.info(`Novel generation started for ${novelId}`);
   return new Response(JSON.stringify({ status: 'ok', novelId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

 } catch (error: any) {
   Logger.error('Error processing request:', error);
   return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500, headers: corsHeaders });
 }
}); 