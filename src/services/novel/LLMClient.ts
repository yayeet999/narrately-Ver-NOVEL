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
      apiKey: OPENAI_API_KEY
    });
    // Use a standard OpenAI model
    this.model = 'gpt-4o-mini'; // or 'gpt-3.5-turbo' for faster/cheaper operations
  }

  async generate(request: { 
    prompt: string; 
    max_tokens: number; 
    temperature: number;
  }): Promise<string> {
    try {
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
        throw new Error('No completion choices returned from OpenAI.');
      }

      const output = completion.choices[0].message?.content?.trim();
      
      if (!output) {
        throw new Error('Empty response from OpenAI.');
      }

      return output;
    } catch (error: any) {
      Logger.error('Error communicating with OpenAI LLM:', error);
      
      // Enhanced error handling
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

  // Helper method for streaming responses if needed
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

// Export a singleton instance
export const llm = new LLMClient();
