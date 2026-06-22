'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useJvmStore } from '@/store/jvmStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { StackPanel } from '@/components/visualizer/StackPanel';
import { HeapPanel } from '@/components/visualizer/HeapPanel';
import { ThreadPanel } from '@/components/visualizer/ThreadPanel';
import { BytecodePanel } from '@/components/visualizer/BytecodePanel';
import { StringPoolPanel } from '@/components/visualizer/StringPoolPanel';
import { MetaspacePanel } from '@/components/visualizer/MetaspacePanel';
import { SpringPanel } from '@/components/visualizer/SpringPanel';
import { AiAssistantPanel } from '@/components/visualizer/AiAssistantPanel';
import { GCOverlay } from '@/components/visualizer/GCOverlay';
import { ConsolePanel } from '@/components/visualizer/ConsolePanel';
import { TelemetryPanel } from '@/components/visualizer/TelemetryPanel';
import { ClassLoaderPanel } from '@/components/visualizer/ClassLoaderPanel';
import { TimeTravelControls } from '@/components/controls/TimeTravelControls';
import { Toolbar } from '@/components/controls/Toolbar';
import { api } from '@/lib/api';
import { PRESET_PROGRAMS } from '@/lib/presets';

export function VisualizerLayout() {
  const searchParams = useSearchParams();
  const presetId = searchParams.get('preset');

  const {
    sessionId, setSessionId, clearSnapshots,
    panels, setSelectedPreset, setExecutionError,
    executionError, isExecuting, executionComplete,
  } = useJvmStore();

  const [code, setCode] = useState<string>(PRESET_PROGRAMS[0].code);
  const [mainClass, setMainClass] = useState<string>('Main');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorWidth, setEditorWidth] = useState(38); 
  const isDragging = useRef(false);

  useEffect(() => {
    if (presetId) {
      const preset = PRESET_PROGRAMS.find((p) => p.id === presetId);
      if (preset) {
        setCode(preset.code);
        setMainClass(preset.mainClass);
        setSelectedPreset(preset);
      }
    }
  }, [presetId, setSelectedPreset]);

  useWebSocket(sessionId);

  const handleRun = async () => {
    if (isSubmitting || isExecuting) return;
    setIsSubmitting(true);
    clearSnapshots();
    setExecutionError(null);

    try {
      const response = await api.execute({ code, mainClass, mode: 'STEP', maxSteps: 500 });
      if (response.status === 'ERROR') {
        setExecutionError(response.errorMessage ?? 'Unknown error');
      } else {
        setSessionId(response.sessionId);
      }
    } catch (err) {
      setExecutionError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;
    try {
      await api.stop(sessionId);
    } catch (err) {
      console.error('Failed to stop execution:', err);
      setExecutionError('Failed to stop execution');
    }
  };

  const handleSplitterMouseDown = () => {
    isDragging.current = true;
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setEditorWidth(Math.min(60, Math.max(20, pct)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const cols = [];
  if (panels.stack) cols.push('1.1fr');
  if (panels.heap) cols.push('1.3fr');
  if (panels.console) cols.push('0.9fr');
  const gridTemplateColumns = cols.length > 0 ? cols.join(' ') : '1fr';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-base)]">
      {}
      <Toolbar
        onRun={handleRun}
        onStop={handleStop}
        isRunning={isSubmitting || isExecuting}
        isComplete={executionComplete}
        code={code}
        onCodeChange={setCode}
        mainClass={mainClass}
        onMainClassChange={setMainClass}
      />

      {}
      <div className="flex flex-1 overflow-hidden">
        {}
        <div style={{ width: `${editorWidth}%`, minWidth: 240 }}
          className="flex flex-col overflow-hidden border-r border-[var(--border)]">
          <CodeEditor
            code={code}
            onChange={setCode}
            language="java"
            readOnly={isExecuting}
          />
        </div>

        {}
        <div className="splitter" onMouseDown={handleSplitterMouseDown} />

        {}
        <div className="flex-1 flex flex-col overflow-hidden">
          {}
          {executionError && (
            <div className="px-4 py-2 text-xs font-mono flex items-center gap-2 flex-shrink-0"
              style={{ background: '#ff4d6d14', borderBottom: '1px solid #ff4d6d33', color: '#ff4d6d' }}>
              <span className="font-bold">Error:</span>
              <span className="truncate">{executionError}</span>
            </div>
          )}

          {}
          <div className="flex-1 overflow-hidden p-3 grid gap-3"
            style={{
              gridTemplateColumns,
              gridTemplateRows: 'auto',
            }}>

            {}
            {panels.stack && <StackPanel />}

            {}
            {panels.heap && <HeapPanel />}

            {}
            {panels.console && <ConsolePanel />}

            {}
            <GCOverlay />
          </div>

          {}
          {(panels.threads || panels.bytecode || panels.stringpool || panels.metaspace || panels.spring || panels.ai || panels.classloader || panels.telemetry) && (
            <div className="flex gap-3 px-3 pb-3 overflow-x-auto flex-shrink-0"
              style={{ height: 200, minHeight: 200 }}>
              {panels.threads && <ThreadPanel />}
              {panels.spring && <SpringPanel />}
              {panels.bytecode && <BytecodePanel />}
              {panels.stringpool && <StringPoolPanel />}
              {panels.metaspace && <MetaspacePanel />}
              {panels.classloader && <ClassLoaderPanel />}
              {panels.telemetry && <TelemetryPanel />}
              {panels.ai && <AiAssistantPanel code={code} />}
            </div>
          )}

          {}
          <TimeTravelControls />
        </div>
      </div>
    </div>
  );
}
