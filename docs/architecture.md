# Architecture Specification

## System Overview

WordPress Visual Intelligence transforms rendered web pages into WordPress themes through visual analysis and design intent extraction.

```
┌─────────────────────────────────────────────────────────────────┐
│                         INPUT                                    │
│                    Public Website URL                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PERCEPTION                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Playwright │  │  Screenshot │  │  Section Detection      │  │
│  │  Renderer   │──│  Capture    │──│  (Visual Boundaries)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INTELLIGENCE                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  AI Vision  │  │  Token      │  │  IR Builder             │  │
│  │  Analysis   │──│  Normalizer │──│  (UIBlueprint)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WP-GENERATOR                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  theme.json │  │  Block      │  │  PHP Templates          │  │
│  │  Generator  │  │  Patterns   │  │  Generator              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VALIDATION                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Screenshot │  │  Visual     │  │  Correction Signal      │  │
│  │  Comparator │──│  Metrics    │──│  Generator              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ (Feedback Loop)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       OUTPUT                                     │
│           WordPress Theme (vanilla or Bedrock)                   │
└─────────────────────────────────────────────────────────────────┘
```

## Package Specifications

### packages/core

Shared infrastructure for all packages.

**Responsibilities**:
- Type definitions (IR schema, tokens, validation)
- AI provider adapter (Claude, OpenAI)
- Utility functions (color math, spacing normalization)

**Key Exports**:
```typescript
// Types
export type { UIBlueprint, Section, Element, DesignTokens }
export type { ColorToken, SpacingScale, TypographyScale }
export type { CorrectionSignal, ValidationResult }

// AI Adapter
export { AIAdapter, createAIAdapter }
export type { AIProvider, AIConfig }

// Utilities
export { rgbToLab, deltaE, clusterColors }
export { normalizeSpacing, SPACING_SCALE }
```

**Dependencies**: None (leaf package)

---

### packages/perception

Captures visual data from websites.

**Responsibilities**:
- Launch headless browser via Playwright
- Capture full-page screenshots
- Detect visual section boundaries
- Preprocess images for analysis

**Key Exports**:
```typescript
export { captureFullPage, captureSections }
export { detectVisualBoundaries }
export type { Screenshot, SectionScreenshot, BoundingBox }
```

**Dependencies**: `@playwright/test`, `packages/core`

---

### packages/intelligence

Constructs the Intermediate Representation from visual data.

**Responsibilities**:
- Orchestrate AI vision analysis
- Extract colors, typography, spacing
- Normalize tokens via clustering
- Build final UIBlueprint

**Key Exports**:
```typescript
export { analyzeVisual, buildUIBlueprint }
export { extractColors, extractTypography, extractSpacing }
export { normalizeColorTokens, normalizeSpacingTokens }
```

**Dependencies**: `packages/core`, `packages/perception`

---

### packages/validation

Compares generated output to original and produces correction signals.

**Responsibilities**:
- Screenshot comparison (original vs generated)
- Compute visual metrics (pixel diff, SSIM)
- Generate structured correction signals
- Control iteration loop

**Key Exports**:
```typescript
export { compareScreenshots, computeSSIM }
export { generateCorrectionSignals }
export { runValidationLoop }
export type { ValidationMetrics, CorrectionSignal }
```

**Dependencies**: `packages/core`, `packages/perception`

---

### packages/wp-generator

Generates WordPress theme artifacts from IR.

**Responsibilities**:
- Generate theme.json from design tokens
- Create block patterns from sections
- Generate minimal PHP templates
- Export to filesystem

**Key Exports**:
```typescript
export { generateTheme, generateThemeJson }
export { generatePattern, generateTemplates }
export { exportTheme }
export type { ThemeConfig, ExportOptions }
```

**Dependencies**: `packages/core`

---

### packages/bedrock-wrapper

Wraps vanilla theme for Bedrock compatibility.

**Responsibilities**:
- Create Bedrock directory structure
- Generate composer.json
- Generate .env.example

**Key Exports**:
```typescript
export { wrapForBedrock }
export type { BedrockConfig }
```

**Dependencies**: `packages/core`, `packages/wp-generator`

---

### packages/cli

Command-line interface.

**Responsibilities**:
- Parse arguments and options
- Orchestrate full pipeline
- Progress reporting
- Error handling

**Key Commands**:
```bash
wp-visual generate <url> [options]
wp-visual validate <original-url> <generated-path>
wp-visual export <ir-path> --format <vanilla|bedrock>
```

**Dependencies**: All packages

---

## IR Schema (Complete)

```typescript
// ============================================
// UIBlueprint - The Core IR
// ============================================

interface UIBlueprint {
  version: '1.0';
  meta: PageMeta;
  tokens: DesignTokens;
  sections: Section[];
}

interface PageMeta {
  sourceUrl: string;
  capturedAt: string;          // ISO timestamp
  viewport: Viewport;
  title?: string;
}

interface Viewport {
  width: number;
  height: number;
}

// ============================================
// Design Tokens
// ============================================

interface DesignTokens {
  colors: ColorToken[];
  spacing: SpacingScale;
  typography: TypographyScale;
}

interface ColorToken {
  name: string;                 // e.g., 'primary', 'surface', 'text'
  value: string;                // Hex value
  role: ColorRole;
  usage: ColorUsage[];          // Where this color appears
}

type ColorRole =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'surface'
  | 'background'
  | 'text'
  | 'text-muted'
  | 'border'
  | 'error'
  | 'success';

interface ColorUsage {
  sectionId: string;
  property: 'background' | 'text' | 'border' | 'accent';
}

interface SpacingScale {
  xs: string;                   // e.g., '4px'
  sm: string;                   // e.g., '8px'
  md: string;                   // e.g., '16px'
  lg: string;                   // e.g., '24px'
  xl: string;                   // e.g., '32px'
  xxl: string;                  // e.g., '48px'
}

interface TypographyScale {
  fontFamilies: FontFamily[];
  sizes: TypeSizeScale;
  weights: TypeWeightScale;
}

interface FontFamily {
  name: string;
  stack: string;                // Full CSS font-family
  role: 'heading' | 'body' | 'mono';
}

interface TypeSizeScale {
  xs: string;                   // e.g., '12px'
  sm: string;                   // e.g., '14px'
  base: string;                 // e.g., '16px'
  lg: string;                   // e.g., '18px'
  xl: string;                   // e.g., '24px'
  '2xl': string;                // e.g., '30px'
  '3xl': string;                // e.g., '36px'
  '4xl': string;                // e.g., '48px'
}

interface TypeWeightScale {
  normal: number;               // e.g., 400
  medium: number;               // e.g., 500
  semibold: number;             // e.g., 600
  bold: number;                 // e.g., 700
}

// ============================================
// Sections & Elements
// ============================================

interface Section {
  id: string;                   // Unique identifier
  intent: LayoutIntent;
  boundingBox: BoundingBox;
  background: BackgroundStyle;
  padding: SpacingRef;
  elements: Element[];
}

type LayoutIntent =
  | { type: 'hero'; alignment: 'left' | 'center' | 'right' }
  | { type: 'single-column' }
  | { type: 'two-column'; ratio: '50-50' | '33-67' | '67-33' }
  | { type: 'three-column' }
  | { type: 'grid'; columns: number; gap: SpacingRef }
  | { type: 'cards'; columns: number }
  | { type: 'feature-list' }
  | { type: 'testimonials' }
  | { type: 'footer' }
  | { type: 'navigation' }
  | { type: 'custom'; description: string };

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BackgroundStyle {
  type: 'color' | 'gradient' | 'image' | 'none';
  colorToken?: string;          // Reference to ColorToken.name
  gradient?: GradientDef;
  imageUrl?: string;
}

interface GradientDef {
  type: 'linear' | 'radial';
  angle?: number;
  stops: Array<{ colorToken: string; position: number }>;
}

// Reference to spacing scale
type SpacingRef = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface Element {
  id: string;
  type: ElementType;
  content: ElementContent;
  style: ElementStyle;
  boundingBox: BoundingBox;
}

type ElementType =
  | 'heading'
  | 'paragraph'
  | 'button'
  | 'image'
  | 'icon'
  | 'link'
  | 'list'
  | 'card'
  | 'divider'
  | 'spacer'
  | 'custom';

interface ElementContent {
  text?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;  // For headings
  src?: string;                   // For images
  alt?: string;
  href?: string;                  // For links/buttons
  items?: string[];               // For lists
}

interface ElementStyle {
  colorToken?: string;
  backgroundToken?: string;
  fontSize?: keyof TypeSizeScale;
  fontWeight?: keyof TypeWeightScale;
  fontFamily?: 'heading' | 'body' | 'mono';
  alignment?: 'left' | 'center' | 'right';
  margin?: SpacingRef;
  padding?: SpacingRef;
}

// ============================================
// Validation Types
// ============================================

interface ValidationResult {
  similarity: number;           // 0-1, target >= 0.92
  metrics: ValidationMetrics;
  corrections: CorrectionSignal[];
  iteration: number;
  converged: boolean;
}

interface ValidationMetrics {
  pixelDiff: number;            // Percentage of different pixels
  ssim: number;                 // Structural similarity index
  sectionScores: SectionScore[];
}

interface SectionScore {
  sectionId: string;
  similarity: number;
  boundingBoxDelta: BoundingBoxDelta;
}

interface BoundingBoxDelta {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CorrectionSignal {
  sectionId: string;
  issue: CorrectionIssue;
  delta: string;
  confidence: number;
  suggestion?: string;
}

type CorrectionIssue =
  | 'vertical-spacing'
  | 'horizontal-spacing'
  | 'color-mismatch'
  | 'typography-size'
  | 'typography-weight'
  | 'layout-alignment'
  | 'layout-gap'
  | 'missing-element'
  | 'extra-element';
```

---

## Token Normalization Algorithms

### Color Normalization

```
Input: Array of raw colors extracted from page

1. Convert each color to CIELAB color space
2. Cluster colors using k-means (k = 5-8)
3. For each cluster:
   a. Compute centroid
   b. If any two clusters have Delta-E < 2.0, merge them
4. Assign semantic roles based on usage:
   - Most used on backgrounds → 'surface'
   - Most used on text → 'text'
   - Highest saturation → 'primary'
5. Output: Array of ColorToken with semantic names

Output: 5-8 semantic color tokens
```

### Spacing Normalization

```
Input: Array of raw spacing values (px)

1. Sort values ascending
2. Map each value to nearest base-8 multiple:
   - 4px → xs
   - 8px → sm
   - 16px → md
   - 24px → lg
   - 32px → xl
   - 48px → xxl
3. If value is between stops, round to nearest

Output: SpacingScale object
```

---

## Validation Loop Algorithm

```
Input:
  - originalUrl: string
  - generatedThemePath: string
  - config: { maxIterations: 5, threshold: 0.92 }

1. iteration = 0
2. previousSimilarity = 0

3. LOOP:
   a. Capture screenshot of originalUrl
   b. Start WordPress with generated theme
   c. Capture screenshot of generated site
   d. Compare screenshots:
      - Compute pixel diff
      - Compute SSIM
      - Compute per-section bounding box deltas
   e. similarity = weighted average of metrics

   f. IF similarity >= threshold:
      - RETURN success

   g. IF |similarity - previousSimilarity| < 0.01 AND iteration > 1:
      - RETURN plateau (good enough)

   h. IF iteration >= maxIterations:
      - RETURN max iterations reached

   i. Generate correction signals from metrics
   j. Send signals to AI for targeted fixes
   k. Apply fixes to IR
   l. Regenerate theme from updated IR
   m. previousSimilarity = similarity
   n. iteration++
   o. GOTO 3

Output: ValidationResult
```

---

## WordPress Output Mapping

### IR to theme.json

```typescript
// UIBlueprint.tokens.colors → theme.json.settings.color.palette
{
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary", "color": "#...", "name": "Primary" },
        { "slug": "surface", "color": "#...", "name": "Surface" },
        // ...
      ]
    }
  }
}

// UIBlueprint.tokens.spacing → theme.json.settings.spacing
{
  "settings": {
    "spacing": {
      "spacingSizes": [
        { "slug": "xs", "size": "4px", "name": "Extra Small" },
        // ...
      ]
    }
  }
}

// UIBlueprint.tokens.typography → theme.json.settings.typography
{
  "settings": {
    "typography": {
      "fontFamilies": [...],
      "fontSizes": [...]
    }
  }
}
```

### Section to Block Pattern

```typescript
// Section with intent: { type: 'hero', alignment: 'center' }
// →
<!-- wp:cover {"align":"full"} -->
<div class="wp-block-cover alignfull">
  <!-- wp:heading {"textAlign":"center"} -->
  <h1 class="has-text-align-center">...</h1>
  <!-- /wp:heading -->
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">...</p>
  <!-- /wp:paragraph -->
  <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
  ...
  <!-- /wp:buttons -->
</div>
<!-- /wp:cover -->
```

---

## Error Handling Strategy

| Error Type | Handling |
|------------|----------|
| Network failure | Retry 3x with exponential backoff |
| AI rate limit | Queue with delay, surface to user |
| Invalid URL | Validate upfront, clear error message |
| Screenshot timeout | Increase timeout, retry once |
| Validation plateau | Return best result with warning |
| WordPress startup failure | Clear error, suggest Docker check |
