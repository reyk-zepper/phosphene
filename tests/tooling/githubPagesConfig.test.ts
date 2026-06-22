import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/pages.yml');
const viteConfigPath = resolve(process.cwd(), 'vite.config.ts');
const appIndexPath = resolve(process.cwd(), 'index.html');
const landingIndexPath = resolve(process.cwd(), 'landing/index.html');
const faviconPath = resolve(process.cwd(), 'public/favicon.svg');

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('GitHub Pages deployment configuration', () => {
  it('builds the Vite app with the project-site base path and deploys dist as a Pages artifact', () => {
    const workflow = read(workflowPath);
    const viteConfig = read(viteConfigPath);
    const appIndex = read(appIndexPath);
    const landingIndex = read(landingIndexPath);

    expect(viteConfig).toContain("base: process.env.VITE_BASE_PATH ?? '/'");
    expect(appIndex).toContain('href="%BASE_URL%favicon.svg"');
    expect(landingIndex).toContain('href="%BASE_URL%favicon.svg"');
    expect(statSync(faviconPath).isFile()).toBe(true);

    expect(workflow).toContain('name: Deploy Phosphene to GitHub Pages');
    expect(workflow).toContain('VITE_BASE_PATH: /phosphene/');
    expect(workflow).toContain('package-manager-cache: false');
    expect(workflow).not.toContain('cache: pnpm');
    expect(workflow).toContain('pnpm install --frozen-lockfile');
    expect(workflow).toContain('pnpm build');
    expect(workflow).toContain('actions/configure-pages@v5');
    expect(workflow).toContain('actions/upload-pages-artifact@v4');
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain('path: dist');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
  });
});
