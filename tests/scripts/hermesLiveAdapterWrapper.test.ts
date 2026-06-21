import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(rootDir, 'ops/ai-node/generate-phosphene-hermes-live-adapter-snapshot.sh');

describe('generate-phosphene-hermes-live-adapter-snapshot wrapper', () => {
  it('runs the Hermes live adapter generator and syncs output into the served live snapshot path', async () => {
    const script = await readFile(scriptPath, 'utf8');

    expect(script).toContain('boundary-live');
    expect(script).toContain('generate-ai-node-hermes-live-adapter-snapshot.mjs');
    expect(script).toContain('PHOSPHENE_HERMES_HOME');
    expect(script).toContain('dist/snapshots/live');
    expect(script).toContain('latest.json');
    expect(script).toContain('ai-node-live-');
  });
});
