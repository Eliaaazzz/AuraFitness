-- ============================================================================
-- V11: Fix NUMERIC/DECIMAL to DOUBLE PRECISION
-- ============================================================================
-- This migration converts NUMERIC and DECIMAL columns to DOUBLE PRECISION
-- to match Java Double types and prevent precision mismatch issues.
--
-- Background:
-- - Java Double maps to PostgreSQL DOUBLE PRECISION
-- - Using NUMERIC causes type mismatch and requires explicit casting
-- - DOUBLE PRECISION provides better performance for floating-point operations
-- ============================================================================

-- ============================================================================
-- 1. user_profile table
-- ============================================================================
ALTER TABLE user_profile
    ALTER COLUMN weight_kg TYPE DOUBLE PRECISION,
    ALTER COLUMN bmi TYPE DOUBLE PRECISION,
    ALTER COLUMN body_fat_percentage TYPE DOUBLE PRECISION;

COMMENT ON COLUMN user_profile.weight_kg IS 'User weight in kilograms (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN user_profile.bmi IS 'Body Mass Index (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN user_profile.body_fat_percentage IS 'Body fat percentage (DOUBLE PRECISION for Java Double compatibility)';

-- ============================================================================
-- 2. meal_log table
-- ============================================================================
ALTER TABLE meal_log
    ALTER COLUMN protein_grams TYPE DOUBLE PRECISION,
    ALTER COLUMN carbs_grams TYPE DOUBLE PRECISION,
    ALTER COLUMN fat_grams TYPE DOUBLE PRECISION;

COMMENT ON COLUMN meal_log.protein_grams IS 'Protein content in grams (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN meal_log.carbs_grams IS 'Carbohydrate content in grams (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN meal_log.fat_grams IS 'Fat content in grams (DOUBLE PRECISION for Java Double compatibility)';

-- ============================================================================
-- 3. shopping_list table
-- ============================================================================
ALTER TABLE shopping_list
    ALTER COLUMN estimated_cost TYPE DOUBLE PRECISION;

COMMENT ON COLUMN shopping_list.estimated_cost IS 'Estimated shopping cost (DOUBLE PRECISION for Java Double compatibility)';

-- ============================================================================
-- 4. shopping_list_item table
-- ============================================================================
ALTER TABLE shopping_list_item
    ALTER COLUMN quantity TYPE DOUBLE PRECISION;

COMMENT ON COLUMN shopping_list_item.quantity IS 'Ingredient quantity (DOUBLE PRECISION for Java Double compatibility)';

-- ============================================================================
-- Update statistics after schema changes
-- ============================================================================
ANALYZE user_profile;
ANALYZE meal_log;
ANALYZE shopping_list;
ANALYZE shopping_list_item;

-- ============================================================================
-- Verification queries (for manual testing)
-- ============================================================================
-- Check column types:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('user_profile', 'meal_log', 'shopping_list', 'shopping_list_item')
-- AND column_name IN ('weight_kg', 'bmi', 'body_fat_percentage', 'protein_grams', 'carbs_grams', 'fat_grams', 'estimated_cost', 'quantity');
