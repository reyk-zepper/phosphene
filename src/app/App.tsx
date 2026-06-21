import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { useSessionStore } from '@/core/store/sessionStore';
import { useSettingsStore } from '@/core/store/settingsStore';
import { DEMO_COMPARISON_GRAPH, DEMO_GRAPH, flattenGraph } from '@/constants/demoGraph';
import { PromptInput } from '@/components/prompt/PromptInput';
import { DemoPromptGallery } from '@/components/prompt/DemoPromptGallery';
import { SessionHistoryPanel } from '@/components/history/SessionHistoryPanel';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { GraphComparisonPanel } from '@/components/graph/GraphComparisonPanel';
import { GraphStatsPanel } from '@/components/graph/GraphStatsPanel';
import { DetailPanel } from '@/components/detail/DetailPanel';
import { ApiKeyModal } from '@/components/settings/ApiKeyModal';
import { SearchOverlay } from '@/components/search/SearchOverlay';
import { useGraphNavigation } from '@/hooks/useGraphNavigation';
import { OBSERVER_TRACE_GROUPS, OBSERVER_TRACES, type ObserverTraceGroup } from '@/constants/demoTraces';
import { traceToGraph } from '@/core/traces/toGraph';
import {
  parseTraceIntakeFiles,
  type TraceIntakeBatchResult,
} from '@/core/traces/intake';
import { createObserverReadiness } from '@/core/traces/readiness';
import { loadPublishedSnapshot, type PublishedSnapshotLoadResult } from '@/core/traces/snapshot';
import { startCanaryStatusRefresh, type CanaryStatusLoadResult } from '@/core/traces/canaryStatus';
import { buildShareUrl, parseShareLinkState, type ShareLinkState } from '@/core/share/shareLink';
import type { NodeTrace } from '@/core/traces/types';
import { ModeSwitch, type AppMode } from '@/components/shell/ModeSwitch';
import { NodeObserverBar } from '@/components/observer/NodeObserverBar';

function readInitialShareState(): ShareLinkState {
  if (typeof window === 'undefined') return {};
  return parseShareLinkState(window.location.href);
}

export function App() {
  const graph = useSessionStore((s) => s.currentGraph);
  const setGraph = useSessionStore((s) => s.setGraph);
  const selectedNodeId = useSessionStore((s) => s.selectedNodeId);
  const selectNode = useSessionStore((s) => s.selectNode);
  const hasKey = useSettingsStore((s) =>
    Object.values(s.encodedKeys).some(Boolean)
  );
  const initialShareState = useMemo(readInitialShareState, []);
  const pendingSharedTraceId = useRef(
    initialShareState.mode === 'observer' ? (initialShareState.traceId ?? null) : null
  );
  const pendingSharedNodeId = useRef(initialShareState.nodeId ?? null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mode, setMode] = useState<AppMode>(initialShareState.mode ?? 'observer');
  const [selectedTraceId, setSelectedTraceId] = useState(
    initialShareState.mode === 'observer' ? (initialShareState.traceId ?? OBSERVER_TRACES[0].id) : OBSERVER_TRACES[0].id
  );
  const [importedTraces, setImportedTraces] = useState<NodeTrace[]>([]);
  const [intakeResult, setIntakeResult] = useState<TraceIntakeBatchResult | undefined>();
  const [snapshotResult, setSnapshotResult] = useState<PublishedSnapshotLoadResult | undefined>();
  const [canaryStatus, setCanaryStatus] = useState<CanaryStatusLoadResult | undefined>();
  const snapshotGroup = useMemo<ObserverTraceGroup | undefined>(() => {
    if (!snapshotResult || snapshotResult.traces.length === 0) return undefined;
    return {
      id: 'published-ai-node-snapshot',
      label: 'Published AI Node Snapshot',
      badge: 'Published snapshot',
      description: 'Redacted Boundary snapshot served by Phosphene from the AI Node publish path.',
      traces: snapshotResult.traces,
    };
  }, [snapshotResult]);
  const observerTraceGroups = useMemo(() => {
    if (!snapshotGroup) return OBSERVER_TRACE_GROUPS;

    const snapshotIds = new Set(snapshotGroup.traces.map((trace) => trace.id));
    const staticGroups = OBSERVER_TRACE_GROUPS
      .map((group) => ({
        ...group,
        traces: group.traces.filter((trace) => !snapshotIds.has(trace.id)),
      }))
      .filter((group) => group.traces.length > 0);

    return [snapshotGroup, ...staticGroups];
  }, [snapshotGroup]);
  const observerTraces = useMemo(
    () => [...importedTraces, ...observerTraceGroups.flatMap((group) => group.traces)],
    [importedTraces, observerTraceGroups]
  );
  const publishedSnapshotReadiness = useMemo(() => {
    if (!snapshotResult) return undefined;
    return {
      status: snapshotResult.status,
      traceCount: snapshotResult.traces.length,
      blockedCount: snapshotResult.intakeResult?.summary.blockedTraceCount ?? 0,
    };
  }, [snapshotResult]);
  const observerReadiness = useMemo(
    () => createObserverReadiness({
      traceGroups: observerTraceGroups,
      importedTraceCount: importedTraces.length,
      intakeResult,
      publishedSnapshot: publishedSnapshotReadiness,
    }),
    [importedTraces.length, intakeResult, observerTraceGroups, publishedSnapshotReadiness]
  );
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return buildShareUrl(window.location.href, {
      mode,
      traceId: mode === 'observer' ? selectedTraceId : undefined,
      graphId: mode === 'reasoning' ? graph?.id : undefined,
      nodeId: selectedNodeId ?? undefined,
    });
  }, [graph?.id, mode, selectedNodeId, selectedTraceId]);
  const comparisonGraph = useMemo(() => {
    if (mode !== 'reasoning' || !graph) return null;
    if (graph.id === DEMO_GRAPH.id) return DEMO_COMPARISON_GRAPH;
    if (graph.id === DEMO_COMPARISON_GRAPH.id) return DEMO_GRAPH;
    return null;
  }, [graph, mode]);
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
    let cancelled = false;

    void loadPublishedSnapshot().then((result) => {
      if (cancelled) return;
      setSnapshotResult(result);
      if (pendingSharedTraceId.current) return;
      if (result.traces.length > 0) {
        setSelectedTraceId((current) => (
          current === OBSERVER_TRACES[0].id ? result.traces[0].id : current
        ));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return startCanaryStatusRefresh({ onResult: setCanaryStatus });
  }, []);

  useEffect(() => {
    const pendingTraceId = pendingSharedTraceId.current;
    if (!pendingTraceId) return;

    if (observerTraces.some((trace) => trace.id === pendingTraceId)) {
      setSelectedTraceId(pendingTraceId);
      pendingSharedTraceId.current = null;
      return;
    }

    if (snapshotResult) {
      pendingSharedTraceId.current = null;
    }
  }, [observerTraces, snapshotResult]);

  useEffect(() => {
    if (mode !== 'observer') return;
    if (pendingSharedTraceId.current && !snapshotResult) return;
    if (observerTraces.some((trace) => trace.id === selectedTraceId)) return;
    setSelectedTraceId(observerTraces[0].id);
  }, [mode, observerTraces, selectedTraceId, snapshotResult]);

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
    const pendingNodeId = pendingSharedNodeId.current;
    if (!graph || !pendingNodeId) return;

    const nodeExists = flattenGraph(graph.rootNode).some((node) => node.id === pendingNodeId);
    if (nodeExists) {
      selectNode(pendingNodeId);
      pendingSharedNodeId.current = null;
      return;
    }

    if (!pendingSharedTraceId.current) {
      pendingSharedNodeId.current = null;
    }
  }, [graph, selectNode]);

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
              v0.1.18
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
          <div className="space-y-2">
            <PromptInput onOpenSettings={() => setSettingsOpen(true)} />
            <DemoPromptGallery />
            <SessionHistoryPanel />
          </div>
        ) : (
          <NodeObserverBar
            traces={observerTraces}
            traceGroups={observerTraceGroups}
            selectedTraceId={selectedTraceId}
            onSelectTrace={setSelectedTraceId}
            importedTraceIds={importedTraces.map((trace) => trace.id)}
            intakeResult={intakeResult}
            publishedSnapshot={snapshotResult}
            canaryStatus={canaryStatus}
            readiness={observerReadiness}
            onImportTraceFiles={handleImportTraceFiles}
          />
        )}
      </header>

      <main className="relative h-full w-full">
        <GraphCanvas shareUrl={shareUrl} />
      </main>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden max-h-[calc(100vh-9rem)] max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto pr-1 sm:flex">
        {mode === 'reasoning' && graph && <GraphStatsPanel graph={graph} />}
        {mode === 'reasoning' && graph && comparisonGraph && (
          <GraphComparisonPanel primaryGraph={graph} secondaryGraph={comparisonGraph} />
        )}
        <GraphLegend variant={mode === 'observer' ? 'observer' : 'reasoning'} />
      </div>

      <DetailPanel />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ApiKeyModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
