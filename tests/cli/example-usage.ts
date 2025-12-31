/**
 * Example usage of the CLI Test Runner
 *
 * This file demonstrates various ways to use the test runner
 * for testing CLI commands and applications.
 */

import {
  runCliTest,
  runCliTests,
  runCliTestsParallel,
  generateReport,
  assertTestResult,
  saveResults,
  type CliTestOptions
} from './cliTestRunner';

/**
 * Example 1: Basic CLI test
 */
async function example1_BasicTest() {
  console.log('\n--- Example 1: Basic CLI Test ---\n');

  const result = await runCliTest('npm', ['--version']);

  console.log('Command:', result.command, result.args.join(' '));
  console.log('Passed:', result.passed);
  console.log('Output:', result.stdout);
  console.log('Duration:', result.duration + 'ms');
}

/**
 * Example 2: Testing the RKM CLI
 */
async function example2_TestRkmCli() {
  console.log('\n--- Example 2: Testing RKM CLI ---\n');

  // Test help command
  const helpResult = await runCliTest('npx', ['tsx', 'src/cli.ts', '--help'], {
    cwd: '/workspaces/ranger',
    timeout: 10000
  });

  console.log('Help Command Result:');
  console.log('Passed:', helpResult.passed);
  console.log('Output:', helpResult.stdout.substring(0, 200) + '...');

  // Test version command
  const versionResult = await runCliTest('npx', ['tsx', 'src/cli.ts', '--version'], {
    cwd: '/workspaces/ranger',
    timeout: 10000
  });

  console.log('\nVersion Command Result:');
  console.log('Passed:', versionResult.passed);
  console.log('Output:', versionResult.stdout);
}

/**
 * Example 3: Running multiple tests sequentially
 */
async function example3_SequentialTests() {
  console.log('\n--- Example 3: Sequential Tests ---\n');

  const tests = [
    {
      name: 'Check Node version',
      command: 'node',
      args: ['--version']
    },
    {
      name: 'Check NPM version',
      command: 'npm',
      args: ['--version']
    },
    {
      name: 'List files',
      command: 'ls',
      args: ['-la'],
      options: { cwd: '/tmp' } as CliTestOptions
    }
  ];

  const results = await runCliTests(tests);
  const report = generateReport(results);

  console.log(report);
}

/**
 * Example 4: Running tests in parallel
 */
async function example4_ParallelTests() {
  console.log('\n--- Example 4: Parallel Tests ---\n');

  const tests = [
    {
      name: 'Test 1',
      command: 'echo',
      args: ['Parallel Test 1']
    },
    {
      name: 'Test 2',
      command: 'echo',
      args: ['Parallel Test 2']
    },
    {
      name: 'Test 3',
      command: 'echo',
      args: ['Parallel Test 3']
    }
  ];

  const startTime = Date.now();
  const results = await runCliTestsParallel(tests);
  const duration = Date.now() - startTime;

  console.log('Completed', results.length, 'tests in', duration + 'ms');
  console.log('All passed:', results.every(r => r.passed));
}

/**
 * Example 5: Testing with assertions
 */
async function example5_WithAssertions() {
  console.log('\n--- Example 5: Tests with Assertions ---\n');

  try {
    // Test that should pass
    const result1 = await runCliTest('echo', ['hello world']);
    assertTestResult(result1, {
      passed: true,
      exitCode: 0,
      stdoutContains: 'hello'
    });
    console.log('Assertion 1: PASSED');

    // Test with regex
    const result2 = await runCliTest('node', ['--version']);
    assertTestResult(result2, {
      stdoutContains: /^v\d+\.\d+\.\d+/
    });
    console.log('Assertion 2: PASSED');

    // Test max duration
    const result3 = await runCliTest('echo', ['fast']);
    assertTestResult(result3, {
      maxDuration: 1000
    });
    console.log('Assertion 3: PASSED');

  } catch (error) {
    console.error('Assertion failed:', error);
  }
}

/**
 * Example 6: Testing with timeout
 */
async function example6_TimeoutHandling() {
  console.log('\n--- Example 6: Timeout Handling ---\n');

  const result = await runCliTest(
    'node',
    ['-e', 'setTimeout(() => console.log("done"), 5000)'],
    { timeout: 1000 }
  );

  console.log('Passed:', result.passed);
  console.log('Error:', result.error);
  console.log('Duration:', result.duration + 'ms');
}

/**
 * Example 7: Testing with stdin
 */
async function example7_StdinInput() {
  console.log('\n--- Example 7: Stdin Input ---\n');

  const result = await runCliTest(
    'node',
    ['-e', `
      let input = '';
      process.stdin.on('data', d => input += d);
      process.stdin.on('end', () => console.log('Received:', input.trim()));
    `],
    {
      stdin: 'test input data\n',
      timeout: 2000
    }
  );

  console.log('Output:', result.stdout);
  console.log('Passed:', result.passed);
}

/**
 * Example 8: Comprehensive RKM CLI test suite
 */
async function example8_RkmTestSuite() {
  console.log('\n--- Example 8: RKM CLI Test Suite ---\n');

  const rkmTests = [
    {
      name: 'RKM Help',
      command: 'npx',
      args: ['tsx', 'src/cli.ts', '--help'],
      options: {
        cwd: '/workspaces/ranger',
        timeout: 10000
      } as CliTestOptions
    },
    {
      name: 'RKM Version',
      command: 'npx',
      args: ['tsx', 'src/cli.ts', '--version'],
      options: {
        cwd: '/workspaces/ranger',
        timeout: 10000
      } as CliTestOptions
    },
    {
      name: 'RKM Status',
      command: 'npx',
      args: ['tsx', 'src/cli.ts', 'status'],
      options: {
        cwd: '/workspaces/ranger',
        timeout: 10000
      } as CliTestOptions
    }
  ];

  const results = await runCliTestsParallel(rkmTests);
  const report = generateReport(results, true);

  console.log(report);

  // Save results to file
  await saveResults(results, '/tmp/rkm-test-results.json');
  console.log('\nResults saved to /tmp/rkm-test-results.json');
}

/**
 * Example 9: Testing error conditions
 */
async function example9_ErrorConditions() {
  console.log('\n--- Example 9: Error Conditions ---\n');

  // Test non-existent command
  const result1 = await runCliTest('non-existent-command-xyz', []);
  console.log('Non-existent command - Passed:', result1.passed);
  console.log('Error:', result1.error);

  // Test command that exits with error
  const result2 = await runCliTest('node', ['-e', 'process.exit(1)']);
  console.log('\nExit code 1 - Passed:', result2.passed);
  console.log('Exit code:', result2.exitCode);

  // Test with expected error code
  const result3 = await runCliTest(
    'node',
    ['-e', 'process.exit(42)'],
    { expectedExitCode: 42 }
  );
  console.log('\nExpected exit code 42 - Passed:', result3.passed);
  console.log('Exit code:', result3.exitCode);
}

/**
 * Example 10: Performance benchmarking
 */
async function example10_PerformanceBenchmark() {
  console.log('\n--- Example 10: Performance Benchmark ---\n');

  const iterations = 10;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const result = await runCliTest('echo', [`iteration ${i + 1}`]);
    results.push(result);
  }

  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log('Iterations:', iterations);
  console.log('Average duration:', avgDuration.toFixed(2) + 'ms');
  console.log('Min duration:', minDuration + 'ms');
  console.log('Max duration:', maxDuration + 'ms');
  console.log('All passed:', results.every(r => r.passed));
}

// Main execution
async function main() {
  const examples = [
    example1_BasicTest,
    example2_TestRkmCli,
    example3_SequentialTests,
    example4_ParallelTests,
    example5_WithAssertions,
    example6_TimeoutHandling,
    example7_StdinInput,
    example8_RkmTestSuite,
    example9_ErrorConditions,
    example10_PerformanceBenchmark
  ];

  // Run specific example by number (1-10)
  const exampleNumber = process.argv[2] ? parseInt(process.argv[2]) : null;

  if (exampleNumber && exampleNumber >= 1 && exampleNumber <= examples.length) {
    await examples[exampleNumber - 1]();
  } else if (exampleNumber) {
    console.log(`Invalid example number. Choose 1-${examples.length}`);
  } else {
    console.log('Usage: npx tsx tests/cli/example-usage.ts [example-number]');
    console.log('\nAvailable examples:');
    console.log('  1. Basic CLI Test');
    console.log('  2. Testing RKM CLI');
    console.log('  3. Sequential Tests');
    console.log('  4. Parallel Tests');
    console.log('  5. Tests with Assertions');
    console.log('  6. Timeout Handling');
    console.log('  7. Stdin Input');
    console.log('  8. RKM CLI Test Suite');
    console.log('  9. Error Conditions');
    console.log(' 10. Performance Benchmark');
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

export {
  example1_BasicTest,
  example2_TestRkmCli,
  example3_SequentialTests,
  example4_ParallelTests,
  example5_WithAssertions,
  example6_TimeoutHandling,
  example7_StdinInput,
  example8_RkmTestSuite,
  example9_ErrorConditions,
  example10_PerformanceBenchmark
};
