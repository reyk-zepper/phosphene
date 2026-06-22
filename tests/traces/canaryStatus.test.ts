import { describe, expect, it } from 'vitest';
import {
  createCanaryStatusDisplayState,
  loadCanaryStatus,
  startCanaryStatusRefresh,
} from '@/core/traces/canaryStatus';
import { BOUNDARY_TRACE_SCHEMA_VERSION } from '@/core/traces/types';

const validLatest = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  updated_at: '2026-06-20T22:35:00.070Z',
  source_agent: 'ai_node_canary',
  data_classification: 'redacted_operational_canary',
  latest_pack: 'ai-node-canary-20260620T223459Z',
  canary_status: 'succeeded',
  manifest_file: 'ai-node-canary-20260620T223459Z/manifest.json',
  manifest_sha256: 'sha256:6a6e49ebecec000fc07dcd3da5631ed792ce5439381fa763623ffdcb767a340a',
  retention_count: 48,
  aag_live: {
    status: 'ok',
    health: 'ok',
    mcp_tool_count: 13,
    hermes_mcp_enabled: true,
    hermes_mcp_tool_count: 13,
    audit_smoke: 'skipped_interval',
    checked_at: '2026-06-22T14:16:31Z',
  },
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(value: string, status = 200): Response {
  return new Response(value, { status });
}

describe('loadCanaryStatus', () => {
  it('loads the redacted AI Node canary latest marker from the served status path', async () => {
    const fetcher = async (url: string | URL | Request) => (
      String(url) === '/snapshots/canary/latest.json'
        ? jsonResponse(validLatest)
        : textResponse('missing', 404)
    );

    const result = await loadCanaryStatus(fetcher);

    expect(result.status).toBe('available');
    expect(result.basePath).toBe('/snapshots/canary');
    expect(result.marker).toMatchObject({
      latestPack: 'ai-node-canary-20260620T223459Z',
      canaryStatus: 'succeeded',
      retentionCount: 48,
      aagLive: {
        status: 'ok',
        health: 'ok',
        mcpToolCount: 13,
        hermesMcpEnabled: true,
        hermesMcpToolCount: 13,
        auditSmoke: 'skipped_interval',
        checkedAt: '2026-06-22T14:16:31Z',
      },
    });
    expect(result.errors).toEqual([]);
  });

  it('returns unavailable when the served latest marker is absent', async () => {
    const result = await loadCanaryStatus(async () => textResponse('missing', 404));

    expect(result.status).toBe('unavailable');
    expect(result.marker).toBeUndefined();
    expect(result.errors[0]).toContain('latest marker unavailable');
  });

  it('returns unavailable when a static app fallback serves HTML for the marker path', async () => {
    const result = await loadCanaryStatus(async () => (
      new Response('<!doctype html><html><body>app shell</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    ));

    expect(result.status).toBe('unavailable');
    expect(result.marker).toBeUndefined();
    expect(result.errors[0]).toContain('latest marker unavailable');
  });

  it('blocks latest markers that expose private paths or URLs', async () => {
    const result = await loadCanaryStatus(async () => jsonResponse({
      ...validLatest,
      manifest_file: '/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/ai-node-canary-20260620T223459Z/manifest.json',
    }));

    expect(result.status).toBe('blocked');
    expect(result.marker).toBeUndefined();
    expect(result.errors).toContain('latest.json: manifest_file must be a relative canary manifest reference');
  });

  it('blocks AAG live markers that expose raw endpoint details', async () => {
    const result = await loadCanaryStatus(async () => jsonResponse({
      ...validLatest,
      aag_live: {
        ...validLatest.aag_live,
        base_url: 'http://127.0.0.1:8787',
      },
    }));

    expect(result.status).toBe('blocked');
    expect(result.marker).toBeUndefined();
    expect(result.errors).toContain('latest.json: aag_live must only contain redacted status fields');
  });
});

describe('createCanaryStatusDisplayState', () => {
  it('describes an available canary without implying live telemetry', async () => {
    const result = await loadCanaryStatus(async () => jsonResponse(validLatest));

    const display = createCanaryStatusDisplayState(
      result,
      '/snapshots/canary',
      new Date('2026-06-20T22:40:00.000Z')
    );

    expect(display.status).toBe('available');
    expect(display.statusLabel).toBe('succeeded');
    expect(display.freshness).toBe('fresh');
    expect(display.role).toBe('status');
    expect(display.summary).toBe('AI Node canary succeeded at 2026-06-20T22:35:00.070Z.');
    expect(display.meta).toEqual([
      { label: 'Freshness', value: 'Fresh' },
      { label: 'Age', value: '4m' },
      { label: 'AAG', value: 'ok' },
      { label: 'AAG tools', value: '13 / 13' },
      { label: 'Hermes route', value: 'enabled' },
      { label: 'Audit smoke', value: 'skipped_interval' },
      { label: 'Latest pack', value: 'ai-node-canary-20260620T223459Z' },
      { label: 'Manifest hash', value: 'sha256:6a6e49eb...' },
      { label: 'Retention', value: '48 packs' },
      { label: 'Telemetry', value: 'No live telemetry' },
    ]);
  });

  it('marks an old canary marker as stale without treating it as live telemetry', async () => {
    const result = await loadCanaryStatus(async () => jsonResponse(validLatest));

    const display = createCanaryStatusDisplayState(
      result,
      '/snapshots/canary',
      new Date('2026-06-20T23:20:00.000Z')
    );

    expect(display.status).toBe('available');
    expect(display.statusLabel).toBe('stale');
    expect(display.freshness).toBe('stale');
    expect(display.role).toBe('alert');
    expect(display.summary).toBe('AI Node canary marker is stale; last succeeded at 2026-06-20T22:35:00.070Z.');
    expect(display.meta).toEqual(expect.arrayContaining([
      { label: 'Freshness', value: 'Stale' },
      { label: 'Age', value: '44m' },
      { label: 'Canary', value: 'succeeded' },
      { label: 'Telemetry', value: 'No live telemetry' },
    ]));
  });

  it('surfaces blocked canary markers as an alert state', async () => {
    const result = await loadCanaryStatus(async () => jsonResponse({
      ...validLatest,
      latest_pack: 'https://private.example.local/canary',
    }));

    const display = createCanaryStatusDisplayState(result);

    expect(display.status).toBe('blocked');
    expect(display.statusLabel).toBe('blocked');
    expect(display.role).toBe('alert');
    expect(display.summary).toBe('AI Node canary marker blocked. Static demo traces remain available.');
    expect(display.errors[0]).toContain('latest_pack');
  });
});

describe('startCanaryStatusRefresh', () => {
  it('loads immediately, refreshes on the interval, and clears the timer on stop', async () => {
    const results = [
      { status: 'unavailable', basePath: '/snapshots/canary', errors: [], loadedAt: '2026-06-20T22:00:00Z' },
      { status: 'available', basePath: '/snapshots/canary', marker: {
        updatedAt: '2026-06-20T22:01:00Z',
        sourceAgent: 'ai_node_canary',
        dataClassification: 'redacted_operational_canary',
        latestPack: 'ai-node-canary-20260620T220100Z',
        canaryStatus: 'succeeded',
        manifestFile: 'ai-node-canary-20260620T220100Z/manifest.json',
        manifestSha256: 'sha256:6a6e49ebecec000fc07dcd3da5631ed792ce5439381fa763623ffdcb767a340a',
        retentionCount: 48,
      }, errors: [], loadedAt: '2026-06-20T22:01:00Z' },
    ] as const;
    const received: unknown[] = [];
    const intervals: Array<() => void> = [];
    const cleared: unknown[] = [];

    const stop = startCanaryStatusRefresh({
      refreshMs: 60_000,
      load: async () => results[Math.min(received.length, results.length - 1)],
      onResult: (result) => received.push(result),
      setIntervalFn: (callback, delay) => {
        expect(delay).toBe(60_000);
        intervals.push(callback);
        return 'timer-1';
      },
      clearIntervalFn: (handle) => {
        cleared.push(handle);
      },
    });

    await Promise.resolve();
    expect(received).toEqual([results[0]]);
    expect(intervals).toHaveLength(1);

    intervals[0]();
    await Promise.resolve();
    expect(received).toEqual([results[0], results[1]]);

    stop();
    expect(cleared).toEqual(['timer-1']);
  });
});
