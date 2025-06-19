#!/bin/bash

# BomBot Load Testing Script
# Usage: ./run-load-tests.sh [test-type] [target-url]
# Example: ./run-load-tests.sh light https://bombot.vercel.app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="${1:-light}"
TARGET_URL="${2:-http://localhost:3000}"
RESULTS_DIR="tests/load/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}🚀 Starting BomBot Load Testing${NC}"
echo -e "${BLUE}Target URL: ${TARGET_URL}${NC}"
echo -e "${BLUE}Test Type: ${TEST_TYPE}${NC}"
echo -e "${BLUE}Timestamp: ${TIMESTAMP}${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"
    
    # Check if artillery is installed
    if ! command -v artillery &> /dev/null; then
        echo -e "${RED}❌ Artillery not found. Installing...${NC}"
        npm install -g artillery
    fi
    
    # Check if autocannon is installed
    if ! command -v autocannon &> /dev/null; then
        echo -e "${YELLOW}⚠️  Autocannon not found. Installing...${NC}"
        npm install -g autocannon
    fi
    
    # Check if target URL is reachable
    echo -e "${YELLOW}🌐 Testing connectivity to ${TARGET_URL}...${NC}"
    if curl -s --head --request GET "${TARGET_URL}" | grep "200" > /dev/null; then
        echo -e "${GREEN}✅ Target URL is reachable${NC}"
    else
        echo -e "${RED}❌ Target URL is not reachable. Please check the URL and try again.${NC}"
        exit 1
    fi
    
    echo ""
}

# Function to run pre-test warmup
warmup_server() {
    echo -e "${YELLOW}🔥 Warming up server...${NC}"
    
    # Simple warmup requests
    for i in {1..5}; do
        curl -s "${TARGET_URL}" > /dev/null || true
        sleep 1
    done
    
    echo -e "${GREEN}✅ Warmup complete${NC}"
    echo ""
}

# Function to run artillery test
run_artillery_test() {
    local test_config="$1"
    local test_name="$2"
    local output_file="${RESULTS_DIR}/${test_name}_${TIMESTAMP}"
    
    echo -e "${BLUE}🎯 Running ${test_name} test...${NC}"
    
    # Set environment variable for target URL
    export TARGET_URL="${TARGET_URL}"
    
    # Run artillery with JSON and HTML reports
    artillery run \
        --output "${output_file}.json" \
        "tests/load/${test_config}" || {
        echo -e "${RED}❌ Artillery test failed${NC}"
        return 1
    }
    
    # Generate HTML report
    artillery report \
        --output "${output_file}.html" \
        "${output_file}.json" || {
        echo -e "${YELLOW}⚠️  HTML report generation failed${NC}"
    }
    
    echo -e "${GREEN}✅ ${test_name} test completed${NC}"
    echo -e "${BLUE}📊 Results saved to: ${output_file}.html${NC}"
    echo ""
}

# Function to run quick stress test with autocannon
run_stress_test() {
    echo -e "${BLUE}⚡ Running quick stress test with autocannon...${NC}"
    
    local output_file="${RESULTS_DIR}/stress_test_${TIMESTAMP}.txt"
    
    # Run autocannon stress test
    autocannon \
        -c 20 \
        -d 30 \
        -j \
        "${TARGET_URL}" > "${output_file}" || {
        echo -e "${RED}❌ Stress test failed${NC}"
        return 1
    }
    
    echo -e "${GREEN}✅ Stress test completed${NC}"
    echo -e "${BLUE}📊 Results saved to: ${output_file}${NC}"
    echo ""
}

# Function to monitor system resources (if running locally)
monitor_resources() {
    if [[ "$TARGET_URL" == *"localhost"* ]]; then
        echo -e "${YELLOW}📊 Monitoring local system resources...${NC}"
        echo "Memory usage:" > "${RESULTS_DIR}/resources_${TIMESTAMP}.txt"
        free -h >> "${RESULTS_DIR}/resources_${TIMESTAMP}.txt"
        echo "" >> "${RESULTS_DIR}/resources_${TIMESTAMP}.txt"
        echo "CPU usage:" >> "${RESULTS_DIR}/resources_${TIMESTAMP}.txt"
        top -b -n1 | head -5 >> "${RESULTS_DIR}/resources_${TIMESTAMP}.txt"
    fi
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}📋 Generating test summary...${NC}"
    
    local summary_file="${RESULTS_DIR}/summary_${TIMESTAMP}.md"
    
    cat > "$summary_file" << EOF
# BomBot Load Test Summary

**Test Date:** $(date)
**Target URL:** ${TARGET_URL}
**Test Type:** ${TEST_TYPE}

## Test Configuration
- Tool: Artillery.io + Autocannon
- Duration: Varies by test type
- Virtual Users: Varies by test type

## Files Generated
EOF
    
    # List all generated files
    find "$RESULTS_DIR" -name "*${TIMESTAMP}*" -type f | while read -r file; do
        echo "- $(basename "$file")" >> "$summary_file"
    done
    
    cat >> "$summary_file" << EOF

## Key Metrics to Review
1. **Response Times**: Check p95 and p99 percentiles
2. **Error Rate**: Should be < 1% for production readiness
3. **Throughput**: Requests per second handled
4. **Concurrent Users**: Maximum sustainable load

## Next Steps
1. Review HTML reports for detailed metrics
2. Identify bottlenecks and performance issues
3. Compare with previous test results
4. Optimize based on findings

## Vercel-Specific Considerations
- Cold start latency for serverless functions
- OpenAI API rate limits
- OSV API rate limits
- Database connection pooling
EOF
    
    echo -e "${GREEN}✅ Summary generated: ${summary_file}${NC}"
}

# Main execution
main() {
    check_prerequisites
    warmup_server
    monitor_resources
    
    case "$TEST_TYPE" in
        "light")
            run_artillery_test "light-load.yml" "Light_Load"
            ;;
        "moderate")
            run_artillery_test "moderate-load.yml" "Moderate_Load"
            ;;
        "heavy")
            run_artillery_test "heavy-load.yml" "Heavy_Load"
            ;;
        "upload")
            run_artillery_test "upload-load.yml" "Upload_Load"
            ;;
        "survey")
            run_artillery_test "survey-simulation.yml" "Survey_Simulation"
            ;;
        "survey-safe")
            run_artillery_test "survey-production-safe.yml" "Survey_Production_Safe"
            ;;
        "stress")
            run_stress_test
            ;;
        "all")
            run_artillery_test "light-load.yml" "Light_Load"
            sleep 30  # Cool down period
            run_artillery_test "moderate-load.yml" "Moderate_Load"
            sleep 60  # Cool down period
            run_artillery_test "upload-load.yml" "Upload_Load"
            sleep 30  # Cool down period
            run_stress_test
            ;;
        *)
            echo -e "${RED}❌ Unknown test type: $TEST_TYPE${NC}"
            echo "Available test types: light, moderate, heavy, upload, survey, stress, all"
            exit 1
            ;;
    esac
    
    generate_summary
    
    echo -e "${GREEN}🎉 Load testing completed successfully!${NC}"
    echo -e "${BLUE}📊 Check the results in: ${RESULTS_DIR}${NC}"
    echo ""
    echo -e "${YELLOW}💡 Tips:${NC}"
    echo "- Open HTML reports in your browser for visual analysis"
    echo "- Compare results across different test runs"
    echo "- Monitor Vercel dashboard during tests"
    echo "- Check OpenAI usage limits if chat tests fail"
}

# Run main function
main "$@" 