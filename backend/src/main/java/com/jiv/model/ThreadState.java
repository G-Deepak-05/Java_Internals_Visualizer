package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Represents the state of a single JVM thread.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ThreadState {

    /** Thread name */
    private String name;

    /** Thread ID */
    private long id;

    /** State: NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED */
    private String state;

    /** Whether this is a virtual thread (Java 21+) */
    private boolean virtual;

    /** For virtual threads: the carrier thread name */
    private String carrierThread;

    /** Whether this thread holds any monitors */
    private boolean holdsLocks;

    /** Object ID of the monitor this thread is waiting to acquire (if BLOCKED) */
    private String waitingForMonitor;

    /** Object ID of the monitor this thread owns (if any) */
    private String ownsMonitor;

    /** Stack depth */
    private int stackDepth;

    /** Priority */
    private int priority;

    /** Whether this is a daemon thread */
    private boolean daemon;
}
