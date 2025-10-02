# Container Management System

## Overview

This document describes the comprehensive container management system implemented for the Secure Gate Access Control System, including health monitoring, restart policies, and failure recovery mechanisms.

## Components

### 1. Container Health Monitor (`container-health-monitor.sh`)

**Features:**
- Real-time container health monitoring
- Automatic restart with cooldown periods
- Failure pattern analysis
- Comprehensive logging
- Health report generation

**Usage:**
```bash
# Start continuous monitoring
./container-health-monitor.sh monitor

# Run single health check
./container-health-monitor.sh check

# Generate health report
./container-health-monitor.sh report

# Get container logs
./container-health-monitor.sh logs <container_name> [lines]
```

**Configuration:**
- `MAX_RESTART_ATTEMPTS=5` - Maximum restart attempts per container
- `RESTART_COOLDOWN=300` - Cooldown period between restarts (5 minutes)
- `HEALTH_CHECK_INTERVAL=30` - Health check interval (30 seconds)

### 2. Restart Policy Manager (`restart-policy-manager.sh`)

**Features:**
- Configurable restart policies per container
- Policy-based restart management
- Restart count tracking
- Policy reporting and updates

**Usage:**
```bash
# Monitor restart policies
./restart-policy-manager.sh monitor

# Update restart policy
./restart-policy-manager.sh update <container> <policy> [max_restarts] [delay]

# List all policies
./restart-policy-manager.sh list

# Reset restart count
./restart-policy-manager.sh reset <container>
```

**Policies:**
- `no` - Never restart
- `on-failure` - Restart only on failure
- `unless-stopped` - Restart unless manually stopped
- `always` - Always restart

### 3. Production Docker Compose (`docker-compose.production.yml`)

**Features:**
- Enhanced health checks
- Resource limits and reservations
- Comprehensive logging
- Restart policies
- Health monitoring integration

**Services:**
- **Backend**: Node.js application with health checks
- **Frontend**: React application with Nginx
- **PostgreSQL**: Database with health monitoring
- **Redis**: Cache with memory limits
- **Nginx**: Load balancer with rate limiting
- **Health Monitor**: Container health monitoring

## Health Check Strategy

### 1. Liveness Probes
- **Backend**: `curl -f http://localhost:5000/health`
- **Frontend**: `curl -f http://localhost/health`
- **PostgreSQL**: `pg_isready -U postgres -d secure_gate`
- **Redis**: `redis-cli --raw incr ping`

### 2. Readiness Probes
- **Backend**: `/health/ready` endpoint
- **Frontend**: Static file availability
- **Database**: Connection and query capability
- **Cache**: Redis connectivity

### 3. Startup Probes
- **Backend**: `/health/startup` endpoint
- **Frontend**: Nginx startup completion
- **Database**: Initial data loading
- **Cache**: Redis initialization

## Restart Policies

### Default Policies

| Container | Policy | Max Restarts | Delay | Health Check |
|-----------|--------|--------------|-------|--------------|
| Backend | unless-stopped | 5 | 30s | 30s |
| Frontend | unless-stopped | 3 | 15s | 30s |
| PostgreSQL | unless-stopped | 3 | 60s | 30s |
| Redis | unless-stopped | 3 | 30s | 30s |
| Nginx | unless-stopped | 3 | 15s | 30s |

### Policy Configuration

The restart policies are stored in `restart-policies.json`:

```json
{
  "policies": {
    "secure-gate-backend": {
      "restart_policy": "unless-stopped",
      "max_restarts": 5,
      "restart_delay": 30,
      "health_check_interval": 30,
      "failure_threshold": 3,
      "success_threshold": 1,
      "timeout": 10
    }
  }
}
```

## Failure Recovery

### 1. Automatic Recovery
- **Health Check Failures**: Automatic restart after cooldown
- **Container Crashes**: Policy-based restart
- **Resource Exhaustion**: Restart with resource limits
- **Network Issues**: Retry with exponential backoff

### 2. Failure Analysis
- **Port Conflicts**: EADDRINUSE detection
- **File Not Found**: ENOENT detection
- **Connection Refused**: ECONNREFUSED detection
- **Syntax Errors**: JavaScript/Node.js errors
- **Type Errors**: Runtime type errors

### 3. Recovery Actions
- **Immediate Restart**: For transient failures
- **Delayed Restart**: For persistent issues
- **Container Recreation**: For configuration errors
- **Service Dependencies**: Wait for dependencies

## Monitoring and Alerting

### 1. Health Status
- **Healthy**: Container running and responding
- **Unhealthy**: Container running but failing health checks
- **Restarting**: Container in restart loop
- **Exited**: Container stopped
- **Dead**: Container failed to start

### 2. Metrics Collection
- Restart counts per container
- Health check success/failure rates
- Container uptime and downtime
- Resource utilization
- Error patterns and frequencies

### 3. Logging
- Structured logging with timestamps
- Container-specific log files
- Health check results
- Restart events and reasons
- Error analysis and patterns

## Best Practices

### 1. Health Check Design
- **Fast Response**: Health checks should complete quickly
- **Meaningful Tests**: Check actual functionality, not just process existence
- **Graceful Degradation**: Handle partial failures gracefully
- **Dependency Awareness**: Consider service dependencies

### 2. Restart Policy Design
- **Conservative Approach**: Use `unless-stopped` for critical services
- **Failure Tolerance**: Allow some failures before restart
- **Cooldown Periods**: Prevent restart loops
- **Resource Limits**: Prevent resource exhaustion

### 3. Monitoring Strategy
- **Continuous Monitoring**: Real-time health monitoring
- **Proactive Alerts**: Alert before critical failures
- **Trend Analysis**: Monitor patterns over time
- **Capacity Planning**: Plan for growth and scaling

## Troubleshooting

### Common Issues

1. **Container Restart Loops**
   - Check health check configuration
   - Verify resource limits
   - Review application logs
   - Check dependency availability

2. **Health Check Failures**
   - Verify health check endpoints
   - Check network connectivity
   - Review application configuration
   - Test health checks manually

3. **Resource Exhaustion**
   - Monitor memory and CPU usage
   - Adjust resource limits
   - Check for memory leaks
   - Optimize application performance

4. **Dependency Issues**
   - Verify service dependencies
   - Check network connectivity
   - Review startup order
   - Test dependency availability

### Debug Commands

```bash
# Check container status
docker ps -a

# View container logs
docker logs <container_name>

# Check health status
docker inspect <container_name> | jq .State.Health

# Monitor resource usage
docker stats <container_name>

# Test health endpoints
curl -f http://localhost:5000/health
curl -f http://localhost:3000/health
```

## Future Enhancements

### 1. Advanced Monitoring
- Prometheus metrics integration
- Grafana dashboards
- Custom health check plugins
- Machine learning-based failure prediction

### 2. Auto-scaling
- Horizontal pod autoscaling
- Vertical pod autoscaling
- Custom scaling metrics
- Load-based scaling

### 3. Chaos Engineering
- Chaos monkey integration
- Failure injection testing
- Resilience testing
- Recovery time measurement

### 4. Service Mesh
- Istio integration
- Traffic management
- Security policies
- Observability

## Conclusion

The container management system provides comprehensive monitoring, health checking, and restart management for the Secure Gate Access Control System. The system ensures high availability and reliability through proactive monitoring and automatic recovery mechanisms.

The implementation includes:
- Real-time health monitoring
- Configurable restart policies
- Failure analysis and recovery
- Comprehensive logging and reporting
- Best practices for container management

This system provides a solid foundation for production deployment and ongoing operations.
