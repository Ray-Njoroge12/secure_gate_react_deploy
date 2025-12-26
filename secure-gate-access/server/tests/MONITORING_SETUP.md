# Production Monitoring Setup
## Secure Gate Visitor Management System
**Version:** 1.0

---

## 1. Application Metrics

### 1.1 Key Performance Indicators (KPIs)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (p95) | < 500ms | > 1000ms |
| Error Rate | < 0.1% | > 1% |
| Uptime | 99.9% | < 99.5% |
| QR Validation Success Rate | > 98% | < 95% |
| Check-in Throughput | 50/min | < 20/min |

### 1.2 Business Metrics

```javascript
// Recommended metrics to track
const businessMetrics = {
  daily_visitors_checked_in: 'COUNT(check_ins) WHERE date = today',
  recurring_pass_validations: 'COUNT(recurring_pass_entries) WHERE date = today',
  walk_in_approval_rate: 'approved / (approved + rejected)',
  avg_approval_time_seconds: 'AVG(approved_at - requested_at)',
  qr_code_usage_rate: 'used_qr_codes / generated_qr_codes',
  failed_pin_attempts: 'COUNT(*) FROM pin_validation_attempts WHERE success = false'
};
```

---

## 2. Logging Configuration

### 2.1 Log Levels

```javascript
// Production logging levels
const logLevels = {
  error: true,    // Always log errors
  warn: true,     // Log warnings
  info: true,     // Log important info (check-ins, approvals)
  debug: false,   // Disable debug in production
  trace: false    // Never enable in production
};
```

### 2.2 Structured Logging Format

```json
{
  "timestamp": "2025-12-25T08:00:00.000Z",
  "level": "info",
  "service": "secure-gate-api",
  "traceId": "abc-123-def",
  "userId": 42,
  "action": "visitor_check_in",
  "visitorId": 156,
  "guardId": 5,
  "responseTime": 145,
  "status": "success"
}
```

### 2.3 Audit Log Events

| Event Type | Fields | Retention |
|------------|--------|-----------|
| `auth.login` | userId, ip, userAgent, success | 7 years |
| `auth.logout` | userId, ip | 7 years |
| `auth.failed_login` | email, ip, attempts | 7 years |
| `visitor.check_in` | visitorId, guardId, method | 7 years |
| `visitor.check_out` | visitorId, guardId | 7 years |
| `pass.created` | passId, residentId | 7 years |
| `pass.validated` | passId, guardId, method | 7 years |
| `privacy.data_export` | userId, recordCount | 7 years |
| `privacy.account_delete` | userId (anonymized) | 7 years |

---

## 3. Health Check Endpoints

### 3.1 Basic Health

```javascript
// GET /health
{
  "status": "healthy",
  "timestamp": "2025-12-25T08:00:00.000Z",
  "version": "1.0.0"
}
```

### 3.2 Deep Health (Internal Only)

```javascript
// GET /health/deep (requires admin auth)
{
  "status": "healthy",
  "components": {
    "database": { "status": "up", "latency": 5 },
    "redis": { "status": "up", "latency": 2 },
    "sms_provider": { "status": "up" },
    "email_provider": { "status": "up" }
  },
  "metrics": {
    "active_connections": 15,
    "memory_usage_mb": 256,
    "uptime_seconds": 86400
  }
}
```

---

## 4. Alerting Rules

### 4.1 Critical Alerts (Immediate Page)

```yaml
alerts:
  - name: API_DOWN
    condition: health_check_failures >= 3
    action: page_oncall
    
  - name: HIGH_ERROR_RATE
    condition: error_rate > 5% for 5 minutes
    action: page_oncall
    
  - name: DATABASE_DOWN
    condition: db_connection_failures >= 1
    action: page_oncall
    
  - name: SECURITY_BRUTE_FORCE
    condition: failed_logins_same_ip > 20 in 5 minutes
    action: page_oncall + block_ip
```

### 4.2 Warning Alerts (Slack/Email)

```yaml
alerts:
  - name: HIGH_LATENCY
    condition: p95_response_time > 1000ms for 10 minutes
    action: slack_alert
    
  - name: ELEVATED_ERROR_RATE
    condition: error_rate > 1% for 10 minutes
    action: slack_alert
    
  - name: LOW_DISK_SPACE
    condition: disk_usage > 80%
    action: email_alert
    
  - name: HIGH_MEMORY_USAGE
    condition: memory_usage > 85%
    action: slack_alert
```

### 4.3 Informational Alerts (Daily Digest)

```yaml
alerts:
  - name: DAILY_METRICS_SUMMARY
    schedule: "0 9 * * *"  # 9 AM daily
    content:
      - total_visitors_yesterday
      - qr_codes_generated
      - failed_pin_attempts
      - new_user_registrations
```

---

## 5. Dashboard Panels

### 5.1 Operations Dashboard

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Request Rate | Line chart | API logs |
| Error Rate | Line chart | API logs |
| Response Time (p50, p95, p99) | Line chart | API logs |
| Active Users | Counter | WebSocket connections |
| Database Connections | Gauge | DB pool stats |

### 5.2 Security Dashboard

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Failed Logins | Time series | audit_logs |
| Locked Accounts | Counter | users table |
| QR Replay Attempts | Counter | qr_codes table |
| Rate Limited Requests | Time series | rate limit logs |
| Security Events | Table | security_events |

### 5.3 Business Dashboard

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Daily Check-ins | Bar chart | visitors table |
| Recurring Pass Usage | Pie chart | recurring_pass_entries |
| Walk-in vs Pre-registered | Donut chart | visitors table |
| Approval Response Time | Histogram | visitors table |
| Peak Hours | Heatmap | access_logs |

---

## 6. Log Aggregation Setup

### 6.1 Recommended Stack

```
Application → Winston/Pino → Fluentd/Filebeat → Elasticsearch → Kibana
                                              → S3 (Archive)
```

### 6.2 Log Retention

| Log Type | Hot Storage | Warm Storage | Archive |
|----------|-------------|--------------|---------|
| Application | 7 days | 30 days | 1 year |
| Access | 7 days | 30 days | 1 year |
| Audit | 90 days | 1 year | 7 years |
| Security | 90 days | 1 year | 7 years |
| Error | 30 days | 90 days | 1 year |

---

## 7. Incident Response

### 7.1 Severity Levels

| Level | Response Time | Example |
|-------|---------------|---------|
| P1 - Critical | 15 minutes | Service down, data breach |
| P2 - High | 1 hour | Core feature broken |
| P3 - Medium | 4 hours | Non-critical feature issue |
| P4 - Low | Next business day | Minor UI issues |

### 7.2 Escalation Path

```
L1 Support → L2 Engineering → L3 On-call → Engineering Manager → CTO
    15min       30min            1hr           2hr              4hr
```

---

## 8. Runbook Links

| Scenario | Runbook |
|----------|---------|
| API unresponsive | /runbooks/api-down.md |
| Database connection issues | /runbooks/db-issues.md |
| High error rate | /runbooks/high-errors.md |
| Security incident | /runbooks/security-incident.md |
| SMS delivery failures | /runbooks/sms-failures.md |
| Performance degradation | /runbooks/performance.md |
