# 🌊 DigitalOcean Droplet Deployment Guide
## Secure Gate Access Control System - Complete Setup

**Last Updated:** October 11, 2025  
**Deployment Platform:** DigitalOcean Droplet  
**Estimated Time:** 1-2 hours  
**Monthly Cost:** $24-54  
**Difficulty:** Beginner-Friendly ⭐⭐

---

## 📋 OVERVIEW

This guide will walk you through deploying your Secure Gate Access Control System to a DigitalOcean Droplet from scratch. No prior experience required!

**What You'll Get:**
- Production-ready deployment
- Docker containerized services
- SSL/HTTPS enabled
- Automated backups
- Monitoring setup
- Domain configured (optional)

**What You'll Need:**
- DigitalOcean account
- Domain name (optional, can use IP address)
- Credit card ($24/month minimum)
- 1-2 hours of time

---

## 💰 COST BREAKDOWN

### Essential Setup (Minimum - $24/month)

```
DigitalOcean Droplet (4GB)         $24/month
──────────────────────────────────────────
TOTAL:                             $24/month

Includes:
✓ 2 vCPUs
✓ 4GB RAM
✓ 80GB SSD
✓ 4TB transfer
✓ PostgreSQL (on same droplet)
✓ Redis (on same droplet)
```

### Recommended Setup ($54/month)

```
DigitalOcean Droplet (4GB)         $24/month
Managed PostgreSQL (Basic)         $15/month
Managed Redis (Basic)              $15/month
──────────────────────────────────────────
TOTAL:                             $54/month

Benefits:
✓ Managed database backups
✓ Better performance
✓ Easier scaling
✓ Less maintenance
```

### Optional Add-ons

```
Domain Name (from Namecheap)       $10-15/year
SSL Certificate                    FREE (Let's Encrypt)
Backups (automated snapshots)      $4.80/month (20% of droplet)
```

**We'll start with the $24/month setup** and show you how to upgrade later.

---

## 🚀 PHASE 1: CREATE DIGITALOCEAN ACCOUNT & DROPLET

### Step 1.1: Sign Up for DigitalOcean (5 minutes)

1. **Go to** [DigitalOcean](https://www.digitalocean.com/)
2. **Click** "Sign Up"
3. **Enter** your email and create password
4. **Verify** your email
5. **Add** payment method (credit card)

**💡 Tip:** Use this referral link for $200 free credit (60 days):  
https://m.do.co/c/your-referral-code

---

### Step 1.2: Create SSH Key (5 minutes)

**On your Mac, open Terminal and run:**

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Press Enter to accept default location (~/.ssh/id_ed25519)
# Press Enter twice for no passphrase (or create one for security)

# Display your public key
cat ~/.ssh/id_ed25519.pub
```

**Copy the output** (starts with `ssh-ed25519 AAAA...`)

---

### Step 1.3: Add SSH Key to DigitalOcean (2 minutes)

1. **In DigitalOcean Dashboard**, click your profile (top right)
2. **Go to** "Settings" → "Security"
3. **Click** "Add SSH Key"
4. **Paste** your public key
5. **Name it** "My Mac" or "Development Machine"
6. **Click** "Add SSH Key"

---

### Step 1.4: Create Droplet (10 minutes)

1. **Click** "Create" → "Droplets"

2. **Choose Region:**
   - Select region closest to your users
   - Recommended: New York (NYC3) or San Francisco (SFO3)

3. **Choose Image:**
   - **Distribution:** Ubuntu
   - **Version:** 22.04 LTS x64

4. **Choose Size:**
   - **Droplet Type:** Basic
   - **CPU Options:** Regular
   - **Plan:** $24/mo
     - 2 vCPU
     - 4 GB RAM
     - 80 GB SSD
     - 4 TB transfer

5. **Add Storage (Optional):**
   - Skip for now (80GB is enough to start)

6. **Choose Authentication:**
   - **Select:** SSH Key
   - **Check** your SSH key from earlier

7. **Advanced Options (Optional):**
   - ☑️ Enable IPv6
   - ☑️ Enable Monitoring (FREE)
   - ☐ User data (leave blank)

8. **Finalize Details:**
   - **Hostname:** secure-gate-production
   - **Project:** Default (or create "Secure Gate")
   - **Tags:** production, secure-gate

9. **Click** "Create Droplet"

**Wait 55 seconds...** Your droplet is being created! ⏱️

---

### Step 1.5: Get Your Droplet IP (1 minute)

Once created, you'll see your droplet in the dashboard.

**Note down:**
- **Droplet IP Address** (e.g., 164.90.xxx.xxx)
- **Droplet Name** (secure-gate-production)

```bash
# Save this for later
DROPLET_IP=164.90.xxx.xxx  # Replace with your actual IP
```

---

## 🔧 PHASE 2: INITIAL SERVER SETUP

### Step 2.1: Connect to Your Droplet (2 minutes)

```bash
# SSH into your droplet (from your Mac Terminal)
ssh root@164.90.xxx.xxx  # Replace with your IP

# First time connection will ask:
# "Are you sure you want to continue connecting?"
# Type: yes
```

**You're now connected to your server!** 🎉

You should see:
```
root@secure-gate-production:~#
```

---

### Step 2.2: Update System (5 minutes)

```bash
# Update package list
apt update

# Upgrade installed packages
apt upgrade -y

# This may take 3-5 minutes
# You'll see packages being updated...
```

---

### Step 2.3: Install Docker (5 minutes)

```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Run the script
sh get-docker.sh

# Verify Docker is installed
docker --version
# Should show: Docker version 24.x.x

# Start Docker service
systemctl start docker
systemctl enable docker

# Test Docker
docker run hello-world
# Should see: "Hello from Docker!"
```

---

### Step 2.4: Install Docker Compose (3 minutes)

```bash
# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker-compose --version
# Should show: docker-compose version 1.29.x
```

---

### Step 2.5: Install Additional Tools (3 minutes)

```bash
# Install useful tools
apt install -y \
  git \
  curl \
  wget \
  vim \
  nano \
  htop \
  net-tools \
  ufw

# Verify installations
git --version
curl --version
```

---

## 📦 PHASE 3: DEPLOY YOUR APPLICATION

### Step 3.1: Clone Your Repository (5 minutes)

**Option A: If you have Git repository:**

```bash
# Navigate to home directory
cd /root

# Clone your repository
git clone https://github.com/your-username/secure-gate-react-express.git
cd secure-gate-react-express

# If private repository, you'll need to authenticate
# Use Personal Access Token (PAT) instead of password
```

**Option B: If you don't have Git repository yet:**

```bash
# On your local Mac, navigate to project
cd ~/Desktop/secure-gate-react-express

# Create a tarball
tar -czf secure-gate.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*/node_modules' \
  .

# Copy to droplet (from your Mac Terminal)
scp secure-gate.tar.gz root@164.90.xxx.xxx:/root/

# Back on droplet, extract
cd /root
tar -xzf secure-gate.tar.gz
mv secure-gate-react-express /root/ || echo "Already in place"
cd secure-gate-react-express
```

---

### Step 3.2: Generate Production Secrets (5 minutes)

```bash
# Navigate to server directory
cd /root/secure-gate-react-express/secure-gate-access/server

# Install Node.js (needed for secret generation)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x or higher

# Generate secrets (run this 3 times, save each output)
echo "JWT_SECRET:"
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"

echo "JWT_REFRESH_SECRET:"
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"

echo "SESSION_SECRET:"
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

**📝 IMPORTANT:** Copy these three secrets! You'll need them in the next step.

Example output:
```
JWT_SECRET:
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

JWT_REFRESH_SECRET:
z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4

SESSION_SECRET:
1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7
```

---

### Step 3.3: Configure Environment Variables (10 minutes)

```bash
# Navigate to deployment directory
cd /root/secure-gate-react-express/deployment

# Create production environment file
cat > .env.production << 'EOF'
# ==========================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ==========================================

# Application Environment
NODE_ENV=production
PORT=5000

# ==========================================
# Database Configuration (PostgreSQL)
# ==========================================
PGUSER=postgres
PGPASSWORD=CHANGE_ME_SecureDBPassword_2025!
PGHOST=postgres
PGPORT=5432
PGDATABASE=secure_gate

# Database Connection Pool
PGPOOL_MAX=20
PGPOOL_IDLE_TIMEOUT=30000
PGPOOL_CONN_TIMEOUT=5000

# ==========================================
# JWT Authentication & Security Secrets
# CRITICAL: Replace with your generated secrets from Step 3.2
# ==========================================
JWT_SECRET=REPLACE_WITH_YOUR_JWT_SECRET_FROM_STEP_3.2
JWT_REFRESH_SECRET=REPLACE_WITH_YOUR_JWT_REFRESH_SECRET_FROM_STEP_3.2
SESSION_SECRET=REPLACE_WITH_YOUR_SESSION_SECRET_FROM_STEP_3.2

# JWT Token Expiration (minutes)
JWT_ACCESS_EXPIRY=15
JWT_REFRESH_EXPIRY=10080

# ==========================================
# Security & Transport Configuration
# ==========================================
ENFORCE_HTTPS=false
SECURE_COOKIES=false
TRUST_PROXY=true
HSTS_MAX_AGE=63072000

# ==========================================
# Redis Cache Configuration
# ==========================================
REDIS_URL=redis://redis:6379

# ==========================================
# URLs (Update with your droplet IP)
# ==========================================
FRONTEND_URL=http://YOUR_DROPLET_IP:3000
BACKEND_URL=http://YOUR_DROPLET_IP:5000

# ==========================================
# Rate Limiting
# ==========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ==========================================
# Email Configuration (Optional - configure later)
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@yourdomain.com

# ==========================================
# SMS Configuration (Optional - configure later)
# ==========================================
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ==========================================
# Monitoring & Logging
# ==========================================
ENABLE_PERFORMANCE_LOGGING=true
ENABLE_CACHE_METRICS=true
ENABLE_DATABASE_METRICS=true
LOG_LEVEL=info

# ==========================================
# Backup Configuration
# ==========================================
BACKUP_RETENTION_DAYS=30
EOF

# Now edit the file to add your secrets
nano .env.production
```

**In the nano editor:**

1. Find `REPLACE_WITH_YOUR_JWT_SECRET_FROM_STEP_3.2`
2. Replace with your actual JWT_SECRET from Step 3.2
3. Do the same for JWT_REFRESH_SECRET and SESSION_SECRET
4. Replace `YOUR_DROPLET_IP` with your actual droplet IP (164.90.xxx.xxx)
5. Replace `CHANGE_ME_SecureDBPassword_2025!` with a strong password

**To save in nano:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

**Verify your configuration:**
```bash
# Check that secrets are set (should NOT show REPLACE_WITH)
grep -E "JWT_SECRET|DROPLET_IP" .env.production
```

---

### Step 3.4: Create Docker Compose Configuration (5 minutes)

```bash
# Create production docker-compose file
cat > docker-compose.production.yml << 'EOF'
version: '3.8'

networks:
  secure-gate-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: secure-gate-postgres
    networks:
      - secure-gate-network
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: CHANGE_ME_SecureDBPassword_2025!
      POSTGRES_DB: secure_gate
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: secure-gate-redis
    networks:
      - secure-gate-network
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ../secure-gate-access/server
      dockerfile: Dockerfile
    container_name: secure-gate-backend
    networks:
      - secure-gate-network
    env_file:
      - .env.production
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Frontend Application
  frontend:
    build:
      context: ../secure-gate-access/client
      dockerfile: Dockerfile
    container_name: secure-gate-frontend
    networks:
      - secure-gate-network
    environment:
      REACT_APP_API_URL: http://YOUR_DROPLET_IP:5000
    ports:
      - "3000:80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

# Update with your actual database password and droplet IP
sed -i "s/CHANGE_ME_SecureDBPassword_2025!/YourActualPassword/" docker-compose.production.yml
sed -i "s/YOUR_DROPLET_IP/164.90.xxx.xxx/" docker-compose.production.yml

# Or edit manually
nano docker-compose.production.yml
```

---

### Step 3.5: Build and Deploy (15-20 minutes)

```bash
# Navigate to deployment directory
cd /root/secure-gate-react-express/deployment

# Create backups directory
mkdir -p backups

# Build and start services
docker-compose -f docker-compose.production.yml up -d --build

# This will:
# 1. Build frontend Docker image (5-8 minutes)
# 2. Build backend Docker image (3-5 minutes)
# 3. Pull PostgreSQL and Redis images (2-3 minutes)
# 4. Start all services
```

**You'll see output like:**
```
Building backend...
Step 1/10 : FROM node:18-alpine AS builder
...
Successfully built abc123def456
Successfully tagged deployment_backend:latest

Building frontend...
...
Successfully built ghi789jkl012
Successfully tagged deployment_frontend:latest

Creating secure-gate-postgres ... done
Creating secure-gate-redis    ... done
Creating secure-gate-backend  ... done
Creating secure-gate-frontend ... done
```

---

### Step 3.6: Verify Deployment (5 minutes)

```bash
# Check all containers are running
docker-compose -f docker-compose.production.yml ps

# Should see 4 containers with "Up" status:
# - secure-gate-postgres   Up (healthy)
# - secure-gate-redis      Up (healthy)
# - secure-gate-backend    Up (healthy)
# - secure-gate-frontend   Up (healthy)

# Check logs
docker-compose -f docker-compose.production.yml logs backend | tail -20
docker-compose -f docker-compose.production.yml logs frontend | tail -20

# Test health endpoint
curl http://localhost:5000/health

# Should return:
# {"status":"healthy","timestamp":"...","uptime":...}
```

**If you see `{"status":"healthy"}` - SUCCESS! 🎉**

---

### Step 3.7: Initialize Database (5 minutes)

```bash
# Run database migrations (if you have them)
docker-compose -f docker-compose.production.yml exec backend npm run db:migrate

# Or initialize database manually
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d secure_gate << 'EOSQL'
-- Create tables if they don't exist
-- (Your schema will be created by the application on first run)
SELECT 'Database initialized' as status;
EOSQL

# Create admin user (if needed)
docker-compose -f docker-compose.production.yml exec backend node scripts/create-admin.js
```

---

## 🔒 PHASE 4: CONFIGURE FIREWALL & SECURITY

### Step 4.1: Configure UFW Firewall (5 minutes)

```bash
# Set up firewall rules
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow application ports (temporary, will remove after Nginx setup)
ufw allow 3000/tcp
ufw allow 5000/tcp

# Enable firewall
ufw --force enable

# Verify rules
ufw status numbered

# Should see:
# [1] 22/tcp    ALLOW IN
# [2] 80/tcp    ALLOW IN
# [3] 443/tcp   ALLOW IN
# [4] 3000/tcp  ALLOW IN
# [5] 5000/tcp  ALLOW IN
```

---

### Step 4.2: Secure SSH (5 minutes)

```bash
# Edit SSH configuration
nano /etc/ssh/sshd_config

# Find and modify these lines:
# PermitRootLogin yes → PermitRootLogin prohibit-password
# PasswordAuthentication yes → PasswordAuthentication no
# (This ensures only SSH key authentication)

# Save and exit (Ctrl+X, Y, Enter)

# Restart SSH service
systemctl restart sshd

# Test SSH still works (open new terminal, don't close current one!)
# ssh root@YOUR_DROPLET_IP
```

---

## 🌐 PHASE 5: CONFIGURE DOMAIN & SSL (Optional but Recommended)

### Step 5.1: Point Domain to Droplet (if you have a domain)

**Option A: Using DigitalOcean DNS**

1. **In DigitalOcean Dashboard**, go to "Networking"
2. **Click** "Domains"
3. **Enter** your domain (e.g., securegate.com)
4. **Add Domain**
5. **Create A Record:**
   - **Hostname:** @ (for root domain)
   - **Value:** Your Droplet IP
   - **TTL:** 3600
6. **Create A Record for www:**
   - **Hostname:** www
   - **Value:** Your Droplet IP
   - **TTL:** 3600

**Then update your domain registrar's nameservers to:**
```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

**Option B: Using Your Current DNS Provider**

Add these DNS records at your registrar (Namecheap, GoDaddy, etc.):

```
Type: A
Host: @
Value: YOUR_DROPLET_IP
TTL: 3600

Type: A
Host: www
Value: YOUR_DROPLET_IP
TTL: 3600
```

**Wait 5-60 minutes for DNS propagation.**

Test with:
```bash
# On your Mac
ping yourdomain.com
# Should show your droplet IP
```

---

### Step 5.2: Install Nginx (5 minutes)

```bash
# Install Nginx
apt install nginx -y

# Start Nginx
systemctl start nginx
systemctl enable nginx

# Check status
systemctl status nginx
# Should be "active (running)"

# Test default page
curl http://YOUR_DROPLET_IP
# Should show "Welcome to nginx!"
```

---

### Step 5.3: Configure Nginx as Reverse Proxy (10 minutes)

```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/secure-gate << 'EOF'
# Secure Gate Access Control System - Nginx Configuration

# Backend API
upstream backend {
    server localhost:5000;
}

# Frontend
upstream frontend {
    server localhost:3000;
}

# Redirect HTTP to HTTPS (will be uncommented after SSL setup)
# server {
#     listen 80;
#     server_name yourdomain.com www.yourdomain.com;
#     return 301 https://$server_name$request_uri;
# }

# HTTP Server (temporary, for initial setup)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com YOUR_DROPLET_IP;

    # Increase upload size limit
    client_max_body_size 10M;

    # Frontend - serve React app
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
EOF

# Update with your actual domain and IP
sed -i "s/yourdomain.com/YOUR_ACTUAL_DOMAIN/" /etc/nginx/sites-available/secure-gate
sed -i "s/YOUR_DROPLET_IP/164.90.xxx.xxx/" /etc/nginx/sites-available/secure-gate

# Or edit manually
nano /etc/nginx/sites-available/secure-gate
```

**In nano, replace:**
- `yourdomain.com` with your actual domain (or remove if using IP only)
- `YOUR_DROPLET_IP` with your actual IP

```bash
# Enable the site
ln -s /etc/nginx/sites-available/secure-gate /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Should see:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx
systemctl reload nginx
```

---

### Step 5.4: Install SSL Certificate with Let's Encrypt (10 minutes)

**Only do this if you have a domain name configured!**

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# 1. Enter email address
# 2. Agree to Terms of Service (Y)
# 3. Share email with EFF (optional, your choice)
# 4. Certbot will automatically configure Nginx for HTTPS

# Test certificate renewal
certbot renew --dry-run

# Set up auto-renewal (runs twice daily)
systemctl status certbot.timer
# Should be "active"
```

**Now update your environment to use HTTPS:**

```bash
# Edit .env.production
nano /root/secure-gate-react-express/deployment/.env.production

# Change these lines:
# ENFORCE_HTTPS=false → ENFORCE_HTTPS=true
# SECURE_COOKIES=false → SECURE_COOKIES=true
# FRONTEND_URL=http://... → FRONTEND_URL=https://yourdomain.com
# BACKEND_URL=http://... → BACKEND_URL=https://yourdomain.com

# Restart backend to apply changes
cd /root/secure-gate-react-express/deployment
docker-compose -f docker-compose.production.yml restart backend
```

**Now remove temporary firewall rules:**

```bash
# Remove direct access to ports 3000 and 5000
ufw delete allow 3000/tcp
ufw delete allow 5000/tcp

# Verify rules
ufw status
# Should only show: 22, 80, 443
```

---

## 📊 PHASE 6: SETUP MONITORING & BACKUPS

### Step 6.1: Daily Health Check Script (5 minutes)

```bash
# Create monitoring directory
mkdir -p /root/monitoring

# Create daily health check script
cat > /root/monitoring/daily-health-check.sh << 'EOF'
#!/bin/bash

echo "======================================"
echo "  DAILY HEALTH CHECK"
echo "  $(date)"
echo "======================================"
echo ""

# Navigate to deployment directory
cd /root/secure-gate-react-express/deployment

# 1. Check service status
echo "1. SERVICE STATUS:"
docker-compose -f docker-compose.production.yml ps
echo ""

# 2. Check health endpoints
echo "2. HEALTH ENDPOINTS:"
curl -s http://localhost:5000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5000/health
echo ""

# 3. Check error counts
echo "3. ERROR COUNT (Last 24h):"
docker-compose -f docker-compose.production.yml logs --since 24h backend 2>/dev/null | grep -i error | wc -l
echo ""

# 4. Check resource usage
echo "4. RESOURCE USAGE:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

# 5. Check database connections
echo "5. DATABASE CONNECTIONS:"
docker-compose -f docker-compose.production.yml exec -T postgres psql -U postgres -d secure_gate -c \
  "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "Database check skipped"
echo ""

# 6. Check Redis memory
echo "6. REDIS MEMORY:"
docker-compose -f docker-compose.production.yml exec -T redis redis-cli INFO MEMORY 2>/dev/null | grep used_memory_human || echo "Redis check skipped"
echo ""

# 7. Check disk space
echo "7. DISK SPACE:"
df -h / | grep -E 'Filesystem|/$'
echo ""

# 8. Last 5 errors
echo "8. RECENT ERRORS:"
docker-compose -f docker-compose.production.yml logs --tail=100 backend 2>/dev/null | grep -i error | tail -5
echo ""

echo "======================================"
echo "  Health check complete!"
echo "======================================"
EOF

# Make executable
chmod +x /root/monitoring/daily-health-check.sh

# Test it
/root/monitoring/daily-health-check.sh
```

---

### Step 6.2: Automated Database Backups (10 minutes)

```bash
# Create backup directory
mkdir -p /root/backups

# Create backup script
cat > /root/backups/backup-database.sh << 'EOF'
#!/bin/bash

# Configuration
BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/secure_gate_$TIMESTAMP.sql.gz"
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Navigate to deployment directory
cd /root/secure-gate-react-express/deployment

# Create backup
echo "Starting database backup at $(date)"
docker-compose -f docker-compose.production.yml exec -T postgres \
  pg_dump -U postgres secure_gate | gzip > $BACKUP_FILE

# Check if backup was successful
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup completed successfully: $BACKUP_FILE ($SIZE)"
else
    echo "ERROR: Backup failed!"
    exit 1
fi

# Delete old backups (keep last 7 days)
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "secure_gate_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List current backups
echo "Current backups:"
ls -lh $BACKUP_DIR/secure_gate_*.sql.gz

echo "Backup process completed at $(date)"
EOF

# Make executable
chmod +x /root/backups/backup-database.sh

# Test backup
/root/backups/backup-database.sh

# Verify backup was created
ls -lh /root/backups/
```

---

### Step 6.3: Schedule Automated Tasks (5 minutes)

```bash
# Open crontab editor
crontab -e

# Add these lines (choose option 1 for nano if asked):

# Daily health check at 8 AM
0 8 * * * /root/monitoring/daily-health-check.sh >> /var/log/health-check.log 2>&1

# Database backup at 2 AM daily
0 2 * * * /root/backups/backup-database.sh >> /var/log/backup.log 2>&1

# Weekly system update on Sunday at 3 AM
0 3 * * 0 apt update && apt upgrade -y >> /var/log/system-updates.log 2>&1

# Save and exit (Ctrl+X, Y, Enter)

# Verify cron jobs
crontab -l
```

---

### Step 6.4: Setup Log Rotation (5 minutes)

```bash
# Create logrotate configuration
cat > /etc/logrotate.d/secure-gate << 'EOF'
/var/log/health-check.log
/var/log/backup.log
/var/log/system-updates.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF

# Test logrotate
logrotate -d /etc/logrotate.d/secure-gate
```

---

## ✅ PHASE 7: VERIFICATION & TESTING

### Step 7.1: Test Your Deployment (10 minutes)

**1. Test Health Endpoints:**

```bash
# From your droplet
curl http://localhost:5000/health
curl http://localhost:3000

# From your Mac (or browser)
# Replace with your actual IP or domain
curl http://YOUR_DROPLET_IP/health
curl http://YOUR_DROPLET_IP/api/health
```

**2. Test in Browser:**

```
http://YOUR_DROPLET_IP  (or https://yourdomain.com)
```

You should see the Secure Gate login page! 🎉

**3. Test Authentication:**

```bash
# Register a new user
curl -X POST http://YOUR_DROPLET_IP/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'

# Login
curl -X POST http://YOUR_DROPLET_IP/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

**4. Check All Services:**

```bash
# Check Docker containers
docker ps

# Check Nginx
systemctl status nginx

# Check firewall
ufw status

# Check disk usage
df -h

# Check memory
free -h

# Check CPU load
uptime
```

---

### Step 7.2: Performance Test (5 minutes)

```bash
# Install Apache Bench (if not already installed)
apt install apache2-utils -y

# Run simple load test (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:5000/health

# Check results
# Look for:
# - Requests per second
# - Time per request
# - Failed requests (should be 0)
```

---

## 📋 PHASE 8: FINAL CHECKLIST

### Deployment Verification Checklist:

```
✅ Droplet created and accessible
✅ Docker and Docker Compose installed
✅ Application deployed and running
✅ All containers healthy (postgres, redis, backend, frontend)
✅ Health endpoints responding
✅ Firewall configured (ports 22, 80, 443 only)
✅ Nginx reverse proxy configured
✅ SSL certificate installed (if using domain)
✅ Database backups scheduled
✅ Monitoring scripts in place
✅ Cron jobs configured
✅ Application accessible from browser
✅ Authentication working
```

---

## 🎉 SUCCESS! YOUR APPLICATION IS LIVE!

### Access Your Application:

**Without Domain:**
```
Frontend: http://YOUR_DROPLET_IP
Backend API: http://YOUR_DROPLET_IP/api
Health: http://YOUR_DROPLET_IP/health
```

**With Domain & SSL:**
```
Frontend: https://yourdomain.com
Backend API: https://yourdomain.com/api
Health: https://yourdomain.com/health
```

---

## 📊 DAILY OPERATIONS

### Morning Routine (5 minutes):

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Run health check
/root/monitoring/daily-health-check.sh

# Check recent logs
cd /root/secure-gate-react-express/deployment
docker-compose -f docker-compose.production.yml logs --tail=50

# Check backups
ls -lh /root/backups/
```

---

### Common Management Commands:

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend

# Restart services
docker-compose -f docker-compose.production.yml restart backend
docker-compose -f docker-compose.production.yml restart frontend

# Stop all services
docker-compose -f docker-compose.production.yml stop

# Start all services
docker-compose -f docker-compose.production.yml start

# Update application (after code changes)
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build

# Check resource usage
docker stats

# Check disk space
df -h

# Backup database manually
/root/backups/backup-database.sh

# Restore database
gunzip < /root/backups/secure_gate_YYYYMMDD_HHMMSS.sql.gz | \
  docker-compose -f docker-compose.production.yml exec -T postgres psql -U postgres secure_gate
```

---

## 🆘 TROUBLESHOOTING

### Issue: Cannot connect to droplet

```bash
# Check if droplet is running in DigitalOcean dashboard
# Try ping
ping YOUR_DROPLET_IP

# Check if SSH port is open
telnet YOUR_DROPLET_IP 22

# If still can't connect, use DigitalOcean Console:
# Droplet → Access → Launch Droplet Console
```

---

### Issue: Docker containers not starting

```bash
# Check container logs
docker-compose -f docker-compose.production.yml logs

# Check specific container
docker logs secure-gate-backend
docker logs secure-gate-postgres

# Restart specific container
docker-compose -f docker-compose.production.yml restart backend

# Rebuild if needed
docker-compose -f docker-compose.production.yml up -d --build --force-recreate
```

---

### Issue: Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -af
docker volume prune -f

# Clean old backups
find /root/backups -name "*.gz" -mtime +7 -delete

# Clean logs
truncate -s 0 /var/log/health-check.log
truncate -s 0 /var/log/backup.log
```

---

### Issue: High memory usage

```bash
# Check memory
free -h

# Check which container is using memory
docker stats

# Restart backend to clear memory
docker-compose -f docker-compose.production.yml restart backend

# Clear Redis cache
docker-compose -f docker-compose.production.yml exec redis redis-cli FLUSHDB
```

---

### Issue: Application not accessible

```bash
# Check if containers are running
docker ps

# Check Nginx status
systemctl status nginx

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Test backend directly
curl http://localhost:5000/health

# Test frontend directly
curl http://localhost:3000

# Check firewall
ufw status
```

---

## 💰 COST OPTIMIZATION TIPS

1. **Enable DigitalOcean Monitoring** (FREE)
   - Helps track resource usage
   - Prevents over-provisioning

2. **Use Managed Databases Later**
   - Start with containers ($24/month)
   - Upgrade to managed when traffic grows

3. **Enable Backups Wisely**
   - Manual backups: FREE
   - Automated snapshots: $4.80/month
   - Use manual backups to start

4. **Monitor Bandwidth**
   - You get 4TB free transfer
   - Monitor usage in dashboard
   - Optimize images and assets

5. **Scale When Needed**
   - Start with $24 droplet
   - Upgrade when hitting 70% CPU consistently
   - Takes 1 minute to resize

---

## 🎓 NEXT STEPS

### Week 1:
- [ ] Monitor daily health checks
- [ ] Verify backups are running
- [ ] Test all features thoroughly
- [ ] Gather user feedback

### Week 2:
- [ ] Review performance metrics
- [ ] Optimize slow queries
- [ ] Set up email notifications
- [ ] Configure SMS (if needed)

### Month 1:
- [ ] Consider managed database
- [ ] Set up monitoring dashboard
- [ ] Plan for scaling
- [ ] Review costs

---

## 📚 HELPFUL RESOURCES

- **DigitalOcean Docs:** https://docs.digitalocean.com/
- **Docker Docs:** https://docs.docker.com/
- **Nginx Docs:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/
- **UFW Guide:** https://help.ubuntu.com/community/UFW

---

## 🎉 CONGRATULATIONS!

You've successfully deployed your Secure Gate Access Control System to DigitalOcean! 

**Your system is now:**
- ✅ Running in production
- ✅ Secured with firewall
- ✅ SSL enabled (if using domain)
- ✅ Automated backups
- ✅ Monitoring in place
- ✅ Ready for users!

**Total Cost:** $24-54/month  
**Total Time:** 1-2 hours  
**Status:** PRODUCTION READY! 🚀

---

**Guide Created:** October 11, 2025  
**Platform:** DigitalOcean Droplet  
**Estimated Setup Time:** 1-2 hours  
**Monthly Cost:** $24-54  
**Support:** See troubleshooting section or DigitalOcean support

**Need help?** Review the troubleshooting section or check the comprehensive guides in the deployment documentation.
