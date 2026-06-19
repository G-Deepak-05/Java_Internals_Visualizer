'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Layers, GitBranch, Zap, Eye, ChevronRight,
  Code2, MemoryStick, Cpu, Activity
} from 'lucide-react';
import { PRESET_PROGRAMS } from '@/lib/presets';

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

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-y-auto overflow-x-hidden bg-[#f5f5f3] text-[#111111]">
      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-black">
              <Code2 size={12} color="white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-xs tracking-wider uppercase text-[#111111]">
              JIV
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#e2e2dd] bg-[#fafaf9] text-[#71717a]">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://github.com" target="_blank"
              className="btn btn-ghost text-xs">GitHub</a>
            <Link href="/visualizer" className="btn btn-primary text-xs">
              Launch IDE
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Minimalist yellow circle graphic */}
        <div className="absolute right-[5%] md:right-[15%] top-[12%] w-64 h-64 md:w-80 md:h-80 rounded-full bg-[#eab308] opacity-90 -z-10 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-left md:text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#e2e2dd] bg-white mb-6 select-none">
              <Eye size={12} className="text-[#eab308]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555]">
                Chrome DevTools for the JVM
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-4 uppercase text-[#111111]">
              See your Java
              <br />
              program think
            </h1>


            <p className="text-base text-[#555555] max-w-2xl mx-auto mb-10 leading-relaxed font-mono">
              Java Internals Visualizer renders the JVM in real-time. Watch stack frames,
              heap objects, garbage collection, and thread states come alive — line by line.
            </p>

            <div className="flex items-center md:justify-center gap-4 flex-wrap">
              <Link href="/visualizer"
                className="btn btn-primary px-6 py-3 text-xs">
                Open Visualizer
                <ChevronRight size={14} />
              </Link>
              <a href="#features"
                className="btn btn-ghost px-6 py-3 text-xs">
                How it works
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="panel py-5 px-4 text-center">
                <div className="text-2xl font-black text-[#111111]">{stat.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-1.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 select-none">
            <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] mb-3">
              Every JVM concept, made visible
            </h2>
            <p className="text-[#555555] max-w-xl mx-auto font-mono text-xs">
              From freshman CS to senior engineering — JIV reveals what's really happening inside the JVM.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="panel p-6 hover:border-[#111111] transition-all duration-300 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              >
                <div className="w-10 h-10 rounded flex items-center justify-center mb-4 border"
                  style={{ background: `${f.color}08`, borderColor: `${f.color}33` }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wide mb-2 text-[#111111]">{f.title}</h3>
                <p className="text-xs text-[#555555] leading-relaxed font-mono">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Presets ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-[var(--border)] bg-[#fafaf9]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 select-none">
            <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] mb-3">
              Ready-to-run examples
            </h2>
            <p className="text-[#555555] font-mono text-xs">Jump in with curated programs designed to showcase JVM behavior.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESET_PROGRAMS.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
              >
                <Link href={`/visualizer?preset=${p.id}`}
                  className="panel p-5 block hover:border-[#111111] bg-white transition-all duration-200 group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#e2e2dd] bg-[#fafaf9] text-[#71717a]">
                        {p.category}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-[#888883] group-hover:text-black transition-colors" />
                  </div>
                  <h3 className="font-bold text-xs uppercase tracking-wide mb-1 text-[#111111]">{p.title}</h3>
                  <p className="text-xs text-[#555555] leading-relaxed font-mono">{p.description}</p>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/visualizer" className="btn btn-primary px-8 py-3">
              Start Visualizing
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-[var(--border)] bg-white select-none">
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
