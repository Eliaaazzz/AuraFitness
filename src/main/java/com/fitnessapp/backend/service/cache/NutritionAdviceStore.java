package com.fitnessapp.backend.service.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
@Slf4j
public class NutritionAdviceStore {

  private static final Duration DEFAULT_TTL = Duration.ofHours(6);
  private static final String KEY_PREFIX = "nutrition:advice:";

  private final ObjectMapper objectMapper;

  @Autowired(required = false)
  private StringRedisTemplate redisTemplate;

  private final ConcurrentHashMap<String, CacheRecord> fallback = new ConcurrentHashMap<>();

  public AdviceEntry get(UUID userId, LocalDate weekStart) {
    String key = cacheKey(userId, weekStart);
    if (redisTemplate != null) {
      String value = redisTemplate.opsForValue().get(key);
      if (!StringUtils.hasText(value)) {
        return null;
      }
      try {
        return objectMapper.readValue(value, AdviceEntry.class);
      } catch (JsonProcessingException e) {
        log.warn("Failed to parse cached nutrition advice for key {}", key, e);
        redisTemplate.delete(key);
        return null;
      }
    }

    CacheRecord record = fallback.get(key);
    if (record == null || record.isExpired()) {
      fallback.remove(key);
      return null;
    }
    return record.entry();
  }

  public void put(UUID userId, LocalDate weekStart, AdviceEntry entry) {
    String key = cacheKey(userId, weekStart);
    if (redisTemplate != null) {
      try {
        redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(entry), DEFAULT_TTL);
      } catch (JsonProcessingException e) {
        log.warn("Failed to serialise nutrition advice for Redis cache", e);
      }
      return;
    }

    fallback.put(key, new CacheRecord(entry, Instant.now().plus(DEFAULT_TTL)));
  }

  public void invalidate(UUID userId) {
    String pattern = KEY_PREFIX + userId + ":*";
    if (redisTemplate != null) {
      var keys = redisTemplate.keys(pattern);
      if (keys != null && !keys.isEmpty()) {
        redisTemplate.delete(keys);
      }
      return;
    }
    fallback.keySet().removeIf(key -> key.startsWith(KEY_PREFIX + userId + ":"));
  }

  public void invalidate(UUID userId, LocalDate weekStart) {
    String key = cacheKey(userId, weekStart);
    if (redisTemplate != null) {
      redisTemplate.delete(key);
      return;
    }
    fallback.remove(key);
  }

  public void refresh(UUID userId, LocalDate weekStart) {
    String key = cacheKey(userId, weekStart);
    if (redisTemplate != null) {
      redisTemplate.expire(key, DEFAULT_TTL);
      return;
    }
    fallback.computeIfPresent(key, (k, record) -> record.refresh(DEFAULT_TTL));
  }

  public boolean signatureMatches(UUID userId, LocalDate weekStart, String signature) {
    AdviceEntry entry = get(userId, weekStart);
    return entry != null && signature.equals(entry.signature());
  }

  private String cacheKey(UUID userId, LocalDate weekStart) {
    return KEY_PREFIX + userId + ":" + weekStart;
  }

  public record AdviceEntry(String signature, String advice) {}

  private record CacheRecord(AdviceEntry entry, Instant expiresAt) {
    boolean isExpired() {
      return Instant.now().isAfter(expiresAt);
    }

    CacheRecord refresh(Duration ttl) {
      return new CacheRecord(entry, Instant.now().plus(ttl));
    }
  }
}
