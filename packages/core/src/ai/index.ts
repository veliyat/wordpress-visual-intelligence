/**
 * AI Module
 *
 * Provider-agnostic AI adapter for vision and text analysis.
 * Supports Claude and OpenAI providers.
 */

// Types
export type { AIAdapter, AIConfig, AIResponse, CreateAIAdapter } from './types';

// Factory functions
export { createAIAdapter, createAIAdapterFromEnv } from './adapter';

// Individual providers (for direct use if needed)
export { createClaudeAdapter } from './providers/claude';
export { createOpenAIAdapter } from './providers/openai';
