#!/bin/bash
# Script to delete test users from the database

echo "🗑️  Deleting test users from database..."

# Use Render CLI to run SQL command on the database
render psql -r dpg-cu83dr5ds78s73fcv9hg << 'EOF'
-- Delete test users
DELETE FROM users WHERE email IN ('n91599727@gmail.com', 'n91599727+resident@gmail.com', 'n91599727+test1@gmail.com', 'n91599727+test2@gmail.com');

-- Show remaining users
SELECT id, username, email, role, verified, created_at FROM users ORDER BY created_at DESC;
EOF

echo ""
echo "✅ Test users deleted!"
echo "You can now register with n91599727@gmail.com"
