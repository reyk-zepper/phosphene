import { execFile } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import { sanitizeReleaseEvidence, summarizeReleasePreflight } from '../../src/core/release/preflight';

const execFileAsync = promisify(execFile);

function writeExecutable(path: string, source: string) {
  writeFileSync(path, source);
  chmodSync(path, 0o755);
}

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

  it('reuses one launch preflight snapshot for public-demo and custom-domain gates', async () => {
    const binDir = mkdtempSync(resolve(tmpdir(), 'phosphene-release-preflight-'));
    const launchCountFile = resolve(binDir, 'launch-count.txt');
    writeFileSync(launchCountFile, '');

    writeExecutable(
      resolve(binDir, 'pnpm'),
      `#!/usr/bin/env node
const { appendFileSync } = require('node:fs');
const countFile = ${JSON.stringify(launchCountFile)};
appendFileSync(countFile, 'launch\\n');
console.log(JSON.stringify({
  status: 'fallback_ready',
  primaryUrl: 'https://reyk-zepper.github.io/phosphene/',
  blockers: ['phosphene.dev: reachable but not serving Phosphene'],
  targets: [
    {
      label: 'GitHub Pages fallback',
      url: 'https://reyk-zepper.github.io/phosphene/',
      status: 'ready',
      reason: 'serving Phosphene',
      evidence: ['Phosphene title', 'reasoning visualizer metadata', 'React root']
    },
    {
      label: 'phosphene.dev',
      url: 'https://phosphene.dev/',
      status: 'blocked',
      reason: 'reachable but not serving Phosphene',
      evidence: []
    }
  ]
}));
`,
    );

    writeExecutable(
      resolve(binDir, 'npm'),
      `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'whoami') {
  console.error('npm error code ENEEDAUTH');
  process.exit(1);
}
if (args[0] === 'view') {
  console.error('npm error code E404');
  process.exit(1);
}
process.exit(1);
`,
    );

    writeExecutable(
      resolve(binDir, 'gh'),
      `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes('orgs/phosphene-ai')) {
  console.error('gh: Not Found (HTTP 404)');
  process.exit(1);
}
if (args.includes('repos/reyk-zepper/phosphene/pages')) {
  console.log(JSON.stringify({
    cname: null,
    html_url: 'https://reyk-zepper.github.io/phosphene/',
    https_enforced: true
  }));
  process.exit(0);
}
process.exit(1);
`,
    );

    let stdout = '';
    try {
      await execFileAsync('node', ['scripts/release-preflight.mjs'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'stdout' in error &&
        typeof (error as { stdout?: unknown }).stdout === 'string'
      ) {
        stdout = (error as { stdout: string }).stdout;
      } else {
        throw error;
      }
    }

    const launchCount = readFileSync(launchCountFile, 'utf8').trim().split('\n').filter(Boolean).length;
    const summary = JSON.parse(stdout) as {
      gates: Array<{ id: string; status: string; reason: string }>;
    };

    expect(launchCount).toBe(1);
    expect(summary.gates.find((gate) => gate.id === 'public_demo')).toMatchObject({
      status: 'ready',
      reason: 'https://reyk-zepper.github.io/phosphene/ is serving Phosphene',
    });
    expect(summary.gates.find((gate) => gate.id === 'custom_domain')).toMatchObject({
      status: 'blocked',
      reason: 'reachable but not serving Phosphene',
    });
  });
});
