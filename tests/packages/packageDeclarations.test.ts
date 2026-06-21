import { execFile } from 'node:child_process';
import { access, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import type { ReasoningNode } from '@/packages/parser';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');

async function listDeclarationFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listDeclarationFiles(entryPath);
      }
      return entry.name.endsWith('.d.ts') ? [entryPath] : [];
    })
  );
  return nested.flat();
}

describe('parser and graph declaration package build', () => {
  it('declares a package build script plus generated runtime and type entry points', async () => {
    const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as {
      exports?: Record<string, { types: string; import: string; default: string }>;
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.['build:packages']).toBe(
      'rm -rf dist-types dist-packages && tsc -p tsconfig.packages.json && node scripts/normalize-package-declarations.mjs && vite build --config vite.packages.config.ts'
    );
    expect(pkg.exports).toMatchObject({
      './parser': {
        types: './dist-types/packages/parser.d.ts',
        import: './dist-packages/parser.js',
        default: './dist-packages/parser.js',
      },
      './graph': {
        types: './dist-types/packages/graph.d.ts',
        import: './dist-packages/graph.js',
        default: './dist-packages/graph.js',
      },
    });
  });

  it('emits importable package runtime and declaration artifacts', async () => {
    await rm(path.join(rootDir, 'dist-packages'), { force: true, recursive: true });
    await rm(path.join(rootDir, 'dist-types'), { force: true, recursive: true });

    await execFileAsync('pnpm', ['build:packages'], {
      cwd: rootDir,
      timeout: 30_000,
    });

    const runtimeFiles = [
      'dist-packages/index.js',
      'dist-packages/parser.js',
      'dist-packages/graph.js',
    ];
    const declarationFiles = await listDeclarationFiles(path.join(rootDir, 'dist-types'));
    const [runtimeSources, declarations] = await Promise.all([
      Promise.all(runtimeFiles.map(async (file) => readFile(path.join(rootDir, file), 'utf8'))),
      Promise.all(declarationFiles.map(async (file) => readFile(file, 'utf8'))),
    ]);
    const combinedRuntime = runtimeSources.join('\n');
    const combinedDeclarations = declarations.join('\n');

    const parser = await import(pathToFileURL(path.join(rootDir, 'dist-packages/parser.js')).href) as {
      classify: (text: string) => string;
      parseText: (text: string) => unknown[];
      segment: (text: string) => unknown[];
    };
    const graph = await import(pathToFileURL(path.join(rootDir, 'dist-packages/graph.js')).href) as {
      collectGraphEdges: (root: ReasoningNode) => Array<{ from: string; to: string }>;
      flattenGraph: (root: ReasoningNode) => ReasoningNode[];
    };
    const root: ReasoningNode = {
      id: 'root',
      type: 'hypothesis',
      summary: 'Root',
      content: 'Root',
      depth: 0,
      tokenCount: 1,
      children: [{
        id: 'child',
        type: 'decision',
        summary: 'Child',
        content: 'Child',
        depth: 1,
        tokenCount: 1,
        children: [],
      }],
    };

    expect(parser.segment('First thought.\n\nSecond thought.')).toHaveLength(2);
    expect(parser.classify('Wait, reconsider this.')).toBe('revision');
    expect(parser.parseText('What if this works?')).toHaveLength(1);
    expect(graph.flattenGraph(root).map((node) => node.id)).toEqual(['root', 'child']);
    expect(graph.collectGraphEdges(root)).toEqual([{ from: 'root', to: 'child' }]);

    expect(combinedRuntime).toContain('flattenGraph');
    expect(combinedRuntime).not.toMatch(/@\//);
    expect(combinedRuntime).not.toMatch(/from ['"].*\/(?:app|components|constants|hooks|core\/store|core\/adapters)\b/);
    expect(combinedDeclarations).toContain('parseText');
    expect(combinedDeclarations).toContain('flattenGraph');
    expect(combinedDeclarations).toContain('collectGraphEdges');
    expect(combinedDeclarations).not.toMatch(/@\//);
    expect(combinedDeclarations).not.toMatch(
      /@\/(?:app|components|constants|hooks|core\/store|core\/adapters)\b/
    );
    const relativeSpecifiers = [...combinedDeclarations.matchAll(/\bfrom ['"](\.{1,2}\/[^'"]+)['"]/g)];
    expect(relativeSpecifiers.length).toBeGreaterThan(0);
    for (const [, specifier] of relativeSpecifiers) {
      expect(specifier, `${specifier} should be NodeNext-safe`).toMatch(/\.js$/);
    }
    await expect(access(path.join(rootDir, 'dist-packages/snapshots'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
