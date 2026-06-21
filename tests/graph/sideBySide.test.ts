import { describe, expect, it } from 'vitest';
import { DEMO_COMPARISON_GRAPH, DEMO_GRAPH } from '@/constants/demoGraph';
import { createSideBySideComparison } from '@/core/graph/sideBySide';

describe('side-by-side graph comparison', () => {
  it('creates primary and comparison panes for same-prompt graphs', () => {
    const stage = createSideBySideComparison(DEMO_GRAPH, DEMO_COMPARISON_GRAPH);

    expect(stage).toMatchObject({
      samePrompt: true,
      panes: [
        {
          role: 'primary',
          graphId: DEMO_GRAPH.id,
          modelLabel: 'Claude Sonnet 4 (demo)',
          nodeCount: DEMO_GRAPH.metadata.nodeCount,
          totalTokens: DEMO_GRAPH.metadata.totalTokens,
        },
        {
          role: 'comparison',
          graphId: DEMO_COMPARISON_GRAPH.id,
          modelLabel: 'OpenAI o3 demo',
          nodeCount: DEMO_COMPARISON_GRAPH.metadata.nodeCount,
          totalTokens: DEMO_COMPARISON_GRAPH.metadata.totalTokens,
        },
      ],
    });
  });

  it('normalizes prompt whitespace before enabling the comparison stage', () => {
    const stage = createSideBySideComparison(DEMO_GRAPH, {
      ...DEMO_COMPARISON_GRAPH,
      prompt: `  ${DEMO_GRAPH.prompt.replaceAll(' ', '   ')}  `,
    });

    expect(stage).not.toBeNull();
    expect(stage?.samePrompt).toBe(true);
  });

  it('does not create a side-by-side stage for different prompts', () => {
    const stage = createSideBySideComparison(DEMO_GRAPH, {
      ...DEMO_COMPARISON_GRAPH,
      prompt: 'Summarize a production incident instead.',
    });

    expect(stage).toBeNull();
  });
});
