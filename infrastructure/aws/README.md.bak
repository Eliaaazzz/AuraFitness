# AWS Deployment Guide - Camera First Fitness

Complete guides for deploying your fitness app to AWS using either EC2 or ECS Fargate.

## Choose Your Deployment Method

### Option 1: AWS EC2 (Recommended for Getting Started)

**Best for:** Development, testing, small-scale production
**Monthly Cost:** ~$65
**Complexity:** Low (automated with scripts)
**Setup Time:** 30 minutes
**Scaling:** Manual

[**→ START HERE: EC2 Quick Start Guide**](EC2-QUICKSTART.md)

**What you get:**
- ✅ Automated deployment script
- ✅ VPC with public/private subnets
- ✅ RDS PostgreSQL database (encrypted)
- ✅ ElastiCache Redis cluster
- ✅ EC2 instance with Docker
- ✅ Security groups configured
- ✅ CloudWatch logging

**Perfect if you:**
- Want to get started quickly
- Need a development/staging environment
- Have a small to medium user base
- Want full control over the server
- Prefer lower initial costs

---

### Option 2: AWS ECS Fargate (Production Grade)

**Best for:** Production, auto-scaling, high availability
**Monthly Cost:** ~$90
**Complexity:** Medium (CloudFormation)
**Setup Time:** 4-6 hours
**Scaling:** Automatic

[**→ ECS Fargate Deployment Guide**](AWS-DEPLOYMENT-GUIDE.md)

**What you get:**
- ✅ Serverless containers (no server management)
- ✅ Application Load Balancer
- ✅ Auto-scaling policies
- ✅ Multi-AZ high availability
- ✅ Blue/green deployments
- ✅ CI/CD with GitHub Actions

**Perfect if you:**
- Need production-grade infrastructure
- Want automatic scaling
- Require high availability (99.9%+ uptime)
- Don't want to manage servers
- Have enterprise requirements

---

## EC2 Deployment (Quick Start)

### Prerequisites

```bash
# Install AWS CLI
brew install awscli  # macOS
# or download from: https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Output (json)

# Verify
aws sts get-caller-identity
```

### Get API Keys

You'll need these before deployment:

| Service | Get Key From | Purpose |
|---------|--------------|---------|
| **OpenAI** | https://platform.openai.com/api-keys | AI pose analysis |
| **Spoonacular** | https://spoonacular.com/food-api | Recipe data |
| **YouTube** | https://console.cloud.google.com/apis/credentials | Video metadata |

### Deploy in 3 Commands

```bash
# 1. Configure (2 minutes)
cd aws/
cp .env.deploy.example .env.deploy
nano .env.deploy  # Add your API keys

# 2. Setup Infrastructure (15 minutes)
./deploy-ec2.sh setup
# Creates: VPC, subnets, RDS, Redis, EC2
# SAVE THE CREDENTIALS displayed!

# 3. Deploy Application (10 minutes)
./deploy-ec2.sh deploy

# ✅ Done! Your app is now running on AWS
```

### Test Your Deployment

```bash
# Check health
curl http://<YOUR_EC2_IP>:8080/actuator/health

# View API docs
open http://<YOUR_EC2_IP>:8080/swagger-ui.html

# View logs
./deploy-ec2.sh logs

# SSH into server
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<YOUR_EC2_IP>
```

### Common Commands

```bash
# Update application after code changes
./deploy-ec2.sh update

# View real-time logs
./deploy-ec2.sh logs

# Destroy all resources (DANGEROUS!)
./deploy-ec2.sh destroy
```

---

## Cost Breakdown

### EC2 Deployment (~$65/month)

| Resource | Configuration | Monthly Cost |
|----------|--------------|--------------|
| EC2 Instance | t3.medium (2 vCPU, 4GB) | $30.37 |
| EBS Volume | 30GB gp3 | $2.40 |
| RDS PostgreSQL | db.t3.micro | $18.40 |
| ElastiCache Redis | cache.t3.micro | $12.96 |
| Data Transfer | ~10GB | $0.90 |
| **TOTAL** | | **~$65/month** |

**Budget Option (~$35/month):**
```bash
# In .env.deploy
INSTANCE_TYPE=t3.small
DB_INSTANCE_CLASS=db.t3.micro
REDIS_NODE_TYPE=cache.t3.micro
```

**Production Option (~$120/month):**
```bash
# In .env.deploy
INSTANCE_TYPE=t3.large
DB_INSTANCE_CLASS=db.t3.small
REDIS_NODE_TYPE=cache.t3.small
```

### ECS Fargate Deployment (~$90/month)

| Resource | Configuration | Monthly Cost |
|----------|--------------|--------------|
| ECS Fargate | 1 task (1 vCPU, 2GB) | $35.04 |
| RDS PostgreSQL | db.t3.micro | $18.40 |
| ElastiCache Redis | cache.t3.micro | $12.96 |
| Application Load Balancer | Standard | $18.00 |
| Data Transfer | ~10GB | $0.90 |
| CloudWatch Logs | Basic | $5.00 |
| **TOTAL** | | **~$90/month** |

### Save 30-40% with Reserved Instances

Purchase 1-year commitments for:
- EC2 instances
- RDS databases
- ElastiCache clusters

From AWS Console: EC2 → Reserved Instances

---

## Architecture Comparison

### EC2 Architecture
```
Internet
    ↓
EC2 Instance (Spring Boot + Docker)
    ↓                    ↓
RDS PostgreSQL      ElastiCache Redis
(Private Subnet)    (Private Subnet)
```

**Characteristics:**
- Single server (can add ALB + Auto Scaling later)
- Direct public IP access
- You manage OS and Docker
- Simple to understand and debug

### ECS Fargate Architecture
```
Internet
    ↓
Route 53 (DNS)
    ↓
Application Load Balancer (HTTPS)
    ↓
ECS Fargate Tasks (Spring Boot)
    ↓                    ↓
RDS PostgreSQL      ElastiCache Redis
(Private Subnet)    (Private Subnet)
```

**Characteristics:**
- Multiple containers behind load balancer
- Auto-scaling based on CPU/memory
- AWS manages infrastructure
- Production-grade high availability

---

## Files in This Directory

| File | Purpose |
|------|---------|
| **EC2-QUICKSTART.md** | Quick start guide for EC2 deployment (30 min) |
| **EC2-DEPLOYMENT-GUIDE.md** | Comprehensive EC2 deployment guide (all details) |
| **deploy-ec2.sh** | Automated EC2 deployment script |
| **.env.deploy.example** | Configuration template for EC2 deployment |
| **AWS-DEPLOYMENT-GUIDE.md** | Complete ECS Fargate deployment guide |
| **cloudformation-template.yaml** | Infrastructure as Code for ECS Fargate |
| **ecs-task-definition.json** | ECS Fargate task configuration |

---

## Quick Decision Guide

**Choose EC2 if:**
- ✅ You want to deploy in < 30 minutes
- ✅ Budget is < $70/month
- ✅ You're building an MVP or prototype
- ✅ You want simple deployment and debugging
- ✅ You prefer full control over the server

**Choose ECS Fargate if:**
- ✅ You need production-grade infrastructure
- ✅ You expect traffic spikes (auto-scaling)
- ✅ You want 99.9%+ uptime (multi-AZ)
- ✅ You don't want to manage servers
- ✅ You need compliance/enterprise features

**Still unsure?**
→ Start with EC2, migrate to ECS Fargate later when you need it!

---

## Migration Path: EC2 → ECS Fargate

When you outgrow EC2, migrate to ECS Fargate:

1. **Backup your data:**
   ```bash
   # Export RDS snapshot
   aws rds create-db-snapshot \
     --db-instance-identifier fitness-app-db \
     --db-snapshot-identifier fitness-app-migration
   ```

2. **Follow ECS guide:** [AWS-DEPLOYMENT-GUIDE.md](AWS-DEPLOYMENT-GUIDE.md)

3. **Point to existing RDS/Redis** (save $30/month)

4. **Destroy old EC2** when satisfied

---

## Security Best Practices

### Both Deployments

- ✅ Database in private subnet (no internet access)
- ✅ Redis encryption at rest and in transit
- ✅ API keys stored securely (environment variables)
- ✅ Security groups with least privilege
- ✅ CloudWatch logging enabled
- ✅ Automated backups (7-day retention)

### Additional for Production

- Enable AWS WAF (Web Application Firewall)
- Use AWS Secrets Manager (not .env files)
- Enable CloudTrail for audit logging
- Setup AWS GuardDuty for threat detection
- Enable MFA on AWS account
- Use IAM roles (not access keys)

---

## Monitoring & Alerts

### CloudWatch Metrics (Built-in)

**EC2:**
- CPU Utilization
- Memory Usage
- Disk Space
- Network I/O

**RDS:**
- Database Connections
- Query Performance
- Disk Usage
- Read/Write IOPS

**Redis:**
- Cache Hit Ratio
- Memory Usage
- Evicted Keys

### Setup Alerts

```bash
# CPU > 80% for 10 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name fitness-app-high-cpu \
  --metric-name CPUUtilization \
  --threshold 80

# Memory > 85%
aws cloudwatch put-metric-alarm \
  --alarm-name fitness-app-high-memory \
  --metric-name MemoryUtilization \
  --threshold 85

# Database connections > 80% of max
aws cloudwatch put-metric-alarm \
  --alarm-name fitness-app-db-connections \
  --metric-name DatabaseConnections \
  --threshold 80
```

---

## Troubleshooting

### EC2 Issues

**Application won't start:**
```bash
# View logs
./deploy-ec2.sh logs

# SSH into server
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<EC2_IP>
docker ps
docker logs fitness-app

# Check environment
docker exec fitness-app env | grep SPRING
```

**Can't connect via SSH:**
```bash
# Update security group with your current IP
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id <APP_SG_ID> \
  --protocol tcp --port 22 --cidr ${MY_IP}/32
```

**Database connection failed:**
```bash
# Test from EC2
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<EC2_IP>
psql -h <DB_ENDPOINT> -U fitnessadmin -d fitness_mvp

# Check security group allows EC2 → RDS
aws ec2 describe-security-groups --group-ids <DB_SG_ID>
```

### Cost Issues

**Unexpected high costs:**
```bash
# Check current spending
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Stop EC2 when not in use (keeps data)
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Start again
aws ec2 start-instances --instance-ids <INSTANCE_ID>
```

---

## Next Steps After Deployment

### 1. Setup Custom Domain

**Option A: Route 53**
```bash
# Buy domain in Route 53
aws route53domains register-domain --domain-name yourapp.com

# Create A record pointing to EC2 IP
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch file://dns-record.json
```

**Option B: External Domain**
- Point A record to EC2 public IP
- Update mobile app: `API_BASE_URL=http://api.yourapp.com:8080`

### 2. Enable HTTPS (Free SSL)

```bash
# SSH into EC2
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<EC2_IP>

# Install Certbot
sudo dnf install -y certbot

# Get certificate (requires domain)
sudo certbot certonly --standalone -d api.yourapp.com

# Configure nginx proxy (or update Docker Compose)
```

### 3. Setup CI/CD Pipeline

Create `.github/workflows/deploy-to-ec2.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to EC2
        run: |
          ./gradlew build
          scp build/libs/*.jar ec2-user@${{ secrets.EC2_IP }}:/opt/fitness-app/
          ssh ec2-user@${{ secrets.EC2_IP }} "cd /opt/fitness-app && docker-compose restart"
```

### 4. Configure Backups

**Automated RDS snapshots** (already enabled: 7-day retention)

**Manual backup script:**
```bash
#!/bin/bash
# backup-daily.sh

DATE=$(date +%Y%m%d)

# RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier fitness-app-db \
  --db-snapshot-identifier fitness-app-db-$DATE

# EC2 AMI
aws ec2 create-image \
  --instance-id <INSTANCE_ID> \
  --name "fitness-app-$DATE"
```

Add to cron: `0 2 * * * /path/to/backup-daily.sh`

### 5. Setup Monitoring Dashboard

Create CloudWatch dashboard:
```bash
aws cloudwatch put-dashboard \
  --dashboard-name FitnessApp \
  --dashboard-body file://cloudwatch-dashboard.json
```

---

## Support & Resources

### Documentation
- **EC2 Quick Start**: [EC2-QUICKSTART.md](EC2-QUICKSTART.md)
- **EC2 Full Guide**: [EC2-DEPLOYMENT-GUIDE.md](EC2-DEPLOYMENT-GUIDE.md)
- **ECS Guide**: [AWS-DEPLOYMENT-GUIDE.md](AWS-DEPLOYMENT-GUIDE.md)
- **AWS Official Docs**: https://docs.aws.amazon.com/

### Useful Links
- **AWS Free Tier**: https://aws.amazon.com/free/
- **Cost Calculator**: https://calculator.aws/
- **Spring Boot on AWS**: https://spring.io/guides/gs/spring-boot-aws/
- **Docker Best Practices**: https://docs.docker.com/develop/dev-best-practices/

### Getting Help

1. **Check logs**: `./deploy-ec2.sh logs`
2. **Review CloudWatch**: AWS Console → CloudWatch → Logs
3. **Test locally**: Ensure app works with `docker-compose up`
4. **AWS Support**: https://console.aws.amazon.com/support/

---

## Clean Up Resources

### Stop (keeps data, stops billing for compute)

```bash
# Stop EC2 instance
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Stop when needed again
aws ec2 start-instances --instance-ids <INSTANCE_ID>
```

### Destroy Everything (PERMANENT)

```bash
# Using script (recommended)
./deploy-ec2.sh destroy

# Or manually
aws ec2 terminate-instances --instance-ids <INSTANCE_ID>
aws rds delete-db-instance --db-instance-identifier fitness-app-db --skip-final-snapshot
aws elasticache delete-cache-cluster --cache-cluster-id fitness-app-redis
# ... then delete VPC from console
```

---

## Success Checklist

**Before Deployment:**
- [ ] AWS CLI installed and configured
- [ ] Docker installed
- [ ] API keys obtained (OpenAI, Spoonacular, YouTube)
- [ ] .env.deploy file configured

**After EC2 Setup:**
- [ ] Infrastructure created (`./deploy-ec2.sh setup`)
- [ ] Credentials saved securely
- [ ] Can SSH into EC2
- [ ] Database connection works
- [ ] Redis connection works

**After Application Deployment:**
- [ ] Application deployed (`./deploy-ec2.sh deploy`)
- [ ] Health check passing (`/actuator/health`)
- [ ] API docs accessible (`/swagger-ui.html`)
- [ ] Can create API keys
- [ ] Mobile app connects successfully

**Production Ready:**
- [ ] Custom domain configured
- [ ] HTTPS enabled
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Backups scheduled
- [ ] CI/CD pipeline setup

---

## Quick Reference

### Deployment Commands

```bash
# EC2 Deployment
./deploy-ec2.sh setup    # Create infrastructure
./deploy-ec2.sh deploy   # Deploy application
./deploy-ec2.sh update   # Update application
./deploy-ec2.sh logs     # View logs
./deploy-ec2.sh destroy  # Destroy everything

# Manual Operations
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@<EC2_IP>
docker ps
docker logs fitness-app
docker stats
```

### AWS Console Links

- **EC2 Dashboard**: https://console.aws.amazon.com/ec2/
- **RDS Dashboard**: https://console.aws.amazon.com/rds/
- **ElastiCache**: https://console.aws.amazon.com/elasticache/
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch/
- **Cost Explorer**: https://console.aws.amazon.com/cost-management/

---

**Ready to deploy? Start here:** [EC2-QUICKSTART.md](EC2-QUICKSTART.md)

**Questions?** Check the full guide: [EC2-DEPLOYMENT-GUIDE.md](EC2-DEPLOYMENT-GUIDE.md)
