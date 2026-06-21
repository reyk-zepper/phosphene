import { describe, expect, it } from 'vitest';
import {
  createGraphAnnotation,
  createGraphAnnotationBundle,
  parseGraphAnnotationBundle,
  summarizeGraphAnnotations,
} from '@/core/annotations/graphAnnotations';
import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';

const node = (id: string, summary: string, children: ReasoningNode[] = []): ReasoningNode => ({
  id,
  type: 'analysis',
  content: summary,
  summary,
  children,
  depth: 0,
  tokenCount: 12,
  timestamp: 1,
});

const graph = (id = 'review-graph'): ReasoningGraph => ({
  id,
  prompt: 'Review this reasoning.',
  model: {
    provider: 'anthropic',
    model: 'claude-demo',
    displayName: 'Claude demo',
  },
  rootNode: node('root', 'Root reasoning', [
    node('evidence-a', 'Evidence node'),
    node('decision-a', 'Decision node'),
  ]),
  metadata: {
    totalTokens: 100,
    reasoningTokens: 80,
    outputTokens: 20,
    maxDepth: 2,
    branchCount: 2,
    nodeCount: 3,
    timeToComplete: 1200,
  },
  createdAt: 1,
});

describe('graph annotations', () => {
  it('creates node and graph annotations with stable review metadata', () => {
    const annotation = createGraphAnnotation({
      graphId: 'review-graph',
      nodeId: 'decision-a',
      author: 'Reyk',
      body: 'Check whether this tradeoff follows from the evidence.',
      priority: 'high',
      status: 'open',
      now: 1_000,
    });

    expect(annotation).toEqual({
      id: expect.stringMatching(/^ann-review-graph-decision-a-1000-/),
      graphId: 'review-graph',
      nodeId: 'decision-a',
      scope: 'node',
      author: 'Reyk',
      body: 'Check whether this tradeoff follows from the evidence.',
      priority: 'high',
      status: 'open',
      createdAt: 1_000,
      updatedAt: 1_000,
    });
  });

  it('summarizes annotations for one graph without counting unrelated notes', () => {
    const reviewGraph = graph();
    const annotations = [
      createGraphAnnotation({
        graphId: reviewGraph.id,
        nodeId: 'decision-a',
        author: 'A',
        body: 'Needs a source.',
        priority: 'high',
        status: 'open',
        now: 1,
      }),
      createGraphAnnotation({
        graphId: reviewGraph.id,
        author: 'B',
        body: 'Overall structure looks coherent.',
        priority: 'low',
        status: 'resolved',
        now: 2,
      }),
      createGraphAnnotation({
        graphId: 'other-graph',
        author: 'C',
        body: 'Do not count me.',
        now: 3,
      }),
    ];

    expect(summarizeGraphAnnotations(reviewGraph, annotations)).toEqual({
      graphId: 'review-graph',
      total: 2,
      graphLevel: 1,
      nodeAnchored: 1,
      open: 1,
      questions: 0,
      resolved: 1,
      highPriority: 1,
      annotatedNodeIds: ['decision-a'],
    });
  });

  it('exports and imports a portable annotation bundle for the active graph', () => {
    const reviewGraph = graph();
    const annotation = createGraphAnnotation({
      graphId: reviewGraph.id,
      nodeId: 'evidence-a',
      author: 'Reviewer',
      body: 'This evidence should be linked in the final answer.',
      status: 'question',
      now: 5_000,
    });

    const bundle = createGraphAnnotationBundle(reviewGraph, [annotation], {
      exportedAt: new Date('2026-06-22T00:00:00.000Z'),
    });

    expect(bundle).toMatchObject({
      schema_version: 'phosphene.annotations.v0.1.37',
      source: 'phosphene_collaborative_annotation',
      data_classification: 'client_local_review_notes',
      exported_at: '2026-06-22T00:00:00.000Z',
      graph_id: 'review-graph',
      annotation_count: 1,
    });

    const result = parseGraphAnnotationBundle(JSON.stringify(bundle), reviewGraph);

    expect(result).toEqual({
      status: 'imported',
      graphId: 'review-graph',
      annotations: [annotation],
    });
  });

  it('blocks graph mismatches, unknown node anchors, and secret-like annotation text', () => {
    const reviewGraph = graph();
    const bundle = createGraphAnnotationBundle(reviewGraph, [
      createGraphAnnotation({
        graphId: reviewGraph.id,
        nodeId: 'missing-node',
        author: 'Reviewer',
        body: 'Looks fine.',
        now: 1,
      }),
    ]);

    expect(parseGraphAnnotationBundle(JSON.stringify(bundle), reviewGraph)).toEqual({
      status: 'blocked',
      errors: ['Annotation references a node that is not in this graph.'],
    });

    const otherGraphResult = parseGraphAnnotationBundle(JSON.stringify(bundle), graph('other-graph'));
    expect(otherGraphResult).toEqual({
      status: 'blocked',
      errors: ['Annotation bundle belongs to a different graph.'],
    });

    const secretBundle = createGraphAnnotationBundle(reviewGraph, [
      createGraphAnnotation({
        graphId: reviewGraph.id,
        author: 'Reviewer',
        body: 'Use api_key=sk-annotation-secret while testing.',
        now: 2,
      }),
    ]);

    expect(parseGraphAnnotationBundle(JSON.stringify(secretBundle), reviewGraph)).toEqual({
      status: 'blocked',
      errors: ['Annotation bundle contains secret-like content.'],
    });
  });
});
