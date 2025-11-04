package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.ApiKey;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {

    Optional<ApiKey> findByKey(String key);
}

