import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(process.cwd(), 'src/app/LandingPage.tsx');
const mainPath = resolve(process.cwd(), 'src/app/main.tsx');
const assetRoot = resolve(process.cwd(), 'public/landing/assets');

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('phosphene.dev landing page', () => {
  it('routes /landing/ to a branded launch page with product media, app CTA, GitHub CTA, and telemetry boundary copy', () => {
    const component = read(componentPath);
    const main = read(mainPath);

    expect(main).toContain("window.location.pathname.startsWith('/landing')");
    expect(main).toContain('<LandingPage />');

    expect(component).toContain('<h1>Phosphene</h1>');
    expect(component).toContain('See how AI thinks.');
    expect(component).toContain('href="/"');
    expect(component).toContain('Open the app');
    expect(component).toContain('href="https://github.com/reyk-zepper/phosphene"');
    expect(component).toContain('View on GitHub');
    expect(component).toContain('Client-only reasoning and redacted AI-node trace explorer');
    expect(component).toContain('No raw live telemetry claim');
    expect(component).toContain('No private payload capture');
    expect(component).toContain('url(/landing/assets/phosphene-reasoning-lab-v0.1.42.png)');
    expect(component).toContain('src="/landing/assets/phosphene-demo-v0.1.42.gif"');

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
