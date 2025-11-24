package com.fitnessapp.backend.retrieval.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

/**
 * Nutrition information for recipes
 *
 * Provides complete nutritional breakdown that users see
 * when browsing or viewing recipe details
 */
@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NutritionInfo {
    /**
     * Total calories (kcal)
     */
    Integer calories;

    /**
     * Protein in grams
     */
    Double protein;

    /**
     * Carbohydrates in grams
     */
    Double carbs;

    /**
     * Fat in grams
     */
    Double fat;

    /**
     * Fiber in grams (optional)
     */
    Double fiber;

    /**
     * Sugar in grams (optional)
     */
    Double sugar;

    /**
     * Sodium in milligrams (optional)
     */
    Integer sodium;

    /**
     * Servings (optional)
     */
    Integer servings;

    /**
     * Create default/estimated nutrition when data is missing
     */
    public static NutritionInfo createDefault() {
        return NutritionInfo.builder()
            .calories(350)
            .protein(20.0)
            .carbs(40.0)
            .fat(12.0)
            .build();
    }

    /**
     * Create nutrition from Spoonacular API data
     */
    public static NutritionInfo fromSpoonacular(
        Integer calories,
        Double protein,
        Double carbs,
        Double fat,
        Double fiber,
        Double sugar,
        Integer sodium,
        Integer servings
    ) {
        return NutritionInfo.builder()
            .calories(calories)
            .protein(protein)
            .carbs(carbs)
            .fat(fat)
            .fiber(fiber)
            .sugar(sugar)
            .sodium(sodium)
            .servings(servings)
            .build();
    }
}
