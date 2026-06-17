import { AlertTriangle, CheckCircle, GitBranch, RadioTower, ShieldCheck, Upload } from 'lucide-react';
import type { NodeTrace } from '@/core/traces/types';

export type TraceImportStatus =
  | { type: 'idle' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; errors: string[] };

interface Props {
  traces: NodeTrace[];
  selectedTraceId: string;
  onSelectTrace: (traceId: string) => void;
  importedTraceIds?: string[];
  importStatus?: TraceImportStatus;
  onImportTraceFile?: (file: File) => void;
}

function sourceCount(trace: NodeTrace): number {
  return new Set(trace.events.map((event) => event.source)).size;
}

export function NodeObserverBar({
  traces,
  selectedTraceId,
  onSelectTrace,
  importedTraceIds = [],
  importStatus = { type: 'idle' },
  onImportTraceFile,
}: Props) {
  const selected = traces.find((trace) => trace.id === selectedTraceId) ?? traces[0];
  const importedIds = new Set(importedTraceIds);

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-[260px] flex-1 items-center gap-3">
          <RadioTower size={18} className="shrink-0 text-[color:var(--glow-hypothesis)]" />
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full border border-[color:var(--glow-decision)]/50 px-2 py-0.5 font-mono text-[9px] tracking-widest text-[color:var(--glow-decision)] uppercase">
                Redacted demo traces
              </span>
              <span className="font-mono text-[9px] tracking-widest text-[color:var(--text-muted)] uppercase">
                No live telemetry
              </span>
            </div>
            <select
              value={selectedTraceId}
              onChange={(event) => onSelectTrace(event.target.value)}
              className="w-full appearance-none bg-transparent font-[family-name:var(--font-display)] text-sm font-semibold text-[color:var(--text-primary)] outline-none"
              aria-label="Select AI node trace"
            >
              {traces.map((trace) => (
                <option key={trace.id} value={trace.id}>
                  {importedIds.has(trace.id) ? `${trace.title} (imported)` : trace.title}
                </option>
              ))}
            </select>
            <p className="truncate font-mono text-[10px] tracking-wider text-[color:var(--text-muted)] uppercase">
              {selected?.subtitle ?? 'AI node trace'}
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase sm:flex">
          <GitBranch size={12} className="text-[color:var(--glow-comparison)]" />
          {selected?.events.length ?? 0} events
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--glow-decision)]" />
          {selected?.status ?? 'running'}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase">
          <ShieldCheck size={12} className="text-[color:var(--glow-decision)]" />
          {selected ? sourceCount(selected) : 0} sources
        </div>

        {onImportTraceFile && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase transition hover:border-[color:var(--glow-hypothesis)] hover:text-[color:var(--glow-hypothesis)]">
            <Upload size={12} />
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) onImportTraceFile(file);
              }}
            />
          </label>
        )}
      </div>

      {importStatus.type !== 'idle' && (
        <div
          className="mt-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 px-3 py-2 font-mono text-[10px] text-[color:var(--text-secondary)] backdrop-blur-xl"
          role={importStatus.type === 'error' ? 'alert' : 'status'}
        >
          <div className="flex items-center gap-2">
            {importStatus.type === 'success' ? (
              <CheckCircle size={12} className="text-[color:var(--glow-decision)]" />
            ) : (
              <AlertTriangle size={12} className="text-[color:var(--glow-revision)]" />
            )}
            <span className="tracking-wider uppercase">{importStatus.message}</span>
          </div>
          {importStatus.type === 'error' && importStatus.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 leading-relaxed text-[color:var(--text-muted)]">
              {importStatus.errors.slice(0, 3).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
