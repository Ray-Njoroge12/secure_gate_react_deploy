#!/bin/bash
set -e

# Log all output
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== Starting Secure Gate Backend Setup ==="

# Update system
apt-get update -y
apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install other dependencies
apt-get install -y git nginx certbot python3-certbot-nginx

# Install PM2 globally
npm install -g pm2

# Create app directory
mkdir -p /home/ubuntu/secure-gate-api
chown ubuntu:ubuntu /home/ubuntu/secure-gate-api

# Clone repository
cd /home/ubuntu
git clone https://github.com/KennyD4Christ/secure_gate_react_deploy.git secure-gate-api-repo || true

# Copy backend files
cp -r /home/ubuntu/secure-gate-api-repo/secure-gate-access/server/* /home/ubuntu/secure-gate-api/
chown -R ubuntu:ubuntu /home/ubuntu/secure-gate-api

# Install dependencies
cd /home/ubuntu/secure-gate-api
sudo -u ubuntu npm install --production

# Create environment file template
cat > /home/ubuntu/secure-gate-api/.env << 'ENVEOF'
# Server Configuration
NODE_ENV=production
PORT=3001

# Database Configuration (Update with RDS endpoint)
PGHOST=REPLACE_WITH_RDS_ENDPOINT
PGPORT=5432
PGDATABASE=securegate
PGUSER=securegate_admin
PGPASSWORD=REPLACE_WITH_SECURE_DB_PASSWORD

# JWT Secrets (Generate secure ones for production)
JWT_SECRET=REPLACE_WITH_SECURE_JWT_SECRET
JWT_REFRESH_SECRET=REPLACE_WITH_SECURE_JWT_REFRESH_SECRET
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Encryption Key
ENCRYPTION_KEY=REPLACE_WITH_SECURE_ENCRYPTION_KEY

# Email Configuration (Mailgun)
MAILGUN_API_KEY=REPLACE_WITH_MAILGUN_API_KEY
MAILGUN_DOMAIN=REPLACE_WITH_MAILGUN_DOMAIN
FROM_EMAIL=noreply@securegate.com

# SMS Configuration (Africa's Talking)
AT_API_KEY=REPLACE_WITH_AT_API_KEY
AT_USERNAME=REPLACE_WITH_AT_USERNAME

# Frontend URL
CLIENT_URL=https://securegate.example.com
ALLOWED_ORIGINS=https://securegate.example.com

# Redis (optional)
# REDIS_URL=redis://localhost:6379
ENVEOF

chown ubuntu:ubuntu /home/ubuntu/secure-gate-api/.env

# Configure Nginx as reverse proxy
cat > /etc/nginx/sites-available/secure-gate << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /health {
        proxy_pass http://localhost:3001/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
NGINXEOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/secure-gate /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx
systemctl enable nginx

# Create PM2 ecosystem file
cat > /home/ubuntu/secure-gate-api/ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'secure-gate-api',
    script: 'src/app.js',
    cwd: '/home/ubuntu/secure-gate-api',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    max_memory_restart: '500M',
    error_file: '/home/ubuntu/secure-gate-api/logs/error.log',
    out_file: '/home/ubuntu/secure-gate-api/logs/out.log',
    log_file: '/home/ubuntu/secure-gate-api/logs/combined.log',
    time: true
  }]
};
PM2EOF

chown ubuntu:ubuntu /home/ubuntu/secure-gate-api/ecosystem.config.js

# Create logs directory
mkdir -p /home/ubuntu/secure-gate-api/logs
chown -R ubuntu:ubuntu /home/ubuntu/secure-gate-api/logs

# Setup PM2 startup script
sudo -u ubuntu pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "=== Secure Gate Backend Setup Complete ==="
echo "NOTE: Update /home/ubuntu/secure-gate-api/.env with correct RDS endpoint and secrets"
echo "Then run: cd /home/ubuntu/secure-gate-api && pm2 start ecosystem.config.js"
