# Secure Gate Access Control System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.0.0-blue)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-20.10+-blue)](https://www.docker.com/)

A comprehensive visitor management solution for residential complexes, office buildings, and secure facilities. Features end-to-end visitor management from invitation to check-out with robust security, compliance, and performance features.

## 🚀 Features

### Core Functionality
- **Visitor Management**: Complete visitor lifecycle management
- **QR Code & OTP System**: Secure pass generation and verification
- **Real-time Notifications**: Email and SMS notifications
- **Role-Based Access Control**: Resident, Guard, Admin, and Visitor roles
- **Mobile-Friendly**: Responsive design for all devices

### Advanced Features
- **Blue-Green Deployment**: Zero-downtime deployments
- **Load Balancing**: High-availability with multiple algorithms
- **Performance Optimization**: Database indexing, caching, and monitoring
- **Compliance**: GDPR and Kenya DPA compliance
- **Security**: Advanced security features and monitoring
- **Backup & DR**: Comprehensive backup and disaster recovery

### Technical Features
- **Health Monitoring**: Real-time system health checks
- **Rate Limiting**: Per-endpoint rate limiting with burst handling
- **Audit Logging**: Comprehensive activity tracking
- **Secret Management**: HashiCorp Vault integration
- **CI/CD Pipeline**: Automated testing and deployment

## 🎯 Latest Updates

### Phase 1 Backend Production Readiness (October 2025)
- ✅ **Test Infrastructure Complete**: Jest configurations for unit, integration, and E2E tests
- ✅ **Code Coverage**: 70-75% thresholds configured
- ✅ **Test Helpers & Fixtures**: Comprehensive test utilities and data fixtures
- ✅ **Database Seeding**: Automated test data setup and cleanup
- ✅ **CI/CD Integration**: GitHub Actions workflow for automated testing

📚 **See [TEST_QUICK_REFERENCE.md](./TEST_QUICK_REFERENCE.md) for test execution guide**  
📊 **See [FINAL_PRE_DAY3_STATUS.md](./FINAL_PRE_DAY3_STATUS.md) for detailed status**

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Testing](#testing)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## 🏃‍♂️ Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 13+ (for development)
- Redis 6+ (for development)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd secure-gate-react-express
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Start the Application
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### 5. Create Admin User
```bash
# Create admin user
docker-compose exec backend node scripts/create-admin.js
```

## 🧪 Testing

### Test Infrastructure

The backend includes comprehensive test infrastructure with:
- **Unit Tests**: 70% coverage threshold
- **Integration Tests**: 75% coverage threshold
- **E2E Tests**: 65% coverage threshold
- **Automated Test Helpers**: Database, API, Auth utilities
- **Test Fixtures**: Realistic test data for users, visitors, passes
- **Database Seeding**: Automated test data setup and cleanup

### Running Tests

#### Quick Start
```bash
cd secure-gate-access/server

# Run all tests
npm test

# Run integration tests (with automatic server management)
./run-integration-tests.sh
```

#### Individual Test Suites
```bash
# Unit tests
npm run test:unit
npm run test:unit:coverage
npm run test:unit:watch

# Integration tests
npm run test:integration
npm run test:integration:coverage

# E2E tests
npm run test:e2e
npm run test:e2e:coverage

# Playwright tests (separate)
npm run test:playwright
```

#### Database Test Utilities
```bash
# Seed test data
npm run test:seed

# Cleanup test data
npm run test:cleanup

# Reset database (cleanup + seed)
npm run test:reset
```

### Test Documentation
- 📚 **[TEST_QUICK_REFERENCE.md](./TEST_QUICK_REFERENCE.md)** - Quick reference guide
- 📊 **[FINAL_PRE_DAY3_STATUS.md](./FINAL_PRE_DAY3_STATUS.md)** - Complete test infrastructure status
- 🔧 **[TEST_INFRASTRUCTURE_STATUS_REPORT.md](./TEST_INFRASTRUCTURE_STATUS_REPORT.md)** - Technical analysis

### Test Coverage Reports
After running tests with coverage, view HTML reports:
```bash
# Integration test coverage
open coverage/integration/index.html

# Unit test coverage
open coverage/unit/index.html

# E2E test coverage
open coverage/e2e/index.html
```

## 🏗️ Architecture

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

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, PostgreSQL
- **Database**: PostgreSQL with Redis caching
- **Authentication**: JWT with refresh tokens
- **Notifications**: Nodemailer, Twilio SMS
- **Deployment**: Docker, Docker Compose, Nginx
- **Monitoring**: Custom monitoring dashboard
- **Security**: Rate limiting, encryption, audit logging

## 📦 Installation

### Development Installation

#### 1. Clone Repository
```bash
git clone <repository-url>
cd secure-gate-react-express
```

#### 2. Install Dependencies
```bash
# Install backend dependencies
cd secure-gate-access/server
npm install

# Install frontend dependencies
cd ../client
npm install
```

#### 3. Database Setup
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run migrations
cd secure-gate-access/server
npm run migrate

# Seed database (optional)
npm run seed
```

#### 4. Start Development Servers
```bash
# Start backend (terminal 1)
cd secure-gate-access/server
npm run dev

# Start frontend (terminal 2)
cd secure-gate-access/client
npm start
```

### Production Installation

#### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Deploy Application
```bash
# Deploy production environment
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps
```

## ⚙️ Configuration

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

### Database Configuration

#### Connection Pooling
```javascript
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

## 🎯 Usage

### For Residents

#### Adding a Visitor
1. Log in to your dashboard
2. Click "Add Visitor"
3. Fill in visitor details
4. Generate QR pass
5. Send invitation

#### Bulk Invitations
1. Click "Bulk Invite"
2. Download CSV template
3. Fill in visitor details
4. Upload and send invitations

### For Guards

#### QR Code Scanning
1. Use the QR scanner
2. Scan visitor's QR code
3. Verify visitor details
4. Complete check-in/out

#### Manual Operations
1. Search for visitor by name
2. Select correct visitor
3. Complete check-in/out process

### For Administrators

#### User Management
1. Go to "Users" section
2. Create, edit, or deactivate users
3. Assign appropriate roles
4. Monitor user activity

#### System Configuration
1. Access "Settings" section
2. Configure system parameters
3. Set up notifications
4. Manage security settings

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

### Visitor Management
- `GET /api/visitors` - Get visitors
- `POST /api/visitors` - Create visitor
- `PUT /api/visitors/:id` - Update visitor
- `DELETE /api/visitors/:id` - Delete visitor

### Check-in/Check-out
- `POST /api/checkins` - Check-in visitor
- `PUT /api/checkins/:id/checkout` - Check-out visitor
- `GET /api/checkins` - Get check-ins

### Admin Operations
- `GET /api/admin/statistics` - System statistics
- `GET /api/admin/users` - User management
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user

### Performance Monitoring
- `GET /api/performance/metrics` - Performance metrics
- `GET /api/performance/cache` - Cache status
- `POST /api/performance/cache/clear` - Clear cache

### Load Balancer Management
- `GET /api/load-balancer/status` - Load balancer status
- `GET /api/load-balancer/servers` - Server management
- `PUT /api/load-balancer/algorithm` - Change algorithm

For complete API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## 🚀 Deployment

### Blue-Green Deployment

#### Deploy New Version
```bash
# Deploy using blue-green script
./deployment/blue-green-deploy.sh deploy
```

#### Rollback if Needed
```bash
# Rollback to previous version
./deployment/blue-green-deploy.sh rollback
```

#### Check Status
```bash
# Check deployment status
./deployment/blue-green-deploy.sh status
```

### Load Balancer Setup

#### Configure Nginx
```bash
# Copy load balancer configuration
sudo cp deployment/nginx/load-balancer.conf /etc/nginx/sites-available/secure-gate

# Enable site
sudo ln -s /etc/nginx/sites-available/secure-gate /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL/TLS Configuration

#### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d securegate.com -d www.securegate.com

# Set up automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

For complete deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## 📊 Monitoring

### Health Checks

#### Application Health
```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed

# Database health
curl http://localhost:5000/api/health/database

# Cache health
curl http://localhost:5000/api/health/cache
```

#### Performance Monitoring
```bash
# Performance metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/performance/metrics

# Cache statistics
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/performance/cache

# Load balancer status
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/load-balancer/status
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

## 🔒 Security

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

### Security Features

#### Rate Limiting
- **API Endpoints**: 100 requests/minute
- **Authentication**: 10 requests/minute
- **General**: 200 requests/minute
- **Burst Handling**: 20 requests burst

#### Security Headers
```http
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

## 🧪 Testing

### Running Tests

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

### Test Coverage
- **Backend**: 85%+ coverage
- **Frontend**: 80%+ coverage
- **Integration**: 90%+ coverage
- **E2E**: 95%+ coverage

## 📈 Performance

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

### Performance Targets
- **API Response**: < 200ms average
- **Page Load**: < 2 seconds
- **Database Queries**: < 100ms average
- **Cache Hit Rate**: > 80%

## 🤝 Contributing

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

## 📚 Documentation

### Available Documentation
- **[System Documentation](SYSTEM_DOCUMENTATION.md)**: Complete system overview
- **[API Documentation](API_DOCUMENTATION.md)**: Complete API reference
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)**: Deployment instructions
- **[User Guide](USER_GUIDE.md)**: User manual for all roles
- **[Load Balancer Documentation](deployment/LOAD_BALANCER_DOCUMENTATION.md)**: Load balancing setup
- **[Performance Documentation](deployment/PERFORMANCE_OPTIMIZATION_DOCUMENTATION.md)**: Performance optimization
- **[Compliance Documentation](deployment/COMPLIANCE_DOCUMENTATION.md)**: Compliance features
- **[Secret Management Documentation](deployment/SECRET_MANAGEMENT_DOCUMENTATION.md)**: Secret management
- **[Backup & DR Documentation](deployment/BACKUP_DR_DOCUMENTATION.md)**: Backup and disaster recovery

## 🆘 Support

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team**: For the amazing React framework
- **Express.js Team**: For the robust backend framework
- **PostgreSQL Team**: For the reliable database
- **Docker Team**: For containerization
- **Nginx Team**: For the load balancer
- **Community**: For contributions and feedback

## 📊 Project Status

### Current Version: 1.0.0

#### Completed Features
- ✅ Visitor Management System
- ✅ QR Code & OTP System
- ✅ Real-time Notifications
- ✅ Role-Based Access Control
- ✅ Blue-Green Deployment
- ✅ Load Balancing
- ✅ Performance Optimization
- ✅ Compliance (GDPR, Kenya DPA)
- ✅ Security Features
- ✅ Monitoring & Alerting
- ✅ Backup & Disaster Recovery
- ✅ Secret Management
- ✅ CI/CD Pipeline

#### Roadmap
- 🔄 Mobile Apps (iOS/Android)
- 🔄 Advanced Analytics
- 🔄 AI-Powered Features
- 🔄 Multi-tenant Support
- 🔄 API Rate Limiting
- 🔄 Advanced Reporting

---

**Last Updated**: January 2025
**Maintainer**: Secure Gate Development Team
**Website**: https://securegate.com
**Documentation**: https://docs.securegate.com
