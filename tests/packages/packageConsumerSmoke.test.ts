import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');

interface ConsumerSmokeResult {
  classify: string;
  segments: number;
  flat: number;
  edges: number;
  installedPackage: string;
}

describe('package tarball consumer smoke', () => {
  it('declares a consumer smoke script for the generated package tarball', async () => {
    const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.['smoke:packages']).toBe(
      'pnpm --silent build:packages 1>&2 && node scripts/smoke-package-consumer.mjs'
    );
  });

  it('installs the generated tarball into a temp consumer and imports parser and graph', async () => {
    const { stdout } = await execFileAsync('pnpm', ['--silent', 'smoke:packages'], {
      cwd: rootDir,
      timeout: 60_000,
      maxBuffer: 1024 * 1024 * 5,
    });
    const result = JSON.parse(stdout) as ConsumerSmokeResult;

    expect(result).toEqual({
      classify: 'revision',
      segments: 2,
      flat: 2,
      edges: 1,
      installedPackage: '@reyk-zepper/phosphene',
    });
  });
});
