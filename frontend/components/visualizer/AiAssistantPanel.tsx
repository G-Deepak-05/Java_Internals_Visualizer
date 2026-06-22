'use client';

import { useJvmStore } from '@/store/jvmStore';
import { Sparkles, Cpu, AlertCircle, ThumbsUp, HelpCircle, Send, MessageSquare } from 'lucide-react';
import type { ThreadState, HeapObject } from '@/types/jvm';
import { useState, useEffect, useRef } from 'react';

interface DiagnosticResponse {
  title: string;
  summary: string;
  details: string;
  fix?: string;
}

export function AiAssistantPanel({ code }: { code?: string }) {
  const { currentSnapshot } = useJvmStore();
  const snapshot = currentSnapshot();

  interface ChatItem {
    question: string;
    response: DiagnosticResponse;
  }

  const [aiResponse, setAiResponse] = useState<DiagnosticResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoCoach, setAutoCoach] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAiResponse(null);
    setChatItems([]);
    if (!autoCoach || !snapshot) return;

    const timer = setTimeout(() => {
      handleExplainWithAi();
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [snapshot?.stepIndex, autoCoach]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatItems.length]);

  async function handleCustomQuestionSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = customInput.trim();
    if (!query || loading) return;

    setLoading(true);
    setCustomInput('');

    try {
      const history = chatItems.map(item => ({
        question: item.question,
        response: item.response
      }));

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          snapshot, 
          code,
          customQuery: query,
          history
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setChatItems(prev => [...prev, { question: query, response: data }]);
      } else {
        setChatItems(prev => [...prev, {
          question: query,
          response: {
            title: 'AI Query Failed',
            summary: 'The diagnostic assistant encountered an error.',
            details: 'AI diagnostic service is temporarily unavailable. This can happen due to a temporary network issue or timeout.',
            fix: 'Try selecting another step or re-running the program.'
          }
        }]);
      }
    } catch (err) {
      setChatItems(prev => [...prev, {
        question: query,
        response: {
          title: 'Network Error',
          summary: 'Failed to communicate with the local server.',
          details: 'The connection to the local API service could not be established.',
          fix: 'Please check your local execution server and retry.'
        }
      }]);
    } finally {
      setLoading(false);
    }
  }

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
        details: 'A deadlock occurs when two or more threads are blocked forever, each waiting for a lock owned by the other. For example, Thread A holds Lock 1 and waits for Lock 2, while Thread B holds Lock 2 and waits for Lock 1. In Javision, you can locate these lock objects (highlighted in red) on the Heap Canvas and inspect which thread holds them.',
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
        details: `This object no longer has any active references pointing to it from the call stack frames or static fields (GC Roots). In Javision, unreachable objects are highlighted on the Heap Canvas and will be swept away by the Garbage Collector in the next GC sweep.`,
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
          summary: 'The diagnostic assistant encountered an error.',
          details: 'AI diagnostic service is temporarily unavailable. This can happen due to a temporary network issue or timeout.',
          fix: 'Try selecting another step or re-running the program.'
        });
      }
    } catch (e) {
      setAiResponse({
        title: 'Network Error',
        summary: 'Failed to communicate with the local server.',
        details: 'The connection to the local API service could not be established.',
        fix: 'Please check your local execution server and retry.'
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 select-text">
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

        {/* Custom chat items log */}
        {chatItems.length > 0 && (
          <div className="mt-6 pt-4 border-t border-stone-150 space-y-5">
            <div className="flex items-center justify-between select-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <MessageSquare size={11} className="text-[#a855f7]" />
                Conversational Log
              </span>
              <button 
                onClick={() => setChatItems([])}
                className="text-[10px] text-[#7c3aed] hover:text-[#6d28d9] hover:underline cursor-pointer"
              >
                Clear History
              </button>
            </div>

            {chatItems.map((item, idx) => (
              <div key={idx} className="space-y-3">
                {/* Question bubble */}
                <div className="flex justify-end">
                  <div className="bg-[#f3e8ff] text-[#581c87] border border-[#e9d5ff] rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[90%] text-xs font-sans shadow-sm">
                    <p className="font-bold text-[9px] text-[#7c3aed] uppercase mb-0.5 tracking-wider select-none">You Asked</p>
                    {item.question}
                  </div>
                </div>

                {/* AI response card */}
                <div className="rounded-xl p-4 border border-purple-200 bg-[#faf5ff] transition-all">
                  <div className="flex items-center gap-1.5 mb-1.5 select-none">
                    <Sparkles className="text-[#a855f7]" size={14} />
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {item.response.title}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-relaxed mb-3">
                    {item.response.summary}
                  </p>

                  <div className="space-y-3 pl-1">
                    <div>
                      <h4 className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)] mb-0.5 select-none">
                        How It Works
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans">
                        {item.response.details}
                      </p>
                    </div>

                    {item.response.fix && (
                      <div>
                        <h4 className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)] mb-0.5 select-none">
                          Recommendation / Insight
                        </h4>
                        <p className="text-[11px] text-[#581c87] bg-[#f3e8ff] px-2.5 py-1 rounded-lg border border-[#e9d5ff] leading-relaxed font-sans font-medium">
                          💡 {item.response.fix}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat / Custom Question Input Footer */}
      <div className="p-3 border-t border-stone-100 bg-[#faf5ff]/40 select-none">
        <form onSubmit={handleCustomQuestionSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            disabled={loading}
            placeholder="Ask AI about Java or current state..."
            className="flex-1 px-3 py-1.5 text-[11px] rounded-lg border border-stone-200 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] bg-white text-[var(--text-primary)] placeholder-stone-400 disabled:opacity-70 transition-all font-sans"
          />
          <button
            type="submit"
            disabled={loading || !customInput.trim()}
            className="p-1.5 text-white bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 transition-all rounded-lg cursor-pointer flex items-center justify-center shadow-sm hover:shadow"
            title="Ask custom question"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={12} fill="white" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
