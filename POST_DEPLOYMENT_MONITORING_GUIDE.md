# 🔍 POST-DEPLOYMENT MONITORING & FIXES GUIDE
## Real-Time Issue Detection and Resolution

**Last Updated:** October 9, 2025  
**Purpose:** Monitor production system health and resolve issues quickly

---

## 📊 DAILY MONITORING DASHBOARD

### Quick Health Check (Run Every Morning)

```bash
#!/bin/bash
# save as: daily-health-check.sh

echo "======================================"
echo "  DAILY HEALTH CHECK"
echo "  $(date)"
echo "======================================"
echo ""

# 1. Check service status
echo "1. SERVICE STATUS:"
docker-compose ps

echo ""
echo "2. HEALTH ENDPOINTS:"
curl -s http://localhost:5000/health | jq
echo ""

# 3. Check error counts
echo "3. ERROR COUNT (Last 24h):"
docker-compose logs --since 24h backend | grep -i error | wc -l
echo ""

# 4. Check resource usage
echo "4. RESOURCE USAGE:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

# 5. Check database connections
echo "5. DATABASE CONNECTIONS:"
docker-compose exec -T postgres psql -U postgres -d secure_gate -c \
  "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"
echo ""

# 6. Check Redis memory
echo "6. REDIS MEMORY:"
docker-compose exec -T redis redis-cli INFO MEMORY | grep used_memory_human
echo ""

# 7. Check disk space
echo "7. DISK SPACE:"
df -h | grep -E 'Filesystem|/$'
echo ""

# 8. Last 5 errors
echo "8. RECENT ERRORS:"
docker-compose logs --tail=100 backend | grep -i error | tail -5
echo ""

echo "======================================"
echo "  Health check complete!"
echo "======================================"
```

**Make it executable and run:**
```bash
chmod +x daily-health-check.sh
./daily-health-check.sh
```

---

## 🚨 REAL-TIME MONITORING

### Live Log Monitoring

```bash
# Monitor all services
docker-compose logs -f

# Monitor backend only
docker-compose logs -f backend

# Monitor with error filtering
docker-compose logs -f backend | grep -i error

# Monitor with performance filtering
docker-compose logs -f backend | grep -E "slow|performance|timeout"
```

### Resource Monitoring

```bash
# Real-time resource usage
watch -n 5 'docker stats --no-stream'

# CPU usage alert
while true; do
  CPU=$(docker stats --no-stream --format "{{.CPUPerc}}" secure-gate-backend | tr -d '%')
  if (( $(echo "$CPU > 80" | bc -l) )); then
    echo "⚠️  HIGH CPU ALERT: $CPU%" | mail -s "CPU Alert" admin@example.com
  fi
  sleep 300
done
```

### Database Monitoring

```bash
# Active queries
docker-compose exec postgres psql -U postgres -d secure_gate -c "
SELECT pid, usename, state, query, now() - query_start as duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
"

# Database size
docker-compose exec postgres psql -U postgres -d secure_gate -c "
SELECT pg_size_pretty(pg_database_size('secure_gate')) as size;
"

# Table sizes
docker-compose exec postgres psql -U postgres -d secure_gate -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Slow queries
docker-compose exec postgres psql -U postgres -d secure_gate -c "
SELECT query, calls, total_time, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

### Redis Monitoring

```bash
# Redis stats
docker-compose exec redis redis-cli INFO

# Redis memory usage
docker-compose exec redis redis-cli INFO MEMORY

# Redis key count
docker-compose exec redis redis-cli DBSIZE

# Redis slow log
docker-compose exec redis redis-cli SLOWLOG GET 10

# Most used keys
docker-compose exec redis redis-cli --bigkeys

# Monitor operations in real-time
docker-compose exec redis redis-cli MONITOR
```

---

## 🔧 COMMON ISSUES & AUTOMATED FIXES

### Issue 1: High Memory Usage

**Detection:**
```bash
# Check memory usage
MEM=$(docker stats --no-stream --format "{{.MemPerc}}" secure-gate-backend | tr -d '%')
if (( $(echo "$MEM > 85" | bc -l) )); then
  echo "⚠️  HIGH MEMORY: $MEM%"
fi
```

**Automated Fix:**
```bash
#!/bin/bash
# save as: fix-high-memory.sh

echo "Detecting high memory usage..."

# Check memory
MEM=$(docker stats --no-stream --format "{{.MemPerc}}" secure-gate-backend | tr -d '%' | cut -d. -f1)

if [ "$MEM" -gt 85 ]; then
  echo "⚠️  Memory at $MEM%, triggering cleanup..."
  
  # Clear Redis cache
  docker-compose exec redis redis-cli FLUSHDB
  echo "✓ Redis cache cleared"
  
  # Restart backend (graceful)
  docker-compose restart backend
  echo "✓ Backend restarted"
  
  # Wait for health check
  sleep 30
  curl -s http://localhost:5000/health | jq
  
  echo "✓ Memory fix complete"
else
  echo "✓ Memory usage normal ($MEM%)"
fi
```

---

### Issue 2: Database Connection Pool Exhausted

**Detection:**
```bash
# Check active connections
CONNS=$(docker-compose exec -T postgres psql -U postgres -d secure_gate -t -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='secure_gate';")

echo "Active connections: $CONNS"
if [ "$CONNS" -gt 18 ]; then
  echo "⚠️  Connection pool near limit!"
fi
```

**Automated Fix:**
```bash
#!/bin/bash
# save as: fix-db-connections.sh

echo "Checking database connections..."

CONNS=$(docker-compose exec -T postgres psql -U postgres -d secure_gate -t -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='secure_gate';" | tr -d ' ')

echo "Current connections: $CONNS/20"

if [ "$CONNS" -gt 18 ]; then
  echo "⚠️  High connection count, investigating..."
  
  # Show idle connections
  docker-compose exec postgres psql -U postgres -d secure_gate -c "
  SELECT pid, usename, state, state_change, now() - state_change as idle_time
  FROM pg_stat_activity
  WHERE state = 'idle' AND datname='secure_gate'
  ORDER BY idle_time DESC;
  "
  
  # Kill idle connections older than 5 minutes
  docker-compose exec postgres psql -U postgres -d secure_gate -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
    AND datname='secure_gate'
    AND now() - state_change > interval '5 minutes';
  "
  
  echo "✓ Idle connections cleaned"
  
  # Restart backend to reset pool
  docker-compose restart backend
  echo "✓ Backend connection pool reset"
fi
```

---

### Issue 3: Redis Memory Full

**Detection:**
```bash
# Check Redis memory
docker-compose exec redis redis-cli INFO MEMORY | grep used_memory_human
docker-compose exec redis redis-cli INFO MEMORY | grep maxmemory_human
```

**Automated Fix:**
```bash
#!/bin/bash
# save as: fix-redis-memory.sh

echo "Checking Redis memory..."

USED=$(docker-compose exec redis redis-cli INFO MEMORY | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
MAX=$(docker-compose exec redis redis-cli CONFIG GET maxmemory | tail -1 | tr -d '\r')

echo "Used: $USED bytes"
echo "Max: $MAX bytes"

if [ "$MAX" != "0" ] && [ "$USED" -gt $((MAX * 90 / 100)) ]; then
  echo "⚠️  Redis memory at 90%, clearing old keys..."
  
  # Clear keys older than 1 hour
  docker-compose exec redis redis-cli --scan --pattern "cache:*" | \
    xargs -L 1 docker-compose exec redis redis-cli TTL | \
    awk '$1 > 3600 {print $1}' | \
    xargs docker-compose exec redis redis-cli DEL
  
  echo "✓ Old cache keys cleared"
  
  # Check memory again
  USED_AFTER=$(docker-compose exec redis redis-cli INFO MEMORY | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
  echo "✓ Memory after cleanup: $USED_AFTER bytes"
fi
```

---

### Issue 4: Disk Space Low

**Detection:**
```bash
# Check disk space
DISK=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
echo "Disk usage: $DISK%"
```

**Automated Fix:**
```bash
#!/bin/bash
# save as: fix-disk-space.sh

echo "Checking disk space..."

DISK=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
echo "Disk usage: $DISK%"

if [ "$DISK" -gt 80 ]; then
  echo "⚠️  Disk space at $DISK%, cleaning up..."
  
  # Clean Docker
  echo "Cleaning Docker..."
  docker system prune -f
  docker image prune -a -f
  docker volume prune -f
  
  # Clean logs
  echo "Rotating logs..."
  find /var/log -name "*.log" -mtime +7 -delete
  
  # Clean old backups
  echo "Cleaning old backups..."
  find /root/backups -name "*.sql.gz" -mtime +30 -delete
  
  # Check again
  DISK_AFTER=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
  echo "✓ Disk space after cleanup: $DISK_AFTER%"
  
  FREED=$((DISK - DISK_AFTER))
  echo "✓ Freed: $FREED%"
fi
```

---

### Issue 5: Slow Response Times

**Detection:**
```bash
# Test response time
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:5000/health)
echo "Response time: $RESPONSE_TIME seconds"

if (( $(echo "$RESPONSE_TIME > 1.0" | bc -l) )); then
  echo "⚠️  Slow response detected!"
fi
```

**Automated Fix:**
```bash
#!/bin/bash
# save as: fix-slow-response.sh

echo "Testing response times..."

# Test health endpoint
HEALTH_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:5000/health)
echo "Health endpoint: $HEALTH_TIME seconds"

# Test API endpoint
API_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:5000/api/health)
echo "API endpoint: $API_TIME seconds"

if (( $(echo "$HEALTH_TIME > 1.0" | bc -l) )) || (( $(echo "$API_TIME > 1.0" | bc -l) )); then
  echo "⚠️  Slow response detected, optimizing..."
  
  # Check database query performance
  echo "Analyzing database queries..."
  docker-compose exec postgres psql -U postgres -d secure_gate -c "
  SELECT query, calls, mean_time, max_time
  FROM pg_stat_statements
  WHERE mean_time > 100
  ORDER BY mean_time DESC
  LIMIT 5;
  "
  
  # Optimize database
  echo "Running VACUUM ANALYZE..."
  docker-compose exec postgres psql -U postgres -d secure_gate -c "VACUUM ANALYZE;"
  
  # Clear and warm up cache
  echo "Warming up Redis cache..."
  docker-compose exec redis redis-cli FLUSHDB
  
  # Restart backend
  docker-compose restart backend
  
  # Wait and test again
  sleep 30
  HEALTH_TIME_AFTER=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:5000/health)
  echo "✓ Response time after optimization: $HEALTH_TIME_AFTER seconds"
fi
```

---

## 🤖 AUTOMATED MONITORING SCRIPT

### Complete Auto-Healing Script

```bash
#!/bin/bash
# save as: auto-heal.sh
# Run with cron: */15 * * * * /root/auto-heal.sh >> /var/log/auto-heal.log 2>&1

echo "======================================"
echo "AUTO-HEAL CHECK - $(date)"
echo "======================================"

# 1. Check if services are running
echo "Checking services..."
if ! docker-compose ps | grep -q "Up"; then
  echo "⚠️  Services down, restarting..."
  docker-compose up -d
  sleep 30
fi

# 2. Check health endpoint
echo "Checking health endpoint..."
if ! curl -f -s http://localhost:5000/health > /dev/null; then
  echo "⚠️  Health check failed, restarting backend..."
  docker-compose restart backend
  sleep 30
fi

# 3. Check memory usage
echo "Checking memory..."
MEM=$(docker stats --no-stream --format "{{.MemPerc}}" secure-gate-backend | tr -d '%' | cut -d. -f1)
if [ "$MEM" -gt 85 ]; then
  echo "⚠️  High memory ($MEM%), clearing cache..."
  docker-compose exec redis redis-cli FLUSHDB
  docker-compose restart backend
fi

# 4. Check disk space
echo "Checking disk space..."
DISK=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK" -gt 85 ]; then
  echo "⚠️  Low disk space ($DISK%), cleaning..."
  docker system prune -f
  find /var/log -name "*.log" -mtime +7 -delete
fi

# 5. Check database connections
echo "Checking database connections..."
CONNS=$(docker-compose exec -T postgres psql -U postgres -d secure_gate -t -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='secure_gate';" | tr -d ' ')
if [ "$CONNS" -gt 18 ]; then
  echo "⚠️  High connection count ($CONNS), cleaning..."
  docker-compose exec postgres psql -U postgres -d secure_gate -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle' AND datname='secure_gate'
    AND now() - state_change > interval '5 minutes';"
fi

# 6. Check error rate
echo "Checking error rate..."
ERRORS=$(docker-compose logs --since 15m backend | grep -i error | wc -l)
if [ "$ERRORS" -gt 50 ]; then
  echo "⚠️  High error rate ($ERRORS errors), investigating..."
  docker-compose logs --tail=50 backend | grep -i error
  # Send alert
  echo "High error rate detected: $ERRORS errors in last 15min" | \
    mail -s "⚠️  High Error Rate Alert" admin@example.com
fi

echo "✓ Auto-heal check complete"
echo ""
```

**Install auto-heal:**
```bash
chmod +x auto-heal.sh

# Add to crontab (runs every 15 minutes)
crontab -e
# Add: */15 * * * * /root/auto-heal.sh >> /var/log/auto-heal.log 2>&1
```

---

## 📈 PERFORMANCE OPTIMIZATION SCRIPTS

### Database Optimization

```bash
#!/bin/bash
# save as: optimize-database.sh

echo "Optimizing database..."

# Update statistics
docker-compose exec postgres psql -U postgres -d secure_gate -c "
ANALYZE;
"

# Vacuum full (use with caution, locks tables)
# docker-compose exec postgres psql -U postgres -d secure_gate -c "VACUUM FULL;"

# Reindex
docker-compose exec postgres psql -U postgres -d secure_gate -c "
REINDEX DATABASE secure_gate;
"

# Check for bloat
docker-compose exec postgres psql -U postgres -d secure_gate -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                      pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

echo "✓ Database optimization complete"
```

### Cache Optimization

```bash
#!/bin/bash
# save as: optimize-cache.sh

echo "Optimizing Redis cache..."

# Check cache hit rate
docker-compose exec redis redis-cli INFO STATS | grep -E "keyspace_hits|keyspace_misses"

# Remove expired keys
docker-compose exec redis redis-cli --scan --pattern "*" | \
  while read key; do
    TTL=$(docker-compose exec redis redis-cli TTL "$key")
    if [ "$TTL" = "-1" ]; then
      echo "Setting TTL for: $key"
      docker-compose exec redis redis-cli EXPIRE "$key" 3600
    fi
  done

# Defragment
docker-compose exec redis redis-cli MEMORY PURGE

echo "✓ Cache optimization complete"
```

---

## 📧 ALERTING SETUP

### Email Alerts

```bash
# Install mailutils
apt install mailutils -y

# Configure email alerts
cat > /root/send-alert.sh << 'EOF'
#!/bin/bash
SUBJECT="$1"
MESSAGE="$2"
TO="admin@example.com"

echo "$MESSAGE" | mail -s "$SUBJECT" "$TO"
EOF

chmod +x /root/send-alert.sh
```

### Slack Alerts

```bash
#!/bin/bash
# save as: send-slack-alert.sh

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
MESSAGE="$1"

curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"$MESSAGE\"}" \
  "$WEBHOOK_URL"
```

### Alert Integration in Monitoring Scripts

```bash
# Add to your monitoring scripts
if [ "$ERROR_COUNT" -gt 50 ]; then
  /root/send-alert.sh "🚨 High Error Rate" "Detected $ERROR_COUNT errors in last hour"
  /root/send-slack-alert.sh "⚠️  High Error Rate: $ERROR_COUNT errors detected"
fi
```

---

## 📊 METRICS COLLECTION

### Prometheus Metrics (Optional)

```yaml
# docker-compose.metrics.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

---

## 🔍 LOG ANALYSIS

### Find Critical Errors

```bash
# Last 100 errors
docker-compose logs backend | grep -i error | tail -100

# Errors by type
docker-compose logs backend | grep -i error | awk '{print $5}' | sort | uniq -c | sort -rn

# Errors by time
docker-compose logs backend | grep -i error | awk '{print $1, $2}' | cut -d. -f1 | uniq -c

# Database errors
docker-compose logs backend | grep -i "database\|postgres\|sql" | grep -i error

# Authentication errors
docker-compose logs backend | grep -i "auth\|login\|token" | grep -i error
```

### Performance Analysis

```bash
# Slow requests
docker-compose logs backend | grep "slow request" | tail -50

# Response times
docker-compose logs backend | grep "response time" | awk '{print $NF}' | sort -n | tail -20

# Most accessed endpoints
docker-compose logs backend | grep "GET\|POST\|PUT\|DELETE" | awk '{print $5, $6}' | sort | uniq -c | sort -rn | head -20
```

---

## ✅ HEALTH CHECK CHECKLIST

### Daily Checklist

- [ ] Run `daily-health-check.sh`
- [ ] Check for errors in logs
- [ ] Verify backups completed
- [ ] Check disk space
- [ ] Review resource usage
- [ ] Test critical features

### Weekly Checklist

- [ ] Run database optimization
- [ ] Review slow queries
- [ ] Check cache performance
- [ ] Review security logs
- [ ] Update dependencies (if needed)
- [ ] Test disaster recovery

### Monthly Checklist

- [ ] Full security audit
- [ ] Performance benchmarking
- [ ] Capacity planning review
- [ ] Cost optimization
- [ ] Documentation updates
- [ ] Team training

---

## 🎓 LEARNING FROM ISSUES

### Issue Log Template

```markdown
## Issue: [Title]
**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2/P3
**Duration:** X hours

### Symptoms
- What users experienced
- Error messages
- Metrics affected

### Root Cause
- What caused the issue
- Why it wasn't detected earlier

### Resolution
- Steps taken to fix
- How long it took

### Prevention
- Monitoring added
- Code changes
- Process improvements

### Action Items
- [ ] Update monitoring
- [ ] Update runbook
- [ ] Train team
```

---

**Guide Created:** October 9, 2025  
**Purpose:** Production monitoring and automated issue resolution  
**Maintenance:** Update monthly or after major incidents
