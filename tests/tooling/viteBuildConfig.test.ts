import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');

describe('vite app build chunking', () => {
  it('splits heavy runtime dependencies into named vendor chunks without hiding size warnings', async () => {
    const source = await readFile(path.join(rootDir, 'vite.config.ts'), 'utf8');

    expect(source).toContain('manualChunks');
    expect(source).toContain('vendor-react');
    expect(source).toContain('vendor-graph');
    expect(source).toContain('vendor-markdown');
    expect(source).toContain('vendor-motion');
    expect(source).not.toContain('chunkSizeWarningLimit');
  });
});
