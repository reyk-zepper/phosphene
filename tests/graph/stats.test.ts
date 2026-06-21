import { describe, expect, it } from 'vitest';
import { summarizeGraphStats } from '@/core/graph/stats';
import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';

const node = (
  id: string,
  type: ReasoningNode['type'],
  tokenCount: number,
  confidence: number | undefined,
  children: ReasoningNode[] = []
): ReasoningNode => ({
  id,
  type,
  summary: `${type} ${id}`,
  content: `${type} ${id} content`,
  children,
  depth: 0,
  tokenCount,
  confidence,
  timestamp: 0,
});

const graph: ReasoningGraph = {
  id: 'stats-demo',
  prompt: 'How should the model reason about a risky workflow?',
  model: {
    provider: 'anthropic',
    model: 'claude-demo',
    displayName: 'Claude demo',
  },
  rootNode: node('root', 'hypothesis', 10, 0.9, [
    node('analysis-heavy', 'analysis', 60, 0.45, [
      node('revision', 'revision', 20, undefined),
    ]),
    node('evidence', 'evidence', 30, 0.75),
  ]),
  metadata: {
    totalTokens: 140,
    reasoningTokens: 110,
    outputTokens: 30,
    maxDepth: 2,
    branchCount: 3,
    nodeCount: 4,
    timeToComplete: 6000,
  },
  createdAt: 1,
};

describe('graph stats', () => {
  it('summarizes core reasoning metrics and confidence coverage', () => {
    const stats = summarizeGraphStats(graph);

    expect(stats.overview).toEqual({
      totalTokens: 140,
      reasoningTokens: 110,
      outputTokens: 30,
      nodeCount: 4,
      maxDepth: 2,
      branchCount: 3,
      timeToComplete: 6000,
      averageConfidence: 0.7,
      confidenceCoverage: 0.75,
    });
  });

  it('builds heatmap-ready distributions from nodes', () => {
    const stats = summarizeGraphStats(graph);

    expect(stats.confidenceBands).toEqual([
      { id: 'high', label: 'High', nodeCount: 1, percentage: 0.25 },
      { id: 'medium', label: 'Medium', nodeCount: 1, percentage: 0.25 },
      { id: 'low', label: 'Low', nodeCount: 1, percentage: 0.25 },
      { id: 'unknown', label: 'Unknown', nodeCount: 1, percentage: 0.25 },
    ]);
    expect(stats.depthDistribution).toEqual([
      { depth: 0, nodeCount: 1, tokenCount: 10, percentageOfTokens: 0.08 },
      { depth: 1, nodeCount: 2, tokenCount: 90, percentageOfTokens: 0.75 },
      { depth: 2, nodeCount: 1, tokenCount: 20, percentageOfTokens: 0.17 },
    ]);
    expect(stats.typeBreakdown.map((item) => [item.type, item.nodeCount, item.tokenCount])).toEqual([
      ['hypothesis', 1, 10],
      ['analysis', 1, 60],
      ['evidence', 1, 30],
      ['revision', 1, 20],
    ]);
  });

  it('surfaces token hotspots in descending order', () => {
    const stats = summarizeGraphStats(graph);

    expect(stats.tokenHotspots.slice(0, 3)).toEqual([
      {
        id: 'analysis-heavy',
        type: 'analysis',
        summary: 'analysis analysis-heavy',
        tokenCount: 60,
        percentageOfGraphTokens: 0.5,
      },
      {
        id: 'evidence',
        type: 'evidence',
        summary: 'evidence evidence',
        tokenCount: 30,
        percentageOfGraphTokens: 0.25,
      },
      {
        id: 'revision',
        type: 'revision',
        summary: 'revision revision',
        tokenCount: 20,
        percentageOfGraphTokens: 0.17,
      },
    ]);
  });
});
