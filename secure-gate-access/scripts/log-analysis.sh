#!/bin/bash

# Log Analysis Script
# This script analyzes application logs for patterns, errors, and performance issues

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
LOG_DIR="${PROJECT_ROOT}/logs"
ANALYSIS_DIR="${PROJECT_ROOT}/logs/analysis"
DATE_RANGE="${1:-24h}"  # Default to last 24 hours
LOG_LEVEL="${2:-all}"   # Default to all log levels

echo -e "${BLUE}📊 Log Analysis for Secure Gate Access Control System${NC}"
echo -e "Date Range: ${DATE_RANGE}"
echo -e "Log Level: ${LOG_LEVEL}"
echo -e "Analysis Directory: ${ANALYSIS_DIR}"
echo ""

# Create analysis directory
create_analysis_directory() {
    echo -e "${BLUE}📁 Creating analysis directory...${NC}"
    
    if [ ! -d "$ANALYSIS_DIR" ]; then
        mkdir -p "$ANALYSIS_DIR"
        echo -e "${GREEN}✓${NC} Created analysis directory: $ANALYSIS_DIR"
    else
        echo -e "${GREEN}✓${NC} Analysis directory already exists: $ANALYSIS_DIR"
    fi
}

# Find log files
find_log_files() {
    echo -e "${BLUE}🔍 Finding log files...${NC}"
    
    # Find all log files in the last specified time range
    if [ "$DATE_RANGE" = "24h" ]; then
        FIND_ARGS="-mtime -1"
    elif [ "$DATE_RANGE" = "7d" ]; then
        FIND_ARGS="-mtime -7"
    elif [ "$DATE_RANGE" = "30d" ]; then
        FIND_ARGS="-mtime -30"
    else
        FIND_ARGS=""
    fi
    
    LOG_FILES=$(find "$LOG_DIR" -name "*.log" -type f $FIND_ARGS 2>/dev/null || true)
    
    if [ -z "$LOG_FILES" ]; then
        echo -e "${YELLOW}⚠${NC} No log files found in $LOG_DIR"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} Found log files:"
    echo "$LOG_FILES" | while read -r file; do
        if [ -f "$file" ]; then
            echo -e "   • $(basename "$file") ($(du -h "$file" | cut -f1))"
        fi
    done
}

# Analyze error patterns
analyze_error_patterns() {
    echo -e "${BLUE}🔍 Analyzing error patterns...${NC}"
    
    local error_report="$ANALYSIS_DIR/error-analysis-$(date +%Y%m%d_%H%M%S).txt"
    
    echo "Error Analysis Report" > "$error_report"
    echo "====================" >> "$error_report"
    echo "Generated: $(date)" >> "$error_report"
    echo "Date Range: $DATE_RANGE" >> "$error_report"
    echo "" >> "$error_report"
    
    # Count errors by type
    echo "Error Count by Type:" >> "$error_report"
    echo "-------------------" >> "$error_report"
    
    grep -h "ERROR\|FATAL" $LOG_FILES 2>/dev/null | \
        awk '{print $4}' | \
        sort | uniq -c | sort -nr | head -20 >> "$error_report" 2>/dev/null || \
        echo "No error patterns found" >> "$error_report"
    
    echo "" >> "$error_report"
    
    # Top error messages
    echo "Top Error Messages:" >> "$error_report"
    echo "------------------" >> "$error_report"
    
    grep -h "ERROR\|FATAL" $LOG_FILES 2>/dev/null | \
        awk -F'ERROR ' '{print $2}' | \
        awk -F'FATAL ' '{print $2}' | \
        sort | uniq -c | sort -nr | head -10 >> "$error_report" 2>/dev/null || \
        echo "No error messages found" >> "$error_report"
    
    echo "" >> "$error_report"
    
    # Error frequency over time
    echo "Error Frequency (Last 24 Hours):" >> "$error_report"
    echo "--------------------------------" >> "$error_report"
    
    for hour in {0..23}; do
        hour_str=$(printf "%02d" $hour)
        count=$(grep -h "ERROR\|FATAL" $LOG_FILES 2>/dev/null | \
            grep "$(date -d "$hour_str:00:00" '+%Y-%m-%d %H')" | wc -l 2>/dev/null || echo 0)
        echo "$hour_str:00 - $count errors" >> "$error_report"
    done
    
    echo -e "${GREEN}✓${NC} Error analysis completed: $(basename "$error_report")"
}

# Analyze performance patterns
analyze_performance_patterns() {
    echo -e "${BLUE}🔍 Analyzing performance patterns...${NC}"
    
    local perf_report="$ANALYSIS_DIR/performance-analysis-$(date +%Y%m%d_%H%M%S).txt"
    
    echo "Performance Analysis Report" > "$perf_report"
    echo "===========================" >> "$perf_report"
    echo "Generated: $(date)" >> "$perf_report"
    echo "Date Range: $DATE_RANGE" >> "$perf_report"
    echo "" >> "$perf_report"
    
    # Response time analysis
    echo "Response Time Analysis:" >> "$perf_report"
    echo "----------------------" >> "$perf_report"
    
    # Extract response times from logs
    grep -h "response_time\|duration" $LOG_FILES 2>/dev/null | \
        grep -o '[0-9]\+ms\|[0-9]\+\.[0-9]\+s' | \
        sort -n | \
        awk '
        {
            if ($1 ~ /ms$/) {
                gsub(/ms$/, "", $1)
                times[NR] = $1
            } else if ($1 ~ /s$/) {
                gsub(/s$/, "", $1)
                times[NR] = $1 * 1000
            }
        }
        END {
            n = asort(times)
            if (n > 0) {
                print "Count: " n
                print "Min: " times[1] "ms"
                print "Max: " times[n] "ms"
                print "Median: " times[int(n/2)] "ms"
                print "95th percentile: " times[int(n*0.95)] "ms"
                print "99th percentile: " times[int(n*0.99)] "ms"
            }
        }' >> "$perf_report" 2>/dev/null || \
        echo "No response time data found" >> "$perf_report"
    
    echo "" >> "$perf_report"
    
    # Slow requests
    echo "Slow Requests (>1s):" >> "$perf_report"
    echo "-------------------" >> "$perf_report"
    
    grep -h "response_time\|duration" $LOG_FILES 2>/dev/null | \
        grep -E '[1-9][0-9][0-9][0-9]ms|[1-9]\.[0-9]\+s' | \
        head -20 >> "$perf_report" 2>/dev/null || \
        echo "No slow requests found" >> "$perf_report"
    
    echo "" >> "$perf_report"
    
    # Request frequency
    echo "Request Frequency:" >> "$perf_report"
    echo "-----------------" >> "$perf_report"
    
    # Count requests per hour
    for hour in {0..23}; do
        hour_str=$(printf "%02d" $hour)
        count=$(grep -h "GET\|POST\|PUT\|DELETE" $LOG_FILES 2>/dev/null | \
            grep "$(date -d "$hour_str:00:00" '+%Y-%m-%d %H')" | wc -l 2>/dev/null || echo 0)
        echo "$hour_str:00 - $count requests" >> "$perf_report"
    done
    
    echo -e "${GREEN}✓${NC} Performance analysis completed: $(basename "$perf_report")"
}

# Analyze security patterns
analyze_security_patterns() {
    echo -e "${BLUE}🔍 Analyzing security patterns...${NC}"
    
    local security_report="$ANALYSIS_DIR/security-analysis-$(date +%Y%m%d_%H%M%S).txt"
    
    echo "Security Analysis Report" > "$security_report"
    echo "=======================" >> "$security_report"
    echo "Generated: $(date)" >> "$security_report"
    echo "Date Range: $DATE_RANGE" >> "$security_report"
    echo "" >> "$security_report"
    
    # Failed login attempts
    echo "Failed Login Attempts:" >> "$security_report"
    echo "---------------------" >> "$security_report"
    
    grep -h "login.*failed\|authentication.*failed\|401\|403" $LOG_FILES 2>/dev/null | \
        wc -l | awk '{print "Total failed attempts: " $1}' >> "$security_report"
    
    # Top IP addresses with failed attempts
    echo "" >> "$security_report"
    echo "Top IPs with Failed Attempts:" >> "$security_report"
    echo "----------------------------" >> "$security_report"
    
    grep -h "login.*failed\|authentication.*failed\|401\|403" $LOG_FILES 2>/dev/null | \
        grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+' | \
        sort | uniq -c | sort -nr | head -10 >> "$security_report" 2>/dev/null || \
        echo "No IP data found" >> "$security_report"
    
    # Suspicious activity patterns
    echo "" >> "$security_report"
    echo "Suspicious Activity:" >> "$security_report"
    echo "-------------------" >> "$security_report"
    
    # Rate limiting violations
    rate_limit_violations=$(grep -h "rate.*limit\|429" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    echo "Rate limit violations: $rate_limit_violations" >> "$security_report"
    
    # SQL injection attempts
    sql_injection_attempts=$(grep -h -i "union\|select.*from\|drop.*table\|insert.*into" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    echo "Potential SQL injection attempts: $sql_injection_attempts" >> "$security_report"
    
    # XSS attempts
    xss_attempts=$(grep -h -i "<script\|javascript:\|onload=" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    echo "Potential XSS attempts: $xss_attempts" >> "$security_report"
    
    echo -e "${GREEN}✓${NC} Security analysis completed: $(basename "$security_report")"
}

# Analyze application health
analyze_application_health() {
    echo -e "${BLUE}🔍 Analyzing application health...${NC}"
    
    local health_report="$ANALYSIS_DIR/health-analysis-$(date +%Y%m%d_%H%M%S).txt"
    
    echo "Application Health Report" > "$health_report"
    echo "=========================" >> "$health_report"
    echo "Generated: $(date)" >> "$health_report"
    echo "Date Range: $DATE_RANGE" >> "$health_report"
    echo "" >> "$health_report"
    
    # Service uptime
    echo "Service Status:" >> "$health_report"
    echo "--------------" >> "$health_report"
    
    # Check for service start/stop events
    service_starts=$(grep -h "starting\|started\|listening" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    service_stops=$(grep -h "stopping\|stopped\|shutdown" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    
    echo "Service starts: $service_starts" >> "$health_report"
    echo "Service stops: $service_stops" >> "$health_report"
    echo "" >> "$health_report"
    
    # Health check results
    echo "Health Check Results:" >> "$health_report"
    echo "--------------------" >> "$health_report"
    
    health_checks=$(grep -h "health.*check\|/health" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    failed_health_checks=$(grep -h "health.*check.*failed\|health.*error" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    
    echo "Total health checks: $health_checks" >> "$health_report"
    echo "Failed health checks: $failed_health_checks" >> "$health_report"
    
    if [ "$health_checks" -gt 0 ]; then
        success_rate=$(echo "scale=2; ($health_checks - $failed_health_checks) * 100 / $health_checks" | bc 2>/dev/null || echo "N/A")
        echo "Success rate: $success_rate%" >> "$health_report"
    fi
    
    echo "" >> "$health_report"
    
    # Memory usage patterns
    echo "Memory Usage Patterns:" >> "$health_report"
    echo "---------------------" >> "$health_report"
    
    grep -h "memory\|heap" $LOG_FILES 2>/dev/null | \
        grep -o '[0-9]\+MB\|[0-9]\+\.[0-9]\+GB' | \
        sort | uniq -c | sort -nr | head -10 >> "$health_report" 2>/dev/null || \
        echo "No memory usage data found" >> "$health_report"
    
    echo -e "${GREEN}✓${NC} Health analysis completed: $(basename "$health_report")"
}

# Generate summary report
generate_summary_report() {
    echo -e "${BLUE}📝 Generating summary report...${NC}"
    
    local summary_report="$ANALYSIS_DIR/summary-$(date +%Y%m%d_%H%M%S).txt"
    
    echo "Log Analysis Summary Report" > "$summary_report"
    echo "===========================" >> "$summary_report"
    echo "Generated: $(date)" >> "$summary_report"
    echo "Date Range: $DATE_RANGE" >> "$summary_report"
    echo "Log Level: $LOG_LEVEL" >> "$summary_report"
    echo "" >> "$summary_report"
    
    # Overall statistics
    echo "Overall Statistics:" >> "$summary_report"
    echo "------------------" >> "$summary_report"
    
    total_log_lines=$(wc -l $LOG_FILES 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
    total_log_size=$(du -ch $LOG_FILES 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    
    echo "Total log lines: $total_log_lines" >> "$summary_report"
    echo "Total log size: $total_log_size" >> "$summary_report"
    echo "" >> "$summary_report"
    
    # Error summary
    echo "Error Summary:" >> "$summary_report"
    echo "-------------" >> "$summary_report"
    
    error_count=$(grep -h "ERROR\|FATAL" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    warning_count=$(grep -h "WARN\|WARNING" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    
    echo "Error count: $error_count" >> "$summary_report"
    echo "Warning count: $warning_count" >> "$summary_report"
    
    if [ "$total_log_lines" -gt 0 ]; then
        error_rate=$(echo "scale=2; $error_count * 100 / $total_log_lines" | bc 2>/dev/null || echo "N/A")
        echo "Error rate: $error_rate%" >> "$summary_report"
    fi
    
    echo "" >> "$summary_report"
    
    # Performance summary
    echo "Performance Summary:" >> "$summary_report"
    echo "-------------------" >> "$summary_report"
    
    slow_requests=$(grep -h "response_time\|duration" $LOG_FILES 2>/dev/null | \
        grep -E '[1-9][0-9][0-9][0-9]ms|[1-9]\.[0-9]\+s' | wc -l || echo 0)
    
    echo "Slow requests (>1s): $slow_requests" >> "$summary_report"
    echo "" >> "$summary_report"
    
    # Security summary
    echo "Security Summary:" >> "$summary_report"
    echo "----------------" >> "$summary_report"
    
    failed_logins=$(grep -h "login.*failed\|authentication.*failed\|401" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    rate_limit_violations=$(grep -h "rate.*limit\|429" $LOG_FILES 2>/dev/null | wc -l || echo 0)
    
    echo "Failed login attempts: $failed_logins" >> "$summary_report"
    echo "Rate limit violations: $rate_limit_violations" >> "$summary_report"
    echo "" >> "$summary_report"
    
    # Recommendations
    echo "Recommendations:" >> "$summary_report"
    echo "---------------" >> "$summary_report"
    
    if [ "$error_count" -gt 100 ]; then
        echo "• High error count detected. Review error patterns and fix underlying issues." >> "$summary_report"
    fi
    
    if [ "$slow_requests" -gt 50 ]; then
        echo "• High number of slow requests. Consider performance optimization." >> "$summary_report"
    fi
    
    if [ "$failed_logins" -gt 100 ]; then
        echo "• High number of failed login attempts. Review security measures." >> "$summary_report"
    fi
    
    if [ "$rate_limit_violations" -gt 50 ]; then
        echo "• High rate limit violations. Consider adjusting rate limits or investigating abuse." >> "$summary_report"
    fi
    
    echo -e "${GREEN}✓${NC} Summary report generated: $(basename "$summary_report")"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting log analysis...${NC}"
    echo ""
    
    create_analysis_directory
    
    if find_log_files; then
        analyze_error_patterns
        analyze_performance_patterns
        analyze_security_patterns
        analyze_application_health
        generate_summary_report
        
        echo ""
        echo -e "${GREEN}🎉 Log analysis completed successfully!${NC}"
        echo ""
        echo -e "${BLUE}📋 Generated Reports:${NC}"
        ls -la "$ANALYSIS_DIR"/*.txt 2>/dev/null | while read -r line; do
            echo -e "   • $(basename $(echo "$line" | awk '{print $NF}'))"
        done
        echo ""
        echo -e "${BLUE}💡 Next steps:${NC}"
        echo "   1. Review generated reports for insights"
        echo "   2. Address any critical issues identified"
        echo "   3. Schedule regular log analysis"
        echo "   4. Set up automated alerts based on patterns"
    else
        echo -e "${RED}❌ Log analysis failed - no log files found!${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
