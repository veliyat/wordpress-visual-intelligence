/**
 * Edge Snapping Algorithm
 *
 * Sliding-window band comparison using Delta-E color difference + variance.
 * Refines AI-provided approximate boundaries to precise pixel coordinates.
 */

import sharp from 'sharp';
import { rgbToLab, deltaE } from '@wp-morph/core';
import type { Screenshot, EdgeSnapResult, RowPixelData } from './types';

// Algorithm constants
const BAND_SIZE = 6; // Rows per band
const COLOR_WEIGHT = 0.7;
const VARIANCE_WEIGHT = 0.3;
const MIN_SCORE_THRESHOLD = 5.0; // Delta-E units

// Search radius based on AI confidence
const HIGH_CONFIDENCE_RADIUS = 25;
const MEDIUM_CONFIDENCE_RADIUS = 50;
const LOW_CONFIDENCE_RADIUS = 75;

/**
 * Snap an approximate boundary to the nearest visual edge
 *
 * @param screenshot - The full-page screenshot
 * @param approxY - Approximate Y coordinate from AI
 * @param confidence - AI confidence (0-1)
 * @returns Snapped result with Y coordinate and score
 */
export async function snapToEdge(
  screenshot: Screenshot,
  approxY: number,
  confidence: number
): Promise<EdgeSnapResult> {
  // Determine search radius based on confidence
  const radius = getSearchRadius(confidence);

  // Get pixel data for the search region
  const rowData = await extractRowData(screenshot, approxY, radius + BAND_SIZE);

  // Find the best boundary in the search window
  const result = findBestBoundary(rowData, approxY, radius, screenshot.height);

  return result;
}

/**
 * Get search radius based on AI confidence
 */
function getSearchRadius(confidence: number): number {
  if (confidence >= 0.7) {
    return HIGH_CONFIDENCE_RADIUS;
  } else if (confidence >= 0.4) {
    return MEDIUM_CONFIDENCE_RADIUS;
  } else {
    return LOW_CONFIDENCE_RADIUS;
  }
}

/**
 * Extract row pixel data from screenshot
 */
async function extractRowData(
  screenshot: Screenshot,
  centerY: number,
  extent: number
): Promise<Map<number, RowPixelData>> {
  const startY = Math.max(0, centerY - extent);
  const endY = Math.min(screenshot.height - 1, centerY + extent);

  // Use sharp to get raw pixel data
  const image = sharp(screenshot.buffer);
  const { width, height } = await image.metadata();

  if (!width || !height) {
    throw new Error('Could not read image dimensions');
  }

  // Extract raw RGB pixel data
  const rawData = await image.raw().toBuffer();

  const rowData = new Map<number, RowPixelData>();

  for (let y = startY; y <= endY; y++) {
    const row = extractRow(rawData, y, width);
    rowData.set(y, row);
  }

  return rowData;
}

/**
 * Extract pixel data for a single row
 */
function extractRow(rawData: Buffer, y: number, width: number): RowPixelData {
  const rowStart = y * width * 3; // RGB = 3 bytes per pixel
  let sumR = 0,
    sumG = 0,
    sumB = 0;
  let sumVarR = 0,
    sumVarG = 0,
    sumVarB = 0;

  // First pass: calculate averages
  for (let x = 0; x < width; x++) {
    const offset = rowStart + x * 3;
    sumR += rawData[offset];
    sumG += rawData[offset + 1];
    sumB += rawData[offset + 2];
  }

  const avgR = sumR / width;
  const avgG = sumG / width;
  const avgB = sumB / width;

  // Second pass: calculate variance
  for (let x = 0; x < width; x++) {
    const offset = rowStart + x * 3;
    sumVarR += Math.pow(rawData[offset] - avgR, 2);
    sumVarG += Math.pow(rawData[offset + 1] - avgG, 2);
    sumVarB += Math.pow(rawData[offset + 2] - avgB, 2);
  }

  const variance = (sumVarR + sumVarG + sumVarB) / (width * 3);

  return {
    avgColor: { r: avgR, g: avgG, b: avgB },
    variance,
  };
}

/**
 * Find the best boundary within the search window
 */
function findBestBoundary(
  rowData: Map<number, RowPixelData>,
  approxY: number,
  radius: number,
  imageHeight: number
): EdgeSnapResult {
  const startY = Math.max(BAND_SIZE, approxY - radius);
  const endY = Math.min(imageHeight - BAND_SIZE - 1, approxY + radius);

  let bestY = approxY;
  let bestScore = 0;

  for (let y = startY; y <= endY; y++) {
    const score = scoreBoundary(rowData, y);
    if (score > bestScore) {
      bestScore = score;
      bestY = y;
    }
  }

  // Only snap if score exceeds threshold
  if (bestScore >= MIN_SCORE_THRESHOLD) {
    return {
      y: bestY,
      score: bestScore,
      snapped: true,
    };
  }

  // Fallback: keep AI's estimate
  return {
    y: approxY,
    score: bestScore,
    snapped: false,
  };
}

/**
 * Score a candidate boundary position
 *
 * Compares bands above and below using:
 * - Color difference (Delta-E in LAB space)
 * - Variance difference (content vs whitespace detection)
 */
function scoreBoundary(rowData: Map<number, RowPixelData>, y: number): number {
  // Get band above (y - BAND_SIZE to y - 1)
  const bandAbove = getBandData(rowData, y - BAND_SIZE, y - 1);

  // Get band below (y to y + BAND_SIZE - 1)
  const bandBelow = getBandData(rowData, y, y + BAND_SIZE - 1);

  if (!bandAbove || !bandBelow) {
    return 0;
  }

  // Calculate color difference using Delta-E
  const labAbove = rgbToLab(bandAbove.avgColor);
  const labBelow = rgbToLab(bandBelow.avgColor);
  const colorDelta = deltaE(labAbove, labBelow);

  // Calculate variance difference
  const varianceDelta = Math.abs(bandAbove.variance - bandBelow.variance);

  // Normalize variance delta to similar scale as Delta-E
  // Typical variance is 0-10000, we want it in 0-20 range
  const normalizedVariance = Math.min(varianceDelta / 500, 20);

  // Weighted score
  const score = COLOR_WEIGHT * colorDelta + VARIANCE_WEIGHT * normalizedVariance;

  return score;
}

/**
 * Get aggregated data for a band of rows
 */
function getBandData(
  rowData: Map<number, RowPixelData>,
  startY: number,
  endY: number
): RowPixelData | null {
  let sumR = 0,
    sumG = 0,
    sumB = 0;
  let sumVariance = 0;
  let count = 0;

  for (let y = startY; y <= endY; y++) {
    const row = rowData.get(y);
    if (row) {
      sumR += row.avgColor.r;
      sumG += row.avgColor.g;
      sumB += row.avgColor.b;
      sumVariance += row.variance;
      count++;
    }
  }

  if (count === 0) {
    return null;
  }

  return {
    avgColor: {
      r: sumR / count,
      g: sumG / count,
      b: sumB / count,
    },
    variance: sumVariance / count,
  };
}

/**
 * Snap multiple boundaries at once (more efficient)
 */
export async function snapBoundaries(
  screenshot: Screenshot,
  boundaries: Array<{ approxY: number; confidence: number }>
): Promise<EdgeSnapResult[]> {
  const results: EdgeSnapResult[] = [];

  for (const boundary of boundaries) {
    const result = await snapToEdge(screenshot, boundary.approxY, boundary.confidence);
    results.push(result);
  }

  return results;
}
