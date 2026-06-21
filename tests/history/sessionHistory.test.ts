import { describe, expect, it } from 'vitest';
import { DEMO_GRAPH } from '@/constants/demoGraph';
import {
  createSessionHistoryEntry,
  upsertSessionHistory,
} from '@/core/history/sessionHistory';
import type { ReasoningGraph } from '@/core/parser/types';

const graphWith = (overrides: Partial<ReasoningGraph>): ReasoningGraph => ({
  ...DEMO_GRAPH,
  ...overrides,
  model: overrides.model ?? DEMO_GRAPH.model,
  metadata: overrides.metadata ?? DEMO_GRAPH.metadata,
  rootNode: overrides.rootNode ?? DEMO_GRAPH.rootNode,
});

describe('session history', () => {
  it('creates a local session entry with bounded prompt preview and graph metrics', () => {
    const entry = createSessionHistoryEntry(DEMO_GRAPH, {
      now: 1_000,
      maxPromptLength: 42,
    });

    expect(entry).toMatchObject({
      id: 'demo-river-crossing:anthropic:claude-sonnet-4-20250514',
      graphId: 'demo-river-crossing',
      modelLabel: 'Claude Sonnet 4 (demo)',
      createdAt: DEMO_GRAPH.createdAt,
      updatedAt: 1_000,
      nodeCount: 8,
      totalTokens: 1420,
    });
    expect(entry?.promptPreview).toBe('A farmer needs to cross a river with a...');
    expect(entry?.graph).toEqual(DEMO_GRAPH);
  });

  it('dedupes matching prompt/model sessions and keeps newest entries first', () => {
    const first = createSessionHistoryEntry(graphWith({ id: 'graph-one' }), { now: 1_000 });
    const replacement = createSessionHistoryEntry(graphWith({ id: 'graph-two' }), { now: 2_000 });
    const otherPrompt = createSessionHistoryEntry(
      graphWith({ id: 'graph-three', prompt: 'Explain rollback plans for a release.' }),
      { now: 1_500 }
    );

    expect(first && replacement && otherPrompt).toBeTruthy();

    const history = upsertSessionHistory([first!, otherPrompt!], replacement!, { limit: 5 });

    expect(history.map((entry) => entry.graphId)).toEqual(['graph-two', 'graph-three']);
    expect(history[0].updatedAt).toBe(2_000);
  });

  it('applies the configured history limit', () => {
    const entries = Array.from({ length: 6 }, (_, index) =>
      createSessionHistoryEntry(
        graphWith({
          id: `graph-${index}`,
          prompt: `Prompt ${index}`,
        }),
        { now: index }
      )
    );

    const history = entries.reduce(
      (current, entry) => upsertSessionHistory(current, entry!, { limit: 3 }),
      [] as NonNullable<ReturnType<typeof createSessionHistoryEntry>>[]
    );

    expect(history.map((entry) => entry.graphId)).toEqual(['graph-5', 'graph-4', 'graph-3']);
  });

  it('refuses to persist obvious secrets in prompts or graph content', () => {
    expect(
      createSessionHistoryEntry(
        graphWith({
          id: 'unsafe-prompt',
          prompt: 'Please debug this Authorization: Bearer sk-ant-secret-token',
        })
      )
    ).toBeNull();

    expect(
      createSessionHistoryEntry(
        graphWith({
          id: 'unsafe-content',
          rootNode: {
            ...DEMO_GRAPH.rootNode,
            content: 'Use password=correct-horse-battery-staple for the call.',
          },
        })
      )
    ).toBeNull();
  });
});
