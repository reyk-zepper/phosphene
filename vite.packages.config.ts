import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/packages/index.ts'),
        parser: path.resolve(__dirname, 'src/packages/parser.ts'),
        graph: path.resolve(__dirname, 'src/packages/graph.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    outDir: 'dist-packages',
    rollupOptions: {
      external: [],
      output: {
        preserveModules: false,
      },
    },
    sourcemap: false,
  },
});
