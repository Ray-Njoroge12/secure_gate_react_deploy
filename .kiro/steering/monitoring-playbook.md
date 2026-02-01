# Monitoring & Alerting Playbook

## Overview

This playbook provides operational procedures for monitoring, alerting, and incident response for the Secure Gate Access Control System. It covers proactive monitoring, alert handling, and troubleshooting procedures.

## Monitoring Architecture

### Monitoring Stack
- **Application Monitoring**: Sentry for error tracking and performance
- **Infrastructure Monitoring**: CloudWatch for AWS resources
- **Log Aggregation**: Grafana Cloud + Loki for centralized logging
- **Uptime Monitoring**: External service monitoring
- **Database Monitoring**: PostgreSQL performance metrics
- **Real-time Metrics**: Custom dashboards for business metrics

### Key Metrics to Monitor

#### Application Health
- **Response Times**: P50, P95, P99 percentiles
- **Error Rates**: 4xx and 5xx error percentages
- **Throughput**: Requests per second/minute
- **Availability**: Uptime percentage
- **Database Performance**: Query response times, connection pool usage

#### Business Metrics
- **User Activity**: Active users, login success rates
- **Visitor Processing**: Check-ins/check-outs per hour
- **System Usage**: API calls by endpoint, feature usage
- **Security Events**: Failed login attempts, suspicious activity

#### Infrastructure Metrics
- **Server Resources**: CPU, memory, disk usage
- **Database**: Connection count, query performance, storage usage
- **Network**: Bandwidth usage, connection errors
- **Cache Performance**: Redis hit rates, memory usage

## Alert Configuration

### Critical Alerts (Immediate Response Required)

#### System Down
```yaml
Alert: Application Unavailable
Condition: HTTP health check fails for 2 consecutive minutes
Severity: Critical
Response Time: 5 minutes
Escalation: Page on-call engineer immediately
```

#### Database Issues
```yaml
Alert: Database Connection Failure
Condition: Database connection pool exhausted OR query response time > 5s
Severity: Critical
Response Time: 5 minutes
Escalation: Page database administrator
```

#### High Error Rate
```yaml
Alert: High Error Rate
Condition: Error rate > 5% for 5 consecutive minutes
Severity: Critical
Response Time: 10 minutes
Escalation: Alert development team
```

### Warning Alerts (Monitor Closely)

#### Performance Degradation
```yaml
Alert: Slow Response Times
Condition: P95 response time > 2 seconds for 10 minutes
Severity: Warning
Response Time: 30 minutes
Action: Investigate performance bottlenecks
```

#### Resource Usage
```yaml
Alert: High Resource Usage
Condition: CPU > 80% OR Memory > 85% for 15 minutes
Severity: Warning
Response Time: 30 minutes
Action: Check for resource leaks, consider scaling
```

#### Security Events
```yaml
Alert: Multiple Failed Logins
Condition: > 10 failed login attempts from same IP in 5 minutes
Severity: Warning
Response Time: 15 minutes
Action: Review security logs, consider IP blocking
```

### Info Alerts (Awareness Only)

#### Deployment Events
```yaml
Alert: Deployment Completed
Condition: New deployment detected
Severity: Info
Action: Monitor for post-deployment issues
```

#### Scheduled Maintenance
```yaml
Alert: Maintenance Window
Condition: Scheduled maintenance starting
Severity: Info
Action: Prepare for expected service interruption
```

## Dashboard Configuration

### Executive Dashboard
**Audience**: Management, stakeholders
**Refresh**: Every 5 minutes
**Metrics**:
- System uptime (99.9% target)
- Active users (daily/monthly)
- Visitor processing volume
- Revenue/usage metrics
- Security incident count

### Operations Dashboard
**Audience**: DevOps, on-call engineers
**Refresh**: Every 30 seconds
**Metrics**:
- Application health status
- Response time trends
- Error rate by endpoint
- Infrastructure resource usage
- Database performance
- Alert status summary

### Development Dashboard
**Audience**: Development team
**Refresh**: Every 2 minutes
**Metrics**:
- API endpoint performance
- Feature usage statistics
- Error details and stack traces
- Deployment pipeline status
- Test coverage trends
- Code quality metrics

### Security Dashboard
**Audience**: Security team, administrators
**Refresh**: Every 1 minute
**Metrics**:
- Authentication success/failure rates
- Suspicious activity patterns
- Security event timeline
- Failed access attempts
- MFA usage statistics
- Audit log summary

## Incident Response Procedures

### Severity Levels

#### Severity 1 (Critical)
- **Definition**: Complete service outage or data loss
- **Response Time**: 5 minutes
- **Escalation**: Immediate page to on-call engineer
- **Communication**: Status page update within 15 minutes

#### Severity 2 (High)
- **Definition**: Major feature unavailable or significant performance degradation
- **Response Time**: 30 minutes
- **Escalation**: Alert development team
- **Communication**: Internal notification, status page if customer-facing

#### Severity 3 (Medium)
- **Definition**: Minor feature issues or moderate performance impact
- **Response Time**: 2 hours
- **Escalation**: Create ticket for development team
- **Communication**: Internal tracking only

#### Severity 4 (Low)
- **Definition**: Cosmetic issues or minor inconveniences
- **Response Time**: Next business day
- **Escalation**: Add to backlog
- **Communication**: Internal documentation

### Incident Response Workflow

#### 1. Detection & Acknowledgment
```bash
# Acknowledge alert to stop notifications
curl -X POST "https://api.pagerduty.com/incidents/{id}/acknowledge" \
  -H "Authorization: Token token={API_TOKEN}"

# Join incident response channel
# Slack: #incident-response
```

#### 2. Initial Assessment
- **Verify Impact**: Confirm the issue and assess scope
- **Check Dependencies**: Review related services and infrastructure
- **Gather Context**: Check recent deployments, configuration changes
- **Estimate Severity**: Assign appropriate severity level

#### 3. Investigation & Diagnosis
```bash
# Check application logs
kubectl logs -f deployment/secure-gate-api --tail=100

# Check database performance
psql -h $DB_HOST -U $DB_USER -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY total_time DESC LIMIT 10;"

# Check system resources
top -p $(pgrep -f "node.*server")
```

#### 4. Resolution & Recovery
- **Implement Fix**: Apply immediate fix or workaround
- **Verify Resolution**: Confirm issue is resolved
- **Monitor Stability**: Watch for recurring issues
- **Document Actions**: Record all steps taken

#### 5. Post-Incident Review
- **Timeline Creation**: Document incident timeline
- **Root Cause Analysis**: Identify underlying cause
- **Action Items**: Create tasks to prevent recurrence
- **Process Improvement**: Update procedures if needed

## Troubleshooting Runbooks

### Application Not Responding

#### Symptoms
- Health check endpoints returning 5xx errors
- High response times or timeouts
- Users unable to access the application

#### Investigation Steps
```bash
# 1. Check application status
curl -I https://api.secure-gate.app/health

# 2. Check server resources
htop
df -h

# 3. Check application logs
tail -f /var/log/secure-gate/app.log

# 4. Check database connectivity
psql -h $DB_HOST -U $DB_USER -c "SELECT 1;"

# 5. Check Redis connectivity
redis-cli -h $REDIS_HOST ping
```

#### Common Fixes
- **High CPU**: Restart application, check for infinite loops
- **Memory Leak**: Restart application, investigate memory usage patterns
- **Database Issues**: Check connection pool, restart database if needed
- **Disk Full**: Clean up logs, temporary files

### Database Performance Issues

#### Symptoms
- Slow query response times
- High database CPU usage
- Connection pool exhaustion
- Lock timeouts

#### Investigation Steps
```sql
-- Check active connections
SELECT count(*) as active_connections,
       max_conn,
       max_conn - count(*) as available_connections
FROM pg_stat_activity, 
     (SELECT setting::int as max_conn FROM pg_settings WHERE name = 'max_connections') mc
GROUP BY max_conn;

-- Check slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Check locks
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

#### Common Fixes
- **Slow Queries**: Add indexes, optimize queries
- **Lock Contention**: Identify and optimize conflicting transactions
- **Connection Issues**: Increase connection pool size, check for connection leaks
- **Storage Issues**: Archive old data, increase storage capacity

### High Error Rates

#### Symptoms
- Increased 4xx or 5xx error responses
- Error alerts firing
- User complaints about functionality

#### Investigation Steps
```bash
# 1. Check error logs
grep -i error /var/log/secure-gate/app.log | tail -20

# 2. Check specific error patterns
grep "500" /var/log/nginx/access.log | tail -10

# 3. Check application metrics
curl https://api.secure-gate.app/metrics

# 4. Check external service status
curl -I https://api.mailgun.net/v3
curl -I https://api.africastalking.com
```

#### Common Fixes
- **Validation Errors**: Check input validation, update client-side validation
- **Authentication Issues**: Check token expiration, refresh token logic
- **External Service Failures**: Implement circuit breakers, fallback mechanisms
- **Database Errors**: Check constraints, data integrity issues

## Maintenance Procedures

### Scheduled Maintenance

#### Pre-Maintenance Checklist
- [ ] Schedule maintenance window during low usage
- [ ] Notify stakeholders 24 hours in advance
- [ ] Prepare rollback plan
- [ ] Backup critical data
- [ ] Test maintenance procedures in staging

#### During Maintenance
- [ ] Update status page
- [ ] Monitor system metrics
- [ ] Execute maintenance tasks
- [ ] Verify functionality
- [ ] Update documentation

#### Post-Maintenance
- [ ] Confirm all services operational
- [ ] Update status page
- [ ] Monitor for issues
- [ ] Document any problems encountered
- [ ] Schedule follow-up if needed

### Database Maintenance

#### Weekly Tasks
```sql
-- Update table statistics
ANALYZE;

-- Reindex if needed
REINDEX INDEX CONCURRENTLY idx_visitors_estate_status_date;

-- Clean up old data
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM revoked_tokens WHERE revoked_at < NOW() - INTERVAL '30 days';
```

#### Monthly Tasks
```sql
-- Vacuum tables
VACUUM ANALYZE visitors;
VACUUM ANALYZE audit_logs;
VACUUM ANALYZE users;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### Log Management

#### Daily Tasks
```bash
# Rotate logs
logrotate /etc/logrotate.d/secure-gate

# Archive old logs
find /var/log/secure-gate -name "*.log.*" -mtime +7 -exec gzip {} \;

# Clean up old archives
find /var/log/secure-gate -name "*.gz" -mtime +30 -delete
```

## Performance Optimization

### Monitoring Performance Trends

#### Key Performance Indicators
- **Response Time Trends**: Track P95 response times over time
- **Throughput Patterns**: Monitor requests per second during peak hours
- **Error Rate Trends**: Watch for increasing error patterns
- **Resource Utilization**: Track CPU, memory, and disk usage trends

#### Performance Baselines
```javascript
// Acceptable performance thresholds
const PERFORMANCE_THRESHOLDS = {
  responseTime: {
    p50: 200,   // 200ms
    p95: 500,   // 500ms
    p99: 1000   // 1 second
  },
  errorRate: {
    warning: 1,   // 1%
    critical: 5   // 5%
  },
  availability: {
    target: 99.9  // 99.9% uptime
  }
};
```

### Optimization Strategies

#### Application Level
- **Code Optimization**: Profile and optimize slow functions
- **Caching**: Implement Redis caching for frequently accessed data
- **Database Queries**: Optimize N+1 queries, add appropriate indexes
- **Connection Pooling**: Tune database connection pool settings

#### Infrastructure Level
- **Auto Scaling**: Configure CPU/memory-based scaling
- **Load Balancing**: Distribute traffic across multiple instances
- **CDN**: Use CloudFront for static asset delivery
- **Database Optimization**: Use read replicas for read-heavy workloads

## Security Monitoring

### Security Event Detection

#### Failed Authentication Attempts
```bash
# Monitor failed login attempts
grep "AUTH_FAILED" /var/log/secure-gate/security.log | \
  awk '{print $8}' | sort | uniq -c | sort -nr | head -10
```

#### Suspicious Activity Patterns
```bash
# Check for unusual API access patterns
grep "API_ACCESS" /var/log/secure-gate/audit.log | \
  grep -E "(admin|sensitive)" | tail -20
```

#### Security Alert Response
1. **Immediate**: Block suspicious IPs if confirmed malicious
2. **Investigation**: Review audit logs for scope of potential breach
3. **Communication**: Notify security team and stakeholders
4. **Documentation**: Record incident details and response actions

### Compliance Monitoring

#### GDPR/KDPA Compliance
- **Data Access Logs**: Monitor who accesses personal data
- **Data Retention**: Ensure old data is properly archived/deleted
- **Consent Tracking**: Verify consent records are maintained
- **Breach Detection**: Monitor for potential data breaches

#### Audit Requirements
- **Access Logs**: Maintain detailed access logs for all user actions
- **Change Tracking**: Log all configuration and data changes
- **Security Events**: Record all security-related events
- **Retention Policies**: Ensure logs are retained per compliance requirements

This monitoring playbook provides the operational foundation for maintaining high availability, performance, and security of the Secure Gate Access Control System.