package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.*;

/**
 * Represents a complete, immutable snapshot of the JVM state at a given execution step.
 * Each snapshot is produced by the JIV Java Agent and stored for time-travel debugging.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class JvmSnapshot {

    /** Session identifier (UUID) */
    private String sessionId;

    /** Sequential step index (0-based) */
    private int stepIndex;

    /** Source line number currently executing */
    private int lineNumber;

    /** The Java source file name */
    private String sourceFile;

    /** Current method signature */
    private String currentMethod;

    /** Heap: objectId -> HeapObject */
    private Map<String, HeapObject> heap = new LinkedHashMap<>();

    /** Call stacks: threadName -> ordered list of frames (top = index 0) */
    private Map<String, List<StackFrame>> stacks = new LinkedHashMap<>();

    /** Thread states: threadName -> ThreadState */
    private Map<String, ThreadState> threads = new LinkedHashMap<>();

    /** GC events that occurred before/at this step */
    private List<GcEvent> gcEvents = new ArrayList<>();

    /** String pool contents */
    private List<String> stringPool = new ArrayList<>();

    /** Loaded class names */
    private List<String> loadedClasses = new ArrayList<>();

    /** Bytecode instruction at current step */
    private String currentBytecode;

    /** Full bytecode listing for current method */
    private List<String> methodBytecode = new ArrayList<>();

    /** Event type that triggered this snapshot */
    private String eventType;

    /** Timestamp (ms since epoch) */
    private long timestamp;

    /** Accumulated stdout console output */
    private String stdout;
}
