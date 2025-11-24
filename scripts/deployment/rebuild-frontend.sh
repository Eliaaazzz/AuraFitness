#!/bin/bash
# 前端修复和重新构建脚本

set -e  # 遇到错误就退出

echo "🧹 清理旧文件..."
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness/fitness-mvp
rm -rf node_modules .expo dist package-lock.json
npm cache clean --force

echo "📦 重新安装依赖..."
npm install

echo "🔨 构建Web版本..."
npx expo export --platform web

echo "📦 创建部署包..."
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness
tar -czf frontend-web-deploy.tar.gz -C fitness-mvp/dist .

echo "✅ 构建完成！"
echo ""
echo "📊 部署包信息："
ls -lh frontend-web-deploy.tar.gz
echo ""
echo "🚀 现在可以上传到EC2："
echo "scp -i Elialiuuuu.pem frontend-web-deploy.tar.gz ec2-user@3.104.117.222:/home/ec2-user/"
