#!/bin/bash

###############################################################################
# RKM Test Scenarios Runner
#
# Runs all test scenarios from docs/TEST_SCENARIOS.md
# This script provides hands-on verification that your RKM installation works.
#
# Usage:
#   bash tests/run-scenarios.sh              # Run all scenarios
#   bash tests/run-scenarios.sh --verbose    # Show detailed output
#   bash tests/run-scenarios.sh --scenario 1 # Run specific scenario only
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERBOSE=false
SPECIFIC_SCENARIO=""
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIR="/tmp/rkm-scenarios-$$"
CLI_CMD="node ${PROJECT_ROOT}/dist/cli.js"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --scenario|-s)
            SPECIFIC_SCENARIO="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --verbose, -v           Show detailed command output"
            echo "  --scenario N, -s N      Run only scenario N (1-10)"
            echo "  --help, -h              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                      # Run all scenarios"
            echo "  $0 --verbose            # Run with detailed output"
            echo "  $0 --scenario 1         # Run only scenario 1"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_scenario() {
    echo -e "${YELLOW}>>> Test Scenario $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

print_failure() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

run_command() {
    local cmd="$1"
    local description="$2"

    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}Running:${NC} $cmd"
        if eval "$cmd"; then
            print_success "$description"
            return 0
        else
            print_failure "$description"
            return 1
        fi
    else
        if eval "$cmd" > /tmp/rkm-cmd-output-$$.log 2>&1; then
            print_success "$description"
            return 0
        else
            print_failure "$description"
            if [ -s /tmp/rkm-cmd-output-$$.log ]; then
                echo "  Error output:"
                cat /tmp/rkm-cmd-output-$$.log | head -5 | sed 's/^/    /'
            fi
            return 1
        fi
    fi
}

verify_output_contains() {
    local file="$1"
    local pattern="$2"
    local description="$3"

    if grep -q "$pattern" "$file" 2>/dev/null; then
        print_success "$description"
        return 0
    else
        print_failure "$description"
        if [ "$VERBOSE" = true ]; then
            echo "  Expected pattern: '$pattern'"
            echo "  Actual output:"
            cat "$file" | head -10 | sed 's/^/    /'
        fi
        return 1
    fi
}

# Setup
print_header "RKM Test Scenarios Runner"

print_info "Project root: $PROJECT_ROOT"
print_info "Test directory: $TEST_DIR"
print_info "Verbose mode: $VERBOSE"

# Check prerequisites
print_header "Checking Prerequisites"

if [ ! -f "${PROJECT_ROOT}/package.json" ]; then
    print_failure "package.json not found. Are you in the project root?"
    exit 1
else
    print_success "Found package.json"
fi

if [ ! -d "${PROJECT_ROOT}/dist" ]; then
    print_info "Build directory not found. Building project..."
    cd "$PROJECT_ROOT"
    if npm run build > /tmp/rkm-build-$$.log 2>&1; then
        print_success "Project built successfully"
    else
        print_failure "Build failed. See /tmp/rkm-build-$$.log"
        exit 1
    fi
else
    print_success "Build directory exists"
fi

# Create test directory
mkdir -p "$TEST_DIR"
print_success "Created test directory: $TEST_DIR"

# Cleanup function
cleanup() {
    if [ "$VERBOSE" = false ]; then
        rm -f /tmp/rkm-cmd-output-$$.log /tmp/rkm-build-$$.log
    fi
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
        print_info "Cleaned up test directory"
    fi
}
trap cleanup EXIT

###############################################################################
# Scenario 1: Basic Ingestion Test
###############################################################################
scenario_1() {
    print_scenario 1 "Basic Ingestion Test"

    # Create test document
    cat > "$TEST_DIR/test-doc.md" << 'EOF'
# Test Document for RKM

This document tests the ingestion pipeline with known content.

## Key Topics
- Vector embeddings
- Knowledge graphs
- Semantic search

The RKM system should be able to find this content when searching for "vector embeddings" or "knowledge graphs".
EOF

    # Ingest the document
    run_command \
        "$CLI_CMD ingest --path '$TEST_DIR/test-doc.md' --db '$TEST_DIR/test-s1.db' --tag test" \
        "Ingest test document"

    # Verify database was created
    if [ -f "$TEST_DIR/test-s1.db" ]; then
        print_success "Database file created"
    else
        print_failure "Database file not created"
    fi

    echo ""
}

###############################################################################
# Scenario 2: Search Test
###############################################################################
scenario_2() {
    print_scenario 2 "Search Test"

    # Prerequisite: Run scenario 1 if not already run
    if [ ! -f "$TEST_DIR/test-s1.db" ]; then
        print_info "Running prerequisite scenario 1..."
        scenario_1
    fi

    # Run search
    $CLI_CMD search "vector embeddings" --db "$TEST_DIR/test-s1.db" -k 3 > "$TEST_DIR/search-output.txt" 2>&1

    # Verify results
    verify_output_contains "$TEST_DIR/search-output.txt" "Test Document for RKM" "Search found test document"
    verify_output_contains "$TEST_DIR/search-output.txt" "score:" "Search returned score"

    # Test different queries
    $CLI_CMD search "knowledge graphs" --db "$TEST_DIR/test-s1.db" -k 3 > "$TEST_DIR/search-kg.txt" 2>&1
    verify_output_contains "$TEST_DIR/search-kg.txt" "Test Document" "Search with 'knowledge graphs' works"

    echo ""
}

###############################################################################
# Scenario 3: Status Test
###############################################################################
scenario_3() {
    print_scenario 3 "Status Test"

    # Basic status
    run_command \
        "$CLI_CMD status" \
        "Basic status command"

    # Full status with database
    if [ ! -f "$TEST_DIR/test-s1.db" ]; then
        print_info "Running prerequisite scenario 1..."
        scenario_1
    fi

    $CLI_CMD status --db "$TEST_DIR/test-s1.db" --full > "$TEST_DIR/status-full.txt" 2>&1
    verify_output_contains "$TEST_DIR/status-full.txt" "RuVector Capabilities" "Status shows capabilities"
    verify_output_contains "$TEST_DIR/status-full.txt" "Vector Store:" "Status shows vector store"
    verify_output_contains "$TEST_DIR/status-full.txt" "Total vectors:" "Status shows vector count"

    # JSON format
    run_command \
        "$CLI_CMD status --db '$TEST_DIR/test-s1.db' --full --json | jq '.' > /dev/null 2>&1" \
        "Status JSON output is valid"

    echo ""
}

###############################################################################
# Scenario 4: Context Export Test
###############################################################################
scenario_4() {
    print_scenario 4 "Context Export Test"

    # Prerequisite
    if [ ! -f "$TEST_DIR/test-s1.db" ]; then
        print_info "Running prerequisite scenario 1..."
        scenario_1
    fi

    # Generate context
    $CLI_CMD context "vector embeddings and knowledge graphs" --db "$TEST_DIR/test-s1.db" -k 3 > "$TEST_DIR/context.txt" 2>&1

    # Verify format
    verify_output_contains "$TEST_DIR/context.txt" '```text' "Context has opening fence"
    verify_output_contains "$TEST_DIR/context.txt" "query:" "Context includes query"
    verify_output_contains "$TEST_DIR/context.txt" "Test Document" "Context includes document content"
    verify_output_contains "$TEST_DIR/context.txt" '```$' "Context has closing fence"

    echo ""
}

###############################################################################
# Scenario 5: Route Test
###############################################################################
scenario_5() {
    print_scenario 5 "Route Test"

    # Test vector route
    $CLI_CMD route "find documents about machine learning" > "$TEST_DIR/route-vector.txt" 2>&1
    verify_output_contains "$TEST_DIR/route-vector.txt" "Route:" "Route analysis produces route"
    verify_output_contains "$TEST_DIR/route-vector.txt" "Confidence:" "Route analysis shows confidence"
    verify_output_contains "$TEST_DIR/route-vector.txt" "Reasoning:" "Route analysis provides reasoning"

    # Test graph route
    $CLI_CMD route "show me all documents that cite document X" > "$TEST_DIR/route-graph.txt" 2>&1
    verify_output_contains "$TEST_DIR/route-graph.txt" "Route:" "Graph route detected"

    # Test verbose mode
    $CLI_CMD route "find related papers and their citations" --verbose > "$TEST_DIR/route-verbose.txt" 2>&1
    verify_output_contains "$TEST_DIR/route-verbose.txt" "Intent Analysis:" "Verbose mode shows intent analysis"
    verify_output_contains "$TEST_DIR/route-verbose.txt" "Execution Strategy:" "Verbose mode shows strategy"

    echo ""
}

###############################################################################
# Scenario 6: Graph Query Test
###############################################################################
scenario_6() {
    print_scenario 6 "Graph Query Test"

    # Prerequisite
    if [ ! -f "$TEST_DIR/test-s1.db" ]; then
        print_info "Running prerequisite scenario 1..."
        scenario_1
    fi

    # Query all documents
    $CLI_CMD graph "MATCH (n:Document) RETURN n" --db "$TEST_DIR/test-s1.db" > "$TEST_DIR/graph-query.txt" 2>&1
    verify_output_contains "$TEST_DIR/graph-query.txt" "Nodes:" "Graph query returns nodes"
    verify_output_contains "$TEST_DIR/graph-query.txt" "Edges:" "Graph query returns edges"

    # JSON format
    run_command \
        "$CLI_CMD graph 'MATCH (n:Document) RETURN n' --db '$TEST_DIR/test-s1.db' --format json | jq '.' > /dev/null 2>&1" \
        "Graph JSON output is valid"

    echo ""
}

###############################################################################
# Scenario 7: Multi-File Ingestion Test
###############################################################################
scenario_7() {
    print_scenario 7 "Multi-File Ingestion Test"

    # Create test files
    mkdir -p "$TEST_DIR/multi-test"

    cat > "$TEST_DIR/multi-test/doc1.md" << 'EOF'
# Machine Learning Document
This document discusses machine learning algorithms and neural networks.
EOF

    cat > "$TEST_DIR/multi-test/doc2.txt" << 'EOF'
Neural Networks Research
This is research on neural network architectures and deep learning.
EOF

    cat > "$TEST_DIR/multi-test/doc3.json" << 'EOF'
{
  "title": "Knowledge Graphs",
  "content": "This document covers knowledge graph fundamentals and applications."
}
EOF

    # Ingest directory
    $CLI_CMD ingest --path "$TEST_DIR/multi-test" --db "$TEST_DIR/test-multi.db" --tag batch > "$TEST_DIR/multi-ingest.txt" 2>&1
    verify_output_contains "$TEST_DIR/multi-ingest.txt" "Documents: 3" "Ingested 3 documents"

    # Verify each document is searchable
    $CLI_CMD search "machine learning algorithms" --db "$TEST_DIR/test-multi.db" -k 1 > "$TEST_DIR/search-doc1.txt" 2>&1
    verify_output_contains "$TEST_DIR/search-doc1.txt" "Machine Learning" "Found doc1.md"

    $CLI_CMD search "neural network architectures" --db "$TEST_DIR/test-multi.db" -k 1 > "$TEST_DIR/search-doc2.txt" 2>&1
    verify_output_contains "$TEST_DIR/search-doc2.txt" "Neural Networks Research" "Found doc2.txt"

    $CLI_CMD search "knowledge graph fundamentals" --db "$TEST_DIR/test-multi.db" -k 1 > "$TEST_DIR/search-doc3.txt" 2>&1
    verify_output_contains "$TEST_DIR/search-doc3.txt" "Knowledge Graphs" "Found doc3.json"

    # Check statistics
    $CLI_CMD status --db "$TEST_DIR/test-multi.db" --full > "$TEST_DIR/multi-status.txt" 2>&1
    verify_output_contains "$TEST_DIR/multi-status.txt" "Total vectors: 3" "Status shows 3 vectors"

    echo ""
}

###############################################################################
# Scenario 8: Search Output Formats Test
###############################################################################
scenario_8() {
    print_scenario 8 "Search Output Formats Test"

    # Prerequisite
    if [ ! -f "$TEST_DIR/test-s1.db" ]; then
        print_info "Running prerequisite scenario 1..."
        scenario_1
    fi

    # Text format (default)
    run_command \
        "$CLI_CMD search 'vector embeddings' --db '$TEST_DIR/test-s1.db' -k 2 > '$TEST_DIR/search-text.txt' 2>&1" \
        "Search with text format"

    # JSON format
    $CLI_CMD search "vector embeddings" --db "$TEST_DIR/test-s1.db" -k 2 --format json > "$TEST_DIR/search-json.txt" 2>&1
    verify_output_contains "$TEST_DIR/search-json.txt" '"query":' "JSON format has query field"
    verify_output_contains "$TEST_DIR/search-json.txt" '"results":' "JSON format has results field"

    # Validate JSON
    run_command \
        "jq '.' < '$TEST_DIR/search-json.txt' > /dev/null 2>&1" \
        "JSON output is valid"

    # Markdown format
    $CLI_CMD search "vector embeddings" --db "$TEST_DIR/test-s1.db" -k 2 --format markdown > "$TEST_DIR/search-md.txt" 2>&1
    verify_output_contains "$TEST_DIR/search-md.txt" "^#" "Markdown format has headers"

    echo ""
}

###############################################################################
# Scenario 9: Legacy Mode Compatibility Test
###############################################################################
scenario_9() {
    print_scenario 9 "Legacy Mode Compatibility Test"

    # Create fresh test file
    cat > "$TEST_DIR/legacy-test.md" << 'EOF'
# Legacy Test Document
Testing legacy ingestion and query pipeline.
EOF

    # Ingest with legacy mode
    $CLI_CMD ingest --path "$TEST_DIR/legacy-test.md" --db "$TEST_DIR/test-legacy.db" --legacy > "$TEST_DIR/legacy-ingest.txt" 2>&1
    verify_output_contains "$TEST_DIR/legacy-ingest.txt" "Ingested.*documents.*legacy mode" "Legacy ingestion works"

    # Query with legacy mode
    $CLI_CMD query "legacy" --db "$TEST_DIR/test-legacy.db" -k 3 --legacy > "$TEST_DIR/legacy-query.txt" 2>&1
    verify_output_contains "$TEST_DIR/legacy-query.txt" "Legacy Test Document" "Legacy query works"
    verify_output_contains "$TEST_DIR/legacy-query.txt" "source:" "Legacy query shows source"
    verify_output_contains "$TEST_DIR/legacy-query.txt" "distance:" "Legacy query shows distance"

    echo ""
}

###############################################################################
# Scenario 10: Error Handling Test
###############################################################################
scenario_10() {
    print_scenario 10 "Error Handling Test"

    # Test missing file
    if $CLI_CMD ingest --path /nonexistent/path.md --db "$TEST_DIR/error.db" > "$TEST_DIR/error-missing.txt" 2>&1; then
        print_failure "Should have failed with missing file"
    else
        print_success "Correctly handles missing file"
    fi

    # Test invalid command
    if $CLI_CMD invalidcommand > "$TEST_DIR/error-cmd.txt" 2>&1; then
        print_failure "Should have failed with invalid command"
    else
        print_success "Correctly handles invalid command"
    fi

    # Test empty database search
    rm -f "$TEST_DIR/empty.db"
    $CLI_CMD search "test" --db "$TEST_DIR/empty.db" > "$TEST_DIR/error-empty.txt" 2>&1 || true
    if grep -q -E "(No results|empty)" "$TEST_DIR/error-empty.txt" 2>/dev/null; then
        print_success "Handles empty database gracefully"
    else
        print_failure "Empty database error not handled properly"
    fi

    echo ""
}

###############################################################################
# Main execution
###############################################################################

# Run scenarios
if [ -n "$SPECIFIC_SCENARIO" ]; then
    # Run specific scenario
    case "$SPECIFIC_SCENARIO" in
        1) scenario_1 ;;
        2) scenario_2 ;;
        3) scenario_3 ;;
        4) scenario_4 ;;
        5) scenario_5 ;;
        6) scenario_6 ;;
        7) scenario_7 ;;
        8) scenario_8 ;;
        9) scenario_9 ;;
        10) scenario_10 ;;
        *)
            echo "Invalid scenario number. Must be 1-10."
            exit 1
            ;;
    esac
else
    # Run all scenarios
    print_header "Running All Test Scenarios"

    scenario_1
    scenario_2
    scenario_3
    scenario_4
    scenario_5
    scenario_6
    scenario_7
    scenario_8
    scenario_9
    scenario_10
fi

# Summary
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "Test Results Summary"

echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo -e "Duration:     ${BLUE}${DURATION}s${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    print_info "Your RKM installation is working correctly."
    print_info "Next steps:"
    echo "  1. Ingest your research documents"
    echo "  2. Set up MCP integration with Claude Code"
    echo "  3. Explore advanced features (GNN, SONA, graphs)"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC}"
    echo ""
    print_info "Troubleshooting:"
    echo "  1. Check prerequisites: npm install && npm run build"
    echo "  2. Run with --verbose for detailed output"
    echo "  3. See docs/TEST_SCENARIOS.md for expected behavior"
    echo "  4. Review error messages above"
    echo ""
    exit 1
fi
