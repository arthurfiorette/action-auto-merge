import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts'
    }
  },
  output: {
    target: 'node',
    distPath: {
      root: './dist'
    }
  },
  lib: [
    {
      format: 'cjs',
      dts: false,
      bundle: true
    }
  ]
});
