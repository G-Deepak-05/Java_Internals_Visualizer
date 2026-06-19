package com.jiv.agent.emitter;

import com.google.gson.*;
import com.jiv.agent.snapshot.*;

import java.io.*;
import java.util.*;
import java.util.concurrent.*;

public class EventEmitter {

    private static final EventEmitter INSTANCE = new EventEmitter();
    private final Gson gson = new GsonBuilder().serializeNulls().create();
    private final BlockingQueue<String> queue = new LinkedBlockingQueue<>(10_000);
    private final PrintStream out;
    private final Thread writerThread;
    private volatile boolean running = true;

    private EventEmitter() {

        this.out = System.out;

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

    public void emit(SnapshotData snapshot) {
        try {
            String json = gson.toJson(snapshot);
            queue.offer(json, 50, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

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
