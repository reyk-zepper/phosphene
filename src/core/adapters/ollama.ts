import type { ModelIdentifier } from '@/core/parser/types';
import type { LLMAdapter, PromptParams, ReasoningChunk } from './types';

const DEFAULT_BASE_URL = 'http://localhost:11434';

export function ollamaBaseUrl(): string {
  return DEFAULT_BASE_URL;
}

export interface OllamaModelSummary {
  name: string;
  size: number;
  family?: string;
  parameterSize?: string;
}

export type OllamaReachability =
  | { status: 'ok'; models: OllamaModelSummary[] }
  | { status: 'unreachable'; hint: 'not-running' | 'cors' | 'unknown'; message: string };

export async function probeOllama(signal?: AbortSignal): Promise<OllamaReachability> {
  try {
    const res = await fetch(`${DEFAULT_BASE_URL}/api/tags`, { signal });
    if (!res.ok) {
      return {
        status: 'unreachable',
        hint: 'unknown',
        message: `Ollama responded with ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      models?: Array<{
        name: string;
        size: number;
        details?: { family?: string; parameter_size?: string };
      }>;
    };
    const models: OllamaModelSummary[] = (data.models ?? []).map((m) => ({
      name: m.name,
      size: m.size,
      family: m.details?.family,
      parameterSize: m.details?.parameter_size,
    }));
    return { status: 'ok', models };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const looksLikeCors =
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('networkerror') ||
      msg.toLowerCase().includes('load failed');
    return {
      status: 'unreachable',
      hint: looksLikeCors ? 'cors' : 'not-running',
      message: msg,
    };
  }
}

interface ChatStreamEvent {
  model?: string;
  message?: { role?: string; content?: string; thinking?: string };
  done?: boolean;
}

async function* parseNdjsonStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          yield JSON.parse(line) as ChatStreamEvent;
        } catch {
          // ignore malformed lines
        }
      }
    }
    const tail = buffer.trim();
    if (tail) {
      try {
        yield JSON.parse(tail) as ChatStreamEvent;
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function* splitInlineThink(text: string): Generator<ReasoningChunk> {
  // Handle reasoning models that emit <think>...</think> inside content.
  const openTag = '<think>';
  const closeTag = '</think>';
  let cursor = 0;
  while (cursor < text.length) {
    const openIdx = text.indexOf(openTag, cursor);
    if (openIdx === -1) {
      const tail = text.slice(cursor);
      if (tail) yield { type: 'text', content: tail, timestamp: Date.now() };
      return;
    }
    if (openIdx > cursor) {
      yield { type: 'text', content: text.slice(cursor, openIdx), timestamp: Date.now() };
    }
    const closeIdx = text.indexOf(closeTag, openIdx + openTag.length);
    if (closeIdx === -1) {
      yield {
        type: 'thinking',
        content: text.slice(openIdx + openTag.length),
        timestamp: Date.now(),
      };
      return;
    }
    const inner = text.slice(openIdx + openTag.length, closeIdx);
    if (inner) yield { type: 'thinking', content: inner, timestamp: Date.now() };
    cursor = closeIdx + closeTag.length;
  }
}

async function* sendPrompt(params: PromptParams): AsyncGenerator<ReasoningChunk> {
  const { prompt, model, signal } = params;

  const body = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    think: true,
  });

  let response: Response;
  try {
    response = await fetch(`${DEFAULT_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    const looksLikeCors =
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('networkerror') ||
      msg.toLowerCase().includes('load failed');
    yield {
      type: 'error',
      content: looksLikeCors
        ? 'Cannot reach Ollama. Start it with: OLLAMA_ORIGINS=http://localhost:5173 ollama serve'
        : msg,
      timestamp: Date.now(),
    };
    return;
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => response.statusText);
    yield {
      type: 'error',
      content: `Ollama ${response.status}: ${text.slice(0, 500)}`,
      timestamp: Date.now(),
    };
    return;
  }

  let inlineBuffer = '';
  try {
    for await (const evt of parseNdjsonStream(response.body, signal)) {
      const msg = evt.message;
      if (msg?.thinking) {
        yield { type: 'thinking', content: msg.thinking, timestamp: Date.now() };
      }
      if (msg?.content) {
        if (msg.content.includes('<think>') || inlineBuffer || msg.content.includes('</think>')) {
          inlineBuffer += msg.content;
          if (inlineBuffer.includes('</think>')) {
            for (const chunk of splitInlineThink(inlineBuffer)) yield chunk;
            inlineBuffer = '';
          }
        } else {
          yield { type: 'text', content: msg.content, timestamp: Date.now() };
        }
      }
      if (evt.done) {
        if (inlineBuffer) {
          for (const chunk of splitInlineThink(inlineBuffer)) yield chunk;
          inlineBuffer = '';
        }
        yield { type: 'done', content: '', timestamp: Date.now() };
        return;
      }
    }
    if (inlineBuffer) {
      for (const chunk of splitInlineThink(inlineBuffer)) yield chunk;
    }
    yield { type: 'done', content: '', timestamp: Date.now() };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    yield {
      type: 'error',
      content: err instanceof Error ? err.message : 'Stream error',
      timestamp: Date.now(),
    };
  }
}

const FALLBACK_MODELS: ModelIdentifier[] = [
  { provider: 'ollama', model: 'deepseek-r1', displayName: 'DeepSeek R1' },
  { provider: 'ollama', model: 'qwq', displayName: 'QwQ' },
  { provider: 'ollama', model: 'gpt-oss:20b', displayName: 'gpt-oss 20B' },
];

export const ollamaAdapter: LLMAdapter = {
  id: 'ollama',
  name: 'Ollama (Local)',
  requiresApiKey: false,
  supportedModels: FALLBACK_MODELS,
  sendPrompt,
};
