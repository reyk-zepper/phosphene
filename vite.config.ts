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
  test: {
    fileParallelism: false,
    testTimeout: 60_000,
  },
} satisfies VitestConfig;

export default defineConfig(config);
