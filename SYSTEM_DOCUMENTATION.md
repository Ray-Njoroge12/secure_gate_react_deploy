# Secure Gate Access Control System - Complete Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Deployment Guide](#deployment-guide)
4. [Configuration](#configuration)
5. [API Documentation](#api-documentation)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Security](#security)
8. [Performance](#performance)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

## System Overview

The Secure Gate Access Control System is a comprehensive visitor management solution designed for residential complexes, office buildings, and other secure facilities. The system provides end-to-end visitor management from invitation to check-out, with robust security, compliance, and performance features.

### Key Features

- **Visitor Management**: Complete visitor lifecycle management
- **Role-Based Access Control**: Resident, Guard, Admin, and Visitor roles
- **QR Code & OTP System**: Secure pass generation and verification
- **Real-time Notifications**: Email and SMS notifications
- **Compliance**: GDPR and Kenya DPA compliance
- **Security**: Advanced security features and monitoring
- **Performance**: High-performance, scalable architecture
- **Monitoring**: Comprehensive monitoring and alerting

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, PostgreSQL
- **Database**: PostgreSQL with Redis caching
- **Authentication**: JWT with refresh tokens
- **Notifications**: Nodemailer, Twilio SMS
- **Deployment**: Docker, Docker Compose, Nginx
- **Monitoring**: Custom monitoring dashboard
- **Security**: Rate limiting, encryption, audit logging

## Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Load Balancer │    │   Backend       │
│   (React)       │◄──►│   (Nginx)       │◄──►│   (Express)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Frontend      │    │   Database      │
                       │   Servers       │    │   (PostgreSQL)  │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                ┌───────────────────────┼───────────────────────┐
                                ▼                       ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                       │   Redis Cache   │    │   File Storage  │    │   Monitoring    │
                       │   (Sessions)    │    │   (QR Codes)    │    │   (Logs)        │
                       └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Architecture

#### Frontend Components
- **Authentication**: Login, Registration, Password Reset
- **Resident Dashboard**: Visitor management, invitations, history
- **Guard Dashboard**: QR scanning, check-in/out, real-time updates
- **Admin Dashboard**: System management, analytics, user management
- **Visitor Interface**: Registration, QR display, status tracking

#### Backend Services
- **Authentication Service**: JWT management, user authentication
- **Visitor Service**: Visitor lifecycle management
- **Notification Service**: Email and SMS notifications
- **QR Service**: QR code generation and validation
- **Audit Service**: Activity logging and compliance
- **Performance Service**: Performance monitoring and optimization
- **Load Balancer Service**: Load balancing and health checks

#### Database Schema
- **Users**: User accounts and authentication
- **Visitors**: Visitor information and status
- **Invitations**: Invitation management and tracking
- **Check-ins**: Check-in/out records
- **Audit Logs**: System activity and compliance logs
- **Performance Metrics**: Performance monitoring data

## Deployment Guide

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 13+ (for development)
- Redis 6+ (for caching)
- Nginx (for load balancing)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secure-gate-react-express
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Admin Dashboard: http://localhost:3000/admin

### Production Deployment

#### Blue-Green Deployment

1. **Prepare environments**
   ```bash
   # Blue environment
   docker-compose -f docker-compose.blue.yml up -d
   
   # Green environment
   docker-compose -f docker-compose.green.yml up -d
   ```

2. **Deploy using blue-green script**
   ```bash
   ./deployment/blue-green-deploy.sh
   ```

#### Load Balancer Setup

1. **Configure Nginx**
   ```bash
   cp deployment/nginx/load-balancer.conf /etc/nginx/sites-available/
   ln -s /etc/nginx/sites-available/load-balancer.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```

2. **Start load balancer services**
   ```bash
   docker-compose -f deployment/docker-compose.production.yml up -d
   ```

### Environment Variables

#### Required Variables
```bash
# Database
PGHOST=localhost
PGPORT=5432
PGDATABASE=secure_gate
PGUSER=postgres
PGPASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number
```

#### Optional Variables
```bash
# Performance
DB_POOL_SIZE=20
CACHE_DEFAULT_TTL=300
SLOW_REQUEST_THRESHOLD=1000

# Load Balancer
LOAD_BALANCER_ALGORITHM=round_robin
LOAD_BALANCER_STICKY_SESSIONS=true

# Monitoring
ENABLE_PERFORMANCE_LOGGING=true
ENABLE_CACHE_METRICS=true
```

## Configuration

### Database Configuration

#### Connection Pooling
```javascript
// Database pool configuration
const poolConfig = {
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Idle timeout
  connectionTimeoutMillis: 10000, // Connection timeout
  acquireTimeoutMillis: 60000 // Acquire timeout
};
```

#### Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_visitors_status_visit_date ON visitors(status, visit_date);
CREATE INDEX idx_checkins_visitor_status ON checkins(visitor_id, status);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### Redis Configuration

#### Cache Settings
```javascript
// Redis cache configuration
const cacheConfig = {
  defaultTTL: 300,           // 5 minutes
  maxKeys: 10000,            // Maximum keys
  compressionThreshold: 1024, // 1KB
  enableCompression: true,    // Enable compression
  enableEncryption: true      // Enable encryption
};
```

#### Session Management
```javascript
// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};
```

### Load Balancer Configuration

#### Nginx Upstream
```nginx
upstream backend_servers {
    least_conn;
    server backend-1:5000 weight=3 max_fails=3 fail_timeout=30s;
    server backend-2:5000 weight=3 max_fails=3 fail_timeout=30s;
    server backend-3:5000 weight=2 max_fails=3 fail_timeout=30s;
    server backup-1:5000 backup;
    server backup-2:5000 backup;
}
```

#### Rate Limiting
```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=200r/m;
```

## API Documentation

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "resident"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Visitor Management Endpoints

#### Create Visitor
```http
POST /api/visitors
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "visitDate": "2024-01-15",
  "purpose": "Meeting"
}
```

#### Get Visitors
```http
GET /api/visitors?status=active&page=1&limit=10
Authorization: Bearer your_jwt_token
```

#### Check-in Visitor
```http
POST /api/visitors/{visitorId}/checkin
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "qrCode": "visitor_qr_code",
  "otp": "123456"
}
```

### Admin Endpoints

#### System Statistics
```http
GET /api/admin/statistics
Authorization: Bearer your_jwt_token
```

#### User Management
```http
GET /api/admin/users
POST /api/admin/users
PUT /api/admin/users/{userId}
DELETE /api/admin/users/{userId}
Authorization: Bearer your_jwt_token
```

### Performance Endpoints

#### Performance Metrics
```http
GET /api/performance/metrics
Authorization: Bearer your_jwt_token
```

#### Cache Management
```http
GET /api/performance/cache
POST /api/performance/cache/clear
Authorization: Bearer your_jwt_token
```

### Load Balancer Endpoints

#### Load Balancer Status
```http
GET /api/load-balancer/status
Authorization: Bearer your_jwt_token
```

#### Server Management
```http
GET /api/load-balancer/servers
POST /api/load-balancer/servers/{serverId}/health-check
PUT /api/load-balancer/servers/{serverId}/toggle
Authorization: Bearer your_jwt_token
```

## Monitoring and Maintenance

### Health Checks

#### Application Health
```http
GET /health
GET /health/detailed
GET /health/live
GET /health/ready
```

#### Database Health
```http
GET /api/health/database
```

#### Cache Health
```http
GET /api/health/cache
```

### Monitoring Dashboard

#### Access Monitoring
- URL: http://localhost:3000/admin/monitoring
- Features: Real-time metrics, performance data, system health

#### Performance Dashboard
- URL: http://localhost:3000/admin/performance
- Features: Performance metrics, cache statistics, database performance

#### Load Balancer Dashboard
- URL: http://localhost:3000/admin/load-balancer
- Features: Server status, load balancing metrics, health checks

### Logging

#### Log Levels
- **ERROR**: System errors and failures
- **WARN**: Warning conditions
- **INFO**: General information
- **DEBUG**: Detailed debugging information

#### Log Files
- **Application Logs**: `/var/log/secure-gate/app.log`
- **Access Logs**: `/var/log/nginx/access.log`
- **Error Logs**: `/var/log/nginx/error.log`
- **Database Logs**: PostgreSQL logs

### Backup and Recovery

#### Automated Backups
- **Full Backups**: Daily at 2:00 AM
- **Incremental Backups**: Every hour
- **WAL Archiving**: Every 5 minutes
- **Retention**: 30 days for full, 7 days for incremental

#### Manual Backup
```bash
# Database backup
pg_dump -h localhost -U postgres secure_gate > backup.sql

# Redis backup
redis-cli --rdb /backup/redis.rdb

# File backup
tar -czf files_backup.tar.gz /var/lib/secure-gate/files/
```

#### Recovery Procedures
```bash
# Database recovery
psql -h localhost -U postgres secure_gate < backup.sql

# Redis recovery
redis-cli --rdb /backup/redis.rdb

# File recovery
tar -xzf files_backup.tar.gz -C /
```

## Security

### Authentication and Authorization

#### JWT Tokens
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry
- **Algorithm**: HS256
- **Secret**: Environment variable

#### Role-Based Access Control
- **Admin**: Full system access
- **Guard**: Check-in/out operations
- **Resident**: Visitor management
- **Visitor**: Limited access

### Data Protection

#### Encryption
- **At Rest**: AES-256 encryption for sensitive data
- **In Transit**: TLS 1.2+ for all communications
- **Passwords**: Argon2 hashing
- **Cache**: AES-256-CBC encryption

#### Compliance
- **GDPR**: Data subject rights, consent management
- **Kenya DPA**: Local data protection compliance
- **Audit Logging**: Comprehensive activity tracking
- **Data Retention**: Configurable retention policies

### Security Headers

#### HTTP Security Headers
```http
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

#### Rate Limiting
- **API Endpoints**: 100 requests/minute
- **Authentication**: 10 requests/minute
- **General**: 200 requests/minute
- **Burst Handling**: 20 requests burst

### Security Monitoring

#### Audit Logging
- **User Actions**: Login, logout, data access
- **System Events**: Configuration changes, errors
- **Security Events**: Failed logins, suspicious activity
- **Compliance Events**: Data access, consent changes

#### Security Alerts
- **Failed Login Attempts**: Multiple failed logins
- **Suspicious Activity**: Unusual access patterns
- **System Compromise**: Security violations
- **Data Breaches**: Unauthorized data access

## Performance

### Performance Optimization

#### Database Optimization
- **Indexing**: Comprehensive index strategy
- **Connection Pooling**: Optimized connection management
- **Query Optimization**: Slow query detection and optimization
- **Caching**: Redis-based query result caching

#### Application Optimization
- **Code Splitting**: Frontend code splitting
- **Lazy Loading**: Component lazy loading
- **Compression**: Gzip compression for responses
- **CDN**: Content delivery network integration

#### Caching Strategy
- **Redis Cache**: Session and data caching
- **Browser Cache**: Static asset caching
- **CDN Cache**: Global content caching
- **Database Cache**: Query result caching

### Performance Monitoring

#### Metrics Collection
- **Response Time**: API response times
- **Throughput**: Requests per second
- **Error Rate**: Error percentage
- **Resource Usage**: CPU, memory, disk usage

#### Performance Targets
- **API Response**: < 200ms average
- **Page Load**: < 2 seconds
- **Database Queries**: < 100ms average
- **Cache Hit Rate**: > 80%

### Load Balancing

#### Load Balancing Algorithms
- **Round Robin**: Even distribution
- **Least Connections**: Route to least busy server
- **Weighted Round Robin**: Weight-based distribution
- **IP Hash**: Session affinity
- **Least Response Time**: Performance-based routing

#### Health Checks
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Failure Threshold**: 3 consecutive failures
- **Recovery Threshold**: 2 consecutive successes

## Troubleshooting

### Common Issues

#### Application Issues
- **Build Failures**: Check Node.js version and dependencies
- **Database Connection**: Verify database credentials and connectivity
- **Redis Connection**: Check Redis server status
- **Email/SMS**: Verify SMTP and Twilio configuration

#### Performance Issues
- **Slow Response**: Check database queries and indexes
- **High Memory Usage**: Monitor memory leaks and garbage collection
- **Cache Issues**: Check Redis connectivity and configuration
- **Load Balancing**: Verify server health and configuration

#### Security Issues
- **Authentication Failures**: Check JWT configuration and secrets
- **Rate Limiting**: Verify rate limit configuration
- **CORS Issues**: Check CORS configuration
- **SSL/TLS**: Verify certificate configuration

### Debug Commands

#### Application Debug
```bash
# Check application status
curl http://localhost:5000/health

# Check database connection
psql -h localhost -U postgres -d secure_gate -c "SELECT 1;"

# Check Redis connection
redis-cli ping

# Check logs
tail -f /var/log/secure-gate/app.log
```

#### Performance Debug
```bash
# Check performance metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/performance/metrics

# Check cache status
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/performance/cache

# Check load balancer status
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/load-balancer/status
```

#### System Debug
```bash
# Check Docker containers
docker ps
docker logs <container_name>

# Check Nginx status
nginx -t
systemctl status nginx

# Check system resources
top
htop
df -h
```

### Error Codes

#### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **429**: Too Many Requests
- **500**: Internal Server Error
- **502**: Bad Gateway
- **503**: Service Unavailable

#### Application Error Codes
- **AUTH_001**: Invalid credentials
- **AUTH_002**: Token expired
- **AUTH_003**: Insufficient permissions
- **VISITOR_001**: Visitor not found
- **VISITOR_002**: Invalid QR code
- **VISITOR_003**: OTP expired
- **SYSTEM_001**: Database connection failed
- **SYSTEM_002**: Cache connection failed

## Contributing

### Development Setup

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Run tests**
   ```bash
   npm test
   ```
5. **Make your changes**
6. **Commit your changes**
   ```bash
   git commit -m "Add your feature"
   ```
7. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Create a Pull Request**

### Code Standards

#### JavaScript/TypeScript
- **ESLint**: Use provided ESLint configuration
- **Prettier**: Use provided Prettier configuration
- **TypeScript**: Use TypeScript for type safety
- **Comments**: Document complex functions and classes

#### React Components
- **Functional Components**: Use functional components with hooks
- **Props Interface**: Define TypeScript interfaces for props
- **Error Boundaries**: Implement error boundaries for error handling
- **Accessibility**: Follow WCAG guidelines

#### Backend Code
- **Async/Await**: Use async/await instead of callbacks
- **Error Handling**: Implement proper error handling
- **Validation**: Validate all inputs
- **Logging**: Use structured logging

### Testing

#### Unit Tests
```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

#### Performance Tests
```bash
# Run performance tests
npm run test:performance

# Run load tests
npm run test:load
```

### Documentation

#### Code Documentation
- **JSDoc**: Document all functions and classes
- **README**: Update README for new features
- **API Docs**: Update API documentation
- **Comments**: Add inline comments for complex logic

#### System Documentation
- **Architecture**: Document system architecture changes
- **Deployment**: Update deployment procedures
- **Configuration**: Document configuration options
- **Troubleshooting**: Add troubleshooting steps

## Support

### Getting Help

#### Documentation
- **System Documentation**: This document
- **API Documentation**: `/docs/api/`
- **Deployment Guide**: `/docs/deployment/`
- **Troubleshooting**: `/docs/troubleshooting/`

#### Community
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Wiki**: Community-maintained documentation

#### Professional Support
- **Email**: support@securegate.com
- **Phone**: +1-800-SECURE-GATE
- **Hours**: 24/7 support available

### Reporting Issues

#### Bug Reports
1. **Check existing issues**
2. **Create a new issue**
3. **Provide detailed information**
   - System information
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Logs and screenshots

#### Feature Requests
1. **Check existing requests**
2. **Create a new issue**
3. **Describe the feature**
   - Use case
   - Benefits
   - Implementation ideas
   - Priority

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Acknowledgments

- **React Team**: For the amazing React framework
- **Express.js Team**: For the robust backend framework
- **PostgreSQL Team**: For the reliable database
- **Docker Team**: For containerization
- **Nginx Team**: For the load balancer
- **Community**: For contributions and feedback

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: Secure Gate Development Team
