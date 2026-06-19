package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ThreadState {

    private String name;

    private long id;

    private String state;

    private boolean virtual;

    private String carrierThread;

    private boolean holdsLocks;

    private String waitingForMonitor;

    private String ownsMonitor;

    private int stackDepth;

    private boolean deadlocked;

    private String parentThreadName;

    private int priority;

    private boolean daemon;
}
