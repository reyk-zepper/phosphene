import { defineConfig, devices } from '@playwright/test';

const basePathSegment = (process.env.VITE_BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '');
const normalizedBasePath = basePathSegment.length > 0 ? `/${basePathSegment}/` : '/';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:4173${normalizedBasePath}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
