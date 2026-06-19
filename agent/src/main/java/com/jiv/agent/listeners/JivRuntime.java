package com.jiv.agent.listeners;

import com.jiv.agent.emitter.EventEmitter;
import com.jiv.agent.snapshot.SnapshotData;

import java.lang.instrument.Instrumentation;
import java.lang.management.*;
import java.lang.reflect.Field;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Static runtime class injected into user programs via bytecode instrumentation.
 *
 * All injected method calls (onMethodEnter, onMethodExit, onLineChange) delegate here.
 * This class captures the current JVM state and emits a snapshot.
 *
 * Key responsibilities:
 * - Track stack frames per thread (we maintain our own shadow stack in parallel)
 * - Capture heap objects via reflection (best-effort for simple programs)
 * - Collect thread states
 * - Collect GC info via MXBeans
 * - Detect string pool membership
 */
public class JivRuntime {

    private static EventEmitter emitter;
    private static Instrumentation inst;
    private static final AtomicInteger stepCounter = new AtomicInteger(0);

    // Shadow stack per thread: threadName -> list of frames (index 0 = bottom)
    private static final Map<String, Deque<SnapshotData.FrameData>> shadowStacks =
        new ConcurrentHashMap<>();

    // Heap object registry: objectId -> HeapObjectData
    private static final Map<String, SnapshotData.HeapObjectData> heapRegistry =
        new ConcurrentHashMap<>();

    // Identity hash code -> objectId for deduplication
    private static final Map<Integer, String> identityMap = new ConcurrentHashMap<>();

    // Loaded class names
    private static final Set<String> loadedClasses = ConcurrentHashMap.newKeySet();

    // Step throttle: emit at most 1 snapshot per N method calls to avoid flooding
    private static final int THROTTLE = 1;

    // Console output buffer
    private static final StringBuilder stdoutBuffer = new StringBuilder();

    public static synchronized void appendStdout(String text) {
        stdoutBuffer.append(text);
    }

    public static synchronized void appendStdoutChar(char c) {
        stdoutBuffer.append(c);
    }

    public static synchronized String getStdout() {
        return stdoutBuffer.toString();
    }

    public static synchronized void clearStdout() {
        stdoutBuffer.setLength(0);
    }

    static void init(EventEmitter e, Instrumentation i) {
        emitter = e;
        inst = i;
        clearStdout();
    }

    // Called by instrumented code at every new source line
    public static void onLineChange(String className, String methodName, int lineNumber) {
        loadedClasses.add(className);
        String threadName = Thread.currentThread().getName();

        // Update top frame's line number
        Deque<SnapshotData.FrameData> stack = shadowStacks.get(threadName);
        if (stack != null && !stack.isEmpty()) {
            stack.peek().lineNumber = lineNumber;
            stack.peek().active = true;
        }

        emitSnapshot("LINE_CHANGE", className, methodName, lineNumber);
    }

    // Called by instrumented code on method entry
    public static void onMethodEnter(String className, String methodName, int lineNumber) {
        loadedClasses.add(className);
        String threadName = Thread.currentThread().getName();

        SnapshotData.FrameData frame = new SnapshotData.FrameData();
        frame.className = className;
        frame.methodName = methodName;
        frame.lineNumber = lineNumber;
        frame.active = true;

        Deque<SnapshotData.FrameData> stack = shadowStacks.computeIfAbsent(
            threadName, k -> new ArrayDeque<>());

        // Count recursion depth for this method
        int depth = 0;
        for (SnapshotData.FrameData f : stack) {
            if (f.methodName.equals(methodName) && f.className.equals(className)) depth++;
        }
        frame.recursionDepth = depth;
        frame.frameIndex = stack.size();

        // Deactivate previously active frame
        if (!stack.isEmpty()) stack.peek().active = false;

        stack.push(frame);
        emitSnapshot("METHOD_ENTER", className, methodName, lineNumber);
    }

    // Called by instrumented code on method exit
    public static void onMethodExit(String className, String methodName, int lineNumber) {
        String threadName = Thread.currentThread().getName();
        Deque<SnapshotData.FrameData> stack = shadowStacks.get(threadName);

        if (stack != null && !stack.isEmpty()) {
            stack.pop(); // Remove exiting frame
            if (!stack.isEmpty()) stack.peek().active = true; // Restore previous
        }

        emitSnapshot("METHOD_EXIT", className, methodName, lineNumber);
    }

    // ── Snapshot Assembly ─────────────────────────────────────────

    private static void emitSnapshot(String eventType, String className,
                                      String methodName, int lineNumber) {
        if (emitter == null) return;

        // Throttle to avoid emitting too many snapshots
        int step = stepCounter.getAndIncrement();

        SnapshotData snapshot = new SnapshotData();
        snapshot.stepIndex = step;
        snapshot.lineNumber = lineNumber;
        snapshot.sourceFile = className.substring(className.lastIndexOf('.') + 1) + ".java";
        snapshot.currentMethod = className + "." + methodName;
        snapshot.eventType = eventType;
        snapshot.timestamp = System.currentTimeMillis();
        snapshot.loadedClasses = new ArrayList<>(loadedClasses);
        snapshot.stdout = getStdout();

        // Build stacks from shadow stacks
        for (Map.Entry<String, Deque<SnapshotData.FrameData>> entry : shadowStacks.entrySet()) {
            List<SnapshotData.FrameData> frameList = new ArrayList<>(entry.getValue());
            // Re-index frames from top (index 0 = active/top)
            for (int i = 0; i < frameList.size(); i++) {
                frameList.get(i).frameIndex = i;
            }
            snapshot.stacks.put(entry.getKey(), frameList);
        }

        // Collect thread states via ThreadMXBean
        snapshot.threads = collectThreadStates();

        // Collect GC stats via GarbageCollectorMXBeans
        snapshot.gcEvents = collectGcEvents(step);

        // Heap: best-effort via instrumentation.getObjectSize and registered objects
        snapshot.heap = new LinkedHashMap<>(heapRegistry);

        emitter.emit(snapshot);
    }

    // ── Thread State Collection ────────────────────────────────────

    private static Map<String, SnapshotData.ThreadData> collectThreadStates() {
        Map<String, SnapshotData.ThreadData> result = new LinkedHashMap<>();
        ThreadMXBean mxBean = ManagementFactory.getThreadMXBean();
        long[] ids = mxBean.getAllThreadIds();
        ThreadInfo[] infos = mxBean.getThreadInfo(ids);

        for (ThreadInfo info : infos) {
            if (info == null) continue;
            SnapshotData.ThreadData td = new SnapshotData.ThreadData();
            td.name = info.getThreadName();
            td.id = info.getThreadId();
            td.state = info.getThreadState().name();
            td.stackDepth = info.getStackTrace().length;
            result.put(td.name, td);
        }

        // Mark virtual threads if on Java 21+
        for (Thread t : getAllThreads()) {
            SnapshotData.ThreadData td = result.get(t.getName());
            if (td != null) {
                td.virtual = t.isVirtual();
                td.daemon = t.isDaemon();
                td.priority = t.getPriority();
            }
        }

        return result;
    }

    private static List<Thread> getAllThreads() {
        ThreadGroup root = Thread.currentThread().getThreadGroup();
        while (root.getParent() != null) root = root.getParent();
        Thread[] threads = new Thread[root.activeCount() * 2];
        int count = root.enumerate(threads, true);
        return Arrays.asList(Arrays.copyOf(threads, count));
    }

    // ── GC Event Collection ───────────────────────────────────────

    private static long lastGcCount = 0;
    private static final List<SnapshotData.GcEventData> pendingGcEvents = new ArrayList<>();

    private static List<SnapshotData.GcEventData> collectGcEvents(int step) {
        List<GarbageCollectorMXBean> gcBeans = ManagementFactory.getGarbageCollectorMXBeans();
        List<SnapshotData.GcEventData> events = new ArrayList<>();

        for (GarbageCollectorMXBean gcBean : gcBeans) {
            long currentCount = gcBean.getCollectionCount();
            if (currentCount > lastGcCount) {
                SnapshotData.GcEventData event = new SnapshotData.GcEventData();
                event.type = gcBean.getName().contains("Young") ? "MINOR_GC" : "MAJOR_GC";
                event.phase = "SWEEP";
                event.durationMs = gcBean.getCollectionTime();

                MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
                event.heapAfterBytes = memBean.getHeapMemoryUsage().getUsed();
                events.add(event);
                lastGcCount = currentCount;
            }
        }

        return events;
    }

    public static void setLocal(String name, Object value) {
        String threadName = Thread.currentThread().getName();
        Deque<SnapshotData.FrameData> stack = shadowStacks.get(threadName);
        if (stack != null && !stack.isEmpty()) {
            if (value == null) {
                stack.peek().locals.put(name, null);
            } else if (isPrimitive(value)) {
                stack.peek().locals.put(name, value);
            } else {
                int identityHash = System.identityHashCode(value);
                String objectId = identityMap.computeIfAbsent(identityHash, k -> "obj_" + k);
                stack.peek().locals.put(name, objectId);
                registerObject(value);
            }
        }
    }

    /**
     * Registers a heap object for tracking.
     * Called from instrumented object constructors and local variable captures.
     */
    public static void registerObject(Object obj) {
        if (obj == null || heapRegistry.size() > 5000) return; // safety cap

        int identityHash = System.identityHashCode(obj);
        String objectId = identityMap.computeIfAbsent(identityHash,
            k -> "obj_" + k);

        if (heapRegistry.containsKey(objectId)) return; // already registered

        SnapshotData.HeapObjectData data = new SnapshotData.HeapObjectData();
        data.id = objectId;
        data.className = obj.getClass().getSimpleName();
        data.reachable = true;
        data.generation = "YOUNG";

        // Capture size estimate
        if (inst != null) {
            data.sizeBytes = inst.getObjectSize(obj);
        }

        // Check if string
        if (obj instanceof String s) {
            data.isString = true;
            data.stringValue = s.length() > 100 ? s.substring(0, 100) + "..." : s;
        }

        // Check if array
        if (obj.getClass().isArray()) {
            data.isArray = true;
            try {
                int length = java.lang.reflect.Array.getLength(obj);
                Object[] elements = new Object[length];
                for (int i = 0; i < length; i++) {
                    Object val = java.lang.reflect.Array.get(obj, i);
                    if (val == null) {
                        elements[i] = null;
                    } else if (isPrimitive(val)) {
                        elements[i] = val;
                    } else {
                        String refId = "obj_" + System.identityHashCode(val);
                        elements[i] = refId;
                        registerObject(val); // register element object recursively
                    }
                }
                data.arrayElements = elements;
            } catch (Exception ignored) {}
        }

        // Best-effort field capture via reflection
        if (!obj.getClass().isArray()) {
            captureFields(obj, data);
        }

        heapRegistry.put(objectId, data);
    }

    private static void captureFields(Object obj, SnapshotData.HeapObjectData data) {
        try {
            Class<?> cls = obj.getClass();
            if (cls.isArray() || cls.isPrimitive()) return;

            for (Field field : cls.getDeclaredFields()) {
                field.setAccessible(true);
                try {
                    Object value = field.get(obj);
                    if (value == null) {
                        data.fields.put(field.getName(), null);
                    } else if (isPrimitive(value)) {
                        data.fields.put(field.getName(), value);
                    } else {
                        // Reference — store as object ID
                        String refId = "obj_" + System.identityHashCode(value);
                        data.fields.put(field.getName(), refId);
                        // Recursively register referenced objects (1 level deep)
                        registerObject(value);
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
    }

    private static boolean isPrimitive(Object v) {
        return v instanceof Integer || v instanceof Long || v instanceof Double
            || v instanceof Float || v instanceof Boolean || v instanceof Character
            || v instanceof Byte || v instanceof Short;
    }
}
