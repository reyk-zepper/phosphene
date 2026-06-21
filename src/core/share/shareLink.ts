export type ShareLinkMode = 'observer' | 'reasoning';

export interface ShareLinkState {
  mode?: ShareLinkMode;
  traceId?: string;
  graphId?: string;
  nodeId?: string;
}

const SAFE_SHARE_PARAM = /^[a-zA-Z0-9._:-]{1,120}$/;
const TOKEN_LIKE_PREFIX = /^(sk-|pk-|bearer|token|secret)/i;

export function sanitizeShareParam(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (!SAFE_SHARE_PARAM.test(trimmed)) return undefined;
  if (TOKEN_LIKE_PREFIX.test(trimmed)) return undefined;
  return trimmed;
}

export function buildShareUrl(baseUrl: string, state: ShareLinkState): string {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';

  if (state.mode) url.searchParams.set('mode', state.mode);

  const traceId = sanitizeShareParam(state.traceId);
  const graphId = sanitizeShareParam(state.graphId);
  const nodeId = sanitizeShareParam(state.nodeId);

  if (state.mode === 'observer' && traceId) {
    url.searchParams.set('trace', traceId);
  }
  if (state.mode === 'reasoning' && graphId) {
    url.searchParams.set('graph', graphId);
  }
  if (nodeId) {
    url.searchParams.set('node', nodeId);
  }

  return url.toString();
}

export function parseShareLinkState(input: string): ShareLinkState {
  const searchParams = input.includes('?')
    ? new URL(input, 'http://phosphene.local').searchParams
    : new URLSearchParams(input);

  const modeParam = searchParams.get('mode');
  const mode = modeParam === 'observer' || modeParam === 'reasoning' ? modeParam : undefined;
  const traceId = sanitizeShareParam(searchParams.get('trace'));
  const graphId = sanitizeShareParam(searchParams.get('graph'));
  const nodeId = sanitizeShareParam(searchParams.get('node'));

  return {
    ...(mode ? { mode } : {}),
    ...(traceId ? { traceId } : {}),
    ...(graphId ? { graphId } : {}),
    ...(nodeId ? { nodeId } : {}),
  };
}
