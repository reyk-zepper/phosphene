import { useCallback, useMemo, useRef, useState } from 'react';
import { ADAPTERS, getAdapter } from '@/core/adapters';
import { runLiveComparison } from '@/core/compare/liveComparison';
import type { ModelIdentifier } from '@/core/parser/types';
import { useSessionStore } from '@/core/store/sessionStore';
import { useSettingsStore } from '@/core/store/settingsStore';

const PROVIDER_ORDER = ['anthropic', 'openai', 'google', 'ollama'] as const;

export function useLiveComparison() {
  const abortRef = useRef<AbortController | null>(null);
  const currentGraph = useSessionStore((s) => s.currentGraph);
  const isComparing = useSessionStore((s) => s.isComparing);
  const setComparisonGraph = useSessionStore((s) => s.setComparisonGraph);
  const setComparing = useSessionStore((s) => s.setComparing);
  const setComparisonError = useSessionStore((s) => s.setComparisonError);
  const settings = useSettingsStore();
  const [selectedModel, setSelectedModel] = useState<ModelIdentifier | null>(null);

  const availableModels = useMemo(() => {
    const models: ModelIdentifier[] = [];
    for (const provider of PROVIDER_ORDER) {
      const adapter = ADAPTERS[provider];
      if (!adapter) continue;
      const hasKey = !adapter.requiresApiKey || Boolean(settings.encodedKeys[provider]);
      if (!hasKey) continue;
      models.push(...adapter.supportedModels);
    }
    return models;
  }, [settings.encodedKeys]);

  const effectiveModel = useMemo(() => {
    if (selectedModel && availableModels.some((model) => isSameModel(model, selectedModel))) {
      return selectedModel;
    }
    const current = currentGraph?.model;
    return availableModels.find((model) => !current || !isSameModel(model, current)) ?? availableModels[0] ?? null;
  }, [availableModels, currentGraph?.model, selectedModel]);

  const run = useCallback(async () => {
    if (!currentGraph || !effectiveModel || isComparing) return;
    const adapter = getAdapter(effectiveModel.provider);
    if (!adapter) {
      setComparisonError(`No adapter available for provider: ${effectiveModel.provider}`);
      return;
    }

    const apiKey = adapter.requiresApiKey
      ? (settings.getApiKey(effectiveModel.provider) ?? undefined)
      : undefined;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setComparisonError(null);
    setComparisonGraph(null);
    setComparing(true);

    try {
      const graph = await runLiveComparison({
        prompt: currentGraph.prompt,
        model: effectiveModel,
        adapter,
        apiKey,
        signal: controller.signal,
      });
      useSessionStore.getState().setComparisonGraph(graph);
      useSessionStore.getState().rememberGraph(graph);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        useSessionStore
          .getState()
          .setComparisonError(err instanceof Error ? err.message : 'Comparison failed');
      }
    } finally {
      useSessionStore.getState().setComparing(false);
      abortRef.current = null;
    }
  }, [
    currentGraph,
    effectiveModel,
    isComparing,
    setComparing,
    setComparisonError,
    setComparisonGraph,
    settings,
  ]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    useSessionStore.getState().setComparing(false);
  }, []);

  return {
    availableModels,
    selectedModel: effectiveModel,
    setSelectedModel,
    run,
    cancel,
  };
}

function isSameModel(a: ModelIdentifier, b: ModelIdentifier): boolean {
  return a.provider === b.provider && a.model === b.model;
}
