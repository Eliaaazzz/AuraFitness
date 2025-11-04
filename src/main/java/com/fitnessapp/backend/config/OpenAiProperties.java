package com.fitnessapp.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.openai")
@Getter
@Setter
public class OpenAiProperties {

  private String apiKey;
  private String model = "gpt-4o";
  private String mealModel;
  private long timeoutSeconds = 60;
  private Double costPerThousandTokens;
  private boolean logUsage = true;
}

