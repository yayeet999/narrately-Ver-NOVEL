import OpenAI from 'openai';
import { Logger } from '../utils/Logger';

interface GenerateOptions {
  prompt: string;
  max_tokens: number;
  temperature: number;
  stream?: boolean;
}

class LLMClient {
  private openai: OpenAI;
  private model = 'gpt-4';
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT = 300000; // 5 minutes

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: this.MAX_RETRIES,
      timeout: this.TIMEOUT,
    });
  }

  async generate(options: GenerateOptions): Promise<string> {
    try {
      const { prompt, max_tokens, temperature, stream = false } = options;

      if (stream) {
        const response = await this.openai.chat.completions.create(
          {
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens,
            temperature,
            stream: true,
          },
          { timeout: this.TIMEOUT }
        );

        let fullContent = '';
        for await (const chunk of response) {
          if (chunk.choices[0]?.delta?.content) {
            fullContent += chunk.choices[0].delta.content;
          }
        }
        return fullContent;
      }

      const response = await this.openai.chat.completions.create(
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens,
          temperature,
          stream: false,
        },
        { timeout: this.TIMEOUT }
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      return content;
    } catch (error) {
      if (error instanceof Error) {
        Logger.error('Error in LLM generation:', {
          error: error.message,
          name: error.name,
          stack: error.stack
        });
        if (error.message.includes('timeout')) {
          throw new Error('OpenAI request timed out after 5 minutes');
        }
      } else {
        Logger.error('Unknown error in LLM generation:', error);
      }
      throw error;
    }
  }
}

export const llm = new LLMClient();
