import { NODE_TYPE_CONFIG, NODE_TYPE_ORDER } from '@/constants/nodeTypes';

export function GraphLegend() {
  return (
    <div className="pointer-events-auto flex flex-col gap-1.5 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/70 px-3 py-3 backdrop-blur-xl">
      <span className="mb-1 font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
        Node Types
      </span>
      {NODE_TYPE_ORDER.map((type) => {
        const cfg = NODE_TYPE_CONFIG[type];
        return (
          <div key={type} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: cfg.cssVar,
                boxShadow: `0 0 8px ${cfg.cssVar}`,
              }}
            />
            <span className="font-[family-name:var(--font-display)] text-xs text-[color:var(--text-secondary)]">
              {cfg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
