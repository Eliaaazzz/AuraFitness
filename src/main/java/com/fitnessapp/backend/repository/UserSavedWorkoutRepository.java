package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.UserSavedWorkout;
import com.fitnessapp.backend.domain.UserSavedWorkout.Id;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSavedWorkoutRepository extends JpaRepository<UserSavedWorkout, Id> {
  Page<UserSavedWorkout> findByUser_Id(UUID userId, Pageable pageable);
}
