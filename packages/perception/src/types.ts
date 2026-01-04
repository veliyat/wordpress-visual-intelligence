/**
 * Perception Package Types
 *
 * Type definitions for screenshot capture and boundary detection.
 */

/**
 * A captured screenshot
 */
export interface Screenshot {
  /** Raw image data (PNG or JPEG) */
  buffer: Buffer;
  /** Viewport width in pixels */
  width: number;
  /** Full page height in pixels */
  height: number;
  /** Image format */
  format: 'png' | 'jpeg';
}

/**
 * A screenshot of a specific section
 */
export interface SectionScreenshot extends Screenshot {
  /** Position and size of this section on the page */
  boundingBox: BoundingBox;
  /** Section index (0-based, top to bottom) */
  sectionIndex: number;
}

/**
 * Bounding box coordinates
 */
export interface BoundingBox {
  /** X position (pixels from left) */
  x: number;
  /** Y position (pixels from top) */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * A detected visual boundary between sections
 */
export interface VisualBoundary {
  /** Y coordinate where section starts */
  top: number;
  /** Y coordinate where section ends */
  bottom: number;
  /** Confidence score (0-1) from AI analysis */
  confidence: number;
  /** Optional description of the section type */
  description?: string;
}

/**
 * Options for screenshot capture
 */
export interface CaptureOptions {
  /** Viewport dimensions (default: 1440x900) */
  viewport?: {
    width: number;
    height: number;
  };
  /** Capture full scrollable page (default: true) */
  fullPage?: boolean;
  /** Wait for this selector before capture */
  waitForSelector?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** When to consider navigation complete (default: 'networkidle') */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  /** Additional delay after page load in ms (default: 0) */
  delay?: number;
  /** Wait for all images to load (default: true) */
  waitForImages?: boolean;
}

/**
 * Approximate boundary from AI analysis (before edge snapping)
 */
export interface ApproximateBoundary {
  /** Approximate Y where section starts */
  approxTop: number;
  /** Approximate Y where section ends */
  approxBottom: number;
  /** AI confidence (0-1) */
  confidence: number;
  /** Section description from AI */
  description?: string;
}

/**
 * Result of edge snapping
 */
export interface EdgeSnapResult {
  /** Snapped Y coordinate */
  y: number;
  /** Score of this boundary (higher = stronger edge) */
  score: number;
  /** Whether snapping was applied (false = kept original) */
  snapped: boolean;
}

/**
 * Pixel data for a row of the image
 */
export interface RowPixelData {
  /** Average RGB color of the row */
  avgColor: { r: number; g: number; b: number };
  /** Color variance in the row (higher = more varied content) */
  variance: number;
}
