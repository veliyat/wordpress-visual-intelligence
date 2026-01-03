/**
 * IR Schema Tests
 *
 * Tests for the Intermediate Representation type system.
 * Ensures schema consistency and type guard correctness.
 */

import { describe, it, expect } from 'vitest';
import type {
  UIBlueprint,
  Section,
  Element,
  DesignTokens,
  ColorToken,
  ColorRole,
  LayoutIntent,
  ElementType,
  CorrectionIssue,
  CorrectionSignal,
  ValidationResult,
  BoundingBox,
  SpacingScale,
  SpacingRef,
  TypeSizeRef,
  TypeWeightRef,
} from '../types/ir.js';
import {
  sampleUIBlueprint,
  minimalUIBlueprint,
  complexUIBlueprint,
  sampleHeroSection,
  sampleHeadingElement,
  sampleDesignTokens,
  sampleCorrectionSignal,
  sampleValidationResult,
} from './__fixtures__/sample-blueprint.js';

describe('IR Schema', () => {
  describe('UIBlueprint', () => {
    it('should have version 1.0', () => {
      expect(sampleUIBlueprint.version).toBe('1.0');
    });

    it('should contain required top-level properties', () => {
      expect(sampleUIBlueprint).toHaveProperty('version');
      expect(sampleUIBlueprint).toHaveProperty('meta');
      expect(sampleUIBlueprint).toHaveProperty('tokens');
      expect(sampleUIBlueprint).toHaveProperty('sections');
    });

    it('should have valid meta with required fields', () => {
      const { meta } = sampleUIBlueprint;
      expect(meta.sourceUrl).toBeDefined();
      expect(meta.capturedAt).toBeDefined();
      expect(meta.viewport).toBeDefined();
      expect(meta.viewport.width).toBeGreaterThan(0);
      expect(meta.viewport.height).toBeGreaterThan(0);
    });

    it('should have ISO 8601 formatted capturedAt', () => {
      const { capturedAt } = sampleUIBlueprint.meta;
      const date = new Date(capturedAt);
      expect(date.toISOString()).toBe(capturedAt);
    });

    it('should have at least one section', () => {
      expect(sampleUIBlueprint.sections.length).toBeGreaterThan(0);
    });
  });

  describe('DesignTokens', () => {
    it('should contain colors, spacing, and typography', () => {
      const { tokens } = sampleUIBlueprint;
      expect(tokens).toHaveProperty('colors');
      expect(tokens).toHaveProperty('spacing');
      expect(tokens).toHaveProperty('typography');
    });

    it('should have at least one color token', () => {
      expect(sampleDesignTokens.colors.length).toBeGreaterThan(0);
    });

    it('should have all spacing scale values', () => {
      const spacingKeys: SpacingRef[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
      for (const key of spacingKeys) {
        expect(sampleDesignTokens.spacing[key]).toBeDefined();
        expect(typeof sampleDesignTokens.spacing[key]).toBe('string');
      }
    });

    it('should have typography with fontFamilies, sizes, and weights', () => {
      const { typography } = sampleDesignTokens;
      expect(typography.fontFamilies.length).toBeGreaterThan(0);
      expect(typography.sizes).toBeDefined();
      expect(typography.weights).toBeDefined();
    });
  });

  describe('ColorToken', () => {
    it('should have valid hex color values', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/;
      for (const color of sampleDesignTokens.colors) {
        expect(color.value).toMatch(hexPattern);
      }
    });

    it('should have valid color roles', () => {
      const validRoles: ColorRole[] = [
        'primary',
        'secondary',
        'accent',
        'surface',
        'background',
        'text',
        'text-muted',
        'border',
        'error',
        'success',
      ];
      for (const color of sampleDesignTokens.colors) {
        expect(validRoles).toContain(color.role);
      }
    });

    it('should have usage array for each color', () => {
      for (const color of sampleDesignTokens.colors) {
        expect(Array.isArray(color.usage)).toBe(true);
      }
    });
  });

  describe('Section', () => {
    it('should have required properties', () => {
      expect(sampleHeroSection).toHaveProperty('id');
      expect(sampleHeroSection).toHaveProperty('intent');
      expect(sampleHeroSection).toHaveProperty('boundingBox');
      expect(sampleHeroSection).toHaveProperty('background');
      expect(sampleHeroSection).toHaveProperty('padding');
      expect(sampleHeroSection).toHaveProperty('elements');
    });

    it('should have unique section id', () => {
      const ids = sampleUIBlueprint.sections.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid layout intent', () => {
      const validIntentTypes = [
        'hero',
        'single-column',
        'two-column',
        'three-column',
        'grid',
        'cards',
        'feature-list',
        'testimonials',
        'footer',
        'navigation',
        'custom',
      ];
      for (const section of sampleUIBlueprint.sections) {
        expect(validIntentTypes).toContain(section.intent.type);
      }
    });

    it('should have valid bounding box dimensions', () => {
      for (const section of sampleUIBlueprint.sections) {
        const { boundingBox } = section;
        expect(boundingBox.width).toBeGreaterThan(0);
        expect(boundingBox.height).toBeGreaterThan(0);
        expect(boundingBox.x).toBeGreaterThanOrEqual(0);
        expect(boundingBox.y).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have valid spacing reference for padding', () => {
      const validSpacingRefs: SpacingRef[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
      for (const section of sampleUIBlueprint.sections) {
        expect(validSpacingRefs).toContain(section.padding);
      }
    });
  });

  describe('LayoutIntent', () => {
    it('hero intent should have alignment', () => {
      const heroSection = sampleUIBlueprint.sections.find((s) => s.intent.type === 'hero');
      expect(heroSection).toBeDefined();
      if (heroSection && heroSection.intent.type === 'hero') {
        expect(['left', 'center', 'right']).toContain(heroSection.intent.alignment);
      }
    });

    it('two-column intent should have ratio', () => {
      const twoColSection = sampleUIBlueprint.sections.find((s) => s.intent.type === 'two-column');
      expect(twoColSection).toBeDefined();
      if (twoColSection && twoColSection.intent.type === 'two-column') {
        expect(['50-50', '33-67', '67-33']).toContain(twoColSection.intent.ratio);
      }
    });

    it('grid intent should have columns and gap', () => {
      const gridSection = sampleUIBlueprint.sections.find((s) => s.intent.type === 'grid');
      expect(gridSection).toBeDefined();
      if (gridSection && gridSection.intent.type === 'grid') {
        expect(gridSection.intent.columns).toBeGreaterThan(0);
        expect(gridSection.intent.gap).toBeDefined();
      }
    });

    it('cards intent should have columns', () => {
      const cardsSection = complexUIBlueprint.sections.find((s) => s.intent.type === 'cards');
      expect(cardsSection).toBeDefined();
      if (cardsSection && cardsSection.intent.type === 'cards') {
        expect(cardsSection.intent.columns).toBeGreaterThan(0);
      }
    });
  });

  describe('Element', () => {
    it('should have required properties', () => {
      expect(sampleHeadingElement).toHaveProperty('id');
      expect(sampleHeadingElement).toHaveProperty('type');
      expect(sampleHeadingElement).toHaveProperty('content');
      expect(sampleHeadingElement).toHaveProperty('style');
      expect(sampleHeadingElement).toHaveProperty('boundingBox');
    });

    it('should have valid element type', () => {
      const validTypes: ElementType[] = [
        'heading',
        'paragraph',
        'button',
        'image',
        'icon',
        'link',
        'list',
        'card',
        'divider',
        'spacer',
        'custom',
      ];
      for (const section of sampleUIBlueprint.sections) {
        for (const element of section.elements) {
          expect(validTypes).toContain(element.type);
        }
      }
    });

    it('heading element should have level 1-6', () => {
      const { content } = sampleHeadingElement;
      expect(content.level).toBeDefined();
      expect(content.level).toBeGreaterThanOrEqual(1);
      expect(content.level).toBeLessThanOrEqual(6);
    });

    it('element style should use token references', () => {
      const { style } = sampleHeadingElement;
      // Style properties should reference tokens, not raw values
      if (style.colorToken) {
        expect(typeof style.colorToken).toBe('string');
      }
      if (style.fontSize) {
        const validSizes: TypeSizeRef[] = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
        expect(validSizes).toContain(style.fontSize);
      }
      if (style.fontWeight) {
        const validWeights: TypeWeightRef[] = ['normal', 'medium', 'semibold', 'bold'];
        expect(validWeights).toContain(style.fontWeight);
      }
    });
  });

  describe('BackgroundStyle', () => {
    it('should have valid background type', () => {
      const validTypes = ['color', 'gradient', 'image', 'none'];
      for (const section of sampleUIBlueprint.sections) {
        expect(validTypes).toContain(section.background.type);
      }
    });

    it('color background should have colorToken', () => {
      const colorSection = sampleUIBlueprint.sections.find((s) => s.background.type === 'color');
      expect(colorSection).toBeDefined();
      expect(colorSection?.background.colorToken).toBeDefined();
    });
  });

  describe('CorrectionSignal', () => {
    it('should have required properties', () => {
      expect(sampleCorrectionSignal).toHaveProperty('sectionId');
      expect(sampleCorrectionSignal).toHaveProperty('issue');
      expect(sampleCorrectionSignal).toHaveProperty('severity');
      expect(sampleCorrectionSignal).toHaveProperty('delta');
      expect(sampleCorrectionSignal).toHaveProperty('confidence');
    });

    it('should have valid issue type', () => {
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
      expect(validIssues).toContain(sampleCorrectionSignal.issue);
    });

    it('should have valid severity level', () => {
      expect(['low', 'medium', 'high']).toContain(sampleCorrectionSignal.severity);
    });

    it('should have confidence between 0 and 1', () => {
      expect(sampleCorrectionSignal.confidence).toBeGreaterThanOrEqual(0);
      expect(sampleCorrectionSignal.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('ValidationResult', () => {
    it('should have required properties', () => {
      expect(sampleValidationResult).toHaveProperty('similarity');
      expect(sampleValidationResult).toHaveProperty('pixelDiff');
      expect(sampleValidationResult).toHaveProperty('ssim');
      expect(sampleValidationResult).toHaveProperty('corrections');
    });

    it('should have similarity between 0 and 1', () => {
      expect(sampleValidationResult.similarity).toBeGreaterThanOrEqual(0);
      expect(sampleValidationResult.similarity).toBeLessThanOrEqual(1);
    });

    it('should have ssim between 0 and 1', () => {
      expect(sampleValidationResult.ssim).toBeGreaterThanOrEqual(0);
      expect(sampleValidationResult.ssim).toBeLessThanOrEqual(1);
    });

    it('should have corrections array', () => {
      expect(Array.isArray(sampleValidationResult.corrections)).toBe(true);
    });
  });
});

describe('Schema Constraints', () => {
  describe('No Raw Values in Output', () => {
    it('element styles should not contain raw pixel values', () => {
      const rawPixelPattern = /^\d+px$/;

      for (const section of sampleUIBlueprint.sections) {
        for (const element of section.elements) {
          const { style } = element;
          // fontSize should be a token reference, not raw value
          if (style.fontSize) {
            expect(style.fontSize).not.toMatch(rawPixelPattern);
          }
        }
      }
    });

    it('spacing should reference token names not values', () => {
      const validRefs: SpacingRef[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
      for (const section of sampleUIBlueprint.sections) {
        expect(validRefs).toContain(section.padding);
      }
    });
  });

  describe('Semantic Color Names', () => {
    it('color tokens should have semantic names', () => {
      const semanticPatterns = [
        'primary',
        'secondary',
        'accent',
        'surface',
        'background',
        'text',
        'border',
        'error',
        'success',
      ];
      for (const color of sampleDesignTokens.colors) {
        const hasSemanticName = semanticPatterns.some(
          (pattern) => color.name.includes(pattern) || color.role.includes(pattern)
        );
        expect(hasSemanticName).toBe(true);
      }
    });
  });
});

describe('Edge Cases', () => {
  it('minimal blueprint should be valid', () => {
    expect(minimalUIBlueprint.version).toBe('1.0');
    expect(minimalUIBlueprint.sections.length).toBe(1);
    expect(minimalUIBlueprint.tokens.colors.length).toBeGreaterThan(0);
  });

  it('complex blueprint with many sections should be valid', () => {
    expect(complexUIBlueprint.version).toBe('1.0');
    expect(complexUIBlueprint.sections.length).toBeGreaterThan(4);
  });

  it('section with empty elements array should be valid', () => {
    const emptySection = minimalUIBlueprint.sections[0];
    expect(emptySection.elements).toEqual([]);
  });
});
