package com.jiv.agent.emitter;

import com.google.gson.*;
import com.jiv.agent.snapshot.*;

import java.io.*;
import java.util.*;
import java.util.concurrent.*;

/**
 * Singleton emitter that writes JvmSnapshot JSON to stdout.
 * Each line on stdout is a complete, valid JSON object representing one JVM state snapshot.
 * The backend ExecutionService reads these lines and parses them.
 *
 * Uses a blocking queue + dedicated writer thread to avoid blocking the instrumented threads.
 */
public class EventEmitter {

    private static final EventEmitter INSTANCE = new EventEmitter();
    private final Gson gson = new GsonBuilder().serializeNulls().create();
    private final BlockingQueue<String> queue = new LinkedBlockingQueue<>(10_000);
    private final PrintStream out;
    private final Thread writerThread;
    private volatile boolean running = true;

    private EventEmitter() {
        // Reserve System.out for our JSON output exclusively
        this.out = System.out;

        // Redirect System.out for user code so it doesn't corrupt our JSON stream
        System.setOut(new PrintStream(new OutputStream() {
            @Override public void write(int b) throws IOException {
                com.jiv.agent.listeners.JivRuntime.appendStdoutChar((char) b);
                System.err.write(b);
            }
            @Override public void write(byte[] b, int off, int len) throws IOException {
                com.jiv.agent.listeners.JivRuntime.appendStdout(new String(b, off, len));
                System.err.write(b, off, len);
            }
        }));

        // Dedicated writer thread — drains the queue and writes JSON lines
        this.writerThread = new Thread(() -> {
            while (running || !queue.isEmpty()) {
                try {
                    String line = queue.poll(100, TimeUnit.MILLISECONDS);
                    if (line != null) {
                        out.println(line);
                        out.flush();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }, "jiv-emitter");
        this.writerThread.setDaemon(true);
        this.writerThread.start();
    }

    public static EventEmitter getInstance() {
        return INSTANCE;
    }

    /**
     * Emits a snapshot — queues it for async JSON serialization and writing.
     */
    public void emit(SnapshotData snapshot) {
        try {
            String json = gson.toJson(snapshot);
            queue.offer(json, 50, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Flushes all pending events to stdout. Called on shutdown.
     */
    public void flush() {
        running = false;
        try {
            writerThread.join(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        out.flush();
    }
}
