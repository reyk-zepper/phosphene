import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('browser smoke configuration', () => {
  it('keeps a committed Playwright smoke lane wired into CI after the production build', () => {
    const packageJson = readJson(resolve(root, 'package.json'));
    const scripts = packageJson.scripts as Record<string, string>;
    const devDependencies = packageJson.devDependencies as Record<string, string>;
    const workflow = read(resolve(root, '.github/workflows/pages.yml'));
    const config = read(resolve(root, 'playwright.config.ts'));

    expect(scripts['smoke:app']).toBe('playwright test');
    expect(devDependencies).toHaveProperty('@playwright/test');
    expect(statSync(resolve(root, 'tests/browser/appSmoke.spec.ts')).isFile()).toBe(true);
    expect(config).toContain("testDir: './tests/browser'");
    expect(config).toContain('pnpm preview --host 127.0.0.1 --port 4173');
    expect(config).toContain("baseURL: 'http://127.0.0.1:4173'");

    expect(workflow).toContain('name: Install app-smoke browser');
    expect(workflow).toContain('pnpm exec playwright install --with-deps chromium');
    expect(workflow).toContain('name: App smoke');
    expect(workflow).toContain('pnpm smoke:app');
    expect(workflow.indexOf('pnpm build')).toBeLessThan(workflow.indexOf('pnpm smoke:app'));
  });
});
