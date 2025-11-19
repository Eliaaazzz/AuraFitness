# AWS EC2 Deployment Guide - Camera First Fitness

**Complete guide for deploying your Spring Boot fitness app on AWS EC2**

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Cost Estimation](#cost-estimation)
4. [Phase 1: AWS Infrastructure Setup](#phase-1-aws-infrastructure-setup)
5. [Phase 2: EC2 Instance Configuration](#phase-2-ec2-instance-configuration)
6. [Phase 3: Database Setup (RDS)](#phase-3-database-setup-rds)
7. [Phase 4: Redis Setup (ElastiCache)](#phase-4-redis-setup-elasticache)
8. [Phase 5: Application Deployment](#phase-5-application-deployment)
9. [Phase 6: Domain & SSL Configuration](#phase-6-domain--ssl-configuration)
10. [Phase 7: Monitoring & Maintenance](#phase-7-monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- AWS Account with billing enabled
- AWS CLI installed and configured
- SSH client (Terminal on macOS/Linux, PuTTY on Windows)
- Your local development environment (Java 21, Gradle)

### Required Information
- **API Keys**:
  - OpenAI API Key (for AI pose analysis)
  - Spoonacular API Key (for recipes)
  - YouTube API Key (for video metadata)
- **Domain name** (optional but recommended for production)

### AWS CLI Setup
```bash
# Install AWS CLI (macOS)
brew install awscli

# Or download from: https://aws.amazon.com/cli/

# Configure credentials
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)

# Verify setup
aws sts get-caller-identity
```

---

## Architecture Overview

```
Internet
    ↓
Route 53 (DNS)
    ↓
Application Load Balancer (HTTPS)
    ↓
EC2 Instance (Spring Boot in Docker)
    ↓                    ↓
RDS PostgreSQL      ElastiCache Redis
(Private Subnet)    (Private Subnet)
```

**Security Layers**:
- VPC with public/private subnets across 2 availability zones
- Security groups restricting inbound/outbound traffic
- RDS and Redis in private subnets (no internet access)
- EC2 in public subnet with restricted SSH access
- SSL/TLS encryption for all data in transit

---

## Cost Estimation

### Monthly Costs (US East 1)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **EC2 Instance** | t3.medium (2 vCPU, 4GB RAM) | ~$30 |
| **EBS Volume** | 30GB gp3 storage | ~$3 |
| **RDS PostgreSQL** | db.t3.micro (1 vCPU, 1GB RAM, 20GB) | ~$18 |
| **ElastiCache Redis** | cache.t3.micro (1 vCPU, 0.5GB RAM) | ~$13 |
| **Application Load Balancer** | Standard ALB | ~$18 |
| **Data Transfer** | Moderate usage (10GB/month) | ~$1 |
| **Elastic IP** | 1 static IP | Free (if attached) |
| **Route 53** | Hosted zone + queries | ~$1 |
| **CloudWatch Logs** | Basic logging | ~$5 |
| **TOTAL** | | **~$90/month** |

**Cost Optimization Tips**:
- Use Reserved Instances for 1-year commitment: Save 30-40%
- Use t3.small EC2 initially: Save ~$15/month
- Enable auto-shutdown for non-production environments
- Use CloudWatch alarms to monitor costs

---

## Phase 1: AWS Infrastructure Setup

### Step 1.1: Create VPC and Subnets

```bash
# Set your AWS region
export AWS_REGION=us-east-1

# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=fitness-app-vpc}]' \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC ID: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames

# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=fitness-app-igw}]' \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

# Attach Internet Gateway to VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID

# Create Public Subnet (for EC2)
PUBLIC_SUBNET_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fitness-app-public-subnet}]' \
  --query 'Subnet.SubnetId' \
  --output text)

# Enable auto-assign public IP
aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_ID \
  --map-public-ip-on-launch

# Create Private Subnet 1 (for RDS)
PRIVATE_SUBNET_1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fitness-app-private-subnet-1}]' \
  --query 'Subnet.SubnetId' \
  --output text)

# Create Private Subnet 2 (for RDS - multi-AZ requirement)
PRIVATE_SUBNET_2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.3.0/24 \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fitness-app-private-subnet-2}]' \
  --query 'Subnet.SubnetId' \
  --output text)

# Create Route Table for Public Subnet
ROUTE_TABLE_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=fitness-app-public-rt}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Add route to Internet Gateway
aws ec2 create-route \
  --route-table-id $ROUTE_TABLE_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Associate route table with public subnet
aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_ID \
  --route-table-id $ROUTE_TABLE_ID

echo "VPC Setup Complete!"
echo "VPC ID: $VPC_ID"
echo "Public Subnet: $PUBLIC_SUBNET_ID"
echo "Private Subnet 1: $PRIVATE_SUBNET_1_ID"
echo "Private Subnet 2: $PRIVATE_SUBNET_2_ID"
```

### Step 1.2: Create Security Groups

```bash
# Security Group for EC2 (Application)
APP_SG_ID=$(aws ec2 create-security-group \
  --group-name fitness-app-ec2-sg \
  --description "Security group for Fitness App EC2 instance" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Allow SSH from your IP only (replace with your IP)
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr ${MY_IP}/32

# Allow HTTP from anywhere (for ALB)
aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS from anywhere (for ALB)
aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow app port 8080 from anywhere (temporary, will restrict to ALB later)
aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp \
  --port 8080 \
  --cidr 0.0.0.0/0

# Security Group for RDS (Database)
DB_SG_ID=$(aws ec2 create-security-group \
  --group-name fitness-app-rds-sg \
  --description "Security group for Fitness App RDS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Allow PostgreSQL from EC2 security group only
aws ec2 authorize-security-group-ingress \
  --group-id $DB_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $APP_SG_ID

# Security Group for Redis (Cache)
REDIS_SG_ID=$(aws ec2 create-security-group \
  --group-name fitness-app-redis-sg \
  --description "Security group for Fitness App Redis" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Allow Redis from EC2 security group only
aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG_ID \
  --protocol tcp \
  --port 6379 \
  --source-group $APP_SG_ID

echo "Security Groups Created:"
echo "App SG: $APP_SG_ID"
echo "DB SG: $DB_SG_ID"
echo "Redis SG: $REDIS_SG_ID"
```

### Step 1.3: Create SSH Key Pair

```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name fitness-app-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/fitness-app-key.pem

# Set correct permissions
chmod 400 ~/.ssh/fitness-app-key.pem

echo "SSH key created: ~/.ssh/fitness-app-key.pem"
```

---

## Phase 2: EC2 Instance Configuration

### Step 2.1: Launch EC2 Instance

```bash
# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023.*-x86_64" \
            "Name=state,Values=available" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text)

# Launch EC2 instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.medium \
  --key-name fitness-app-key \
  --security-group-ids $APP_SG_ID \
  --subnet-id $PUBLIC_SUBNET_ID \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=fitness-app-server}]' \
  --user-data file://ec2-user-data.sh \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "EC2 Instance Launching: $INSTANCE_ID"

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "EC2 Instance Running!"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "Connect: ssh -i ~/.ssh/fitness-app-key.pem ec2-user@$PUBLIC_IP"
```

### Step 2.2: Create EC2 User Data Script

Create a file named `ec2-user-data.sh` in the `aws/` directory:

```bash
#!/bin/bash
# EC2 User Data Script for Fitness App

set -e

# Update system
dnf update -y

# Install Docker
dnf install -y docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
dnf install -y git

# Install Java 21
dnf install -y java-21-amazon-corretto-headless

# Install PostgreSQL client (for debugging)
dnf install -y postgresql15

# Install Redis client (for debugging)
dnf install -y redis6

# Install monitoring tools
dnf install -y htop ncdu

# Create application directory
mkdir -p /opt/fitness-app
chown ec2-user:ec2-user /opt/fitness-app

# Install CloudWatch agent for monitoring
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Set timezone
timedatectl set-timezone America/New_York

echo "EC2 instance setup complete!"
```

Make it executable:
```bash
chmod +x aws/ec2-user-data.sh
```

### Step 2.3: Connect and Verify EC2

```bash
# SSH into instance
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@$PUBLIC_IP

# Once connected, verify installations:
docker --version
docker-compose --version
java -version
git --version

# Exit
exit
```

---

## Phase 3: Database Setup (RDS)

### Step 3.1: Create DB Subnet Group

```bash
# Create DB subnet group (requires 2 subnets in different AZs)
aws rds create-db-subnet-group \
  --db-subnet-group-name fitness-app-db-subnet-group \
  --db-subnet-group-description "Subnet group for Fitness App RDS" \
  --subnet-ids $PRIVATE_SUBNET_1_ID $PRIVATE_SUBNET_2_ID

echo "DB Subnet Group Created"
```

### Step 3.2: Generate Database Password

```bash
# Generate strong password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "Generated DB Password: $DB_PASSWORD"
echo "SAVE THIS PASSWORD SECURELY!"

# Or set your own
# DB_PASSWORD="YourSecurePassword123!"
```

### Step 3.3: Create RDS PostgreSQL Instance

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier fitness-app-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username fitnessadmin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $DB_SG_ID \
  --db-subnet-group-name fitness-app-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --db-name fitness_mvp \
  --storage-encrypted \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --no-publicly-accessible

echo "RDS PostgreSQL instance creating (this takes 5-10 minutes)..."

# Wait for DB to be available
aws rds wait db-instance-available --db-instance-identifier fitness-app-db

# Get DB endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier fitness-app-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS Instance Ready!"
echo "Endpoint: $DB_ENDPOINT"
echo "Username: fitnessadmin"
echo "Password: $DB_PASSWORD"
echo "Database: fitness_mvp"
```

### Step 3.4: Test Database Connection

```bash
# From your EC2 instance
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@$PUBLIC_IP

# Test connection
psql -h <DB_ENDPOINT> -U fitnessadmin -d fitness_mvp
# Enter password when prompted

# If successful, you'll see:
# fitness_mvp=>

# Run a test query
\l

# Exit
\q
exit
```

---

## Phase 4: Redis Setup (ElastiCache)

### Step 4.1: Create Redis Subnet Group

```bash
# Create ElastiCache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name fitness-app-redis-subnet-group \
  --cache-subnet-group-description "Subnet group for Fitness App Redis" \
  --subnet-ids $PRIVATE_SUBNET_1_ID $PRIVATE_SUBNET_2_ID

echo "Redis Subnet Group Created"
```

### Step 4.2: Create Redis Cluster

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id fitness-app-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name fitness-app-redis-subnet-group \
  --security-group-ids $REDIS_SG_ID \
  --preferred-maintenance-window "mon:05:00-mon:06:00" \
  --snapshot-retention-limit 5 \
  --snapshot-window "04:00-05:00"

echo "Redis cluster creating (this takes 5-10 minutes)..."

# Wait for Redis to be available
aws elasticache wait cache-cluster-available --cache-cluster-id fitness-app-redis

# Get Redis endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id fitness-app-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text)

REDIS_PORT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id fitness-app-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Port' \
  --output text)

echo "Redis Cluster Ready!"
echo "Endpoint: $REDIS_ENDPOINT:$REDIS_PORT"
```

### Step 4.3: Test Redis Connection

```bash
# From your EC2 instance
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@$PUBLIC_IP

# Test Redis connection
redis-cli -h <REDIS_ENDPOINT> -p 6379 ping
# Should return: PONG

# Test set/get
redis-cli -h <REDIS_ENDPOINT> -p 6379 SET test "Hello from Fitness App"
redis-cli -h <REDIS_ENDPOINT> -p 6379 GET test
# Should return: "Hello from Fitness App"

exit
```

---

## Phase 5: Application Deployment

### Step 5.1: Prepare Environment Variables

SSH into your EC2 instance and create the environment file:

```bash
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@$PUBLIC_IP

# Create application directory
sudo mkdir -p /opt/fitness-app
sudo chown ec2-user:ec2-user /opt/fitness-app
cd /opt/fitness-app

# Create .env file
cat > .env << 'EOF'
# Database Configuration
SPRING_DATASOURCE_URL=jdbc:postgresql://<DB_ENDPOINT>:5432/fitness_mvp
SPRING_DATASOURCE_USERNAME=fitnessadmin
SPRING_DATASOURCE_PASSWORD=<DB_PASSWORD>

# Redis Configuration
SPRING_DATA_REDIS_HOST=<REDIS_ENDPOINT>
SPRING_DATA_REDIS_PORT=6379

# API Keys
OPENAI_API_KEY=<your_openai_key>
SPOONACULAR_API_KEY=<your_spoonacular_key>
YOUTUBE_API_KEY=<your_youtube_key>

# Application Configuration
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
APP_SEED_ENABLED=true

# JWT Configuration (generate a strong secret)
JWT_SECRET=<generate_with_openssl_rand_-base64_64>
EOF

# Replace placeholders with actual values
nano .env  # or use vim
```

### Step 5.2: Build Application Locally

On your **local machine** (not EC2):

```bash
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness

# Clean build
./gradlew clean build -x test

# Verify JAR was created
ls -lh build/libs/
# Should see: backend-0.0.1-SNAPSHOT.jar
```

### Step 5.3: Transfer Application to EC2

```bash
# Create deployment package
tar -czf fitness-app-deploy.tar.gz \
  build/libs/backend-0.0.1-SNAPSHOT.jar \
  Dockerfile \
  docker-compose.yml \
  src/main/resources/application.yml

# Copy to EC2
scp -i ~/.ssh/fitness-app-key.pem \
  fitness-app-deploy.tar.gz \
  ec2-user@$PUBLIC_IP:/opt/fitness-app/

# SSH into EC2
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@$PUBLIC_IP

# Extract
cd /opt/fitness-app
tar -xzf fitness-app-deploy.tar.gz
```

### Step 5.4: Create Docker Compose File for EC2

Create `docker-compose-ec2.yml` on the EC2 instance:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: fitness-app
    ports:
      - "8080:8080"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Step 5.5: Start Application

```bash
# Build and start
docker-compose -f docker-compose-ec2.yml up -d --build

# View logs
docker-compose -f docker-compose-ec2.yml logs -f

# Wait for "Started BackendApplication"

# Test health endpoint
curl http://localhost:8080/actuator/health

# Should return: {"status":"UP"}
```

### Step 5.6: Verify Application

```bash
# Test from local machine
curl http://$PUBLIC_IP:8080/actuator/health

# Test workouts API (you'll need an API key)
curl http://$PUBLIC_IP:8080/api/v1/workouts

# Check Docker status
docker ps
docker stats
```

---

## Phase 6: Domain & SSL Configuration

### Step 6.1: Create Application Load Balancer (Optional but Recommended)

```bash
# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name fitness-app-alb \
  --subnets $PUBLIC_SUBNET_ID <add_another_public_subnet_in_different_az> \
  --security-groups $APP_SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"

# Create Target Group
TG_ARN=$(aws elbv2 create-target-group \
  --name fitness-app-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path /actuator/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Register EC2 instance with target group
aws elbv2 register-targets \
  --target-group-arn $TG_ARN \
  --targets Id=$INSTANCE_ID

# Create HTTP listener (redirect to HTTPS later)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

echo "Test ALB: http://$ALB_DNS/actuator/health"
```

### Step 6.2: Request SSL Certificate (AWS Certificate Manager)

```bash
# Replace with your domain
DOMAIN_NAME="api.yourfitnessapp.com"

# Request certificate
CERT_ARN=$(aws acm request-certificate \
  --domain-name $DOMAIN_NAME \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text)

# Get validation records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

# Add the CNAME record to your DNS (Route 53 or your domain provider)
# Wait for validation (can take 5-30 minutes)

# Check status
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.Status'
```

### Step 6.3: Add HTTPS Listener

```bash
# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

# Update HTTP listener to redirect to HTTPS
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --query 'Listeners[?Port==`80`].ListenerArn' \
  --output text)

aws elbv2 modify-listener \
  --listener-arn $HTTP_LISTENER_ARN \
  --default-actions '[{
    "Type": "redirect",
    "RedirectConfig": {
      "Protocol": "HTTPS",
      "Port": "443",
      "StatusCode": "HTTP_301"
    }
  }]'

echo "HTTPS configured! Access at: https://$DOMAIN_NAME"
```

### Step 6.4: Configure Route 53 DNS

```bash
# Create hosted zone (if you don't have one)
HOSTED_ZONE_ID=$(aws route53 create-hosted-zone \
  --name yourfitnessapp.com \
  --caller-reference $(date +%s) \
  --query 'HostedZone.Id' \
  --output text)

# Create A record pointing to ALB
cat > change-batch.json << EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "api.yourfitnessapp.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "<ALB_HOSTED_ZONE_ID>",
        "DNSName": "$ALB_DNS",
        "EvaluateTargetHealth": true
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://change-batch.json

echo "DNS configured! Wait 5-10 minutes for propagation"
```

---

## Phase 7: Monitoring & Maintenance

### Step 7.1: Setup CloudWatch Logs

```bash
# Install CloudWatch agent on EC2
ssh -i ~/.ssh/fitness-app-key.pem ec2-user@$PUBLIC_IP

# Create CloudWatch config
sudo cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/lib/docker/containers/*/*.log",
            "log_group_name": "/aws/ec2/fitness-app",
            "log_stream_name": "{instance_id}-docker",
            "timezone": "UTC"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "FitnessApp",
    "metrics_collected": {
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MemoryUtilization",
            "unit": "Percent"
          }
        ]
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DiskUtilization",
            "unit": "Percent"
          }
        ],
        "resources": [
          "*"
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

exit
```

### Step 7.2: Create CloudWatch Alarms

```bash
# CPU Utilization Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name fitness-app-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID

# Memory Utilization Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name fitness-app-high-memory \
  --alarm-description "Alert when memory exceeds 85%" \
  --metric-name MemoryUtilization \
  --namespace FitnessApp \
  --statistic Average \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Unhealthy Host Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name fitness-app-unhealthy-host \
  --alarm-description "Alert when target becomes unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2
```

### Step 7.3: Automated Backups

```bash
# RDS automated backups are already enabled (7-day retention)

# Create snapshot manually
aws rds create-db-snapshot \
  --db-instance-identifier fitness-app-db \
  --db-snapshot-identifier fitness-app-db-manual-$(date +%Y%m%d)

# Create AMI backup of EC2
aws ec2 create-image \
  --instance-id $INSTANCE_ID \
  --name "fitness-app-backup-$(date +%Y%m%d)" \
  --description "Backup of Fitness App EC2" \
  --no-reboot
```

### Step 7.4: Application Updates

Create a deployment script `update-app.sh`:

```bash
#!/bin/bash
# Save as /opt/fitness-app/update-app.sh

set -e

echo "Starting deployment..."

# Pull latest code (if using Git)
# cd /opt/fitness-app
# git pull origin main

# Or upload new JAR from local
# scp build/libs/backend-0.0.1-SNAPSHOT.jar ec2-user@$PUBLIC_IP:/opt/fitness-app/build/libs/

# Rebuild and restart
docker-compose -f docker-compose-ec2.yml down
docker-compose -f docker-compose-ec2.yml up -d --build

# Wait for health check
echo "Waiting for application to start..."
sleep 30

# Check health
if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
  echo "Deployment successful!"
else
  echo "Health check failed! Rolling back..."
  docker-compose -f docker-compose-ec2.yml logs --tail=100
  exit 1
fi
```

Make it executable:
```bash
chmod +x /opt/fitness-app/update-app.sh
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check Docker logs
docker-compose -f docker-compose-ec2.yml logs -f app

# Check if ports are listening
sudo netstat -tlnp | grep 8080

# Check environment variables
docker-compose -f docker-compose-ec2.yml exec app env | grep SPRING

# Restart application
docker-compose -f docker-compose-ec2.yml restart app
```

### Database Connection Issues

```bash
# Test from EC2
psql -h <DB_ENDPOINT> -U fitnessadmin -d fitness_mvp

# Check security group rules
aws ec2 describe-security-groups --group-ids $DB_SG_ID

# Verify RDS is in correct subnet
aws rds describe-db-instances --db-instance-identifier fitness-app-db

# Check application logs for connection errors
docker logs fitness-app 2>&1 | grep -i "database\|connection"
```

### Redis Connection Issues

```bash
# Test Redis from EC2
redis-cli -h <REDIS_ENDPOINT> ping

# Check security group
aws ec2 describe-security-groups --group-ids $REDIS_SG_ID

# Check Redis cluster status
aws elasticache describe-cache-clusters --cache-cluster-id fitness-app-redis
```

### High Costs

```bash
# Check AWS Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Stop EC2 when not in use (non-production)
aws ec2 stop-instances --instance-ids $INSTANCE_ID

# Start it again
aws ec2 start-instances --instance-ids $INSTANCE_ID
```

### Load Balancer 502 Errors

```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn $TG_ARN

# Check application health
curl http://$PUBLIC_IP:8080/actuator/health

# Review ALB access logs (if enabled)
aws s3 ls s3://your-alb-logs-bucket/

# Check security group allows ALB -> EC2 traffic
```

---

## Quick Reference Commands

### Start/Stop Application
```bash
# Start
docker-compose -f docker-compose-ec2.yml up -d

# Stop
docker-compose -f docker-compose-ec2.yml down

# Restart
docker-compose -f docker-compose-ec2.yml restart

# View logs
docker-compose -f docker-compose-ec2.yml logs -f
```

### Check Status
```bash
# Application health
curl http://localhost:8080/actuator/health

# Docker status
docker ps
docker stats

# Disk usage
df -h
du -sh /opt/fitness-app/*

# System resources
htop
free -h
```

### Database Operations
```bash
# Connect to database
psql -h <DB_ENDPOINT> -U fitnessadmin -d fitness_mvp

# Create backup
pg_dump -h <DB_ENDPOINT> -U fitnessadmin fitness_mvp > backup.sql

# Restore backup
psql -h <DB_ENDPOINT> -U fitnessadmin fitness_mvp < backup.sql
```

### Monitoring
```bash
# CloudWatch logs
aws logs tail /aws/ec2/fitness-app --follow

# Check alarms
aws cloudwatch describe-alarms --state-value ALARM

# View metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## Next Steps

1. **Configure CI/CD**: Setup GitHub Actions for automated deployments
2. **Enable Auto Scaling**: Add additional EC2 instances behind ALB
3. **Setup Monitoring Dashboard**: Create custom CloudWatch dashboard
4. **Configure Alerts**: Setup SNS topics for email/SMS alerts
5. **Implement Caching**: Add CloudFront CDN for static assets
6. **Security Hardening**: Enable AWS WAF, GuardDuty, Security Hub

---

## Support

- AWS Documentation: https://docs.aws.amazon.com/
- Spring Boot on AWS: https://spring.io/guides/gs/spring-boot-aws/
- Cost Calculator: https://calculator.aws/

---

**Deployment Complete! Your fitness app is now running on AWS EC2.**

Access your application at:
- HTTP: `http://<PUBLIC_IP>:8080`
- With ALB: `http://<ALB_DNS>`
- With domain: `https://api.yourfitnessapp.com`
