import type { ModelIdentifier } from '@/core/parser/types';
import { decodeKey, encodeKey } from '@/utils/crypto';

export const CUSTOM_OPENAI_PROVIDER_ID = 'custom-openai' as const;

export interface CustomOpenAIProfile {
  id: string;
  label: string;
  model: string;
  responsesUrl: string;
  encodedApiKey?: string;
}

export interface CustomOpenAIProfileInput {
  id?: string;
  label: string;
  model: string;
  responsesUrl: string;
  apiKey?: string;
  encodedApiKey?: string;
}

export interface CustomOpenAIPromptConfig {
  model: string;
  endpointUrl: string;
  apiKey?: string;
}

export function normalizeCustomOpenAIProfileInput(
  input: CustomOpenAIProfileInput
): CustomOpenAIProfile {
  const label = input.label.trim();
  const model = input.model.trim();
  const responsesUrl = normalizeResponsesUrl(input.responsesUrl);

  if (!label) throw new Error('Custom API profile label is required.');
  if (!model) throw new Error('Custom API model id is required.');

  const id = normalizeProfileId(input.id) ?? `custom-openai-${slugify(label)}`;
  const apiKeyWasProvided = Object.prototype.hasOwnProperty.call(input, 'apiKey');
  const apiKey = input.apiKey?.trim();
  const encodedApiKey = apiKeyWasProvided
    ? apiKey
      ? encodeKey(apiKey)
      : undefined
    : input.encodedApiKey;

  return {
    id,
    label,
    model,
    responsesUrl,
    ...(encodedApiKey ? { encodedApiKey } : {}),
  };
}

export function buildCustomOpenAIModel(profile: CustomOpenAIProfile): ModelIdentifier {
  return {
    provider: CUSTOM_OPENAI_PROVIDER_ID,
    model: profile.id,
    displayName: profile.label,
  };
}

export function customProfileToPromptConfig(
  profile: CustomOpenAIProfile
): CustomOpenAIPromptConfig {
  return {
    model: profile.model,
    endpointUrl: profile.responsesUrl,
    apiKey: profile.encodedApiKey ? decodeKey(profile.encodedApiKey) : undefined,
  };
}

export function isSafeCustomResponsesUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (url.protocol === 'https:') return true;
    if (url.protocol !== 'http:') return false;
    return isLocalhost(url.hostname);
  } catch {
    return false;
  }
}

function normalizeResponsesUrl(value: string): string {
  const trimmed = value.trim();
  if (!isSafeCustomResponsesUrl(trimmed)) {
    throw new Error('Custom API endpoint must use https or localhost http.');
  }
  const url = new URL(trimmed);
  url.hash = '';
  return url.toString();
}

function normalizeProfileId(value?: string): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (/^custom-openai-[a-z0-9-]+$/.test(normalized)) return normalized;
  return null;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'profile';
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}
