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
});
