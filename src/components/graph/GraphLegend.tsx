import { NODE_TYPE_CONFIG, NODE_TYPE_ORDER } from '@/constants/nodeTypes';

interface Props {
  variant?: 'reasoning' | 'observer';
}

const observerItems = [
  { label: 'Hermes', color: 'var(--glow-hypothesis)' },
  { label: 'OpenClaw', color: 'var(--glow-comparison)' },
  { label: 'AAG', color: 'var(--glow-decision)' },
  { label: 'Sentinel', color: 'var(--glow-evidence)' },
];

export function GraphLegend({ variant = 'reasoning' }: Props) {
  const items =
    variant === 'observer'
      ? observerItems
      : NODE_TYPE_ORDER.map((type) => ({
          label: NODE_TYPE_CONFIG[type].label,
          color: NODE_TYPE_CONFIG[type].cssVar,
        }));

  return (
    <div className="pointer-events-auto flex flex-col gap-1.5 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/70 px-3 py-3 backdrop-blur-xl">
      <span className="mb-1 font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
        {variant === 'observer' ? 'Sources' : 'Node Types'}
      </span>
      {items.map((item) => {
        return (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: item.color,
                boxShadow: `0 0 8px ${item.color}`,
              }}
            />
            <span className="font-[family-name:var(--font-display)] text-xs text-[color:var(--text-secondary)]">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
