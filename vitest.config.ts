import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/index.ts'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@wp-morph/core': './packages/core/src/index.ts',
      '@wp-morph/perception': './packages/perception/src/index.ts',
      '@wp-morph/intelligence': './packages/intelligence/src/index.ts',
      '@wp-morph/validation': './packages/validation/src/index.ts',
      '@wp-morph/wp-generator': './packages/wp-generator/src/index.ts',
      '@wp-morph/bedrock-wrapper': './packages/bedrock-wrapper/src/index.ts',
      '@wp-morph/memory': './packages/memory/src/index.ts',
      '@wp-morph/cli': './packages/cli/src/index.ts',
    },
  },
});
