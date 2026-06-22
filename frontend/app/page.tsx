'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, GitBranch, Zap, Eye, ChevronRight,
  Code2, MemoryStick, Cpu, Activity, Play, Pause,
  RefreshCw, CheckCircle, HelpCircle, AlertCircle,
  ShieldAlert, Settings, Info, Box, Sparkles
} from 'lucide-react';
import { PRESET_PROGRAMS } from '@/lib/presets';

interface ShowcaseStep {
  title: string;
  description: string;
  codeLines: string[];
  activeLine: number;
  stack: string[];
  heap: { id: string; className: string; value?: string; fields?: string; status: 'active' | 'unreachable' }[];
  references: { from: string; to: string }[];
  isGcActive?: boolean;
}

const SHOWCASE_STEPS: ShowcaseStep[] = [
  {
    title: "1. Heap Allocation",
    description: "Creating a new User instantiates a User object and its referenced fields (String) in the Eden generation.",
    codeLines: [
      "public class Main {",
      "  public static void main(String[] args) {",
      "    User user = new User(\"Deepak\");",
      "    user.sayHello();",
      "  }",
      "}"
    ],
    activeLine: 2,
    stack: ["main()"],
    heap: [
      { id: "User@001", className: "User", fields: "name = String@002", status: "active" },
      { id: "String@002", className: "String", value: "\"Deepak\"", status: "active" }
    ],
    references: [
      { from: "stack_user", to: "User@001" },
      { from: "User@001_name", to: "String@002" }
    ]
  },
  {
    title: "2. Stack Frame Invocation",
    description: "Calling sayHello() pushes a new stack frame onto the execution stack containing its local variables.",
    codeLines: [
      "public class Main {",
      "  public static void main(String[] args) {",
      "    User user = new User(\"Deepak\");",
      "    user.sayHello();",
      "  }",
      "}"
    ],
    activeLine: 3,
    stack: ["main()", "sayHello()"],
    heap: [
      { id: "User@001", className: "User", fields: "name = String@002", status: "active" },
      { id: "String@002", className: "String", value: "\"Deepak\"", status: "active" }
    ],
    references: [
      { from: "stack_user", to: "User@001" },
      { from: "User@001_name", to: "String@002" },
      { from: "stack_this", to: "User@001" }
    ]
  },
  {
    title: "3. Reference Scope Exited",
    description: "As execution exits the method, local stack variables are discarded, rendering heap objects unreachable.",
    codeLines: [
      "public class Main {",
      "  public static void main(String[] args) {",
      "    User user = new User(\"Deepak\");",
      "    user.sayHello();",
      "  }",
      "}"
    ],
    activeLine: 4,
    stack: ["main()"],
    heap: [
      { id: "User@001", className: "User", fields: "name = String@002", status: "unreachable" },
      { id: "String@002", className: "String", value: "\"Deepak\"", status: "unreachable" }
    ],
    references: []
  },
  {
    title: "4. Garbage Collection Sweep",
    description: "The JVM's Garbage Collector runs, sweeps through the Heap, and automatically reclaims memory of unreachable items.",
    codeLines: [
      "public class Main {",
      "  public static void main(String[] args) {",
      "    User user = new User(\"Deepak\");",
      "    user.sayHello();",
      "    System.gc(); // GC complete",
      "  }",
      "}"
    ],
    activeLine: 4,
    stack: ["main()"],
    heap: [],
    references: [],
    isGcActive: true
  }
];

const PRESET_METADATA: Record<string, { difficulty: 'Beginner' | 'Intermediate' | 'Advanced'; snapshots: number; color: string; duration: string }> = {
  factorial: { difficulty: 'Beginner', snapshots: 18, color: '#2563eb', duration: '2ms' },
  fibonacci: { difficulty: 'Intermediate', snapshots: 42, color: '#3b82f6', duration: '8ms' },
  'object-references': { difficulty: 'Beginner', snapshots: 12, color: '#16a34a', duration: '1ms' },
  inheritance: { difficulty: 'Intermediate', snapshots: 15, color: '#10b981', duration: '3ms' },
  'string-pool': { difficulty: 'Beginner', snapshots: 10, color: '#ea580c', duration: '1ms' },
  arraylist: { difficulty: 'Intermediate', snapshots: 25, color: '#f59e0b', duration: '4ms' },
  'linked-list': { difficulty: 'Intermediate', snapshots: 32, color: '#84cc16', duration: '6ms' },
  'gc-demo': { difficulty: 'Intermediate', snapshots: 20, color: '#dc2626', duration: '15ms' },
  'stack-overflow': { difficulty: 'Advanced', snapshots: 150, color: '#ef4444', duration: '12ms' },
  'java-records': { difficulty: 'Beginner', snapshots: 8, color: '#06b6d4', duration: '1ms' },
  deadlock: { difficulty: 'Advanced', snapshots: 35, color: '#ec4899', duration: '50ms' },
  'virtual-threads': { difficulty: 'Advanced', snapshots: 40, color: '#8b5cf6', duration: '45ms' },
  'generational-gc': { difficulty: 'Advanced', snapshots: 60, color: '#a855f7', duration: '35ms' },
  'spring-di': { difficulty: 'Advanced', snapshots: 28, color: '#059669', duration: '10ms' },
};

const features = [
  {
    icon: Layers,
    title: 'Stack Visualization',
    description: 'Watch stack frames push and pop in real-time. See local variables, recursion depth, and method returns animated.',
    color: '#111111',
  },
  {
    icon: MemoryStick,
    title: 'Heap Explorer',
    description: 'Every object on the heap rendered as an interactive node. Follow reference chains from stack to heap objects.',
    color: '#ca8a04',
  },
  {
    icon: GitBranch,
    title: 'Reference Tracking',
    description: 'See exactly which variables point to which objects. Watch references change as your code executes.',
    color: '#16a34a',
  },
  {
    icon: Zap,
    title: 'Garbage Collection',
    description: 'Watch objects become unreachable and get collected. Understand Young vs Old generation promotion.',
    color: '#ea580c',
  },
  {
    icon: Activity,
    title: 'Thread States',
    description: 'Monitor every thread — platform and virtual. See state transitions from RUNNABLE to BLOCKED in real-time.',
    color: '#dc2626',
  },
  {
    icon: Cpu,
    title: 'Time Travel',
    description: 'Step forward and backward through every JVM state. Replay any execution at any speed.',
    color: '#2563eb',
  },
];

const stats = [
  { value: '60fps', label: 'Render target' },
  { value: '10k+', label: 'Heap objects' },
  { value: '100k+', label: 'Execution steps' },
  { value: '<50ms', label: 'Event latency' },
];

function JavisionLivingLogo() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sweepActive, setSweepActive] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSweepActive(false);
      setTimeout(() => setSweepActive(true), 100);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.3,
      }
    }
  } as const;

  const letterVariants = {
    hidden: { opacity: 0, y: 15, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      }
    }
  } as const;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-2xl mx-auto py-8 px-6 flex flex-col items-center justify-center overflow-visible select-none mb-4"
    >
      {/* SVG Flowing Memory Streams Background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" style={{ filter: 'blur(0.5px)' }}>
        <defs>
          <linearGradient id="neonPurple" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
            <stop offset="50%" stopColor="#9333ea" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="neonIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
            <stop offset="30%" stopColor="#4f46e5" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#4338ca" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Curvy Stream lines */}
        <motion.path
          d="M -50 60 Q 120 10, 280 60 T 650 60"
          fill="none"
          stroke="url(#neonPurple)"
          strokeWidth="2.5"
          strokeDasharray="15 30"
          animate={{ strokeDashoffset: [0, -90] }}
          transition={{ ease: "linear", duration: 5, repeat: Infinity }}
        />
        <motion.path
          d="M -50 110 Q 160 160, 360 90 T 650 120"
          fill="none"
          stroke="url(#neonIndigo)"
          strokeWidth="2"
          strokeDasharray="20 40"
          animate={{ strokeDashoffset: [0, 120] }}
          transition={{ ease: "linear", duration: 7, repeat: Infinity }}
        />
        <motion.path
          d="M -50 80 Q 80 120, 240 70 T 650 90"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="0.5"
          opacity="0.2"
        />
      </svg>

      {/* Floating Parallax Particles */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px)`,
          transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
        <div className="absolute top-[15%] left-[25%] w-1.5 h-1.5 rounded-full bg-purple-400 opacity-40 blur-[0.5px]" />
        <div className="absolute bottom-[25%] right-[20%] w-2 h-2 rounded-full bg-indigo-400 opacity-30 blur-[0.5px]" />
        <div className="absolute top-[45%] right-[35%] w-1.5 h-1.5 rounded-full bg-stone-400 opacity-25" />
      </div>

      {/* Floating References & Nodes */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
          transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
        {/* Stack pointer node */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 0.9,
            scale: 1,
            y: [0, -5, 0]
          }}
          transition={{
            y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
            opacity: { delay: 0.8, duration: 0.5 }
          }}
          className="absolute left-[2%] top-[15%] px-2 py-0.5 bg-white border border-[#e2e2dd] rounded shadow-sm flex items-center gap-1.5 select-none"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-[8px] uppercase tracking-wider font-bold text-[#555555]">
            stack_ref
          </span>
        </motion.div>

        {/* Heap object node */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 0.9,
            scale: 1,
            y: [0, 6, 0]
          }}
          transition={{
            y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
            opacity: { delay: 1.2, duration: 0.5 }
          }}
          className="absolute right-[2%] bottom-[20%] px-2 py-0.5 bg-white border border-[#e2e2dd] rounded shadow-sm flex items-center gap-1.5 select-none"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          <span className="font-mono text-[8px] uppercase tracking-wider font-bold text-[#555555]">
            Object@0x7a
          </span>
        </motion.div>

        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full overflow-visible opacity-20">
          <motion.line
            x1="5%"
            y1="22%"
            x2="25%"
            y2="35%"
            stroke="#6366f1"
            strokeWidth="0.8"
            strokeDasharray="2 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          />
          <motion.line
            x1="95%"
            y1="78%"
            x2="75%"
            y2="65%"
            stroke="#a855f7"
            strokeWidth="0.8"
            strokeDasharray="2 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
          />
        </svg>
      </div>

      {/* Main Title Letters */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex items-center justify-center gap-0.5 select-none"
      >
        {"Javision".split("").map((char, index) => (
          <motion.span
            key={index}
            variants={letterVariants}
            className="text-6xl md:text-7xl font-black uppercase tracking-tight relative select-none"
            style={{
              color: index === 0 || index >= 4 ? '#111111' : '#7c3aed',
              textShadow: '0 0 35px rgba(124, 58, 237, 0.1)',
            }}
          >
            {char}
          </motion.span>
        ))}

        {/* Compile cursor */}
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          className="w-3.5 h-10 md:h-12 bg-[#7c3aed] ml-1 self-end mb-1.5 rounded-sm drop-shadow-[0_0_8px_rgba(124,58,237,0.4)]"
        />
      </motion.div>

      {/* GC Sweep line overlay */}
      {sweepActive && (
        <motion.div
          initial={{ left: "-5%" }}
          animate={{ left: "105%" }}
          transition={{
            duration: 2.5,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 5.5
          }}
          className="absolute top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-[#22c55e] to-transparent pointer-events-none z-20"
          style={{
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.5), 0 0 15px rgba(34, 197, 94, 0.25)',
          }}
        />
      )}

      {/* JVM Observability Label */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="relative z-10 mt-3 flex items-center gap-1.5 bg-[#7c3aed]/5 border border-[#7c3aed]/10 rounded-full px-3 py-0.5 font-mono text-[8px] tracking-[0.2em] text-[#7c3aed] uppercase font-bold"
      >
        <span>[ jvm_internals_observability ]</span>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SHOWCASE_STEPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const activeStep = SHOWCASE_STEPS[stepIndex];

  return (
    <main className="min-h-screen overflow-y-auto overflow-x-hidden bg-[#f5f5f3] text-[#111111] relative">
      {/* Subtle JVM-themed background patterns */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 select-none">
        <svg className="absolute w-full h-[200vh] text-stone-400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Faint JVM Node Network watermark */}
          <circle cx="8%" cy="18%" r="4" fill="currentColor" opacity="0.3" />
          <circle cx="12%" cy="22%" r="3" fill="currentColor" opacity="0.2" />
          <path d="M 8% 18% L 12% 22%" stroke="currentColor" strokeWidth="0.8" opacity="0.2" />
          
          <circle cx="88%" cy="25%" r="5" fill="currentColor" opacity="0.2" />
          <circle cx="84%" cy="40%" r="4" fill="currentColor" opacity="0.3" />
          <path d="M 88% 25% L 84% 40%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
          
          <circle cx="15%" cy="75%" r="4" fill="currentColor" opacity="0.15" />
          <circle cx="22%" cy="70%" r="5" fill="currentColor" opacity="0.2" />
          <path d="M 15% 75% L 22% 70%" stroke="currentColor" strokeWidth="0.8" opacity="0.15" />
        </svg>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e2e2dd]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-black">
              <Code2 size={12} color="white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-xs tracking-wider uppercase text-[#111111]">
              Javision
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#e2e2dd] bg-[#fafaf9] text-[#71717a]">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://github.com/G-Deepak-05/Java_Internals_Visualizer" target="_blank"
              className="btn btn-ghost text-xs cursor-pointer select-none">GitHub</a>
            <Link href="/visualizer" className="btn btn-primary text-xs cursor-pointer select-none">
              Launch Visualizer
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="relative z-10 pt-36 pb-16 px-6 overflow-hidden">
        {/* Hero background image watermark */}
        <div
          className="absolute inset-0 -z-20 pointer-events-none opacity-10 select-none"
          style={{
            backgroundImage: "url('/hero-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(3px)',
          }}
        />
        {/* Background visual watermarks */}
        <div className="absolute right-[8%] top-[10%] w-72 h-72 rounded-full bg-[#fef08a]/40 blur-3xl -z-10 pointer-events-none" />
        <div className="absolute left-[5%] top-[40%] w-60 h-60 rounded-full bg-purple-100/30 blur-3xl -z-10 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-left md:text-center">
          {/* Main Badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-stone-200 bg-[#fafaf9] mb-6 select-none shadow-sm font-mono text-[9px] font-bold text-stone-600">
            <Code2 size={10} className="text-[#7c3aed]" />
            <span>CHROME DEVTOOLS FOR THE JVM</span>
          </div>

          <JavisionLivingLogo />

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-6 uppercase text-[#111111] mt-4">
            See your Java
            <br />
            program think
          </h1>

          {/* Subheadline & Description */}
          <p className="text-base md:text-lg text-stone-800 font-semibold max-w-2xl mx-auto mb-3 leading-relaxed">
            Visualize stack frames, heap objects, garbage collection, and thread execution in real time.
          </p>
          <p className="text-xs text-stone-500 max-w-lg mx-auto mb-10 leading-relaxed font-mono">
            Understand exactly what your Java program is doing line by line.
          </p>

          {/* Action CTAs */}
          <div className="flex items-center md:justify-center gap-4 flex-wrap select-none">
            <Link href="/visualizer"
              className="btn btn-primary px-7 py-3 text-xs shadow-md shadow-black/10">
              Launch Visualizer
              <ChevronRight size={14} />
            </Link>
            <a href="https://github.com/G-Deepak-05/Java_Internals_Visualizer" target="_blank"
              className="btn btn-ghost px-7 py-3 text-xs border border-stone-300 hover:border-stone-400">
              View GitHub
            </a>
          </div>

          {/* Trust & Technical Ribbon */}
          <div className="mt-16 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 border-t border-stone-200 pt-6 text-[10px] uppercase font-bold tracking-wider text-stone-500 select-none">
            <span>✓ Open Source</span>
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            <span>✓ Java 17+ / 21+</span>
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            <span>✓ JVM Agent Based</span>
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            <span>✓ Real-Time Visuals</span>
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            <span>✓ 60 FPS Canvas</span>
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            <span>✓ Educational + Production</span>
          </div>
        </div>
      </section>

      {/* ── Visual Showcase IDE Mockup (Priority 1) ───────────────── */}
      <section className="pb-24 px-6 relative z-10 select-none">
        <div className="max-w-5xl mx-auto rounded-2xl border border-stone-800 bg-[#070b13] shadow-2xl p-3 relative z-0 flex flex-col h-[520px]">
          {/* Mock Window Header */}
          <div className="flex items-center justify-between border-b border-stone-900 pb-2 mb-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-mono font-bold">
              Javision Live Showcase
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span className="text-[9px] text-purple-400 font-mono font-bold tracking-widest">LIVE PLAYBACK</span>
            </div>
          </div>

          {/* Mock Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 overflow-hidden">
            
            {/* Left Panel: Monaco Code Editor */}
            <div className="border border-stone-900 bg-[#04060b] rounded-lg p-3 flex flex-col font-mono relative overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-stone-900 pb-2 mb-2 text-[10px] text-stone-400">
                <Code2 size={11} />
                <span>Main.java</span>
              </div>
              <div className="flex-1 text-[11px] leading-relaxed text-stone-300 relative">
                {activeStep.codeLines.map((line, idx) => {
                  const isActive = idx === activeStep.activeLine;
                  return (
                    <div key={idx} className="flex items-center relative" style={{ minHeight: 20 }}>
                      <span className="w-6 text-stone-600 text-right pr-2 select-none text-[10px]">
                        {idx + 1}
                      </span>
                      <span className={`pl-1 relative z-10 transition-colors duration-300 ${isActive ? 'text-white font-bold' : 'text-stone-400'}`}>
                        {line}
                      </span>
                      {isActive && (
                        <div className="absolute left-0 right-0 h-5 bg-[#7c3aed]/15 border-l-2 border-[#7c3aed] -z-0 pointer-events-none rounded-sm" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-[9px] text-stone-500 uppercase tracking-widest border-t border-stone-900 pt-2 select-none">
                Java 21 Virtual Machine
              </div>
            </div>

            {/* Center Panel: Stack Frames */}
            <div className="border border-stone-900 bg-[#04060b] rounded-lg p-3 flex flex-col font-mono relative overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-stone-900 pb-2 mb-3 text-[10px] text-stone-400">
                <Layers size={11} className="text-[#a855f7]" />
                <span>Call Stack Frames</span>
              </div>
              <div className="flex-1 flex flex-col justify-end gap-2.5 overflow-hidden pb-4">
                {activeStep.stack.map((frame, idx) => {
                  const isActive = idx === activeStep.stack.length - 1;
                  return (
                    <div
                      key={frame}
                      className={`rounded-xl p-3 border text-xs flex items-center justify-between transition-all duration-300 transform translate-y-0 ${
                        isActive 
                          ? 'border-[#a855f7] bg-[#7c3aed]/10 text-white font-bold shadow-md shadow-[#7c3aed]/5' 
                          : 'border-stone-900 bg-stone-950/40 text-stone-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#a855f7]' : 'bg-stone-700'}`} />
                        <span>{frame}</span>
                      </div>
                      <span className="text-[9px] opacity-60">
                        {isActive ? 'active' : 'idle'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[9px] text-stone-500 uppercase tracking-widest border-t border-stone-900 pt-2 select-none">
                Stack Depth: {activeStep.stack.length}
              </div>
            </div>

            {/* Right Panel: Heap Objects */}
            <div className="border border-stone-900 bg-[#04060b] rounded-lg p-3 flex flex-col font-mono relative overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-stone-900 pb-2 mb-3 text-[10px] text-stone-400">
                <MemoryStick size={11} className="text-[#3b82f6]" />
                <span>JVM Heap space</span>
              </div>
              
              <div className="flex-1 relative overflow-hidden bg-stone-950/20 rounded-md border border-stone-900/30">
                {/* SVG references overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  {/* Link 1: user local var (left margin) -> User@001 */}
                  {activeStep.references.some(r => r.from === 'stack_user') && (
                    <path
                      d="M 12 55 C 40 55, 30 75, 45 75"
                      stroke="#a855f7"
                      strokeWidth="1.2"
                      fill="none"
                      strokeDasharray="4 4"
                      style={{ animation: 'dash 1.2s linear infinite' }}
                    />
                  )}
                  {/* Link 2: User@001.name field -> String@002 */}
                  {activeStep.references.some(r => r.from === 'User@001_name') && (
                    <path
                      d="M 130 90 C 160 90, 150 160, 175 160"
                      stroke="#3b82f6"
                      strokeWidth="1.2"
                      fill="none"
                      strokeDasharray="4 4"
                      style={{ animation: 'dash 1.2s linear infinite' }}
                    />
                  )}
                  {/* Link 3: this local var -> User@001 */}
                  {activeStep.references.some(r => r.from === 'stack_this') && (
                    <path
                      d="M 12 95 C 40 95, 30 85, 45 85"
                      stroke="#10b981"
                      strokeWidth="1.2"
                      fill="none"
                      strokeDasharray="4 4"
                      style={{ animation: 'dash 1.2s linear infinite' }}
                    />
                  )}
                </svg>

                {/* Local variable stack references boundaries */}
                {activeStep.references.length > 0 && (
                  <div className="absolute top-[38px] left-[5px] flex flex-col gap-1 z-20">
                    {activeStep.references.some(r => r.from === 'stack_user') && (
                      <span className="text-[8px] bg-[#a855f7]/25 text-[#d8b4fe] border border-[#a855f7]/40 px-1 rounded-sm">user</span>
                    )}
                    {activeStep.references.some(r => r.from === 'stack_this') && (
                      <span className="text-[8px] bg-[#10b981]/25 text-[#a7f3d0] border border-[#10b981]/40 px-1 rounded-sm mt-5">this</span>
                    )}
                  </div>
                )}

                {/* Heap Nodes */}
                {activeStep.heap.map((node) => {
                  const isUnreachable = node.status === 'unreachable';
                  return (
                    <div
                      key={node.id}
                      className={`absolute rounded-lg p-2.5 text-[9px] border leading-normal w-[100px] transition-all duration-500 z-20 ${
                        node.className === 'User' ? 'top-[45px] left-[45px]' : 'top-[130px] left-[175px]'
                      } ${
                        isUnreachable 
                          ? 'border-red-900/40 bg-red-950/5 text-stone-600 border-dashed shadow-none' 
                          : node.className === 'User' 
                            ? 'border-[#a855f7] bg-[#7c3aed]/10 text-white shadow-lg shadow-[#7c3aed]/5' 
                            : 'border-[#3b82f6] bg-[#3b82f6]/10 text-white shadow-lg shadow-[#3b82f6]/5'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold border-b border-stone-900 pb-1 mb-1">
                        <span className={isUnreachable ? 'text-stone-600' : 'text-stone-300'}>{node.className}</span>
                        <span className="opacity-50 font-normal">{node.id}</span>
                      </div>
                      <div className="text-[8px] opacity-75 truncate">{node.fields || node.value}</div>
                      <div className="mt-1 flex items-center justify-between text-[7px] select-none">
                        <span className={`px-1 rounded-sm ${isUnreachable ? 'bg-red-950/40 text-red-400' : 'bg-green-950/40 text-green-400'}`}>
                          {isUnreachable ? 'DEAD' : 'EDEN'}
                        </span>
                        <span>age: 0</span>
                      </div>
                    </div>
                  );
                })}

                {/* Empty heap state */}
                {activeStep.heap.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <Zap size={16} className="text-stone-700 animate-pulse mb-1.5" />
                    <p className="text-[10px] text-stone-600">Heap Cleared by GC Sweep</p>
                  </div>
                )}

                {/* GC Sweep line animation */}
                {activeStep.isGcActive && (
                  <div 
                    className="absolute left-0 right-0 h-1 bg-green-500 z-30 shadow-[0_0_8px_#22c55e] pointer-events-none"
                    style={{ animation: 'sweep 1.8s ease-in-out infinite' }}
                  />
                )}
              </div>

              <div className="text-[9px] text-stone-500 uppercase tracking-widest border-t border-stone-900 pt-2 select-none flex items-center justify-between">
                <span>Objects: {activeStep.heap.length}</span>
                {activeStep.isGcActive && <span className="text-green-500 animate-pulse">Sweep Active</span>}
              </div>
            </div>

          </div>

          {/* Bottom Scrubber & Info Footer */}
          <div className="border-t border-stone-900 pt-3 mt-3 shrink-0 flex flex-col md:flex-row items-center justify-between gap-3 font-mono">
            {/* Step descriptor */}
            <div className="text-left w-full md:w-auto">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#a855f7] mb-0.5 block">
                {activeStep.title}
              </span>
              <p className="text-[10px] text-stone-400 max-w-sm leading-relaxed">
                {activeStep.description}
              </p>
            </div>

            {/* Scrubber timeline and Play/Pause controls */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end select-none">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded bg-stone-900 hover:bg-stone-800 text-white cursor-pointer transition-colors shadow-sm"
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>
              
              {/* Steps timeline dots */}
              <div className="flex items-center gap-1">
                {SHOWCASE_STEPS.map((s, idx) => {
                  const isActive = idx === stepIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setStepIndex(idx);
                        setIsPlaying(false);
                      }}
                      className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                        isActive ? 'w-6 bg-[#7c3aed]' : 'w-2 bg-stone-800 hover:bg-stone-700'
                      }`}
                      title={s.title}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Global inline styles for custom animations */}
        <style jsx global>{`
          @keyframes dash {
            to {
              stroke-dashoffset: -20;
            }
          }
          @keyframes sweep {
            0% {
              top: 0%;
            }
            100% {
              top: 100%;
            }
          }
        `}</style>
      </section>

      {/* ── Debugger vs Javision Comparison (Priority 7) ─────────────── */}
      <section className="py-24 px-6 border-t border-[#e2e2dd] bg-[#fafaf9]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 select-none">
            <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] mb-3">
              Why visual debugging is different
            </h2>
            <p className="text-stone-500 font-mono text-xs max-w-md mx-auto">
              Traditional debuggers show lists of variable values. Javision reveals the active structure of the runtime JVM.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1: Traditional Debugger */}
            <div className="panel p-6 bg-white border border-[#e2e2dd] rounded-xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded bg-stone-100 flex items-center justify-center border border-stone-200 text-stone-500 mb-4 select-none">
                  <ShieldAlert size={15} />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wide text-[#111111] mb-2.5">
                  Traditional Debugger
                </h3>
                <p className="text-xs text-stone-400 font-mono mb-6">Text-based and static representations of state.</p>
                
                <ul className="space-y-3.5 text-xs font-mono text-stone-500 pl-1.5 list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">✕</span>
                    <span>Breakpoints pause execution in static text files</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">✕</span>
                    <span>Variables rendered as raw nested directories of text values</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">✕</span>
                    <span>Heap references hidden behind address strings (e.g. User@4f5a6b)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">✕</span>
                    <span>GC operations and object lifetimes are completely invisible</span>
                  </li>
                </ul>
              </div>
              <div className="text-[10px] text-stone-400 border-t border-stone-100 pt-4 mt-6">
                Requires abstract mental mapping
              </div>
            </div>

            {/* Card 2: Javision Visualizer */}
            <div className="panel p-6 bg-white border border-purple-200 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-lg shadow-purple-500/2">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100/30 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="w-8 h-8 rounded bg-purple-50 flex items-center justify-center border border-purple-100 text-[#7c3aed] mb-4 select-none">
                  <Sparkles size={15} />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wide text-[#111111] mb-2.5">
                  Javision Visualizer
                </h3>
                <p className="text-xs text-[#7c3aed] font-mono mb-6">Interactive, animated visual representations.</p>
                
                <ul className="space-y-3.5 text-xs font-mono text-stone-700 pl-1.5 list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Animated frames push/pop and track active source lines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Interactive Heap Canvas maps nodes and fields in real-time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Directed reference links draw pointer paths dynamically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>GC sweep and young/survivor/old promotions rendered live</span>
                  </li>
                </ul>
              </div>
              <div className="text-[10px] text-purple-600 font-bold border-t border-purple-100 pt-4 mt-6">
                No mental simulation required — just see it
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 border-b border-[#e2e2dd]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 select-none">
            <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] mb-3">
              Every JVM concept, made visible
            </h2>
            <p className="text-[#555555] max-w-xl mx-auto font-mono text-xs">
              From freshman CS to senior engineering — Javision reveals what's really happening inside the JVM.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="panel p-6 hover:border-[#111111] transition-all duration-300 group bg-white"
              >
                <div className="w-10 h-10 rounded flex items-center justify-center mb-4 border"
                  style={{ background: `${f.color}08`, borderColor: `${f.color}33` }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wide mb-2 text-[#111111]">{f.title}</h3>
                <p className="text-xs text-[#555555] leading-relaxed font-mono">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Curated Preset Programs (Priority 5) ─────────────────── */}
      <section className="relative z-0 py-24 px-6 bg-[#fafaf9] overflow-hidden">
        {/* Presets background blueprint image watermarked */}
        <div
          className="absolute inset-0 -z-20 pointer-events-none opacity-5 select-none"
          style={{
            backgroundImage: "url('/presets-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(4px)',
          }}
        />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 select-none">
            <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] mb-3">
              Curated Preset Programs
            </h2>
            <p className="text-[#555555] font-mono text-xs">Jump in with preset code bases configured to demonstrate specific JVM execution behaviors.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESET_PROGRAMS.map((p) => {
              const meta = PRESET_METADATA[p.id] || { difficulty: 'Beginner', snapshots: 10, color: '#111111', duration: '1ms' };
              return (
                <div
                  key={p.id}
                  className="group relative"
                >
                  <Link href={`/visualizer?preset=${p.id}`}
                    className="panel p-5 block hover:border-[#111111] bg-white transition-all duration-200 group cursor-pointer relative overflow-hidden h-full flex flex-col justify-between">
                    
                    <div>
                      {/* Badge line */}
                      <div className="flex items-center justify-between mb-4 select-none">
                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#e2e2dd] bg-[#fafaf9] text-stone-500">
                          {p.category}
                        </span>
                        
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          meta.difficulty === 'Beginner' ? 'border-green-100 bg-green-50 text-green-600' :
                          meta.difficulty === 'Intermediate' ? 'border-blue-100 bg-blue-50 text-blue-600' :
                          'border-purple-100 bg-purple-50 text-purple-600'
                        }`}>
                          {meta.difficulty}
                        </span>
                      </div>

                      <h3 className="font-bold text-xs uppercase tracking-wide mb-1 text-[#111111] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        {p.title}
                      </h3>
                      <p className="text-[11px] text-[#555555] leading-relaxed font-mono mb-4">{p.description}</p>
                    </div>

                    <div className="border-t border-stone-100 pt-3 flex items-center justify-between text-[8px] font-mono uppercase text-stone-400 select-none">
                      <div className="flex items-center gap-2">
                        <span>{meta.snapshots} Snapshots</span>
                        <span>·</span>
                        <span>{meta.duration}</span>
                      </div>
                      <ChevronRight size={12} className="text-stone-300 group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all" />
                    </div>

                  </Link>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link href="/visualizer" className="btn btn-primary px-8 py-3 shadow-md shadow-black/10">
              Start Visualizing
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Strong CTA Section (Priority 6) ──────────────────────── */}
      <section className="py-24 px-6 border-t border-[#e2e2dd] bg-white relative overflow-hidden select-none">
        {/* Glow watermarks */}
        <div className="absolute left-[30%] top-[-20%] w-[500px] h-[200px] bg-purple-100/50 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto rounded-3xl border border-stone-900 bg-[#070b13] p-10 md:p-14 relative overflow-hidden text-center shadow-2xl">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.06),transparent_60%)] pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4 leading-none">
              Ready to see what your
              <br />
              JVM is actually doing?
            </h2>
            
            <p className="text-xs md:text-sm text-stone-400 font-mono max-w-lg mx-auto mb-10 leading-relaxed">
              Ditch text logging and static debuggers. Paste your code, launch the sandbox, and step through JVM internals.
            </p>

            <Link href="/visualizer" className="btn btn-primary text-xs px-8 py-3.5 shadow-lg shadow-[#7c3aed]/10 bg-[#7c3aed] border-[#7c3aed] hover:bg-[#6d28d9] hover:border-[#6d28d9] text-white">
              Launch Visualizer
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-[#e2e2dd] bg-white select-none">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Code2 size={13} />
            <span>Java Internals Visualizer — Built for engineers, by engineers.</span>
          </div>
          <span>Java 21 LTS · Open Source</span>
        </div>
      </footer>
    </main>
  );
}
