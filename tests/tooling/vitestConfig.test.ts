import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');

describe('vitest shared artifact configuration', () => {
  it('runs test files serially because package smokes share generated dist artifacts', async () => {
    const source = await readFile(path.join(rootDir, 'vite.config.ts'), 'utf8');

    expect(source).toContain("from 'vite'");
    expect(source).toContain('type VitestConfig');
    expect(source).toContain('fileParallelism: false');
    expect(source).toContain('testTimeout: 60_000');
    expect(source).toContain("'tests/browser/**'");
  });
});
