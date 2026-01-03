/**
 * LocalStore Tests
 *
 * Tests for the local memory store that manages examples on disk.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalStore } from '../local-store.js';
import type { StoredExample, UIBlueprint, ThemeJsonSnapshot, PatternMapping } from '../types.js';

// Mock fs modules
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/Users/test'),
}));

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);
const mockReaddir = vi.mocked(readdir);
const mockUnlink = vi.mocked(unlink);
const mockExistsSync = vi.mocked(existsSync);

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

const sampleThemeJson: ThemeJsonSnapshot = {
  settings: {
    color: { palette: [{ slug: 'primary', color: '#3b82f6', name: 'Primary' }] },
  },
};

const samplePatterns: PatternMapping[] = [];

const createSampleExample = (id: string): StoredExample => ({
  id,
  version: '1.0',
  index: {
    layoutIntents: ['hero'],
    elementTypes: ['heading'],
    colorCount: 1,
    sectionCount: 0,
  },
  ir: sampleBlueprint,
  themeJson: sampleThemeJson,
  patterns: samplePatterns,
  validationScore: 0.95,
  createdAt: '2024-01-15T10:00:00.000Z',
  source: 'local',
});

describe('LocalStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should expand ~ to home directory', () => {
      const store = new LocalStore('~/.wp-morph/memory');
      // The path expansion happens internally, we verify by checking initialize behavior
      expect(store).toBeDefined();
    });

    it('should use absolute path as-is', () => {
      const store = new LocalStore('/custom/path/memory');
      expect(store).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should create directories if they do not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('examples'),
        { recursive: true }
      );
    });

    it('should load catalog if it exists', async () => {
      const catalogData = [
        {
          id: 'example-1',
          index: { layoutIntents: ['hero'], elementTypes: [], colorCount: 1, sectionCount: 1 },
          validationScore: 0.95,
          createdAt: '2024-01-15T10:00:00.000Z',
          source: 'local',
        },
      ];

      mockExistsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('catalog.json')) return true;
        if (typeof path === 'string' && path.includes('examples')) return true;
        return false;
      });
      mockReadFile.mockResolvedValue(JSON.stringify(catalogData));

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      expect(store.count()).toBe(1);
    });

    it('should handle corrupted catalog gracefully', async () => {
      mockExistsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('catalog.json')) return true;
        if (typeof path === 'string' && path.includes('examples')) return true;
        return false;
      });
      mockReadFile.mockResolvedValue('invalid json{');

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      expect(store.count()).toBe(0);
    });

    it('should only initialize once', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();
      await store.initialize();

      expect(mockMkdir).toHaveBeenCalledTimes(1);
    });
  });

  describe('store', () => {
    it('should write example to file', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      const example = createSampleExample('test-123');
      await store.store(example);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('test-123.json'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should update catalog after storing', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      const example = createSampleExample('test-123');
      await store.store(example);

      expect(store.count()).toBe(1);

      // Should have written catalog.json
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('catalog.json'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should auto-initialize if not initialized', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      const example = createSampleExample('test-123');
      await store.store(example);

      expect(mockMkdir).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return null if example not in catalog', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      const result = await store.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return example if found', async () => {
      const example = createSampleExample('test-123');
      const catalogData = [
        {
          id: 'test-123',
          index: example.index,
          validationScore: 0.95,
          createdAt: '2024-01-15T10:00:00.000Z',
          source: 'local',
        },
      ];

      mockExistsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('catalog.json')) return true;
        if (typeof path === 'string' && path.includes('examples')) return true;
        if (typeof path === 'string' && path.includes('test-123.json')) return true;
        return false;
      });
      mockReadFile.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('catalog.json')) {
          return Promise.resolve(JSON.stringify(catalogData));
        }
        if (typeof path === 'string' && path.includes('test-123.json')) {
          return Promise.resolve(JSON.stringify(example));
        }
        return Promise.reject(new Error('File not found'));
      });

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      const result = await store.get('test-123');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-123');
    });

    it('should remove from catalog if file is missing', async () => {
      const catalogData = [
        {
          id: 'missing-123',
          index: { layoutIntents: [], elementTypes: [], colorCount: 0, sectionCount: 0 },
          validationScore: 0.95,
          createdAt: '2024-01-15T10:00:00.000Z',
          source: 'local',
        },
      ];

      mockExistsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('missing-123.json')) return false;
        if (typeof path === 'string' && path.includes('catalog.json')) return true;
        if (typeof path === 'string' && path.includes('examples')) return true;
        return false;
      });
      mockReadFile.mockResolvedValue(JSON.stringify(catalogData));
      mockWriteFile.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      expect(store.count()).toBe(1);

      const result = await store.get('missing-123');
      expect(result).toBeNull();
      expect(store.count()).toBe(0);
    });
  });

  describe('getAll', () => {
    it('should return all stored examples', async () => {
      const example1 = createSampleExample('example-1');
      const example2 = createSampleExample('example-2');
      const catalogData = [
        {
          id: 'example-1',
          index: example1.index,
          validationScore: 0.95,
          createdAt: '2024-01-15T10:00:00.000Z',
          source: 'local',
        },
        {
          id: 'example-2',
          index: example2.index,
          validationScore: 0.93,
          createdAt: '2024-01-15T11:00:00.000Z',
          source: 'local',
        },
      ];

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('catalog.json')) {
          return Promise.resolve(JSON.stringify(catalogData));
        }
        if (typeof path === 'string' && path.includes('example-1.json')) {
          return Promise.resolve(JSON.stringify(example1));
        }
        if (typeof path === 'string' && path.includes('example-2.json')) {
          return Promise.resolve(JSON.stringify(example2));
        }
        return Promise.reject(new Error('File not found'));
      });

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      const results = await store.getAll();
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no examples', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      const results = await store.getAll();
      expect(results).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should return false if example not found', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      const result = await store.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('should delete file and update catalog', async () => {
      const example = createSampleExample('delete-me');
      const catalogData = [
        {
          id: 'delete-me',
          index: example.index,
          validationScore: 0.95,
          createdAt: '2024-01-15T10:00:00.000Z',
          source: 'local',
        },
      ];

      mockExistsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('catalog.json')) return true;
        if (typeof path === 'string' && path.includes('examples')) return true;
        if (typeof path === 'string' && path.includes('delete-me.json')) return true;
        return false;
      });
      mockReadFile.mockResolvedValue(JSON.stringify(catalogData));
      mockUnlink.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      expect(store.count()).toBe(1);

      const result = await store.delete('delete-me');
      expect(result).toBe(true);
      expect(store.count()).toBe(0);
      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  describe('getCatalog', () => {
    it('should return catalog entries', async () => {
      const catalogData = [
        {
          id: 'example-1',
          index: { layoutIntents: ['hero'], elementTypes: [], colorCount: 1, sectionCount: 1 },
          validationScore: 0.95,
          createdAt: '2024-01-15T10:00:00.000Z',
          source: 'local',
        },
      ];

      mockExistsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('catalog.json')) return true;
        if (typeof path === 'string' && path.includes('examples')) return true;
        return false;
      });
      mockReadFile.mockResolvedValue(JSON.stringify(catalogData));

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      const catalog = store.getCatalog();
      expect(catalog).toHaveLength(1);
      expect(catalog[0].id).toBe('example-1');
    });
  });

  describe('count', () => {
    it('should return 0 for empty store', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      expect(store.count()).toBe(0);
    });

    it('should return correct count', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      await store.store(createSampleExample('ex-1'));
      await store.store(createSampleExample('ex-2'));
      await store.store(createSampleExample('ex-3'));

      expect(store.count()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should delete all example files', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('[]');
      mockReaddir.mockResolvedValue(['example-1.json', 'example-2.json', 'readme.txt'] as any);
      mockUnlink.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      await store.clear();

      // Should only delete .json files
      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(store.count()).toBe(0);
    });
  });

  describe('rebuildCatalog', () => {
    it('should rebuild catalog from disk files', async () => {
      const example = createSampleExample('disk-example');

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('catalog.json')) {
          return Promise.resolve('[]');
        }
        if (typeof path === 'string' && path.includes('disk-example.json')) {
          return Promise.resolve(JSON.stringify(example));
        }
        return Promise.reject(new Error('File not found'));
      });
      mockReaddir.mockResolvedValue(['disk-example.json'] as any);
      mockWriteFile.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      await store.rebuildCatalog();

      expect(store.count()).toBe(1);
      expect(store.getCatalog()[0].id).toBe('disk-example');
    });

    it('should skip invalid example files', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('catalog.json')) {
          return Promise.resolve('[]');
        }
        if (typeof path === 'string' && path.includes('invalid.json')) {
          return Promise.resolve('{ invalid json }');
        }
        return Promise.reject(new Error('File not found'));
      });
      mockReaddir.mockResolvedValue(['invalid.json'] as any);
      mockWriteFile.mockResolvedValue(undefined);

      const store = new LocalStore('~/.wp-morph/memory');
      await store.initialize();

      await store.rebuildCatalog();

      expect(store.count()).toBe(0);
    });
  });
});
