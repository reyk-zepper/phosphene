import { useCallback, useEffect, useMemo } from 'react';
import { useSessionStore } from '@/core/store/sessionStore';
import type { ReasoningNode } from '@/core/parser/types';

interface NavEntry {
  parent: string | null;
  children: string[];
  siblings: string[];
  siblingIndex: number;
}

function buildNavMap(root: ReasoningNode): Map<string, NavEntry> {
  const map = new Map<string, NavEntry>();

  function walk(node: ReasoningNode, parentId: string | null, siblings: string[], sibIdx: number) {
    const childIds = node.children.map((c) => c.id);
    map.set(node.id, {
      parent: parentId,
      children: childIds,
      siblings,
      siblingIndex: sibIdx,
    });
    for (let i = 0; i < node.children.length; i++) {
      walk(node.children[i], node.id, childIds, i);
    }
  }

  walk(root, null, [root.id], 0);
  return map;
}

function allNodeIds(root: ReasoningNode): string[] {
  const ids: string[] = [];
  const walk = (n: ReasoningNode) => {
    ids.push(n.id);
    n.children.forEach(walk);
  };
  walk(root);
  return ids;
}

export function useGraphNavigation() {
  const graph = useSessionStore((s) => s.currentGraph);
  const selectedNodeId = useSessionStore((s) => s.selectedNodeId);
  const selectNode = useSessionStore((s) => s.selectNode);

  const navMap = useMemo(
    () => (graph ? buildNavMap(graph.rootNode) : null),
    [graph]
  );

  const nodeIds = useMemo(
    () => (graph ? allNodeIds(graph.rootNode) : []),
    [graph]
  );

  const navigate = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!navMap || nodeIds.length === 0) return;

      if (!selectedNodeId) {
        selectNode(nodeIds[0]);
        return;
      }

      const entry = navMap.get(selectedNodeId);
      if (!entry) return;

      switch (direction) {
        case 'up': {
          if (entry.siblingIndex > 0) {
            selectNode(entry.siblings[entry.siblingIndex - 1]);
          }
          break;
        }
        case 'down': {
          if (entry.siblingIndex < entry.siblings.length - 1) {
            selectNode(entry.siblings[entry.siblingIndex + 1]);
          }
          break;
        }
        case 'left': {
          if (entry.parent) selectNode(entry.parent);
          break;
        }
        case 'right': {
          if (entry.children.length > 0) selectNode(entry.children[0]);
          break;
        }
      }
    },
    [navMap, nodeIds, selectedNodeId, selectNode]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (isInput) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigate('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate('right');
          break;
        case 'Enter':
          if (!selectedNodeId && nodeIds.length > 0) {
            selectNode(nodeIds[0]);
          }
          break;
        case 'Escape':
          selectNode(null);
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, selectedNodeId, selectNode, nodeIds]);
}
