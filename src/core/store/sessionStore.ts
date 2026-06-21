import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  createSessionHistoryEntry,
  upsertSessionHistory,
  type SessionHistoryEntry,
} from '@/core/history/sessionHistory';
import type { ReasoningGraph } from '@/core/parser/types';

interface SessionState {
  currentGraph: ReasoningGraph | null;
  isStreaming: boolean;
  error: string | null;
  selectedNodeId: string | null;
  history: SessionHistoryEntry[];
}

interface SessionActions {
  setGraph: (graph: ReasoningGraph | null) => void;
  selectNode: (id: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  rememberGraph: (graph: ReasoningGraph) => void;
  restoreHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  reset: () => void;
}

const initialState: SessionState = {
  currentGraph: null,
  isStreaming: false,
  error: null,
  selectedNodeId: null,
  history: [],
};

const emptySessionState = {
  currentGraph: null,
  isStreaming: false,
  error: null,
  selectedNodeId: null,
};

export const useSessionStore = create<SessionState & SessionActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setGraph: (graph) => set({ currentGraph: graph, selectedNodeId: null }),
      selectNode: (id) => set({ selectedNodeId: id }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setError: (error) => set({ error }),
      rememberGraph: (graph) => {
        const entry = createSessionHistoryEntry(graph);
        if (!entry) return;
        set((state) => ({
          history: upsertSessionHistory(state.history, entry),
        }));
      },
      restoreHistoryEntry: (id) => {
        const entry = get().history.find((item) => item.id === id);
        if (!entry) return;
        set({
          currentGraph: entry.graph,
          selectedNodeId: null,
          error: null,
          isStreaming: false,
        });
      },
      clearHistory: () => set({ history: [] }),
      reset: () => set(emptySessionState),
    }),
    {
      name: 'phosphene-session-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ history: s.history }),
    }
  )
);
