import { useEffect } from 'react';
import { useSessionStore } from '@/core/store/sessionStore';
import { DEMO_GRAPH } from '@/constants/demoGraph';
import { PromptInput } from '@/components/prompt/PromptInput';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { DetailPanel } from '@/components/detail/DetailPanel';

export function App() {
  const setGraph = useSessionStore((s) => s.setGraph);
  const graph = useSessionStore((s) => s.currentGraph);

  useEffect(() => {
    if (!graph) setGraph(DEMO_GRAPH);
  }, [graph, setGraph]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <header className="pointer-events-none absolute top-0 right-0 left-0 z-10 px-6 pt-5">
        <div className="pointer-events-auto mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: 'var(--glow-hypothesis)',
                boxShadow: '0 0 14px var(--glow-hypothesis)',
              }}
            />
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[color:var(--text-primary)]">
              Phosphene
            </span>
            <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
              v0.0.1
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
            See how AI thinks
          </span>
        </div>
        <PromptInput />
      </header>

      <main className="relative h-full w-full">
        <GraphCanvas />
      </main>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10">
        <GraphLegend />
      </div>

      <DetailPanel />
    </div>
  );
}
