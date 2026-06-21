import { Download, MessageSquareText, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  createGraphAnnotationBundle,
  parseGraphAnnotationBundle,
  summarizeGraphAnnotations,
  type GraphAnnotationPriority,
  type GraphAnnotationStatus,
} from '@/core/annotations/graphAnnotations';
import { buildGraphExportFileName } from '@/core/graph/export';
import { flattenGraph } from '@/core/graph/traversal';
import type { ReasoningGraph } from '@/core/parser/types';
import { useAnnotationStore } from '@/core/store/annotationStore';
import { useSessionStore } from '@/core/store/sessionStore';

interface AnnotationPanelProps {
  graph: ReasoningGraph;
}

export function AnnotationPanel({ graph }: AnnotationPanelProps) {
  const annotations = useAnnotationStore((state) => state.annotations);
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const importAnnotations = useAnnotationStore((state) => state.importAnnotations);
  const setAnnotationStatus = useAnnotationStore((state) => state.setAnnotationStatus);
  const removeAnnotation = useAnnotationStore((state) => state.removeAnnotation);
  const selectedNodeId = useSessionStore((state) => state.selectedNodeId);
  const selectedGraphId = useSessionStore((state) => state.selectedGraphId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [author, setAuthor] = useState('Reviewer');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<GraphAnnotationStatus>('open');
  const [priority, setPriority] = useState<GraphAnnotationPriority>('medium');
  const [message, setMessage] = useState<string | null>(null);

  const graphAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.graphId === graph.id),
    [annotations, graph.id]
  );
  const summary = useMemo(
    () => summarizeGraphAnnotations(graph, annotations),
    [annotations, graph]
  );
  const nodes = useMemo(() => flattenGraph(graph.rootNode), [graph]);
  const selectedNode =
    selectedGraphId === graph.id
      ? nodes.find((node) => node.id === selectedNodeId) ?? null
      : null;
  const targetNodeId = selectedNode?.id;

  const visibleAnnotations = useMemo(() => {
    const selectedFirst = [...graphAnnotations].sort((a, b) => {
      const aSelected = targetNodeId && a.nodeId === targetNodeId ? 1 : 0;
      const bSelected = targetNodeId && b.nodeId === targetNodeId ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      return b.updatedAt - a.updatedAt;
    });
    return selectedFirst.slice(0, 4);
  }, [graphAnnotations, targetNodeId]);

  const handleSave = () => {
    if (!body.trim() || !author.trim()) return;
    addAnnotation({
      graphId: graph.id,
      nodeId: targetNodeId,
      author,
      body,
      status,
      priority,
    });
    setBody('');
    setMessage('Annotation saved');
  };

  const handleExport = () => {
    const bundle = createGraphAnnotationBundle(graph, annotations);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildGraphExportFileName(`annotations-${graph.id}`, 'json');
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Annotation bundle exported');
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const result = parseGraphAnnotationBundle(text, graph);
    if (result.status === 'blocked') {
      setMessage(result.errors.join(' '));
      return;
    }
    importAnnotations(result.annotations);
    setMessage(`${result.annotations.length} annotations imported`);
  };

  return (
    <section className="pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/75 px-3 py-3 backdrop-blur-xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquareText size={13} className="text-[color:var(--glow-question)]" />
            <span className="font-mono text-[10px] tracking-widest text-[color:var(--text-muted)] uppercase">
              Annotations
            </span>
          </div>
          <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xs text-[color:var(--text-secondary)]">
            {targetNodeId ? selectedNode?.summary : 'Graph review'}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-[color:var(--border-subtle)] px-2 py-1 font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
          {summary.open + summary.questions} active
        </span>
      </header>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Stat label="Total" value={String(summary.total)} />
        <Stat label="Nodes" value={String(summary.nodeAnchored)} />
        <Stat label="High" value={String(summary.highPriority)} />
        <Stat label="Done" value={String(summary.resolved)} />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_92px] gap-2">
        <input
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Reviewer"
          className="min-w-0 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--glow-analysis)]"
        />
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as GraphAnnotationPriority)}
          className="rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--glow-analysis)]"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={2}
        placeholder={targetNodeId ? 'Node review note' : 'Graph review note'}
        className="mt-2 w-full resize-none rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-2 font-[family-name:var(--font-body)] text-xs leading-relaxed text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--glow-analysis)]"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as GraphAnnotationStatus)}
          className="rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--glow-analysis)]"
        >
          <option value="open">Open</option>
          <option value="question">Question</option>
          <option value="resolved">Resolved</option>
        </select>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import annotation bundle"
            className="rounded-md p-1.5 text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--glow-question)]"
          >
            <Upload size={13} />
          </button>
          <button
            type="button"
            onClick={handleExport}
            aria-label="Export annotation bundle"
            className="rounded-md p-1.5 text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--glow-question)]"
          >
            <Download size={13} />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!body.trim() || !author.trim()}
            className="rounded-md border border-[color:var(--glow-question)] px-2 py-1.5 font-[family-name:var(--font-display)] text-[11px] text-[color:var(--glow-question)] transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImportFile(file);
          event.currentTarget.value = '';
        }}
      />

      {message && (
        <p className="mt-2 truncate font-mono text-[10px] text-[color:var(--text-muted)]">
          {message}
        </p>
      )}

      {visibleAnnotations.length > 0 && (
        <div className="mt-3 space-y-2">
          {visibleAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              className="rounded-lg border border-[color:var(--border-subtle)] px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[9px] tracking-wider text-[color:var(--text-muted)] uppercase">
                  {annotation.nodeId ?? 'graph'} · {annotation.priority}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAnnotationStatus(
                      annotation.id,
                      annotation.status === 'resolved' ? 'open' : 'resolved'
                    )
                  }
                  className="shrink-0 font-mono text-[9px] tracking-wider text-[color:var(--glow-question)] uppercase"
                >
                  {annotation.status}
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-[color:var(--text-secondary)]">
                {annotation.body}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[9px] text-[color:var(--text-muted)]">
                  {annotation.author}
                </span>
                <button
                  type="button"
                  onClick={() => removeAnnotation(annotation.id)}
                  aria-label="Remove annotation"
                  className="rounded p-0.5 text-[color:var(--text-muted)] transition hover:text-[color:var(--glow-revision)]"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
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
