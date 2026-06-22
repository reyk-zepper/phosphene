const TARGETS = [
  {
    label: 'GitHub Pages fallback',
    url: 'https://reyk-zepper.github.io/phosphene/',
  },
  {
    label: 'phosphene.dev',
    url: 'https://phosphene.dev/',
  },
];

function includesNeedle(value, needle) {
  return value.toLowerCase().includes(needle.toLowerCase());
}

function classifyLaunchTarget(input) {
  const evidence = [];

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

function summarizeLaunchPreflight(targets) {
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

async function probeTarget(target) {
  try {
    const response = await globalThis.fetch(target.url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'phosphene-launch-preflight/0.1',
      },
    });
    const body = await response.text();

    return classifyLaunchTarget({
      label: target.label,
      url: target.url,
      status: response.status,
      contentType: response.headers.get('content-type') ?? '',
      body,
    });
  } catch (error) {
    return {
      label: target.label,
      url: target.url,
      status: 'blocked',
      reason: error instanceof Error ? error.message : 'request failed',
      evidence: [],
    };
  }
}

const results = await Promise.all(TARGETS.map(probeTarget));
const summary = summarizeLaunchPreflight(results);

console.log(JSON.stringify(summary, null, 2));

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
