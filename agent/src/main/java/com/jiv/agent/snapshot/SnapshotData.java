package com.jiv.agent.snapshot;

import java.util.*;

public class SnapshotData {

    public String sessionId;
    public int stepIndex;
    public int lineNumber;
    public String sourceFile;
    public String currentMethod;
    public String eventType;
    public long timestamp;
    public String stdout;
    public String jitCompilerName;
    public long totalJitTimeMs;

    public Map<String, HeapObjectData> heap = new LinkedHashMap<>();

    public Map<String, List<FrameData>> stacks = new LinkedHashMap<>();

    public Map<String, ThreadData> threads = new LinkedHashMap<>();

    public List<GcEventData> gcEvents = new ArrayList<>();

    public List<String> stringPool = new ArrayList<>();

    public List<String> loadedClasses = new ArrayList<>();

    public List<String> methodBytecode = new ArrayList<>();

    public String currentBytecode;

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
        public boolean holdsLocks;
        public String waitingForMonitor;
        public String ownsMonitor;
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
