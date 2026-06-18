import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { parseTraceIntakeFiles } from '@/core/traces/intake';
import sentinelRecoveryBundle from '@/core/traces/handoffs/hermes-synthetic-2026-06-18/sentinel-recovery.synthetic.json';

const manifest = {
  schema_version: 'phosphene.boundary.v0.1.2',
  created_at: '2026-06-18T12:05:00Z',
  source_agent: 'hermes',
  data_classification: 'synthetic_redacted',
  files: [
    {
      file: 'sentinel-recovery.synthetic.json',
      description: 'Synthetic health-gate failure and recovery trace.',
    },
  ],
  updated_at: '2026-06-18T12:20:00Z',
  import_contract: 'phosphene.boundary.v0.1.2-importable',
  notes: 'Synthetic handoff support manifest.',
};

const validationReport = {
  schema_version: 'phosphene.boundary.v0.1.2',
  created_at: '2026-06-18T12:21:00Z',
  overall_status: 'passed',
  data_source: 'synthetic_files_only_no_live_reads',
  checks: {
    json_parse_all_trace_files: true,
    forbidden_patterns_absent: true,
  },
  trace_results: [
    {
      file: 'sentinel-recovery.synthetic.json',
      checks: {
        json_parse: true,
        forbidden_patterns_absent: true,
      },
      blocked_pattern_classes: [],
      ok: true,
    },
  ],
};

function brokenTraceJson(): string {
  const broken = structuredClone(sentinelRecoveryBundle);
  broken.metadata.id = 'broken-sentinel-recovery';
  broken.metadata.title = 'Broken Sentinel Recovery';
  broken.events[1].links = ['trace://bad-link-shape'] as never;
  return JSON.stringify(broken);
}

describe('parseTraceIntakeFiles', () => {
  it('imports valid traces and keeps manifest/report files as support context', () => {
    const result = parseTraceIntakeFiles([
      { name: 'manifest.json', text: JSON.stringify(manifest) },
      { name: 'sentinel-recovery.synthetic.json', text: JSON.stringify(sentinelRecoveryBundle) },
      { name: 'validation-report.json', text: JSON.stringify(validationReport) },
      { name: 'broken-sentinel-recovery.synthetic.json', text: brokenTraceJson() },
    ]);

    expect(result.summary).toEqual({
      totalFiles: 4,
      acceptedTraceCount: 1,
      blockedTraceCount: 1,
      supportFileCount: 2,
      ignoredFileCount: 0,
      overallStatus: 'partial',
    });
    expect(result.traces.map((trace) => trace.id)).toEqual(['boundary-sentinel-recovery-001']);
    expect(result.manifest?.sourceAgent).toBe('hermes');
    expect(result.validationReport?.overallStatus).toBe('passed');
    expect(result.items.map((item) => [item.fileName, item.kind, item.status])).toEqual([
      ['manifest.json', 'manifest', 'accepted_support'],
      ['sentinel-recovery.synthetic.json', 'trace', 'imported'],
      ['validation-report.json', 'validation_report', 'accepted_support'],
      ['broken-sentinel-recovery.synthetic.json', 'trace', 'blocked'],
    ]);
    expect(result.items[3].errors).toContain('events[1].links[0] must be an object');
  });

  it('blocks support files that contain forbidden private data', () => {
    const result = parseTraceIntakeFiles([
      {
        name: 'manifest.json',
        text: JSON.stringify({
          ...manifest,
          notes: 'Do not expose http://192.168.1.10/private',
        }),
      },
    ]);

    expect(result.summary.overallStatus).toBe('failed');
    expect(result.items[0].kind).toBe('manifest');
    expect(result.items[0].status).toBe('blocked');
    expect(result.items[0].errors).toContain('Support file contains forbidden sensitive pattern: private_url');
  });
});

describe('validate-boundary-traces CLI', () => {
  it('accepts a handoff directory containing trace bundles plus manifest and validation report support files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'phosphene-intake-'));

    try {
      writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
      writeFileSync(join(dir, 'validation-report.json'), JSON.stringify(validationReport));
      writeFileSync(join(dir, 'sentinel-recovery.synthetic.json'), JSON.stringify(sentinelRecoveryBundle));

      const output = execFileSync('node', ['scripts/validate-boundary-traces.mjs', dir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });

      expect(output).toContain('PASS');
      expect(output).toContain('(manifest)');
      expect(output).toContain('(validation_report)');
      expect(output).toContain('Validated 3 file(s), 0 failed.');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
