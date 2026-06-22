import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(process.cwd(), 'src/app/LandingPage.tsx');
const mainPath = resolve(process.cwd(), 'src/app/main.tsx');
const landingIndexPath = resolve(process.cwd(), 'landing/index.html');
const viteConfigPath = resolve(process.cwd(), 'vite.config.ts');
const assetRoot = resolve(process.cwd(), 'public/landing/assets');

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('phosphene.dev landing page', () => {
  it('routes /landing/ to a branded launch page with product media, app CTA, GitHub CTA, and telemetry boundary copy', () => {
    const component = read(componentPath);
    const main = read(mainPath);
    const landingIndex = read(landingIndexPath);
    const viteConfig = read(viteConfigPath);

    expect(main).toContain('getAppRoute(window.location.pathname, import.meta.env.BASE_URL)');
    expect(main).toContain('<LandingPage />');

    expect(landingIndex).toContain('<title>Phosphene - See how AI thinks</title>');
    expect(landingIndex).toContain('Client-only AI reasoning visualizer');
    expect(landingIndex).toContain('src="/src/app/main.tsx"');

    expect(viteConfig).toContain('rollupOptions');
    expect(viteConfig).toContain('landing/index.html');

    expect(component).toContain('<h1>Phosphene</h1>');
    expect(component).toContain('See how AI thinks.');
    expect(component).toContain("withBasePath('/', import.meta.env.BASE_URL)");
    expect(component).toContain('Open the app');
    expect(component).toContain('href="https://github.com/reyk-zepper/phosphene"');
    expect(component).toContain('View on GitHub');
    expect(component).toContain('Client-only reasoning and redacted AI-node trace explorer');
    expect(component).toContain('No raw live telemetry claim');
    expect(component).toContain('No private payload capture');
    expect(component).toContain('/landing/assets/phosphene-reasoning-lab-v0.1.42.png');
    expect(component).toContain('/landing/assets/phosphene-demo-v0.1.42.gif');

    for (const fileName of [
      'phosphene-reasoning-lab-v0.1.42.png',
      'phosphene-demo-v0.1.42.gif',
    ]) {
      const stats = statSync(resolve(assetRoot, fileName));
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(100_000);
    }
  });
});
