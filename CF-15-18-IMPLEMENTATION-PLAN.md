# CF-15 to CF-18 Implementation Plan

**Sprint**: 2025-11-06 ~ 2025-11-13
**Total Story Points**: 21

---

## 📋 Research Findings Summary

### Current Architecture Analysis

#### ✅ Caching Infrastructure
- **GenericCacheStore<T>** - Abstract base class for typed cache stores
- **IndexedCacheFacade** - Redis + in-memory fallback with indexed invalidation
- **Existing Stores**: `NutritionAdviceStore`, `LeaderboardCacheStore`
- **CacheConfig** - Spring cache configuration with TTL customization

#### ✅ UI Component Status
- **WorkoutCard** - Has save/remove functionality with Feather bookmark icon
- **RecipeCard** - Has save/remove functionality with Feather bookmark icon
- **WorkoutsScreen** - Complete with sorting, pagination, empty state, FAB
- **RecipesScreen** - Complete with sorting, pagination, empty state, FAB
- **ListSkeleton** - Reusable skeleton loader component
- **Snackbar** - Toast notification system with retry action

#### ✅ AI/Recipe Integration
- **SmartRecipeService** - GPT-4 powered meal plan generation (7-day plans)
- **OpenAiChatCompletionClient** - OpenAI API wrapper with metrics
- **Recipe Entity** - Supports JSON fields (nutrition, steps, swaps)
- **RecipeRepository** - JPA repository with title search

---

## 🎯 CF-15: User Library Cache Optimization

**Priority**: P2 (Medium)
**Story Points**: 5
**Duration**: Day 1-2

### Objectives
1. Reduce database load for saved library queries
2. Improve response time from ~50ms to ~5ms (cache hit)
3. Follow existing cache pattern (GenericCacheStore)
4. Auto-invalidate on save/remove operations

### Technical Design

#### 1. Create `UserLibraryCacheKeys` Utility Class

```java
package com.fitnessapp.backend.service.cache;

import java.util.UUID;
import org.springframework.data.domain.Sort;

public final class UserLibraryCacheKeys {

  public static final String WORKOUTS_CACHE = "user-library-workouts";
  public static final String RECIPES_CACHE = "user-library-recipes";

  private UserLibraryCacheKeys() {}

  // Workout cache keys
  public static String workoutListKey(UUID userId, int page, int size, Sort sort) {
    return String.format("workouts:list:%s:p%d:s%d:%s",
        userId, page, size, sortToString(sort));
  }

  public static String workoutIndexKey(UUID userId) {
    return "workouts:idx:" + userId;
  }

  // Recipe cache keys
  public static String recipeListKey(UUID userId, int page, int size, Sort sort) {
    return String.format("recipes:list:%s:p%d:s%d:%s",
        userId, page, size, sortToString(sort));
  }

  public static String recipeIndexKey(UUID userId) {
    return "recipes:idx:" + userId;
  }

  private static String sortToString(Sort sort) {
    if (sort == null || sort.isUnsorted()) {
      return "default";
    }
    return sort.toString().replaceAll("[^a-zA-Z0-9,:]", "_");
  }
}
```

#### 2. Create `UserLibraryWorkoutCacheStore`

```java
package com.fitnessapp.backend.service.cache;

import com.fitnessapp.backend.service.UserLibraryService.PageResult;
import com.fitnessapp.backend.service.UserLibraryService.SavedWorkout;
import java.time.Duration;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
public class UserLibraryWorkoutCacheStore
    extends GenericCacheStore<PageResult<SavedWorkout>> {

  private static final Duration TTL = Duration.ofMinutes(5);

  public UserLibraryWorkoutCacheStore(IndexedCacheFacade cacheFacade) {
    super(cacheFacade, UserLibraryCacheKeys.WORKOUTS_CACHE, TTL,
        (Class<PageResult<SavedWorkout>>) (Class<?>) PageResult.class);
  }

  public PageResult<SavedWorkout> get(UUID userId, int page, int size, Sort sort) {
    return get(UserLibraryCacheKeys.workoutListKey(userId, page, size, sort));
  }

  public void put(UUID userId, int page, int size, Sort sort,
                  PageResult<SavedWorkout> result) {
    put(
        UserLibraryCacheKeys.workoutIndexKey(userId),
        UserLibraryCacheKeys.workoutListKey(userId, page, size, sort),
        result
    );
  }

  public void invalidateAll(UUID userId) {
    invalidateNamespace(UserLibraryCacheKeys.workoutIndexKey(userId));
  }
}
```

#### 3. Create `UserLibraryRecipeCacheStore`

```java
package com.fitnessapp.backend.service.cache;

import com.fitnessapp.backend.service.UserLibraryService.PageResult;
import com.fitnessapp.backend.service.UserLibraryService.SavedRecipe;
import java.time.Duration;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
public class UserLibraryRecipeCacheStore
    extends GenericCacheStore<PageResult<SavedRecipe>> {

  private static final Duration TTL = Duration.ofMinutes(5);

  public UserLibraryRecipeCacheStore(IndexedCacheFacade cacheFacade) {
    super(cacheFacade, UserLibraryCacheKeys.RECIPES_CACHE, TTL,
        (Class<PageResult<SavedRecipe>>) (Class<?>) PageResult.class);
  }

  public PageResult<SavedRecipe> get(UUID userId, int page, int size, Sort sort) {
    return get(UserLibraryCacheKeys.recipeListKey(userId, page, size, sort));
  }

  public void put(UUID userId, int page, int size, Sort sort,
                  PageResult<SavedRecipe> result) {
    put(
        UserLibraryCacheKeys.recipeIndexKey(userId),
        UserLibraryCacheKeys.recipeListKey(userId, page, size, sort),
        result
    );
  }

  public void invalidateAll(UUID userId) {
    invalidateNamespace(UserLibraryCacheKeys.recipeIndexKey(userId));
  }
}
```

#### 4. Update `CacheConfig.java`

```java
@Bean
@ConditionalOnBean(ConcurrentMapCacheManager.class)
public CacheManagerCustomizer<ConcurrentMapCacheManager> indexedCacheRegistration() {
  return manager -> manager.setCacheNames(Set.of(
      NutritionCacheKeys.ADVICE_CACHE,
      LeaderboardCacheKeys.LEADERBOARD_CACHE,
      UserLibraryCacheKeys.WORKOUTS_CACHE,  // ADD
      UserLibraryCacheKeys.RECIPES_CACHE     // ADD
  ));
}
```

#### 5. Update `UserLibraryService.java`

```java
// Add fields
private final UserLibraryWorkoutCacheStore workoutCacheStore;
private final UserLibraryRecipeCacheStore recipeCacheStore;

// Update getSavedWorkouts
@Transactional(readOnly = true)
public PageResult<SavedWorkout> getSavedWorkouts(UUID userId, int page, int size, Sort sort) {
  log.trace("getSavedWorkouts: userId={}, page={}, size={}, sort={}", userId, page, size, sort);

  // Try cache first
  PageResult<SavedWorkout> cached = workoutCacheStore.get(userId, page, size, sort);
  if (cached != null) {
    log.debug("Cache HIT for user {} saved workouts", userId);
    return cached;
  }

  long startTime = System.nanoTime();
  Pageable pageable = pageRequest(page, size, sort);
  var pageResult = savedWorkoutRepository.findByUser_Id(userId, pageable);
  var workouts = pageResult.getContent().stream()
      .map(entry -> toSavedWorkout(entry.getWorkout(), entry.getSavedAt(), true))
      .collect(Collectors.toList());

  PageResult<SavedWorkout> result = new PageResult<>(
      workouts,
      pageResult.getNumber(),
      pageResult.getSize(),
      pageResult.getTotalElements(),
      pageResult.hasNext());

  // Cache the result
  workoutCacheStore.put(userId, page, size, sort, result);

  long duration = System.nanoTime() - startTime;
  log.debug("Cache MISS - Fetched and cached {} saved workouts for user {} (durationMs={})",
      workouts.size(), userId, duration / 1_000_000);
  meterRegistry.counter("user.library.fetch", "type", "workout", "cached", "false").increment();
  meterRegistry.timer("user.library.fetch.duration", "type", "workout").record(duration, java.util.concurrent.TimeUnit.NANOSECONDS);

  return result;
}

// Update saveWorkout - add cache invalidation
@Transactional
public SavedWorkout saveWorkout(UUID userId, UUID workoutId) {
  // ... existing logic ...

  // Invalidate cache after save
  workoutCacheStore.invalidateAll(userId);

  return toSavedWorkout(persisted.getWorkout(), persisted.getSavedAt(), alreadySaved);
}

// Update removeWorkout - add cache invalidation
@Transactional
public boolean removeWorkout(UUID userId, UUID workoutId) {
  // ... existing logic ...

  // Invalidate cache after remove
  workoutCacheStore.invalidateAll(userId);

  return true;
}

// Similar updates for getSavedRecipes, saveRecipe, removeRecipe
```

### Testing Strategy

#### Unit Tests (`UserLibraryCacheKeysTest.java`)
```java
@Test
void generatesConsistentWorkoutListKeys() {
  UUID userId = UUID.randomUUID();
  Sort sort = Sort.by(Sort.Direction.DESC, "savedAt");

  String key1 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort);
  String key2 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort);

  assertThat(key1).isEqualTo(key2);
}

@Test
void generatesDifferentKeysForDifferentParams() {
  UUID userId = UUID.randomUUID();
  Sort sort1 = Sort.by(Sort.Direction.DESC, "savedAt");
  Sort sort2 = Sort.by(Sort.Direction.ASC, "savedAt");

  String key1 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort1);
  String key2 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort2);

  assertThat(key1).isNotEqualTo(key2);
}
```

#### Integration Tests (`UserLibraryServiceCacheTest.java`)
```java
@Test
void cacheHitAfterFirstFetch() {
  UUID userId = UUID.randomUUID();
  // ... setup data ...

  // First call - cache miss
  var result1 = service.getSavedWorkouts(userId, 0, 20, Sort.by(Sort.Direction.DESC, "savedAt"));

  // Second call - cache hit
  var result2 = service.getSavedWorkouts(userId, 0, 20, Sort.by(Sort.Direction.DESC, "savedAt"));

  assertThat(result1.items()).isEqualTo(result2.items());
  verify(savedWorkoutRepository, times(1)).findByUser_Id(any(), any()); // Only 1 DB call
}

@Test
void cacheInvalidatedAfterSave() {
  UUID userId = UUID.randomUUID();
  // ... setup and fetch to populate cache ...

  service.saveWorkout(userId, UUID.randomUUID());

  // Next fetch should hit DB again
  var result = service.getSavedWorkouts(userId, 0, 20, Sort.by(Sort.Direction.DESC, "savedAt"));

  verify(savedWorkoutRepository, times(2)).findByUser_Id(any(), any());
}
```

### Performance Metrics

**Metrics to Track**:
- `user.library.fetch{type=workout,cached=true|false}` - Counter
- `user.library.cache.hit_rate{type=workout}` - Gauge
- `user.library.fetch.duration{type=workout}` - Timer

**Expected Improvements**:
- Cache hit ratio: > 80% after 1 hour of usage
- P50 response time: 50ms → 5ms (cache hit)
- P99 response time: 200ms → 15ms
- Database load: -70% for read operations

### Migration Path

1. **Phase 1**: Deploy cache stores (no breaking changes)
2. **Phase 2**: Update service layer with cache calls
3. **Phase 3**: Monitor metrics for 24 hours
4. **Phase 4**: Adjust TTL if needed based on hit ratio

### Success Criteria
- [ ] All unit tests pass (>90% coverage)
- [ ] Integration tests verify cache behavior
- [ ] Cache hit ratio > 75% after 1 day
- [ ] No performance regression for write operations
- [ ] Cache invalidation works correctly

---

## 🎨 CF-16: Frontend Save Button UI Enhancement

**Priority**: P1 (High)
**Story Points**: 3
**Duration**: Day 3

### Current State Analysis
- **WorkoutCard** and **RecipeCard** already have bookmark buttons
- Icon: Feather "bookmark" (outline when unsaved, colored when saved)
- Loading state: Managed with `useState(saving)`
- Error handling: Snackbar with retry action
- Color when saved: `#f97316` (orange)

### Improvement Plan

#### 1. Enhanced Visual Feedback

**Update `WorkoutCard.tsx`**:
```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={isSaved ? "Remove from saved workouts" : "Save workout"}
  onPress={handlePress}
  disabled={saving}
  style={[styles.bookmarkButton, saving && styles.bookmarkButtonDisabled]}
>
  {saving ? (
    <ActivityIndicator size="small" color="#4ECDC4" />
  ) : (
    <Feather
      name={isSaved ? "bookmark" : "bookmark"}
      size={20}
      color={isSaved ? '#4ECDC4' : 'rgba(0,0,0,0.5)'}
      style={isSaved && styles.bookmarkSaved}
    />
  )}
</Pressable>

// Add styles
const styles = StyleSheet.create({
  // ... existing styles ...
  bookmarkButton: {
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  bookmarkButtonDisabled: {
    opacity: 0.5,
  },
  bookmarkSaved: {
    transform: [{ scale: 1.1 }],
  },
});
```

**Update `RecipeCard.tsx`** - Similar changes with recipe color (`#FF6B6B`)

#### 2. Add Haptic Feedback

```tsx
import * as Haptics from 'expo-haptics';

const handlePress = async () => {
  // ... existing logic ...
  try {
    setSaving(true);
    const result = await Promise.resolve(handler(item.id));
    const ok = result === undefined ? true : Boolean(result);
    if (ok) {
      // Add haptic feedback on success
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSnackbar(removeAction ? 'Removed from your workouts' : 'Saved to your workouts', {
        variant: 'success',
      });
    }
  } catch (e: any) {
    // Haptic feedback on error
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    // ... existing error handling ...
  } finally {
    setSaving(false);
  }
};
```

#### 3. Add Animation

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const BookmarkButton = ({ isSaved, saving, onPress }: Props) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSaved) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 2, stiffness: 100 }),
        withSpring(1, { damping: 2, stiffness: 100 })
      );
    }
  }, [isSaved]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={onPress} disabled={saving}>
      <Animated.View style={animatedStyle}>
        {saving ? (
          <ActivityIndicator size="small" color="#4ECDC4" />
        ) : (
          <Feather name="bookmark" size={20} color={isSaved ? '#4ECDC4' : 'rgba(0,0,0,0.5)'} />
        )}
      </Animated.View>
    </Pressable>
  );
};
```

### Testing

```typescript
// fitness-mvp/src/components/__tests__/WorkoutCard.test.tsx
describe('WorkoutCard bookmark button', () => {
  it('shows loading indicator while saving', async () => {
    const onSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { getByRole, getByTestId } = render(
      <WorkoutCard item={mockWorkout} onSave={onSave} isSaved={false} />
    );

    fireEvent.press(getByRole('button'));
    expect(getByTestId('activity-indicator')).toBeTruthy();

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(mockWorkout.id);
    });
  });

  it('disables button while saving', () => {
    const { getByRole } = render(
      <WorkoutCard item={mockWorkout} onSave={() => new Promise(() => {})} isSaved={false} />
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});
```

### Success Criteria
- [ ] Bookmark button shows loading spinner during save/remove
- [ ] Haptic feedback on success/error
- [ ] Smooth animation when item is saved
- [ ] Accessibility labels present
- [ ] Button disabled during operation
- [ ] Visual distinction between saved/unsaved states

---

## ✨ CF-17: Saved Library Page Enhancement

**Priority**: P1 (High)
**Story Points**: 5
**Duration**: Day 4

### Current State
✅ **Already Implemented**:
- Pull-to-refresh (`RefreshControl`)
- Infinite scroll pagination (`onEndReached`)
- Skeleton loading (`ListSkeleton`)
- Empty state with CTA
- Sorting controls (SegmentedButtons)
- FAB "Scroll to Top" button

### Enhancement Plan

#### 1. Add Swipe-to-Delete Gesture

**Create `SwipeableCard.tsx`**:
```tsx
import { Animated, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
};

export const SwipeableCard = ({ children, onDelete, deleteLabel = 'Delete' }: Props) => {
  const renderRightActions = (progress: Animated.AnimatedInterpolation) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
        <RectButton style={styles.deleteButton} onPress={onDelete}>
          <MaterialCommunityIcons name="delete" size={24} color="white" />
          <Text style={styles.deleteText}>{deleteLabel}</Text>
        </RectButton>
      </Animated.View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      {children}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  deleteAction: {
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
```

**Update `WorkoutsScreen.tsx`**:
```tsx
import { SwipeableCard } from '@/components';
import { Alert } from 'react-native';

const renderItem = useCallback(
  ({ item }: { item: SavedWorkout }) => {
    const handleDelete = () => {
      Alert.alert(
        'Remove Workout',
        `Remove "${item.title}" from your saved workouts?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeWorkout.mutateAsync(item.id),
          },
        ]
      );
    };

    return (
      <SwipeableCard onDelete={handleDelete}>
        <View style={styles.card}>
          <WorkoutCard
            item={item}
            isSaved
            onRemove={(id) => removeWorkout.mutateAsync(id)}
          />
          {/* ... meta info ... */}
        </View>
      </SwipeableCard>
    );
  },
  [removeWorkout, sortField],
);
```

#### 2. Add Filter Functionality

**Create `FilterModal.tsx`**:
```tsx
import { Modal, View, StyleSheet } from 'react-native';
import { Button, Card, Text } from '@/components';
import { Chip } from 'react-native-paper';

type WorkoutFilters = {
  levels?: string[];
  durationRange?: [number, number];
  equipment?: string[];
};

type Props = {
  visible: boolean;
  filters: WorkoutFilters;
  onApply: (filters: WorkoutFilters) => void;
  onClose: () => void;
};

export const WorkoutFilterModal = ({ visible, filters, onApply, onClose }: Props) => {
  const [selectedLevels, setSelectedLevels] = useState<string[]>(filters.levels || []);

  const toggleLevel = (level: string) => {
    setSelectedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <Card style={styles.modal}>
          <Text variant="heading2" weight="bold">Filter Workouts</Text>

          <View style={styles.section}>
            <Text variant="body" weight="bold">Difficulty Level</Text>
            <View style={styles.chips}>
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map(level => (
                <Chip
                  key={level}
                  selected={selectedLevels.includes(level)}
                  onPress={() => toggleLevel(level)}
                >
                  {level}
                </Chip>
              ))}
            </View>
          </View>

          {/* Add duration range slider */}
          {/* Add equipment filter */}

          <View style={styles.actions}>
            <Button title="Reset" variant="secondary" onPress={() => onApply({})} />
            <Button
              title="Apply"
              onPress={() => {
                onApply({ levels: selectedLevels });
                onClose();
              }}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
};
```

**Update `WorkoutsScreen.tsx`** to use filter:
```tsx
const [filters, setFilters] = useState<WorkoutFilters>({});
const [showFilters, setShowFilters] = useState(false);

// Filter workouts client-side
const filteredWorkouts = useMemo(() => {
  let result = workouts;

  if (filters.levels?.length) {
    result = result.filter(w =>
      filters.levels!.includes(w.level?.toUpperCase() || '')
    );
  }

  if (filters.durationRange) {
    const [min, max] = filters.durationRange;
    result = result.filter(w =>
      w.durationMinutes && w.durationMinutes >= min && w.durationMinutes <= max
    );
  }

  return result;
}, [workouts, filters]);

// Add filter button to header
<View style={styles.headerActions}>
  <Button
    title="Filter"
    icon="filter"
    onPress={() => setShowFilters(true)}
  />
</View>
```

#### 3. Improve Empty State

**Update empty state in `WorkoutsScreen.tsx`**:
```tsx
const listEmptyComponent = (
  <Card style={styles.emptyState}>
    <View style={styles.iconWrapper}>
      <MaterialCommunityIcons name="arm-flex" size={64} color="#4ECDC4" />
    </View>
    <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
      No saved workouts yet
    </Text>
    <Text variant="body" style={styles.emptyBody}>
      Discover workouts that match your equipment and goals. Save your favorites for quick access.
    </Text>

    {/* Show sample workout cards */}
    <View style={styles.sampleCards}>
      <Text variant="caption" weight="bold" style={styles.sampleTitle}>
        Popular Workouts
      </Text>
      {/* Render 2-3 popular workout cards here */}
    </View>

    <Button
      title="Browse Workouts"
      onPress={() => navigation.navigate('Capture')}
    />
  </Card>
);
```

### Testing

```typescript
describe('SwipeableCard', () => {
  it('shows delete action on swipe', () => {
    const onDelete = jest.fn();
    const { getByText } = render(
      <SwipeableCard onDelete={onDelete}>
        <Text>Content</Text>
      </SwipeableCard>
    );

    // Simulate swipe gesture
    // ... swipe simulation ...

    expect(getByText('Delete')).toBeTruthy();
  });

  it('calls onDelete when delete button pressed', () => {
    const onDelete = jest.fn();
    // ... render and swipe ...

    fireEvent.press(getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
```

### Success Criteria
- [ ] Swipe-to-delete works smoothly on both iOS and Android
- [ ] Delete confirmation dialog prevents accidental removals
- [ ] Filter modal allows multi-select filters
- [ ] Filtered results update immediately
- [ ] Empty state is engaging and helpful
- [ ] All interactions are accessible

---

## 🤖 CF-18: AI Recipe Generation Integration

**Priority**: P0 (Critical)
**Story Points**: 8
**Duration**: Day 5

### Context
- **Existing AI Infrastructure**: `SmartRecipeService` already generates meal plans using GPT-4
- **Current Use Case**: 7-day meal plans based on user profile + workout history
- **Challenge**: Extend this to generate individual recipes on-demand

### Objectives
1. Allow users to generate custom recipes based on their goals
2. Show "AI Generated" badge on recipe cards
3. Cache generated recipes for 24 hours
4. Integrate with existing recipe library

### Technical Design

#### 1. Create `IntelligentRecipeService`

```java
package com.fitnessapp.backend.recipe;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.RecipeIngredient;
import com.fitnessapp.backend.domain.Ingredient;
import com.fitnessapp.backend.domain.UserProfile;
import com.fitnessapp.backend.openai.ChatCompletionClient;
import com.fitnessapp.backend.repository.RecipeRepository;
import com.fitnessapp.backend.repository.IngredientRepository;
import com.fitnessapp.backend.repository.UserProfileRepository;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import jakarta.persistence.EntityNotFoundException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntelligentRecipeService {

  private static final String CACHE_PREFIX = "ai-recipe:";
  private static final int MAX_TOKENS = 1500;

  private final UserProfileRepository userProfileRepository;
  private final RecipeRepository recipeRepository;
  private final IngredientRepository ingredientRepository;
  private final ChatCompletionClient chatCompletionClient;
  private final ObjectMapper objectMapper;
  private final StringRedisTemplate redisTemplate;

  @Value("${app.openai.recipe-model:${app.openai.model:gpt-4o}}")
  private String recipeModel;

  @Value("${app.ai-recipe.cache-ttl-hours:24}")
  private long cacheTtlHours;

  @Transactional
  public Recipe generateRecipe(UUID userId, RecipeGenerationRequest request) {
    String cacheKey = buildCacheKey(userId, request);

    // Check cache first
    Recipe cached = readCachedRecipe(cacheKey);
    if (cached != null) {
      log.info("Returning cached AI recipe for user {}", userId);
      return cached;
    }

    UserProfile profile = userProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new EntityNotFoundException("User profile not found: " + userId));

    try {
      String prompt = buildRecipePrompt(profile, request);
      List<ChatMessage> messages = List.of(
          new ChatMessage(ChatMessageRole.SYSTEM.value(),
              "You are a professional chef specializing in healthy, fitness-oriented recipes."),
          new ChatMessage(ChatMessageRole.USER.value(), prompt)
      );

      String completion = chatCompletionClient.complete(recipeModel, messages, MAX_TOKENS, 0.7);
      Recipe recipe = parseRecipeResponse(completion);

      if (recipe == null) {
        log.warn("Failed to parse AI recipe for user {}", userId);
        return fallbackRecipe(request);
      }

      // Mark as AI-generated in metadata
      recipe = enrichRecipeMetadata(recipe, true);

      // Save to database
      recipe = recipeRepository.save(recipe);

      // Cache for 24 hours
      cacheRecipe(cacheKey, recipe);

      log.info("Generated and persisted AI recipe {} for user {}", recipe.getId(), userId);
      return recipe;

    } catch (Exception ex) {
      log.error("Failed to generate AI recipe for user {}", userId, ex);
      return fallbackRecipe(request);
    }
  }

  private String buildRecipePrompt(UserProfile profile, RecipeGenerationRequest request) {
    String goal = profile.getFitnessGoal() != null ? profile.getFitnessGoal().name() : "MAINTAIN";
    String dietary = profile.getDietaryPreference() != null ? profile.getDietaryPreference().name() : "NONE";
    String allergens = profile.getAllergens() != null && !profile.getAllergens().isEmpty()
        ? profile.getAllergens().stream().map(Enum::name).collect(Collectors.joining(", "))
        : "NONE";

    int targetCalories = request.targetCalories() != null
        ? request.targetCalories()
        : profile.getDailyCalorieTarget() != null
            ? profile.getDailyCalorieTarget() / 4
            : 500;

    StringBuilder promptBuilder = new StringBuilder();
    promptBuilder.append("Generate a detailed recipe in JSON format based on the following:\n\n");
    promptBuilder.append("**User Context**:\n");
    promptBuilder.append("- Fitness Goal: ").append(goal).append("\n");
    promptBuilder.append("- Dietary Preference: ").append(dietary).append("\n");
    promptBuilder.append("- Allergens to Avoid: ").append(allergens).append("\n");
    promptBuilder.append("- Target Calories: ~").append(targetCalories).append(" kcal\n");

    if (StringUtils.hasText(request.cuisineType())) {
      promptBuilder.append("- Cuisine: ").append(request.cuisineType()).append("\n");
    }

    if (request.availableIngredients() != null && !request.availableIngredients().isEmpty()) {
      promptBuilder.append("- Available Ingredients: ").append(
          String.join(", ", request.availableIngredients())).append("\n");
    }

    if (request.maxPrepTime() != null) {
      promptBuilder.append("- Max Prep Time: ").append(request.maxPrepTime()).append(" minutes\n");
    }

    promptBuilder.append("\n**JSON Format Required**:\n");
    promptBuilder.append("{\n");
    promptBuilder.append("  \"title\": \"Recipe Name in Chinese\",\n");
    promptBuilder.append("  \"timeMinutes\": 30,\n");
    promptBuilder.append("  \"difficulty\": \"EASY|MEDIUM|HARD\",\n");
    promptBuilder.append("  \"ingredients\": [\n");
    promptBuilder.append("    {\"name\": \"ingredient\", \"quantity\": \"100g\", \"calories\": 50}\n");
    promptBuilder.append("  ],\n");
    promptBuilder.append("  \"steps\": [\"Step 1\", \"Step 2\", ...],\n");
    promptBuilder.append("  \"nutritionSummary\": {\n");
    promptBuilder.append("    \"calories\": 500,\n");
    promptBuilder.append("    \"protein\": 30,\n");
    promptBuilder.append("    \"carbs\": 50,\n");
    promptBuilder.append("    \"fat\": 15\n");
    promptBuilder.append("  },\n");
    promptBuilder.append("  \"swaps\": [\"Optional alternative ingredients\"]\n");
    promptBuilder.append("}\n");

    promptBuilder.append("\n**Requirements**:\n");
    promptBuilder.append("1. Recipe must align with user's fitness goal (");
    promptBuilder.append(goal.equals("LOSE_WEIGHT") ? "high protein, low fat" :
                         goal.equals("GAIN_MUSCLE") ? "high protein, moderate carbs" :
                         "balanced macros");
    promptBuilder.append(")\n");
    promptBuilder.append("2. Respect dietary preferences and allergen restrictions\n");
    promptBuilder.append("3. Use Chinese recipe name and instructions\n");
    promptBuilder.append("4. Provide accurate nutrition information\n");
    promptBuilder.append("5. Include practical cooking steps\n");

    return promptBuilder.toString();
  }

  private Recipe parseRecipeResponse(String rawContent) throws JsonProcessingException {
    if (!StringUtils.hasText(rawContent)) {
      return null;
    }

    String sanitized = sanitizeJson(rawContent);
    JsonNode root = objectMapper.readTree(sanitized);

    if (root == null) {
      return null;
    }

    Recipe recipe = new Recipe();
    recipe.setTitle(root.path("title").asText("AI Generated Recipe"));
    recipe.setTimeMinutes(root.path("timeMinutes").asInt(30));
    recipe.setDifficulty(root.path("difficulty").asText("MEDIUM"));

    // Parse nutrition
    JsonNode nutrition = root.path("nutritionSummary");
    if (nutrition.isObject()) {
      recipe.setNutritionSummary(nutrition);
    }

    // Parse steps
    JsonNode steps = root.path("steps");
    if (steps.isArray()) {
      recipe.setSteps(steps);
    }

    // Parse swaps
    JsonNode swaps = root.path("swaps");
    if (swaps.isArray()) {
      recipe.setSwaps(swaps);
    }

    // Parse ingredients
    JsonNode ingredients = root.path("ingredients");
    if (ingredients.isArray()) {
      for (JsonNode ingredientNode : ingredients) {
        String name = ingredientNode.path("name").asText();
        String quantity = ingredientNode.path("quantity").asText();

        // Find or create ingredient
        Ingredient ingredient = ingredientRepository.findByNameIgnoreCase(name)
            .orElseGet(() -> {
              Ingredient newIng = new Ingredient();
              newIng.setName(name);
              return ingredientRepository.save(newIng);
            });

        RecipeIngredient recipeIngredient = new RecipeIngredient();
        recipeIngredient.setRecipe(recipe);
        recipeIngredient.setIngredient(ingredient);
        recipeIngredient.setQuantity(quantity);

        recipe.getIngredients().add(recipeIngredient);
      }
    }

    return recipe;
  }

  private Recipe enrichRecipeMetadata(Recipe recipe, boolean isAiGenerated) {
    // Add AI-generated flag to nutrition summary
    try {
      JsonNode nutrition = recipe.getNutritionSummary();
      ObjectMapper mapper = new ObjectMapper();

      if (nutrition == null) {
        nutrition = mapper.createObjectNode();
      }

      ((com.fasterxml.jackson.databind.node.ObjectNode) nutrition)
          .put("aiGenerated", isAiGenerated)
          .put("generatedAt", java.time.OffsetDateTime.now().toString());

      recipe.setNutritionSummary(nutrition);
    } catch (Exception e) {
      log.warn("Failed to enrich recipe metadata", e);
    }

    return recipe;
  }

  private Recipe fallbackRecipe(RecipeGenerationRequest request) {
    // Return a sensible default recipe when AI generation fails
    Recipe fallback = new Recipe();
    fallback.setTitle("健康蛋白碗 (默认食谱)");
    fallback.setTimeMinutes(request.maxPrepTime() != null ? request.maxPrepTime() : 20);
    fallback.setDifficulty("EASY");

    // Build simple nutrition
    ObjectMapper mapper = new ObjectMapper();
    var nutrition = mapper.createObjectNode();
    nutrition.put("calories", 450);
    nutrition.put("protein", 35);
    nutrition.put("carbs", 40);
    nutrition.put("fat", 12);
    nutrition.put("aiGenerated", false);
    nutrition.put("fallback", true);
    fallback.setNutritionSummary(nutrition);

    var steps = mapper.createArrayNode();
    steps.add("煮熟鸡胸肉或豆腐");
    steps.add("准备糙米或藜麦");
    steps.add("添加新鲜蔬菜(西兰花、胡萝卜)");
    steps.add("淋上健康酱汁");
    fallback.setSteps(steps);

    return recipeRepository.save(fallback);
  }

  private String sanitizeJson(String content) {
    String trimmed = content.trim();
    if (trimmed.startsWith("```")) {
      int lastFence = trimmed.lastIndexOf("```");
      int firstLineBreak = trimmed.indexOf('\n');
      if (lastFence > firstLineBreak && firstLineBreak >= 0) {
        trimmed = trimmed.substring(firstLineBreak + 1, lastFence).trim();
      }
    }
    if (trimmed.startsWith("{")) {
      return trimmed;
    }
    int start = trimmed.indexOf('{');
    int end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return trimmed.substring(start, end + 1);
    }
    return trimmed;
  }

  private String buildCacheKey(UUID userId, RecipeGenerationRequest request) {
    return String.format("%s%s:%s:%d:%s",
        CACHE_PREFIX,
        userId,
        request.cuisineType() != null ? request.cuisineType() : "any",
        request.targetCalories() != null ? request.targetCalories() : 0,
        request.availableIngredients() != null
            ? String.join("-", request.availableIngredients()).hashCode()
            : 0);
  }

  private void cacheRecipe(String cacheKey, Recipe recipe) {
    try {
      String payload = objectMapper.writeValueAsString(recipe);
      Duration ttl = Duration.ofHours(cacheTtlHours <= 0 ? 24 : cacheTtlHours);
      redisTemplate.opsForValue().set(cacheKey, payload, ttl);
    } catch (Exception e) {
      log.warn("Unable to cache AI recipe", e);
    }
  }

  private Recipe readCachedRecipe(String cacheKey) {
    String value = redisTemplate.opsForValue().get(cacheKey);
    if (StringUtils.hasText(value)) {
      try {
        return objectMapper.readValue(value, Recipe.class);
      } catch (JsonProcessingException e) {
        log.warn("Failed to deserialize cached recipe", e);
        redisTemplate.delete(cacheKey);
      }
    }
    return null;
  }

  public record RecipeGenerationRequest(
      String cuisineType,
      Integer targetCalories,
      Integer maxPrepTime,
      List<String> availableIngredients
  ) {}
}
```

#### 2. Create Controller Endpoint

```java
package com.fitnessapp.backend.api.recipe;

import com.fitnessapp.backend.api.common.ApiEnvelope;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.recipe.IntelligentRecipeService;
import com.fitnessapp.backend.recipe.IntelligentRecipeService.RecipeGenerationRequest;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
@Slf4j
public class IntelligentRecipeController {

  private final IntelligentRecipeService intelligentRecipeService;
  private final CurrentUser currentUser;

  @PostMapping("/generate")
  public ApiEnvelope<Recipe> generateRecipe(@Valid @RequestBody GenerateRecipePayload payload) {
    UUID userId = currentUser.get()
        .map(AuthenticatedUser::userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
            "Authentication required"));

    log.info("API request: generate AI recipe for user {} with request {}", userId, payload);

    RecipeGenerationRequest request = new RecipeGenerationRequest(
        payload.cuisineType(),
        payload.targetCalories(),
        payload.maxPrepTime(),
        payload.availableIngredients()
    );

    Recipe recipe = intelligentRecipeService.generateRecipe(userId, request);
    return ApiEnvelope.of(recipe);
  }

  public record GenerateRecipePayload(
      String cuisineType,
      @Min(100) @Max(2000) Integer targetCalories,
      @Min(5) @Max(180) Integer maxPrepTime,
      List<String> availableIngredients
  ) {}
}
```

#### 3. Frontend Integration

**Update `api.ts`**:
```typescript
export type GenerateRecipePayload = {
  cuisineType?: string;
  targetCalories?: number;
  maxPrepTime?: number;
  availableIngredients?: string[];
};

export const generateAiRecipe = async (payload: GenerateRecipePayload): Promise<RecipeCard> => {
  const response = await api.post<{ data: RecipeCard }>('/api/v1/recipes/generate', payload);
  return response.data.data;
};
```

**Update `hooks.ts`**:
```typescript
export const useGenerateRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation<RecipeCard, Error, GenerateRecipePayload>({
    mutationKey: ['generate', 'recipe'],
    mutationFn: (payload) => generateAiRecipe(payload),
    onSuccess: (recipe) => {
      // Optionally invalidate recipe list cache
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};
```

**Create `AiRecipeBadge.tsx`**:
```tsx
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components';
import { spacing, radii } from '@/utils';

type Props = {
  isAiGenerated?: boolean;
};

export const AiRecipeBadge = ({ isAiGenerated }: Props) => {
  if (!isAiGenerated) return null;

  return (
    <View style={styles.badge}>
      <MaterialCommunityIcons name="robot" size={14} color="#8B5CF6" />
      <Text variant="caption" style={styles.badgeText}>AI Generated</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
    fontSize: 11,
  },
});
```

**Update `RecipeCard.tsx`**:
```tsx
import { AiRecipeBadge } from '@/components';

export const RecipeCard = ({ item, onSave, onRemove, onStart, isSaved }: Props) => {
  const isAiGenerated = item.nutritionSummary?.aiGenerated === true;

  return (
    <Card style={styles.card}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      <View style={{ gap: spacing.xs }}>
        <View style={styles.titleRow}>
          <Text variant="body" weight="bold" numberOfLines={2} style={{ flex: 1 }}>
            {item.title}
          </Text>
          <AiRecipeBadge isAiGenerated={isAiGenerated} />
        </View>
        <Text variant="caption" style={{ opacity: 0.8 }}>
          {time} • {difficulty}
        </Text>
      </View>

      {/* ... rest of the card ... */}
    </Card>
  );
};
```

**Create `GenerateRecipeScreen.tsx`**:
```tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Card, Container, SafeAreaWrapper, Text, TextInput } from '@/components';
import { SegmentedButtons, Chip } from 'react-native-paper';
import { useGenerateRecipe } from '@/services';
import { spacing } from '@/utils';

export const GenerateRecipeScreen = () => {
  const [cuisineType, setCuisineType] = useState('chinese');
  const [targetCalories, setTargetCalories] = useState('500');
  const [maxPrepTime, setMaxPrepTime] = useState('30');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');

  const generateRecipe = useGenerateRecipe();

  const handleGenerate = async () => {
    const payload = {
      cuisineType,
      targetCalories: parseInt(targetCalories),
      maxPrepTime: parseInt(maxPrepTime),
      availableIngredients: ingredients.length > 0 ? ingredients : undefined,
    };

    try {
      await generateRecipe.mutateAsync(payload);
      // Navigate to recipe detail or show success
    } catch (error) {
      // Handle error
    }
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  return (
    <SafeAreaWrapper>
      <Container>
        <ScrollView contentContainerStyle={styles.container}>
          <Card style={styles.header}>
            <Text variant="heading1" weight="bold">Generate AI Recipe</Text>
            <Text variant="body" style={styles.subtitle}>
              Get a personalized recipe tailored to your fitness goals
            </Text>
          </Card>

          <Card>
            <Text variant="body" weight="bold">Cuisine Type</Text>
            <SegmentedButtons
              value={cuisineType}
              onValueChange={setCuisineType}
              buttons={[
                { value: 'chinese', label: 'Chinese' },
                { value: 'western', label: 'Western' },
                { value: 'japanese', label: 'Japanese' },
              ]}
            />
          </Card>

          <Card>
            <Text variant="body" weight="bold">Target Calories</Text>
            <TextInput
              value={targetCalories}
              onChangeText={setTargetCalories}
              keyboardType="number-pad"
              placeholder="500"
            />
          </Card>

          <Card>
            <Text variant="body" weight="bold">Max Prep Time (minutes)</Text>
            <TextInput
              value={maxPrepTime}
              onChangeText={setMaxPrepTime}
              keyboardType="number-pad"
              placeholder="30"
            />
          </Card>

          <Card>
            <Text variant="body" weight="bold">Available Ingredients (Optional)</Text>
            <View style={styles.ingredientInput}>
              <TextInput
                value={newIngredient}
                onChangeText={setNewIngredient}
                placeholder="e.g., chicken, broccoli"
                style={{ flex: 1 }}
              />
              <Button title="Add" onPress={addIngredient} compact />
            </View>
            <View style={styles.chips}>
              {ingredients.map((ing, index) => (
                <Chip
                  key={index}
                  onClose={() => setIngredients(ingredients.filter((_, i) => i !== index))}
                >
                  {ing}
                </Chip>
              ))}
            </View>
          </Card>

          <Button
            title="Generate Recipe"
            onPress={handleGenerate}
            loading={generateRecipe.isPending}
            disabled={generateRecipe.isPending}
          />
        </ScrollView>
      </Container>
    </SafeAreaWrapper>
  );
};
```

### Testing

#### Backend Tests
```java
@Test
void generatesRecipeWithUserContext() {
  UUID userId = UUID.randomUUID();
  UserProfile profile = createMockProfile(userId, FitnessGoal.LOSE_WEIGHT);
  when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

  RecipeGenerationRequest request = new RecipeGenerationRequest(
      "chinese", 450, 30, List.of("chicken", "broccoli"));

  Recipe recipe = service.generateRecipe(userId, request);

  assertThat(recipe).isNotNull();
  assertThat(recipe.getTitle()).isNotBlank();
  assertThat(recipe.getNutritionSummary().path("aiGenerated").asBoolean()).isTrue();
  verify(recipeRepository).save(any(Recipe.class));
}

@Test
void cachesPreviouslyGeneratedRecipe() {
  // First call
  Recipe recipe1 = service.generateRecipe(userId, request);

  // Second call with same params
  Recipe recipe2 = service.generateRecipe(userId, request);

  assertThat(recipe1.getId()).isEqualTo(recipe2.getId());
  verify(chatCompletionClient, times(1)).complete(any(), any(), anyInt(), anyDouble());
}
```

#### Frontend Tests
```typescript
describe('useGenerateRecipe', () => {
  it('calls generate API with correct payload', async () => {
    const { result } = renderHook(() => useGenerateRecipe());

    await act(async () => {
      await result.current.mutateAsync({
        cuisineType: 'chinese',
        targetCalories: 500,
        maxPrepTime: 30,
      });
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/recipes/generate',
      expect.objectContaining({ cuisineType: 'chinese' })
    );
  });
});
```

### Performance Considerations

**Cost Management**:
- GPT-4 cost: ~$0.03 per recipe generation (1000 tokens)
- Cache hit ratio target: > 60% (reduces cost by 60%)
- Monthly budget estimate: 1000 users × 2 recipes/month × $0.03 = $60/month

**Response Time**:
- AI generation: 3-8 seconds (OpenAI API latency)
- Cache hit: < 100ms
- Show loading state with progress indicator

**Error Handling**:
- Fallback recipe when AI fails
- Retry mechanism for transient errors
- User-friendly error messages

### Success Criteria
- [ ] AI generates recipe in < 8 seconds (P95)
- [ ] Generated recipes respect dietary restrictions
- [ ] Nutrition values are within 10% of target
- [ ] Cache hit ratio > 60% after 1 week
- [ ] "AI Generated" badge displays correctly
- [ ] Fallback recipe used when AI fails
- [ ] No duplicate recipes generated for same input

---

## 📊 Overall Implementation Timeline

```
Week 1: CF-15 to CF-18
├── Day 1-2: CF-15 User Library Cache [5 SP]
│   ├── Create cache stores
│   ├── Update service layer
│   ├── Write tests
│   └── Monitor metrics
├── Day 3: CF-16 Save Button UI [3 SP]
│   ├── Add loading states
│   ├── Haptic feedback
│   ├── Animations
│   └── Accessibility
├── Day 4: CF-17 Library Enhancement [5 SP]
│   ├── Swipe-to-delete
│   ├── Filter modal
│   ├── Improve empty state
│   └── Testing
└── Day 5: CF-18 AI Recipe Generation [8 SP]
    ├── IntelligentRecipeService
    ├── Controller endpoint
    ├── Frontend integration
    ├── UI for generation
    └── Testing & monitoring
```

**Total Story Points**: 21
**Team Velocity Assumption**: 4-5 SP/day/developer
**Recommended Team Size**: 1-2 developers

---

## 🚨 Risk Mitigation

### Technical Risks

#### Risk 1: Cache Type Casting Issues
**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Use type-safe cache stores from the start
- Add comprehensive unit tests for serialization
- Monitor cache errors in production

#### Risk 2: OpenAI API Rate Limits
**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Implement exponential backoff
- Cache aggressively (24-hour TTL)
- Always provide fallback recipes
- Monitor API quota usage

#### Risk 3: React Native Gesture Handler Conflicts
**Likelihood**: Low
**Impact**: Medium
**Mitigation**:
- Test swipe gestures on both iOS and Android early
- Use `react-native-gesture-handler` v2+ (better compatibility)
- Have fallback to button-based delete

### Rollout Strategy

**Phase 1: Backend (Day 1-3)**
- Deploy cache infrastructure
- No impact on existing functionality
- Monitor cache hit ratios

**Phase 2: Frontend UI (Day 3-4)**
- Deploy UI improvements incrementally
- A/B test swipe-to-delete vs. button delete
- Gather user feedback

**Phase 3: AI Features (Day 5)**
- Soft launch to 10% of users
- Monitor OpenAI costs and error rates
- Gradually increase to 100%

---

## 📈 Success Metrics

### CF-15 Metrics
- Cache hit ratio: > 75%
- P50 response time: < 10ms (cache hit)
- P99 response time: < 200ms

### CF-16 Metrics
- User engagement: +15% bookmark interactions
- Error rate: < 1% for save operations

### CF-17 Metrics
- Empty state conversion: 20% → 35%
- Filter usage: > 30% of users

### CF-18 Metrics
- AI recipe generation success rate: > 95%
- User satisfaction: > 4.0/5.0 rating
- Monthly OpenAI cost: < $100

---

## 📝 Post-Implementation Checklist

- [ ] All unit tests pass (>85% coverage)
- [ ] Integration tests added for cache behavior
- [ ] Performance benchmarks documented
- [ ] Grafana dashboards updated with new metrics
- [ ] API documentation updated (Swagger/OpenAPI)
- [ ] Mobile UI tested on iOS and Android
- [ ] Accessibility audit completed (screen reader)
- [ ] Security review (API rate limiting, auth)
- [ ] Load testing for 1000 concurrent users
- [ ] Rollback plan documented
- [ ] On-call runbook updated
- [ ] User-facing release notes written

---

## 🎓 Learning Resources

**Cache Pattern**:
- [Spring Cache Abstraction](https://docs.spring.io/spring-framework/reference/integration/cache.html)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/redis-cache/)

**React Query**:
- [Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Infinite Queries](https://tanstack.com/query/latest/docs/react/guides/infinite-queries)

**OpenAI Integration**:
- [GPT-4 Best Practices](https://platform.openai.com/docs/guides/gpt-best-practices)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-06
**Author**: AI Implementation Team
**Status**: Ready for Implementation
