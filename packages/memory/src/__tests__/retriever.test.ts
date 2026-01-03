/**
 * ExampleRetriever Tests
 *
 * Tests for the example retrieval and scoring logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExampleRetriever, createRetriever } from '../retriever.js';
import type {
  StoredExample,
  ExampleQuery,
  UIBlueprint,
  ThemeJsonSnapshot,
  PatternMapping,
} from '../types.js';

// Mock the local store and bundled modules
vi.mock('../local-store.js', () => ({
  LocalStore: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  })),
}));

vi.mock('../bundled.js', () => ({
  loadBundledExamples: vi.fn().mockResolvedValue([]),
}));

import { LocalStore } from '../local-store.js';
import { loadBundledExamples } from '../bundled.js';

const mockLocalStore = vi.mocked(LocalStore);
const mockLoadBundled = vi.mocked(loadBundledExamples);

// Sample data
const sampleBlueprint: UIBlueprint = {
  version: '1.0',
  meta: {
    sourceUrl: 'https://example.com',
    capturedAt: '2024-01-15T10:00:00.000Z',
    viewport: { width: 1200, height: 800 },
  },
  tokens: {
    colors: [{ name: 'primary', value: '#3b82f6', role: 'primary', usage: [] }],
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

const createExample = (
  id: string,
  intents: string[],
  elements: string[],
  score: number,
  source: 'local' | 'bundled' | 'contributed' = 'local'
): StoredExample => ({
  id,
  version: '1.0',
  index: {
    layoutIntents: intents as any,
    elementTypes: elements as any,
    colorCount: 3,
    sectionCount: intents.length,
  },
  ir: sampleBlueprint,
  themeJson: { settings: {} },
  patterns: [],
  validationScore: score,
  createdAt: '2024-01-15T10:00:00.000Z',
  source,
});

describe('ExampleRetriever', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create retriever with default config', () => {
      const retriever = new ExampleRetriever();
      expect(retriever).toBeDefined();
    });

    it('should create retriever with custom config', () => {
      const retriever = new ExampleRetriever({
        localPath: '/custom/path',
        includeBundled: false,
        includeLocal: true,
        autoStoreThreshold: 0.9,
      });
      expect(retriever).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should load bundled examples when includeBundled is true', async () => {
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever({ includeBundled: true });
      await retriever.initialize();

      expect(mockLoadBundled).toHaveBeenCalled();
    });

    it('should not load bundled when includeBundled is false', async () => {
      const retriever = new ExampleRetriever({ includeBundled: false });
      await retriever.initialize();

      expect(mockLoadBundled).not.toHaveBeenCalled();
    });

    it('should only initialize once', async () => {
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      await retriever.initialize();
      await retriever.initialize();

      expect(mockLoadBundled).toHaveBeenCalledTimes(1);
    });
  });

  describe('search', () => {
    it('should return empty array when no examples match', async () => {
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({ layoutIntents: ['hero'] });

      expect(results).toEqual([]);
    });

    it('should search local examples first', async () => {
      const localExample = createExample('local-1', ['hero'], ['heading'], 0.95, 'local');
      const bundledExample = createExample('bundled-1', ['hero'], ['heading'], 0.93, 'bundled');

      const mockGetAll = vi.fn().mockResolvedValue([localExample]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([bundledExample]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({ layoutIntents: ['hero'] });

      expect(results.length).toBe(2);
      // Local should be first due to higher validation score
      expect(results[0].example.source).toBe('local');
    });

    it('should filter by minimum validation score', async () => {
      const highScore = createExample('high', ['hero'], ['heading'], 0.95);
      const lowScore = createExample('low', ['hero'], ['heading'], 0.75);

      const mockGetAll = vi.fn().mockResolvedValue([highScore, lowScore]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({
        layoutIntents: ['hero'],
        minValidationScore: 0.9,
      });

      expect(results.length).toBe(1);
      expect(results[0].example.id).toBe('high');
    });

    it('should filter by section count range', async () => {
      const twoSections = createExample('two', ['hero', 'footer'], ['heading'], 0.95);
      const fiveSections = createExample(
        'five',
        ['hero', 'grid', 'testimonials', 'cards', 'footer'],
        ['heading'],
        0.95
      );

      const mockGetAll = vi.fn().mockResolvedValue([twoSections, fiveSections]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({
        sectionCount: { min: 3, max: 6 },
      });

      expect(results.length).toBe(1);
      expect(results[0].example.id).toBe('five');
    });

    it('should respect limit parameter', async () => {
      const examples = [
        createExample('ex-1', ['hero'], ['heading'], 0.95),
        createExample('ex-2', ['hero'], ['heading'], 0.94),
        createExample('ex-3', ['hero'], ['heading'], 0.93),
        createExample('ex-4', ['hero'], ['heading'], 0.92),
        createExample('ex-5', ['hero'], ['heading'], 0.91),
      ];

      const mockGetAll = vi.fn().mockResolvedValue(examples);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({
        layoutIntents: ['hero'],
        limit: 3,
      });

      expect(results.length).toBe(3);
    });

    it('should require at least one intent match when intents specified', async () => {
      const heroExample = createExample('hero', ['hero', 'footer'], ['heading'], 0.95);
      const gridExample = createExample('grid', ['grid', 'cards'], ['card'], 0.95);

      const mockGetAll = vi.fn().mockResolvedValue([heroExample, gridExample]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({ layoutIntents: ['testimonials'] });

      expect(results.length).toBe(0);
    });

    it('should filter by sources', async () => {
      const localExample = createExample('local-1', ['hero'], ['heading'], 0.95, 'local');
      const bundledExample = createExample('bundled-1', ['hero'], ['heading'], 0.93, 'bundled');

      const mockGetAll = vi.fn().mockResolvedValue([localExample]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([bundledExample]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({
        layoutIntents: ['hero'],
        sources: ['bundled'],
      });

      expect(results.length).toBe(1);
      expect(results[0].example.source).toBe('bundled');
    });

    it('should sort by relevance', async () => {
      // Example with more matching intents should rank higher
      const manyMatches = createExample('many', ['hero', 'grid', 'footer'], ['heading'], 0.90);
      const fewMatches = createExample('few', ['hero'], ['heading'], 0.95);

      const mockGetAll = vi.fn().mockResolvedValue([fewMatches, manyMatches]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({
        layoutIntents: ['hero', 'grid', 'footer'],
      });

      expect(results.length).toBe(2);
      // manyMatches should have higher relevance despite lower validation score
      expect(results[0].example.id).toBe('many');
    });
  });

  describe('scoring algorithm', () => {
    it('should weight intent matches at 50%', async () => {
      const fullMatch = createExample('full', ['hero', 'grid'], ['heading'], 0.80);
      const partialMatch = createExample('partial', ['hero'], ['heading'], 0.80);

      const mockGetAll = vi.fn().mockResolvedValue([fullMatch, partialMatch]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({
        layoutIntents: ['hero', 'grid'],
        elementTypes: [],
      });

      expect(results[0].example.id).toBe('full');
      expect(results[0].relevance).toBeGreaterThan(results[1].relevance);
    });

    it('should weight element matches at 30%', async () => {
      const moreElements = createExample('more', ['hero'], ['heading', 'button', 'image'], 0.80);
      const fewerElements = createExample('fewer', ['hero'], ['heading'], 0.80);

      const mockGetAll = vi.fn().mockResolvedValue([moreElements, fewerElements]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({
        layoutIntents: ['hero'],
        elementTypes: ['heading', 'button', 'image'],
      });

      expect(results[0].example.id).toBe('more');
    });

    it('should weight validation score at 20%', async () => {
      const highValidation = createExample('high', ['hero'], ['heading'], 1.0);
      const lowValidation = createExample('low', ['hero'], ['heading'], 0.5);

      const mockGetAll = vi.fn().mockResolvedValue([highValidation, lowValidation]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({
        layoutIntents: ['hero'],
      });

      // Both should match, but highValidation should have higher score
      expect(results[0].example.id).toBe('high');
    });

    it('should include matched features in result', async () => {
      const example = createExample('ex', ['hero', 'grid', 'footer'], ['heading', 'button'], 0.95);

      const mockGetAll = vi.fn().mockResolvedValue([example]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const results = await retriever.search({
        layoutIntents: ['hero', 'grid'],
        elementTypes: ['heading'],
      });

      expect(results[0].matchedIntents).toContain('hero');
      expect(results[0].matchedIntents).toContain('grid');
      expect(results[0].matchedElements).toContain('heading');
    });
  });

  describe('findSimilar', () => {
    it('should extract query from blueprint sections', async () => {
      const existingExample = createExample('similar', ['hero', 'footer'], ['heading', 'button'], 0.95);

      const mockGetAll = vi.fn().mockResolvedValue([existingExample]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const blueprint: Partial<UIBlueprint> = {
        sections: [
          {
            id: 'hero-1',
            intent: { type: 'hero', alignment: 'center' },
            boundingBox: { x: 0, y: 0, width: 1200, height: 600 },
            background: { type: 'none' },
            padding: 'xl',
            elements: [
              {
                id: 'heading-1',
                type: 'heading',
                content: { text: 'Hello', level: 1 },
                style: {},
                boundingBox: { x: 0, y: 0, width: 400, height: 60 },
              },
            ],
          },
        ],
      };

      const retriever = new ExampleRetriever();
      const results = await retriever.findSimilar(blueprint, 5);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should set section count range with flexibility', async () => {
      const example2sections = createExample('two', ['hero', 'footer'], ['heading'], 0.95);
      const example5sections = createExample(
        'five',
        ['hero', 'grid', 'testimonials', 'cards', 'footer'],
        ['heading'],
        0.95
      );

      const mockGetAll = vi.fn().mockResolvedValue([example2sections, example5sections]);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: mockGetAll,
            get: vi.fn(),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      // Blueprint with 3 sections should match both (range: 1-5)
      const blueprint: Partial<UIBlueprint> = {
        sections: [
          {
            id: 's1',
            intent: { type: 'hero', alignment: 'center' },
            boundingBox: { x: 0, y: 0, width: 1200, height: 200 },
            background: { type: 'none' },
            padding: 'md',
            elements: [],
          },
          {
            id: 's2',
            intent: { type: 'grid', columns: 3, gap: 'md' },
            boundingBox: { x: 0, y: 200, width: 1200, height: 200 },
            background: { type: 'none' },
            padding: 'md',
            elements: [],
          },
          {
            id: 's3',
            intent: { type: 'footer' },
            boundingBox: { x: 0, y: 400, width: 1200, height: 200 },
            background: { type: 'none' },
            padding: 'md',
            elements: [],
          },
        ],
      };

      const retriever = new ExampleRetriever();
      const results = await retriever.findSimilar(blueprint);

      // Both should be within range (1-5 for 3 sections)
      expect(results.length).toBe(2);
    });
  });

  describe('getById', () => {
    it('should return example from local store first', async () => {
      const localExample = createExample('found', ['hero'], ['heading'], 0.95, 'local');

      const mockGet = vi.fn().mockResolvedValue(localExample);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: vi.fn().mockResolvedValue([]),
            get: mockGet,
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const result = await retriever.getById('found');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('found');
    });

    it('should check bundled examples if not in local', async () => {
      const bundledExample = createExample('bundled-found', ['hero'], ['heading'], 0.95, 'bundled');

      const mockGet = vi.fn().mockResolvedValue(null);
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: vi.fn().mockResolvedValue([]),
            get: mockGet,
          }) as any
      );
      mockLoadBundled.mockResolvedValue([bundledExample]);

      const retriever = new ExampleRetriever();
      const result = await retriever.getById('bundled-found');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('bundled-found');
    });

    it('should return null if not found anywhere', async () => {
      mockLocalStore.mockImplementation(
        () =>
          ({
            initialize: vi.fn().mockResolvedValue(undefined),
            getAll: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
          }) as any
      );
      mockLoadBundled.mockResolvedValue([]);

      const retriever = new ExampleRetriever();
      const result = await retriever.getById('nonexistent');

      expect(result).toBeNull();
    });
  });
});

describe('createRetriever', () => {
  it('should create a new ExampleRetriever', () => {
    const retriever = createRetriever();
    expect(retriever).toBeInstanceOf(ExampleRetriever);
  });

  it('should pass config to retriever', () => {
    const retriever = createRetriever({
      localPath: '/custom/path',
      includeBundled: false,
    });
    expect(retriever).toBeInstanceOf(ExampleRetriever);
  });
});
