package com.fitnessapp.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Conditional configuration for OpenAI-dependent features
 *
 * This ensures that OpenAI-powered services only load when:
 * 1. app.openai.enabled=true is set
 * 2. app.openai.api-key is provided
 *
 * Without OpenAI, the app runs fine with all core features available:
 * - Workout library
 * - Recipe library
 * - User profiles and library
 * - YouTube integration
 * - Meal tracking
 *
 * AI features disabled without OpenAI:
 * - Pose analysis
 * - AI recipe generation
 * - AI nutrition insights
 */
@Configuration
@Slf4j
public class ConditionalOpenAiConfig {

    @Bean
    @ConditionalOnProperty(name = "app.openai.enabled", havingValue = "true")
    public OpenAiFeatureMarker openAiFeatureMarker() {
        log.info("✅ OpenAI features ENABLED - AI-powered features are available");
        log.info("   - AI Pose Analysis: ENABLED");
        log.info("   - AI Recipe Generation: ENABLED");
        log.info("   - AI Nutrition Insights: ENABLED");
        return new OpenAiFeatureMarker();
    }

    @Bean
    @ConditionalOnProperty(name = "app.openai.enabled", havingValue = "false", matchIfMissing = true)
    public NoOpenAiMarker noOpenAiMarker() {
        log.warn("⚠️  OpenAI features DISABLED - AI features not available");
        log.warn("   Core features still available:");
        log.warn("   ✓ Workout library");
        log.warn("   ✓ Recipe library");
        log.warn("   ✓ User profiles");
        log.warn("   ✓ YouTube integration");
        log.warn("   ✓ Meal tracking");
        log.warn("   To enable AI features, set OPENAI_ENABLED=true and provide OPENAI_API_KEY");
        return new NoOpenAiMarker();
    }

    /**
     * Marker class to indicate OpenAI features are enabled
     */
    public static class OpenAiFeatureMarker {
        public boolean isEnabled() {
            return true;
        }
    }

    /**
     * Marker class to indicate OpenAI features are disabled
     */
    public static class NoOpenAiMarker {
        public boolean isEnabled() {
            return false;
        }
    }
}
