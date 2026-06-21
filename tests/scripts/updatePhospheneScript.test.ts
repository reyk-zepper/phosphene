import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(rootDir, 'ops/ai-node/update-phosphene.sh');

describe('update-phosphene AI Node script', () => {
  it('includes the Homebrew Node runtime path for non-interactive launch contexts', async () => {
    const script = await readFile(scriptPath, 'utf8');

    expect(script).toContain('/opt/homebrew/opt/node@22/bin');
    expect(script).toContain('export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin');
  });

  it('syncs the redacted live adapter marker and latest pack across deploys', async () => {
    const script = await readFile(scriptPath, 'utf8');

    expect(script).toContain('boundary-live');
    expect(script).toContain('latest.json');
    expect(script).toContain('dist/snapshots/live');
    expect(script).toContain('sync_live_adapter_output');
    expect(script).toContain('ai-node-live-');
    expect(script).toMatch(/\[\[\s+!\s+"\$latest_pack"\s+=~\s+\^ai-node-live-\[0-9]\{8}T\[0-9]\{6}Z\$\s+\]\]/);
    expect(script).not.toContain("=~ '^ai-node-live-");
  });
});
