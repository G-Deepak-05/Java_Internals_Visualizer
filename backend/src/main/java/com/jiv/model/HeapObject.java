package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class HeapObject {

    private String id;

    private String className;

    private String qualifiedClassName;

    private Map<String, Object> fields;

    private Object[] arrayElements;

    private boolean isArray;

    private boolean isString;

    private String stringValue;

    private String generation = "YOUNG";

    private boolean reachable = true;

    private int refCount;

    private int age;

    private long sizeBytes;

    private boolean inStringPool;
}
