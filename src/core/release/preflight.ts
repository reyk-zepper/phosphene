export type ReleaseGateStatus = 'ready' | 'blocked';

export interface ReleaseGate {
  id: string;
  label: string;
  status: ReleaseGateStatus;
  reason: string;
  action: string | null;
  commands?: string[];
  evidence: string[];
}

export interface ReleasePreflightSummary {
  status: ReleaseGateStatus;
  ready: number;
  blocked: number;
  blockers: string[];
  nextActions: string[];
  manualCommands: string[];
  gates: ReleaseGate[];
}

export function sanitizeReleaseEvidence(value: string): string {
  return value.replace(/\/Users\/[^\s]+\/\.npm\/_logs\/[^\s]+/g, '[local npm log path redacted]');
}

export function summarizeReleasePreflight(gates: ReleaseGate[]): ReleasePreflightSummary {
  const blockers = gates
    .filter((gate) => gate.status === 'blocked')
    .map((gate) => `${gate.label}: ${gate.reason}`);
  const nextActions = gates
    .filter((gate) => gate.status === 'blocked' && gate.action)
    .map((gate) => gate.action as string);
  const manualCommands = Array.from(
    new Set(
      gates
        .filter((gate) => gate.status === 'blocked')
        .flatMap((gate) => gate.commands ?? []),
    ),
  );

  return {
    status: blockers.length > 0 ? 'blocked' : 'ready',
    ready: gates.filter((gate) => gate.status === 'ready').length,
    blocked: blockers.length,
    blockers,
    nextActions,
    manualCommands,
    gates,
  };
}
