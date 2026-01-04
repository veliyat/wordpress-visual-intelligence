/**
 * Claude AI Provider
 *
 * Implementation of AIAdapter for Anthropic's Claude API.
 * Uses the official @anthropic-ai/sdk package.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIAdapter, AIConfig, AIResponse } from '../types';

/** Default model for Claude vision tasks */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/** Default max tokens for responses */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Create a Claude AI adapter
 */
export function createClaudeAdapter(config: AIConfig): AIAdapter {
  const client = new Anthropic({
    apiKey: config.apiKey,
  });

  const model = config.model ?? DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  return {
    provider: 'claude',

    async analyzeImage(image: Buffer, prompt: string): Promise<AIResponse> {
      // Detect image type from buffer magic bytes
      const mediaType = detectImageType(image);

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: image.toString('base64'),
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

      // Extract text content from response
      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock?.type === 'text' ? textBlock.text : '';

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    },

    async complete(prompt: string): Promise<AIResponse> {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock?.type === 'text' ? textBlock.text : '';

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
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
