'use client';

import { useEffect, useRef } from 'react';
import { useJvmStore } from '@/store/jvmStore';
import { Terminal } from 'lucide-react';

export function ConsolePanel() {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();
  const stdout = snapshot?.stdout ?? '';
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [stdout]);

  return (
    <div className="panel flex flex-col overflow-hidden h-full flex-1 min-w-[200px]">
      {}
      <div className="panel-header flex-shrink-0">
        <Terminal size={13} style={{ color: 'var(--accent-primary-hover)' }} />
        <span className="panel-header-title">Program Console</span>
      </div>

      {}
      <div
        ref={containerRef}
        className="flex-1 bg-[#ffffff] p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-[#111111] border-t border-[var(--border)] min-h-0"
      >
        {stdout ? (
          <pre className="whitespace-pre-wrap break-all">{stdout}</pre>
        ) : (
          <div className="flex items-center justify-center h-full text-[#888883] italic select-none">
            No console output at this step.
          </div>
        )}
      </div>
    </div>
  );
}
