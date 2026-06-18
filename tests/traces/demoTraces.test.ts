import { describe, expect, it } from 'vitest';
import { BOUNDARY_DEMO_TRACES, DEMO_TRACES } from '@/constants/demoTraces';
import { boundaryEventsToNodeTrace } from '@/core/traces/boundary';
import { traceToGraph } from '@/core/traces/toGraph';
import {
  BOUNDARY_TRACE_SCHEMA_VERSION,
  TRACE_EVENT_TYPES,
  TRACE_RISKS,
  TRACE_SOURCES,
  TRACE_STATUSES,
} from '@/core/traces/types';

const ALLOWED_SOURCES = new Set<string>(TRACE_SOURCES);
const ALLOWED_STATUSES = new Set<string>(TRACE_STATUSES);
const ALLOWED_RISKS = new Set<string>(TRACE_RISKS);
const ALLOWED_EVENT_TYPES = new Set<string>(TRACE_EVENT_TYPES);

function stringifyTraceData(value: unknown): string {
  return JSON.stringify(value);
}

describe('DEMO_TRACES', () => {
  it('provides the v0.1 redacted Node Observer demo scenarios', () => {
    expect(DEMO_TRACES.map((trace) => trace.id)).toEqual([
      'trace-hermes-aag-gmail-draft',
      'trace-hermes-openclaw-worker',
      'trace-aag-google-workspace-bundle',
      'trace-sentinel-failure-recovery',
    ]);
  });

  it('ships every demo trace as a supported v0.1.2 Boundary bundle', () => {
    for (const fixture of BOUNDARY_DEMO_TRACES) {
      expect(fixture.schema_version).toBe(BOUNDARY_TRACE_SCHEMA_VERSION);
      expect(fixture.metadata.id).toMatch(/^trace-/);
      expect(fixture.events.length).toBeGreaterThan(0);
    }
  });

  it('uses unique trace_ids and valid parent references', () => {
    for (const fixture of BOUNDARY_DEMO_TRACES) {
      const ids = new Set(fixture.events.map((event) => event.trace_id));
      expect(ids.size).toBe(fixture.events.length);
      expect(fixture.events.filter((event) => !event.parent_event_id)).toHaveLength(1);

      for (const event of fixture.events) {
        if (event.parent_event_id) expect(ids.has(event.parent_event_id)).toBe(true);
      }
    }
  });

  it('has exactly one root event per run', () => {
    for (const fixture of BOUNDARY_DEMO_TRACES) {
      const runs = new Map<string, number>();

      for (const event of fixture.events) {
        if (!event.parent_event_id) {
          runs.set(event.run_id, (runs.get(event.run_id) ?? 0) + 1);
        }
      }

      for (const rootCount of runs.values()) {
        expect(rootCount).toBe(1);
      }
    }
  });

  it('uses only allowed source, event type, status, and risk values', () => {
    for (const fixture of BOUNDARY_DEMO_TRACES) {
      for (const event of fixture.events) {
        expect(ALLOWED_SOURCES.has(event.source)).toBe(true);
        expect(ALLOWED_EVENT_TYPES.has(event.event_type)).toBe(true);
        expect(ALLOWED_STATUSES.has(event.status)).toBe(true);
        if (event.risk) expect(ALLOWED_RISKS.has(event.risk)).toBe(true);
      }
    }
  });

  it('keeps demo data redacted and free of obvious secret/provider/private-url patterns', () => {
    const serialized = stringifyTraceData(BOUNDARY_DEMO_TRACES);
    const forbiddenPatterns = [
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
      /\b(?:bearer|oauth|api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|session[_-]?cookie)\b/i,
      /sk-[A-Za-z0-9_-]{12,}/,
      /xox[baprs]-[A-Za-z0-9-]{10,}/,
      /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
      /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|[^/\s]+\.local)\b/i,
      /\b(?:openai|anthropic|google|gemini|claude|gpt)[/:][A-Za-z0-9._-]+\b/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(serialized).not.toMatch(pattern);
    }
  });

  it('can render every demo trace as a graph', () => {
    for (const trace of DEMO_TRACES) {
      const graph = traceToGraph(trace);
      expect(graph.rootNode.label).toMatch(/HERMES|OPENCLAW|AAG|SENTINEL/);
      expect(graph.metadata.nodeCount).toBe(trace.events.length);
      expect(graph.model.displayName).toBe('AI Node Trace');
    }
  });

  it('converts Boundary JSON into normalized NodeTrace graph data', () => {
    const fixture = BOUNDARY_DEMO_TRACES[0];
    const trace = boundaryEventsToNodeTrace(fixture.events, fixture.metadata);
    const graph = traceToGraph(trace);

    expect(trace.events[0].id).toBe(fixture.events[0].trace_id);
    expect(trace.events[0].eventType).toBe(fixture.events[0].event_type);
    expect(graph.id).toBe('trace-hermes-aag-gmail-draft');
    expect(graph.rootNode.children[0].children[0].metadata?.redacted_payload_hash).toBe(
      'sha256:redacted-gmail-draft'
    );
  });
});
