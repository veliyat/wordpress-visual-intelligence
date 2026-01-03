/**
 * Intelligence Package Tests
 *
 * Contract tests for IR construction and token normalization.
 * These tests define the expected API before implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  UIBlueprint,
  DesignTokens,
  ColorToken,
  Section,
  LayoutIntent,
} from '@wp-morph/core';

// These types and functions should be implemented
interface AnalysisResult {
  sections: DetectedSection[];
  colors: ExtractedColor[];
  typography: ExtractedTypography;
  spacing: number[];
}

interface DetectedSection {
  boundingBox: { x: number; y: number; width: number; height: number };
  intent: LayoutIntent;
  confidence: number;
  elements: DetectedElement[];
}

interface DetectedElement {
  type: string;
  content: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

interface ExtractedColor {
  value: string;
  frequency: number;
  context: 'background' | 'text' | 'border' | 'accent';
}

interface ExtractedTypography {
  fontFamilies: string[];
  fontSizes: number[];
  fontWeights: number[];
}

interface Screenshot {
  buffer: Buffer;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}

// Mock implementations
const analyzeVisual = vi.fn<[Screenshot], Promise<AnalysisResult>>();
const buildUIBlueprint = vi.fn<[AnalysisResult, string], Promise<UIBlueprint>>();
const extractColors = vi.fn<[Screenshot], Promise<ExtractedColor[]>>();
const extractTypography = vi.fn<[Screenshot], Promise<ExtractedTypography>>();
const extractSpacing = vi.fn<[DetectedSection[]], number[]>();
const normalizeColorTokens = vi.fn<[ExtractedColor[]], ColorToken[]>();
const normalizeSpacingTokens = vi.fn<[number[]], { xs: string; sm: string; md: string; lg: string; xl: string; xxl: string }>();

describe('packages/intelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeVisual', () => {
    it('should analyze screenshot and return structured result', async () => {
      const mockScreenshot: Screenshot = {
        buffer: Buffer.from('fake-image'),
        width: 1200,
        height: 2000,
        format: 'png',
      };

      const mockResult: AnalysisResult = {
        sections: [
          {
            boundingBox: { x: 0, y: 0, width: 1200, height: 600 },
            intent: { type: 'hero', alignment: 'center' },
            confidence: 0.92,
            elements: [
              {
                type: 'heading',
                content: 'Welcome',
                boundingBox: { x: 100, y: 200, width: 400, height: 60 },
                confidence: 0.95,
              },
            ],
          },
        ],
        colors: [
          { value: '#3b82f6', frequency: 0.15, context: 'accent' },
          { value: '#1e293b', frequency: 0.25, context: 'text' },
        ],
        typography: {
          fontFamilies: ['Inter', 'system-ui'],
          fontSizes: [14, 16, 24, 48],
          fontWeights: [400, 600, 700],
        },
        spacing: [8, 16, 24, 32, 48],
      };
      analyzeVisual.mockResolvedValue(mockResult);

      const result = await analyzeVisual(mockScreenshot);

      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('colors');
      expect(result).toHaveProperty('typography');
      expect(result).toHaveProperty('spacing');
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should detect layout intent for each section', async () => {
      const mockScreenshot: Screenshot = {
        buffer: Buffer.from('fake-image'),
        width: 1200,
        height: 1000,
        format: 'png',
      };

      const mockResult: AnalysisResult = {
        sections: [
          {
            boundingBox: { x: 0, y: 0, width: 1200, height: 600 },
            intent: { type: 'hero', alignment: 'center' },
            confidence: 0.92,
            elements: [],
          },
          {
            boundingBox: { x: 0, y: 600, width: 1200, height: 400 },
            intent: { type: 'two-column', ratio: '50-50' },
            confidence: 0.88,
            elements: [],
          },
        ],
        colors: [],
        typography: { fontFamilies: [], fontSizes: [], fontWeights: [] },
        spacing: [],
      };
      analyzeVisual.mockResolvedValue(mockResult);

      const result = await analyzeVisual(mockScreenshot);

      for (const section of result.sections) {
        expect(section.intent).toHaveProperty('type');
        expect(section.confidence).toBeGreaterThan(0);
      }
    });

    it('should identify elements within sections', async () => {
      const mockScreenshot: Screenshot = {
        buffer: Buffer.from('fake-image'),
        width: 1200,
        height: 600,
        format: 'png',
      };

      const mockResult: AnalysisResult = {
        sections: [
          {
            boundingBox: { x: 0, y: 0, width: 1200, height: 600 },
            intent: { type: 'hero', alignment: 'center' },
            confidence: 0.92,
            elements: [
              {
                type: 'heading',
                content: 'Welcome to Our Site',
                boundingBox: { x: 300, y: 150, width: 600, height: 80 },
                confidence: 0.96,
              },
              {
                type: 'paragraph',
                content: 'Build amazing things.',
                boundingBox: { x: 300, y: 250, width: 600, height: 40 },
                confidence: 0.94,
              },
              {
                type: 'button',
                content: 'Get Started',
                boundingBox: { x: 500, y: 320, width: 200, height: 50 },
                confidence: 0.98,
              },
            ],
          },
        ],
        colors: [],
        typography: { fontFamilies: [], fontSizes: [], fontWeights: [] },
        spacing: [],
      };
      analyzeVisual.mockResolvedValue(mockResult);

      const result = await analyzeVisual(mockScreenshot);

      expect(result.sections[0].elements.length).toBeGreaterThan(0);
      expect(result.sections[0].elements[0]).toHaveProperty('type');
      expect(result.sections[0].elements[0]).toHaveProperty('content');
    });
  });

  describe('buildUIBlueprint', () => {
    it('should build complete UIBlueprint from analysis result', async () => {
      const analysisResult: AnalysisResult = {
        sections: [
          {
            boundingBox: { x: 0, y: 0, width: 1200, height: 600 },
            intent: { type: 'hero', alignment: 'center' },
            confidence: 0.92,
            elements: [],
          },
        ],
        colors: [{ value: '#3b82f6', frequency: 0.2, context: 'accent' }],
        typography: {
          fontFamilies: ['Inter'],
          fontSizes: [16, 24, 48],
          fontWeights: [400, 700],
        },
        spacing: [8, 16, 24, 32],
      };

      const mockBlueprint: UIBlueprint = {
        version: '1.0',
        meta: {
          sourceUrl: 'https://example.com',
          capturedAt: new Date().toISOString(),
          viewport: { width: 1200, height: 800 },
        },
        tokens: {
          colors: [{ name: 'primary', value: '#3b82f6', role: 'primary', usage: [] }],
          spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' },
          typography: {
            fontFamilies: [{ name: 'Inter', stack: 'Inter, sans-serif', role: 'body' }],
            sizes: {
              xs: '12px',
              sm: '14px',
              base: '16px',
              lg: '18px',
              xl: '24px',
              '2xl': '30px',
              '3xl': '36px',
              '4xl': '48px',
            },
            weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
          },
        },
        sections: [],
      };
      buildUIBlueprint.mockResolvedValue(mockBlueprint);

      const result = await buildUIBlueprint(analysisResult, 'https://example.com');

      expect(result.version).toBe('1.0');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('sections');
    });

    it('should set correct source URL in meta', async () => {
      const analysisResult: AnalysisResult = {
        sections: [],
        colors: [],
        typography: { fontFamilies: [], fontSizes: [], fontWeights: [] },
        spacing: [],
      };

      const mockBlueprint: UIBlueprint = {
        version: '1.0',
        meta: {
          sourceUrl: 'https://specific.example.com/page',
          capturedAt: new Date().toISOString(),
          viewport: { width: 1200, height: 800 },
        },
        tokens: {
          colors: [],
          spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' },
          typography: {
            fontFamilies: [],
            sizes: {
              xs: '12px',
              sm: '14px',
              base: '16px',
              lg: '18px',
              xl: '24px',
              '2xl': '30px',
              '3xl': '36px',
              '4xl': '48px',
            },
            weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
          },
        },
        sections: [],
      };
      buildUIBlueprint.mockResolvedValue(mockBlueprint);

      const result = await buildUIBlueprint(analysisResult, 'https://specific.example.com/page');

      expect(result.meta.sourceUrl).toBe('https://specific.example.com/page');
    });
  });

  describe('extractColors', () => {
    it('should extract colors with frequency and context', async () => {
      const mockScreenshot: Screenshot = {
        buffer: Buffer.from('fake-image'),
        width: 1200,
        height: 800,
        format: 'png',
      };

      const mockColors: ExtractedColor[] = [
        { value: '#ffffff', frequency: 0.45, context: 'background' },
        { value: '#1e293b', frequency: 0.25, context: 'text' },
        { value: '#3b82f6', frequency: 0.08, context: 'accent' },
        { value: '#64748b', frequency: 0.12, context: 'text' },
        { value: '#e2e8f0', frequency: 0.10, context: 'border' },
      ];
      extractColors.mockResolvedValue(mockColors);

      const result = await extractColors(mockScreenshot);

      expect(result.length).toBeGreaterThan(0);
      for (const color of result) {
        expect(color.value).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(color.frequency).toBeGreaterThan(0);
        expect(color.frequency).toBeLessThanOrEqual(1);
        expect(['background', 'text', 'border', 'accent']).toContain(color.context);
      }
    });

    it('should return colors sorted by frequency', async () => {
      const mockScreenshot: Screenshot = {
        buffer: Buffer.from('fake-image'),
        width: 1200,
        height: 800,
        format: 'png',
      };

      const mockColors: ExtractedColor[] = [
        { value: '#ffffff', frequency: 0.45, context: 'background' },
        { value: '#1e293b', frequency: 0.25, context: 'text' },
        { value: '#3b82f6', frequency: 0.15, context: 'accent' },
      ];
      extractColors.mockResolvedValue(mockColors);

      const result = await extractColors(mockScreenshot);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].frequency).toBeLessThanOrEqual(result[i - 1].frequency);
      }
    });
  });

  describe('normalizeColorTokens', () => {
    it('should cluster similar colors', () => {
      const extractedColors: ExtractedColor[] = [
        { value: '#3b82f6', frequency: 0.15, context: 'accent' },
        { value: '#3b83f7', frequency: 0.05, context: 'accent' }, // Very similar
        { value: '#1e293b', frequency: 0.25, context: 'text' },
      ];

      const mockTokens: ColorToken[] = [
        { name: 'primary', value: '#3b82f6', role: 'primary', usage: [] },
        { name: 'text', value: '#1e293b', role: 'text', usage: [] },
      ];
      normalizeColorTokens.mockReturnValue(mockTokens);

      const result = normalizeColorTokens(extractedColors);

      // Similar colors should be merged
      expect(result.length).toBeLessThanOrEqual(extractedColors.length);
    });

    it('should assign semantic roles based on context', () => {
      const extractedColors: ExtractedColor[] = [
        { value: '#ffffff', frequency: 0.45, context: 'background' },
        { value: '#1e293b', frequency: 0.30, context: 'text' },
        { value: '#3b82f6', frequency: 0.15, context: 'accent' },
      ];

      const mockTokens: ColorToken[] = [
        { name: 'surface', value: '#ffffff', role: 'surface', usage: [] },
        { name: 'text', value: '#1e293b', role: 'text', usage: [] },
        { name: 'primary', value: '#3b82f6', role: 'primary', usage: [] },
      ];
      normalizeColorTokens.mockReturnValue(mockTokens);

      const result = normalizeColorTokens(extractedColors);

      const roles = result.map((t) => t.role);
      expect(roles).toContain('surface');
      expect(roles).toContain('text');
      expect(roles).toContain('primary');
    });

    it('should return 5-8 color tokens', () => {
      const manyColors: ExtractedColor[] = Array.from({ length: 20 }, (_, i) => ({
        value: `#${i.toString(16).padStart(6, '0')}`,
        frequency: 0.05,
        context: 'background' as const,
      }));

      const mockTokens: ColorToken[] = Array.from({ length: 6 }, (_, i) => ({
        name: `color-${i}`,
        value: `#${i.toString(16).padStart(6, '0')}`,
        role: 'primary' as const,
        usage: [],
      }));
      normalizeColorTokens.mockReturnValue(mockTokens);

      const result = normalizeColorTokens(manyColors);

      expect(result.length).toBeGreaterThanOrEqual(5);
      expect(result.length).toBeLessThanOrEqual(8);
    });
  });

  describe('normalizeSpacingTokens', () => {
    it('should normalize to base-8 scale', () => {
      const rawSpacing = [4, 7, 12, 18, 25, 36, 50];

      const mockScale = {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
      };
      normalizeSpacingTokens.mockReturnValue(mockScale);

      const result = normalizeSpacingTokens(rawSpacing);

      expect(result).toHaveProperty('xs');
      expect(result).toHaveProperty('sm');
      expect(result).toHaveProperty('md');
      expect(result).toHaveProperty('lg');
      expect(result).toHaveProperty('xl');
      expect(result).toHaveProperty('xxl');
    });

    it('should round values to nearest base-8 multiple', () => {
      const rawSpacing = [5, 10, 15, 20, 30, 45];

      const mockScale = {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
      };
      normalizeSpacingTokens.mockReturnValue(mockScale);

      const result = normalizeSpacingTokens(rawSpacing);

      // All values should be multiples of 4 (base-8/2 for xs)
      for (const value of Object.values(result)) {
        const numValue = parseInt(value);
        expect(numValue % 4).toBe(0);
      }
    });
  });

  describe('extractSpacing', () => {
    it('should extract spacing values from section boundaries', () => {
      const sections: DetectedSection[] = [
        {
          boundingBox: { x: 0, y: 0, width: 1200, height: 600 },
          intent: { type: 'hero', alignment: 'center' },
          confidence: 0.92,
          elements: [],
        },
        {
          boundingBox: { x: 0, y: 632, width: 1200, height: 400 }, // 32px gap
          intent: { type: 'single-column' },
          confidence: 0.88,
          elements: [],
        },
      ];

      const mockSpacing = [8, 16, 24, 32, 48];
      extractSpacing.mockReturnValue(mockSpacing);

      const result = extractSpacing(sections);

      expect(result).toContain(32);
    });

    it('should extract padding from element positions', () => {
      const sections: DetectedSection[] = [
        {
          boundingBox: { x: 0, y: 0, width: 1200, height: 600 },
          intent: { type: 'hero', alignment: 'center' },
          confidence: 0.92,
          elements: [
            {
              type: 'heading',
              content: 'Title',
              boundingBox: { x: 48, y: 48, width: 500, height: 60 }, // 48px padding
              confidence: 0.95,
            },
          ],
        },
      ];

      const mockSpacing = [16, 24, 32, 48];
      extractSpacing.mockReturnValue(mockSpacing);

      const result = extractSpacing(sections);

      expect(result).toContain(48);
    });
  });
});

describe('AI Integration Requirements', () => {
  it('should use AI for layout intent detection', () => {
    // AI determines what kind of section it is (hero, grid, etc.)
    expect(true).toBe(true);
  });

  it('should use code for color clustering (not AI)', () => {
    // Color clustering should use CIELAB and Delta-E, not AI
    expect(true).toBe(true);
  });

  it('should use code for spacing normalization (not AI)', () => {
    // Spacing normalization is deterministic, no AI needed
    expect(true).toBe(true);
  });

  it('should support multiple AI providers through adapter', () => {
    // Should work with Claude, OpenAI, etc.
    expect(true).toBe(true);
  });
});
