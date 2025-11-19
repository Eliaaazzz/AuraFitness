# Recipe System Optimization - 8 Week Plan

## Current System Analysis

### Existing Features
- ✅ Recipe search by ingredients
- ✅ Nutrition information display
- ✅ Spoonacular API integration
- ✅ AI-powered recipe generation (OpenAI - optional)
- ✅ Meal planning system
- ✅ Recipe curation/import
- ✅ Ingredient substitutions
- ✅ User saved recipes
- ✅ Meal logging

### Architecture Overview
```
┌─────────────────┐
│  Mobile Client  │
└────────┬────────┘
         │
    ┌────▼─────────────────────────────┐
    │   ContentController               │
    │   /api/v1/recipes/from-image      │
    └────┬─────────────────────────────┘
         │
    ┌────▼──────────────────┐
    │ RecipeRetrievalService │ ← PostgreSQL (JSONB nutrition)
    │ - findRecipes()        │ ← Redis Cache
    │ - scoring algorithm    │ ← Spoonacular API
    └────────────────────────┘
```

---

## 🎯 Week 1: Performance & Caching Layer

**Goal:** Reduce API latency by 60% and decrease database load by 70%

### Tasks

#### 1.1 Database Query Optimization
```sql
-- Add composite indexes for faster queries
CREATE INDEX idx_recipe_time_difficulty ON recipe(time_minutes, difficulty);
CREATE INDEX idx_recipe_ingredients ON recipe_ingredient(ingredient_id);
CREATE INDEX idx_ingredient_name_lower ON ingredient(LOWER(name));

-- Add GIN index for JSONB nutrition queries
CREATE INDEX idx_recipe_nutrition_gin ON recipe USING gin(nutrition_summary);
```

**Files to modify:**
- Create: `src/main/resources/db/migration/V3__add_performance_indexes.sql`

#### 1.2 Redis Caching Layer
```java
// Cache frequently accessed recipes
@Cacheable(value = "recipes", key = "#ingredients + '_' + #maxTime")
public List<RecipeCard> findRecipes(List<String> ingredients, int maxTime)

// Cache Spoonacular API responses (24h TTL)
@Cacheable(value = "spoonacular:recipes", key = "#recipeId", ttl = 86400)
public RecipeDetail fetchFromSpoonacular(String recipeId)
```

**Files to modify:**
- `RecipeRetrievalService.java` - Add @Cacheable annotations
- `RecipeImportService.java` - Cache Spoonacular responses
- `RedisConfig.java` - Add recipe cache configurations
- Create: `RecipeCacheService.java` - Centralized cache management

#### 1.3 Query Optimization
**Current issue:** N+1 queries when loading ingredients

```java
// Before (N+1 problem):
List<Recipe> recipes = repository.findAll(); // 1 query
for (Recipe r : recipes) {
  r.getIngredients(); // N queries
}

// After (single query with JOIN FETCH):
@Query("SELECT DISTINCT r FROM Recipe r " +
       "LEFT JOIN FETCH r.ingredients ri " +
       "LEFT JOIN FETCH ri.ingredient " +
       "WHERE r.id IN :ids")
List<Recipe> findByIdInWithIngredients(@Param("ids") List<UUID> ids);
```

**Files to modify:**
- `RecipeRepository.java` - Add optimized queries with @EntityGraph

#### 1.4 Spoonacular API Rate Limiting & Circuit Breaker
```java
@CircuitBreaker(name = "spoonacular", fallbackMethod = "fallbackRecipe")
@RateLimiter(name = "spoonacular")
public RecipeDetail fetchRecipe(String id) {
  // Spoonacular API call
}
```

**Dependencies to add:**
```xml
<dependency>
  <groupId>io.github.resilience4j</groupId>
  <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
```

**Files to create:**
- `ResilienceConfig.java` - Circuit breaker configuration
- `SpoonacularApiClient.java` - Dedicated API client with retry logic

### Expected Results
- ✅ API response time: 500ms → 200ms
- ✅ Database queries reduced by 70%
- ✅ Spoonacular API costs reduced by 80% (caching)
- ✅ System handles 10x more concurrent users

---

## 🔍 Week 2: Search & Discovery Enhancement

**Goal:** Improve recipe discovery with advanced filters and intelligent search

### Tasks

#### 2.1 Advanced Search Filters

**New endpoint:**
```java
@PostMapping("/api/v1/recipes/search")
public RecipeSearchResponse searchRecipes(@RequestBody RecipeSearchRequest request) {
  // filters: cuisine, dietaryRestrictions, maxCalories, maxCarbs, etc.
}
```

**Request DTO:**
```java
public record RecipeSearchRequest(
  List<String> ingredients,
  Integer maxTimeMinutes,
  Integer maxCalories,
  Integer minProtein,
  List<String> dietaryRestrictions, // vegan, gluten-free, keto, etc.
  List<String> cuisineTypes,        // italian, mexican, asian, etc.
  String difficulty,                 // easy, medium, hard
  String sortBy                      // time, calories, protein, popularity
) {}
```

#### 2.2 Fuzzy Ingredient Matching
```java
// Match "chiken" → "chicken", "bred" → "bread"
public List<String> fuzzyMatchIngredients(List<String> userInput) {
  // Use Apache Commons Text LevenshteinDistance
  // or PostgreSQL pg_trgm extension
}
```

**Database setup:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_ingredient_name_trgm ON ingredient USING gin(name gin_trgm_ops);
```

#### 2.3 Recipe Recommendation Engine
```java
public List<RecipeCard> getRecommendations(UUID userId) {
  // Based on:
  // - Previously saved recipes
  // - Meal logs history
  // - Fitness goals (weight loss/gain)
  // - Dietary preferences
  // - Time of day (breakfast/lunch/dinner)
}
```

**Algorithm:**
1. User's favorite ingredients (from history)
2. Similar recipes to previously saved
3. Recipes matching calorie targets
4. Popular recipes with similar users

#### 2.4 Similar Recipes Feature
```java
@GetMapping("/api/v1/recipes/{id}/similar")
public List<RecipeCard> getSimilarRecipes(@PathVariable UUID id) {
  // Match by:
  // - Common ingredients
  // - Similar nutrition profile
  // - Same difficulty level
  // - Similar cooking time
}
```

#### 2.5 Recently Viewed & Trending Recipes
```java
// Track recipe views in Redis
public void trackRecipeView(UUID userId, UUID recipeId) {
  redisTemplate.opsForZSet().add("user:" + userId + ":recent",
    recipeId.toString(), System.currentTimeMillis());
}

// Get trending recipes (most viewed in last 7 days)
@Cacheable("trending-recipes")
public List<RecipeCard> getTrendingRecipes() {
  // Query recipes with most views in last week
}
```

**Files to create:**
- `RecipeSearchService.java` - Advanced search logic
- `RecipeRecommendationService.java` - ML-based recommendations
- `RecipeViewTracker.java` - View tracking with Redis
- `RecipeSearchRequest.java` - Search request DTO
- `RecipeSearchResponse.java` - Enhanced response with facets

### Expected Results
- ✅ Search accuracy improved by 40%
- ✅ User engagement increased (more recipe views)
- ✅ Recipe discovery time reduced by 50%
- ✅ Fuzzy matching handles typos

---

## 👤 Week 3: User Experience Features

**Goal:** Enhance user interaction and meal planning capabilities

### Tasks

#### 3.1 Recipe Rating & Review System

**Database schema:**
```sql
CREATE TABLE recipe_review (
  id UUID PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipe(id),
  user_id UUID NOT NULL REFERENCES app_user(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);

CREATE INDEX idx_recipe_review_recipe ON recipe_review(recipe_id);
```

**API endpoints:**
```java
@PostMapping("/api/v1/recipes/{id}/reviews")
public ReviewResponse addReview(@PathVariable UUID id, @RequestBody ReviewRequest request);

@GetMapping("/api/v1/recipes/{id}/reviews")
public List<ReviewResponse> getReviews(@PathVariable UUID id);

// Add average rating to RecipeCard
public class RecipeCard {
  Double averageRating;  // NEW
  Integer reviewCount;   // NEW
}
```

#### 3.2 Shopping List Generation

**Generate shopping list from meal plan:**
```java
@PostMapping("/api/v1/meal-plans/{id}/shopping-list")
public ShoppingListResponse generateShoppingList(@PathVariable UUID mealPlanId) {
  // 1. Get all recipes in meal plan
  // 2. Aggregate ingredients
  // 3. Remove duplicates
  // 4. Organize by category (produce, meat, dairy, etc.)
  // 5. Calculate total quantities
}
```

**Response:**
```json
{
  "categories": {
    "produce": [
      {"name": "broccoli", "quantity": "2 lbs", "recipes": ["Recipe A", "Recipe B"]},
      {"name": "carrots", "quantity": "1 lb", "recipes": ["Recipe C"]}
    ],
    "meat": [
      {"name": "chicken breast", "quantity": "3 lbs", "recipes": ["Recipe A", "Recipe D"]}
    ],
    "dairy": [...],
    "pantry": [...]
  },
  "estimatedCost": 45.50,
  "totalItems": 18
}
```

#### 3.3 Recipe Scaling (Servings Adjustment)

```java
@GetMapping("/api/v1/recipes/{id}/scale")
public RecipeCard scaleRecipe(
  @PathVariable UUID id,
  @RequestParam Integer targetServings) {

  // 1. Get original recipe
  // 2. Calculate scaling factor: targetServings / originalServings
  // 3. Scale all ingredient quantities
  // 4. Scale nutrition info
  // 5. Adjust cooking time (some adjustments needed)
}
```

**Scaling logic:**
```java
private IngredientQuantity scale(IngredientQuantity original, double factor) {
  return IngredientQuantity.builder()
    .name(original.getName())
    .quantity(original.getQuantity() * factor)
    .unit(original.getUnit())
    .build();
}

// Cooking time adjustment (non-linear)
private int scaleCookingTime(int originalTime, double factor) {
  if (factor <= 1.5) {
    return (int) (originalTime * Math.pow(factor, 0.8));
  } else {
    return (int) (originalTime * Math.pow(factor, 0.6));
  }
}
```

#### 3.4 Meal Prep Planning (Batch Cooking)

```java
@PostMapping("/api/v1/meal-prep/generate")
public MealPrepPlanResponse generateMealPrepPlan(@RequestBody MealPrepRequest request) {
  // Request: targetDays, mealsPerDay, dietaryGoals
  // 1. Select recipes suitable for batch cooking (stores well, reheats well)
  // 2. Optimize for ingredient overlap (reduce shopping list)
  // 3. Balance nutrition across the week
  // 4. Generate cooking schedule (which day to cook what)
}
```

**Response:**
```json
{
  "weekPlan": {
    "sunday": {
      "cookingSession": [
        {
          "recipe": "Grilled Chicken Breast",
          "servings": 12,
          "storageInstructions": "Refrigerate in airtight containers (4-5 days)",
          "reheatingInstructions": "Microwave 2-3 minutes"
        }
      ],
      "totalCookingTime": 90
    }
  },
  "shoppingList": {...},
  "nutritionSummary": {...}
}
```

#### 3.5 Print-Friendly Recipe Format

```java
@GetMapping("/api/v1/recipes/{id}/print")
public String getPrintableRecipe(@PathVariable UUID id) {
  // Return HTML template optimized for printing
  // - Clean layout
  // - No images (or optional)
  // - Checkboxes for ingredients
  // - Large, readable font
  // - Page break friendly
}
```

**Files to create:**
- `RecipeReviewService.java` - Rating/review logic
- `ShoppingListService.java` - Shopping list generation
- `RecipeScalingService.java` - Recipe scaling logic
- `MealPrepPlanService.java` - Meal prep planning
- `RecipePrintService.java` - Print formatting
- Domain: `RecipeReview.java`, `ShoppingList.java`, `MealPrepPlan.java`

### Expected Results
- ✅ User engagement increased by 50%
- ✅ Shopping list reduces planning time by 70%
- ✅ Meal prep adoption increases retention
- ✅ Recipe ratings improve content quality

---

## 🥗 Week 4: Nutrition & Personalization

**Goal:** Intelligent nutrition-based recipe filtering and personalization

### Tasks

#### 4.1 Macro-Based Recipe Filtering

```java
@GetMapping("/api/v1/recipes/filter/macros")
public List<RecipeCard> filterByMacros(
  @RequestParam Integer minProtein,
  @RequestParam Integer maxCarbs,
  @RequestParam Integer maxCalories,
  @RequestParam Integer maxFat) {

  // Query with JSONB operators
}
```

**Optimized query:**
```java
@Query(value = """
  SELECT * FROM recipe r
  WHERE (r.nutrition_summary->>'calories')::int <= :maxCalories
    AND (r.nutrition_summary->>'protein')::float >= :minProtein
    AND (r.nutrition_summary->>'carbs')::float <= :maxCarbs
    AND (r.nutrition_summary->>'fat')::float <= :maxFat
  ORDER BY (r.nutrition_summary->>'protein')::float DESC
  LIMIT 20
  """, nativeQuery = true)
List<Recipe> findByMacroTargets(...);
```

#### 4.2 Daily Calorie Target Integration

```java
public List<RecipeCard> getRecipesForDailyTarget(UUID userId, String mealType) {
  UserProfile profile = userProfileService.get(userId);

  // Calculate remaining calories for the day
  int consumedToday = mealLogService.getTodayCalories(userId);
  int targetCalories = profile.getDailyCalorieTarget();
  int remaining = targetCalories - consumedToday;

  // Allocate calories by meal type
  Map<String, Double> mealAllocation = Map.of(
    "breakfast", 0.25,
    "lunch", 0.35,
    "dinner", 0.35,
    "snack", 0.05
  );

  int mealCalorieTarget = (int) (remaining * mealAllocation.get(mealType));

  // Find recipes within ±100 calories of target
  return recipeRepository.findByCaloriesRange(
    mealCalorieTarget - 100,
    mealCalorieTarget + 100
  );
}
```

#### 4.3 Dietary Restriction Filters

**Database schema:**
```sql
ALTER TABLE recipe ADD COLUMN dietary_tags TEXT[];

CREATE INDEX idx_recipe_dietary_tags ON recipe USING gin(dietary_tags);

-- Tags: vegan, vegetarian, gluten-free, dairy-free, keto, paleo,
--       low-carb, high-protein, nut-free, soy-free
```

**Auto-tagging logic:**
```java
public Set<String> detectDietaryTags(Recipe recipe) {
  Set<String> tags = new HashSet<>();

  List<String> ingredients = recipe.getIngredientNames();
  Map<String, Object> nutrition = recipe.getNutritionMap();

  // Vegan check
  if (noAnimalProducts(ingredients)) {
    tags.add("vegan");
    tags.add("vegetarian");
  }

  // Gluten-free check
  if (!containsGluten(ingredients)) {
    tags.add("gluten-free");
  }

  // Keto check (high fat, low carb)
  if ((int) nutrition.get("carbs") < 20 &&
      (int) nutrition.get("fat") > 50) {
    tags.add("keto");
    tags.add("low-carb");
  }

  // High-protein check
  if ((int) nutrition.get("protein") > 30) {
    tags.add("high-protein");
  }

  return tags;
}
```

#### 4.4 Allergy Warnings

```sql
CREATE TABLE user_allergies (
  user_id UUID REFERENCES app_user(id),
  allergen TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  PRIMARY KEY (user_id, allergen)
);
```

**Allergy detection:**
```java
@GetMapping("/api/v1/recipes/{id}/allergy-check")
public AllergyCheckResponse checkAllergies(
  @PathVariable UUID recipeId,
  @RequestHeader("X-User-ID") UUID userId) {

  List<String> userAllergies = allergyRepository.findByUserId(userId);
  List<String> recipeIngredients = recipeService.getIngredients(recipeId);

  List<String> detected = userAllergies.stream()
    .filter(allergen -> containsAllergen(recipeIngredients, allergen))
    .collect(Collectors.toList());

  return AllergyCheckResponse.builder()
    .isSafe(detected.isEmpty())
    .detectedAllergens(detected)
    .warnings(generateWarnings(detected))
    .build();
}
```

#### 4.5 Personalized Recipe Recommendations

```java
public List<RecipeCard> getPersonalizedRecommendations(UUID userId) {
  UserProfile profile = userService.getProfile(userId);
  FitnessGoal goal = profile.getFitnessGoal(); // WEIGHT_LOSS, MUSCLE_GAIN, MAINTAIN

  // Weight Loss: High protein, low carb, calorie deficit
  if (goal == FitnessGoal.WEIGHT_LOSS) {
    return recipeRepository.findByMacros(
      minProtein: 25,
      maxCarbs: 40,
      maxCalories: profile.getTargetCalories() / 3 // per meal
    );
  }

  // Muscle Gain: High protein, moderate carbs, calorie surplus
  if (goal == FitnessGoal.MUSCLE_GAIN) {
    return recipeRepository.findByMacros(
      minProtein: 35,
      minCarbs: 50,
      minCalories: (profile.getTargetCalories() / 3) + 100
    );
  }

  // Maintenance: Balanced macros
  return recipeRepository.findBalancedMeals(profile.getTargetCalories());
}
```

**Files to create:**
- `MacroFilterService.java` - Macro-based filtering
- `DietaryTagService.java` - Auto-tagging logic
- `AllergyService.java` - Allergy detection
- `PersonalizedRecommendationService.java` - Smart recommendations
- Domain: `UserAllergy.java`, `DietaryTag.java`

### Expected Results
- ✅ Users reach nutrition goals 3x faster
- ✅ Reduced allergy incidents
- ✅ 80% of users receive relevant recommendations
- ✅ Recipe suggestions match fitness goals

---

## 📊 Week 5: Data Quality & Enrichment

**Goal:** Improve recipe data accuracy and add valuable metadata

### Tasks

#### 5.1 Enhanced Nutrition Data Accuracy

**Multi-source nutrition data:**
```java
public NutritionInfo getAccurateNutrition(Recipe recipe) {
  // Priority order:
  // 1. Spoonacular API (most accurate)
  // 2. USDA FoodData Central API
  // 3. Nutritionix API
  // 4. Calculated from ingredients
  // 5. Default estimates

  NutritionInfo spoonacular = fetchFromSpoonacular(recipe.getId());
  if (spoonacular.isComplete()) {
    return spoonacular;
  }

  NutritionInfo usda = calculateFromUSDA(recipe.getIngredients());
  return mergeNutritionData(spoonacular, usda);
}
```

#### 5.2 Cost Estimation Per Recipe

```sql
CREATE TABLE ingredient_cost (
  ingredient_id UUID REFERENCES ingredient(id),
  region TEXT NOT NULL,
  avg_cost_per_unit DECIMAL(10,2),
  unit TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (ingredient_id, region)
);
```

**Cost calculation:**
```java
public RecipeCostEstimate estimateCost(UUID recipeId, String region) {
  Recipe recipe = recipeRepository.findById(recipeId);

  double totalCost = recipe.getIngredients().stream()
    .mapToDouble(ri -> {
      double unitCost = ingredientCostRepository
        .findByIngredientAndRegion(ri.getIngredient().getId(), region)
        .orElse(0.0);
      return unitCost * ri.getQuantity();
    })
    .sum();

  return RecipeCostEstimate.builder()
    .totalCost(totalCost)
    .costPerServing(totalCost / recipe.getServings())
    .confidence(calculateConfidence(recipe.getIngredients()))
    .build();
}
```

#### 5.3 Seasonal Ingredient Suggestions

```sql
CREATE TABLE ingredient_seasonality (
  ingredient_id UUID REFERENCES ingredient(id),
  month INTEGER CHECK (month >= 1 AND month <= 12),
  availability TEXT CHECK (availability IN ('peak', 'available', 'limited')),
  PRIMARY KEY (ingredient_id, month)
);
```

**Seasonal recommendations:**
```java
public List<RecipeCard> getSeasonalRecipes() {
  int currentMonth = LocalDate.now().getMonthValue();

  // Get ingredients that are in peak season
  List<UUID> seasonalIngredients = ingredientSeasonalityRepository
    .findByMonthAndAvailability(currentMonth, "peak")
    .stream()
    .map(IngredientSeasonality::getIngredientId)
    .collect(Collectors.toList());

  // Find recipes featuring seasonal ingredients
  return recipeRepository.findByIngredients(seasonalIngredients);
}
```

#### 5.4 Ingredient Substitution Suggestions

```sql
CREATE TABLE ingredient_substitution (
  ingredient_id UUID REFERENCES ingredient(id),
  substitute_id UUID REFERENCES ingredient(id),
  ratio DECIMAL(5,2) DEFAULT 1.0, -- e.g., 1 cup butter = 0.8 cup oil
  notes TEXT,
  dietary_reason TEXT[], -- e.g., ['vegan', 'dairy-free']
  PRIMARY KEY (ingredient_id, substitute_id)
);
```

**Smart substitutions:**
```java
public List<SubstitutionSuggestion> getSuggestions(
  UUID recipeId,
  List<String> userRestrictions) {

  Recipe recipe = recipeRepository.findById(recipeId);
  List<SubstitutionSuggestion> suggestions = new ArrayList<>();

  for (RecipeIngredient ri : recipe.getIngredients()) {
    List<IngredientSubstitution> substitutes =
      substitutionRepository.findByIngredient(ri.getIngredient().getId());

    // Filter by dietary restrictions
    substitutes = substitutes.stream()
      .filter(sub -> matchesRestrictions(sub, userRestrictions))
      .collect(Collectors.toList());

    if (!substitutes.isEmpty()) {
      suggestions.add(SubstitutionSuggestion.builder()
        .original(ri.getIngredient().getName())
        .substitutes(substitutes)
        .impact("Nutrition may vary slightly")
        .build());
    }
  }

  return suggestions;
}
```

#### 5.5 Recipe Difficulty Scoring Improvements

**Current:** Manual "easy/medium/hard"
**Improved:** Calculated score (1-10)

```java
public int calculateDifficultyScore(Recipe recipe) {
  int score = 0;

  // Factor 1: Number of steps (more steps = harder)
  int stepCount = recipe.getSteps().size();
  score += Math.min(stepCount / 2, 3); // Max 3 points

  // Factor 2: Cooking techniques
  List<String> advancedTechniques = List.of(
    "julienne", "flambe", "sous vide", "deglaze", "emulsify", "tempering"
  );
  long advancedCount = recipe.getInstructions().stream()
    .filter(step -> advancedTechniques.stream()
      .anyMatch(tech -> step.toLowerCase().contains(tech)))
    .count();
  score += advancedCount * 2; // 2 points per advanced technique

  // Factor 3: Cooking time
  if (recipe.getTimeMinutes() > 60) score += 2;
  if (recipe.getTimeMinutes() > 90) score += 2;

  // Factor 4: Number of ingredients
  int ingredientCount = recipe.getIngredients().size();
  score += Math.min(ingredientCount / 5, 3); // Max 3 points

  // Factor 5: Equipment requirements
  List<String> advancedEquipment = List.of(
    "stand mixer", "food processor", "immersion blender", "thermometer"
  );
  long equipmentCount = recipe.getInstructions().stream()
    .filter(step -> advancedEquipment.stream()
      .anyMatch(eq -> step.toLowerCase().contains(eq)))
    .count();
  score += equipmentCount;

  return Math.min(score, 10); // Cap at 10
}
```

#### 5.6 Cooking Time Accuracy Validation

**Track actual vs estimated time:**
```sql
CREATE TABLE recipe_time_feedback (
  id UUID PRIMARY KEY,
  recipe_id UUID REFERENCES recipe(id),
  user_id UUID REFERENCES app_user(id),
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Adjust estimates based on feedback:**
```java
public int getAdjustedCookingTime(UUID recipeId) {
  Integer originalTime = recipeRepository.findById(recipeId).getTimeMinutes();

  // Get average actual time from user feedback
  Double avgActualTime = timeFeedbackRepository
    .findByRecipeId(recipeId)
    .stream()
    .mapToInt(RecipeTimeFeedback::getActualMinutes)
    .average()
    .orElse(originalTime);

  // If significant difference (>20%), adjust
  if (Math.abs(avgActualTime - originalTime) > originalTime * 0.2) {
    return (int) Math.round(avgActualTime);
  }

  return originalTime;
}
```

**Files to create:**
- `NutritionDataEnrichmentService.java` - Multi-source nutrition
- `RecipeCostService.java` - Cost estimation
- `SeasonalIngredientService.java` - Seasonal recommendations
- `IngredientSubstitutionService.java` - Smart substitutions
- `RecipeDifficultyService.java` - Difficulty scoring
- `CookingTimeFeedbackService.java` - Time accuracy
- Domain: `IngredientCost.java`, `IngredientSeasonality.java`, etc.

### Expected Results
- ✅ Nutrition accuracy improved by 95%
- ✅ Cost estimates help budget-conscious users
- ✅ Seasonal recipes increase engagement
- ✅ Difficulty scores more accurate
- ✅ Time estimates within 10% of actual

---

## 🌐 Week 6: Social & Engagement Features

**Goal:** Build community features to increase user retention

### Tasks

#### 6.1 User-Submitted Recipes

```java
@PostMapping("/api/v1/recipes/submit")
public RecipeSubmissionResponse submitRecipe(
  @RequestHeader("X-User-ID") UUID userId,
  @RequestBody RecipeSubmissionRequest request) {

  // 1. Validate recipe data
  // 2. Extract nutrition from ingredients (estimate)
  // 3. Save as "pending approval" or "user-submitted"
  // 4. Optionally: AI moderation for inappropriate content

  Recipe recipe = Recipe.builder()
    .title(request.getTitle())
    .submittedBy(userId)
    .status(RecipeStatus.PENDING_APPROVAL)
    .build();

  return RecipeSubmissionResponse.builder()
    .recipeId(recipe.getId())
    .status("pending_approval")
    .estimatedApprovalTime("24-48 hours")
    .build();
}
```

#### 6.2 Recipe Sharing Functionality

```java
@PostMapping("/api/v1/recipes/{id}/share")
public RecipeShareResponse shareRecipe(
  @PathVariable UUID recipeId,
  @RequestBody ShareRequest request) {

  // Generate shareable link
  String shareCode = generateShareCode(recipeId);
  String shareUrl = "https://app.camerafitness.com/recipes/" + shareCode;

  // Track shares for analytics
  shareTracker.track(recipeId, request.getPlatform());

  return RecipeShareResponse.builder()
    .shareUrl(shareUrl)
    .qrCode(generateQRCode(shareUrl))
    .deepLink(generateDeepLink(recipeId))
    .build();
}

@GetMapping("/recipes/{shareCode}")
public RecipeCard getSharedRecipe(@PathVariable String shareCode) {
  UUID recipeId = resolveShareCode(shareCode);
  return recipeService.getRecipe(recipeId);
}
```

#### 6.3 Meal Plan Sharing

```java
@PostMapping("/api/v1/meal-plans/{id}/share")
public MealPlanShareResponse shareMealPlan(@PathVariable UUID mealPlanId) {
  MealPlan plan = mealPlanService.get(mealPlanId);

  // Create public snapshot (read-only copy)
  MealPlanSnapshot snapshot = MealPlanSnapshot.builder()
    .originalMealPlanId(mealPlanId)
    .recipes(plan.getRecipes())
    .nutritionSummary(plan.getNutritionSummary())
    .createdBy(plan.getUserId())
    .createdAt(Instant.now())
    .build();

  String shareCode = snapshotRepository.save(snapshot).getShareCode();

  return MealPlanShareResponse.builder()
    .shareUrl("https://app.camerafitness.com/meal-plans/" + shareCode)
    .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
    .build();
}
```

#### 6.4 Community Favorites & Trending

```java
@GetMapping("/api/v1/recipes/community/favorites")
public List<RecipeCard> getCommunityFavorites(
  @RequestParam(defaultValue = "week") String timeframe) {

  // Most saved/liked recipes in the community
  Instant since = switch(timeframe) {
    case "day" -> Instant.now().minus(1, ChronoUnit.DAYS);
    case "week" -> Instant.now().minus(7, ChronoUnit.DAYS);
    case "month" -> Instant.now().minus(30, ChronoUnit.DAYS);
    default -> Instant.now().minus(7, ChronoUnit.DAYS);
  };

  return recipeRepository.findMostSavedSince(since, PageRequest.of(0, 20));
}

@GetMapping("/api/v1/recipes/trending")
public List<RecipeCard> getTrending() {
  // Trending algorithm: (saves + views + shares) in last 24h
  return redisTemplate.opsForZSet()
    .reverseRange("trending:recipes", 0, 19)
    .stream()
    .map(id -> recipeService.getRecipe(UUID.fromString(id)))
    .collect(Collectors.toList());
}
```

#### 6.5 Recipe Collections/Cookbooks

```sql
CREATE TABLE recipe_collection (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES app_user(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recipe_collection_item (
  collection_id UUID REFERENCES recipe_collection(id),
  recipe_id UUID REFERENCES recipe(id),
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  PRIMARY KEY (collection_id, recipe_id)
);
```

**API endpoints:**
```java
@PostMapping("/api/v1/collections")
public CollectionResponse createCollection(@RequestBody CreateCollectionRequest request);

@PostMapping("/api/v1/collections/{id}/recipes/{recipeId}")
public void addRecipeToCollection(@PathVariable UUID id, @PathVariable UUID recipeId);

@GetMapping("/api/v1/collections/{id}")
public CollectionDetailResponse getCollection(@PathVariable UUID id);

@GetMapping("/api/v1/collections/discover")
public List<CollectionResponse> discoverCollections();
// Examples: "Quick Weeknight Dinners", "Meal Prep Sundays", "Keto Favorites"
```

#### 6.6 Photo Upload for Completed Recipes

```java
@PostMapping("/api/v1/recipes/{id}/photos")
public PhotoUploadResponse uploadPhoto(
  @PathVariable UUID recipeId,
  @RequestPart("photo") MultipartFile photo,
  @RequestHeader("X-User-ID") UUID userId) {

  // 1. Validate image (size, format)
  // 2. Upload to S3/CloudFlare Images
  // 3. Generate thumbnails
  // 4. Store reference in database

  String imageUrl = s3Service.upload(photo, "recipe-photos/" + recipeId);

  RecipePhoto recipePhoto = RecipePhoto.builder()
    .recipeId(recipeId)
    .userId(userId)
    .imageUrl(imageUrl)
    .build();

  recipePhotoRepository.save(recipePhoto);

  return PhotoUploadResponse.builder()
    .photoUrl(imageUrl)
    .thumbnailUrl(imageUrl + "?w=300&h=300")
    .build();
}

@GetMapping("/api/v1/recipes/{id}/photos")
public List<RecipePhotoResponse> getPhotos(@PathVariable UUID recipeId) {
  // Show user-submitted photos (inspiration!)
}
```

**Files to create:**
- `RecipeSubmissionService.java` - User recipe submission
- `RecipeShareService.java` - Sharing logic
- `CommunityRecipeService.java` - Community features
- `RecipeCollectionService.java` - Collections/cookbooks
- `RecipePhotoService.java` - Photo management
- `S3StorageService.java` - Cloud storage integration
- Domain: `RecipeSubmission.java`, `RecipeCollection.java`, `RecipePhoto.java`

### Expected Results
- ✅ User retention increased by 40%
- ✅ Community-generated content grows
- ✅ Viral sharing increases user acquisition
- ✅ Collections increase engagement time

---

## 📈 Week 7: Integration & Analytics

**Goal:** Deep integration with fitness tracking and actionable analytics

### Tasks

#### 7.1 Fitness Goal Integration

```java
public RecipeSuggestionResponse getSuggestionsForGoal(UUID userId) {
  UserProfile profile = userService.getProfile(userId);
  FitnessGoal goal = profile.getFitnessGoal();
  WorkoutIntensity todayWorkout = workoutService.getTodayIntensity(userId);

  MacroTargets targets = switch(goal) {
    case WEIGHT_LOSS -> MacroTargets.builder()
      .calorieDeficit(500) // 500 cal/day = 1 lb/week
      .protein(profile.getWeight() * 0.8) // 0.8g per lb
      .carbRatio(0.30) // 30% of calories from carbs
      .fatRatio(0.30)
      .build();

    case MUSCLE_GAIN -> MacroTargets.builder()
      .calorieSurplus(300)
      .protein(profile.getWeight() * 1.0) // 1g per lb
      .carbRatio(0.40)
      .fatRatio(0.25)
      .build();

    case MAINTENANCE -> calculateMaintenanceTargets(profile);
  };

  // Adjust for workout intensity
  if (todayWorkout == WorkoutIntensity.HIGH) {
    targets = targets.adjustForWorkout(200); // +200 calories
  }

  return recipeSuggestionService.findMatchingRecipes(targets);
}
```

#### 7.2 Workout-Meal Pairing Recommendations

```java
@GetMapping("/api/v1/recipes/workout-pairing")
public WorkoutMealPairingResponse getWorkoutMealPairing(
  @RequestHeader("X-User-ID") UUID userId,
  @RequestParam String workoutType,
  @RequestParam String timing) { // "pre-workout" or "post-workout"

  if (timing.equals("pre-workout")) {
    // Pre-workout: Moderate carbs, low fat, easy to digest
    // 1-2 hours before workout
    return RecipeSuggestionResponse.builder()
      .recipes(recipeRepository.findPreWorkoutMeals())
      .reasoning("Light carbs for energy, low fat for easy digestion")
      .suggestedTiming("1-2 hours before workout")
      .build();
  }

  if (timing.equals("post-workout")) {
    // Post-workout: High protein, moderate carbs (replenish glycogen)
    // Within 30-60 minutes
    return RecipeSuggestionResponse.builder()
      .recipes(recipeRepository.findPostWorkoutMeals())
      .reasoning("High protein for muscle recovery, carbs to replenish energy")
      .suggestedTiming("Within 30-60 minutes after workout")
      .build();
  }
}
```

#### 7.3 Calorie Burn vs Intake Dashboard

```java
@GetMapping("/api/v1/dashboard/nutrition")
public NutritionDashboardResponse getDashboard(
  @RequestHeader("X-User-ID") UUID userId,
  @RequestParam(defaultValue = "today") String period) {

  UserProfile profile = userService.getProfile(userId);

  // Calculate TDEE (Total Daily Energy Expenditure)
  int bmr = calculateBMR(profile); // Basal Metabolic Rate
  int activityCalories = workoutService.getTodayCaloriesBurned(userId);
  int tdee = bmr + activityCalories;

  // Get consumed calories
  int consumed = mealLogService.getTodayCalories(userId);

  // Get macro breakdown
  MacroBreakdown macros = mealLogService.getTodayMacros(userId);

  // Calculate remaining
  int remaining = tdee - consumed;

  return NutritionDashboardResponse.builder()
    .date(LocalDate.now())
    .tdee(tdee)
    .consumed(consumed)
    .remaining(remaining)
    .macros(macros)
    .goal(profile.getFitnessGoal())
    .recommendations(generateRecommendations(remaining, macros))
    .build();
}
```

**Dashboard visualization data:**
```json
{
  "date": "2025-01-14",
  "tdee": 2500,
  "consumed": 1800,
  "remaining": 700,
  "macros": {
    "protein": {"consumed": 120, "target": 150, "unit": "g"},
    "carbs": {"consumed": 180, "target": 200, "unit": "g"},
    "fat": {"consumed": 60, "target": 70, "unit": "g"}
  },
  "goal": "MUSCLE_GAIN",
  "recommendations": [
    {
      "message": "You need 700 more calories today",
      "action": "Have a high-protein dinner",
      "recipes": [...]
    }
  ],
  "weeklyTrend": {
    "averageCalories": 2100,
    "adherenceRate": 85,
    "projectedWeightChange": "+0.3 lbs"
  }
}
```

#### 7.4 Meal Timing Optimization

```java
public MealTimingRecommendation getOptimalMealTiming(UUID userId) {
  UserProfile profile = userService.getProfile(userId);
  List<WorkoutSession> workouts = workoutService.getWeeklySchedule(userId);

  // Circadian rhythm optimization
  // - Largest meal when most active
  // - Higher carbs earlier in the day
  // - Lighter dinner 2-3 hours before bed

  return MealTimingRecommendation.builder()
    .breakfast(generateBreakfastPlan(profile, workouts))
    .lunch(generateLunchPlan(profile, workouts))
    .dinner(generateDinnerPlan(profile, workouts))
    .snacks(generateSnackPlan(profile, workouts))
    .build();
}
```

#### 7.5 Analytics Dashboard for Recipe Usage

**Admin/Analytics dashboard:**
```java
@GetMapping("/api/v1/admin/analytics/recipes")
public RecipeAnalyticsResponse getRecipeAnalytics(
  @RequestParam LocalDate startDate,
  @RequestParam LocalDate endDate) {

  return RecipeAnalyticsResponse.builder()
    .totalRecipes(recipeRepository.count())
    .totalViews(viewTracker.count(startDate, endDate))
    .totalSearches(searchTracker.count(startDate, endDate))
    .mostViewedRecipes(getMostViewed(startDate, endDate))
    .mostSavedRecipes(getMostSaved(startDate, endDate))
    .searchKeywords(getTopSearchKeywords(startDate, endDate))
    .conversionRate(calculateConversionRate(startDate, endDate))
    .avgRecipesPerUser(calculateAvgRecipesPerUser())
    .retentionImpact(calculateRetentionImpact())
    .build();
}
```

**Metrics to track:**
- Recipe view count
- Recipe save rate (views → saves)
- Recipe completion rate (saved → cooked)
- Search query analysis
- Failed searches (no results)
- User retention (recipe users vs non-recipe users)
- Feature adoption (meal planning, shopping lists, etc.)

#### 7.6 Pre/Post Workout Meal Suggestions

```java
@GetMapping("/api/v1/recipes/workout-nutrition")
public WorkoutNutritionResponse getWorkoutNutrition(
  @RequestHeader("X-User-ID") UUID userId) {

  WorkoutSession nextWorkout = workoutService.getNextScheduledWorkout(userId);

  if (nextWorkout == null) {
    return WorkoutNutritionResponse.builder()
      .message("No upcoming workouts scheduled")
      .build();
  }

  Duration timeUntilWorkout = Duration.between(Instant.now(), nextWorkout.getStartTime());

  if (timeUntilWorkout.toHours() <= 2) {
    // Pre-workout meal suggestion
    return WorkoutNutritionResponse.builder()
      .timing("pre-workout")
      .recommendation("Light meal 1-2 hours before")
      .recipes(recipeRepository.findPreWorkoutMeals())
      .macroTargets(MacroTargets.builder()
        .carbs(40) // Quick energy
        .protein(15)
        .fat(5) // Low fat for easy digestion
        .build())
      .build();
  }

  // Post-workout (within 30 min of completion)
  if (nextWorkout.isCompleted() &&
      Duration.between(nextWorkout.getEndTime(), Instant.now()).toMinutes() <= 30) {
    return WorkoutNutritionResponse.builder()
      .timing("post-workout")
      .recommendation("Protein + carbs for recovery")
      .recipes(recipeRepository.findPostWorkoutMeals())
      .macroTargets(MacroTargets.builder()
        .carbs(50)
        .protein(30) // Muscle recovery
        .fat(10)
        .build())
      .build();
  }
}
```

**Files to create:**
- `FitnessRecipeIntegrationService.java` - Fitness goal integration
- `WorkoutMealPairingService.java` - Workout-meal pairing
- `NutritionDashboardService.java` - Dashboard data
- `MealTimingService.java` - Optimal meal timing
- `RecipeAnalyticsService.java` - Analytics tracking
- `WorkoutNutritionService.java` - Pre/post workout meals

### Expected Results
- ✅ Nutrition-fitness alignment increases goal achievement by 60%
- ✅ Dashboard provides actionable insights
- ✅ Workout-meal pairing improves performance
- ✅ Analytics drive product improvements
- ✅ User retention increased by 35%

---

## 📱 Week 8: Mobile & Advanced Features

**Goal:** Mobile-first optimizations and cutting-edge features

### Tasks

#### 8.1 Offline Recipe Access

**PWA Strategy:**
```javascript
// Service Worker for offline caching
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/v1/recipes/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((response) => {
          // Cache the recipe for offline access
          return caches.open('recipes-v1').then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
  }
});
```

**API support:**
```java
@PostMapping("/api/v1/recipes/download")
public RecipeOfflinePackage downloadForOffline(
  @RequestHeader("X-User-ID") UUID userId,
  @RequestBody List<UUID> recipeIds) {

  // Bundle recipes with all images for offline use
  List<Recipe> recipes = recipeRepository.findAllById(recipeIds);

  return RecipeOfflinePackage.builder()
    .recipes(recipes)
    .images(downloadImages(recipes))
    .lastUpdated(Instant.now())
    .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
    .build();
}
```

#### 8.2 Voice-Guided Cooking Mode

**API for step-by-step voice guidance:**
```java
@GetMapping("/api/v1/recipes/{id}/voice-guide")
public VoiceGuidedRecipeResponse getVoiceGuide(@PathVariable UUID id) {
  Recipe recipe = recipeRepository.findById(id);

  List<VoiceStep> voiceSteps = recipe.getSteps().stream()
    .map(step -> VoiceStep.builder()
      .stepNumber(step.getStep())
      .instruction(step.getInstruction())
      .estimatedDuration(estimateStepDuration(step))
      .audioUrl(generateAudioUrl(step)) // Text-to-speech
      .pausePoints(detectNaturalPauses(step))
      .build())
    .collect(Collectors.toList());

  return VoiceGuidedRecipeResponse.builder()
    .recipeId(id)
    .steps(voiceSteps)
    .totalEstimatedTime(recipe.getTimeMinutes())
    .handsFreeMode(true)
    .build();
}
```

**Mobile features:**
- Voice commands: "Next step", "Repeat step", "Pause", "Set timer"
- Hands-free operation (perfect when hands are messy)
- Automatic timer setting for steps that require waiting

#### 8.3 Barcode Scanner for Ingredients

**Integration with Open Food Facts API:**
```java
@PostMapping("/api/v1/ingredients/scan")
public IngredientScanResponse scanBarcode(@RequestBody BarcodeRequest request) {
  // 1. Scan barcode with mobile camera
  // 2. Query Open Food Facts API
  // 3. Extract ingredient/product info
  // 4. Add to user's pantry/shopping list

  String barcode = request.getBarcode();

  RestTemplate restTemplate = new RestTemplate();
  String url = "https://world.openfoodfacts.org/api/v0/product/" + barcode + ".json";

  OpenFoodFactsResponse response = restTemplate.getForObject(url, OpenFoodFactsResponse.class);

  if (response.getStatus() == 1) {
    Product product = response.getProduct();

    return IngredientScanResponse.builder()
      .productName(product.getProductName())
      .brand(product.getBrands())
      .nutrition(extractNutrition(product))
      .ingredients(product.getIngredients())
      .suggestedRecipes(findRecipesWithIngredient(product.getProductName()))
      .build();
  }

  return IngredientScanResponse.notFound();
}
```

**Use cases:**
- Scan ingredients to add to virtual pantry
- Scan to find recipes using that ingredient
- Scan to log meals (packaged foods)

#### 8.4 Smart Grocery List (Deduplication & Organization)

```java
public SmartShoppingList generateSmartList(List<UUID> recipeIds, UUID userId) {
  // 1. Get all ingredients from selected recipes
  List<RecipeIngredient> allIngredients = recipeIds.stream()
    .flatMap(id -> recipeRepository.findById(id).getIngredients().stream())
    .collect(Collectors.toList());

  // 2. Check user's pantry (don't buy what they have)
  List<String> pantryItems = pantryService.getUserPantry(userId);
  allIngredients = allIngredients.stream()
    .filter(ing -> !pantryItems.contains(ing.getIngredient().getName()))
    .collect(Collectors.toList());

  // 3. Merge duplicate ingredients (aggregate quantities)
  Map<String, IngredientQuantity> merged = new HashMap<>();
  for (RecipeIngredient ri : allIngredients) {
    String name = ri.getIngredient().getName();
    if (merged.containsKey(name)) {
      merged.get(name).add(ri.getQuantity(), ri.getUnit());
    } else {
      merged.put(name, new IngredientQuantity(ri.getQuantity(), ri.getUnit()));
    }
  }

  // 4. Organize by grocery store layout
  Map<String, List<ShoppingItem>> organized = organizeByDepartment(merged);

  // 5. Optimize shopping order (reduce backtracking in store)
  List<String> departmentOrder = List.of(
    "Produce", "Meat & Seafood", "Dairy", "Bakery",
    "Pantry", "Frozen", "Beverages"
  );

  return SmartShoppingList.builder()
    .items(organized)
    .departmentOrder(departmentOrder)
    .estimatedCost(calculateTotalCost(merged))
    .estimatedShoppingTime(20) // minutes
    .build();
}
```

#### 8.5 Recipe Video Integration

**YouTube video recommendations:**
```java
@GetMapping("/api/v1/recipes/{id}/videos")
public RecipeVideoResponse getVideos(@PathVariable UUID id) {
  Recipe recipe = recipeRepository.findById(id);

  // Search YouTube for cooking videos
  String query = recipe.getTitle() + " recipe cooking tutorial";

  YouTube.Search.List search = youtube.search().list("snippet");
  search.setQ(query);
  search.setType("video");
  search.setMaxResults(5L);
  search.setVideoDuration("medium"); // 4-20 minutes
  search.setOrder("relevance");

  SearchListResponse response = search.execute();

  List<VideoRecommendation> videos = response.getItems().stream()
    .map(item -> VideoRecommendation.builder()
      .videoId(item.getId().getVideoId())
      .title(item.getSnippet().getTitle())
      .thumbnail(item.getSnippet().getThumbnails().getMedium().getUrl())
      .channelName(item.getSnippet().getChannelTitle())
      .url("https://www.youtube.com/watch?v=" + item.getId().getVideoId())
      .build())
    .collect(Collectors.toList());

  return RecipeVideoResponse.builder()
    .recipe(recipe.getTitle())
    .videos(videos)
    .build();
}
```

#### 8.6 Cooking Timer Integration

**Multi-timer support:**
```java
@PostMapping("/api/v1/cooking/timers")
public CookingTimerResponse createTimer(@RequestBody CreateTimerRequest request) {
  CookingTimer timer = CookingTimer.builder()
    .recipeId(request.getRecipeId())
    .stepNumber(request.getStepNumber())
    .durationSeconds(request.getDurationSeconds())
    .label(request.getLabel())
    .userId(request.getUserId())
    .startedAt(Instant.now())
    .expiresAt(Instant.now().plusSeconds(request.getDurationSeconds()))
    .build();

  timerRepository.save(timer);

  // Send push notification when timer completes
  notificationService.scheduleNotification(
    timer.getUserId(),
    "Timer complete: " + timer.getLabel(),
    timer.getExpiresAt()
  );

  return CookingTimerResponse.builder()
    .timerId(timer.getId())
    .expiresAt(timer.getExpiresAt())
    .build();
}

@GetMapping("/api/v1/cooking/timers/active")
public List<CookingTimer> getActiveTimers(@RequestHeader("X-User-ID") UUID userId) {
  return timerRepository.findByUserIdAndExpiresAtAfter(userId, Instant.now());
}
```

**Mobile app features:**
- Multiple simultaneous timers (pasta + sauce + vegetables)
- Background notifications
- Timer synced across devices
- Voice control: "Set timer for 10 minutes"

#### 8.7 Image Optimization & Lazy Loading

**Responsive images:**
```java
@GetMapping("/api/v1/recipes/{id}/image")
public ResponseEntity<byte[]> getOptimizedImage(
  @PathVariable UUID id,
  @RequestParam(required = false) Integer width,
  @RequestParam(required = false) Integer height,
  @RequestParam(required = false, defaultValue = "80") Integer quality) {

  Recipe recipe = recipeRepository.findById(id);
  String imageUrl = recipe.getImageUrl();

  // Use image processing service (e.g., Cloudflare Images, ImageKit)
  String optimizedUrl = imageUrl +
    "?w=" + (width != null ? width : 800) +
    "&h=" + (height != null ? height : 600) +
    "&q=" + quality +
    "&fm=webp"; // Use WebP format for better compression

  // Redirect to CDN or return optimized image
  return ResponseEntity.status(HttpStatus.FOUND)
    .header("Location", optimizedUrl)
    .build();
}
```

**Lazy loading strategy:**
- Load recipe list with low-res thumbnails (100KB per image)
- Full-res images only when user opens recipe
- Progressive image loading (blur → full quality)

#### 8.8 Push Notifications for Meal Planning

```java
@Service
public class MealPlanNotificationService {

  public void scheduleDailyMealReminders(UUID userId) {
    UserProfile profile = userService.getProfile(userId);
    MealPlan todayPlan = mealPlanService.getTodayPlan(userId);

    // Morning: Breakfast reminder
    scheduleNotification(userId,
      "Good morning! Ready for breakfast?",
      todayPlan.getBreakfast().getTitle(),
      profile.getBreakfastTime());

    // Midday: Lunch reminder
    scheduleNotification(userId,
      "Time for lunch!",
      todayPlan.getLunch().getTitle(),
      profile.getLunchTime());

    // Evening: Dinner reminder + prep time
    Instant dinnerPrepTime = profile.getDinnerTime()
      .minus(todayPlan.getDinner().getTimeMinutes(), ChronoUnit.MINUTES);
    scheduleNotification(userId,
      "Start preparing dinner soon!",
      todayPlan.getDinner().getTitle(),
      dinnerPrepTime);
  }

  public void scheduleShoppingReminder(UUID userId) {
    // Remind user to shop on Sunday for the week
    scheduleNotification(userId,
      "Don't forget to do your grocery shopping!",
      "Your shopping list is ready",
      getNextSunday().atTime(10, 0));
  }
}
```

**Files to create:**
- `OfflineRecipeService.java` - Offline access management
- `VoiceGuidedCookingService.java` - Voice guidance
- `BarcodeScanService.java` - Barcode scanning integration
- `SmartShoppingListService.java` - Smart grocery list
- `RecipeVideoService.java` - Video recommendations
- `CookingTimerService.java` - Timer management
- `ImageOptimizationService.java` - Image processing
- `MealPlanNotificationService.java` - Push notifications

### Expected Results
- ✅ Offline mode enables cooking without internet
- ✅ Voice guidance improves cooking experience
- ✅ Barcode scanner simplifies pantry management
- ✅ Smart grocery list saves time & money
- ✅ Video integration helps novice cooks
- ✅ Timers reduce overcooking/burning
- ✅ Optimized images reduce data usage by 70%
- ✅ Push notifications increase meal plan adherence

---

## 📊 Implementation Priority Matrix

### High Impact, Low Effort (Do First)
1. ✅ Week 1: Performance & Caching - **Critical for scale**
2. ✅ Week 4: Macro-based filtering - **High user demand**
3. ✅ Week 3: Shopping list generation - **Quick win**

### High Impact, High Effort (Plan Carefully)
4. ✅ Week 2: Advanced search & recommendations - **Game changer**
5. ✅ Week 7: Fitness integration - **Core value prop**
6. ✅ Week 6: Social features - **Viral potential**

### Low Impact, Low Effort (Fill Gaps)
7. ✅ Week 5: Data quality improvements - **Incremental improvements**
8. ✅ Week 8: Mobile features - **Nice-to-have enhancements**

---

## 🎯 Success Metrics (KPIs)

### User Engagement
- **Recipe views per user**: Baseline → +50%
- **Recipes saved per user**: Baseline → +80%
- **Recipe completion rate**: 20% → 40%
- **Daily active users (DAU)**: Baseline → +60%

### Performance
- **API response time**: 500ms → 200ms
- **Page load time**: 3s → 1s
- **Spoonacular API costs**: $X → -80%

### Business Impact
- **User retention (30-day)**: 40% → 60%
- **Session duration**: 5 min → 8 min
- **Conversion rate (free → paid)**: +25%
- **NPS score**: +15 points

### Feature Adoption
- **Meal planning adoption**: 15% → 40%
- **Shopping list usage**: 0% → 30%
- **Recipe sharing rate**: 5% → 20%
- **Community recipes**: 0 → 500+ in 3 months

---

## 💰 Cost-Benefit Analysis

### Development Costs (8 weeks)
- **Engineering time**: 2 developers × 8 weeks = 320 hours
- **Infrastructure**: $500/month (Redis, S3, CDN)
- **API costs**: Reduced by 80% through caching

### Expected ROI
- **User retention improvement**: +40% = $X in LTV
- **API cost savings**: -$2,000/month
- **Reduced churn**: +20% retention = $Y saved
- **New feature upsell**: Meal planning premium tier

**Projected ROI: 300% in 6 months**

---

## 🚀 Getting Started

### Week 1 Kickoff Checklist
- [ ] Set up Redis instance (AWS ElastiCache or local)
- [ ] Create database indexes (V3 migration)
- [ ] Add Resilience4j dependencies
- [ ] Configure cache TTLs
- [ ] Set up monitoring (cache hit rate, query times)
- [ ] Run performance benchmarks (before/after)

### Development Environment Setup
```bash
# Install Redis locally
brew install redis
redis-server

# Run database migrations
./gradlew flywayMigrate

# Update application.yml with Redis config
spring:
  redis:
    host: localhost
    port: 6379
  cache:
    type: redis
    redis:
      time-to-live: 3600000 # 1 hour
```

---

## 📚 Additional Resources

### Technologies to Research
- **Resilience4j**: Circuit breaker, rate limiter, retry
- **Spring Cache**: @Cacheable, @CacheEvict, @CachePut
- **PostgreSQL full-text search**: ts_vector, ts_query
- **Redis sorted sets**: Leaderboards, trending recipes
- **Apache Commons Text**: Levenshtein distance for fuzzy matching
- **WebP image format**: 30% smaller than JPEG
- **Service Workers**: PWA offline caching

### Competitors to Analyze
- **MyFitnessPal**: Nutrition tracking, barcode scanner
- **Mealime**: Meal planning, shopping lists
- **Yummly**: Smart recipe recommendations
- **Tasty (BuzzFeed)**: Video recipes, social sharing

---

## ✅ Summary

This 8-week plan transforms your recipe system from **basic search** to **intelligent, personalized nutrition platform**.

**Week 1-2**: Foundation (performance, search)
**Week 3-4**: User experience (shopping lists, personalization)
**Week 5-6**: Quality & community (data enrichment, social)
**Week 7-8**: Integration & mobile (fitness sync, offline mode)

**Result**: 2-3x user engagement, 40% better retention, viral growth through social features.

Ready to start with Week 1?
