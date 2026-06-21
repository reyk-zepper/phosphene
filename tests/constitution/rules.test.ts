import { describe, expect, it } from 'vitest';
import {
  createConstitutionRule,
  DEFAULT_CONSTITUTION_RULES,
  evaluateConstitution,
} from '@/core/constitution/rules';
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
  content: summary,
  summary,
  children,
  depth: 0,
  tokenCount: 10,
  timestamp: 1,
  confidence,
});

const graph = (rootNode: ReasoningNode): ReasoningGraph => ({
  id: 'constitution-graph',
  prompt: 'Check the reasoning.',
  model: {
    provider: 'anthropic',
    model: 'claude-demo',
    displayName: 'Claude demo',
  },
  rootNode,
  metadata: {
    totalTokens: 100,
    reasoningTokens: 80,
    outputTokens: 20,
    maxDepth: 3,
    branchCount: 3,
    nodeCount: 4,
    timeToComplete: 900,
  },
  createdAt: 1,
});

describe('constitution rules', () => {
  it('evaluates default rules against graph structure and confidence', () => {
    const report = evaluateConstitution(
      graph(
        node('root', 'hypothesis', 'Initial claim', [
          node('evidence-a', 'evidence', 'Evidence supports the claim', [], 0.82),
          node('decision-a', 'decision', 'Choose the safe route', [], 0.77),
          node('question-a', 'question', 'What if rollback fails?', [], 0.63),
        ])
      ),
      DEFAULT_CONSTITUTION_RULES
    );

    expect(report).toMatchObject({
      graphId: 'constitution-graph',
      totalRules: 4,
      passedRules: 4,
      failedRules: 0,
      score: 1,
    });
    expect(report.results.map((result) => [result.ruleId, result.status])).toEqual([
      ['requires_evidence', 'passed'],
      ['requires_decision', 'passed'],
      ['requires_uncertainty_probe', 'passed'],
      ['confidence_floor', 'passed'],
    ]);
  });

  it('reports failed rules with stable reasons and node anchors', () => {
    const report = evaluateConstitution(
      graph(node('root', 'hypothesis', 'Initial claim', [node('analysis-a', 'analysis', 'Maybe enough.', [], 0.31)])),
      DEFAULT_CONSTITUTION_RULES
    );

    expect(report.failedRules).toBe(4);
    expect(report.results[0]).toMatchObject({
      ruleId: 'requires_evidence',
      status: 'failed',
      message: 'No evidence node found.',
      nodeIds: [],
    });
    expect(report.results.find((result) => result.ruleId === 'confidence_floor')).toMatchObject({
      status: 'failed',
      message: 'Average confidence 31% is below required 55%.',
      nodeIds: ['analysis-a'],
    });
  });

  it('supports custom text and depth rules while ignoring disabled rules', () => {
    const rules = [
      createConstitutionRule({
        label: 'Mention rollback',
        kind: 'requires_text',
        text: 'rollback',
      }),
      createConstitutionRule({
        label: 'Limit depth',
        kind: 'max_depth',
        maxDepth: 2,
      }),
      {
        ...createConstitutionRule({
          label: 'Disabled evidence check',
          kind: 'requires_node_type',
          nodeType: 'evidence',
        }),
        enabled: false,
      },
    ];

    const report = evaluateConstitution(
      graph(node('root', 'analysis', 'Rollback path is available.', [node('deep', 'decision', 'Decision', [], 0.9)])),
      rules
    );

    expect(report.totalRules).toBe(2);
    expect(report.results.map((result) => [result.label, result.status])).toEqual([
      ['Mention rollback', 'passed'],
      ['Limit depth', 'failed'],
    ]);
  });

  it('rejects malformed custom rules', () => {
    expect(() =>
      createConstitutionRule({
        label: 'Missing text',
        kind: 'requires_text',
      })
    ).toThrow('Constitution text rule requires a phrase.');

    expect(() =>
      createConstitutionRule({
        label: 'Bad depth',
        kind: 'max_depth',
        maxDepth: 0,
      })
    ).toThrow('Constitution max-depth rule requires a positive depth.');
  });
});
