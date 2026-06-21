import { describe, expect, it } from 'vitest';
import {
  buildCustomOpenAIModel,
  customProfileToPromptConfig,
  normalizeCustomOpenAIProfileInput,
} from '@/core/settings/customApiProfiles';

describe('custom OpenAI-compatible API profiles', () => {
  it('normalizes local profile input into a selectable model and prompt config', () => {
    const profile = normalizeCustomOpenAIProfileInput({
      label: 'AI Node Gateway',
      model: 'gpt-oss-120b',
      responsesUrl: ' http://localhost:8787/v1/responses ',
      apiKey: ' local-dev-token ',
    });

    expect(profile).toEqual({
      id: expect.stringMatching(/^custom-openai-[a-z0-9-]+$/),
      label: 'AI Node Gateway',
      model: 'gpt-oss-120b',
      responsesUrl: 'http://localhost:8787/v1/responses',
      encodedApiKey: expect.any(String),
    });

    expect(buildCustomOpenAIModel(profile)).toEqual({
      provider: 'custom-openai',
      model: profile.id,
      displayName: 'AI Node Gateway',
    });
    expect(customProfileToPromptConfig(profile)).toEqual({
      model: 'gpt-oss-120b',
      endpointUrl: 'http://localhost:8787/v1/responses',
      apiKey: 'local-dev-token',
    });
  });

  it('keeps profile ids stable when an existing id is supplied', () => {
    const profile = normalizeCustomOpenAIProfileInput({
      id: 'custom-openai-ai-node-gateway',
      label: 'AI Node Gateway v2',
      model: 'gpt-oss-120b',
      responsesUrl: 'https://gateway.example.test/v1/responses',
    });

    expect(profile.id).toBe('custom-openai-ai-node-gateway');
    expect(customProfileToPromptConfig(profile)).toEqual({
      model: 'gpt-oss-120b',
      endpointUrl: 'https://gateway.example.test/v1/responses',
      apiKey: undefined,
    });
  });

  it('rejects browser-unsafe endpoint schemes and private network URLs', () => {
    expect(() =>
      normalizeCustomOpenAIProfileInput({
        label: 'File Endpoint',
        model: 'o3',
        responsesUrl: 'file:///tmp/secret',
      })
    ).toThrow('Custom API endpoint must use https or localhost http.');

    expect(() =>
      normalizeCustomOpenAIProfileInput({
        label: 'Private LAN',
        model: 'o3',
        responsesUrl: 'http://10.0.0.20:8787/v1/responses',
      })
    ).toThrow('Custom API endpoint must use https or localhost http.');
  });
});
