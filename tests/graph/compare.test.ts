import { describe, expect, it } from 'vitest';
import { DEMO_GRAPH } from '@/constants/demoGraph';
import { compareGraphs } from '@/core/graph/compare';
import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';

const node = (
  id: string,
  type: ReasoningNode['type'],
  summary: string,
  confidence: number | undefined,
  children: ReasoningNode[] = []
): ReasoningNode => ({
  id,
  type,
  summary,
  content: `${summary} content`,
  children,
  depth: 0,
  tokenCount: 12,
  confidence,
  timestamp: 0,
});

const comparisonGraph: ReasoningGraph = {
  id: 'comparison-run',
  prompt: DEMO_GRAPH.prompt,
  model: {
    provider: 'openai',
    model: 'o3-demo',
    displayName: 'OpenAI o3 demo',
  },
  rootNode: node('c1', 'hypothesis', 'Start with the goat', 0.6, [
    node('c2', 'analysis', 'Enumerate unsafe bank states', 0.7, [
      node('c3', 'evidence', 'Boat capacity is one item', 0.75),
      node('c4', 'decision', 'Use the return-trip sequence', 0.92),
    ]),
  ]),
  metadata: {
    totalTokens: 820,
    reasoningTokens: 700,
    outputTokens: 120,
    maxDepth: 2,
    branchCount: 2,
    nodeCount: 4,
    timeToComplete: 3900,
  },
  createdAt: 1,
};

describe('graph comparison', () => {
  it('compares graph-level metrics and type distributions', () => {
    const comparison = compareGraphs(DEMO_GRAPH, comparisonGraph);

    expect(comparison.primary.id).toBe('demo-river-crossing');
    expect(comparison.secondary.id).toBe('comparison-run');
    expect(comparison.samePrompt).toBe(true);

    expect(comparison.metrics.map((metric) => [metric.id, metric.delta])).toEqual([
      ['nodes', 4],
      ['depth', 1],
      ['branches', 1],
      ['tokens', 600],
      ['avg_confidence', 0.11],
    ]);

    expect(comparison.typeDeltas.find((delta) => delta.type === 'revision')).toMatchObject({
      primaryCount: 1,
      secondaryCount: 0,
      delta: 1,
    });
    expect(comparison.typeDeltas.find((delta) => delta.type === 'decision')).toMatchObject({
      primaryCount: 1,
      secondaryCount: 1,
      delta: 0,
    });
  });

  it('surfaces the strongest metric differences first', () => {
    const comparison = compareGraphs(DEMO_GRAPH, comparisonGraph);

    expect(comparison.highlights.slice(0, 3)).toEqual([
      {
        metricId: 'tokens',
        label: 'Total tokens',
        summary: 'Claude Sonnet 4 (demo) uses 600 more total tokens than OpenAI o3 demo.',
      },
      {
        metricId: 'nodes',
        label: 'Nodes',
        summary: 'Claude Sonnet 4 (demo) has 4 more nodes than OpenAI o3 demo.',
      },
      {
        metricId: 'depth',
        label: 'Max depth',
        summary: 'Claude Sonnet 4 (demo) is 1 level deeper than OpenAI o3 demo.',
      },
    ]);
  });
});
