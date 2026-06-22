package com.jiv.model;

import lombok.Data;

@Data
public class BytecodeInstruction {
    private String instruction;
    private int lineNumber;
}
