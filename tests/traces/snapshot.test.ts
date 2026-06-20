import { describe, expect, it } from 'vitest';
import { createPublishedSnapshotDisplayState, loadPublishedSnapshot } from '@/core/traces/snapshot';
import { BOUNDARY_TRACE_SCHEMA_VERSION } from '@/core/traces/types';

const manifest = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  source_agent: 'hermes',
  data_classification: 'synthetic_redacted',
  files: [
    {
      file: 'published.synthetic.json',
      description: 'Published snapshot trace',
    },
  ],
  import_contract: 'phosphene.boundary.v0.1.2-importable',
};

const validTrace = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  metadata: {
    id: 'published-snapshot-run',
    title: 'Published snapshot run',
    status: 'succeeded',
  },
  events: [
    {
      trace_id: 'published-1',
      run_id: 'published-run',
      source: 'hermes',
      event_type: 'run.started',
      actor: 'hermes',
      status: 'running',
      timestamp: '2026-06-19T11:00:00Z',
      summary: 'Hermes starts a published snapshot trace',
      parent_event_id: null,
    },
    {
      trace_id: 'published-2',
      run_id: 'published-run',
      source: 'aag',
      event_type: 'run.completed',
      actor: 'aag',
      status: 'succeeded',
      timestamp: '2026-06-19T11:00:05Z',
      summary: 'Published snapshot trace completes',
      parent_event_id: 'published-1',
    },
  ],
};

const validationReport = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  overall_status: 'passed',
  data_source: 'synthetic_files_only_no_live_reads',
  trace_results: [{ file: 'published.synthetic.json', status: 'passed' }],
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

describe('loadPublishedSnapshot', () => {
  it('loads a published manifest, support report, and trace bundle', async () => {
    const responses = new Map<string, Response>([
      ['/snapshots/current/manifest.json', jsonResponse(manifest)],
      ['/snapshots/current/published.synthetic.json', jsonResponse(validTrace)],
      ['/snapshots/current/validation-report.json', jsonResponse(validationReport)],
    ]);
    const fetcher = async (url: string | URL | Request) => {
      const response = responses.get(String(url));
      return response ?? textResponse('missing', 404);
    };

    const result = await loadPublishedSnapshot(fetcher);

    expect(result.status).toBe('available');
    expect(result.traces.map((trace) => trace.id)).toEqual(['published-snapshot-run']);
    expect(result.intakeResult?.summary).toMatchObject({
      acceptedTraceCount: 1,
      blockedTraceCount: 0,
      supportFileCount: 2,
    });
  });

  it('returns unavailable when the manifest is missing', async () => {
    const result = await loadPublishedSnapshot(async () => textResponse('missing', 404));

    expect(result.status).toBe('unavailable');
    expect(result.traces).toEqual([]);
    expect(result.errors[0]).toContain('manifest unavailable');
  });

  it('returns blocked when the snapshot manifest points at an invalid trace', async () => {
    const invalidTrace = {
      ...validTrace,
      events: [
        validTrace.events[0],
        {
          ...validTrace.events[1],
          source: 'private-provider',
        },
      ],
    };
    const responses = new Map<string, Response>([
      ['/snapshots/current/manifest.json', jsonResponse(manifest)],
      ['/snapshots/current/published.synthetic.json', jsonResponse(invalidTrace)],
      ['/snapshots/current/validation-report.json', textResponse('missing', 404)],
    ]);
    const fetcher = async (url: string | URL | Request) => responses.get(String(url)) ?? textResponse('missing', 404);

    const result = await loadPublishedSnapshot(fetcher);

    expect(result.status).toBe('blocked');
    expect(result.traces).toEqual([]);
    expect(result.intakeResult?.summary.blockedTraceCount).toBe(1);
    expect(result.errors).toContain('published.synthetic.json: events[1].source must be one of: hermes, openclaw, aag, sentinel');
  });
});

describe('createPublishedSnapshotDisplayState', () => {
  it('describes the loading state without implying live telemetry', () => {
    const display = createPublishedSnapshotDisplayState(undefined, '/snapshots/current');

    expect(display.status).toBe('checking');
    expect(display.statusLabel).toBe('checking');
    expect(display.role).toBe('status');
    expect(display.summary).toBe('Checking /snapshots/current for a redacted Boundary snapshot.');
    expect(display.meta).toContainEqual({ label: 'Telemetry', value: 'No live telemetry' });
  });

  it('summarizes an available snapshot from manifest and validation metadata', async () => {
    const responses = new Map<string, Response>([
      ['/snapshots/current/manifest.json', jsonResponse(manifest)],
      ['/snapshots/current/published.synthetic.json', jsonResponse(validTrace)],
      ['/snapshots/current/validation-report.json', jsonResponse(validationReport)],
    ]);
    const fetcher = async (url: string | URL | Request) => responses.get(String(url)) ?? textResponse('missing', 404);
    const result = await loadPublishedSnapshot(fetcher);

    const display = createPublishedSnapshotDisplayState(result);

    expect(display.status).toBe('available');
    expect(display.statusLabel).toBe('ready');
    expect(display.role).toBe('status');
    expect(display.summary).toBe('1 redacted trace loaded from /snapshots/current.');
    expect(display.meta).toEqual([
      { label: 'Source', value: 'hermes' },
      { label: 'Classification', value: 'synthetic_redacted' },
      { label: 'Manifest files', value: '1' },
      { label: 'Validation', value: 'passed' },
      { label: 'Telemetry', value: 'No live telemetry' },
    ]);
  });

  it('surfaces blocked snapshot errors as an alert state', async () => {
    const invalidTrace = {
      ...validTrace,
      events: [
        validTrace.events[0],
        {
          ...validTrace.events[1],
          source: 'private-provider',
        },
      ],
    };
    const responses = new Map<string, Response>([
      ['/snapshots/current/manifest.json', jsonResponse(manifest)],
      ['/snapshots/current/published.synthetic.json', jsonResponse(invalidTrace)],
      ['/snapshots/current/validation-report.json', textResponse('missing', 404)],
    ]);
    const fetcher = async (url: string | URL | Request) => responses.get(String(url)) ?? textResponse('missing', 404);
    const result = await loadPublishedSnapshot(fetcher);

    const display = createPublishedSnapshotDisplayState(result);

    expect(display.status).toBe('blocked');
    expect(display.statusLabel).toBe('blocked');
    expect(display.role).toBe('alert');
    expect(display.summary).toBe('Snapshot blocked. Static demo traces remain available.');
    expect(display.errors[0]).toContain('events[1].source');
  });
});
