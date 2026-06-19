'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background, Controls,
  type Node, type Edge,
  Position, MarkerType,
  ReactFlowProvider,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useJvmStore } from '@/store/jvmStore';
import type { HeapObject } from '@/types/jvm';
import { MemoryStick } from 'lucide-react';

// ── Custom Heap Object Node ───────────────────────────────────────────────

function HeapNode({ data }: { data: HeapObject & { highlighted: boolean; onHover: (id: string|null) => void } }) {
  const {
    id, className, fields = {}, isArray, arrayElements,
    isString, stringValue, generation, reachable, refCount,
    highlighted, onHover,
  } = data;

  const genColors: Record<string, { bg: string; border: string; label: string; text: string }> = {
    YOUNG:    { bg: '#eab3080c', border: '#eab30844', label: '#eab308', text: '#ca8a04' },
    SURVIVOR: { bg: '#2563eb0c', border: '#2563eb44', label: '#2563eb', text: '#2563eb' },
    OLD:      { bg: '#ea580c0c', border: '#ea580c44', label: '#ea580c', text: '#ea580c' },
  };
  const genColor = genColors[generation] ?? genColors.YOUNG;

  const borderColor = !reachable
    ? 'var(--accent-red)'
    : highlighted
    ? 'var(--accent-primary)'
    : 'var(--accent-charcoal)';

  const bgColor = !reachable
    ? '#fef2f2'
    : highlighted
    ? '#eab30808'
    : '#ffffff';

  return (
    <div
      className="heap-node"
      style={{
        borderColor,
        background: bgColor,
        minWidth: 140,
        maxWidth: 200,
        borderWidth: highlighted ? '2px' : '1.5px'
      }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Input handle for incoming references */}
      <Handle type="target" position={Position.Left}
        style={{ background: 'var(--accent-charcoal)', border: 'none', width: 6, height: 6 }} />

      {/* Header */}
      <div className="heap-node-header flex flex-col gap-1 select-none">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[11px] text-[var(--text-primary)]">{className}</span>
          <span className="text-[9px] text-[var(--text-muted)] font-mono">#{id.replace('obj_', '')}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider"
            style={{ background: genColor.bg, color: genColor.text, borderColor: genColor.border }}>
            {generation.toLowerCase()}
          </span>
          {refCount > 0 && (
            <span className="text-[9px] text-[var(--text-secondary)] font-mono">{refCount} ref{refCount !== 1 ? 's' : ''}</span>
          )}
          {!reachable && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] uppercase tracking-wider">
              unreachable
            </span>
          )}
        </div>
      </div>

      {/* String value */}
      {isString && stringValue !== undefined && (
        <div className="heap-node-field">
          <span className="text-[var(--text-secondary)]">value</span>
          <span className="val-string ml-2 truncate max-w-[100px]">"{stringValue}"</span>
        </div>
      )}

      {/* Array elements */}
      {isArray && arrayElements && (
        <div className="heap-node-field flex-wrap gap-1">
          {(arrayElements as unknown[]).slice(0, 8).map((el, i) => (
            <span key={i} className="val-number text-[9px] mr-1">[{i}]={String(el)}</span>
          ))}
          {arrayElements.length > 8 && (
            <span className="text-[9px] text-[var(--text-muted)]">+{arrayElements.length - 8} more</span>
          )}
        </div>
      )}

      {/* Fields */}
      {!isString && !isArray && Object.entries(fields).slice(0, 8).map(([k, v]) => (
        <div key={k} className="heap-node-field">
          <span className="text-[var(--text-secondary)] truncate mr-2">{k}</span>
          <span className={
            v === null ? 'val-null' :
            typeof v === 'string' && (v as string).startsWith('obj_') ? 'val-ref' :
            typeof v === 'number' ? 'val-number' :
            typeof v === 'boolean' ? 'val-boolean' : 'val-string'
          }>
            {v === null ? 'null' : String(v)}
          </span>
        </div>
      ))}

      {/* Output handle for outgoing references */}
      <Handle type="source" position={Position.Right}
        style={{ background: 'var(--accent-charcoal)', border: 'none', width: 6, height: 6 }} />
    </div>
  );
}

const nodeTypes = { heapObject: HeapNode };

// ── HeapCanvas ────────────────────────────────────────────────────────────────

function HeapCanvas() {
  const { currentSnapshot, highlightedObjectId, setHighlightedObjectId } = useJvmStore();
  const snapshot = currentSnapshot();
  const heap = snapshot?.heap ?? {};

  // Build nodes and edges from heap state
  const { nodes, edges } = useMemo(() => {
    const objs = Object.values(heap);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const COLS = 3;
    const X_GAP = 260, Y_GAP = 200;

    objs.forEach((obj, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);

      nodes.push({
        id: obj.id,
        type: 'heapObject',
        position: { x: col * X_GAP + 20, y: row * Y_GAP + 20 },
        data: {
          ...obj,
          highlighted: obj.id === highlightedObjectId,
          onHover: setHighlightedObjectId,
        },
      });

      // Create edges for reference fields
      Object.entries(obj.fields ?? {}).forEach(([fieldName, value]) => {
        if (typeof value === 'string' && value.startsWith('obj_') && heap[value]) {
          edges.push({
            id: `${obj.id}-${fieldName}-${value}`,
            source: obj.id,
            target: value,
            label: fieldName,
            labelStyle: { fontSize: 9, fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'var(--accent-charcoal)',
              width: 14,
              height: 14,
            },
            style: { stroke: 'var(--accent-charcoal)', strokeWidth: 1.5 },
            animated: obj.id === highlightedObjectId || value === highlightedObjectId,
          });
        }
      });
    });

    return { nodes, edges };
  }, [heap, highlightedObjectId, setHighlightedObjectId]);

  const isEmpty = nodes.length === 0;

  return (
    <div className="panel flex flex-col overflow-hidden h-full flex-1">
      <div className="panel-header">
        <MemoryStick size={13} style={{ color: 'var(--text-primary)' }} />
        <span className="panel-header-title">Heap Canvas</span>
        {!isEmpty && (
          <div className="ml-auto flex items-center gap-1.5 select-none">
            {(['YOUNG', 'SURVIVOR', 'OLD'] as const).map((gen) => {
              const colors: Record<string, { text: string; bg: string; border: string }> = {
                YOUNG: { text: '#ca8a04', bg: '#eab3080c', border: '#eab30833' },
                SURVIVOR: { text: '#2563eb', bg: '#2563eb0c', border: '#2563eb33' },
                OLD: { text: '#ea580c', bg: '#ea580c0c', border: '#ea580c33' }
              };
              const count = Object.values(heap).filter(o => o.generation === gen).length;
              if (count === 0) return null;
              return (
                <span key={gen} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider"
                  style={{ background: colors[gen].bg, color: colors[gen].text, borderColor: colors[gen].border }}>
                  {gen.toLowerCase()} {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative bg-white">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded flex items-center justify-center bg-[#f5f5f3] border border-[var(--border)]">
              <MemoryStick size={22} className="text-[var(--text-secondary)]" />
            </div>
            <p className="text-xs text-[var(--text-secondary)]">No objects on the heap yet</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ animated: false }}
            nodesDraggable={true}
            elementsSelectable={true}
            style={{ background: '#ffffff' }}
          >
            <Background color="var(--border)" gap={20} size={1} />
            <Controls />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

export function HeapPanel() {
  return (
    <ReactFlowProvider>
      <HeapCanvas />
    </ReactFlowProvider>
  );
}
