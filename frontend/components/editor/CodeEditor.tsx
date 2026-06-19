'use client';

import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useJvmStore } from '@/store/jvmStore';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

export function CodeEditor({ code, onChange, language = 'java', readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const { snapshots, currentStep } = useJvmStore();
  const snapshot = snapshots[currentStep];

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('jiv-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '111111', fontStyle: 'bold' },
        { token: 'type', foreground: '2563eb', fontStyle: 'bold' },
        { token: 'string', foreground: '16a34a' },
        { token: 'number', foreground: 'ea580c' },
        { token: 'comment', foreground: '888883', fontStyle: 'italic' },
        { token: 'annotation', foreground: 'ea580c' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#111111',
        'editor.lineHighlightBackground': '#00000004',
        'editor.selectionBackground': '#eab30833',
        'editorLineNumber.foreground': '#888883',
        'editorLineNumber.activeForeground': '#111111',
        'editorCursor.foreground': '#111111',
        'editorGutter.background': '#fafaf9',
        'scrollbarSlider.background': '#00000011',
        'scrollbarSlider.hoverBackground': '#00000022',
        'scrollbarSlider.activeBackground': '#11111133',
      },
    });

    monaco.editor.setTheme('jiv-light');
  };

  useEffect(() => {
    if (!editorRef.current || !snapshot) return;

    const editor = editorRef.current;
    const nextLine = snapshot.lineNumber;

    const justExecutedLine =
      currentStep > 0 && snapshots[currentStep - 1]?.lineNumber !== nextLine
        ? snapshots[currentStep - 1]?.lineNumber
        : null;

    const decorationsList = [];

    if (nextLine && nextLine > 0) {
      decorationsList.push({
        range: { startLineNumber: nextLine, startColumn: 1, endLineNumber: nextLine, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: 'next-line-highlight',
          glyphMarginClassName: 'next-line-glyph',
        },
      });
    }

    if (justExecutedLine && justExecutedLine > 0) {
      decorationsList.push({
        range: { startLineNumber: justExecutedLine, startColumn: 1, endLineNumber: justExecutedLine, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: 'just-executed-line-highlight',
          glyphMarginClassName: 'just-executed-line-glyph',
        },
      });
    }

    const decorations = editor.createDecorationsCollection(decorationsList);

    return () => {
      try { decorations.clear(); } catch {}
    };
  }, [snapshot?.lineNumber, currentStep, snapshots]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
      {}
      <div className="panel-header flex-shrink-0 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-primary)] font-mono font-bold">Main.java</span>
        </div>

        {}
        {snapshots.length > 0 && (
          <div className="flex items-center gap-4 text-[10px] font-mono select-none">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: '#888883' }} />
              <span className="text-[var(--text-secondary)]">Just executed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#eab308' }} />
              <span className="text-[var(--text-primary)] font-bold">Next to execute</span>
            </div>
          </div>
        )}

        {readOnly && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse"
            style={{ background: '#eab30822', color: '#ca8a04', border: '1px solid #eab30844' }}>
            RUNNING
          </span>
        )}
      </div>

      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        options={{
          readOnly,
          fontSize: 13,
          lineHeight: 22,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          folding: true,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 4,
          suggest: {
            showKeywords: true,
          },
        }}
      />
    </div>
  );
}
