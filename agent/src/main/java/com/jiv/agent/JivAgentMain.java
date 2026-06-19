package com.jiv.agent;

import com.jiv.agent.listeners.ClassTransformer;
import com.jiv.agent.emitter.EventEmitter;

import java.lang.instrument.Instrumentation;

/**
 * JIV Java Agent entry point.
 *
 * Attached to user programs via: -javaagent:jiv-agent.jar
 *
 * This agent:
 * 1. Registers a ClassFileTransformer to instrument user classes at load time
 * 2. Uses ASM to inject snapshot-capture calls at method entry/exit and line changes
 * 3. Emits JvmSnapshot JSON to stdout, one JSON line per snapshot
 *
 * The backend ExecutionService reads stdout and parses these JSON lines.
 */
public class JivAgentMain {

    /**
     * Standard premain — called before the main class loads when using -javaagent.
     */
    public static void premain(String agentArgs, Instrumentation inst) {
        System.err.println("[JIV Agent] Initializing...");

        // Initialize the event emitter (writes JSON to stdout)
        EventEmitter emitter = EventEmitter.getInstance();

        // Register the class transformer — instruments user classes with snapshot hooks
        inst.addTransformer(new ClassTransformer(emitter, inst), true);

        // Install shutdown hook to emit final completion event
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            emitter.flush();
            System.err.println("[JIV Agent] Shutdown complete.");
        }));

        System.err.println("[JIV Agent] Ready. Transforming classes...");
    }

    /**
     * Called if agent is attached dynamically at runtime (agentmain).
     */
    public static void agentmain(String agentArgs, Instrumentation inst) {
        premain(agentArgs, inst);
    }
}
