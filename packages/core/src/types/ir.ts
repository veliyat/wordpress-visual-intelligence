/**
 * Intermediate Representation (IR) Schema
 * Version 1.0
 *
 * The IR captures design intent in a semantic, tokenized format
 * that maps directly to WordPress blocks.
 */

// =============================================================================
// Root Types
// =============================================================================

export interface UIBlueprint {
  version: '1.0';
  meta: PageMeta;
  tokens: DesignTokens;
  sections: Section[];
}

export interface PageMeta {
  sourceUrl: string;
  capturedAt: string; // ISO 8601
  viewport: {
    width: number;
    height: number;
  };
  title?: string;
}

// =============================================================================
// Design Tokens
// =============================================================================

export interface DesignTokens {
  colors: ColorToken[];
  spacing: SpacingScale;
  typography: TypographyScale;
}

// Colors
export interface ColorToken {
  name: string;
  value: string; // Hex value
  role: ColorRole;
  usage: ColorUsage[];
}

export type ColorRole =
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

export interface ColorUsage {
  sectionId: string;
  property: 'background' | 'text' | 'border' | 'accent';
}

// Spacing
export interface SpacingScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export type SpacingRef = keyof SpacingScale;

// Typography
export interface TypographyScale {
  fontFamilies: FontFamily[];
  sizes: TypeSizeScale;
  weights: TypeWeightScale;
}

export interface FontFamily {
  name: string;
  stack: string;
  role: 'heading' | 'body' | 'mono';
}

export interface TypeSizeScale {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export type TypeSizeRef = keyof TypeSizeScale;

export interface TypeWeightScale {
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
}

export type TypeWeightRef = keyof TypeWeightScale;

// =============================================================================
// Sections
// =============================================================================

export interface Section {
  id: string;
  intent: LayoutIntent;
  boundingBox: BoundingBox;
  background: BackgroundStyle;
  padding: SpacingRef;
  elements: Element[];
}

export type LayoutIntent =
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

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BackgroundStyle {
  type: 'color' | 'gradient' | 'image' | 'none';
  colorToken?: string;
  gradient?: GradientDef;
  imageUrl?: string;
}

export interface GradientDef {
  type: 'linear' | 'radial';
  angle?: number;
  stops: GradientStop[];
}

export interface GradientStop {
  colorToken: string;
  position: number; // 0-100
}

// =============================================================================
// Elements
// =============================================================================

export interface Element {
  id: string;
  type: ElementType;
  content: ElementContent;
  style: ElementStyle;
  boundingBox: BoundingBox;
}

export type ElementType =
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

export interface ElementContent {
  text?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  src?: string;
  alt?: string;
  href?: string;
  items?: string[];
}

export interface ElementStyle {
  colorToken?: string;
  backgroundToken?: string;
  fontSize?: TypeSizeRef;
  fontWeight?: TypeWeightRef;
  fontFamily?: 'heading' | 'body' | 'mono';
  alignment?: 'left' | 'center' | 'right';
  margin?: SpacingRef;
  padding?: SpacingRef;
}

// =============================================================================
// Validation & Correction
// =============================================================================

export interface CorrectionSignal {
  sectionId: string;
  elementId?: string;
  issue: CorrectionIssue;
  severity: 'low' | 'medium' | 'high';
  delta: string;
  confidence: number; // 0-1
  suggestion?: string;
}

export type CorrectionIssue =
  | 'vertical-spacing'
  | 'horizontal-spacing'
  | 'color-mismatch'
  | 'typography-size'
  | 'typography-weight'
  | 'layout-alignment'
  | 'missing-element'
  | 'extra-element'
  | 'bounding-box';

export interface ValidationResult {
  similarity: number; // 0-1, target >= 0.92
  pixelDiff: number;
  ssim: number;
  corrections: CorrectionSignal[];
}
