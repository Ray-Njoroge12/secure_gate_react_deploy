#!/bin/bash

# Container Restart Policy Management Script
# Manages restart policies and handles container failures

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICY_FILE="$SCRIPT_DIR/restart-policies.json"
LOG_FILE="$SCRIPT_DIR/restart-policy.log"

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

# Initialize restart policies
init_policies() {
    if [[ ! -f "$POLICY_FILE" ]]; then
        cat > "$POLICY_FILE" << 'EOF'
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
    },
    "secure-gate-frontend": {
      "restart_policy": "unless-stopped",
      "max_restarts": 3,
      "restart_delay": 15,
      "health_check_interval": 30,
      "failure_threshold": 2,
      "success_threshold": 1,
      "timeout": 10
    },
    "secure-gate-postgres": {
      "restart_policy": "unless-stopped",
      "max_restarts": 3,
      "restart_delay": 60,
      "health_check_interval": 30,
      "failure_threshold": 2,
      "success_threshold": 1,
      "timeout": 15
    },
    "secure-gate-redis": {
      "restart_policy": "unless-stopped",
      "max_restarts": 3,
      "restart_delay": 30,
      "health_check_interval": 30,
      "failure_threshold": 2,
      "success_threshold": 1,
      "timeout": 10
    },
    "secure-gate-nginx": {
      "restart_policy": "unless-stopped",
      "max_restarts": 3,
      "restart_delay": 15,
      "health_check_interval": 30,
      "failure_threshold": 2,
      "success_threshold": 1,
      "timeout": 10
    }
  },
  "global_settings": {
    "monitoring_enabled": true,
    "auto_restart_enabled": true,
    "alert_on_failure": true,
    "log_level": "info"
  }
}
EOF
        log_success "Restart policies initialized"
    fi
}

# Get restart policy for container
get_restart_policy() {
    local container_name="$1"
    local policy
    
    policy=$(jq -r ".policies.\"$container_name\".restart_policy // \"unless-stopped\"" "$POLICY_FILE" 2>/dev/null || echo "unless-stopped")
    echo "$policy"
}

# Get max restarts for container
get_max_restarts() {
    local container_name="$1"
    local max_restarts
    
    max_restarts=$(jq -r ".policies.\"$container_name\".max_restarts // 5" "$POLICY_FILE" 2>/dev/null || echo "5")
    echo "$max_restarts"
}

# Get restart delay for container
get_restart_delay() {
    local container_name="$1"
    local delay
    
    delay=$(jq -r ".policies.\"$container_name\".restart_delay // 30" "$POLICY_FILE" 2>/dev/null || echo "30")
    echo "$delay"
}

# Apply restart policy to container
apply_restart_policy() {
    local container_name="$1"
    local policy
    local max_restarts
    local delay
    
    policy=$(get_restart_policy "$container_name")
    max_restarts=$(get_max_restarts "$container_name")
    delay=$(get_restart_delay "$container_name")
    
    log "Applying restart policy to $container_name: $policy (max: $max_restarts, delay: ${delay}s)"
    
    # Update container restart policy
    docker update --restart="$policy" "$container_name" >/dev/null 2>&1 || {
        log_error "Failed to update restart policy for $container_name"
        return 1
    }
    
    log_success "Restart policy applied to $container_name"
}

# Check if container should be restarted
should_restart_container() {
    local container_name="$1"
    local restart_count
    local max_restarts
    local status
    
    restart_count=$(docker inspect --format='{{.RestartCount}}' "$container_name" 2>/dev/null || echo "0")
    max_restarts=$(get_max_restarts "$container_name")
    status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
    
    # Check if container is running
    if [[ "$status" == "running" ]]; then
        return 1
    fi
    
    # Check if we've exceeded max restarts
    if [[ $restart_count -ge $max_restarts ]]; then
        log_error "Container $container_name has exceeded max restarts ($restart_count/$max_restarts)"
        return 1
    fi
    
    return 0
}

# Restart container with delay
restart_container_with_delay() {
    local container_name="$1"
    local delay
    local policy
    
    delay=$(get_restart_delay "$container_name")
    policy=$(get_restart_policy "$container_name")
    
    log "Restarting container $container_name with ${delay}s delay (policy: $policy)"
    
    # Stop container
    docker stop "$container_name" >/dev/null 2>&1 || {
        log_warning "Container $container_name may already be stopped"
    }
    
    # Wait for delay
    sleep "$delay"
    
    # Start container
    if docker start "$container_name" >/dev/null 2>&1; then
        log_success "Container $container_name restarted successfully"
        return 0
    else
        log_error "Failed to restart container $container_name"
        return 1
    fi
}

# Monitor container restart policies
monitor_restart_policies() {
    local containers
    local container_name
    local status
    local restart_count
    local max_restarts
    
    log "Monitoring restart policies..."
    
    # Get all containers
    containers=$(docker ps -a --format "{{.Names}}" | grep -E "(secure-gate|deployment)" || true)
    
    if [[ -z "$containers" ]]; then
        log_warning "No secure-gate containers found"
        return 0
    fi
    
    while IFS= read -r container_name; do
        if [[ -n "$container_name" ]]; then
            status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
            restart_count=$(docker inspect --format='{{.RestartCount}}' "$container_name" 2>/dev/null || echo "0")
            max_restarts=$(get_max_restarts "$container_name")
            
            case "$status" in
                "running")
                    log_success "Container $container_name is running (restarts: $restart_count/$max_restarts)"
                    ;;
                "exited")
                    log_warning "Container $container_name has exited (restarts: $restart_count/$max_restarts)"
                    if should_restart_container "$container_name"; then
                        restart_container_with_delay "$container_name"
                    else
                        log_error "Container $container_name will not be restarted"
                    fi
                    ;;
                "restarting")
                    log_warning "Container $container_name is restarting (restarts: $restart_count/$max_restarts)"
                    ;;
                "dead")
                    log_error "Container $container_name is dead (restarts: $restart_count/$max_restarts)"
                    if should_restart_container "$container_name"; then
                        restart_container_with_delay "$container_name"
                    else
                        log_error "Container $container_name will not be restarted"
                    fi
                    ;;
                *)
                    log_warning "Container $container_name has unknown status: $status"
                    ;;
            esac
        fi
    done <<< "$containers"
}

# Update restart policy for container
update_restart_policy() {
    local container_name="$1"
    local policy="$2"
    local max_restarts="${3:-5}"
    local delay="${4:-30}"
    
    log "Updating restart policy for $container_name: $policy (max: $max_restarts, delay: ${delay}s)"
    
    # Update policy file
    jq --arg name "$container_name" --arg policy "$policy" --argjson max "$max_restarts" --argjson delay "$delay" \
        '.policies[$name] = {
            "restart_policy": $policy,
            "max_restarts": $max,
            "restart_delay": $delay,
            "health_check_interval": 30,
            "failure_threshold": 2,
            "success_threshold": 1,
            "timeout": 10
        }' "$POLICY_FILE" > "$POLICY_FILE.tmp" && mv "$POLICY_FILE.tmp" "$POLICY_FILE"
    
    # Apply to container
    apply_restart_policy "$container_name"
    
    log_success "Restart policy updated for $container_name"
}

# List all restart policies
list_restart_policies() {
    log "Current restart policies:"
    echo
    
    jq -r '.policies | to_entries[] | "\(.key): \(.value.restart_policy) (max: \(.value.max_restarts), delay: \(.value.restart_delay)s)"' "$POLICY_FILE" 2>/dev/null || {
        log_error "Failed to read restart policies"
        return 1
    }
}

# Reset restart count for container
reset_restart_count() {
    local container_name="$1"
    
    log "Resetting restart count for $container_name"
    
    # Stop and remove container
    docker stop "$container_name" >/dev/null 2>&1 || true
    docker rm "$container_name" >/dev/null 2>&1 || true
    
    log_success "Restart count reset for $container_name"
}

# Generate restart policy report
generate_restart_report() {
    local report_file="$SCRIPT_DIR/restart-policy-report.json"
    local containers
    local container_name
    local status
    local restart_count
    local max_restarts
    local policy
    
    log "Generating restart policy report..."
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "containers": [
EOF
    
    containers=$(docker ps -a --format "{{.Names}}" | grep -E "(secure-gate|deployment)" || true)
    local first=true
    
    while IFS= read -r container_name; do
        if [[ -n "$container_name" ]]; then
            status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
            restart_count=$(docker inspect --format='{{.RestartCount}}' "$container_name" 2>/dev/null || echo "0")
            max_restarts=$(get_max_restarts "$container_name")
            policy=$(get_restart_policy "$container_name")
            
            if [[ "$first" == "true" ]]; then
                first=false
            else
                echo "," >> "$report_file"
            fi
            
            cat >> "$report_file" << EOF
    {
      "name": "$container_name",
      "status": "$status",
      "restart_count": $restart_count,
      "max_restarts": $max_restarts,
      "restart_policy": "$policy",
      "should_restart": $(should_restart_container "$container_name" && echo "true" || echo "false")
    }
EOF
        fi
    done <<< "$containers"
    
    cat >> "$report_file" << EOF
  ],
  "summary": {
    "total_containers": $(echo "$containers" | wc -l),
    "running_containers": $(docker ps --format "{{.Names}}" | grep -E "(secure-gate|deployment)" | wc -l),
    "exited_containers": $(docker ps -a --filter "status=exited" --format "{{.Names}}" | grep -E "(secure-gate|deployment)" | wc -l),
    "restarting_containers": $(docker ps --filter "status=restarting" --format "{{.Names}}" | grep -E "(secure-gate|deployment)" | wc -l)
  }
}
EOF
    
    log_success "Restart policy report generated: $report_file"
}

# Main function
main() {
    local command="${1:-monitor}"
    
    # Initialize policies
    init_policies
    
    case "$command" in
        "monitor")
            log "Starting restart policy monitoring..."
            while true; do
                monitor_restart_policies
                sleep 60
            done
            ;;
        "check")
            log "Checking restart policies..."
            monitor_restart_policies
            ;;
        "update")
            local container_name="$2"
            local policy="$3"
            local max_restarts="${4:-5}"
            local delay="${5:-30}"
            
            if [[ -z "$container_name" || -z "$policy" ]]; then
                log_error "Usage: $0 update <container_name> <policy> [max_restarts] [delay]"
                exit 1
            fi
            
            update_restart_policy "$container_name" "$policy" "$max_restarts" "$delay"
            ;;
        "list")
            list_restart_policies
            ;;
        "reset")
            local container_name="$2"
            
            if [[ -z "$container_name" ]]; then
                log_error "Usage: $0 reset <container_name>"
                exit 1
            fi
            
            reset_restart_count "$container_name"
            ;;
        "report")
            generate_restart_report
            ;;
        "apply")
            local container_name="$2"
            
            if [[ -z "$container_name" ]]; then
                log_error "Usage: $0 apply <container_name>"
                exit 1
            fi
            
            apply_restart_policy "$container_name"
            ;;
        *)
            echo "Usage: $0 {monitor|check|update|list|reset|report|apply} [args...]"
            echo ""
            echo "Commands:"
            echo "  monitor                    - Start continuous monitoring"
            echo "  check                      - Run single policy check"
            echo "  update <name> <policy> [max] [delay] - Update restart policy"
            echo "  list                       - List all restart policies"
            echo "  reset <name>               - Reset restart count for container"
            echo "  report                     - Generate restart policy report"
            echo "  apply <name>               - Apply restart policy to container"
            echo ""
            echo "Policies: no, on-failure, unless-stopped, always"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
