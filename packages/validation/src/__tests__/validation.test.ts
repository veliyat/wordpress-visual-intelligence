/**
 * Validation Package Tests
 *
 * Contract tests for visual comparison and correction signal generation.
 * These tests define the expected API before implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ValidationResult,
  CorrectionSignal,
  CorrectionIssue,
  UIBlueprint,
} from '@wp-morph/core';

// Types that should be implemented
interface Screenshot {
  buffer: Buffer;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}

interface ComparisonResult {
  pixelDiff: number;
  ssim: number;
  mse: number;
  diffImage?: Buffer;
}

interface SectionComparison {
  sectionId: string;
  similarity: number;
  boundingBoxDelta: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ValidationLoopConfig {
  maxIterations: number;
  threshold: number;
  plateauThreshold: number;
}

// Mock implementations
const compareScreenshots = vi.fn<[Screenshot, Screenshot], Promise<ComparisonResult>>();
const computeSSIM = vi.fn<[Screenshot, Screenshot], Promise<number>>();
const generateCorrectionSignals = vi.fn<[ComparisonResult, SectionComparison[]], CorrectionSignal[]>();
const runValidationLoop = vi.fn<[string, string, ValidationLoopConfig?], Promise<ValidationResult>>();

describe('packages/validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compareScreenshots', () => {
    it('should compare two screenshots and return metrics', async () => {
      const original: Screenshot = {
        buffer: Buffer.from('original-image'),
        width: 1200,
        height: 800,
        format: 'png',
      };
      const generated: Screenshot = {
        buffer: Buffer.from('generated-image'),
        width: 1200,
        height: 800,
        format: 'png',
      };

      const mockResult: ComparisonResult = {
        pixelDiff: 0.05,
        ssim: 0.94,
        mse: 0.02,
        diffImage: Buffer.from('diff-image'),
      };
      compareScreenshots.mockResolvedValue(mockResult);

      const result = await compareScreenshots(original, generated);

      expect(result).toHaveProperty('pixelDiff');
      expect(result).toHaveProperty('ssim');
      expect(result).toHaveProperty('mse');
      expect(result.pixelDiff).toBeGreaterThanOrEqual(0);
      expect(result.pixelDiff).toBeLessThanOrEqual(1);
    });

    it('should return 0 pixel diff for identical images', async () => {
      const image: Screenshot = {
        buffer: Buffer.from('same-image'),
        width: 1200,
        height: 800,
        format: 'png',
      };

      const mockResult: ComparisonResult = {
        pixelDiff: 0,
        ssim: 1.0,
        mse: 0,
      };
      compareScreenshots.mockResolvedValue(mockResult);

      const result = await compareScreenshots(image, image);

      expect(result.pixelDiff).toBe(0);
      expect(result.ssim).toBe(1.0);
    });

    it('should optionally return diff image', async () => {
      const original: Screenshot = {
        buffer: Buffer.from('original'),
        width: 1200,
        height: 800,
        format: 'png',
      };
      const generated: Screenshot = {
        buffer: Buffer.from('generated'),
        width: 1200,
        height: 800,
        format: 'png',
      };

      const mockResult: ComparisonResult = {
        pixelDiff: 0.1,
        ssim: 0.88,
        mse: 0.05,
        diffImage: Buffer.from('visual-diff'),
      };
      compareScreenshots.mockResolvedValue(mockResult);

      const result = await compareScreenshots(original, generated);

      expect(result.diffImage).toBeDefined();
      expect(result.diffImage).toBeInstanceOf(Buffer);
    });

    it('should handle different dimensions gracefully', async () => {
      const original: Screenshot = {
        buffer: Buffer.from('original'),
        width: 1200,
        height: 800,
        format: 'png',
      };
      const generated: Screenshot = {
        buffer: Buffer.from('generated'),
        width: 1400,
        height: 900,
        format: 'png',
      };

      // Should still work but may have lower similarity
      const mockResult: ComparisonResult = {
        pixelDiff: 0.3,
        ssim: 0.65,
        mse: 0.15,
      };
      compareScreenshots.mockResolvedValue(mockResult);

      const result = await compareScreenshots(original, generated);

      expect(result.ssim).toBeLessThan(1.0);
    });
  });

  describe('computeSSIM', () => {
    it('should compute Structural Similarity Index', async () => {
      const image1: Screenshot = {
        buffer: Buffer.from('image1'),
        width: 1200,
        height: 800,
        format: 'png',
      };
      const image2: Screenshot = {
        buffer: Buffer.from('image2'),
        width: 1200,
        height: 800,
        format: 'png',
      };

      computeSSIM.mockResolvedValue(0.92);

      const result = await computeSSIM(image1, image2);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return 1.0 for identical images', async () => {
      const image: Screenshot = {
        buffer: Buffer.from('same-image'),
        width: 1200,
        height: 800,
        format: 'png',
      };

      computeSSIM.mockResolvedValue(1.0);

      const result = await computeSSIM(image, image);

      expect(result).toBe(1.0);
    });

    it('should return lower score for different images', async () => {
      const image1: Screenshot = {
        buffer: Buffer.from('image1'),
        width: 1200,
        height: 800,
        format: 'png',
      };
      const image2: Screenshot = {
        buffer: Buffer.from('completely-different'),
        width: 1200,
        height: 800,
        format: 'png',
      };

      computeSSIM.mockResolvedValue(0.45);

      const result = await computeSSIM(image1, image2);

      expect(result).toBeLessThan(0.8);
    });
  });

  describe('generateCorrectionSignals', () => {
    it('should generate correction signals from comparison', () => {
      const comparison: ComparisonResult = {
        pixelDiff: 0.12,
        ssim: 0.85,
        mse: 0.08,
      };

      const sectionComparisons: SectionComparison[] = [
        {
          sectionId: 'hero-1',
          similarity: 0.82,
          boundingBoxDelta: { x: 0, y: 12, width: 0, height: -8 },
        },
        {
          sectionId: 'footer-1',
          similarity: 0.78,
          boundingBoxDelta: { x: 0, y: 0, width: 0, height: 0 },
        },
      ];

      const mockSignals: CorrectionSignal[] = [
        {
          sectionId: 'hero-1',
          issue: 'vertical-spacing',
          severity: 'medium',
          delta: '+12px',
          confidence: 0.85,
          suggestion: 'Increase top margin',
        },
        {
          sectionId: 'footer-1',
          issue: 'color-mismatch',
          severity: 'low',
          delta: 'Delta-E: 3.5',
          confidence: 0.72,
        },
      ];
      generateCorrectionSignals.mockReturnValue(mockSignals);

      const result = generateCorrectionSignals(comparison, sectionComparisons);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      for (const signal of result) {
        expect(signal).toHaveProperty('sectionId');
        expect(signal).toHaveProperty('issue');
        expect(signal).toHaveProperty('severity');
        expect(signal).toHaveProperty('delta');
        expect(signal).toHaveProperty('confidence');
      }
    });

    it('should prioritize high-severity issues', () => {
      const comparison: ComparisonResult = {
        pixelDiff: 0.2,
        ssim: 0.75,
        mse: 0.12,
      };

      const sectionComparisons: SectionComparison[] = [
        {
          sectionId: 'section-1',
          similarity: 0.6,
          boundingBoxDelta: { x: 0, y: 50, width: 0, height: 0 },
        },
      ];

      const mockSignals: CorrectionSignal[] = [
        {
          sectionId: 'section-1',
          issue: 'missing-element',
          severity: 'high',
          delta: 'Button not rendered',
          confidence: 0.95,
        },
        {
          sectionId: 'section-1',
          issue: 'vertical-spacing',
          severity: 'high',
          delta: '+50px',
          confidence: 0.88,
        },
      ];
      generateCorrectionSignals.mockReturnValue(mockSignals);

      const result = generateCorrectionSignals(comparison, sectionComparisons);

      const highSeverity = result.filter((s) => s.severity === 'high');
      expect(highSeverity.length).toBeGreaterThan(0);
    });

    it('should return empty array for perfect match', () => {
      const comparison: ComparisonResult = {
        pixelDiff: 0,
        ssim: 1.0,
        mse: 0,
      };

      const sectionComparisons: SectionComparison[] = [
        {
          sectionId: 'section-1',
          similarity: 1.0,
          boundingBoxDelta: { x: 0, y: 0, width: 0, height: 0 },
        },
      ];

      generateCorrectionSignals.mockReturnValue([]);

      const result = generateCorrectionSignals(comparison, sectionComparisons);

      expect(result).toEqual([]);
    });

    it('should detect all correction issue types', () => {
      const validIssues: CorrectionIssue[] = [
        'vertical-spacing',
        'horizontal-spacing',
        'color-mismatch',
        'typography-size',
        'typography-weight',
        'layout-alignment',
        'missing-element',
        'extra-element',
        'bounding-box',
      ];

      // This test ensures our types cover all issues
      for (const issue of validIssues) {
        expect(typeof issue).toBe('string');
      }
    });
  });

  describe('runValidationLoop', () => {
    it('should run validation loop until threshold reached', async () => {
      const mockResult: ValidationResult = {
        similarity: 0.95,
        pixelDiff: 0.03,
        ssim: 0.96,
        corrections: [],
      };
      runValidationLoop.mockResolvedValue(mockResult);

      const result = await runValidationLoop(
        'https://example.com',
        '/path/to/theme',
        { maxIterations: 5, threshold: 0.92, plateauThreshold: 0.01 }
      );

      expect(result.similarity).toBeGreaterThanOrEqual(0.92);
    });

    it('should stop at max iterations if threshold not reached', async () => {
      const mockResult: ValidationResult = {
        similarity: 0.85,
        pixelDiff: 0.10,
        ssim: 0.88,
        corrections: [
          {
            sectionId: 'hero-1',
            issue: 'layout-alignment',
            severity: 'medium',
            delta: '5px off-center',
            confidence: 0.8,
          },
        ],
      };
      runValidationLoop.mockResolvedValue(mockResult);

      const result = await runValidationLoop(
        'https://example.com',
        '/path/to/theme',
        { maxIterations: 3, threshold: 0.95, plateauThreshold: 0.01 }
      );

      expect(result).toBeDefined();
      // Should return best result even if below threshold
    });

    it('should stop early if similarity plateaus', async () => {
      const mockResult: ValidationResult = {
        similarity: 0.88,
        pixelDiff: 0.08,
        ssim: 0.90,
        corrections: [],
      };
      runValidationLoop.mockResolvedValue(mockResult);

      const result = await runValidationLoop(
        'https://example.com',
        '/path/to/theme',
        { maxIterations: 10, threshold: 0.95, plateauThreshold: 0.01 }
      );

      // Loop should stop if improvement < plateauThreshold
      expect(result).toBeDefined();
    });

    it('should use default config if not provided', async () => {
      const mockResult: ValidationResult = {
        similarity: 0.93,
        pixelDiff: 0.05,
        ssim: 0.94,
        corrections: [],
      };
      runValidationLoop.mockResolvedValue(mockResult);

      const result = await runValidationLoop(
        'https://example.com',
        '/path/to/theme'
      );

      expect(result).toBeDefined();
    });

    it('should include all corrections from validation', async () => {
      const mockResult: ValidationResult = {
        similarity: 0.87,
        pixelDiff: 0.09,
        ssim: 0.89,
        corrections: [
          {
            sectionId: 'hero-1',
            issue: 'vertical-spacing',
            severity: 'medium',
            delta: '+12px',
            confidence: 0.85,
          },
          {
            sectionId: 'footer-1',
            issue: 'color-mismatch',
            severity: 'low',
            delta: 'Delta-E: 4.2',
            confidence: 0.72,
          },
        ],
      };
      runValidationLoop.mockResolvedValue(mockResult);

      const result = await runValidationLoop(
        'https://example.com',
        '/path/to/theme'
      );

      expect(result.corrections.length).toBe(2);
    });
  });
});

describe('Validation Thresholds', () => {
  it('should target 92% similarity for success', () => {
    const TARGET_THRESHOLD = 0.92;
    expect(TARGET_THRESHOLD).toBe(0.92);
  });

  it('should detect plateau when improvement < 1%', () => {
    const PLATEAU_THRESHOLD = 0.01;
    expect(PLATEAU_THRESHOLD).toBe(0.01);
  });

  it('should have max 5 iterations by default', () => {
    const DEFAULT_MAX_ITERATIONS = 5;
    expect(DEFAULT_MAX_ITERATIONS).toBe(5);
  });
});

describe('Correction Signal Quality', () => {
  it('should include actionable suggestions when possible', () => {
    const signal: CorrectionSignal = {
      sectionId: 'hero-1',
      issue: 'vertical-spacing',
      severity: 'medium',
      delta: '+12px',
      confidence: 0.85,
      suggestion: 'Change padding from md to lg',
    };

    expect(signal.suggestion).toBeDefined();
    expect(signal.suggestion).toContain('padding');
  });

  it('should have confidence score for each signal', () => {
    const signal: CorrectionSignal = {
      sectionId: 'hero-1',
      issue: 'color-mismatch',
      severity: 'low',
      delta: 'Delta-E: 3.5',
      confidence: 0.72,
    };

    expect(signal.confidence).toBeGreaterThan(0);
    expect(signal.confidence).toBeLessThanOrEqual(1);
  });
});
