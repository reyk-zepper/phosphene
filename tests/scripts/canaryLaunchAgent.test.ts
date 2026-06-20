import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(rootDir, 'ops/ai-node/install-phosphene-canary-launchagent.sh');

async function tempPath(name: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), `phosphene-${name}-`));
}

describe('install-phosphene-canary-launchagent', () => {
  it('writes a dry-run LaunchAgent plist for the non-publishing canary wrapper', async () => {
    const tempRoot = await tempPath('canary-launchagent');
    const plistPath = path.join(tempRoot, 'LaunchAgents/com.raik.phosphene-canary.plist');
    const logPath = path.join(tempRoot, 'logs/phosphene-canary.log');

    const result = await execFileAsync('bash', [
      scriptPath,
      '--dry-run',
      '--ai-stack-root',
      tempRoot,
      '--plist-dir',
      path.join(tempRoot, 'LaunchAgents'),
      '--interval-seconds',
      '900',
    ], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024,
    });

    expect(result.stdout).toContain('Dry run complete');

    const plist = await readFile(plistPath, 'utf8');
    expect(plist).toContain('<string>com.raik.phosphene-canary</string>');
    expect(plist).toContain('<integer>900</integer>');
    expect(plist).toContain('<string>/bin/bash</string>');
    expect(plist).toContain(`<string>${tempRoot}/scripts/generate-phosphene-canary-snapshot.sh</string>`);
    expect(plist).toContain(`<string>${logPath}</string>`);
    expect(plist).toContain('<key>RunAtLoad</key>');
    expect(plist).toContain('<false/>');

    await rm(tempRoot, { recursive: true, force: true });
  });
});
