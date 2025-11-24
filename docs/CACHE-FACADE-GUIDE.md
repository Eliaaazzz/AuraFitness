# Cache Facade Usage Guide

## Overview

The `IndexedCacheFacade` provides a unified caching abstraction that supports both Redis-backed caching and in-memory fallback. It groups related cache entries using an "index key" pattern, enabling efficient bulk invalidation (e.g., clear all cache entries for a specific user).

## Architecture

```
GenericCacheStore<T> (abstract)
    ↓ extends
NutritionAdviceStore, LeaderboardCacheStore, etc.
    ↓ uses
IndexedCacheFacade
    ↓ delegates to
Spring CacheManager (Redis) + In-memory fallback
```

## Core Components

### 1. IndexedCacheFacade

Low-level cache facade that manages:
- Cache storage via Spring's `CacheManager`
- In-memory fallback when Redis is unavailable
- Index-based grouping for bulk operations
- TTL management

### 2. GenericCacheStore<T>

Abstract base class that simplifies creating domain-specific cache stores. Provides:
- Type-safe cache operations
- Consistent API across all cache stores
- Built-in TTL management
- Namespace-based invalidation

### 3. Domain-Specific Stores

Concrete implementations like `NutritionAdviceStore` and `LeaderboardCacheStore` that define:
- Cache name constants
- TTL durations
- Key generation strategies
- Domain-specific convenience methods

## Creating a New Cache Store

### Step 1: Define Your Cache Store

```java
package com.fitnessapp.backend.service.cache;

import java.time.Duration;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class UserPreferencesStore extends GenericCacheStore<UserPreferencesStore.PreferencesSnapshot> {

  private static final String CACHE_NAME = "user-preferences";
  private static final Duration TTL = Duration.ofHours(24);

  public UserPreferencesStore(IndexedCacheFacade cacheFacade) {
    super(cacheFacade, CACHE_NAME, TTL, PreferencesSnapshot.class);
  }

  // Domain-specific methods
  public PreferencesSnapshot get(UUID userId) {
    return get(cacheKey(userId));
  }

  public void put(UUID userId, PreferencesSnapshot prefs) {
    put(indexKey(userId), cacheKey(userId), prefs);
  }

  public void invalidate(UUID userId) {
    invalidateNamespace(indexKey(userId));
  }

  // Key generation helpers
  private String cacheKey(UUID userId) {
    return "user-prefs:" + userId;
  }

  private String indexKey(UUID userId) {
    return "user-prefs:idx:" + userId;
  }

  // Value object
  public record PreferencesSnapshot(
      String theme,
      String locale,
      boolean notificationsEnabled
  ) {}
}
```

### Step 2: Inject and Use in Your Service

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class UserPreferencesService {

  private final UserPreferencesStore cacheStore;
  private final UserPreferencesRepository repository;

  @Transactional(readOnly = true)
  public PreferencesSnapshot getPreferences(UUID userId) {
    // Try cache first
    PreferencesSnapshot cached = cacheStore.get(userId);
    if (cached != null) {
      log.debug("Cache hit for user preferences: userId={}", userId);
      return cached;
    }

    // Cache miss - load from database
    log.debug("Cache miss for user preferences: userId={}", userId);
    UserPreferences entity = repository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("Preferences not found"));
    
    PreferencesSnapshot snapshot = toSnapshot(entity);
    cacheStore.put(userId, snapshot);
    
    return snapshot;
  }

  @Transactional
  public void updatePreferences(UUID userId, PreferencesSnapshot updated) {
    // Update database
    UserPreferences entity = repository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("Preferences not found"));
    entity.setTheme(updated.theme());
    entity.setLocale(updated.locale());
    entity.setNotificationsEnabled(updated.notificationsEnabled());
    repository.save(entity);

    // Refresh cache
    cacheStore.put(userId, updated);
    log.info("Preferences updated for user {}", userId);
  }

  @Transactional
  public void deletePreferences(UUID userId) {
    repository.deleteById(userId);
    cacheStore.invalidate(userId);
    log.info("Preferences deleted for user {}", userId);
  }
}
```

## Key Design Patterns

### 1. Index Key Pattern

Use an index key to group related cache entries:

```java
// Index key: groups all entries for a user
String indexKey = "user-prefs:idx:" + userId;

// Cache keys: individual entries
String cacheKey1 = "user-prefs:" + userId;
String cacheKey2 = "user-prefs:" + userId + ":theme";

// Store with index
put(indexKey, cacheKey1, value1);
put(indexKey, cacheKey2, value2);

// Bulk invalidation
invalidateNamespace(indexKey); // Clears both entries
```

### 2. Composite Keys

For multi-dimensional caching:

```java
public WorkoutPlanSnapshot get(UUID userId, LocalDate weekStart) {
  String key = String.format("workout-plan:%s:%s", userId, weekStart);
  return get(key);
}

public void put(UUID userId, LocalDate weekStart, WorkoutPlanSnapshot plan) {
  String indexKey = "workout-plan:idx:" + userId;
  String cacheKey = String.format("workout-plan:%s:%s", userId, weekStart);
  put(indexKey, cacheKey, plan);
}
```

### 3. Selective Invalidation

Invalidate specific entries or entire namespaces:

```java
// Invalidate one specific week's plan
invalidateEntry(
    "workout-plan:idx:" + userId,
    "workout-plan:" + userId + ":" + weekStart
);

// Invalidate all plans for a user
invalidateNamespace("workout-plan:idx:" + userId);
```

## Best Practices

### 1. TTL Selection

Choose appropriate TTLs based on data volatility:

```java
// Frequently changing data
Duration.ofMinutes(5)    // Real-time leaderboards
Duration.ofMinutes(30)   // User sessions

// Moderately stable data
Duration.ofHours(1)      // User preferences
Duration.ofHours(6)      // Nutrition advice

// Rarely changing data
Duration.ofHours(24)     // System configurations
Duration.ofDays(7)       // Static content
```

### 2. Cache Key Naming

Use consistent, descriptive key formats:

```java
// Good
"user-prefs:123e4567-e89b-12d3-a456-426614174000"
"leaderboard:weekly:2024-W01"
"workout-plan:uuid:2024-01-15"

// Avoid
"cache_1"
"data"
"temp_123"
```

### 3. Metrics and Monitoring

Add metrics for cache operations:

```java
public PreferencesSnapshot get(UUID userId) {
  long start = System.nanoTime();
  PreferencesSnapshot result = cacheStore.get(userId);
  long duration = System.nanoTime() - start;
  
  meterRegistry.timer("cache.access", 
      "store", "user-preferences",
      "hit", Boolean.toString(result != null))
      .record(duration, TimeUnit.NANOSECONDS);
  
  return result;
}
```

### 4. Logging Strategy

Use structured logging for observability:

```java
// Trace: Low-level operations
log.trace("Cache operation: get key={}", cacheKey);

// Debug: Cache hits/misses
log.debug("Cache hit for user preferences: userId={}", userId);

// Info: Business events
log.info("Preferences updated for user {} (cached)", userId);

// Warn: Fallback scenarios
log.warn("Redis unavailable, using in-memory cache");
```

## Common Use Cases

### 1. User Library (Current Implementation)

Caches saved workouts and recipes with pagination support:

```java
// Save operations are idempotent and return full objects
SavedWorkout saved = libraryService.saveWorkout(userId, workoutId);
// Returns: { id, title, ..., savedAt, alreadySaved: true/false }

// List operations support pagination and sorting
PageResult<SavedWorkout> page = libraryService.getSavedWorkouts(
    userId, 
    0,      // page
    20,     // size
    Sort.by(Direction.DESC, "savedAt")
);

// Remove operations are idempotent
boolean removed = libraryService.removeWorkout(userId, workoutId);
```

### 2. Nutrition Advice

Weekly nutrition advice cached per user:

```java
AdviceEntry advice = nutritionAdviceStore.get(userId, weekStart);
if (advice == null) {
  advice = generateAdvice(userId, weekStart);
  nutritionAdviceStore.put(userId, weekStart, advice);
}
```

### 3. Leaderboards

Temporary leaderboard snapshots:

```java
LeaderboardSnapshot snapshot = leaderboardStore.get(owner, scope);
if (snapshot == null || isStale(snapshot)) {
  snapshot = computeLeaderboard(owner, scope);
  leaderboardStore.put(owner, scope, snapshot);
}
```

## Testing Cache Stores

### Unit Tests

```java
@ExtendWith(MockitoExtension.class)
class UserPreferencesStoreTest {

  @Mock
  private IndexedCacheFacade cacheFacade;
  
  private UserPreferencesStore store;

  @BeforeEach
  void setUp() {
    store = new UserPreferencesStore(cacheFacade);
  }

  @Test
  void getCachesPreferences() {
    UUID userId = UUID.randomUUID();
    PreferencesSnapshot prefs = new PreferencesSnapshot("dark", "en", true);
    
    when(cacheFacade.get(anyString(), anyString(), eq(PreferencesSnapshot.class)))
        .thenReturn(prefs);
    
    PreferencesSnapshot result = store.get(userId);
    
    assertThat(result).isEqualTo(prefs);
    verify(cacheFacade).get(
        eq("user-preferences"),
        eq("user-prefs:" + userId),
        eq(PreferencesSnapshot.class)
    );
  }
}
```

### Integration Tests

```java
@SpringBootTest
@Testcontainers
class UserPreferencesCacheIntegrationTest {

  @Container
  static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
      .withExposedPorts(6379);

  @Autowired
  private UserPreferencesStore store;

  @Test
  void cacheSurvivesRoundTrip() {
    UUID userId = UUID.randomUUID();
    PreferencesSnapshot original = new PreferencesSnapshot("light", "fr", false);
    
    store.put(userId, original);
    PreferencesSnapshot retrieved = store.get(userId);
    
    assertThat(retrieved).isEqualTo(original);
  }
}
```

## Troubleshooting

### Cache Misses

```java
// Enable debug logging
logging.level.com.fitnessapp.backend.service.cache=DEBUG

// Check metrics
cache.access{store=user-preferences,hit=false}
```

### Memory Leaks

```java
// Ensure TTLs are set appropriately
// Verify index keys are used for bulk cleanup
// Monitor fallback cache size
```

### Stale Data

```java
// Implement cache invalidation on updates
@Transactional
public void updateEntity(UUID id, Data data) {
  repository.save(entity);
  cacheStore.invalidate(id);  // Don't forget this!
}
```

## Migration Checklist

When adding a new cache store:

- [ ] Extend `GenericCacheStore<T>`
- [ ] Define cache name constant
- [ ] Set appropriate TTL
- [ ] Implement key generation methods
- [ ] Add domain-specific convenience methods
- [ ] Inject into service layer
- [ ] Add unit tests
- [ ] Add integration tests (optional)
- [ ] Configure metrics
- [ ] Update monitoring dashboards
- [ ] Document cache key patterns

## Related Documentation

- [User Library API](./README.md) - Library feature documentation
- [Spring Cache Documentation](https://docs.spring.io/spring-framework/reference/integration/cache.html)
- [Micrometer Metrics](https://micrometer.io/docs)

## Example Repositories

All cache stores follow this pattern:

1. `NutritionAdviceStore` - Weekly nutrition advice per user
2. `LeaderboardCacheStore` - Leaderboard snapshots by scope
3. `UserPreferencesStore` - User settings and preferences (example above)
