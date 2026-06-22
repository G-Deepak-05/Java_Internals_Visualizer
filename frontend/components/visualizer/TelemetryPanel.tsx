'use client';

import { useJvmStore } from '@/store/jvmStore';
import { BarChart3, Database, Activity } from 'lucide-react';

export function TelemetryPanel() {
  const { snapshots, currentStep } = useJvmStore();
  const currentSnapshot = snapshots[currentStep];
  const telemetry = currentSnapshot?.telemetry;

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Compile history for the line graph
  const history = snapshots.map((s, idx) => ({
    step: idx,
    heapSize: s.telemetry?.totalHeapSize ?? 0,
    allocRate: s.telemetry?.allocationRate ?? 0,
  }));

  const maxHeap = Math.max(...history.map((h) => h.heapSize), 1024);

  // SVG Chart Dimensions
  const width = 260;
  const height = 70;
  const padding = 5;

  // Generate path for the SVG line chart
  const points = history.map((h, i) => {
    const x = padding + (i * (width - padding * 2)) / Math.max(history.length - 1, 1);
    const y = height - padding - (h.heapSize * (height - padding * 2)) / maxHeap;
    return `${x},${y}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const fillD = points.length > 0 ? `${pathD} L ${padding + (points.length - 1) * (width - padding * 2) / Math.max(points.length - 1, 1)},${height - padding} L ${padding},${height - padding} Z` : '';

  // Get active step marker coordinate
  const currentX = padding + (currentStep * (width - padding * 2)) / Math.max(history.length - 1, 1);

  // Class counts for current step
  const classCounts = Object.entries(telemetry?.classCounts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="panel flex flex-col overflow-hidden bg-white" style={{ minWidth: 260 }}>
      <div className="panel-header">
        <Activity size={13} style={{ color: 'var(--text-primary)' }} />
        <span className="panel-header-title">JVM Telemetry</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Core Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-[var(--border)] rounded p-2 bg-[#fafaf9] flex flex-col gap-0.5">
            <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Total Heap Size</span>
            <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
              {formatBytes(telemetry?.totalHeapSize ?? 0)}
            </span>
          </div>
          <div className="border border-[var(--border)] rounded p-2 bg-[#fafaf9] flex flex-col gap-0.5">
            <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Cumulative Alloc</span>
            <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
              {formatBytes(telemetry?.allocationRate ?? 0)}
            </span>
          </div>
        </div>

        {/* History Graph */}
        <div className="border border-[var(--border)] rounded p-2 bg-white flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Heap Size Trend</span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono">Max: {formatBytes(maxHeap)}</span>
          </div>
          
          <div className="relative border border-stone-100 rounded overflow-hidden bg-stone-50/50 flex items-center justify-center">
            {history.length <= 1 ? (
              <div className="h-[70px] flex items-center justify-center">
                <span className="text-[10px] text-[var(--text-muted)]">Awaiting step history...</span>
              </div>
            ) : (
              <svg width={width} height={height} className="overflow-visible">
                {/* Area Fill */}
                <path d={fillD} fill="rgba(37, 99, 235, 0.04)" />
                {/* Line Path */}
                <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" />
                {/* Active Step Indicator */}
                <line
                  x1={currentX}
                  y1={0}
                  x2={currentX}
                  y2={height}
                  stroke="#eab308"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={currentX}
                  cy={height - padding - ((history[currentStep]?.heapSize ?? 0) * (height - padding * 2)) / maxHeap}
                  r="3.5"
                  fill="#eab308"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Object Class Distribution */}
        <div className="border border-[var(--border)] rounded p-2 bg-white flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 size={11} className="text-[var(--text-secondary)]" />
            <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Allocation Counts</span>
          </div>

          {classCounts.length === 0 ? (
            <span className="text-[10px] text-[var(--text-muted)] text-center py-2">No active allocations</span>
          ) : (
            <div className="space-y-1.5">
              {classCounts.map(([className, count]) => {
                const maxCount = Math.max(...classCounts.map(([, c]) => c));
                const pct = (count / maxCount) * 100;
                return (
                  <div key={className} className="flex flex-col gap-0.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[var(--text-primary)] truncate max-w-[150px]">{className}</span>
                      <span className="text-[var(--text-secondary)] font-bold">{count}</span>
                    </div>
                    <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
