/**
 * Indexer Tests
 *
 * Tests for example indexing, creation, and validation functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createIndex,
  createStoredExample,
  indexExample,
  searchIndex,
  anonymizeExample,
  validateExample,
  type IndexEntry,
} from '../indexer.js';
import type {
  StoredExample,
  ThemeJsonSnapshot,
  PatternMapping,
  UIBlueprint,
  LayoutIntent,
} from '../types.js';

// Mock crypto.randomUUID
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid-12345'),
}));

// Sample UIBlueprint for testing
const sampleBlueprint: UIBlueprint = {
  version: '1.0',
  meta: {
    sourceUrl: 'https://example.com',
    capturedAt: '2024-01-15T10:00:00.000Z',
    viewport: { width: 1200, height: 800 },
    title: 'Test Site',
  },
  tokens: {
    colors: [
      { name: 'primary', value: '#3b82f6', role: 'primary', usage: [] },
      { name: 'text', value: '#1e293b', role: 'text', usage: [] },
      { name: 'surface', value: '#ffffff', role: 'surface', usage: [] },
    ],
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
  sections: [
    {
      id: 'hero-1',
      intent: { type: 'hero', alignment: 'center' },
      boundingBox: { x: 0, y: 0, width: 1200, height: 600 },
      background: { type: 'color', colorToken: 'surface' },
      padding: 'xl',
      elements: [
        {
          id: 'heading-1',
          type: 'heading',
          content: { text: 'Welcome', level: 1 },
          style: { colorToken: 'text' },
          boundingBox: { x: 100, y: 200, width: 400, height: 60 },
        },
        {
          id: 'button-1',
          type: 'button',
          content: { text: 'Get Started', href: '/signup' },
          style: { backgroundToken: 'primary' },
          boundingBox: { x: 200, y: 300, width: 150, height: 48 },
        },
      ],
    },
    {
      id: 'grid-1',
      intent: { type: 'grid', columns: 3, gap: 'lg' },
      boundingBox: { x: 0, y: 600, width: 1200, height: 400 },
      background: { type: 'none' },
      padding: 'lg',
      elements: [
        {
          id: 'card-1',
          type: 'card',
          content: { text: 'Feature 1' },
          style: {},
          boundingBox: { x: 50, y: 650, width: 350, height: 200 },
        },
      ],
    },
    {
      id: 'footer-1',
      intent: { type: 'footer' },
      boundingBox: { x: 0, y: 1000, width: 1200, height: 200 },
      background: { type: 'color', colorToken: 'text' },
      padding: 'md',
      elements: [
        {
          id: 'paragraph-1',
          type: 'paragraph',
          content: { text: 'Copyright 2024' },
          style: {},
          boundingBox: { x: 500, y: 1100, width: 200, height: 24 },
        },
      ],
    },
  ],
};

const sampleThemeJson: ThemeJsonSnapshot = {
  settings: {
    color: {
      palette: [
        { slug: 'primary', color: '#3b82f6', name: 'Primary' },
        { slug: 'text', color: '#1e293b', name: 'Text' },
      ],
    },
    spacing: {
      spacingSizes: [
        { slug: 'md', size: '16px', name: 'Medium' },
        { slug: 'lg', size: '24px', name: 'Large' },
      ],
    },
  },
};

const samplePatterns: PatternMapping[] = [
  {
    sectionId: 'hero-1',
    intent: { type: 'hero', alignment: 'center' },
    blockMarkup: '<!-- wp:cover -->...<!-- /wp:cover -->',
    patternName: 'hero',
  },
  {
    sectionId: 'grid-1',
    intent: { type: 'grid', columns: 3, gap: 'lg' },
    blockMarkup: '<!-- wp:columns -->...<!-- /wp:columns -->',
  },
];

describe('createIndex', () => {
  it('should extract layout intents from blueprint', () => {
    const index = createIndex(sampleBlueprint);
    expect(index.layoutIntents).toContain('hero');
    expect(index.layoutIntents).toContain('grid');
    expect(index.layoutIntents).toContain('footer');
    expect(index.layoutIntents).toHaveLength(3);
  });

  it('should extract unique element types', () => {
    const index = createIndex(sampleBlueprint);
    expect(index.elementTypes).toContain('heading');
    expect(index.elementTypes).toContain('button');
    expect(index.elementTypes).toContain('card');
    expect(index.elementTypes).toContain('paragraph');
  });

  it('should count colors correctly', () => {
    const index = createIndex(sampleBlueprint);
    expect(index.colorCount).toBe(3);
  });

  it('should count sections correctly', () => {
    const index = createIndex(sampleBlueprint);
    expect(index.sectionCount).toBe(3);
  });

  it('should handle blueprint with no elements', () => {
    const emptyBlueprint: UIBlueprint = {
      ...sampleBlueprint,
      sections: [
        {
          id: 'empty-1',
          intent: { type: 'single-column' },
          boundingBox: { x: 0, y: 0, width: 1200, height: 400 },
          background: { type: 'none' },
          padding: 'md',
          elements: [],
        },
      ],
    };
    const index = createIndex(emptyBlueprint);
    expect(index.elementTypes).toHaveLength(0);
    expect(index.layoutIntents).toContain('single-column');
  });
});

describe('createStoredExample', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a valid stored example', () => {
    const example = createStoredExample({
      ir: sampleBlueprint,
      themeJson: sampleThemeJson,
      patterns: samplePatterns,
      validationScore: 0.95,
    });

    expect(example.id).toBe('mock-uuid-12345');
    expect(example.version).toBe('1.0');
    expect(example.ir).toBe(sampleBlueprint);
    expect(example.themeJson).toBe(sampleThemeJson);
    expect(example.patterns).toBe(samplePatterns);
    expect(example.validationScore).toBe(0.95);
    expect(example.source).toBe('local');
  });

  it('should create index from IR', () => {
    const example = createStoredExample({
      ir: sampleBlueprint,
      themeJson: sampleThemeJson,
      patterns: samplePatterns,
      validationScore: 0.95,
    });

    expect(example.index.layoutIntents).toContain('hero');
    expect(example.index.sectionCount).toBe(3);
  });

  it('should set source to provided value', () => {
    const example = createStoredExample({
      ir: sampleBlueprint,
      themeJson: sampleThemeJson,
      patterns: samplePatterns,
      validationScore: 0.95,
      source: 'bundled',
    });

    expect(example.source).toBe('bundled');
  });

  it('should include tags in index when provided', () => {
    const example = createStoredExample({
      ir: sampleBlueprint,
      themeJson: sampleThemeJson,
      patterns: samplePatterns,
      validationScore: 0.95,
      tags: ['marketing', 'landing-page'],
    });

    expect(example.index.tags).toEqual(['marketing', 'landing-page']);
  });

  it('should set createdAt to ISO timestamp', () => {
    const before = new Date().toISOString();
    const example = createStoredExample({
      ir: sampleBlueprint,
      themeJson: sampleThemeJson,
      patterns: samplePatterns,
      validationScore: 0.95,
    });
    const after = new Date().toISOString();

    expect(example.createdAt >= before).toBe(true);
    expect(example.createdAt <= after).toBe(true);
  });
});

describe('indexExample', () => {
  it('should create an index entry from stored example', () => {
    const storedExample: StoredExample = {
      id: 'example-123',
      version: '1.0',
      index: {
        layoutIntents: ['hero', 'grid'],
        elementTypes: ['heading', 'button'],
        colorCount: 5,
        sectionCount: 2,
      },
      ir: sampleBlueprint,
      themeJson: sampleThemeJson,
      patterns: samplePatterns,
      validationScore: 0.93,
      createdAt: '2024-01-15T10:00:00.000Z',
      source: 'local',
    };

    const entry = indexExample(storedExample);

    expect(entry.id).toBe('example-123');
    expect(entry.index).toBe(storedExample.index);
    expect(entry.validationScore).toBe(0.93);
    expect(entry.createdAt).toBe('2024-01-15T10:00:00.000Z');
    expect(entry.source).toBe('local');
  });
});

describe('searchIndex', () => {
  const catalog: IndexEntry[] = [
    {
      id: 'entry-1',
      index: {
        layoutIntents: ['hero', 'grid', 'footer'],
        elementTypes: ['heading', 'button', 'card'],
        colorCount: 5,
        sectionCount: 3,
      },
      validationScore: 0.95,
      createdAt: '2024-01-01T00:00:00.000Z',
      source: 'local',
    },
    {
      id: 'entry-2',
      index: {
        layoutIntents: ['navigation', 'two-column'],
        elementTypes: ['link', 'paragraph', 'image'],
        colorCount: 4,
        sectionCount: 2,
      },
      validationScore: 0.88,
      createdAt: '2024-01-02T00:00:00.000Z',
      source: 'bundled',
    },
    {
      id: 'entry-3',
      index: {
        layoutIntents: ['hero', 'testimonials'],
        elementTypes: ['heading', 'paragraph'],
        colorCount: 3,
        sectionCount: 2,
      },
      validationScore: 0.75,
      createdAt: '2024-01-03T00:00:00.000Z',
      source: 'contributed',
    },
  ];

  it('should filter by layout intents', () => {
    const results = searchIndex(catalog, { layoutIntents: ['hero'] });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toContain('entry-1');
    expect(results.map((r) => r.id)).toContain('entry-3');
  });

  it('should filter by element types', () => {
    const results = searchIndex(catalog, { elementTypes: ['button'] });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('entry-1');
  });

  it('should filter by minimum validation score', () => {
    const results = searchIndex(catalog, { minValidationScore: 0.9 });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('entry-1');
  });

  it('should combine multiple filters', () => {
    const results = searchIndex(catalog, {
      layoutIntents: ['hero'],
      elementTypes: ['heading'],
      minValidationScore: 0.9,
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('entry-1');
  });

  it('should return all entries when no filters applied', () => {
    const results = searchIndex(catalog, {});
    expect(results).toHaveLength(3);
  });

  it('should return empty array when no matches', () => {
    const results = searchIndex(catalog, { layoutIntents: ['custom'] });
    expect(results).toHaveLength(0);
  });

  it('should match any of the provided intents (OR logic)', () => {
    const results = searchIndex(catalog, { layoutIntents: ['navigation', 'testimonials'] });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toContain('entry-2');
    expect(results.map((r) => r.id)).toContain('entry-3');
  });
});

describe('anonymizeExample', () => {
  const storedExample: StoredExample = {
    id: 'original-id',
    version: '1.0',
    index: {
      layoutIntents: ['hero'],
      elementTypes: ['heading'],
      colorCount: 3,
      sectionCount: 1,
    },
    ir: sampleBlueprint,
    themeJson: sampleThemeJson,
    patterns: samplePatterns,
    validationScore: 0.95,
    createdAt: '2024-01-15T10:00:00.000Z',
    source: 'local',
  };

  it('should replace source URL with [anonymized]', () => {
    const anonymized = anonymizeExample(storedExample);
    expect(anonymized.ir.meta.sourceUrl).toBe('[anonymized]');
  });

  it('should generate new UUID for contributed version', () => {
    const anonymized = anonymizeExample(storedExample);
    expect(anonymized.id).toBe('mock-uuid-12345');
    expect(anonymized.id).not.toBe('original-id');
  });

  it('should set source to contributed', () => {
    const anonymized = anonymizeExample(storedExample);
    expect(anonymized.source).toBe('contributed');
  });

  it('should preserve other IR properties', () => {
    const anonymized = anonymizeExample(storedExample);
    expect(anonymized.ir.meta.viewport).toEqual(sampleBlueprint.meta.viewport);
    expect(anonymized.ir.meta.title).toBe(sampleBlueprint.meta.title);
    expect(anonymized.ir.tokens).toBe(sampleBlueprint.tokens);
    expect(anonymized.ir.sections).toBe(sampleBlueprint.sections);
  });

  it('should preserve validation score', () => {
    const anonymized = anonymizeExample(storedExample);
    expect(anonymized.validationScore).toBe(0.95);
  });
});

describe('validateExample', () => {
  const validExample: StoredExample = {
    id: 'valid-123',
    version: '1.0',
    index: {
      layoutIntents: ['hero'],
      elementTypes: ['heading'],
      colorCount: 3,
      sectionCount: 1,
    },
    ir: sampleBlueprint,
    themeJson: sampleThemeJson,
    patterns: samplePatterns,
    validationScore: 0.95,
    createdAt: '2024-01-15T10:00:00.000Z',
    source: 'local',
  };

  it('should return true for valid example', () => {
    expect(validateExample(validExample)).toBe(true);
  });

  it('should return false for null', () => {
    expect(validateExample(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(validateExample(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(validateExample('string')).toBe(false);
    expect(validateExample(123)).toBe(false);
    expect(validateExample([])).toBe(false);
  });

  it('should return false for missing id', () => {
    const { id, ...noId } = validExample;
    expect(validateExample(noId)).toBe(false);
  });

  it('should return false for wrong version', () => {
    expect(validateExample({ ...validExample, version: '2.0' })).toBe(false);
  });

  it('should return false for missing index', () => {
    const { index, ...noIndex } = validExample;
    expect(validateExample(noIndex)).toBe(false);
  });

  it('should return false for missing ir', () => {
    const { ir, ...noIr } = validExample;
    expect(validateExample(noIr)).toBe(false);
  });

  it('should return false for missing themeJson', () => {
    const { themeJson, ...noThemeJson } = validExample;
    expect(validateExample(noThemeJson)).toBe(false);
  });

  it('should return false for patterns not being array', () => {
    expect(validateExample({ ...validExample, patterns: 'not-array' })).toBe(false);
  });

  it('should return false for non-number validationScore', () => {
    expect(validateExample({ ...validExample, validationScore: '0.95' })).toBe(false);
  });

  it('should return false for invalid source', () => {
    expect(validateExample({ ...validExample, source: 'invalid' })).toBe(false);
  });

  it('should return true for all valid sources', () => {
    expect(validateExample({ ...validExample, source: 'local' })).toBe(true);
    expect(validateExample({ ...validExample, source: 'bundled' })).toBe(true);
    expect(validateExample({ ...validExample, source: 'contributed' })).toBe(true);
  });
});
