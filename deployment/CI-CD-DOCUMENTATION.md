# CI/CD Pipeline Documentation

## Overview

This document describes the comprehensive CI/CD pipeline implemented for the Secure Gate Access Control System, including blue-green deployment, security scanning, performance testing, and automated deployment workflows.

## Pipeline Architecture

### 1. Main CI/CD Pipeline (`ci-cd-complete.yml`)

**Triggers:**
- Push to `main` and `develop` branches
- Pull requests to `main` and `develop` branches
- Weekly security scans (Mondays at 2 AM)

**Jobs:**
1. **Code Quality & Security** - Linting, formatting, security audits
2. **Frontend Build & Test** - React application build and testing
3. **Backend Build & Test** - Node.js server build and testing
4. **Docker Build & Push** - Container image creation and registry push
5. **Integration Tests** - End-to-end testing with blue-green deployment
6. **Performance Tests** - Load and stress testing with k6
7. **Deploy to Production** - Automated production deployment
8. **Notify Results** - Success/failure notifications

### 2. Blue-Green Deployment Pipeline (`blue-green-deploy.yml`)

**Triggers:**
- Manual workflow dispatch
- Target environment selection (blue/green)
- Force deployment option

**Jobs:**
1. **Pre-deployment Checks** - Validate configuration files
2. **Build and Test** - Run tests before deployment
3. **Deploy to Target Environment** - Deploy to specified environment
4. **Switch Traffic** - Route traffic to new deployment
5. **Post-deployment Cleanup** - Clean up inactive environment
6. **Notify Deployment Status** - Send deployment notifications

### 3. Security Scanning Pipeline (`security-scan.yml`)

**Triggers:**
- Push to `main` and `develop` branches
- Pull requests to `main` and `develop` branches
- Weekly scheduled scans

**Jobs:**
1. **Dependency Vulnerability Scan** - npm audit and Snyk scanning
2. **Container Security Scan** - Trivy vulnerability scanning
3. **Code Quality & Security Analysis** - CodeQL and ESLint security rules
4. **Infrastructure Security Scan** - Checkov for Dockerfile security
5. **Secret Scanning** - TruffleHog and GitLeaks for secret detection
6. **Security Report Generation** - Comprehensive security report

### 4. Performance Testing Pipeline (`performance-test.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Manual workflow dispatch with test type selection

**Test Types:**
- **Load Testing** - Normal expected load
- **Stress Testing** - Beyond normal capacity
- **Spike Testing** - Sudden traffic spikes
- **Volume Testing** - Large amounts of data

## Blue-Green Deployment

### Architecture

The blue-green deployment system consists of:

- **Blue Environment**: Production environment (port 8080, 5001, 3001)
- **Green Environment**: Staging environment (port 8081, 5002, 3002)
- **Nginx Load Balancers**: Route traffic between environments
- **Independent Databases**: Separate PostgreSQL and Redis instances
- **Health Checks**: Comprehensive health monitoring

### Deployment Process

1. **Deploy to Inactive Environment**
   ```bash
   ./blue-green-deploy.sh deploy green
   ```

2. **Run Smoke Tests**
   ```bash
   ./smoke-tests.sh --environment=green
   ```

3. **Switch Traffic**
   ```bash
   ./blue-green-deploy.sh switch-traffic green
   ```

4. **Rollback if Needed**
   ```bash
   ./blue-green-deploy.sh rollback
   ```

### Environment Configuration

#### Blue Environment (`docker-compose.blue.yml`)
- Backend: `secure-gate-backend-blue` (port 5001)
- Frontend: `secure-gate-frontend-blue` (port 3001)
- Database: `secure-gate-postgres-blue` (port 5433)
- Redis: `secure-gate-redis-blue` (port 6380)
- Nginx: `secure-gate-nginx-blue` (port 8080)

#### Green Environment (`docker-compose.green.yml`)
- Backend: `secure-gate-backend-green` (port 5002)
- Frontend: `secure-gate-frontend-green` (port 3002)
- Database: `secure-gate-postgres-green` (port 5434)
- Redis: `secure-gate-redis-green` (port 6381)
- Nginx: `secure-gate-nginx-green` (port 8081)

## Security Features

### 1. Vulnerability Scanning
- **Trivy**: Container and filesystem vulnerability scanning
- **Snyk**: Dependency vulnerability scanning
- **CodeQL**: Static code analysis for security issues

### 2. Secret Detection
- **TruffleHog**: Git history secret scanning
- **GitLeaks**: Real-time secret detection

### 3. Infrastructure Security
- **Checkov**: Dockerfile and infrastructure security scanning
- **ESLint Security**: Code-level security rule enforcement

### 4. Container Security
- Multi-stage Docker builds
- Non-root user execution
- Minimal base images
- Security scanning of built images

## Performance Testing

### Test Scenarios

1. **Load Testing**
   - 10 concurrent users
   - 5-minute duration
   - Response time < 2s (95th percentile)
   - Error rate < 10%

2. **Stress Testing**
   - Up to 100 concurrent users
   - Gradual load increase
   - Response time < 5s (95th percentile)
   - Error rate < 20%

3. **Spike Testing**
   - Sudden traffic spikes (10 → 200 → 300 users)
   - Response time < 10s (95th percentile)
   - Error rate < 30%

4. **Volume Testing**
   - 20 concurrent users for 10 minutes
   - Extended duration testing
   - Response time < 3s (95th percentile)
   - Error rate < 10%

### Performance Metrics

- **Response Time**: 95th percentile response times
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests
- **Resource Usage**: CPU, memory, and network utilization

## Monitoring and Observability

### Health Checks

1. **Liveness Probe**: `/health/live`
2. **Readiness Probe**: `/health/ready`
3. **Startup Probe**: `/health/startup`
4. **Detailed Health**: `/health/detailed`

### Metrics Collection

- Application performance metrics
- Container resource usage
- Database performance metrics
- Network traffic patterns

### Logging

- Structured logging with correlation IDs
- Centralized log aggregation
- Real-time log monitoring
- Log retention policies

## Deployment Strategies

### 1. Blue-Green Deployment
- Zero-downtime deployments
- Instant rollback capability
- Traffic switching control
- Environment isolation

### 2. Canary Deployment
- Gradual traffic shifting
- A/B testing capabilities
- Risk mitigation
- Performance comparison

### 3. Rolling Deployment
- Incremental updates
- Resource efficiency
- Gradual rollout
- Automatic rollback

## Best Practices

### 1. Code Quality
- Automated linting and formatting
- Code review requirements
- Test coverage thresholds
- Security scanning integration

### 2. Testing Strategy
- Unit tests for all components
- Integration tests for API endpoints
- End-to-end tests for user flows
- Performance tests for scalability

### 3. Security
- Regular dependency updates
- Vulnerability scanning
- Secret management
- Access control enforcement

### 4. Monitoring
- Comprehensive health checks
- Real-time alerting
- Performance monitoring
- Error tracking and analysis

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Check for existing containers using required ports
   - Use `docker ps` to identify conflicting containers
   - Stop conflicting containers before deployment

2. **Health Check Failures**
   - Verify all services are running
   - Check container logs for errors
   - Ensure proper network connectivity

3. **Build Failures**
   - Check Dockerfile syntax
   - Verify all dependencies are available
   - Review build logs for specific errors

4. **Deployment Failures**
   - Check environment configuration
   - Verify all required files exist
   - Review deployment logs

### Debug Commands

```bash
# Check container status
docker ps -a

# View container logs
docker logs <container-name>

# Check deployment status
./blue-green-deploy.sh status

# Run health checks
./blue-green-deploy.sh health-check <environment>

# Run smoke tests
./smoke-tests.sh --environment=<environment>
```

## Future Enhancements

1. **Advanced Monitoring**
   - APM integration
   - Custom dashboards
   - Alerting rules
   - SLA monitoring

2. **Security Improvements**
   - Runtime security scanning
   - Compliance reporting
   - Security policy enforcement
   - Threat detection

3. **Performance Optimization**
   - Auto-scaling capabilities
   - Load balancing improvements
   - Caching strategies
   - Database optimization

4. **Deployment Features**
   - Feature flags
   - A/B testing
   - Gradual rollouts
   - Automated rollbacks

## Conclusion

The implemented CI/CD pipeline provides a robust, secure, and scalable deployment solution for the Secure Gate Access Control System. The blue-green deployment strategy ensures zero-downtime deployments while comprehensive testing and monitoring provide confidence in system reliability and performance.
