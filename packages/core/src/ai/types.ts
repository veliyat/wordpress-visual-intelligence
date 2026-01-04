/**
 * AI Adapter Types
 *
 * Provider-agnostic types for AI integration.
 * Used by perception (boundary detection) and intelligence (IR construction).
 */

/**
 * Response from an AI vision analysis
 */
export interface AIResponse {
  /** The text content returned by the AI */
  content: string;
  /** Token usage information (if available) */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Configuration for creating an AI adapter
 */
export interface AIConfig {
  /** Which AI provider to use */
  provider: 'claude' | 'openai';
  /** API key for the provider */
  apiKey: string;
  /** Model to use (provider-specific, has defaults) */
  model?: string;
  /** Maximum tokens in response */
  maxTokens?: number;
}

/**
 * Provider-agnostic AI adapter interface
 */
export interface AIAdapter {
  /**
   * Analyze an image with a text prompt
   * @param image - Image buffer (PNG or JPEG)
   * @param prompt - Instructions for analysis
   * @returns AI response with content and optional usage stats
   */
  analyzeImage(image: Buffer, prompt: string): Promise<AIResponse>;

  /**
   * Send a text-only prompt (no image)
   * @param prompt - The prompt to send
   * @returns AI response
   */
  complete(prompt: string): Promise<AIResponse>;

  /** The provider name for this adapter */
  readonly provider: 'claude' | 'openai';
}

/**
 * Factory function type for creating AI adapters
 */
export type CreateAIAdapter = (config: AIConfig) => AIAdapter;
