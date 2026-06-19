package com.jiv.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jiv.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExecutionService {

    private final SimpMessagingTemplate messagingTemplate;
    private final SnapshotService snapshotService;
    private final ObjectMapper objectMapper;
    private final Map<String, Process> activeProcesses = new ConcurrentHashMap<>();

    @Value("${jiv.sandbox.timeout-seconds:15}")
    private int timeoutSeconds;

    @Value("${jiv.sandbox.memory-limit-mb:256}")
    private int memoryLimitMb;

    @Value("${jiv.sandbox.agent-jar-path}")
    private String agentJarPath;

    @Async
    public void executeAsync(String sessionId, ExecutionRequest request) {
        log.info("[{}] Starting execution", sessionId);

        try {

            Path workDir = createWorkDir(sessionId, request.getCode(), request.getMainClass());

            String compileError = compileCode(workDir, request.getMainClass());
            if (compileError != null) {
                sendError(sessionId, "Compilation failed:\n" + compileError);
                return;
            }

            runWithAgent(sessionId, workDir, request);

        } catch (Exception e) {
            log.error("[{}] Execution error", sessionId, e);
            sendError(sessionId, "Internal error: " + e.getMessage());
        }
    }

    private Path createWorkDir(String sessionId, String code, String mainClass) throws IOException {
        Path workDir = Files.createTempDirectory("jiv_" + sessionId);

        Path sourceFile = workDir.resolve(mainClass + ".java");
        Files.writeString(sourceFile, code);
        log.debug("[{}] Wrote source to {}", sessionId, sourceFile);
        return workDir;
    }

    private String compileCode(Path workDir, String mainClass) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder("javac",
                "-g",                    
                "-source", "21",
                "-target", "21",
                mainClass + ".java");
        pb.directory(workDir.toFile());
        pb.redirectErrorStream(true);

        Process process = pb.start();
        String output = new String(process.getInputStream().readAllBytes());
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            return output;
        }
        return null; 
    }

    private void runWithAgent(String sessionId, Path workDir, ExecutionRequest request) 
            throws IOException, InterruptedException {

        boolean useDocker = isDockerAvailable();
        log.info("[{}] Using Docker: {}", sessionId, useDocker);

        Process process;
        if (useDocker) {
            process = runInDocker(sessionId, workDir, request);
        } else {
            process = runDirectly(sessionId, workDir, request);
        }

        activeProcesses.put(sessionId, process);

        try {

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {

                String line;
                int stepIndex = 0;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("{")) { 
                        try {
                            JvmSnapshot snapshot = objectMapper.readValue(line, JvmSnapshot.class);
                            snapshot.setSessionId(sessionId);
                            snapshot.setStepIndex(stepIndex++);

                            snapshotService.store(sessionId, snapshot);

                            messagingTemplate.convertAndSend(
                                "/topic/jvm/" + sessionId, snapshot);

                        } catch (Exception e) {
                            log.warn("[{}] Failed to parse snapshot line: {}", sessionId, line);
                        }
                    } else if (!line.isBlank()) {
                        log.info("[{}] Agent output: {}", sessionId, line);
                    }
                }
            }
        } finally {
            boolean wasStopped = !activeProcesses.containsKey(sessionId);
            activeProcesses.remove(sessionId);

            if (wasStopped) {
                sendError(sessionId, "Execution stopped by user");
            } else {
                boolean finished = process.waitFor(timeoutSeconds + 5L, TimeUnit.SECONDS);
                if (!finished) {
                    process.destroyForcibly();
                    sendError(sessionId, "Execution timed out after " + timeoutSeconds + " seconds");
                } else {

                    JvmSnapshot done = new JvmSnapshot();
                    done.setSessionId(sessionId);
                    done.setEventType("EXECUTION_COMPLETE");
                    done.setStepIndex(snapshotService.count(sessionId));
                    messagingTemplate.convertAndSend("/topic/jvm/" + sessionId, done);
                    log.info("[{}] Execution complete. {} snapshots captured.", sessionId, done.getStepIndex());
                }
            }
        }
    }

    public void stopExecution(String sessionId) {
        Process process = activeProcesses.remove(sessionId);
        if (process != null) {
            process.destroyForcibly();
            log.info("[{}] Process destroyed by user stop request", sessionId);
        }
    }

    private Process runInDocker(String sessionId, Path workDir, ExecutionRequest request) 
            throws IOException {
        List<String> cmd = new ArrayList<>(Arrays.asList(
            "docker", "run", "--rm",
            "--memory=" + memoryLimitMb + "m",
            "--cpus=0.5",
            "--network=none",
            "--read-only",
            "--tmpfs=/tmp",
            "-v", workDir.toAbsolutePath() + ":/code:ro",
            "-v", getAgentJarPath() + ":/agent/jiv-agent.jar:ro",
            "eclipse-temurin:21-jre",
            "java",
            "-javaagent:/agent/jiv-agent.jar",
            "-cp", "/code",
            request.getMainClass()
        ));

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.redirectErrorStream(true);
        return pb.start();
    }

    private Process runDirectly(String sessionId, Path workDir, ExecutionRequest request) 
            throws IOException {

        String agentJar = getAgentJarPath();
        List<String> cmd = new ArrayList<>(Arrays.asList(
            "java",
            "-javaagent:" + agentJar,
            "-cp", workDir.toAbsolutePath().toString(),
            request.getMainClass()
        ));

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(workDir.toFile());
        pb.redirectErrorStream(true);
        return pb.start();
    }

    private boolean isDockerAvailable() {
        try {
            Process p = new ProcessBuilder("docker", "info").start();
            return p.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private String getAgentJarPath() {

        String path = System.getProperty("jiv.agent.jar", "");
        if (!path.isEmpty()) return path;

        if (agentJarPath != null && !agentJarPath.isEmpty()) {
            File file = new File(agentJarPath);
            if (file.exists()) {
                return file.getAbsolutePath();
            }
        }

        File agentTargetDir = new File("../agent/target");
        if (agentTargetDir.exists() && agentTargetDir.isDirectory()) {
            File[] files = agentTargetDir.listFiles((dir, name) -> name.startsWith("jiv-agent") && name.endsWith(".jar") && !name.startsWith("original-"));
            if (files != null && files.length > 0) {
                return files[0].getAbsolutePath();
            }
        }

        return "/agent/jiv-agent.jar";
    }

    private void sendError(String sessionId, String message) {
        JvmSnapshot error = new JvmSnapshot();
        error.setSessionId(sessionId);
        error.setEventType("ERROR");

        error.setCurrentBytecode(message);
        messagingTemplate.convertAndSend("/topic/jvm/" + sessionId, error);
    }
}
