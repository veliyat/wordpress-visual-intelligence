/**
 * Boundary Detection
 *
 * Combines AI-based semantic boundary detection with code-based edge snapping.
 */

import {
  type AIAdapter,
  createAIAdapterFromEnv,
} from '@wp-morph/core';
import { snapToEdge } from './edge-snap';
import type { Screenshot, VisualBoundary, ApproximateBoundary } from './types';

/** AI prompt for boundary detection */
const BOUNDARY_DETECTION_PROMPT = `Analyze this webpage screenshot. Identify distinct visual sections from top to bottom.

For each section, provide:
1. The approximate Y coordinate (in pixels from top) where the section starts
2. The approximate Y coordinate where the section ends
3. A confidence score from 0 to 1 indicating how certain you are about this boundary
4. A brief description of what type of section this is (e.g., "navigation", "hero", "features grid", "footer")

Return your response as a JSON array with this exact format:
[
  {
    "approxTop": 0,
    "approxBottom": 80,
    "confidence": 0.95,
    "description": "navigation bar"
  },
  {
    "approxTop": 80,
    "approxBottom": 600,
    "confidence": 0.9,
    "description": "hero section with headline and CTA"
  }
]

Important:
- Sections should be contiguous (no gaps)
- The first section should start at Y=0
- The last section should end at the bottom of the image
- Look for visual breaks like background color changes, spacing, or dividers
- Be conservative with confidence scores for subtle boundaries`;

/**
 * Detect visual boundaries in a screenshot
 *
 * Uses a two-stage approach:
 * 1. AI identifies semantic section boundaries with approximate coordinates
 * 2. Code snaps boundaries to precise visual edges
 *
 * @param screenshot - Full-page screenshot to analyze
 * @param adapter - Optional AI adapter (creates from env if not provided)
 * @returns Array of visual boundaries, sorted top to bottom
 */
export async function detectVisualBoundaries(
  screenshot: Screenshot,
  adapter?: AIAdapter
): Promise<VisualBoundary[]> {
  // Get or create AI adapter
  const ai = adapter ?? createAIAdapterFromEnv();

  // Stage 1: AI detection
  const approximate = await detectBoundariesWithAI(screenshot, ai);

  // Handle edge case: no boundaries detected
  if (approximate.length === 0) {
    return [
      {
        top: 0,
        bottom: screenshot.height,
        confidence: 1.0,
        description: 'single section',
      },
    ];
  }

  // Stage 2: Edge snapping
  const boundaries = await refineBoundaries(screenshot, approximate);

  return boundaries;
}

/**
 * Detect boundaries using AI vision analysis
 */
async function detectBoundariesWithAI(
  screenshot: Screenshot,
  adapter: AIAdapter
): Promise<ApproximateBoundary[]> {
  const response = await adapter.analyzeImage(screenshot.buffer, BOUNDARY_DETECTION_PROMPT);

  // Parse JSON from response
  const boundaries = parseAIResponse(response.content, screenshot.height);

  return boundaries;
}

/**
 * Parse AI response to extract boundary data
 */
function parseAIResponse(content: string, imageHeight: number): ApproximateBoundary[] {
  try {
    // Extract JSON from response (may be wrapped in markdown code block)
    let jsonStr = content;

    // Handle markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      console.warn('AI response was not an array, returning empty boundaries');
      return [];
    }

    // Validate and normalize boundaries
    const boundaries: ApproximateBoundary[] = [];

    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      const obj = item as Record<string, unknown>;

      const boundary: ApproximateBoundary = {
        approxTop: Math.max(0, Number(obj.approxTop) || 0),
        approxBottom: Math.min(imageHeight, Number(obj.approxBottom) || imageHeight),
        confidence: Math.max(0, Math.min(1, Number(obj.confidence) || 0.5)),
        description: typeof obj.description === 'string' ? obj.description : undefined,
      };

      boundaries.push(boundary);
    }

    // Sort by top position
    boundaries.sort((a, b) => a.approxTop - b.approxTop);

    return boundaries;
  } catch (error) {
    console.warn('Failed to parse AI boundary response:', error);
    return [];
  }
}

/**
 * Refine approximate boundaries using edge snapping
 */
async function refineBoundaries(
  screenshot: Screenshot,
  approximate: ApproximateBoundary[]
): Promise<VisualBoundary[]> {
  const boundaries: VisualBoundary[] = [];

  for (let i = 0; i < approximate.length; i++) {
    const approx = approximate[i];

    // Snap the top boundary (except for first section which starts at 0)
    let top: number;
    if (i === 0) {
      top = 0;
    } else {
      const topResult = await snapToEdge(screenshot, approx.approxTop, approx.confidence);
      top = topResult.y;
    }

    // Snap the bottom boundary (except for last section which ends at image height)
    let bottom: number;
    if (i === approximate.length - 1) {
      bottom = screenshot.height;
    } else {
      const bottomResult = await snapToEdge(screenshot, approx.approxBottom, approx.confidence);
      bottom = bottomResult.y;
    }

    // Ensure boundaries are valid
    if (bottom > top) {
      boundaries.push({
        top,
        bottom,
        confidence: approx.confidence,
        description: approx.description,
      });
    }
  }

  // Ensure boundaries are contiguous (no gaps or overlaps)
  return makeContiguous(boundaries, screenshot.height);
}

/**
 * Ensure boundaries are contiguous (no gaps or overlaps)
 */
function makeContiguous(boundaries: VisualBoundary[], imageHeight: number): VisualBoundary[] {
  if (boundaries.length === 0) {
    return [{ top: 0, bottom: imageHeight, confidence: 1.0 }];
  }

  const result: VisualBoundary[] = [];

  for (let i = 0; i < boundaries.length; i++) {
    const boundary = { ...boundaries[i] };

    // First boundary starts at 0
    if (i === 0) {
      boundary.top = 0;
    } else {
      // Each boundary starts where the previous one ended
      boundary.top = result[result.length - 1].bottom;
    }

    // Last boundary ends at image height
    if (i === boundaries.length - 1) {
      boundary.bottom = imageHeight;
    }

    // Only add if valid
    if (boundary.bottom > boundary.top) {
      result.push(boundary);
    }
  }

  return result;
}

/**
 * Detect boundaries without edge snapping (AI only)
 *
 * Useful for debugging or when edge snapping is not needed.
 */
export async function detectBoundariesAIOnly(
  screenshot: Screenshot,
  adapter?: AIAdapter
): Promise<ApproximateBoundary[]> {
  const ai = adapter ?? createAIAdapterFromEnv();
  return detectBoundariesWithAI(screenshot, ai);
}
