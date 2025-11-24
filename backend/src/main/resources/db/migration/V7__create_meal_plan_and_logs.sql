CREATE TABLE IF NOT EXISTS meal_plan (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_payload JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(32),
    calories_target INTEGER,
    protein_target INTEGER,
    carbs_target INTEGER,
    fat_target INTEGER
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_user_generated_at ON meal_plan(user_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS meal_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_plan_id BIGINT REFERENCES meal_plan(id) ON DELETE SET NULL,
    meal_day INTEGER,
    meal_type VARCHAR(32) NOT NULL,
    recipe_id UUID REFERENCES recipe(id) ON DELETE SET NULL,
    recipe_name VARCHAR(255),
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    calories INTEGER,
    protein_grams NUMERIC(6,2),
    carbs_grams NUMERIC(6,2),
    fat_grams NUMERIC(6,2),
    notes VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_meal_log_user_consumed_at ON meal_log(user_id, consumed_at DESC);
