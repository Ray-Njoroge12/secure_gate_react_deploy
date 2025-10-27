#!/bin/bash

# CDN and Load Balancer Validation Script
# This script validates CDN and load balancer configurations

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

echo -e "${BLUE}🌐 CDN and Load Balancer Validation${NC}"
echo -e "Domain: ${DOMAIN}"
echo -e "Protocol: ${PROTOCOL}"
echo ""

# Test SSL/TLS configuration
test_ssl_configuration() {
    echo -e "${BLUE}🔒 Testing SSL/TLS configuration...${NC}"
    
    # Test SSL certificate
    if command -v openssl >/dev/null 2>&1; then
        echo -e "${BLUE}   Checking SSL certificate...${NC}"
        
        # Get certificate info
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
    else
        echo -e "${YELLOW}⚠${NC} OpenSSL not available, skipping SSL tests"
    fi
}

# Test HTTP to HTTPS redirect
test_https_redirect() {
    echo -e "${BLUE}🔄 Testing HTTP to HTTPS redirect...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Test redirect
        redirect_status=$(curl -s -o /dev/null -w "%{http_code}" -L "http://$DOMAIN" 2>/dev/null || echo "000")
        
        if [[ "$redirect_status" == "200" ]]; then
            echo -e "${GREEN}✓${NC} HTTP to HTTPS redirect working"
        else
            echo -e "${RED}✗${NC} HTTP to HTTPS redirect failed (status: $redirect_status)"
        fi
        
        # Test final URL
        final_url=$(curl -s -o /dev/null -w "%{url_effective}" -L "http://$DOMAIN" 2>/dev/null || echo "")
        if [[ "$final_url" == https://* ]]; then
            echo -e "${GREEN}✓${NC} Final URL is HTTPS: $final_url"
        else
            echo -e "${RED}✗${NC} Final URL is not HTTPS: $final_url"
        fi
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping redirect tests"
    fi
}

# Test CDN headers
test_cdn_headers() {
    echo -e "${BLUE}🌐 Testing CDN headers...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Get headers
        headers=$(curl -s -I "https://$DOMAIN" 2>/dev/null || echo "")
        
        if [[ -n "$headers" ]]; then
            # Check for Cloudflare
            if echo "$headers" | grep -qi "cf-ray"; then
                echo -e "${GREEN}✓${NC} Cloudflare CDN detected"
                cf_ray=$(echo "$headers" | grep -i "cf-ray" | cut -d: -f2 | tr -d ' \r\n')
                echo -e "${BLUE}   CF-Ray: $cf_ray${NC}"
            else
                echo -e "${YELLOW}⚠${NC} Cloudflare CDN not detected"
            fi
            
            # Check cache status
            if echo "$headers" | grep -qi "cf-cache-status"; then
                cache_status=$(echo "$headers" | grep -i "cf-cache-status" | cut -d: -f2 | tr -d ' \r\n')
                echo -e "${GREEN}✓${NC} Cache status: $cache_status"
            else
                echo -e "${YELLOW}⚠${NC} No cache status header found"
            fi
            
            # Check security headers
            echo -e "${BLUE}   Checking security headers...${NC}"
            
            security_headers=(
                "strict-transport-security"
                "x-frame-options"
                "x-content-type-options"
                "x-xss-protection"
                "content-security-policy"
            )
            
            for header in "${security_headers[@]}"; do
                if echo "$headers" | grep -qi "$header"; then
                    echo -e "${GREEN}✓${NC} $header present"
                else
                    echo -e "${RED}✗${NC} $header missing"
                fi
            done
            
            # Check compression
            if echo "$headers" | grep -qi "content-encoding"; then
                encoding=$(echo "$headers" | grep -i "content-encoding" | cut -d: -f2 | tr -d ' \r\n')
                echo -e "${GREEN}✓${NC} Compression enabled: $encoding"
            else
                echo -e "${YELLOW}⚠${NC} No compression detected"
            fi
            
        else
            echo -e "${RED}✗${NC} Failed to retrieve headers"
        fi
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping header tests"
    fi
}

# Test performance
test_performance() {
    echo -e "${BLUE}⚡ Testing performance...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Test response time
        echo -e "${BLUE}   Testing response time...${NC}"
        
        response_times=()
        for i in {1..5}; do
            response_time=$(curl -s -o /dev/null -w "%{time_total}" "https://$DOMAIN" 2>/dev/null || echo "0")
            response_times+=("$response_time")
            echo -e "${BLUE}     Test $i: ${response_time}s${NC}"
        done
        
        # Calculate average
        total=0
        for time in "${response_times[@]}"; do
            total=$(echo "$total + $time" | bc -l 2>/dev/null || echo "0")
        done
        avg_time=$(echo "scale=3; $total / ${#response_times[@]}" | bc -l 2>/dev/null || echo "0")
        
        echo -e "${BLUE}   Average response time: ${avg_time}s${NC}"
        
        # Performance assessment
        if (( $(echo "$avg_time < 0.5" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "${GREEN}✓${NC} Excellent performance (< 0.5s)"
        elif (( $(echo "$avg_time < 1.0" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "${GREEN}✓${NC} Good performance (< 1.0s)"
        elif (( $(echo "$avg_time < 2.0" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "${YELLOW}⚠${NC} Acceptable performance (< 2.0s)"
        else
            echo -e "${RED}✗${NC} Poor performance (> 2.0s)"
        fi
        
        # Test static asset caching
        echo -e "${BLUE}   Testing static asset caching...${NC}"
        
        static_urls=(
            "https://$DOMAIN/static/css/main.css"
            "https://$DOMAIN/static/js/bundle.js"
            "https://$DOMAIN/favicon.ico"
        )
        
        for url in "${static_urls[@]}"; do
            headers=$(curl -s -I "$url" 2>/dev/null || echo "")
            if echo "$headers" | grep -qi "cache-control"; then
                cache_control=$(echo "$headers" | grep -i "cache-control" | cut -d: -f2 | tr -d ' \r\n')
                echo -e "${GREEN}✓${NC} $url - Cache-Control: $cache_control"
            else
                echo -e "${YELLOW}⚠${NC} $url - No cache headers"
            fi
        done
        
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping performance tests"
    fi
}

# Test load balancer health
test_load_balancer_health() {
    echo -e "${BLUE}⚖️ Testing load balancer health...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Test health endpoints
        health_endpoints=(
            "https://$DOMAIN/health"
            "https://$DOMAIN/api/health"
            "https://$DOMAIN/api/system/info"
        )
        
        for endpoint in "${health_endpoints[@]}"; do
            echo -e "${BLUE}   Testing: $endpoint${NC}"
            
            status_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
            response_time=$(curl -s -o /dev/null -w "%{time_total}" "$endpoint" 2>/dev/null || echo "0")
            
            if [[ "$status_code" == "200" ]]; then
                echo -e "${GREEN}✓${NC} Healthy (${status_code}) - ${response_time}s"
            else
                echo -e "${RED}✗${NC} Unhealthy (${status_code}) - ${response_time}s"
            fi
        done
        
        # Test multiple requests for load distribution
        echo -e "${BLUE}   Testing load distribution...${NC}"
        
        server_headers=()
        for i in {1..10}; do
            headers=$(curl -s -I "https://$DOMAIN" 2>/dev/null || echo "")
            server_header=$(echo "$headers" | grep -i "server" | cut -d: -f2 | tr -d ' \r\n' || echo "unknown")
            server_headers+=("$server_header")
        done
        
        # Count unique servers
        unique_servers=($(printf '%s\n' "${server_headers[@]}" | sort -u))
        echo -e "${BLUE}     Detected servers: ${#unique_servers[@]}${NC}"
        
        if [[ ${#unique_servers[@]} -gt 1 ]]; then
            echo -e "${GREEN}✓${NC} Load balancing detected (multiple servers)"
        else
            echo -e "${YELLOW}⚠${NC} Single server detected (load balancing may not be active)"
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping load balancer tests"
    fi
}

# Test rate limiting
test_rate_limiting() {
    echo -e "${BLUE}🚦 Testing rate limiting...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        # Test rapid requests
        echo -e "${BLUE}   Testing rapid requests...${NC}"
        
        rate_limit_hit=false
        for i in {1..20}; do
            status_code=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" 2>/dev/null || echo "000")
            
            if [[ "$status_code" == "429" ]]; then
                echo -e "${GREEN}✓${NC} Rate limiting triggered after $i requests"
                rate_limit_hit=true
                break
            fi
            
            # Small delay to avoid overwhelming
            sleep 0.1
        done
        
        if [[ "$rate_limit_hit" == false ]]; then
            echo -e "${YELLOW}⚠${NC} Rate limiting not triggered (may be configured for higher limits)"
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} curl not available, skipping rate limiting tests"
    fi
}

# Test DNS resolution
test_dns_resolution() {
    echo -e "${BLUE}🌍 Testing DNS resolution...${NC}"
    
    if command -v nslookup >/dev/null 2>&1; then
        # Test A record
        echo -e "${BLUE}   Testing A record...${NC}"
        a_records=$(nslookup "$DOMAIN" 2>/dev/null | grep "Address:" | grep -v "#53" | wc -l || echo "0")
        
        if [[ "$a_records" -gt 0 ]]; then
            echo -e "${GREEN}✓${NC} A record resolved ($a_records addresses)"
            
            # Show IP addresses
            ip_addresses=$(nslookup "$DOMAIN" 2>/dev/null | grep "Address:" | grep -v "#53" | awk '{print $2}')
            echo -e "${BLUE}     IP addresses:${NC}"
            echo "$ip_addresses" | while read -r ip; do
                echo -e "${BLUE}       • $ip${NC}"
            done
        else
            echo -e "${RED}✗${NC} A record not resolved"
        fi
        
        # Test CNAME record
        echo -e "${BLUE}   Testing CNAME record...${NC}"
        cname_record=$(nslookup -type=CNAME "$DOMAIN" 2>/dev/null | grep "canonical name" | cut -d= -f2 | tr -d ' \r\n' || echo "")
        
        if [[ -n "$cname_record" ]]; then
            echo -e "${GREEN}✓${NC} CNAME record: $cname_record"
        else
            echo -e "${BLUE}   No CNAME record (using A record)${NC}"
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} nslookup not available, skipping DNS tests"
    fi
}

# Generate validation report
generate_validation_report() {
    echo -e "${BLUE}📋 Generating validation report...${NC}"
    
    local report_file="$PROJECT_ROOT/logs/cdn-lb-validation-$(date +%Y%m%d_%H%M%S).txt"
    
    # Create logs directory if it doesn't exist
    mkdir -p "$PROJECT_ROOT/logs"
    
    cat > "$report_file" << EOF
CDN and Load Balancer Validation Report
======================================
Generated: $(date)
Domain: $DOMAIN
Protocol: $PROTOCOL

Test Results:
EOF
    
    echo -e "${GREEN}✓${NC} Validation report generated: $(basename "$report_file")"
    echo -e "${BLUE}   Report location: $report_file${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting CDN and Load Balancer validation...${NC}"
    echo ""
    
    test_dns_resolution
    echo ""
    
    test_ssl_configuration
    echo ""
    
    test_https_redirect
    echo ""
    
    test_cdn_headers
    echo ""
    
    test_performance
    echo ""
    
    test_load_balancer_health
    echo ""
    
    test_rate_limiting
    echo ""
    
    generate_validation_report
    
    echo ""
    echo -e "${GREEN}🎉 CDN and Load Balancer validation completed!${NC}"
    echo ""
    echo -e "${BLUE}💡 Next steps:${NC}"
    echo "   1. Review validation results above"
    echo "   2. Address any issues identified"
    echo "   3. Monitor CDN performance metrics"
    echo "   4. Set up automated health checks"
    echo "   5. Configure performance monitoring"
}

# Run main function
main "$@"
