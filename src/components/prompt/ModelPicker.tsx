import { AnimatePresence, motion } from 'framer-motion';
import { Check, Cpu, KeyRound, Plus, Plug, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { LLMAdapter } from '@/core/adapters';
import { ADAPTERS } from '@/core/adapters';
import type { ModelIdentifier } from '@/core/parser/types';
import { buildCustomOpenAIModel } from '@/core/settings/customApiProfiles';
import { useSettingsStore } from '@/core/store/settingsStore';
import { useOllamaStatus } from '@/hooks/useOllamaStatus';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function ModelPicker({ open, onClose, onOpenSettings }: Props) {
  const current = useSettingsStore((s) => s.defaultModel);
  const setDefaultModel = useSettingsStore((s) => s.setDefaultModel);
  const hasAnthropicKey = useSettingsStore((s) => Boolean(s.encodedKeys.anthropic));
  const hasOpenAIKey = useSettingsStore((s) => Boolean(s.encodedKeys.openai));
  const hasGoogleKey = useSettingsStore((s) => Boolean(s.encodedKeys.google));
  const customProfiles = useSettingsStore((s) => s.customOpenAIProfiles);

  const ollama = useOllamaStatus();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleSelect = (model: ModelIdentifier) => {
    setDefaultModel(model);
    onClose();
  };

  const claude = ADAPTERS.anthropic;
  const openai = ADAPTERS.openai;
  const gemini = ADAPTERS.google;
  const ollamaAdapter: LLMAdapter | null = ADAPTERS.ollama;
  const customModels = customProfiles.map(buildCustomOpenAIModel);

  const ollamaModels: ModelIdentifier[] =
    ollama.data?.status === 'ok' && ollama.data.models.length > 0
      ? ollama.data.models.map((m) => ({
          provider: 'ollama' as const,
          model: m.name,
          displayName: m.name,
        }))
      : (ollamaAdapter?.supportedModels ?? []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border shadow-2xl"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-active)',
            boxShadow: '0 0 40px color-mix(in srgb, var(--glow-analysis) 15%, transparent)',
          }}
        >
          <div className="border-b border-[color:var(--border-subtle)] px-4 py-2.5">
            <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
              Choose Model
            </span>
          </div>

          <section className="px-2 py-2">
            <header className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-[color:var(--glow-hypothesis)]" />
                <span className="font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase">
                  Anthropic
                </span>
              </div>
              {!hasAnthropicKey && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="flex items-center gap-1 font-mono text-[10px] text-[color:var(--glow-analysis)] uppercase hover:text-[color:var(--glow-hypothesis)]"
                >
                  <KeyRound size={10} /> Add key
                </button>
              )}
            </header>
            {(claude?.supportedModels ?? []).map((m) => {
              const active = current.provider === m.provider && current.model === m.model;
              const disabled = !hasAnthropicKey;
              return (
                <button
                  key={`${m.provider}:${m.model}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(m)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="font-[family-name:var(--font-display)] text-[12px] text-[color:var(--text-primary)]">
                    {m.displayName}
                  </span>
                  {active && (
                    <Check size={12} className="text-[color:var(--glow-hypothesis)]" />
                  )}
                </button>
              );
            })}
          </section>

          <section className="border-t border-[color:var(--border-subtle)] px-2 py-2">
            <header className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-[color:var(--glow-question)]" />
                <span className="font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase">
                  Gemini
                </span>
              </div>
              {!hasGoogleKey && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="flex items-center gap-1 font-mono text-[10px] text-[color:var(--glow-analysis)] uppercase hover:text-[color:var(--glow-hypothesis)]"
                >
                  <KeyRound size={10} /> Add key
                </button>
              )}
            </header>
            {(gemini?.supportedModels ?? []).map((m) => {
              const active = current.provider === m.provider && current.model === m.model;
              const disabled = !hasGoogleKey;
              return (
                <button
                  key={`${m.provider}:${m.model}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(m)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="font-[family-name:var(--font-display)] text-[12px] text-[color:var(--text-primary)]">
                    {m.displayName}
                  </span>
                  {active && (
                    <Check size={12} className="text-[color:var(--glow-hypothesis)]" />
                  )}
                </button>
              );
            })}
          </section>

          <section className="border-t border-[color:var(--border-subtle)] px-2 py-2">
            <header className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <Plug size={11} className="text-[color:var(--glow-decision)]" />
                <span className="font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase">
                  Custom APIs
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="flex items-center gap-1 font-mono text-[10px] text-[color:var(--glow-analysis)] uppercase hover:text-[color:var(--glow-hypothesis)]"
              >
                <Plus size={10} /> Add profile
              </button>
            </header>

            {customModels.length > 0 ? (
              customModels.map((m) => {
                const active = current.provider === m.provider && current.model === m.model;
                const profile = customProfiles.find((item) => item.id === m.model);
                return (
                  <button
                    key={`${m.provider}:${m.model}`}
                    type="button"
                    onClick={() => handleSelect(m)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-white/5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-[family-name:var(--font-display)] text-[12px] text-[color:var(--text-primary)]">
                        {m.displayName}
                      </span>
                      {profile && (
                        <span className="block truncate font-mono text-[10px] text-[color:var(--text-muted)]">
                          {profile.model}
                        </span>
                      )}
                    </span>
                    {active && (
                      <Check size={12} className="shrink-0 text-[color:var(--glow-hypothesis)]" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-2 pb-2 font-mono text-[11px] text-[color:var(--text-muted)]">
                No profiles yet.
              </div>
            )}
          </section>

          <section className="border-t border-[color:var(--border-subtle)] px-2 py-2">
            <header className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-[color:var(--glow-comparison)]" />
                <span className="font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase">
                  OpenAI
                </span>
              </div>
              {!hasOpenAIKey && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="flex items-center gap-1 font-mono text-[10px] text-[color:var(--glow-analysis)] uppercase hover:text-[color:var(--glow-hypothesis)]"
                >
                  <KeyRound size={10} /> Add key
                </button>
              )}
            </header>
            {(openai?.supportedModels ?? []).map((m) => {
              const active = current.provider === m.provider && current.model === m.model;
              const disabled = !hasOpenAIKey;
              return (
                <button
                  key={`${m.provider}:${m.model}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(m)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="font-[family-name:var(--font-display)] text-[12px] text-[color:var(--text-primary)]">
                    {m.displayName}
                  </span>
                  {active && (
                    <Check size={12} className="text-[color:var(--glow-hypothesis)]" />
                  )}
                </button>
              );
            })}
          </section>

          <section className="border-t border-[color:var(--border-subtle)] px-2 py-2">
            <header className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <Cpu size={11} className="text-[color:var(--glow-evidence)]" />
                <span className="font-mono text-[10px] tracking-wider text-[color:var(--text-secondary)] uppercase">
                  Ollama (Local)
                </span>
              </div>
              <button
                type="button"
                onClick={() => ollama.refresh()}
                aria-label="Refresh Ollama status"
                className="text-[color:var(--text-muted)] transition hover:text-[color:var(--glow-hypothesis)]"
              >
                <RefreshCw size={10} className={ollama.loading ? 'animate-spin' : ''} />
              </button>
            </header>

            {ollama.data?.status === 'ok' && ollamaModels.length > 0 && (
              <>
                {ollamaModels.map((m) => {
                  const active = current.provider === m.provider && current.model === m.model;
                  return (
                    <button
                      key={`${m.provider}:${m.model}`}
                      type="button"
                      onClick={() => handleSelect(m)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition hover:bg-white/5"
                    >
                      <span className="font-[family-name:var(--font-display)] text-[12px] text-[color:var(--text-primary)]">
                        {m.displayName}
                      </span>
                      {active && (
                        <Check size={12} className="text-[color:var(--glow-hypothesis)]" />
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {ollama.data?.status === 'ok' && ollamaModels.length === 0 && (
              <div className="px-2 pb-2 font-mono text-[11px] leading-relaxed text-[color:var(--text-muted)]">
                No reasoning models installed. Pull one:
                <pre className="mt-1.5 overflow-x-auto rounded-md bg-[color:var(--bg-surface)] px-2 py-1.5 text-[10px] text-[color:var(--text-secondary)]">
                  ollama pull deepseek-r1
                </pre>
              </div>
            )}

            {ollama.data?.status === 'unreachable' && (
              <div className="px-2 pb-2 font-mono text-[11px] leading-relaxed text-[color:var(--text-muted)]">
                {ollama.data.hint === 'cors' || ollama.data.hint === 'not-running' ? (
                  <>
                    Not reachable. Install & run with CORS allowed:
                    <pre className="mt-1.5 overflow-x-auto rounded-md bg-[color:var(--bg-surface)] px-2 py-1.5 text-[10px] text-[color:var(--text-secondary)]">
                      OLLAMA_ORIGINS=http://localhost:5173 ollama serve
                    </pre>
                  </>
                ) : (
                  <span>Ollama error: {ollama.data.message}</span>
                )}
              </div>
            )}
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
