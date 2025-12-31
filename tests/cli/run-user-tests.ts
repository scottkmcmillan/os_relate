#!/usr/bin/env npx tsx
/**
 * RKM User Test Suite Runner
 *
 * This script runs a comprehensive user test suite to verify the RKM CLI
 * is working correctly. It provides clear pass/fail output and generates
 * a test report.
 *
 * Usage:
 *   npx tsx tests/cli/run-user-tests.ts [--verbose] [--json]
 */

import { runCliTest, runCliTests, generateReport, getReportSummary, saveResults, type TestResult } from './cliTestRunner';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

const CWD = process.cwd();
const CLI_BASE = ['tsx', 'src/cli.ts'];
const TEST_DATA_DIR = join(CWD, 'tests/cli/user-test-data');
const FIXTURES_DIR = join(CWD, 'tests/fixtures');

// Parse command line args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const jsonOutput = args.includes('--json');

// Test categories
interface TestCategory {
  name: string;
  tests: Array<{
    name: string;
    command: string;
    args: string[];
    timeout?: number;
    expectedExitCode?: number;
    expectStdout?: string | RegExp;
    expectStderr?: string | RegExp;
  }>;
}

const testCategories: TestCategory[] = [
  {
    name: 'Help & Version',
    tests: [
      {
        name: 'Display version',
        command: 'npx',
        args: [...CLI_BASE, '--version'],
        expectStdout: /\d+\.\d+\.\d+/
      },
      {
        name: 'Display help',
        command: 'npx',
        args: [...CLI_BASE, '--help'],
        expectStdout: /Research Knowledge Manager/
      },
      {
        name: 'Ingest command help',
        command: 'npx',
        args: [...CLI_BASE, 'ingest', '--help'],
        expectStdout: /--path/
      },
      {
        name: 'Query command help',
        command: 'npx',
        args: [...CLI_BASE, 'query', '--help'],
        expectStdout: /Semantic query/
      },
      {
        name: 'Search command help',
        command: 'npx',
        args: [...CLI_BASE, 'search', '--help'],
        expectStdout: /Hybrid search/
      }
    ]
  },
  {
    name: 'Status Command',
    tests: [
      {
        name: 'Basic status',
        command: 'npx',
        args: [...CLI_BASE, 'status'],
        expectStdout: /RuVector Capabilities/
      },
      {
        name: 'Status JSON output',
        command: 'npx',
        args: [...CLI_BASE, 'status', '--json'],
        expectStdout: /"capabilities"/
      },
      {
        name: 'Status full',
        command: 'npx',
        args: [...CLI_BASE, 'status', '--full'],
        expectStdout: /Memory Statistics/
      }
    ]
  },
  {
    name: 'Ingestion Pipeline',
    tests: [
      {
        name: 'Ingest markdown fixture',
        command: 'npx',
        args: [...CLI_BASE, 'ingest', '--path', join(FIXTURES_DIR, 'sample.md'), '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 60000,
        expectStdout: /Ingestion complete|Found 1/
      },
      {
        name: 'Ingest JSON fixture',
        command: 'npx',
        args: [...CLI_BASE, 'ingest', '--path', join(FIXTURES_DIR, 'sample.json'), '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 60000,
        expectStdout: /Ingestion complete|Found 1/
      },
      {
        name: 'Ingest text fixture',
        command: 'npx',
        args: [...CLI_BASE, 'ingest', '--path', join(FIXTURES_DIR, 'sample.txt'), '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 60000,
        expectStdout: /Ingestion complete|Found 1/
      },
      {
        name: 'Ingest with tags',
        command: 'npx',
        args: [...CLI_BASE, 'ingest', '--path', FIXTURES_DIR, '--tag', 'test', '--tag', 'user-testing', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 60000,
        expectStdout: /Ingestion complete|Found/
      }
    ]
  },
  {
    name: 'Query Operations',
    tests: [
      {
        name: 'Semantic query',
        command: 'npx',
        args: [...CLI_BASE, 'query', 'machine learning', '-k', '3', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 30000
      },
      {
        name: 'Query with graph depth',
        command: 'npx',
        args: [...CLI_BASE, 'query', 'knowledge graph', '--graph-depth', '2', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 30000
      }
    ]
  },
  {
    name: 'Search Operations',
    tests: [
      {
        name: 'Hybrid search',
        command: 'npx',
        args: [...CLI_BASE, 'search', 'neural networks', '-k', '5', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 30000
      },
      {
        name: 'Search with JSON format',
        command: 'npx',
        args: [...CLI_BASE, 'search', 'embeddings', '--format', 'json', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 30000
      },
      {
        name: 'Search with reranking',
        command: 'npx',
        args: [...CLI_BASE, 'search', 'text processing', '--rerank', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 30000
      }
    ]
  },
  {
    name: 'Graph Operations',
    tests: [
      {
        name: 'Graph query - list documents',
        command: 'npx',
        args: [...CLI_BASE, 'graph', 'MATCH (n:Document) RETURN n', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 30000,
        expectStdout: /Query:|Nodes:/
      },
      {
        name: 'Graph query - JSON format',
        command: 'npx',
        args: [...CLI_BASE, 'graph', 'MATCH (n) RETURN n', '--format', 'json', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 30000
      }
    ]
  },
  {
    name: 'Route Analysis',
    tests: [
      {
        name: 'Route semantic query',
        command: 'npx',
        args: [...CLI_BASE, 'route', 'Find documents about AI', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 30000,
        expectStdout: /Route:|Confidence:/
      },
      {
        name: 'Route verbose analysis',
        command: 'npx',
        args: [...CLI_BASE, 'route', 'Compare ML and knowledge graphs', '--verbose', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        timeout: 30000,
        expectStdout: /Intent Analysis:|Execution Strategy:/
      }
    ]
  },
  {
    name: 'Error Handling',
    tests: [
      {
        name: 'Unknown command',
        command: 'npx',
        args: [...CLI_BASE, 'nonexistent-command'],
        expectedExitCode: 1,
        expectStderr: /unknown command/
      },
      {
        name: 'Invalid graph query',
        command: 'npx',
        args: [...CLI_BASE, 'graph', 'INVALID SYNTAX', '--db', join(TEST_DATA_DIR, 'test.db'), '--data-dir', join(TEST_DATA_DIR, 'graph')],
        expectedExitCode: 1
      }
    ]
  }
];

async function runUserTests(): Promise<void> {
  console.log('\n');
  console.log('='.repeat(70));
  console.log('  RKM User Test Suite');
  console.log('='.repeat(70));
  console.log('\n');

  // Setup test data directory
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DATA_DIR, { recursive: true });
  mkdirSync(join(TEST_DATA_DIR, 'graph'), { recursive: true });

  const allResults: TestResult[] = [];
  const categoryResults: { name: string; passed: number; failed: number; results: TestResult[] }[] = [];

  for (const category of testCategories) {
    console.log(`\n[${category.name}]`);
    console.log('-'.repeat(50));

    const categoryTestResults: TestResult[] = [];

    for (const test of category.tests) {
      process.stdout.write(`  ${test.name}... `);

      const result = await runCliTest(test.command, test.args, {
        cwd: CWD,
        timeout: test.timeout || 30000,
        expectedExitCode: test.expectedExitCode ?? 0
      });

      // Validate expectations
      let passed = result.passed;

      if (passed && test.expectStdout) {
        if (typeof test.expectStdout === 'string') {
          passed = result.stdout.includes(test.expectStdout);
        } else {
          passed = test.expectStdout.test(result.stdout);
        }
      }

      if (passed && test.expectStderr) {
        if (typeof test.expectStderr === 'string') {
          passed = result.stderr.includes(test.expectStderr);
        } else {
          passed = test.expectStderr.test(result.stderr);
        }
      }

      // Override result passed status
      result.passed = passed;

      if (passed) {
        console.log('\x1b[32mPASS\x1b[0m');
      } else {
        console.log('\x1b[31mFAIL\x1b[0m');
        if (verbose) {
          console.log(`    Exit code: ${result.exitCode}`);
          if (result.error) console.log(`    Error: ${result.error}`);
          if (result.stderr) console.log(`    Stderr: ${result.stderr.substring(0, 200)}`);
          if (result.stdout) console.log(`    Stdout: ${result.stdout.substring(0, 200)}`);
        }
      }

      categoryTestResults.push(result);
      allResults.push(result);
    }

    const catPassed = categoryTestResults.filter(r => r.passed).length;
    const catFailed = categoryTestResults.filter(r => !r.passed).length;
    categoryResults.push({ name: category.name, passed: catPassed, failed: catFailed, results: categoryTestResults });
  }

  // Summary
  const summary = getReportSummary(allResults);

  console.log('\n');
  console.log('='.repeat(70));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(70));
  console.log('\n');

  for (const cat of categoryResults) {
    const status = cat.failed === 0 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`  ${status} ${cat.name}: ${cat.passed}/${cat.passed + cat.failed} passed`);
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`  Total: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`);
  console.log(`  Duration: ${(summary.duration / 1000).toFixed(1)}s`);
  console.log('-'.repeat(70) + '\n');

  // Save results
  const resultsPath = join(TEST_DATA_DIR, 'test-results.json');
  await saveResults(allResults, resultsPath);
  console.log(`  Results saved to: ${resultsPath}\n`);

  if (jsonOutput) {
    console.log(JSON.stringify({ summary, categories: categoryResults }, null, 2));
  }

  // Cleanup
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }

  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

// Run tests
runUserTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
