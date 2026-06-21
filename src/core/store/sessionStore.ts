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
  comparisonGraph: ReasoningGraph | null;
  isStreaming: boolean;
  isComparing: boolean;
  error: string | null;
  comparisonError: string | null;
  selectedNodeId: string | null;
  history: SessionHistoryEntry[];
}

interface SessionActions {
  setGraph: (graph: ReasoningGraph | null) => void;
  setComparisonGraph: (graph: ReasoningGraph | null) => void;
  selectNode: (id: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  setComparing: (comparing: boolean) => void;
  setError: (error: string | null) => void;
  setComparisonError: (error: string | null) => void;
  rememberGraph: (graph: ReasoningGraph) => void;
  restoreHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  reset: () => void;
}

const initialState: SessionState = {
  currentGraph: null,
  comparisonGraph: null,
  isStreaming: false,
  isComparing: false,
  error: null,
  comparisonError: null,
  selectedNodeId: null,
  history: [],
};

const emptySessionState = {
  currentGraph: null,
  comparisonGraph: null,
  isStreaming: false,
  isComparing: false,
  error: null,
  comparisonError: null,
  selectedNodeId: null,
};

export const useSessionStore = create<SessionState & SessionActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setGraph: (graph) => set({ currentGraph: graph, selectedNodeId: null }),
      setComparisonGraph: (graph) => set({ comparisonGraph: graph }),
      selectNode: (id) => set({ selectedNodeId: id }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setComparing: (comparing) => set({ isComparing: comparing }),
      setError: (error) => set({ error }),
      setComparisonError: (error) => set({ comparisonError: error }),
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
          comparisonGraph: null,
          selectedNodeId: null,
          error: null,
          comparisonError: null,
          isStreaming: false,
          isComparing: false,
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
