/**
 * Color Utilities Tests
 *
 * Tests for color space conversion, perceptual difference calculation,
 * and color clustering algorithms.
 */

import { describe, it, expect } from 'vitest';
import {
  rgbToLab,
  labToRgb,
  hexToRgb,
  rgbToHex,
  deltaE,
  clusterColors,
  type LAB,
  type RGB,
} from '../utils/color.js';

describe('Color Space Conversion', () => {
  describe('hexToRgb', () => {
    it('should convert hex to RGB', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle hex without # prefix', () => {
      expect(hexToRgb('ff5500')).toEqual({ r: 255, g: 85, b: 0 });
    });

    it('should handle uppercase hex', () => {
      expect(hexToRgb('#FF5500')).toEqual({ r: 255, g: 85, b: 0 });
    });

    it('should handle 3-character hex shorthand', () => {
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('rgbToHex', () => {
    it('should convert RGB to hex', () => {
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
      expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
      expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00ff00');
      expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe('#0000ff');
    });

    it('should pad single digit hex values', () => {
      expect(rgbToHex({ r: 0, g: 15, b: 0 })).toBe('#000f00');
    });
  });

  describe('rgbToLab', () => {
    it('should convert black correctly', () => {
      const lab = rgbToLab({ r: 0, g: 0, b: 0 });
      expect(lab.L).toBeCloseTo(0, 0);
    });

    it('should convert white correctly', () => {
      const lab = rgbToLab({ r: 255, g: 255, b: 255 });
      expect(lab.L).toBeCloseTo(100, 0);
      expect(lab.a).toBeCloseTo(0, 0);
      expect(lab.b).toBeCloseTo(0, 0);
    });

    it('should convert red correctly', () => {
      const lab = rgbToLab({ r: 255, g: 0, b: 0 });
      expect(lab.L).toBeCloseTo(53.2, 0);
      expect(lab.a).toBeGreaterThan(70); // Red has high positive a
      expect(lab.b).toBeGreaterThan(50); // Red has positive b
    });

    it('should convert green correctly', () => {
      const lab = rgbToLab({ r: 0, g: 255, b: 0 });
      expect(lab.L).toBeCloseTo(87.7, 0);
      expect(lab.a).toBeLessThan(-80); // Green has negative a
      expect(lab.b).toBeGreaterThan(70); // Green has positive b
    });

    it('should convert blue correctly', () => {
      const lab = rgbToLab({ r: 0, g: 0, b: 255 });
      expect(lab.L).toBeCloseTo(32.3, 0);
      expect(lab.a).toBeGreaterThan(70); // Blue has positive a
      expect(lab.b).toBeLessThan(-100); // Blue has large negative b
    });

    it('should convert gray correctly', () => {
      const lab = rgbToLab({ r: 128, g: 128, b: 128 });
      expect(lab.a).toBeCloseTo(0, 0);
      expect(lab.b).toBeCloseTo(0, 0);
    });
  });

  describe('labToRgb', () => {
    it('should convert black correctly', () => {
      const rgb = labToRgb({ L: 0, a: 0, b: 0 });
      expect(rgb.r).toBeCloseTo(0, 0);
      expect(rgb.g).toBeCloseTo(0, 0);
      expect(rgb.b).toBeCloseTo(0, 0);
    });

    it('should convert white correctly', () => {
      const rgb = labToRgb({ L: 100, a: 0, b: 0 });
      expect(rgb.r).toBeCloseTo(255, 0);
      expect(rgb.g).toBeCloseTo(255, 0);
      expect(rgb.b).toBeCloseTo(255, 0);
    });

    it('should be inverse of rgbToLab', () => {
      const original = { r: 100, g: 150, b: 200 };
      const lab = rgbToLab(original);
      const back = labToRgb(lab);
      expect(back.r).toBeCloseTo(original.r, 0);
      expect(back.g).toBeCloseTo(original.g, 0);
      expect(back.b).toBeCloseTo(original.b, 0);
    });
  });
});

describe('Delta-E (Color Difference)', () => {
  describe('deltaE', () => {
    it('should return 0 for identical colors', () => {
      const lab: LAB = { L: 50, a: 25, b: -30 };
      expect(deltaE(lab, lab)).toBe(0);
    });

    it('should return small value for similar colors', () => {
      const lab1: LAB = { L: 50, a: 25, b: -30 };
      const lab2: LAB = { L: 51, a: 25, b: -30 };
      expect(deltaE(lab1, lab2)).toBeLessThan(2);
    });

    it('should return value < 2 for perceptually identical colors', () => {
      // Colors with Delta-E < 2.0 are considered perceptually identical
      const lab1 = rgbToLab(hexToRgb('#3b82f6'));
      const lab2 = rgbToLab(hexToRgb('#3b83f7')); // Very similar blue
      expect(deltaE(lab1, lab2)).toBeLessThan(2);
    });

    it('should return larger value for different colors', () => {
      const red = rgbToLab({ r: 255, g: 0, b: 0 });
      const blue = rgbToLab({ r: 0, g: 0, b: 255 });
      expect(deltaE(red, blue)).toBeGreaterThan(50);
    });

    it('should return moderate value for somewhat different colors', () => {
      const lightBlue = rgbToLab(hexToRgb('#3b82f6'));
      const darkBlue = rgbToLab(hexToRgb('#1e40af'));
      const diff = deltaE(lightBlue, darkBlue);
      expect(diff).toBeGreaterThan(10);
      expect(diff).toBeLessThan(50);
    });

    it('should be symmetric', () => {
      const lab1 = rgbToLab(hexToRgb('#ff5500'));
      const lab2 = rgbToLab(hexToRgb('#00ff55'));
      expect(deltaE(lab1, lab2)).toBeCloseTo(deltaE(lab2, lab1));
    });
  });
});

describe('Color Clustering', () => {
  describe('clusterColors', () => {
    it('should merge identical colors', () => {
      const colors = ['#ff0000', '#ff0000', '#ff0000'];
      const result = clusterColors(colors);
      expect(result.length).toBe(1);
      // Centroid may have minor drift due to LAB conversion, check it's close
      const centroidRgb = hexToRgb(result[0].value);
      expect(centroidRgb.r).toBeGreaterThan(250);
      expect(centroidRgb.g).toBeLessThan(5);
      expect(centroidRgb.b).toBeLessThan(5);
      expect(result[0].count).toBe(3);
    });

    it('should merge perceptually similar colors (Delta-E < 2)', () => {
      const colors = ['#3b82f6', '#3b83f7', '#3a82f5']; // Very similar blues
      const result = clusterColors(colors);
      expect(result.length).toBe(1);
    });

    it('should keep distinct colors separate', () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff'];
      const result = clusterColors(colors);
      expect(result.length).toBe(3);
    });

    it('should return colors sorted by frequency', () => {
      const colors = [
        '#ff0000',
        '#00ff00', '#00ff00', '#00ff00',
        '#0000ff', '#0000ff',
      ];
      const result = clusterColors(colors);
      expect(result[0].count).toBe(3); // Green most frequent
      expect(result[1].count).toBe(2); // Blue second
      expect(result[2].count).toBe(1); // Red least
    });

    it('should use centroid as cluster representative', () => {
      // When merging similar colors, use the centroid
      const colors = ['#ff0000', '#ff0000', '#fe0000']; // Nearly identical reds
      const result = clusterColors(colors);
      expect(result.length).toBe(1);
      // The centroid should be close to the original colors
      const centroidRgb = hexToRgb(result[0].value);
      expect(centroidRgb.r).toBeGreaterThan(250);
    });

    it('should handle empty input', () => {
      const result = clusterColors([]);
      expect(result).toEqual([]);
    });

    it('should handle single color', () => {
      const result = clusterColors(['#ff5500']);
      expect(result.length).toBe(1);
      expect(result[0].value).toBe('#ff5500');
      expect(result[0].count).toBe(1);
    });

    it('should limit output to 5-8 colors typically', () => {
      // Simulate extracting many colors from a page
      const manyColors = [
        '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', // White (5x)
        '#1e293b', '#1e293b', '#1e293b', '#1e293b', // Dark text (4x)
        '#3b82f6', '#3b82f6', '#3b82f6', // Primary blue (3x)
        '#64748b', '#64748b', // Muted gray (2x)
        '#f8fafc', '#f8fafc', // Light background (2x)
        '#22c55e', // Success green (1x)
        '#ef4444', // Error red (1x)
        '#eab308', // Warning yellow (1x)
        '#f0f0f0', '#e0e0e0', '#d0d0d0', // Various grays (will cluster)
      ];
      const result = clusterColors(manyColors, { maxClusters: 8 });
      expect(result.length).toBeLessThanOrEqual(8);
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it('should accept custom Delta-E threshold', () => {
      const colors = ['#3b82f6', '#2563eb']; // Blues with Delta-E around 10

      // With low threshold, keep separate
      const strictResult = clusterColors(colors, { threshold: 2 });
      expect(strictResult.length).toBe(2);

      // With high threshold, merge
      const looseResult = clusterColors(colors, { threshold: 20 });
      expect(looseResult.length).toBe(1);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle out-of-range RGB values', () => {
    // Clamp to valid range
    const lab = rgbToLab({ r: 300, g: -50, b: 128 });
    expect(lab.L).toBeDefined();
    expect(lab.a).toBeDefined();
    expect(lab.b).toBeDefined();
  });

  it('should handle LAB values outside typical range', () => {
    const rgb = labToRgb({ L: 150, a: 200, b: -200 });
    // Should clamp to valid RGB range
    expect(rgb.r).toBeGreaterThanOrEqual(0);
    expect(rgb.r).toBeLessThanOrEqual(255);
    expect(rgb.g).toBeGreaterThanOrEqual(0);
    expect(rgb.g).toBeLessThanOrEqual(255);
    expect(rgb.b).toBeGreaterThanOrEqual(0);
    expect(rgb.b).toBeLessThanOrEqual(255);
  });

  it('should handle invalid hex gracefully', () => {
    expect(() => hexToRgb('invalid')).toThrow();
    expect(() => hexToRgb('#gggggg')).toThrow();
  });
});
