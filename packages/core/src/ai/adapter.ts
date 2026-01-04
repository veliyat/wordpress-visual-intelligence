/**
 * AI Adapter Factory
 *
 * Creates provider-agnostic AI adapters for vision and text analysis.
 * Supports Claude and OpenAI providers.
 */

import type { AIAdapter, AIConfig, CreateAIAdapter } from './types';
import { createClaudeAdapter } from './providers/claude';
import { createOpenAIAdapter } from './providers/openai';

/**
 * Create an AI adapter based on configuration
 *
 * @example
 * ```typescript
 * const adapter = createAIAdapter({
 *   provider: 'claude',
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-sonnet-4-20250514', // optional
 * });
 *
 * const response = await adapter.analyzeImage(imageBuffer, 'Describe this image');
 * ```
 */
export const createAIAdapter: CreateAIAdapter = (config: AIConfig): AIAdapter => {
  switch (config.provider) {
    case 'claude':
      return createClaudeAdapter(config);
    case 'openai':
      return createOpenAIAdapter(config);
    default:
      throw new Error(`Unknown AI provider: ${(config as AIConfig).provider}`);
  }
};

/**
 * Create an AI adapter from environment variables
 *
 * Looks for:
 * - ANTHROPIC_API_KEY → Claude
 * - OPENAI_API_KEY → OpenAI
 *
 * Prefers Claude if both are set.
 */
export function createAIAdapterFromEnv(): AIAdapter {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    return createAIAdapter({
      provider: 'claude',
      apiKey: anthropicKey,
    });
  }

  if (openaiKey) {
    return createAIAdapter({
      provider: 'openai',
      apiKey: openaiKey,
    });
  }

  throw new Error(
    'No AI API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable.'
  );
}
