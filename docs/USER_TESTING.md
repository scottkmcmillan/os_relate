# RKM User Testing Guide

This guide explains how to run user tests to verify the RKM (Research Knowledge Manager) system is working correctly.

## Quick Start

```bash
# Run all CLI tests
npm test -- tests/cli/

# Run with verbose output
npm test -- tests/cli/ --reporter=verbose

# Run specific test file
npm test -- tests/cli/cli.test.ts

# Run with coverage
npm run test:coverage -- tests/cli/
```

## Test Categories

### 1. Status Command Tests

Verify system status and capabilities:

```bash
# Check basic status
npx tsx src/cli.ts status

# Expected: Shows RuVector capabilities, module availability

# Check JSON output
npx tsx src/cli.ts status --json

# Expected: Valid JSON with capabilities object

# Check full status with statistics
npx tsx src/cli.ts status --full

# Expected: Shows vector store, graph store, and cognitive stats
```

**Pass Criteria:**
- Exit code: 0
- Output contains "RuVector Capabilities"
- JSON mode produces valid JSON

### 2. Ingest Command Tests

Test document ingestion pipeline:

```bash
# Ingest a test file
npx tsx src/cli.ts ingest --path tests/fixtures/sample.md

# Expected: "Ingestion complete" message with document count

# Ingest with tags
npx tsx src/cli.ts ingest --path tests/fixtures/ --tag research --tag ai

# Expected: Documents tagged and ingested

# Ingest non-existent path (error case)
npx tsx src/cli.ts ingest --path /nonexistent

# Expected: Error message, non-zero exit code
```

**Pass Criteria:**
- Valid path: exit code 0, shows document count
- Invalid path: appropriate error message

### 3. Query Command Tests

Test semantic search functionality:

```bash
# Basic query
npx tsx src/cli.ts query "machine learning"

# Expected: Search results with titles, sources, scores

# Query with K parameter
npx tsx src/cli.ts query "neural networks" -k 3

# Expected: Exactly 3 results (or fewer if less data)

# Query on empty database
# Expected: "No results found" message
```

**Pass Criteria:**
- Returns results in expected format
- Respects K parameter
- Handles empty results gracefully

### 4. Search Command Tests

Test hybrid search (vector + graph):

```bash
# Basic hybrid search
npx tsx src/cli.ts search "knowledge graphs"

# JSON output
npx tsx src/cli.ts search "embeddings" --format json

# Markdown output
npx tsx src/cli.ts search "embeddings" --format markdown

# Include related graph nodes
npx tsx src/cli.ts search "neural" --include-related
```

**Pass Criteria:**
- Returns results with combined scores
- JSON format is valid
- Markdown format is properly formatted

### 5. Graph Command Tests

Test Cypher-like graph queries:

```bash
# List all documents
npx tsx src/cli.ts graph "MATCH (n:Document) RETURN n"

# Find relationships
npx tsx src/cli.ts graph "MATCH (a)-[r]->(b) RETURN r"

# JSON output
npx tsx src/cli.ts graph "MATCH (n) RETURN n" --format json
```

**Pass Criteria:**
- Returns nodes and edges
- Handles invalid queries with error message

### 6. Route Command Tests

Test query intent analysis:

```bash
# Analyze query intent
npx tsx src/cli.ts route "Find papers about transformers"

# Verbose analysis
npx tsx src/cli.ts route "Compare BERT and GPT" --verbose
```

**Pass Criteria:**
- Returns route, confidence, reasoning
- Verbose mode shows additional analysis

### 7. Help Tests

Verify help documentation:

```bash
# Main help
npx tsx src/cli.ts --help

# Command-specific help
npx tsx src/cli.ts ingest --help
npx tsx src/cli.ts query --help
npx tsx src/cli.ts search --help
```

**Pass Criteria:**
- All commands show usage information
- Required options are documented

## Running Automated Tests

### Full Test Suite

```bash
# Run all tests
npm test

# Run in watch mode (for development)
npm test -- --watch

# Run with UI
npm run test:ui
```

### Test Output Interpretation

```
 ✓ tests/cli/cli.test.ts (15 tests) 4532ms
   ✓ RKM CLI > status command > should output status information (234ms)
   ✓ RKM CLI > status command > should support --json flag (156ms)
   ...

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Duration  5.23s
```

- **✓** = Test passed
- **✗** = Test failed (see error details below)
- **Duration** = Time taken for each test

### Generating Test Reports

```bash
# Text report
npm test -- --reporter=verbose

# JSON report (for CI integration)
npm test -- --reporter=json --outputFile=test-results.json

# HTML coverage report
npm run test:coverage
# Open coverage/index.html in browser
```

## Test Fixtures

Test fixtures are located in `tests/fixtures/`:

- `sample.md` - Sample markdown document for ingestion tests
- `sample.json` - Sample JSON document
- `sample.txt` - Plain text document

### Creating Custom Test Fixtures

```bash
# Create a test document
cat > tests/fixtures/custom.md << 'EOF'
# Test Document

This is a test document for verification.

## Topics
- Machine Learning
- Knowledge Graphs
- Embeddings
EOF
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   ```bash
   # Rebuild the project
   npm run build
   ```

2. **Database errors**
   ```bash
   # Check database file
   ls -la ruvector.db

   # Reset database (warning: deletes data)
   rm ruvector.db data/graph.db
   ```

3. **Slow tests**
   - First run may be slow due to model loading
   - Subsequent runs use cached models

4. **Test timeout**
   ```bash
   # Increase timeout in vitest.config.ts
   testTimeout: 30000  # 30 seconds
   ```

### Debug Mode

Run CLI with debug output:

```bash
DEBUG=* npx tsx src/cli.ts status
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: CLI Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test -- tests/cli/
```

## Contributing Test Cases

When adding new tests:

1. Add test in `tests/cli/cli.test.ts`
2. Update this documentation
3. Add any new fixtures to `tests/fixtures/`
4. Run full test suite before submitting

## Support

If tests fail unexpectedly:
1. Check the error message for specific issues
2. Verify fixtures exist
3. Ensure database is initialized
4. Check system requirements (Node.js 20+)
