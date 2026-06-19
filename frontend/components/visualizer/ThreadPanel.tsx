'use client';

import { useJvmStore } from '@/store/jvmStore';
import type { ThreadStatus, ThreadState } from '@/types/jvm';
import { Activity, Lock, AlertTriangle } from 'lucide-react';

const STATE_COLORS: Record<ThreadStatus, { bg: string; border: string; dot: string }> = {
  RUNNABLE:      { bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
  BLOCKED:       { bg: '#fef2f2', border: '#fecaca', dot: '#dc2626' },
  WAITING:       { bg: '#fff7ed', border: '#fed7aa', dot: '#ea580c' },
  TIMED_WAITING: { bg: '#fef9c3', border: '#fef08a', dot: '#ca8a04' },
  NEW:           { bg: '#eff6ff', border: '#bfdbfe', dot: '#2563eb' },
  TERMINATED:    { bg: '#fafaf9', border: '#e2e2dd', dot: '#888883' },
};

export function ThreadPanel() {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();
  const threads = Object.values(snapshot?.threads ?? {}) as ThreadState[];

  const renderThreadCard = (thread: ThreadState, isChild: boolean = false) => {
    let colors = STATE_COLORS[thread.state as ThreadStatus] ?? STATE_COLORS.NEW;
    const isDeadlocked = thread.deadlocked;

    const style: React.CSSProperties = isDeadlocked
      ? { background: '#fff1f2', border: '1px solid #fda4af' }
      : { background: colors.bg, border: `1px solid ${colors.border}` };

    return (
      <div key={thread.id}
        className={`rounded-lg p-2.5 transition-all relative ${isChild ? 'ml-4 pl-3 border-l-2 border-dashed border-gray-300' : ''}`}
        style={style}>
        {isChild && (
          <div className="absolute top-1/2 left-0 w-2.5 h-[1px] bg-gray-300 -translate-y-1/2" />
        )}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: isDeadlocked ? '#e11d48' : colors.dot }} />
          <span className="text-xs font-semibold font-mono truncate">{thread.name}</span>
          {isDeadlocked && (
            <span className="text-[8px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-bold uppercase flex items-center gap-0.5 ml-auto animate-pulse">
              <AlertTriangle size={8} /> Deadlocked
            </span>
          )}
          {thread.virtual && !isDeadlocked && (
            <span className="text-[9px] px-1 py-0.5 rounded ml-auto flex-shrink-0 border border-[#bfdbfe]"
              style={{ background: '#eff6ff', color: '#2563eb' }}>
              virtual
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
          <span style={{ color: isDeadlocked ? '#e11d48' : colors.dot }}>{thread.state}</span>
          <span>depth: {thread.stackDepth}</span>
        </div>
        {thread.virtual && thread.carrierThread && (
          <div className="text-[9px] text-[#44445a] mt-1">
            on: {thread.carrierThread}
          </div>
        )}
        {thread.holdsLocks && thread.ownsMonitor && (
          <div className="text-[9px] text-[#dc2626] mt-1.5 flex items-center gap-1 font-mono">
            <Lock size={10} className="flex-shrink-0" />
            <span>owns: {thread.ownsMonitor.replace('obj_', '#')}</span>
          </div>
        )}
        {thread.waitingForMonitor && (
          <div className="text-[9px] text-[#ea580c] mt-1.5 flex items-center gap-1 font-mono animate-pulse">
            <Lock size={10} className="flex-shrink-0" />
            <span>waiting on: {thread.waitingForMonitor.replace('obj_', '#')}</span>
          </div>
        )}
      </div>
    );
  };

  const threadMap = new Map(threads.map(t => [t.name, t]));
  const rootThreads = threads.filter(t => !t.parentThreadName || !threadMap.has(t.parentThreadName));
  const childThreadsMap = new Map<string, ThreadState[]>();
  threads.forEach(t => {
    if (t.parentThreadName && threadMap.has(t.parentThreadName)) {
      const list = childThreadsMap.get(t.parentThreadName) ?? [];
      list.push(t);
      childThreadsMap.set(t.parentThreadName, list);
    }
  });

  return (
    <div className="panel flex flex-col overflow-hidden flex-shrink-0 bg-white" style={{ minWidth: 220 }}>
      <div className="panel-header">
        <Activity size={13} style={{ color: 'var(--text-primary)' }} />
        <span className="panel-header-title">Threads</span>
        {threads.length > 0 && (
          <span className="ml-auto text-[10px] text-[#44445a]">{threads.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {threads.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[#44445a]">No threads</span>
          </div>
        ) : (
          rootThreads.map((thread) => {
            const children = childThreadsMap.get(thread.name) ?? [];
            return (
              <div key={thread.id} className="space-y-1.5">
                {renderThreadCard(thread, false)}
                {children.map(child => renderThreadCard(child, true))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
