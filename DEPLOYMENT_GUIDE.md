# Secure Gate Access Control System - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Production Deployment](#production-deployment)
5. [Blue-Green Deployment](#blue-green-deployment)
6. [Load Balancer Setup](#load-balancer-setup)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Overview

This guide provides comprehensive instructions for deploying the Secure Gate Access Control System in various environments, from development to production. The system supports multiple deployment strategies including Docker Compose, blue-green deployment, and load balancing.

### Deployment Options

- **Development**: Single-node Docker Compose setup
- **Staging**: Multi-node setup with load balancing
- **Production**: High-availability setup with blue-green deployment
- **Cloud**: Kubernetes deployment (optional)

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+

#### Recommended Requirements
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **OS**: Ubuntu 22.04 LTS

### Software Dependencies

#### Required Software
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (for development)
- **PostgreSQL**: 13+ (for development)
- **Redis**: 6+ (for development)

#### Optional Software
- **Nginx**: 1.18+ (for load balancing)
- **Certbot**: For SSL certificates
- **k6**: For load testing
- **Prometheus**: For monitoring
- **Grafana**: For visualization

### Network Requirements

#### Ports
- **80**: HTTP (redirects to HTTPS)
- **443**: HTTPS
- **3000**: Frontend (development)
- **5000**: Backend API
- **5432**: PostgreSQL
- **6379**: Redis
- **8080**: Load balancer (development)

#### Firewall Configuration
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SSH (if needed)
sudo ufw allow 22

# Enable firewall
sudo ufw enable
```

## Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd secure-gate-react-express
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### Required Environment Variables
```bash
# Database
PGHOST=localhost
PGPORT=5432
PGDATABASE=secure_gate
PGUSER=postgres
PGPASSWORD=your_secure_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number

# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 3. Start with Docker Compose
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Database
```bash
# Run database migrations
docker-compose exec backend npm run migrate

# Seed initial data (optional)
docker-compose exec backend npm run seed
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### 6. Create Admin User
```bash
# Create admin user
docker-compose exec backend node scripts/create-admin.js
```

## Production Deployment

### 1. Production Environment Setup

#### Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install nginx -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

#### Production Environment File
```bash
# Create production environment file
cp .env.example .env.production

# Edit production environment
nano .env.production
```

```bash
# Production Environment Variables
NODE_ENV=production
PORT=5000

# Database
PGHOST=postgres
PGPORT=5432
PGDATABASE=secure_gate_prod
PGUSER=postgres
PGPASSWORD=your_very_secure_password

# Redis
REDIS_URL=redis://redis:6379

# JWT Secrets (use strong, random secrets)
JWT_SECRET=your_production_jwt_secret
JWT_REFRESH_SECRET=your_production_refresh_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_production_email@gmail.com
SMTP_PASS=your_production_app_password

# SMS
TWILIO_ACCOUNT_SID=your_production_account_sid
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_PHONE_NUMBER=your_production_phone_number

# URLs
FRONTEND_URL=https://securegate.com
BACKEND_URL=https://api.securegate.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=your_session_secret

# Performance
DB_POOL_SIZE=20
CACHE_DEFAULT_TTL=300
SLOW_REQUEST_THRESHOLD=1000

# Load Balancer
LOAD_BALANCER_ALGORITHM=round_robin
LOAD_BALANCER_STICKY_SESSIONS=true

# Monitoring
ENABLE_PERFORMANCE_LOGGING=true
ENABLE_CACHE_METRICS=true
ENABLE_DATABASE_METRICS=true

# Backup
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key
```

### 2. Production Docker Compose

#### Create Production Compose File
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./secure-gate-access/client
      dockerfile: Dockerfile
      args:
        NGINX_CONFIG: nginx.production.conf
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://api.securegate.com
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./secure-gate-access/server
      dockerfile: Dockerfile.production
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=secure_gate_prod
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_very_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment/nginx/production.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Deploy Production

```bash
# Deploy production environment
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## Blue-Green Deployment

### 1. Blue-Green Setup

#### Create Blue Environment
```bash
# Blue environment
docker-compose -f docker-compose.blue.yml up -d
```

#### Create Green Environment
```bash
# Green environment
docker-compose -f docker-compose.green.yml up -d
```

### 2. Blue-Green Deployment Script

#### Deploy Script
```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

# Configuration
BLUE_COMPOSE_FILE="docker-compose.blue.yml"
GREEN_COMPOSE_FILE="docker-compose.green.yml"
NGINX_CONFIG="/etc/nginx/sites-available/secure-gate"
CURRENT_ENV_FILE="/tmp/current_environment"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Get current environment
get_current_env() {
    if [ -f "$CURRENT_ENV_FILE" ]; then
        cat "$CURRENT_ENV_FILE"
    else
        echo "blue"
    fi
}

# Set current environment
set_current_env() {
    echo "$1" > "$CURRENT_ENV_FILE"
}

# Deploy to environment
deploy_to_env() {
    local env=$1
    local compose_file=$2
    
    log "Deploying to $env environment..."
    
    # Stop existing services
    docker-compose -f "$compose_file" down --remove-orphans
    
    # Build and start services
    docker-compose -f "$compose_file" up -d --build
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Run health checks
    if run_health_checks "$env"; then
        log "Health checks passed for $env environment"
        return 0
    else
        log_error "Health checks failed for $env environment"
        return 1
    fi
}

# Run health checks
run_health_checks() {
    local env=$1
    local port=$([ "$env" = "blue" ] && echo "3001" || echo "3002")
    
    log "Running health checks for $env environment on port $port..."
    
    # Check frontend
    if ! curl -f "http://localhost:$port/health" > /dev/null 2>&1; then
        log_error "Frontend health check failed for $env"
        return 1
    fi
    
    # Check backend
    if ! curl -f "http://localhost:$port/api/health" > /dev/null 2>&1; then
        log_error "Backend health check failed for $env"
        return 1
    fi
    
    return 0
}

# Switch traffic to environment
switch_traffic() {
    local env=$1
    
    log "Switching traffic to $env environment..."
    
    # Update Nginx configuration
    if [ "$env" = "blue" ]; then
        sed -i 's/backend-green/backend-blue/g' "$NGINX_CONFIG"
    else
        sed -i 's/backend-blue/backend-green/g' "$NGINX_CONFIG"
    fi
    
    # Reload Nginx
    nginx -t && systemctl reload nginx
    
    # Update current environment
    set_current_env "$env"
    
    log "Traffic switched to $env environment"
}

# Main deployment function
deploy() {
    local current_env=$(get_current_env)
    local target_env=$([ "$current_env" = "blue" ] && echo "green" || echo "blue")
    
    log "Current environment: $current_env"
    log "Target environment: $target_env"
    
    # Deploy to target environment
    if deploy_to_env "$target_env" "$([ "$target_env" = "blue" ] && echo "$BLUE_COMPOSE_FILE" || echo "$GREEN_COMPOSE_FILE")"; then
        # Switch traffic to target environment
        switch_traffic "$target_env"
        
        # Stop old environment after successful switch
        log "Stopping old $current_env environment..."
        docker-compose -f "$([ "$current_env" = "blue" ] && echo "$BLUE_COMPOSE_FILE" || echo "$GREEN_COMPOSE_FILE")" down
        
        log "Deployment completed successfully!"
    else
        log_error "Deployment failed!"
        exit 1
    fi
}

# Rollback function
rollback() {
    local current_env=$(get_current_env)
    local target_env=$([ "$current_env" = "blue" ] && echo "green" || echo "blue")
    
    log "Rolling back to $target_env environment..."
    
    # Switch traffic back
    switch_traffic "$target_env"
    
    log "Rollback completed!"
}

# Main script
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    status)
        echo "Current environment: $(get_current_env)"
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status}"
        exit 1
        ;;
esac
```

#### Make Script Executable
```bash
chmod +x blue-green-deploy.sh
```

#### Run Deployment
```bash
# Deploy new version
./blue-green-deploy.sh deploy

# Rollback if needed
./blue-green-deploy.sh rollback

# Check status
./blue-green-deploy.sh status
```

## Load Balancer Setup

### 1. Nginx Configuration

#### Install Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

#### Configure Load Balancer
```bash
# Copy load balancer configuration
sudo cp deployment/nginx/load-balancer.conf /etc/nginx/sites-available/secure-gate

# Enable site
sudo ln -s /etc/nginx/sites-available/secure-gate /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Load Balancer Configuration
```nginx
# /etc/nginx/sites-available/secure-gate
upstream backend_servers {
    least_conn;
    server backend-1:5000 weight=3 max_fails=3 fail_timeout=30s;
    server backend-2:5000 weight=3 max_fails=3 fail_timeout=30s;
    server backend-3:5000 weight=2 max_fails=3 fail_timeout=30s;
    server backup-1:5000 backup;
    server backup-2:5000 backup;
}

upstream frontend_servers {
    least_conn;
    server frontend-1:3000 weight=3 max_fails=3 fail_timeout=30s;
    server frontend-2:3000 weight=3 max_fails=3 fail_timeout=30s;
    server frontend-3:3000 weight=2 max_fails=3 fail_timeout=30s;
    server backup-frontend-1:3000 backup;
    server backup-frontend-2:3000 backup;
}

server {
    listen 80;
    server_name securegate.com www.securegate.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name securegate.com www.securegate.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/secure-gate.crt;
    ssl_certificate_key /etc/nginx/ssl/secure-gate.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API Routes
    location /api/ {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend Routes
    location / {
        proxy_pass http://frontend_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Load Balancer Management

#### Start Load Balancer Services
```bash
# Start load balancer services
docker-compose -f deployment/docker-compose.production.yml up -d

# Check service status
docker-compose -f deployment/docker-compose.production.yml ps
```

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh

# Configuration
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"
HEALTH_ENDPOINT="/health"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check backend health
check_backend() {
    if curl -f "$BACKEND_URL$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Backend is unhealthy${NC}"
        return 1
    fi
}

# Check frontend health
check_frontend() {
    if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Frontend is unhealthy${NC}"
        return 1
    fi
}

# Check database health
check_database() {
    if curl -f "$BACKEND_URL/api/health/database" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Database is unhealthy${NC}"
        return 1
    fi
}

# Check cache health
check_cache() {
    if curl -f "$BACKEND_URL/api/health/cache" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Cache is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Cache is unhealthy${NC}"
        return 1
    fi
}

# Main health check
main() {
    echo "Running health checks..."
    echo "================================"
    
    local exit_code=0
    
    check_backend || exit_code=1
    check_frontend || exit_code=1
    check_database || exit_code=1
    check_cache || exit_code=1
    
    echo "================================"
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}All services are healthy${NC}"
    else
        echo -e "${RED}Some services are unhealthy${NC}"
    fi
    
    exit $exit_code
}

main "$@"
```

## SSL/TLS Configuration

### 1. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d securegate.com -d www.securegate.com

# Test certificate renewal
sudo certbot renew --dry-run

# Set up automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Self-Signed Certificate (Development)
```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate private key
sudo openssl genrsa -out /etc/nginx/ssl/secure-gate.key 2048

# Generate certificate
sudo openssl req -new -x509 -key /etc/nginx/ssl/secure-gate.key -out /etc/nginx/ssl/secure-gate.crt -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=securegate.com"

# Set permissions
sudo chmod 600 /etc/nginx/ssl/secure-gate.key
sudo chmod 644 /etc/nginx/ssl/secure-gate.crt
```

### 2. SSL Configuration

#### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name securegate.com www.securegate.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/secure-gate.crt;
    ssl_certificate_key /etc/nginx/ssl/secure-gate.key;
    
    # SSL Protocols and Ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # SSL Session Configuration
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rest of configuration...
}
```

## Monitoring Setup

### 1. Application Monitoring

#### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed

# Database health
curl http://localhost:5000/api/health/database

# Cache health
curl http://localhost:5000/api/health/cache
```

#### Performance Monitoring
```bash
# Performance metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/performance/metrics

# Cache statistics
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/performance/cache

# Load balancer status
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/load-balancer/status
```

### 2. System Monitoring

#### System Resource Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Monitor system resources
htop

# Monitor disk I/O
sudo iotop

# Monitor network usage
sudo nethogs
```

#### Log Monitoring
```bash
# Monitor application logs
tail -f /var/log/secure-gate/app.log

# Monitor Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Monitor Docker logs
docker-compose logs -f
```

### 3. Alerting Setup

#### Email Alerts
```bash
# Install mail utilities
sudo apt install mailutils -y

# Configure email alerts
echo "Subject: Secure Gate Alert" | mail -s "System Alert" admin@securegate.com
```

#### Monitoring Script
```bash
#!/bin/bash
# monitor.sh

# Configuration
ALERT_EMAIL="admin@securegate.com"
LOG_FILE="/var/log/secure-gate/monitor.log"
HEALTH_URL="http://localhost:5000/health"

# Check system health
check_health() {
    if ! curl -f "$HEALTH_URL" > /dev/null 2>&1; then
        echo "$(date): Health check failed" >> "$LOG_FILE"
        echo "Health check failed at $(date)" | mail -s "Secure Gate Alert" "$ALERT_EMAIL"
        return 1
    fi
    return 0
}

# Check disk space
check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 80 ]; then
        echo "$(date): Disk space low: ${usage}%" >> "$LOG_FILE"
        echo "Disk space is ${usage}% full" | mail -s "Secure Gate Alert" "$ALERT_EMAIL"
    fi
}

# Check memory usage
check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$usage" -gt 80 ]; then
        echo "$(date): Memory usage high: ${usage}%" >> "$LOG_FILE"
        echo "Memory usage is ${usage}%" | mail -s "Secure Gate Alert" "$ALERT_EMAIL"
    fi
}

# Main monitoring function
main() {
    check_health
    check_disk_space
    check_memory
}

main "$@"
```

#### Set up Cron Job
```bash
# Add monitoring to crontab
crontab -e

# Add: */5 * * * * /path/to/monitor.sh
```

## Backup and Recovery

### 1. Database Backup

#### Automated Backup Script
```bash
#!/bin/bash
# backup-database.sh

# Configuration
BACKUP_DIR="/backups/database"
DB_NAME="secure_gate_prod"
DB_USER="postgres"
DB_HOST="localhost"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/secure_gate_$(date +%Y%m%d_%H%M%S).sql"

# Create database backup
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Remove old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Database backup completed: $BACKUP_FILE.gz"
```

#### Redis Backup
```bash
#!/bin/bash
# backup-redis.sh

# Configuration
BACKUP_DIR="/backups/redis"
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/redis_$(date +%Y%m%d_%H%M%S).rdb"

# Create Redis backup
redis-cli --rdb "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Remove old backups
find "$BACKUP_DIR" -name "*.rdb.gz" -mtime +$RETENTION_DAYS -delete

echo "Redis backup completed: $BACKUP_FILE.gz"
```

### 2. File Backup

#### Application Files Backup
```bash
#!/bin/bash
# backup-files.sh

# Configuration
BACKUP_DIR="/backups/files"
APP_DIR="/var/lib/secure-gate"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/files_$(date +%Y%m%d_%H%M%S).tar.gz"

# Create files backup
tar -czf "$BACKUP_FILE" -C "$APP_DIR" .

# Remove old backups
find "$BACKUP_DIR" -name "files_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Files backup completed: $BACKUP_FILE"
```

### 3. Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# restore-database.sh

# Configuration
BACKUP_FILE="$1"
DB_NAME="secure_gate_prod"
DB_USER="postgres"
DB_HOST="localhost"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Stop application
docker-compose -f docker-compose.production.yml stop backend

# Drop and recreate database
psql -h "$DB_HOST" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h "$DB_HOST" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"

# Restore database
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"
else
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
fi

# Start application
docker-compose -f docker-compose.production.yml start backend

echo "Database recovery completed"
```

#### Redis Recovery
```bash
#!/bin/bash
# restore-redis.sh

# Configuration
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Stop Redis
docker-compose -f docker-compose.production.yml stop redis

# Restore Redis data
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" > /var/lib/docker/volumes/redis_data/_data/dump.rdb
else
    cp "$BACKUP_FILE" /var/lib/docker/volumes/redis_data/_data/dump.rdb
fi

# Start Redis
docker-compose -f docker-compose.production.yml start redis

echo "Redis recovery completed"
```

### 4. Automated Backup

#### Backup Cron Job
```bash
# Add backup jobs to crontab
crontab -e

# Add:
# 0 2 * * * /path/to/backup-database.sh
# 0 3 * * * /path/to/backup-redis.sh
# 0 4 * * * /path/to/backup-files.sh
```

## Troubleshooting

### 1. Common Issues

#### Application Won't Start
```bash
# Check Docker status
docker-compose ps

# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check environment variables
docker-compose exec backend env | grep -E "(PG|REDIS|JWT)"

# Restart services
docker-compose restart
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec backend psql -h postgres -U postgres -d secure_gate -c "SELECT 1;"
```

#### Redis Connection Issues
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker-compose exec backend redis-cli -h redis ping
```

#### Load Balancer Issues
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test load balancer
curl -I http://localhost/api/health
```

### 2. Performance Issues

#### Slow Response Times
```bash
# Check system resources
htop
df -h
free -h

# Check database performance
docker-compose exec postgres psql -U postgres -d secure_gate -c "SELECT * FROM pg_stat_activity;"

# Check Redis performance
docker-compose exec redis redis-cli info stats

# Check application performance
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/performance/metrics
```

#### High Memory Usage
```bash
# Check memory usage
free -h
docker stats

# Check for memory leaks
docker-compose exec backend node --inspect=0.0.0.0:9229 server.js

# Restart services
docker-compose restart
```

### 3. Security Issues

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/secure-gate.crt -text -noout

# Test SSL configuration
openssl s_client -connect securegate.com:443 -servername securegate.com

# Renew certificate
sudo certbot renew
```

#### Authentication Issues
```bash
# Check JWT configuration
docker-compose exec backend env | grep JWT

# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check user database
docker-compose exec postgres psql -U postgres -d secure_gate -c "SELECT * FROM users;"
```

### 4. Debug Commands

#### Application Debug
```bash
# Check application health
curl http://localhost:5000/health

# Check detailed health
curl http://localhost:5000/health/detailed

# Check performance metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/performance/metrics

# Check load balancer status
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/load-balancer/status
```

#### System Debug
```bash
# Check Docker containers
docker ps
docker-compose ps

# Check Docker logs
docker-compose logs -f

# Check system resources
top
htop
iostat
netstat -tulpn

# Check disk usage
df -h
du -sh /var/lib/docker/volumes/*
```

#### Network Debug
```bash
# Check port availability
netstat -tulpn | grep -E "(3000|5000|5432|6379)"

# Test connectivity
telnet localhost 5000
telnet localhost 5432
telnet localhost 6379

# Check DNS resolution
nslookup securegate.com
dig securegate.com
```

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: Secure Gate Development Team
