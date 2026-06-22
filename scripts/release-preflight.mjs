import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function summarizeReleasePreflight(gates) {
  const blockers = gates
    .filter((gate) => gate.status === 'blocked')
    .map((gate) => `${gate.label}: ${gate.reason}`);
  const nextActions = gates
    .filter((gate) => gate.status === 'blocked' && gate.action)
    .map((gate) => gate.action);
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

function sanitizeReleaseEvidence(value) {
  return value.replace(/\/Users\/[^\s]+\/\.npm\/_logs\/[^\s]+/g, '[local npm log path redacted]');
}

async function run(command, args) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        GH_PAGER: '',
      },
    });
    return {
      ok: true,
      stdout: sanitizeReleaseEvidence(result.stdout.trim()),
      stderr: sanitizeReleaseEvidence(result.stderr.trim()),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error.stdout === 'string' ? sanitizeReleaseEvidence(error.stdout.trim()) : '',
      stderr:
        typeof error.stderr === 'string'
          ? sanitizeReleaseEvidence(error.stderr.trim())
          : error instanceof Error
            ? sanitizeReleaseEvidence(error.message)
            : '',
    };
  }
}

async function readLaunchPreflight() {
  const result = await run('pnpm', ['--silent', 'launch:preflight']);

  if (!result.ok) {
    return {
      ok: false,
      evidence: result.stderr || result.stdout,
    };
  }

  try {
    return {
      ok: true,
      summary: JSON.parse(result.stdout),
    };
  } catch (error) {
    return {
      ok: false,
      evidence: error instanceof Error ? error.message : 'could not parse launch preflight output',
    };
  }
}

function launchGate(launch) {
  if (!launch.ok) {
    return {
      id: 'public_demo',
      label: 'Public demo',
      status: 'blocked',
      reason: 'launch preflight failed',
      action: 'Fix the public Pages or custom-domain launch target, then rerun pnpm --silent launch:preflight.',
      evidence: [launch.evidence],
    };
  }

  const summary = launch.summary;
  const isReady = summary.status === 'ready' || summary.status === 'fallback_ready';

  return {
    id: 'public_demo',
    label: 'Public demo',
    status: isReady ? 'ready' : 'blocked',
    reason: isReady ? `${summary.primaryUrl} is serving Phosphene` : 'no public Phosphene URL is serving the app',
    action: isReady ? null : 'Restore a public Phosphene URL, then rerun pnpm --silent launch:preflight.',
    commands: isReady ? [] : ['pnpm --silent launch:preflight'],
    evidence: [summary.status, summary.primaryUrl ?? 'no primaryUrl', ...summary.blockers],
  };
}

function customDomainGate(launch) {
  if (!launch.ok) {
    return {
      id: 'custom_domain',
      label: 'phosphene.dev',
      status: 'blocked',
      reason: 'launch preflight failed before custom-domain classification',
      action: 'Fix launch preflight, then point phosphene.dev at the Phosphene build.',
      evidence: [launch.evidence],
    };
  }

  const summary = launch.summary;
  const domainTarget = summary.targets.find((target) => target.url === 'https://phosphene.dev/');
  const isReady = domainTarget?.status === 'ready';

  return {
    id: 'custom_domain',
    label: 'phosphene.dev',
    status: isReady ? 'ready' : 'blocked',
    reason: isReady ? 'serving Phosphene' : domainTarget?.reason ?? 'not checked',
    action: isReady
      ? null
      : 'Move phosphene.dev DNS/hosting to the Phosphene build, then rerun pnpm --silent launch:preflight.',
    commands: isReady ? [] : ['pnpm --silent launch:preflight'],
    evidence: domainTarget ? [domainTarget.reason, ...domainTarget.evidence] : ['missing phosphene.dev target'],
  };
}

async function npmAuthGate() {
  const result = await run('npm', ['whoami']);

  return {
    id: 'npm_auth',
    label: 'npm auth',
    status: result.ok ? 'ready' : 'blocked',
    reason: result.ok ? `logged in as ${result.stdout}` : 'npm CLI is not logged in',
    action: result.ok ? null : 'Run npm adduser or npm login with the intended publishing account.',
    commands: result.ok ? [] : ['npm login'],
    evidence: [result.ok ? result.stdout : result.stderr || result.stdout],
  };
}

async function npmPackageGate() {
  const result = await run('npm', ['view', '@reyk-zepper/phosphene', 'version', '--json']);

  return {
    id: 'npm_package',
    label: 'npm package',
    status: result.ok ? 'ready' : 'blocked',
    reason: result.ok
      ? `@reyk-zepper/phosphene@${JSON.parse(result.stdout)} is published`
      : '@reyk-zepper/phosphene is not published',
    action: result.ok ? null : 'After npm auth is ready, run pnpm --silent publish:packages:dry-run and publish manually.',
    commands: result.ok
      ? []
      : ['pnpm --silent publish:packages:dry-run', 'npm publish --access public', 'npm view @reyk-zepper/phosphene version --json'],
    evidence: [result.ok ? result.stdout : result.stderr || result.stdout],
  };
}

async function githubOrgGate() {
  const result = await run('gh', ['api', 'orgs/phosphene-ai', '--jq', '.login']);

  return {
    id: 'github_org',
    label: 'GitHub org phosphene-ai',
    status: result.ok && result.stdout === 'phosphene-ai' ? 'ready' : 'blocked',
    reason: result.ok ? 'org exists and is visible' : 'org missing or token lacks org-admin access',
    action: result.ok
      ? null
      : 'Create phosphene-ai in GitHub UI or refresh gh auth with admin:org, then create/push org repos.',
    commands: result.ok
      ? []
      : [
          'gh auth refresh -h github.com -s admin:org',
          'gh api orgs/phosphene-ai --jq .login',
          'gh repo create phosphene-ai/phosphene --public --source /Users/reykz/repositorys/phosphene --remote phosphene-ai',
          'gh repo create phosphene-ai/constitution --public --source /Users/reykz/repositorys/constitution --remote phosphene-ai',
        ],
    evidence: [result.ok ? result.stdout : result.stderr || result.stdout],
  };
}

async function pagesCustomDomainGate() {
  const result = await run('gh', [
    'api',
    'repos/reyk-zepper/phosphene/pages',
    '--jq',
    '{cname:.cname,html_url:.html_url,https_enforced:.https_enforced}',
  ]);

  if (!result.ok) {
    return {
      id: 'pages_custom_domain',
      label: 'GitHub Pages custom domain',
      status: 'blocked',
      reason: 'could not read GitHub Pages config',
      action: 'Verify GitHub Pages settings manually.',
      evidence: [result.stderr || result.stdout],
    };
  }

  const pages = JSON.parse(result.stdout);
  const hasDomain = pages.cname === 'phosphene.dev';

  return {
    id: 'pages_custom_domain',
    label: 'GitHub Pages custom domain',
    status: hasDomain ? 'ready' : 'blocked',
    reason: hasDomain ? 'phosphene.dev configured on GitHub Pages' : 'GitHub Pages has no phosphene.dev CNAME',
    action: hasDomain
      ? null
      : 'After DNS points at GitHub Pages, configure phosphene.dev as the Pages custom domain.',
    commands: hasDomain
      ? []
      : [
          "gh api repos/reyk-zepper/phosphene/pages --jq '{cname:.cname,html_url:.html_url,https_enforced:.https_enforced}'",
          'pnpm --silent launch:preflight',
        ],
    evidence: [`cname=${pages.cname ?? 'null'}`, `html_url=${pages.html_url}`, `https_enforced=${pages.https_enforced}`],
  };
}

const launchPreflight = readLaunchPreflight();

const gates = await Promise.all([
  launchPreflight.then(launchGate),
  launchPreflight.then(customDomainGate),
  npmAuthGate(),
  npmPackageGate(),
  githubOrgGate(),
  pagesCustomDomainGate(),
]);

const summary = summarizeReleasePreflight(gates);
console.log(JSON.stringify(summary, null, 2));

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
