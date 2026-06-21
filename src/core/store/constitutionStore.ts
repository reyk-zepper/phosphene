import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  createConstitutionRule,
  DEFAULT_CONSTITUTION_RULES,
  type ConstitutionRule,
  type ConstitutionRuleInput,
} from '@/core/constitution/rules';

interface ConstitutionState {
  rules: ConstitutionRule[];
}

interface ConstitutionActions {
  addRule: (input: ConstitutionRuleInput) => ConstitutionRule;
  toggleRule: (id: string) => void;
  removeRule: (id: string) => void;
  resetRules: () => void;
}

export const useConstitutionStore = create<ConstitutionState & ConstitutionActions>()(
  persist(
    (set) => ({
      rules: DEFAULT_CONSTITUTION_RULES,
      addRule: (input) => {
        const rule = createConstitutionRule(input);
        set((state) => ({
          rules: upsertRules(state.rules, [rule]),
        }));
        return rule;
      },
      toggleRule: (id) =>
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
          ),
        })),
      removeRule: (id) =>
        set((state) => ({
          rules: state.rules.filter((rule) => rule.id !== id),
        })),
      resetRules: () => set({ rules: DEFAULT_CONSTITUTION_RULES }),
    }),
    {
      name: 'phosphene-constitution',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ rules: state.rules }),
    }
  )
);

function upsertRules(current: ConstitutionRule[], incoming: ConstitutionRule[]): ConstitutionRule[] {
  const byId = new Map(current.map((rule) => [rule.id, rule]));
  for (const rule of incoming) {
    const id = byId.has(rule.id) ? nextRuleId(rule.id, byId) : rule.id;
    byId.set(id, { ...rule, id });
  }
  return Array.from(byId.values());
}

function nextRuleId(baseId: string, rules: Map<string, ConstitutionRule>): string {
  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;
  while (rules.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }
  return candidate;
}
