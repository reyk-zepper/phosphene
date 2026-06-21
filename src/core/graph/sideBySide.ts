import { compareGraphs, type GraphComparison } from './compare';
import type { ReasoningGraph } from '../parser/types';

export type SideBySidePaneRole = 'primary' | 'comparison';

export interface SideBySidePane {
  role: SideBySidePaneRole;
  graphId: string;
  modelLabel: string;
  nodeCount: number;
  totalTokens: number;
}

export interface SideBySideComparison {
  samePrompt: true;
  panes: [SideBySidePane, SideBySidePane];
  comparison: GraphComparison;
}

export function createSideBySideComparison(
  primaryGraph: ReasoningGraph,
  comparisonGraph: ReasoningGraph | null
): SideBySideComparison | null {
  if (!comparisonGraph) return null;

  const comparison = compareGraphs(primaryGraph, comparisonGraph);
  if (!comparison.samePrompt) return null;

  return {
    samePrompt: true,
    panes: [
      createPane('primary', primaryGraph),
      createPane('comparison', comparisonGraph),
    ],
    comparison,
  };
}

function createPane(role: SideBySidePaneRole, graph: ReasoningGraph): SideBySidePane {
  return {
    role,
    graphId: graph.id,
    modelLabel: graph.model.displayName,
    nodeCount: graph.metadata.nodeCount,
    totalTokens: graph.metadata.totalTokens,
  };
}
