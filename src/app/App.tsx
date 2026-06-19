import { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import { useSessionStore } from '@/core/store/sessionStore';
import { useSettingsStore } from '@/core/store/settingsStore';
import { DEMO_GRAPH } from '@/constants/demoGraph';
import { PromptInput } from '@/components/prompt/PromptInput';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { DetailPanel } from '@/components/detail/DetailPanel';
import { ApiKeyModal } from '@/components/settings/ApiKeyModal';
import { SearchOverlay } from '@/components/search/SearchOverlay';
import { useGraphNavigation } from '@/hooks/useGraphNavigation';
import { OBSERVER_TRACE_GROUPS, OBSERVER_TRACES } from '@/constants/demoTraces';
import { traceToGraph } from '@/core/traces/toGraph';
import {
  parseTraceIntakeFiles,
  type TraceIntakeBatchResult,
} from '@/core/traces/intake';
import { createObserverReadiness } from '@/core/traces/readiness';
import type { NodeTrace } from '@/core/traces/types';
import { ModeSwitch, type AppMode } from '@/components/shell/ModeSwitch';
import { NodeObserverBar } from '@/components/observer/NodeObserverBar';

export function App() {
  const graph = useSessionStore((s) => s.currentGraph);
  const setGraph = useSessionStore((s) => s.setGraph);
  const hasKey = useSettingsStore((s) =>
    Object.values(s.encodedKeys).some(Boolean)
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mode, setMode] = useState<AppMode>('observer');
  const [selectedTraceId, setSelectedTraceId] = useState(OBSERVER_TRACES[0].id);
  const [importedTraces, setImportedTraces] = useState<NodeTrace[]>([]);
  const [intakeResult, setIntakeResult] = useState<TraceIntakeBatchResult | undefined>();
  const observerTraces = useMemo(
    () => [...importedTraces, ...OBSERVER_TRACES],
    [importedTraces]
  );
  const observerReadiness = useMemo(
    () => createObserverReadiness({
      traceGroups: OBSERVER_TRACE_GROUPS,
      importedTraceCount: importedTraces.length,
      intakeResult,
    }),
    [importedTraces.length, intakeResult]
  );
  useGraphNavigation();

  const handleImportTraceFiles = useCallback(async (files: File[]) => {
    const inputs = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        text: await file.text(),
      }))
    );
    const result = parseTraceIntakeFiles(inputs);

    if (result.traces.length > 0) {
      setImportedTraces((current) => [
        ...result.traces,
        ...current.filter((trace) => !result.traces.some((imported) => imported.id === trace.id)),
      ]);
      setSelectedTraceId(result.traces[0].id);
    }

    setIntakeResult(result);
  }, []);

  useEffect(() => {
    if (mode !== 'observer') return;
    const trace = observerTraces.find((item) => item.id === selectedTraceId) ?? observerTraces[0];
    setGraph(traceToGraph(trace));
  }, [mode, observerTraces, selectedTraceId, setGraph]);

  useEffect(() => {
    if (mode !== 'reasoning') return;
    if ((!graph || graph.model.model === 'ai-node-trace') && !hasKey) setGraph(DEMO_GRAPH);
  }, [graph, hasKey, mode, setGraph]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <header className="pointer-events-none absolute top-0 right-0 left-0 z-10 px-6 pt-5">
        <div className="pointer-events-auto mb-4 flex items-center justify-between gap-4">
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
              v0.1.6
            </span>
          </div>
          <ModeSwitch mode={mode} onChange={setMode} />
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
              See how AI thinks
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              className="rounded-md border border-[color:var(--border-subtle)] p-1.5 text-[color:var(--text-secondary)] transition hover:border-[color:var(--glow-analysis)] hover:text-[color:var(--glow-analysis)]"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
        {mode === 'reasoning' ? (
          <PromptInput onOpenSettings={() => setSettingsOpen(true)} />
        ) : (
          <NodeObserverBar
            traces={observerTraces}
            traceGroups={OBSERVER_TRACE_GROUPS}
            selectedTraceId={selectedTraceId}
            onSelectTrace={setSelectedTraceId}
            importedTraceIds={importedTraces.map((trace) => trace.id)}
            intakeResult={intakeResult}
            readiness={observerReadiness}
            onImportTraceFiles={handleImportTraceFiles}
          />
        )}
      </header>

      <main className="relative h-full w-full">
        <GraphCanvas />
      </main>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden sm:block">
        <GraphLegend variant={mode === 'observer' ? 'observer' : 'reasoning'} />
      </div>

      <DetailPanel />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ApiKeyModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
