'use client';

import { useJvmStore } from '@/store/jvmStore';
import { Type } from 'lucide-react';

export function StringPoolPanel() {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();
  const pool = snapshot?.stringPool ?? [];

  return (
    <div className="panel flex flex-col overflow-hidden flex-shrink-0 bg-white" style={{ minWidth: 200 }}>
      <div className="panel-header">
        <Type size={13} style={{ color: 'var(--text-primary)' }} />
        <span className="panel-header-title">String Pool</span>
        {pool.length > 0 && (
          <span className="ml-auto text-[10px] text-[var(--text-secondary)]">{pool.length} entries</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {pool.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[var(--text-muted)]">No interned strings</span>
          </div>
        ) : (
          pool.map((str, i) => (
            <div key={i}
              className="flex items-center gap-2 px-2 py-1.5 rounded border border-[#bbf7d0]"
              style={{ background: '#f0fdf4' }}>
              <span className="text-[10px] font-bold text-[var(--text-secondary)]">#{i}</span>
              <span className="val-string text-[11px] font-mono truncate">"{str}"</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
