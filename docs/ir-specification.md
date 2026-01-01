# Intermediate Representation (IR) Specification

Version: 1.0

## Overview

The Intermediate Representation (UIBlueprint) is the core artifact of WordPress Visual Intelligence. It captures design intent in a format that is:

- **Semantic**: Describes what things are, not how they're implemented
- **Tokenized**: Uses design tokens, never raw values
- **Stable**: Works regardless of source technology (HTML, React, Vue, etc.)
- **Mappable**: Directly translates to WordPress blocks

## Design Principles

### 1. Intent Over Implementation

```
BAD:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }
GOOD: { type: 'grid', columns: 3, gap: 'lg' }
```

The IR captures that this is a 3-column grid with large gaps, not the CSS used to achieve it.

### 2. Tokens Are Mandatory

```
BAD:  { color: '#3b82f6' }
GOOD: { colorToken: 'primary' }
```

All values must reference tokens defined in `DesignTokens`. No raw hex colors, pixel values, or font names.

### 3. Sections Are First-Class

Every page is decomposed into sections. Each section:
- Has a unique ID for validation targeting
- Declares its layout intent
- Contains elements
- Has measurable bounding box

### 4. Minimal But Complete

Include only what's needed for WordPress generation:
- No CSS properties that don't map to Gutenberg
- No JavaScript behavior
- No animation or interaction data

## Complete Schema

### Root: UIBlueprint

```typescript
interface UIBlueprint {
  version: '1.0';
  meta: PageMeta;
  tokens: DesignTokens;
  sections: Section[];
}
```

### PageMeta

```typescript
interface PageMeta {
  sourceUrl: string;         // Original URL analyzed
  capturedAt: string;        // ISO 8601 timestamp
  viewport: {
    width: number;           // Viewport width (px)
    height: number;          // Document height (px)
  };
  title?: string;            // Page title if detected
}
```

### DesignTokens

```typescript
interface DesignTokens {
  colors: ColorToken[];
  spacing: SpacingScale;
  typography: TypographyScale;
}
```

#### ColorToken

```typescript
interface ColorToken {
  name: string;              // Semantic name: 'primary', 'surface', etc.
  value: string;             // Hex value: '#3b82f6'
  role: ColorRole;           // Semantic role
  usage: ColorUsage[];       // Where this color is used
}

type ColorRole =
  | 'primary'        // Main brand color
  | 'secondary'      // Secondary brand color
  | 'accent'         // Accent/highlight color
  | 'surface'        // Card/container backgrounds
  | 'background'     // Page background
  | 'text'           // Primary text
  | 'text-muted'     // Secondary/muted text
  | 'border'         // Border color
  | 'error'          // Error states
  | 'success';       // Success states

interface ColorUsage {
  sectionId: string;
  property: 'background' | 'text' | 'border' | 'accent';
}
```

#### SpacingScale

```typescript
interface SpacingScale {
  xs: string;    // Extra small (e.g., '4px')
  sm: string;    // Small (e.g., '8px')
  md: string;    // Medium (e.g., '16px')
  lg: string;    // Large (e.g., '24px')
  xl: string;    // Extra large (e.g., '32px')
  xxl: string;   // 2x Extra large (e.g., '48px')
}
```

Spacing must follow base-4 or base-8 progression.

#### TypographyScale

```typescript
interface TypographyScale {
  fontFamilies: FontFamily[];
  sizes: TypeSizeScale;
  weights: TypeWeightScale;
}

interface FontFamily {
  name: string;                              // Display name
  stack: string;                             // CSS font-family value
  role: 'heading' | 'body' | 'mono';         // Usage role
}

interface TypeSizeScale {
  xs: string;      // ~12px
  sm: string;      // ~14px
  base: string;    // ~16px (body default)
  lg: string;      // ~18px
  xl: string;      // ~24px
  '2xl': string;   // ~30px
  '3xl': string;   // ~36px
  '4xl': string;   // ~48px
}

interface TypeWeightScale {
  normal: number;    // 400
  medium: number;    // 500
  semibold: number;  // 600
  bold: number;      // 700
}
```

### Section

```typescript
interface Section {
  id: string;                  // Unique identifier (e.g., 'hero', 'features-1')
  intent: LayoutIntent;        // What kind of layout this is
  boundingBox: BoundingBox;    // Position and size
  background: BackgroundStyle; // Section background
  padding: SpacingRef;         // Section padding (token reference)
  elements: Element[];         // Content elements
}
```

#### LayoutIntent

```typescript
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
```

Each intent type maps to a specific WordPress block pattern.

#### BoundingBox

```typescript
interface BoundingBox {
  x: number;       // Left position (px)
  y: number;       // Top position (px)
  width: number;   // Width (px)
  height: number;  // Height (px)
}
```

#### BackgroundStyle

```typescript
interface BackgroundStyle {
  type: 'color' | 'gradient' | 'image' | 'none';
  colorToken?: string;      // Reference to token name
  gradient?: GradientDef;
  imageUrl?: string;
}

interface GradientDef {
  type: 'linear' | 'radial';
  angle?: number;           // Degrees (linear only)
  stops: Array<{
    colorToken: string;     // Token reference
    position: number;       // 0-100
  }>;
}
```

### Element

```typescript
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
  text?: string;                    // Text content
  level?: 1 | 2 | 3 | 4 | 5 | 6;   // Heading level
  src?: string;                     // Image source URL
  alt?: string;                     // Image alt text
  href?: string;                    // Link/button URL
  items?: string[];                 // List items
}

interface ElementStyle {
  colorToken?: string;              // Text/icon color
  backgroundToken?: string;         // Element background
  fontSize?: keyof TypeSizeScale;   // Token reference
  fontWeight?: keyof TypeWeightScale;
  fontFamily?: 'heading' | 'body' | 'mono';
  alignment?: 'left' | 'center' | 'right';
  margin?: SpacingRef;
  padding?: SpacingRef;
}
```

### Helper Types

```typescript
// Reference to spacing token
type SpacingRef = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
```

## Example IR Document

```json
{
  "version": "1.0",
  "meta": {
    "sourceUrl": "https://example.com",
    "capturedAt": "2026-01-01T12:00:00Z",
    "viewport": { "width": 1440, "height": 3200 },
    "title": "Example Company"
  },
  "tokens": {
    "colors": [
      { "name": "primary", "value": "#3b82f6", "role": "primary", "usage": [{"sectionId": "hero", "property": "accent"}] },
      { "name": "surface", "value": "#ffffff", "role": "surface", "usage": [{"sectionId": "hero", "property": "background"}] },
      { "name": "text", "value": "#1f2937", "role": "text", "usage": [{"sectionId": "hero", "property": "text"}] }
    ],
    "spacing": {
      "xs": "4px",
      "sm": "8px",
      "md": "16px",
      "lg": "24px",
      "xl": "32px",
      "xxl": "48px"
    },
    "typography": {
      "fontFamilies": [
        { "name": "Inter", "stack": "Inter, system-ui, sans-serif", "role": "body" },
        { "name": "Inter", "stack": "Inter, system-ui, sans-serif", "role": "heading" }
      ],
      "sizes": {
        "xs": "12px",
        "sm": "14px",
        "base": "16px",
        "lg": "18px",
        "xl": "24px",
        "2xl": "30px",
        "3xl": "36px",
        "4xl": "48px"
      },
      "weights": {
        "normal": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700
      }
    }
  },
  "sections": [
    {
      "id": "hero",
      "intent": { "type": "hero", "alignment": "center" },
      "boundingBox": { "x": 0, "y": 0, "width": 1440, "height": 600 },
      "background": { "type": "color", "colorToken": "surface" },
      "padding": "xl",
      "elements": [
        {
          "id": "hero-heading",
          "type": "heading",
          "content": { "text": "Build Better Products", "level": 1 },
          "style": {
            "colorToken": "text",
            "fontSize": "4xl",
            "fontWeight": "bold",
            "fontFamily": "heading",
            "alignment": "center"
          },
          "boundingBox": { "x": 320, "y": 200, "width": 800, "height": 60 }
        },
        {
          "id": "hero-cta",
          "type": "button",
          "content": { "text": "Get Started", "href": "/signup" },
          "style": {
            "colorToken": "surface",
            "backgroundToken": "primary",
            "fontSize": "lg",
            "fontWeight": "semibold",
            "padding": "md"
          },
          "boundingBox": { "x": 620, "y": 400, "width": 200, "height": 50 }
        }
      ]
    }
  ]
}
```

## Validation Rules

An IR document is valid if:

1. **Version present**: `version` must be `"1.0"`
2. **All colors tokenized**: No hex colors in sections/elements, only token references
3. **All spacing tokenized**: No pixel values in sections/elements, only SpacingRef
4. **Unique IDs**: All section and element IDs must be unique
5. **Valid references**: All token references must point to defined tokens
6. **Complete bounding boxes**: All sections and elements have valid bounding boxes
7. **Valid intents**: All layout intents use valid types

## WordPress Mapping

| IR Concept | WordPress Output |
|------------|------------------|
| `tokens.colors` | `theme.json` color palette |
| `tokens.spacing` | `theme.json` spacing scale |
| `tokens.typography` | `theme.json` typography settings |
| `section` | Block pattern file |
| `intent: hero` | Cover block with content |
| `intent: grid` | Columns block |
| `intent: cards` | Query loop or columns |
| `element: heading` | Heading block |
| `element: paragraph` | Paragraph block |
| `element: button` | Buttons block |
| `element: image` | Image block |
