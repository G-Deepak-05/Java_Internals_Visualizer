'use client';

import { useJvmStore } from '@/store/jvmStore';
import { Code2 } from 'lucide-react';

export function BytecodePanel() {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();
  const bytecodes = snapshot?.methodBytecode ?? [];
  const current = snapshot?.currentBytecode;

  return (
    <div className="panel flex flex-col overflow-hidden flex-shrink-0 bg-white" style={{ minWidth: 240 }}>
      <div className="panel-header">
        <Code2 size={13} style={{ color: 'var(--text-primary)' }} />
        <span className="panel-header-title">Bytecode</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {bytecodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[var(--text-muted)]">No bytecode</span>
          </div>
        ) : (
          <div className="font-mono text-[11px] space-y-0.5">
            {bytecodes.map((instruction, i) => {
              const isActive = instruction === current;
              return (
                <div key={i}
                  className="px-2 py-1 rounded flex items-center gap-2 transition-all"
                  style={{
                    background: isActive ? 'rgba(234, 179, 8, 0.12)' : 'transparent',
                    borderLeft: isActive ? '2px solid #eab308' : '2px solid transparent',
                  }}>
                  <span className="text-[var(--text-muted)] w-5 text-right flex-shrink-0">{i}</span>
                  <span style={{ color: isActive ? '#ca8a04' : 'var(--text-secondary)' }}>{instruction}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
