import { describe, expect, it } from 'vitest';
import { parseBoundaryTraceJson } from '@/core/traces/boundaryImport';
import { traceToGraph } from '@/core/traces/toGraph';
import { BOUNDARY_TRACE_SCHEMA_VERSION } from '@/core/traces/types';

const validBundle = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  metadata: {
    id: 'trace-imported-gmail-demo',
    title: 'Imported Gmail Draft Trace',
    subtitle: 'Uploaded redacted Boundary JSON',
    status: 'needs_approval',
  },
  events: [
    {
      trace_id: 'import-1',
      run_id: 'run-import-demo',
      source: 'hermes',
      event_type: 'run.started',
      actor: 'hermes',
      status: 'running',
      timestamp: '2026-06-17T20:00:00Z',
      summary: 'Hermes starts an imported demo trace',
      parent_event_id: null,
    },
    {
      trace_id: 'import-2',
      run_id: 'run-import-demo',
      source: 'aag',
      event_type: 'aag.decision',
      actor: 'aag',
      tool: 'gmail.draft.create',
      decision: 'require_approval',
      risk: 'medium',
      status: 'needs_approval',
      timestamp: '2026-06-17T20:00:05Z',
      summary: 'AAG gates the imported draft',
      redacted_payload_hash: 'sha256:redacted-imported-draft',
      parent_event_id: 'import-1',
      links: [{ label: 'Trace evidence', href: 'trace://imported-gmail-demo' }],
    },
  ],
};

describe('parseBoundaryTraceJson', () => {
  it('normalizes a bundled Boundary JSON trace into graph-ready data', () => {
    const result = parseBoundaryTraceJson(JSON.stringify(validBundle), 'upload.json');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.join('\n'));

    expect(result.trace.id).toBe('trace-imported-gmail-demo');
    expect(result.trace.schemaVersion).toBe(BOUNDARY_TRACE_SCHEMA_VERSION);
    expect(result.trace.title).toBe('Imported Gmail Draft Trace');
    expect(result.trace.events[1].redactedPayloadHash).toBe(
      'sha256:redacted-imported-draft'
    );

    const graph = traceToGraph(result.trace);
    expect(graph.metadata.nodeCount).toBe(2);
    expect(graph.rootNode.children[0].metadata?.redacted_payload_hash).toBe(
      'sha256:redacted-imported-draft'
    );
  });

  it('normalizes a raw event array using the file name as fallback metadata', () => {
    const result = parseBoundaryTraceJson(JSON.stringify(validBundle.events), 'worker-run.json');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.join('\n'));

    expect(result.trace.id).toBe('imported-worker-run');
    expect(result.trace.title).toBe('worker-run.json');
    expect(result.trace.status).toBe('needs_approval');
  });

  it('rejects bundled Boundary JSON without a schema_version', () => {
    const missingVersion = Object.fromEntries(
      Object.entries(validBundle).filter(([key]) => key !== 'schema_version')
    );
    const result = parseBoundaryTraceJson(JSON.stringify(missingVersion), 'missing-version.json');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected versionless bundle to fail');
    expect(result.errors).toContain('schema_version must be phosphene.boundary.v0.1.2');
  });

  it('rejects bundled Boundary JSON with an unsupported schema_version', () => {
    const result = parseBoundaryTraceJson(
      JSON.stringify({ ...validBundle, schema_version: 'phosphene.boundary.v9.9.9' }),
      'future-version.json'
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected unsupported schema version to fail');
    expect(result.errors).toContain('schema_version must be phosphene.boundary.v0.1.2');
  });

  it('reports parse errors for invalid JSON', () => {
    const result = parseBoundaryTraceJson('{not valid json', 'broken.json');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected invalid JSON to fail');
    expect(result.errors[0]).toContain('Invalid JSON');
  });

  it('rejects invalid enum values and broken parent references', () => {
    const broken = {
      metadata: {
        id: 'broken-trace',
        title: 'Broken Trace',
        status: 'succeeded',
      },
      events: [
        {
          trace_id: 'broken-1',
          run_id: 'broken-run',
          source: 'hermes',
          event_type: 'run.started',
          status: 'running',
          timestamp: '2026-06-17T20:00:00Z',
          summary: 'Root event',
          parent_event_id: null,
        },
        {
          trace_id: 'broken-2',
          run_id: 'broken-run',
          source: 'private-provider',
          event_type: 'tool.requested',
          status: 'done',
          timestamp: '2026-06-17T20:00:01Z',
          summary: 'Bad child event',
          parent_event_id: 'missing-parent',
        },
      ],
    };

    const result = parseBoundaryTraceJson(JSON.stringify(broken), 'broken.json');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected invalid trace to fail');
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'events[1].source must be one of: hermes, openclaw, aag, sentinel',
        'events[1].status must be one of: queued, running, needs_approval, approved, denied, succeeded, failed, recovered',
        'events[1].parent_event_id references missing event: missing-parent',
      ])
    );
  });

  it('rejects obvious secrets and private URLs in uploaded traces', () => {
    const leaked = {
      ...validBundle,
      events: [
        {
          ...validBundle.events[0],
          summary: 'Bearer token appears here',
          links: [{ label: 'Private URL', href: 'http://192.168.1.10/private' }],
        },
      ],
    };

    const result = parseBoundaryTraceJson(JSON.stringify(leaked), 'leaked.json');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected leaked trace to fail');
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Trace data contains forbidden sensitive pattern: token_or_secret_keyword',
        'Trace data contains forbidden sensitive pattern: private_url',
      ])
    );
  });
});
