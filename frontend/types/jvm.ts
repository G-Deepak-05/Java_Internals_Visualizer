
export interface HeapObject {
  id: string;
  className: string;
  qualifiedClassName?: string;
  fields: Record<string, FieldValue>;
  arrayElements?: FieldValue[];
  isArray: boolean;
  isString: boolean;
  stringValue?: string;
  generation: 'YOUNG' | 'SURVIVOR' | 'OLD';
  reachable: boolean;
  refCount: number;
  sizeBytes: number;
  inStringPool: boolean;
}

export type FieldValue = string | number | boolean | null | undefined;

export interface StackFrame {
  methodName: string;
  className: string;
  qualifiedClassName?: string;
  lineNumber: number;
  locals: Record<string, FieldValue>;
  parameters: Record<string, FieldValue>;
  returnValue?: FieldValue;
  recursionDepth: number;
  frameIndex: number;
  active: boolean;
}

export interface ThreadState {
  name: string;
  id: number;
  state: ThreadStatus;
  virtual: boolean;
  carrierThread?: string;
  holdsLocks: boolean;
  waitingForMonitor?: string;
  ownsMonitor?: string;
  stackDepth: number;
  priority: number;
  daemon: boolean;
}

export type ThreadStatus =
  | 'NEW'
  | 'RUNNABLE'
  | 'BLOCKED'
  | 'WAITING'
  | 'TIMED_WAITING'
  | 'TERMINATED';

export interface GcEvent {
  type: 'MINOR_GC' | 'MAJOR_GC' | 'FULL_GC';
  phase: 'MARK' | 'SWEEP' | 'COMPACT' | 'PROMOTE';
  collectedObjectIds: string[];
  promotedObjectIds: string[];
  durationMs: number;
  heapBeforeBytes: number;
  heapAfterBytes: number;
  stepIndex: number;
}

export interface JvmSnapshot {
  sessionId: string;
  stepIndex: number;
  lineNumber: number;
  sourceFile?: string;
  currentMethod?: string;
  heap: Record<string, HeapObject>;
  stacks: Record<string, StackFrame[]>;
  threads: Record<string, ThreadState>;
  gcEvents: GcEvent[];
  stringPool: string[];
  loadedClasses: string[];
  currentBytecode?: string;
  methodBytecode?: string[];
  eventType?: JvmEventType;
  timestamp: number;
  stdout?: string;
  jitCompilerName?: string;
  totalJitTimeMs?: number;
}

export type JvmEventType =
  | 'LINE_CHANGE'
  | 'METHOD_ENTER'
  | 'METHOD_EXIT'
  | 'OBJECT_CREATED'
  | 'OBJECT_GC'
  | 'GC_START'
  | 'GC_END'
  | 'THREAD_START'
  | 'THREAD_END'
  | 'EXECUTION_COMPLETE'
  | 'ERROR';

export interface ExecutionRequest {
  code: string;
  mainClass?: string;
  mode?: 'STEP' | 'RUN';
  maxSteps?: number;
}

export interface ExecutionResponse {
  sessionId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  errorMessage?: string;
  totalSnapshots?: number;
}

export type PanelId =
  | 'stack'
  | 'heap'
  | 'threads'
  | 'bytecode'
  | 'stringpool'
  | 'metaspace'
  | 'gc'
  | 'console';

export interface PanelVisibility {
  stack: boolean;
  heap: boolean;
  threads: boolean;
  bytecode: boolean;
  stringpool: boolean;
  metaspace: boolean;
  gc: boolean;
  console: boolean;
}

export interface PresetProgram {
  id: string;
  title: string;
  description: string;
  category: 'Recursion' | 'OOP' | 'Collections' | 'Concurrency' | 'Strings' | 'GC';
  code: string;
  mainClass: string;
}
