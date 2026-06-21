import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, KeyRound, Pencil, Plug, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  customProfileToPromptConfig,
  type CustomOpenAIProfile,
} from '@/core/settings/customApiProfiles';
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

interface CustomProfileDraft {
  id?: string;
  label: string;
  model: string;
  responsesUrl: string;
  apiKey: string;
}

const EMPTY_PROFILE_DRAFT: CustomProfileDraft = {
  label: '',
  model: '',
  responsesUrl: '',
  apiKey: '',
};

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
  const customProfiles = useSettingsStore((s) => s.customOpenAIProfiles);
  const upsertCustomProfile = useSettingsStore((s) => s.upsertCustomOpenAIProfile);
  const removeCustomProfile = useSettingsStore((s) => s.removeCustomOpenAIProfile);

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
  const [profileDraft, setProfileDraft] = useState<CustomProfileDraft>(EMPTY_PROFILE_DRAFT);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDrafts({
        anthropic: existingAnthropic ?? '',
        openai: existingOpenAI ?? '',
        google: existingGoogle ?? '',
      });
      setTouched({ anthropic: false, openai: false, google: false });
      setProfileDraft(EMPTY_PROFILE_DRAFT);
      setProfileError(null);
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

  const handleSaveProfile = () => {
    setProfileError(null);
    try {
      upsertCustomProfile({
        id: profileDraft.id,
        label: profileDraft.label,
        model: profileDraft.model,
        responsesUrl: profileDraft.responsesUrl,
        apiKey: profileDraft.apiKey,
      });
      setProfileDraft(EMPTY_PROFILE_DRAFT);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to save custom profile.');
    }
  };

  const handleEditProfile = (profile: CustomOpenAIProfile) => {
    const config = customProfileToPromptConfig(profile);
    setProfileDraft({
      id: profile.id,
      label: profile.label,
      model: profile.model,
      responsesUrl: profile.responsesUrl,
      apiKey: config.apiKey ?? '',
    });
    setProfileError(null);
  };

  const handleRemoveProfile = (profile: CustomOpenAIProfile) => {
    removeCustomProfile(profile.id);
    if (profileDraft.id === profile.id) setProfileDraft(EMPTY_PROFILE_DRAFT);
  };

  const profileCanSave =
    profileDraft.label.trim().length > 0 &&
    profileDraft.model.trim().length > 0 &&
    profileDraft.responsesUrl.trim().length > 0;

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
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border"
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

            <div className="max-h-[75vh] space-y-5 overflow-y-auto px-5 py-5">
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

              <section className="space-y-3 border-t border-[color:var(--border-subtle)] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Plug size={14} className="text-[color:var(--glow-decision)]" />
                    <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
                      Custom API Profiles
                    </span>
                  </div>
                  {profileDraft.id && (
                    <button
                      type="button"
                      onClick={() => setProfileDraft(EMPTY_PROFILE_DRAFT)}
                      className="font-mono text-[10px] tracking-wider text-[color:var(--text-muted)] uppercase transition hover:text-[color:var(--text-primary)]"
                    >
                      New profile
                    </button>
                  )}
                </div>

                {customProfiles.length > 0 && (
                  <div className="space-y-2">
                    {customProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-[family-name:var(--font-display)] text-[12px] text-[color:var(--text-primary)]">
                            {profile.label}
                          </div>
                          <div className="truncate font-mono text-[10px] text-[color:var(--text-muted)]">
                            {profile.model}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditProfile(profile)}
                            aria-label={`Edit ${profile.label}`}
                            className="rounded-md p-1 text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--glow-analysis)]"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveProfile(profile)}
                            aria-label={`Remove ${profile.label}`}
                            className="rounded-md p-1 text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--glow-revision)]"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
                      Label
                    </span>
                    <input
                      type="text"
                      value={profileDraft.label}
                      placeholder="AI Node Gateway"
                      onChange={(e) =>
                        setProfileDraft((current) => ({ ...current, label: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2.5 font-[family-name:var(--font-mono)] text-[13px] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--glow-analysis)]"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
                      Model ID
                    </span>
                    <input
                      type="text"
                      value={profileDraft.model}
                      placeholder="gpt-oss-120b"
                      onChange={(e) =>
                        setProfileDraft((current) => ({ ...current, model: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2.5 font-[family-name:var(--font-mono)] text-[13px] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--glow-analysis)]"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
                    Responses URL
                  </span>
                  <input
                    type="url"
                    value={profileDraft.responsesUrl}
                    placeholder="http://localhost:8787/v1/responses"
                    onChange={(e) =>
                      setProfileDraft((current) => ({ ...current, responsesUrl: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2.5 font-[family-name:var(--font-mono)] text-[13px] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--glow-analysis)]"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
                    API Key Optional
                  </span>
                  <input
                    type="password"
                    value={profileDraft.apiKey}
                    placeholder="Bearer token"
                    onChange={(e) =>
                      setProfileDraft((current) => ({ ...current, apiKey: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2.5 font-[family-name:var(--font-mono)] text-[13px] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--glow-analysis)]"
                  />
                </label>

                {profileError && (
                  <div className="rounded-lg border border-[color:var(--glow-revision)]/40 px-3 py-2 font-mono text-[11px] text-[color:var(--glow-revision)]">
                    {profileError}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={!profileCanSave}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 font-[family-name:var(--font-display)] text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      borderColor: 'var(--glow-decision)',
                      color: 'var(--glow-decision)',
                      boxShadow: profileCanSave
                        ? '0 0 20px color-mix(in srgb, var(--glow-decision) 30%, transparent)'
                        : 'none',
                    }}
                  >
                    <Plus size={12} />
                    {profileDraft.id ? 'Save profile' : 'Add profile'}
                  </button>
                </div>
              </section>

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
