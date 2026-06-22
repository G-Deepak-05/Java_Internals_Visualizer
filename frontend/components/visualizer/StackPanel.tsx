'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useJvmStore } from '@/store/jvmStore';
import type { StackFrame } from '@/types/jvm';
import { Layers } from 'lucide-react';

const DEPTH_COLORS = [
  { borderLeft: '#111111', badgeBg: '#11111115', text: '#111111' },
  { borderLeft: '#eab308', badgeBg: '#eab3081e', text: '#ca8a04' },
  { borderLeft: '#2563eb', badgeBg: '#2563eb15', text: '#2563eb' },
  { borderLeft: '#16a34a', badgeBg: '#16a34a15', text: '#16a34a' },
  { borderLeft: '#ea580c', badgeBg: '#ea580c15', text: '#ea580c' },
];

function getDepthColor(index: number) {
  return DEPTH_COLORS[index % DEPTH_COLORS.length];
}

function ValueDisplay({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="val-null">null</span>;
  }
  if (typeof value === 'string') {
    if (value.startsWith('obj_')) {
      return <span className="val-ref">{value}</span>;
    }
    return <span className="val-string">"{value}"</span>;
  }
  if (typeof value === 'number') return <span className="val-number">{String(value)}</span>;
  if (typeof value === 'boolean') return <span className="val-boolean">{String(value)}</span>;
  return <span>{String(value)}</span>;
}

function FrameCard({ frame, depth }: { frame: StackFrame; depth: number }) {
  const isFaulted = frame.faulted;
  const color = getDepthColor(depth);
  const locals = Object.entries(frame.locals ?? {});
  const hasLocals = locals.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="stack-frame"
      style={{
        borderLeft: isFaulted ? `4px solid #ef4444` : `4px solid ${color.borderLeft}`,
        boxShadow: isFaulted
          ? '0 4px 12px rgba(239, 68, 68, 0.08)'
          : frame.active
          ? `0 4px 12px rgba(0,0,0,0.05)`
          : 'none',
        borderColor: isFaulted
          ? '#fecaca'
          : frame.active
          ? 'var(--border-bright)'
          : 'var(--border)',
      }}
    >
      <div
        className="stack-frame-header flex items-center justify-between"
        style={{
          background: isFaulted ? '#fff5f5' : frame.active ? '#ffffff' : '#fafaf9',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {frame.active && !isFaulted && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: color.borderLeft }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {isFaulted && (
            <motion.div
              className="w-2 h-2 rounded-full flex-shrink-0 bg-[#ef4444]"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
          <span className="truncate font-bold text-xs text-[var(--text-primary)]">
            {frame.className}.{frame.methodName}()
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isFaulted ? (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-red-100 text-red-600 border border-red-200">
              Faulted
            </span>
          ) : frame.recursionDepth > 0 ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: color.badgeBg, color: color.text }}>
              depth {frame.recursionDepth}
            </span>
          ) : null}
          <span className="text-[10px] font-mono text-[var(--text-secondary)] font-bold">line {frame.lineNumber}</span>
        </div>
      </div>

      {isFaulted && frame.exceptionMessage && (
        <div className="stack-frame-body border-t border-[#fecaca] bg-[#fff5f5] p-2 flex flex-col gap-0.5">
          <span className="text-[#dc2626] font-bold text-[8px] uppercase tracking-wider font-mono">⚠️ Exception Propagating</span>
          <span className="text-[11px] font-mono text-red-700">{frame.exceptionMessage}</span>
        </div>
      )}

      {hasLocals && !isFaulted && (
        <div className="stack-frame-body p-2 border-t border-[var(--border)] bg-white">
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
            {locals.map(([name, value]) => (
              <div key={name} className="flex items-center justify-between border border-[var(--border)] rounded px-2 py-1.5 bg-[#fafaf9]">
                <span className="text-[var(--text-secondary)] font-bold">{name}</span>
                <ValueDisplay value={value} />
              </div>
            ))}
          </div>
        </div>
      )}

      {frame.returnValue !== undefined && frame.returnValue !== null && !isFaulted && (
        <div className="stack-frame-body border-t border-[var(--border)] bg-[#f0fdf4] p-2 flex items-center justify-between">
          <span className="text-[#16a34a] font-bold text-[10px] uppercase tracking-wider font-mono">return →</span>
          <ValueDisplay value={frame.returnValue} />
        </div>
      )}
    </motion.div>
  );
}

export function StackPanel() {
  const { currentSnapshot, activeThread } = useJvmStore();
  const snapshot = currentSnapshot();
  const frames = snapshot?.stacks?.[activeThread] ?? [];

  const isEmpty = frames.length === 0;

  return (
    <div className="panel flex flex-col overflow-hidden h-full flex-1">
      {}
      <div className="panel-header">
        <Layers size={13} style={{ color: 'var(--text-primary)' }} />
        <span className="panel-header-title">Call Stack</span>
        {!isEmpty && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded border border-[var(--border)] bg-white font-bold text-[var(--text-primary)]">
            {frames.length} frame{frames.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {}
      {snapshot && Object.keys(snapshot.stacks ?? {}).length > 1 && (
        <ThreadSelector threads={Object.keys(snapshot.stacks)} />
      )}

      {}
      {!isEmpty && (
        <div className="px-3 py-1.5 flex items-center gap-1 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: '#fafaf9' }}>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">TOP (active)</div>
          <div className="flex-1 border-t border-dashed border-[var(--border)] mx-2" />
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">BOTTOM</div>
        </div>
      )}

      {}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="sync">
            {frames.map((frame, i) => (
              <FrameCard
                key={`${frame.className}-${frame.methodName}-${frame.frameIndex}`}
                frame={frame}
                depth={i}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function ThreadSelector({ threads }: { threads: string[] }) {
  const { activeThread, setActiveThread } = useJvmStore();
  return (
    <div className="flex gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto bg-[#fafaf9]"
      style={{ borderBottom: '1px solid var(--border)' }}>
      {threads.map((t) => (
        <button key={t}
          onClick={() => setActiveThread(t)}
          className="text-[10px] px-2 py-1 rounded flex-shrink-0 transition-all font-mono border"
          style={{
            background: activeThread === t ? 'var(--accent-charcoal)' : '#ffffff',
            color: activeThread === t ? '#ffffff' : 'var(--text-secondary)',
            borderColor: activeThread === t ? 'var(--accent-charcoal)' : 'var(--border)',
          }}>
          {t}
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
      <div className="w-12 h-12 rounded flex items-center justify-center bg-[#f5f5f3] border border-[var(--border)]">
        <Layers size={22} className="text-[var(--text-secondary)]" />
      </div>
      <p className="text-xs text-[var(--text-secondary)] max-w-[160px] leading-relaxed">
        Run a program to see the call stack
      </p>
    </div>
  );
}
