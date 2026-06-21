import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');

interface TypeConsumerSmokeResult {
  classify: string;
  edges: number;
  flat: number;
  installedPackage: string;
  parsed: number;
  typecheck: boolean;
}

describe('package TypeScript consumer smoke', () => {
  it('declares a consumer typecheck script for the generated package tarball', async () => {
    const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.['typecheck:packages']).toBe(
      'pnpm --silent build:packages 1>&2 && node scripts/typecheck-package-consumer.mjs'
    );
  });

  it('type-checks parser and graph imports from an installed tarball', async () => {
    const { stdout } = await execFileAsync('pnpm', ['--silent', 'typecheck:packages'], {
      cwd: rootDir,
      timeout: 60_000,
      maxBuffer: 1024 * 1024 * 5,
    });
    const result = JSON.parse(stdout) as TypeConsumerSmokeResult;

    expect(result).toEqual({
      classify: 'revision',
      edges: 1,
      flat: 2,
      installedPackage: '@reyk-zepper/phosphene',
      parsed: 1,
      typecheck: true,
    });
  }, 60_000);
});
