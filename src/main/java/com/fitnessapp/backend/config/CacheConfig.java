package com.fitnessapp.backend.config;

import com.fitnessapp.backend.service.cache.LeaderboardCacheKeys;
import com.fitnessapp.backend.service.cache.NutritionCacheKeys;
import com.fitnessapp.backend.service.cache.UserLibraryCacheKeys;
import java.time.Duration;
import java.util.Set;
import org.springframework.boot.autoconfigure.cache.CacheManagerCustomizer;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.connection.RedisConnectionFactory;

@Configuration
public class CacheConfig {

  @Bean
  @ConditionalOnBean(RedisConnectionFactory.class)
  public RedisCacheManagerBuilderCustomizer nutritionAdviceCacheCustomizer() {
    return builder -> builder.withCacheConfiguration(
        "nutritionAdvice",
        RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofHours(6))
    );
  }

  @Bean
  @ConditionalOnBean(ConcurrentMapCacheManager.class)
  public CacheManagerCustomizer<ConcurrentMapCacheManager> indexedCacheRegistration() {
    return manager -> manager.setCacheNames(
        Set.of(
            NutritionCacheKeys.ADVICE_CACHE,
            LeaderboardCacheKeys.LEADERBOARD_CACHE,
            UserLibraryCacheKeys.WORKOUTS_CACHE,
            UserLibraryCacheKeys.RECIPES_CACHE
        ));
  }
}
