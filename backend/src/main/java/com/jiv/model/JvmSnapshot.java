package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.*;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class JvmSnapshot {

    private String sessionId;

    private int stepIndex;

    private int lineNumber;

    private String sourceFile;

    private String currentMethod;

    private Map<String, HeapObject> heap = new LinkedHashMap<>();

    private Map<String, List<StackFrame>> stacks = new LinkedHashMap<>();

    private Map<String, ThreadState> threads = new LinkedHashMap<>();

    private List<GcEvent> gcEvents = new ArrayList<>();

    private List<String> stringPool = new ArrayList<>();

    private List<String> loadedClasses = new ArrayList<>();

    private String currentBytecode;

    private List<String> methodBytecode = new ArrayList<>();

    private String eventType;

    private long timestamp;

    private String stdout;
}
