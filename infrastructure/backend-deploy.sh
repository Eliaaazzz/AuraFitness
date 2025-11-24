#!/bin/bash

# Backend Deployment Script for AWS EC2
# This script deploys the Spring Boot application

set -e

echo "========================================="
echo "Fitness App Backend Deployment"
echo "========================================="

# Configuration
APP_NAME="fitness-app"
APP_VERSION="0.0.1-SNAPSHOT"
JAR_FILE="${APP_NAME}-${APP_VERSION}.jar"
APP_DIR="/opt/fitness-app"
SERVICE_USER="fitness"
LOGS_DIR="${APP_DIR}/logs"
BACKUP_DIR="${APP_DIR}/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

echo -e "${GREEN}Step 1: Creating application directories...${NC}"
mkdir -p ${APP_DIR}
mkdir -p ${LOGS_DIR}
mkdir -p ${BACKUP_DIR}

echo -e "${GREEN}Step 2: Creating service user...${NC}"
if ! id -u ${SERVICE_USER} > /dev/null 2>&1; then
    useradd -r -s /bin/false ${SERVICE_USER}
    echo "Created user: ${SERVICE_USER}"
else
    echo "User ${SERVICE_USER} already exists"
fi

echo -e "${GREEN}Step 3: Backing up existing JAR...${NC}"
if [ -f "${APP_DIR}/${JAR_FILE}" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    cp "${APP_DIR}/${JAR_FILE}" "${BACKUP_DIR}/${JAR_FILE}.${TIMESTAMP}"
    echo "Backup created: ${BACKUP_DIR}/${JAR_FILE}.${TIMESTAMP}"
fi

echo -e "${GREEN}Step 4: Copying new JAR file...${NC}"
if [ -f "./${JAR_FILE}" ]; then
    cp "./${JAR_FILE}" "${APP_DIR}/"
    echo "JAR copied to ${APP_DIR}"
else
    echo -e "${RED}Error: JAR file not found: ./${JAR_FILE}${NC}"
    echo "Please ensure the JAR file is in the current directory"
    exit 1
fi

echo -e "${GREEN}Step 5: Setting permissions...${NC}"
chown -R ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}
chmod 755 ${APP_DIR}
chmod 644 ${APP_DIR}/${JAR_FILE}

echo -e "${GREEN}Step 6: Creating environment file...${NC}"
if [ ! -f "${APP_DIR}/.env" ]; then
    cat > ${APP_DIR}/.env <<EOF
# Spring Boot Application Configuration
SPRING_PROFILES_ACTIVE=prod

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=fitness_app
POSTGRES_USER=fitness_user
POSTGRES_PASSWORD=CHANGE_ME

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME

# JWT Configuration
JWT_SECRET=CHANGE_ME_TO_LONG_RANDOM_STRING
JWT_EXPIRATION=86400000

# OpenAI Configuration
OPENAI_API_KEY=CHANGE_ME

# YouTube API Configuration
YOUTUBE_API_KEY=CHANGE_ME

# Allowed Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Application Port
SERVER_PORT=8080

# File Upload
MAX_FILE_SIZE=10MB
MAX_REQUEST_SIZE=10MB
EOF
    echo -e "${YELLOW}Created .env file. Please edit ${APP_DIR}/.env with your configuration${NC}"
    chown ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}/.env
    chmod 600 ${APP_DIR}/.env
else
    echo ".env file already exists, skipping creation"
fi

echo -e "${GREEN}Step 7: Installing systemd service...${NC}"
cat > /etc/systemd/system/${APP_NAME}.service <<EOF
[Unit]
Description=Fitness App Spring Boot Application
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${APP_DIR}

# Load environment variables
EnvironmentFile=${APP_DIR}/.env

# Java options
Environment="JAVA_OPTS=-Xms512m -Xmx2048m -XX:+UseG1GC"

# Run the application
ExecStart=/usr/bin/java \$JAVA_OPTS -jar ${APP_DIR}/${JAR_FILE} \\
    --spring.profiles.active=\${SPRING_PROFILES_ACTIVE} \\
    --server.port=\${SERVER_PORT}

# Logging
StandardOutput=append:${LOGS_DIR}/application.log
StandardError=append:${LOGS_DIR}/error.log

# Restart policy
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}Step 8: Reloading systemd...${NC}"
systemctl daemon-reload

echo -e "${GREEN}Step 9: Enabling service...${NC}"
systemctl enable ${APP_NAME}.service

echo -e "${GREEN}Step 10: Restarting service...${NC}"
systemctl restart ${APP_NAME}.service

echo ""
echo "========================================="
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "========================================="
echo ""
echo "Service status:"
systemctl status ${APP_NAME}.service --no-pager
echo ""
echo "Useful commands:"
echo "  - Check status:  sudo systemctl status ${APP_NAME}"
echo "  - View logs:     sudo journalctl -u ${APP_NAME} -f"
echo "  - Restart:       sudo systemctl restart ${APP_NAME}"
echo "  - Stop:          sudo systemctl stop ${APP_NAME}"
echo "  - View app logs: sudo tail -f ${LOGS_DIR}/application.log"
echo ""
echo -e "${YELLOW}IMPORTANT: Edit ${APP_DIR}/.env with your configuration!${NC}"
echo ""
