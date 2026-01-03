/**
 * Local Store
 *
 * Manages the user's local memory at ~/.wp-morph/memory.
 * Stores successful conversions privately on the user's machine.
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { StoredExample } from './types.js';
import { validateExample, indexExample, type IndexEntry } from './indexer.js';

export class LocalStore {
  private basePath: string;
  private examplesPath: string;
  private catalogPath: string;
  private catalog: Map<string, IndexEntry> = new Map();
  private initialized = false;

  constructor(path = '~/.wp-morph/memory') {
    // Expand ~ to home directory
    this.basePath = path.startsWith('~')
      ? join(homedir(), path.slice(1))
      : path;
    this.examplesPath = join(this.basePath, 'examples');
    this.catalogPath = join(this.basePath, 'catalog.json');
  }

  /**
   * Initialize the local store, creating directories if needed.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create directories if they don't exist
    if (!existsSync(this.examplesPath)) {
      await mkdir(this.examplesPath, { recursive: true });
    }

    // Load catalog if it exists
    if (existsSync(this.catalogPath)) {
      try {
        const data = await readFile(this.catalogPath, 'utf-8');
        const entries: IndexEntry[] = JSON.parse(data);
        for (const entry of entries) {
          this.catalog.set(entry.id, entry);
        }
      } catch {
        // Catalog corrupted or invalid, start fresh
        this.catalog.clear();
      }
    }

    this.initialized = true;
  }

  /**
   * Store a new example.
   */
  async store(example: StoredExample): Promise<void> {
    await this.ensureInitialized();

    // Write the example file
    const filePath = this.getExamplePath(example.id);
    await writeFile(filePath, JSON.stringify(example, null, 2), 'utf-8');

    // Update catalog
    this.catalog.set(example.id, indexExample(example));
    await this.saveCatalog();
  }

  /**
   * Get an example by ID.
   */
  async get(id: string): Promise<StoredExample | null> {
    await this.ensureInitialized();

    if (!this.catalog.has(id)) return null;

    const filePath = this.getExamplePath(id);
    if (!existsSync(filePath)) {
      // File missing, remove from catalog
      this.catalog.delete(id);
      await this.saveCatalog();
      return null;
    }

    try {
      const data = await readFile(filePath, 'utf-8');
      const example = JSON.parse(data);
      if (validateExample(example)) {
        return example;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get all stored examples.
   */
  async getAll(): Promise<StoredExample[]> {
    await this.ensureInitialized();

    const examples: StoredExample[] = [];
    for (const id of this.catalog.keys()) {
      const example = await this.get(id);
      if (example) {
        examples.push(example);
      }
    }
    return examples;
  }

  /**
   * Delete an example by ID.
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.catalog.has(id)) return false;

    const filePath = this.getExamplePath(id);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    this.catalog.delete(id);
    await this.saveCatalog();
    return true;
  }

  /**
   * Get the catalog for efficient searching.
   */
  getCatalog(): IndexEntry[] {
    return Array.from(this.catalog.values());
  }

  /**
   * Get count of stored examples.
   */
  count(): number {
    return this.catalog.size;
  }

  /**
   * Clear all stored examples.
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    // Delete all example files
    if (existsSync(this.examplesPath)) {
      const files = await readdir(this.examplesPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await unlink(join(this.examplesPath, file));
        }
      }
    }

    // Clear catalog
    this.catalog.clear();
    await this.saveCatalog();
  }

  /**
   * Rebuild catalog from disk.
   * Useful if the catalog gets out of sync.
   */
  async rebuildCatalog(): Promise<void> {
    await this.ensureInitialized();

    this.catalog.clear();

    if (!existsSync(this.examplesPath)) return;

    const files = await readdir(this.examplesPath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = join(this.examplesPath, file);
      try {
        const data = await readFile(filePath, 'utf-8');
        const example = JSON.parse(data);
        if (validateExample(example)) {
          this.catalog.set(example.id, indexExample(example));
        }
      } catch {
        // Skip invalid files
      }
    }

    await this.saveCatalog();
  }

  private getExamplePath(id: string): string {
    return join(this.examplesPath, `${id}.json`);
  }

  private async saveCatalog(): Promise<void> {
    const entries = Array.from(this.catalog.values());
    await writeFile(this.catalogPath, JSON.stringify(entries, null, 2), 'utf-8');
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
