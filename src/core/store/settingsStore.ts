import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ModelIdentifier } from '@/core/parser/types';
import {
  customProfileToPromptConfig,
  normalizeCustomOpenAIProfileInput,
  type CustomOpenAIProfile,
  type CustomOpenAIProfileInput,
  type CustomOpenAIPromptConfig,
} from '@/core/settings/customApiProfiles';
import { decodeKey, encodeKey } from '@/utils/crypto';

type ProviderId = 'anthropic' | 'openai' | 'google' | 'ollama';

const DEFAULT_MODEL: ModelIdentifier = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  displayName: 'Claude Sonnet 4.6',
};

interface SettingsState {
  encodedKeys: Partial<Record<ProviderId, string>>;
  customOpenAIProfiles: CustomOpenAIProfile[];
  defaultModel: ModelIdentifier;
}

interface SettingsActions {
  setApiKey: (provider: ProviderId, plain: string) => void;
  clearApiKey: (provider: ProviderId) => void;
  getApiKey: (provider: ProviderId) => string | null;
  upsertCustomOpenAIProfile: (input: CustomOpenAIProfileInput) => CustomOpenAIProfile;
  removeCustomOpenAIProfile: (id: string) => void;
  getCustomOpenAIProfile: (id: string) => CustomOpenAIProfile | null;
  getCustomOpenAIPromptConfig: (id: string) => CustomOpenAIPromptConfig | null;
  setDefaultModel: (model: ModelIdentifier) => void;
  hasAnyKey: () => boolean;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      encodedKeys: {},
      customOpenAIProfiles: [],
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
      upsertCustomOpenAIProfile: (input) => {
        const existing = input.id ? get().customOpenAIProfiles.find((profile) => profile.id === input.id) : undefined;
        const normalizedProfile = normalizeCustomOpenAIProfileInput({
          ...input,
          encodedApiKey: input.encodedApiKey ?? existing?.encodedApiKey,
        });
        const ids = new Set(get().customOpenAIProfiles.map((profile) => profile.id));
        const profile =
          input.id || !ids.has(normalizedProfile.id)
            ? normalizedProfile
            : { ...normalizedProfile, id: nextCustomProfileId(normalizedProfile.id, ids) };
        set((s) => {
          const index = s.customOpenAIProfiles.findIndex((item) => item.id === profile.id);
          const customOpenAIProfiles =
            index >= 0
              ? s.customOpenAIProfiles.map((item) => (item.id === profile.id ? profile : item))
              : [...s.customOpenAIProfiles, profile];
          return { customOpenAIProfiles };
        });
        return profile;
      },
      removeCustomOpenAIProfile: (id) =>
        set((s) => ({
          customOpenAIProfiles: s.customOpenAIProfiles.filter((profile) => profile.id !== id),
          defaultModel: s.defaultModel.provider === 'custom-openai' && s.defaultModel.model === id
            ? DEFAULT_MODEL
            : s.defaultModel,
        })),
      getCustomOpenAIProfile: (id) =>
        get().customOpenAIProfiles.find((profile) => profile.id === id) ?? null,
      getCustomOpenAIPromptConfig: (id) => {
        const profile = get().getCustomOpenAIProfile(id);
        return profile ? customProfileToPromptConfig(profile) : null;
      },
      setDefaultModel: (model) => set({ defaultModel: model }),
      hasAnyKey: () =>
        Object.values(get().encodedKeys).some(Boolean) ||
        get().customOpenAIProfiles.some((profile) => Boolean(profile.encodedApiKey)),
    }),
    {
      name: 'phosphene-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        encodedKeys: s.encodedKeys,
        customOpenAIProfiles: s.customOpenAIProfiles,
        defaultModel: s.defaultModel,
      }),
    }
  )
);

function nextCustomProfileId(baseId: string, ids: Set<string>): string {
  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;
  while (ids.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }
  return candidate;
}
