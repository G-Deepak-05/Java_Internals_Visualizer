'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJvmStore } from '@/store/jvmStore';
import {
  SkipBack, SkipForward, Play, Pause, ChevronFirst, ChevronLast
} from 'lucide-react';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

export function TimeTravelControls() {
  const {
    snapshots, currentStep, setCurrentStep,
    stepForward, stepBack,
    isPlaying, setIsPlaying,
    playbackSpeed, setPlaybackSpeed,
    executionComplete,
  } = useJvmStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = snapshots.length;
  const pct = total > 1 ? (currentStep / (total - 1)) * 100 : 0;

  // Playback interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isPlaying && total > 0) {
      const ms = 600 / playbackSpeed;
      intervalRef.current = setInterval(() => {
        const { currentStep, snapshots } = useJvmStore.getState();
        if (currentStep >= snapshots.length - 1) {
          setIsPlaying(false);
        } else {
          stepForward();
        }
      }, ms);
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playbackSpeed, total, stepForward, setIsPlaying]);

  if (total === 0) return null;

  const snapshot = snapshots[currentStep];

  return (
    <motion.div
      className="flex-shrink-0 bg-white border-t border-[var(--border)]"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      {/* Scrubber */}
      <div className="px-4 pt-2.5">
        <div className="relative h-4 flex items-center group cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = x / rect.width;
            setCurrentStep(Math.round(ratio * (total - 1)));
          }}>
          {/* Track */}
          <div className="w-full h-1 rounded-full" style={{ background: '#e2e2dd' }}>
            {/* Fill */}
            <div className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${pct}%`,
                background: 'var(--accent-charcoal)',
              }} />
          </div>

          {/* Thumb */}
          <div className="absolute h-3.5 w-3.5 rounded-full border border-black shadow transition-all"
            style={{
              left: `calc(${pct}% - 7px)`,
              background: '#ffffff',
            }} />
        </div>
      </div>

      {/* Controls Row */}
      <div className="px-4 py-2.5 flex items-center gap-3">
        {/* Step Counter */}
        <div className="font-mono text-xs text-[var(--text-secondary)] w-28 flex-shrink-0">
          Step <span className="text-[var(--text-primary)] font-bold">{currentStep + 1}</span>
          {' / '}{total}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1 mx-auto">
          <button className="btn-icon text-black" onClick={() => setCurrentStep(0)} title="First step">
            <ChevronFirst size={14} />
          </button>
          <button className="btn-icon text-black" onClick={stepBack} title="Step back">
            <SkipBack size={14} />
          </button>

          <button
            className="btn-icon text-black"
            style={{
              background: isPlaying ? 'rgba(0,0,0,0.05)' : undefined,
              borderColor: isPlaying ? '#111111' : undefined,
              width: 32, height: 32,
            }}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={15} fill="#111111" /> : <Play size={15} fill="#111111" />}
          </button>

          <button className="btn-icon text-black" onClick={stepForward} title="Step forward">
            <SkipForward size={14} />
          </button>
          <button className="btn-icon text-black" onClick={() => setCurrentStep(total - 1)} title="Last step">
            <ChevronLast size={14} />
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Speed</span>
          <div className="flex items-center gap-0.5">
            {SPEED_OPTIONS.map((s) => (
              <button key={s}
                onClick={() => setPlaybackSpeed(s)}
                className="text-[10px] px-1.5 py-0.5 rounded transition-all font-mono"
                style={{
                  background: playbackSpeed === s ? 'var(--accent-charcoal)' : 'transparent',
                  color: playbackSpeed === s ? '#ffffff' : 'var(--text-secondary)',
                  border: `1px solid ${playbackSpeed === s ? 'var(--accent-charcoal)' : 'var(--border)'}`,
                }}>
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Current event type */}
        {snapshot?.eventType && (
          <div className="text-[10px] font-mono px-2 py-0.5 rounded flex-shrink-0 bg-[#fafaf9] border border-[var(--border)] text-[var(--text-secondary)]">
            {snapshot.eventType}
          </div>
        )}

        {/* Completion badge */}
        <AnimatePresence>
          {executionComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] px-2 py-0.5 rounded flex-shrink-0 font-bold uppercase tracking-wide bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a]">
              ✓ Complete
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
