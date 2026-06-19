package com.jiv.model;

import lombok.Data;

@Data
public class ExecutionRequest {

    private String code;

    private String mainClass = "Main";

    private String mode = "STEP";

    private int maxSteps = 500;
}
