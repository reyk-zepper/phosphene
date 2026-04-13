import { Sparkles } from 'lucide-react';
import { useSessionStore } from '@/core/store/sessionStore';

export function PromptInput() {
  const graph = useSessionStore((s) => s.currentGraph);
  const isStreaming = useSessionStore((s) => s.isStreaming);

  return (
    <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 px-4 py-3 backdrop-blur-xl">
      <Sparkles size={18} className="shrink-0 text-[color:var(--glow-analysis)]" />
      <input
        type="text"
        placeholder={graph?.prompt ?? 'Ask anything…'}
        disabled
        className="flex-1 bg-transparent font-[family-name:var(--font-body)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none"
      />
      <span className="rounded-md border border-[color:var(--border-subtle)] px-2 py-1 font-mono text-[10px] tracking-wider text-[color:var(--text-muted)] uppercase">
        {isStreaming ? 'streaming' : 'demo mode'}
      </span>
    </div>
  );
}
