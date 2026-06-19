package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Map;

/**
 * Represents one stack frame in a thread's call stack.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class StackFrame {

    /** Method simple name */
    private String methodName;

    /** Class simple name */
    private String className;

    /** Fully qualified class name */
    private String qualifiedClassName;

    /** Current line number being executed within this frame */
    private int lineNumber;

    /** Local variables: name -> value (primitives inline, objects = object ID ref) */
    private Map<String, Object> locals;

    /** Method parameters (subset of locals, shown separately for clarity) */
    private Map<String, Object> parameters;

    /** Return value (populated when frame is about to exit) */
    private Object returnValue;

    /** Recursion depth (0 = outermost invocation of this method name) */
    private int recursionDepth;

    /** Frame index from top of stack (0 = topmost/active frame) */
    private int frameIndex;

    /** Whether this frame is the currently active one */
    private boolean active;
}
