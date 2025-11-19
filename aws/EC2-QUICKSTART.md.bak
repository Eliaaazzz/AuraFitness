# AWS EC2 Quick Start Guide

**Deploy your fitness app to AWS EC2 in under 30 minutes!**

## Overview

This guide will help you deploy the Camera First Fitness app to AWS EC2 using our automated deployment script. The script handles:
- VPC and network setup
- RDS PostgreSQL database
- ElastiCache Redis
- EC2 instance with Docker
- Security groups and IAM roles

## Prerequisites

### 1. AWS Account Setup
- AWS account with billing enabled
- IAM user with admin permissions
- AWS CLI installed and configured

### 2. Install Required Tools

**macOS:**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install AWS CLI
brew install awscli

# Install Docker Desktop
brew install --cask docker
```

**Windows:**
- Download AWS CLI: https://aws.amazon.com/cli/
- Download Docker Desktop: https://www.docker.com/products/docker-desktop

**Linux:**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 3. Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### 4. Get API Keys

You'll need these API keys before deployment:

| Service | Get API Key | Purpose |
|---------|-------------|---------|
# REMOVED - OpenAI is optional
| Spoonacular | https://spoonacular.com/food-api | Recipe data |
| YouTube | https://console.cloud.google.com/apis/credentials | Video metadata |

## Deployment Steps

### Step 1: Configure Environment

```bash
cd aws/

# Copy the example environment file
cp .env.deploy.example .env.deploy

# Edit with your API keys
nano .env.deploy  # or use your preferred editor
```

**Required fields in .env.deploy:**
```bash
# API Keys (REQUIRED - get from links above)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
SPOONACULAR_API_KEY=xxxxxxxxxxxxx
YOUTUBE_API_KEY=xxxxxxxxxxxxx

# AWS Configuration (defaults are fine for most users)
AWS_REGION=us-east-1
INSTANCE_TYPE=t3.medium
```

### Step 2: Setup Infrastructure

This creates all AWS resources (takes 10-15 minutes):

```bash
./deploy-ec2.sh setup
```

**What this does:**
1. Creates VPC with public/private subnets
2. Creates security groups
3. Launches RDS PostgreSQL database
4. Launches ElastiCache Redis cluster
5. Launches EC2 instance
6. Generates SSH key pair

**Save the output!** The script will display:
- EC2 public IP
- SSH command
- Database credentials
- Redis endpoint

Example output:
```
============================================
SAVE THESE CREDENTIALS SECURELY:
============================================
EC2 Public IP: 54.123.45.67
EC2 Instance ID: i-0123456789abcdef
SSH Command: ssh -i ~/.ssh/fitness-app-key.pem ec2-user@54.123.45.67

Database Endpoint: fitness-app-db.xxxxx.us-east-1.rds.amazonaws.com
Database Username: fitnessadmin
Database Password: xxxxxxxxxxxxxxxxxxx
Database Name: fitness_mvp

Redis Endpoint: fitness-app-redis.xxxxx.0001.use1.cache.amazonaws.com:6379
============================================
```

### Step 3: Deploy Application

Wait 2-3 minutes for EC2 initialization, then deploy:

```bash
./deploy-ec2.sh deploy
```

**What this does:**
1. Builds your Spring Boot application
2. Uploads JAR to EC2
3. Creates Docker container
4. Starts the application
5. Runs health checks

Wait for success message:
```
============================================
APPLICATION DEPLOYED SUCCESSFULLY!
============================================
Health Check: http://54.123.45.67:8080/actuator/health
API Base URL: http://54.123.45.67:8080
API Docs: http://54.123.45.67:8080/swagger-ui.html
============================================
```

### Step 4: Test Your Deployment

```bash
# Check health
curl http://<YOUR_EC2_IP>:8080/actuator/health

# View API documentation
open http://<YOUR_EC2_IP>:8080/swagger-ui.html

# View logs
./deploy-ec2.sh logs
```

## Common Commands

### View Application Logs
```bash
./deploy-ec2.sh logs
```

### Update Application
After making code changes:
```bash
./deploy-ec2.sh update
```

### SSH into EC2
```bash
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<YOUR_EC2_IP>
```

### Check Docker Status
```bash
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<YOUR_EC2_IP>
docker ps
docker stats
```

### Destroy Everything
**Warning:** This deletes all resources!
```bash
./deploy-ec2.sh destroy
```

## Cost Breakdown

### Monthly Costs (Default Configuration)

| Resource | Type | Monthly Cost |
|----------|------|--------------|
| EC2 Instance | t3.medium (2 vCPU, 4GB RAM) | $30.37 |
| EBS Volume | 30GB gp3 | $2.40 |
| RDS PostgreSQL | db.t3.micro | $18.40 |
| ElastiCache Redis | cache.t3.micro | $12.96 |
| Data Transfer | ~10GB/month | $0.90 |
| **Total** | | **~$65/month** |

### Cost Optimization

**Development/Testing (saves ~50%):**
```bash
# In .env.deploy
INSTANCE_TYPE=t3.small
DB_INSTANCE_CLASS=db.t3.micro
REDIS_NODE_TYPE=cache.t3.micro

# Monthly cost: ~$35
```

**Production (better performance):**
```bash
# In .env.deploy
INSTANCE_TYPE=t3.large
DB_INSTANCE_CLASS=db.t3.small
REDIS_NODE_TYPE=cache.t3.small

# Monthly cost: ~$120
```

**Save 30-40% with Reserved Instances:**
- Commit to 1-year usage
- Purchase from AWS Console: EC2 > Reserved Instances
- Apply to RDS and ElastiCache too

## Troubleshooting

### Issue: AWS CLI not configured
```bash
Error: Unable to locate credentials

Solution:
aws configure
# Enter your AWS credentials
```

### Issue: Permission denied when running script
```bash
Error: Permission denied: ./deploy-ec2.sh

Solution:
chmod +x aws/deploy-ec2.sh
./deploy-ec2.sh setup
```

### Issue: Health check failed
```bash
# View application logs
./deploy-ec2.sh logs

# Check if all services are running
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<EC2_IP>
docker ps
docker logs fitness-app

# Common fixes:
# 1. Check database connection in logs
# 2. Verify API keys in .env file
# 3. Ensure security groups allow traffic
```

### Issue: Can't connect to EC2 via SSH
```bash
Error: Connection timed out

Solutions:
1. Check security group allows your IP:
   aws ec2 describe-security-groups --group-ids <APP_SG_ID>

2. Your IP may have changed:
   MY_NEW_IP=$(curl -s https://checkip.amazonaws.com)
   aws ec2 authorize-security-group-ingress \
     --group-id <APP_SG_ID> \
     --protocol tcp --port 22 --cidr ${MY_NEW_IP}/32

3. Verify key permissions:
   chmod 400 ~/.ssh/fitness-app-key.pem
```

### Issue: Database connection failed
```bash
# SSH into EC2 and test database
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<EC2_IP>

# Test PostgreSQL connection
psql -h <DB_ENDPOINT> -U fitnessadmin -d fitness_mvp
# Enter password from setup output

# If connection fails, check security group
aws ec2 describe-security-groups --group-ids <DB_SG_ID>
```

### Issue: Out of memory errors
```bash
# Check memory usage
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<EC2_IP>
free -h
docker stats

# Solution: Upgrade instance type
# Edit .env.deploy:
INSTANCE_TYPE=t3.large

# Then update:
./deploy-ec2.sh destroy
./deploy-ec2.sh setup
./deploy-ec2.sh deploy
```

## Next Steps

### 1. Setup Custom Domain (Recommended)

```bash
# Get a domain from Route 53 or use existing domain
# Point A record to your EC2 IP
# Then update your mobile app to use:
API_BASE_URL=http://api.yourapp.com:8080
```

### 2. Enable HTTPS with Let's Encrypt

```bash
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<EC2_IP>

# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get certificate (requires domain)
sudo certbot certonly --standalone -d api.yourapp.com
```

### 3. Setup Application Load Balancer

See detailed guide: [EC2-DEPLOYMENT-GUIDE.md](EC2-DEPLOYMENT-GUIDE.md#phase-6-domain--ssl-configuration)

Benefits:
- Auto-scaling with multiple EC2 instances
- SSL termination
- Health checks
- Better availability

### 4. Configure Monitoring

```bash
# CloudWatch Dashboard
aws cloudwatch put-dashboard --dashboard-name FitnessApp \
  --dashboard-body file://cloudwatch-dashboard.json

# Email alerts
aws sns create-topic --name fitness-app-alerts
aws sns subscribe \
  --topic-arn <TOPIC_ARN> \
  --protocol email \
  --notification-endpoint you@example.com
```

### 5. Setup CI/CD Pipeline

See: `.github/workflows/deploy-to-ec2.yml` (to be created)

Auto-deploy on every push to main branch!

## Support

### Documentation
- **Full Guide**: [EC2-DEPLOYMENT-GUIDE.md](EC2-DEPLOYMENT-GUIDE.md)
- **AWS Docs**: https://docs.aws.amazon.com/
- **Spring Boot**: https://spring.io/guides

### Getting Help

1. **Check logs**: `./deploy-ec2.sh logs`
2. **Review CloudWatch**: AWS Console > CloudWatch > Logs
3. **Test locally**: Ensure app works with `docker-compose up`
4. **GitHub Issues**: Report bugs or ask questions

### Useful AWS CLI Commands

```bash
# Check all running instances
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"

# Check RDS status
aws rds describe-db-instances

# Check Redis status
aws elasticache describe-cache-clusters

# View recent CloudWatch logs
aws logs tail /aws/ec2/fitness-app --follow

# Estimate monthly costs
aws ce get-cost-forecast \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --metric UNBLENDED_COST \
  --granularity MONTHLY
```

## Security Best Practices

1. **Rotate API keys regularly** (every 90 days)
2. **Enable MFA** on your AWS account
3. **Use AWS Secrets Manager** for production (not .env files)
4. **Enable CloudTrail** for audit logging
5. **Regular security updates**: `ssh` into EC2 and run `sudo dnf update`
6. **Restrict SSH access** to your IP only
7. **Use HTTPS** for production (not HTTP)

## Clean Up

When you're done testing:

```bash
# Stop resources to save money (keeps data)
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Delete everything (permanent)
./deploy-ec2.sh destroy

# Manually delete VPC from AWS Console
```

---

## Success Checklist

- [ ] AWS CLI configured
- [ ] API keys obtained
- [ ] .env.deploy file created
- [ ] Infrastructure deployed (`./deploy-ec2.sh setup`)
- [ ] Application deployed (`./deploy-ec2.sh deploy`)
- [ ] Health check passing
- [ ] API documentation accessible
- [ ] Mobile app connected
- [ ] Monitoring enabled

**Congratulations! Your fitness app is now running on AWS EC2!**

Need help? Check the full guide: [EC2-DEPLOYMENT-GUIDE.md](EC2-DEPLOYMENT-GUIDE.md)
