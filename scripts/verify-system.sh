#!/bin/bash
# RKM System Verification Script (Bash version)
# Usage: ./scripts/verify-system.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Test configuration
TEST_DB="./test-verification.db"
TEST_DATA_DIR="./test-verification-data"

# Helper functions
print_header() {
    echo ""
    echo "================================================================================"
    echo "$1"
    echo "================================================================================"
}

print_check() {
    echo ""
    echo "Checking: $1"
}

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    if [ -n "$2" ]; then
        echo "  Details: $2"
    fi
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

cleanup() {
    if [ -f "$TEST_DB" ]; then
        rm -f "$TEST_DB"
    fi
    if [ -d "$TEST_DATA_DIR" ]; then
        rm -rf "$TEST_DATA_DIR"
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# ============================================================================
# Main Verification
# ============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║     Research Knowledge Manager - System Verification Workflow            ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Phase 1: Pre-flight Checks
print_header "PHASE 1: PRE-FLIGHT CHECKS"

# Check Node.js version
print_check "Node.js version"
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -ge 18 ]; then
    pass "Node.js $NODE_VERSION (>= v18 required)"
else
    fail "Node.js $NODE_VERSION is too old" "v18.x or higher required"
fi

# Check dependencies
print_check "Dependencies installed"
if [ -d "node_modules" ] && [ -d "node_modules/ruvector" ]; then
    pass "Critical dependencies found"
else
    fail "Dependencies missing" "Run: npm install"
fi

# Check build
print_check "Build exists"
if [ -f "dist/cli.js" ]; then
    FILE_COUNT=$(find dist -name "*.js" | wc -l)
    pass "Build ready ($FILE_COUNT JS files)"
else
    fail "Build not found" "Run: npm run build"
fi

# Check system capabilities
print_check "System capabilities"
if STATUS_OUTPUT=$(node dist/cli.js status --json 2>&1); then
    IMPL=$(echo "$STATUS_OUTPUT" | grep -o '"type":"[^"]*"' | head -1 | cut -d'"' -f4)
    pass "System capabilities available (Implementation: $IMPL)"
else
    fail "Cannot retrieve capabilities" "$STATUS_OUTPUT"
fi

# Phase 2: Test Environment Setup
print_header "PHASE 2: TEST ENVIRONMENT SETUP"

print_check "Creating test environment"
mkdir -p "$TEST_DATA_DIR"

# Create sample documents
cat > "$TEST_DATA_DIR/sample1.md" <<EOF
# Machine Learning Fundamentals

Machine learning is a subset of artificial intelligence that enables systems to learn from data.
EOF

cat > "$TEST_DATA_DIR/sample2.md" <<EOF
# Neural Networks

Neural networks are computing systems inspired by biological neural networks in animal brains.
EOF

cat > "$TEST_DATA_DIR/sample3.md" <<EOF
# Deep Learning Applications

Deep learning has revolutionized computer vision, natural language processing, and robotics.
EOF

if [ -f "$TEST_DATA_DIR/sample1.md" ]; then
    pass "Test environment created (3 sample documents)"
else
    fail "Failed to create test files"
fi

# Phase 3: Ingestion & Query Tests
print_header "PHASE 3: INGESTION & QUERY VERIFICATION"

# Test ingestion
print_check "Document ingestion"
if INGEST_OUTPUT=$(node dist/cli.js --db "$TEST_DB" --data-dir "$TEST_DATA_DIR" ingest --path "$TEST_DATA_DIR" --tag ml --tag test 2>&1); then
    DOC_COUNT=$(echo "$INGEST_OUTPUT" | grep -oE 'Ingested [0-9]+ documents|Documents: [0-9]+' | grep -oE '[0-9]+' | head -1)
    if [ "$DOC_COUNT" = "3" ]; then
        pass "Ingested $DOC_COUNT documents"
    else
        fail "Document count mismatch" "Expected 3, got $DOC_COUNT"
    fi
else
    fail "Ingestion failed" "$INGEST_OUTPUT"
fi

# Test query
print_check "Vector query"
if QUERY_OUTPUT=$(node dist/cli.js --db "$TEST_DB" --data-dir "$TEST_DATA_DIR" query "machine learning" -k 2 2>&1); then
    if echo "$QUERY_OUTPUT" | grep -qi "machine learning\|score:"; then
        RESULT_COUNT=$(echo "$QUERY_OUTPUT" | grep -c "^[0-9]\." || echo "0")
        pass "Query returned results ($RESULT_COUNT found)"
    else
        fail "No results found" "$QUERY_OUTPUT"
    fi
else
    fail "Query failed" "$QUERY_OUTPUT"
fi

# Test hybrid search
print_check "Hybrid search"
if SEARCH_OUTPUT=$(node dist/cli.js --db "$TEST_DB" --data-dir "$TEST_DATA_DIR" search "neural networks" -k 2 --format json 2>&1); then
    if echo "$SEARCH_OUTPUT" | grep -q '"results"'; then
        pass "Hybrid search successful"
    else
        fail "Search output malformed" "$SEARCH_OUTPUT"
    fi
else
    fail "Search failed" "$SEARCH_OUTPUT"
fi

# Test graph query
print_check "Graph query"
if GRAPH_OUTPUT=$(node dist/cli.js --db "$TEST_DB" --data-dir "$TEST_DATA_DIR" graph "MATCH (n:Document) RETURN n" --format json 2>&1); then
    if echo "$GRAPH_OUTPUT" | grep -q '"nodes"'; then
        NODE_COUNT=$(echo "$GRAPH_OUTPUT" | grep -oE '"nodes":\[[^]]*\]' | tr -cd ',' | wc -c || echo "0")
        pass "Graph query successful (found nodes)"
    else
        fail "Graph output malformed" "$GRAPH_OUTPUT"
    fi
else
    fail "Graph query failed" "$GRAPH_OUTPUT"
fi

# Phase 4: Advanced Features
print_header "PHASE 4: ADVANCED FEATURES"

# Test full status
print_check "Full status report"
if STATUS_FULL=$(node dist/cli.js --db "$TEST_DB" --data-dir "$TEST_DATA_DIR" status --full --json 2>&1); then
    if echo "$STATUS_FULL" | grep -q '"stats"'; then
        VECTORS=$(echo "$STATUS_FULL" | grep -oE '"totalVectors":[0-9]+' | grep -oE '[0-9]+' | head -1 || echo "0")
        NODES=$(echo "$STATUS_FULL" | grep -oE '"nodeCount":[0-9]+' | grep -oE '[0-9]+' | head -1 || echo "0")
        pass "Full status retrieved (Vectors: $VECTORS, Nodes: $NODES)"
    else
        fail "Status missing stats"
    fi
else
    fail "Full status check failed" "$STATUS_FULL"
fi

# Test semantic router
print_check "Semantic router"
if ROUTE_OUTPUT=$(node dist/cli.js route "Find all documents about machine learning" 2>&1); then
    if echo "$ROUTE_OUTPUT" | grep -q "Route:"; then
        ROUTE=$(echo "$ROUTE_OUTPUT" | grep "Route:" | cut -d':' -f2 | xargs || echo "unknown")
        pass "Router working (Route: $ROUTE)"
    else
        fail "Router output incomplete" "$ROUTE_OUTPUT"
    fi
else
    fail "Router failed" "$ROUTE_OUTPUT"
fi

# Summary
print_header "VERIFICATION SUMMARY"

PASS_RATE=0
if [ "$TOTAL_CHECKS" -gt 0 ]; then
    PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
fi

echo ""
echo "Total checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
if [ "$FAILED_CHECKS" -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
fi
echo "Pass rate: $PASS_RATE%"
echo ""

if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}🎉 All verification checks passed! System is ready.${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some checks failed. Please review the errors above.${NC}"
    echo ""
    exit 1
fi
