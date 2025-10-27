#!/bin/bash

# SSL Validation Script
# This script validates SSL certificates and configuration

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

echo -e "${BLUE}🔍 SSL Configuration Validation${NC}"
echo -e "Domain: ${DOMAIN}"
echo -e "API Domain: ${API_DOMAIN}"
echo -e "SSL Directory: ${SSL_DIR}"
echo ""

# Check SSL directory exists
check_ssl_directory() {
    echo -e "${BLUE}📁 Checking SSL directory...${NC}"
    
    if [ ! -d "$SSL_DIR" ]; then
        echo -e "${RED}✗${NC} SSL directory does not exist: $SSL_DIR"
        echo -e "${YELLOW}💡${NC} Run: bash scripts/setup-ssl-cloudflare.sh"
        return 1
    else
        echo -e "${GREEN}✓${NC} SSL directory exists: $SSL_DIR"
    fi
    
    # Check directory permissions
    PERMS=$(stat -c "%a" "$SSL_DIR" 2>/dev/null || stat -f "%A" "$SSL_DIR" 2>/dev/null || echo "unknown")
    if [ "$PERMS" = "700" ] || [ "$PERMS" = "750" ]; then
        echo -e "${GREEN}✓${NC} SSL directory has secure permissions: $PERMS"
    else
        echo -e "${YELLOW}⚠${NC} SSL directory permissions could be more secure: $PERMS"
    fi
}

# Check SSL files exist
check_ssl_files() {
    echo -e "${BLUE}📄 Checking SSL files...${NC}"
    
    local cert_file="$SSL_DIR/cert.pem"
    local key_file="$SSL_DIR/key.pem"
    
    if [ ! -f "$cert_file" ]; then
        echo -e "${RED}✗${NC} Certificate file not found: $cert_file"
        return 1
    else
        echo -e "${GREEN}✓${NC} Certificate file exists: $cert_file"
    fi
    
    if [ ! -f "$key_file" ]; then
        echo -e "${RED}✗${NC} Private key file not found: $key_file"
        return 1
    else
        echo -e "${GREEN}✓${NC} Private key file exists: $key_file"
    fi
    
    # Check file permissions
    CERT_PERMS=$(stat -c "%a" "$cert_file" 2>/dev/null || stat -f "%A" "$cert_file" 2>/dev/null || echo "unknown")
    KEY_PERMS=$(stat -c "%a" "$key_file" 2>/dev/null || stat -f "%A" "$key_file" 2>/dev/null || echo "unknown")
    
    if [ "$CERT_PERMS" = "644" ] || [ "$CERT_PERMS" = "640" ]; then
        echo -e "${GREEN}✓${NC} Certificate file has secure permissions: $CERT_PERMS"
    else
        echo -e "${YELLOW}⚠${NC} Certificate file permissions could be more secure: $CERT_PERMS"
    fi
    
    if [ "$KEY_PERMS" = "600" ]; then
        echo -e "${GREEN}✓${NC} Private key file has secure permissions: $KEY_PERMS"
    else
        echo -e "${RED}✗${NC} Private key file has insecure permissions: $KEY_PERMS (should be 600)"
        return 1
    fi
}

# Validate certificate structure
validate_certificate_structure() {
    echo -e "${BLUE}🔍 Validating certificate structure...${NC}"
    
    local cert_file="$SSL_DIR/cert.pem"
    
    # Check if certificate is valid PEM format
    if openssl x509 -in "$cert_file" -text -noout >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Certificate is valid PEM format"
    else
        echo -e "${RED}✗${NC} Certificate is not valid PEM format"
        return 1
    fi
    
    # Get certificate information
    echo -e "${BLUE}📋 Certificate Information:${NC}"
    openssl x509 -in "$cert_file" -noout -subject | sed 's/subject=//'
    openssl x509 -in "$cert_file" -noout -issuer | sed 's/issuer=//'
    openssl x509 -in "$cert_file" -noout -dates
    
    # Check certificate expiry
    EXPIRY_DATE=$(openssl x509 -in "$cert_file" -noout -enddate | sed 's/notAfter=//')
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null || echo "0")
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    echo -e "${BLUE}📅 Certificate Expiry:${NC}"
    echo -e "   Expiry Date: $EXPIRY_DATE"
    echo -e "   Days Until Expiry: $DAYS_UNTIL_EXPIRY"
    
    if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
        echo -e "${GREEN}✓${NC} Certificate has more than 30 days until expiry"
    elif [ $DAYS_UNTIL_EXPIRY -gt 7 ]; then
        echo -e "${YELLOW}⚠${NC} Certificate expires in less than 30 days"
    else
        echo -e "${RED}✗${NC} Certificate expires in less than 7 days"
        return 1
    fi
    
    # Check Subject Alternative Names
    echo -e "${BLUE}🌐 Subject Alternative Names:${NC}"
    SAN=$(openssl x509 -in "$cert_file" -text -noout | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/DNS://g' | sed 's/,/\n/g' | sed 's/^[ \t]*//')
    echo "$SAN" | while read -r name; do
        if [ -n "$name" ]; then
            echo -e "   • $name"
        fi
    done
    
    # Check if domains are covered
    if echo "$SAN" | grep -q "$DOMAIN"; then
        echo -e "${GREEN}✓${NC} Certificate covers domain: $DOMAIN"
    else
        echo -e "${RED}✗${NC} Certificate does not cover domain: $DOMAIN"
        return 1
    fi
    
    if echo "$SAN" | grep -q "$API_DOMAIN"; then
        echo -e "${GREEN}✓${NC} Certificate covers API domain: $API_DOMAIN"
    else
        echo -e "${RED}✗${NC} Certificate does not cover API domain: $API_DOMAIN"
        return 1
    fi
}

# Validate private key
validate_private_key() {
    echo -e "${BLUE}🔑 Validating private key...${NC}"
    
    local key_file="$SSL_DIR/key.pem"
    
    # Check if private key is valid
    if openssl rsa -in "$key_file" -check -noout >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Private key is valid"
    else
        echo -e "${RED}✗${NC} Private key is not valid"
        return 1
    fi
    
    # Get key information
    echo -e "${BLUE}📋 Private Key Information:${NC}"
    KEY_TYPE=$(openssl rsa -in "$key_file" -text -noout | grep "Private-Key:" | awk '{print $2}')
    KEY_SIZE=$(openssl rsa -in "$key_file" -text -noout | grep "Private-Key:" | awk '{print $3}' | sed 's/(//' | sed 's/bits)//')
    
    echo -e "   Key Type: $KEY_TYPE"
    echo -e "   Key Size: $KEY_SIZE bits"
    
    # Check key size
    if [ "$KEY_SIZE" -ge 2048 ]; then
        echo -e "${GREEN}✓${NC} Private key size is secure ($KEY_SIZE bits)"
    else
        echo -e "${RED}✗${NC} Private key size is too small ($KEY_SIZE bits, minimum 2048)"
        return 1
    fi
}

# Verify certificate and key match
verify_cert_key_match() {
    echo -e "${BLUE}🔗 Verifying certificate and key match...${NC}"
    
    local cert_file="$SSL_DIR/cert.pem"
    local key_file="$SSL_DIR/key.pem"
    
    # Get modulus from certificate and key
    CERT_MODULUS=$(openssl x509 -noout -modulus -in "$cert_file" | openssl md5)
    KEY_MODULUS=$(openssl rsa -noout -modulus -in "$key_file" | openssl md5)
    
    if [ "$CERT_MODULUS" = "$KEY_MODULUS" ]; then
        echo -e "${GREEN}✓${NC} Certificate and private key match"
    else
        echo -e "${RED}✗${NC} Certificate and private key do not match"
        return 1
    fi
}

# Test SSL handshake (if server is running)
test_ssl_handshake() {
    echo -e "${BLUE}🤝 Testing SSL handshake...${NC}"
    
    # Check if server is running on localhost:443
    if command -v openssl >/dev/null 2>&1; then
        echo -e "${BLUE}🔍 Testing SSL handshake on localhost:443...${NC}"
        
        # Test with timeout
        if timeout 10 openssl s_client -connect localhost:443 -servername "$DOMAIN" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            echo -e "${GREEN}✓${NC} SSL handshake successful on localhost:443"
        else
            echo -e "${YELLOW}⚠${NC} SSL handshake failed on localhost:443 (server may not be running)"
        fi
        
        # Test domain-specific handshake
        if timeout 10 openssl s_client -connect "$DOMAIN":443 -servername "$DOMAIN" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            echo -e "${GREEN}✓${NC} SSL handshake successful on $DOMAIN:443"
        else
            echo -e "${YELLOW}⚠${NC} SSL handshake failed on $DOMAIN:443 (may not be deployed yet)"
        fi
    else
        echo -e "${YELLOW}⚠${NC} OpenSSL not available, skipping handshake test"
    fi
}

# Validate nginx configuration
validate_nginx_config() {
    echo -e "${BLUE}⚙️  Validating Nginx configuration...${NC}"
    
    local nginx_config="$PROJECT_ROOT/nginx/nginx.prod.conf"
    
    if [ ! -f "$nginx_config" ]; then
        echo -e "${RED}✗${NC} Nginx configuration file not found: $nginx_config"
        return 1
    else
        echo -e "${GREEN}✓${NC} Nginx configuration file exists: $nginx_config"
    fi
    
    # Check if nginx is available
    if command -v nginx >/dev/null 2>&1; then
        if nginx -t -c "$nginx_config" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Nginx configuration is valid"
        else
            echo -e "${RED}✗${NC} Nginx configuration validation failed"
            echo -e "${BLUE}📋 Nginx configuration errors:${NC}"
            nginx -t -c "$nginx_config"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} Nginx not available, skipping configuration validation"
    fi
    
    # Check SSL configuration in nginx
    if grep -q "ssl_certificate" "$nginx_config"; then
        echo -e "${GREEN}✓${NC} Nginx SSL configuration found"
        
        # Check if SSL paths are correct
        SSL_CERT_PATH=$(grep "ssl_certificate " "$nginx_config" | head -1 | awk '{print $2}' | sed 's/;//')
        SSL_KEY_PATH=$(grep "ssl_certificate_key " "$nginx_config" | head -1 | awk '{print $2}' | sed 's/;//')
        
        if [ -f "$SSL_CERT_PATH" ]; then
            echo -e "${GREEN}✓${NC} SSL certificate path in nginx config is valid: $SSL_CERT_PATH"
        else
            echo -e "${RED}✗${NC} SSL certificate path in nginx config is invalid: $SSL_CERT_PATH"
            return 1
        fi
        
        if [ -f "$SSL_KEY_PATH" ]; then
            echo -e "${GREEN}✓${NC} SSL private key path in nginx config is valid: $SSL_KEY_PATH"
        else
            echo -e "${RED}✗${NC} SSL private key path in nginx config is invalid: $SSL_KEY_PATH"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} No SSL configuration found in nginx config"
        return 1
    fi
}

# Check security headers
check_security_headers() {
    echo -e "${BLUE}🔒 Checking security headers configuration...${NC}"
    
    local nginx_config="$PROJECT_ROOT/nginx/nginx.prod.conf"
    
    # Check for security headers in nginx config
    SECURITY_HEADERS=(
        "Strict-Transport-Security"
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Content-Security-Policy"
    )
    
    for header in "${SECURITY_HEADERS[@]}"; do
        if grep -q "$header" "$nginx_config"; then
            echo -e "${GREEN}✓${NC} Security header configured: $header"
        else
            echo -e "${YELLOW}⚠${NC} Security header not configured: $header"
        fi
    done
}

# Main execution
main() {
    local errors=0
    
    echo -e "${BLUE}🚀 Starting SSL validation...${NC}"
    echo ""
    
    check_ssl_directory || ((errors++))
    check_ssl_files || ((errors++))
    validate_certificate_structure || ((errors++))
    validate_private_key || ((errors++))
    verify_cert_key_match || ((errors++))
    test_ssl_handshake
    validate_nginx_config || ((errors++))
    check_security_headers
    
    echo ""
    echo -e "${BLUE}📊 SSL Validation Summary${NC}"
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}🎉 All SSL validations passed!${NC}"
        echo ""
        echo -e "${BLUE}💡 Next steps:${NC}"
        echo "   1. Deploy with SSL: docker-compose -f docker-compose.prod.yml up -d"
        echo "   2. Test HTTPS access: curl -I https://$DOMAIN"
        echo "   3. Verify security headers: curl -I https://$DOMAIN | grep -E '(Strict-Transport|X-Frame|X-Content)'"
        exit 0
    else
        echo -e "${RED}❌ SSL validation failed with $errors error(s)${NC}"
        echo ""
        echo -e "${BLUE}💡 Fix the errors above and run the validation again${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
