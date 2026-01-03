/**
 * Bundled Examples Loader
 *
 * Loads curated examples that ship with the package.
 * These examples are versioned with npm releases and
 * provide baseline knowledge for the system.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StoredExample } from './types.js';
import { validateExample } from './indexer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to bundled examples (relative to dist/)
const BUNDLED_PATH = join(__dirname, '..', 'data', 'examples');

/**
 * Load all bundled examples from the data directory.
 */
export async function loadBundledExamples(): Promise<StoredExample[]> {
  const examples: StoredExample[] = [];

  // Load the index file which lists all available examples
  const indexPath = join(BUNDLED_PATH, 'index.json');
  if (!existsSync(indexPath)) {
    // No bundled examples yet
    return examples;
  }

  try {
    const indexData = await readFile(indexPath, 'utf-8');
    const index: BundledIndex = JSON.parse(indexData);

    // Load each example file
    for (const entry of index.examples) {
      const examplePath = join(BUNDLED_PATH, entry.file);
      if (!existsSync(examplePath)) continue;

      try {
        const data = await readFile(examplePath, 'utf-8');
        const example = JSON.parse(data);
        if (validateExample(example)) {
          examples.push(example);
        }
      } catch {
        // Skip invalid example files
      }
    }
  } catch {
    // Index file missing or invalid
  }

  return examples;
}

/**
 * Get metadata about bundled examples without loading them all.
 */
export async function getBundledIndex(): Promise<BundledIndex | null> {
  const indexPath = join(BUNDLED_PATH, 'index.json');
  if (!existsSync(indexPath)) {
    return null;
  }

  try {
    const data = await readFile(indexPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export interface BundledIndex {
  version: string;
  updatedAt: string;
  examples: BundledIndexEntry[];
}

export interface BundledIndexEntry {
  id: string;
  file: string;
  description: string;
  layoutIntents: string[];
  validationScore: number;
}
