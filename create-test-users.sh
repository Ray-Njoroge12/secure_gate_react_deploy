#!/bin/bash
# Create Test Users via Backend API Registration
# This uses the backend's own password hashing

echo "🔧 Creating Test Users..."
echo ""

API_URL="http://localhost:5001"

# Function to create user via registration endpoint
create_user() {
    local username=$1
    local email=$2
    local password=$3
    local role=$4
    local phone=$5
    
    echo "Creating $role: $email"
    
    response=$(curl -s -X POST "$API_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"$username\",
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"role\": \"$role\",
            \"phone\": \"$phone\",
            \"area\": \"Test Area\",
            \"house\": \"Test House\"
        }")
    
    if echo "$response" | grep -q "token\|success\|created"; then
        echo "✅ Created $email"
    elif echo "$response" | grep -qi "already exists\|duplicate"; then
        echo "⚠️  $email already exists - updating password via SQL"
        # Update password directly in database
        docker exec secure-gate-backend-prod node -e "
            const bcrypt = require('bcryptjs');
            const hash = bcrypt.hashSync('$password', 10);
            console.log(hash);
        " > /tmp/hash.txt 2>/dev/null
        
        if [ -f /tmp/hash.txt ]; then
            hash=$(cat /tmp/hash.txt | tr -d '\n')
            docker exec secure-gate-postgres-prod psql -U secure_gate_user -d secure_gate -c \
                "UPDATE users SET password_hash = '$hash', role = '$role' WHERE email = '$email';" > /dev/null 2>&1
            echo "✅ Updated $email with new password"
        fi
    else
        echo "❌ Failed to create $email"
        echo "   Response: $response"
    fi
    echo ""
}

# Create admin user
create_user "admin" "admin@securegate.com" "Admin@123" "admin" "+254700000001"

# Create guard user
create_user "guard" "guard@securegate.com" "Guard@123" "guard" "+254700000002"

# Create resident user
create_user "resident" "resident@securegate.com" "Resident@123" "resident" "+254700000003"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Users Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test Credentials:"
echo "─────────────────"
echo "ADMIN:"
echo "  Email: admin@securegate.com"
echo "  Password: Admin@123"
echo ""
echo "GUARD:"
echo "  Email: guard@securegate.com"
echo "  Password: Guard@123"
echo ""
echo "RESIDENT:"
echo "  Email: resident@securegate.com"
echo "  Password: Resident@123"
echo ""

# Verify users in database
echo "Verifying users in database..."
docker exec secure-gate-postgres-prod psql -U secure_gate_user -d secure_gate -c \
    "SELECT id, username, email, role FROM users WHERE email LIKE '%securegate.com%' ORDER BY role;" 2>&1 | grep -v "NOTICE"

echo ""
echo "Now you can run the full automated test suite!"
echo "Run: ./quick-automated-test.sh"
echo ""
