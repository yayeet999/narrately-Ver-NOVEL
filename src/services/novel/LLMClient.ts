import { Logger } from '../utils/Logger';
import { OpenAI } from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY must be set.');
}

/**
 * This LLMClient now uses the official OpenAI Node.js client.
 * It follows the OpenAI docs for chat completions.
 */
export class LLMClient {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    // Use a standard OpenAI model. If you have access to gpt-4, use that:
    this.model = 'gpt-3.5-turbo';
  }

  async generate(request: { prompt: string; max_tokens: number; temperature: number }): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: request.prompt }
        ],
        max_tokens: request.max_tokens,
        temperature: request.temperature
      });

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No completion choices returned from OpenAI.');
      }

      const output = completion.choices[0].message.content.trim();
      return output;
    } catch (error) {
      Logger.error('Error communicating with OpenAI LLM:', error);
      throw error;
    }
  }
}