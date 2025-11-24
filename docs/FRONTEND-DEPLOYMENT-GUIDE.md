# 🚀 前端部署完整指南

## 📦 已准备的文件
- **前端构建包**: `frontend-web-deploy.tar.gz` (2.7 MB)
- **后端地址**: `http://3.104.117.222:8080`

---

## 步骤 1: 上传前端文件到 EC2

在你的本地Mac上运行：

```bash
# 进入项目目录
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness

# 上传前端文件到 EC2
scp -i Elialiuuuu.pem frontend-web-deploy.tar.gz ec2-user@3.104.117.222:/home/ec2-user/
```

---

## 步骤 2: SSH 登录到 EC2

```bash
ssh -i Elialiuuuu.pem ec2-user@3.104.117.222
```

---

## 步骤 3: 安装并配置 Nginx

```bash
# 安装 Nginx
sudo yum install -y nginx

# 创建网站目录
sudo mkdir -p /var/www/fitness-app

# 解压前端文件
cd /home/ec2-user
tar -xzf frontend-web-deploy.tar.gz -C /tmp/frontend
sudo cp -r /tmp/frontend/* /var/www/fitness-app/

# 设置权限
sudo chown -R nginx:nginx /var/www/fitness-app
sudo chmod -R 755 /var/www/fitness-app

# 清理临时文件
rm -rf /tmp/frontend
```

---

## 步骤 4: 配置 Nginx

```bash
# 创建 Nginx 配置
sudo tee /etc/nginx/conf.d/fitness-app.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/fitness-app;
    index index.html;

    # Frontend - Single Page Application
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Health check endpoint
    location /actuator/health {
        proxy_pass http://localhost:8080/actuator/health;
    }
}
EOF

# 测试 Nginx 配置
sudo nginx -t

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 查看 Nginx 状态
sudo systemctl status nginx
```

---

## 步骤 5: 配置防火墙（如果需要）

```bash
# 允许 HTTP 流量
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

# 或者如果使用 iptables
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
```

---

## 步骤 6: 验证部署

```bash
# 1. 检查文件是否存在
ls -la /var/www/fitness-app/

# 2. 检查 Nginx 是否运行
sudo systemctl status nginx

# 3. 检查后端是否运行
curl http://localhost:8080/actuator/health

# 4. 测试前端访问
curl http://localhost/

# 5. 从外部测试（在你的Mac上运行）
curl http://3.104.117.222/
```

---

## 📱 访问你的应用

**前端网址**: http://3.104.117.222/

在浏览器中打开这个地址，你应该能看到你的健身应用！

---

## 🔧 常用管理命令

```bash
# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 重启 Nginx
sudo systemctl restart nginx

# 重新加载配置（不中断服务）
sudo systemctl reload nginx

# 停止 Nginx
sudo systemctl stop nginx

# 查看后端日志
cd /opt/fitness-app
docker-compose logs -f
```

---

## 🐛 故障排查

### 前端无法访问
```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 检查端口是否监听
sudo netstat -tlnp | grep :80

# 检查文件权限
ls -la /var/www/fitness-app/

# 查看错误日志
sudo tail -50 /var/log/nginx/error.log
```

### API 调用失败
```bash
# 检查后端是否运行
curl http://localhost:8080/actuator/health

# 检查后端日志
cd /opt/fitness-app && docker-compose logs -f app

# 测试 API 代理
curl http://localhost/api/health
```

### EC2 安全组设置
在 AWS Console 检查:
- **EC2 Security Group** 必须允许：
  - Port 80 (HTTP) from 0.0.0.0/0
  - Port 8080 (Backend) from your IP or VPC only

---

## 🔄 更新应用

### 更新前端
```bash
# 在Mac上重新构建并上传
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness
npx expo export --platform web
tar -czf frontend-web-deploy.tar.gz -C fitness-mvp/dist .
scp -i Elialiuuuu.pem frontend-web-deploy.tar.gz ec2-user@3.104.117.222:/home/ec2-user/

# 在 EC2 上
ssh -i Elialiuuuu.pem ec2-user@3.104.117.222
tar -xzf frontend-web-deploy.tar.gz -C /tmp/frontend
sudo rm -rf /var/www/fitness-app/*
sudo cp -r /tmp/frontend/* /var/www/fitness-app/
sudo chown -R nginx:nginx /var/www/fitness-app
sudo systemctl reload nginx
```

### 更新后端
```bash
# 参考 deployment/backend/DEPLOY.md
```

---

## 💡 提示

1. **DNS 域名** (可选):
   - 如果你有域名，可以在 Route 53 添加 A 记录指向 `3.104.117.222`
   - 然后修改 nginx 配置中的 `server_name` 为你的域名

2. **HTTPS** (推荐):
   ```bash
   # 安装 Certbot
   sudo yum install -y certbot python3-certbot-nginx

   # 获取证书（需要域名）
   sudo certbot --nginx -d yourdomain.com
   ```

3. **性能优化**:
   - Nginx 已配置静态资源缓存（1年）
   - API 响应通过代理优化
   - 启用 gzip 压缩

---

## 📊 架构说明

```
Internet
   ↓
AWS EC2 (3.104.117.222)
   ↓
Nginx :80
   ├── / → Frontend (/var/www/fitness-app)
   └── /api/ → Backend Proxy (localhost:8080)
          ↓
   Docker Backend :8080
          ├── RDS PostgreSQL
          └── ElastiCache Redis
```

---

## 🆘 需要帮助?

- **Nginx 文档**: https://nginx.org/en/docs/
- **AWS EC2 Console**: https://console.aws.amazon.com/ec2
- **查看日志**: `sudo tail -f /var/log/nginx/error.log`
