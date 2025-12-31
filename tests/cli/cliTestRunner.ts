import { spawn } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

/**
 * Structured result from CLI test execution
 */
export interface TestResult {
  command: string;
  args: string[];
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  error?: string;
}

/**
 * Options for running CLI tests
 */
export interface CliTestOptions {
  timeout?: number; // milliseconds, default 30000
  cwd?: string; // working directory
  env?: NodeJS.ProcessEnv; // environment variables
  expectedExitCode?: number; // default 0
  stdin?: string; // input to send to stdin
}

/**
 * Report summary statistics
 */
export interface ReportSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  passRate: number;
}

/**
 * Execute a CLI command and capture results
 *
 * @param command - Command to execute (e.g., 'npm', 'npx', 'node')
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Promise resolving to TestResult
 */
export async function runCliTest(
  command: string,
  args: string[] = [],
  options: CliTestOptions = {}
): Promise<TestResult> {
  const {
    timeout = 30000,
    cwd = process.cwd(),
    env = process.env,
    expectedExitCode = 0,
    stdin
  } = options;

  const startTime = Date.now();
  let stdout = '';
  let stderr = '';
  let exitCode: number | null = null;
  let error: string | undefined;
  let timedOut = false;

  return new Promise<TestResult>((resolve) => {
    try {
      // Spawn the child process
      const child = spawn(command, args, {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');

        // Force kill if still running after 1s
        setTimeout(() => {
          if (child.exitCode === null) {
            child.kill('SIGKILL');
          }
        }, 1000);
      }, timeout);

      // Capture stdout
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Capture stderr
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Send stdin if provided
      if (stdin && child.stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }

      // Handle process errors
      child.on('error', (err) => {
        error = `Process error: ${err.message}`;
      });

      // Handle process exit
      child.on('close', (code, signal) => {
        clearTimeout(timeoutHandle);

        exitCode = code !== null ? code : -1;
        const duration = Date.now() - startTime;

        if (timedOut) {
          error = `Command timed out after ${timeout}ms`;
        } else if (signal) {
          error = `Process killed with signal: ${signal}`;
        }

        const passed = !error && !timedOut && exitCode === expectedExitCode;

        resolve({
          command,
          args,
          passed,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          duration,
          error
        });
      });

    } catch (err) {
      // Handle spawn errors
      const duration = Date.now() - startTime;
      resolve({
        command,
        args,
        passed: false,
        stdout: '',
        stderr: '',
        exitCode: -1,
        duration,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
}

/**
 * Run multiple CLI tests in sequence
 *
 * @param tests - Array of test configurations
 * @returns Promise resolving to array of TestResults
 */
export async function runCliTests(
  tests: Array<{
    name: string;
    command: string;
    args?: string[];
    options?: CliTestOptions;
  }>
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runCliTest(
      test.command,
      test.args || [],
      test.options || {}
    );
    results.push(result);
  }

  return results;
}

/**
 * Run multiple CLI tests in parallel
 *
 * @param tests - Array of test configurations
 * @returns Promise resolving to array of TestResults
 */
export async function runCliTestsParallel(
  tests: Array<{
    name: string;
    command: string;
    args?: string[];
    options?: CliTestOptions;
  }>
): Promise<TestResult[]> {
  const promises = tests.map(test =>
    runCliTest(test.command, test.args || [], test.options || {})
  );

  return Promise.all(promises);
}

/**
 * Generate a formatted test report
 *
 * @param results - Array of test results
 * @param verbose - Include detailed output for each test
 * @returns Formatted report string
 */
export function generateReport(
  results: TestResult[],
  verbose: boolean = false
): string {
  const summary = getReportSummary(results);
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push('='.repeat(80));
  lines.push('CLI TEST REPORT');
  lines.push('='.repeat(80));
  lines.push('');

  // Individual test results
  results.forEach((result, index) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m'; // Green or Red
    const resetColor = '\x1b[0m';

    lines.push(`${statusColor}${status}${resetColor} Test ${index + 1}: ${result.command} ${result.args.join(' ')}`);
    lines.push(`     Duration: ${result.duration}ms | Exit Code: ${result.exitCode}`);

    if (result.error) {
      lines.push(`     Error: ${result.error}`);
    }

    if (verbose || !result.passed) {
      if (result.stdout) {
        lines.push(`     STDOUT:`);
        result.stdout.split('\n').forEach(line => {
          lines.push(`       ${line}`);
        });
      }

      if (result.stderr) {
        lines.push(`     STDERR:`);
        result.stderr.split('\n').forEach(line => {
          lines.push(`       ${line}`);
        });
      }
    }

    lines.push('');
  });

  // Summary
  lines.push('-'.repeat(80));
  lines.push('SUMMARY');
  lines.push('-'.repeat(80));
  lines.push(`Total Tests:    ${summary.total}`);
  lines.push(`Passed:         ${summary.passed} (\x1b[32m${summary.passRate.toFixed(1)}%\x1b[0m)`);
  lines.push(`Failed:         ${summary.failed} ${summary.failed > 0 ? '\x1b[31m' + '⚠' + '\x1b[0m' : ''}`);
  lines.push(`Total Duration: ${summary.duration}ms`);
  lines.push('='.repeat(80));
  lines.push('');

  return lines.join('\n');
}

/**
 * Get summary statistics from test results
 *
 * @param results - Array of test results
 * @returns Report summary
 */
export function getReportSummary(results: TestResult[]): ReportSummary {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const duration = results.reduce((sum, r) => sum + r.duration, 0);
  const passRate = total > 0 ? (passed / total) * 100 : 0;

  return {
    total,
    passed,
    failed,
    duration,
    passRate
  };
}

/**
 * Assert that a test result matches expectations
 *
 * @param result - Test result to validate
 * @param expectations - Expected values
 * @throws Error if expectations not met
 */
export function assertTestResult(
  result: TestResult,
  expectations: {
    passed?: boolean;
    exitCode?: number;
    stdoutContains?: string | RegExp;
    stderrContains?: string | RegExp;
    stdoutNotContains?: string | RegExp;
    maxDuration?: number;
  }
): void {
  if (expectations.passed !== undefined && result.passed !== expectations.passed) {
    throw new Error(`Expected passed=${expectations.passed}, got ${result.passed}`);
  }

  if (expectations.exitCode !== undefined && result.exitCode !== expectations.exitCode) {
    throw new Error(`Expected exitCode=${expectations.exitCode}, got ${result.exitCode}`);
  }

  if (expectations.stdoutContains !== undefined) {
    const pattern = expectations.stdoutContains;
    const matches = typeof pattern === 'string'
      ? result.stdout.includes(pattern)
      : pattern.test(result.stdout);

    if (!matches) {
      throw new Error(`Expected stdout to contain ${pattern}, got: ${result.stdout}`);
    }
  }

  if (expectations.stderrContains !== undefined) {
    const pattern = expectations.stderrContains;
    const matches = typeof pattern === 'string'
      ? result.stderr.includes(pattern)
      : pattern.test(result.stderr);

    if (!matches) {
      throw new Error(`Expected stderr to contain ${pattern}, got: ${result.stderr}`);
    }
  }

  if (expectations.stdoutNotContains !== undefined) {
    const pattern = expectations.stdoutNotContains;
    const matches = typeof pattern === 'string'
      ? result.stdout.includes(pattern)
      : pattern.test(result.stdout);

    if (matches) {
      throw new Error(`Expected stdout NOT to contain ${pattern}, but it did`);
    }
  }

  if (expectations.maxDuration !== undefined && result.duration > expectations.maxDuration) {
    throw new Error(`Expected duration <= ${expectations.maxDuration}ms, got ${result.duration}ms`);
  }
}

/**
 * Save test results to JSON file
 *
 * @param results - Test results to save
 * @param filepath - Output file path
 */
export async function saveResults(results: TestResult[], filepath: string): Promise<void> {
  const fs = await import('fs/promises');
  const summary = getReportSummary(results);

  const output = {
    timestamp: new Date().toISOString(),
    summary,
    results
  };

  await fs.writeFile(filepath, JSON.stringify(output, null, 2), 'utf-8');
}

/**
 * Load test results from JSON file
 *
 * @param filepath - Input file path
 * @returns Test results
 */
export async function loadResults(filepath: string): Promise<TestResult[]> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filepath, 'utf-8');
  const data = JSON.parse(content);
  return data.results || [];
}

// Export default configuration
export const defaultOptions: CliTestOptions = {
  timeout: 30000,
  expectedExitCode: 0,
  cwd: process.cwd(),
  env: process.env
};
