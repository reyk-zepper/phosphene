import { describe, expect, it } from 'vitest';
import {
  detectReasoningPatterns,
  REASONING_PATTERN_LIBRARY,
} from '@/core/graph/patterns';
import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';

const node = (
  id: string,
  type: ReasoningNode['type'],
  summary: string,
  children: ReasoningNode[] = [],
  confidence?: number
): ReasoningNode => ({
  id,
  type,
  summary,
  content: summary,
  children,
  depth: 0,
  tokenCount: 12,
  confidence,
  timestamp: 0,
});

const graph = (rootNode: ReasoningNode): ReasoningGraph => ({
  id: 'pattern-demo',
  prompt: 'How should an agent reason about a risky release?',
  model: {
    provider: 'anthropic',
    model: 'claude-demo',
    displayName: 'Claude demo',
  },
  rootNode,
  metadata: {
    totalTokens: 100,
    reasoningTokens: 90,
    outputTokens: 10,
    maxDepth: 3,
    branchCount: 5,
    nodeCount: 6,
    timeToComplete: 4000,
  },
  createdAt: 1,
});

describe('reasoning pattern library', () => {
  it('detects reusable reasoning patterns with stable ids and node anchors', () => {
    const report = detectReasoningPatterns(graph(
      node('root', 'hypothesis', 'Initial release hypothesis', [
        node('evidence-a', 'evidence', 'CI evidence supports the safe path', [], 0.82),
        node('revision-a', 'revision', 'Actually, revise the rollout plan after spotting risk', [], 0.61),
        node('comparison-a', 'comparison', 'Compare canary rollout against full launch', [
          node('decision-a', 'decision', 'Choose canary because it limits blast radius', [], 0.9),
        ], 0.78),
        node('question-a', 'question', 'What if the rollback signal is missing?', [], 0.42),
      ], 0.7)
    ));

    expect(report.totalMatches).toBe(4);
    expect(report.patterns.map((pattern) => pattern.id)).toEqual([
      'evidence_backed_hypothesis',
      'revision_loop',
      'decision_tradeoff',
      'uncertainty_probe',
    ]);
    expect(report.patterns.find((pattern) => pattern.id === 'evidence_backed_hypothesis')?.matches[0]).toMatchObject({
      primaryNodeId: 'root',
      nodeIds: ['root', 'evidence-a'],
    });
    expect(report.patterns.find((pattern) => pattern.id === 'decision_tradeoff')?.matches[0]).toMatchObject({
      primaryNodeId: 'decision-a',
      nodeIds: ['comparison-a', 'decision-a'],
    });
  });

  it('keeps the catalog available even when the graph has no detected matches', () => {
    const report = detectReasoningPatterns(graph(
      node('plain', 'conclusion', 'Final answer without visible reasoning pattern')
    ));

    expect(report.totalMatches).toBe(0);
    expect(report.patterns).toEqual([]);
    expect(report.catalog.map((pattern) => pattern.id)).toEqual(
      REASONING_PATTERN_LIBRARY.map((pattern) => pattern.id)
    );
  });

  it('orders stronger pattern groups before weaker ones while keeping catalog order stable', () => {
    const report = detectReasoningPatterns(graph(
      node('root', 'hypothesis', 'Initial hypothesis', [
        node('evidence-a', 'evidence', 'First evidence point', [], 0.7),
        node('evidence-b', 'evidence', 'Second evidence point', [], 0.72),
        node('revision-a', 'revision', 'Wait, revise the claim', [], 0.55),
      ])
    ));

    expect(report.patterns.map((pattern) => [pattern.id, pattern.matches.length])).toEqual([
      ['evidence_backed_hypothesis', 2],
      ['revision_loop', 1],
    ]);
  });
});
