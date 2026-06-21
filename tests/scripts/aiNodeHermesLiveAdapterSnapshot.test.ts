import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(rootDir, 'scripts/generate-ai-node-hermes-live-adapter-snapshot.mjs');
const validatorPath = path.join(rootDir, 'scripts/validate-boundary-traces.mjs');

async function tempPath(name: string): Promise<string> {
  const target = path.join(tmpdir(), `phosphene-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(target, { recursive: true });
  return target;
}

async function createHermesHomeFixture(): Promise<string> {
  const hermesHome = await tempPath('hermes-live-home');
  await mkdir(path.join(hermesHome, 'cron'), { recursive: true });
  await mkdir(path.join(hermesHome, 'logs'), { recursive: true });

  await writeFile(path.join(hermesHome, 'config.yaml'), [
    'provider:',
    '  api_key: sk-this-secret-must-not-leak',
    '  endpoint: http://127.0.0.1:9999/private',
    'discord:',
    '  channel: phosphene',
    '',
  ].join('\n'));
  await writeFile(path.join(hermesHome, 'cron/jobs.json'), JSON.stringify({
    jobs: [
      {
        id: 'private-job-name',
        prompt: 'Draft a private Gmail reply to real.person@example.com',
        enabled: true,
      },
      {
        id: 'disabled-secret-job',
        prompt: 'Use bearer abc123 from http://localhost/private',
        enabled: false,
      },
    ],
  }, null, 2));
  await writeFile(path.join(hermesHome, 'logs/agent.log'), [
    '2026-06-21T20:00:00Z bearer abc123 private log line',
    '2026-06-21T20:01:00Z http://localhost/private should never be copied',
    '',
  ].join('\n'));
  await writeFile(path.join(hermesHome, 'gateway_state.json'), JSON.stringify({
    status: 'running',
    private_url: 'http://127.0.0.1:3456/private',
  }, null, 2));
  await writeFile(path.join(hermesHome, 'gateway.pid'), '12345\n');
  await writeFile(path.join(hermesHome, 'gateway.lock'), 'locked\n');

  return hermesHome;
}

describe('generate-ai-node-hermes-live-adapter-snapshot CLI', () => {
  it('writes a redacted Hermes near-live adapter Boundary pack without leaking Hermes file content', async () => {
    const hermesHome = await createHermesHomeFixture();
    const targetDir = await tempPath('hermes-live-adapter-pack');

    const result = await execFileAsync(process.execPath, [
      scriptPath,
      '--target',
      targetDir,
      '--hermes-home',
      hermesHome,
      '--observed-at',
      '2026-06-21T20:00:00Z',
    ], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    expect(result.stdout).toContain('Generated Hermes live adapter snapshot pack');
    await expect(readdir(targetDir)).resolves.toEqual([
      'README.md',
      'hermes-live-adapter.boundary.json',
      'manifest.json',
      'validation-report.json',
    ]);

    await execFileAsync(process.execPath, [validatorPath, targetDir], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    const rawPack = await Promise.all([
      readFile(path.join(targetDir, 'manifest.json'), 'utf8'),
      readFile(path.join(targetDir, 'validation-report.json'), 'utf8'),
      readFile(path.join(targetDir, 'hermes-live-adapter.boundary.json'), 'utf8'),
      readFile(path.join(targetDir, 'README.md'), 'utf8'),
    ]).then((parts) => parts.join('\n'));
    expect(rawPack).not.toContain(hermesHome);
    expect(rawPack).not.toContain('sk-this-secret-must-not-leak');
    expect(rawPack).not.toContain('real.person@example.com');
    expect(rawPack).not.toContain('http://127.0.0.1');
    expect(rawPack).not.toContain('http://localhost');
    expect(rawPack).not.toContain('bearer abc123');
    expect(rawPack).not.toContain('Draft a private Gmail reply');

    const manifest = JSON.parse(await readFile(path.join(targetDir, 'manifest.json'), 'utf8')) as {
      source_agent: string;
      data_classification: string;
      files: Array<Record<string, unknown>>;
    };
    expect(manifest.source_agent).toBe('hermes');
    expect(manifest.data_classification).toBe('redacted_live_adapter');
    expect(manifest.files).toEqual([{
      file: 'hermes-live-adapter.boundary.json',
      description: 'Redacted near-live Hermes adapter Boundary output.',
    }]);

    const trace = JSON.parse(await readFile(path.join(targetDir, 'hermes-live-adapter.boundary.json'), 'utf8')) as {
      metadata: { id: string; title: string; status: string };
      events: Array<Record<string, unknown>>;
    };
    expect(trace.metadata.title).toBe('Hermes live adapter redacted status');
    expect(trace.metadata.status).toBe('succeeded');
    expect(trace.events.map((event) => event.source)).toContain('hermes');
    expect(trace.events.some((event) => event.event_type === 'adapter.tick')).toBe(true);
    expect(trace.events.some((event) => event.event_type === 'health.check')).toBe(true);
    expect(trace.events.some((event) => event.event_type === 'adapter.redacted_boundary')).toBe(true);
    expect(trace.events.every((event) => event.run_id === trace.metadata.id)).toBe(true);

    await rm(hermesHome, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });

  it('updates the served live latest marker for a Hermes adapter pack', async () => {
    const hermesHome = await createHermesHomeFixture();
    const outputRoot = await tempPath('hermes-live-adapter-output-root');
    const latestFile = path.join(outputRoot, 'latest.json');
    const targetDir = path.join(outputRoot, 'ai-node-live-20260621T200000Z');

    await execFileAsync(process.execPath, [
      scriptPath,
      '--target',
      targetDir,
      '--hermes-home',
      hermesHome,
      '--observed-at',
      '2026-06-21T20:00:00Z',
      '--latest-file',
      latestFile,
      '--retention-count',
      '12',
    ], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    const rawLatest = await readFile(latestFile, 'utf8');
    const latest = JSON.parse(rawLatest) as {
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
      retention_count: 12,
    });
    expect(rawLatest).not.toContain(hermesHome);

    await rm(hermesHome, { recursive: true, force: true });
    await rm(outputRoot, { recursive: true, force: true });
  });
});
