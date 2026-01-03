/**
 * Spacing Utilities
 *
 * Spacing normalization to base-8 scale for consistent design tokens.
 *
 * Base-8 scale:
 * - xs:  4px  (base/2)
 * - sm:  8px  (base)
 * - md:  16px (base*2)
 * - lg:  24px (base*3)
 * - xl:  32px (base*4)
 * - xxl: 48px (base*6)
 */

// =============================================================================
// Types
// =============================================================================

export type SpacingKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type SpacingClassification = SpacingKey | 'none';

export interface SpacingScaleNumeric {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface SpacingScaleString {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface SpacingScaleOptions {
  format?: 'number' | 'px' | 'rem';
  baseFontSize?: number; // For rem conversion, default 16
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Standard base-8 spacing scale in pixels.
 */
export const SPACING_SCALE: SpacingScaleNumeric = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Ordered list of scale values for classification.
 */
const SCALE_VALUES: Array<{ key: SpacingKey; value: number }> = [
  { key: 'xs', value: 4 },
  { key: 'sm', value: 8 },
  { key: 'md', value: 16 },
  { key: 'lg', value: 24 },
  { key: 'xl', value: 32 },
  { key: 'xxl', value: 48 },
];

// =============================================================================
// Normalization Functions
// =============================================================================

/**
 * Normalize a spacing value to the nearest base-8 multiple.
 *
 * For values within the standard scale (4-48), snaps to scale values.
 * For values outside the scale, rounds to nearest multiple of 8.
 * At midpoints, rounds UP to the larger value.
 *
 * @param value - Raw spacing value in pixels
 * @returns Normalized spacing value
 */
export function normalizeToBase8(value: number): number {
  // Handle edge cases
  if (!Number.isFinite(value)) {
    if (value === Infinity) {
      return 48; // Cap at xxl
    }
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  // For very small values
  if (value < 2) {
    return 0;
  }
  if (value < 3) {
    return 4;
  }

  // For values > 48, round to nearest multiple of 8
  if (value > 48) {
    return Math.round(value / 8) * 8;
  }

  // Find the closest scale value, rounding UP at midpoints
  for (let i = 0; i < SCALE_VALUES.length - 1; i++) {
    const current = SCALE_VALUES[i];
    const next = SCALE_VALUES[i + 1];
    const midpoint = (current.value + next.value) / 2;

    if (value < midpoint) {
      return current.value;
    }
  }

  // Value is >= midpoint of last interval, return xxl
  return SCALE_VALUES[SCALE_VALUES.length - 1].value;
}

/**
 * Classify a spacing value to a named scale key.
 *
 * @param value - Raw or normalized spacing value in pixels
 * @returns Scale key (xs, sm, md, lg, xl, xxl) or 'none' for zero/invalid
 */
export function classifySpacing(value: number): SpacingClassification {
  // Handle edge cases
  if (value === Infinity) {
    return 'xxl';
  }
  if (!Number.isFinite(value) || value <= 0) {
    return 'none';
  }

  // Very small values
  if (value < 3) {
    return value < 2 ? 'none' : 'xs';
  }

  // Normalize first
  const normalized = normalizeToBase8(value);

  // Large values beyond scale
  if (normalized >= 48) {
    return 'xxl';
  }

  // Find matching scale key
  for (const sv of SCALE_VALUES) {
    if (normalized === sv.value) {
      return sv.key;
    }
  }

  // Fallback (shouldn't reach here)
  return 'md';
}

// =============================================================================
// Scale Creation
// =============================================================================

/**
 * Create a spacing scale from raw spacing values.
 *
 * Algorithm:
 * 1. Sort and deduplicate values
 * 2. Normalize each to base-8
 * 3. Cluster into 6 groups (xs through xxl)
 * 4. Use median of each cluster as scale value
 *
 * @param rawValues - Array of raw spacing values in pixels
 * @param options - Output format options
 * @returns Spacing scale object
 */
export function createSpacingScale(
  rawValues: number[],
  options: SpacingScaleOptions = {}
): SpacingScaleNumeric | SpacingScaleString {
  const { format = 'number', baseFontSize = 16 } = options;

  // Use default scale if no values provided
  if (rawValues.length === 0) {
    return formatScale(SPACING_SCALE, format, baseFontSize);
  }

  // Normalize and sort values
  const normalized = rawValues
    .filter((v) => Number.isFinite(v) && v > 0)
    .map(normalizeToBase8)
    .filter((v) => v > 0);

  if (normalized.length === 0) {
    return formatScale(SPACING_SCALE, format, baseFontSize);
  }

  // Deduplicate and sort
  const unique = [...new Set(normalized)].sort((a, b) => a - b);

  // If we have exactly 6 values, use them directly
  if (unique.length === 6) {
    const scale: SpacingScaleNumeric = {
      xs: unique[0],
      sm: unique[1],
      md: unique[2],
      lg: unique[3],
      xl: unique[4],
      xxl: unique[5],
    };
    return formatScale(scale, format, baseFontSize);
  }

  // Otherwise, cluster values into 6 buckets
  const scale = clusterIntoScale(unique);
  return formatScale(scale, format, baseFontSize);
}

/**
 * Cluster values into the 6 scale buckets.
 */
function clusterIntoScale(values: number[]): SpacingScaleNumeric {
  // Define bucket ranges (midpoints between scale values)
  const buckets: Array<{ key: SpacingKey; min: number; max: number }> = [
    { key: 'xs', min: 0, max: 6 },
    { key: 'sm', min: 6, max: 12 },
    { key: 'md', min: 12, max: 20 },
    { key: 'lg', min: 20, max: 28 },
    { key: 'xl', min: 28, max: 40 },
    { key: 'xxl', min: 40, max: Infinity },
  ];

  const bucketValues: Record<SpacingKey, number[]> = {
    xs: [],
    sm: [],
    md: [],
    lg: [],
    xl: [],
    xxl: [],
  };

  // Assign values to buckets
  for (const v of values) {
    for (const bucket of buckets) {
      if (v >= bucket.min && v < bucket.max) {
        bucketValues[bucket.key].push(v);
        break;
      }
    }
  }

  // Calculate median for each bucket, or use default
  const scale: SpacingScaleNumeric = {
    xs: median(bucketValues.xs) ?? SPACING_SCALE.xs,
    sm: median(bucketValues.sm) ?? SPACING_SCALE.sm,
    md: median(bucketValues.md) ?? SPACING_SCALE.md,
    lg: median(bucketValues.lg) ?? SPACING_SCALE.lg,
    xl: median(bucketValues.xl) ?? SPACING_SCALE.xl,
    xxl: median(bucketValues.xxl) ?? SPACING_SCALE.xxl,
  };

  return scale;
}

/**
 * Calculate median of an array.
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Format scale values according to options.
 */
function formatScale(
  scale: SpacingScaleNumeric,
  format: 'number' | 'px' | 'rem',
  baseFontSize: number
): SpacingScaleNumeric | SpacingScaleString {
  if (format === 'number') {
    return scale;
  }

  const keys: SpacingKey[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const result: SpacingScaleString = {
    xs: '',
    sm: '',
    md: '',
    lg: '',
    xl: '',
    xxl: '',
  };

  for (const key of keys) {
    const value = scale[key];
    if (format === 'px') {
      result[key] = `${value}px`;
    } else if (format === 'rem') {
      result[key] = `${value / baseFontSize}rem`;
    }
  }

  return result;
}
