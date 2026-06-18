import { describe, expect, it } from 'vitest';
import { DEMO_TRACES } from '@/constants/demoTraces';
import { createNodeTraceSummary } from '@/core/traces/summary';

function demoTrace(id: string) {
  const trace = DEMO_TRACES.find((item) => item.id === id);
  if (!trace) throw new Error(`Missing demo trace ${id}`);
  return trace;
}

describe('createNodeTraceSummary', () => {
  it('summarizes approval-gated Gmail draft runs', () => {
    const summary = createNodeTraceSummary(demoTrace('trace-hermes-aag-gmail-draft'));

    expect(summary.eventCount).toBe(4);
    expect(summary.sources).toEqual(['hermes', 'aag']);
    expect(summary.highestRisk).toBe('medium');
    expect(summary.decisionCount).toBe(2);
    expect(summary.approvalCount).toBe(1);
    expect(summary.failureCount).toBe(0);
    expect(summary.recoveryCount).toBe(0);
    expect(summary.terminalStatus).toBe('needs_approval');
    expect(summary.durationMs).toBe(17_000);
  });

  it('summarizes successful bounded worker runs', () => {
    const summary = createNodeTraceSummary(demoTrace('trace-hermes-openclaw-worker'));

    expect(summary.sources).toEqual(['hermes', 'openclaw']);
    expect(summary.highestRisk).toBe('low');
    expect(summary.decisionCount).toBe(1);
    expect(summary.approvalCount).toBe(0);
    expect(summary.failureCount).toBe(0);
    expect(summary.recoveryCount).toBe(0);
    expect(summary.terminalStatus).toBe('succeeded');
    expect(summary.durationMs).toBe(93_000);
  });

  it('summarizes sentinel failure and recovery runs', () => {
    const summary = createNodeTraceSummary(demoTrace('trace-sentinel-failure-recovery'));

    expect(summary.sources).toEqual(['sentinel']);
    expect(summary.highestRisk).toBe('high');
    expect(summary.decisionCount).toBe(2);
    expect(summary.approvalCount).toBe(0);
    expect(summary.failureCount).toBe(1);
    expect(summary.recoveryCount).toBe(1);
    expect(summary.terminalStatus).toBe('recovered');
    expect(summary.durationMs).toBe(782_000);
  });
});
