# Perception Package - Development Notes

## Overview

The perception package handles visual capture and section detection:
- Launch headless browser via Playwright
- Capture full-page screenshots
- Detect visual section boundaries (via AI)
- Preprocess images for analysis

## Current Status

### Working Features

1. **Basic screenshot capture** - `captureFullPage()` works for normal pages
2. **Viewport-only capture** - `fullPage: false` works reliably
3. **Wait strategies** - Supports `'load'`, `'domcontentloaded'`, `'networkidle'`
4. **Overflow detection** - Detects pages with broken CSS causing horizontal overflow
5. **Boundary detection** - `detectVisualBoundaries()` works with AI API key
6. **Edge snapping** - `snapToEdge()` refines AI boundary estimates

### Test Results

| Site | Dimensions | Status |
|------|-----------|--------|
| amystarfinancials.com | 1440×3621px | ✅ Full page capture works |
| ompreefinancial.com | 1001319×4518px | ⚠️ Has CSS overflow bug, crashes on fullPage |
| fightrons.com | 1440×900px | ✅ Works (single viewport height) |

---

## Known Issue: Large/Broken Page Capture

### Problem Description

Some websites have CSS bugs that cause massive horizontal overflow. Example:

**Site**: `https://ompreefinancial.com/`
- **Reported scrollWidth**: 1,001,319 pixels (over 1 million!)
- **Actual visible content**: ~1440 × 4518 pixels
- **Root cause**: Broken CSS causing horizontal overflow

When Playwright attempts `fullPage: true` on such pages, Chromium crashes:

```
page.screenshot: Target page, context or browser has been closed
WARNING: tile memory limits exceeded, some content may not draw
```

The browser runs out of GPU/tile memory trying to render a canvas that's millions of pixels wide.

### What We've Tried

#### 1. Longer Timeouts
```typescript
await captureFullPage(url, { timeout: 60000 });
```
**Result**: No effect - this is a memory issue, not a timeout issue.

#### 2. GPU Flags in Browser Launch
```typescript
browserInstance = await chromium.launch({
  headless: true,
  args: [
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage',
    '--no-sandbox',
  ],
});
```
**Result**: No effect - the issue is Chromium's tile memory limits, not GPU rendering per se.

#### 3. CSS Injection to Constrain Width
```typescript
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
```
**Result**: CSS is injected, but `fullPage: true` still tries to capture the original dimensions and crashes. The CSS affects rendering but not the reported `scrollWidth`.

#### 4. Clip Option
```typescript
await page.screenshot({
  clip: { x: 0, y: 0, width: 1440, height: 4518 }
});
```
**Result**: `clip` only works within the current viewport bounds. It doesn't scroll - just crops the visible area.

### Current Workaround

The code detects horizontal overflow and throws a descriptive error:
```typescript
const hasHorizontalOverflow = dimensions.width > viewport.width * 1.5;

if (fullPage && hasHorizontalOverflow) {
  // Attempt CSS fix and capture...
  // If it fails, throw error suggesting fullPage: false
}
```

User can then retry with `fullPage: false` to get viewport-only capture.

### Remaining Solutions to Explore

#### Option A: Chunked Capture + Stitching
Capture the page in viewport-sized chunks by scrolling, then stitch together:

```typescript
async function captureFullPageChunked(page, viewport) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const chunks: Buffer[] = [];

  for (let y = 0; y < height; y += viewport.height) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(100); // Wait for render

    const chunk = await page.screenshot({
      fullPage: false,
      clip: { x: 0, y: 0, width: viewport.width, height: Math.min(viewport.height, height - y) }
    });
    chunks.push(chunk);
  }

  // Use sharp or canvas to stitch chunks vertically
  return stitchImages(chunks);
}
```

**Pros**: Works regardless of page width
**Cons**: Requires image processing library (sharp), more complex, potential seam artifacts

#### Option B: Resize Viewport to Full Height
Create page with viewport matching full page height:

```typescript
const height = await page.evaluate(() => document.documentElement.scrollHeight);
await page.setViewportSize({ width: 1440, height });
await page.screenshot({ fullPage: false }); // Now viewport = full page
```

**Pros**: Simple, single capture
**Cons**: Very tall viewports might still hit memory limits

#### Option C: CDP (Chrome DevTools Protocol) Direct
Use lower-level CDP commands for more control:

```typescript
const client = await page.context().newCDPSession(page);
await client.send('Page.captureScreenshot', {
  format: 'png',
  clip: { x: 0, y: 0, width: 1440, height: 4518, scale: 1 },
  captureBeyondViewport: true,
});
```

**Pros**: More control over capture behavior
**Cons**: Playwright abstraction leakage, may have same limits

#### Option D: Firefox/WebKit Backend
Try a different browser engine that might handle large pages differently:

```typescript
import { firefox } from 'playwright';
const browser = await firefox.launch();
```

**Pros**: Different rendering engine, different limits
**Cons**: Behavioral differences, need to test

---

## File Structure

```
packages/perception/
├── src/
│   ├── index.ts          # Public exports
│   ├── types.ts          # Type definitions
│   ├── browser.ts        # Browser singleton management
│   ├── capture.ts        # Screenshot capture functions
│   ├── boundaries.ts     # AI-powered boundary detection
│   ├── edge-snap.ts      # Edge snapping algorithm
│   └── __tests__/        # Unit tests
├── test-manual.ts        # Manual testing script
└── PERCEPTION.md         # This file
```

## Usage

### Basic Capture
```typescript
import { captureFullPage, closeBrowser } from '@wp-morph/perception';

const screenshot = await captureFullPage('https://example.com', {
  timeout: 60000,
  waitUntil: 'load',  // 'load' | 'domcontentloaded' | 'networkidle'
  fullPage: true,     // false for viewport only
});

console.log(`Captured: ${screenshot.width}x${screenshot.height}`);
await closeBrowser();
```

### With Boundary Detection (requires AI API key)
```typescript
import { captureFullPage, detectVisualBoundaries } from '@wp-morph/perception';

const screenshot = await captureFullPage(url);
const boundaries = await detectVisualBoundaries(screenshot);

boundaries.forEach((b, i) => {
  console.log(`Section ${i}: y=${b.top}-${b.bottom}, confidence=${b.confidence}`);
});
```

### Manual Test Script
```bash
# Set API key for boundary detection
export ANTHROPIC_API_KEY=your-key

# Run test
cd packages/perception
npx tsx test-manual.ts https://example.com
```

---

## Configuration

### CaptureOptions
```typescript
interface CaptureOptions {
  viewport?: { width: number; height: number };  // Default: 1440×900
  fullPage?: boolean;                            // Default: true
  waitForSelector?: string;                      // Optional CSS selector to wait for
  timeout?: number;                              // Default: 30000ms
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';  // Default: 'networkidle'
}
```

### Environment Variables
- `ANTHROPIC_API_KEY` - Required for AI boundary detection (Claude)
- `OPENAI_API_KEY` - Alternative for AI boundary detection (GPT-4V)

---

## Next Steps

1. **Implement chunked capture** for pages with horizontal overflow
2. **Add image stitching** using sharp library
3. **Test with more edge cases** (lazy loading, infinite scroll, SPAs)
4. **Performance optimization** for large pages
5. **Add retry logic** for transient failures
