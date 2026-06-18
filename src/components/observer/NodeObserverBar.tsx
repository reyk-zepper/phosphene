import { AlertTriangle, CheckCircle, GitBranch, RadioTower, ShieldCheck, Upload } from 'lucide-react';
import type { ObserverTraceGroup } from '@/constants/demoTraces';
import type { BoundaryValidationCheck } from '@/core/traces/boundaryValidation';
import type { NodeTrace } from '@/core/traces/types';
import { RunSummaryPanel } from './RunSummaryPanel';

export type TraceImportStatus =
  | { type: 'idle' }
  | { type: 'success'; message: string; checks?: BoundaryValidationCheck[] }
  | { type: 'error'; message: string; errors: string[]; checks?: BoundaryValidationCheck[] };

interface Props {
  traces: NodeTrace[];
  traceGroups?: ObserverTraceGroup[];
  selectedTraceId: string;
  onSelectTrace: (traceId: string) => void;
  importedTraceIds?: string[];
  importStatus?: TraceImportStatus;
  onImportTraceFile?: (file: File) => void;
}

function sourceCount(trace: NodeTrace): number {
  return new Set(trace.events.map((event) => event.source)).size;
}

function checkLabel(id: BoundaryValidationCheck['id']): string {
  return id.replace('_', ' ');
}

function ImportValidationPanel({ status }: { status: TraceImportStatus }) {
  if (status.type === 'idle') return null;

  return (
    <div
      className="mt-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 px-3 py-2 font-mono text-[10px] text-[color:var(--text-secondary)] backdrop-blur-xl"
      role={status.type === 'error' ? 'alert' : 'status'}
    >
      <div className="flex items-center gap-2">
        {status.type === 'success' ? (
          <CheckCircle size={12} className="text-[color:var(--glow-decision)]" />
        ) : (
          <AlertTriangle size={12} className="text-[color:var(--glow-revision)]" />
        )}
        <span className="tracking-wider uppercase">{status.message}</span>
      </div>

      {status.checks && status.checks.length > 0 && (
        <div className="mt-2 grid gap-1 sm:grid-cols-2 md:grid-cols-3">
          {status.checks.map((check) => (
            <div
              key={check.id}
              className="flex items-center justify-between gap-2 rounded-md border border-[color:var(--border-subtle)] px-2 py-1"
              title={check.message}
            >
              <span className="tracking-wider uppercase">{checkLabel(check.id)}</span>
              <span
                className={
                  check.status === 'passed'
                    ? 'text-[color:var(--glow-decision)] uppercase'
                    : 'text-[color:var(--glow-revision)] uppercase'
                }
              >
                {check.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {status.type === 'error' && status.errors.length > 0 && (
        <ul className="mt-1 list-disc pl-5 leading-relaxed text-[color:var(--text-muted)]">
          {status.errors.slice(0, 3).map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NodeObserverBar({
  traces,
  traceGroups = [],
  selectedTraceId,
  onSelectTrace,
  importedTraceIds = [],
  importStatus = { type: 'idle' },
  onImportTraceFile,
}: Props) {
  const selected = traces.find((trace) => trace.id === selectedTraceId) ?? traces[0];
  const importedIds = new Set(importedTraceIds);
  const importedTraces = traces.filter((trace) => importedIds.has(trace.id));
  const selectedGroup = traceGroups.find((group) => group.traces.some((trace) => trace.id === selected?.id));
  const selectedBadge = selected && importedIds.has(selected.id)
    ? 'Imported local trace'
    : selectedGroup?.badge ?? 'Redacted demo traces';
  const selectedDescription = selected && importedIds.has(selected.id)
    ? 'Local Boundary JSON validated in browser.'
    : selectedGroup?.description ?? 'AI node trace';

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-[260px] flex-1 items-center gap-3">
          <RadioTower size={18} className="shrink-0 text-[color:var(--glow-hypothesis)]" />
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full border border-[color:var(--glow-decision)]/50 px-2 py-0.5 font-mono text-[9px] tracking-widest text-[color:var(--glow-decision)] uppercase">
                {selectedBadge}
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
              {importedTraces.length > 0 && (
                <optgroup label="Imported Local Files">
                  {importedTraces.map((trace) => (
                    <option key={trace.id} value={trace.id}>
                      {trace.title}
                    </option>
                  ))}
                </optgroup>
              )}
              {traceGroups.length > 0
                ? traceGroups.map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {group.traces.map((trace) => (
                        <option key={trace.id} value={trace.id}>
                          {trace.title}
                        </option>
                      ))}
                    </optgroup>
                  ))
                : traces.map((trace) => (
                    <option key={trace.id} value={trace.id}>
                      {trace.title}
                    </option>
                  ))}
            </select>
            <p className="truncate font-mono text-[10px] tracking-wider text-[color:var(--text-muted)] uppercase">
              {selected?.subtitle ?? selectedDescription}
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

      {selected && <RunSummaryPanel trace={selected} />}

      <ImportValidationPanel status={importStatus} />
    </div>
  );
}
