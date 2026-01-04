# Perception Layer Specification

## Overview

The perception layer is the entry point to the wp-morph pipeline. It captures visual data from websites and detects section boundaries, providing the raw material for design intent extraction.

```
┌─────────────────────────────────────────────────────────────────┐
│                      PERCEPTION                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Playwright │  │  Screenshot │  │  Boundary Detection     │  │
│  │  Browser    │──│  Capture    │──│  (AI + Edge Snap)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
              Intelligence Layer
```

## Responsibilities

1. **Browser Management**: Launch and manage headless Playwright browser
2. **Screenshot Capture**: Capture full-page and section-level screenshots
3. **Boundary Detection**: Identify where visual sections begin and end
4. **Image Data**: Provide pixel data for downstream analysis

## Key Principle

> **We analyze screenshots, not HTML/CSS.**
>
> This is a visual-first system. The perception layer sees the page exactly as a user would - as rendered pixels. It does not parse DOM structure, extract CSS values, or inspect source code.

---

## Boundary Detection Approach

### AI + Code Hybrid

Boundary detection uses a two-stage approach that mirrors the color/spacing normalization pattern used elsewhere in wp-morph:

| Stage | Owner | Purpose |
|-------|-------|---------|
| **1. Semantic Detection** | AI | Identify approximate section boundaries with semantic understanding |
| **2. Edge Snapping** | Code | Refine to precise pixel coordinates using visual analysis |

```
Screenshot → AI Vision → Approximate Boundaries → Edge Snap → Final Boundaries
              (fuzzy)      [y: 580, conf: 0.85]    (precise)   [y: 576]
```

### Why This Split?

**AI handles ambiguity:**
- "Is this a hero section or a navigation bar?"
- "Does this card grid belong with the section above or below?"
- "Is this a visual break or just a design element?"

**Code handles precision:**
- AI might report y=580 ± 20px
- Code snaps to the actual visual edge at y=576
- Deterministic, testable, no API cost

### The Core Principle

> **Edge snapping should correct AI, not contradict it.**
> If the signal isn't strong, keep the AI boundary.

This keeps the system stable and predictable.

---

## Edge Snapping Algorithm

### Sliding Window Band Comparison

The algorithm treats edge snapping as a **local optimization problem**, not global detection.

#### How It Works

For each AI-provided boundary at `approxY`:

1. **Determine search radius** based on AI confidence:
   - High confidence (≥ 0.7): ±25px
   - Medium confidence (0.4-0.7): ±50px
   - Low confidence (< 0.4): ±75px or skip snapping

2. **Score each candidate Y** in the search window:
   ```
   for y in (approxY - radius → approxY + radius):
     bandAbove = rows[y - bandSize ... y - 1]
     bandBelow = rows[y ... y + bandSize - 1]

     colorDelta = deltaE(avgColor(bandAbove), avgColor(bandBelow))
     varianceDelta = abs(variance(bandAbove) - variance(bandBelow))

     score = colorWeight * colorDelta + varianceWeight * varianceDelta
   ```

3. **Select best boundary**:
   - If max score ≥ threshold: snap to that Y
   - If max score < threshold: keep AI's `approxY` (fallback)

#### Constants

| Constant | Value | Rationale |
|----------|-------|-----------|
| `BAND_SIZE` | 6 rows | Enough context to smooth noise, small enough to be precise |
| `COLOR_WEIGHT` | 0.7 | Color changes are the primary signal |
| `VARIANCE_WEIGHT` | 0.3 | Variance helps detect content→whitespace transitions |
| `MIN_SCORE_THRESHOLD` | 5.0 | Delta-E units; below this, trust AI |

#### Why This Algorithm?

| Property | Benefit |
|----------|---------|
| **Bands, not rows** | Robust to text, images, and noise |
| **Dual signals** | Color catches background changes; variance catches content transitions |
| **Confidence-aware** | Tight window for confident AI, wider for uncertain |
| **Local optimization** | Only searches near AI estimate, never contradicts wildly |
| **Fallback behavior** | Weak signals preserve AI judgment |

#### What It Handles Well

- Background color changes between sections
- Content-to-whitespace transitions
- Subtle visual separators
- Gradient backgrounds (variance signal helps)

#### What It Explicitly Avoids

- Global section detection (that's AI's job)
- Heavy CV dependencies (no Sobel, Canny, etc.)
- Fighting with AI estimates
- Over-fitting to noise

---

## API Specification

### Types

```typescript
interface Screenshot {
  buffer: Buffer;           // Raw PNG/JPEG data
  width: number;            // Viewport width (pixels)
  height: number;           // Full page height (pixels)
  format: 'png' | 'jpeg';
}

interface SectionScreenshot extends Screenshot {
  boundingBox: BoundingBox;
  sectionIndex: number;     // 0-based, top to bottom
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisualBoundary {
  top: number;              // Y where section starts
  bottom: number;           // Y where section ends
  confidence: number;       // 0-1, from AI analysis
}

interface CaptureOptions {
  viewport?: { width: number; height: number };  // Default: 1440x900
  fullPage?: boolean;                            // Default: true
  waitForSelector?: string;                      // Wait for element
  timeout?: number;                              // Default: 30000ms
}
```

### Functions

```typescript
// Capture full-page screenshot
async function captureFullPage(
  url: string,
  options?: CaptureOptions
): Promise<Screenshot>

// Detect visual section boundaries
async function detectVisualBoundaries(
  screenshot: Screenshot
): Promise<VisualBoundary[]>

// Capture individual section screenshots
async function captureSections(
  url: string,
  options?: CaptureOptions
): Promise<SectionScreenshot[]>
```

### Usage Example

```typescript
import { captureFullPage, detectVisualBoundaries } from '@wp-morph/perception';

// Capture the page
const screenshot = await captureFullPage('https://example.com', {
  viewport: { width: 1440, height: 900 },
  waitForSelector: '#main-content',
});

// Detect sections
const boundaries = await detectVisualBoundaries(screenshot);

console.log(boundaries);
// [
//   { top: 0, bottom: 80, confidence: 0.95 },      // Navigation
//   { top: 80, bottom: 680, confidence: 0.92 },    // Hero
//   { top: 680, bottom: 1280, confidence: 0.88 },  // Features
//   { top: 1280, bottom: 1600, confidence: 0.90 }, // Footer
// ]
```

---

## Integration with Other Packages

### Upstream: None
Perception is the entry point.

### Downstream: Intelligence

```
Perception                    Intelligence
───────────                   ─────────────
Screenshot         ────────►  analyzeVisual()
VisualBoundary[]   ────────►  buildUIBlueprint()
```

The intelligence layer uses:
- Full screenshot for color/typography extraction
- Section boundaries for layout intent detection
- Individual section screenshots for detailed analysis

### Shared: Core

```
Core (packages/core)
────────────────────
├── ai/adapter.ts      ← Used by perception for boundary detection
├── utils/color.ts     ← Delta-E used by edge-snap algorithm
└── types/             ← Shared type definitions
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| Invalid URL | Validate before browser launch, throw `InvalidURLError` |
| Network timeout | Configurable timeout, throw `TimeoutError` |
| Page load failure | Retry once, then throw `PageLoadError` |
| AI API failure | Throw `AIServiceError` with provider details |
| No boundaries detected | Return single boundary spanning full height |

---

## Browser Management

### Singleton Pattern

A single browser instance is reused across captures for performance:

```typescript
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
```

### Why Singleton?

- Browser launch is expensive (~1-2 seconds)
- Pages are cheap to create
- Memory is bounded (one browser, multiple pages)

---

## Testing Strategy

### Unit Tests
- Edge-snap algorithm with synthetic pixel data
- Band averaging and variance calculation
- Score computation and boundary selection

### Integration Tests
- Mock AI adapter, verify snap behavior
- Test confidence-based radius adjustment
- Test fallback when no clear edge

### E2E Tests (Optional, Slow)
- Capture real URLs
- Golden-file screenshot comparisons
- Full boundary detection pipeline

---

## Future Considerations

These are **not** in scope for v1, but the design accommodates them:

1. **Multiple viewports**: Mobile/tablet screenshots for responsive analysis
2. **Scroll capture**: Handling infinite scroll or lazy-loaded content
3. **Animation handling**: Waiting for animations to complete
4. **Authentication**: Capturing pages behind login
5. **Parallel capture**: Multiple pages simultaneously

---

## Summary

The perception layer provides:

1. **Screenshot capture** via Playwright (headless, configurable viewport)
2. **Boundary detection** using AI for semantic understanding + code for precision
3. **Edge snapping** via sliding-window band comparison with Delta-E + variance
4. **Clean API** that feeds into the intelligence layer

Key design principles:
- Visual-first (analyze pixels, not DOM)
- AI for ambiguity, code for precision
- Edge snapping corrects AI, never contradicts it
- Fallback to AI when signal is weak
