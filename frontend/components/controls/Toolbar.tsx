'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useJvmStore } from '@/store/jvmStore';
import { PRESET_PROGRAMS } from '@/lib/presets';
import {
  Play, Square, Code2, Layers, MemoryStick, Activity,
  FileCode, Type, Package, ChevronDown, RotateCcw, Terminal, Zap,
  Leaf, Sparkles, Network, LineChart
} from 'lucide-react';
import type { PanelVisibility } from '@/types/jvm';

interface ToolbarProps {
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
  isComplete: boolean;
  code: string;
  onCodeChange: (code: string) => void;
  mainClass: string;
  onMainClassChange: (cls: string) => void;
}

const PANEL_BUTTONS: Array<{ id: keyof PanelVisibility; icon: React.ElementType; label: string; color: string }> = [
  { id: 'stack',       icon: Layers,      label: 'Stack',       color: '#111111' },
  { id: 'heap',        icon: MemoryStick, label: 'Heap',        color: '#ca8a04' },
  { id: 'threads',     icon: Activity,    label: 'Threads',     color: '#dc2626' },
  { id: 'spring',      icon: Leaf,        label: 'Spring DI',   color: '#16a34a' },
  { id: 'bytecode',    icon: Code2,       label: 'Bytecode',    color: '#2563eb' },
  { id: 'stringpool',  icon: Type,        label: 'Strings',     color: '#0d9488' },
  { id: 'metaspace',   icon: Package,     label: 'Metaspace',   color: '#ea580c' },
  { id: 'classloader', icon: Network,     label: 'ClassLoader', color: '#0284c7' },
  { id: 'telemetry',   icon: LineChart,   label: 'Telemetry',   color: '#e11d48' },
  { id: 'ai',          icon: Sparkles,    label: 'AI Coach',    color: '#7c3aed' },
  { id: 'console',     icon: Terminal,    label: 'Console',     color: '#71717a' },
];

export function Toolbar({
  onRun, onStop, isRunning, isComplete,
  code, onCodeChange,
  mainClass, onMainClassChange,
}: ToolbarProps) {
  const { panels, togglePanel, clearSnapshots, snapshots, currentStep } = useJvmStore();
  const snapshot = snapshots[currentStep];
  const [presetOpen, setPresetOpen] = useState(false);
  const [mainClassInput, setMainClassInput] = useState(mainClass);

  const handlePresetSelect = (preset: typeof PRESET_PROGRAMS[0]) => {
    onCodeChange(preset.code);
    onMainClassChange(preset.mainClass);
    setMainClassInput(preset.mainClass);
    clearSnapshots();
    setPresetOpen(false);
  };

  const handleReset = () => {
    clearSnapshots();
  };

  return (
    <div className="bg-white flex-shrink-0 border-b border-[var(--border)]"
      style={{ height: 52 }}>
      <div className="h-full flex items-center px-4 gap-3">
        {}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 mr-2">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-black">
            <Code2 size={12} color="white" strokeWidth={2.5} />
          </div>
          <span className="text-xs font-black tracking-wider uppercase hidden sm:block text-[#111111]">
            JIV
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#e2e2dd] bg-[#fafaf9] text-[#71717a] hidden sm:inline-block">
            BETA
          </span>
        </Link>

        {}
        <div className="w-px h-5 bg-[var(--border)] flex-shrink-0" />

        {}
        <div className="relative">
          <button
            className="btn btn-ghost text-xs flex items-center gap-1.5"
            onClick={() => setPresetOpen(!presetOpen)}>
            <FileCode size={13} />
            <span className="hidden sm:block">Examples</span>
            <ChevronDown size={11}
              style={{
                transform: presetOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }} />
          </button>

          <AnimatePresence>
            {presetOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPresetOpen(false)} />
                <motion.div
                  className="absolute top-full left-0 mt-1 z-50 bg-white border border-[var(--border)] rounded-md overflow-hidden shadow-lg"
                  style={{ width: 280, maxHeight: 400, overflowY: 'auto' }}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}>
                  {(['Recursion', 'OOP', 'Collections', 'Strings', 'Concurrency', 'Spring', 'GC'] as const).map((cat) => {
                    const items = PRESET_PROGRAMS.filter((p) => p.category === cat);
                    if (!items.length) return null;
                    return (
                      <div key={cat} className="border-b last:border-0 border-[var(--border)]">
                        <div className="px-3 py-1.5 text-[9px] font-bold uppercase text-[var(--text-muted)]
                          tracking-wider bg-[#fafaf9]">
                          {cat}
                        </div>
                        {items.map((p) => (
                          <button key={p.id}
                            className="w-full text-left px-3 py-2 hover:bg-[var(--bg-base)] transition-colors border-t border-[var(--border)] first:border-t-0"
                            onClick={() => handlePresetSelect(p)}>
                            <div className="text-xs font-bold text-[var(--text-primary)]">{p.title}</div>
                            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-snug">{p.description}</div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {}
        <input
          type="text"
          value={mainClassInput}
          onChange={(e) => {
            setMainClassInput(e.target.value);
            onMainClassChange(e.target.value);
          }}
          placeholder="Main class"
          className="hidden md:block text-xs font-mono px-2.5 py-1.5 rounded border border-[var(--border)] w-28 bg-white text-black outline-none"
        />

        {}
        <div className="flex items-center gap-1 ml-1">
          {PANEL_BUTTONS.map(({ id, icon: Icon, label, color }) => (
            <button
              key={id}
              title={label}
              className={`btn-icon ${panels[id] ? 'active' : ''}`}
              style={panels[id] ? { borderColor: color, color, background: `${color}0d` } : {}}
              onClick={() => togglePanel(id)}>
              <Icon size={13} />
            </button>
          ))}
        </div>

        {}
        <div className="flex-1" />

        {/* JIT Compiler Status */}
        {snapshot?.jitCompilerName && (
          <div className="text-[10px] px-2 py-0.5 rounded border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb] font-mono hidden md:flex items-center gap-1"
            title={`JIT Compiler: ${snapshot.jitCompilerName}`}>
            <Zap size={11} className="text-[#2563eb]" />
            <span>JIT: {snapshot.totalJitTimeMs}ms</span>
          </div>
        )}

        {/* Snapshot Count */}
        {snapshots.length > 0 && (
          <div className="text-xs text-[var(--text-secondary)] hidden sm:block font-mono">
            {snapshots.length} snapshots
          </div>
        )}

        {}
        {snapshots.length > 0 && (
          <button className="btn-icon" onClick={handleReset} title="Reset">
            <RotateCcw size={13} />
          </button>
        )}

        {}
        {isRunning && (
          <button
            id="stop-button"
            onClick={onStop}
            className="btn text-xs flex-shrink-0 flex items-center gap-1.5 bg-[#fef2f2] border-[#fecaca] text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
            style={{
              minWidth: 80,
              cursor: 'pointer'
            }}>
            <Square size={10} fill="#dc2626" strokeWidth={0} />
            Stop
          </button>
        )}

        {}
        <button
          id="run-button"
          onClick={onRun}
          disabled={isRunning}
          className="btn btn-primary text-xs flex-shrink-0"
          style={{ minWidth: 88 }}>
          {isRunning ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 12, height: 12,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                }} />
              Running...
            </>
          ) : (
            <>
              <Play size={13} strokeWidth={2.5} />
              Run
            </>
          )}
        </button>
      </div>
    </div>
  );
}
