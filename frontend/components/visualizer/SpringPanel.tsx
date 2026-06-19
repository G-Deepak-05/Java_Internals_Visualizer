'use client';

import { useJvmStore } from '@/store/jvmStore';
import { Leaf, Layers, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export function SpringPanel() {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();
  const beans = snapshot?.springBeans ?? [];
  const [selectedBeanName, setSelectedBeanName] = useState<string | null>(null);

  return (
    <div className="panel flex flex-col overflow-hidden h-full bg-white flex-1" style={{ minWidth: 280 }}>
      <div className="panel-header" style={{ borderBottomColor: '#bbf7d0', background: '#f0fdf4' }}>
        <Leaf size={13} className="text-[#16a34a]" />
        <span className="panel-header-title text-[#15803d]">Spring DI Context</span>
        {beans.length > 0 && (
          <span className="ml-auto text-[10px] bg-[#dcfce7] text-[#16a34a] px-2 py-0.5 rounded-full font-bold border border-[#bbf7d0]">
            {beans.length} Bean{beans.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {beans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#f0fdf4] border border-[#bbf7d0]">
              <Leaf size={22} className="text-[#16a34a]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#15803d]">No Spring Beans Detected</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1 max-w-[200px] mx-auto">
                Declare annotations like <code className="bg-[#fafaf9] px-1 py-0.5 rounded border font-mono">@Component</code> and <code className="bg-[#fafaf9] px-1 py-0.5 rounded border font-mono">@Autowired</code> in your code to visualize dependency injection context!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beans.map((bean) => {
              const isSelected = selectedBeanName === bean.name;
              const hasSelectedDependency = beans.find(b => b.name === selectedBeanName)?.dependencies.includes(bean.name);
              
              let borderStyle = '1px solid var(--border)';
              let bgStyle = '#ffffff';
              if (isSelected) {
                borderStyle = '1.5px solid #16a34a';
                bgStyle = '#f0fdf4';
              } else if (hasSelectedDependency) {
                borderStyle = '1.5px solid #3b82f6';
                bgStyle = '#eff6ff';
              }

              return (
                <div
                  key={bean.name}
                  className="rounded-xl p-3.5 transition-all cursor-pointer relative shadow-sm hover:shadow"
                  style={{ border: borderStyle, background: bgStyle }}
                  onClick={() => setSelectedBeanName(selectedBeanName === bean.name ? null : bean.name)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 rounded bg-[#dcfce7] text-[#16a34a] flex-shrink-0">
                      <Layers size={12} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold font-mono text-[var(--text-primary)]">{bean.name}</div>
                      <div className="text-[8px] text-[var(--text-muted)] font-mono truncate max-w-[180px]" title={bean.className}>
                        {bean.className}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <div className="text-[8px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                      Autowired Injections
                    </div>
                    {bean.dependencies.length === 0 ? (
                      <div className="text-[9px] text-[var(--text-muted)] italic">
                        No dependencies
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {bean.dependencies.map((dep) => (
                          <div
                            key={dep}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-[#15803d]"
                          >
                            <ArrowRight size={10} className="text-[#16a34a] flex-shrink-0" />
                            <span className="underline decoration-dotted cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBeanName(dep);
                                  }}>
                              {dep}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
