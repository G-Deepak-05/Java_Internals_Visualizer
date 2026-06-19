package com.jiv.controller;

import com.jiv.model.ExecutionRequest;
import com.jiv.model.ExecutionResponse;
import com.jiv.model.JvmSnapshot;
import com.jiv.service.ExecutionService;
import com.jiv.service.SnapshotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class ExecutionController {

    private final ExecutionService executionService;
    private final SnapshotService snapshotService;

    @PostMapping("/execute")
    public ResponseEntity<ExecutionResponse> execute(@RequestBody ExecutionRequest request) {
        if (request.getCode() == null || request.getCode().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ExecutionResponse.error(null, "Code cannot be empty"));
        }

        String sessionId = UUID.randomUUID().toString();
        log.info("New execution request: sessionId={}", sessionId);

        executionService.executeAsync(sessionId, request);

        return ResponseEntity.ok(ExecutionResponse.queued(sessionId));
    }

    @PostMapping("/execute/{sessionId}/stop")
    public ResponseEntity<Void> stop(@PathVariable String sessionId) {
        log.info("Stop execution request for sessionId={}", sessionId);
        executionService.stopExecution(sessionId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/snapshots/{sessionId}")
    public ResponseEntity<List<JvmSnapshot>> getSnapshots(@PathVariable String sessionId) {
        List<JvmSnapshot> snapshots = snapshotService.getAll(sessionId);
        return ResponseEntity.ok(snapshots);
    }

    @GetMapping("/snapshots/{sessionId}/{stepIndex}")
    public ResponseEntity<JvmSnapshot> getSnapshot(
            @PathVariable String sessionId,
            @PathVariable int stepIndex) {
        return snapshotService.getByStep(sessionId, stepIndex)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("JIV Backend OK");
    }
}
