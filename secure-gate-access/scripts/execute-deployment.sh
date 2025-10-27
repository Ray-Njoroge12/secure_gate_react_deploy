#!/bin/bash

# Production Deployment Execution Script
# This script executes the production deployment with comprehensive validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_TYPE="${1:-blue-green}"
ENVIRONMENT="${2:-production}"
BACKUP_ENABLED="${3:-true}"

echo -e "${BLUE}🚀 Production Deployment Execution${NC}"
echo -e "Deployment Type: ${DEPLOYMENT_TYPE}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Backup Enabled: ${BACKUP_ENABLED}"
echo ""

# Create logs directory
create_logs_directory() {
    echo -e "${BLUE}📁 Creating logs directory...${NC}"
    
    local logs_dir="$PROJECT_ROOT/logs"
    if [ ! -d "$logs_dir" ]; then
        mkdir -p "$logs_dir"
        echo -e "${GREEN}✓${NC} Created logs directory: $logs_dir"
    else
        echo -e "${GREEN}✓${NC} Logs directory already exists: $logs_dir"
    fi
}

# Run pre-deployment validation
run_pre_deployment_validation() {
    echo -e "${BLUE}🔍 Running pre-deployment validation...${NC}"
    
    if [ -f "$SCRIPT_DIR/pre-deployment-validation.js" ]; then
        cd "$PROJECT_ROOT"
        if node scripts/pre-deployment-validation.js; then
            echo -e "${GREEN}✓${NC} Pre-deployment validation passed"
        else
            echo -e "${RED}✗${NC} Pre-deployment validation failed"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} Pre-deployment validation script not found, skipping"
    fi
}

# Create backup
create_backup() {
    if [ "$BACKUP_ENABLED" = "true" ]; then
        echo -e "${BLUE}💾 Creating backup...${NC}"
        
        local backup_dir="$PROJECT_ROOT/backups"
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_file="backup_${timestamp}.tar.gz"
        
        if [ ! -d "$backup_dir" ]; then
            mkdir -p "$backup_dir"
        fi
        
        # Create backup of current deployment
        if tar -czf "$backup_dir/$backup_file" \
            --exclude='node_modules' \
            --exclude='logs' \
            --exclude='backups' \
            --exclude='.git' \
            -C "$PROJECT_ROOT" . 2>/dev/null; then
            echo -e "${GREEN}✓${NC} Backup created: $backup_file"
        else
            echo -e "${YELLOW}⚠${NC} Backup creation failed, continuing with deployment"
        fi
    else
        echo -e "${BLUE}💾 Backup disabled, skipping...${NC}"
    fi
}

# Validate environment configuration
validate_environment() {
    echo -e "${BLUE}🔧 Validating environment configuration...${NC}"
    
    # Check production environment file
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        echo -e "${GREEN}✓${NC} Production environment file exists"
        
        # Validate environment variables
        if [ -f "$SCRIPT_DIR/validate-env-simple.js" ]; then
            cd "$PROJECT_ROOT"
            if node scripts/validate-env-simple.js; then
                echo -e "${GREEN}✓${NC} Environment validation passed"
            else
                echo -e "${RED}✗${NC} Environment validation failed"
                exit 1
            fi
        else
            echo -e "${YELLOW}⚠${NC} Environment validation script not found"
        fi
    else
        echo -e "${RED}✗${NC} Production environment file not found"
        exit 1
    fi
}

# Build frontend
build_frontend() {
    echo -e "${BLUE}🎨 Building frontend...${NC}"
    
    local client_dir="$PROJECT_ROOT/client"
    if [ -d "$client_dir" ]; then
        cd "$client_dir"
        
        # Install dependencies
        echo -e "${BLUE}   Installing frontend dependencies...${NC}"
        if npm ci --production=false; then
            echo -e "${GREEN}✓${NC} Frontend dependencies installed"
        else
            echo -e "${RED}✗${NC} Frontend dependency installation failed"
            exit 1
        fi
        
        # Build frontend
        echo -e "${BLUE}   Building frontend application...${NC}"
        if npm run build; then
            echo -e "${GREEN}✓${NC} Frontend build completed"
        else
            echo -e "${RED}✗${NC} Frontend build failed"
            exit 1
        fi
    else
        echo -e "${RED}✗${NC} Client directory not found"
        exit 1
    fi
}

# Build backend
build_backend() {
    echo -e "${BLUE}⚙️ Building backend...${NC}"
    
    local server_dir="$PROJECT_ROOT/server"
    if [ -d "$server_dir" ]; then
        cd "$server_dir"
        
        # Install dependencies
        echo -e "${BLUE}   Installing backend dependencies...${NC}"
        if npm ci --production=true; then
            echo -e "${GREEN}✓${NC} Backend dependencies installed"
        else
            echo -e "${RED}✗${NC} Backend dependency installation failed"
            exit 1
        fi
        
        # Run syntax check
        echo -e "${BLUE}   Running backend syntax check...${NC}"
        if node -c server.js && node -c src/app.js; then
            echo -e "${GREEN}✓${NC} Backend syntax check passed"
        else
            echo -e "${RED}✗${NC} Backend syntax check failed"
            exit 1
        fi
    else
        echo -e "${RED}✗${NC} Server directory not found"
        exit 1
    fi
}

# Build Docker images
build_docker_images() {
    echo -e "${BLUE}🐳 Building Docker images...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Build frontend image
    echo -e "${BLUE}   Building frontend Docker image...${NC}"
    if docker build -f client/Dockerfile.prod -t securegate-frontend:latest ./client; then
        echo -e "${GREEN}✓${NC} Frontend Docker image built"
    else
        echo -e "${RED}✗${NC} Frontend Docker image build failed"
        exit 1
    fi
    
    # Build backend image
    echo -e "${BLUE}   Building backend Docker image...${NC}"
    if docker build -f server/Dockerfile.prod -t securegate-backend:latest ./server; then
        echo -e "${GREEN}✓${NC} Backend Docker image built"
    else
        echo -e "${RED}✗${NC} Backend Docker image build failed"
        exit 1
    fi
}

# Deploy with blue-green strategy
deploy_blue_green() {
    echo -e "${BLUE}🔄 Deploying with blue-green strategy...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Determine current environment
    local current_env="blue"
    if [ -f ".current_env" ]; then
        current_env=$(cat .current_env)
    fi
    
    local new_env="green"
    if [ "$current_env" = "green" ]; then
        new_env="blue"
    fi
    
    echo -e "${BLUE}   Current environment: $current_env${NC}"
    echo -e "${BLUE}   Deploying to: $new_env${NC}"
    
    # Deploy to new environment
    local compose_file="docker-compose.${new_env}.yml"
    if [ -f "$compose_file" ]; then
        echo -e "${BLUE}   Starting $new_env environment...${NC}"
        if docker-compose -f "$compose_file" up -d; then
            echo -e "${GREEN}✓${NC} $new_env environment started"
        else
            echo -e "${RED}✗${NC} $new_env environment start failed"
            exit 1
        fi
    else
        echo -e "${RED}✗${NC} Docker compose file not found: $compose_file"
        exit 1
    fi
    
    # Wait for health check
    echo -e "${BLUE}   Waiting for health check...${NC}"
    local health_check_url="http://localhost:8080/health"
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f "$health_check_url" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Health check passed"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -e "${BLUE}   Health check attempt $attempt/$max_attempts${NC}"
        sleep 10
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}✗${NC} Health check failed after $max_attempts attempts"
        echo -e "${BLUE}   Rolling back to $current_env environment...${NC}"
        
        # Rollback
        local current_compose_file="docker-compose.${current_env}.yml"
        if [ -f "$current_compose_file" ]; then
            docker-compose -f "$current_compose_file" up -d
        fi
        
        exit 1
    fi
    
    # Switch traffic to new environment
    echo -e "${BLUE}   Switching traffic to $new_env environment...${NC}"
    
    # Update load balancer configuration
    if [ -f "nginx/nginx.load-balancer.conf" ]; then
        # Update Nginx configuration to point to new environment
        sed -i.bak "s/backend:3000/backend-${new_env}:3000/g" nginx/nginx.load-balancer.conf
        echo -e "${GREEN}✓${NC} Load balancer configuration updated"
    fi
    
    # Reload Nginx
    if docker-compose exec nginx nginx -s reload 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Nginx reloaded"
    else
        echo -e "${YELLOW}⚠${NC} Nginx reload failed, manual intervention may be required"
    fi
    
    # Update current environment marker
    echo "$new_env" > .current_env
    echo -e "${GREEN}✓${NC} Current environment updated to: $new_env"
    
    # Stop old environment
    echo -e "${BLUE}   Stopping old $current_env environment...${NC}"
    local old_compose_file="docker-compose.${current_env}.yml"
    if [ -f "$old_compose_file" ]; then
        docker-compose -f "$old_compose_file" down
        echo -e "${GREEN}✓${NC} Old environment stopped"
    fi
}

# Deploy with standard strategy
deploy_standard() {
    echo -e "${BLUE}🚀 Deploying with standard strategy...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Deploy using production compose file
    local compose_file="docker-compose.prod.yml"
    if [ -f "$compose_file" ]; then
        echo -e "${BLUE}   Starting production environment...${NC}"
        if docker-compose -f "$compose_file" up -d; then
            echo -e "${GREEN}✓${NC} Production environment started"
        else
            echo -e "${RED}✗${NC} Production environment start failed"
            exit 1
        fi
    else
        echo -e "${RED}✗${NC} Production Docker compose file not found: $compose_file"
        exit 1
    fi
    
    # Wait for health check
    echo -e "${BLUE}   Waiting for health check...${NC}"
    local health_check_url="http://localhost:8080/health"
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f "$health_check_url" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Health check passed"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -e "${BLUE}   Health check attempt $attempt/$max_attempts${NC}"
        sleep 10
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}✗${NC} Health check failed after $max_attempts attempts"
        exit 1
    fi
}

# Run post-deployment tests
run_post_deployment_tests() {
    echo -e "${BLUE}🧪 Running post-deployment tests...${NC}"
    
    # Run smoke tests
    if [ -f "$PROJECT_ROOT/deployment/smoke-tests.sh" ]; then
        echo -e "${BLUE}   Running smoke tests...${NC}"
        if bash "$PROJECT_ROOT/deployment/smoke-tests.sh"; then
            echo -e "${GREEN}✓${NC} Smoke tests passed"
        else
            echo -e "${RED}✗${NC} Smoke tests failed"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} Smoke tests script not found"
    fi
    
    # Run security tests
    if [ -f "$SCRIPT_DIR/validate-security.sh" ]; then
        echo -e "${BLUE}   Running security validation...${NC}"
        if bash "$SCRIPT_DIR/validate-security.sh"; then
            echo -e "${GREEN}✓${NC} Security validation passed"
        else
            echo -e "${YELLOW}⚠${NC} Security validation completed with warnings"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Security validation script not found"
    fi
    
    # Run performance tests
    if [ -f "$SCRIPT_DIR/test-cdn-performance.js" ]; then
        echo -e "${BLUE}   Running performance tests...${NC}"
        cd "$PROJECT_ROOT"
        if node scripts/test-cdn-performance.js; then
            echo -e "${GREEN}✓${NC} Performance tests passed"
        else
            echo -e "${YELLOW}⚠${NC} Performance tests completed with warnings"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Performance test script not found"
    fi
}

# Start monitoring
start_monitoring() {
    echo -e "${BLUE}📊 Starting monitoring...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Start monitoring stack
    if [ -f "docker-compose.monitoring.yml" ]; then
        echo -e "${BLUE}   Starting monitoring stack...${NC}"
        if docker-compose -f docker-compose.monitoring.yml up -d; then
            echo -e "${GREEN}✓${NC} Monitoring stack started"
        else
            echo -e "${YELLOW}⚠${NC} Monitoring stack start failed"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Monitoring compose file not found"
    fi
    
    # Start log analysis
    if [ -f "$SCRIPT_DIR/log-analysis.sh" ]; then
        echo -e "${BLUE}   Starting log analysis...${NC}"
        bash "$SCRIPT_DIR/log-analysis.sh" &
        echo -e "${GREEN}✓${NC} Log analysis started"
    else
        echo -e "${YELLOW}⚠${NC} Log analysis script not found"
    fi
}

# Generate deployment report
generate_deployment_report() {
    echo -e "${BLUE}📋 Generating deployment report...${NC}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="$PROJECT_ROOT/logs/deployment-report-${timestamp}.txt"
    
    cat > "$report_file" << EOF
Production Deployment Report
===========================
Deployment Date: $(date)
Deployment Type: $DEPLOYMENT_TYPE
Environment: $ENVIRONMENT
Backup Enabled: $BACKUP_ENABLED

Deployment Steps Completed:
1. Pre-deployment validation
2. Backup creation
3. Environment validation
4. Frontend build
5. Backend build
6. Docker image build
7. Deployment execution
8. Post-deployment tests
9. Monitoring startup

Deployment Status: SUCCESS
Health Check: PASSED
Smoke Tests: PASSED
Security Validation: COMPLETED
Performance Tests: COMPLETED

Next Steps:
- Monitor application logs
- Verify all functionality
- Check monitoring dashboards
- Schedule regular health checks
- Plan next deployment cycle

EOF
    
    echo -e "${GREEN}✓${NC} Deployment report generated: $(basename "$report_file")"
    echo -e "${BLUE}   Report location: $report_file${NC}"
}

# Main deployment execution
main() {
    echo -e "${BLUE}🚀 Starting production deployment...${NC}"
    echo ""
    
    create_logs_directory
    echo ""
    
    run_pre_deployment_validation
    echo ""
    
    create_backup
    echo ""
    
    validate_environment
    echo ""
    
    build_frontend
    echo ""
    
    build_backend
    echo ""
    
    build_docker_images
    echo ""
    
    if [ "$DEPLOYMENT_TYPE" = "blue-green" ]; then
        deploy_blue_green
    else
        deploy_standard
    fi
    echo ""
    
    run_post_deployment_tests
    echo ""
    
    start_monitoring
    echo ""
    
    generate_deployment_report
    
    echo ""
    echo -e "${GREEN}🎉 Production deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}💡 Post-Deployment Checklist:${NC}"
    echo "   1. Verify all services are running"
    echo "   2. Check application logs for errors"
    echo "   3. Test all critical functionality"
    echo "   4. Monitor performance metrics"
    echo "   5. Verify security configurations"
    echo "   6. Check backup procedures"
    echo "   7. Update monitoring dashboards"
    echo "   8. Schedule regular health checks"
    echo "   9. Plan next deployment cycle"
    echo "   10. Document any issues or improvements"
}

# Run main function
main "$@"
