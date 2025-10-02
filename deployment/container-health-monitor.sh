#!/bin/bash

# Container Health Monitoring and Restart Management Script
# Monitors container health and manages restart policies

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/container-health.log"
MAX_RESTART_ATTEMPTS=5
RESTART_COOLDOWN=300  # 5 minutes
HEALTH_CHECK_INTERVAL=30  # 30 seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1" | tee -a "$LOG_FILE"
}

# Container restart tracking (using files for compatibility)
RESTART_COUNTS_DIR="$SCRIPT_DIR/restart_counts"
LAST_RESTART_DIR="$SCRIPT_DIR/last_restart"

# Create tracking directories
mkdir -p "$RESTART_COUNTS_DIR" "$LAST_RESTART_DIR"

# Get container health status
get_container_health() {
    local container_name="$1"
    local health_status
    
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")
    echo "$health_status"
}

# Get container status
get_container_status() {
    local container_name="$1"
    local status
    
    status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
    echo "$status"
}

# Check if container is running
is_container_running() {
    local container_name="$1"
    local status
    
    status=$(get_container_status "$container_name")
    [[ "$status" == "running" ]]
}

# Check if container is healthy
is_container_healthy() {
    local container_name="$1"
    local health_status
    
    health_status=$(get_container_health "$container_name")
    [[ "$health_status" == "healthy" ]]
}

# Get container restart count
get_restart_count() {
    local container_name="$1"
    local count
    
    count=$(docker inspect --format='{{.RestartCount}}' "$container_name" 2>/dev/null || echo "0")
    echo "$count"
}

# Check if container should be restarted
should_restart_container() {
    local container_name="$1"
    local current_time
    local last_restart
    local restart_count
    
    current_time=$(date +%s)
    last_restart=$(cat "$LAST_RESTART_DIR/$container_name" 2>/dev/null || echo "0")
    restart_count=$(cat "$RESTART_COUNTS_DIR/$container_name" 2>/dev/null || echo "0")
    
    # Check if we've exceeded max restart attempts
    if [[ $restart_count -ge $MAX_RESTART_ATTEMPTS ]]; then
        log_error "Container $container_name has exceeded max restart attempts ($MAX_RESTART_ATTEMPTS)"
        return 1
    fi
    
    # Check cooldown period
    if [[ $((current_time - last_restart)) -lt $RESTART_COOLDOWN ]]; then
        log_warning "Container $container_name is in cooldown period"
        return 1
    fi
    
    return 0
}

# Restart container
restart_container() {
    local container_name="$1"
    local current_time
    local restart_count
    
    current_time=$(date +%s)
    restart_count=$(cat "$RESTART_COUNTS_DIR/$container_name" 2>/dev/null || echo "0")
    
    log "Restarting container: $container_name"
    
    if docker restart "$container_name" >/dev/null 2>&1; then
        echo $((restart_count + 1)) > "$RESTART_COUNTS_DIR/$container_name"
        echo "$current_time" > "$LAST_RESTART_DIR/$container_name"
        log_success "Container $container_name restarted successfully"
        return 0
    else
        log_error "Failed to restart container: $container_name"
        return 1
    fi
}

# Stop container
stop_container() {
    local container_name="$1"
    
    log "Stopping container: $container_name"
    
    if docker stop "$container_name" >/dev/null 2>&1; then
        log_success "Container $container_name stopped successfully"
        return 0
    else
        log_error "Failed to stop container: $container_name"
        return 1
    fi
}

# Remove container
remove_container() {
    local container_name="$1"
    
    log "Removing container: $container_name"
    
    if docker rm "$container_name" >/dev/null 2>&1; then
        log_success "Container $container_name removed successfully"
        return 0
    else
        log_error "Failed to remove container: $container_name"
        return 1
    fi
}

# Get container logs
get_container_logs() {
    local container_name="$1"
    local lines="${2:-50}"
    
    docker logs --tail "$lines" "$container_name" 2>&1
}

# Analyze container failure
analyze_container_failure() {
    local container_name="$1"
    local logs
    
    log "Analyzing failure for container: $container_name"
    
    logs=$(get_container_logs "$container_name" 100)
    
    # Check for common failure patterns
    if echo "$logs" | grep -q "EADDRINUSE"; then
        log_error "Port conflict detected for $container_name"
        return 1
    elif echo "$logs" | grep -q "ENOENT"; then
        log_error "File not found error for $container_name"
        return 1
    elif echo "$logs" | grep -q "ECONNREFUSED"; then
        log_error "Connection refused for $container_name"
        return 1
    elif echo "$logs" | grep -q "SyntaxError"; then
        log_error "Syntax error in $container_name"
        return 1
    elif echo "$logs" | grep -q "TypeError"; then
        log_error "Type error in $container_name"
        return 1
    else
        log_warning "Unknown failure pattern for $container_name"
        return 0
    fi
}

# Monitor single container
monitor_container() {
    local container_name="$1"
    local status
    local health_status
    local restart_count
    
    status=$(get_container_status "$container_name")
    health_status=$(get_container_health "$container_name")
    restart_count=$(get_restart_count "$container_name")
    
    case "$status" in
        "running")
            if [[ "$health_status" == "healthy" ]]; then
                log_success "Container $container_name is running and healthy"
                # Reset restart count on successful health check
                echo "0" > "$RESTART_COUNTS_DIR/$container_name"
            elif [[ "$health_status" == "unhealthy" ]]; then
                log_warning "Container $container_name is running but unhealthy"
                if should_restart_container "$container_name"; then
                    restart_container "$container_name"
                fi
            else
                log_warning "Container $container_name is running but health status unknown"
            fi
            ;;
        "restarting")
            log_warning "Container $container_name is restarting (attempt $restart_count)"
            ;;
        "exited")
            log_error "Container $container_name has exited"
            analyze_container_failure "$container_name"
            if should_restart_container "$container_name"; then
                restart_container "$container_name"
            else
                log_error "Container $container_name will not be restarted"
            fi
            ;;
        "dead")
            log_error "Container $container_name is dead"
            analyze_container_failure "$container_name"
            if should_restart_container "$container_name"; then
                restart_container "$container_name"
            else
                log_error "Container $container_name will not be restarted"
            fi
            ;;
        *)
            log_warning "Container $container_name has unknown status: $status"
            ;;
    esac
}

# Monitor all containers
monitor_all_containers() {
    local containers
    local container_name
    
    log "Starting container health monitoring..."
    
    # Get all containers
    containers=$(docker ps -a --format "{{.Names}}" | grep -E "(secure-gate|deployment)" || echo "")
    
    if [[ -z "$containers" ]]; then
        log_warning "No secure-gate containers found"
        return 0
    fi
    
    while IFS= read -r container_name; do
        if [[ -n "$container_name" ]]; then
            monitor_container "$container_name"
        fi
    done <<< "$containers"
}

# Clean up old containers
cleanup_old_containers() {
    local old_containers
    local container_name
    
    log "Cleaning up old containers..."
    
    # Find containers that have been stopped for more than 24 hours
    old_containers=$(docker ps -a --filter "status=exited" --filter "until=24h" --format "{{.Names}}" | grep -E "(secure-gate|deployment)" || echo "")
    
    if [[ -n "$old_containers" ]]; then
        while IFS= read -r container_name; do
            if [[ -n "$container_name" ]]; then
                log "Removing old container: $container_name"
                remove_container "$container_name"
            fi
        done <<< "$old_containers"
    else
        log "No old containers to clean up"
    fi
}

# Generate health report
generate_health_report() {
    local report_file="$SCRIPT_DIR/container-health-report.json"
    local containers
    local container_name
    local status
    local health_status
    local restart_count
    local uptime
    
    log "Generating health report..."
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "containers": [
EOF
    
    containers=$(docker ps -a --format "{{.Names}}" | grep -E "(secure-gate|deployment)" || true)
    local first=true
    
    while IFS= read -r container_name; do
        if [[ -n "$container_name" ]]; then
            status=$(get_container_status "$container_name")
            health_status=$(get_container_health "$container_name")
            restart_count=$(get_restart_count "$container_name")
            uptime=$(docker inspect --format='{{.State.StartedAt}}' "$container_name" 2>/dev/null || echo "unknown")
            
            if [[ "$first" == "true" ]]; then
                first=false
            else
                echo "," >> "$report_file"
            fi
            
            cat >> "$report_file" << EOF
    {
      "name": "$container_name",
      "status": "$status",
      "health": "$health_status",
      "restart_count": $restart_count,
      "started_at": "$uptime"
    }
EOF
        fi
    done <<< "$containers"
    
    cat >> "$report_file" << EOF
  ],
  "summary": {
    "total_containers": $(echo "$containers" | wc -l),
    "running_containers": $(docker ps --format "{{.Names}}" | grep -E "(secure-gate|deployment)" | wc -l),
    "unhealthy_containers": $(docker ps --filter "health=unhealthy" --format "{{.Names}}" | grep -E "(secure-gate|deployment)" | wc -l),
    "restarting_containers": $(docker ps --filter "status=restarting" --format "{{.Names}}" | grep -E "(secure-gate|deployment)" | wc -l)
  }
}
EOF
    
    log_success "Health report generated: $report_file"
}

# Main monitoring loop
main() {
    local mode="${1:-monitor}"
    
    case "$mode" in
        "monitor")
            log "Starting continuous container monitoring..."
            while true; do
                monitor_all_containers
                sleep "$HEALTH_CHECK_INTERVAL"
            done
            ;;
        "check")
            log "Running single health check..."
            monitor_all_containers
            ;;
        "cleanup")
            log "Running cleanup..."
            cleanup_old_containers
            ;;
        "report")
            log "Generating health report..."
            generate_health_report
            ;;
        "restart")
            local container_name="$2"
            if [[ -z "$container_name" ]]; then
                log_error "Container name required for restart"
                exit 1
            fi
            restart_container "$container_name"
            ;;
        "stop")
            local container_name="$2"
            if [[ -z "$container_name" ]]; then
                log_error "Container name required for stop"
                exit 1
            fi
            stop_container "$container_name"
            ;;
        "logs")
            local container_name="$2"
            local lines="${3:-50}"
            if [[ -z "$container_name" ]]; then
                log_error "Container name required for logs"
                exit 1
            fi
            get_container_logs "$container_name" "$lines"
            ;;
        *)
            echo "Usage: $0 {monitor|check|cleanup|report|restart <container>|stop <container>|logs <container> [lines]}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
