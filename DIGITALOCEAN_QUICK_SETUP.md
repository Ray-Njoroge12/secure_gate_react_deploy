# 🚀 DigitalOcean Quick Setup Checklist
## Secure Gate Access Control System - Fast Track Guide

**Companion to:** `DIGITALOCEAN_DEPLOYMENT_GUIDE.md`  
**Setup Time:** 60-90 minutes  
**Cost:** $24/month (basic) or $54/month (recommended)

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Before You Start:
- [ ] DigitalOcean account created
- [ ] Payment method added
- [ ] Terminal/SSH access available
- [ ] 1-2 hours available for setup
- [ ] Project code ready locally

**Optional:**
- [ ] Domain name purchased (Namecheap, GoDaddy, etc.)
- [ ] GitHub repository set up

---

## ⚡ 30-MINUTE QUICK START

### Phase 1: Create Droplet (10 minutes)

```bash
# 1. Create SSH Key (on your Mac)
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub  # Copy this

# 2. In DigitalOcean Dashboard:
# - Add SSH key to account
# - Create → Droplets
# - Ubuntu 22.04 LTS
# - $24/month plan (4GB RAM)
# - Enable IPv6 + Monitoring
# - Select your SSH key
# - Hostname: secure-gate-production
# - Create Droplet

# 3. Note your droplet IP
DROPLET_IP=YOUR_DROPLET_IP_HERE
```

### Phase 2: Initial Setup (10 minutes)

```bash
# Connect to droplet
ssh root@$DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl start docker && systemctl enable docker

# Install dependencies
apt install -y docker-compose git curl wget vim nano htop ufw nodejs npm

# Verify installations
docker --version
docker-compose --version
node --version
```

### Phase 3: Deploy Application (10 minutes)

```bash
# Transfer your code (from your Mac in new terminal)
cd ~/Desktop/secure-gate-react-express
tar -czf secure-gate.tar.gz --exclude='node_modules' --exclude='.git' .
scp secure-gate.tar.gz root@$DROPLET_IP:/root/

# Back on droplet, extract
cd /root
tar -xzf secure-gate.tar.gz
cd secure-gate-react-express/deployment

# Generate secrets (run these 3 commands, save output)
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"  # JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"  # SESSION_SECRET
```

---

## 📝 ESSENTIAL ENVIRONMENT VARIABLES

Create `/root/secure-gate-react-express/deployment/.env.production`:

```bash
# Quick configuration template
NODE_ENV=production
PORT=5000

# Database
PGUSER=postgres
PGPASSWORD=YourSecurePassword123!
PGHOST=postgres
PGPORT=5432
PGDATABASE=secure_gate

# Secrets (from Phase 3)
JWT_SECRET=your_generated_jwt_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
SESSION_SECRET=your_generated_session_secret_here

# URLs (replace with your IP)
FRONTEND_URL=http://YOUR_DROPLET_IP:3000
BACKEND_URL=http://YOUR_DROPLET_IP:5000

# Redis
REDIS_URL=redis://redis:6379

# Security
TRUST_PROXY=true
SECURE_COOKIES=false
ENFORCE_HTTPS=false
```

**Quick edit:**
```bash
nano /root/secure-gate-react-express/deployment/.env.production
# Update: JWT secrets, passwords, and DROPLET_IP
# Ctrl+X, Y, Enter to save
```

---

## 🐳 DOCKER COMPOSE COMMANDS

```bash
# Navigate to deployment folder
cd /root/secure-gate-react-express/deployment

# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart services
docker-compose -f docker-compose.production.yml restart

# Stop all services
docker-compose -f docker-compose.production.yml down

# Full restart (with rebuild)
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

---

## 🔥 FIREWALL SETUP (5 minutes)

```bash
# Enable firewall
ufw enable

# Allow SSH (CRITICAL - do this first!)
ufw allow 22/tcp

# Allow application ports
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 3000/tcp    # Frontend
ufw allow 5000/tcp    # Backend

# Check status
ufw status

# Reload firewall
ufw reload
```

---

## 🔐 SSL SETUP (with Domain)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Stop services temporarily
docker-compose -f docker-compose.production.yml down

# Get certificate (replace your-domain.com)
certbot certonly --standalone -d your-domain.com

# Restart services
docker-compose -f docker-compose.production.yml up -d

# Update .env.production
nano /root/secure-gate-react-express/deployment/.env.production
# Change:
# FRONTEND_URL=https://your-domain.com
# BACKEND_URL=https://your-domain.com/api
# ENFORCE_HTTPS=true
# SECURE_COOKIES=true

# Restart to apply changes
docker-compose -f docker-compose.production.yml restart
```

---

## 📊 HEALTH CHECK COMMANDS

```bash
# Check all containers
docker ps

# Test backend health
curl http://localhost:5000/health

# Test frontend
curl http://localhost:3000

# Check database
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d secure_gate -c "SELECT version();"

# Check Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli ping

# View resource usage
docker stats

# System resources
htop
free -h
df -h
```

---

## 🔧 COMMON FIXES

### Container won't start:
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs frontend

# Rebuild and restart
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

### Database connection errors:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Restart database
docker-compose -f docker-compose.production.yml restart postgres
```

### Out of disk space:
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -af
docker volume prune -f

# Clean old backups
find /root/backups -mtime +7 -delete
```

### Can't access application:
```bash
# Check firewall
ufw status

# Check if ports are listening
netstat -tulpn | grep -E '3000|5000'

# Check Docker networks
docker network ls
docker network inspect deployment_secure-gate-network
```

---

## 💾 BACKUP COMMANDS

```bash
# Manual database backup
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U postgres secure_gate > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres secure_gate < backup_20250115_120000.sql

# Full system backup (to local machine)
ssh root@$DROPLET_IP "cd /root/secure-gate-react-express && tar -czf - ." > backup_full_$(date +%Y%m%d).tar.gz
```

---

## 📈 MONITORING SNIPPETS

```bash
# Create monitoring script
cat > /root/health-monitor.sh << 'EOF'
#!/bin/bash
cd /root/secure-gate-react-express/deployment

# Check backend
BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ "$BACKEND" != "200" ]; then
    echo "$(date): Backend unhealthy - Restarting" >> /var/log/health-check.log
    docker-compose -f docker-compose.production.yml restart backend
fi

# Check frontend
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND" != "200" ]; then
    echo "$(date): Frontend unhealthy - Restarting" >> /var/log/health-check.log
    docker-compose -f docker-compose.production.yml restart frontend
fi
EOF

chmod +x /root/health-monitor.sh

# Add to crontab (runs every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/health-monitor.sh") | crontab -
```

---

## 🎯 POST-DEPLOYMENT CHECKLIST

### Immediately After Deployment:
- [ ] All containers running (`docker ps`)
- [ ] Backend health check passes (`curl http://localhost:5000/health`)
- [ ] Frontend accessible (`curl http://localhost:3000`)
- [ ] Database connected (check backend logs)
- [ ] Redis connected (check backend logs)
- [ ] Firewall configured (`ufw status`)

### Within 24 Hours:
- [ ] Test user registration
- [ ] Test user login
- [ ] Test gate operations
- [ ] Verify logging is working
- [ ] Check disk space (`df -h`)
- [ ] Monitor CPU/RAM (`htop`)

### Within 1 Week:
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Test restore procedure
- [ ] Review logs for errors
- [ ] Optimize performance if needed

---

## 💰 COST BREAKDOWN

### Minimal Setup ($24/month):
```
DigitalOcean Droplet 4GB:    $24/month
Total:                       $24/month
```

### Recommended Setup ($54/month):
```
DigitalOcean Droplet 4GB:    $24/month
Managed PostgreSQL:          $15/month
Managed Redis:               $15/month
Total:                       $54/month
```

### With Optional Add-ons ($74/month):
```
DigitalOcean Droplet 4GB:    $24/month
Managed PostgreSQL:          $15/month
Managed Redis:               $15/month
Automated Backups:           $5/month
Domain (annual):             $15/year ≈ $1.25/month
Monitoring Dashboard:        $15/month (Datadog/New Relic)
Total:                       ≈$74/month
```

**Start with $24/month and scale up as needed.**

---

## 📞 QUICK REFERENCE

### SSH Access:
```bash
ssh root@YOUR_DROPLET_IP
```

### Application URLs:
```
Frontend: http://YOUR_DROPLET_IP:3000
Backend:  http://YOUR_DROPLET_IP:5000
Health:   http://YOUR_DROPLET_IP:5000/health
API Docs: http://YOUR_DROPLET_IP:5000/api-docs
```

### Important Directories:
```
Application: /root/secure-gate-react-express
Deployment:  /root/secure-gate-react-express/deployment
Backups:     /root/backups
Logs:        /var/log/
```

### Key Files:
```
Environment:     .env.production
Docker Compose:  docker-compose.production.yml
Health Monitor:  /root/health-monitor.sh
Nginx Config:    /etc/nginx/sites-available/secure-gate
```

---

## 🆘 EMERGENCY COMMANDS

```bash
# Complete restart
cd /root/secure-gate-react-express/deployment
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# Nuclear option (reset everything - data loss!)
docker-compose -f docker-compose.production.yml down -v
docker system prune -af
docker volume prune -f
docker-compose -f docker-compose.production.yml up -d

# Rollback from backup
docker-compose -f docker-compose.production.yml down
# Restore code from backup
# Restore database from backup
docker-compose -f docker-compose.production.yml up -d
```

---

## 📚 NEXT STEPS

1. **Complete Deployment:**
   - Follow this checklist step-by-step
   - Verify each phase before proceeding
   - Keep notes of any customizations

2. **Secure Your System:**
   - Change default passwords
   - Configure SSL with Let's Encrypt
   - Set up automated backups
   - Enable monitoring

3. **Optimize Performance:**
   - Monitor resource usage
   - Adjust Docker resource limits
   - Optimize database queries
   - Implement caching strategies

4. **Plan for Scale:**
   - Monitor traffic patterns
   - Plan upgrade timeline
   - Consider CDN for static assets
   - Implement load balancing (when needed)

---

## 📖 ADDITIONAL RESOURCES

- **Full Guide:** `DIGITALOCEAN_DEPLOYMENT_GUIDE.md`
- **Troubleshooting:** See full guide sections 8-9
- **Monitoring:** `POST_DEPLOYMENT_MONITORING_GUIDE.md`
- **Security:** Review firewall and SSL sections
- **Backups:** See backup automation in full guide

---

**Time to Deploy:** 60-90 minutes  
**Difficulty:** ⭐⭐ Beginner-Friendly  
**Support:** DigitalOcean Community + Documentation  

**🚀 Ready? Let's deploy!**

Start with Phase 1 and work through each section. Good luck! 🎉
