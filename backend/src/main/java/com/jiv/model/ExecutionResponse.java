package com.jiv.model;

import lombok.Data;

/**
 * Response after submitting code for execution.
 */
@Data
public class ExecutionResponse {

    /** Unique session ID — subscribe to /topic/jvm/{sessionId} for events */
    private String sessionId;

    /** Initial status: QUEUED, RUNNING, COMPLETED, ERROR */
    private String status;

    /** Error message if status is ERROR */
    private String errorMessage;

    /** Total snapshots captured (available after COMPLETED) */
    private int totalSnapshots;

    public static ExecutionResponse queued(String sessionId) {
        ExecutionResponse r = new ExecutionResponse();
        r.setSessionId(sessionId);
        r.setStatus("QUEUED");
        return r;
    }

    public static ExecutionResponse error(String sessionId, String message) {
        ExecutionResponse r = new ExecutionResponse();
        r.setSessionId(sessionId);
        r.setStatus("ERROR");
        r.setErrorMessage(message);
        return r;
    }
}
