/**
 * Example Indexer
 *
 * Creates searchable indexes from UIBlueprints and handles
 * the conversion of successful conversions into StoredExamples.
 */

import { randomUUID } from 'node:crypto';
import type {
  StoredExample,
  ExampleIndex,
  PatternMapping,
  ThemeJsonSnapshot,
  ExampleSource,
  LayoutIntentType,
  ExportOptions,
  AnonymizedExample,
  UIBlueprint,
  ElementType,
} from './types.js';

/**
 * Extract searchable index from a UIBlueprint.
 */
export function createIndex(blueprint: UIBlueprint): ExampleIndex {
  // Extract unique layout intents
  const layoutIntents = new Set<LayoutIntentType>();
  for (const section of blueprint.sections) {
    layoutIntents.add(section.intent.type);
  }

  // Extract unique element types
  const elementTypes = new Set<ElementType>();
  for (const section of blueprint.sections) {
    for (const element of section.elements) {
      elementTypes.add(element.type);
    }
  }

  return {
    layoutIntents: Array.from(layoutIntents),
    elementTypes: Array.from(elementTypes),
    colorCount: blueprint.tokens.colors.length,
    sectionCount: blueprint.sections.length,
  };
}

/**
 * Create a StoredExample from a successful conversion.
 */
export function createStoredExample(options: {
  ir: UIBlueprint;
  themeJson: ThemeJsonSnapshot;
  patterns: PatternMapping[];
  validationScore: number;
  source?: ExampleSource;
  tags?: string[];
}): StoredExample {
  const { ir, themeJson, patterns, validationScore, source = 'local', tags } = options;

  const index = createIndex(ir);
  if (tags) {
    index.tags = tags;
  }

  return {
    id: randomUUID(),
    version: '1.0',
    index,
    ir,
    themeJson,
    patterns,
    validationScore,
    createdAt: new Date().toISOString(),
    source,
  };
}

/**
 * Index a single example for efficient searching.
 * Returns a simplified index entry for catalog storage.
 */
export function indexExample(example: StoredExample): IndexEntry {
  return {
    id: example.id,
    index: example.index,
    validationScore: example.validationScore,
    createdAt: example.createdAt,
    source: example.source,
  };
}

export interface IndexEntry {
  id: string;
  index: ExampleIndex;
  validationScore: number;
  createdAt: string;
  source: ExampleSource;
}

/**
 * Search examples using a pre-built index catalog.
 * More efficient than loading all examples for large collections.
 */
export function searchIndex(
  catalog: IndexEntry[],
  query: {
    layoutIntents?: LayoutIntentType[];
    elementTypes?: ElementType[];
    minValidationScore?: number;
  }
): IndexEntry[] {
  return catalog.filter((entry) => {
    // Check validation score
    if (
      query.minValidationScore &&
      entry.validationScore < query.minValidationScore
    ) {
      return false;
    }

    // Check layout intents (at least one must match if specified)
    if (query.layoutIntents && query.layoutIntents.length > 0) {
      const hasMatch = query.layoutIntents.some((intent) =>
        entry.index.layoutIntents.includes(intent)
      );
      if (!hasMatch) return false;
    }

    // Check element types (at least one must match if specified)
    if (query.elementTypes && query.elementTypes.length > 0) {
      const hasMatch = query.elementTypes.some((elemType) =>
        entry.index.elementTypes.includes(elemType)
      );
      if (!hasMatch) return false;
    }

    return true;
  });
}

/**
 * Anonymize an example for contribution.
 * Removes source URL and any potentially identifying information.
 */
export function anonymizeExample(
  example: StoredExample,
  _options: ExportOptions = { anonymize: true, format: 'json' }
): AnonymizedExample {
  return {
    ...example,
    id: randomUUID(), // New ID for contributed version
    source: 'contributed',
    ir: {
      ...example.ir,
      meta: {
        ...example.ir.meta,
        sourceUrl: '[anonymized]',
      },
    },
  };
}

/**
 * Validate that a StoredExample has all required fields.
 */
export function validateExample(example: unknown): example is StoredExample {
  if (!example || typeof example !== 'object') return false;

  const e = example as Record<string, unknown>;

  return (
    typeof e.id === 'string' &&
    e.version === '1.0' &&
    typeof e.index === 'object' &&
    typeof e.ir === 'object' &&
    typeof e.themeJson === 'object' &&
    Array.isArray(e.patterns) &&
    typeof e.validationScore === 'number' &&
    typeof e.createdAt === 'string' &&
    ['bundled', 'local', 'contributed'].includes(e.source as string)
  );
}
