package com.fitnessapp.backend.retrieval.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Nutrition-based filter criteria for recipe search
 * Allows filtering recipes by macronutrient ranges
 */
@Value
@Builder
public class NutritionFilter {
    Integer minCalories;
    Integer maxCalories;
    Integer minProtein;
    Integer maxProtein;
    Integer minCarbs;
    Integer maxCarbs;
    Integer minFat;
    Integer maxFat;

    /**
     * Check if any nutrition filter is applied
     */
    public boolean hasAnyFilter() {
        return minCalories != null || maxCalories != null ||
               minProtein != null || maxProtein != null ||
               minCarbs != null || maxCarbs != null ||
               minFat != null || maxFat != null;
    }

    /**
     * Quick filter builders for common use cases
     */
    public static NutritionFilter highProtein() {
        return NutritionFilter.builder()
            .minProtein(30)
            .build();
    }

    public static NutritionFilter lowCarb() {
        return NutritionFilter.builder()
            .maxCarbs(20)
            .build();
    }

    public static NutritionFilter lowCalorie() {
        return NutritionFilter.builder()
            .maxCalories(400)
            .build();
    }

    public static NutritionFilter keto() {
        return NutritionFilter.builder()
            .maxCarbs(20)
            .minFat(15)
            .build();
    }

    public static NutritionFilter balanced() {
        return NutritionFilter.builder()
            .minProtein(20)
            .maxCalories(600)
            .build();
    }
}
