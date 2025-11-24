package com.fitnessapp.backend.retrieval.dto;

import lombok.Builder;
import lombok.Value;
import java.util.List;

/**
 * Response for advanced recipe search with metadata
 */
@Value
@Builder
public class RecipeSearchResponse {
    List<RecipeCard> recipes;
    int totalResults;
    RecipeSearchRequest filters;
    int latencyMs;
    boolean fromCache;

    /**
     * Create response from recipe list
     */
    public static RecipeSearchResponse of(List<RecipeCard> recipes, RecipeSearchRequest request, int latencyMs) {
        return RecipeSearchResponse.builder()
            .recipes(recipes)
            .totalResults(recipes.size())
            .filters(request)
            .latencyMs(latencyMs)
            .fromCache(false)
            .build();
    }
}
