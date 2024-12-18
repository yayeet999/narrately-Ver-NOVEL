import { Logger } from '../utils/Logger';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY must be set.');
}

export class LLMClient {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      timeout: 60000, // 60 second timeout
      maxRetries: 3
    });
    this.model = 'gpt-4o-mini';
  }

  async generate(request: { 
    prompt: string; 
    max_tokens: number; 
    temperature: number;
  }): Promise<string> {
    try {
      Logger.info('Starting LLM generation with model:', this.model);
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: "user", 
            content: request.prompt 
          }
        ],
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        presence_penalty: 0,
        frequency_penalty: 0,
        timeout: 60000
      });

      if (!completion.choices || completion.choices.length === 0) {
        Logger.error('No completion choices returned');
        throw new Error('No completion choices returned from OpenAI.');
      }

      const output = completion.choices[0].message?.content?.trim();
      
      if (!output) {
        Logger.error('Empty response from OpenAI');
        throw new Error('Empty response from OpenAI.');
      }

      Logger.info('Successfully generated content of length:', output.length);
      return output;
    } catch (error: any) {
      Logger.error('Error in LLM generation:', error);
      
      if (error instanceof OpenAI.APIError) {
        switch (error.status) {
          case 401:
            throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
          case 429:
            throw new Error('Rate limit exceeded. Please try again later.');
          case 500:
            throw new Error('OpenAI service error. Please try again later.');
          default:
            throw new Error(`OpenAI API error: ${error.message}`);
        }
      }
      
      throw error;
    }
  }
}

export const llm = new LLMClient();
