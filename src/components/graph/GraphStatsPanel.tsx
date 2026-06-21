import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Activity, Gauge } from 'lucide-react';
import { summarizeGraphStats } from '@/core/graph/stats';
import type { ReasoningGraph } from '@/core/parser/types';

interface GraphStatsPanelProps {
  graph: ReasoningGraph;
}

export function GraphStatsPanel({ graph }: GraphStatsPanelProps) {
  const stats = useMemo(() => summarizeGraphStats(graph), [graph]);
  const topHotspots = stats.tokenHotspots.slice(0, 4);

  return (
    <section className="pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/75 px-3 py-3 backdrop-blur-xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-[color:var(--glow-analysis)]" />
            <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
              Reasoning Stats
            </span>
          </div>
          <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xs text-[color:var(--text-secondary)]">
            {graph.model.displayName}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-[color:var(--border-subtle)] px-2 py-1 font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
          {formatDuration(stats.overview.timeToComplete)}
        </span>
      </header>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <StatCell label="Tokens" value={String(stats.overview.totalTokens)} />
        <StatCell label="Depth" value={String(stats.overview.maxDepth)} />
        <StatCell label="Branches" value={String(stats.overview.branchCount)} />
        <StatCell
          label="Confidence"
          value={stats.overview.averageConfidence == null ? '-' : formatPercent(stats.overview.averageConfidence)}
        />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
        <section>
          <PanelTitle icon={<Gauge size={11} />}>Confidence</PanelTitle>
          <div className="mt-2 space-y-1.5">
            {stats.confidenceBands.map((band) => (
              <BarRow
                key={band.id}
                label={band.label}
                value={`${band.nodeCount}`}
                width={band.percentage}
                tone={band.id === 'unknown' ? 'muted' : band.id}
              />
            ))}
          </div>
        </section>

        <section>
          <PanelTitle>Depth tokens</PanelTitle>
          <div className="mt-2 space-y-1.5">
            {stats.depthDistribution.map((bucket) => (
              <BarRow
                key={bucket.depth}
                label={`D${bucket.depth}`}
                value={String(bucket.tokenCount)}
                width={bucket.percentageOfTokens}
                tone="analysis"
              />
            ))}
          </div>
        </section>
      </div>

      <section className="mt-3">
        <PanelTitle>Token hotspots</PanelTitle>
        <div className="mt-2 space-y-1.5">
          {topHotspots.map((hotspot) => (
            <BarRow
              key={hotspot.id}
              label={hotspot.summary}
              value={String(hotspot.tokenCount)}
              width={hotspot.percentageOfGraphTokens}
              tone="comparison"
            />
          ))}
        </div>
      </section>
    </section>
  );
}

function PanelTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
      {icon ? <span className="text-[color:var(--glow-analysis)]">{icon}</span> : null}
      {children}
    </h3>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block truncate font-mono text-[8px] tracking-wider text-[color:var(--text-muted)] uppercase">
        {label}
      </span>
      <span className="mt-1 block truncate font-[family-name:var(--font-display)] text-sm text-[color:var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function BarRow({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: string;
  width: number;
  tone: 'high' | 'medium' | 'low' | 'muted' | 'analysis' | 'comparison';
}) {
  return (
    <div className="grid grid-cols-[68px_1fr_34px] items-center gap-2">
      <span className="truncate font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
        {label}
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.max(6, Math.round(width * 100))}%`,
            background: toneColor(tone),
          }}
        />
      </span>
      <span className="text-right font-mono text-[10px] text-[color:var(--text-secondary)]">
        {value}
      </span>
    </div>
  );
}

function toneColor(tone: 'high' | 'medium' | 'low' | 'muted' | 'analysis' | 'comparison'): string {
  switch (tone) {
    case 'high':
      return 'var(--glow-decision)';
    case 'medium':
      return 'var(--glow-evidence)';
    case 'low':
      return 'var(--glow-revision)';
    case 'analysis':
      return 'var(--glow-analysis)';
    case 'comparison':
      return 'var(--glow-comparison)';
    case 'muted':
      return 'var(--text-muted)';
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining === 0 ? `${minutes}m` : `${minutes}m ${remaining}s`;
}
