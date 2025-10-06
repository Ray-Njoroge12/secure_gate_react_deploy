#!/bin/bash

# Production Deployment Script for Secure Gate Access Control System
# This script handles the complete production deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

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
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file $ENV_FILE not found. Please create it from env.production.example"
    fi
    
    # Check if SSL certificates exist
    if [[ ! -f "./nginx/ssl/cert.pem" ]] || [[ ! -f "./nginx/ssl/key.pem" ]]; then
        warning "SSL certificates not found. Please ensure certificates are in ./nginx/ssl/"
        warning "You can generate self-signed certificates for testing:"
        warning "mkdir -p nginx/ssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem"
    fi
    
    success "Prerequisites check passed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "./nginx/logs"
    mkdir -p "./nginx/ssl"
    
    success "Directories created"
}

# Backup existing data
backup_existing() {
    log "Creating backup of existing data..."
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        log "Stopping existing services..."
        docker-compose -f "$COMPOSE_FILE" down
        
        # Create backup of database
        if docker volume ls | grep -q "secure-gate-access_postgres_data"; then
            log "Backing up database..."
            docker run --rm -v secure-gate-access_postgres_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/postgres_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
            success "Database backup created"
        fi
    else
        log "No existing services to backup"
    fi
}

# Build and start services
deploy_services() {
    log "Building and starting services..."
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build custom images
    log "Building custom images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    success "Services started"
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to be healthy..."
    
    # Wait for database
    log "Waiting for database..."
    timeout 300 bash -c 'until docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U secure_gate_user -d secure_gate; do sleep 5; done'
    
    # Wait for backend
    log "Waiting for backend..."
    timeout 300 bash -c 'until curl -f http://localhost:5000/api/health; do sleep 5; done'
    
    # Wait for frontend
    log "Waiting for frontend..."
    timeout 300 bash -c 'until curl -f http://localhost:3000/health; do sleep 5; done'
    
    success "All services are healthy"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    docker-compose -f "$COMPOSE_FILE" exec -T backend npm run migrate:up
    
    success "Database migrations completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if all services are running
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        error "Some services are not running"
    fi
    
    # Check health endpoints
    if ! curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        error "Backend health check failed"
    fi
    
    if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
        error "Frontend health check failed"
    fi
    
    success "Deployment verification passed"
}

# Display deployment information
display_info() {
    log "Deployment completed successfully!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: https://securegate.com"
    echo "   API: https://api.securegate.com"
    echo "   Health: https://securegate.com/health"
    echo ""
    echo "📊 Monitoring (if enabled):"
    echo "   Grafana: https://monitoring.securegate.com"
    echo "   Prometheus: http://localhost:9090"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "   Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "   Restart services: docker-compose -f $COMPOSE_FILE restart"
    echo "   Scale services: docker-compose -f $COMPOSE_FILE up -d --scale backend=3"
    echo ""
    echo "📁 Important Directories:"
    echo "   Logs: $LOG_DIR"
    echo "   Backups: $BACKUP_DIR"
    echo "   SSL Certificates: ./nginx/ssl/"
    echo ""
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        error "Deployment failed. Check logs for details."
    fi
}

# Main deployment function
main() {
    log "Starting Secure Gate Access Control System production deployment..."
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run deployment steps
    check_root
    check_prerequisites
    create_directories
    backup_existing
    deploy_services
    wait_for_services
    run_migrations
    verify_deployment
    display_info
    
    success "Production deployment completed successfully!"
}

# Handle command line arguments
case "${1:-}" in
    "backup")
        backup_existing
        ;;
    "restart")
        log "Restarting services..."
        docker-compose -f "$COMPOSE_FILE" restart
        wait_for_services
        success "Services restarted"
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;
    "status")
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    "stop")
        log "Stopping services..."
        docker-compose -f "$COMPOSE_FILE" down
        success "Services stopped"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no command)  Full deployment"
        echo "  backup        Create backup of existing data"
        echo "  restart       Restart all services"
        echo "  logs          View service logs"
        echo "  status        Show service status"
        echo "  stop          Stop all services"
        echo "  help          Show this help message"
        ;;
    *)
        main
        ;;
esac
