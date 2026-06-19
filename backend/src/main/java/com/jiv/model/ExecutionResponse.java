package com.jiv.model;

import lombok.Data;

@Data
public class ExecutionResponse {

    private String sessionId;

    private String status;

    private String errorMessage;

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
