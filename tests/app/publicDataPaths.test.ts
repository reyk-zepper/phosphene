import { describe, expect, it } from 'vitest';
import {
  getCanaryStatusBasePath,
  getHostedSessionBasePath,
  getLiveAdapterBasePath,
  getPublishedSnapshotBasePath,
} from '../../src/app/publicPaths';

describe('public data paths', () => {
  it('prefixes published snapshots, live adapter output, canary markers, and hosted sessions under a project-site base', () => {
    expect(getPublishedSnapshotBasePath('/phosphene/')).toBe('/phosphene/snapshots/current');
    expect(getCanaryStatusBasePath('/phosphene/')).toBe('/phosphene/snapshots/canary');
    expect(getLiveAdapterBasePath('/phosphene/')).toBe('/phosphene/snapshots/live');
    expect(getHostedSessionBasePath('/phosphene/')).toBe('/phosphene/sessions/hosted');
  });

  it('keeps root deployment paths unchanged for the AI-node loopback service', () => {
    expect(getPublishedSnapshotBasePath('/')).toBe('/snapshots/current');
    expect(getCanaryStatusBasePath('/')).toBe('/snapshots/canary');
    expect(getLiveAdapterBasePath('/')).toBe('/snapshots/live');
    expect(getHostedSessionBasePath('/')).toBe('/sessions/hosted');
  });
});
