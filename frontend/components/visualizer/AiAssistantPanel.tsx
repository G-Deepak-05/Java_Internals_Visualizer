'use client';

import { useJvmStore } from '@/store/jvmStore';
import { Sparkles, Cpu, AlertCircle, ThumbsUp, HelpCircle } from 'lucide-react';
import type { ThreadState, HeapObject } from '@/types/jvm';
import { useState, useEffect } from 'react';

interface DiagnosticResponse {
  title: string;
  summary: string;
  details: string;
  fix?: string;
}

export function AiAssistantPanel({ code }: { code?: string }) {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();

  const [aiResponse, setAiResponse] = useState<DiagnosticResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoCoach, setAutoCoach] = useState(false);

  useEffect(() => {
    setAiResponse(null);
    if (!autoCoach || !snapshot) return;

    const timer = setTimeout(() => {
      handleExplainWithAi();
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [snapshot?.stepIndex, autoCoach]);

  const analyzeState = () => {
    if (!snapshot) return null;

    const threads = Object.values(snapshot.threads ?? {}) as ThreadState[];
    const heapObjects = Object.values(snapshot.heap ?? {}) as HeapObject[];

    // 1. Deadlock analysis
    const deadlockedThreads = threads.filter(t => t.deadlocked);
    if (deadlockedThreads.length > 0) {
      const names = deadlockedThreads.map(t => `"${t.name}"`).join(', ');
      return {
        type: 'danger',
        title: 'Deadlock Detected',
        icon: <AlertCircle className="text-red-500" size={16} />,
        summary: `The JVM is locked. Threads ${names} are in a circular wait condition and cannot proceed.`,
        details: 'A deadlock occurs when two or more threads are blocked forever, each waiting for a lock owned by the other. For example, Thread A holds Lock 1 and waits for Lock 2, while Thread B holds Lock 2 and waits for Lock 1. In JIV, you can locate these lock objects (highlighted in red) on the Heap Canvas and inspect which thread holds them.',
        fix: 'Fix this by reordering your synchronized blocks so locks are always acquired in the exact same sequence across all threads.'
      };
    }

    // 2. Lock Contention analysis
    const blockedThreads = threads.filter(t => t.state === 'BLOCKED' || t.waitingForMonitor);
    if (blockedThreads.length > 0) {
      const thread = blockedThreads[0];
      const targetLock = thread.waitingForMonitor ? thread.waitingForMonitor.replace('obj_', '#') : 'unknown';
      return {
        type: 'warning',
        title: 'Lock Contention / Thread Blocked',
        icon: <HelpCircle className="text-amber-500" size={16} />,
        summary: `Thread "${thread.name}" is WAITING/BLOCKED on monitor lock ${targetLock}.`,
        details: `Your code enters a synchronized block. Thread "${thread.name}" tried to acquire the monitor lock for object ${targetLock}, but another thread currently owns it. The blocked thread yielded its CPU timeslot and entered a waiting state until the lock owner exits the synchronized context.`,
        fix: 'Minimize synchronized scope sizes to avoid threads waiting in long lines for shared object locks.'
      };
    }

    // 3. Unreachable objects analysis
    const unreachable = heapObjects.filter(o => !o.reachable);
    if (unreachable.length > 0) {
      const first = unreachable[0];
      return {
        type: 'info',
        title: 'Unreachable Objects Detected (GC Candidates)',
        icon: <Sparkles className="text-blue-500" size={16} />,
        summary: `Object #${first.id.replace('obj_', '')} (${first.className}) has become unreachable.`,
        details: `This object no longer has any active references pointing to it from the call stack frames or static fields (GC Roots). In JIV, unreachable objects are highlighted on the Heap Canvas and will be swept away by the Garbage Collector in the next GC sweep.`,
        fix: 'This is normal lifecycle behavior. In Java, memory cleanup is automatic!'
      };
    }

    // 4. Garbage Collection analysis
    if (snapshot.gcEvents && snapshot.gcEvents.length > 0) {
      const gc = snapshot.gcEvents[0];
      return {
        type: 'success',
        title: 'Garbage Collection Event',
        icon: <Cpu className="text-green-500" size={16} />,
        summary: `GC Event triggered: ${gc.type} during step.`,
        details: `The JVM executed a Garbage Collection cycle. Memory was reclaimed by sweeping unreachable candidate objects. The GC ran for ${gc.durationMs}ms and updated the active heap size.`,
        fix: 'Observe how survivor object ages incremented on the Heap nodes.'
      };
    }

    // 5. Healthy executing
    return {
      type: 'healthy',
      title: 'JVM Execution Healthy',
      icon: <ThumbsUp className="text-green-600" size={16} />,
      summary: `The JVM is executing instructions smoothly on the "${threads.find(t => t.name === 'main') ? 'main' : 'worker'}" thread.`,
      details: `Current Method: "${snapshot.currentMethod ?? 'unknown'}". Currently active on bytecode instruction ${snapshot.currentBytecode ? `"${snapshot.currentBytecode.trim()}"` : `line ${snapshot.lineNumber}`}. Stack depth is stable and no locking issues are detected.`,
      fix: 'Use the Scrubber Controls at the bottom of the screen to step forward or backward and observe state transitions.'
    };
  };

  async function handleExplainWithAi() {
    if (!snapshot || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot, code })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data);
      } else {
        setAiResponse({
          title: 'AI Analysis Failed',
          summary: 'Failed to retrieve diagnostic response from NVIDIA NIM.',
          details: 'Check if your API key is correctly configured in .env.local.',
          fix: 'Please verify configuration and try again.'
        });
      }
    } catch (e) {
      setAiResponse({
        title: 'Network Error',
        summary: 'Failed to communicate with local API route.',
        details: String(e),
        fix: 'Make sure your next dev server is active.'
      });
    } finally {
      setLoading(false);
    }
  }

  const analysis = aiResponse || analyzeState();
  const type = aiResponse ? 'ai' : (analysis as any)?.type;

  return (
    <div className="panel flex flex-col overflow-hidden h-full bg-white flex-1" style={{ minWidth: 280 }}>
      <div className="panel-header" style={{ borderBottomColor: '#e9d5ff', background: '#faf5ff' }}>
        <Sparkles size={13} className="text-[#7c3aed]" />
        <span className="panel-header-title text-[#6b21a8]">
          {aiResponse ? 'AI Coach (Live Diagnostic)' : 'AI Diagnostic Assistant'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 select-text">
        {!analysis ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-[var(--text-secondary)]">
            <Sparkles size={20} className="text-[#a855f7]" />
            <p className="text-xs">Start execution to see AI Diagnostics</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-4 border transition-all"
              style={{
                borderColor: 
                  type === 'ai' ? '#c084fc' :
                  type === 'danger' ? '#fecaca' : 
                  type === 'warning' ? '#fde68a' : 
                  type === 'info' ? '#bfdbfe' : 
                  type === 'success' ? '#bbf7d0' : '#e2e2dd',
                background: 
                  type === 'ai' ? '#faf5ff' :
                  type === 'danger' ? '#fef2f2' : 
                  type === 'warning' ? '#fffbeb' : 
                  type === 'info' ? '#eff6ff' : 
                  type === 'success' ? '#f0fdf4' : '#fefefc'
              }}>
              
              <div className="flex items-center gap-2 mb-2.5">
                {aiResponse ? <Sparkles className="text-[#a855f7]" size={16} /> : (analysis as any).icon}
                <span className="text-xs font-bold text-[var(--text-primary)] select-none">
                  {analysis.title}
                </span>
              </div>

              <p className="text-xs font-semibold text-[var(--text-primary)] leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            <div className="space-y-3.5 pl-1">
              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] mb-1">
                  How It Works
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans">
                  {analysis.details}
                </p>
              </div>

              {analysis.fix && (
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] mb-1">
                    Recommendation / Insight
                  </h4>
                  <p className="text-[11px] text-[#581c87] bg-[#f3e8ff] px-2.5 py-1.5 rounded-lg border border-[#e9d5ff] leading-relaxed font-sans font-medium">
                    💡 {analysis.fix}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-3 select-none">
                {!aiResponse && (
                  <button
                    onClick={handleExplainWithAi}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 transition-all rounded-lg shadow-sm border border-purple-500 hover:shadow cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing with Llama 3.1...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} fill="white" />
                        Explain Step with AI Coach
                      </>
                    )}
                  </button>
                )}

                <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] cursor-pointer py-1 font-sans">
                  <input
                    type="checkbox"
                    checked={autoCoach}
                    onChange={(e) => setAutoCoach(e.target.checked)}
                    className="rounded border-stone-300 text-purple-600 focus:ring-purple-500 h-3 w-3 cursor-pointer"
                  />
                  <span>Auto-explain line changes (live AI)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
