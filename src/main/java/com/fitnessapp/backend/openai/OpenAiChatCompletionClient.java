package com.fitnessapp.backend.openai;

import com.fitnessapp.backend.config.OpenAiProperties;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatCompletionResult;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
@Slf4j
public class OpenAiChatCompletionClient implements ChatCompletionClient {

  private final OpenAiProperties properties;
  private final MeterRegistry meterRegistry;

  @Override
  public String complete(String model, List<ChatMessage> messages, int maxTokens, double temperature) {
    String apiKey = properties.getApiKey();
    if (!StringUtils.hasText(apiKey)) {
      throw new IllegalStateException("OpenAI API key is not configured");
    }
    String resolvedModel = StringUtils.hasText(model) ? model : properties.getModel();
    long timeout = properties.getTimeoutSeconds() > 0 ? properties.getTimeoutSeconds() : 60;
    OpenAiService service = new OpenAiService(apiKey, Duration.ofSeconds(timeout));
    Timer.Sample sample = Timer.start(meterRegistry);
    Timer timer = Timer.builder("openai.chat.completion")
        .tag("model", resolvedModel)
        .register(meterRegistry);
    try {
      ChatCompletionRequest request = ChatCompletionRequest.builder()
          .model(resolvedModel)
          .messages(messages)
          .maxTokens(maxTokens)
          .temperature(temperature)
          .build();
      ChatCompletionResult result = service.createChatCompletion(request);
      Optional.ofNullable(result.getUsage()).ifPresent(usage -> {
        long totalTokens = Optional.ofNullable(usage.getTotalTokens()).orElse(0L);
        meterRegistry.counter("openai.tokens.total", "model", resolvedModel).increment(totalTokens);
        Double costPerThousand = properties.getCostPerThousandTokens();
        if (properties.isLogUsage() && costPerThousand != null) {
          double estimatedCost = (totalTokens / 1000.0) * costPerThousand;
          meterRegistry.counter("openai.cost.estimated", "model", resolvedModel)
              .increment(estimatedCost);
          log.debug("OpenAI {} tokens={} estimatedCost=${}", resolvedModel, totalTokens, String.format("%.4f", estimatedCost));
        }
      });
      if (result.getChoices() == null || result.getChoices().isEmpty()) {
        return "";
      }
      var choice = result.getChoices().get(0);
      return choice.getMessage() != null ? choice.getMessage().getContent() : "";
    } catch (Exception ex) {
      log.error("OpenAI chat completion failed", ex);
      throw new RuntimeException("Failed to invoke OpenAI chat completion", ex);
    } finally {
      service.shutdownExecutor();
      sample.stop(timer);
    }
  }
}
