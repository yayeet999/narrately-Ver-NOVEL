import fetch from 'node-fetch';
import { Logger } from '../utils/Logger';

interface LLMRequest {
  prompt: string;
  max_tokens: number;
  temperature: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    finish_reason: string | null;
    message: {
      role: string;
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.model = 'gpt-4o-mini';
  }

  async generate(request: LLMRequest): Promise<string> {
    try {
      const payload = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.max_tokens,
        temperature: request.temperature
      };

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        Logger.error(`OpenAI API Error: ${errText}`);
        throw new Error(`LLM error: ${errText}`);
      }

      const data: ChatCompletionResponse = await res.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No completion choices returned from OpenAI.');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      Logger.error('Error communicating with OpenAI LLM:', error);
      throw error;
    }
  }
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY must be set.');
}

export const llm = new LLMClient(OPENAI_API_KEY); 