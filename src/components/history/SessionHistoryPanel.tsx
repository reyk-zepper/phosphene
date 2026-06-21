import { Download, FileUp, History, RotateCcw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  buildSessionBundleFileName,
  createPortableSessionBundle,
} from '@/core/history/sessionBundle';
import { useSessionStore } from '@/core/store/sessionStore';
import type { SessionHistoryEntry } from '@/core/history/sessionHistory';

export function SessionHistoryPanel() {
  const history = useSessionStore((s) => s.history);
  const currentGraph = useSessionStore((s) => s.currentGraph);
  const currentGraphId = currentGraph?.id ?? null;
  const importPortableSessionBundle = useSessionStore((s) => s.importPortableSessionBundle);
  const restoreHistoryEntry = useSessionStore((s) => s.restoreHistoryEntry);
  const clearHistory = useSessionStore((s) => s.clearHistory);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const handleExportSession = () => {
    if (!currentGraph) return;
    const bundle = createPortableSessionBundle(currentGraph);
    if (!bundle) {
      setStatus({ tone: 'error', text: 'Session blocked by redaction guard' });
      return;
    }

    downloadBlob(
      new Blob([`${JSON.stringify(bundle, null, 2)}\n`], { type: 'application/json;charset=utf-8' }),
      buildSessionBundleFileName(currentGraph.id)
    );
    setStatus({ tone: 'ok', text: 'Session bundle exported' });
  };

  const handleImportSession = async (file: File) => {
    const result = importPortableSessionBundle(await file.text());
    if (result.status === 'imported') {
      setStatus({ tone: 'ok', text: 'Session bundle imported' });
      return;
    }

    setStatus({ tone: 'error', text: result.errors[0] ?? 'Session bundle blocked' });
  };

  if (history.length === 0 && !currentGraph) return null;

  return (
    <section className="pointer-events-auto mx-auto w-full max-w-3xl rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/70 px-3 py-2.5 backdrop-blur-xl">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <History size={13} className="shrink-0 text-[color:var(--glow-comparison)]" />
          <span className="truncate font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
            Session History
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportSession}
            aria-label="Export portable session bundle"
            title="Export portable session bundle"
            disabled={!currentGraph}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] transition hover:border-[color:var(--glow-decision)] hover:text-[color:var(--glow-decision)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={12} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import portable session bundle"
            title="Import portable session bundle"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] transition hover:border-[color:var(--glow-analysis)] hover:text-[color:var(--glow-analysis)]"
          >
            <FileUp size={12} />
          </button>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              aria-label="Clear session history"
              title="Clear session history"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] transition hover:border-[color:var(--glow-revision)] hover:text-[color:var(--glow-revision)]"
            >
              <Trash2 size={12} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Portable session bundle file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) void handleImportSession(file);
            }}
          />
        </div>
      </header>

      {status && (
        <div
          role={status.tone === 'error' ? 'alert' : 'status'}
          className="mt-2 rounded-md border border-[color:var(--border-subtle)] px-2 py-1 font-mono text-[9px] tracking-wider uppercase"
          style={{
            color: status.tone === 'error' ? 'var(--glow-revision)' : 'var(--glow-decision)',
            background: 'color-mix(in srgb, var(--bg-surface) 42%, transparent)',
          }}
        >
          {status.text}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {history.slice(0, 4).map((entry) => (
            <HistoryButton
              key={entry.id}
              entry={entry}
              active={entry.graphId === currentGraphId}
              onRestore={() => restoreHistoryEntry(entry.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryButton({
  entry,
  active,
  onRestore,
}: {
  entry: SessionHistoryEntry;
  active: boolean;
  onRestore: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRestore}
      className="group grid min-h-[66px] grid-cols-[1fr_auto] gap-2 rounded-md border px-2.5 py-2 text-left transition"
      style={{
        borderColor: active
          ? 'color-mix(in srgb, var(--glow-hypothesis) 45%, transparent)'
          : 'var(--border-subtle)',
        background: active
          ? 'color-mix(in srgb, var(--glow-hypothesis) 8%, transparent)'
          : 'color-mix(in srgb, var(--bg-surface) 54%, transparent)',
      }}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
            {entry.modelLabel}
          </span>
          <span className="shrink-0 font-mono text-[9px] text-[color:var(--text-muted)]">
            {formatHistoryTime(entry.updatedAt)}
          </span>
        </span>
        <span className="mt-1 line-clamp-2 block text-xs leading-snug text-[color:var(--text-secondary)]">
          {entry.promptPreview}
        </span>
        <span className="mt-1 block font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
          {entry.nodeCount} nodes - {entry.totalTokens} tokens
        </span>
      </span>
      <span
        className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border transition group-hover:border-[color:var(--glow-hypothesis)] group-hover:text-[color:var(--glow-hypothesis)]"
        style={{
          borderColor: active
            ? 'color-mix(in srgb, var(--glow-hypothesis) 45%, transparent)'
            : 'var(--border-subtle)',
          color: active ? 'var(--glow-hypothesis)' : 'var(--text-muted)',
        }}
      >
        <RotateCcw size={12} />
      </span>
    </button>
  );
}

function formatHistoryTime(timestamp: number): string {
  const elapsedMs = Date.now() - timestamp;
  if (elapsedMs < 60_000) return 'now';
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
