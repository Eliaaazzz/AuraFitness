-- ============================================================================
-- V9: Dietary Tags for Recipe Filtering
-- ============================================================================
-- This migration adds dietary tag support for intelligent recipe filtering
-- Tags: vegan, vegetarian, gluten-free, keto, low-carb, high-protein, etc.
-- ============================================================================

-- 1. Add dietary tags array column to recipe table
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}';

-- 2. Create GIN index for fast array searches
CREATE INDEX IF NOT EXISTS idx_recipe_dietary_tags ON recipe USING gin(dietary_tags);

-- ============================================================================
-- Auto-detection functions for dietary tags
-- ============================================================================

-- Function to detect vegan recipes (no animal products)
CREATE OR REPLACE FUNCTION detect_vegan_tag(recipe_id_param UUID) RETURNS BOOLEAN AS $$
DECLARE
    has_animal_products BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM recipe_ingredient ri
        JOIN ingredient i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = recipe_id_param
        AND LOWER(i.name) ~ '(chicken|beef|pork|fish|salmon|tuna|shrimp|turkey|egg|milk|cheese|butter|yogurt|cream|bacon|ham|steak|lamb|duck|honey)'
    ) INTO has_animal_products;

    RETURN NOT has_animal_products;
END;
$$ LANGUAGE plpgsql;

-- Function to detect vegetarian recipes (no meat, but allows dairy/eggs)
CREATE OR REPLACE FUNCTION detect_vegetarian_tag(recipe_id_param UUID) RETURNS BOOLEAN AS $$
DECLARE
    has_meat BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM recipe_ingredient ri
        JOIN ingredient i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = recipe_id_param
        AND LOWER(i.name) ~ '(chicken|beef|pork|fish|salmon|tuna|shrimp|turkey|bacon|ham|steak|lamb|duck|meat)'
    ) INTO has_meat;

    RETURN NOT has_meat;
END;
$$ LANGUAGE plpgsql;

-- Function to detect gluten-free recipes
CREATE OR REPLACE FUNCTION detect_gluten_free_tag(recipe_id_param UUID) RETURNS BOOLEAN AS $$
DECLARE
    has_gluten BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM recipe_ingredient ri
        JOIN ingredient i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = recipe_id_param
        AND LOWER(i.name) ~ '(wheat|bread|pasta|flour|barley|rye|couscous|noodle|soy sauce|beer|cereal)'
    ) INTO has_gluten;

    RETURN NOT has_gluten;
END;
$$ LANGUAGE plpgsql;

-- Function to detect keto recipes (high fat, low carb)
CREATE OR REPLACE FUNCTION detect_keto_tag(recipe_id_param UUID) RETURNS BOOLEAN AS $$
DECLARE
    carbs FLOAT;
    fat FLOAT;
BEGIN
    SELECT
        COALESCE((nutrition_summary->>'carbs')::FLOAT, 999),
        COALESCE((nutrition_summary->>'fat')::FLOAT, 0)
    INTO carbs, fat
    FROM recipe WHERE id = recipe_id_param;

    RETURN carbs < 20 AND fat > 15;
END;
$$ LANGUAGE plpgsql;

-- Function to detect high-protein recipes
CREATE OR REPLACE FUNCTION detect_high_protein_tag(recipe_id_param UUID) RETURNS BOOLEAN AS $$
DECLARE
    protein FLOAT;
BEGIN
    SELECT COALESCE((nutrition_summary->>'protein')::FLOAT, 0)
    INTO protein
    FROM recipe WHERE id = recipe_id_param;

    RETURN protein >= 30;
END;
$$ LANGUAGE plpgsql;

-- Function to detect low-calorie recipes
CREATE OR REPLACE FUNCTION detect_low_calorie_tag(recipe_id_param UUID) RETURNS BOOLEAN AS $$
DECLARE
    calories INT;
BEGIN
    SELECT COALESCE((nutrition_summary->>'calories')::INT, 999)
    INTO calories
    FROM recipe WHERE id = recipe_id_param;

    RETURN calories < 400;
END;
$$ LANGUAGE plpgsql;

-- Function to detect dairy-free recipes
CREATE OR REPLACE FUNCTION detect_dairy_free_tag(recipe_id_param UUID) RETURNS BOOLEAN AS $$
DECLARE
    has_dairy BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM recipe_ingredient ri
        JOIN ingredient i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = recipe_id_param
        AND LOWER(i.name) ~ '(milk|cheese|butter|yogurt|cream|whey|lactose)'
    ) INTO has_dairy;

    RETURN NOT has_dairy;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Batch update function to auto-tag all recipes
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_tag_all_recipes() RETURNS INTEGER AS $$
DECLARE
    recipe_record RECORD;
    tags TEXT[];
    updated_count INTEGER := 0;
BEGIN
    FOR recipe_record IN SELECT id FROM recipe LOOP
        tags := ARRAY[]::TEXT[];

        -- Vegan (also vegetarian)
        IF detect_vegan_tag(recipe_record.id) THEN
            tags := tags || ARRAY['vegan', 'vegetarian'];
        -- Vegetarian only
        ELSIF detect_vegetarian_tag(recipe_record.id) THEN
            tags := tags || ARRAY['vegetarian'];
        END IF;

        -- Gluten-free
        IF detect_gluten_free_tag(recipe_record.id) THEN
            tags := tags || ARRAY['gluten-free'];
        END IF;

        -- Keto
        IF detect_keto_tag(recipe_record.id) THEN
            tags := tags || ARRAY['keto', 'low-carb'];
        END IF;

        -- High-protein
        IF detect_high_protein_tag(recipe_record.id) THEN
            tags := tags || ARRAY['high-protein'];
        END IF;

        -- Low-calorie
        IF detect_low_calorie_tag(recipe_record.id) THEN
            tags := tags || ARRAY['low-calorie'];
        END IF;

        -- Dairy-free
        IF detect_dairy_free_tag(recipe_record.id) THEN
            tags := tags || ARRAY['dairy-free'];
        END IF;

        -- Update recipe with tags (only if there are tags)
        IF array_length(tags, 1) > 0 THEN
            UPDATE recipe SET dietary_tags = tags WHERE id = recipe_record.id;
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Auto-tag existing recipes (run once during migration)
-- ============================================================================
-- Note: This may take a few minutes if you have many recipes
DO $$
DECLARE
    tagged_count INTEGER;
BEGIN
    SELECT auto_tag_all_recipes() INTO tagged_count;
    RAISE NOTICE 'Auto-tagged % recipes with dietary tags', tagged_count;
END $$;

-- ============================================================================
-- Add helper query functions
-- ============================================================================

-- Find recipes by dietary tags
CREATE OR REPLACE FUNCTION find_recipes_by_tags(tag_list TEXT[])
RETURNS TABLE(recipe_id UUID, title TEXT, tags TEXT[]) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.title, r.dietary_tags
    FROM recipe r
    WHERE r.dietary_tags && tag_list  -- Overlap operator
    ORDER BY array_length(r.dietary_tags, 1) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update statistics
-- ============================================================================
ANALYZE recipe;

-- ============================================================================
-- Example queries to test dietary tags
-- ============================================================================
-- Find vegan recipes:
-- SELECT * FROM recipe WHERE 'vegan' = ANY(dietary_tags);

-- Find keto recipes:
-- SELECT * FROM recipe WHERE 'keto' = ANY(dietary_tags);

-- Find recipes with multiple tags (vegan AND gluten-free):
-- SELECT * FROM recipe WHERE dietary_tags @> ARRAY['vegan', 'gluten-free'];

-- Count recipes by tag:
-- SELECT unnest(dietary_tags) as tag, COUNT(*)
-- FROM recipe
-- GROUP BY tag
-- ORDER BY COUNT(*) DESC;
