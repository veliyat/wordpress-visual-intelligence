/**
 * Spacing Utilities Tests
 *
 * Tests for spacing normalization to base-8 scale.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeToBase8,
  createSpacingScale,
  SPACING_SCALE,
  classifySpacing,
  type SpacingClassification,
} from '../utils/spacing.js';

describe('Spacing Constants', () => {
  describe('SPACING_SCALE', () => {
    it('should define all scale values', () => {
      expect(SPACING_SCALE).toHaveProperty('xs');
      expect(SPACING_SCALE).toHaveProperty('sm');
      expect(SPACING_SCALE).toHaveProperty('md');
      expect(SPACING_SCALE).toHaveProperty('lg');
      expect(SPACING_SCALE).toHaveProperty('xl');
      expect(SPACING_SCALE).toHaveProperty('xxl');
    });

    it('should follow base-8 progression', () => {
      expect(SPACING_SCALE.xs).toBe(4);
      expect(SPACING_SCALE.sm).toBe(8);
      expect(SPACING_SCALE.md).toBe(16);
      expect(SPACING_SCALE.lg).toBe(24);
      expect(SPACING_SCALE.xl).toBe(32);
      expect(SPACING_SCALE.xxl).toBe(48);
    });

    it('should have increasing values', () => {
      const values = [
        SPACING_SCALE.xs,
        SPACING_SCALE.sm,
        SPACING_SCALE.md,
        SPACING_SCALE.lg,
        SPACING_SCALE.xl,
        SPACING_SCALE.xxl,
      ];
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });
});

describe('normalizeToBase8', () => {
  it('should return exact matches unchanged', () => {
    expect(normalizeToBase8(4)).toBe(4);
    expect(normalizeToBase8(8)).toBe(8);
    expect(normalizeToBase8(16)).toBe(16);
    expect(normalizeToBase8(24)).toBe(24);
    expect(normalizeToBase8(32)).toBe(32);
    expect(normalizeToBase8(48)).toBe(48);
  });

  it('should round to nearest base-8 multiple', () => {
    expect(normalizeToBase8(5)).toBe(4);   // Round down to 4
    expect(normalizeToBase8(6)).toBe(8);   // Round up to 8
    expect(normalizeToBase8(7)).toBe(8);   // Round up to 8
    expect(normalizeToBase8(10)).toBe(8);  // Round down to 8
    expect(normalizeToBase8(12)).toBe(16); // Round up to 16 (closer than 8)
    expect(normalizeToBase8(14)).toBe(16); // Round up to 16
    expect(normalizeToBase8(20)).toBe(24); // Round up to 24 (closer than 16)
  });

  it('should handle values between scale points', () => {
    expect(normalizeToBase8(3)).toBe(4);   // Below xs
    expect(normalizeToBase8(27)).toBe(24); // Between lg(24) and xl(32), closer to lg
    expect(normalizeToBase8(28)).toBe(32); // Exactly at midpoint, rounds UP
    expect(normalizeToBase8(30)).toBe(32); // Between lg and xl, closer to xl
    expect(normalizeToBase8(40)).toBe(48); // Exactly at midpoint between xl(32) and xxl(48), rounds UP
  });

  it('should handle zero', () => {
    expect(normalizeToBase8(0)).toBe(0);
  });

  it('should handle negative values by returning 0', () => {
    expect(normalizeToBase8(-5)).toBe(0);
    expect(normalizeToBase8(-16)).toBe(0);
  });

  it('should handle values larger than xxl', () => {
    expect(normalizeToBase8(60)).toBe(64);  // Round to nearest multiple of 8
    expect(normalizeToBase8(100)).toBe(104); // Math.round(100/8)*8 = 104
    expect(normalizeToBase8(64)).toBe(64);  // Exact multiple
    expect(normalizeToBase8(96)).toBe(96);  // Exact multiple
  });

  it('should handle decimal values', () => {
    expect(normalizeToBase8(7.5)).toBe(8);
    expect(normalizeToBase8(15.9)).toBe(16);
    expect(normalizeToBase8(16.1)).toBe(16);
  });
});

describe('classifySpacing', () => {
  it('should classify values to named scale', () => {
    expect(classifySpacing(4)).toBe('xs');
    expect(classifySpacing(8)).toBe('sm');
    expect(classifySpacing(16)).toBe('md');
    expect(classifySpacing(24)).toBe('lg');
    expect(classifySpacing(32)).toBe('xl');
    expect(classifySpacing(48)).toBe('xxl');
  });

  it('should classify normalized values', () => {
    expect(classifySpacing(5)).toBe('xs');   // Rounds to 4
    expect(classifySpacing(10)).toBe('sm');  // Rounds to 8
    expect(classifySpacing(15)).toBe('md');  // Rounds to 16
    expect(classifySpacing(22)).toBe('lg');  // Rounds to 24
    expect(classifySpacing(30)).toBe('xl');  // Rounds to 32
    expect(classifySpacing(50)).toBe('xxl'); // Rounds to 48
  });

  it('should handle values outside standard scale', () => {
    expect(classifySpacing(0)).toBe('none');
    expect(classifySpacing(2)).toBe('xs');   // Very small → xs
    expect(classifySpacing(64)).toBe('xxl'); // Large → xxl (max)
    expect(classifySpacing(100)).toBe('xxl'); // Very large → xxl
  });
});

describe('createSpacingScale', () => {
  it('should create scale from raw spacing values', () => {
    const rawValues = [4, 8, 15, 25, 30, 50];
    const scale = createSpacingScale(rawValues);

    expect(scale).toHaveProperty('xs');
    expect(scale).toHaveProperty('sm');
    expect(scale).toHaveProperty('md');
    expect(scale).toHaveProperty('lg');
    expect(scale).toHaveProperty('xl');
    expect(scale).toHaveProperty('xxl');
  });

  it('should normalize values to base-8', () => {
    const rawValues = [5, 10, 18, 22, 35, 45];
    const scale = createSpacingScale(rawValues) as { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };

    // All values should be multiples of 4 (base-8/2)
    expect(scale.xs % 4).toBe(0);
    expect(scale.sm % 4).toBe(0);
    expect(scale.md % 4).toBe(0);
    expect(scale.lg % 4).toBe(0);
    expect(scale.xl % 4).toBe(0);
    expect(scale.xxl % 4).toBe(0);
  });

  it('should use default scale when no values provided', () => {
    const scale = createSpacingScale([]);
    expect(scale).toEqual(SPACING_SCALE);
  });

  it('should use default scale when insufficient values', () => {
    const scale = createSpacingScale([16]); // Only one value
    expect(scale.md).toBe(16); // Should use this value
    // Other values should be derived or use defaults
    expect(scale.xs).toBeDefined();
    expect(scale.xxl).toBeDefined();
  });

  it('should handle many values by clustering', () => {
    const rawValues = [
      4, 5, 3,      // Small values cluster → xs
      8, 9, 7,      // Small-medium cluster → sm
      14, 16, 18,   // Medium cluster → md
      22, 24, 26,   // Medium-large cluster → lg
      30, 32, 34,   // Large cluster → xl
      44, 48, 52,   // Extra large cluster → xxl
    ];
    const scale = createSpacingScale(rawValues);

    expect(scale.xs).toBe(4);
    expect(scale.sm).toBe(8);
    expect(scale.md).toBe(16);
    expect(scale.lg).toBe(24);
    expect(scale.xl).toBe(32);
    // 44→48, 48→48, 52→56 → median of [48, 48, 56] = 48
    expect(scale.xxl).toBeGreaterThanOrEqual(48);
  });

  it('should return scale in px string format when requested', () => {
    const rawValues = [4, 8, 16, 24, 32, 48];
    const scale = createSpacingScale(rawValues, { format: 'px' });

    expect(scale.xs).toBe('4px');
    expect(scale.sm).toBe('8px');
    expect(scale.md).toBe('16px');
    expect(scale.lg).toBe('24px');
    expect(scale.xl).toBe('32px');
    expect(scale.xxl).toBe('48px');
  });

  it('should return scale in rem format when requested', () => {
    const rawValues = [4, 8, 16, 24, 32, 48];
    const scale = createSpacingScale(rawValues, { format: 'rem', baseFontSize: 16 });

    expect(scale.xs).toBe('0.25rem');
    expect(scale.sm).toBe('0.5rem');
    expect(scale.md).toBe('1rem');
    expect(scale.lg).toBe('1.5rem');
    expect(scale.xl).toBe('2rem');
    expect(scale.xxl).toBe('3rem');
  });
});

describe('Edge Cases', () => {
  it('should handle very small spacing values', () => {
    expect(normalizeToBase8(1)).toBe(0);
    expect(normalizeToBase8(2)).toBe(4); // Round up to xs
    expect(classifySpacing(1)).toBe('none');
    expect(classifySpacing(2)).toBe('xs');
  });

  it('should handle very large spacing values', () => {
    expect(normalizeToBase8(200)).toBe(200); // Keep as multiple of 8
    expect(classifySpacing(200)).toBe('xxl'); // Max classification
  });

  it('should handle floating point precision', () => {
    expect(normalizeToBase8(15.999999)).toBe(16);
    expect(normalizeToBase8(16.000001)).toBe(16);
  });

  it('should handle NaN', () => {
    expect(normalizeToBase8(NaN)).toBe(0);
    expect(classifySpacing(NaN)).toBe('none');
  });

  it('should handle Infinity', () => {
    expect(normalizeToBase8(Infinity)).toBe(48); // Cap at xxl
    expect(classifySpacing(Infinity)).toBe('xxl');
  });
});

describe('Spacing Extraction Helpers', () => {
  it('should be suitable for WordPress theme.json output', () => {
    const rawValues = [4, 8, 16, 24, 32, 48];
    const scale = createSpacingScale(rawValues, { format: 'px' });

    // WordPress theme.json format
    const wpSpacingSizes = Object.entries(scale).map(([slug, size]) => ({
      slug,
      size,
      name: slug.toUpperCase(),
    }));

    expect(wpSpacingSizes).toContainEqual({ slug: 'xs', size: '4px', name: 'XS' });
    expect(wpSpacingSizes).toContainEqual({ slug: 'md', size: '16px', name: 'MD' });
  });
});
