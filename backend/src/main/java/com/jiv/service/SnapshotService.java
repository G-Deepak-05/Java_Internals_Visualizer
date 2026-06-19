package com.jiv.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jiv.model.JvmSnapshot;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Stores and retrieves JVM snapshots for time-travel debugging.
 * Uses Redis as a fast, sorted list per session.
 * Each session key: "jiv:snapshots:{sessionId}" -> List of JSON strings
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SnapshotService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String KEY_PREFIX = "jiv:snapshots:";
    private static final long EXPIRY_HOURS = 2;

    /**
     * Stores a snapshot in Redis under the session's list.
     */
    public void store(String sessionId, JvmSnapshot snapshot) {
        try {
            String key = KEY_PREFIX + sessionId;
            String json = objectMapper.writeValueAsString(snapshot);
            redisTemplate.opsForList().rightPush(key, json);
            redisTemplate.expire(key, EXPIRY_HOURS, TimeUnit.HOURS);
        } catch (Exception e) {
            log.warn("Failed to store snapshot for session {}: {}", sessionId, e.getMessage());
        }
    }

    /**
     * Retrieves all snapshots for a session, ordered by step index.
     */
    public List<JvmSnapshot> getAll(String sessionId) {
        try {
            String key = KEY_PREFIX + sessionId;
            List<String> jsonList = redisTemplate.opsForList().range(key, 0, -1);
            if (jsonList == null) return Collections.emptyList();

            return jsonList.stream()
                    .map(json -> {
                        try {
                            return objectMapper.readValue(json, JvmSnapshot.class);
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Failed to retrieve snapshots for session {}: {}", sessionId, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Retrieves a specific snapshot by step index.
     */
    public Optional<JvmSnapshot> getByStep(String sessionId, int stepIndex) {
        try {
            String key = KEY_PREFIX + sessionId;
            String json = redisTemplate.opsForList().index(key, stepIndex);
            if (json == null) return Optional.empty();
            return Optional.of(objectMapper.readValue(json, JvmSnapshot.class));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Returns total number of snapshots for a session.
     */
    public int count(String sessionId) {
        try {
            Long size = redisTemplate.opsForList().size(KEY_PREFIX + sessionId);
            return size == null ? 0 : size.intValue();
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Deletes all snapshots for a session.
     */
    public void clear(String sessionId) {
        redisTemplate.delete(KEY_PREFIX + sessionId);
    }
}
