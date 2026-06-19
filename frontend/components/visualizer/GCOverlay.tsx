'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useJvmStore } from '@/store/jvmStore';

export function GCOverlay() {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();
  const gcEvents = snapshot?.gcEvents ?? [];
  const hasGcEvent = gcEvents.length > 0;

  return (
    <AnimatePresence>
      {hasGcEvent && gcEvents.map((event, i) => (
        <motion.div
          key={`gc-${snapshot?.stepIndex}-${i}`}
          className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {}
          <div className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,77,109,0.08) 100%)',
            }} />

          {}
          <motion.div
            className="relative px-5 py-3 rounded-xl flex items-center gap-3"
            style={{
              background: 'rgba(255,77,109,0.12)',
              border: '1px solid rgba(255,77,109,0.4)',
              backdropFilter: 'blur(20px)',
            }}
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ff4d6d' }} />
            <div>
              <div className="text-sm font-bold" style={{ color: '#ff4d6d' }}>
                {event.type}: {event.phase} Phase
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                {event.collectedObjectIds?.length > 0
                  ? `${event.collectedObjectIds.length} object(s) collected`
                  : `${event.durationMs}ms`}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
