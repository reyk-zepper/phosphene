import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(rootDir, 'scripts/generate-ai-node-service-live-adapters-snapshot.mjs');
const validatorPath = path.join(rootDir, 'scripts/validate-boundary-traces.mjs');

const expectedTraceFiles = [
  'aag-live-adapter.boundary.json',
  'gmail-live-adapter.boundary.json',
  'hermes-live-adapter.boundary.json',
  'openclaw-live-adapter.boundary.json',
  'sentinel-live-adapter.boundary.json',
  'side-effect-intent-live-adapter.boundary.json',
  'workspace-live-adapter.boundary.json',
];

async function tempPath(name: string): Promise<string> {
  const target = path.join(tmpdir(), `phosphene-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(target, { recursive: true });
  return target;
}

async function writeFixtureFile(root: string, relativePath: string, content: string): Promise<void> {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

async function createAiStackFixture(): Promise<string> {
  const aiStackRoot = await tempPath('service-live-ai-stack');

  await writeFixtureFile(aiStackRoot, 'services/agent-action-gateway/config/private.yaml', [
    'api_key: sk-service-must-not-leak',
    'endpoint: http://127.0.0.1:7777/private',
    '',
  ].join('\n'));
  await writeFixtureFile(aiStackRoot, 'services/agent-action-gateway/dist/README.md', 'gateway dist marker\n');
  await writeFixtureFile(aiStackRoot, 'services/aag-gateway-live/README.md', [
    'bearer should-not-leak',
    'http://localhost/aag-private',
    '',
  ].join('\n'));
  await writeFixtureFile(aiStackRoot, 'bin/aag-gmail-draft-live-smoke', '#!/usr/bin/env bash\n');
  await writeFixtureFile(aiStackRoot, 'bin/aag-google-workspace-bundle-live-smoke', '#!/usr/bin/env bash\n');
  await writeFixtureFile(aiStackRoot, 'logs/aag-gateway.out.log', 'bearer gateway-private-log\n');
  await writeFixtureFile(aiStackRoot, 'logs/agent-action-gateway/smoke-gmail-scaffold.log', [
    'private Gmail message to person@example.com',
    'oauth token must not leak',
    '',
  ].join('\n'));
  await writeFixtureFile(aiStackRoot, 'data/agent-action-gateway/gmail-live-smoke.sqlite3', 'sqlite marker\n');
  await writeFixtureFile(aiStackRoot, 'data/agent-action-gateway/workspace-live-smoke.sqlite3', 'sqlite marker\n');

  await writeFixtureFile(aiStackRoot, 'services/openclaw/README.md', 'http://10.0.0.1/private openclaw details\n');
  await writeFixtureFile(aiStackRoot, 'services/openclaw-worker-mcp/DESIGN.md', 'worker marker\n');
  await writeFixtureFile(aiStackRoot, 'state/openclaw-worker-health.env', 'STATUS=running\nACCESS_TOKEN=do-not-copy\n');
  await writeFixtureFile(aiStackRoot, 'state/openclaw-update-status.env', 'STATUS=running\nCLIENT_SECRET=do-not-copy\n');
  await writeFixtureFile(aiStackRoot, 'state/openclaw-worker-health.last-live', '2026-06-21T20:00:00Z\n');
  await writeFixtureFile(aiStackRoot, 'state/openclaw-update.alert', 'private alert content\n');
  await writeFixtureFile(aiStackRoot, 'logs/openclaw-worker-health.log', 'refresh_token should not leak\n');
  await writeFixtureFile(aiStackRoot, 'data/openclaw/home/openclaw.json', JSON.stringify({
    private_url: 'http://192.168.1.20/private',
    note: 'do not copy',
  }, null, 2));

  await writeFixtureFile(aiStackRoot, 'data/hermes/home/config.yaml', 'client_secret: never-copy\n');
  await writeFixtureFile(aiStackRoot, 'data/hermes/home/cron/jobs.json', JSON.stringify({
    jobs: [
      { id: 'gmail-private', prompt: 'private Gmail reply for user@example.com', enabled: true },
      { id: 'workspace-private', prompt: 'workspace document body', enabled: true },
    ],
  }, null, 2));
  await writeFixtureFile(aiStackRoot, 'data/hermes/home/logs/agent.log', 'sk-service-must-not-leak\n');
  await writeFixtureFile(aiStackRoot, 'data/hermes/home/gateway_state.json', JSON.stringify({ status: 'running' }));
  await writeFixtureFile(aiStackRoot, 'data/hermes/home/gateway.pid', '12345\n');
  await writeFixtureFile(aiStackRoot, 'data/hermes/home/gmail-state.json', 'private Gmail state for person@example.com\n');
  await writeFixtureFile(aiStackRoot, 'data/hermes/home/workspace-state.json', 'workspace document body\n');
  await writeFixtureFile(aiStackRoot, 'data/hermes/home/workspace-attestations/latest.json', 'bearer workspace marker\n');

  return aiStackRoot;
}

describe('generate-ai-node-service-live-adapters-snapshot CLI', () => {
  it('writes a redacted multi-service adapter Boundary pack without leaking AI-node content', async () => {
    const aiStackRoot = await createAiStackFixture();
    const targetDir = await tempPath('service-live-adapters-pack');

    const result = await execFileAsync(process.execPath, [
      scriptPath,
      '--target',
      targetDir,
      '--ai-stack-root',
      aiStackRoot,
      '--observed-at',
      '2026-06-21T20:00:00Z',
    ], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    expect(result.stdout).toContain('Generated AI Node service live adapter snapshot pack');
    await expect(readdir(targetDir).then((entries) => entries.sort())).resolves.toEqual([
      'README.md',
      ...expectedTraceFiles,
      'manifest.json',
      'validation-report.json',
    ].sort());

    await execFileAsync(process.execPath, [validatorPath, targetDir], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    const rawPack = await Promise.all([
      readFile(path.join(targetDir, 'manifest.json'), 'utf8'),
      readFile(path.join(targetDir, 'validation-report.json'), 'utf8'),
      readFile(path.join(targetDir, 'README.md'), 'utf8'),
      ...expectedTraceFiles.map((file) => readFile(path.join(targetDir, file), 'utf8')),
    ]).then((parts) => parts.join('\n'));
    expect(rawPack).not.toContain(aiStackRoot);
    expect(rawPack).not.toContain('sk-service-must-not-leak');
    expect(rawPack).not.toContain('person@example.com');
    expect(rawPack).not.toContain('user@example.com');
    expect(rawPack).not.toContain('http://127.0.0.1');
    expect(rawPack).not.toContain('http://localhost');
    expect(rawPack).not.toContain('http://10.0.0.1');
    expect(rawPack).not.toContain('http://192.168.1.20');
    expect(rawPack).not.toContain('private Gmail');
    expect(rawPack).not.toContain('workspace document body');
    expect(rawPack).not.toContain('bearer');
    expect(rawPack).not.toContain('oauth');
    expect(rawPack).not.toContain('ACCESS_TOKEN');
    expect(rawPack).not.toContain('CLIENT_SECRET');
    expect(rawPack).not.toContain('aag-gmail-draft-live-smoke');
    expect(rawPack).not.toContain('aag-google-workspace-bundle-live-smoke');

    const manifest = JSON.parse(await readFile(path.join(targetDir, 'manifest.json'), 'utf8')) as {
      source_agent: string;
      data_classification: string;
      files: Array<Record<string, unknown>>;
    };
    expect(manifest.source_agent).toBe('ai_node_service_live_adapter');
    expect(manifest.data_classification).toBe('redacted_live_adapter');
    expect(manifest.files).toEqual(expectedTraceFiles.map((file) => ({
      file,
      description: expect.stringMatching(/^Redacted near-live .+ adapter Boundary output\.$/),
    })));

    const traces = await Promise.all(expectedTraceFiles.map(async (file) => ({
      file,
      trace: JSON.parse(await readFile(path.join(targetDir, file), 'utf8')) as {
        metadata: { id: string; title: string; status: string };
        events: Array<Record<string, unknown>>;
      },
    })));
    expect(traces.map(({ trace }) => trace.metadata.title).sort()).toEqual([
      'AAG live adapter redacted status',
      'Gmail live adapter redacted status',
      'Hermes live adapter redacted status',
      'OpenClaw live adapter redacted status',
      'Sentinel live adapter redacted status',
      'Side-effect intent live adapter redacted status',
      'Workspace live adapter redacted status',
    ].sort());
    expect(traces.every(({ trace }) => ['needs_approval', 'succeeded'].includes(trace.metadata.status))).toBe(true);
    for (const { trace } of traces) {
      expect(trace.events.some((event) => event.event_type === 'adapter.tick')).toBe(true);
      expect(trace.events.some((event) => event.event_type === 'adapter.redacted_boundary')).toBe(true);
      expect(trace.events.some((event) => event.event_type === 'run.completed')).toBe(true);
      expect(trace.events.every((event) => event.run_id === trace.metadata.id)).toBe(true);
    }
    for (const { file, trace } of traces) {
      if (file === 'side-effect-intent-live-adapter.boundary.json') continue;
      expect(trace.events.some((event) => event.event_type === 'health.check')).toBe(true);
    }

    const sideEffectTrace = traces.find(({ file }) => file === 'side-effect-intent-live-adapter.boundary.json')?.trace;
    expect(sideEffectTrace).toBeDefined();
    expect(sideEffectTrace?.metadata.status).toBe('needs_approval');
    expect(sideEffectTrace?.events.map((event) => event.event_type)).toEqual([
      'adapter.tick',
      'tool.requested',
      'aag.decision',
      'approval.required',
      'adapter.redacted_boundary',
      'run.completed',
    ]);
    expect(sideEffectTrace?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event_type: 'tool.requested',
          risk: 'medium',
          status: 'needs_approval',
          tool: 'redacted-side-effect-intent-counter',
          summary: expect.stringContaining('2 category bucket(s)'),
        }),
        expect.objectContaining({
          event_type: 'aag.decision',
          decision: 'side_effects_require_approval',
          risk: 'high',
          status: 'needs_approval',
        }),
        expect.objectContaining({
          event_type: 'approval.required',
          decision: 'approval_required',
          risk: 'high',
          status: 'needs_approval',
          summary: expect.stringContaining('AAG kept'),
        }),
      ])
    );

    await rm(aiStackRoot, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });

  it('updates a redacted latest marker and prunes older service live adapter packs', async () => {
    const aiStackRoot = await createAiStackFixture();
    const outputRoot = await tempPath('service-live-adapters-output-root');
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
      '--ai-stack-root',
      aiStackRoot,
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

    await expect(readdir(outputRoot).then((entries) => entries.sort())).resolves.toEqual([
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
    expect(rawLatest).not.toContain(aiStackRoot);
    expect(rawLatest).not.toContain(outputRoot);

    await rm(aiStackRoot, { recursive: true, force: true });
    await rm(outputRoot, { recursive: true, force: true });
  });
});
