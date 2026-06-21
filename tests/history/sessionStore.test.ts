import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_GRAPH } from '@/constants/demoGraph';

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
});
