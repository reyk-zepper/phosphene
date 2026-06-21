import { useMemo } from 'react';
import { Library } from 'lucide-react';
import { detectReasoningPatterns } from '@/core/graph/patterns';
import type { ReasoningGraph } from '@/core/parser/types';

interface PatternLibraryPanelProps {
  graph: ReasoningGraph;
}

export function PatternLibraryPanel({ graph }: PatternLibraryPanelProps) {
  const report = useMemo(() => detectReasoningPatterns(graph), [graph]);
  const visiblePatterns = report.patterns.slice(0, 4);

  return (
    <section className="pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/75 px-3 py-3 backdrop-blur-xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Library size={13} className="text-[color:var(--glow-evidence)]" />
            <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
              Pattern Library
            </span>
          </div>
          <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xs text-[color:var(--text-secondary)]">
            {report.totalMatches > 0 ? `${report.totalMatches} detected reasoning patterns` : 'No known patterns detected'}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-[color:var(--border-subtle)] px-2 py-1 font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
          {Math.round(report.coverage * 100)}% nodes
        </span>
      </header>

      {visiblePatterns.length > 0 ? (
        <div className="mt-3 space-y-2">
          {visiblePatterns.map((pattern) => (
            <div
              key={pattern.id}
              className="rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-2"
              style={{
                background: 'color-mix(in srgb, var(--bg-surface) 48%, transparent)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
                  {pattern.label}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[color:var(--glow-evidence)]">
                  {pattern.matches.length}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-[color:var(--text-secondary)]">
                {pattern.matches[0]?.summary ?? pattern.description}
              </p>
              <span className="mt-1 block truncate font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
                {pattern.queryHint}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {report.catalog.slice(0, 4).map((pattern) => (
            <div key={pattern.id} className="min-w-0 rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-2">
              <span className="block truncate font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
                {pattern.label}
              </span>
              <span className="mt-1 block truncate font-mono text-[9px] text-[color:var(--text-secondary)]">
                {pattern.queryHint}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
