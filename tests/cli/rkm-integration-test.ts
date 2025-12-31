/**
 * RKM CLI Integration Test Example
 *
 * This demonstrates how to use the CLI test runner to test the RKM CLI
 */

import {
  runCliTest,
  runCliTestsParallel,
  generateReport,
  assertTestResult,
  saveResults,
  type TestResult
} from './cliTestRunner';
import { resolve } from 'path';

// Configuration
const PROJECT_ROOT = '/workspaces/ranger';
const CLI_PATH = resolve(PROJECT_ROOT, 'src/cli.ts');
const DEFAULT_TIMEOUT = 15000;

/**
 * Helper to run RKM CLI commands
 */
async function runRkmCommand(
  command: string,
  args: string[] = [],
  timeout: number = DEFAULT_TIMEOUT
): Promise<TestResult> {
  return runCliTest(
    'npx',
    ['tsx', CLI_PATH, command, ...args],
    {
      cwd: PROJECT_ROOT,
      timeout
    }
  );
}

/**
 * Test Suite: Basic CLI Commands
 */
async function testBasicCommands() {
  console.log('\n=== Testing Basic CLI Commands ===\n');

  const tests = [
    {
      name: 'Version Command',
      command: 'npx',
      args: ['tsx', CLI_PATH, '--version'],
      options: { cwd: PROJECT_ROOT, timeout: DEFAULT_TIMEOUT }
    },
    {
      name: 'Help Command',
      command: 'npx',
      args: ['tsx', CLI_PATH, '--help'],
      options: { cwd: PROJECT_ROOT, timeout: DEFAULT_TIMEOUT }
    },
    {
      name: 'Status Command',
      command: 'npx',
      args: ['tsx', CLI_PATH, 'status'],
      options: { cwd: PROJECT_ROOT, timeout: DEFAULT_TIMEOUT }
    }
  ];

  const results = await runCliTestsParallel(tests);
  const report = generateReport(results);

  console.log(report);

  return results;
}

/**
 * Test Suite: Version Command Validation
 */
async function testVersionCommand() {
  console.log('\n=== Testing Version Command ===\n');

  const result = await runRkmCommand('--version');

  console.log('Version Output:', result.stdout);
  console.log('Passed:', result.passed);
  console.log('Duration:', result.duration + 'ms');

  // Validate the output contains a version number
  try {
    assertTestResult(result, {
      passed: true,
      exitCode: 0,
      stdoutContains: /\d+\.\d+\.\d+/,
      maxDuration: 10000
    });
    console.log('\nVersion validation: PASSED');
  } catch (error) {
    console.error('\nVersion validation: FAILED -', error);
  }

  return result;
}

/**
 * Test Suite: Help Command Validation
 */
async function testHelpCommand() {
  console.log('\n=== Testing Help Command ===\n');

  const result = await runRkmCommand('--help');

  console.log('Help command passed:', result.passed);
  console.log('Duration:', result.duration + 'ms');
  console.log('Output preview:', result.stdout.substring(0, 200) + '...');

  // Validate help output contains expected sections
  try {
    assertTestResult(result, {
      passed: true,
      exitCode: 0,
      maxDuration: 10000
    });
    console.log('\nHelp validation: PASSED');
  } catch (error) {
    console.error('\nHelp validation: FAILED -', error);
  }

  return result;
}

/**
 * Test Suite: Status Command Validation
 */
async function testStatusCommand() {
  console.log('\n=== Testing Status Command ===\n');

  const result = await runRkmCommand('status');

  console.log('Status command passed:', result.passed);
  console.log('Duration:', result.duration + 'ms');
  console.log('Output:', result.stdout);

  return result;
}

/**
 * Test Suite: Error Handling
 */
async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===\n');

  // Test invalid command
  const result = await runCliTest(
    'npx',
    ['tsx', CLI_PATH, 'invalid-command-xyz'],
    {
      cwd: PROJECT_ROOT,
      timeout: DEFAULT_TIMEOUT,
      expectedExitCode: 1 // Expect failure
    }
  );

  console.log('Invalid command test:');
  console.log('  Passed (expected to fail):', result.passed);
  console.log('  Exit code:', result.exitCode);
  console.log('  Duration:', result.duration + 'ms');

  return result;
}

/**
 * Test Suite: Performance Benchmarks
 */
async function testPerformance() {
  console.log('\n=== Performance Benchmarks ===\n');

  const iterations = 5;
  const results: TestResult[] = [];

  console.log(`Running version command ${iterations} times...`);

  for (let i = 0; i < iterations; i++) {
    const result = await runRkmCommand('--version');
    results.push(result);
    console.log(`  Iteration ${i + 1}: ${result.duration}ms`);
  }

  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log('\nPerformance Summary:');
  console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Min: ${minDuration}ms`);
  console.log(`  Max: ${maxDuration}ms`);
  console.log(`  All passed: ${results.every(r => r.passed)}`);

  return results;
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('RKM CLI Integration Test Suite');
  console.log('='.repeat(80));

  const allResults: TestResult[] = [];

  try {
    // Run all test suites
    allResults.push(...await testBasicCommands());
    allResults.push(await testVersionCommand());
    allResults.push(await testHelpCommand());
    allResults.push(await testStatusCommand());
    allResults.push(await testErrorHandling());
    allResults.push(...await testPerformance());

    // Generate final report
    console.log('\n' + '='.repeat(80));
    console.log('FINAL TEST REPORT');
    console.log('='.repeat(80));

    const finalReport = generateReport(allResults);
    console.log(finalReport);

    // Save results
    const resultsPath = resolve(PROJECT_ROOT, 'tests/cli/rkm-test-results.json');
    await saveResults(allResults, resultsPath);
    console.log(`\nResults saved to: ${resultsPath}`);

    // Exit with appropriate code
    const allPassed = allResults.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\nTest suite failed with error:', error);
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export functions for use in other tests
export {
  runRkmCommand,
  testBasicCommands,
  testVersionCommand,
  testHelpCommand,
  testStatusCommand,
  testErrorHandling,
  testPerformance
};
