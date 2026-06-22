'use client';

import { useState } from 'react';
import { useJvmStore } from '@/store/jvmStore';
import { Network, ChevronDown, ChevronRight, FileCode } from 'lucide-react';
import type { ClassLoaderNode } from '@/types/jvm';

export function ClassLoaderPanel() {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();
  const loaders = (snapshot?.classLoaders as unknown as ClassLoaderNode[]) ?? [];
  const [expandedLoader, setExpandedLoader] = useState<string | null>(null);

  // Group loaders by their parent relationships to construct a tree structure
  const rootLoaders = loaders.filter(
    (l) => !l.parentName || !loaders.some((p) => p.name === l.parentName)
  );

  // Render a single classloader node recursively
  const renderLoaderNode = (node: ClassLoaderNode, depth = 0) => {
    const children = loaders.filter((l) => l.parentName === node.name);
    const isExpanded = expandedLoader === node.name;
    const hasClasses = node.loadedClasses && node.loadedClasses.length > 0;

    // Clean classloader name for display
    const displayName = node.name.includes('$')
      ? node.name.substring(node.name.lastIndexOf('$') + 1)
      : node.name.substring(node.name.lastIndexOf('.') + 1);

    return (
      <div key={node.name} className="flex flex-col select-none" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        {/* Node Card */}
        <div className="flex flex-col border border-[var(--border)] rounded mb-1.5 overflow-hidden shadow-sm bg-white">
          <div
            onClick={() => hasClasses && setExpandedLoader(isExpanded ? null : node.name)}
            className={`flex items-center gap-2 p-2 transition-all ${
              hasClasses ? 'cursor-pointer hover:bg-stone-50' : ''
            }`}
            style={{
              borderLeft: `3px solid ${
                node.name === 'Bootstrap'
                  ? '#16a34a'
                  : node.name.includes('Platform')
                  ? '#d97706'
                  : '#2563eb'
              }`,
            }}
          >
            {hasClasses ? (
              isExpanded ? (
                <ChevronDown size={12} className="text-[var(--text-secondary)] flex-shrink-0" />
              ) : (
                <ChevronRight size={12} className="text-[var(--text-secondary)] flex-shrink-0" />
              )
            ) : (
              <div className="w-3" />
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[11px] font-bold text-[var(--text-primary)] truncate" title={node.name}>
                {displayName}
              </span>
              <span className="text-[9px] text-[var(--text-muted)] font-mono leading-none">
                {node.name.includes('@') ? node.name.substring(node.name.indexOf('@')) : 'Static'}
              </span>
            </div>
            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {node.loadedClasses?.length ?? 0} class{node.loadedClasses?.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Classes list inside loader */}
          {isExpanded && hasClasses && (
            <div className="border-t border-[var(--border)] bg-[#fafaf9] max-h-[160px] overflow-y-auto p-2 space-y-1">
              {node.loadedClasses.map((cls) => (
                <div key={cls} className="flex items-center gap-1.5 text-[9px] font-mono py-0.5 text-[var(--text-secondary)]">
                  <FileCode size={9} className="text-[var(--text-muted)]" />
                  <span className="truncate" title={cls}>
                    {cls}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recursive Children */}
        {children.length > 0 && (
          <div className="relative border-l border-dashed border-stone-200 pl-2 mt-0.5 ml-2">
            {children.map((child) => renderLoaderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="panel flex flex-col overflow-hidden bg-white" style={{ minWidth: 260 }}>
      <div className="panel-header">
        <Network size={13} style={{ color: 'var(--text-primary)' }} />
        <span className="panel-header-title">Class Loader Hierarchy</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-stone-50/30">
        {loaders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[var(--text-muted)]">No class loaders mapped</span>
          </div>
        ) : (
          <div className="space-y-1">
            {rootLoaders.map((root) => renderLoaderNode(root))}
          </div>
        )}
      </div>
    </div>
  );
}
