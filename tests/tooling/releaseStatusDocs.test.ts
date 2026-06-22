import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const releaseStatusPath = resolve(process.cwd(), 'docs/launch/phosphene-release-status.md');

describe('release status documentation', () => {
  it('records the technical completion checkpoint and deferred publication gates', () => {
    expect(statSync(releaseStatusPath).isFile()).toBe(true);

    const statusDoc = readFileSync(releaseStatusPath, 'utf8');
    const launchKit = readFileSync(resolve(process.cwd(), 'docs/launch/phosphene-launch-kit.md'), 'utf8');
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');

    expect(statusDoc).toContain('Technical development status: complete');
    expect(statusDoc).toContain('Publication status: deferred');
    expect(statusDoc).toContain('phosphene.dev');
    expect(statusDoc).toContain('npm login');
    expect(statusDoc).toContain('npm publish --access public');
    expect(statusDoc).toContain('phosphene-ai');
    expect(statusDoc).toContain('pnpm --silent release:preflight');
    expect(statusDoc).toContain('No raw live telemetry');
    expect(launchKit).toContain('./phosphene-release-status.md');
    expect(readme).toContain('./docs/launch/phosphene-release-status.md');
  });
});
