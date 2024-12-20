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

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3,
      timeout: 60000,
    });
  }

  async generate(options: GenerateOptions): Promise<string> {
    try {
      const { prompt, max_tokens, temperature, stream = false } = options;

      if (stream) {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens,
          temperature,
          stream: true,
        });

        let fullContent = '';
        for await (const chunk of response) {
          if (chunk.choices[0]?.delta?.content) {
            fullContent += chunk.choices[0].delta.content;
          }
        }
        return fullContent;
      }

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens,
        temperature,
        stream: false,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      Logger.error('Error in LLM generation:', error);
      throw error;
    }
  }
}

export const llm = new LLMClient();
