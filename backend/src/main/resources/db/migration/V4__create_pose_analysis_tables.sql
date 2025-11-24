-- V4: 创建姿势分析表

-- 训练会话表
CREATE TABLE workout_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exercise_type VARCHAR(50) NOT NULL,
    video_url VARCHAR(500),
    duration_seconds INTEGER,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    overall_pose_score INTEGER,
    injury_risk_flags TEXT,
    improvement_rate DOUBLE PRECISION,
    status VARCHAR(20) NOT NULL DEFAULT 'ANALYZING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 姿势分析结果表
CREATE TABLE pose_analysis_result (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID NOT NULL REFERENCES workout_session(id) ON DELETE CASCADE,
    timestamp_seconds INTEGER NOT NULL,
    pose_score INTEGER NOT NULL,
    analysis_text TEXT NOT NULL,
    improvement_suggestions TEXT,
    detected_issues TEXT,
    joint_angles TEXT,
    frame_image_url VARCHAR(500),
    analysis_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_workout_session_user_id ON workout_session(user_id);
CREATE INDEX idx_workout_session_user_exercise ON workout_session(user_id, exercise_type);
CREATE INDEX idx_workout_session_started_at ON workout_session(started_at DESC);
CREATE INDEX idx_workout_session_status ON workout_session(status);

CREATE INDEX idx_pose_analysis_session_id ON pose_analysis_result(workout_session_id);
CREATE INDEX idx_pose_analysis_timestamp ON pose_analysis_result(timestamp_seconds);

-- 注释
COMMENT ON TABLE workout_session IS '用户训练会话记录';
COMMENT ON TABLE pose_analysis_result IS 'AI姿势分析结果';

COMMENT ON COLUMN workout_session.exercise_type IS '训练类型: squat, deadlift, bench_press, yoga等';
COMMENT ON COLUMN workout_session.overall_pose_score IS '整体姿势评分 (1-10分)';
COMMENT ON COLUMN workout_session.injury_risk_flags IS '受伤风险标记 (JSON数组)';
COMMENT ON COLUMN workout_session.improvement_rate IS '相比上次训练的进步率';
COMMENT ON COLUMN workout_session.status IS '会话状态: ANALYZING, COMPLETED, FAILED, CANCELLED';

COMMENT ON COLUMN pose_analysis_result.timestamp_seconds IS '视频中的时间戳 (秒)';
COMMENT ON COLUMN pose_analysis_result.pose_score IS '该时间点的姿势评分 (1-10)';
COMMENT ON COLUMN pose_analysis_result.detected_issues IS '检测到的问题 (JSON数组)';
COMMENT ON COLUMN pose_analysis_result.joint_angles IS '关节角度数据 (JSON对象)';
