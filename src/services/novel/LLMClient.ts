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
      maxRetries: 3,
      timeout: 60000, // Set timeout in client configuration instead
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
        frequency_penalty: 0
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
          case 503:
            throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
          default:
            throw new Error(`OpenAI API error: ${error.message}`);
        }
      }
      
      throw error;
    }
  }

  async generateStream(request: { 
    prompt: string; 
    max_tokens: number; 
    temperature: number;
  }): Promise<AsyncGenerator<string, void, unknown>> {
    try {
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: "user", 
            content: request.prompt 
          }
        ],
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        stream: true
      });

      async function* textStream() {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      }

      return textStream();
    } catch (error: any) {
      Logger.error('Error in stream generation:', error);
      throw error;
    }
  }
}

export const llm = new LLMClient();
