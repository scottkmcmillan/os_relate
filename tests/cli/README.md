# CLI Test Runner

A comprehensive test runner for executing and validating CLI commands with structured result reporting.

## Overview

The CLI Test Runner provides a robust framework for testing command-line applications. It captures stdout, stderr, exit codes, execution time, and handles timeouts, errors, and edge cases.

## Features

- **Command Execution**: Execute any CLI command with arguments
- **Output Capture**: Capture stdout, stderr, and exit codes
- **Timing Information**: Track execution duration
- **Timeout Handling**: Configurable timeouts with graceful termination
- **Error Handling**: Comprehensive error capture and reporting
- **Stdin Support**: Send input to commands via stdin
- **Environment Control**: Custom working directories and environment variables
- **Parallel Execution**: Run multiple tests concurrently
- **Structured Reports**: Generate formatted test reports
- **Result Persistence**: Save and load test results to/from JSON
- **Assertions**: Validate test results against expectations

## Installation

The test runner is already available in the project at `/workspaces/ranger/tests/cli/cliTestRunner.ts`.

## Quick Start

```typescript
import { runCliTest, generateReport } from './tests/cli/cliTestRunner';

// Run a single test
const result = await runCliTest('npm', ['--version']);
console.log('Passed:', result.passed);
console.log('Output:', result.stdout);

// Run multiple tests and generate a report
const results = await runCliTests([
  { name: 'Test 1', command: 'echo', args: ['hello'] },
  { name: 'Test 2', command: 'node', args: ['--version'] }
]);

const report = generateReport(results);
console.log(report);
```

## API Reference

### Core Functions

#### `runCliTest(command, args, options)`

Execute a single CLI command and capture results.

**Parameters:**
- `command` (string): Command to execute
- `args` (string[]): Command arguments (optional)
- `options` (CliTestOptions): Execution options (optional)
  - `timeout` (number): Timeout in milliseconds (default: 30000)
  - `cwd` (string): Working directory (default: process.cwd())
  - `env` (object): Environment variables (default: process.env)
  - `expectedExitCode` (number): Expected exit code (default: 0)
  - `stdin` (string): Input to send to stdin (optional)

**Returns:** `Promise<TestResult>`

**Example:**
```typescript
const result = await runCliTest('echo', ['hello world']);
// result.passed === true
// result.stdout === 'hello world'
// result.exitCode === 0
```

#### `runCliTests(tests)`

Run multiple tests sequentially.

**Parameters:**
- `tests` (array): Array of test configurations

**Returns:** `Promise<TestResult[]>`

**Example:**
```typescript
const results = await runCliTests([
  { name: 'Test 1', command: 'echo', args: ['test1'] },
  { name: 'Test 2', command: 'echo', args: ['test2'] }
]);
```

#### `runCliTestsParallel(tests)`

Run multiple tests in parallel for better performance.

**Parameters:**
- `tests` (array): Array of test configurations

**Returns:** `Promise<TestResult[]>`

**Example:**
```typescript
const results = await runCliTestsParallel([
  { name: 'Test 1', command: 'echo', args: ['parallel1'] },
  { name: 'Test 2', command: 'echo', args: ['parallel2'] },
  { name: 'Test 3', command: 'echo', args: ['parallel3'] }
]);
```

#### `generateReport(results, verbose)`

Generate a formatted test report.

**Parameters:**
- `results` (TestResult[]): Array of test results
- `verbose` (boolean): Include detailed output (default: false)

**Returns:** `string` - Formatted report

**Example:**
```typescript
const report = generateReport(results, true);
console.log(report);
```

#### `getReportSummary(results)`

Get summary statistics from test results.

**Parameters:**
- `results` (TestResult[]): Array of test results

**Returns:** `ReportSummary` - Summary statistics

**Example:**
```typescript
const summary = getReportSummary(results);
console.log(`Passed: ${summary.passed}/${summary.total}`);
console.log(`Pass rate: ${summary.passRate}%`);
```

#### `assertTestResult(result, expectations)`

Assert that a test result matches expectations.

**Parameters:**
- `result` (TestResult): Test result to validate
- `expectations` (object): Expected values
  - `passed` (boolean): Expected pass/fail status
  - `exitCode` (number): Expected exit code
  - `stdoutContains` (string | RegExp): Expected stdout content
  - `stderrContains` (string | RegExp): Expected stderr content
  - `stdoutNotContains` (string | RegExp): Content that should not be in stdout
  - `maxDuration` (number): Maximum expected duration in ms

**Throws:** `Error` if expectations not met

**Example:**
```typescript
assertTestResult(result, {
  passed: true,
  exitCode: 0,
  stdoutContains: 'success',
  maxDuration: 1000
});
```

#### `saveResults(results, filepath)`

Save test results to JSON file.

**Parameters:**
- `results` (TestResult[]): Test results to save
- `filepath` (string): Output file path

**Returns:** `Promise<void>`

**Example:**
```typescript
await saveResults(results, '/tmp/test-results.json');
```

#### `loadResults(filepath)`

Load test results from JSON file.

**Parameters:**
- `filepath` (string): Input file path

**Returns:** `Promise<TestResult[]>`

**Example:**
```typescript
const results = await loadResults('/tmp/test-results.json');
```

## TypeScript Interfaces

### TestResult

```typescript
interface TestResult {
  command: string;        // Command executed
  args: string[];        // Command arguments
  passed: boolean;       // Test passed/failed
  stdout: string;        // Standard output
  stderr: string;        // Standard error
  exitCode: number;      // Process exit code
  duration: number;      // Execution time in ms
  error?: string;        // Error message if any
}
```

### CliTestOptions

```typescript
interface CliTestOptions {
  timeout?: number;           // Timeout in milliseconds
  cwd?: string;              // Working directory
  env?: NodeJS.ProcessEnv;   // Environment variables
  expectedExitCode?: number; // Expected exit code
  stdin?: string;            // Stdin input
}
```

### ReportSummary

```typescript
interface ReportSummary {
  total: number;      // Total number of tests
  passed: number;     // Number of passed tests
  failed: number;     // Number of failed tests
  duration: number;   // Total duration in ms
  passRate: number;   // Pass rate percentage
}
```

## Usage Examples

### Example 1: Testing the RKM CLI

```typescript
import { runCliTest } from './tests/cli/cliTestRunner';

// Test help command
const helpResult = await runCliTest('npx', ['tsx', 'src/cli.ts', '--help'], {
  cwd: '/workspaces/ranger',
  timeout: 10000
});

console.log('Help command passed:', helpResult.passed);
console.log('Help output:', helpResult.stdout);

// Test status command
const statusResult = await runCliTest('npx', ['tsx', 'src/cli.ts', 'status'], {
  cwd: '/workspaces/ranger',
  timeout: 10000
});

console.log('Status command passed:', statusResult.passed);
```

### Example 2: Complete Test Suite with Report

```typescript
import {
  runCliTests,
  generateReport,
  saveResults
} from './tests/cli/cliTestRunner';

const tests = [
  {
    name: 'Version check',
    command: 'npx',
    args: ['tsx', 'src/cli.ts', '--version'],
    options: { cwd: '/workspaces/ranger', timeout: 10000 }
  },
  {
    name: 'Help command',
    command: 'npx',
    args: ['tsx', 'src/cli.ts', '--help'],
    options: { cwd: '/workspaces/ranger', timeout: 10000 }
  },
  {
    name: 'Status command',
    command: 'npx',
    args: ['tsx', 'src/cli.ts', 'status'],
    options: { cwd: '/workspaces/ranger', timeout: 10000 }
  }
];

// Run tests
const results = await runCliTests(tests);

// Generate and display report
const report = generateReport(results, true);
console.log(report);

// Save results
await saveResults(results, '/tmp/rkm-test-results.json');
```

### Example 3: Testing with Assertions

```typescript
import {
  runCliTest,
  assertTestResult
} from './tests/cli/cliTestRunner';

const result = await runCliTest('npm', ['--version']);

// Assert expectations
assertTestResult(result, {
  passed: true,
  exitCode: 0,
  stdoutContains: /^\d+\.\d+\.\d+/,
  maxDuration: 5000
});

console.log('All assertions passed!');
```

### Example 4: Testing with Timeout

```typescript
const result = await runCliTest(
  'node',
  ['-e', 'setTimeout(() => console.log("done"), 10000)'],
  { timeout: 1000 }
);

console.log('Timed out:', result.error?.includes('timed out'));
console.log('Duration:', result.duration, 'ms');
```

### Example 5: Testing with Stdin

```typescript
const result = await runCliTest(
  'node',
  ['-e', `
    let input = '';
    process.stdin.on('data', d => input += d);
    process.stdin.on('end', () => console.log('Got:', input.trim()));
  `],
  {
    stdin: 'test input\n',
    timeout: 2000
  }
);

console.log('Output:', result.stdout);
```

### Example 6: Parallel Test Execution

```typescript
import { runCliTestsParallel, generateReport } from './tests/cli/cliTestRunner';

const tests = [
  { name: 'Test 1', command: 'echo', args: ['test1'] },
  { name: 'Test 2', command: 'echo', args: ['test2'] },
  { name: 'Test 3', command: 'echo', args: ['test3'] }
];

const startTime = Date.now();
const results = await runCliTestsParallel(tests);
const duration = Date.now() - startTime;

console.log(`Completed ${results.length} tests in ${duration}ms`);
console.log(generateReport(results));
```

## Running Examples

The project includes comprehensive examples in `example-usage.ts`:

```bash
# Run all examples
npx tsx tests/cli/example-usage.ts

# Run specific example (1-10)
npx tsx tests/cli/example-usage.ts 1   # Basic test
npx tsx tests/cli/example-usage.ts 2   # RKM CLI tests
npx tsx tests/cli/example-usage.ts 8   # Full test suite
```

## Running Tests

Run the test suite with:

```bash
npm test -- tests/cli/cliTestRunner.test.ts
```

## Best Practices

1. **Use Appropriate Timeouts**: Set realistic timeouts based on expected command execution time
2. **Parallel vs Sequential**: Use parallel execution for independent tests to improve performance
3. **Error Handling**: Always check `result.passed` and `result.error` for test status
4. **Assertions**: Use `assertTestResult` for strict validation
5. **Save Results**: Persist results for later analysis and CI/CD integration
6. **Verbose Reports**: Use verbose mode during development, concise in CI/CD
7. **Working Directory**: Always set `cwd` when testing project-specific commands
8. **Environment Variables**: Isolate tests by providing clean environments

## Integration with Vitest

The test runner integrates seamlessly with Vitest:

```typescript
import { describe, it, expect } from 'vitest';
import { runCliTest, assertTestResult } from './cliTestRunner';

describe('My CLI Tests', () => {
  it('should run command successfully', async () => {
    const result = await runCliTest('echo', ['test']);

    expect(result.passed).toBe(true);
    expect(result.stdout).toBe('test');

    // Or use assertions
    assertTestResult(result, {
      passed: true,
      stdoutContains: 'test'
    });
  });
});
```

## Troubleshooting

### Timeout Issues

If tests are timing out:
- Increase the timeout value
- Check if the command is hanging or waiting for input
- Verify the command is in the system PATH

### Exit Code Mismatches

If exit codes don't match expectations:
- Use `expectedExitCode` option for non-zero success codes
- Check if the command writes to stderr (doesn't necessarily mean failure)
- Some systems may return different error codes for the same condition

### Missing Output

If stdout/stderr is empty:
- Verify the command actually produces output
- Check if output is buffered (may need to flush)
- Ensure stderr is captured separately from stdout

## License

MIT
