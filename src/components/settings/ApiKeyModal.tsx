import { AnimatePresence, motion } from 'framer-motion';
import { KeyRound, X, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/core/store/settingsStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

type KeyProvider = 'anthropic' | 'openai' | 'google';

interface KeyProviderConfig {
  id: KeyProvider;
  label: string;
  placeholder: string;
  format: string;
  href: string;
}

const KEY_PROVIDERS: KeyProviderConfig[] = [
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    placeholder: 'sk-ant-...',
    format: 'Expected format: sk-ant-...',
    href: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-...',
    format: 'Expected format: sk-...',
    href: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    placeholder: 'AIza...',
    format: 'Expected a Gemini API key with at least 20 characters.',
    href: 'https://aistudio.google.com/apikey',
  },
];

export function ApiKeyModal({ open, onClose }: Props) {
  const existingAnthropic = useSettingsStore((s) => s.getApiKey('anthropic'));
  const existingOpenAI = useSettingsStore((s) => s.getApiKey('openai'));
  const existingGoogle = useSettingsStore((s) => s.getApiKey('google'));
  const setKey = useSettingsStore((s) => s.setApiKey);
  const clearKey = useSettingsStore((s) => s.clearApiKey);

  const [drafts, setDrafts] = useState<Record<KeyProvider, string>>({
    anthropic: '',
    openai: '',
    google: '',
  });
  const [touched, setTouched] = useState<Record<KeyProvider, boolean>>({
    anthropic: false,
    openai: false,
    google: false,
  });

  useEffect(() => {
    if (open) {
      setDrafts({
        anthropic: existingAnthropic ?? '',
        openai: existingOpenAI ?? '',
        google: existingGoogle ?? '',
      });
      setTouched({ anthropic: false, openai: false, google: false });
    }
  }, [open, existingAnthropic, existingOpenAI, existingGoogle]);

  const existingKeys: Record<KeyProvider, string | null> = {
    anthropic: existingAnthropic,
    openai: existingOpenAI,
    google: existingGoogle,
  };

  const handleSave = (provider: KeyProvider) => {
    setTouched((current) => ({ ...current, [provider]: true }));
    const draft = drafts[provider].trim();
    if (!isValidKey(provider, draft)) return;
    setKey(provider, draft);
    onClose();
  };

  const handleClear = (provider: KeyProvider) => {
    clearKey(provider);
    setDrafts((current) => ({ ...current, [provider]: '' }));
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'color-mix(in srgb, var(--bg-primary) 75%, transparent)', backdropFilter: 'blur(8px)' }}
          />
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border"
            initial={{ scale: 0.94, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 14, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-active)',
              boxShadow: '0 0 60px color-mix(in srgb, var(--glow-analysis) 18%, transparent)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-4">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-[color:var(--glow-analysis)]" />
                <span className="font-[family-name:var(--font-display)] text-sm font-semibold">
                  API Keys
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="rounded-md p-1 text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </header>

            <div className="space-y-5 px-5 py-5">
              {KEY_PROVIDERS.map((provider) => {
                const draft = drafts[provider.id];
                const valid = isValidKey(provider.id, draft.trim());
                const showError = touched[provider.id] && draft.length > 0 && !valid;

                return (
                  <section key={provider.id} className="space-y-2">
                    <label className="flex flex-col gap-2">
                      <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
                        {provider.label}
                      </span>
                      <input
                        type="password"
                        value={draft}
                        placeholder={provider.placeholder}
                        onChange={(e) => {
                          setDrafts((current) => ({
                            ...current,
                            [provider.id]: e.target.value,
                          }));
                          setTouched((current) => ({ ...current, [provider.id]: true }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(provider.id);
                        }}
                        className="w-full rounded-lg border bg-[color:var(--bg-surface)] px-3 py-2.5 font-[family-name:var(--font-mono)] text-[13px] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--glow-analysis)]"
                        style={{
                          borderColor: showError
                            ? 'var(--glow-revision)'
                            : 'var(--border-subtle)',
                        }}
                      />
                      {showError && (
                        <span className="font-mono text-[11px] text-[color:var(--glow-revision)]">
                          {provider.format}
                        </span>
                      )}
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <a
                        href={provider.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[12px] text-[color:var(--glow-hypothesis)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--glow-analysis)]"
                      >
                        Get a key <ExternalLink size={11} />
                      </a>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleClear(provider.id)}
                          disabled={!existingKeys[provider.id]}
                          className="font-mono text-[11px] tracking-wider text-[color:var(--text-muted)] uppercase transition hover:text-[color:var(--glow-revision)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSave(provider.id)}
                          disabled={!valid}
                          className="rounded-lg border px-3 py-1.5 font-[family-name:var(--font-display)] text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                          style={{
                            borderColor: 'var(--glow-analysis)',
                            color: 'var(--glow-analysis)',
                            boxShadow: valid
                              ? '0 0 20px color-mix(in srgb, var(--glow-analysis) 30%, transparent)'
                              : 'none',
                          }}
                        >
                          Save key
                        </button>
                      </div>
                    </div>
                  </section>
                );
              })}

              <p className="font-[family-name:var(--font-body)] text-[12px] leading-relaxed text-[color:var(--text-secondary)]">
                Stored in your browser only. Keys are sent only to their selected provider.
              </p>
            </div>

            <footer className="flex justify-end border-t border-[color:var(--border-subtle)] px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 font-[family-name:var(--font-display)] text-[12px] text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--text-primary)]"
              >
                Close
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function isValidKey(provider: KeyProvider, key: string): boolean {
  if (provider === 'anthropic') return key.startsWith('sk-ant-') && key.length > 20;
  if (provider === 'openai') return key.startsWith('sk-') && key.length > 20;
  return key.length >= 20;
}
