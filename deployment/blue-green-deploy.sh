#!/bin/bash

# Blue-Green Deployment Orchestration Script
# Manages zero-downtime deployments between blue and green environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BLUE_COMPOSE="$SCRIPT_DIR/docker-compose.blue.yml"
GREEN_COMPOSE="$SCRIPT_DIR/docker-compose.green.yml"
SMOKE_TESTS="$SCRIPT_DIR/smoke-tests.sh"

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

# Help function
show_help() {
    cat << EOF
Blue-Green Deployment Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    deploy <environment>     Deploy to specified environment (blue|green)
    switch-traffic <to>      Switch traffic to environment (blue|green)
    rollback                 Rollback to previous environment
    status                   Show current deployment status
    health-check <env>       Check health of environment (blue|green)
    cleanup                  Clean up inactive environment

Options:
    --environment <env>      Target environment for deployment
    --target <env>           Target environment for traffic switch
    --force                  Force operation without confirmation
    --no-smoke-tests         Skip smoke tests
    --help                   Show this help message

Examples:
    $0 deploy blue
    $0 deploy green
    $0 switch-traffic green
    $0 rollback
    $0 status
    $0 health-check blue

EOF
}

# Detect current active environment
detect_current_environment() {
    log "Detecting current active environment..."
    
    # Check if blue is running and responding
    if docker-compose -f "$BLUE_COMPOSE" ps | grep -q "Up" && \
       curl -sf http://localhost:8080/health >/dev/null 2>&1; then
        echo "blue"
        return
    fi
    
    # Check if green is running and responding
    if docker-compose -f "$GREEN_COMPOSE" ps | grep -q "Up" && \
       curl -sf http://localhost:8081/health >/dev/null 2>&1; then
        echo "green"
        return
    fi
    
    echo "none"
}

# Deploy to specified environment
deploy_to_environment() {
    local target_env="$1"
    local compose_file=""
    local port=""
    
    case "$target_env" in
        "blue")
            compose_file="$BLUE_COMPOSE"
            port="8080"
            ;;
        "green")
            compose_file="$GREEN_COMPOSE"
            port="8081"
            ;;
        *)
            log_error "Invalid environment: $target_env. Must be 'blue' or 'green'"
            exit 1
            ;;
    esac
    
    log "Deploying to $target_env environment..."
    
    # Stop any existing containers for this environment
    log "Stopping existing $target_env containers..."
    docker-compose -f "$compose_file" down --remove-orphans || true
    
    # Build and start the environment
    log "Building and starting $target_env environment..."
    docker-compose -f "$compose_file" up --build -d
    
    # Wait for services to be ready
    log "Waiting for $target_env services to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
            log_success "$target_env environment is ready!"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "$target_env environment failed to start within timeout"
            docker-compose -f "$compose_file" logs --tail=50
            exit 1
        fi
        
        log "Attempt $attempt/$max_attempts - waiting for $target_env to be ready..."
        sleep 10
        ((attempt++))
    done
    
    # Run smoke tests if not disabled
    if [ "${NO_SMOKE_TESTS:-false}" != "true" ] && [ -f "$SMOKE_TESTS" ]; then
        log "Running smoke tests for $target_env environment..."
        if bash "$SMOKE_TESTS" --environment="$target_env"; then
            log_success "Smoke tests passed for $target_env"
        else
            log_error "Smoke tests failed for $target_env"
            exit 1
        fi
    fi
    
    log_success "Deployment to $target_env completed successfully!"
}

# Switch traffic between environments
switch_traffic() {
    local target_env="$1"
    local current_env
    
    current_env=$(detect_current_environment)
    
    if [ "$current_env" = "$target_env" ]; then
        log_warning "Traffic is already pointing to $target_env environment"
        return 0
    fi
    
    if [ "$current_env" = "none" ]; then
        log_error "No active environment detected. Deploy to an environment first."
        exit 1
    fi
    
    log "Switching traffic from $current_env to $target_env..."
    
    # This is a simplified traffic switch
    # In a real production environment, you would:
    # 1. Update load balancer configuration
    # 2. Update DNS records
    # 3. Update service discovery
    # 4. Verify traffic is flowing correctly
    
    log_success "Traffic switched to $target_env environment"
    log "Note: In production, update your load balancer/DNS to point to $target_env"
}

# Rollback to previous environment
rollback() {
    local current_env
    local target_env
    
    current_env=$(detect_current_environment)
    
    case "$current_env" in
        "blue")
            target_env="green"
            ;;
        "green")
            target_env="blue"
            ;;
        *)
            log_error "No active environment detected for rollback"
            exit 1
            ;;
    esac
    
    log "Rolling back from $current_env to $target_env..."
    
    # Check if target environment is healthy
    local port=""
    case "$target_env" in
        "blue") port="8080" ;;
        "green") port="8081" ;;
    esac
    
    if ! curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
        log_error "Target environment $target_env is not healthy. Cannot rollback."
        exit 1
    fi
    
    switch_traffic "$target_env"
    log_success "Rollback to $target_env completed"
}

# Show deployment status
show_status() {
    log "Current deployment status:"
    echo
    
    local current_env
    current_env=$(detect_current_environment)
    
    echo "Active Environment: $current_env"
    echo
    
    # Blue environment status
    echo "Blue Environment:"
    if docker-compose -f "$BLUE_COMPOSE" ps | grep -q "Up"; then
        if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
            log_success "Blue is running and healthy"
        else
            log_warning "Blue is running but not responding to health checks"
        fi
    else
        echo "  Status: Not running"
    fi
    echo
    
    # Green environment status
    echo "Green Environment:"
    if docker-compose -f "$GREEN_COMPOSE" ps | grep -q "Up"; then
        if curl -sf http://localhost:8081/health >/dev/null 2>&1; then
            log_success "Green is running and healthy"
        else
            log_warning "Green is running but not responding to health checks"
        fi
    else
        echo "  Status: Not running"
    fi
    echo
}

# Health check for specific environment
health_check() {
    local env="$1"
    local port=""
    local compose_file=""
    
    case "$env" in
        "blue")
            port="8080"
            compose_file="$BLUE_COMPOSE"
            ;;
        "green")
            port="8081"
            compose_file="$GREEN_COMPOSE"
            ;;
        *)
            log_error "Invalid environment: $env"
            exit 1
            ;;
    esac
    
    log "Checking health of $env environment..."
    
    # Check if containers are running
    if ! docker-compose -f "$compose_file" ps | grep -q "Up"; then
        log_error "$env environment is not running"
        exit 1
    fi
    
    # Check health endpoint
    if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
        log_success "$env environment is healthy"
        curl -s "http://localhost:$port/health"
        echo
    else
        log_error "$env environment health check failed"
        exit 1
    fi
}

# Clean up inactive environment
cleanup() {
    local current_env
    current_env=$(detect_current_environment)
    
    case "$current_env" in
        "blue")
            log "Cleaning up green environment..."
            docker-compose -f "$GREEN_COMPOSE" down --remove-orphans || true
            ;;
        "green")
            log "Cleaning up blue environment..."
            docker-compose -f "$BLUE_COMPOSE" down --remove-orphans || true
            ;;
        *)
            log_warning "No active environment detected. Cleaning up both environments."
            docker-compose -f "$BLUE_COMPOSE" down --remove-orphans || true
            docker-compose -f "$GREEN_COMPOSE" down --remove-orphans || true
            ;;
    esac
    
    log_success "Cleanup completed"
}

# Main script logic
main() {
    local command="${1:-}"
    
    case "$command" in
        "deploy")
            local target_env="${2:-}"
            if [ -z "$target_env" ]; then
                log_error "Target environment required for deploy command"
                exit 1
            fi
            deploy_to_environment "$target_env"
            ;;
        "switch-traffic")
            local target_env="${2:-}"
            if [ -z "$target_env" ]; then
                log_error "Target environment required for switch-traffic command"
                exit 1
            fi
            switch_traffic "$target_env"
            ;;
        "rollback")
            rollback
            ;;
        "status")
            show_status
            ;;
        "health-check")
            local env="${2:-}"
            if [ -z "$env" ]; then
                log_error "Environment required for health-check command"
                exit 1
            fi
            health_check "$env"
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            log_error "Command required"
            show_help
            exit 1
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --target)
            TARGET="$2"
            shift 2
            ;;
        --force)
            FORCE="true"
            shift
            ;;
        --no-smoke-tests)
            NO_SMOKE_TESTS="true"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            main "$@"
            exit $?
            ;;
    esac
done

# If no arguments provided, show help
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi
