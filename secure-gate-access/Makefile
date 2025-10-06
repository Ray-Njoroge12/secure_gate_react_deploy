# Makefile for Secure Gate Access Control System
# Provides easy commands for development and production management

.PHONY: help build up down restart logs clean dev prod backup health ssl

# Default target
help:
	@echo "Secure Gate Access Control System - Management Commands"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev          Start development environment"
	@echo "  make dev-build    Build development images"
	@echo "  make dev-logs     View development logs"
	@echo "  make dev-clean    Clean development environment"
	@echo ""
	@echo "Production Commands:"
	@echo "  make prod         Start production environment"
	@echo "  make prod-build   Build production images"
	@echo "  make prod-logs    View production logs"
	@echo "  make prod-clean   Clean production environment"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make backup       Create backup of data"
	@echo "  make health       Run health check"
	@echo "  make ssl          Generate SSL certificates"
	@echo "  make logs         View all logs"
	@echo "  make clean        Clean all environments"
	@echo "  make help         Show this help message"

# Development commands
dev:
	@echo "Starting development environment..."
	docker-compose up -d

dev-build:
	@echo "Building development images..."
	docker-compose build

dev-logs:
	@echo "Viewing development logs..."
	docker-compose logs -f

dev-clean:
	@echo "Cleaning development environment..."
	docker-compose down -v
	docker system prune -f

# Production commands
prod:
	@echo "Starting production environment..."
	./scripts/deploy-prod.sh

prod-build:
	@echo "Building production images..."
	docker-compose -f docker-compose.prod.yml build

prod-logs:
	@echo "Viewing production logs..."
	docker-compose -f docker-compose.prod.yml logs -f

prod-clean:
	@echo "Cleaning production environment..."
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f

# Utility commands
backup:
	@echo "Creating backup..."
	./scripts/deploy-prod.sh backup

health:
	@echo "Running health check..."
	./scripts/health-check.sh

ssl:
	@echo "Generating SSL certificates..."
	./scripts/generate-ssl.sh

logs:
	@echo "Viewing all logs..."
	docker-compose -f docker-compose.prod.yml logs -f

clean:
	@echo "Cleaning all environments..."
	docker-compose down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f

# Database commands
db-migrate:
	@echo "Running database migrations..."
	docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up

db-rollback:
	@echo "Rolling back database migrations..."
	docker-compose -f docker-compose.prod.yml exec backend npm run migrate:down

db-reset:
	@echo "Resetting database..."
	docker-compose -f docker-compose.prod.yml exec postgres psql -U secure_gate_user -d secure_gate -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up

# Monitoring commands
monitoring:
	@echo "Starting monitoring stack..."
	docker-compose -f docker-compose.prod.yml --profile monitoring up -d

monitoring-stop:
	@echo "Stopping monitoring stack..."
	docker-compose -f docker-compose.prod.yml --profile monitoring down

# Backup commands
backup-create:
	@echo "Creating manual backup..."
	docker-compose -f docker-compose.prod.yml exec backup node backup-manager.js create full

backup-list:
	@echo "Listing backups..."
	docker-compose -f docker-compose.prod.yml exec backup node backup-manager.js list

backup-restore:
	@echo "Restoring from backup..."
	@read -p "Enter backup file path: " file; \
	docker-compose -f docker-compose.prod.yml exec backup node backup-manager.js restore $$file

# Security commands
security-scan:
	@echo "Running security scan..."
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy image secure-gate-backend:latest

# Performance commands
perf-test:
	@echo "Running performance tests..."
	cd server && npm run test:performance

# Update commands
update:
	@echo "Updating application..."
	git pull origin main
	docker-compose -f docker-compose.prod.yml build --no-cache
	docker-compose -f docker-compose.prod.yml up -d
	./scripts/health-check.sh

# Status commands
status:
	@echo "Checking service status..."
	docker-compose -f docker-compose.prod.yml ps

status-dev:
	@echo "Checking development service status..."
	docker-compose ps

# Log management
logs-backend:
	@echo "Viewing backend logs..."
	docker-compose -f docker-compose.prod.yml logs -f backend

logs-frontend:
	@echo "Viewing frontend logs..."
	docker-compose -f docker-compose.prod.yml logs -f frontend

logs-database:
	@echo "Viewing database logs..."
	docker-compose -f docker-compose.prod.yml logs -f postgres

logs-nginx:
	@echo "Viewing nginx logs..."
	docker-compose -f docker-compose.prod.yml logs -f nginx

# Quick commands
quick-start:
	@echo "Quick start for development..."
	make dev
	@echo "Waiting for services to start..."
	sleep 30
	make health

quick-stop:
	@echo "Quick stop all services..."
	docker-compose down
	docker-compose -f docker-compose.prod.yml down

# Maintenance commands
maintenance:
	@echo "Running maintenance tasks..."
	docker-compose -f docker-compose.prod.yml exec backend npm run maintenance

maintenance-cleanup:
	@echo "Cleaning up old logs and data..."
	docker-compose -f docker-compose.prod.yml exec backend node scripts/log-manager.js cleanup application
	docker-compose -f docker-compose.prod.yml exec backend node scripts/log-manager.js cleanup error
