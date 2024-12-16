import fetch from 'node-fetch';
import { Logger } from '../utils/Logger';

interface LLMRequest {
 prompt: string;
 max_tokens: number;
 temperature: number;
}

interface LLMResponse {
 text: string;
}

export class LLMClient {
 private apiUrl: string;
 private apiKey: string;

 constructor(apiUrl: string, apiKey: string) {
   this.apiUrl = apiUrl;
   this.apiKey = apiKey;
 }

 async generate(request: LLMRequest): Promise<string> {
   try {
     const res = await fetch(this.apiUrl, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${this.apiKey}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify(request),
     });

     if (!res.ok) {
       const errText = await res.text();
       Logger.error(`LLM API Error: ${errText}`);
       throw new Error(`LLM error: ${errText}`);
     }

     const data: LLMResponse = await res.json();
     return data.text.trim();
   } catch (error) {
     Logger.error('Error communicating with LLM:', error);
     throw error;
   }
 }
}

const LLM_API_URL = process.env.LLM_API_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!LLM_API_URL || !OPENAI_API_KEY) {
 Logger.error('LLM_API_URL or OPENAI_API_KEY not set.');
 process.exit(1);
}

export const llm = new LLMClient(LLM_API_URL, OPENAI_API_KEY); 