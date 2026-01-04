/**
 * Boundary Detection Tests
 *
 * Unit tests for AI-based boundary detection with edge snapping.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectVisualBoundaries, detectBoundariesAIOnly } from '../boundaries';
import type { Screenshot } from '../types';
import type { AIAdapter } from '@wp-morph/core';

// Mock edge-snap module
vi.mock('../edge-snap', () => ({
  snapToEdge: vi.fn().mockImplementation(async (_screenshot, approxY, _confidence) => ({
    y: approxY,
    score: 10,
    snapped: true,
  })),
}));

// Create a mock AI adapter
const createMockAdapter = (response: string): AIAdapter => ({
  provider: 'claude',
  analyzeImage: vi.fn().mockResolvedValue({
    content: response,
    usage: { inputTokens: 100, outputTokens: 50 },
  }),
  complete: vi.fn().mockResolvedValue({
    content: response,
    usage: { inputTokens: 50, outputTokens: 25 },
  }),
});

describe('Boundary Detection', () => {
  const createMockScreenshot = (height: number = 1000): Screenshot => ({
    buffer: Buffer.alloc(100),
    width: 1440,
    height,
    format: 'png',
  });

  describe('detectVisualBoundaries', () => {
    it('should detect boundaries from AI response', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 80, confidence: 0.95, description: 'navigation' },
        { approxTop: 80, approxBottom: 600, confidence: 0.9, description: 'hero' },
        { approxTop: 600, approxBottom: 1000, confidence: 0.85, description: 'footer' },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries).toHaveLength(3);
      expect(boundaries[0].top).toBe(0);
      expect(boundaries[2].bottom).toBe(1000);
    });

    it('should return single boundary for empty AI response', async () => {
      const screenshot = createMockScreenshot();
      const adapter = createMockAdapter('[]');

      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].top).toBe(0);
      expect(boundaries[0].bottom).toBe(1000);
      expect(boundaries[0].confidence).toBe(1.0);
    });

    it('should handle AI response wrapped in markdown code block', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = '```json\n[{"approxTop": 0, "approxBottom": 500, "confidence": 0.9}]\n```';

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle invalid JSON gracefully', async () => {
      const screenshot = createMockScreenshot();
      const adapter = createMockAdapter('not valid json');

      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      // Should return single boundary spanning full height
      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].top).toBe(0);
      expect(boundaries[0].bottom).toBe(1000);
    });

    it('should ensure boundaries are contiguous', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 300, confidence: 0.9 },
        { approxTop: 300, approxBottom: 700, confidence: 0.85 },
        { approxTop: 700, approxBottom: 1000, confidence: 0.8 },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      // Check contiguity
      for (let i = 1; i < boundaries.length; i++) {
        expect(boundaries[i].top).toBe(boundaries[i - 1].bottom);
      }
    });

    it('should set first boundary top to 0', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 50, approxBottom: 500, confidence: 0.9 },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries[0].top).toBe(0);
    });

    it('should set last boundary bottom to image height', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 800, confidence: 0.9 },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries[boundaries.length - 1].bottom).toBe(1000);
    });

    it('should preserve confidence scores', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 500, confidence: 0.95 },
        { approxTop: 500, approxBottom: 1000, confidence: 0.75 },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries[0].confidence).toBe(0.95);
      expect(boundaries[1].confidence).toBe(0.75);
    });

    it('should preserve descriptions', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 600, confidence: 0.9, description: 'hero section' },
        { approxTop: 600, approxBottom: 1000, confidence: 0.85, description: 'footer' },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries[0].description).toBe('hero section');
      expect(boundaries[1].description).toBe('footer');
    });

    it('should clamp confidence to 0-1 range', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 1000, confidence: 1.5 },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries[0].confidence).toBeLessThanOrEqual(1);
      expect(boundaries[0].confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative confidence values', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 1000, confidence: -0.5 },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries[0].confidence).toBeGreaterThanOrEqual(0);
    });

    it('should sort boundaries by top position', async () => {
      const screenshot = createMockScreenshot();
      // Out of order boundaries
      const aiResponse = JSON.stringify([
        { approxTop: 600, approxBottom: 1000, confidence: 0.8 },
        { approxTop: 0, approxBottom: 300, confidence: 0.9 },
        { approxTop: 300, approxBottom: 600, confidence: 0.85 },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      // Should be sorted
      for (let i = 1; i < boundaries.length; i++) {
        expect(boundaries[i].top).toBeGreaterThanOrEqual(boundaries[i - 1].top);
      }
    });
  });

  describe('detectBoundariesAIOnly', () => {
    it('should return approximate boundaries without snapping', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 500, confidence: 0.9, description: 'section 1' },
        { approxTop: 500, approxBottom: 1000, confidence: 0.85, description: 'section 2' },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectBoundariesAIOnly(screenshot, adapter);

      expect(boundaries).toHaveLength(2);
      expect(boundaries[0].approxTop).toBe(0);
      expect(boundaries[0].approxBottom).toBe(500);
    });

    it('should return empty array for invalid response', async () => {
      const screenshot = createMockScreenshot();
      const adapter = createMockAdapter('invalid');

      const boundaries = await detectBoundariesAIOnly(screenshot, adapter);

      expect(boundaries).toHaveLength(0);
    });
  });

  describe('AI Response Parsing', () => {
    it('should handle non-array response', async () => {
      const screenshot = createMockScreenshot();
      const adapter = createMockAdapter('{"not": "an array"}');

      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries).toHaveLength(1);
    });

    it('should filter out invalid boundary objects', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 500, confidence: 0.9 },
        null,
        'not an object',
        { approxTop: 500, approxBottom: 1000, confidence: 0.85 },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      // Should only include valid boundaries
      expect(boundaries.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle missing confidence with default', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = JSON.stringify([
        { approxTop: 0, approxBottom: 1000 },
      ]);

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries[0].confidence).toBe(0.5); // Default
    });

    it('should handle code block without json specifier', async () => {
      const screenshot = createMockScreenshot();
      const aiResponse = '```\n[{"approxTop": 0, "approxBottom": 1000, "confidence": 0.9}]\n```';

      const adapter = createMockAdapter(aiResponse);
      const boundaries = await detectVisualBoundaries(screenshot, adapter);

      expect(boundaries.length).toBeGreaterThanOrEqual(1);
    });
  });
});
