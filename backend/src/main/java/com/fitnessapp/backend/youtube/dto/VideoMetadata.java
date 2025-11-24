package com.fitnessapp.backend.youtube.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VideoMetadata {
    String youtubeId;
    String title;
    String description;
    String thumbnailUrl;
    String channelId;
    String channelTitle;
    int durationSeconds;
    int durationMinutes;
    long viewCount;
}
