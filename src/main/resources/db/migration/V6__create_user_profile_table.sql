CREATE TABLE IF NOT EXISTS user_profile (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    height_cm INTEGER,
    weight_kg NUMERIC(6,2),
    bmi NUMERIC(5,2),
    body_fat_percentage NUMERIC(5,2),
    basal_metabolic_rate INTEGER,
    fitness_goal VARCHAR(32),
    dietary_preference VARCHAR(32),
    daily_calorie_target INTEGER,
    daily_protein_target INTEGER,
    daily_carbs_target INTEGER,
    daily_fat_target INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profile_allergens (
    user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE CASCADE,
    allergen VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, allergen)
);

CREATE INDEX IF NOT EXISTS idx_user_profile_goal ON user_profile(fitness_goal);

