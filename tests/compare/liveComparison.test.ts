import { describe, expect, it } from 'vitest';
import { runLiveComparison } from '@/core/compare/liveComparison';
import type { LLMAdapter, ReasoningChunk } from '@/core/adapters';
import type { ModelIdentifier } from '@/core/parser/types';

async function* chunks(items: ReasoningChunk[]) {
  yield* items;
}

const secondaryModel: ModelIdentifier = {
  provider: 'openai',
  model: 'o3',
  displayName: 'OpenAI o3',
};

const fakeAdapter: LLMAdapter = {
  id: 'openai',
  name: 'OpenAI',
  requiresApiKey: true,
  supportedModels: [secondaryModel],
  sendPrompt: () =>
    chunks([
      { type: 'thinking', content: 'First compare the constraints. ', timestamp: 1 },
      { type: 'thinking', content: 'Then choose the safer path.', timestamp: 2 },
      { type: 'text', content: 'Use the safer path.', timestamp: 3 },
      { type: 'done', content: '', timestamp: 4 },
    ]),
};

describe('live comparison runner', () => {
  it('builds a secondary graph from adapter chunks for the same prompt', async () => {
    const graph = await runLiveComparison({
      prompt: 'Pick the safest deployment option.',
      model: secondaryModel,
      adapter: fakeAdapter,
      apiKey: 'sk-test',
      graphId: 'comparison-live',
      now: 10_000,
    });

    expect(graph).toMatchObject({
      id: 'comparison-live',
      prompt: 'Pick the safest deployment option.',
      model: secondaryModel,
      createdAt: 10_000,
    });
    expect(graph.metadata.nodeCount).toBeGreaterThanOrEqual(2);
    expect(graph.metadata.reasoningTokens).toBeGreaterThan(0);
    expect(graph.metadata.outputTokens).toBeGreaterThan(0);
  });

  it('returns a clear error when the secondary provider has no key', async () => {
    await expect(
      runLiveComparison({
        prompt: 'Pick the safest deployment option.',
        model: secondaryModel,
        adapter: fakeAdapter,
        graphId: 'comparison-live',
        now: 10_000,
      })
    ).rejects.toThrow('No API key configured for OpenAI o3.');
  });

  it('returns a clear error when a stream produces no graphable content', async () => {
    await expect(
      runLiveComparison({
        prompt: 'Pick the safest deployment option.',
        model: secondaryModel,
        adapter: {
          ...fakeAdapter,
          sendPrompt: () => chunks([{ type: 'done', content: '', timestamp: 1 }]),
        },
        apiKey: 'sk-test',
        graphId: 'comparison-empty',
        now: 10_000,
      })
    ).rejects.toThrow('Comparison model returned no graphable content.');
  });

  it('does not build a partial graph after cancellation', async () => {
    const controller = new AbortController();

    await expect(
      runLiveComparison({
        prompt: 'Pick the safest deployment option.',
        model: secondaryModel,
        adapter: {
          ...fakeAdapter,
          sendPrompt: async function* () {
            yield { type: 'thinking', content: 'Partial reasoning chunk. ', timestamp: 1 };
            controller.abort();
            yield { type: 'text', content: 'Partial answer.', timestamp: 2 };
          },
        },
        apiKey: 'sk-test',
        graphId: 'comparison-cancelled',
        now: 10_000,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
