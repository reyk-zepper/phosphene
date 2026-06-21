import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_COMPARISON_GRAPH, DEMO_GRAPH } from '@/constants/demoGraph';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('session store history', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  it('remembers and restores local reasoning sessions', async () => {
    const { useSessionStore } = await import('@/core/store/sessionStore');

    useSessionStore.getState().rememberGraph(DEMO_GRAPH);
    const entry = useSessionStore.getState().history[0];

    expect(entry.graphId).toBe(DEMO_GRAPH.id);

    useSessionStore.getState().setGraph(null);
    useSessionStore.getState().setError('stale error');
    useSessionStore.getState().selectNode('n3');
    useSessionStore.getState().restoreHistoryEntry(entry.id);

    const restored = useSessionStore.getState();
    expect(restored.currentGraph).toEqual(DEMO_GRAPH);
    expect(restored.selectedNodeId).toBeNull();
    expect(restored.selectedGraphId).toBeNull();
    expect(restored.error).toBeNull();
  });

  it('skips unsafe graph snapshots instead of adding them to history', async () => {
    const { useSessionStore } = await import('@/core/store/sessionStore');

    useSessionStore.getState().rememberGraph({
      ...DEMO_GRAPH,
      prompt: 'Use sk-ant-secret-token while testing.',
    });

    expect(useSessionStore.getState().history).toEqual([]);
  });

  it('imports a portable session bundle into the active graph and local history', async () => {
    const { createPortableSessionBundle } = await import('@/core/history/sessionBundle');
    const { useSessionStore } = await import('@/core/store/sessionStore');
    const bundle = createPortableSessionBundle(DEMO_GRAPH, {
      exportedAt: new Date('2026-06-21T20:15:00Z'),
    });

    useSessionStore.getState().setError('stale error');
    useSessionStore.getState().setComparisonGraph(DEMO_COMPARISON_GRAPH);
    useSessionStore.getState().selectNode('n3');

    const result = useSessionStore.getState().importPortableSessionBundle(JSON.stringify(bundle), { now: 3_000 });

    expect(result.status).toBe('imported');
    expect(useSessionStore.getState().currentGraph).toEqual(DEMO_GRAPH);
    expect(useSessionStore.getState().comparisonGraph).toBeNull();
    expect(useSessionStore.getState().selectedNodeId).toBeNull();
    expect(useSessionStore.getState().error).toBeNull();
    expect(useSessionStore.getState().history[0]).toMatchObject({
      graphId: DEMO_GRAPH.id,
      updatedAt: 3_000,
    });
  });

  it('keeps the current graph unchanged when a portable session bundle is blocked', async () => {
    const { useSessionStore } = await import('@/core/store/sessionStore');

    useSessionStore.getState().setGraph(DEMO_GRAPH);

    const result = useSessionStore.getState().importPortableSessionBundle('{');

    expect(result).toMatchObject({
      status: 'blocked',
      errors: ['Session bundle is not valid JSON.'],
    });
    expect(useSessionStore.getState().currentGraph).toEqual(DEMO_GRAPH);
    expect(useSessionStore.getState().history).toEqual([]);
  });

  it('tracks which graph owns the selected node in comparison mode', async () => {
    const { useSessionStore } = await import('@/core/store/sessionStore');

    useSessionStore.getState().setGraph(DEMO_GRAPH);
    useSessionStore.getState().setComparisonGraph(DEMO_COMPARISON_GRAPH);
    useSessionStore.getState().selectNode('o3', DEMO_COMPARISON_GRAPH.id);

    expect(useSessionStore.getState().selectedNodeId).toBe('o3');
    expect(useSessionStore.getState().selectedGraphId).toBe(DEMO_COMPARISON_GRAPH.id);

    useSessionStore.getState().setComparisonGraph(null);

    expect(useSessionStore.getState().selectedNodeId).toBeNull();
    expect(useSessionStore.getState().selectedGraphId).toBeNull();
  });
});
