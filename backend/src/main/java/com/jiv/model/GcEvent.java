package com.jiv.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GcEvent {

    private String type;

    private String phase;

    private List<String> collectedObjectIds;

    private List<String> promotedObjectIds;

    private long durationMs;

    private long heapBeforeBytes;

    private long heapAfterBytes;

    private int stepIndex;
}
