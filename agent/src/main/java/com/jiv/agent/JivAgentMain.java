package com.jiv.agent;

import com.jiv.agent.listeners.ClassTransformer;
import com.jiv.agent.emitter.EventEmitter;

import java.lang.instrument.Instrumentation;

public class JivAgentMain {

    public static void premain(String agentArgs, Instrumentation inst) {
        System.err.println("[JIV Agent] Initializing...");

        EventEmitter emitter = EventEmitter.getInstance();

        inst.addTransformer(new ClassTransformer(emitter, inst), true);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            emitter.flush();
            System.err.println("[JIV Agent] Shutdown complete.");
        }));

        System.err.println("[JIV Agent] Ready. Transforming classes...");
    }

    public static void agentmain(String agentArgs, Instrumentation inst) {
        premain(agentArgs, inst);
    }
}
