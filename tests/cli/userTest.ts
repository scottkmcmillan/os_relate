#!/usr/bin/env tsx
/**
 * User Test Suite - CLI Interface Test Runner
 *
 * This test suite verifies the RKM (Research Knowledge Manager) system
 * is working as expected through the CLI interface. Users can run these
 * tests to validate their installation and system functionality.
 *
 * Usage:
 *   npx tsx tests/cli/userTest.ts
 *   npx tsx tests/cli/userTest.ts --verbose
 *   npx tsx tests/cli/userTest.ts --json
 *
 * @module tests/cli/userTest
 */

import { spawn, execSync, SpawnSyncReturns } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface TestResult {
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  message?: string;
  details?: string;
}

interface TestReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  tests: TestResult[];
  systemInfo: {
    nodeVersion: string;
    platform: string;
    cwd: string;
  };
}

interface CLIOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

// ============================================================================
// CLI Options
// ============================================================================

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose') || args.includes('-v');
const JSON_OUTPUT = args.includes('--json');
const HELP = args.includes('--help') || args.includes('-h');

if (HELP) {
  console.log(`
RKM User Test Suite
===================

Verifies the Research Knowledge Manager system is working correctly.

Usage:
  npx tsx tests/cli/userTest.ts [options]

Options:
  --verbose, -v    Show detailed output for each test
  --json           Output results as JSON
  --help, -h       Show this help message

Examples:
  npx tsx tests/cli/userTest.ts              # Run all tests
  npx tsx tests/cli/userTest.ts --verbose    # Run with detailed output
  npx tsx tests/cli/userTest.ts --json       # Output JSON report
`);
  process.exit(0);
}

// ============================================================================
// Utilities
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(msg: string, color?: keyof typeof colors): void {
  if (JSON_OUTPUT) return;
  const prefix = color ? colors[color] : '';
  const suffix = color ? colors.reset : '';
  console.log(`${prefix}${msg}${suffix}`);
}

// Determine CLI command based on what's available
function getCLICommand(): string {
  const projectRoot = path.resolve(__dirname, '../..');
  const distCli = path.join(projectRoot, 'dist', 'cli.js');

  // Prefer built version for speed
  if (fs.existsSync(distCli)) {
    return `node ${distCli}`;
  }

  // Fallback to tsx (slower)
  return `npx tsx ${path.join(projectRoot, 'src', 'cli.ts')}`;
}

const CLI_COMMAND = getCLICommand();

function runCLI(args: string[], timeout = 15000): CLIOutput {
  const start = Date.now();
  const projectRoot = path.resolve(__dirname, '../..');

  try {
    const result = execSync(
      `${CLI_COMMAND} ${args.join(' ')}`,
      {
        cwd: projectRoot,
        timeout,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    return {
      stdout: result || '',
      stderr: '',
      exitCode: 0,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
      exitCode: error.status ?? 1,
      duration: Date.now() - start,
    };
  }
}

// ============================================================================
// Test Definitions
// ============================================================================

const tests: Array<{
  name: string;
  category: string;
  run: () => TestResult;
}> = [];

function defineTest(
  name: string,
  category: string,
  fn: () => { success: boolean; message?: string; details?: string }
): void {
  tests.push({
    name,
    category,
    run: () => {
      const start = Date.now();
      try {
        const result = fn();
        return {
          name,
          category,
          status: result.success ? 'pass' : 'fail',
          duration: Date.now() - start,
          message: result.message,
          details: result.details,
        };
      } catch (error) {
        return {
          name,
          category,
          status: 'fail',
          duration: Date.now() - start,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
}

// ============================================================================
// Test Suite: System Status
// ============================================================================

defineTest('CLI version command works', 'System', () => {
  const output = runCLI(['--version'], 60000);
  const versionMatch = output.stdout.match(/\d+\.\d+\.\d+/);
  const success = output.exitCode === 0 && versionMatch !== null;
  return {
    success,
    message: success ? `Version: ${versionMatch?.[0] || output.stdout.trim()}` : `Version command failed: exit=${output.exitCode}`,
    details: VERBOSE ? `stdout: ${output.stdout}\nstderr: ${output.stderr}` : undefined,
  };
});

defineTest('CLI help command works', 'System', () => {
  const output = runCLI(['--help'], 60000);
  const hasRkm = output.stdout.includes('rkm') || output.stdout.includes('RKM') || output.stdout.includes('Research');
  const hasIngest = output.stdout.includes('ingest');
  const hasQuery = output.stdout.includes('query');
  const success = output.exitCode === 0 && hasRkm && hasIngest && hasQuery;
  return {
    success,
    message: success ? 'Help displays all commands' : `Help incomplete: rkm=${hasRkm}, ingest=${hasIngest}, query=${hasQuery}`,
    details: VERBOSE ? output.stdout.slice(0, 500) : undefined,
  };
});

defineTest('Status command runs', 'System', () => {
  const output = runCLI(['status'], 60000);
  const hasCapabilities = output.stdout.includes('RuVector') ||
                          output.stdout.includes('Capabilities') ||
                          output.stdout.includes('Implementation') ||
                          output.stdout.includes('Modules');
  const success = output.exitCode === 0 && hasCapabilities;
  return {
    success,
    message: success ? 'Status command executed' : `Status failed: exit=${output.exitCode}`,
    details: VERBOSE ? output.stdout.slice(0, 500) : undefined,
  };
});

defineTest('Status JSON output works', 'System', () => {
  const output = runCLI(['status', '--json'], 60000);
  try {
    const json = JSON.parse(output.stdout);
    const success = json && typeof json.capabilities === 'object';
    return {
      success,
      message: success ? 'JSON status parsed correctly' : 'Invalid JSON structure',
      details: VERBOSE ? JSON.stringify(json, null, 2).slice(0, 500) : undefined,
    };
  } catch {
    return {
      success: false,
      message: 'Failed to parse JSON output',
      details: `stderr: ${output.stderr}\nstdout: ${output.stdout.slice(0, 300)}`,
    };
  }
});

defineTest('Status full report works', 'System', () => {
  const output = runCLI(['status', '--full'], 60000);
  const hasStats = output.stdout.includes('Memory Statistics') ||
                   output.stdout.includes('Vector Store') ||
                   output.stdout.includes('Graph Store') ||
                   output.stdout.includes('Implementation') ||
                   output.stdout.includes('Modules');
  return {
    success: output.exitCode === 0 && hasStats,
    message: hasStats ? 'Full status report generated' : 'Missing status info',
    details: VERBOSE ? output.stdout.slice(0, 500) : undefined,
  };
});

// ============================================================================
// Test Suite: Ingestion
// ============================================================================

const TEST_DATA_DIR = path.join(__dirname, 'test-data');
const TEST_DB = path.join(__dirname, 'test-ruvector.db');

defineTest('Ingest handles missing path gracefully', 'Ingestion', () => {
  const output = runCLI(['ingest', '--path', '/nonexistent/path/abc123'], 60000);
  // Should either error gracefully or report no documents
  const success = output.exitCode !== 0 || output.stdout.includes('No ingestible') || output.stderr.includes('ENOENT');
  return {
    success,
    message: success ? 'Missing path handled correctly' : 'Unexpected response',
    details: VERBOSE ? (output.stderr || output.stdout) : undefined,
  };
});

defineTest('Ingest help shows options', 'Ingestion', () => {
  const output = runCLI(['ingest', '--help'], 60000);
  const hasPath = output.stdout.includes('--path') || output.stdout.includes('path');
  const hasTag = output.stdout.includes('--tag') || output.stdout.includes('tag');
  const success = hasPath && hasTag;
  return {
    success,
    message: success ? 'Ingest options displayed' : `Missing: path=${hasPath}, tag=${hasTag}`,
    details: VERBOSE ? output.stdout : undefined,
  };
});

// ============================================================================
// Test Suite: Query Commands
// ============================================================================

defineTest('Query help shows options', 'Query', () => {
  const output = runCLI(['query', '--help'], 60000);
  const hasK = output.stdout.includes('-k') || output.stdout.includes('results');
  const success = output.exitCode === 0 && hasK;
  return {
    success,
    message: success ? 'Query options displayed' : `Missing options: k=${hasK}`,
    details: VERBOSE ? output.stdout : undefined,
  };
});

defineTest('Search help shows options', 'Query', () => {
  const output = runCLI(['search', '--help'], 60000);
  const hasWeight = output.stdout.includes('weight') || output.stdout.includes('vector');
  const hasFormat = output.stdout.includes('format') || output.stdout.includes('json');
  const success = output.exitCode === 0 && (hasWeight || hasFormat);
  return {
    success,
    message: success ? 'Search options displayed' : `Missing: weight=${hasWeight}, format=${hasFormat}`,
    details: VERBOSE ? output.stdout : undefined,
  };
});

defineTest('Search formats supported', 'Query', () => {
  const output = runCLI(['search', '--help'], 60000);
  const hasJson = output.stdout.includes('json');
  const hasText = output.stdout.includes('text');
  const hasMd = output.stdout.includes('markdown') || output.stdout.includes('md');
  const hasFormats = hasJson || hasText || hasMd;
  return {
    success: hasFormats,
    message: hasFormats ? 'Output formats available' : 'No format options found',
    details: VERBOSE ? output.stdout : undefined,
  };
});

// ============================================================================
// Test Suite: Graph Commands
// ============================================================================

defineTest('Graph command help available', 'Graph', () => {
  const output = runCLI(['graph', '--help'], 60000);
  const success = output.stdout.includes('Cypher') ||
                  output.stdout.includes('query') ||
                  output.stdout.includes('graph') ||
                  output.stdout.includes('MATCH');
  return {
    success,
    message: success ? 'Graph command documented' : 'Graph help missing',
    details: VERBOSE ? output.stdout : undefined,
  };
});

// ============================================================================
// Test Suite: Route Command
// ============================================================================

defineTest('Route command analyzes query', 'Routing', () => {
  const output = runCLI(['route', '"find documents about machine learning"'], 60000);
  const success = output.exitCode === 0 &&
                  (output.stdout.includes('Route') ||
                   output.stdout.includes('Confidence') ||
                   output.stdout.includes('Query'));
  return {
    success,
    message: success ? 'Query routing works' : `Route failed: exit=${output.exitCode}`,
    details: VERBOSE ? output.stdout : undefined,
  };
});

defineTest('Route verbose mode works', 'Routing', () => {
  const output = runCLI(['route', '"what is the architecture"', '--verbose'], 60000);
  const hasIntent = output.stdout.includes('Intent') ||
                    output.stdout.includes('Strategy') ||
                    output.stdout.includes('Complexity') ||
                    output.stdout.includes('Query');
  return {
    success: output.exitCode === 0 && hasIntent,
    message: hasIntent ? 'Verbose routing analysis works' : 'Missing verbose details',
    details: VERBOSE ? output.stdout : undefined,
  };
});

// ============================================================================
// Test Suite: Context Command
// ============================================================================

defineTest('Context command help available', 'Context', () => {
  const output = runCLI(['context', '--help'], 60000);
  const success = output.stdout.includes('max-chars') ||
                  output.stdout.includes('title') ||
                  output.stdout.includes('Claude') ||
                  output.stdout.includes('context');
  return {
    success,
    message: success ? 'Context command documented' : 'Context help missing',
    details: VERBOSE ? output.stdout : undefined,
  };
});

// ============================================================================
// Test Suite: Learn Command
// ============================================================================

defineTest('Learn command available', 'Learning', () => {
  const output = runCLI(['learn', '--help'], 60000);
  const success = output.stdout.includes('SONA') ||
                  output.stdout.includes('learning') ||
                  output.stdout.includes('force') ||
                  output.stdout.includes('trajectories');
  return {
    success,
    message: success ? 'Learn command documented' : 'Learn help missing',
    details: VERBOSE ? output.stdout : undefined,
  };
});

// ============================================================================
// Test Runner
// ============================================================================

function runTests(): TestReport {
  const startTime = Date.now();
  const results: TestResult[] = [];

  // Group tests by category for display
  const categories = [...new Set(tests.map((t) => t.category))];

  if (!JSON_OUTPUT) {
    log('\n========================================', 'bold');
    log('  RKM User Test Suite', 'bold');
    log('========================================\n', 'bold');
    log(`Running ${tests.length} tests...\n`);
  }

  for (const category of categories) {
    if (!JSON_OUTPUT) {
      log(`\n${category}`, 'blue');
      log('─'.repeat(40), 'dim');
    }

    const categoryTests = tests.filter((t) => t.category === category);

    for (const test of categoryTests) {
      const result = test.run();
      results.push(result);

      if (!JSON_OUTPUT) {
        const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '○';
        const color = result.status === 'pass' ? 'green' : result.status === 'fail' ? 'red' : 'yellow';

        log(`  ${icon} ${result.name} (${result.duration}ms)`, color);

        if (result.message && (VERBOSE || result.status === 'fail')) {
          log(`    ${result.message}`, 'dim');
        }

        if (result.details && VERBOSE) {
          const indented = result.details.split('\n').map(l => `      ${l}`).join('\n');
          log(indented, 'dim');
        }
      }
    }
  }

  const endTime = Date.now();
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  const report: TestReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed,
      failed,
      skipped,
      duration: endTime - startTime,
    },
    tests: results,
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
    },
  };

  return report;
}

function printSummary(report: TestReport): void {
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const { summary } = report;

  log('\n========================================', 'bold');
  log('  Test Results Summary', 'bold');
  log('========================================\n', 'bold');

  log(`Total Tests: ${summary.total}`);
  log(`Passed:      ${summary.passed}`, 'green');
  if (summary.failed > 0) {
    log(`Failed:      ${summary.failed}`, 'red');
  }
  if (summary.skipped > 0) {
    log(`Skipped:     ${summary.skipped}`, 'yellow');
  }
  log(`Duration:    ${summary.duration}ms`);

  log('');

  if (summary.failed > 0) {
    log('Failed Tests:', 'red');
    for (const test of report.tests.filter(t => t.status === 'fail')) {
      log(`  - ${test.name}: ${test.message || 'Unknown error'}`, 'red');
    }
    log('');
  }

  if (summary.failed === 0) {
    log('All tests passed! The system is working as expected.', 'green');
  } else {
    log('Some tests failed. Review the output above for details.', 'red');
  }

  log(`\nReport generated: ${report.timestamp}`);
  log(`Node: ${report.systemInfo.nodeVersion} | Platform: ${report.systemInfo.platform}`);
  log('');
}

// ============================================================================
// Main Entry Point
// ============================================================================

const report = runTests();
printSummary(report);

// Exit with appropriate code
process.exit(report.summary.failed > 0 ? 1 : 0);
