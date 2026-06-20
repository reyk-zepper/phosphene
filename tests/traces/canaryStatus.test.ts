import { describe, expect, it } from 'vitest';
import {
  createCanaryStatusDisplayState,
  loadCanaryStatus,
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
});

describe('createCanaryStatusDisplayState', () => {
  it('describes an available canary without implying live telemetry', async () => {
    const result = await loadCanaryStatus(async () => jsonResponse(validLatest));

    const display = createCanaryStatusDisplayState(result);

    expect(display.status).toBe('available');
    expect(display.statusLabel).toBe('succeeded');
    expect(display.role).toBe('status');
    expect(display.summary).toBe('AI Node canary succeeded at 2026-06-20T22:35:00.070Z.');
    expect(display.meta).toEqual([
      { label: 'Latest pack', value: 'ai-node-canary-20260620T223459Z' },
      { label: 'Manifest hash', value: 'sha256:6a6e49eb...' },
      { label: 'Retention', value: '48 packs' },
      { label: 'Telemetry', value: 'No live telemetry' },
    ]);
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
