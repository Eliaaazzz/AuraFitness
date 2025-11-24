package com.fitnessapp.backend.openai;

import com.theokanning.openai.completion.chat.ChatMessage;
import java.util.List;

public interface ChatCompletionClient {

  String complete(String model, List<ChatMessage> messages, int maxTokens, double temperature);
}

