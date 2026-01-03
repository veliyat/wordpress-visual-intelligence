/**
 * Sample UIBlueprint fixtures for testing
 */

import type {
  UIBlueprint,
  Section,
  Element,
  DesignTokens,
  ColorToken,
  SpacingScale,
  TypographyScale,
  CorrectionSignal,
  ValidationResult,
} from '../../types/ir.js';

// =============================================================================
// Design Tokens Fixtures
// =============================================================================

export const sampleSpacingScale: SpacingScale = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const sampleTypographyScale: TypographyScale = {
  fontFamilies: [
    { name: 'Inter', stack: 'Inter, system-ui, sans-serif', role: 'body' },
    { name: 'Poppins', stack: 'Poppins, sans-serif', role: 'heading' },
    { name: 'Fira Code', stack: 'Fira Code, monospace', role: 'mono' },
  ],
  sizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '24px',
    '2xl': '30px',
    '3xl': '36px',
    '4xl': '48px',
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const sampleColorTokens: ColorToken[] = [
  {
    name: 'primary',
    value: '#3b82f6',
    role: 'primary',
    usage: [{ sectionId: 'hero-1', property: 'accent' }],
  },
  {
    name: 'secondary',
    value: '#64748b',
    role: 'secondary',
    usage: [{ sectionId: 'footer-1', property: 'background' }],
  },
  {
    name: 'surface',
    value: '#ffffff',
    role: 'surface',
    usage: [
      { sectionId: 'hero-1', property: 'background' },
      { sectionId: 'features-1', property: 'background' },
    ],
  },
  {
    name: 'background',
    value: '#f8fafc',
    role: 'background',
    usage: [{ sectionId: 'testimonials-1', property: 'background' }],
  },
  {
    name: 'text',
    value: '#1e293b',
    role: 'text',
    usage: [
      { sectionId: 'hero-1', property: 'text' },
      { sectionId: 'features-1', property: 'text' },
    ],
  },
  {
    name: 'text-muted',
    value: '#64748b',
    role: 'text-muted',
    usage: [{ sectionId: 'hero-1', property: 'text' }],
  },
];

export const sampleDesignTokens: DesignTokens = {
  colors: sampleColorTokens,
  spacing: sampleSpacingScale,
  typography: sampleTypographyScale,
};

// =============================================================================
// Element Fixtures
// =============================================================================

export const sampleHeadingElement: Element = {
  id: 'heading-1',
  type: 'heading',
  content: {
    text: 'Welcome to Our Platform',
    level: 1,
  },
  style: {
    colorToken: 'text',
    fontSize: '4xl',
    fontWeight: 'bold',
    fontFamily: 'heading',
    alignment: 'center',
  },
  boundingBox: { x: 100, y: 200, width: 800, height: 60 },
};

export const sampleParagraphElement: Element = {
  id: 'paragraph-1',
  type: 'paragraph',
  content: {
    text: 'Build amazing websites with our powerful tools and intuitive interface.',
  },
  style: {
    colorToken: 'text-muted',
    fontSize: 'lg',
    fontWeight: 'normal',
    fontFamily: 'body',
    alignment: 'center',
  },
  boundingBox: { x: 150, y: 280, width: 700, height: 40 },
};

export const sampleButtonElement: Element = {
  id: 'button-1',
  type: 'button',
  content: {
    text: 'Get Started',
    href: '/signup',
  },
  style: {
    colorToken: 'surface',
    backgroundToken: 'primary',
    fontSize: 'base',
    fontWeight: 'semibold',
    padding: 'md',
  },
  boundingBox: { x: 400, y: 340, width: 150, height: 48 },
};

export const sampleImageElement: Element = {
  id: 'image-1',
  type: 'image',
  content: {
    src: 'https://example.com/hero-image.jpg',
    alt: 'Hero illustration',
  },
  style: {},
  boundingBox: { x: 50, y: 100, width: 400, height: 300 },
};

export const sampleCardElement: Element = {
  id: 'card-1',
  type: 'card',
  content: {
    text: 'Feature Card',
  },
  style: {
    backgroundToken: 'surface',
    padding: 'lg',
  },
  boundingBox: { x: 100, y: 500, width: 300, height: 200 },
};

// =============================================================================
// Section Fixtures
// =============================================================================

export const sampleHeroSection: Section = {
  id: 'hero-1',
  intent: { type: 'hero', alignment: 'center' },
  boundingBox: { x: 0, y: 0, width: 1200, height: 600 },
  background: { type: 'color', colorToken: 'surface' },
  padding: 'xl',
  elements: [sampleHeadingElement, sampleParagraphElement, sampleButtonElement],
};

export const sampleTwoColumnSection: Section = {
  id: 'features-1',
  intent: { type: 'two-column', ratio: '50-50' },
  boundingBox: { x: 0, y: 600, width: 1200, height: 400 },
  background: { type: 'color', colorToken: 'background' },
  padding: 'lg',
  elements: [
    {
      id: 'feature-heading-1',
      type: 'heading',
      content: { text: 'Feature One', level: 2 },
      style: { colorToken: 'text', fontSize: '2xl', fontWeight: 'semibold' },
      boundingBox: { x: 50, y: 650, width: 500, height: 40 },
    },
    {
      id: 'feature-text-1',
      type: 'paragraph',
      content: { text: 'Description of the first feature.' },
      style: { colorToken: 'text-muted', fontSize: 'base' },
      boundingBox: { x: 50, y: 700, width: 500, height: 60 },
    },
  ],
};

export const sampleGridSection: Section = {
  id: 'cards-1',
  intent: { type: 'grid', columns: 3, gap: 'lg' },
  boundingBox: { x: 0, y: 1000, width: 1200, height: 400 },
  background: { type: 'color', colorToken: 'surface' },
  padding: 'xl',
  elements: [sampleCardElement],
};

export const sampleFooterSection: Section = {
  id: 'footer-1',
  intent: { type: 'footer' },
  boundingBox: { x: 0, y: 1400, width: 1200, height: 200 },
  background: { type: 'color', colorToken: 'secondary' },
  padding: 'lg',
  elements: [
    {
      id: 'footer-text-1',
      type: 'paragraph',
      content: { text: '© 2024 Company. All rights reserved.' },
      style: { colorToken: 'surface', fontSize: 'sm', alignment: 'center' },
      boundingBox: { x: 400, y: 1500, width: 400, height: 24 },
    },
  ],
};

export const sampleNavigationSection: Section = {
  id: 'nav-1',
  intent: { type: 'navigation' },
  boundingBox: { x: 0, y: 0, width: 1200, height: 80 },
  background: { type: 'color', colorToken: 'surface' },
  padding: 'md',
  elements: [
    {
      id: 'nav-link-1',
      type: 'link',
      content: { text: 'Home', href: '/' },
      style: { colorToken: 'text', fontSize: 'base' },
      boundingBox: { x: 100, y: 30, width: 60, height: 20 },
    },
    {
      id: 'nav-link-2',
      type: 'link',
      content: { text: 'About', href: '/about' },
      style: { colorToken: 'text', fontSize: 'base' },
      boundingBox: { x: 180, y: 30, width: 60, height: 20 },
    },
  ],
};

// =============================================================================
// Complete UIBlueprint Fixtures
// =============================================================================

export const sampleUIBlueprint: UIBlueprint = {
  version: '1.0',
  meta: {
    sourceUrl: 'https://example.com',
    capturedAt: '2024-01-15T10:30:00.000Z',
    viewport: { width: 1200, height: 800 },
    title: 'Example Website',
  },
  tokens: sampleDesignTokens,
  sections: [sampleHeroSection, sampleTwoColumnSection, sampleGridSection, sampleFooterSection],
};

export const minimalUIBlueprint: UIBlueprint = {
  version: '1.0',
  meta: {
    sourceUrl: 'https://minimal.example.com',
    capturedAt: '2024-01-15T12:00:00.000Z',
    viewport: { width: 1200, height: 600 },
  },
  tokens: {
    colors: [
      {
        name: 'primary',
        value: '#000000',
        role: 'primary',
        usage: [],
      },
    ],
    spacing: sampleSpacingScale,
    typography: {
      fontFamilies: [{ name: 'System', stack: 'system-ui, sans-serif', role: 'body' }],
      sizes: sampleTypographyScale.sizes,
      weights: sampleTypographyScale.weights,
    },
  },
  sections: [
    {
      id: 'section-1',
      intent: { type: 'single-column' },
      boundingBox: { x: 0, y: 0, width: 1200, height: 400 },
      background: { type: 'none' },
      padding: 'md',
      elements: [],
    },
  ],
};

export const complexUIBlueprint: UIBlueprint = {
  version: '1.0',
  meta: {
    sourceUrl: 'https://complex.example.com',
    capturedAt: '2024-01-15T14:00:00.000Z',
    viewport: { width: 1440, height: 900 },
    title: 'Complex Website',
  },
  tokens: sampleDesignTokens,
  sections: [
    sampleNavigationSection,
    sampleHeroSection,
    sampleTwoColumnSection,
    {
      id: 'testimonials-1',
      intent: { type: 'testimonials' },
      boundingBox: { x: 0, y: 1000, width: 1440, height: 500 },
      background: { type: 'color', colorToken: 'background' },
      padding: 'xxl',
      elements: [
        {
          id: 'testimonial-1',
          type: 'card',
          content: { text: '"Great product!" - Customer' },
          style: { backgroundToken: 'surface', padding: 'lg' },
          boundingBox: { x: 100, y: 1100, width: 400, height: 200 },
        },
      ],
    },
    {
      id: 'cards-section',
      intent: { type: 'cards', columns: 4 },
      boundingBox: { x: 0, y: 1500, width: 1440, height: 400 },
      background: { type: 'color', colorToken: 'surface' },
      padding: 'xl',
      elements: [],
    },
    sampleFooterSection,
  ],
};

// =============================================================================
// Validation Fixtures
// =============================================================================

export const sampleCorrectionSignal: CorrectionSignal = {
  sectionId: 'hero-1',
  elementId: 'heading-1',
  issue: 'vertical-spacing',
  severity: 'medium',
  delta: '+12px',
  confidence: 0.85,
  suggestion: 'Increase top padding from lg to xl',
};

export const sampleCorrectionSignals: CorrectionSignal[] = [
  sampleCorrectionSignal,
  {
    sectionId: 'footer-1',
    issue: 'color-mismatch',
    severity: 'low',
    delta: 'Delta-E: 4.2',
    confidence: 0.72,
    suggestion: 'Adjust text color to #f1f5f9',
  },
  {
    sectionId: 'features-1',
    issue: 'layout-alignment',
    severity: 'high',
    delta: 'Columns misaligned by 8px',
    confidence: 0.91,
  },
];

export const sampleValidationResult: ValidationResult = {
  similarity: 0.89,
  pixelDiff: 0.08,
  ssim: 0.92,
  corrections: sampleCorrectionSignals,
};

export const passingValidationResult: ValidationResult = {
  similarity: 0.95,
  pixelDiff: 0.02,
  ssim: 0.97,
  corrections: [],
};

export const failingValidationResult: ValidationResult = {
  similarity: 0.65,
  pixelDiff: 0.25,
  ssim: 0.72,
  corrections: [
    ...sampleCorrectionSignals,
    {
      sectionId: 'hero-1',
      issue: 'missing-element',
      severity: 'high',
      delta: 'Button element not rendered',
      confidence: 0.98,
    },
  ],
};
