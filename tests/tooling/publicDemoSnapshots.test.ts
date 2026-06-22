import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicSnapshotsRoot = resolve(process.cwd(), 'public/snapshots');

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

describe('public demo snapshot assets', () => {
  it('ships redacted canary and live-adapter markers for static public demos', () => {
    const canaryLatestPath = resolve(publicSnapshotsRoot, 'canary/latest.json');
    const liveLatestPath = resolve(publicSnapshotsRoot, 'live/latest.json');

    const canaryLatest = readJson(canaryLatestPath);
    const liveLatest = readJson(liveLatestPath);

    expect(canaryLatest.source_agent).toBe('ai_node_canary');
    expect(canaryLatest.data_classification).toBe('redacted_operational_canary');
    expect(canaryLatest.canary_status).toBe('succeeded');
    expect(canaryLatest.aag_live).toMatchObject({
      status: 'ok',
      mcp_tool_count: 13,
      hermes_mcp_enabled: true,
      hermes_mcp_tool_count: 13,
    });

    expect(liveLatest.source_agent).toBe('ai_node_live_adapter');
    expect(liveLatest.data_classification).toBe('redacted_live_adapter');
    expect(liveLatest.adapter_status).toBe('succeeded');

    const manifestPath = resolve(publicSnapshotsRoot, 'live', String(liveLatest.manifest_file));
    expect(statSync(manifestPath).isFile()).toBe(true);
  });
});
