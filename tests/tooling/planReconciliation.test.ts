import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const plansDir = resolve(process.cwd(), 'docs/superpowers/plans');

describe('implementation plan reconciliation', () => {
  it('does not leave completed historical plans with unchecked task markers', () => {
    const unchecked = readdirSync(plansDir)
      .filter((file) => file.endsWith('.md'))
      .flatMap((file) => {
        const path = resolve(plansDir, file);
        return readFileSync(path, 'utf8')
          .split('\n')
          .map((line, index) => ({ file, line, lineNumber: index + 1 }))
          .filter((entry) => entry.line.startsWith('- [ ]'));
      });

    expect(unchecked).toEqual([]);
  });
});
