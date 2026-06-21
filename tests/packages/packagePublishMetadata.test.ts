import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');

interface PackageMetadata {
  bugs?: { url?: string };
  engines?: { node?: string };
  homepage?: string;
  keywords?: string[];
  license?: string;
  name?: string;
  private?: boolean;
  publishConfig?: { access?: string };
  repository?: { type?: string; url?: string };
  scripts?: Record<string, string>;
  sideEffects?: boolean;
}

describe('package publish metadata', () => {
  it('uses an available scoped npm name with public package metadata', async () => {
    const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as PackageMetadata;

    expect(pkg.name).toBe('@reyk-zepper/phosphene');
    expect(pkg.private).toBeUndefined();
    expect(pkg.license).toBe('MIT');
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/reyk-zepper/phosphene.git',
    });
    expect(pkg.homepage).toBe('https://github.com/reyk-zepper/phosphene#readme');
    expect(pkg.bugs).toEqual({
      url: 'https://github.com/reyk-zepper/phosphene/issues',
    });
    expect(pkg.engines?.node).toBe('>=20');
    expect(pkg.publishConfig?.access).toBe('public');
    expect(pkg.sideEffects).toBe(false);
    expect(pkg.keywords).toEqual([
      'ai',
      'reasoning',
      'visualization',
      'trace',
      'graph',
      'typescript',
      'observability',
    ]);
  });

  it('declares a publish dry-run gate that verifies the package before npm publish', async () => {
    const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as PackageMetadata;

    expect(pkg.scripts?.['test:packages']).toBe(
      'vitest run tests/packages tests/tooling/vitestConfig.test.ts tests/tooling/eslintConfig.test.ts'
    );
    expect(pkg.scripts?.['verify:packages']).toBe(
      'pnpm --silent test:packages 1>&2 && pnpm --silent lint 1>&2 && pnpm --silent build 1>&2 && pnpm --silent pack:packages 1>&2 && pnpm --silent smoke:packages 1>&2 && pnpm --silent typecheck:packages'
    );
    expect(pkg.scripts?.['publish:packages:dry-run']).toBe(
      'pnpm --silent verify:packages 1>&2 && npm publish --dry-run --ignore-scripts --access public --json'
    );
    expect(pkg.scripts?.prepublishOnly).toBe('pnpm --silent verify:packages');
  });
});
