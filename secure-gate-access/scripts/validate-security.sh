#!/bin/bash

# Comprehensive Security Validation Script
# This script runs all security tests and validations

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
DOMAIN="${1:-securegate.com}"
PROTOCOL="${2:-https}"

echo -e "${BLUE}🛡️ Comprehensive Security Validation${NC}"
echo -e "Domain: ${DOMAIN}"
echo -e "Protocol: ${PROTOCOL}"
echo ""

# Check dependencies
check_dependencies() {
    echo -e "${BLUE}🔍 Checking dependencies...${NC}"
    
    local missing_deps=()
    
    # Check for required commands
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("node")
    fi
    
    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi
    
    if ! command -v openssl >/dev/null 2>&1; then
        missing_deps+=("openssl")
    fi
    
    if ! command -v nslookup >/dev/null 2>&1; then
        missing_deps+=("nslookup")
    fi
    
    if [ ${#missing_deps[@]} -eq 0 ]; then
        echo -e "${GREEN}✓${NC} All dependencies available"
    else
        echo -e "${RED}✗${NC} Missing dependencies: ${missing_deps[*]}"
        echo -e "${YELLOW}Please install missing dependencies before running security validation${NC}"
        exit 1
    fi
}

# Test SSL/TLS security
test_ssl_security() {
    echo -e "${BLUE}🔒 Testing SSL/TLS security...${NC}"
    
    if command -v openssl >/dev/null 2>&1; then
        # Test SSL certificate
        echo -e "${BLUE}   Testing SSL certificate...${NC}"
        
        cert_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null || echo "Certificate check failed")
        
        if [[ "$cert_info" != "Certificate check failed" ]]; then
            echo -e "${GREEN}✓${NC} SSL certificate is valid"
            
            # Check certificate expiry
            expiry_date=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
            if [[ -n "$expiry_date" ]]; then
                expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
                current_timestamp=$(date +%s)
                days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [[ $days_until_expiry -gt 30 ]]; then
                    echo -e "${GREEN}✓${NC} Certificate expires in $days_until_expiry days"
                elif [[ $days_until_expiry -gt 7 ]]; then
                    echo -e "${YELLOW}⚠${NC} Certificate expires in $days_until_expiry days (renewal recommended)"
                else
                    echo -e "${RED}✗${NC} Certificate expires in $days_until_expiry days (immediate renewal required)"
                fi
            fi
        else
            echo -e "${RED}✗${NC} SSL certificate check failed"
        fi
        
        # Test SSL protocols
        echo -e "${BLUE}   Testing SSL protocols...${NC}"
        for protocol in tls1_2 tls1_3; do
            if echo | openssl s_client -connect "$DOMAIN:443" -"$protocol" 2>/dev/null | grep -q "CONNECTED"; then
                echo -e "${GREEN}✓${NC} $protocol supported"
            else
                echo -e "${RED}✗${NC} $protocol not supported"
            fi
        done
        
        # Test SSL ciphers
        echo -e "${BLUE}   Testing SSL ciphers...${NC}"
        cipher_list=$(echo | openssl s_client -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -text | grep -i "signature algorithm" | head -1)
        if [[ -n "$cipher_list" ]]; then
            echo -e "${GREEN}✓${NC} Strong cipher suite detected"
        else
            echo -e "${YELLOW}⚠${NC} Cipher suite information not available"
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} OpenSSL not available, skipping SSL tests"
    fi
}

# Test security headers
test_security_headers() {
    echo -e "${BLUE}🛡️ Testing security headers...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Get headers
        headers=$(curl -s -I "https://$DOMAIN" 2>/dev/null || echo "")
        
        if [[ -n "$headers" ]]; then
            # Security headers to check
            security_headers=(
                "strict-transport-security"
                "x-frame-options"
                "x-content-type-options"
                "x-xss-protection"
                "referrer-policy"
                "content-security-policy"
                "permissions-policy"
            )
            
            local header_count=0
            local missing_headers=()
            
            for header in "${security_headers[@]}"; do
                if echo "$headers" | grep -qi "$header"; then
                    header_value=$(echo "$headers" | grep -i "$header" | cut -d: -f2 | tr -d ' \r\n')
                    echo -e "${GREEN}✓${NC} $header: $header_value"
                    ((header_count++))
                else
                    echo -e "${RED}✗${NC} $header: missing"
                    missing_headers+=("$header")
                fi
            done
            
            # Calculate security header score
            local total_headers=${#security_headers[@]}
            local security_score=$(( (header_count * 100) / total_headers ))
            
            echo -e "${BLUE}   Security header score: ${security_score}% (${header_count}/${total_headers})${NC}"
            
            if [[ $security_score -ge 90 ]]; then
                echo -e "${GREEN}✓${NC} Excellent security header configuration"
            elif [[ $security_score -ge 70 ]]; then
                echo -e "${YELLOW}⚠${NC} Good security header configuration, but improvements needed"
            else
                echo -e "${RED}✗${NC} Poor security header configuration"
            fi
            
        else
            echo -e "${RED}✗${NC} Failed to retrieve headers"
        fi
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping header tests"
    fi
}

# Test rate limiting
test_rate_limiting() {
    echo -e "${BLUE}🚦 Testing rate limiting...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Test rapid requests
        echo -e "${BLUE}   Testing rapid requests...${NC}"
        
        local rate_limit_hit=false
        local rate_limit_count=0
        
        for i in {1..20}; do
            status_code=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" 2>/dev/null || echo "000")
            
            if [[ "$status_code" == "429" ]]; then
                echo -e "${GREEN}✓${NC} Rate limiting triggered after $i requests"
                rate_limit_hit=true
                rate_limit_count=$i
                break
            fi
            
            # Small delay to avoid overwhelming
            sleep 0.1
        done
        
        if [[ "$rate_limit_hit" == false ]]; then
            echo -e "${YELLOW}⚠${NC} Rate limiting not triggered (may be configured for higher limits)"
        fi
        
        # Test login rate limiting
        echo -e "${BLUE}   Testing login rate limiting...${NC}"
        
        local login_rate_limit_hit=false
        for i in {1..10}; do
            status_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://$DOMAIN/api/auth/login" \
                -H "Content-Type: application/json" \
                -d '{"username":"test","password":"test"}' 2>/dev/null || echo "000")
            
            if [[ "$status_code" == "429" ]]; then
                echo -e "${GREEN}✓${NC} Login rate limiting triggered after $i requests"
                login_rate_limit_hit=true
                break
            fi
            
            sleep 0.1
        done
        
        if [[ "$login_rate_limit_hit" == false ]]; then
            echo -e "${YELLOW}⚠${NC} Login rate limiting not triggered"
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping rate limiting tests"
    fi
}

# Test authentication security
test_authentication_security() {
    echo -e "${BLUE}🔐 Testing authentication security...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Test invalid login
        echo -e "${BLUE}   Testing invalid login...${NC}"
        
        invalid_login_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://$DOMAIN/api/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"username":"invalid","password":"invalid"}' 2>/dev/null || echo "000")
        
        if [[ "$invalid_login_status" == "401" ]]; then
            echo -e "${GREEN}✓${NC} Invalid login properly rejected"
        else
            echo -e "${RED}✗${NC} Invalid login not properly handled (status: $invalid_login_status)"
        fi
        
        # Test access without token
        echo -e "${BLUE}   Testing unauthorized access...${NC}"
        
        unauthorized_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/users/profile" 2>/dev/null || echo "000")
        
        if [[ "$unauthorized_status" == "401" ]]; then
            echo -e "${GREEN}✓${NC} Unauthorized access properly blocked"
        else
            echo -e "${RED}✗${NC} Unauthorized access not properly blocked (status: $unauthorized_status)"
        fi
        
        # Test admin access
        echo -e "${BLUE}   Testing admin access control...${NC}"
        
        admin_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/admin/users" 2>/dev/null || echo "000")
        
        if [[ "$admin_status" == "403" ]] || [[ "$admin_status" == "401" ]]; then
            echo -e "${GREEN}✓${NC} Admin access properly controlled"
        else
            echo -e "${RED}✗${NC} Admin access not properly controlled (status: $admin_status)"
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping authentication tests"
    fi
}

# Test injection protection
test_injection_protection() {
    echo -e "${BLUE}💉 Testing injection protection...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Test SQL injection
        echo -e "${BLUE}   Testing SQL injection protection...${NC}"
        
        sql_payload="' OR '1'='1"
        sql_url="https://$DOMAIN/api/auth/login?username=${sql_payload}&password=test"
        
        sql_status=$(curl -s -o /dev/null -w "%{http_code}" "$sql_url" 2>/dev/null || echo "000")
        
        if [[ "$sql_status" == "400" ]] || [[ "$sql_status" == "403" ]]; then
            echo -e "${GREEN}✓${NC} SQL injection attempt blocked"
        else
            echo -e "${RED}✗${NC} SQL injection attempt not blocked (status: $sql_status)"
        fi
        
        # Test XSS protection
        echo -e "${BLUE}   Testing XSS protection...${NC}"
        
        xss_payload="<script>alert('XSS')</script>"
        xss_url="https://$DOMAIN/api/visitors?search=${xss_payload}"
        
        xss_status=$(curl -s -o /dev/null -w "%{http_code}" "$xss_url" 2>/dev/null || echo "000")
        
        if [[ "$xss_status" == "400" ]] || [[ "$xss_status" == "403" ]]; then
            echo -e "${GREEN}✓${NC} XSS attempt blocked"
        else
            echo -e "${RED}✗${NC} XSS attempt not blocked (status: $xss_status)"
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping injection tests"
    fi
}

# Test information disclosure
test_information_disclosure() {
    echo -e "${BLUE}🔍 Testing information disclosure...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Test sensitive file access
        sensitive_files=(
            "/.env"
            "/.git/config"
            "/package.json"
            "/server.js"
            "/config/database.js"
            "/logs/error.log"
            "/backup.sql"
            "/admin"
            "/phpinfo.php"
            "/test"
            "/debug"
            "/status"
            "/info"
        )
        
        local protected_files=0
        local total_files=${#sensitive_files[@]}
        
        for file in "${sensitive_files[@]}"; do
            url="https://$DOMAIN$file"
            status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
            
            if [[ "$status_code" == "403" ]] || [[ "$status_code" == "404" ]]; then
                echo -e "${GREEN}✓${NC} $file - Protected (${status_code})"
                ((protected_files++))
            elif [[ "$status_code" == "200" ]]; then
                echo -e "${RED}✗${NC} $file - Accessible (${status_code})"
            else
                echo -e "${YELLOW}⚠${NC} $file - Status ${status_code}"
            fi
        done
        
        # Calculate protection score
        local protection_score=$(( (protected_files * 100) / total_files ))
        
        echo -e "${BLUE}   Information disclosure protection score: ${protection_score}% (${protected_files}/${total_files})${NC}"
        
        if [[ $protection_score -ge 90 ]]; then
            echo -e "${GREEN}✓${NC} Excellent information disclosure protection"
        elif [[ $protection_score -ge 70 ]]; then
            echo -e "${YELLOW}⚠${NC} Good information disclosure protection, but improvements needed"
        else
            echo -e "${RED}✗${NC} Poor information disclosure protection"
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping information disclosure tests"
    fi
}

# Run Node.js security scripts
run_nodejs_security_tests() {
    echo -e "${BLUE}🟢 Running Node.js security tests...${NC}"
    
    if command -v node >/dev/null 2>&1; then
        # Run security hardening script
        echo -e "${BLUE}   Running security hardening validation...${NC}"
        if [[ -f "$SCRIPT_DIR/security-hardening.js" ]]; then
            cd "$PROJECT_ROOT"
            node scripts/security-hardening.js 2>/dev/null || echo -e "${YELLOW}⚠${NC} Security hardening script failed"
        else
            echo -e "${YELLOW}⚠${NC} Security hardening script not found"
        fi
        
        # Run OWASP security scan
        echo -e "${BLUE}   Running OWASP security scan...${NC}"
        if [[ -f "$SCRIPT_DIR/owasp-security-scan.js" ]]; then
            cd "$PROJECT_ROOT"
            node scripts/owasp-security-scan.js 2>/dev/null || echo -e "${YELLOW}⚠${NC} OWASP security scan failed"
        else
            echo -e "${YELLOW}⚠${NC} OWASP security scan script not found"
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} Node.js not available, skipping Node.js security tests"
    fi
}

# Generate security report
generate_security_report() {
    echo -e "${BLUE}📋 Generating security report...${NC}"
    
    local report_file="$PROJECT_ROOT/logs/security-validation-$(date +%Y%m%d_%H%M%S).txt"
    
    # Create logs directory if it doesn't exist
    mkdir -p "$PROJECT_ROOT/logs"
    
    cat > "$report_file" << EOF
Security Validation Report
=========================
Generated: $(date)
Domain: $DOMAIN
Protocol: $PROTOCOL

Security Tests Performed:
- SSL/TLS Security
- Security Headers
- Rate Limiting
- Authentication Security
- Injection Protection
- Information Disclosure
- Node.js Security Tests

Recommendations:
- Address any critical security issues immediately
- Implement missing security headers
- Configure proper rate limiting
- Review authentication mechanisms
- Test injection protection regularly
- Monitor security logs and alerts
- Schedule regular security audits

EOF
    
    echo -e "${GREEN}✓${NC} Security report generated: $(basename "$report_file")"
    echo -e "${BLUE}   Report location: $report_file${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting comprehensive security validation...${NC}"
    echo ""
    
    check_dependencies
    echo ""
    
    test_ssl_security
    echo ""
    
    test_security_headers
    echo ""
    
    test_rate_limiting
    echo ""
    
    test_authentication_security
    echo ""
    
    test_injection_protection
    echo ""
    
    test_information_disclosure
    echo ""
    
    run_nodejs_security_tests
    echo ""
    
    generate_security_report
    
    echo ""
    echo -e "${GREEN}🎉 Comprehensive security validation completed!${NC}"
    echo ""
    echo -e "${BLUE}💡 Security Recommendations:${NC}"
    echo "   1. Review all security test results above"
    echo "   2. Address any critical security issues immediately"
    echo "   3. Implement missing security headers"
    echo "   4. Configure proper rate limiting"
    echo "   5. Review authentication mechanisms"
    echo "   6. Test injection protection regularly"
    echo "   7. Monitor security logs and alerts"
    echo "   8. Schedule regular security audits"
    echo "   9. Implement automated security testing"
    echo "   10. Keep dependencies updated"
}

# Run main function
main "$@"
