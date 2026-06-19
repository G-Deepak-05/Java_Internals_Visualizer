package com.jiv.model;

import lombok.Data;

/**
 * Request object for code submission.
 */
@Data
public class ExecutionRequest {

    /** Java source code to execute */
    private String code;

    /** Optional: class name containing main() - defaults to "Main" */
    private String mainClass = "Main";

    /** Execution mode: STEP (line-by-line) or RUN (full execution) */
    private String mode = "STEP";

    /** Maximum steps to capture (safety limit) */
    private int maxSteps = 500;
}
