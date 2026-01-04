/**
 * Screenshot Capture
 *
 * Functions for capturing full-page and section-level screenshots.
 */

import { createPage, navigateAndWait, DEFAULT_VIEWPORT, DEFAULT_TIMEOUT } from './browser';
import type { Screenshot, SectionScreenshot, CaptureOptions, VisualBoundary } from './types';

/**
 * Capture a full-page screenshot from a URL
 *
 * @example
 * ```typescript
 * const screenshot = await captureFullPage('https://example.com', {
 *   viewport: { width: 1440, height: 900 },
 *   waitForSelector: '#main-content',
 * });
 * ```
 */
export async function captureFullPage(
  url: string,
  options: CaptureOptions = {}
): Promise<Screenshot> {
  const viewport = options.viewport ?? DEFAULT_VIEWPORT;
  const fullPage = options.fullPage ?? true;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const waitUntil = options.waitUntil ?? 'networkidle';

  const page = await createPage(viewport);

  try {
    await navigateAndWait(page, url, {
      waitForSelector: options.waitForSelector,
      timeout,
      waitUntil,
    });

    // Get actual page dimensions
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));

    // Detect horizontal overflow (page wider than viewport)
    const hasHorizontalOverflow = dimensions.width > viewport.width * 1.5;

    let buffer: Buffer;
    let capturedWidth: number;
    let capturedHeight: number;

    if (fullPage && hasHorizontalOverflow) {
      // Page has broken CSS causing horizontal overflow
      // Inject CSS to hide horizontal overflow and constrain width
      await page.addStyleTag({
        content: `
          html, body {
            overflow-x: hidden !important;
            max-width: ${viewport.width}px !important;
            width: ${viewport.width}px !important;
          }
          * {
            max-width: 100% !important;
          }
        `,
      });

      // Wait for reflow
      await page.waitForTimeout(100);

      // Re-measure after CSS fix
      const fixedDimensions = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }));

      // Try fullPage capture, fallback to viewport if it crashes
      try {
        buffer = await page.screenshot({
          fullPage: true,
          type: 'png',
        });
        capturedWidth = fixedDimensions.width;
        capturedHeight = fixedDimensions.height;
      } catch {
        // Browser crashed trying to capture - fall back to viewport only
        // Need to reconnect since the page/browser may have crashed
        throw new Error(
          `Page too large to capture (${dimensions.width}x${dimensions.height}px). ` +
          `Try with fullPage: false`
        );
      }
    } else if (fullPage) {
      // Normal full page capture
      buffer = await page.screenshot({
        fullPage: true,
        type: 'png',
      });
      capturedWidth = dimensions.width;
      capturedHeight = dimensions.height;
    } else {
      // Viewport only
      buffer = await page.screenshot({
        fullPage: false,
        type: 'png',
      });
      capturedWidth = viewport.width;
      capturedHeight = viewport.height;
    }

    return {
      buffer: Buffer.from(buffer),
      width: capturedWidth,
      height: capturedHeight,
      format: 'png',
    };
  } finally {
    await page.close();
  }
}

/**
 * Capture individual section screenshots based on detected boundaries
 *
 * @example
 * ```typescript
 * const sections = await captureSections('https://example.com');
 * // Returns array of section screenshots
 * ```
 */
export async function captureSections(
  url: string,
  options: CaptureOptions = {}
): Promise<SectionScreenshot[]> {
  const viewport = options.viewport ?? DEFAULT_VIEWPORT;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const waitUntil = options.waitUntil ?? 'networkidle';

  const page = await createPage(viewport);

  try {
    await navigateAndWait(page, url, {
      waitForSelector: options.waitForSelector,
      timeout,
      waitUntil,
    });

    // First capture full page to detect boundaries
    const fullBuffer = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    const fullScreenshot: Screenshot = {
      buffer: Buffer.from(fullBuffer),
      width: viewport.width,
      height: await page.evaluate(() => document.documentElement.scrollHeight),
      format: 'png',
    };

    // Import boundary detection (dynamic to avoid circular deps)
    const { detectVisualBoundaries } = await import('./boundaries');
    const boundaries = await detectVisualBoundaries(fullScreenshot);

    // Capture each section
    const sections: SectionScreenshot[] = [];

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      const height = boundary.bottom - boundary.top;

      // Clip the section from the full screenshot
      const sectionBuffer = await page.screenshot({
        fullPage: false,
        type: 'png',
        clip: {
          x: 0,
          y: boundary.top,
          width: viewport.width,
          height,
        },
      });

      sections.push({
        buffer: Buffer.from(sectionBuffer),
        width: viewport.width,
        height,
        format: 'png',
        boundingBox: {
          x: 0,
          y: boundary.top,
          width: viewport.width,
          height,
        },
        sectionIndex: i,
      });
    }

    return sections;
  } finally {
    await page.close();
  }
}

/**
 * Capture a screenshot of a specific region
 */
export async function captureRegion(
  url: string,
  region: { x: number; y: number; width: number; height: number },
  options: CaptureOptions = {}
): Promise<Screenshot> {
  const viewport = options.viewport ?? DEFAULT_VIEWPORT;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const waitUntil = options.waitUntil ?? 'networkidle';

  const page = await createPage(viewport);

  try {
    await navigateAndWait(page, url, {
      waitForSelector: options.waitForSelector,
      timeout,
      waitUntil,
    });

    const buffer = await page.screenshot({
      type: 'png',
      clip: region,
    });

    return {
      buffer: Buffer.from(buffer),
      width: region.width,
      height: region.height,
      format: 'png',
    };
  } finally {
    await page.close();
  }
}
