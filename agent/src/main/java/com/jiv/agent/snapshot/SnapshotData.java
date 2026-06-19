package com.jiv.agent.snapshot;

import java.util.*;

/**
 * Lightweight POJO representing a JVM state snapshot.
 * Serialized to JSON by the EventEmitter and parsed by the Spring Boot backend.
 *
 * This mirrors JvmSnapshot.java in the backend but is kept lean (no Spring/Lombok deps)
 * since the agent JAR must stay minimal and fast.
 */
public class SnapshotData {

    public String sessionId;
    public int stepIndex;
    public int lineNumber;
    public String sourceFile;
    public String currentMethod;
    public String eventType;
    public long timestamp;
    public String stdout;

    /** Heap objects: objectId -> HeapObjectData */
    public Map<String, HeapObjectData> heap = new LinkedHashMap<>();

    /** Call stacks: threadName -> list of frames */
    public Map<String, List<FrameData>> stacks = new LinkedHashMap<>();

    /** Thread states: threadName -> state string */
    public Map<String, ThreadData> threads = new LinkedHashMap<>();

    /** GC events */
    public List<GcEventData> gcEvents = new ArrayList<>();

    /** String pool */
    public List<String> stringPool = new ArrayList<>();

    /** Loaded class names */
    public List<String> loadedClasses = new ArrayList<>();

    /** Bytecode for current method */
    public List<String> methodBytecode = new ArrayList<>();

    /** Currently executing bytecode instruction */
    public String currentBytecode;

    // ── Nested POJOs ──────────────────────────────────────────────

    public static class HeapObjectData {
        public String id;
        public String className;
        public Map<String, Object> fields = new LinkedHashMap<>();
        public Object[] arrayElements;
        public boolean isArray;
        public boolean isString;
        public String stringValue;
        public String generation = "YOUNG";
        public boolean reachable = true;
        public int refCount;
        public long sizeBytes;
        public boolean inStringPool;
    }

    public static class FrameData {
        public String methodName;
        public String className;
        public int lineNumber;
        public Map<String, Object> locals = new LinkedHashMap<>();
        public Map<String, Object> parameters = new LinkedHashMap<>();
        public Object returnValue;
        public int recursionDepth;
        public int frameIndex;
        public boolean active;
    }

    public static class ThreadData {
        public String name;
        public long id;
        public String state;
        public boolean virtual;
        public String carrierThread;
        public int stackDepth;
        public int priority;
        public boolean daemon;
    }

    public static class GcEventData {
        public String type;
        public String phase;
        public List<String> collectedObjectIds = new ArrayList<>();
        public List<String> promotedObjectIds = new ArrayList<>();
        public long durationMs;
        public long heapBeforeBytes;
        public long heapAfterBytes;
    }
}
