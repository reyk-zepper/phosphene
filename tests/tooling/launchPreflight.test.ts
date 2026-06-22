import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { classifyLaunchTarget, summarizeLaunchPreflight } from '../../src/core/launch/preflight';

const phospheneHtml = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta name="description" content="See how AI thinks. Open-source AI reasoning visualizer." />
    <title>Phosphene - See how AI thinks</title>
    <script type="module" crossorigin src="/phosphene/assets/main-demo.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`;

const wrongHtml = `<!doctype html>
<html lang="en">
  <head><title>Geiss-web - Phase 0 spike</title></head>
  <body><canvas id="canvas"></canvas></body>
</html>`;

describe('launch preflight classification', () => {
  it('accepts a reachable Phosphene app shell as ready', () => {
    const result = classifyLaunchTarget({
      label: 'GitHub Pages fallback',
      url: 'https://reyk-zepper.github.io/phosphene/',
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: phospheneHtml,
    });

    expect(result.status).toBe('ready');
    expect(result.evidence).toContain('Phosphene title');
    expect(result.evidence).toContain('reasoning visualizer metadata');
    expect(result.evidence).toContain('React root');
  });

  it('blocks a reachable custom domain that serves a different site', () => {
    const result = classifyLaunchTarget({
      label: 'phosphene.dev',
      url: 'https://phosphene.dev/',
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: wrongHtml,
    });

    expect(result.status).toBe('blocked');
    expect(result.reason).toBe('reachable but not serving Phosphene');
  });

  it('marks launch fallback-ready when Pages is correct but phosphene.dev is wrong', () => {
    const summary = summarizeLaunchPreflight([
      classifyLaunchTarget({
        label: 'GitHub Pages fallback',
        url: 'https://reyk-zepper.github.io/phosphene/',
        status: 200,
        contentType: 'text/html',
        body: phospheneHtml,
      }),
      classifyLaunchTarget({
        label: 'phosphene.dev',
        url: 'https://phosphene.dev/',
        status: 200,
        contentType: 'text/html',
        body: wrongHtml,
      }),
    ]);

    expect(summary.status).toBe('fallback_ready');
    expect(summary.primaryUrl).toBe('https://reyk-zepper.github.io/phosphene/');
    expect(summary.blockers).toContain('phosphene.dev: reachable but not serving Phosphene');
  });

  it('exposes launch preflight as a package script', () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['launch:preflight']).toBe('node scripts/launch-preflight.mjs');
    expect(existsSync(resolve(process.cwd(), 'scripts/launch-preflight.mjs'))).toBe(true);
  });
});
