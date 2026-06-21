import { ArrowUp, ChevronDown, Sparkles, Square } from 'lucide-react';
import { useCallback, useState } from 'react';
import { getAdapter } from '@/core/adapters';
import { useSessionStore } from '@/core/store/sessionStore';
import { useSettingsStore } from '@/core/store/settingsStore';
import { useStreaming } from '@/hooks/useStreaming';
import { ModelPicker } from './ModelPicker';

interface Props {
  onOpenSettings: () => void;
}

export function PromptInput({ onOpenSettings }: Props) {
  const isStreaming = useSessionStore((s) => s.isStreaming);
  const error = useSessionStore((s) => s.error);
  const model = useSettingsStore((s) => s.defaultModel);
  const hasKey = useSettingsStore((s) => {
    if (s.defaultModel.provider === 'custom-openai') return false;
    return Boolean(s.encodedKeys[s.defaultModel.provider]);
  });
  const customProfileReady = useSettingsStore(
    (s) =>
      s.defaultModel.provider !== 'custom-openai' ||
      s.customOpenAIProfiles.some((profile) => profile.id === s.defaultModel.model)
  );
  const { submit, cancel } = useStreaming();

  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const adapter = getAdapter(model.provider);
  const requiresKey = adapter?.requiresApiKey ?? true;
  const canSubmit = model.provider === 'custom-openai' ? customProfileReady : !requiresKey || hasKey;
  const placeholder = canSubmit
    ? 'Ask anything…'
    : model.provider === 'custom-openai'
      ? 'Add a custom API profile to start'
      : 'Add your API key to start (click ⚙)';

  const handleSubmit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!canSubmit) {
      onOpenSettings();
      return;
    }
    submit(trimmed);
  }, [draft, canSubmit, onOpenSettings, submit]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-3xl">
      <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/80 px-4 py-3 backdrop-blur-xl">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-[color:var(--glow-analysis)]" />
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={isStreaming}
          className="max-h-48 min-h-[22px] flex-1 resize-none bg-transparent font-[family-name:var(--font-body)] text-sm leading-relaxed text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none disabled:opacity-60"
        />
        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            aria-label="Change model"
            className="flex items-center gap-1 rounded-md border border-[color:var(--border-subtle)] px-2 py-1 font-mono text-[10px] tracking-wider text-[color:var(--text-muted)] uppercase transition hover:border-[color:var(--glow-analysis)] hover:text-[color:var(--text-primary)]"
          >
            <span className="max-w-36 truncate">{model.displayName}</span>
            <ChevronDown size={10} />
          </button>
          <ModelPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onOpenSettings={onOpenSettings}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={cancel}
              aria-label="Stop streaming"
              className="flex h-8 w-8 items-center justify-center rounded-full border transition"
              style={{
                borderColor: 'var(--glow-revision)',
                color: 'var(--glow-revision)',
                boxShadow: '0 0 14px color-mix(in srgb, var(--glow-revision) 40%, transparent)',
              }}
            >
              <Square size={12} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!draft.trim()}
              aria-label="Send prompt"
              className="flex h-8 w-8 items-center justify-center rounded-full border transition disabled:opacity-30"
              style={{
                borderColor: 'var(--glow-hypothesis)',
                color: 'var(--glow-hypothesis)',
                boxShadow: draft.trim()
                  ? '0 0 16px color-mix(in srgb, var(--glow-hypothesis) 45%, transparent)'
                  : 'none',
              }}
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
      </div>
      {error && (
        <div
          className="mt-2 rounded-lg border px-3 py-2 font-mono text-[11px]"
          style={{
            borderColor: 'color-mix(in srgb, var(--glow-revision) 40%, transparent)',
            background: 'color-mix(in srgb, var(--glow-revision) 10%, transparent)',
            color: 'var(--glow-revision)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
