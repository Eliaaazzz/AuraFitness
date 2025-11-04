package com.fitnessapp.backend.api.profile;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fitnessapp.backend.domain.Allergen;
import com.fitnessapp.backend.domain.DietaryPreference;
import com.fitnessapp.backend.domain.FitnessGoal;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserProfileResponse(
    UUID userId,
    Integer heightCm,
    Double weightKg,
    Double bmi,
    Double bodyFatPercentage,
    Integer basalMetabolicRate,
    FitnessGoal fitnessGoal,
    DietaryPreference dietaryPreference,
    Set<Allergen> allergens,
    Integer dailyCalorieTarget,
    Integer dailyProteinTarget,
    Integer dailyCarbsTarget,
    Integer dailyFatTarget,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
}

