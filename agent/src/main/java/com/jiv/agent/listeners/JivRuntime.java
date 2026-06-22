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

    private static final Map<String, Object> objectReferences = new ConcurrentHashMap<>();

    private static final Set<String> loadedClasses = ConcurrentHashMap.newKeySet();

    private static final Map<String, List<String>> registeredSpringBeans =
        new ConcurrentHashMap<>();

    private static final Map<String, ClassLoader> registeredLoaders = new ConcurrentHashMap<>();
    private static final Map<String, List<String>> loaderToClasses = new ConcurrentHashMap<>();
    private static final Map<String, List<SnapshotData.BytecodeInstruction>> methodBytecodeMap = new ConcurrentHashMap<>();
    private static final Map<String, Integer> classAllocationCounts = new ConcurrentHashMap<>();
    private static long accumulatedAllocations = 0;

    public static void registerSpringBean(String className, List<String> dependencies) {
        registeredSpringBeans.put(className, dependencies);
    }

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

    public static void onMethodEnter(String className, String methodName, int lineNumber, Object[] params, String[] paramNames) {
        loadedClasses.add(className);
        String threadName = Thread.currentThread().getName();

        SnapshotData.FrameData frame = new SnapshotData.FrameData();
        frame.className = className;
        frame.methodName = methodName;
        frame.lineNumber = lineNumber;
        frame.active = true;

        if (params != null && paramNames != null) {
            for (int i = 0; i < params.length; i++) {
                Object val = params[i];
                String name = paramNames[i];
                if (val == null) {
                    frame.parameters.put(name, null);
                } else if (isPrimitive(val)) {
                    frame.parameters.put(name, val);
                } else {
                    int identityHash = System.identityHashCode(val);
                    String objectId = identityMap.computeIfAbsent(identityHash, k -> "obj_" + k);
                    frame.parameters.put(name, objectId);
                    registerObject(val);
                }
            }
        }

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

        walkHeap();

        snapshot.heap = new LinkedHashMap<>(heapRegistry);

        snapshot.springBeans = collectSpringBeans();

        snapshot.classLoaders = collectClassLoaders();

        // Telemetry
        SnapshotData.TelemetryData td = new SnapshotData.TelemetryData();
        long totalHeapSize = 0;
        for (SnapshotData.HeapObjectData hod : heapRegistry.values()) {
            totalHeapSize += hod.sizeBytes;
        }
        td.totalHeapSize = totalHeapSize;
        td.allocationRate = accumulatedAllocations;
        td.classCounts = new LinkedHashMap<>(classAllocationCounts);
        snapshot.telemetry = td;

        // Bytecode
        String key = className + "." + methodName;
        List<SnapshotData.BytecodeInstruction> bInsts = methodBytecodeMap.get(key);
        if (bInsts != null) {
            snapshot.methodBytecode = bInsts;
            for (SnapshotData.BytecodeInstruction bi : bInsts) {
                if (bi.lineNumber == lineNumber) {
                    snapshot.currentBytecode = bi.instruction;
                    break;
                }
            }
        }

        CompilationMXBean compBean = ManagementFactory.getCompilationMXBean();
        if (compBean != null) {
            snapshot.jitCompilerName = compBean.getName();
            snapshot.totalJitTimeMs = compBean.getTotalCompilationTime();
        }

        emitter.emit(snapshot);
    }

    private static Map<String, SnapshotData.ThreadData> collectThreadStates() {
        Map<String, SnapshotData.ThreadData> result = new LinkedHashMap<>();
        ThreadMXBean mxBean = ManagementFactory.getThreadMXBean();
        long[] ids = mxBean.getAllThreadIds();
        ThreadInfo[] infos = mxBean.getThreadInfo(ids, true, true);

        long[] deadlockedIds = mxBean.findDeadlockedThreads();
        Set<Long> deadlockedSet = new HashSet<>();
        if (deadlockedIds != null) {
            for (long id : deadlockedIds) {
                deadlockedSet.add(id);
            }
        }

        for (ThreadInfo info : infos) {
            if (info == null) continue;
            SnapshotData.ThreadData td = new SnapshotData.ThreadData();
            td.name = info.getThreadName();
            td.id = info.getThreadId();
            td.state = info.getThreadState().name();
            td.stackDepth = info.getStackTrace().length;
            td.deadlocked = deadlockedSet.contains(info.getThreadId());

            if (info.getLockInfo() != null) {
                td.waitingForMonitor = "obj_" + info.getLockInfo().getIdentityHashCode();
            }

            MonitorInfo[] monitors = info.getLockedMonitors();
            if (monitors != null && monitors.length > 0) {
                td.holdsLocks = true;
                td.ownsMonitor = "obj_" + monitors[0].getIdentityHashCode();
            }

            result.put(td.name, td);
        }

        for (Thread t : getAllThreads()) {
            SnapshotData.ThreadData td = result.get(t.getName());
            if (td != null) {
                td.virtual = t.isVirtual();
                td.daemon = t.isDaemon();
                td.priority = t.getPriority();
                td.parentThreadName = getParentThreadName(t);
                if (t.isVirtual()) {
                    td.carrierThread = getCarrierThreadName(t);
                }
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
    private static boolean gcOccurredThisStep = false;

    private static List<SnapshotData.GcEventData> collectGcEvents(int step) {
        List<GarbageCollectorMXBean> gcBeans = ManagementFactory.getGarbageCollectorMXBeans();
        List<SnapshotData.GcEventData> events = new ArrayList<>();
        gcOccurredThisStep = false;
        long totalGcCount = 0;
        for (GarbageCollectorMXBean gcBean : gcBeans) {
            long count = gcBean.getCollectionCount();
            if (count > 0) {
                totalGcCount += count;
            }
        }
        if (lastGcCount == 0) {
            lastGcCount = totalGcCount;
        } else if (totalGcCount > lastGcCount) {
            gcOccurredThisStep = true;
            lastGcCount = totalGcCount;
            for (GarbageCollectorMXBean gcBean : gcBeans) {
                long currentCount = gcBean.getCollectionCount();
                if (currentCount > 0) {
                    SnapshotData.GcEventData event = new SnapshotData.GcEventData();
                    event.type = gcBean.getName().toLowerCase().contains("young") || gcBean.getName().toLowerCase().contains("scavenge") ? "MINOR_GC" : "MAJOR_GC";
                    event.phase = "SWEEP";
                    event.durationMs = gcBean.getCollectionTime();
                    MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
                    event.heapAfterBytes = memBean.getHeapMemoryUsage().getUsed();
                    events.add(event);
                }
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

        objectReferences.put(objectId, obj);

        String className = obj.getClass().getSimpleName();
        classAllocationCounts.put(className, classAllocationCounts.getOrDefault(className, 0) + 1);

        SnapshotData.HeapObjectData data = new SnapshotData.HeapObjectData();
        data.id = objectId;
        data.className = className;
        data.reachable = true;
        data.generation = "YOUNG";

        if (inst != null) {
            data.sizeBytes = inst.getObjectSize(obj);
            accumulatedAllocations += data.sizeBytes;
        } else {
            data.sizeBytes = 16;
            accumulatedAllocations += 16;
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
                try {
                    field.setAccessible(true);
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

    private static void walkHeap() {
        for (SnapshotData.HeapObjectData data : heapRegistry.values()) {
            data.reachable = false;
            data.refCount = 0;
        }

        Set<Object> roots = new HashSet<>();
        for (Deque<SnapshotData.FrameData> stack : shadowStacks.values()) {
            for (SnapshotData.FrameData frame : stack) {
                for (Object val : frame.locals.values()) {
                    if (val instanceof String s && s.startsWith("obj_")) {
                        Object obj = objectReferences.get(s);
                        if (obj != null) roots.add(obj);
                    }
                }
                for (Object val : frame.parameters.values()) {
                    if (val instanceof String s && s.startsWith("obj_")) {
                        Object obj = objectReferences.get(s);
                        if (obj != null) roots.add(obj);
                    }
                }
            }
        }

        Queue<Object> queue = new ArrayDeque<>(roots);
        Set<String> visited = new HashSet<>();
        for (Object root : roots) {
            String id = identityMap.get(System.identityHashCode(root));
            if (id != null) {
                visited.add(id);
                SnapshotData.HeapObjectData data = heapRegistry.get(id);
                if (data != null) data.reachable = true;
            }
        }

        while (!queue.isEmpty()) {
            Object current = queue.poll();
            String currentId = identityMap.get(System.identityHashCode(current));
            if (currentId == null) continue;

            List<Object> children = getReferencedObjects(current);
            for (Object child : children) {
                int childHash = System.identityHashCode(child);
                String childId = identityMap.get(childHash);
                if (childId == null) {
                    registerObject(child);
                    childId = identityMap.get(childHash);
                }

                if (childId != null) {
                    SnapshotData.HeapObjectData childData = heapRegistry.get(childId);
                    if (childData != null) {
                        childData.reachable = true;
                        childData.refCount++;
                    }
                    if (!visited.contains(childId)) {
                        visited.add(childId);
                        queue.add(child);
                    }
                }
            }
        }

        if (gcOccurredThisStep) {
            for (SnapshotData.HeapObjectData data : heapRegistry.values()) {
                if (data.reachable) {
                    data.age++;
                    if (data.age < 2) {
                        data.generation = "YOUNG";
                    } else if (data.age < 4) {
                        data.generation = "SURVIVOR";
                    } else {
                        data.generation = "OLD";
                    }
                }
            }
        }
    }

    private static List<Object> getReferencedObjects(Object obj) {
        List<Object> refs = new ArrayList<>();
        if (obj == null) return refs;
        Class<?> cls = obj.getClass();
        if (cls.isArray()) {
            if (!cls.getComponentType().isPrimitive()) {
                try {
                    int length = java.lang.reflect.Array.getLength(obj);
                    for (int i = 0; i < length; i++) {
                        Object val = java.lang.reflect.Array.get(obj, i);
                        if (val != null) refs.add(val);
                    }
                } catch (Exception ignored) {}
            }
        } else {
            while (cls != null && cls != Object.class) {
                for (Field field : cls.getDeclaredFields()) {
                    if (java.lang.reflect.Modifier.isStatic(field.getModifiers())) continue;
                    if (field.getType().isPrimitive()) continue;
                    try {
                        field.setAccessible(true);
                        Object val = field.get(obj);
                        if (val != null) refs.add(val);
                    } catch (Exception ignored) {}
                }
                cls = cls.getSuperclass();
            }
        }
        return refs;
    }

    private static String getCarrierThreadName(Thread thread) {
        if (!thread.isVirtual()) return null;
        try {
            Field carrierField = thread.getClass().getDeclaredField("carrierThread");
            carrierField.setAccessible(true);
            Thread carrier = (Thread) carrierField.get(thread);
            if (carrier != null) {
                return carrier.getName();
            }
        } catch (Exception e1) {
            try {
                Class<?> vtClass = Class.forName("java.lang.VirtualThread");
                if (vtClass.isInstance(thread)) {
                    Field carrierField = vtClass.getDeclaredField("carrierThread");
                    carrierField.setAccessible(true);
                    Thread carrier = (Thread) carrierField.get(thread);
                    if (carrier != null) return carrier.getName();
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    private static String getParentThreadName(Thread thread) {
        try {
            Field containerField = Thread.class.getDeclaredField("container");
            containerField.setAccessible(true);
            Object container = containerField.get(thread);
            if (container != null) {
                java.lang.reflect.Method ownerMethod = container.getClass().getDeclaredMethod("owner");
                ownerMethod.setAccessible(true);
                Thread owner = (Thread) ownerMethod.invoke(container);
                if (owner != null) {
                    return owner.getName();
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private static List<SnapshotData.SpringBeanData> collectSpringBeans() {
        List<SnapshotData.SpringBeanData> beans = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : registeredSpringBeans.entrySet()) {
            String className = entry.getKey();
            SnapshotData.SpringBeanData bean = new SnapshotData.SpringBeanData();
            bean.className = className;
            String simpleName = className.substring(className.lastIndexOf('.') + 1);
            bean.name = Character.toLowerCase(simpleName.charAt(0)) + simpleName.substring(1);
            bean.dependencies = new ArrayList<>(entry.getValue());
            beans.add(bean);
        }
        return beans;
    }

    public static void registerClass(String className, ClassLoader loader) {
        String clName = loader == null ? "Bootstrap" : loader.getClass().getName() + "@" + Integer.toHexString(loader.hashCode());
        registeredLoaders.put(clName, loader);
        loaderToClasses.computeIfAbsent(clName, k -> new ArrayList<>()).add(className);
    }

    public static void registerMethodBytecode(String className, String methodName, String[] instructions, int[] lines) {
        String key = className + "." + methodName;
        List<SnapshotData.BytecodeInstruction> list = new ArrayList<>();
        for (int i = 0; i < instructions.length; i++) {
            SnapshotData.BytecodeInstruction bi = new SnapshotData.BytecodeInstruction();
            bi.instruction = instructions[i];
            bi.lineNumber = lines[i];
            list.add(bi);
        }
        methodBytecodeMap.put(key, list);
    }

    public static void onMethodException(Throwable t) {
        String threadName = Thread.currentThread().getName();
        Deque<SnapshotData.FrameData> stack = shadowStacks.get(threadName);
        if (stack != null && !stack.isEmpty()) {
            SnapshotData.FrameData frame = stack.peek();
            frame.faulted = true;
            frame.exceptionMessage = t.getClass().getSimpleName() + ": " + t.getMessage();
        }
        emitSnapshot("EXCEPTION_THROWN", t.getClass().getName(), "thrown", -1);
    }

    private static List<SnapshotData.ClassLoaderNode> collectClassLoaders() {
        List<SnapshotData.ClassLoaderNode> list = new ArrayList<>();
        for (Map.Entry<String, ClassLoader> entry : registeredLoaders.entrySet()) {
            String clName = entry.getKey();
            ClassLoader cl = entry.getValue();
            SnapshotData.ClassLoaderNode node = new SnapshotData.ClassLoaderNode();
            node.name = clName;
            if (cl != null) {
                ClassLoader parent = cl.getParent();
                node.parentName = parent == null ? "Bootstrap" : parent.getClass().getName() + "@" + Integer.toHexString(parent.hashCode());
            }
            List<String> classes = loaderToClasses.get(clName);
            if (classes != null) {
                node.loadedClasses.addAll(classes);
            }
            list.add(node);
        }
        if (!registeredLoaders.containsKey("Bootstrap")) {
            SnapshotData.ClassLoaderNode node = new SnapshotData.ClassLoaderNode();
            node.name = "Bootstrap";
            List<String> classes = loaderToClasses.get("Bootstrap");
            if (classes != null) {
                node.loadedClasses.addAll(classes);
            }
            list.add(node);
        }
        return list;
    }
}
