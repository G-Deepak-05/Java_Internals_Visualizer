package com.jiv.agent;

import com.jiv.agent.listeners.ClassTransformer;
import com.jiv.agent.emitter.EventEmitter;

import java.lang.instrument.Instrumentation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class JivAgentMain {

    private static final Logger logger = LoggerFactory.getLogger(JivAgentMain.class);

    public static void premain(String agentArgs, Instrumentation inst) {
        logger.info("[JIV Agent] Initializing...");

        EventEmitter emitter = EventEmitter.getInstance();

        inst.addTransformer(new ClassTransformer(emitter, inst), true);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            emitter.flush();
            logger.info("[JIV Agent] Shutdown complete.");
        }));

        logger.info("[JIV Agent] Ready. Transforming classes...");
    }

    public static void agentmain(String agentArgs, Instrumentation inst) {
        premain(agentArgs, inst);
    }
}
