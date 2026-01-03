/**
 * Core Utilities
 *
 * Deterministic algorithms for design token extraction.
 * These are pure functions that don't require AI.
 */

// Color utilities
export {
  hexToRgb,
  rgbToHex,
  rgbToLab,
  labToRgb,
  deltaE,
  clusterColors,
  type RGB,
  type LAB,
  type XYZ,
  type ColorCluster,
  type ClusterOptions,
} from './color.js';

// Spacing utilities
export {
  normalizeToBase8,
  classifySpacing,
  createSpacingScale,
  SPACING_SCALE,
  type SpacingKey,
  type SpacingClassification,
  type SpacingScaleNumeric,
  type SpacingScaleString,
  type SpacingScaleOptions,
} from './spacing.js';
