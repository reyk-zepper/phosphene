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

async function createAagStatusFixture(): Promise<string> {
  const statusDir = await tempPath('aag-status');
  const statusFile = path.join(statusDir, 'aag-live-status.env');
  await writeFile(statusFile, [
    'STATUS=ok',
    'REASON=all_checks_passed',
    'DETAIL=none',
    'AAG_HEALTH=ok',
    'MCP_SERVER=server_everything',
    'MCP_TOOL_COUNT=13',
    'HERMES_MCP_ENABLED=true',
    'HERMES_MCP_TOOL_COUNT=13',
    'AUDIT_SMOKE=skipped_interval',
    'AUDIT_ACTION_ID=act_667f684f1e5a432f871ef48337283d0e',
    'BASE_URL=http://127.0.0.1:8787',
    'CHECKED_AT=2026-06-22T14:16:31Z',
    '',
  ].join('\n'));
  return statusFile;
}

describe('generate-ai-node-canary-snapshot CLI', () => {
  it('writes a redacted operational canary Boundary pack that passes validation', async () => {
    const serviceDir = await createServiceFixture();
    const aagStatusFile = await createAagStatusFixture();
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
      '--aag-status-file',
      aagStatusFile,
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
    expect(trace.events).toHaveLength(6);
    expect(trace.events.every((event) => event.run_id === trace.metadata.id)).toBe(true);
    expect(trace.events.some((event) => event.event_type === 'health.check')).toBe(true);
    expect(trace.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        trace_id: 'evt-canary-aag-live-sentinel',
        tool: 'aag-live-sentinel-status-reader',
        decision: 'aag_live_ok',
        summary: 'AAG live sentinel reported ok with 13 governed MCP tools and Hermes route enabled.',
      }),
    ]));
    expect(trace.events.every((event) => !('event_id' in event) && !('type' in event))).toBe(true);
    expect(trace.events.flatMap((event) => event.links ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: 'trace://ai-node-canary/phosphene-service' }),
    ]));

    await rm(serviceDir, { recursive: true, force: true });
    await rm(path.dirname(aagStatusFile), { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });

  it('updates a redacted latest marker and prunes older canary packs', async () => {
    const serviceDir = await createServiceFixture();
    const aagStatusFile = await createAagStatusFixture();
    const outputRoot = await tempPath('canary-output-root');
    const oldPack = path.join(outputRoot, 'ai-node-canary-20260620T210000Z');
    const retainedPack = path.join(outputRoot, 'ai-node-canary-20260620T220000Z');
    const targetDir = path.join(outputRoot, 'ai-node-canary-20260620T230000Z');
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
      '2026-06-20T23:00:00Z',
      '--service-http-code',
      '200',
      '--latest-file',
      latestFile,
      '--retention-count',
      '2',
      '--aag-status-file',
      aagStatusFile,
    ], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    await expect(readdir(outputRoot)).resolves.toEqual([
      'ai-node-canary-20260620T220000Z',
      'ai-node-canary-20260620T230000Z',
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
      canary_status: string;
      manifest_file: string;
      manifest_sha256: string;
      retention_count: number;
      aag_live: {
        status: string;
        health: string;
        mcp_tool_count: number;
        hermes_mcp_enabled: boolean;
        hermes_mcp_tool_count: number;
        audit_smoke: string;
        checked_at: string;
      };
    };

    expect(latest).toEqual({
      schema_version: 'phosphene.boundary.v0.1.2',
      updated_at: '2026-06-20T23:00:00Z',
      source_agent: 'ai_node_canary',
      data_classification: 'redacted_operational_canary',
      latest_pack: 'ai-node-canary-20260620T230000Z',
      canary_status: 'succeeded',
      manifest_file: 'ai-node-canary-20260620T230000Z/manifest.json',
      manifest_sha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      retention_count: 2,
      aag_live: {
        status: 'ok',
        health: 'ok',
        mcp_tool_count: 13,
        hermes_mcp_enabled: true,
        hermes_mcp_tool_count: 13,
        audit_smoke: 'skipped_interval',
        checked_at: '2026-06-22T14:16:31Z',
      },
    });
    expect(rawLatest).not.toContain(outputRoot);
    expect(rawLatest).not.toContain(serviceDir);
    expect(rawLatest).not.toContain('BASE_URL');
    expect(rawLatest).not.toContain('AUDIT_ACTION_ID');
    expect(rawLatest).not.toContain('127.0.0.1');
    expect(rawLatest).not.toContain('act_667f684f1e5a432f871ef48337283d0e');

    await rm(serviceDir, { recursive: true, force: true });
    await rm(path.dirname(aagStatusFile), { recursive: true, force: true });
    await rm(outputRoot, { recursive: true, force: true });
  });
});
