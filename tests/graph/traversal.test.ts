import { describe, expect, it } from 'vitest';
import { collectGraphEdges, flattenGraph } from '@/core/graph/traversal';
import type { ReasoningNode } from '@/core/parser/types';

function makeNode(id: string, children: ReasoningNode[] = []): ReasoningNode {
  return {
    id,
    type: 'analysis',
    summary: id,
    content: `content ${id}`,
    children,
    depth: 0,
    tokenCount: 1,
    timestamp: 0,
    confidence: 0.8,
  };
}

function deepChain(length: number): ReasoningNode {
  const root = makeNode('node-0');
  let cursor = root;
  for (let index = 1; index < length; index += 1) {
    const child = makeNode(`node-${index}`);
    cursor.children = [child];
    cursor = child;
  }
  return root;
}

describe('graph traversal', () => {
  it('flattens and collects edges for very deep graphs without overflowing the stack', () => {
    const root = deepChain(12_000);

    const nodes = flattenGraph(root);
    const edges = collectGraphEdges(root);

    expect(nodes).toHaveLength(12_000);
    expect(nodes[0]?.id).toBe('node-0');
    expect(nodes.at(-1)?.id).toBe('node-11999');
    expect(edges).toHaveLength(11_999);
    expect(edges[0]).toEqual({ from: 'node-0', to: 'node-1' });
    expect(edges.at(-1)).toEqual({ from: 'node-11998', to: 'node-11999' });
  });
});
