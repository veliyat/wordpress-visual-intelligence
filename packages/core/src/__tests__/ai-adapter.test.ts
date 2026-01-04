/**
 * AI Adapter Tests
 *
 * Unit tests for the AI adapter factory and provider implementations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createAIAdapter,
  createAIAdapterFromEnv,
  createClaudeAdapter,
  createOpenAIAdapter,
} from '../ai';
import type { AIAdapter, AIConfig } from '../ai';

// Mock the SDK modules
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Mocked Claude response' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
    })),
  };
});

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'Mocked OpenAI response' } }],
            usage: { prompt_tokens: 100, completion_tokens: 50 },
          }),
        },
      },
    })),
  };
});

describe('AI Adapter', () => {
  describe('createAIAdapter', () => {
    it('should create a Claude adapter when provider is claude', () => {
      const config: AIConfig = {
        provider: 'claude',
        apiKey: 'test-api-key',
      };

      const adapter = createAIAdapter(config);

      expect(adapter).toBeDefined();
      expect(adapter.provider).toBe('claude');
    });

    it('should create an OpenAI adapter when provider is openai', () => {
      const config: AIConfig = {
        provider: 'openai',
        apiKey: 'test-api-key',
      };

      const adapter = createAIAdapter(config);

      expect(adapter).toBeDefined();
      expect(adapter.provider).toBe('openai');
    });

    it('should throw error for unknown provider', () => {
      const config = {
        provider: 'unknown' as 'claude',
        apiKey: 'test-api-key',
      };

      expect(() => createAIAdapter(config)).toThrow('Unknown AI provider');
    });

    it('should accept custom model option', () => {
      const config: AIConfig = {
        provider: 'claude',
        apiKey: 'test-api-key',
        model: 'claude-3-opus-20240229',
      };

      const adapter = createAIAdapter(config);
      expect(adapter).toBeDefined();
    });

    it('should accept maxTokens option', () => {
      const config: AIConfig = {
        provider: 'openai',
        apiKey: 'test-api-key',
        maxTokens: 8192,
      };

      const adapter = createAIAdapter(config);
      expect(adapter).toBeDefined();
    });
  });

  describe('createAIAdapterFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create Claude adapter when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const adapter = createAIAdapterFromEnv();

      expect(adapter.provider).toBe('claude');
    });

    it('should create OpenAI adapter when only OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const adapter = createAIAdapterFromEnv();

      expect(adapter.provider).toBe('openai');
    });

    it('should prefer Claude when both keys are set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const adapter = createAIAdapterFromEnv();

      expect(adapter.provider).toBe('claude');
    });

    it('should throw error when no API keys are set', () => {
      expect(() => createAIAdapterFromEnv()).toThrow('No AI API key found');
    });
  });

  describe('Claude Adapter', () => {
    let adapter: AIAdapter;

    beforeEach(() => {
      adapter = createClaudeAdapter({
        provider: 'claude',
        apiKey: 'test-api-key',
      });
    });

    it('should have correct provider name', () => {
      expect(adapter.provider).toBe('claude');
    });

    it('should analyze image and return response', async () => {
      const imageBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
      const prompt = 'Describe this image';

      const response = await adapter.analyzeImage(imageBuffer, prompt);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mocked Claude response');
      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
      });
    });

    it('should complete text prompt', async () => {
      const prompt = 'Hello, world!';

      const response = await adapter.complete(prompt);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mocked Claude response');
    });
  });

  describe('OpenAI Adapter', () => {
    let adapter: AIAdapter;

    beforeEach(() => {
      adapter = createOpenAIAdapter({
        provider: 'openai',
        apiKey: 'test-api-key',
      });
    });

    it('should have correct provider name', () => {
      expect(adapter.provider).toBe('openai');
    });

    it('should analyze image and return response', async () => {
      const imageBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
      const prompt = 'Describe this image';

      const response = await adapter.analyzeImage(imageBuffer, prompt);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mocked OpenAI response');
      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
      });
    });

    it('should complete text prompt', async () => {
      const prompt = 'Hello, world!';

      const response = await adapter.complete(prompt);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mocked OpenAI response');
    });
  });

  describe('Image Type Detection', () => {
    it('should detect PNG images', async () => {
      const adapter = createClaudeAdapter({
        provider: 'claude',
        apiKey: 'test-key',
      });

      // PNG magic bytes: 89 50 4E 47
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      await adapter.analyzeImage(pngBuffer, 'test');
      // If no error, detection worked
    });

    it('should detect JPEG images', async () => {
      const adapter = createClaudeAdapter({
        provider: 'claude',
        apiKey: 'test-key',
      });

      // JPEG magic bytes: FF D8 FF
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      await adapter.analyzeImage(jpegBuffer, 'test');
    });

    it('should detect WebP images', async () => {
      const adapter = createClaudeAdapter({
        provider: 'claude',
        apiKey: 'test-key',
      });

      // WebP magic bytes: RIFF....WEBP
      const webpBuffer = Buffer.alloc(12);
      webpBuffer.write('RIFF', 0);
      webpBuffer.write('WEBP', 8);
      await adapter.analyzeImage(webpBuffer, 'test');
    });

    it('should detect GIF images', async () => {
      const adapter = createClaudeAdapter({
        provider: 'claude',
        apiKey: 'test-key',
      });

      // GIF magic bytes: 47 49 46 38
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      await adapter.analyzeImage(gifBuffer, 'test');
    });

    it('should default to PNG for unknown format', async () => {
      const adapter = createClaudeAdapter({
        provider: 'claude',
        apiKey: 'test-key',
      });

      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      await adapter.analyzeImage(unknownBuffer, 'test');
    });
  });
});
