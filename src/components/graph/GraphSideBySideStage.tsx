import { useMemo } from 'react';
import { GitCompareArrows } from 'lucide-react';
import { createSideBySideComparison, type SideBySidePane } from '@/core/graph/sideBySide';
import type { ReasoningGraph } from '@/core/parser/types';
import { useSessionStore } from '@/core/store/sessionStore';
import { GraphCanvas } from './GraphCanvas';

interface GraphSideBySideStageProps {
  primaryGraph: ReasoningGraph;
  comparisonGraph: ReasoningGraph;
  shareUrl?: string;
}

const PANE_FIT_PADDING = {
  top: 126,
  bottom: 72,
  side: 36,
};

export function GraphSideBySideStage({
  primaryGraph,
  comparisonGraph,
  shareUrl,
}: GraphSideBySideStageProps) {
  const stage = useMemo(
    () => createSideBySideComparison(primaryGraph, comparisonGraph),
    [comparisonGraph, primaryGraph]
  );
  const selectedNodeId = useSessionStore((s) => s.selectedNodeId);
  const selectedGraphId = useSessionStore((s) => s.selectedGraphId);
  const selectNode = useSessionStore((s) => s.selectNode);

  if (!stage) {
    return <GraphCanvas shareUrl={shareUrl} />;
  }

  const graphs = {
    primary: primaryGraph,
    comparison: comparisonGraph,
  } as const;

  return (
    <div className="grid h-full w-full grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
      {stage.panes.map((pane) => {
        const graph = graphs[pane.role];
        const selectedInPane = selectedGraphId === graph.id ? selectedNodeId : null;

        return (
          <section
            key={pane.role}
            className="relative min-h-0 overflow-hidden border-[color:var(--border-subtle)] lg:border-r last:lg:border-r-0"
          >
            <PaneBadge pane={pane} active={selectedGraphId === graph.id} />
            <GraphCanvas
              graph={graph}
              selectedNodeId={selectedInPane}
              onSelectNode={(nodeId) => selectNode(nodeId, nodeId ? graph.id : null)}
              shareUrl={pane.role === 'primary' ? shareUrl : undefined}
              showControls={pane.role === 'primary'}
              fitPadding={PANE_FIT_PADDING}
            />
          </section>
        );
      })}
    </div>
  );
}

function PaneBadge({ pane, active }: { pane: SideBySidePane; active: boolean }) {
  return (
    <div className="pointer-events-none absolute top-36 left-4 z-10 max-w-[calc(100%-2rem)] rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/82 px-3 py-2 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <GitCompareArrows
          size={12}
          className={active ? 'text-[color:var(--glow-decision)]' : 'text-[color:var(--glow-comparison)]'}
        />
        <span className="font-mono text-[9px] tracking-widest text-[color:var(--text-muted)] uppercase">
          {pane.role === 'primary' ? 'Primary graph' : 'Comparison graph'}
        </span>
      </div>
      <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xs text-[color:var(--text-primary)]">
        {pane.modelLabel}
      </p>
      <p className="mt-1 font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
        {pane.nodeCount} nodes / {pane.totalTokens} tokens
      </p>
    </div>
  );
}
