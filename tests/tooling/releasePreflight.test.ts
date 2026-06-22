import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { sanitizeReleaseEvidence, summarizeReleasePreflight } from '../../src/core/release/preflight';

describe('release preflight summary', () => {
  it('keeps external blockers explicit while preserving the fallback launch URL', () => {
    const summary = summarizeReleasePreflight([
      {
        id: 'public_demo',
        label: 'Public demo',
        status: 'ready',
        reason: 'GitHub Pages fallback is serving Phosphene',
        action: null,
        evidence: ['https://reyk-zepper.github.io/phosphene/'],
      },
      {
        id: 'custom_domain',
        label: 'phosphene.dev',
        status: 'blocked',
        reason: 'reachable but not serving Phosphene',
        action: 'Move phosphene.dev DNS/hosting to the Phosphene build, then rerun launch preflight.',
        evidence: ['Geiss-web - Phase 0 spike'],
      },
      {
        id: 'npm_package',
        label: 'npm package',
        status: 'blocked',
        reason: '@reyk-zepper/phosphene is not published',
        action: 'Log in with npm adduser and run npm publish after the dry-run gate passes.',
        evidence: ['npm view returned E404'],
      },
    ]);

    expect(summary.status).toBe('blocked');
    expect(summary.ready).toBe(1);
    expect(summary.blocked).toBe(2);
    expect(summary.blockers).toContain('phosphene.dev: reachable but not serving Phosphene');
    expect(summary.blockers).toContain('npm package: @reyk-zepper/phosphene is not published');
    expect(summary.nextActions).toContain(
      'Move phosphene.dev DNS/hosting to the Phosphene build, then rerun launch preflight.',
    );
  });

  it('marks the release ready only when every gate is ready', () => {
    const summary = summarizeReleasePreflight([
      {
        id: 'public_demo',
        label: 'Public demo',
        status: 'ready',
        reason: 'phosphene.dev is serving Phosphene',
        action: null,
        evidence: ['https://phosphene.dev/'],
      },
      {
        id: 'npm_package',
        label: 'npm package',
        status: 'ready',
        reason: '@reyk-zepper/phosphene@0.1.42 is published',
        action: null,
        evidence: ['0.1.42'],
      },
    ]);

    expect(summary.status).toBe('ready');
    expect(summary.blockers).toEqual([]);
    expect(summary.nextActions).toEqual([]);
  });

  it('exposes release preflight as a package script', () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['release:preflight']).toBe('node scripts/release-preflight.mjs');
    expect(existsSync(resolve(process.cwd(), 'scripts/release-preflight.mjs'))).toBe(true);
  });

  it('redacts local npm log paths from command evidence', () => {
    const evidence =
      'npm error A complete log of this run can be found in: /Users/reykz/.npm/_logs/2026-06-22-debug-0.log';

    expect(sanitizeReleaseEvidence(evidence)).toBe(
      'npm error A complete log of this run can be found in: [local npm log path redacted]',
    );
  });
});
