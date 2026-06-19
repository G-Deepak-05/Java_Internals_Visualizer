package com.jiv.agent.listeners;

import com.jiv.agent.emitter.EventEmitter;
import com.jiv.agent.snapshot.SnapshotData;

import java.lang.instrument.Instrumentation;
import java.lang.management.*;
import java.lang.reflect.Field;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class JivRuntime {

    private static EventEmitter emitter;
    private static Instrumentation inst;
    private static final AtomicInteger stepCounter = new AtomicInteger(0);

    private static final Map<String, Deque<SnapshotData.FrameData>> shadowStacks =
        new ConcurrentHashMap<>();

    private static final Map<String, SnapshotData.HeapObjectData> heapRegistry =
        new ConcurrentHashMap<>();

    private static final Map<Integer, String> identityMap = new ConcurrentHashMap<>();

    private static final Set<String> loadedClasses = ConcurrentHashMap.newKeySet();

    private static final int THROTTLE = 1;

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

    public static void onLineChange(String className, String methodName, int lineNumber) {
        loadedClasses.add(className);
        String threadName = Thread.currentThread().getName();

        Deque<SnapshotData.FrameData> stack = shadowStacks.get(threadName);
        if (stack != null && !stack.isEmpty()) {
            stack.peek().lineNumber = lineNumber;
            stack.peek().active = true;
        }

        emitSnapshot("LINE_CHANGE", className, methodName, lineNumber);
    }

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

        int depth = 0;
        for (SnapshotData.FrameData f : stack) {
            if (f.methodName.equals(methodName) && f.className.equals(className)) depth++;
        }
        frame.recursionDepth = depth;
        frame.frameIndex = stack.size();

        if (!stack.isEmpty()) stack.peek().active = false;

        stack.push(frame);
        emitSnapshot("METHOD_ENTER", className, methodName, lineNumber);
    }

    public static void onMethodExit(String className, String methodName, int lineNumber) {
        String threadName = Thread.currentThread().getName();
        Deque<SnapshotData.FrameData> stack = shadowStacks.get(threadName);

        if (stack != null && !stack.isEmpty()) {
            stack.pop(); 
            if (!stack.isEmpty()) stack.peek().active = true; 
        }

        emitSnapshot("METHOD_EXIT", className, methodName, lineNumber);
    }

    private static void emitSnapshot(String eventType, String className,
                                      String methodName, int lineNumber) {
        if (emitter == null) return;

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

        for (Map.Entry<String, Deque<SnapshotData.FrameData>> entry : shadowStacks.entrySet()) {
            List<SnapshotData.FrameData> frameList = new ArrayList<>(entry.getValue());

            for (int i = 0; i < frameList.size(); i++) {
                frameList.get(i).frameIndex = i;
            }
            snapshot.stacks.put(entry.getKey(), frameList);
        }

        snapshot.threads = collectThreadStates();

        snapshot.gcEvents = collectGcEvents(step);

        snapshot.heap = new LinkedHashMap<>(heapRegistry);

        emitter.emit(snapshot);
    }

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

    public static void registerObject(Object obj) {
        if (obj == null || heapRegistry.size() > 5000) return; 

        int identityHash = System.identityHashCode(obj);
        String objectId = identityMap.computeIfAbsent(identityHash,
            k -> "obj_" + k);

        if (heapRegistry.containsKey(objectId)) return; 

        SnapshotData.HeapObjectData data = new SnapshotData.HeapObjectData();
        data.id = objectId;
        data.className = obj.getClass().getSimpleName();
        data.reachable = true;
        data.generation = "YOUNG";

        if (inst != null) {
            data.sizeBytes = inst.getObjectSize(obj);
        }

        if (obj instanceof String s) {
            data.isString = true;
            data.stringValue = s.length() > 100 ? s.substring(0, 100) + "..." : s;
        }

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
                        registerObject(val); 
                    }
                }
                data.arrayElements = elements;
            } catch (Exception ignored) {}
        }

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

                        String refId = "obj_" + System.identityHashCode(value);
                        data.fields.put(field.getName(), refId);

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
