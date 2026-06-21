import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(rootDir, 'scripts/generate-ai-node-live-adapter-snapshot.mjs');
const validatorPath = path.join(rootDir, 'scripts/validate-boundary-traces.mjs');

async function tempPath(name: string): Promise<string> {
  const target = path.join(tmpdir(), `phosphene-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(target, { recursive: true });
  return target;
}

async function createServiceFixture(): Promise<string> {
  const serviceDir = await tempPath('live-adapter-service');
  await mkdir(path.join(serviceDir, 'dist/snapshots/current'), { recursive: true });
  await mkdir(path.join(serviceDir, 'dist/snapshots/canary'), { recursive: true });
  await writeFile(path.join(serviceDir, 'dist/node-deploy.json'), JSON.stringify({
    service: 'phosphene',
    node: 'mac-mini-ai-node',
    short_commit: '369b482',
    built_at: '2026-06-21T19:17:48Z',
  }, null, 2));
  await writeFile(path.join(serviceDir, 'dist/snapshots/current/manifest.json'), JSON.stringify({
    schema_version: 'phosphene.boundary.v0.1.2',
    source_agent: 'hermes',
    data_classification: 'synthetic_redacted',
    files: [{ file: 'hermes-aag-gmail-draft.synthetic.json' }],
  }, null, 2));
  await writeFile(path.join(serviceDir, 'dist/snapshots/canary/latest.json'), JSON.stringify({
    schema_version: 'phosphene.boundary.v0.1.2',
    updated_at: '2026-06-21T19:13:59.054Z',
    source_agent: 'ai_node_canary',
    data_classification: 'redacted_operational_canary',
    latest_pack: 'ai-node-canary-20260621T191358Z',
    canary_status: 'succeeded',
    manifest_file: 'ai-node-canary-20260621T191358Z/manifest.json',
    manifest_sha256: 'sha256:b66795bc0e30461513f9ba3e2ab65cb803ada72ca4346289bfe77b7796c1309e',
    retention_count: 48,
  }, null, 2));
  return serviceDir;
}

describe('generate-ai-node-live-adapter-snapshot CLI', () => {
  it('writes a redacted near-live adapter Boundary pack that passes validation', async () => {
    const serviceDir = await createServiceFixture();
    const targetDir = await tempPath('live-adapter-pack');

    const result = await execFileAsync(process.execPath, [
      scriptPath,
      '--target',
      targetDir,
      '--service-dir',
      serviceDir,
      '--observed-at',
      '2026-06-21T20:00:00Z',
    ], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    expect(result.stdout).toContain('Generated AI Node live adapter snapshot pack');
    await expect(readdir(targetDir)).resolves.toEqual([
      'README.md',
      'ai-node-live-adapter.boundary.json',
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
    expect(manifest.source_agent).toBe('ai_node_live_adapter');
    expect(manifest.data_classification).toBe('redacted_live_adapter');
    expect(manifest.files).toEqual([{
      file: 'ai-node-live-adapter.boundary.json',
      description: 'Redacted near-live AI Node adapter Boundary output.',
    }]);

    const trace = JSON.parse(await readFile(path.join(targetDir, 'ai-node-live-adapter.boundary.json'), 'utf8')) as {
      metadata: { id: string; status: string };
      events: Array<Record<string, unknown>>;
    };
    expect(trace.metadata.status).toBe('succeeded');
    expect(trace.events.some((event) => event.event_type === 'adapter.tick')).toBe(true);
    expect(trace.events.some((event) => event.event_type === 'adapter.redacted_boundary')).toBe(true);
    expect(trace.events.every((event) => event.run_id === trace.metadata.id)).toBe(true);
    expect(JSON.stringify(trace)).not.toContain(serviceDir);

    await rm(serviceDir, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });

  it('updates a redacted latest marker and prunes older live adapter packs', async () => {
    const serviceDir = await createServiceFixture();
    const outputRoot = await tempPath('live-adapter-output-root');
    const oldPack = path.join(outputRoot, 'ai-node-live-20260621T180000Z');
    const retainedPack = path.join(outputRoot, 'ai-node-live-20260621T190000Z');
    const targetDir = path.join(outputRoot, 'ai-node-live-20260621T200000Z');
    const unrelatedDir = path.join(outputRoot, 'manual-review-pack');
    const latestFile = path.join(outputRoot, 'latest.json');

    await mkdir(oldPack, { recursive: true });
    await mkdir(retainedPack, { recursive: true });
    await mkdir(unrelatedDir, { recursive: true });
    await writeFile(path.join(unrelatedDir, 'README.md'), 'do not prune\n');

    await execFileAsync(process.execPath, [
      scriptPath,
      '--target',
      targetDir,
      '--service-dir',
      serviceDir,
      '--observed-at',
      '2026-06-21T20:00:00Z',
      '--latest-file',
      latestFile,
      '--retention-count',
      '2',
    ], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    await expect(readdir(outputRoot)).resolves.toEqual([
      'ai-node-live-20260621T190000Z',
      'ai-node-live-20260621T200000Z',
      'latest.json',
      'manual-review-pack',
    ]);

    const rawLatest = await readFile(latestFile, 'utf8');
    const latest = JSON.parse(rawLatest) as {
      schema_version: string;
      updated_at: string;
      source_agent: string;
      data_classification: string;
      latest_pack: string;
      adapter_status: string;
      manifest_file: string;
      manifest_sha256: string;
      retention_count: number;
    };

    expect(latest).toEqual({
      schema_version: 'phosphene.boundary.v0.1.2',
      updated_at: '2026-06-21T20:00:00Z',
      source_agent: 'ai_node_live_adapter',
      data_classification: 'redacted_live_adapter',
      latest_pack: 'ai-node-live-20260621T200000Z',
      adapter_status: 'succeeded',
      manifest_file: 'ai-node-live-20260621T200000Z/manifest.json',
      manifest_sha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      retention_count: 2,
    });
    expect(rawLatest).not.toContain(outputRoot);
    expect(rawLatest).not.toContain(serviceDir);

    await rm(serviceDir, { recursive: true, force: true });
    await rm(outputRoot, { recursive: true, force: true });
  });
});
