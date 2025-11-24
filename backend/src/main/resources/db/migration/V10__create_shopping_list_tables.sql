-- ============================================================================
-- V10: Shopping List Tables
-- ============================================================================
-- This migration creates shopping list functionality for meal planning
-- Features:
-- - Aggregate ingredients from multiple recipes
-- - Category organization (produce, meat, dairy, etc.)
-- - Checkbox tracking for shopping progress
-- - Recipe source tracking
-- ============================================================================

-- Create shopping_list table
CREATE TABLE shopping_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_date DATE DEFAULT CURRENT_DATE,
    estimated_cost DECIMAL(10,2),
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create shopping_list_item table
CREATE TABLE shopping_list_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_list(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    from_recipes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_shopping_list_user ON shopping_list(user_id);
CREATE INDEX idx_shopping_list_created ON shopping_list(created_date DESC);
CREATE INDEX idx_shopping_list_item_list ON shopping_list_item(shopping_list_id);
CREATE INDEX idx_shopping_list_item_category ON shopping_list_item(category);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_shopping_list_updated_at
    BEFORE UPDATE ON shopping_list
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-complete shopping list when all items are checked
CREATE OR REPLACE FUNCTION check_shopping_list_completion()
RETURNS TRIGGER AS $$
DECLARE
    total_items INT;
    checked_items INT;
BEGIN
    -- Count total and checked items for this shopping list
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_checked = TRUE)
    INTO total_items, checked_items
    FROM shopping_list_item
    WHERE shopping_list_id = NEW.shopping_list_id;

    -- Update shopping list completion status
    UPDATE shopping_list
    SET is_completed = (total_items > 0 AND total_items = checked_items)
    WHERE id = NEW.shopping_list_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete shopping list
CREATE TRIGGER update_shopping_list_completion
    AFTER INSERT OR UPDATE OR DELETE ON shopping_list_item
    FOR EACH ROW
    EXECUTE FUNCTION check_shopping_list_completion();

-- ============================================================================
-- Helper functions for shopping list management
-- ============================================================================

-- Get shopping list summary
CREATE OR REPLACE FUNCTION get_shopping_list_summary(list_id UUID)
RETURNS TABLE(
    total_items INT,
    checked_items INT,
    completion_percentage INT,
    total_cost DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT as total_items,
        COUNT(*) FILTER (WHERE is_checked = TRUE)::INT as checked_items,
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE (COUNT(*) FILTER (WHERE is_checked = TRUE) * 100 / COUNT(*))::INT
        END as completion_percentage,
        sl.estimated_cost as total_cost
    FROM shopping_list_item sli
    JOIN shopping_list sl ON sl.id = sli.shopping_list_id
    WHERE sli.shopping_list_id = list_id
    GROUP BY sl.estimated_cost;
END;
$$ LANGUAGE plpgsql;

-- Get items by category
CREATE OR REPLACE FUNCTION get_items_by_category(list_id UUID)
RETURNS TABLE(
    category VARCHAR,
    item_count INT,
    checked_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sli.category,
        COUNT(*)::INT as item_count,
        COUNT(*) FILTER (WHERE is_checked = TRUE)::INT as checked_count
    FROM shopping_list_item sli
    WHERE sli.shopping_list_id = list_id
    GROUP BY sli.category
    ORDER BY
        CASE sli.category
            WHEN 'produce' THEN 1
            WHEN 'meat' THEN 2
            WHEN 'dairy' THEN 3
            WHEN 'bakery' THEN 4
            WHEN 'pantry' THEN 5
            WHEN 'frozen' THEN 6
            WHEN 'beverages' THEN 7
            ELSE 8
        END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update statistics
-- ============================================================================
ANALYZE shopping_list;
ANALYZE shopping_list_item;

-- ============================================================================
-- Example queries
-- ============================================================================
-- Get all shopping lists for a user:
-- SELECT * FROM shopping_list WHERE user_id = 'user-uuid' ORDER BY created_date DESC;

-- Get completion summary:
-- SELECT * FROM get_shopping_list_summary('list-uuid');

-- Get items by category:
-- SELECT * FROM get_items_by_category('list-uuid');

-- Get unchecked items:
-- SELECT * FROM shopping_list_item WHERE shopping_list_id = 'list-uuid' AND is_checked = FALSE;
