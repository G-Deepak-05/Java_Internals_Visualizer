package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Map;

/**
 * Represents a single heap-allocated object.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class HeapObject {

    /** Unique object ID (e.g., "obj_102") */
    private String id;

    /** Simple class name (e.g., "User", "ArrayList") */
    private String className;

    /** Fully qualified class name */
    private String qualifiedClassName;

    /** Field name -> value (primitive or object ID reference) */
    private Map<String, Object> fields;

    /** Array elements, if this object is an array */
    private Object[] arrayElements;

    /** Whether this is an array */
    private boolean isArray;

    /** Whether this is a String */
    private boolean isString;

    /** String value, if applicable */
    private String stringValue;

    /** Generational region: YOUNG, SURVIVOR, OLD */
    private String generation = "YOUNG";

    /** Whether this object is reachable from GC roots */
    private boolean reachable = true;

    /** Number of references to this object */
    private int refCount;

    /** Object size in bytes (approximate) */
    private long sizeBytes;

    /** Whether this object is in the string pool */
    private boolean inStringPool;
}
