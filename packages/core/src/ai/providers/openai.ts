/**
 * OpenAI AI Provider
 *
 * Implementation of AIAdapter for OpenAI's API.
 * Uses the official openai package.
 */

import OpenAI from 'openai';
import type { AIAdapter, AIConfig, AIResponse } from '../types';

/** Default model for OpenAI vision tasks */
const DEFAULT_MODEL = 'gpt-4o';

/** Default max tokens for responses */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Create an OpenAI AI adapter
 */
export function createOpenAIAdapter(config: AIConfig): AIAdapter {
  const client = new OpenAI({
    apiKey: config.apiKey,
  });

  const model = config.model ?? DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  return {
    provider: 'openai',

    async analyzeImage(image: Buffer, prompt: string): Promise<AIResponse> {
      // Detect image type from buffer magic bytes
      const mediaType = detectImageType(image);
      const base64Image = image.toString('base64');
      const dataUrl = `data:${mediaType};base64,${base64Image}`;

      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content ?? '';

      return {
        content,
        usage: response.usage
          ? {
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens,
            }
          : undefined,
      };
    },

    async complete(prompt: string): Promise<AIResponse> {
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content ?? '';

      return {
        content,
        usage: response.usage
          ? {
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens,
            }
          : undefined,
      };
    },
  };
}

/**
 * Detect image MIME type from buffer magic bytes
 */
function detectImageType(buffer: Buffer): 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' {
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }

  // Default to PNG if unknown
  return 'image/png';
}
