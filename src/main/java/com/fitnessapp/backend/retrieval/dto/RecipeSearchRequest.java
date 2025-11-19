package com.fitnessapp.backend.retrieval.dto;

import lombok.Builder;
import lombok.Value;
import java.util.List;

/**
 * Advanced recipe search request with multiple filter criteria
 */
@Value
@Builder
public class RecipeSearchRequest {
    List<String> ingredients;
    Integer maxTimeMinutes;
    String difficulty;        // "easy", "medium", "hard"
    NutritionFilter nutrition;
    List<String> dietaryTags; // "vegan", "keto", "gluten-free", etc.
    String sortBy;            // "time", "calories", "protein", "popularity"

    /**
     * Check if this is a simple search (no advanced filters)
     */
    public boolean isSimpleSearch() {
        return (nutrition == null || !nutrition.hasAnyFilter()) &&
               (dietaryTags == null || dietaryTags.isEmpty()) &&
               difficulty == null &&
               sortBy == null;
    }

    /**
     * Get effective sort order (default: time)
     */
    public String getEffectiveSortBy() {
        return sortBy != null ? sortBy : "time";
    }
}
