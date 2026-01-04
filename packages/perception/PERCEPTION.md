# Perception Package

Visual capture and section detection for wp-morph.

## Overview

The perception package handles:
- Launch headless browser via Playwright
- Capture full-page screenshots (with chunked capture for reliability)
- Detect visual section boundaries (via AI)
- Preprocess images for analysis

## Architecture

### Capture Strategy

We use **chunked (tiled) capture** as the primary strategy for reliability:

```
┌─────────────────────────────────────────────────────────┐
│                    captureFullPage()                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. Check layout: isLayoutBroken(page, viewport)       │
│                                                         │
│   2a. If broken (scrollWidth > viewport × 3):          │
│       → Use captureChunked() immediately                │
│                                                         │
│   2b. If normal:                                        │
│       → Try captureNativeFullPage()                     │
│       → If fails, fallback to captureChunked()          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Why Chunked Capture?

Some websites have broken CSS causing massive horizontal overflow:

```
Example: ompreefinancial.com
- Reported scrollWidth: 1,001,319px (over 1 million!)
- Actual visible content: 1440×4518px
```

When Playwright requests `fullPage: true`, Chromium tries to allocate a surface for the entire layout (1M × 4.5K pixels), hits tile memory limits, and crashes.

**No timeout, no flag, no CSS injection can fix this** - the layout is already computed.

The solution: **Don't ask Chromium to render an insane canvas.**

### Chunked Capture Algorithm

```typescript
1. Pre-scroll page (triggers lazy loading)
   for (y = 0; y < totalHeight; y += viewportHeight) {
     scrollTo(0, y)
     wait(100ms)
   }

2. Capture viewport-sized tiles
   for (y = 0; y < totalHeight; y += viewportHeight) {
     scrollTo(0, y)
     capture(clip: { x:0, y:0, width:viewport, height:tile })
   }

3. Stitch tiles using sharp
   sharp.create(width, totalHeight)
     .composite(tiles)
     .toBuffer()
```

This should produce a true full-page image identical to what a human sees when scrolling.

### Known Issues: Chunked Capture

**Status: Needs Refinement**

The chunked capture implementation has the following issues that need to be addressed:

1. **Incomplete scrolling**: The page is not being fully scrolled in some cases, resulting in missing content at the bottom
2. **Broken stitching**: The tiles are not being stitched correctly, causing visual artifacts or misaligned sections
3. **Scroll position mismatch**: The clip coordinates may not align properly with the scroll position

**Current workaround**: For pages with normal layout, the native `fullPage: true` capture works correctly. The chunked capture is only triggered for pages with broken CSS (scrollWidth > viewport × 3).

**TODO**:
- Debug tile capture coordinates
- Verify scroll position before each tile capture
- Add overlap between tiles to prevent seam artifacts
- Test with more edge cases (sticky headers, fixed elements, etc.)

### When Automated Capture Fails

Automated capture may fail due to:

**Broken/Problematic Sites:**
- **Horizontal overflow**: CSS bugs causing massive scrollWidth (1M+ pixels)
- **Infinite scroll**: Page keeps loading content endlessly
- **Heavy JavaScript/SPA**: Content requires JS execution to render
- **Lazy loading issues**: Images/content fail to trigger loading
- **Persistent loaders**: Animations that never complete
- **Sticky/fixed headers**: Elements that overlap content during scroll capture
- **Iframes**: Cross-origin content that can't be captured
- **Canvas/WebGL**: Dynamically rendered content
- **Cookie banners/modals**: Overlays blocking the view

**Access Restrictions:**
- **Bot detection**: Cloudflare, reCAPTCHA, hCaptcha challenges
- **Authentication**: Login-protected or paywalled content
- **Headless detection**: Sites that block automated browsers
- **Geo-blocking**: Region-restricted content

**Solution: User-provided screenshots**

The simplest and most reliable fallback is to have the user provide their own screenshot:

1. User opens the site in their browser
2. User dismisses any popups/banners
3. User takes a full-page screenshot (browser extensions or dev tools)
4. User provides the screenshot file to wp-morph

This approach:
- **Works for all broken sites**: User's browser renders correctly
- **Bypasses all restrictions**: User is already authenticated
- **Handles edge cases**: User can dismiss modals, wait for loaders
- **Guarantees accuracy**: User verifies the screenshot looks correct

This aligns with wp-morph's core philosophy: **we analyze screenshots, not HTML/CSS**. The source of the screenshot doesn't matter - what matters is that it accurately represents the visual design.

```bash
# Future support (not yet implemented)
npx tsx test-manual.ts ./user-screenshot.png
```

## API

### captureFullPage

```typescript
import { captureFullPage } from '@wp-morph/perception';

const screenshot = await captureFullPage('https://example.com', {
  viewport: { width: 1440, height: 900 },  // Default
  fullPage: true,                           // Default
  timeout: 30000,                           // Default
  waitUntil: 'networkidle',                 // 'load' | 'domcontentloaded' | 'networkidle'
  waitForSelector: '#main-content',         // Optional
});

console.log(`${screenshot.width}×${screenshot.height}px`);
```

### captureSections

```typescript
import { captureSections } from '@wp-morph/perception';

// Requires ANTHROPIC_API_KEY or OPENAI_API_KEY
const sections = await captureSections('https://example.com');

sections.forEach((section, i) => {
  console.log(`Section ${i}: ${section.width}×${section.height}px`);
  console.log(`  Position: y=${section.boundingBox.y}`);
});
```

### detectVisualBoundaries

```typescript
import { captureFullPage, detectVisualBoundaries } from '@wp-morph/perception';

const screenshot = await captureFullPage(url);
const boundaries = await detectVisualBoundaries(screenshot);

boundaries.forEach((b, i) => {
  console.log(`Section ${i}: y=${b.top}-${b.bottom}, confidence=${b.confidence}`);
});
```

### closeBrowser

```typescript
import { closeBrowser } from '@wp-morph/perception';

// Clean up when done
await closeBrowser();
```

## Configuration

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | AI boundary detection (Claude) |
| `OPENAI_API_KEY` | AI boundary detection (GPT-4V) |

### CaptureOptions

```typescript
interface CaptureOptions {
  viewport?: { width: number; height: number };  // Default: 1440×900
  fullPage?: boolean;                            // Default: true
  waitForSelector?: string;                      // Wait for element
  timeout?: number;                              // Default: 30000ms
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}
```

## Manual Testing

```bash
cd packages/perception

# Basic test
npx tsx test-manual.ts https://example.com

# With AI boundary detection
ANTHROPIC_API_KEY=your-key npx tsx test-manual.ts https://example.com
```

Output is saved to `output/<domain>/`:
```
output/
├── example.com/
│   ├── full-page.png
│   └── section-1.png (if AI key provided)
└── another-site.com/
    └── full-page.png
```

## Test Results

| Site | Layout | Dimensions | Size | Method |
|------|--------|-----------|------|--------|
| amystarfinancials.com | Normal | 1440×3621px | 1.4MB | Native |
| ompreefinancial.com | Broken* | 1440×4518px | 3.5MB | Chunked |
| fightrons.com | Normal | 1440×900px | 723KB | Native |

*Broken = scrollWidth > viewport × 3 (CSS horizontal overflow bug)

## File Structure

```
packages/perception/
├── src/
│   ├── index.ts          # Public exports
│   ├── types.ts          # Type definitions
│   ├── browser.ts        # Browser singleton management
│   ├── capture.ts        # Screenshot capture (native + chunked)
│   ├── boundaries.ts     # AI-powered boundary detection
│   ├── edge-snap.ts      # Edge snapping algorithm
│   └── __tests__/        # Unit tests
├── test-manual.ts        # Manual testing script
├── PERCEPTION.md         # This file
└── package.json
```

## Dependencies

- `playwright` - Browser automation
- `sharp` - Image processing (stitching tiles)
- `@wp-morph/core` - AI adapter for boundary detection
