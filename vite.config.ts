import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

type VitestConfig = UserConfig & {
  test: {
    fileParallelism: boolean;
    testTimeout: number;
  };
};

const config = {
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        landing: path.resolve(__dirname, 'landing/index.html'),
      },
      output: {
        manualChunks(id: string) {
          if (!id.includes('/node_modules/')) return undefined;

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }

          if (id.includes('/d3') || id.includes('/dagre/')) {
            return 'vendor-graph';
          }

          if (
            id.includes('/react-markdown/') ||
            id.includes('/remark-gfm/') ||
            id.includes('/shiki/') ||
            id.includes('/unified/') ||
            id.includes('/micromark') ||
            id.includes('/mdast') ||
            id.includes('/hast') ||
            id.includes('/remark') ||
            id.includes('/rehype') ||
            id.includes('/vfile') ||
            id.includes('/unist')
          ) {
            return 'vendor-markdown';
          }

          if (id.includes('/framer-motion/')) {
            return 'vendor-motion';
          }

          if (id.includes('/lucide-react/')) {
            return 'vendor-icons';
          }

          return 'vendor';
        },
      },
    },
  },
  test: {
    fileParallelism: false,
    testTimeout: 60_000,
  },
} satisfies VitestConfig;

export default defineConfig(config);
