import { AnimatePresence, motion } from 'framer-motion';
import { KeyRound, X, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/core/store/settingsStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ open, onClose }: Props) {
  const existing = useSettingsStore((s) => s.getApiKey('anthropic'));
  const setKey = useSettingsStore((s) => s.setApiKey);
  const clearKey = useSettingsStore((s) => s.clearApiKey);

  const [draft, setDraft] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(existing ?? '');
      setTouched(false);
    }
  }, [open, existing]);

  const valid = draft.trim().startsWith('sk-ant-') && draft.trim().length > 20;
  const showError = touched && draft.length > 0 && !valid;

  const handleSave = () => {
    setTouched(true);
    if (!valid) return;
    setKey('anthropic', draft.trim());
    onClose();
  };

  const handleClear = () => {
    clearKey('anthropic');
    setDraft('');
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

            <div className="px-5 py-5">
              <label className="flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
                  Anthropic Claude
                </span>
                <input
                  type="password"
                  value={draft}
                  placeholder="sk-ant-..."
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setTouched(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
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
                    Expected format: sk-ant-…
                  </span>
                )}
              </label>

              <p className="mt-4 flex items-center gap-1.5 font-[family-name:var(--font-body)] text-[12px] leading-relaxed text-[color:var(--text-secondary)]">
                Stored in your browser only. Never sent to any server except Anthropic.
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-0.5 text-[color:var(--glow-hypothesis)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--glow-analysis)]"
                >
                  Get a key <ExternalLink size={11} />
                </a>
              </p>
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-[color:var(--border-subtle)] px-5 py-3">
              <button
                type="button"
                onClick={handleClear}
                disabled={!existing}
                className="font-mono text-[11px] tracking-wider text-[color:var(--text-muted)] uppercase transition hover:text-[color:var(--glow-revision)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-3 py-1.5 font-[family-name:var(--font-display)] text-[12px] text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
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
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
