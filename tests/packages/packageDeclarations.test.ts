import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');

describe('parser and graph declaration package build', () => {
  it('declares a package build script and generated type entry points', async () => {
    const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as {
      exports?: Record<string, { types: string; default: string }>;
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.['build:packages']).toBe('tsc -p tsconfig.packages.json');
    expect(pkg.exports).toMatchObject({
      './parser': {
        types: './dist-types/packages/parser.d.ts',
        default: './src/packages/parser.ts',
      },
      './graph': {
        types: './dist-types/packages/graph.d.ts',
        default: './src/packages/graph.ts',
      },
    });
  });

  it('emits package declaration artifacts without workspace-only aliases', async () => {
    await execFileAsync('pnpm', ['build:packages'], {
      cwd: rootDir,
      timeout: 30_000,
    });

    const declarationFiles = [
      'dist-types/packages/parser.d.ts',
      'dist-types/packages/graph.d.ts',
      'dist-types/core/graph/traversal.d.ts',
    ];
    const declarations = await Promise.all(
      declarationFiles.map(async (file) => readFile(path.join(rootDir, file), 'utf8'))
    );
    const combined = declarations.join('\n');

    expect(combined).toContain('parseText');
    expect(combined).toContain('flattenGraph');
    expect(combined).toContain('collectGraphEdges');
    expect(combined).not.toMatch(/@\//);
    expect(combined).not.toMatch(/@\/(?:app|components|constants|hooks|core\/store|core\/adapters)\b/);
  });
});
