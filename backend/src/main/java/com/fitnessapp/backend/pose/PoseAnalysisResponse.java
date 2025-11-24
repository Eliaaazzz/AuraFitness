package com.fitnessapp.backend.pose;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 姿势分析响应
 */
public record PoseAnalysisResponse(
    UUID sessionId,
    String exerciseType,
    int overallScore,
    String status,
    LocalDateTime analyzedAt,
    List<AnalysisDetail> details
) {
    public record AnalysisDetail(
        int score,
        String analysis,
        String suggestions,
        List<String> issues,
        int timestampSeconds
    ) {}
}
