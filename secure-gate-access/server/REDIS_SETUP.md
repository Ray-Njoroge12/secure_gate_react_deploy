# Redis Setup Guide for Secure Gate System

## Overview
This guide helps you set up Redis for production-ready session storage and rate limiting.

## Current Status
- ✅ **Development**: Using memory store (acceptable for development)
- ⚠️ **Production**: Requires Redis for scalability and persistence

## Redis Installation

### Windows (Development)
1. **Using Chocolatey**:
   ```powershell
   choco install redis-64
   ```

2. **Using WSL2 (Recommended)**:
   ```bash
   # In WSL2 terminal
   sudo apt update
   sudo apt install redis-server
   redis-server --daemonize yes
   ```

3. **Using Docker**:
   ```powershell
   docker run -d --name redis-secure-gate -p 6379:6379 redis:alpine
   ```

### Linux/macOS (Production)
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install redis-server

# CentOS/RHEL
sudo yum install redis

# macOS
brew install redis
```

## Configuration

### 1. Enable Redis in Environment
Update `.env` file:
```env
# Redis Configuration (Uncomment for production)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_secure_password_here
```

### 2. Production Redis Configuration
For production, create `/etc/redis/redis.conf`:
```conf
# Security
requirepass your_secure_password_here
bind 127.0.0.1
protected-mode yes

# Performance
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
```

### 3. Start Redis Service
```bash
# Linux
sudo systemctl start redis
sudo systemctl enable redis

# Docker
docker start redis-secure-gate
```

## Verification

### Test Redis Connection
Run the built-in test:
```powershell
cd secure-gate-access/server
node -e "import('./src/services/redisService.js').then(({default: Redis}) => { const redis = new Redis(); redis.initialize().then(() => console.log('✅ Redis connected')); })"
```

### Check System Status
1. Start the server: `npm start`
2. Look for: `✅ Redis connected` instead of `⚠️ Using memory store`

## Benefits of Redis

### Session Storage
- ✅ **Persistence**: Sessions survive server restarts
- ✅ **Scalability**: Share sessions across multiple server instances
- ✅ **Performance**: Faster than database session storage

### Rate Limiting
- ✅ **Accuracy**: Precise rate limiting across instances
- ✅ **Efficiency**: Lower memory usage than in-memory stores
- ✅ **Flexibility**: Advanced rate limiting algorithms

### Caching
- ✅ **Speed**: Sub-millisecond response times
- ✅ **Memory**: Efficient memory management
- ✅ **TTL**: Automatic expiration of cached data

## Troubleshooting

### Connection Issues
1. **Check Redis Status**: `redis-cli ping` should return `PONG`
2. **Check Port**: `netstat -tlnp | grep 6379`
3. **Check Logs**: `tail -f /var/log/redis/redis-server.log`

### Performance Issues
1. **Monitor Memory**: `redis-cli info memory`
2. **Check Slow Queries**: `redis-cli slowlog get 10`
3. **Monitor Connections**: `redis-cli info clients`

## Security Considerations

### Production Security
1. **Authentication**: Always use `requirepass`
2. **Network**: Bind to specific interfaces only
3. **Firewall**: Block Redis port (6379) from external access
4. **Encryption**: Use TLS for Redis connections in production

### Example Secure Configuration
```env
# Production Redis with TLS
REDIS_URL=rediss://username:password@your-redis-host:6380
REDIS_TLS=true
REDIS_CA_CERT_PATH=/path/to/ca-cert.pem
```

## Monitoring

### Built-in Monitoring
The system includes Redis monitoring:
- Connection status
- Performance metrics
- Error tracking
- Automatic fallback to memory store

### External Monitoring
Consider using:
- Redis Insight (GUI)
- Prometheus + Grafana
- CloudWatch (AWS)
- Azure Monitor

## Migration from Memory Store

### Zero-Downtime Migration
1. Install and configure Redis
2. Update `.env` with Redis settings
3. Restart server
4. Verify `✅ Redis connected` in logs
5. Monitor for any issues

### Rollback Plan
If issues occur:
1. Comment out Redis settings in `.env`
2. Restart server
3. System automatically falls back to memory store

## Support

For issues:
1. Check server logs: `secure-gate-access/server/logs/`
2. Test Redis connection: `redis-cli ping`
3. Review this guide
4. Check Redis documentation: https://redis.io/docs
