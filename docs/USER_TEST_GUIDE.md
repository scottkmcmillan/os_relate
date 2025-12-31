# RKM User Test Guide

This guide explains how to verify your Research Knowledge Manager (RKM) installation is working correctly using the CLI test interface.

## Quick Start

Run the user test suite with a single command:

```bash
npx tsx tests/cli/userTest.ts
```

## Prerequisites

Before running tests, ensure you have:

1. **Node.js 20+** installed
2. **Project dependencies** installed:
   ```bash
   npm install
   ```
3. **Build completed** (for production tests):
   ```bash
   npm run build
   ```

## Running Tests

### Basic Test Run

```bash
npx tsx tests/cli/userTest.ts
```

This runs all tests and displays a summary of results.

### Verbose Mode

For detailed output showing what each test does:

```bash
npx tsx tests/cli/userTest.ts --verbose
```

### JSON Output

For machine-readable results (CI/CD integration):

```bash
npx tsx tests/cli/userTest.ts --json
```

Save results to a file:

```bash
npx tsx tests/cli/userTest.ts --json > test-results.json
```

## What Gets Tested

The test suite verifies the following system components:

### System Tests
- CLI version command
- Help documentation
- Status reporting
- JSON output formatting

### Ingestion Tests
- File path handling
- Error handling for missing paths
- Ingestion options

### Query Tests
- Query command options
- Search command functionality
- Output format support (text, JSON, markdown)

### Graph Tests
- Cypher query interface
- Graph exploration commands

### Routing Tests
- Query intent analysis
- Semantic routing
- Verbose analysis mode

### Context Tests
- Claude-Flow context generation
- Context formatting options

### Learning Tests
- SONA learning commands
- Cognitive feature availability

## Understanding Results

### Passing Tests

```
✓ CLI version command works (45ms)
    Version: 0.3.0
```

A checkmark indicates the test passed. The message shows what was verified.

### Failing Tests

```
✗ Status full report works (120ms)
    Error: Database not initialized
```

An X indicates failure. Review the error message for troubleshooting.

### Summary Report

```
========================================
  Test Results Summary
========================================

Total Tests: 15
Passed:      14
Failed:      1
Skipped:     0
Duration:    2340ms
```

## Troubleshooting

### Common Issues

**"Command not found" errors:**
```bash
npm install  # Reinstall dependencies
npm run build  # Rebuild the project
```

**Database-related failures:**
```bash
# Initialize a test database
npx tsx src/cli.ts ingest --path ./docs --legacy
```

**Permission errors:**
```bash
chmod +x tests/cli/userTest.ts
```

### Getting More Information

Run with verbose mode to see detailed output:

```bash
npx tsx tests/cli/userTest.ts --verbose 2>&1 | tee test-output.log
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run User Tests
  run: npx tsx tests/cli/userTest.ts --json > test-results.json

- name: Check Results
  run: |
    FAILED=$(jq '.summary.failed' test-results.json)
    if [ "$FAILED" -gt 0 ]; then
      echo "Tests failed!"
      exit 1
    fi
```

### Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

## Manual CLI Testing

You can also test individual commands manually:

### Check System Status

```bash
npx tsx src/cli.ts status
npx tsx src/cli.ts status --full --json
```

### Test Query Routing

```bash
npx tsx src/cli.ts route "find documents about AI" --verbose
```

### Test Ingestion

```bash
# Create a test file
echo "# Test Document\nThis is test content." > /tmp/test.md

# Ingest it
npx tsx src/cli.ts ingest --path /tmp/test.md --db ./test.db

# Query it
npx tsx src/cli.ts search "test content" --db ./test.db
```

## Reporting Issues

If tests fail unexpectedly:

1. Run with verbose mode and capture output
2. Check the system requirements
3. Include your Node.js version (`node --version`)
4. Include your platform (`uname -a` or system info)

Report issues at: https://github.com/your-repo/issues
