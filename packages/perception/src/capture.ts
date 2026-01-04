/**
 * Screenshot Capture
 *
 * Functions for capturing full-page and section-level screenshots.
 * Uses chunked (tiled) capture as the default strategy for reliability.
 */

import { createPage, navigateAndWait, DEFAULT_VIEWPORT, DEFAULT_TIMEOUT } from './browser';
import type { Screenshot, SectionScreenshot, CaptureOptions } from './types';
import type { Page } from 'playwright';
import sharp from 'sharp';

/** Threshold for detecting broken layout (scrollWidth > viewport * this) */
const LAYOUT_BROKEN_THRESHOLD = 3;

/** Delay between scroll steps to allow content to load */
const SCROLL_DELAY_MS = 100;

/** Default delay after page load (allows loaders/animations to complete) */
const DEFAULT_DELAY_MS = 2000;

/**
 * Wait for all images on the page to load
 * Handles: img elements, picture/source, and lazy-loaded images
 */
async function waitForAllImages(page: Page, timeout: number): Promise<void> {
  await page.evaluate(async (timeoutMs) => {
    // Trigger lazy loading by checking visibility
    const lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    lazyImages.forEach((img) => {
      // Force the image to load by removing lazy attributes
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc && !img.getAttribute('src')) {
        img.setAttribute('src', dataSrc);
      }
    });

    // Get all images including those in picture elements
    const images = Array.from(document.querySelectorAll('img'));

    await Promise.race([
      Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalHeight > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve());
            img.addEventListener('error', () => resolve()); // Don't fail on broken images
            // Also resolve after a short timeout per image
            setTimeout(() => resolve(), 5000);
          });
        })
      ),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }, timeout);
}

/**
 * Check if page has broken layout (excessive horizontal overflow)
 */
async function isLayoutBroken(
  page: Page,
  viewportWidth: number
): Promise<{ broken: boolean; scrollWidth: number; scrollHeight: number }> {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  return {
    broken: dimensions.scrollWidth > viewportWidth * LAYOUT_BROKEN_THRESHOLD,
    scrollWidth: dimensions.scrollWidth,
    scrollHeight: dimensions.scrollHeight,
  };
}

/**
 * Pre-scroll the page to trigger lazy loading
 */
async function preScrollPage(page: Page, viewportHeight: number, timeout: number): Promise<number> {
  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);

  // Scroll through the page in viewport-sized steps
  for (let y = 0; y < totalHeight; y += viewportHeight) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(SCROLL_DELAY_MS);
    // Wait for images that may have lazy-loaded
    await waitForAllImages(page, timeout);
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(SCROLL_DELAY_MS);

  // Re-measure height (may have changed due to lazy loading)
  return await page.evaluate(() => document.documentElement.scrollHeight);
}

/**
 * Capture page using chunked (tiled) approach
 *
 * This is the reliable method that works for any page, regardless of
 * broken CSS or excessive dimensions. Captures viewport-sized tiles
 * and stitches them together.
 */
async function captureChunked(
  page: Page,
  viewport: { width: number; height: number },
  timeout: number = DEFAULT_TIMEOUT
): Promise<Screenshot> {
  // Pre-scroll to load lazy content
  const totalHeight = await preScrollPage(page, viewport.height, timeout);

  // Capture tiles
  const tiles: { buffer: Buffer; y: number; height: number }[] = [];

  for (let y = 0; y < totalHeight; y += viewport.height) {
    // Scroll to position
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(SCROLL_DELAY_MS);

    // Calculate tile height (last tile may be shorter)
    const tileHeight = Math.min(viewport.height, totalHeight - y);

    // Capture this viewport
    const buffer = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: viewport.width,
        height: tileHeight,
      },
    });

    tiles.push({
      buffer: Buffer.from(buffer),
      y,
      height: tileHeight,
    });
  }

  // Stitch tiles together using sharp
  const composite = tiles.map((tile) => ({
    input: tile.buffer,
    top: tile.y,
    left: 0,
  }));

  const stitched = await sharp({
    create: {
      width: viewport.width,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composite)
    .png()
    .toBuffer();

  return {
    buffer: stitched,
    width: viewport.width,
    height: totalHeight,
    format: 'png',
  };
}

/**
 * Capture using native Playwright fullPage option
 *
 * This is faster but may fail on pages with broken layout.
 */
async function captureNativeFullPage(
  page: Page,
  _viewport: { width: number; height: number }
): Promise<Screenshot> {
  const buffer = await page.screenshot({
    fullPage: true,
    type: 'png',
  });

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));

  return {
    buffer: Buffer.from(buffer),
    width: dimensions.width,
    height: dimensions.height,
    format: 'png',
  };
}

/**
 * Capture a full-page screenshot from a URL
 *
 * Uses chunked capture for pages with broken layout, native fullPage
 * for normal pages (with fallback to chunked if native fails).
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
  const delay = options.delay ?? DEFAULT_DELAY_MS;
  const waitForImages = options.waitForImages ?? true;

  const page = await createPage(viewport);

  try {
    await navigateAndWait(page, url, {
      waitForSelector: options.waitForSelector,
      timeout,
      waitUntil,
    });

    // Wait for images to load
    if (waitForImages) {
      await waitForAllImages(page, timeout);
    }

    // Additional delay for animations/loaders to complete
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    // If not capturing full page, just take viewport screenshot
    if (!fullPage) {
      const buffer = await page.screenshot({
        fullPage: false,
        type: 'png',
      });

      return {
        buffer: Buffer.from(buffer),
        width: viewport.width,
        height: viewport.height,
        format: 'png',
      };
    }

    // Check for broken layout
    const layout = await isLayoutBroken(page, viewport.width);

    if (layout.broken) {
      // Layout is broken - use chunked capture (the only reliable method)
      return await captureChunked(page, viewport, timeout);
    }

    // Layout looks normal - try native fullPage (faster)
    try {
      return await captureNativeFullPage(page, viewport);
    } catch {
      // Native failed (memory limits, etc.) - fall back to chunked
      return await captureChunked(page, viewport, timeout);
    }
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
  const delay = options.delay ?? DEFAULT_DELAY_MS;
  const waitForImagesOpt = options.waitForImages ?? true;

  const page = await createPage(viewport);

  try {
    await navigateAndWait(page, url, {
      waitForSelector: options.waitForSelector,
      timeout,
      waitUntil,
    });

    // Wait for images to load
    if (waitForImagesOpt) {
      await waitForAllImages(page, timeout);
    }

    // Additional delay for animations/loaders to complete
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    // First capture full page (using chunked for reliability)
    const layout = await isLayoutBroken(page, viewport.width);
    let fullScreenshot: Screenshot;

    if (layout.broken) {
      fullScreenshot = await captureChunked(page, viewport, timeout);
    } else {
      try {
        fullScreenshot = await captureNativeFullPage(page, viewport);
      } catch {
        fullScreenshot = await captureChunked(page, viewport, timeout);
      }
    }

    // Import boundary detection (dynamic to avoid circular deps)
    const { detectVisualBoundaries } = await import('./boundaries');
    const boundaries = await detectVisualBoundaries(fullScreenshot);

    // Extract sections from the full screenshot using sharp
    const sections: SectionScreenshot[] = [];

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      const height = boundary.bottom - boundary.top;

      // Extract region from full screenshot
      const sectionBuffer = await sharp(fullScreenshot.buffer)
        .extract({
          left: 0,
          top: boundary.top,
          width: viewport.width,
          height,
        })
        .png()
        .toBuffer();

      sections.push({
        buffer: sectionBuffer,
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

    // Scroll to region if needed
    if (region.y > viewport.height) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), region.y);
      await page.waitForTimeout(SCROLL_DELAY_MS);
    }

    const buffer = await page.screenshot({
      type: 'png',
      clip: {
        x: region.x,
        y: region.y % viewport.height, // Adjust for scroll position
        width: region.width,
        height: region.height,
      },
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
