/**
 * Browser Management Tests
 *
 * Unit tests for Playwright browser management utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock playwright with inline definitions to avoid hoisting issues
vi.mock('playwright', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
    evaluate: vi.fn().mockResolvedValue({ width: 1440, height: 3000 }),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockBrowser = {
    isConnected: vi.fn().mockReturnValue(true),
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    chromium: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
    __mockPage: mockPage,
    __mockBrowser: mockBrowser,
  };
});

import { getBrowser, closeBrowser, createPage, navigateAndWait, DEFAULT_VIEWPORT, DEFAULT_TIMEOUT } from '../browser';

// Get references to the mocks
const getMocks = async () => {
  const playwright = await import('playwright');
  return {
    chromium: playwright.chromium as { launch: ReturnType<typeof vi.fn> },
    mockBrowser: (playwright as unknown as { __mockBrowser: {
      isConnected: ReturnType<typeof vi.fn>;
      newPage: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    }; }).__mockBrowser,
    mockPage: (playwright as unknown as { __mockPage: {
      goto: ReturnType<typeof vi.fn>;
      waitForSelector: ReturnType<typeof vi.fn>;
      screenshot: ReturnType<typeof vi.fn>;
      evaluate: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    }; }).__mockPage,
  };
};

describe('Browser Management', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { mockBrowser, mockPage } = await getMocks();
    mockBrowser.isConnected.mockReturnValue(true);
    mockBrowser.newPage.mockResolvedValue(mockPage);
  });

  afterEach(async () => {
    // Reset browser state
    await closeBrowser();
  });

  describe('Constants', () => {
    it('should have default viewport of 1440x900', () => {
      expect(DEFAULT_VIEWPORT).toEqual({ width: 1440, height: 900 });
    });

    it('should have default timeout of 30000ms', () => {
      expect(DEFAULT_TIMEOUT).toBe(30000);
    });
  });

  describe('getBrowser', () => {
    it('should launch browser on first call', async () => {
      const { chromium } = await getMocks();

      const browser = await getBrowser();

      expect(chromium.launch).toHaveBeenCalledWith({
        headless: true,
        args: [
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
      });
      expect(browser).toBeDefined();
    });

    it('should reuse browser on subsequent calls', async () => {
      const { chromium } = await getMocks();

      const browser1 = await getBrowser();
      const browser2 = await getBrowser();

      // Should only launch once
      expect(chromium.launch).toHaveBeenCalledTimes(1);
      expect(browser1).toBe(browser2);
    });

    it('should relaunch browser if disconnected', async () => {
      const { chromium, mockBrowser } = await getMocks();

      await getBrowser();
      mockBrowser.isConnected.mockReturnValue(false);
      await getBrowser();

      // Should launch twice (initial + after disconnect)
      expect(chromium.launch).toHaveBeenCalledTimes(2);
    });
  });

  describe('closeBrowser', () => {
    it('should close browser if open', async () => {
      const { mockBrowser } = await getMocks();

      await getBrowser();
      await closeBrowser();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle closing when no browser is open', async () => {
      // Should not throw
      await expect(closeBrowser()).resolves.toBeUndefined();
    });
  });

  describe('createPage', () => {
    it('should create page with default viewport', async () => {
      const { mockBrowser } = await getMocks();

      const page = await createPage();

      expect(mockBrowser.newPage).toHaveBeenCalledWith({
        viewport: DEFAULT_VIEWPORT,
      });
      expect(page).toBeDefined();
    });

    it('should create page with custom viewport', async () => {
      const { mockBrowser } = await getMocks();
      const customViewport = { width: 1920, height: 1080 };

      await createPage(customViewport);

      expect(mockBrowser.newPage).toHaveBeenCalledWith({
        viewport: customViewport,
      });
    });
  });

  describe('navigateAndWait', () => {
    it('should navigate to URL with networkidle', async () => {
      const { mockPage } = await getMocks();
      const page = await createPage();

      await navigateAndWait(page, 'https://example.com');

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'networkidle',
        timeout: DEFAULT_TIMEOUT,
      });
    });

    it('should wait for selector if provided', async () => {
      const { mockPage } = await getMocks();
      const page = await createPage();

      await navigateAndWait(page, 'https://example.com', {
        waitForSelector: '#main-content',
      });

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('#main-content', {
        timeout: DEFAULT_TIMEOUT,
      });
    });

    it('should use custom timeout', async () => {
      const { mockPage } = await getMocks();
      const page = await createPage();

      await navigateAndWait(page, 'https://example.com', {
        timeout: 5000,
      });

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'networkidle',
        timeout: 5000,
      });
    });

    it('should throw error for invalid URL', async () => {
      const page = await createPage();

      await expect(navigateAndWait(page, 'not-a-valid-url')).rejects.toThrow('Invalid URL');
    });

    it('should accept valid URLs', async () => {
      const page = await createPage();

      await expect(navigateAndWait(page, 'https://example.com')).resolves.toBeUndefined();
      await expect(navigateAndWait(page, 'http://localhost:3000')).resolves.toBeUndefined();
    });
  });
});

describe('Browser Singleton Pattern', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await closeBrowser();
    const { mockBrowser, mockPage } = await getMocks();
    mockBrowser.isConnected.mockReturnValue(true);
    mockBrowser.newPage.mockResolvedValue(mockPage);
  });

  it('should maintain single browser instance across multiple page creations', async () => {
    const { chromium, mockBrowser } = await getMocks();

    await createPage();
    await createPage();
    await createPage();

    // Only one browser launch
    expect(chromium.launch).toHaveBeenCalledTimes(1);

    // Multiple pages created
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(3);
  });
});
