import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');

describe('eslint generated artifact ignores', () => {
  it('keeps generated app and package build outputs out of lint scope', async () => {
    const source = await readFile(path.join(rootDir, 'eslint.config.js'), 'utf8');

    expect(source).toContain("'dist'");
    expect(source).toContain("'dist-packages'");
    expect(source).toContain("'dist-types'");
  });
});
