#!/bin/bash

# SSL Certificate Generation Script for Secure Gate Access Control System
# This script generates self-signed SSL certificates for development/testing
# For production, use proper SSL certificates from a trusted CA

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SSL_DIR="./nginx/ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"
DAYS=365
KEY_SIZE=2048

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

# Check if OpenSSL is installed
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        error "OpenSSL is not installed. Please install OpenSSL first."
    fi
}

# Create SSL directory
create_ssl_directory() {
    log "Creating SSL directory..."
    mkdir -p "$SSL_DIR"
    success "SSL directory created: $SSL_DIR"
}

# Generate self-signed certificate
generate_certificate() {
    log "Generating self-signed SSL certificate..."
    
    # Generate private key
    log "Generating private key..."
    openssl genrsa -out "$KEY_FILE" $KEY_SIZE
    
    # Generate certificate signing request
    log "Generating certificate signing request..."
    openssl req -new -key "$KEY_FILE" -out "$SSL_DIR/cert.csr" -subj "/C=KE/ST=Nairobi/L=Nairobi/O=Secure Gate/OU=IT Department/CN=securegate.com"
    
    # Generate self-signed certificate
    log "Generating self-signed certificate..."
    openssl x509 -req -in "$SSL_DIR/cert.csr" -signkey "$KEY_FILE" -out "$CERT_FILE" -days $DAYS
    
    # Clean up CSR file
    rm "$SSL_DIR/cert.csr"
    
    success "SSL certificate generated successfully"
}

# Set proper permissions
set_permissions() {
    log "Setting proper permissions..."
    
    chmod 600 "$KEY_FILE"
    chmod 644 "$CERT_FILE"
    
    success "Permissions set correctly"
}

# Verify certificate
verify_certificate() {
    log "Verifying certificate..."
    
    # Check if files exist
    if [[ ! -f "$CERT_FILE" ]] || [[ ! -f "$KEY_FILE" ]]; then
        error "Certificate files not found"
    fi
    
    # Verify certificate
    if ! openssl x509 -in "$CERT_FILE" -text -noout > /dev/null 2>&1; then
        error "Invalid certificate file"
    fi
    
    # Verify private key
    if ! openssl rsa -in "$KEY_FILE" -check > /dev/null 2>&1; then
        error "Invalid private key file"
    fi
    
    success "Certificate verification passed"
}

# Display certificate information
display_cert_info() {
    log "Certificate information:"
    echo ""
    openssl x509 -in "$CERT_FILE" -text -noout | grep -E "(Subject:|Issuer:|Not Before|Not After|Public Key)"
    echo ""
    
    success "Certificate files created:"
    echo "   Certificate: $CERT_FILE"
    echo "   Private Key: $KEY_FILE"
    echo "   Valid for: $DAYS days"
    echo ""
    warning "This is a self-signed certificate for development/testing only."
    warning "For production, use certificates from a trusted Certificate Authority."
}

# Generate Let's Encrypt certificate (if certbot is available)
generate_letsencrypt() {
    if command -v certbot &> /dev/null; then
        log "Let's Encrypt certbot found. Would you like to generate a real SSL certificate? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            log "Generating Let's Encrypt certificate..."
            warning "Make sure your domain is pointing to this server and ports 80/443 are open"
            
            # Stop nginx if running
            if docker-compose -f docker-compose.prod.yml ps | grep -q "nginx.*Up"; then
                log "Stopping nginx for certificate generation..."
                docker-compose -f docker-compose.prod.yml stop nginx
            fi
            
            # Generate certificate
            sudo certbot certonly --standalone -d securegate.com -d www.securegate.com -d api.securegate.com
            
            # Copy certificates
            if [[ -f "/etc/letsencrypt/live/securegate.com/fullchain.pem" ]]; then
                log "Copying Let's Encrypt certificates..."
                sudo cp "/etc/letsencrypt/live/securegate.com/fullchain.pem" "$CERT_FILE"
                sudo cp "/etc/letsencrypt/live/securegate.com/privkey.pem" "$KEY_FILE"
                sudo chown $(whoami):$(whoami) "$CERT_FILE" "$KEY_FILE"
                success "Let's Encrypt certificates installed"
            else
                error "Let's Encrypt certificate generation failed"
            fi
        fi
    fi
}

# Main function
main() {
    log "Starting SSL certificate generation..."
    
    check_openssl
    create_ssl_directory
    generate_certificate
    set_permissions
    verify_certificate
    display_cert_info
    generate_letsencrypt
    
    success "SSL certificate generation completed!"
}

# Handle command line arguments
case "${1:-}" in
    "verify")
        verify_certificate
        ;;
    "info")
        display_cert_info
        ;;
    "letsencrypt")
        generate_letsencrypt
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no command)  Generate self-signed certificate"
        echo "  verify        Verify existing certificate"
        echo "  info          Display certificate information"
        echo "  letsencrypt   Generate Let's Encrypt certificate"
        echo "  help          Show this help message"
        ;;
    *)
        main
        ;;
esac
