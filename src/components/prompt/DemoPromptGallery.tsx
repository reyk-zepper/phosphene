import { Play, Sparkles } from 'lucide-react';
import { DEMO_REASONING_PROMPTS } from '@/constants/demoGraph';
import { useSessionStore } from '@/core/store/sessionStore';
import type { DemoReasoningPrompt } from '@/constants/demoGraph';

export function DemoPromptGallery() {
  const currentGraphId = useSessionStore((s) => s.currentGraph?.id ?? null);
  const setGraph = useSessionStore((s) => s.setGraph);

  return (
    <section className="pointer-events-auto mx-auto w-full max-w-3xl rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/70 px-3 py-2.5 backdrop-blur-xl">
      <header className="flex items-center gap-2">
        <Sparkles size={13} className="shrink-0 text-[color:var(--glow-hypothesis)]" />
        <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
          Demo Prompts
        </span>
      </header>

      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {DEMO_REASONING_PROMPTS.map((prompt) => (
          <DemoPromptButton
            key={prompt.id}
            prompt={prompt}
            active={prompt.graph.id === currentGraphId}
            onSelect={() => setGraph(prompt.graph)}
          />
        ))}
      </div>
    </section>
  );
}

function DemoPromptButton({
  prompt,
  active,
  onSelect,
}: {
  prompt: DemoReasoningPrompt;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group grid min-h-[58px] grid-cols-[1fr_auto] gap-2 rounded-md border px-2.5 py-2 text-left transition"
      style={{
        borderColor: active
          ? 'color-mix(in srgb, var(--glow-analysis) 45%, transparent)'
          : 'var(--border-subtle)',
        background: active
          ? 'color-mix(in srgb, var(--glow-analysis) 8%, transparent)'
          : 'color-mix(in srgb, var(--bg-surface) 54%, transparent)',
      }}
    >
      <span className="min-w-0">
        <span className="block truncate font-[family-name:var(--font-display)] text-xs text-[color:var(--text-primary)]">
          {prompt.title}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
          {prompt.subtitle}
        </span>
        <span className="mt-1 block font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
          {prompt.graph.metadata.nodeCount} nodes
        </span>
      </span>
      <span
        className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border transition group-hover:border-[color:var(--glow-analysis)] group-hover:text-[color:var(--glow-analysis)]"
        style={{
          borderColor: active
            ? 'color-mix(in srgb, var(--glow-analysis) 45%, transparent)'
            : 'var(--border-subtle)',
          color: active ? 'var(--glow-analysis)' : 'var(--text-muted)',
        }}
      >
        <Play size={11} />
      </span>
    </button>
  );
}
