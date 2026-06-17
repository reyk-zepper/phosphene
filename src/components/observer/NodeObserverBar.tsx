import { GitBranch, RadioTower, ShieldCheck } from 'lucide-react';
import type { NodeTrace } from '@/core/traces/types';

interface Props {
  traces: NodeTrace[];
  selectedTraceId: string;
  onSelectTrace: (traceId: string) => void;
}

function sourceCount(trace: NodeTrace): number {
  return new Set(trace.events.map((event) => event.source)).size;
}

export function NodeObserverBar({ traces, selectedTraceId, onSelectTrace }: Props) {
  const selected = traces.find((trace) => trace.id === selectedTraceId) ?? traces[0];

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-4xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
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
                  {trace.title}
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

        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase">
          <ShieldCheck size={12} className="text-[color:var(--glow-decision)]" />
          {selected ? sourceCount(selected) : 0} sources
        </div>
      </div>
    </div>
  );
}
