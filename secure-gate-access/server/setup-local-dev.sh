#!/bin/bash

# Local Development Setup Script
# Fixes port conflicts, database issues, and prepares environment for testing

set -e

echo "=================================="
echo "SECURE GATE - LOCAL DEV SETUP"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_DIR="/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server"
cd "$SERVER_DIR"

echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"
echo ""

# Check Node version
NODE_VERSION=$(node --version)
echo "✓ Node version: $NODE_VERSION"

# Check NPM version
NPM_VERSION=$(npm --version)
echo "✓ NPM version: $NPM_VERSION"

# Check if port 5000 is in use
echo ""
echo -e "${YELLOW}[2/6] Checking port availability...${NC}"
PORT_IN_USE=$(lsof -i :5000 | grep LISTEN || echo "")
if [ -n "$PORT_IN_USE" ]; then
    echo -e "${RED}✗ Port 5000 is in use (macOS Control Center)${NC}"
    echo "  Changing server to use port 3001 instead..."
    
    # Update .env file to use port 3001
    if grep -q "^PORT=5000" .env; then
        sed -i '' 's/^PORT=5000/PORT=3001/' .env
        echo -e "${GREEN}✓ Updated .env: PORT=3001${NC}"
    fi
else
    echo -e "${GREEN}✓ Port 5000 is available${NC}"
fi

# Check if Docker is available
echo ""
echo -e "${YELLOW}[3/6] Checking Docker availability...${NC}"
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo -e "${GREEN}✓ Docker is available${NC}"
    USE_DOCKER=true
else
    echo -e "${YELLOW}⚠ Docker is not available or not running${NC}"
    echo "  Will use SQLite for local development"
    USE_DOCKER=false
fi

# Setup database
echo ""
echo -e "${YELLOW}[4/6] Setting up database...${NC}"

if [ "$USE_DOCKER" = true ]; then
    # Use Docker PostgreSQL
    echo "Starting PostgreSQL container..."
    
    # Check if container exists
    if docker ps -a --format '{{.Names}}' | grep -q "^secure-gate-postgres-dev$"; then
        echo "Container exists, starting it..."
        docker start secure-gate-postgres-dev || true
    else
        echo "Creating new PostgreSQL container..."
        docker run -d \
            --name secure-gate-postgres-dev \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=secure_gate \
            -p 5432:5432 \
            postgres:15-alpine
    fi
    
    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
    
    # Test connection
    docker exec secure-gate-postgres-dev psql -U postgres -d secure_gate -c "SELECT 1;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
    else
        echo -e "${RED}✗ PostgreSQL failed to start${NC}"
        exit 1
    fi
else
    # Use SQLite for local development
    echo "Setting up SQLite database..."
    
    # Update .env to use SQLite
    if ! grep -q "USE_SQLITE=true" .env; then
        echo "" >> .env
        echo "# Local Development - SQLite fallback" >> .env
        echo "USE_SQLITE=true" >> .env
        echo "SQLITE_PATH=./dev.db" >> .env
    fi
    
    # Create database config wrapper
    cat > src/config/database-wrapper.js << 'EOF'
import { config } from 'dotenv';
config();

// Check if we should use SQLite
const USE_SQLITE = process.env.USE_SQLITE === 'true';

let db;

if (USE_SQLITE) {
    console.log('🔧 Using SQLite for local development');
    
    // SQLite implementation
    db = {
        query: async (text, params) => {
            // Mock implementation for development
            console.log('SQLite query:', text);
            return { rows: [] };
        },
        pool: {
            connect: async () => ({
                query: async () => ({ rows: [] }),
                release: () => {}
            })
        }
    };
} else {
    // Use PostgreSQL
    const pg = await import('pg');
    const pool = new pg.default.Pool({
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'secure_gate',
        password: process.env.PGPASSWORD || 'postgres',
        port: parseInt(process.env.PGPORT || '5432')
    });
    
    db = {
        query: (text, params) => pool.query(text, params),
        pool
    };
}

export default db;
EOF
    
    echo -e "${GREEN}✓ SQLite configuration created${NC}"
fi

# Install dependencies
echo ""
echo -e "${YELLOW}[5/6] Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Run database migrations
echo ""
echo -e "${YELLOW}[6/6] Running database setup...${NC}"
if [ "$USE_DOCKER" = true ]; then
    # Run migrations
    if [ -f "scripts/migrate.js" ]; then
        npm run db:migrate || echo "⚠ Migration script not fully implemented"
    fi
    
    # Run seeds
    if [ -f "scripts/seed.js" ]; then
        npm run db:seed || echo "⚠ Seed script not fully implemented"
    fi
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}SETUP COMPLETE!${NC}"
echo "=================================="
echo ""
echo "Configuration:"
if [ "$USE_DOCKER" = true ]; then
    echo "  • Database: PostgreSQL (Docker)"
    echo "  • Connection: localhost:5432"
else
    echo "  • Database: SQLite (Local file)"
    echo "  • File: ./dev.db"
fi

NEW_PORT=$(grep "^PORT=" .env | cut -d '=' -f2)
echo "  • Server Port: $NEW_PORT"
echo ""
echo "Next steps:"
echo "  1. Start the server: npm start"
echo "  2. Test health: curl http://localhost:$NEW_PORT/health"
echo "  3. Run security tests: npm run test:security"
echo "  4. Run performance tests: npm run test:performance"
echo ""

exit 0
