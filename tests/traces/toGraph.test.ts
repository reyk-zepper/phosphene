import { describe, expect, it } from 'vitest';
import { traceToGraph } from '@/core/traces/toGraph';
import type { NodeTrace } from '@/core/traces/types';

describe('traceToGraph', () => {
  it('converts a parent-linked node trace into a reasoning graph', () => {
    const trace: NodeTrace = {
      id: 'trace-hermes-aag',
      title: 'Hermes drafts a controlled email',
      subtitle: 'Hermes asks AAG to gate a Gmail draft',
      status: 'needs_approval',
      startedAt: '2026-06-14T10:00:00Z',
      events: [
        {
          id: 'evt-1',
          runId: 'run-1',
          source: 'hermes',
          eventType: 'run.started',
          actor: 'hermes',
          status: 'running',
          timestamp: '2026-06-14T10:00:00Z',
          summary: 'Hermes starts a Gmail draft workflow',
          detail: 'The user asked Hermes to prepare a reply without sending it.',
        },
        {
          id: 'evt-2',
          parentEventId: 'evt-1',
          runId: 'run-1',
          source: 'hermes',
          eventType: 'agent.plan',
          actor: 'hermes',
          status: 'running',
          timestamp: '2026-06-14T10:00:02Z',
          summary: 'Plan the draft before touching Gmail',
          detail: 'Hermes decides to create a draft and route the action through AAG.',
        },
        {
          id: 'evt-3',
          parentEventId: 'evt-2',
          runId: 'run-1',
          source: 'aag',
          eventType: 'aag.decision',
          actor: 'aag',
          tool: 'gmail.draft.create',
          decision: 'require_approval',
          risk: 'medium',
          status: 'needs_approval',
          timestamp: '2026-06-14T10:00:05Z',
          summary: 'AAG requires approval for the Gmail draft',
          detail: 'The action is queued with a redacted payload hash.',
          redactedPayloadHash: 'sha256:abc123',
        },
      ],
    };

    const graph = traceToGraph(trace);

    expect(graph.id).toBe('trace-hermes-aag');
    expect(graph.prompt).toBe('Hermes drafts a controlled email');
    expect(graph.rootNode.label).toBe('HERMES RUN');
    expect(graph.rootNode.children[0].label).toBe('HERMES PLAN');
    expect(graph.rootNode.children[0].children[0].label).toBe('AAG GATE');
    expect(graph.rootNode.children[0].children[0].content).toContain('require_approval');
    expect(graph.metadata.nodeCount).toBe(3);
    expect(graph.metadata.maxDepth).toBe(2);
  });

  it('rejects traces without a root event', () => {
    const trace: NodeTrace = {
      id: 'broken',
      title: 'Broken trace',
      status: 'failed',
      startedAt: '2026-06-14T10:00:00Z',
      events: [
        {
          id: 'evt-orphan',
          parentEventId: 'missing',
          runId: 'run-1',
          source: 'openclaw',
          eventType: 'worker.started',
          status: 'running',
          timestamp: '2026-06-14T10:00:00Z',
          summary: 'Orphan worker event',
          detail: 'This event points to a missing parent.',
        },
      ],
    };

    expect(() => traceToGraph(trace)).toThrow('Trace must contain exactly one root event');
  });
});
