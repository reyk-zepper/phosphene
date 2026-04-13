import { create } from 'zustand';
import type { ReasoningGraph } from '@/core/parser/types';

interface SessionState {
  currentGraph: ReasoningGraph | null;
  isStreaming: boolean;
  error: string | null;
  selectedNodeId: string | null;
}

interface SessionActions {
  setGraph: (graph: ReasoningGraph | null) => void;
  selectNode: (id: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: SessionState = {
  currentGraph: null,
  isStreaming: false,
  error: null,
  selectedNodeId: null,
};

export const useSessionStore = create<SessionState & SessionActions>((set) => ({
  ...initialState,
  setGraph: (graph) => set({ currentGraph: graph, selectedNodeId: null }),
  selectNode: (id) => set({ selectedNodeId: id }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
