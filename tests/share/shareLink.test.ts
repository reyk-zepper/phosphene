import { describe, expect, it } from 'vitest';
import {
  buildShareUrl,
  parseShareLinkState,
  sanitizeShareParam,
} from '@/core/share/shareLink';

describe('share link state', () => {
  it('keeps share params id-only and rejects unsafe values', () => {
    expect(sanitizeShareParam('trace.hermes-aag:2026_06_21')).toBe('trace.hermes-aag:2026_06_21');
    expect(sanitizeShareParam('')).toBeUndefined();
    expect(sanitizeShareParam('../private/path')).toBeUndefined();
    expect(sanitizeShareParam('sk-ant-secret')).toBeUndefined();
    expect(sanitizeShareParam('node id with spaces')).toBeUndefined();
  });

  it('builds a deterministic observer trace URL without leaking existing query params', () => {
    const url = buildShareUrl('http://localhost:5173/?debug=true#old', {
      mode: 'observer',
      traceId: 'trace-hermes-aag',
      nodeId: 'aag.approval:required',
    });

    expect(url).toBe(
      'http://localhost:5173/?mode=observer&trace=trace-hermes-aag&node=aag.approval%3Arequired'
    );
  });

  it('builds a deterministic reasoning graph URL', () => {
    const url = buildShareUrl('https://phosphene.dev/app', {
      mode: 'reasoning',
      graphId: 'demo-river-crossing',
      nodeId: 'n7',
    });

    expect(url).toBe('https://phosphene.dev/app?mode=reasoning&graph=demo-river-crossing&node=n7');
  });

  it('parses only safe and supported share state', () => {
    expect(parseShareLinkState('?mode=observer&trace=trace-hermes-aag&node=n7')).toEqual({
      mode: 'observer',
      traceId: 'trace-hermes-aag',
      nodeId: 'n7',
    });
    expect(parseShareLinkState('?mode=bad&trace=../private&node=a b&graph=demo')).toEqual({
      graphId: 'demo',
    });
  });
});
