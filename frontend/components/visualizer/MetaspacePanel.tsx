'use client';

import { useJvmStore } from '@/store/jvmStore';
import { Package } from 'lucide-react';

export function MetaspacePanel() {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();
  const classes = snapshot?.loadedClasses ?? [];

  const userClasses = classes.filter(
    (c) => !c.startsWith('java.') && !c.startsWith('sun.') && !c.startsWith('jdk.')
  );
  const systemClasses = classes.filter(
    (c) => c.startsWith('java.') || c.startsWith('sun.') || c.startsWith('jdk.')
  );

  return (
    <div className="panel flex flex-col overflow-hidden flex-shrink-0 bg-white" style={{ minWidth: 220 }}>
      <div className="panel-header">
        <Package size={13} style={{ color: 'var(--text-primary)' }} />
        <span className="panel-header-title">Metaspace</span>
        {classes.length > 0 && (
          <span className="ml-auto text-[10px] text-[var(--text-secondary)]">{classes.length} classes</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {classes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[var(--text-muted)]">No classes loaded</span>
          </div>
        ) : (
          <>
            {userClasses.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1 px-1">User Classes</div>
                {userClasses.map((cls) => (
                  <ClassEntry key={cls} name={cls} color="#ea580c" bg="#fff7ed" border="#fed7aa" />
                ))}
              </div>
            )}
            {systemClasses.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1 px-1">
                  System ({systemClasses.length})
                </div>
                {systemClasses.slice(0, 5).map((cls) => (
                  <ClassEntry key={cls} name={cls} color="#71717a" bg="#fafaf9" border="#e2e2dd" />
                ))}
                {systemClasses.length > 5 && (
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1">
                    +{systemClasses.length - 5} more...
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ClassEntry({ name, color, bg, border }: { name: string; color: string; bg: string; border: string }) {
  const simple = name.includes('.') ? name.split('.').pop()! : name;
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded border mb-0.5"
      style={{ background: bg, borderColor: border }}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[11px] font-mono truncate font-bold" style={{ color }}>{simple}</span>
    </div>
  );
}
