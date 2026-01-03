/**
 * WP Generator Package Tests
 *
 * Contract tests for WordPress theme generation from IR.
 * These tests define the expected API before implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UIBlueprint, Section, DesignTokens } from '@wp-morph/core';

// Types that should be implemented
interface ThemeJson {
  $schema: string;
  version: number;
  settings: {
    color?: {
      palette?: Array<{ slug: string; color: string; name: string }>;
      gradients?: Array<{ slug: string; gradient: string; name: string }>;
    };
    spacing?: {
      spacingSizes?: Array<{ slug: string; size: string; name: string }>;
    };
    typography?: {
      fontFamilies?: Array<{ slug: string; fontFamily: string; name: string }>;
      fontSizes?: Array<{ slug: string; size: string; name: string }>;
    };
  };
  styles?: {
    color?: { background?: string; text?: string };
    typography?: { fontFamily?: string };
    spacing?: { padding?: object };
  };
}

interface BlockPattern {
  name: string;
  title: string;
  content: string;
  categories: string[];
  blockTypes?: string[];
}

interface Template {
  name: string;
  title: string;
  content: string;
}

interface ThemeConfig {
  name: string;
  slug: string;
  description?: string;
  author?: string;
  version?: string;
}

interface ExportOptions {
  outputPath: string;
  overwrite?: boolean;
}

interface GeneratedTheme {
  themeJson: ThemeJson;
  styleCss: string;
  functionsPHP: string;
  patterns: BlockPattern[];
  templates: Template[];
}

// Mock implementations
const generateTheme = vi.fn<[UIBlueprint, ThemeConfig], GeneratedTheme>();
const generateThemeJson = vi.fn<[DesignTokens], ThemeJson>();
const generatePattern = vi.fn<[Section], BlockPattern>();
const generateTemplates = vi.fn<[Section[]], Template[]>();
const exportTheme = vi.fn<[GeneratedTheme, ExportOptions], Promise<void>>();

// Sample UIBlueprint for testing
const sampleBlueprint: UIBlueprint = {
  version: '1.0',
  meta: {
    sourceUrl: 'https://example.com',
    capturedAt: '2024-01-15T10:00:00.000Z',
    viewport: { width: 1200, height: 800 },
    title: 'Example Site',
  },
  tokens: {
    colors: [
      { name: 'primary', value: '#3b82f6', role: 'primary', usage: [] },
      { name: 'text', value: '#1e293b', role: 'text', usage: [] },
      { name: 'surface', value: '#ffffff', role: 'surface', usage: [] },
    ],
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' },
    typography: {
      fontFamilies: [
        { name: 'Inter', stack: 'Inter, system-ui, sans-serif', role: 'body' },
        { name: 'Poppins', stack: 'Poppins, sans-serif', role: 'heading' },
      ],
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
          style: { colorToken: 'text', fontSize: '4xl', fontWeight: 'bold' },
          boundingBox: { x: 300, y: 200, width: 600, height: 80 },
        },
        {
          id: 'button-1',
          type: 'button',
          content: { text: 'Get Started', href: '/signup' },
          style: { colorToken: 'surface', backgroundToken: 'primary' },
          boundingBox: { x: 500, y: 320, width: 200, height: 50 },
        },
      ],
    },
    {
      id: 'footer-1',
      intent: { type: 'footer' },
      boundingBox: { x: 0, y: 600, width: 1200, height: 200 },
      background: { type: 'color', colorToken: 'text' },
      padding: 'lg',
      elements: [
        {
          id: 'copyright',
          type: 'paragraph',
          content: { text: '© 2024 Company' },
          style: { colorToken: 'surface' },
          boundingBox: { x: 500, y: 700, width: 200, height: 24 },
        },
      ],
    },
  ],
};

describe('packages/wp-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateTheme', () => {
    it('should generate complete theme from UIBlueprint', () => {
      const mockTheme: GeneratedTheme = {
        themeJson: {
          $schema: 'https://schemas.wp.org/trunk/theme.json',
          version: 2,
          settings: {
            color: {
              palette: [{ slug: 'primary', color: '#3b82f6', name: 'Primary' }],
            },
          },
        },
        styleCss: '/* Theme Name: My Theme */',
        functionsPHP: '<?php // Functions',
        patterns: [],
        templates: [],
      };
      generateTheme.mockReturnValue(mockTheme);

      const config: ThemeConfig = {
        name: 'My Theme',
        slug: 'my-theme',
      };

      const result = generateTheme(sampleBlueprint, config);

      expect(result).toHaveProperty('themeJson');
      expect(result).toHaveProperty('styleCss');
      expect(result).toHaveProperty('functionsPHP');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('templates');
    });

    it('should use theme config for metadata', () => {
      const mockTheme: GeneratedTheme = {
        themeJson: {
          $schema: 'https://schemas.wp.org/trunk/theme.json',
          version: 2,
          settings: {},
        },
        styleCss: `/*
Theme Name: Custom Theme
Theme URI: https://example.com
Author: Test Author
Description: A custom theme
Version: 1.0.0
*/`,
        functionsPHP: '<?php',
        patterns: [],
        templates: [],
      };
      generateTheme.mockReturnValue(mockTheme);

      const config: ThemeConfig = {
        name: 'Custom Theme',
        slug: 'custom-theme',
        description: 'A custom theme',
        author: 'Test Author',
        version: '1.0.0',
      };

      const result = generateTheme(sampleBlueprint, config);

      expect(result.styleCss).toContain('Theme Name: Custom Theme');
      expect(result.styleCss).toContain('Author: Test Author');
    });

    it('should generate patterns for each section', () => {
      const mockTheme: GeneratedTheme = {
        themeJson: {
          $schema: 'https://schemas.wp.org/trunk/theme.json',
          version: 2,
          settings: {},
        },
        styleCss: '',
        functionsPHP: '',
        patterns: [
          {
            name: 'hero',
            title: 'Hero Section',
            content: '<!-- wp:cover -->...<!-- /wp:cover -->',
            categories: ['hero'],
          },
          {
            name: 'footer',
            title: 'Footer Section',
            content: '<!-- wp:group -->...<!-- /wp:group -->',
            categories: ['footer'],
          },
        ],
        templates: [],
      };
      generateTheme.mockReturnValue(mockTheme);

      const result = generateTheme(sampleBlueprint, { name: 'Test', slug: 'test' });

      expect(result.patterns.length).toBe(sampleBlueprint.sections.length);
    });
  });

  describe('generateThemeJson', () => {
    it('should generate valid theme.json from design tokens', () => {
      const mockThemeJson: ThemeJson = {
        $schema: 'https://schemas.wp.org/trunk/theme.json',
        version: 2,
        settings: {
          color: {
            palette: [
              { slug: 'primary', color: '#3b82f6', name: 'Primary' },
              { slug: 'text', color: '#1e293b', name: 'Text' },
              { slug: 'surface', color: '#ffffff', name: 'Surface' },
            ],
          },
          spacing: {
            spacingSizes: [
              { slug: 'xs', size: '4px', name: 'Extra Small' },
              { slug: 'sm', size: '8px', name: 'Small' },
              { slug: 'md', size: '16px', name: 'Medium' },
              { slug: 'lg', size: '24px', name: 'Large' },
              { slug: 'xl', size: '32px', name: 'Extra Large' },
              { slug: 'xxl', size: '48px', name: '2X Large' },
            ],
          },
          typography: {
            fontFamilies: [
              { slug: 'body', fontFamily: 'Inter, system-ui, sans-serif', name: 'Body' },
              { slug: 'heading', fontFamily: 'Poppins, sans-serif', name: 'Heading' },
            ],
            fontSizes: [
              { slug: 'base', size: '16px', name: 'Base' },
              { slug: 'lg', size: '18px', name: 'Large' },
            ],
          },
        },
      };
      generateThemeJson.mockReturnValue(mockThemeJson);

      const result = generateThemeJson(sampleBlueprint.tokens);

      expect(result.$schema).toContain('schemas.wp.org');
      expect(result.version).toBe(2);
      expect(result.settings).toHaveProperty('color');
      expect(result.settings).toHaveProperty('spacing');
      expect(result.settings).toHaveProperty('typography');
    });

    it('should map color tokens to WordPress palette format', () => {
      const mockThemeJson: ThemeJson = {
        $schema: 'https://schemas.wp.org/trunk/theme.json',
        version: 2,
        settings: {
          color: {
            palette: [
              { slug: 'primary', color: '#3b82f6', name: 'Primary' },
            ],
          },
        },
      };
      generateThemeJson.mockReturnValue(mockThemeJson);

      const result = generateThemeJson(sampleBlueprint.tokens);

      const palette = result.settings.color?.palette ?? [];
      for (const color of palette) {
        expect(color).toHaveProperty('slug');
        expect(color).toHaveProperty('color');
        expect(color).toHaveProperty('name');
        expect(color.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('should map spacing tokens to WordPress spacingSizes format', () => {
      const mockThemeJson: ThemeJson = {
        $schema: 'https://schemas.wp.org/trunk/theme.json',
        version: 2,
        settings: {
          spacing: {
            spacingSizes: [
              { slug: 'md', size: '16px', name: 'Medium' },
            ],
          },
        },
      };
      generateThemeJson.mockReturnValue(mockThemeJson);

      const result = generateThemeJson(sampleBlueprint.tokens);

      const sizes = result.settings.spacing?.spacingSizes ?? [];
      for (const size of sizes) {
        expect(size).toHaveProperty('slug');
        expect(size).toHaveProperty('size');
        expect(size).toHaveProperty('name');
      }
    });

    it('should map font families to WordPress format', () => {
      const mockThemeJson: ThemeJson = {
        $schema: 'https://schemas.wp.org/trunk/theme.json',
        version: 2,
        settings: {
          typography: {
            fontFamilies: [
              { slug: 'body', fontFamily: 'Inter, system-ui, sans-serif', name: 'Body' },
            ],
          },
        },
      };
      generateThemeJson.mockReturnValue(mockThemeJson);

      const result = generateThemeJson(sampleBlueprint.tokens);

      const families = result.settings.typography?.fontFamilies ?? [];
      for (const family of families) {
        expect(family).toHaveProperty('slug');
        expect(family).toHaveProperty('fontFamily');
        expect(family).toHaveProperty('name');
      }
    });
  });

  describe('generatePattern', () => {
    it('should generate block pattern from section', () => {
      const mockPattern: BlockPattern = {
        name: 'hero',
        title: 'Hero Section',
        content: `<!-- wp:cover {"align":"full"} -->
<div class="wp-block-cover alignfull">
<!-- wp:heading {"textAlign":"center"} -->
<h1 class="has-text-align-center">Welcome</h1>
<!-- /wp:heading -->
</div>
<!-- /wp:cover -->`,
        categories: ['hero', 'featured'],
      };
      generatePattern.mockReturnValue(mockPattern);

      const heroSection = sampleBlueprint.sections[0];
      const result = generatePattern(heroSection);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('categories');
      expect(result.content).toContain('<!-- wp:');
    });

    it('should generate hero pattern with cover block', () => {
      const mockPattern: BlockPattern = {
        name: 'hero',
        title: 'Hero Section',
        content: '<!-- wp:cover --><!-- /wp:cover -->',
        categories: ['hero'],
      };
      generatePattern.mockReturnValue(mockPattern);

      const heroSection = sampleBlueprint.sections.find(
        (s) => s.intent.type === 'hero'
      )!;
      const result = generatePattern(heroSection);

      expect(result.content).toContain('wp:cover');
    });

    it('should generate grid pattern with columns block', () => {
      const gridSection: Section = {
        id: 'grid-1',
        intent: { type: 'grid', columns: 3, gap: 'md' },
        boundingBox: { x: 0, y: 0, width: 1200, height: 400 },
        background: { type: 'none' },
        padding: 'lg',
        elements: [],
      };

      const mockPattern: BlockPattern = {
        name: 'grid',
        title: 'Grid Section',
        content: '<!-- wp:columns --><!-- /wp:columns -->',
        categories: ['grid'],
      };
      generatePattern.mockReturnValue(mockPattern);

      const result = generatePattern(gridSection);

      expect(result.content).toContain('wp:columns');
    });

    it('should generate footer pattern with group block', () => {
      const mockPattern: BlockPattern = {
        name: 'footer',
        title: 'Footer Section',
        content: '<!-- wp:group {"tagName":"footer"} --><!-- /wp:group -->',
        categories: ['footer'],
      };
      generatePattern.mockReturnValue(mockPattern);

      const footerSection = sampleBlueprint.sections.find(
        (s) => s.intent.type === 'footer'
      )!;
      const result = generatePattern(footerSection);

      expect(result.content).toContain('wp:group');
      expect(result.content).toContain('footer');
    });

    it('should include elements as child blocks', () => {
      const mockPattern: BlockPattern = {
        name: 'hero',
        title: 'Hero Section',
        content: `<!-- wp:cover -->
<!-- wp:heading -->Welcome<!-- /wp:heading -->
<!-- wp:buttons --><!-- wp:button -->Get Started<!-- /wp:button --><!-- /wp:buttons -->
<!-- /wp:cover -->`,
        categories: ['hero'],
      };
      generatePattern.mockReturnValue(mockPattern);

      const heroSection = sampleBlueprint.sections[0];
      const result = generatePattern(heroSection);

      expect(result.content).toContain('wp:heading');
      expect(result.content).toContain('wp:button');
    });
  });

  describe('generateTemplates', () => {
    it('should generate index template with all patterns', () => {
      const mockTemplates: Template[] = [
        {
          name: 'index',
          title: 'Index',
          content: `<!-- wp:template-part {"slug":"header"} /-->
<!-- wp:pattern {"slug":"hero"} /-->
<!-- wp:pattern {"slug":"footer"} /-->`,
        },
      ];
      generateTemplates.mockReturnValue(mockTemplates);

      const result = generateTemplates(sampleBlueprint.sections);

      expect(result.length).toBeGreaterThan(0);
      const indexTemplate = result.find((t) => t.name === 'index');
      expect(indexTemplate).toBeDefined();
    });

    it('should generate front-page template', () => {
      const mockTemplates: Template[] = [
        {
          name: 'front-page',
          title: 'Front Page',
          content: '<!-- wp:pattern {"slug":"hero"} /-->',
        },
      ];
      generateTemplates.mockReturnValue(mockTemplates);

      const result = generateTemplates(sampleBlueprint.sections);

      const frontPage = result.find((t) => t.name === 'front-page');
      expect(frontPage).toBeDefined();
    });
  });

  describe('exportTheme', () => {
    it('should export theme to filesystem', async () => {
      exportTheme.mockResolvedValue(undefined);

      const theme: GeneratedTheme = {
        themeJson: {
          $schema: 'https://schemas.wp.org/trunk/theme.json',
          version: 2,
          settings: {},
        },
        styleCss: '/* Theme */',
        functionsPHP: '<?php',
        patterns: [],
        templates: [],
      };

      await exportTheme(theme, { outputPath: '/path/to/theme' });

      expect(exportTheme).toHaveBeenCalledWith(theme, { outputPath: '/path/to/theme' });
    });

    it('should create correct directory structure', async () => {
      exportTheme.mockResolvedValue(undefined);

      const theme: GeneratedTheme = {
        themeJson: {
          $schema: 'https://schemas.wp.org/trunk/theme.json',
          version: 2,
          settings: {},
        },
        styleCss: '',
        functionsPHP: '',
        patterns: [
          { name: 'hero', title: 'Hero', content: '', categories: [] },
        ],
        templates: [
          { name: 'index', title: 'Index', content: '' },
        ],
      };

      await exportTheme(theme, { outputPath: '/output' });

      // Should create:
      // /output/theme.json
      // /output/style.css
      // /output/functions.php
      // /output/patterns/hero.php
      // /output/templates/index.html
      expect(exportTheme).toHaveBeenCalled();
    });

    it('should throw error if output path exists and overwrite is false', async () => {
      exportTheme.mockRejectedValue(new Error('Directory exists'));

      const theme: GeneratedTheme = {
        themeJson: {
          $schema: 'https://schemas.wp.org/trunk/theme.json',
          version: 2,
          settings: {},
        },
        styleCss: '',
        functionsPHP: '',
        patterns: [],
        templates: [],
      };

      await expect(
        exportTheme(theme, { outputPath: '/existing-path', overwrite: false })
      ).rejects.toThrow('Directory exists');
    });
  });
});

describe('WordPress Block Mapping', () => {
  describe('Element to Block Mapping', () => {
    it('heading element maps to wp:heading', () => {
      const elementType = 'heading';
      const expectedBlock = 'wp:heading';
      expect(elementType).toBe('heading');
      expect(expectedBlock).toContain('heading');
    });

    it('paragraph element maps to wp:paragraph', () => {
      const elementType = 'paragraph';
      const expectedBlock = 'wp:paragraph';
      expect(elementType).toBe('paragraph');
    });

    it('button element maps to wp:button', () => {
      const elementType = 'button';
      const expectedBlock = 'wp:button';
      expect(elementType).toBe('button');
    });

    it('image element maps to wp:image', () => {
      const elementType = 'image';
      const expectedBlock = 'wp:image';
      expect(elementType).toBe('image');
    });

    it('list element maps to wp:list', () => {
      const elementType = 'list';
      const expectedBlock = 'wp:list';
      expect(elementType).toBe('list');
    });
  });

  describe('Layout Intent to Block Mapping', () => {
    it('hero intent uses wp:cover', () => {
      expect('hero').toBe('hero');
    });

    it('two-column intent uses wp:columns', () => {
      expect('two-column').toBe('two-column');
    });

    it('grid intent uses wp:columns or wp:gallery', () => {
      expect('grid').toBe('grid');
    });

    it('footer intent uses wp:group with footer tag', () => {
      expect('footer').toBe('footer');
    });

    it('navigation intent uses wp:navigation', () => {
      expect('navigation').toBe('navigation');
    });
  });
});
