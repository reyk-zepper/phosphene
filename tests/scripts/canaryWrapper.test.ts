import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(rootDir, 'ops/ai-node/generate-phosphene-canary-snapshot.sh');

async function tempPath(name: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), `phosphene-${name}-`));
}

describe('generate-phosphene-canary-snapshot wrapper', () => {
  it('includes the Homebrew Node runtime path for LaunchAgent contexts', async () => {
    const script = await readFile(scriptPath, 'utf8');

    expect(script).toContain('/opt/homebrew/opt/node@22/bin');
    expect(script).toContain('export PATH="/opt/homebrew/opt/node@22/bin:');
  });

  it('syncs the redacted latest marker into the served canary status directory', async () => {
    const tempRoot = await tempPath('canary-wrapper');
    const outputRoot = path.join(tempRoot, 'handoffs/boundary-canary');
    const targetDir = path.join(outputRoot, 'ai-node-canary-20260620T230000Z');
    const servedDir = path.join(tempRoot, 'service/dist/snapshots/canary');
    const aagStatusFile = path.join(tempRoot, 'state/aag-live-status.env');

    await mkdir(servedDir, { recursive: true });
    await mkdir(path.dirname(aagStatusFile), { recursive: true });
    await writeFile(aagStatusFile, [
      'STATUS=ok',
      'AAG_HEALTH=ok',
      'MCP_TOOL_COUNT=13',
      'HERMES_MCP_ENABLED=true',
      'HERMES_MCP_TOOL_COUNT=13',
      'AUDIT_SMOKE=skipped_interval',
      'BASE_URL=http://127.0.0.1:8787',
      'CHECKED_AT=2026-06-22T14:16:31Z',
      '',
    ].join('\n'));

    const result = await execFileAsync('bash', [
      scriptPath,
      '--no-dry-run',
      targetDir,
    ], {
      cwd: rootDir,
      env: {
        ...process.env,
        AI_STACK_ROOT: tempRoot,
        PHOSPHENE_SERVICE_DIR: rootDir,
        PHOSPHENE_CANARY_OUTPUT_ROOT: outputRoot,
        PHOSPHENE_CANARY_SERVED_DIR: servedDir,
        PHOSPHENE_CANARY_RETENTION_COUNT: '3',
      },
      maxBuffer: 1024 * 1024,
    });

    expect(result.stdout).toContain(`Canary pack: ${targetDir}`);

    const sourceLatest = await readFile(path.join(outputRoot, 'latest.json'), 'utf8');
    const servedLatest = await readFile(path.join(servedDir, 'latest.json'), 'utf8');

    expect(servedLatest).toBe(sourceLatest);
    expect(servedLatest).toContain('"latest_pack": "ai-node-canary-20260620T230000Z"');
    expect(servedLatest).toContain('"aag_live"');
    expect(servedLatest).toContain('"mcp_tool_count": 13');
    expect(servedLatest).not.toContain(tempRoot);
    expect(servedLatest).not.toContain(rootDir);
    expect(servedLatest).not.toContain('127.0.0.1');

    await rm(tempRoot, { recursive: true, force: true });
  });
});
