import { AlertTriangle, CheckCircle, GitBranch, RadioTower, ShieldCheck, Upload } from 'lucide-react';
import type { ObserverTraceGroup } from '@/constants/demoTraces';
import type { TraceIntakeBatchResult, TraceIntakeItemResult } from '@/core/traces/intake';
import type { ObserverReadinessItem } from '@/core/traces/readiness';
import type { NodeTrace } from '@/core/traces/types';
import { RunSummaryPanel } from './RunSummaryPanel';

interface Props {
  traces: NodeTrace[];
  traceGroups?: ObserverTraceGroup[];
  selectedTraceId: string;
  onSelectTrace: (traceId: string) => void;
  importedTraceIds?: string[];
  intakeResult?: TraceIntakeBatchResult;
  readiness?: ObserverReadinessItem[];
  onImportTraceFiles?: (files: File[]) => void;
}

function sourceCount(trace: NodeTrace): number {
  return new Set(trace.events.map((event) => event.source)).size;
}

function kindLabel(kind: TraceIntakeItemResult['kind']): string {
  return kind.replace('_', ' ');
}

function itemSummary(item: TraceIntakeItemResult): string {
  if (item.status === 'imported' && item.trace) return item.trace.title;
  if (item.kind === 'manifest' && item.manifest) {
    return `${item.manifest.sourceAgent ?? 'unknown'} manifest · ${item.manifest.files.length} files`;
  }
  if (item.kind === 'validation_report' && item.validationReport) {
    return `Validation report · ${item.validationReport.overallStatus ?? 'unknown'} · ${item.validationReport.traceResultCount} traces`;
  }
  if (item.errors.length > 0) return item.errors[0];
  return 'No graph trace imported';
}

function statusClass(status: TraceIntakeItemResult['status']): string {
  if (status === 'blocked') return 'text-[color:var(--glow-revision)]';
  if (status === 'ignored') return 'text-[color:var(--text-muted)]';
  return 'text-[color:var(--glow-decision)]';
}

function readinessStatusClass(status: ObserverReadinessItem['status']): string {
  if (status === 'not_connected') return 'text-[color:var(--text-muted)]';
  if (status === 'partial') return 'text-[color:var(--glow-revision)]';
  return 'text-[color:var(--glow-decision)]';
}

function ObserverReadinessPanel({ items = [] }: { items?: ObserverReadinessItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2 grid gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 p-3 font-mono text-[10px] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.id} className="min-w-0 rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate tracking-wider text-[color:var(--text-muted)] uppercase">{item.label}</span>
            <span className={`shrink-0 tracking-wider uppercase ${readinessStatusClass(item.status)}`}>
              {item.status}
            </span>
          </div>
          <p className="truncate text-[color:var(--text-secondary)]">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

function IntakeResultsPanel({ result }: { result?: TraceIntakeBatchResult }) {
  if (!result) return null;

  const blockedCount = result.items.filter((item) => item.status === 'blocked').length;
  const icon = blockedCount > 0 && result.summary.acceptedTraceCount === 0
    ? <AlertTriangle size={12} className="text-[color:var(--glow-revision)]" />
    : <CheckCircle size={12} className="text-[color:var(--glow-decision)]" />;

  return (
    <div
      className="mt-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 px-3 py-2 font-mono text-[10px] text-[color:var(--text-secondary)] backdrop-blur-xl"
      role={blockedCount > 0 ? 'alert' : 'status'}
    >
      <div className="flex flex-wrap items-center gap-2">
        {icon}
        <span className="tracking-wider uppercase">
          Intake {result.summary.overallStatus}: {result.summary.acceptedTraceCount} traces · {result.summary.supportFileCount} support · {blockedCount} blocked
        </span>
        {result.manifest && (
          <span className="text-[color:var(--text-muted)] uppercase">
            Manifest {result.manifest.sourceAgent ?? 'unknown'} · {result.manifest.files.length} files
          </span>
        )}
        {result.validationReport && (
          <span className="text-[color:var(--text-muted)] uppercase">
            Report {result.validationReport.overallStatus ?? 'unknown'}
          </span>
        )}
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-[color:var(--border-subtle)]">
        {result.items.map((item) => (
          <div
            key={`${item.fileName}-${item.kind}`}
            className="grid gap-2 border-b border-[color:var(--border-subtle)] px-2 py-1.5 last:border-b-0 sm:grid-cols-[1fr_100px_120px_1.4fr]"
          >
            <span className="truncate text-[color:var(--text-primary)]">{item.fileName}</span>
            <span className="tracking-wider text-[color:var(--text-muted)] uppercase">{kindLabel(item.kind)}</span>
            <span className={`tracking-wider uppercase ${statusClass(item.status)}`}>{item.status}</span>
            <div className="min-w-0">
              <p className="truncate text-[color:var(--text-muted)]">{itemSummary(item)}</p>
              {item.checks && item.checks.some((check) => check.status === 'failed') && (
                <p className="truncate text-[color:var(--glow-revision)]">
                  Failed checks: {item.checks.filter((check) => check.status === 'failed').map((check) => check.id).join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NodeObserverBar({
  traces,
  traceGroups = [],
  selectedTraceId,
  onSelectTrace,
  importedTraceIds = [],
  intakeResult,
  readiness,
  onImportTraceFiles,
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

        {onImportTraceFiles && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase transition hover:border-[color:var(--glow-hypothesis)] hover:text-[color:var(--glow-hypothesis)]">
            <Upload size={12} />
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              multiple
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = '';
                if (files.length > 0) onImportTraceFiles(files);
              }}
            />
          </label>
        )}
      </div>

      {selected && <RunSummaryPanel trace={selected} />}

      <ObserverReadinessPanel items={readiness} />

      <IntakeResultsPanel result={intakeResult} />
    </div>
  );
}
