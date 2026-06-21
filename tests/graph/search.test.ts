import { describe, expect, it } from 'vitest';
import { DEMO_GRAPH } from '@/constants/demoGraph';
import { searchGraphNodes } from '@/core/graph/search';
import type { ReasoningNode } from '@/core/parser/types';

describe('graph search', () => {
  it('finds nodes by plain text across summary and content', () => {
    const results = searchGraphNodes(DEMO_GRAPH.rootNode, 'forbidden pairings');

    expect(results.map((result) => result.node.id)).toEqual(['n2']);
    expect(results[0].matchedFields).toContain('content');
  });

  it('filters by node type using query syntax', () => {
    const results = searchGraphNodes(DEMO_GRAPH.rootNode, 'type:revision');

    expect(results.map((result) => result.node.id)).toEqual(['n6']);
    expect(results[0].matchedFields).toContain('type');
  });

  it('finds model mind changes from a natural-language query', () => {
    const results = searchGraphNodes(
      DEMO_GRAPH.rootNode,
      'Finde alle Stellen wo das Modell seine Meinung ändert'
    );

    expect(results.map((result) => result.node.id)).toEqual(['n6']);
    expect(results[0].matchedFields).toContain('pattern');
  });

  it('filters high-confidence nodes', () => {
    const results = searchGraphNodes(DEMO_GRAPH.rootNode, 'confidence:high');

    expect(results.map((result) => result.node.id)).toEqual(['n8', 'n7', 'n5']);
    expect(results.every((result) => result.node.confidence && result.node.confidence >= 0.85)).toBe(true);
  });

  it('includes metadata in graph search without exposing special syntax', () => {
    const nodeWithMetadata: ReasoningNode = {
      ...DEMO_GRAPH.rootNode,
      id: 'metadata-node',
      metadata: {
        decision: 'needs_approval',
        risk: 'medium',
      },
      children: [],
    };

    const results = searchGraphNodes(nodeWithMetadata, 'needs_approval');

    expect(results.map((result) => result.node.id)).toEqual(['metadata-node']);
    expect(results[0].matchedFields).toContain('metadata');
  });
});
