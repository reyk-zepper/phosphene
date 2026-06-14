import { Activity, BrainCircuit } from 'lucide-react';

export type AppMode = 'observer' | 'reasoning';

interface Props {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const modes: Array<{
  id: AppMode;
  label: string;
  Icon: typeof Activity;
}> = [
  { id: 'observer', label: 'Node Observer', Icon: Activity },
  { id: 'reasoning', label: 'Reasoning Lab', Icon: BrainCircuit },
];

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <div className="flex rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 p-1 backdrop-blur-xl">
      {modes.map(({ id, label, Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase transition"
            style={{
              background: active ? 'var(--bg-elevated)' : 'transparent',
              color: active ? 'var(--glow-hypothesis)' : 'var(--text-muted)',
              boxShadow: active
                ? '0 0 18px color-mix(in srgb, var(--glow-hypothesis) 18%, transparent)'
                : 'none',
            }}
            aria-pressed={active}
          >
            <Icon size={12} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
