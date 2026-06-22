import { afterEach, describe, expect, it, vi } from 'vitest';

import { claudeAdapter } from '@/core/adapters/claude';
import { customOpenAIAdapter } from '@/core/adapters/customOpenAI';
import { geminiAdapter } from '@/core/adapters/gemini';
import { ollamaAdapter } from '@/core/adapters/ollama';
import { openaiAdapter, parseOpenAIResponsesStream } from '@/core/adapters/openai';
import type { LLMAdapter, ReasoningChunk } from '@/core/adapters/types';

function streamFrom(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

async function collect<T>(stream: AsyncGenerator<T>): Promise<T[]> {
  const chunks: T[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

async function collectFirstError(stream: AsyncGenerator<ReasoningChunk>): Promise<string> {
  const chunks = await collect(stream);
  const error = chunks.find((chunk) => chunk.type === 'error');
  expect(error).toBeDefined();
  return error?.content ?? '';
}

const sensitiveBody = [
  'invalid key sk-openai-secret-1234567890',
  'Authorization: Bearer local-secret-token-1234567890',
  'google key AIzaSySecretSecretSecretSecretSecretSecret',
  'path /Users/example/.config/phosphene/key.txt',
  'callback http://127.0.0.1:8787/private?token=local-secret-token-1234567890',
  'internal https://node.local/status?api_key=AIzaSySecretSecretSecretSecretSecretSecret',
].join('\n');

function expectSanitizedError(content: string) {
  expect(content).not.toContain('sk-openai-secret-1234567890');
  expect(content).not.toContain('local-secret-token-1234567890');
  expect(content).not.toContain('AIzaSySecretSecretSecretSecretSecretSecret');
  expect(content).not.toContain('/Users/example/.config/phosphene/key.txt');
  expect(content).not.toContain('http://127.0.0.1:8787/private');
  expect(content).not.toContain('https://node.local/status');
  expect(content).toContain('[api key redacted]');
  expect(content).toContain('Bearer [token redacted]');
  expect(content).toContain('[local path redacted]');
  expect(content).toContain('[private url redacted]');
}

describe('adapter error redaction', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      name: 'Anthropic',
      adapter: claudeAdapter,
      params: { prompt: 'hello', model: 'claude-haiku-4-5', apiKey: 'sk-ant-test' },
    },
    {
      name: 'OpenAI',
      adapter: openaiAdapter,
      params: { prompt: 'hello', model: 'o3', apiKey: 'sk-openai-test' },
    },
    {
      name: 'Gemini',
      adapter: geminiAdapter,
      params: { prompt: 'hello', model: 'gemini-3.5-flash', apiKey: 'gemini-test-key' },
    },
    {
      name: 'Custom OpenAI',
      adapter: customOpenAIAdapter,
      params: {
        prompt: 'hello',
        model: 'gpt-oss-120b',
        apiKey: 'local-secret-token-1234567890',
        endpointUrl: 'https://gateway.example.test/v1/responses',
      },
    },
    {
      name: 'Ollama',
      adapter: ollamaAdapter,
      params: { prompt: 'hello', model: 'deepseek-r1' },
    },
  ] satisfies Array<{
    name: string;
    adapter: LLMAdapter;
    params: Parameters<LLMAdapter['sendPrompt']>[0];
  }>)('redacts sensitive HTTP error bodies from $name', async ({ adapter, params }) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sensitiveBody, { status: 401 })));

    const content = await collectFirstError(adapter.sendPrompt(params));

    expectSanitizedError(content);
  });

  it('redacts sensitive provider stream error payloads', async () => {
    const chunks = await collect(
      parseOpenAIResponsesStream(
        streamFrom(
          [
            'event: error',
            `data: ${JSON.stringify({ type: 'error', error: { message: sensitiveBody } })}`,
            '',
          ].join('\n'),
        ),
      ),
    );

    expect(chunks[0]?.type).toBe('error');
    expectSanitizedError(chunks[0]?.content ?? '');
  });
});
