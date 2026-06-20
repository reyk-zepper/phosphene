import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(rootDir, 'scripts/generate-ai-node-canary-snapshot.mjs');
const validatorPath = path.join(rootDir, 'scripts/validate-boundary-traces.mjs');

async function tempPath(name: string): Promise<string> {
  const target = path.join(tmpdir(), `phosphene-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(target, { recursive: true });
  return target;
}

async function createServiceFixture(): Promise<string> {
  const serviceDir = await tempPath('canary-service');
  await mkdir(path.join(serviceDir, 'dist/snapshots/current'), { recursive: true });
  await writeFile(path.join(serviceDir, 'dist/node-deploy.json'), JSON.stringify({
    service: 'phosphene',
    node: 'mac-mini-ai-node',
    short_commit: 'ca3e4e8',
    built_at: '2026-06-20T21:38:32Z',
  }, null, 2));
  await writeFile(path.join(serviceDir, 'dist/snapshots/current/manifest.json'), JSON.stringify({
    schema_version: 'phosphene.boundary.v0.1.2',
    source_agent: 'hermes',
    data_classification: 'synthetic_redacted',
    files: [{ file: 'hermes-aag-gmail-draft.synthetic.json' }],
  }, null, 2));
  return serviceDir;
}

describe('generate-ai-node-canary-snapshot CLI', () => {
  it('writes a redacted operational canary Boundary pack that passes validation', async () => {
    const serviceDir = await createServiceFixture();
    const targetDir = await tempPath('canary-pack');

    const result = await execFileAsync(process.execPath, [
      scriptPath,
      '--target',
      targetDir,
      '--service-dir',
      serviceDir,
      '--observed-at',
      '2026-06-20T22:00:00Z',
      '--service-http-code',
      '200',
    ], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    expect(result.stdout).toContain('Generated AI Node canary snapshot pack');
    await expect(readdir(targetDir)).resolves.toEqual([
      'README.md',
      'ai-node-canary-health.boundary.json',
      'manifest.json',
      'validation-report.json',
    ]);

    await execFileAsync(process.execPath, [validatorPath, targetDir], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    const manifest = JSON.parse(await readFile(path.join(targetDir, 'manifest.json'), 'utf8')) as {
      source_agent: string;
      data_classification: string;
      files: Array<Record<string, unknown>>;
    };
    expect(manifest.source_agent).toBe('ai_node_canary');
    expect(manifest.data_classification).toBe('redacted_operational_canary');
    expect(manifest.files).toEqual([{
      file: 'ai-node-canary-health.boundary.json',
      description: 'Redacted AI Node operational canary for Phosphene service and published snapshot health.',
    }]);
    expect(manifest.files[0]).not.toHaveProperty('filename');

    const trace = JSON.parse(await readFile(path.join(targetDir, 'ai-node-canary-health.boundary.json'), 'utf8')) as {
      metadata: { id: string; status: string };
      events: Array<Record<string, unknown>>;
    };
    expect(trace.metadata.status).toBe('succeeded');
    expect(trace.events).toHaveLength(5);
    expect(trace.events.every((event) => event.run_id === trace.metadata.id)).toBe(true);
    expect(trace.events.some((event) => event.event_type === 'health.check')).toBe(true);
    expect(trace.events.every((event) => !('event_id' in event) && !('type' in event))).toBe(true);
    expect(trace.events.flatMap((event) => event.links ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: 'trace://ai-node-canary/phosphene-service' }),
    ]));

    await rm(serviceDir, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });
});
