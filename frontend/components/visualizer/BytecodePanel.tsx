'use client';

import { useJvmStore } from '@/store/jvmStore';
import { Code2 } from 'lucide-react';
import type { BytecodeInstruction } from '@/types/jvm';

export function BytecodePanel() {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();
  const bytecodes = (snapshot?.methodBytecode as unknown as BytecodeInstruction[]) ?? [];
  const current = snapshot?.currentBytecode;
  const activeLine = snapshot?.lineNumber;

  const handleInstructionClick = (inst: BytecodeInstruction) => {
    if (inst.lineNumber > 0) {
      window.dispatchEvent(
        new CustomEvent('editor-jump-to-line', { detail: { line: inst.lineNumber } })
      );
    }
  };

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
            {bytecodes.map((inst, i) => {
              const isExact = inst.instruction === current;
              const isLineMatch = inst.lineNumber === activeLine && activeLine !== undefined;
              
              let bg = 'transparent';
              let borderLeft = '2px solid transparent';
              let textColor = 'var(--text-secondary)';
              
              if (isExact) {
                bg = 'rgba(234, 179, 8, 0.15)';
                borderLeft = '2px solid #eab308';
                textColor = '#ca8a04';
              } else if (isLineMatch) {
                bg = 'rgba(234, 179, 8, 0.05)';
                borderLeft = '2px dashed #facc15';
                textColor = 'var(--text-primary)';
              }

              return (
                <div
                  key={i}
                  onClick={() => handleInstructionClick(inst)}
                  className="px-2 py-1 rounded flex items-center justify-between gap-2 cursor-pointer transition-all hover:bg-stone-50"
                  style={{
                    background: bg,
                    borderLeft: borderLeft,
                  }}
                  title={inst.lineNumber > 0 ? `Click to jump to line ${inst.lineNumber}` : undefined}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[var(--text-muted)] w-5 text-right flex-shrink-0">{i}</span>
                    <span className="truncate" style={{ color: textColor }}>{inst.instruction}</span>
                  </div>
                  {inst.lineNumber > 0 && (
                    <span className="text-[9px] text-[var(--text-muted)] font-sans px-1 rounded bg-stone-100 flex-shrink-0">
                      L{inst.lineNumber}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
