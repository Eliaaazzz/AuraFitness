# Fitness App AWS EC2 Deployment Guide

Complete step-by-step guide to deploy your Fitness App on AWS EC2.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Launch EC2 Instance](#step-1-launch-ec2-instance)
3. [Step 2: Connect to EC2](#step-2-connect-to-ec2)
4. [Step 3: Transfer Files](#step-3-transfer-files)
5. [Step 4: Run Deployment](#step-4-run-deployment)
6. [Step 5: Configure Application](#step-5-configure-application)
7. [Step 6: Set Up Domain & SSL](#step-6-set-up-domain--ssl)
8. [Step 7: Verify Deployment](#step-7-verify-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

---

## Prerequisites

### On Your Local Machine

✅ Backend JAR file built: `build/libs/fitness-app-0.0.1-SNAPSHOT.jar`
✅ Frontend web bundle built: `fitness-mvp/dist/`
✅ Deployment scripts ready: `deployment/` directory

### AWS Account Requirements

- Active AWS account
- Credit card on file (EC2 is not free tier for production)
- Basic understanding of AWS console

### API Keys Needed

Before deployment, obtain these API keys:

1. **OpenAI API Key** - For AI recipe/workout generation
   - Get it from: https://platform.openai.com/api-keys

2. **YouTube API Key** - For workout videos
   - Get it from: https://console.cloud.google.com/apis/credentials

3. **(Optional) Domain Name** - For production deployment
   - Register from: Namecheap, GoDaddy, Route53, etc.

---

## Step 1: Launch EC2 Instance

### 1.1 Log into AWS Console

1. Go to https://console.aws.amazon.com/
2. Navigate to **EC2** service
3. Click **Launch Instance**

### 1.2 Configure Instance

**Name and Tags:**
```
Name: fitness-app-production
```

**Application and OS Images (AMI):**
- **Select:** Ubuntu Server 22.04 LTS (64-bit x86)
- Free tier eligible option is fine for testing

**Instance Type:**
- **Minimum:** t3.small (2 GB RAM, 2 vCPUs) - $0.0208/hour
- **Recommended:** t3.medium (4 GB RAM, 2 vCPUs) - $0.0416/hour
- **Production:** t3.large (8 GB RAM, 2 vCPUs) - $0.0832/hour

> **Note:** Spring Boot + PostgreSQL + Redis need at least 2 GB RAM

**Key Pair (Login):**
1. Click **Create new key pair**
2. Name: `fitness-app-key`
3. Type: RSA
4. Format: `.pem` (for Mac/Linux) or `.ppk` (for Windows PuTTY)
5. Download and save securely

### 1.3 Network Settings

**Firewall (Security Groups):**

Create a new security group with these rules:

| Type  | Protocol | Port Range | Source          | Description          |
|-------|----------|------------|-----------------|----------------------|
| SSH   | TCP      | 22         | My IP           | SSH access           |
| HTTP  | TCP      | 80         | 0.0.0.0/0       | Web traffic          |
| HTTPS | TCP      | 443        | 0.0.0.0/0       | Secure web traffic   |

> **Security Tip:** Restrict SSH (port 22) to "My IP" for better security

### 1.4 Configure Storage

**Root Volume:**
- Size: **30 GB minimum** (recommend 50 GB for production)
- Volume Type: gp3 (General Purpose SSD)
- Delete on Termination: ✓ Yes

### 1.5 Launch Instance

1. Review settings
2. Click **Launch Instance**
3. Wait 2-3 minutes for instance to start
4. Note down the **Public IPv4 address** (e.g., 54.123.45.67)

---

## Step 2: Connect to EC2

### 2.1 Set Key Permissions (Mac/Linux)

```bash
chmod 400 ~/Downloads/fitness-app-key.pem
```

### 2.2 SSH into Server

```bash
ssh -i ~/Downloads/fitness-app-key.pem ubuntu@YOUR_EC2_IP
```

Replace `YOUR_EC2_IP` with your instance's public IP.

**First time connection:** Type `yes` when asked about host authenticity.

### 2.3 Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

---

## Step 3: Transfer Files

### 3.1 Create Deployment Package (On Your Local Machine)

```bash
# Navigate to your project directory
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness

# Create deployment package
mkdir -p deploy-package
cp build/libs/fitness-app-0.0.1-SNAPSHOT.jar deploy-package/
cp -r fitness-mvp/dist deploy-package/
cp -r deployment/* deploy-package/

# Create tarball
tar -czf fitness-app-deploy.tar.gz deploy-package/
```

### 3.2 Transfer to EC2

```bash
scp -i ~/Downloads/fitness-app-key.pem \
    fitness-app-deploy.tar.gz \
    ubuntu@YOUR_EC2_IP:/home/ubuntu/
```

### 3.3 Extract on EC2 (SSH into server)

```bash
ssh -i ~/Downloads/fitness-app-key.pem ubuntu@YOUR_EC2_IP

# Extract files
cd /home/ubuntu
tar -xzf fitness-app-deploy.tar.gz
cd deploy-package
ls -la
```

You should see:
- `fitness-app-0.0.1-SNAPSHOT.jar`
- `dist/` (frontend files)
- `*.sh` (deployment scripts)
- `nginx-frontend.conf`
- `env.template`

---

## Step 4: Run Deployment

### 4.1 Run Master Deployment Script

```bash
sudo ./deploy-all.sh
```

This script will:
1. ✅ Install Java 21
2. ✅ Install PostgreSQL
3. ✅ Install Redis
4. ✅ Install Nginx
5. ✅ Set up database with random credentials
6. ✅ Set up Redis with random password
7. ✅ Deploy backend to `/opt/fitness-app/`
8. ✅ Deploy frontend to `/var/www/fitness-app/`
9. ✅ Configure systemd service
10. ✅ Configure Nginx

**Save the output!** The script will display:
- Database credentials
- Redis password
- Important file locations

---

## Step 5: Configure Application

### 5.1 Update Backend Environment

```bash
sudo nano /opt/fitness-app/.env
```

Update these values (from deploy-all.sh output):

```env
# Database (use credentials from setup-database.sh output)
POSTGRES_PASSWORD=your_generated_password

# Redis (use password from setup-redis.sh output)
REDIS_PASSWORD=your_generated_password

# JWT Secret (generate new one)
JWT_SECRET=$(openssl rand -base64 64)

# API Keys
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_KEY
YOUTUBE_API_KEY=YOUR_YOUTUBE_KEY

# CORS - Add your domain
ALLOWED_ORIGINS=http://YOUR_EC2_IP,https://yourdomain.com
```

**Generate JWT Secret:**
```bash
openssl rand -base64 64
```

Save file: `Ctrl+X`, then `Y`, then `Enter`

### 5.2 Update Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/fitness-app
```

Update `server_name`:

```nginx
server_name YOUR_EC2_IP yourdomain.com www.yourdomain.com;
```

Save file: `Ctrl+X`, then `Y`, then `Enter`

### 5.3 Restart Services

```bash
# Restart backend
sudo systemctl restart fitness-app

# Reload nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status fitness-app
sudo systemctl status nginx
```

---

## Step 6: Set Up Domain & SSL

### 6.1 Point Domain to EC2 (Optional)

In your domain registrar (Namecheap, GoDaddy, etc.):

1. Go to DNS Management
2. Add A Record:
   - Type: `A`
   - Host: `@`
   - Value: `YOUR_EC2_IP`
   - TTL: `300`
3. Add A Record for www:
   - Type: `A`
   - Host: `www`
   - Value: `YOUR_EC2_IP`
   - TTL: `300`

Wait 5-60 minutes for DNS propagation.

### 6.2 Install SSL Certificate (Recommended)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)
```

**Test auto-renewal:**
```bash
sudo certbot renew --dry-run
```

### 6.3 Update Backend CORS

```bash
sudo nano /opt/fitness-app/.env
```

Update:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Restart backend:
```bash
sudo systemctl restart fitness-app
```

---

## Step 7: Verify Deployment

### 7.1 Check Services

```bash
# Backend status
sudo systemctl status fitness-app

# Nginx status
sudo systemctl status nginx

# PostgreSQL status
sudo systemctl status postgresql

# Redis status
sudo systemctl status redis-server
```

All should show **active (running)** in green.

### 7.2 Test Backend API

```bash
curl http://localhost:8080/actuator/health
```

Should return:
```json
{"status":"UP"}
```

### 7.3 Test Frontend

Open in browser:
```
http://YOUR_EC2_IP/
```

Or with domain:
```
https://yourdomain.com/
```

You should see the Fitness App homepage.

### 7.4 Check Logs

**Backend logs:**
```bash
# Real-time logs
sudo journalctl -u fitness-app -f

# Application logs
sudo tail -f /opt/fitness-app/logs/application.log

# Error logs
sudo tail -f /opt/fitness-app/logs/error.log
```

**Frontend/Nginx logs:**
```bash
# Access logs
sudo tail -f /var/log/nginx/fitness-app-access.log

# Error logs
sudo tail -f /var/log/nginx/fitness-app-error.log
```

**Database logs:**
```bash
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

---

## Troubleshooting

### Backend Won't Start

**Check logs:**
```bash
sudo journalctl -u fitness-app -n 100 --no-pager
```

**Common issues:**

1. **Database connection failed**
   ```bash
   # Test database connection
   psql -h localhost -U fitness_user -d fitness_app

   # Check credentials in .env
   sudo nano /opt/fitness-app/.env
   ```

2. **Port already in use**
   ```bash
   # Check what's using port 8080
   sudo lsof -i :8080

   # Change port in .env
   sudo nano /opt/fitness-app/.env
   # Update SERVER_PORT=8081
   ```

3. **Out of memory**
   ```bash
   # Check memory
   free -h

   # Reduce Java heap in systemd service
   sudo nano /etc/systemd/system/fitness-app.service
   # Change: -Xmx2048m to -Xmx1024m

   sudo systemctl daemon-reload
   sudo systemctl restart fitness-app
   ```

### Frontend Shows 404 or Blank Page

**Check Nginx:**
```bash
# Test config
sudo nginx -t

# Check files exist
ls -la /var/www/fitness-app/

# Restart nginx
sudo systemctl restart nginx
```

### API Calls Fail (CORS Errors)

**Update CORS in backend:**
```bash
sudo nano /opt/fitness-app/.env
```

Add your domain to `ALLOWED_ORIGINS`:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://YOUR_EC2_IP,https://yourdomain.com
```

Restart:
```bash
sudo systemctl restart fitness-app
```

### Cannot Connect via SSH

1. **Check Security Group** - Port 22 open for your IP
2. **Check instance state** - Must be "running"
3. **Check key permissions** - `chmod 400 your-key.pem`
4. **Try EC2 Instance Connect** from AWS Console

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check if it's listening
sudo netstat -tlnp | grep 5432

# Test connection
psql -h localhost -U fitness_user -d fitness_app

# Reset password if needed
sudo -u postgres psql
\password fitness_user
```

---

## Maintenance

### View Real-Time Logs

```bash
# Backend
sudo journalctl -u fitness-app -f

# Nginx access
sudo tail -f /var/log/nginx/fitness-app-access.log

# Database
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart fitness-app

# Reload nginx (no downtime)
sudo systemctl reload nginx

# Restart database (causes downtime!)
sudo systemctl restart postgresql
```

### Update Application

**Backend update:**
```bash
# Copy new JAR to server (from local machine)
scp -i ~/Downloads/fitness-app-key.pem \
    build/libs/fitness-app-0.0.1-SNAPSHOT.jar \
    ubuntu@YOUR_EC2_IP:/home/ubuntu/

# On server
sudo cp /home/ubuntu/fitness-app-0.0.1-SNAPSHOT.jar /opt/fitness-app/
sudo chown fitness:fitness /opt/fitness-app/fitness-app-0.0.1-SNAPSHOT.jar
sudo systemctl restart fitness-app
```

**Frontend update:**
```bash
# Copy new frontend (from local machine)
scp -i ~/Downloads/fitness-app-key.pem \
    -r fitness-mvp/dist/* \
    ubuntu@YOUR_EC2_IP:/home/ubuntu/frontend-new/

# On server
sudo rm -rf /var/www/fitness-app/*
sudo cp -r /home/ubuntu/frontend-new/* /var/www/fitness-app/
sudo chown -R www-data:www-data /var/www/fitness-app
sudo systemctl reload nginx
```

### Database Backup

```bash
# Manual backup
sudo -u postgres pg_dump fitness_app > backup_$(date +%Y%m%d).sql

# Automated daily backup (add to crontab)
sudo crontab -e

# Add this line:
0 2 * * * /usr/bin/pg_dump -U postgres fitness_app > /var/backups/fitness_app_$(date +\%Y\%m\%d).sql
```

### Monitor Resources

```bash
# Check memory
free -h

# Check disk space
df -h

# Check CPU usage
top

# Check service memory usage
sudo systemctl status fitness-app
```

---

## Security Checklist

✅ SSH key-based authentication (no password)
✅ Security group restricts SSH to your IP
✅ Firewall (UFW) enabled
✅ SSL/HTTPS certificate installed
✅ Strong database password
✅ Strong Redis password
✅ Strong JWT secret (256+ bits)
✅ Environment file permissions: `chmod 600 .env`
✅ Regular system updates: `sudo apt-get update && sudo apt-get upgrade`
✅ PostgreSQL only listens on localhost
✅ Redis only listens on localhost
✅ Application user has limited permissions

---

## Performance Tuning

### Increase Java Heap Size

```bash
sudo nano /etc/systemd/system/fitness-app.service
```

Change:
```
Environment="JAVA_OPTS=-Xms512m -Xmx2048m -XX:+UseG1GC"
```

To (for 4 GB RAM instance):
```
Environment="JAVA_OPTS=-Xms1024m -Xmx3072m -XX:+UseG1GC"
```

Reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart fitness-app
```

### Enable Nginx Caching

```bash
sudo nano /etc/nginx/sites-available/fitness-app
```

Add caching for API responses:
```nginx
location /api/ {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m;
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    # ... rest of config
}
```

---

## Cost Optimization

### EC2 Instance Costs

- **t3.small**: ~$15/month (2 GB RAM)
- **t3.medium**: ~$30/month (4 GB RAM)
- **t3.large**: ~$60/month (8 GB RAM)

### Save Money

1. **Use Reserved Instances** - 30-70% savings with 1-3 year commitment
2. **Use Spot Instances** - Up to 90% savings (for non-critical workloads)
3. **Stop instance when not needed** - Only pay for storage
4. **Use Application Load Balancer** only if needed (adds $16/month)
5. **Monitor CloudWatch** - Set billing alarms

---

## Next Steps

### Production Hardening

1. **Set up monitoring** - CloudWatch, DataDog, New Relic
2. **Set up alerts** - Email/SMS on errors
3. **Set up automated backups** - Database + file storage
4. **Set up CI/CD** - GitHub Actions, Jenkins
5. **Set up multiple availability zones** - High availability
6. **Set up load balancer** - Scale horizontally
7. **Set up CDN** - CloudFront for faster asset delivery
8. **Set up S3** - For file uploads instead of local storage

### Scaling

When traffic grows:

1. **Vertical scaling** - Increase instance size (t3.small → t3.medium)
2. **Horizontal scaling** - Multiple EC2 instances + load balancer
3. **Database scaling** - RDS instead of self-hosted PostgreSQL
4. **Cache scaling** - ElastiCache instead of self-hosted Redis
5. **Static assets** - S3 + CloudFront CDN

---

## Support

### Useful Commands Reference

```bash
# Service management
sudo systemctl status fitness-app
sudo systemctl start fitness-app
sudo systemctl stop fitness-app
sudo systemctl restart fitness-app
sudo systemctl enable fitness-app

# Logs
sudo journalctl -u fitness-app -f
sudo tail -f /opt/fitness-app/logs/application.log
sudo tail -f /var/log/nginx/fitness-app-access.log

# Configuration
sudo nano /opt/fitness-app/.env
sudo nano /etc/nginx/sites-available/fitness-app

# Nginx
sudo nginx -t
sudo systemctl reload nginx

# Database
psql -h localhost -U fitness_user -d fitness_app
sudo -u postgres psql

# System
free -h
df -h
top
```

---

## Congratulations! 🎉

Your Fitness App is now deployed and running on AWS EC2!

Access your app at:
- **HTTP**: `http://YOUR_EC2_IP/`
- **HTTPS**: `https://yourdomain.com/` (if configured)

**Remember to:**
- ✅ Set up SSL/HTTPS for production
- ✅ Configure regular database backups
- ✅ Monitor application logs
- ✅ Set up billing alerts
- ✅ Document your specific configuration

Happy deploying! 🚀
