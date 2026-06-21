import { Scale, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  evaluateConstitution,
  type ConstitutionRuleKind,
} from '@/core/constitution/rules';
import type { ReasoningNodeType, ReasoningGraph } from '@/core/parser/types';
import { useConstitutionStore } from '@/core/store/constitutionStore';

interface ConstitutionPanelProps {
  graph: ReasoningGraph;
}

const NODE_TYPES: ReasoningNodeType[] = [
  'hypothesis',
  'analysis',
  'conclusion',
  'question',
  'comparison',
  'evidence',
  'revision',
  'decision',
];

export function ConstitutionPanel({ graph }: ConstitutionPanelProps) {
  const rules = useConstitutionStore((state) => state.rules);
  const addRule = useConstitutionStore((state) => state.addRule);
  const toggleRule = useConstitutionStore((state) => state.toggleRule);
  const removeRule = useConstitutionStore((state) => state.removeRule);
  const report = useMemo(() => evaluateConstitution(graph, rules), [graph, rules]);
  const visibleResults = report.results.slice(0, 5);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<ConstitutionRuleKind>('requires_text');
  const [text, setText] = useState('');
  const [nodeType, setNodeType] = useState<ReasoningNodeType>('evidence');
  const [threshold, setThreshold] = useState('0.6');
  const [message, setMessage] = useState<string | null>(null);

  const handleAdd = () => {
    try {
      addRule({
        label,
        kind,
        text: kind === 'requires_text' ? text : undefined,
        nodeType: kind === 'requires_node_type' ? nodeType : undefined,
        minConfidence: kind === 'min_confidence' ? Number(threshold) : undefined,
        maxDepth: kind === 'max_depth' ? Number(threshold) : undefined,
      });
      setLabel('');
      setText('');
      setMessage('Rule added');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to add rule');
    }
  };

  return (
    <section className="pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/75 px-3 py-3 backdrop-blur-xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Scale size={13} className="text-[color:var(--glow-decision)]" />
            <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
              Constitution
            </span>
          </div>
          <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xs text-[color:var(--text-secondary)]">
            {Math.round(report.score * 100)}% rule score
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-[color:var(--border-subtle)] px-2 py-1 font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
          {report.failedRules} failing
        </span>
      </header>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Rules" value={String(report.totalRules)} />
        <Stat label="Pass" value={String(report.passedRules)} />
        <Stat label="Fail" value={String(report.failedRules)} />
      </div>

      {visibleResults.length > 0 && (
        <div className="mt-3 space-y-2">
          {visibleResults.map((result) => {
            const rule = rules.find((item) => item.id === result.ruleId);
            return (
              <div
                key={result.ruleId}
                className="rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleRule(result.ruleId)}
                    className="truncate font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase"
                  >
                    {result.label}
                  </button>
                  <span
                    className="shrink-0 font-mono text-[9px] tracking-wider uppercase"
                    style={{
                      color:
                        result.status === 'passed'
                          ? 'var(--glow-decision)'
                          : 'var(--glow-revision)',
                    }}
                  >
                    {result.status}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-[color:var(--text-secondary)]">
                  {result.message}
                </p>
                {rule && !isDefaultRule(result.ruleId) && (
                  <button
                    type="button"
                    onClick={() => removeRule(result.ruleId)}
                    aria-label={`Remove ${result.label}`}
                    className="mt-1 rounded p-0.5 text-[color:var(--text-muted)] transition hover:text-[color:var(--glow-revision)]"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 grid grid-cols-[1fr_120px] gap-2">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Rule label"
          className="min-w-0 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--glow-analysis)]"
        />
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as ConstitutionRuleKind)}
          className="rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--glow-analysis)]"
        >
          <option value="requires_text">Text</option>
          <option value="requires_node_type">Node type</option>
          <option value="min_confidence">Confidence</option>
          <option value="max_depth">Depth</option>
        </select>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        {kind === 'requires_node_type' ? (
          <select
            value={nodeType}
            onChange={(event) => setNodeType(event.target.value as ReasoningNodeType)}
            className="rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--glow-analysis)]"
          >
            {NODE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={kind === 'requires_text' ? text : threshold}
            onChange={(event) =>
              kind === 'requires_text' ? setText(event.target.value) : setThreshold(event.target.value)
            }
            placeholder={kind === 'requires_text' ? 'Required phrase' : '0.6 or depth'}
            inputMode={kind === 'requires_text' ? 'text' : 'decimal'}
            className="min-w-0 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--glow-analysis)]"
          />
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!label.trim()}
          className="rounded-md border border-[color:var(--glow-decision)] px-2 py-1.5 font-[family-name:var(--font-display)] text-[11px] text-[color:var(--glow-decision)] transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {message && (
        <p className="mt-2 truncate font-mono text-[10px] text-[color:var(--text-muted)]">
          {message}
        </p>
      )}
    </section>
  );
}

function isDefaultRule(ruleId: string): boolean {
  return [
    'requires_evidence',
    'requires_decision',
    'requires_uncertainty_probe',
    'confidence_floor',
  ].includes(ruleId);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block truncate font-mono text-[8px] tracking-wider text-[color:var(--text-muted)] uppercase">
        {label}
      </span>
      <span className="mt-1 block truncate font-[family-name:var(--font-display)] text-sm text-[color:var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}
