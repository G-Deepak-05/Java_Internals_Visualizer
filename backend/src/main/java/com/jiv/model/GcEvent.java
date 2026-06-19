package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;

/**
 * Represents a GC event that occurred during execution.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GcEvent {

    /** Event type: MINOR_GC, MAJOR_GC, FULL_GC */
    private String type;

    /** GC phase: MARK, SWEEP, COMPACT, PROMOTE */
    private String phase;

    /** List of object IDs that were collected (freed) */
    private List<String> collectedObjectIds;

    /** List of object IDs promoted to Old generation */
    private List<String> promotedObjectIds;

    /** Time taken (ms) */
    private long durationMs;

    /** Heap before GC (bytes used) */
    private long heapBeforeBytes;

    /** Heap after GC (bytes used) */
    private long heapAfterBytes;

    /** Step index when this GC event occurred */
    private int stepIndex;
}
