import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  JvmSnapshot,
  PanelVisibility,
  PresetProgram,
} from '@/types/jvm';

interface JvmStore {

  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  snapshots: JvmSnapshot[];
  addSnapshot: (snapshot: JvmSnapshot) => void;
  clearSnapshots: () => void;

  currentStep: number;
  setCurrentStep: (step: number) => void;
  stepForward: () => void;
  stepBack: () => void;

  isPlaying: boolean;
  playbackSpeed: number; 
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;

  isExecuting: boolean;
  executionComplete: boolean;
  executionError: string | null;
  setIsExecuting: (v: boolean) => void;
  setExecutionComplete: (v: boolean) => void;
  setExecutionError: (err: string | null) => void;

  panels: PanelVisibility;
  togglePanel: (panel: keyof PanelVisibility) => void;
  activeThread: string;
  setActiveThread: (thread: string) => void;
  highlightedObjectId: string | null;
  setHighlightedObjectId: (id: string | null) => void;
  selectedPreset: PresetProgram | null;
  setSelectedPreset: (preset: PresetProgram | null) => void;

  currentSnapshot: () => JvmSnapshot | null;
}

export const useJvmStore = create<JvmStore>()(
  devtools(
    (set, get) => ({

      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),

      snapshots: [],
      addSnapshot: (snapshot) =>
        set((state) => ({
          snapshots: [...state.snapshots, snapshot],

          currentStep:
            state.isPlaying || state.currentStep === state.snapshots.length - 1
              ? state.snapshots.length  
              : state.currentStep,
        })),
      clearSnapshots: () =>
        set({
          snapshots: [],
          currentStep: 0,
          sessionId: null,
          isExecuting: false,
          executionComplete: false,
          executionError: null,
        }),

      currentStep: 0,
      setCurrentStep: (step) => {
        const { snapshots } = get();
        const clamped = Math.max(0, Math.min(step, snapshots.length - 1));
        set({ currentStep: clamped });
      },
      stepForward: () => {
        const { currentStep, snapshots } = get();
        if (currentStep < snapshots.length - 1) {
          set({ currentStep: currentStep + 1 });
        }
      },
      stepBack: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      isPlaying: false,
      playbackSpeed: 1,
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

      isExecuting: false,
      executionComplete: false,
      executionError: null,
      setIsExecuting: (v) => set({ isExecuting: v }),
      setExecutionComplete: (v) => set({ executionComplete: v, isExecuting: !v }),
      setExecutionError: (err) =>
        set({ executionError: err, isExecuting: false }),

      panels: {
        stack: true,
        heap: true,
        threads: true,
        bytecode: false,
        stringpool: false,
        metaspace: false,
        gc: false,
        console: true,
        spring: false,
        ai: false,
      },
      togglePanel: (panel) =>
        set((state) => ({
          panels: { ...state.panels, [panel]: !state.panels[panel] },
        })),

      activeThread: 'main',
      setActiveThread: (thread) => set({ activeThread: thread }),

      highlightedObjectId: null,
      setHighlightedObjectId: (id) => set({ highlightedObjectId: id }),

      selectedPreset: null,
      setSelectedPreset: (preset) => set({ selectedPreset: preset }),

      currentSnapshot: () => {
        const { snapshots, currentStep } = get();
        if (snapshots.length === 0) return null;
        return snapshots[Math.min(currentStep, snapshots.length - 1)] ?? null;
      },
    }),
    { name: 'jiv-store' }
  )
);
