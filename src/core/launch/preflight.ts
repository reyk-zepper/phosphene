export type LaunchTargetStatus = 'ready' | 'blocked';

export interface LaunchTargetInput {
  label: string;
  url: string;
  status: number;
  contentType: string;
  body: string;
}

export interface LaunchTargetResult {
  label: string;
  url: string;
  status: LaunchTargetStatus;
  reason: string;
  evidence: string[];
}

export interface LaunchPreflightSummary {
  status: 'ready' | 'fallback_ready' | 'blocked';
  primaryUrl: string | null;
  blockers: string[];
  targets: LaunchTargetResult[];
}

function includesNeedle(value: string, needle: string) {
  return value.toLowerCase().includes(needle.toLowerCase());
}

export function classifyLaunchTarget(input: LaunchTargetInput): LaunchTargetResult {
  const evidence: string[] = [];

  if (input.status < 200 || input.status > 299) {
    return {
      label: input.label,
      url: input.url,
      status: 'blocked',
      reason: `HTTP ${input.status}`,
      evidence,
    };
  }

  if (!includesNeedle(input.contentType, 'text/html')) {
    return {
      label: input.label,
      url: input.url,
      status: 'blocked',
      reason: `unexpected content type ${input.contentType || 'unknown'}`,
      evidence,
    };
  }

  if (includesNeedle(input.body, '<title>Phosphene')) {
    evidence.push('Phosphene title');
  }

  if (includesNeedle(input.body, 'Open-source AI reasoning visualizer')) {
    evidence.push('reasoning visualizer metadata');
  }

  if (includesNeedle(input.body, '<div id="root"')) {
    evidence.push('React root');
  }

  if (evidence.length >= 3) {
    return {
      label: input.label,
      url: input.url,
      status: 'ready',
      reason: 'serving Phosphene',
      evidence,
    };
  }

  return {
    label: input.label,
    url: input.url,
    status: 'blocked',
    reason: 'reachable but not serving Phosphene',
    evidence,
  };
}

export function summarizeLaunchPreflight(targets: LaunchTargetResult[]): LaunchPreflightSummary {
  const readyTargets = targets.filter((target) => target.status === 'ready');
  const blockers = targets
    .filter((target) => target.status === 'blocked')
    .map((target) => `${target.label}: ${target.reason}`);
  const customDomainReady = readyTargets.some((target) => target.url === 'https://phosphene.dev/');
  const pagesFallback = readyTargets.find((target) => target.url === 'https://reyk-zepper.github.io/phosphene/');

  if (customDomainReady) {
    return {
      status: 'ready',
      primaryUrl: 'https://phosphene.dev/',
      blockers,
      targets,
    };
  }

  if (pagesFallback) {
    return {
      status: 'fallback_ready',
      primaryUrl: pagesFallback.url,
      blockers,
      targets,
    };
  }

  return {
    status: 'blocked',
    primaryUrl: null,
    blockers,
    targets,
  };
}
