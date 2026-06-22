package com.jiv.model;

import lombok.Data;
import java.util.Map;
import java.util.LinkedHashMap;

@Data
public class TelemetryData {
    private long totalHeapSize;
    private long allocationRate;
    private Map<String, Integer> classCounts = new LinkedHashMap<>();
}
