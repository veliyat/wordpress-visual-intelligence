/**
 * Color Utilities
 *
 * Color space conversion, perceptual difference calculation,
 * and clustering algorithms for design token extraction.
 *
 * Uses CIELAB color space for perceptual uniformity and
 * Delta-E (CIE76) for measuring color differences.
 */

// =============================================================================
// Types
// =============================================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LAB {
  L: number;
  a: number;
  b: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface ColorCluster {
  value: string; // Hex color (centroid)
  count: number; // Number of colors in cluster
  colors: string[]; // Original colors in cluster
}

export interface ClusterOptions {
  threshold?: number; // Delta-E threshold for merging (default: 2.0)
  maxClusters?: number; // Maximum clusters to return (default: 8)
}

// =============================================================================
// Constants
// =============================================================================

// D65 illuminant reference values
const REF_X = 95.047;
const REF_Y = 100.0;
const REF_Z = 108.883;

// =============================================================================
// Hex <-> RGB Conversion
// =============================================================================

/**
 * Convert hex color to RGB.
 * Supports 3-char (#fff) and 6-char (#ffffff) formats, with or without #.
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  let h = hex.replace(/^#/, '');

  // Expand 3-char to 6-char
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  // Validate
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Convert RGB to hex color.
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const clamped = Math.round(Math.max(0, Math.min(255, n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// =============================================================================
// RGB <-> XYZ Conversion
// =============================================================================

/**
 * Convert RGB to XYZ color space.
 * Uses sRGB color space with D65 illuminant.
 */
function rgbToXyz(rgb: RGB): XYZ {
  // Clamp and normalize to 0-1
  let r = Math.max(0, Math.min(255, rgb.r)) / 255;
  let g = Math.max(0, Math.min(255, rgb.g)) / 255;
  let b = Math.max(0, Math.min(255, rgb.b)) / 255;

  // Apply gamma correction (sRGB)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Scale to 0-100
  r *= 100;
  g *= 100;
  b *= 100;

  // Convert to XYZ using sRGB matrix
  return {
    x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    y: r * 0.2126729 + g * 0.7151522 + b * 0.072175,
    z: r * 0.0193339 + g * 0.119192 + b * 0.9503041,
  };
}

/**
 * Convert XYZ to RGB color space.
 */
function xyzToRgb(xyz: XYZ): RGB {
  // Convert from XYZ to linear RGB
  let r = xyz.x * 0.032406255 + xyz.y * -0.015372281 + xyz.z * -0.004986477;
  let g = xyz.x * -0.009689307 + xyz.y * 0.018760912 + xyz.z * 0.00041556;
  let b = xyz.x * 0.000557101 + xyz.y * -0.002040211 + xyz.z * 0.01057057;

  // Apply inverse gamma correction (sRGB)
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  // Scale to 0-255 and clamp
  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(b * 255))),
  };
}

// =============================================================================
// XYZ <-> LAB Conversion
// =============================================================================

/**
 * Convert XYZ to CIELAB color space.
 */
function xyzToLab(xyz: XYZ): LAB {
  // Normalize to reference white (D65)
  let x = xyz.x / REF_X;
  let y = xyz.y / REF_Y;
  let z = xyz.z / REF_Z;

  // Apply f(t) function
  const epsilon = 0.008856; // (6/29)^3
  const kappa = 903.3; // (29/3)^3

  x = x > epsilon ? Math.cbrt(x) : (kappa * x + 16) / 116;
  y = y > epsilon ? Math.cbrt(y) : (kappa * y + 16) / 116;
  z = z > epsilon ? Math.cbrt(z) : (kappa * z + 16) / 116;

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

/**
 * Convert CIELAB to XYZ color space.
 */
function labToXyz(lab: LAB): XYZ {
  const epsilon = 0.008856;
  const kappa = 903.3;

  const fy = (lab.L + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;

  const x = Math.pow(fx, 3) > epsilon ? Math.pow(fx, 3) : (116 * fx - 16) / kappa;
  const y = lab.L > kappa * epsilon ? Math.pow(fy, 3) : lab.L / kappa;
  const z = Math.pow(fz, 3) > epsilon ? Math.pow(fz, 3) : (116 * fz - 16) / kappa;

  return {
    x: x * REF_X,
    y: y * REF_Y,
    z: z * REF_Z,
  };
}

// =============================================================================
// RGB <-> LAB Conversion (Public API)
// =============================================================================

/**
 * Convert RGB to CIELAB color space.
 * This is the recommended color space for perceptual color operations.
 */
export function rgbToLab(rgb: RGB): LAB {
  return xyzToLab(rgbToXyz(rgb));
}

/**
 * Convert CIELAB to RGB color space.
 */
export function labToRgb(lab: LAB): RGB {
  return xyzToRgb(labToXyz(lab));
}

// =============================================================================
// Delta-E (Color Difference)
// =============================================================================

/**
 * Calculate Delta-E (CIE76) between two LAB colors.
 *
 * Delta-E interpretation:
 * - 0-1: Not perceptible by human eye
 * - 1-2: Perceptible through close observation
 * - 2-10: Perceptible at a glance
 * - 11-49: Colors are more similar than opposite
 * - 100: Colors are exact opposites
 *
 * For design token clustering, we use threshold < 2.0 for "identical" colors.
 */
export function deltaE(lab1: LAB, lab2: LAB): number {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// =============================================================================
// Color Clustering
// =============================================================================

/**
 * Cluster similar colors together.
 *
 * Algorithm:
 * 1. Convert all colors to LAB
 * 2. Iteratively merge colors with Delta-E < threshold
 * 3. Use centroid as cluster representative
 * 4. Sort by frequency (most common first)
 * 5. Limit to maxClusters
 */
export function clusterColors(
  hexColors: string[],
  options: ClusterOptions = {}
): ColorCluster[] {
  const { threshold = 2.0, maxClusters = 8 } = options;

  if (hexColors.length === 0) {
    return [];
  }

  // Convert to LAB with original hex
  interface ColorWithLab {
    hex: string;
    lab: LAB;
  }

  const colorsWithLab: ColorWithLab[] = hexColors.map((hex) => ({
    hex: hex.startsWith('#') ? hex : `#${hex}`,
    lab: rgbToLab(hexToRgb(hex)),
  }));

  // Initialize clusters: each color is its own cluster
  const clusters: {
    colors: ColorWithLab[];
    centroid: LAB;
  }[] = colorsWithLab.map((c) => ({
    colors: [c],
    centroid: { ...c.lab },
  }));

  // Merge clusters iteratively
  let merged = true;
  while (merged) {
    merged = false;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const diff = deltaE(clusters[i].centroid, clusters[j].centroid);
        if (diff < threshold) {
          // Merge j into i
          clusters[i].colors.push(...clusters[j].colors);

          // Recalculate centroid
          const allColors = clusters[i].colors;
          clusters[i].centroid = {
            L: allColors.reduce((sum, c) => sum + c.lab.L, 0) / allColors.length,
            a: allColors.reduce((sum, c) => sum + c.lab.a, 0) / allColors.length,
            b: allColors.reduce((sum, c) => sum + c.lab.b, 0) / allColors.length,
          };

          // Remove cluster j
          clusters.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  // If still too many clusters, merge closest pairs until under limit
  while (clusters.length > maxClusters) {
    let minDiff = Infinity;
    let mergeI = 0;
    let mergeJ = 1;

    // Find closest pair
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const diff = deltaE(clusters[i].centroid, clusters[j].centroid);
        if (diff < minDiff) {
          minDiff = diff;
          mergeI = i;
          mergeJ = j;
        }
      }
    }

    // Merge
    clusters[mergeI].colors.push(...clusters[mergeJ].colors);
    const allColors = clusters[mergeI].colors;
    clusters[mergeI].centroid = {
      L: allColors.reduce((sum, c) => sum + c.lab.L, 0) / allColors.length,
      a: allColors.reduce((sum, c) => sum + c.lab.a, 0) / allColors.length,
      b: allColors.reduce((sum, c) => sum + c.lab.b, 0) / allColors.length,
    };
    clusters.splice(mergeJ, 1);
  }

  // Convert back to output format, sorted by frequency
  const result: ColorCluster[] = clusters
    .map((cluster) => ({
      value: rgbToHex(labToRgb(cluster.centroid)),
      count: cluster.colors.length,
      colors: cluster.colors.map((c) => c.hex),
    }))
    .sort((a, b) => b.count - a.count);

  return result;
}
