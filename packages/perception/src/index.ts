/**
 * @wp-morph/perception
 *
 * Visual capture and section detection.
 *
 * Responsibilities:
 * - Launch headless browser via Playwright
 * - Capture full-page screenshots
 * - Detect visual section boundaries
 * - Preprocess images for analysis
 */

// Types
export type {
  Screenshot,
  SectionScreenshot,
  BoundingBox,
  VisualBoundary,
  CaptureOptions,
  ApproximateBoundary,
  EdgeSnapResult,
  RowPixelData,
} from './types';

// Screenshot capture
export { captureFullPage, captureSections, captureRegion } from './capture';

// Boundary detection
export { detectVisualBoundaries, detectBoundariesAIOnly } from './boundaries';

// Edge snapping (exposed for testing/advanced use)
export { snapToEdge, snapBoundaries } from './edge-snap';

// Browser management
export { getBrowser, closeBrowser, createPage } from './browser';
