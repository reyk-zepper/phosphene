import { describe, expect, it } from 'vitest';
import { validateBoundaryTraceJson } from '@/core/traces/boundaryValidation';
import { BOUNDARY_TRACE_SCHEMA_VERSION } from '@/core/traces/types';

const validBundle = {
  schema_version: BOUNDARY_TRACE_SCHEMA_VERSION,
  metadata: {
    id: 'boundary-validation-demo',
    title: 'Boundary Validation Demo',
    status: 'succeeded',
  },
  events: [
    {
      trace_id: 'validation-1',
      run_id: 'run-validation-demo',
      source: 'hermes',
      event_type: 'run.started',
      actor: 'hermes',
      status: 'running',
      timestamp: '2026-06-18T12:00:00Z',
      summary: 'Hermes starts a synthetic validation trace',
      parent_event_id: null,
    },
    {
      trace_id: 'validation-2',
      run_id: 'run-validation-demo',
      source: 'aag',
      event_type: 'aag.decision',
      actor: 'aag',
      tool: 'synthetic.action.preview',
      decision: 'allow_demo',
      risk: 'low',
      status: 'succeeded',
      timestamp: '2026-06-18T12:00:03Z',
      summary: 'AAG records a redacted validation decision',
      redacted_payload_hash: 'sha256:redacted-validation-demo',
      parent_event_id: 'validation-1',
      links: [{ label: 'Evidence', href: 'trace://validation-demo' }],
    },
  ],
};

describe('validateBoundaryTraceJson', () => {
  it('returns structured passing checks for a valid Boundary bundle', () => {
    const result = validateBoundaryTraceJson(JSON.stringify(validBundle), 'valid.json');

    expect(result.ok).toBe(true);
    expect(result.checks.map((check) => [check.id, check.status])).toEqual([
      ['json', 'passed'],
      ['schema_version', 'passed'],
      ['shape', 'passed'],
      ['enums', 'passed'],
      ['graph', 'passed'],
      ['redaction', 'passed'],
    ]);
    expect(result.bundle?.metadata.id).toBe('boundary-validation-demo');
  });

  it('rejects string-array links with a shape failure', () => {
    const broken = {
      ...validBundle,
      events: [
        validBundle.events[0],
        {
          ...validBundle.events[1],
          links: ['trace://bad-link-shape'],
        },
      ],
    };

    const result = validateBoundaryTraceJson(JSON.stringify(broken), 'bad-links.json');

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.id === 'shape')?.status).toBe('failed');
    expect(result.errors).toContain('events[1].links[0] must be an object');
  });

  it('rejects unsupported schema versions', () => {
    const result = validateBoundaryTraceJson(
      JSON.stringify({ ...validBundle, schema_version: 'phosphene.boundary.v9.9.9' }),
      'future.json'
    );

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.id === 'schema_version')?.status).toBe('failed');
    expect(result.errors).toContain('schema_version must be phosphene.boundary.v0.1.2');
  });

  it('rejects missing parents through graph validation', () => {
    const broken = {
      ...validBundle,
      events: [
        validBundle.events[0],
        {
          ...validBundle.events[1],
          parent_event_id: 'missing-event',
        },
      ],
    };

    const result = validateBoundaryTraceJson(JSON.stringify(broken), 'missing-parent.json');

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.id === 'graph')?.status).toBe('failed');
    expect(result.errors).toContain('events[1].parent_event_id references missing event: missing-event');
  });

  it('rejects private URLs through redaction validation', () => {
    const broken = {
      ...validBundle,
      events: [
        {
          ...validBundle.events[0],
          links: [{ label: 'Private URL', href: 'http://192.168.1.10/private' }],
        },
      ],
    };

    const result = validateBoundaryTraceJson(JSON.stringify(broken), 'private-url.json');

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.id === 'redaction')?.status).toBe('failed');
    expect(result.errors).toContain('Trace data contains forbidden sensitive pattern: private_url');
  });
});
