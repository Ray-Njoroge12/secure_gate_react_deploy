#!/bin/bash

# SSL Certificate Setup Script for Cloudflare
# This script helps set up SSL certificates for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SSL_DIR="$PROJECT_ROOT/nginx/ssl"
DOMAIN="${1:-securegate.com}"
API_DOMAIN="${2:-api.securegate.com}"

echo -e "${BLUE}🔐 SSL Certificate Setup for Cloudflare${NC}"
echo -e "Domain: ${DOMAIN}"
echo -e "API Domain: ${API_DOMAIN}"
echo -e "SSL Directory: ${SSL_DIR}"
echo ""

# Create SSL directory
create_ssl_directory() {
    echo -e "${BLUE}📁 Creating SSL directory...${NC}"
    
    if [ ! -d "$SSL_DIR" ]; then
        mkdir -p "$SSL_DIR"
        echo -e "${GREEN}✓${NC} Created SSL directory: $SSL_DIR"
    else
        echo -e "${YELLOW}⚠${NC} SSL directory already exists: $SSL_DIR"
    fi
    
    # Set secure permissions
    chmod 700 "$SSL_DIR"
    echo -e "${GREEN}✓${NC} Set secure permissions on SSL directory"
}

# Generate Cloudflare origin certificate
generate_origin_certificate() {
    echo -e "${BLUE}🔑 Generating Cloudflare Origin Certificate...${NC}"
    
    # Check if certificates already exist
    if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
        echo -e "${YELLOW}⚠${NC} Certificates already exist. Backing up..."
        cp "$SSL_DIR/cert.pem" "$SSL_DIR/cert.pem.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$SSL_DIR/key.pem" "$SSL_DIR/key.pem.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Generate private key
    openssl genrsa -out "$SSL_DIR/key.pem" 2048
    echo -e "${GREEN}✓${NC} Generated private key"
    
    # Create certificate signing request
    openssl req -new -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.csr" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN}" \
        -addext "subjectAltName=DNS:${DOMAIN},DNS:${API_DOMAIN},DNS:*.${DOMAIN}"
    
    echo -e "${GREEN}✓${NC} Generated certificate signing request"
    
    # Generate self-signed certificate (for development/testing)
    openssl x509 -req -days 365 -in "$SSL_DIR/cert.csr" -signkey "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -extensions v3_req -extfile <(cat <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = Organization
CN = ${DOMAIN}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = ${API_DOMAIN}
DNS.3 = *.${DOMAIN}
EOF
)
    
    echo -e "${GREEN}✓${NC} Generated self-signed certificate (valid for 365 days)"
    
    # Clean up CSR
    rm "$SSL_DIR/cert.csr"
    echo -e "${GREEN}✓${NC} Cleaned up certificate signing request"
}

# Set proper permissions
set_ssl_permissions() {
    echo -e "${BLUE}🔒 Setting SSL file permissions...${NC}"
    
    # Set secure permissions
    chmod 600 "$SSL_DIR/key.pem"
    chmod 644 "$SSL_DIR/cert.pem"
    
    echo -e "${GREEN}✓${NC} Set secure permissions on SSL files"
}

# Validate SSL configuration
validate_ssl() {
    echo -e "${BLUE}🔍 Validating SSL configuration...${NC}"
    
    # Check certificate validity
    if openssl x509 -in "$SSL_DIR/cert.pem" -text -noout > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Certificate is valid"
        
        # Display certificate info
        echo -e "${BLUE}📋 Certificate Information:${NC}"
        openssl x509 -in "$SSL_DIR/cert.pem" -noout -subject
        openssl x509 -in "$SSL_DIR/cert.pem" -noout -issuer
        openssl x509 -in "$SSL_DIR/cert.pem" -noout -dates
        
        # Check SAN (Subject Alternative Names)
        echo -e "${BLUE}🌐 Subject Alternative Names:${NC}"
        openssl x509 -in "$SSL_DIR/cert.pem" -text -noout | grep -A1 "Subject Alternative Name"
        
    else
        echo -e "${RED}✗${NC} Certificate validation failed"
        return 1
    fi
    
    # Check private key
    if openssl rsa -in "$SSL_DIR/key.pem" -check -noout > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Private key is valid"
    else
        echo -e "${RED}✗${NC} Private key validation failed"
        return 1
    fi
    
    # Verify key and certificate match
    CERT_MD5=$(openssl x509 -noout -modulus -in "$SSL_DIR/cert.pem" | openssl md5)
    KEY_MD5=$(openssl rsa -noout -modulus -in "$SSL_DIR/key.pem" | openssl md5)
    
    if [ "$CERT_MD5" = "$KEY_MD5" ]; then
        echo -e "${GREEN}✓${NC} Certificate and private key match"
    else
        echo -e "${RED}✗${NC} Certificate and private key do not match"
        return 1
    fi
}

# Test SSL handshake
test_ssl_handshake() {
    echo -e "${BLUE}🤝 Testing SSL handshake...${NC}"
    
    # This would normally test against a running server
    # For now, we'll just validate the certificate structure
    echo -e "${YELLOW}⚠${NC} SSL handshake test requires running server"
    echo -e "${BLUE}💡${NC} To test after deployment, run:"
    echo -e "   openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN}"
}

# Update nginx configuration
update_nginx_config() {
    echo -e "${BLUE}⚙️  Updating Nginx configuration...${NC}"
    
    NGINX_CONFIG="$PROJECT_ROOT/nginx/nginx.prod.conf"
    
    if [ ! -f "$NGINX_CONFIG" ]; then
        echo -e "${RED}✗${NC} Nginx configuration file not found: $NGINX_CONFIG"
        return 1
    fi
    
    # Backup existing configuration
    cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓${NC} Backed up existing nginx configuration"
    
    # Update SSL paths in nginx config
    sed -i.bak "s|/etc/nginx/ssl/cert.pem|$SSL_DIR/cert.pem|g" "$NGINX_CONFIG"
    sed -i.bak "s|/etc/nginx/ssl/key.pem|$SSL_DIR/key.pem|g" "$NGINX_CONFIG"
    sed -i.bak "s|securegate.com|$DOMAIN|g" "$NGINX_CONFIG"
    sed -i.bak "s|api.securegate.com|$API_DOMAIN|g" "$NGINX_CONFIG"
    
    # Remove backup file created by sed
    rm "$NGINX_CONFIG.bak"
    
    echo -e "${GREEN}✓${NC} Updated nginx configuration with SSL paths"
}

# Validate nginx configuration
validate_nginx_config() {
    echo -e "${BLUE}🔍 Validating Nginx configuration...${NC}"
    
    NGINX_CONFIG="$PROJECT_ROOT/nginx/nginx.prod.conf"
    
    if command -v nginx >/dev/null 2>&1; then
        if nginx -t -c "$NGINX_CONFIG" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Nginx configuration is valid"
        else
            echo -e "${RED}✗${NC} Nginx configuration validation failed"
            nginx -t -c "$NGINX_CONFIG"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} Nginx not found, skipping configuration validation"
    fi
}

# Generate Cloudflare instructions
generate_cloudflare_instructions() {
    echo -e "${BLUE}📋 Cloudflare Setup Instructions:${NC}"
    echo ""
    echo -e "${YELLOW}1. Cloudflare Origin Certificate:${NC}"
    echo "   • Go to Cloudflare Dashboard > SSL/TLS > Origin Server"
    echo "   • Click 'Create Certificate'"
    echo "   • Select 'Let Cloudflare generate a private key and a CSR'"
    echo "   • Hostnames: ${DOMAIN}, ${API_DOMAIN}, *.${DOMAIN}"
    echo "   • Certificate Validity: 15 years"
    echo "   • Key type: RSA (2048)"
    echo "   • Download the certificate and replace: $SSL_DIR/cert.pem"
    echo "   • Download the private key and replace: $SSL_DIR/key.pem"
    echo ""
    echo -e "${YELLOW}2. Cloudflare SSL/TLS Settings:${NC}"
    echo "   • SSL/TLS encryption mode: Full (strict)"
    echo "   • Edge Certificates: Always Use HTTPS: ON"
    echo "   • Edge Certificates: HTTP Strict Transport Security (HSTS): ON"
    echo "   • Edge Certificates: Minimum TLS Version: 1.2"
    echo "   • Edge Certificates: Opportunistic Encryption: ON"
    echo "   • Edge Certificates: TLS 1.3: ON"
    echo "   • Edge Certificates: Automatic HTTPS Rewrites: ON"
    echo ""
    echo -e "${YELLOW}3. Page Rules:${NC}"
    echo "   • Create page rule for: ${DOMAIN}/*"
    echo "   • Settings: Always Use HTTPS"
    echo "   • Create page rule for: ${API_DOMAIN}/*"
    echo "   • Settings: Always Use HTTPS"
    echo ""
    echo -e "${YELLOW}4. DNS Records:${NC}"
    echo "   • ${DOMAIN} → A record → Your server IP"
    echo "   • ${API_DOMAIN} → A record → Your server IP"
    echo "   • www.${DOMAIN} → CNAME → ${DOMAIN}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting SSL certificate setup...${NC}"
    echo ""
    
    create_ssl_directory
    generate_origin_certificate
    set_ssl_permissions
    validate_ssl
    update_nginx_config
    validate_nginx_config
    test_ssl_handshake
    
    echo ""
    echo -e "${GREEN}🎉 SSL certificate setup completed successfully!${NC}"
    echo ""
    
    generate_cloudflare_instructions
    
    echo ""
    echo -e "${BLUE}💡 Next steps:${NC}"
    echo "   1. Replace self-signed certificates with Cloudflare origin certificates"
    echo "   2. Configure Cloudflare SSL/TLS settings as shown above"
    echo "   3. Test SSL configuration: bash scripts/validate-ssl.sh"
    echo "   4. Deploy with SSL: docker-compose -f docker-compose.prod.yml up -d"
}

# Run main function
main "$@"
