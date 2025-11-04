package com.fitnessapp.backend.pose;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * 姿势分析请求
 */
public record PoseAnalysisRequest(
    @NotNull(message = "用户ID不能为空")
    UUID userId,

    @NotBlank(message = "训练类型不能为空")
    String exerciseType // squat, deadlift, bench_press, yoga, plank等
) {}
