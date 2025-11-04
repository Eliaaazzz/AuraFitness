package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "meal_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
  private UUID userId;

  @Column(name = "meal_plan_id")
  private Long mealPlanId;

  @Column(name = "meal_day")
  private Integer mealDay;

  @Column(name = "meal_type", length = 32, nullable = false)
  private String mealType;

  @Column(name = "recipe_id", columnDefinition = "uuid")
  private UUID recipeId;

  @Column(name = "recipe_name", length = 255)
  private String recipeName;

  @Column(name = "consumed_at", nullable = false)
  private OffsetDateTime consumedAt;

  @Column(name = "calories")
  private Integer calories;

  @Column(name = "protein_grams")
  private Double proteinGrams;

  @Column(name = "carbs_grams")
  private Double carbsGrams;

  @Column(name = "fat_grams")
  private Double fatGrams;

  @Column(name = "notes", length = 500)
  private String notes;

  @PrePersist
  void onCreate() {
    if (consumedAt == null) {
      consumedAt = OffsetDateTime.now();
    }
  }
}

