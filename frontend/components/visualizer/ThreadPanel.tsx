'use client';

import { useJvmStore } from '@/store/jvmStore';
import type { ThreadStatus } from '@/types/jvm';
import { Activity, Lock } from 'lucide-react';

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
  const threads = Object.values(snapshot?.threads ?? {});

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
          threads.map((thread) => {
            const colors = STATE_COLORS[thread.state as ThreadStatus] ?? STATE_COLORS.NEW;
            return (
              <div key={thread.id}
                className="rounded-lg p-2.5 transition-all"
                style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: colors.dot }} />
                  <span className="text-xs font-semibold font-mono truncate">{thread.name}</span>
                  {thread.virtual && (
                    <span className="text-[9px] px-1 py-0.5 rounded ml-auto flex-shrink-0 border border-[#bfdbfe]"
                      style={{ background: '#eff6ff', color: '#2563eb' }}>
                      virtual
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                  <span style={{ color: colors.dot }}>{thread.state}</span>
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
          })
        )}
      </div>
    </div>
  );
}
