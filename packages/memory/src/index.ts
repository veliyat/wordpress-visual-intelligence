/**
 * @wp-morph/memory
 *
 * Knowledge persistence and retrieval for cross-session learning.
 * Stores successful IR → WordPress conversions as few-shot examples
 * that improve generation quality over time.
 */

// Types
export type {
  StoredExample,
  ExampleSource,
  ExampleIndex,
  LayoutIntentType,
  PatternMapping,
  ThemeJsonSnapshot,
  ExampleQuery,
  RetrievalResult,
  MemoryConfig,
  ExportOptions,
  AnonymizedExample,
} from './types.js';

export { DEFAULT_MEMORY_CONFIG } from './types.js';

// Retriever
export { ExampleRetriever, createRetriever } from './retriever.js';

// Indexer
export {
  createIndex,
  createStoredExample,
  indexExample,
  searchIndex,
  anonymizeExample,
  validateExample,
  type IndexEntry,
} from './indexer.js';

// Local Store
export { LocalStore } from './local-store.js';

// Bundled Examples
export {
  loadBundledExamples,
  getBundledIndex,
  type BundledIndex,
  type BundledIndexEntry,
} from './bundled.js';
