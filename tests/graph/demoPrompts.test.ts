import { describe, expect, it } from 'vitest';
import { DEMO_REASONING_GRAPHS, flattenGraph } from '@/constants/demoGraph';
import { isGraphSafeForHistory } from '@/core/history/sessionHistory';

describe('demo reasoning prompts', () => {
  it('ships five curated safe demo graphs', () => {
    expect(DEMO_REASONING_GRAPHS).toHaveLength(5);

    const ids = new Set(DEMO_REASONING_GRAPHS.map((graph) => graph.id));
    const prompts = new Set(DEMO_REASONING_GRAPHS.map((graph) => graph.prompt));

    expect(ids.size).toBe(DEMO_REASONING_GRAPHS.length);
    expect(prompts.size).toBe(DEMO_REASONING_GRAPHS.length);
    expect(DEMO_REASONING_GRAPHS.every(isGraphSafeForHistory)).toBe(true);
  });

  it('keeps demo graph metadata aligned with rendered nodes', () => {
    for (const graph of DEMO_REASONING_GRAPHS) {
      const nodes = flattenGraph(graph.rootNode);

      expect(nodes.length).toBe(graph.metadata.nodeCount);
      expect(graph.metadata.totalTokens).toBeGreaterThan(0);
      expect(graph.rootNode.depth).toBe(0);
      expect(graph.rootNode.children.length).toBeGreaterThan(0);
    }
  });
});
