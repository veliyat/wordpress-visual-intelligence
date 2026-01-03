/**
 * Memory Package Types
 *
 * Schemas for storing, indexing, and retrieving successful
 * IR → WordPress conversions as few-shot examples.
 */

import type {
  UIBlueprint,
  LayoutIntent,
  ElementType,
} from '@wp-morph/core';

// Re-export core types for convenience
export type { UIBlueprint, LayoutIntent, ElementType };

// =============================================================================
// Stored Example
// =============================================================================

export interface StoredExample {
  id: string;
  version: '1.0';

  /** Searchable metadata for retrieval */
  index: ExampleIndex;

  /** The full IR snapshot */
  ir: UIBlueprint;

  /** Generated theme.json content */
  themeJson: ThemeJsonSnapshot;

  /** Section → block pattern mappings */
  patterns: PatternMapping[];

  /** Final validation similarity score (0-1) */
  validationScore: number;

  /** ISO 8601 timestamp */
  createdAt: string;

  /** Where this example came from */
  source: ExampleSource;
}

export type ExampleSource = 'bundled' | 'local' | 'contributed';

export interface ExampleIndex {
  /** Layout intents present in this example */
  layoutIntents: LayoutIntentType[];

  /** Element types present */
  elementTypes: ElementType[];

  /** Number of colors in the palette (typically 5-8) */
  colorCount: number;

  /** Number of sections */
  sectionCount: number;

  /** Optional tags for additional categorization */
  tags?: string[];
}

/** Extract just the type from LayoutIntent union */
export type LayoutIntentType = LayoutIntent['type'];

// =============================================================================
// Pattern Mapping
// =============================================================================

export interface PatternMapping {
  /** Section ID from the IR */
  sectionId: string;

  /** The layout intent for this section */
  intent: LayoutIntent;

  /** The generated WordPress block markup */
  blockMarkup: string;

  /** Optional: the pattern file name if registered */
  patternName?: string;
}

// =============================================================================
// Theme.json Snapshot
// =============================================================================

export interface ThemeJsonSnapshot {
  settings: {
    color?: {
      palette?: Array<{
        slug: string;
        color: string;
        name: string;
      }>;
    };
    spacing?: {
      spacingSizes?: Array<{
        slug: string;
        size: string;
        name: string;
      }>;
    };
    typography?: {
      fontFamilies?: Array<{
        slug: string;
        fontFamily: string;
        name: string;
      }>;
      fontSizes?: Array<{
        slug: string;
        size: string;
        name: string;
      }>;
    };
  };
}

// =============================================================================
// Query Types
// =============================================================================

export interface ExampleQuery {
  /** Filter by layout intents (OR matching) */
  layoutIntents?: LayoutIntentType[];

  /** Filter by element types (OR matching) */
  elementTypes?: ElementType[];

  /** Filter by section count range */
  sectionCount?: {
    min?: number;
    max?: number;
  };

  /** Minimum validation score */
  minValidationScore?: number;

  /** Maximum results to return */
  limit?: number;

  /** Sources to search (default: all) */
  sources?: ExampleSource[];
}

export interface RetrievalResult {
  example: StoredExample;
  relevance: number; // 0-1, higher is better
  matchedIntents: LayoutIntentType[];
  matchedElements: ElementType[];
}

// =============================================================================
// Store Configuration
// =============================================================================

export interface MemoryConfig {
  /** Path to local memory directory (default: ~/.wp-morph/memory) */
  localPath?: string;

  /** Whether to include bundled examples in searches (default: true) */
  includeBundled?: boolean;

  /** Whether to include local examples in searches (default: true) */
  includeLocal?: boolean;

  /** Minimum validation score to auto-store (default: 0.92) */
  autoStoreThreshold?: number;
}

export const DEFAULT_MEMORY_CONFIG: Required<MemoryConfig> = {
  localPath: '~/.wp-morph/memory',
  includeBundled: true,
  includeLocal: true,
  autoStoreThreshold: 0.92,
};

// =============================================================================
// Export Types
// =============================================================================

export interface ExportOptions {
  /** Remove source URL and any identifying info */
  anonymize: boolean;

  /** Output format */
  format: 'json' | 'yaml';
}

export interface AnonymizedExample extends Omit<StoredExample, 'ir'> {
  ir: Omit<UIBlueprint, 'meta'> & {
    meta: Omit<UIBlueprint['meta'], 'sourceUrl'> & {
      sourceUrl: '[anonymized]';
    };
  };
}
