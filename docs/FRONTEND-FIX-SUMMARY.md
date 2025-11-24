# 🐛 前端错误修复总结

## 问题诊断

**错误**: `Uncaught ReferenceError: spacing is not defined`
**位置**: `index-d4e28d372f05687d7a9c77934452cacc.js:790:282`
**影响**: 前端JS崩溃，无法加载页面，无法发起任何API调用

## 根本原因

1. ✅ **缺少导入**: `fitness-mvp/src/screens/CaptureScreen.tsx` 使用了 `spacing` 但没有导入
2. ⚠️ **node_modules 问题**: 依赖安装不完整或损坏

## 已修复

### 1. CaptureScreen.tsx (已修复)

**修改前**:
```typescript
import { formatDifficulty, formatMinutes, formatNumber, compressImage, getFileSize, openSettingsAndCheck } from '@/utils';
```

**修改后**:
```typescript
import { formatDifficulty, formatMinutes, formatNumber, compressImage, getFileSize, openSettingsAndCheck, spacing } from '@/utils';
```

**文件**: [fitness-mvp/src/screens/CaptureScreen.tsx:16](fitness-mvp/src/screens/CaptureScreen.tsx#L16)

### 2. 前端配置 (已更新)

**API后端地址**: 已更新为 `http://3.104.117.222:8080`
**文件**: [fitness-mvp/.env](fitness-mvp/.env)

```env
API_BASE_URL=http://3.104.117.222:8080
API_TIMEOUT=10000
YOUTUBE_API_KEY=AIzaSyCvugM8by8scvZcdLbGR9owMLt1HUTfPyY
```

## 重新构建步骤

### 方法1: 使用自动脚本 (推荐)

```bash
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness
./rebuild-frontend.sh
```

这个脚本会自动：
1. 清理旧文件和缓存
2. 重新安装依赖
3. 构建Web版本
4. 创建部署包

### 方法2: 手动步骤

```bash
# 进入前端目录
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness/fitness-mvp

# 1. 清理
rm -rf node_modules .expo dist package-lock.json
npm cache clean --force

# 2. 重新安装依赖
npm install

# 3. 构建Web版本
npx expo export --platform web

# 4. 创建部署包
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness
tar -czf frontend-web-deploy.tar.gz -C fitness-mvp/dist .
```

## 部署到EC2

构建完成后，上传到服务器：

```bash
# 1. 上传新的前端文件
scp -i Elialiuuuu.pem frontend-web-deploy.tar.gz ec2-user@3.104.117.222:/home/ec2-user/

# 2. SSH登录EC2
ssh -i Elialiuuuu.pem ec2-user@3.104.117.222

# 3. 在EC2上部署
tar -xzf frontend-web-deploy.tar.gz -C /tmp/frontend-new
sudo rm -rf /var/www/fitness-app/*
sudo cp -r /tmp/frontend-new/* /var/www/fitness-app/
sudo chown -R nginx:nginx /var/www/fitness-app
sudo systemctl reload nginx
rm -rf /tmp/frontend-new
```

## 验证修复

部署后，在浏览器中打开 http://3.104.117.222/ 并检查：

### 1. 控制台 (F12 → Console)
应该看到：
- ✅ 没有 "spacing is not defined" 错误
- ✅ 应用正常加载

### 2. 网络标签 (F12 → Network)
应该看到：
- ✅ API 调用到 `http://3.104.117.222:8080/api/...`
- ✅ 资源正常加载

### 3. 应用功能
- ✅ 页面正常渲染
- ✅ 可以导航不同页面
- ✅ API 数据正常显示

## 故障排查

### 如果仍然看到 "spacing is not defined"

1. **清除浏览器缓存**:
   - Chrome: Ctrl+Shift+Delete → 清除缓存
   - 或者强制刷新: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

2. **验证部署的文件**:
   ```bash
   # 在 EC2 上
   ls -la /var/www/fitness-app/
   # 应该看到 index.html 和 _expo 目录
   ```

3. **检查 Nginx 日志**:
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

### 如果API调用失败

1. **检查后端**:
   ```bash
   # 在 EC2 上
   curl http://localhost:8080/actuator/health
   # 应该返回 {"status":"UP"}
   ```

2. **检查网络**:
   ```bash
   # 在你的Mac上
   curl http://3.104.117.222:8080/actuator/health
   # 应该返回 {"status":"UP"}
   ```

3. **检查 Nginx 配置**:
   ```bash
   sudo nginx -t
   sudo cat /etc/nginx/conf.d/fitness-app.conf
   ```

## 相关文件

- ✅ 修复的源文件: `fitness-mvp/src/screens/CaptureScreen.tsx`
- ✅ 配置文件: `fitness-mvp/.env`
- ✅ 重建脚本: `rebuild-frontend.sh`
- ✅ 部署指南: `FRONTEND-DEPLOYMENT-GUIDE.md`

## 技术细节

### spacing 定义位置
- **定义**: `fitness-mvp/src/utils/theme.ts:51`
- **导出**: `fitness-mvp/src/utils/index.ts:3` (`export * from './theme'`)
- **值**:
  ```typescript
  {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
    '4xl': 64,
  }
  ```

### Babel 配置
- **路径别名**: `@/` → `./src/`
- **配置文件**: `fitness-mvp/babel.config.js`
- **解析插件**: `babel-plugin-module-resolver`

## 下一步

一旦前端修复并部署成功，你将拥有一个完整的全栈应用：

```
用户浏览器
    ↓
http://3.104.117.222 (Nginx)
    ├── / → 前端 (/var/www/fitness-app)
    └── /api/ → 后端代理
            ↓
        localhost:8080 (Docker)
            ├── PostgreSQL (RDS)
            └── Redis (ElastiCache)
```

祝部署顺利！ 🚀
