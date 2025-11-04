package com.fitnessapp.backend.api.nutrition;

import com.fitnessapp.backend.domain.MealLog;
import com.fitnessapp.backend.service.NutritionInsightService;
import com.fitnessapp.backend.service.NutritionInsightService.NutritionInsight;
import com.fitnessapp.backend.service.NutritionTrackingService;
import com.fitnessapp.backend.service.NutritionTrackingService.NutritionMetric;
import com.fitnessapp.backend.service.NutritionTrackingService.NutritionSummary;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/nutrition")
@RequiredArgsConstructor
@Validated
public class NutritionController {

  private final NutritionTrackingService trackingService;
  private final NutritionInsightService insightService;

  @PostMapping("/meals")
  public ResponseEntity<MealLogResponse> logMeal(@Valid @RequestBody LogMealRequest request) {
    MealLog entity = MealLog.builder()
        .userId(request.userId())
        .mealPlanId(request.mealPlanId())
        .mealDay(request.mealDay())
        .mealType(request.mealType())
        .recipeId(request.recipeId())
        .recipeName(request.recipeName())
        .calories(request.calories())
        .proteinGrams(request.protein())
        .carbsGrams(request.carbs())
        .fatGrams(request.fat())
        .consumedAt(request.consumedAt())
        .notes(request.notes())
        .build();
    MealLog saved = trackingService.logMeal(entity);
    OffsetDateTime consumedAt = Optional.ofNullable(saved.getConsumedAt()).orElse(OffsetDateTime.now());
    insightService.invalidateIfChanged(request.userId(), consumedAt.toLocalDate());
    return ResponseEntity.ok(toResponse(saved));
  }

  @GetMapping("/summary/daily")
  public ResponseEntity<NutritionSummaryResponse> dailySummary(
      @RequestParam @NotNull UUID userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
    LocalDate targetDate = date != null ? date : LocalDate.now();
    NutritionSummary summary = trackingService.dailySummary(userId, targetDate);
    return ResponseEntity.ok(toSummaryResponse(summary));
  }

  @GetMapping("/summary/weekly")
  public ResponseEntity<NutritionSummaryResponse> weeklySummary(
      @RequestParam @NotNull UUID userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
    LocalDate start = weekStart != null ? weekStart : LocalDate.now().with(java.time.DayOfWeek.MONDAY);
    NutritionSummary summary = trackingService.weeklySummary(userId, start);
    return ResponseEntity.ok(toSummaryResponse(summary));
  }

  @GetMapping("/insights/weekly")
  public ResponseEntity<NutritionInsightResponse> weeklyInsight(
      @RequestParam @NotNull UUID userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
    NutritionInsight insight = insightService.generateWeeklyInsight(userId, weekStart);
    return ResponseEntity.ok(toInsightResponse(insight));
  }

  private MealLogResponse toResponse(MealLog log) {
    return new MealLogResponse(
        log.getId(),
        log.getUserId(),
        log.getMealPlanId(),
        log.getMealDay(),
        log.getMealType(),
        log.getRecipeId(),
        log.getRecipeName(),
        log.getConsumedAt(),
        log.getCalories(),
        log.getProteinGrams(),
        log.getCarbsGrams(),
        log.getFatGrams(),
        log.getNotes());
  }

  private NutritionSummaryResponse toSummaryResponse(NutritionSummary summary) {
    return new NutritionSummaryResponse(
        summary.rangeStart(),
        summary.rangeEnd(),
        summary.days(),
        toMetric(summary.calories()),
        toMetric(summary.protein()),
        toMetric(summary.carbs()),
        toMetric(summary.fat()),
        summary.alerts());
  }

  private NutritionMetricResponse toMetric(NutritionMetric metric) {
    return new NutritionMetricResponse(metric.actual(), metric.target(), metric.percent());
  }

  public record LogMealRequest(
      @NotNull UUID userId,
      Long mealPlanId,
      Integer mealDay,
      @NotNull @Size(max = 32) String mealType,
      UUID recipeId,
      @Size(max = 255) String recipeName,
      Integer calories,
      Double protein,
      Double carbs,
      Double fat,
      OffsetDateTime consumedAt,
      @Size(max = 500) String notes
  ) {}

  public record MealLogResponse(Long id,
                                UUID userId,
                                Long mealPlanId,
                                Integer mealDay,
                                String mealType,
                                UUID recipeId,
                                String recipeName,
                                OffsetDateTime consumedAt,
                                Integer calories,
                                Double protein,
                                Double carbs,
                                Double fat,
                                String notes) {}

  private NutritionInsightResponse toInsightResponse(NutritionInsight insight) {
    return new NutritionInsightResponse(
        toSummaryResponse(insight.summary()),
        insight.logs().stream().map(this::toResponse).toList(),
        insight.aiAdvice());
  }

  public record NutritionSummaryResponse(OffsetDateTime rangeStart,
                                         OffsetDateTime rangeEnd,
                                         int days,
                                         NutritionMetricResponse calories,
                                         NutritionMetricResponse protein,
                                         NutritionMetricResponse carbs,
                                         NutritionMetricResponse fat,
                                         java.util.List<String> alerts) {}

  public record NutritionMetricResponse(double actual, double target, double percent) {}

  public record NutritionInsightResponse(NutritionSummaryResponse summary,
                                         java.util.List<MealLogResponse> logs,
                                         String aiAdvice) {}
}
