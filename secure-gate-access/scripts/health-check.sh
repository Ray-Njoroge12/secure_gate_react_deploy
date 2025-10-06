#!/bin/bash

# Production Health Check Script for Secure Gate Access Control System
# This script performs comprehensive health checks on all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
TIMEOUT=30
RETRIES=3

# Health check endpoints
BACKEND_URL="http://localhost:5000/api/health"
FRONTEND_URL="http://localhost:3000/health"
DATABASE_URL="postgresql://secure_gate_user:secure_gate_password@localhost:5432/secure_gate"
REDIS_URL="redis://localhost:6379"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# Check if service is running
check_service_running() {
    local service_name=$1
    local container_name=$2
    
    if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        success "$service_name is running"
        return 0
    else
        error "$service_name is not running"
        return 1
    fi
}

# Check HTTP endpoint
check_http_endpoint() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    log "Checking $service_name at $url..."
    
    for i in $(seq 1 $RETRIES); do
        if response=$(curl -s -w "%{http_code}" -o /dev/null "$url" --max-time $TIMEOUT 2>/dev/null); then
            if [[ "$response" == "$expected_status" ]]; then
                success "$service_name is healthy (HTTP $response)"
                return 0
            else
                warning "$service_name returned HTTP $response (expected $expected_status)"
            fi
        else
            warning "$service_name check failed (attempt $i/$RETRIES)"
        fi
        
        if [[ $i -lt $RETRIES ]]; then
            sleep 5
        fi
    done
    
    error "$service_name is unhealthy"
    return 1
}

# Check database connection
check_database() {
    log "Checking database connection..."
    
    if command -v psql &> /dev/null; then
        if PGPASSWORD=secure_gate_password psql -h localhost -p 5432 -U secure_gate_user -d secure_gate -c "SELECT 1;" > /dev/null 2>&1; then
            success "Database connection successful"
            return 0
        else
            error "Database connection failed"
            return 1
        fi
    else
        warning "psql not available, skipping database connection test"
        return 0
    fi
}

# Check Redis connection
check_redis() {
    log "Checking Redis connection..."
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
            success "Redis connection successful"
            return 0
        else
            error "Redis connection failed"
            return 1
        fi
    else
        warning "redis-cli not available, skipping Redis connection test"
        return 0
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    local threshold=80
    
    if [[ $usage -lt $threshold ]]; then
        success "Disk usage is ${usage}% (threshold: ${threshold}%)"
        return 0
    else
        warning "Disk usage is ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
}

# Check memory usage
check_memory() {
    log "Checking memory usage..."
    
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    local threshold=85
    
    if [[ $usage -lt $threshold ]]; then
        success "Memory usage is ${usage}% (threshold: ${threshold}%)"
        return 0
    else
        warning "Memory usage is ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
}

# Check Docker containers
check_docker_containers() {
    log "Checking Docker containers..."
    
    local containers=("secure-gate-postgres-prod" "secure-gate-redis-prod" "secure-gate-backend-prod" "secure-gate-frontend-prod" "secure-gate-nginx-prod")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        if ! check_service_running "$container" "$container"; then
            all_healthy=false
        fi
    done
    
    if $all_healthy; then
        success "All Docker containers are running"
        return 0
    else
        error "Some Docker containers are not running"
        return 1
    fi
}

# Check SSL certificates
check_ssl_certificates() {
    log "Checking SSL certificates..."
    
    local cert_file="./nginx/ssl/cert.pem"
    local key_file="./nginx/ssl/key.pem"
    
    if [[ -f "$cert_file" ]] && [[ -f "$key_file" ]]; then
        if openssl x509 -in "$cert_file" -text -noout > /dev/null 2>&1; then
            local expiry=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
            success "SSL certificates are valid (expires: $expiry)"
            return 0
        else
            error "SSL certificate is invalid"
            return 1
        fi
    else
        error "SSL certificates not found"
        return 1
    fi
}

# Check logs for errors
check_logs() {
    log "Checking recent logs for errors..."
    
    local error_count=0
    
    # Check Docker logs for errors
    if docker-compose -f "$COMPOSE_FILE" logs --tail=100 2>&1 | grep -i "error\|exception\|fatal" | wc -l | read count; then
        error_count=$((error_count + count))
    fi
    
    if [[ $error_count -eq 0 ]]; then
        success "No recent errors found in logs"
        return 0
    else
        warning "Found $error_count recent errors in logs"
        return 1
    fi
}

# Generate health report
generate_report() {
    local overall_status="HEALTHY"
    local issues=()
    
    log "Generating health report..."
    
    # Check all components
    check_docker_containers || { overall_status="UNHEALTHY"; issues+=("Docker containers") }
    check_http_endpoint "Backend API" "$BACKEND_URL" || { overall_status="UNHEALTHY"; issues+=("Backend API") }
    check_http_endpoint "Frontend" "$FRONTEND_URL" || { overall_status="UNHEALTHY"; issues+=("Frontend") }
    check_database || { overall_status="UNHEALTHY"; issues+=("Database") }
    check_redis || { overall_status="UNHEALTHY"; issues+=("Redis") }
    check_ssl_certificates || { overall_status="UNHEALTHY"; issues+=("SSL certificates") }
    check_disk_space || { overall_status="WARNING"; issues+=("Disk space") }
    check_memory || { overall_status="WARNING"; issues+=("Memory usage") }
    check_logs || { overall_status="WARNING"; issues+=("Log errors") }
    
    # Display report
    echo ""
    echo "=========================================="
    echo "HEALTH CHECK REPORT"
    echo "=========================================="
    echo "Overall Status: $overall_status"
    echo "Timestamp: $(date)"
    echo ""
    
    if [[ ${#issues[@]} -gt 0 ]]; then
        echo "Issues Found:"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
        echo ""
    fi
    
    echo "Service URLs:"
    echo "  Frontend: https://securegate.com"
    echo "  API: https://api.securegate.com"
    echo "  Health: https://securegate.com/health"
    echo ""
    
    if [[ "$overall_status" == "HEALTHY" ]]; then
        success "All systems are operational"
        return 0
    elif [[ "$overall_status" == "WARNING" ]]; then
        warning "System is operational with warnings"
        return 1
    else
        error "System is unhealthy"
        return 2
    fi
}

# Main function
main() {
    log "Starting comprehensive health check..."
    generate_report
}

# Handle command line arguments
case "${1:-}" in
    "quick")
        log "Running quick health check..."
        check_docker_containers
        check_http_endpoint "Backend API" "$BACKEND_URL"
        check_http_endpoint "Frontend" "$FRONTEND_URL"
        ;;
    "detailed")
        log "Running detailed health check..."
        main
        ;;
    "containers")
        check_docker_containers
        ;;
    "api")
        check_http_endpoint "Backend API" "$BACKEND_URL"
        ;;
    "frontend")
        check_http_endpoint "Frontend" "$FRONTEND_URL"
        ;;
    "database")
        check_database
        ;;
    "redis")
        check_redis
        ;;
    "ssl")
        check_ssl_certificates
        ;;
    "system")
        check_disk_space
        check_memory
        ;;
    "logs")
        check_logs
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no command)  Full health check report"
        echo "  quick         Quick health check (containers + API + frontend)"
        echo "  detailed      Detailed health check report"
        echo "  containers    Check Docker containers only"
        echo "  api           Check backend API only"
        echo "  frontend      Check frontend only"
        echo "  database      Check database connection only"
        echo "  redis         Check Redis connection only"
        echo "  ssl           Check SSL certificates only"
        echo "  system        Check system resources only"
        echo "  logs          Check logs for errors only"
        echo "  help          Show this help message"
        ;;
    *)
        main
        ;;
esac
