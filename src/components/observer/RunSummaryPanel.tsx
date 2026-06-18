import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Clock3, RadioTower, Shield, ShieldAlert } from 'lucide-react';
import type { NodeTrace, TraceRisk, TraceStatus } from '@/core/traces/types';

interface Props {
  trace: NodeTrace;
}

const RISK_LABEL: Record<TraceRisk, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
};

const STATUS_LABEL: Record<TraceStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  needs_approval: 'Needs approval',
  approved: 'Approved',
  denied: 'Denied',
  succeeded: 'Succeeded',
  failed: 'Failed',
  recovered: 'Recovered',
};

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function formatSources(trace: NodeTrace): string {
  return trace.summary.sources.map((source) => source.toUpperCase()).join(' / ');
}

export function RunSummaryPanel({ trace }: Props) {
  const summary = trace.summary;
  const risk = summary.highestRisk ? RISK_LABEL[summary.highestRisk] : 'No risk flagged';
  const interruptions = summary.failureCount + summary.recoveryCount;

  return (
    <div className="mt-2 grid gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 p-3 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-6">
      <SummaryTile
        icon={<CheckCircle size={13} />}
        label="Outcome"
        value={STATUS_LABEL[summary.terminalStatus]}
      />
      <SummaryTile
        icon={<ShieldAlert size={13} />}
        label="Highest risk"
        value={risk}
      />
      <SummaryTile
        icon={<RadioTower size={13} />}
        label="Systems"
        value={formatSources(trace)}
      />
      <SummaryTile
        icon={<Shield size={13} />}
        label="Approvals"
        value={String(summary.approvalCount)}
      />
      <SummaryTile
        icon={<AlertTriangle size={13} />}
        label="Failures / recovery"
        value={String(interruptions)}
      />
      <SummaryTile
        icon={<Clock3 size={13} />}
        label="Duration"
        value={formatDuration(summary.durationMs)}
      />
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[color:var(--border-subtle)] px-3 py-2">
      <dt className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
        <span className="text-[color:var(--glow-decision)]">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 truncate font-mono text-[11px] text-[color:var(--text-secondary)]">
        {value}
      </dd>
    </div>
  );
}
