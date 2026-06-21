import { describe, expect, it } from 'vitest';
import {
  createLiveAdapterDisplayState,
  loadLiveAdapterSnapshot,
} from '@/core/traces/liveAdapter';
import { BOUNDARY_TRACE_SCHEMA_VERSION } from '@/core/traces/types';

const latestMarker = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  updated_at: '2026-06-21T20:00:00.000Z',
  source_agent: 'ai_node_live_adapter',
  data_classification: 'redacted_live_adapter',
  latest_pack: 'ai-node-live-20260621T200000Z',
  adapter_status: 'succeeded',
  manifest_file: 'ai-node-live-20260621T200000Z/manifest.json',
  manifest_sha256: 'sha256:7a6e49ebecec000fc07dcd3da5631ed792ce5439381fa763623ffdcb767a340b',
  retention_count: 24,
};

const manifest = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  source_agent: 'ai_node_live_adapter',
  data_classification: 'redacted_live_adapter',
  files: [
    {
      file: 'live-adapter.boundary.json',
      description: 'Redacted near-live adapter Boundary trace.',
    },
  ],
  import_contract: 'phosphene.boundary.v0.1.2-importable',
  notes: 'Redacted adapter output only; no raw live telemetry.',
};

const trace = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  metadata: {
    id: 'ai-node-live-adapter-run',
    title: 'AI Node live adapter redacted run',
    subtitle: 'Adapter output boundary',
    status: 'succeeded',
  },
  events: [
    {
      trace_id: 'live-1',
      run_id: 'ai-node-live-adapter-run',
      source: 'sentinel',
      event_type: 'adapter.tick',
      actor: 'ai-node-live-adapter',
      status: 'running',
      timestamp: '2026-06-21T20:00:00.000Z',
      summary: 'Live adapter emitted a redacted heartbeat.',
      parent_event_id: null,
      redacted_payload_hash: 'sha256:redacted-live-adapter-heartbeat',
      links: [{ label: 'Adapter heartbeat', href: 'trace://ai-node-live/heartbeat' }],
    },
    {
      trace_id: 'live-2',
      run_id: 'ai-node-live-adapter-run',
      source: 'aag',
      event_type: 'adapter.redacted_boundary',
      actor: 'aag',
      status: 'succeeded',
      timestamp: '2026-06-21T20:00:02.000Z',
      summary: 'AAG boundary state was exposed only as redacted adapter metadata.',
      parent_event_id: 'live-1',
      redacted_payload_hash: 'sha256:redacted-aag-boundary-state',
    },
  ],
};

const validationReport = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  overall_status: 'passed',
  data_source: 'redacted_live_adapter_output',
  trace_results: [{ file: 'live-adapter.boundary.json', status: 'passed' }],
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

describe('loadLiveAdapterSnapshot', () => {
  it('loads a redacted near-live adapter marker, manifest, support report, and trace bundle', async () => {
    const responses = new Map<string, Response>([
      ['/snapshots/live/latest.json', jsonResponse(latestMarker)],
      ['/snapshots/live/ai-node-live-20260621T200000Z/manifest.json', jsonResponse(manifest)],
      ['/snapshots/live/ai-node-live-20260621T200000Z/live-adapter.boundary.json', jsonResponse(trace)],
      ['/snapshots/live/ai-node-live-20260621T200000Z/validation-report.json', jsonResponse(validationReport)],
    ]);
    const fetcher = async (url: string | URL | Request) => responses.get(String(url)) ?? textResponse('missing', 404);

    const result = await loadLiveAdapterSnapshot(fetcher);

    expect(result.status).toBe('available');
    expect(result.marker).toMatchObject({
      latestPack: 'ai-node-live-20260621T200000Z',
      adapterStatus: 'succeeded',
      retentionCount: 24,
    });
    expect(result.traces.map((item) => item.id)).toEqual(['ai-node-live-adapter-run']);
    expect(result.intakeResult?.summary).toMatchObject({
      acceptedTraceCount: 1,
      blockedTraceCount: 0,
      supportFileCount: 2,
    });
  });

  it('returns unavailable when the latest marker is absent', async () => {
    const result = await loadLiveAdapterSnapshot(async () => textResponse('missing', 404));

    expect(result.status).toBe('unavailable');
    expect(result.traces).toEqual([]);
    expect(result.errors[0]).toContain('latest marker unavailable');
  });

  it('blocks markers that expose private paths or invalid pack references', async () => {
    const result = await loadLiveAdapterSnapshot(async () =>
      jsonResponse({
        ...latestMarker,
        manifest_file:
          '/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-live/ai-node-live-20260621T200000Z/manifest.json',
      })
    );

    expect(result.status).toBe('blocked');
    expect(result.marker).toBeUndefined();
    expect(result.errors).toContain('latest.json: manifest_file must be a relative live adapter manifest reference');
  });

  it('blocks unsafe manifest-listed file paths before fetching trace files', async () => {
    const requests: string[] = [];
    const responses = new Map<string, Response>([
      ['/snapshots/live/latest.json', jsonResponse(latestMarker)],
      ['/snapshots/live/ai-node-live-20260621T200000Z/manifest.json', jsonResponse({
        ...manifest,
        files: [{ file: '../private.boundary.json' }],
      })],
    ]);
    const result = await loadLiveAdapterSnapshot(async (url: string | URL | Request) => {
      requests.push(String(url));
      return responses.get(String(url)) ?? textResponse('missing', 404);
    });

    expect(result.status).toBe('blocked');
    expect(result.errors).toContain('manifest.json: files[0].file must be a safe relative JSON file name');
    expect(requests).not.toContain('/snapshots/live/ai-node-live-20260621T200000Z/../private.boundary.json');
  });
});

describe('createLiveAdapterDisplayState', () => {
  it('describes an available adapter output without exposing raw live telemetry', async () => {
    const responses = new Map<string, Response>([
      ['/snapshots/live/latest.json', jsonResponse(latestMarker)],
      ['/snapshots/live/ai-node-live-20260621T200000Z/manifest.json', jsonResponse(manifest)],
      ['/snapshots/live/ai-node-live-20260621T200000Z/live-adapter.boundary.json', jsonResponse(trace)],
      ['/snapshots/live/ai-node-live-20260621T200000Z/validation-report.json', jsonResponse(validationReport)],
    ]);
    const result = await loadLiveAdapterSnapshot(async (url: string | URL | Request) =>
      responses.get(String(url)) ?? textResponse('missing', 404)
    );

    const display = createLiveAdapterDisplayState(
      result,
      '/snapshots/live',
      new Date('2026-06-21T20:05:00.000Z')
    );

    expect(display.status).toBe('available');
    expect(display.statusLabel).toBe('succeeded');
    expect(display.role).toBe('status');
    expect(display.summary).toBe('1 redacted near-live trace loaded from ai-node-live-20260621T200000Z.');
    expect(display.meta).toEqual([
      { label: 'Freshness', value: 'Fresh' },
      { label: 'Age', value: '5m' },
      { label: 'Latest pack', value: 'ai-node-live-20260621T200000Z' },
      { label: 'Manifest hash', value: 'sha256:7a6e49eb...' },
      { label: 'Retention', value: '24 packs' },
      { label: 'Telemetry', value: 'No raw live telemetry' },
    ]);
  });
});
