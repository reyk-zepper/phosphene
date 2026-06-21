import { useCallback, useRef } from 'react';
import { useSessionStore } from '@/core/store/sessionStore';
import { useSettingsStore } from '@/core/store/settingsStore';
import { getAdapter } from '@/core/adapters';
import { buildGraph, newGraphId } from '@/core/graph/builder';

const FLUSH_INTERVAL_MS = 180;

export function useStreaming() {
  const abortRef = useRef<AbortController | null>(null);
  const flushTimerRef = useRef<number | null>(null);

  const submit = useCallback(async (prompt: string) => {
    const session = useSessionStore.getState();
    const settings = useSettingsStore.getState();

    if (session.isStreaming) return;

    const model = settings.defaultModel;
    const adapter = getAdapter(model.provider);
    if (!adapter) {
      session.setError(`No adapter available for provider: ${model.provider}`);
      return;
    }

    let apiKey: string | undefined;
    let endpointUrl: string | undefined;
    let requestModel = model.model;

    if (model.provider === 'custom-openai') {
      const config = settings.getCustomOpenAIPromptConfig(model.model);
      if (!config) {
        session.setError(`No custom API profile configured for ${model.displayName}.`);
        return;
      }
      apiKey = config.apiKey;
      endpointUrl = config.endpointUrl;
      requestModel = config.model;
    } else if (adapter.requiresApiKey) {
      const key = settings.getApiKey(model.provider);
      if (!key) {
        session.setError('No API key configured. Open settings to add one.');
        return;
      }
      apiKey = key;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const graphId = newGraphId();
    const startTime = Date.now();
    let thinkingBuffer = '';
    let outputBuffer = '';
    let dirty = false;

    const flushToStore = () => {
      if (!dirty) return;
      dirty = false;
      const graph = buildGraph({
        id: graphId,
        prompt,
        model,
        thinkingBuffer,
        outputBuffer,
        startTime,
      });
      if (graph) useSessionStore.getState().setGraph(graph);
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current != null) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        flushToStore();
      }, FLUSH_INTERVAL_MS);
    };

    session.setError(null);
    session.setStreaming(true);
    useSessionStore.getState().setGraph(null);

    try {
      const stream = adapter.sendPrompt({
        prompt,
        model: requestModel,
        apiKey,
        endpointUrl,
        signal: controller.signal,
      });

      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        if (chunk.type === 'thinking') {
          thinkingBuffer += chunk.content;
          dirty = true;
          scheduleFlush();
        } else if (chunk.type === 'text') {
          outputBuffer += chunk.content;
          dirty = true;
          scheduleFlush();
        } else if (chunk.type === 'error') {
          session.setError(chunk.content);
          break;
        } else if (chunk.type === 'done') {
          break;
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        session.setError(err instanceof Error ? err.message : 'Unknown stream error');
      }
    } finally {
      if (flushTimerRef.current != null) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      dirty = true;
      flushToStore();
      const finalGraph = useSessionStore.getState().currentGraph;
      if (finalGraph?.id === graphId) {
        useSessionStore.getState().rememberGraph(finalGraph);
      }
      useSessionStore.getState().setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { submit, cancel };
}
