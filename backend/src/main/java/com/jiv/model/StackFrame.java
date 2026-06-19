package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class StackFrame {

    private String methodName;

    private String className;

    private String qualifiedClassName;

    private int lineNumber;

    private Map<String, Object> locals;

    private Map<String, Object> parameters;

    private Object returnValue;

    private int recursionDepth;

    private int frameIndex;

    private boolean active;
}
