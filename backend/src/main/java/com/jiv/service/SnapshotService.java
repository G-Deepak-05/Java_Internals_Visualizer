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

@Service
@RequiredArgsConstructor
@Slf4j
public class SnapshotService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String KEY_PREFIX = "jiv:snapshots:";
    private static final long EXPIRY_HOURS = 2;

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

    public int count(String sessionId) {
        try {
            Long size = redisTemplate.opsForList().size(KEY_PREFIX + sessionId);
            return size == null ? 0 : size.intValue();
        } catch (Exception e) {
            return 0;
        }
    }

    public void clear(String sessionId) {
        redisTemplate.delete(KEY_PREFIX + sessionId);
    }
}
