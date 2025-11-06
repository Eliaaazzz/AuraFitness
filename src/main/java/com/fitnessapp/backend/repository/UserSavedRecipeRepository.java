package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.UserSavedRecipe;
import com.fitnessapp.backend.domain.UserSavedRecipe.Id;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSavedRecipeRepository extends JpaRepository<UserSavedRecipe, Id> {
  Page<UserSavedRecipe> findByUser_Id(UUID userId, Pageable pageable);
}
