import { Logger } from './services/utils/Logger';

const requiredEnvVars = ['OPENAI_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_KEY','LLM_API_URL'];
for (const varName of requiredEnvVars) {
 if(!process.env[varName]) {
   Logger.error(`Env var ${varName} not set.`);
   process.exit(1);
 }
}

Logger.info('Novel Generation System started.'); 