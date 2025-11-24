#!/bin/bash
# Test Recipe Nutrition Display
# Verifies that recipes return complete nutrition information to users

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_BASE="${API_BASE_URL:-http://localhost:8080}"
API_KEY="${API_KEY:-}"

echo "========================================"
echo "Testing Recipe Nutrition Display"
echo "========================================"
echo "API Base: $API_BASE"
echo ""

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local method="${3:-GET}"

    echo -e "${YELLOW}Testing: $name${NC}"
    echo "Endpoint: $method $endpoint"

    if [ "$method" = "POST" ]; then
        # POST with empty metadata for recipes/from-image
        response=$(curl -s -w "\n%{http_code}" \
            -X POST "$API_BASE$endpoint" \
            -H "Content-Type: multipart/form-data" \
            -F 'metadata={"ingredients":["chicken","rice"],"maxTime":30}')
    else
        # GET request
        if [ -n "$API_KEY" ]; then
            response=$(curl -s -w "\n%{http_code}" \
                -H "X-API-Key: $API_KEY" \
                "$API_BASE$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint")
        fi
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Status: $http_code OK${NC}"

        # Check for nutrition data
        calories=$(echo "$body" | jq -r '.recipes[0].nutrition.calories // "missing"' 2>/dev/null)
        protein=$(echo "$body" | jq -r '.recipes[0].nutrition.protein // "missing"' 2>/dev/null)
        carbs=$(echo "$body" | jq -r '.recipes[0].nutrition.carbs // "missing"' 2>/dev/null)
        fat=$(echo "$body" | jq -r '.recipes[0].nutrition.fat // "missing"' 2>/dev/null)

        if [ "$calories" != "missing" ] && [ "$calories" != "null" ]; then
            echo -e "${GREEN}✓ Nutrition data present:${NC}"
            echo "  - Calories: $calories kcal"
            echo "  - Protein: ${protein}g"
            echo "  - Carbs: ${carbs}g"
            echo "  - Fat: ${fat}g"

            # Check for ingredients
            ingredients=$(echo "$body" | jq -r '.recipes[0].ingredients // [] | length' 2>/dev/null)
            if [ "$ingredients" -gt 0 ]; then
                echo -e "${GREEN}✓ Ingredients: $ingredients items${NC}"
                # Show first 3 ingredients
                echo "$body" | jq -r '.recipes[0].ingredients[:3][] // empty' 2>/dev/null | sed 's/^/  - /'
            fi

            echo -e "${GREEN}✓✓ TEST PASSED - Nutrition displayed correctly${NC}"
        else
            echo -e "${RED}✗ Missing nutrition data!${NC}"
            echo "Response (first recipe):"
            echo "$body" | jq '.recipes[0]' 2>/dev/null || echo "$body"
            echo -e "${RED}✗✗ TEST FAILED - No nutrition data${NC}"
        fi
    else
        echo -e "${RED}✗ Status: $http_code${NC}"
        echo "Error: $body"
        echo -e "${RED}✗✗ TEST FAILED${NC}"
    fi

    echo ""
}

# Test 1: Recipe search by ingredients
echo "=== Test 1: Recipe Search (from-image endpoint) ==="
test_endpoint "Recipe Search with Ingredients" "/api/v1/recipes/from-image" "POST"

# Test 2: Get all recipes (if you have an endpoint for this)
echo "=== Test 2: Browse Recipes ==="
# This would depend on your actual endpoint - adjust as needed
# test_endpoint "Browse All Recipes" "/api/v1/recipes"

echo "========================================"
echo "Test Summary"
echo "========================================"
echo ""
echo "Expected Nutrition Format:"
echo "{"
echo '  "nutrition": {'
echo '    "calories": 450,'
echo '    "protein": 25.5,'
echo '    "carbs": 35.2,'
echo '    "fat": 18.0,'
echo '    "fiber": 5.0,'
echo '    "sugar": 8.0,'
echo '    "sodium": 650,'
echo '    "servings": 4'
echo '  },'
echo '  "ingredients": ["chicken", "rice", "vegetables"]'
echo "}"
echo ""

# Additional manual test
echo "=== Manual Test Commands ==="
echo ""
echo "1. Test recipe search:"
echo "   curl -X POST $API_BASE/api/v1/recipes/from-image \\"
echo "     -F 'metadata={\"ingredients\":[\"chicken\",\"rice\"],\"maxTime\":30}' | jq '.recipes[0].nutrition'"
echo ""
echo "2. View full recipe response:"
echo "   curl -X POST $API_BASE/api/v1/recipes/from-image \\"
echo "     -F 'metadata={\"ingredients\":[\"pasta\"],\"maxTime\":20}' | jq '.recipes[0]'"
echo ""
echo "3. Check nutrition is never null:"
echo "   curl -X POST $API_BASE/api/v1/recipes/from-image \\"
echo "     -F 'metadata={\"ingredients\":[],\"maxTime\":30}' | jq '.recipes[].nutrition | select(. == null)'"
echo "   (Empty output = GOOD, no nulls found)"
echo ""

echo "========================================"
echo "Done!"
echo "========================================"
