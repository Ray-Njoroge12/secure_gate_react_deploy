# Production Deployment Guide
# Secure Gate Access Control System

This guide provides comprehensive instructions for deploying the Secure Gate Access Control System to production using Docker Compose.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [SSL Certificate Configuration](#ssl-certificate-configuration)
4. [Deployment Process](#deployment-process)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Backup and Recovery](#backup-and-recovery)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ or CentOS 8+ (recommended)
- **CPU**: 2+ cores
- **RAM**: 4GB+ (8GB recommended)
- **Storage**: 50GB+ SSD
- **Network**: Static IP address with domain name

### Software Requirements

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **OpenSSL**: For SSL certificate generation
- **Git**: For code deployment

### Domain Configuration

Ensure your domain names are properly configured:

- `securegate.com` - Main application
- `api.securegate.com` - API endpoint
- `monitoring.securegate.com` - Monitoring dashboard (optional)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/secure-gate-access-control.git
cd secure-gate-access-control
```

### 2. Create Environment File

```bash
cp env.production.example .env.production
```

### 3. Configure Environment Variables

Edit `.env.production` with your production values:

```bash
# Database Configuration
POSTGRES_DB=secure_gate
POSTGRES_USER=secure_gate_user
POSTGRES_PASSWORD=your_very_secure_database_password

# Redis Configuration
REDIS_PASSWORD=your_very_secure_redis_password

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_minimum_32_characters
JWT_REFRESH_SECRET=your_very_secure_jwt_refresh_secret_key_minimum_32_characters

# Application URLs
FRONTEND_URL=https://securegate.com
REACT_APP_API_URL=https://api.securegate.com

# Email Configuration
SMTP_HOST=smtp.your-email-provider.com
SMTP_USER=your-email@securegate.com
SMTP_PASS=your_email_password

# Add other required variables...
```

## SSL Certificate Configuration

### Option 1: Self-Signed Certificates (Development/Testing)

```bash
./scripts/generate-ssl.sh
```

### Option 2: Let's Encrypt (Production)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d securegate.com -d www.securegate.com -d api.securegate.com

# Copy certificates
sudo cp /etc/letsencrypt/live/securegate.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/securegate.com/privkey.pem nginx/ssl/key.pem
sudo chown $(whoami):$(whoami) nginx/ssl/*.pem
```

### Option 3: Commercial SSL Certificates

1. Purchase SSL certificate from a trusted CA
2. Place certificate files in `nginx/ssl/`:
   - `cert.pem` - Certificate file
   - `key.pem` - Private key file

## Deployment Process

### 1. Full Deployment

```bash
# Run complete deployment
./scripts/deploy-prod.sh

# Or manually:
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Verify Deployment

```bash
# Check service status
./scripts/health-check.sh

# Or manually:
docker-compose -f docker-compose.prod.yml ps
curl https://securegate.com/health
```

### 3. Run Database Migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up
```

## Monitoring and Logging

### Enable Monitoring Stack

```bash
# Start monitoring services
docker-compose -f docker-compose.prod.yml --profile monitoring up -d

# Access monitoring dashboards
# Grafana: https://monitoring.securegate.com
# Prometheus: http://your-server:9090
```

### Log Management

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Export logs
docker-compose -f docker-compose.prod.yml logs > logs/application-$(date +%Y%m%d).log
```

## Backup and Recovery

### Automated Backups

```bash
# Enable backup service
docker-compose -f docker-compose.prod.yml --profile backup up -d

# Manual backup
docker-compose -f docker-compose.prod.yml exec backup node backup-manager.js create full
```

### Manual Backup

```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U secure_gate_user secure_gate > backup-$(date +%Y%m%d).sql

# Application data backup
tar -czf application-backup-$(date +%Y%m%d).tar.gz ./backups ./logs
```

### Recovery

```bash
# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U secure_gate_user secure_gate < backup-20240101.sql

# Restore application data
tar -xzf application-backup-20240101.tar.gz
```

## Security Considerations

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Docker Security

```bash
# Run containers as non-root user
# (Already configured in Dockerfiles)

# Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image secure-gate-backend:latest
```

### 3. Environment Security

- Use strong, unique passwords
- Rotate secrets regularly
- Enable audit logging
- Monitor access logs
- Use HTTPS everywhere

### 4. Database Security

```bash
# Create read-only user for monitoring
docker-compose -f docker-compose.prod.yml exec postgres psql -U secure_gate_user -d secure_gate -c "
CREATE USER monitoring_user WITH PASSWORD 'monitoring_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_user;
"
```

## Troubleshooting

### Common Issues

#### 1. Services Not Starting

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check resource usage
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

#### 2. Database Connection Issues

```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U secure_gate_user

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### 3. SSL Certificate Issues

```bash
# Verify certificate
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Check certificate expiry
openssl x509 -in nginx/ssl/cert.pem -noout -dates
```

#### 4. Memory Issues

```bash
# Check memory usage
free -h
docker stats

# Increase memory limits in docker-compose.prod.yml
```

### Health Check Commands

```bash
# Quick health check
./scripts/health-check.sh quick

# Detailed health check
./scripts/health-check.sh detailed

# Check specific component
./scripts/health-check.sh api
./scripts/health-check.sh database
./scripts/health-check.sh ssl
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor system health
- Check error logs
- Verify backups

#### Weekly
- Review security logs
- Update dependencies
- Clean old logs

#### Monthly
- Security updates
- Performance review
- Backup testing

### Update Process

```bash
# 1. Backup current deployment
./scripts/deploy-prod.sh backup

# 2. Pull latest changes
git pull origin main

# 3. Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 4. Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up

# 5. Verify deployment
./scripts/health-check.sh
```

### Scaling

```bash
# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale with load balancer
# (Configure nginx for load balancing)
```

### Performance Optimization

1. **Database Optimization**
   - Regular VACUUM and ANALYZE
   - Monitor query performance
   - Optimize indexes

2. **Caching**
   - Redis caching is enabled
   - Monitor cache hit rates
   - Tune cache policies

3. **CDN Integration**
   - Use CDN for static assets
   - Configure proper cache headers

## Support

### Getting Help

1. Check logs: `./scripts/health-check.sh logs`
2. Review documentation
3. Check GitHub issues
4. Contact support team

### Emergency Procedures

1. **Service Down**
   ```bash
   docker-compose -f docker-compose.prod.yml restart
   ```

2. **Database Issues**
   ```bash
   docker-compose -f docker-compose.prod.yml restart postgres
   ```

3. **Complete Recovery**
   ```bash
   ./scripts/deploy-prod.sh stop
   ./scripts/deploy-prod.sh
   ```

## Appendix

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React application |
| Backend | 5000 | Node.js API |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| Nginx | 80/443 | Reverse proxy |
| Grafana | 3001 | Monitoring |
| Prometheus | 9090 | Metrics |

### Environment Variables Reference

See `env.production.example` for complete list of environment variables.

### Docker Compose Profiles

- `default`: Core services (frontend, backend, database, redis, nginx)
- `backup`: Backup services
- `monitoring`: Monitoring stack (Prometheus, Grafana, Loki)

### File Structure

```
secure-gate-access/
├── docker-compose.prod.yml
├── nginx/
│   ├── nginx.prod.conf
│   └── ssl/
├── monitoring/
│   ├── prometheus.yml
│   └── loki-config.yml
├── scripts/
│   ├── deploy-prod.sh
│   ├── generate-ssl.sh
│   └── health-check.sh
└── docs/
    └── PRODUCTION_DEPLOYMENT.md
```




