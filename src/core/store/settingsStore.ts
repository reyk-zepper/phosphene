import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ModelIdentifier } from '@/core/parser/types';
import { decodeKey, encodeKey } from '@/utils/crypto';

type ProviderId = 'anthropic' | 'openai' | 'google' | 'ollama';

const DEFAULT_MODEL: ModelIdentifier = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  displayName: 'Claude Sonnet 4.6',
};

interface SettingsState {
  encodedKeys: Partial<Record<ProviderId, string>>;
  defaultModel: ModelIdentifier;
}

interface SettingsActions {
  setApiKey: (provider: ProviderId, plain: string) => void;
  clearApiKey: (provider: ProviderId) => void;
  getApiKey: (provider: ProviderId) => string | null;
  setDefaultModel: (model: ModelIdentifier) => void;
  hasAnyKey: () => boolean;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      encodedKeys: {},
      defaultModel: DEFAULT_MODEL,
      setApiKey: (provider, plain) =>
        set((s) => ({
          encodedKeys: { ...s.encodedKeys, [provider]: encodeKey(plain) },
        })),
      clearApiKey: (provider) =>
        set((s) => {
          const next = { ...s.encodedKeys };
          delete next[provider];
          return { encodedKeys: next };
        }),
      getApiKey: (provider) => {
        const encoded = get().encodedKeys[provider];
        return encoded ? decodeKey(encoded) : null;
      },
      setDefaultModel: (model) => set({ defaultModel: model }),
      hasAnyKey: () => Object.values(get().encodedKeys).some(Boolean),
    }),
    {
      name: 'phosphene-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ encodedKeys: s.encodedKeys, defaultModel: s.defaultModel }),
    }
  )
);
