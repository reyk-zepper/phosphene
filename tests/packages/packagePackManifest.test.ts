import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');

interface PackFile {
  path: string;
}

interface PackResult {
  files: PackFile[];
  name: string;
  version: string;
}

describe('package publishing dry-run manifest', () => {
  it('declares an explicit publish dry-run script and files allowlist', async () => {
    const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as {
      files?: string[];
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.['pack:packages']).toBe(
      'pnpm --silent build:packages 1>&2 && npm pack --dry-run --json'
    );
    expect(pkg.files).toEqual([
      'dist-packages',
      'dist-types',
      'README.md',
      'LICENSE',
    ]);
  });

  it('packs only runtime, declarations, package metadata, readme, and license', async () => {
    const { stdout } = await execFileAsync('pnpm', ['--silent', 'pack:packages'], {
      cwd: rootDir,
      timeout: 30_000,
      maxBuffer: 1024 * 1024 * 5,
    });
    const [pack] = JSON.parse(stdout) as PackResult[];
    const paths = pack.files.map((file) => file.path).sort();

    expect(pack.name).toBe('@reyk-zepper/phosphene');
    expect(pack.version).toBe('0.1.36');
    expect(paths).toContain('package.json');
    expect(paths).toContain('README.md');
    expect(paths).toContain('LICENSE');
    expect(paths).toContain('dist-packages/parser.js');
    expect(paths).toContain('dist-packages/graph.js');
    expect(paths).toContain('dist-types/packages/parser.d.ts');
    expect(paths).toContain('dist-types/packages/graph.d.ts');
    expect(paths).not.toContain('CLAUDE.md');

    for (const filePath of paths) {
      expect(filePath, `${filePath} should be publish-safe`).toMatch(
        /^(package\.json|README\.md|LICENSE|dist-packages\/[a-zA-Z0-9_.-]+\.js|dist-types\/[a-zA-Z0-9_./-]+\.d\.ts)$/
      );
      expect(filePath).not.toMatch(/^(src|tests|docs|public|scripts|ops)\//);
      if (filePath !== 'package.json') {
        expect(filePath).not.toMatch(/\.(map|json)$/);
      }
      expect(filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')).toBe(false);
      expect(filePath.endsWith('.tsx')).toBe(false);
    }
  });
});
