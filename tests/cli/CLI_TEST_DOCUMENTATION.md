# RKM CLI Test Suite Documentation

## Overview

Comprehensive test suite for the Research Knowledge Manager (RKM) CLI, located at `/workspaces/ranger/tests/cli/cli.test.ts`.

## Test Coverage

### 1. General CLI Tests (6 tests)
- Version display (`--version`)
- Help display (`--help`)
- Global options: `--db`, `--data-dir`, `--dims`, `--no-cognitive`

### 2. Status Command Tests (7 tests)
- Basic status display
- JSON output (`--json`)
- Full statistics (`--full`)
- Router information (`--router`)
- Combined flags
- Help display

### 3. Ingest Command Tests (10 tests)
- Required `--path` argument validation
- Directory ingestion
- Single file ingestion
- Tag support (`--tag`)
- Graph control (`--no-graph`)
- Legacy mode (`--legacy`)
- Error handling (non-existent paths, empty directories)
- Help display

### 4. Query Command Tests (11 tests)
- Required query text validation
- Semantic query execution
- Result count options (`-k`, `--k`)
- Graph-related results (`--show-related`, `--graph-depth`)
- Legacy mode
- Invalid parameter handling
- Help display

### 5. Search Command Tests (14 tests)
- Required search text validation
- Hybrid search execution
- Vector weight configuration (`--vector-weight`)
- Graph integration (`--include-related`, `--graph-depth`)
- Reranking (`--rerank`)
- Output formats: `json`, `text`, `markdown`
- Invalid format handling
- Help display

### 6. Graph Command Tests (8 tests)
- Required Cypher argument validation
- Simple graph queries
- Relationship queries
- Output formats: `json`, `summary`
- Invalid Cypher syntax handling
- Empty result handling
- Help display

### 7. Route Command Tests (9 tests)
- Required query argument validation
- Query intent analysis
- Different query types (semantic, graph, hybrid)
- Verbose mode (`--verbose`)
- Simple and complex query handling
- Help display

### 8. Context Command Tests (8 tests - Legacy)
- Required text argument validation
- Context block generation
- Result count (`-k`)
- Character limit (`--max-chars`)
- Custom title (`--title`)
- Invalid parameter handling
- Help display

### 9. Learn Command Tests (4 tests)
- Cognitive feature validation
- Learning execution
- Force mode (`--force`)
- Help display

### 10. Error Handling Tests (6 tests)
- Unknown commands
- Invalid global options
- Invalid dimension values (non-numeric, negative, zero)

### 11. Integration Scenarios (3 tests)
- Complete workflow: ingest → query → search → graph
- Tagged ingestion workflow
- Legacy vs. new pipeline comparison

### 12. Output Format Tests (5 tests)
- JSON validation for search, graph, and status
- Markdown format validation

## Total Test Count: **91 Tests**

## Test Structure

```typescript
describe('RKM CLI', () => {
  describe('command name', () => {
    it('should test specific behavior', async () => {
      // Test implementation
    });
  });
});
```

## Test Helpers

### `runCLI(args: string)`
Executes CLI commands with proper error handling and returns:
- `stdout`: Standard output
- `stderr`: Standard error
- `exitCode`: Process exit code

### `createTestDocuments()`
Creates test documents for ingestion:
- `doc1.md`: Machine learning and neural networks
- `doc2.md`: Knowledge graphs and semantic search
- `doc3.txt`: Vector databases and embeddings
- `doc4.json`: Information retrieval (JSON format)

## Test Data Management

- **Location**: `/workspaces/ranger/tests/cli/test-data`
- **Database**: `test-rkm.db`
- **Graph Directory**: `graph/`
- **Cleanup**: Automatic before and after test suite

## Running Tests

```bash
# Run all CLI tests
npm test -- tests/cli/cli.test.ts

# Run specific test suite
npm test -- tests/cli/cli.test.ts -t "status command"

# Run with coverage
npm test -- tests/cli/cli.test.ts --coverage

# Run in watch mode
npm test -- tests/cli/cli.test.ts --watch
```

## Test Assertions

### Exit Codes
- `0`: Success
- `1` or non-zero: Error

### Output Validation
- String content matching
- JSON structure validation
- Output length validation
- Format compliance

### Error Validation
- Error messages in stderr
- Proper error codes
- Graceful failure handling

## Command Coverage Matrix

| Command | Basic | Options | Error Handling | Help | Integration |
|---------|-------|---------|----------------|------|-------------|
| status  | ✅    | ✅      | ✅             | ✅   | ✅          |
| ingest  | ✅    | ✅      | ✅             | ✅   | ✅          |
| query   | ✅    | ✅      | ✅             | ✅   | ✅          |
| search  | ✅    | ✅      | ✅             | ✅   | ✅          |
| graph   | ✅    | ✅      | ✅             | ✅   | ✅          |
| route   | ✅    | ✅      | ✅             | ✅   | ✅          |
| context | ✅    | ✅      | ✅             | ✅   | ✅          |
| learn   | ✅    | ✅      | ✅             | ✅   | ✅          |

## Key Test Features

1. **Actual CLI Execution**: Tests run the actual CLI binary, not mocked functions
2. **Real File System**: Uses actual test files and databases
3. **Comprehensive Coverage**: Tests all commands, options, and error cases
4. **Integration Testing**: Tests complete workflows
5. **Output Validation**: Verifies both stdout and stderr
6. **Format Testing**: Validates JSON, markdown, and text outputs
7. **Error Scenarios**: Tests invalid inputs and edge cases
8. **Help Documentation**: Verifies help text for all commands

## Test Timeout

Default timeout: **10 seconds** per test

Configurable in vitest.config.ts:
```typescript
testTimeout: 10000
```

## Dependencies

- **vitest**: Test framework
- **child_process**: CLI execution
- **fs**: File system operations
- **path**: Path manipulation

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- Clean setup/teardown
- No external dependencies
- Deterministic results
- Proper timeout handling

## Future Enhancements

1. Performance benchmarking tests
2. Concurrency stress tests
3. Large dataset ingestion tests
4. Memory usage profiling
5. Cross-platform compatibility tests
6. Mock API server for external dependencies
