#!/bin/bash

# AI姿势分析功能测试脚本

set -e

API_BASE="http://localhost:8080/api/v1"
API_KEY="dev-test-key-12345"
USER_ID="550e8400-e29b-41d4-a716-446655440000"

echo "🏋️ AI姿势分析功能测试"
echo "========================="
echo ""

# 检查服务是否运行
echo "1️⃣  检查API服务状态..."
if ! curl -s http://localhost:8080/actuator/health > /dev/null; then
    echo "❌ 后端服务未运行，请先启动: ./start-app.sh"
    exit 1
fi
echo "✅ API服务正常运行"
echo ""

# 测试图片分析
echo "2️⃣  测试姿势分析API..."
echo "上传测试图片并分析..."

# 创建临时测试图片 (这里使用一个示例URL，实际应该上传真实图片)
cat > /tmp/pose_request.json <<EOF
{
  "userId": "$USER_ID",
  "exerciseType": "squat"
}
EOF

# 注意: 这里需要一个真实的图片文件进行测试
# 如果没有图片，可以先跳过
if [ -f "test-squat.jpg" ]; then
    echo "发送分析请求..."
    RESPONSE=$(curl -s -X POST \
        -H "X-API-Key: $API_KEY" \
        -F "file=@test-squat.jpg" \
        -F "data=@/tmp/pose_request.json" \
        "$API_BASE/pose/analyze")
    
    echo "分析结果:"
    echo "$RESPONSE" | jq '.'
    
    SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')
    echo "✅ 会话ID: $SESSION_ID"
else
    echo "⚠️  未找到测试图片 test-squat.jpg，跳过实际分析测试"
    echo "   你可以手动测试:"
    echo "   curl -X POST -H 'X-API-Key: $API_KEY' \\"
    echo "     -F 'file=@your-workout-image.jpg' \\"
    echo "     -F 'data={\"userId\":\"$USER_ID\",\"exerciseType\":\"squat\"}' \\"
    echo "     $API_BASE/pose/analyze"
fi
echo ""

# 查询训练历史
echo "3️⃣  查询训练历史..."
HISTORY=$(curl -s -H "X-API-Key: $API_KEY" \
    "$API_BASE/pose/history/$USER_ID")

echo "$HISTORY" | jq '.'
TOTAL_SESSIONS=$(echo "$HISTORY" | jq 'length')
echo "✅ 共找到 $TOTAL_SESSIONS 个训练会话"
echo ""

# 查询进步统计
echo "4️⃣  查询用户进步数据..."
PROGRESS=$(curl -s -H "X-API-Key: $API_KEY" \
    "$API_BASE/pose/progress/$USER_ID")

echo "$PROGRESS" | jq '.'
AVG_SCORE=$(echo "$PROGRESS" | jq '.averageScore')
TOTAL=$(echo "$PROGRESS" | jq '.totalSessions')
echo "✅ 总训练次数: $TOTAL, 平均评分: $AVG_SCORE"
echo ""

echo "========================="
echo "✅ 所有测试完成！"
echo ""
echo "📊 功能总结:"
echo "  ✓ POST /api/v1/pose/analyze - 上传图片/视频进行AI分析"
echo "  ✓ GET /api/v1/pose/history/{userId} - 查询训练历史"
echo "  ✓ GET /api/v1/pose/progress/{userId} - 查询进步统计"
echo ""
echo "🎯 下一步:"
echo "  1. 在 .env 文件中设置 OPENAI_API_KEY"
echo "  2. 上传真实的训练图片/视频进行测试"
echo "  3. 在移动App中集成PoseAnalysisScreen"
