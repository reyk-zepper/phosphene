import { useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import { compareGraphs, type GraphComparisonMetric } from '@/core/graph/compare';
import type { ReasoningGraph } from '@/core/parser/types';

interface GraphComparisonPanelProps {
  primaryGraph: ReasoningGraph;
  secondaryGraph: ReasoningGraph;
}

export function GraphComparisonPanel({ primaryGraph, secondaryGraph }: GraphComparisonPanelProps) {
  const comparison = useMemo(
    () => compareGraphs(primaryGraph, secondaryGraph),
    [primaryGraph, secondaryGraph]
  );
  const visibleTypeDeltas = comparison.typeDeltas.filter((item) => item.delta !== 0).slice(0, 5);

  return (
    <section className="pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/75 px-3 py-3 backdrop-blur-xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch size={13} className="text-[color:var(--glow-comparison)]" />
            <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
              Graph Compare
            </span>
          </div>
          <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xs text-[color:var(--text-secondary)]">
            {comparison.primary.modelLabel} vs {comparison.secondary.modelLabel}
          </p>
        </div>
        <span
          className="shrink-0 rounded-md border px-2 py-1 font-mono text-[9px] tracking-wider uppercase"
          style={{
            borderColor: comparison.samePrompt
              ? 'color-mix(in srgb, var(--glow-decision) 35%, transparent)'
              : 'color-mix(in srgb, var(--glow-revision) 35%, transparent)',
            color: comparison.samePrompt ? 'var(--glow-decision)' : 'var(--glow-revision)',
          }}
        >
          {comparison.samePrompt ? 'Same prompt' : 'Different prompt'}
        </span>
      </header>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {comparison.metrics.map((metricItem) => (
          <MetricCell key={metricItem.id} metric={metricItem} />
        ))}
      </div>

      {comparison.highlights.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {comparison.highlights.slice(0, 2).map((highlight) => (
            <li
              key={highlight.metricId}
              className="font-mono text-[10px] leading-relaxed text-[color:var(--text-secondary)]"
            >
              {highlight.summary}
            </li>
          ))}
        </ul>
      )}

      {visibleTypeDeltas.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {visibleTypeDeltas.map((item) => {
            const width = `${Math.min(100, Math.max(16, Math.abs(item.delta) * 32))}%`;
            return (
              <div key={item.type} className="grid grid-cols-[86px_1fr_38px] items-center gap-2">
                <span className="truncate font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
                  {item.label}
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <span
                    className="block h-full rounded-full bg-[color:var(--glow-comparison)]"
                    style={{ width, opacity: item.delta > 0 ? 0.9 : 0.45 }}
                  />
                </span>
                <span className="text-right font-mono text-[10px] text-[color:var(--text-secondary)]">
                  {item.delta > 0 ? '+' : ''}
                  {item.delta}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MetricCell({ metric }: { metric: GraphComparisonMetric }) {
  return (
    <div className="min-w-0">
      <span className="block truncate font-mono text-[8px] tracking-wider text-[color:var(--text-muted)] uppercase">
        {metric.label}
      </span>
      <span className="mt-1 block font-[family-name:var(--font-display)] text-sm text-[color:var(--text-primary)]">
        {formatMetricValue(metric)}
      </span>
      <span
        className="block font-mono text-[9px]"
        style={{
          color:
            metric.delta == null || metric.delta === 0
              ? 'var(--text-muted)'
              : metric.delta > 0
                ? 'var(--glow-decision)'
                : 'var(--glow-revision)',
        }}
      >
        {formatMetricDelta(metric)}
      </span>
    </div>
  );
}

function formatMetricValue(metric: GraphComparisonMetric): string {
  if (metric.primaryValue == null) return '-';
  if (metric.id === 'avg_confidence') return `${Math.round(metric.primaryValue * 100)}%`;
  return String(metric.primaryValue);
}

function formatMetricDelta(metric: GraphComparisonMetric): string {
  if (metric.delta == null || metric.delta === 0) return '0';
  const prefix = metric.delta > 0 ? '+' : '';
  if (metric.id === 'avg_confidence') return `${prefix}${Math.round(metric.delta * 100)}pp`;
  return `${prefix}${metric.delta}`;
}
