/**
 * Browser Management
 *
 * Singleton Playwright browser instance for screenshot capture.
 * Reuses a single browser across captures for performance.
 */

import { chromium, type Browser, type Page } from 'playwright';

/** Singleton browser instance */
let browserInstance: Browser | null = null;

/** Default viewport dimensions */
export const DEFAULT_VIEWPORT = {
  width: 1440,
  height: 900,
};

/** Default timeout in milliseconds */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Get or create the browser instance
 *
 * Uses a singleton pattern to reuse the browser across captures.
 * Browser launch is expensive (~1-2s), pages are cheap.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
    });
  }
  return browserInstance;
}

/**
 * Close the browser instance
 *
 * Call this when done with all captures to clean up resources.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Create a new page with standard configuration
 */
export async function createPage(
  viewport: { width: number; height: number } = DEFAULT_VIEWPORT
): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport,
  });
  return page;
}

/**
 * Navigate to URL and wait for page to be ready
 */
export async function navigateAndWait(
  page: Page,
  url: string,
  options: {
    waitForSelector?: string;
    timeout?: number;
  } = {}
): Promise<void> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Navigate to page
  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout,
  });

  // Wait for specific selector if provided
  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout });
  }
}
