import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, cp, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(rootDir, 'scripts/publish-snapshot.mjs');
const fixtureSource = path.join(rootDir, 'public/snapshots/current');

interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runPublisher(args: string[]): Promise<CommandResult> {
  try {
    const result = await execFileAsync(process.execPath, [scriptPath, ...args], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });
    return {
      code: 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    const failure = error as Error & { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof failure.code === 'number' ? failure.code : 1,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? failure.message,
    };
  }
}

async function tempPath(name: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), `phosphene-${name}-`));
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function copyFixtureSource(): Promise<string> {
  const source = await tempPath('publisher-source');
  await cp(fixtureSource, source, { recursive: true });
  return source;
}

describe('publish-snapshot CLI', () => {
  it('validates a source during dry-run without creating the target directory', async () => {
    const parent = await tempPath('publisher-dry-run');
    const target = path.join(parent, 'current');

    const result = await runPublisher([
      '--source',
      fixtureSource,
      '--target',
      target,
      '--dry-run',
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('DRY RUN');
    expect(result.stdout).toContain('manifest.json');
    expect(await pathExists(target)).toBe(false);

    await rm(parent, { recursive: true, force: true });
  });

  it('accepts the package-manager argument separator before options', async () => {
    const parent = await tempPath('publisher-separator');
    const target = path.join(parent, 'current');

    const result = await runPublisher([
      '--',
      '--source',
      fixtureSource,
      '--target',
      target,
      '--dry-run',
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('DRY RUN');
    expect(await pathExists(target)).toBe(false);

    await rm(parent, { recursive: true, force: true });
  });

  it('publishes manifest, support files, and manifest-listed traces into the target', async () => {
    const parent = await tempPath('publisher-target');
    const target = path.join(parent, 'current');

    const result = await runPublisher([
      '--source',
      fixtureSource,
      '--target',
      target,
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Published 7 file(s)');
    await expect(readdir(target)).resolves.toEqual([
      'README.md',
      'aag-workspace-bundle.synthetic.json',
      'hermes-aag-gmail-draft.synthetic.json',
      'hermes-openclaw-worker.synthetic.json',
      'manifest.json',
      'sentinel-recovery.synthetic.json',
      'validation-report.json',
    ]);

    const manifest = await readFile(path.join(target, 'manifest.json'), 'utf8');
    expect(manifest).toContain('phosphene.boundary.v0.1.2');

    await rm(parent, { recursive: true, force: true });
  });

  it('blocks publication when a manifest-listed trace file is missing', async () => {
    const source = await copyFixtureSource();
    const parent = await tempPath('publisher-missing-file');
    const target = path.join(parent, 'current');
    await rm(path.join(source, 'sentinel-recovery.synthetic.json'));

    const result = await runPublisher([
      '--source',
      source,
      '--target',
      target,
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('manifest file is missing');
    expect(await pathExists(target)).toBe(false);

    await rm(source, { recursive: true, force: true });
    await rm(parent, { recursive: true, force: true });
  });

  it('blocks publication when Boundary validation fails', async () => {
    const source = await copyFixtureSource();
    const parent = await tempPath('publisher-invalid-source');
    const target = path.join(parent, 'current');
    const tracePath = path.join(source, 'hermes-aag-gmail-draft.synthetic.json');
    const original = await readFile(tracePath, 'utf8');
    await writeFile(tracePath, original.replace(
      'Hermes starts a synthetic draft readiness run.',
      'Hermes starts a synthetic draft for private.user@example.com.'
    ));

    const result = await runPublisher([
      '--source',
      source,
      '--target',
      target,
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Boundary validation failed');
    expect(result.stdout).toContain('forbidden sensitive pattern: email_address');
    expect(await pathExists(target)).toBe(false);

    await rm(source, { recursive: true, force: true });
    await rm(parent, { recursive: true, force: true });
  });
});
