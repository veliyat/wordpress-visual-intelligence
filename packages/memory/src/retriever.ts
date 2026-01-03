/**
 * Example Retriever
 *
 * Retrieves relevant examples from bundled and local memory
 * based on layout intents, element types, and other criteria.
 */

import type {
  StoredExample,
  ExampleQuery,
  RetrievalResult,
  MemoryConfig,
  LayoutIntentType,
  UIBlueprint,
  ElementType,
} from './types.js';
import { DEFAULT_MEMORY_CONFIG } from './types.js';
import { LocalStore } from './local-store.js';
import { loadBundledExamples } from './bundled.js';

export class ExampleRetriever {
  private config: Required<MemoryConfig>;
  private localStore: LocalStore;
  private bundledExamples: StoredExample[] = [];
  private initialized = false;

  constructor(config: MemoryConfig = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
    this.localStore = new LocalStore(this.config.localPath);
  }

  /**
   * Initialize the retriever by loading bundled and local examples.
   * Must be called before search operations.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.includeBundled) {
      this.bundledExamples = await loadBundledExamples();
    }

    if (this.config.includeLocal) {
      await this.localStore.initialize();
    }

    this.initialized = true;
  }

  /**
   * Search for relevant examples based on query criteria.
   */
  async search(query: ExampleQuery): Promise<RetrievalResult[]> {
    await this.ensureInitialized();

    const results: RetrievalResult[] = [];
    const limit = query.limit ?? 5;
    const sources = query.sources ?? ['local', 'bundled'];

    // Search local first (user's own patterns take priority)
    if (sources.includes('local') && this.config.includeLocal) {
      const localExamples = await this.localStore.getAll();
      for (const example of localExamples) {
        const result = this.scoreExample(example, query);
        if (result) results.push(result);
      }
    }

    // Then search bundled
    if (sources.includes('bundled') && this.config.includeBundled) {
      for (const example of this.bundledExamples) {
        const result = this.scoreExample(example, query);
        if (result) results.push(result);
      }
    }

    // Sort by relevance (highest first)
    results.sort((a, b) => b.relevance - a.relevance);

    return results.slice(0, limit);
  }

  /**
   * Find similar examples based on a partial or complete UIBlueprint.
   * Extracts query features automatically from the blueprint.
   */
  async findSimilar(
    blueprint: Partial<UIBlueprint>,
    limit = 5
  ): Promise<RetrievalResult[]> {
    const query = this.blueprintToQuery(blueprint);
    query.limit = limit;
    return this.search(query);
  }

  /**
   * Get a specific example by ID.
   */
  async getById(id: string): Promise<StoredExample | null> {
    await this.ensureInitialized();

    // Check local first
    const localExample = await this.localStore.get(id);
    if (localExample) return localExample;

    // Check bundled
    return this.bundledExamples.find((e) => e.id === id) ?? null;
  }

  /**
   * Convert a UIBlueprint to a query for finding similar examples.
   */
  private blueprintToQuery(blueprint: Partial<UIBlueprint>): ExampleQuery {
    const query: ExampleQuery = {};

    if (blueprint.sections) {
      // Extract layout intents
      query.layoutIntents = blueprint.sections.map((s) => s.intent.type);

      // Extract element types
      const elementTypes = new Set<ElementType>();
      for (const section of blueprint.sections) {
        for (const element of section.elements) {
          elementTypes.add(element.type);
        }
      }
      query.elementTypes = Array.from(elementTypes);

      // Section count range (allow some flexibility)
      const count = blueprint.sections.length;
      query.sectionCount = {
        min: Math.max(1, count - 2),
        max: count + 2,
      };
    }

    return query;
  }

  /**
   * Score an example against query criteria.
   * Returns null if the example doesn't meet minimum requirements.
   */
  private scoreExample(
    example: StoredExample,
    query: ExampleQuery
  ): RetrievalResult | null {
    // Check minimum validation score
    if (
      query.minValidationScore &&
      example.validationScore < query.minValidationScore
    ) {
      return null;
    }

    // Check section count range
    if (query.sectionCount) {
      const count = example.index.sectionCount;
      if (query.sectionCount.min && count < query.sectionCount.min) return null;
      if (query.sectionCount.max && count > query.sectionCount.max) return null;
    }

    // Calculate intent match score (most important)
    const matchedIntents: LayoutIntentType[] = [];
    if (query.layoutIntents && query.layoutIntents.length > 0) {
      for (const intent of query.layoutIntents) {
        if (example.index.layoutIntents.includes(intent)) {
          matchedIntents.push(intent);
        }
      }
    }

    // Calculate element type match score
    const matchedElements: ElementType[] = [];
    if (query.elementTypes && query.elementTypes.length > 0) {
      for (const elemType of query.elementTypes) {
        if (example.index.elementTypes.includes(elemType)) {
          matchedElements.push(elemType);
        }
      }
    }

    // Compute overall relevance score
    let relevance = 0;

    // Intent match contributes 50%
    if (query.layoutIntents && query.layoutIntents.length > 0) {
      relevance += 0.5 * (matchedIntents.length / query.layoutIntents.length);
    } else {
      relevance += 0.25; // No intent filter = neutral score
    }

    // Element match contributes 30%
    if (query.elementTypes && query.elementTypes.length > 0) {
      relevance += 0.3 * (matchedElements.length / query.elementTypes.length);
    } else {
      relevance += 0.15; // No element filter = neutral score
    }

    // Validation score contributes 20%
    relevance += 0.2 * example.validationScore;

    // Require at least some match if filters were specified
    if (query.layoutIntents?.length && matchedIntents.length === 0) {
      return null;
    }

    return {
      example,
      relevance,
      matchedIntents,
      matchedElements,
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

/**
 * Factory function for creating a configured retriever.
 */
export function createRetriever(config?: MemoryConfig): ExampleRetriever {
  return new ExampleRetriever(config);
}
