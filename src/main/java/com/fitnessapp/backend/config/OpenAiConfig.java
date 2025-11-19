package com.fitnessapp.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAI Configuration - Only enabled when API key is provided
 *
 * This configuration allows the application to run without OpenAI.
 * AI features (pose analysis, recipe generation, nutrition insights)
 * will be disabled if OpenAI API key is not configured.
 */
@Configuration
@ConditionalOnProperty(name = "app.openai.enabled", havingValue = "true", matchIfMissing = false)
@Slf4j
public class OpenAiConfig {

    public OpenAiConfig() {
        log.info("OpenAI features ENABLED - AI-powered features are available");
    }
}
