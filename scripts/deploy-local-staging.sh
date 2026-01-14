#!/usr/bin/env bash
# Local Staging Deployment and Validation Script
# Automates the entire staging deployment and correlation validation process

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║       🚀 LOCAL STAGING DEPLOYMENT & VALIDATION AUTOMATION 🚀              ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
STAGING_BASE_URL="http://localhost:5001"
OUTPUT_DIR="../staging-correlation"
COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"
PROJECT_ROOT="$(dirname "$0")/.."

# Navigate to secure-gate-access directory
cd "$(dirname "$0")/../secure-gate-access" || exit 1

# Create output directory for validation evidence
mkdir -p "${OUTPUT_DIR}"

echo -e "${YELLOW}📋 Pre-Flight Checks${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Check ports are available
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Port 5001 is in use. Attempting to stop existing containers...${NC}"
  docker-compose -f "${COMPOSE_FILE}" down 2>/dev/null || true
fi

if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Port 5432 is in use. This may cause issues.${NC}"
fi

echo ""
echo -e "${YELLOW}📦 Step 1: Creating Environment Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create .env.staging if it doesn't exist
if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" << 'EOF'
NODE_ENV=production
PORT=5001
PGHOST=postgres
PGPORT=5432
PGUSER=securegate_staging
PGPASSWORD=staging_password_change_me
PGDATABASE=securegate_staging
DATABASE_POOL_MAX=10
JWT_SECRET=staging-jwt-secret-min-32-chars-for-security-please-change
JWT_REFRESH_SECRET=staging-refresh-secret-min-32-chars-change-me
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
SESSION_SECRET=staging-session-secret-min-32-chars-change-me
COOKIE_SECURE=false
COOKIE_SAME_SITE=Lax
COOKIE_DOMAIN=localhost
CSRF_ENABLED=true
CSRF_SECRET=staging-csrf-secret-min-32-chars-change-me
CORS_ORIGINS=http://localhost:3000,http://localhost:5001
CORS_CREDENTIALS=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
LOG_FORMAT=json
ENFORCE_HTTPS=false
SECURE_COOKIES=false
TRUST_PROXY=false
EMAIL_VERIFICATION_REQUIRED=false
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_SMS_NOTIFICATIONS=false
ENABLE_EXTERNAL_NOTIFICATIONS=false
EOF
  echo -e "${GREEN}✅ Created ${ENV_FILE}${NC}"
else
  echo -e "${GREEN}✅ ${ENV_FILE} already exists${NC}"
fi

# Create docker-compose.staging.yml if it doesn't exist
if [[ ! -f "${COMPOSE_FILE}" ]]; then
  cat > "${COMPOSE_FILE}" << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    container_name: securegate-staging-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: securegate_staging
      POSTGRES_PASSWORD: staging_password_change_me
      POSTGRES_DB: securegate_staging
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U securegate_staging"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - securegate_staging
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: securegate-staging-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - .env.staging
    ports:
      - "5001:5001"
    volumes:
      - ./server/logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - securegate_staging
volumes:
  postgres_staging_data:
    driver: local
networks:
  securegate_staging:
    driver: bridge
EOF
  echo -e "${GREEN}✅ Created ${COMPOSE_FILE}${NC}"
else
  echo -e "${GREEN}✅ ${COMPOSE_FILE} already exists${NC}"
fi

echo ""
echo -e "${YELLOW}🧹 Step 2: Cleaning Previous Deployment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose -f "${COMPOSE_FILE}" down -v 2>/dev/null || true
echo -e "${GREEN}✅ Cleaned up previous containers${NC}"

echo ""
echo -e "${YELLOW}🔨 Step 3: Building Staging Environment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose -f "${COMPOSE_FILE}" build --no-cache
echo -e "${GREEN}✅ Build complete${NC}"

echo ""
echo -e "${YELLOW}🚀 Step 4: Starting Staging Services${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose -f "${COMPOSE_FILE}" up -d
echo -e "${GREEN}✅ Services started${NC}"

echo ""
echo -e "${YELLOW}⏳ Step 5: Waiting for Services to be Healthy${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 10

# Wait for backend to be healthy (max 60 seconds)
for i in {1..12}; do
  if curl -s "${STAGING_BASE_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
    break
  fi
  if [[ $i -eq 12 ]]; then
    echo -e "${RED}❌ Backend health check failed after 60 seconds${NC}"
    echo -e "${YELLOW}Showing logs:${NC}"
    docker-compose -f "${COMPOSE_FILE}" logs backend | tail -30
    exit 1
  fi
  echo "  Attempt $i/12... waiting 5 seconds"
  sleep 5
done

# Verify health
echo ""
echo -e "${YELLOW}Health Check Response:${NC}"
curl -s "${STAGING_BASE_URL}/api/health" | jq . || curl -s "${STAGING_BASE_URL}/api/health"

echo ""
echo -e "${YELLOW}📊 Step 6: Checking Container Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose -f "${COMPOSE_FILE}" ps

echo ""
echo -e "${YELLOW}🔧 Step 7: Running Database Migrations${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker exec securegate-staging-api npm run migrate:up 2>/dev/null; then
  echo -e "${GREEN}✅ Migrations applied${NC}"
else
  echo -e "${YELLOW}⚠️  Migrations may have already been applied or failed${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║               🎯 DEPLOYMENT COMPLETE - READY FOR VALIDATION 🎯            ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Staging Environment Details:${NC}"
echo "  Base URL: ${STAGING_BASE_URL}"
echo "  Health Check: ${STAGING_BASE_URL}/api/health"
echo "  Database: PostgreSQL on localhost:5432"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Run validation script: ${GREEN}./scripts/run-local-staging-validation.sh${NC}"
echo "  2. View logs: ${GREEN}docker-compose -f ${COMPOSE_FILE} logs -f backend${NC}"
echo "  3. Stop environment: ${GREEN}docker-compose -f ${COMPOSE_FILE} down${NC}"
echo ""
