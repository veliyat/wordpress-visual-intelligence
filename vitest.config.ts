import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const root = process.cwd();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/index.ts',
        'packages/*/src/__tests__/**',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 75,
        lines: 70,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@wp-morph/core': resolve(root, 'packages/core/src/index.ts'),
      '@wp-morph/perception': resolve(root, 'packages/perception/src/index.ts'),
      '@wp-morph/intelligence': resolve(root, 'packages/intelligence/src/index.ts'),
      '@wp-morph/validation': resolve(root, 'packages/validation/src/index.ts'),
      '@wp-morph/wp-generator': resolve(root, 'packages/wp-generator/src/index.ts'),
      '@wp-morph/bedrock-wrapper': resolve(root, 'packages/bedrock-wrapper/src/index.ts'),
      '@wp-morph/memory': resolve(root, 'packages/memory/src/index.ts'),
      '@wp-morph/cli': resolve(root, 'packages/cli/src/index.ts'),
    },
  },
});
