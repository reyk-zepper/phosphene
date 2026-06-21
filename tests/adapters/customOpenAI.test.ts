import { afterEach, describe, expect, it, vi } from 'vitest';
import { customOpenAIAdapter } from '@/core/adapters/customOpenAI';

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

describe('custom OpenAI Responses-compatible adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends Responses-compatible requests to the configured endpoint with an optional key', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(String(_url)).toBe('https://gateway.example.test/v1/responses');
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({
        authorization: 'Bearer local-token',
        'content-type': 'application/json',
      });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: 'gpt-oss-120b',
        input: [{ role: 'user', content: 'Trace this.' }],
        stream: true,
        store: false,
        reasoning: { effort: 'medium', summary: 'auto' },
      });

      return new Response(
        streamFrom(
          [
            'event: response.reasoning_summary_text.delta',
            'data: {"type":"response.reasoning_summary_text.delta","delta":"Inspect endpoint."}',
            '',
            'event: response.output_text.delta',
            'data: {"type":"response.output_text.delta","delta":"Done"}',
            '',
            'event: response.completed',
            'data: {"type":"response.completed"}',
            '',
          ].join('\n')
        ),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const chunks = await collect(
      customOpenAIAdapter.sendPrompt({
        prompt: 'Trace this.',
        model: 'gpt-oss-120b',
        endpointUrl: 'https://gateway.example.test/v1/responses',
        apiKey: 'local-token',
      })
    );

    expect(chunks.map((chunk) => [chunk.type, chunk.content])).toEqual([
      ['thinking', 'Inspect endpoint.'],
      ['text', 'Done'],
      ['done', ''],
    ]);
  });

  it('omits authorization when a local profile has no key', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toEqual({
        'content-type': 'application/json',
      });
      return new Response(
        streamFrom(
          [
            'event: response.output_text.delta',
            'data: {"type":"response.output_text.delta","delta":"Local done"}',
            '',
          ].join('\n')
        ),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const chunks = await collect(
      customOpenAIAdapter.sendPrompt({
        prompt: 'Trace local.',
        model: 'llama-local',
        endpointUrl: 'http://localhost:8787/v1/responses',
      })
    );

    expect(chunks.map((chunk) => [chunk.type, chunk.content])).toEqual([
      ['text', 'Local done'],
      ['done', ''],
    ]);
  });

  it('fails closed when no endpoint is passed and does not leak headers in errors', async () => {
    const chunks = await collect(
      customOpenAIAdapter.sendPrompt({
        prompt: 'hello',
        model: 'o3',
        apiKey: 'secret-token',
      })
    );

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'Missing custom OpenAI-compatible Responses endpoint',
        timestamp: expect.any(Number),
      },
    ]);
  });
});
