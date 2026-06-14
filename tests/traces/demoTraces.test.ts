import { describe, expect, it } from 'vitest';
import { DEMO_TRACES } from '@/constants/demoTraces';
import { traceToGraph } from '@/core/traces/toGraph';

describe('DEMO_TRACES', () => {
  it('provides the first AI-node observer samples', () => {
    expect(DEMO_TRACES.map((trace) => trace.id)).toEqual([
      'trace-hermes-aag-workspace',
      'trace-openclaw-worker',
      'trace-sentinel-recovery',
    ]);
  });

  it('uses unique event ids and valid parent references', () => {
    for (const trace of DEMO_TRACES) {
      const ids = new Set(trace.events.map((event) => event.id));
      expect(ids.size).toBe(trace.events.length);
      expect(trace.events.filter((event) => !event.parentEventId)).toHaveLength(1);

      for (const event of trace.events) {
        if (event.parentEventId) expect(ids.has(event.parentEventId)).toBe(true);
      }
    }
  });

  it('can render every demo trace as a graph', () => {
    for (const trace of DEMO_TRACES) {
      const graph = traceToGraph(trace);
      expect(graph.rootNode.label).toMatch(/HERMES|OPENCLAW|SENTINEL/);
      expect(graph.metadata.nodeCount).toBe(trace.events.length);
    }
  });
});
