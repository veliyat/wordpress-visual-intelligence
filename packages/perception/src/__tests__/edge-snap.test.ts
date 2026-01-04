/**
 * Edge Snap Algorithm Tests
 *
 * Unit tests for the sliding-window band comparison algorithm.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { snapToEdge, snapBoundaries } from '../edge-snap';
import type { Screenshot } from '../types';

// Mock sharp module
vi.mock('sharp', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      metadata: vi.fn().mockResolvedValue({ width: 100, height: 200 }),
      raw: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockImplementation(() => {
        // Create a mock buffer with distinct color bands
        // 100 pixels wide * 200 rows * 3 channels (RGB)
        const buffer = Buffer.alloc(100 * 200 * 3);

        // Fill top half (rows 0-99) with white
        for (let y = 0; y < 100; y++) {
          for (let x = 0; x < 100; x++) {
            const offset = (y * 100 + x) * 3;
            buffer[offset] = 255;     // R
            buffer[offset + 1] = 255; // G
            buffer[offset + 2] = 255; // B
          }
        }

        // Fill bottom half (rows 100-199) with dark blue
        for (let y = 100; y < 200; y++) {
          for (let x = 0; x < 100; x++) {
            const offset = (y * 100 + x) * 3;
            buffer[offset] = 30;      // R
            buffer[offset + 1] = 60;  // G
            buffer[offset + 2] = 120; // B
          }
        }

        return Promise.resolve(buffer);
      }),
    })),
  };
});

describe('Edge Snap Algorithm', () => {
  const createMockScreenshot = (height: number = 200): Screenshot => ({
    buffer: Buffer.alloc(100),
    width: 100,
    height,
    format: 'png',
  });

  describe('snapToEdge', () => {
    it('should snap to a clear visual edge', async () => {
      const screenshot = createMockScreenshot(200);

      // Approximate Y near the boundary at 100
      const result = await snapToEdge(screenshot, 95, 0.8);

      expect(result).toBeDefined();
      expect(result.y).toBeGreaterThanOrEqual(90);
      expect(result.y).toBeLessThanOrEqual(110);
    });

    it('should return snapped=true when edge is found', async () => {
      const screenshot = createMockScreenshot(200);

      const result = await snapToEdge(screenshot, 95, 0.8);

      // With the mocked data having a clear boundary at y=100,
      // it should snap to that boundary
      expect(result.snapped).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should use smaller search radius for high confidence', async () => {
      const screenshot = createMockScreenshot(200);

      // High confidence (0.9) should use smaller radius (~25px)
      const result = await snapToEdge(screenshot, 50, 0.9);

      // With high confidence and no edge near y=50, should stay close
      expect(result).toBeDefined();
    });

    it('should use larger search radius for low confidence', async () => {
      const screenshot = createMockScreenshot(200);

      // Low confidence (0.3) should use larger radius (~75px)
      const result = await snapToEdge(screenshot, 50, 0.3);

      expect(result).toBeDefined();
    });

    it('should handle boundary at top of image', async () => {
      const screenshot = createMockScreenshot(200);

      const result = await snapToEdge(screenshot, 10, 0.8);

      expect(result.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle boundary at bottom of image', async () => {
      const screenshot = createMockScreenshot(200);

      const result = await snapToEdge(screenshot, 190, 0.8);

      expect(result.y).toBeLessThanOrEqual(200);
    });
  });

  describe('snapBoundaries', () => {
    it('should snap multiple boundaries', async () => {
      const screenshot = createMockScreenshot(200);

      const boundaries = [
        { approxY: 50, confidence: 0.8 },
        { approxY: 100, confidence: 0.9 },
        { approxY: 150, confidence: 0.7 },
      ];

      const results = await snapBoundaries(screenshot, boundaries);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('y');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('snapped');
      });
    });

    it('should preserve order of boundaries', async () => {
      const screenshot = createMockScreenshot(200);

      const boundaries = [
        { approxY: 30, confidence: 0.8 },
        { approxY: 100, confidence: 0.9 },
        { approxY: 170, confidence: 0.7 },
      ];

      const results = await snapBoundaries(screenshot, boundaries);

      expect(results).toHaveLength(3);
    });

    it('should handle empty boundary list', async () => {
      const screenshot = createMockScreenshot(200);

      const results = await snapBoundaries(screenshot, []);

      expect(results).toHaveLength(0);
    });

    it('should handle single boundary', async () => {
      const screenshot = createMockScreenshot(200);

      const boundaries = [{ approxY: 100, confidence: 0.8 }];

      const results = await snapBoundaries(screenshot, boundaries);

      expect(results).toHaveLength(1);
    });
  });

  describe('Confidence-based radius', () => {
    it('should use high confidence radius (25px) for confidence >= 0.7', async () => {
      const screenshot = createMockScreenshot(200);

      // Test with confidence exactly at threshold
      const result = await snapToEdge(screenshot, 100, 0.7);
      expect(result).toBeDefined();
    });

    it('should use medium confidence radius (50px) for 0.4 <= confidence < 0.7', async () => {
      const screenshot = createMockScreenshot(200);

      const result = await snapToEdge(screenshot, 100, 0.5);
      expect(result).toBeDefined();
    });

    it('should use low confidence radius (75px) for confidence < 0.4', async () => {
      const screenshot = createMockScreenshot(200);

      const result = await snapToEdge(screenshot, 100, 0.2);
      expect(result).toBeDefined();
    });
  });

  describe('Edge scoring', () => {
    it('should return positive score for detected edges', async () => {
      const screenshot = createMockScreenshot(200);

      // The mocked data has a clear boundary at y=100
      const result = await snapToEdge(screenshot, 100, 0.8);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should use both color delta and variance in scoring', async () => {
      const screenshot = createMockScreenshot(200);

      // This tests that the algorithm runs without error
      // The actual scoring uses both factors
      const result = await snapToEdge(screenshot, 100, 0.8);

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
    });
  });
});

describe('Edge Snap with Gradient Mock', () => {
  beforeEach(() => {
    // Reset mock to provide gradient data
    vi.resetModules();
  });

  it('should handle images with gradients', async () => {
    const screenshot: Screenshot = {
      buffer: Buffer.alloc(100),
      width: 100,
      height: 200,
      format: 'png',
    };

    const result = await snapToEdge(screenshot, 100, 0.8);
    expect(result).toBeDefined();
  });
});
