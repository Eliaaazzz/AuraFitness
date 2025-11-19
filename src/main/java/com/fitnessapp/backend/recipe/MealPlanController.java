package com.fitnessapp.backend.recipe;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fitnessapp.backend.domain.MealPlan;
import com.fitnessapp.backend.recipe.SmartRecipeService.MealPlanResponse;
import com.fitnessapp.backend.recipe.SmartRecipeService.NutritionTarget;
import com.fitnessapp.backend.service.RecipeSwapService;
import com.fitnessapp.backend.service.RecipeSwapService.AlternativeRecipe;
import com.fitnessapp.backend.service.ShoppingListService;
import com.fitnessapp.backend.service.ShoppingListService.ShoppingListDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

@RestController
@RequestMapping("/api/v1/meal-plan")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Meal Plan", description = "AI-powered personalized meal plan generation and management")
public class MealPlanController {

  private final SmartRecipeService smartRecipeService;
  private final MealPlanHistoryService mealPlanHistoryService;
  private final ObjectMapper objectMapper;
  private final RecipeSwapService recipeSwapService;
  private final ShoppingListService shoppingListService;

  @Operation(
    summary = "Generate personalized 7-day meal plan",
    description = "Uses GPT-4 AI to generate a personalized 7-day meal plan based on user profile, fitness goals, and dietary preferences"
  )
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Meal plan generated successfully"),
    @ApiResponse(responseCode = "400", description = "Invalid request"),
    @ApiResponse(responseCode = "500", description = "AI generation failed")
  })
  @PostMapping("/generate")
  public ResponseEntity<MealPlanResponse> generate(@Valid @RequestBody GenerateMealPlanRequest request) {
    MealPlanResponse response = smartRecipeService.generateMealPlan(request.userId());
    return ResponseEntity.ok(response);
  }

  @Operation(
    summary = "Get current active meal plan",
    description = "Retrieves the cached meal plan for the user if available"
  )
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Meal plan found"),
    @ApiResponse(responseCode = "404", description = "No active meal plan")
  })
  @GetMapping("/current")
  public ResponseEntity<MealPlanResponse> current(
      @Parameter(description = "User ID", required = true)
      @RequestParam @NotNull UUID userId) {
    return smartRecipeService.getCachedMealPlan(userId)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @Operation(
    summary = "Get meal plan history",
    description = "Retrieves past generated meal plans for the user"
  )
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "History retrieved successfully")
  })
  @GetMapping("/history")
  public ResponseEntity<List<MealPlanHistoryItem>> history(
      @Parameter(description = "User ID", required = true)
      @RequestParam @NotNull UUID userId,
      @Parameter(description = "Max number of plans to return (1-30)", example = "5")
      @RequestParam(defaultValue = "5") @Min(1) @Max(30) int limit) {

    List<MealPlan> plans = mealPlanHistoryService.recentPlans(userId, limit);
    List<MealPlanHistoryItem> responses = new ArrayList<>();
    for (MealPlan plan : plans) {
      parsePlan(plan).ifPresent(responses::add);
    }
    return ResponseEntity.ok(responses);
  }

  @Operation(
    summary = "Evict cached meal plan",
    description = "Forces regeneration on next request by clearing cached plan"
  )
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Cache evicted successfully")
  })
  @PostMapping("/evict")
  public ResponseEntity<Void> evict(@Valid @RequestBody GenerateMealPlanRequest request) {
    smartRecipeService.evictCache(request.userId());
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Suggest alternative recipes",
      description = "Returns nutrition-similar replacement recipes after filtering allergens and dietary preferences"
  )
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Suggestions generated successfully"),
      @ApiResponse(responseCode = "404", description = "Original recipe or user profile missing")
  })
  @PostMapping("/swap-recipe")
  public ResponseEntity<SwapRecipeResponse> swapRecipe(@Valid @RequestBody SwapRecipeRequest request) {
    List<AlternativeRecipe> alternatives = recipeSwapService.suggestAlternatives(
        request.userId(),
        request.recipeId(),
        request.reason()
    );
    List<RecipeSuggestionResponse> suggestions = alternatives.stream()
        .map(this::toSuggestionResponse)
        .toList();
    return ResponseEntity.ok(new SwapRecipeResponse(suggestions));
  }

  @Operation(
      summary = "Generate weekly shopping list",
      description = "Aggregates ingredients from the weekly meal plan, merges duplicates, and optionally exports PDF"
  )
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Shopping list generated", content = {
          @Content(mediaType = "application/json", schema = @Schema(implementation = ShoppingListResponse.class)),
          @Content(mediaType = "application/pdf")
      }),
      @ApiResponse(responseCode = "404", description = "No meal plan found for the given user/week")
  })
  @GetMapping("/shopping-list")
  public ResponseEntity<?> shoppingList(
      @RequestParam @NotNull UUID userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
      @RequestParam(defaultValue = "json") String format) {

    ShoppingListDTO list = shoppingListService.buildShoppingList(userId, weekStart);
    if ("pdf".equalsIgnoreCase(format)) {
      byte[] pdf = shoppingListService.renderPdf(list);
      String filename = "shopping-list-" + list.weekStart() + ".pdf";
      return ResponseEntity.ok()
          .contentType(MediaType.APPLICATION_PDF)
          .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
          .body(pdf);
    }
    return ResponseEntity.ok(toShoppingListResponse(list));
  }

  private RecipeSuggestionResponse toSuggestionResponse(AlternativeRecipe recipe) {
    return new RecipeSuggestionResponse(
        recipe.id(),
        recipe.title(),
        recipe.imageUrl(),
        recipe.timeMinutes(),
        recipe.difficulty(),
        recipe.nutrition().calories(),
        recipe.nutrition().protein(),
        recipe.nutrition().carbs(),
        recipe.nutrition().fat(),
        recipe.summary()
    );
  }

  private ShoppingListResponse toShoppingListResponse(ShoppingListDTO list) {
    List<ShoppingListCategoryResponse> categories = list.categories().stream()
        .map(category -> new ShoppingListCategoryResponse(
            category.name(),
            category.items().stream()
                .map(item -> new ShoppingListItemResponse(
                    item.ingredientName(),
                    formatQuantity(item.quantity(), item.unit(), item.estimated()),
                    item.unit(),
                    item.estimated(),
                    item.recipes()
                ))
                .toList()
        ))
        .toList();
    return new ShoppingListResponse(
        list.weekStart(),
        list.weekEnd(),
        list.estimatedCost(),
        categories
    );
  }

  private String formatQuantity(BigDecimal quantity, String unit, boolean estimated) {
    if (quantity == null) {
      return estimated ? "适量" : "";
    }
    BigDecimal scaled = quantity.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros();
    String base = scaled.toPlainString();
    if (StringUtils.hasText(unit)) {
      base = base + (unit.startsWith("/") ? "" : " ") + unit;
    }
    if (estimated) {
      base = "约 " + base;
    }
    return base;
  }

  private Optional<MealPlanHistoryItem> parsePlan(MealPlan plan) {
    try {
      MealPlanResponse response = objectMapper.readValue(plan.getPlanPayload(), MealPlanResponse.class);
      return Optional.of(new MealPlanHistoryItem(
          plan.getId(),
          plan.getUserId(),
          plan.getGeneratedAt(),
          plan.getSource(),
          response
      ));
    } catch (JsonProcessingException e) {
      log.warn("Failed to parse meal plan payload for plan {}", plan.getId(), e);
      return Optional.empty();
    }
  }

  public record GenerateMealPlanRequest(@NotNull UUID userId) {}

  public record SwapRecipeRequest(@NotNull UUID userId,
                                  @NotNull UUID recipeId,
                                  @Size(max = 64) String mealType,
                                  @Size(max = 200) String reason) {}

  public record SwapRecipeResponse(List<RecipeSuggestionResponse> suggestions) {}

  public record RecipeSuggestionResponse(UUID recipeId,
                                         String title,
                                         String imageUrl,
                                         Integer timeMinutes,
                                         String difficulty,
                                         double calories,
                                         double protein,
                                         double carbs,
                                         double fat,
                                         String summary) {}

  public record ShoppingListResponse(LocalDate weekStart,
                                     LocalDate weekEnd,
                                     BigDecimal estimatedCost,
                                     List<ShoppingListCategoryResponse> categories) {}

  public record ShoppingListCategoryResponse(String name, List<ShoppingListItemResponse> items) {}

  public record ShoppingListItemResponse(String ingredientName,
                                         String quantity,
                                         String unit,
                                         boolean estimated,
                                         List<String> recipes) {}

  public record MealPlanHistoryItem(Long id, UUID userId, OffsetDateTime generatedAt, String source,
                                    MealPlanResponse plan) {}
}
