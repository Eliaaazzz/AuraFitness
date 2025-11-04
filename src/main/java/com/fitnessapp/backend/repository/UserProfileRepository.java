package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.UserProfile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {

  Optional<UserProfile> findByUserId(UUID userId);
}

