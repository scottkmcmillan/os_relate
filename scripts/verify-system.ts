#!/usr/bin/env tsx
/**
 * RKM System Verification Workflow
 *
 * This script verifies that the Research Knowledge Manager system is working correctly.
 * It performs comprehensive checks on all components and provides clear pass/fail indicators.
 *
 * Usage:
 *   npm run build && npx tsx scripts/verify-system.ts
 *   OR (if you have the package built):
 *   node dist/cli.js verify
 */

import { execSync, exec } from 'child_process';
import { existsSync, statSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Configuration
// ============================================================================

const TEST_CONFIG = {
  testDbPath: './test-verification.db',
  testDataDir: './test-verification-data',
  sampleDocs: [
    {
      filename: 'sample1.md',
      content: '# Machine Learning Fundamentals\n\nMachine learning is a subset of artificial intelligence that enables systems to learn from data.',
      tags: ['ml', 'ai']
    },
    {
      filename: 'sample2.md',
      content: '# Neural Networks\n\nNeural networks are computing systems inspired by biological neural networks in animal brains.',
      tags: ['ml', 'neural-networks']
    },
    {
      filename: 'sample3.md',
      content: '# Deep Learning Applications\n\nDeep learning has revolutionized computer vision, natural language processing, and robotics.',
      tags: ['deep-learning', 'ai']
    }
  ],
  cleanupAfterTest: true
};

// ============================================================================
// Utilities
// ============================================================================

interface CheckResult {
  passed: boolean;
  message: string;
  details?: string;
  duration?: number;
}

class VerificationRunner {
  private results: Map<string, CheckResult> = new Map();
  private startTime: number = 0;

  constructor(private verbose: boolean = false) {}

  async runCheck(name: string, fn: () => Promise<CheckResult>): Promise<void> {
    process.stdout.write(`\n${this.formatCheckHeader(name)}\n`);

    const checkStartTime = Date.now();
    try {
      const result = await fn();
      result.duration = Date.now() - checkStartTime;
      this.results.set(name, result);
      this.printResult(result);
    } catch (error) {
      const result: CheckResult = {
        passed: false,
        message: 'Check threw an exception',
        details: error instanceof Error ? error.message : String(error),
        duration: Date.now() - checkStartTime
      };
      this.results.set(name, result);
      this.printResult(result);
    }
  }

  private formatCheckHeader(name: string): string {
    return `\n${'='.repeat(80)}\n${name}\n${'='.repeat(80)}`;
  }

  private printResult(result: CheckResult): void {
    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    process.stdout.write(`${color}${icon} ${result.message}${reset}`);
    if (result.duration !== undefined) {
      process.stdout.write(` (${result.duration}ms)`);
    }
    process.stdout.write('\n');

    if (result.details && (this.verbose || !result.passed)) {
      process.stdout.write(`  Details: ${result.details}\n`);
    }
  }

  printSummary(): void {
    const total = this.results.size;
    const passed = Array.from(this.results.values()).filter(r => r.passed).length;
    const failed = total - passed;

    const totalDuration = Date.now() - this.startTime;

    process.stdout.write('\n');
    process.stdout.write('='.repeat(80) + '\n');
    process.stdout.write('VERIFICATION SUMMARY\n');
    process.stdout.write('='.repeat(80) + '\n\n');

    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const color = failed === 0 ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    process.stdout.write(`Total checks: ${total}\n`);
    process.stdout.write(`${color}Passed: ${passed}${reset}\n`);
    if (failed > 0) {
      process.stdout.write(`\x1b[31mFailed: ${failed}\x1b[0m\n`);
    }
    process.stdout.write(`Pass rate: ${passRate}%\n`);
    process.stdout.write(`Total time: ${totalDuration}ms\n\n`);

    if (failed > 0) {
      process.stdout.write('\x1b[31mFailed checks:\x1b[0m\n');
      for (const [name, result] of this.results.entries()) {
        if (!result.passed) {
          process.stdout.write(`  ✗ ${name}: ${result.message}\n`);
          if (result.details) {
            process.stdout.write(`    ${result.details}\n`);
          }
        }
      }
      process.stdout.write('\n');
    }

    if (failed === 0) {
      process.stdout.write('\x1b[32m🎉 All verification checks passed! System is ready.\x1b[0m\n\n');
    } else {
      process.stdout.write('\x1b[31m⚠️  Some checks failed. Please review the errors above.\x1b[0m\n\n');
    }
  }

  start(): void {
    this.startTime = Date.now();
  }

  hasFailures(): boolean {
    return Array.from(this.results.values()).some(r => !r.passed);
  }
}

// ============================================================================
// Verification Checks
// ============================================================================

async function checkNodeVersion(): Promise<CheckResult> {
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0] || '0', 10);

    if (majorVersion >= 18) {
      return {
        passed: true,
        message: `Node.js version is compatible: ${nodeVersion}`,
        details: `Minimum required: v18.x`
      };
    } else {
      return {
        passed: false,
        message: `Node.js version too old: ${nodeVersion}`,
        details: `Required: v18.x or higher. Please upgrade Node.js.`
      };
    }
  } catch (error) {
    return {
      passed: false,
      message: 'Could not determine Node.js version',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkDependenciesInstalled(): Promise<CheckResult> {
  try {
    const nodeModulesExists = existsSync(join(process.cwd(), 'node_modules'));

    if (!nodeModulesExists) {
      return {
        passed: false,
        message: 'Dependencies not installed',
        details: 'Run: npm install'
      };
    }

    // Check critical packages
    const criticalPackages = [
      'ruvector',
      'commander',
      'better-sqlite3',
      '@modelcontextprotocol/sdk'
    ];

    const missing: string[] = [];
    for (const pkg of criticalPackages) {
      const pkgPath = join(process.cwd(), 'node_modules', pkg);
      if (!existsSync(pkgPath)) {
        missing.push(pkg);
      }
    }

    if (missing.length > 0) {
      return {
        passed: false,
        message: 'Some critical packages are missing',
        details: `Missing: ${missing.join(', ')}. Run: npm install`
      };
    }

    return {
      passed: true,
      message: 'All critical dependencies installed',
      details: `Checked: ${criticalPackages.join(', ')}`
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error checking dependencies',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkBuildExists(): Promise<CheckResult> {
  try {
    const distDir = join(process.cwd(), 'dist');
    const cliPath = join(distDir, 'cli.js');

    if (!existsSync(distDir)) {
      return {
        passed: false,
        message: 'Build directory does not exist',
        details: 'Run: npm run build'
      };
    }

    if (!existsSync(cliPath)) {
      return {
        passed: false,
        message: 'CLI build file not found',
        details: 'Run: npm run build'
      };
    }

    const stats = statSync(distDir);
    const files = execSync('find dist -name "*.js" | wc -l', { encoding: 'utf8' }).trim();

    return {
      passed: true,
      message: 'Build exists and is ready',
      details: `Found ${files} JavaScript files in dist/`
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error checking build',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkSystemCapabilities(): Promise<CheckResult> {
  try {
    const output = execSync('node dist/cli.js status --json', {
      encoding: 'utf8',
      timeout: 10000
    });

    const status = JSON.parse(output);

    if (!status.capabilities) {
      return {
        passed: false,
        message: 'Could not retrieve system capabilities',
        details: 'Status command did not return capabilities object'
      };
    }

    const caps = status.capabilities;
    const implementation = caps.implementation?.type || 'unknown';
    const modules = caps.modules || {};

    const details = [
      `Implementation: ${implementation}`,
      `GNN: ${modules.gnnAvailable ? 'Available' : 'Not Available'}`,
      `Attention: ${modules.attentionAvailable ? 'Available' : 'Not Available'}`,
      `SONA: ${modules.sonaAvailable ? 'Available' : 'Not Available'}`
    ].join(', ');

    return {
      passed: true,
      message: 'System capabilities retrieved successfully',
      details
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to retrieve system capabilities',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function setupTestEnvironment(): Promise<CheckResult> {
  try {
    // Clean up any existing test files
    if (existsSync(TEST_CONFIG.testDbPath)) {
      rmSync(TEST_CONFIG.testDbPath, { force: true });
    }
    if (existsSync(TEST_CONFIG.testDataDir)) {
      rmSync(TEST_CONFIG.testDataDir, { recursive: true, force: true });
    }

    // Create test directory
    mkdirSync(TEST_CONFIG.testDataDir, { recursive: true });

    // Create sample documents
    for (const doc of TEST_CONFIG.sampleDocs) {
      const filePath = join(TEST_CONFIG.testDataDir, doc.filename);
      writeFileSync(filePath, doc.content, 'utf8');
    }

    return {
      passed: true,
      message: 'Test environment setup complete',
      details: `Created ${TEST_CONFIG.sampleDocs.length} sample documents in ${TEST_CONFIG.testDataDir}`
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to setup test environment',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testIngestion(): Promise<CheckResult> {
  try {
    const tags = TEST_CONFIG.sampleDocs[0]?.tags.join(' ') || '';

    const output = execSync(
      `node dist/cli.js --db ${TEST_CONFIG.testDbPath} --data-dir ${TEST_CONFIG.testDataDir} ingest --path ${TEST_CONFIG.testDataDir} --tag ${tags}`,
      { encoding: 'utf8', timeout: 30000 }
    );

    // Check if ingestion was successful
    const successMatch = output.match(/Ingested (\d+) documents/) || output.match(/Documents: (\d+)/);

    if (successMatch) {
      const count = parseInt(successMatch[1] || '0', 10);
      if (count === TEST_CONFIG.sampleDocs.length) {
        return {
          passed: true,
          message: 'Document ingestion successful',
          details: `Ingested ${count} documents`
        };
      } else {
        return {
          passed: false,
          message: 'Ingestion count mismatch',
          details: `Expected ${TEST_CONFIG.sampleDocs.length} documents, got ${count}`
        };
      }
    } else {
      return {
        passed: false,
        message: 'Could not parse ingestion output',
        details: output.substring(0, 200)
      };
    }
  } catch (error) {
    return {
      passed: false,
      message: 'Ingestion failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testQuery(): Promise<CheckResult> {
  try {
    const output = execSync(
      `node dist/cli.js --db ${TEST_CONFIG.testDbPath} --data-dir ${TEST_CONFIG.testDataDir} query "machine learning" -k 2`,
      { encoding: 'utf8', timeout: 30000 }
    );

    // Check if we got results
    const hasResults = output.includes('Machine Learning') ||
                      output.includes('score:') ||
                      output.includes('source:');

    if (hasResults) {
      // Count the number of results
      const resultMatches = output.match(/\d+\./g);
      const resultCount = resultMatches ? resultMatches.length : 0;

      return {
        passed: true,
        message: 'Query executed successfully',
        details: `Retrieved ${resultCount} results for query "machine learning"`
      };
    } else if (output.includes('No results found')) {
      return {
        passed: false,
        message: 'Query returned no results (unexpected)',
        details: 'Expected to find documents matching "machine learning"'
      };
    } else {
      return {
        passed: false,
        message: 'Could not parse query output',
        details: output.substring(0, 200)
      };
    }
  } catch (error) {
    return {
      passed: false,
      message: 'Query failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testSearch(): Promise<CheckResult> {
  try {
    const output = execSync(
      `node dist/cli.js --db ${TEST_CONFIG.testDbPath} --data-dir ${TEST_CONFIG.testDataDir} search "neural networks" -k 2 --format json`,
      { encoding: 'utf8', timeout: 30000 }
    );

    // Parse JSON output
    const result = JSON.parse(output);

    if (!result.results || !Array.isArray(result.results)) {
      return {
        passed: false,
        message: 'Search output missing results array',
        details: 'Expected JSON with results array'
      };
    }

    const resultCount = result.results.length;
    const hasScores = result.results.every((r: any) => typeof r.combinedScore === 'number');

    if (resultCount > 0 && hasScores) {
      return {
        passed: true,
        message: 'Hybrid search executed successfully',
        details: `Retrieved ${resultCount} results with valid scores`
      };
    } else {
      return {
        passed: false,
        message: 'Search results incomplete',
        details: `Got ${resultCount} results, hasScores: ${hasScores}`
      };
    }
  } catch (error) {
    return {
      passed: false,
      message: 'Search failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testGraph(): Promise<CheckResult> {
  try {
    const output = execSync(
      `node dist/cli.js --db ${TEST_CONFIG.testDbPath} --data-dir ${TEST_CONFIG.testDataDir} graph "MATCH (n:Document) RETURN n" --format json`,
      { encoding: 'utf8', timeout: 30000 }
    );

    const result = JSON.parse(output);

    if (!result.nodes || !Array.isArray(result.nodes)) {
      return {
        passed: false,
        message: 'Graph query output missing nodes array',
        details: 'Expected JSON with nodes array'
      };
    }

    const nodeCount = result.nodes.length;
    const edgeCount = result.edges?.length || 0;

    if (nodeCount > 0) {
      return {
        passed: true,
        message: 'Graph query executed successfully',
        details: `Found ${nodeCount} nodes, ${edgeCount} edges`
      };
    } else {
      return {
        passed: false,
        message: 'Graph query returned no nodes',
        details: 'Expected to find document nodes in graph'
      };
    }
  } catch (error) {
    return {
      passed: false,
      message: 'Graph query failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testStatusFull(): Promise<CheckResult> {
  try {
    const output = execSync(
      `node dist/cli.js --db ${TEST_CONFIG.testDbPath} --data-dir ${TEST_CONFIG.testDataDir} status --full --json`,
      { encoding: 'utf8', timeout: 10000 }
    );

    const status = JSON.parse(output);

    if (!status.stats) {
      return {
        passed: false,
        message: 'Full status missing stats',
        details: 'Expected stats object in full status output'
      };
    }

    const vectorCount = status.stats.vector?.totalVectors || 0;
    const nodeCount = status.stats.graph?.nodeCount || 0;
    const edgeCount = status.stats.graph?.edgeCount || 0;

    const hasData = vectorCount > 0 || nodeCount > 0;

    const details = [
      `Vectors: ${vectorCount}`,
      `Nodes: ${nodeCount}`,
      `Edges: ${edgeCount}`
    ].join(', ');

    return {
      passed: hasData,
      message: hasData ? 'Full status retrieved successfully' : 'Status shows no data',
      details
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Full status check failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testRouter(): Promise<CheckResult> {
  try {
    const output = execSync(
      `node dist/cli.js route "Find all documents about machine learning"`,
      { encoding: 'utf8', timeout: 10000 }
    );

    const hasRoute = output.includes('Route:') && output.includes('Confidence:');

    if (hasRoute) {
      // Extract route info
      const routeMatch = output.match(/Route:\s*(\w+)/);
      const confidenceMatch = output.match(/Confidence:\s*([\d.]+)%/);

      const route = routeMatch ? routeMatch[1] : 'unknown';
      const confidence = confidenceMatch ? confidenceMatch[1] : 'unknown';

      return {
        passed: true,
        message: 'Semantic router working',
        details: `Routed to: ${route} (${confidence}% confidence)`
      };
    } else {
      return {
        passed: false,
        message: 'Router output incomplete',
        details: output.substring(0, 200)
      };
    }
  } catch (error) {
    return {
      passed: false,
      message: 'Router test failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function cleanupTestEnvironment(): Promise<CheckResult> {
  try {
    if (TEST_CONFIG.cleanupAfterTest) {
      if (existsSync(TEST_CONFIG.testDbPath)) {
        rmSync(TEST_CONFIG.testDbPath, { force: true });
      }
      if (existsSync(TEST_CONFIG.testDataDir)) {
        rmSync(TEST_CONFIG.testDataDir, { recursive: true, force: true });
      }

      return {
        passed: true,
        message: 'Test environment cleaned up',
        details: 'Removed test database and sample documents'
      };
    } else {
      return {
        passed: true,
        message: 'Cleanup skipped (cleanup disabled)',
        details: `Test files preserved: ${TEST_CONFIG.testDbPath}, ${TEST_CONFIG.testDataDir}`
      };
    }
  } catch (error) {
    return {
      passed: false,
      message: 'Cleanup failed (non-critical)',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  process.stdout.write('\n');
  process.stdout.write('╔════════════════════════════════════════════════════════════════════════════╗\n');
  process.stdout.write('║        Research Knowledge Manager - System Verification Workflow          ║\n');
  process.stdout.write('╚════════════════════════════════════════════════════════════════════════════╝\n');
  process.stdout.write('\n');

  const runner = new VerificationRunner(verbose);
  runner.start();

  // Phase 1: Pre-flight Checks
  process.stdout.write('\n📋 PHASE 1: PRE-FLIGHT CHECKS\n');
  await runner.runCheck('Node.js Version', checkNodeVersion);
  await runner.runCheck('Dependencies Installed', checkDependenciesInstalled);
  await runner.runCheck('Build Exists', checkBuildExists);
  await runner.runCheck('System Capabilities', checkSystemCapabilities);

  // Phase 2: Test Environment Setup
  process.stdout.write('\n🔧 PHASE 2: TEST ENVIRONMENT SETUP\n');
  await runner.runCheck('Setup Test Environment', setupTestEnvironment);

  // Phase 3: Ingestion & Query Tests
  process.stdout.write('\n📥 PHASE 3: INGESTION & QUERY VERIFICATION\n');
  await runner.runCheck('Document Ingestion', testIngestion);
  await runner.runCheck('Vector Query', testQuery);
  await runner.runCheck('Hybrid Search', testSearch);
  await runner.runCheck('Graph Query', testGraph);

  // Phase 4: Feature Tests
  process.stdout.write('\n🧠 PHASE 4: ADVANCED FEATURES\n');
  await runner.runCheck('Full Status Report', testStatusFull);
  await runner.runCheck('Semantic Router', testRouter);

  // Phase 5: Cleanup
  process.stdout.write('\n🧹 PHASE 5: CLEANUP\n');
  await runner.runCheck('Cleanup Test Files', cleanupTestEnvironment);

  // Print summary
  runner.printSummary();

  // Exit with appropriate code
  process.exit(runner.hasFailures() ? 1 : 0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as runVerification };
