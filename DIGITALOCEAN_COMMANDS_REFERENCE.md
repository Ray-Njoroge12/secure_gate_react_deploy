# 🔧 DigitalOcean Deployment Commands
## Secure Gate Access Control System - Command Reference

**Quick Access:** Copy-paste commands for common operations  
**Platform:** DigitalOcean Droplet + Docker  
**Last Updated:** January 2025

---

## 📋 TABLE OF CONTENTS

1. [Initial Setup Commands](#initial-setup-commands)
2. [Application Deployment](#application-deployment)
3. [Container Management](#container-management)
4. [Database Operations](#database-operations)
5. [Security & Firewall](#security--firewall)
6. [Monitoring & Health](#monitoring--health)
7. [Backup & Restore](#backup--restore)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## 🚀 INITIAL SETUP COMMANDS

### SSH Key Generation (Local Mac)
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Display public key (add to DigitalOcean)
cat ~/.ssh/id_ed25519.pub

# Test SSH connection
ssh root@YOUR_DROPLET_IP
```

### System Update & Upgrade
```bash
# Update package lists
apt update

# Upgrade all packages
apt upgrade -y

# Auto-remove unused packages
apt autoremove -y

# Clean package cache
apt clean
```

### Docker Installation
```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Install Docker
sh get-docker.sh

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
docker info

# Test Docker
docker run hello-world
```

### Docker Compose Installation
```bash
# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker-compose --version

# Alternative: Install latest via pip
apt install python3-pip -y
pip3 install docker-compose
```

### Essential Tools Installation
```bash
# Install all essential tools
apt install -y \
  git \
  curl \
  wget \
  vim \
  nano \
  htop \
  net-tools \
  ufw \
  nodejs \
  npm \
  python3-pip \
  certbot \
  python3-certbot-nginx

# Verify Node.js installation
node --version
npm --version
```

---

## 📦 APPLICATION DEPLOYMENT

### Code Transfer (From Local Machine)
```bash
# Navigate to your project (on Mac)
cd ~/Desktop/secure-gate-react-express

# Create tarball (excludes node_modules and .git)
tar -czf secure-gate.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*/node_modules' \
  --exclude='.DS_Store' \
  .

# Transfer to droplet
scp secure-gate.tar.gz root@YOUR_DROPLET_IP:/root/

# Verify transfer
ssh root@YOUR_DROPLET_IP "ls -lh /root/secure-gate.tar.gz"
```

### Code Extraction (On Droplet)
```bash
# Navigate to root directory
cd /root

# Extract tarball
tar -xzf secure-gate.tar.gz

# Navigate to deployment directory
cd secure-gate-react-express/deployment

# List files
ls -la
```

### Generate Security Secrets
```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"

# Generate JWT Refresh Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"

# Generate Session Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"

# Generate all three at once
echo "JWT_SECRET:" && node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))" && \
echo "JWT_REFRESH_SECRET:" && node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))" && \
echo "SESSION_SECRET:" && node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

### Environment Configuration
```bash
# Navigate to deployment directory
cd /root/secure-gate-react-express/deployment

# Create .env.production file
nano .env.production

# Or copy from template
cp .env.example .env.production
nano .env.production

# Verify configuration
cat .env.production | grep -E "JWT_SECRET|DROPLET_IP|PGPASSWORD"

# Test environment variables
docker-compose -f docker-compose.production.yml config
```

---

## 🐳 CONTAINER MANAGEMENT

### Start Services
```bash
# Navigate to deployment directory
cd /root/secure-gate-react-express/deployment

# Start all services
docker-compose -f docker-compose.production.yml up -d

# Start specific service
docker-compose -f docker-compose.production.yml up -d backend
docker-compose -f docker-compose.production.yml up -d frontend
docker-compose -f docker-compose.production.yml up -d postgres
docker-compose -f docker-compose.production.yml up -d redis

# Start with build (rebuild images)
docker-compose -f docker-compose.production.yml up -d --build

# Start and view logs
docker-compose -f docker-compose.production.yml up
```

### Stop Services
```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Stop specific service
docker-compose -f docker-compose.production.yml stop backend

# Stop and remove volumes (⚠️ DATA LOSS!)
docker-compose -f docker-compose.production.yml down -v

# Force stop all containers
docker stop $(docker ps -aq)
```

### Restart Services
```bash
# Restart all services
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend
docker-compose -f docker-compose.production.yml restart frontend
docker-compose -f docker-compose.production.yml restart postgres
docker-compose -f docker-compose.production.yml restart redis

# Full restart (down + up)
docker-compose -f docker-compose.production.yml down && \
docker-compose -f docker-compose.production.yml up -d
```

### View Container Status
```bash
# List all containers
docker ps

# List all containers (including stopped)
docker ps -a

# Docker Compose status
docker-compose -f docker-compose.production.yml ps

# Detailed container info
docker inspect <container_name>

# Container resource usage
docker stats

# Container processes
docker top <container_name>
```

### View Logs
```bash
# View all logs
docker-compose -f docker-compose.production.yml logs

# Follow logs (real-time)
docker-compose -f docker-compose.production.yml logs -f

# View specific service logs
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs frontend
docker-compose -f docker-compose.production.yml logs postgres
docker-compose -f docker-compose.production.yml logs redis

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100

# Follow backend logs
docker-compose -f docker-compose.production.yml logs -f backend

# View logs with timestamps
docker-compose -f docker-compose.production.yml logs -f --timestamps
```

### Execute Commands in Containers
```bash
# Access backend shell
docker-compose -f docker-compose.production.yml exec backend sh

# Access PostgreSQL shell
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres

# Access Redis CLI
docker-compose -f docker-compose.production.yml exec redis redis-cli

# Run command in backend
docker-compose -f docker-compose.production.yml exec backend npm run migrate

# Run command as one-liner
docker-compose -f docker-compose.production.yml exec -T backend node -e "console.log('Hello')"
```

---

## 💾 DATABASE OPERATIONS

### PostgreSQL Access
```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres

# Connect to specific database
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d secure_gate

# Run SQL query
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -d secure_gate -c "SELECT version();"

# List databases
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -c "\l"

# List tables
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -d secure_gate -c "\dt"
```

### Database Backup
```bash
# Create backup directory
mkdir -p /root/backups

# Backup database (compressed)
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U postgres secure_gate | gzip > /root/backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup all databases
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dumpall -U postgres | gzip > /root/backups/backup_all_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup to file without compression
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U postgres secure_gate > /root/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# List backups
ls -lh /root/backups/
```

### Database Restore
```bash
# Restore from uncompressed backup
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres secure_gate < /root/backups/backup_20250115_120000.sql

# Restore from compressed backup
gunzip -c /root/backups/backup_20250115_120000.sql.gz | \
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres secure_gate

# Drop and recreate database before restore
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -c "DROP DATABASE secure_gate;"
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -c "CREATE DATABASE secure_gate;"
gunzip -c /root/backups/backup_20250115_120000.sql.gz | \
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres secure_gate
```

### Database Maintenance
```bash
# Vacuum database (cleanup)
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -d secure_gate -c "VACUUM;"

# Analyze database (update statistics)
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -d secure_gate -c "ANALYZE;"

# Reindex database
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -d secure_gate -c "REINDEX DATABASE secure_gate;"

# Check database size
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('secure_gate'));"
```

### Redis Operations
```bash
# Connect to Redis CLI
docker-compose -f docker-compose.production.yml exec redis redis-cli

# Ping Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli ping

# Get Redis info
docker-compose -f docker-compose.production.yml exec redis redis-cli info

# List all keys
docker-compose -f docker-compose.production.yml exec redis redis-cli keys '*'

# Flush all data (⚠️ CLEARS CACHE!)
docker-compose -f docker-compose.production.yml exec redis redis-cli FLUSHALL

# Flush current database only
docker-compose -f docker-compose.production.yml exec redis redis-cli FLUSHDB

# Get specific key
docker-compose -f docker-compose.production.yml exec redis redis-cli GET "your_key"
```

---

## 🔐 SECURITY & FIREWALL

### UFW Firewall Setup
```bash
# Check firewall status
ufw status

# Enable firewall
ufw enable

# Disable firewall
ufw disable

# Allow SSH (CRITICAL - do this first!)
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow application ports
ufw allow 3000/tcp  # Frontend
ufw allow 5000/tcp  # Backend

# Allow from specific IP only
ufw allow from YOUR_IP_ADDRESS to any port 22

# Delete rule
ufw delete allow 3000/tcp

# Reset firewall (⚠️ removes all rules)
ufw --force reset

# Reload firewall
ufw reload

# Show numbered rules
ufw status numbered

# Delete rule by number
ufw delete 3
```

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Stop services (needed for standalone mode)
docker-compose -f docker-compose.production.yml down

# Obtain certificate (standalone)
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Obtain certificate (with email)
certbot certonly --standalone -d your-domain.com --email your@email.com --agree-tos

# List certificates
certbot certificates

# Renew certificates
certbot renew

# Test renewal (dry run)
certbot renew --dry-run

# Auto-renew with cron
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Certificate locations
ls -la /etc/letsencrypt/live/your-domain.com/
```

### Security Hardening
```bash
# Change root password
passwd

# Create non-root user
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Disable root SSH login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
systemctl restart sshd

# Install fail2ban
apt install fail2ban -y
systemctl start fail2ban
systemctl enable fail2ban

# Check fail2ban status
fail2ban-client status
fail2ban-client status sshd
```

---

## 📊 MONITORING & HEALTH

### Health Checks
```bash
# Backend health check
curl http://localhost:5000/health
curl http://YOUR_DROPLET_IP:5000/health

# Frontend check
curl http://localhost:3000
curl http://YOUR_DROPLET_IP:3000

# Check with full headers
curl -I http://localhost:5000/health

# Check with timeout
curl --max-time 5 http://localhost:5000/health

# Check all services
curl http://localhost:5000/health && \
curl http://localhost:3000 && \
echo "All services healthy"
```

### System Monitoring
```bash
# Interactive process monitor
htop

# CPU and memory usage
top

# Disk usage
df -h
du -sh /*
du -sh /var/lib/docker

# Memory info
free -h

# System info
uname -a
hostnamectl

# Uptime
uptime

# Network connections
netstat -tulpn
ss -tulpn

# Check ports
lsof -i :3000
lsof -i :5000
```

### Docker Monitoring
```bash
# Container stats (real-time)
docker stats

# Container stats (one-shot)
docker stats --no-stream

# Specific container stats
docker stats backend frontend

# Docker disk usage
docker system df

# Detailed disk usage
docker system df -v

# Container logs size
docker ps -q | xargs docker inspect --format='{{.Name}} {{.LogPath}}' | \
xargs -n2 sh -c 'du -h "$2"' --
```

### Application Monitoring
```bash
# Backend logs (last 100 lines)
docker-compose -f docker-compose.production.yml logs --tail=100 backend

# Watch for errors
docker-compose -f docker-compose.production.yml logs -f | grep -i error

# Count errors in last hour
docker-compose -f docker-compose.production.yml logs --since=1h backend | grep -c ERROR

# Check for specific error
docker-compose -f docker-compose.production.yml logs backend | grep "connection refused"
```

### Automated Health Monitoring
```bash
# Create health check script
cat > /root/health-monitor.sh << 'EOF'
#!/bin/bash
cd /root/secure-gate-react-express/deployment

LOG_FILE="/var/log/health-check.log"

# Check backend
BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ "$BACKEND" != "200" ]; then
    echo "$(date): Backend unhealthy (${BACKEND}) - Restarting" >> $LOG_FILE
    docker-compose -f docker-compose.production.yml restart backend
fi

# Check frontend
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND" != "200" ]; then
    echo "$(date): Frontend unhealthy (${FRONTEND}) - Restarting" >> $LOG_FILE
    docker-compose -f docker-compose.production.yml restart frontend
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "$(date): High disk usage (${DISK_USAGE}%)" >> $LOG_FILE
fi

# Check memory
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3*100/$2}')
if [ "$MEM_USAGE" -gt 90 ]; then
    echo "$(date): High memory usage (${MEM_USAGE}%)" >> $LOG_FILE
fi
EOF

# Make executable
chmod +x /root/health-monitor.sh

# Test script
/root/health-monitor.sh

# Add to crontab (runs every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/health-monitor.sh") | crontab -

# View crontab
crontab -l

# View health log
tail -f /var/log/health-check.log
```

---

## 💾 BACKUP & RESTORE

### Automated Backup Script
```bash
# Create backup script
cat > /root/backup-all.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/backup.log"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "$(date): Starting backup..." >> $LOG_FILE

# Backup database
cd /root/secure-gate-react-express/deployment
docker-compose -f docker-compose.production.yml exec -T postgres \
  pg_dump -U postgres secure_gate | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup application code
tar -czf $BACKUP_DIR/code_backup_$DATE.tar.gz \
  -C /root/secure-gate-react-express \
  --exclude='node_modules' \
  --exclude='*/node_modules' \
  .

# Backup environment files
cp /root/secure-gate-react-express/deployment/.env.production \
   $BACKUP_DIR/env_backup_$DATE

# Remove backups older than 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
find $BACKUP_DIR -name "env_backup_*" -mtime +7 -delete

echo "$(date): Backup completed" >> $LOG_FILE
EOF

# Make executable
chmod +x /root/backup-all.sh

# Test backup
/root/backup-all.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-all.sh") | crontab -

# View backup log
tail -f /var/log/backup.log
```

### Manual Backups
```bash
# Quick database backup
mkdir -p /root/backups
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U postgres secure_gate | gzip > /root/backups/quick_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Quick code backup
tar -czf /root/backups/code_$(date +%Y%m%d_%H%M%S).tar.gz \
  -C /root secure-gate-react-express

# Backup to local machine (run from Mac)
scp root@YOUR_DROPLET_IP:/root/backups/*.gz ~/Desktop/droplet-backups/

# Full system backup
rsync -avz --exclude='node_modules' \
  root@YOUR_DROPLET_IP:/root/secure-gate-react-express/ \
  ~/Desktop/droplet-backup/
```

### Restore Operations
```bash
# Restore database from backup
gunzip -c /root/backups/db_backup_20250115_020000.sql.gz | \
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres secure_gate

# Restore code from backup
cd /root
tar -xzf /root/backups/code_backup_20250115_020000.tar.gz
cd /root/secure-gate-react-express/deployment
docker-compose -f docker-compose.production.yml restart

# Restore environment file
cp /root/backups/env_backup_20250115_020000 \
   /root/secure-gate-react-express/deployment/.env.production
```

---

## 🔧 TROUBLESHOOTING

### Container Issues
```bash
# Container won't start - check logs
docker-compose -f docker-compose.production.yml logs <container_name>

# Restart problematic container
docker-compose -f docker-compose.production.yml restart <container_name>

# Rebuild container
docker-compose -f docker-compose.production.yml up -d --build <container_name>

# Remove and recreate container
docker-compose -f docker-compose.production.yml stop <container_name>
docker-compose -f docker-compose.production.yml rm -f <container_name>
docker-compose -f docker-compose.production.yml up -d <container_name>

# Check container health
docker inspect --format='{{.State.Health.Status}}' <container_name>

# Enter container for debugging
docker-compose -f docker-compose.production.yml exec <container_name> sh
```

### Network Issues
```bash
# Check Docker networks
docker network ls
docker network inspect deployment_secure-gate-network

# Recreate network
docker-compose -f docker-compose.production.yml down
docker network prune -f
docker-compose -f docker-compose.production.yml up -d

# Test connectivity between containers
docker-compose -f docker-compose.production.yml exec backend ping postgres
docker-compose -f docker-compose.production.yml exec backend ping redis

# Check if ports are listening
netstat -tulpn | grep -E '3000|5000|5432|6379'
ss -tulpn | grep -E '3000|5000|5432|6379'
```

### Performance Issues
```bash
# Check resource usage
docker stats --no-stream

# Identify high CPU container
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}" | sort -k2 -hr

# Identify high memory container
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" | sort -k2 -hr

# Clear Redis cache
docker-compose -f docker-compose.production.yml exec redis redis-cli FLUSHDB

# Restart backend to clear memory
docker-compose -f docker-compose.production.yml restart backend

# Check PostgreSQL connections
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Disk Space Issues
```bash
# Check disk usage
df -h

# Find large files
du -ah / | sort -rh | head -n 20

# Clean Docker
docker system prune -af
docker volume prune -f

# Clean logs
truncate -s 0 /var/log/syslog
truncate -s 0 /var/log/kern.log
find /var/log -name "*.log" -type f -delete

# Clean old backups
find /root/backups -name "*.gz" -mtime +7 -delete

# Clean APT cache
apt clean
apt autoclean
apt autoremove -y
```

---

## 🧹 MAINTENANCE

### Regular Maintenance
```bash
# Update system (weekly)
apt update && apt upgrade -y && apt autoremove -y

# Update Docker images (monthly)
cd /root/secure-gate-react-express/deployment
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d --build

# Clean Docker (weekly)
docker system prune -f
docker image prune -af

# Vacuum database (weekly)
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U postgres -d secure_gate -c "VACUUM ANALYZE;"

# Check logs for errors (daily)
docker-compose -f docker-compose.production.yml logs --since=24h | grep -i error

# Review disk space (daily)
df -h
du -sh /var/lib/docker
```

### Emergency Recovery
```bash
# Full service restart
cd /root/secure-gate-react-express/deployment
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# Nuclear option (⚠️ DATA LOSS - volumes deleted!)
docker-compose -f docker-compose.production.yml down -v
docker system prune -af
docker volume prune -f
docker-compose -f docker-compose.production.yml up -d

# Restore from backup after nuclear option
gunzip -c /root/backups/db_backup_LATEST.sql.gz | \
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres secure_gate
```

---

## 📚 QUICK REFERENCE

### Most Used Commands
```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Navigate to deployment
cd /root/secure-gate-react-express/deployment

# Start services
docker-compose -f docker-compose.production.yml up -d

# Stop services
docker-compose -f docker-compose.production.yml down

# Restart services
docker-compose -f docker-compose.production.yml restart

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Check status
docker-compose -f docker-compose.production.yml ps

# Health check
curl http://localhost:5000/health

# Backup database
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U postgres secure_gate | gzip > /root/backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 🎯 CONCLUSION

This command reference provides all the essential commands for deploying and managing your Secure Gate Access Control System on DigitalOcean.

**For detailed explanations, see:**
- `DIGITALOCEAN_DEPLOYMENT_GUIDE.md` - Complete step-by-step guide
- `DIGITALOCEAN_QUICK_SETUP.md` - Fast track deployment
- `DIGITALOCEAN_DEPLOYMENT_ROADMAP.md` - Visual architecture and timeline

**Questions?** Refer to the comprehensive guides or DigitalOcean support!

---

**Created:** January 2025  
**Platform:** DigitalOcean Droplet + Docker  
**Purpose:** Command reference for production deployment  
**Status:** Production Ready ✅
