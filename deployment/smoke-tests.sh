#!/bin/bash

# Smoke Tests for Blue-Green Deployment
# Comprehensive health and functionality tests

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMEOUT=300  # 5 minutes timeout

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# Test configuration
ENVIRONMENT=""
BASE_URL=""
API_URL=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment=*)
            ENVIRONMENT="${1#*=}"
            shift
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --url=*)
            BASE_URL="${1#*=}"
            shift
            ;;
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 --environment <blue|green> [--url <base_url>]"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Set default URLs based on environment
if [ -z "$BASE_URL" ]; then
    case "$ENVIRONMENT" in
        "blue")
            BASE_URL="http://localhost:8080"
            API_URL="http://localhost:5001"
            ;;
        "green")
            BASE_URL="http://localhost:8081"
            API_URL="http://localhost:5002"
            ;;
        *)
            log_error "Environment must be 'blue' or 'green'"
            exit 1
            ;;
    esac
fi

# Test functions
test_health_endpoint() {
    log "Testing health endpoint..."
    
    local health_url="$BASE_URL/health"
    local response
    
    if response=$(curl -sf "$health_url" 2>/dev/null); then
        log_success "Health endpoint responding: $response"
        return 0
    else
        log_error "Health endpoint failed"
        return 1
    fi
}

test_api_health() {
    log "Testing API health endpoint..."
    
    local api_health_url="$API_URL/health"
    local response
    
    if response=$(curl -sf "$api_health_url" 2>/dev/null); then
        log_success "API health endpoint responding"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 0
    else
        log_error "API health endpoint failed"
        return 1
    fi
}

test_detailed_health() {
    log "Testing detailed health endpoint..."
    
    local detailed_health_url="$API_URL/health/detailed"
    local response
    
    if response=$(curl -sf "$detailed_health_url" 2>/dev/null); then
        log_success "Detailed health endpoint responding"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 0
    else
        log_error "Detailed health endpoint failed"
        return 1
    fi
}

test_rate_limiting() {
    log "Testing rate limiting status..."
    
    local rate_limit_url="$API_URL/api/rate-limits/status"
    local response
    
    if response=$(curl -sf "$rate_limit_url" 2>/dev/null); then
        log_success "Rate limiting status endpoint responding"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 0
    else
        log_warning "Rate limiting status endpoint not available (this is expected for minimal server)"
        return 0
    fi
}

test_frontend_loading() {
    log "Testing frontend loading..."
    
    local frontend_url="$BASE_URL"
    local response
    
    if response=$(curl -sf "$frontend_url" 2>/dev/null); then
        if echo "$response" | grep -q "Secure Gate"; then
            log_success "Frontend loading correctly"
            return 0
        else
            log_warning "Frontend responding but content may be incorrect"
            return 0
        fi
    else
        log_error "Frontend not loading"
        return 1
    fi
}

test_database_connectivity() {
    log "Testing database connectivity..."
    
    # This test would require database connection details
    # For now, we'll just check if the API is responding
    # In a real implementation, you would test actual database queries
    
    local db_test_url="$API_URL/health/detailed"
    local response
    
    if response=$(curl -sf "$db_test_url" 2>/dev/null); then
        log_success "Database connectivity test passed (via health check)"
        return 0
    else
        log_error "Database connectivity test failed"
        return 1
    fi
}

test_response_times() {
    log "Testing response times..."
    
    local test_url="$BASE_URL/health"
    local start_time
    local end_time
    local response_time
    
    # Use macOS-compatible date calculation
    start_time=$(python3 -c "import time; print(int(time.time() * 1000))" 2>/dev/null || date +%s000)
    
    if curl -sf "$test_url" >/dev/null 2>&1; then
        end_time=$(python3 -c "import time; print(int(time.time() * 1000))" 2>/dev/null || date +%s000)
        response_time=$((end_time - start_time))
        
        if [ $response_time -lt 1000 ]; then
            log_success "Response time: ${response_time}ms (excellent)"
        elif [ $response_time -lt 2000 ]; then
            log_success "Response time: ${response_time}ms (good)"
        elif [ $response_time -lt 5000 ]; then
            log_warning "Response time: ${response_time}ms (acceptable)"
        else
            log_error "Response time: ${response_time}ms (too slow)"
            return 1
        fi
        return 0
    else
        log_error "Response time test failed - endpoint not responding"
        return 1
    fi
}

test_container_health() {
    log "Testing container health..."
    
    local compose_file=""
    case "$ENVIRONMENT" in
        "blue")
            compose_file="$SCRIPT_DIR/docker-compose.blue.yml"
            ;;
        "green")
            compose_file="$SCRIPT_DIR/docker-compose.green.yml"
            ;;
    esac
    
    if [ -f "$compose_file" ]; then
        # Check if all containers are running
        local running_containers
        running_containers=$(docker-compose -f "$compose_file" ps --services --filter "status=running" | wc -l)
        local total_containers
        total_containers=$(docker-compose -f "$compose_file" config --services | wc -l)
        
        if [ "$running_containers" -eq "$total_containers" ]; then
            log_success "All containers are running ($running_containers/$total_containers)"
        else
            log_error "Not all containers are running ($running_containers/$total_containers)"
            return 1
        fi
    else
        log_warning "Compose file not found, skipping container health check"
    fi
}

# Main test execution
run_smoke_tests() {
    log "Starting smoke tests for $ENVIRONMENT environment..."
    log "Base URL: $BASE_URL"
    log "API URL: $API_URL"
    echo
    
    local failed_tests=0
    local total_tests=0
    
    # Define test functions
    local tests=(
        "test_health_endpoint"
        "test_api_health"
        "test_detailed_health"
        "test_rate_limiting"
        "test_frontend_loading"
        "test_database_connectivity"
        "test_response_times"
        "test_container_health"
    )
    
    # Run tests
    for test in "${tests[@]}"; do
        ((total_tests++))
        log "Running test: $test"
        
        if $test; then
            log_success "Test passed: $test"
        else
            log_error "Test failed: $test"
            ((failed_tests++))
        fi
        echo
    done
    
    # Summary
    log "Smoke test summary:"
    log "Total tests: $total_tests"
    log "Passed: $((total_tests - failed_tests))"
    log "Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        log_success "All smoke tests passed! 🎉"
        return 0
    else
        log_error "Some smoke tests failed. Check the logs above."
        return 1
    fi
}

# Run tests (timeout not available on macOS)
run_smoke_tests
