#!/bin/bash

# Test Nutrition Alert System
# Tests overeating, undereating, and balanced nutrition scenarios

BASE_URL="http://localhost:8080/api/v1"
USER_ID="550e8400-e29b-41d4-a716-446655440000"
TODAY=$(date +%Y-%m-%d)

echo "🧪 Nutrition Alert System Test"
echo "================================"

# Step 1: Create user profile with targets (2000 kcal, 130g protein, 220g carbs, 70g fat)
echo ""
echo "1️⃣ Creating user profile..."
curl -s -X POST "$BASE_URL/user-profile" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "age": 30,
    "gender": "male",
    "heightCm": 175,
    "currentWeightKg": 75,
    "goalWeightKg": 72,
    "activityLevel": "moderate",
    "fitnessGoal": "lose_weight",
    "dailyCalorieTarget": 2000,
    "dailyProteinTarget": 130,
    "dailyCarbsTarget": 220,
    "dailyFatTarget": 70
  }' | jq '.'

# Step 2: Test overeating scenario (超标预警)
echo ""
echo "2️⃣ Logging excessive meals (should trigger calorie/carbs alerts)..."
curl -s -X POST "$BASE_URL/nutrition/log-meal" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "mealType": "breakfast",
    "recipeName": "Bacon Egg Cheese Burger + Fries",
    "actualCalories": 1200,
    "actualProtein": 50,
    "actualCarbs": 140,
    "actualFat": 55
  }' | jq '.mealLogId'

curl -s -X POST "$BASE_URL/nutrition/log-meal" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "mealType": "dinner",
    "recipeName": "Pizza + Ice Cream",
    "actualCalories": 1500,
    "actualProtein": 60,
    "actualCarbs": 180,
    "actualFat": 70
  }' | jq '.mealLogId'

# Step 3: Get daily summary with alerts
echo ""
echo "3️⃣ Daily summary (should show alerts for exceeding targets)..."
SUMMARY=$(curl -s "$BASE_URL/nutrition/daily-summary?userId=$USER_ID&date=$TODAY")
echo "$SUMMARY" | jq '.'

echo ""
echo "🔍 Alert Messages:"
echo "$SUMMARY" | jq -r '.alerts[]'

# Step 4: Test undereating scenario (摄入不足)
echo ""
echo "4️⃣ Testing undereating scenario (new user)..."
USER_ID_2="660e8400-e29b-41d4-a716-446655440001"

# Create profile for second user
curl -s -X POST "$BASE_URL/user-profile" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID_2'",
    "age": 25,
    "gender": "female",
    "heightCm": 165,
    "currentWeightKg": 60,
    "goalWeightKg": 58,
    "activityLevel": "sedentary",
    "fitnessGoal": "lose_weight",
    "dailyCalorieTarget": 1600,
    "dailyProteinTarget": 100,
    "dailyCarbsTarget": 180,
    "dailyFatTarget": 50
  }' | jq '.userId'

# Log very light meal
curl -s -X POST "$BASE_URL/nutrition/log-meal" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID_2'",
    "mealType": "lunch",
    "recipeName": "Green Salad",
    "actualCalories": 300,
    "actualProtein": 10,
    "actualCarbs": 40,
    "actualFat": 8
  }' | jq '.mealLogId'

echo ""
echo "5️⃣ Daily summary for light eater (should show insufficient intake alerts)..."
SUMMARY_2=$(curl -s "$BASE_URL/nutrition/daily-summary?userId=$USER_ID_2&date=$TODAY")
echo "$SUMMARY_2" | jq '.'

echo ""
echo "🔍 Alert Messages:"
echo "$SUMMARY_2" | jq -r '.alerts[]'

# Step 5: Test balanced scenario (no alerts)
echo ""
echo "6️⃣ Testing balanced nutrition (should have no/few alerts)..."
USER_ID_3="770e8400-e29b-41d4-a716-446655440002"

curl -s -X POST "$BASE_URL/user-profile" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID_3'",
    "age": 28,
    "gender": "male",
    "heightCm": 180,
    "currentWeightKg": 80,
    "goalWeightKg": 80,
    "activityLevel": "active",
    "fitnessGoal": "maintain_weight",
    "dailyCalorieTarget": 2500,
    "dailyProteinTarget": 150,
    "dailyCarbsTarget": 300,
    "dailyFatTarget": 80
  }' | jq '.userId'

# Log balanced meals
for meal in breakfast lunch dinner; do
  curl -s -X POST "$BASE_URL/nutrition/log-meal" \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "'$USER_ID_3'",
      "mealType": "'$meal'",
      "recipeName": "Balanced '${meal^}'",
      "actualCalories": 800,
      "actualProtein": 50,
      "actualCarbs": 95,
      "actualFat": 26
    }' | jq '.mealLogId'
done

echo ""
echo "7️⃣ Daily summary for balanced eater (should show few/no alerts)..."
SUMMARY_3=$(curl -s "$BASE_URL/nutrition/daily-summary?userId=$USER_ID_3&date=$TODAY")
echo "$SUMMARY_3" | jq '.'

echo ""
echo "🔍 Alert Messages:"
ALERTS_3=$(echo "$SUMMARY_3" | jq -r '.alerts[]')
if [ -z "$ALERTS_3" ]; then
  echo "✅ No alerts (balanced nutrition)"
else
  echo "$ALERTS_3"
fi

echo ""
echo "================================"
echo "✅ Test Complete!"
echo ""
echo "Summary:"
echo "- User 1: Overeating (should show ⚠️ 超标 alerts)"
echo "- User 2: Undereating (should show ⚠️ 不足 alerts)"
echo "- User 3: Balanced (should show no/few alerts)"
