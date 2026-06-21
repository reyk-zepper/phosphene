import { GitCompareArrows, Loader2, Square } from 'lucide-react';
import { useLiveComparison } from '@/hooks/useLiveComparison';
import { useSessionStore } from '@/core/store/sessionStore';

export function LiveComparisonControls() {
  const currentGraph = useSessionStore((s) => s.currentGraph);
  const isComparing = useSessionStore((s) => s.isComparing);
  const comparisonError = useSessionStore((s) => s.comparisonError);
  const { availableModels, selectedModel, setSelectedModel, run, cancel } = useLiveComparison();

  if (!currentGraph || availableModels.length === 0) return null;

  return (
    <section className="pointer-events-auto mx-auto w-full max-w-3xl rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/70 px-3 py-2.5 backdrop-blur-xl">
      <header className="flex flex-wrap items-center gap-2">
        <GitCompareArrows size={13} className="shrink-0 text-[color:var(--glow-comparison)]" />
        <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
          Live Compare
        </span>
        <span className="truncate font-mono text-[10px] text-[color:var(--text-muted)]">
          {currentGraph.model.displayName}
        </span>
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={selectedModel ? `${selectedModel.provider}:${selectedModel.model}` : ''}
          onChange={(event) => {
            const next = availableModels.find(
              (model) => `${model.provider}:${model.model}` === event.target.value
            );
            if (next) setSelectedModel(next);
          }}
          disabled={isComparing}
          aria-label="Select comparison model"
          className="min-w-[180px] flex-1 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--text-secondary)] outline-none transition focus:border-[color:var(--glow-comparison)] disabled:opacity-50"
        >
          {availableModels.map((model) => (
            <option key={`${model.provider}:${model.model}`} value={`${model.provider}:${model.model}`}>
              {model.displayName}
            </option>
          ))}
        </select>

        {isComparing ? (
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1.5 rounded-md border border-[color:var(--glow-revision)] px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-[color:var(--glow-revision)] uppercase"
          >
            <Square size={11} /> Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={run}
            disabled={!selectedModel}
            className="flex items-center gap-1.5 rounded-md border border-[color:var(--glow-comparison)] px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-[color:var(--glow-comparison)] uppercase transition hover:text-[color:var(--glow-hypothesis)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <GitCompareArrows size={11} /> Run
          </button>
        )}
      </div>

      {isComparing && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-[color:var(--text-muted)]">
          <Loader2 size={11} className="animate-spin" />
          Running same prompt against {selectedModel?.displayName}
        </p>
      )}
      {comparisonError && (
        <p className="mt-2 rounded-md border border-[color:var(--glow-revision)]/40 bg-[color:var(--glow-revision)]/10 px-2 py-1.5 font-mono text-[10px] text-[color:var(--glow-revision)]">
          {comparisonError}
        </p>
      )}
    </section>
  );
}
