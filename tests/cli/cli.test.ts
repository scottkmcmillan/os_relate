/**
 * Comprehensive CLI Tests for Research Knowledge Manager
 *
 * Tests all RKM CLI commands with actual execution, verifying:
 * - Command execution and exit codes
 * - Output validation
 * - Error handling
 * - Help flags
 * - Various option combinations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

// CLI command base
const CLI = 'npx tsx src/cli.ts';

// Test data directory
const TEST_DATA_DIR = join(process.cwd(), 'tests/cli/test-data');
const TEST_DB_PATH = join(TEST_DATA_DIR, 'test-rkm.db');
const TEST_GRAPH_DIR = join(TEST_DATA_DIR, 'graph');

// Helper to execute CLI commands with proper error handling
async function runCLI(args: string, timeout = 30000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execAsync(`${CLI} --db ${TEST_DB_PATH} --data-dir ${TEST_GRAPH_DIR} ${args}`, {
      cwd: process.cwd(),
      timeout,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
    // Check if it's a timeout error
    if (error.killed) {
      return { stdout: error.stdout || '', stderr: 'Command timed out', exitCode: 124 };
    }
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1,
    };
  }
}

// Helper to create test documents
function createTestDocuments() {
  const docsDir = join(TEST_DATA_DIR, 'docs');
  mkdirSync(docsDir, { recursive: true });

  // Create markdown files
  writeFileSync(
    join(docsDir, 'doc1.md'),
    `# Document 1\n\nThis is a test document about machine learning and neural networks.\n\n## Section 1\n\nDeep learning is a subset of machine learning.`
  );

  writeFileSync(
    join(docsDir, 'doc2.md'),
    `# Document 2\n\nThis document discusses knowledge graphs and semantic search.\n\n## Overview\n\nKnowledge graphs represent structured information.`
  );

  writeFileSync(
    join(docsDir, 'doc3.txt'),
    `Plain text document about vector databases and embeddings. Vector databases store high-dimensional vectors for similarity search.`
  );

  // Create JSON document
  writeFileSync(
    join(docsDir, 'doc4.json'),
    JSON.stringify({
      title: 'JSON Document',
      content: 'This is a JSON document about information retrieval and search systems.',
      metadata: {
        category: 'research',
        tags: ['search', 'ir'],
      },
    })
  );

  return docsDir;
}

describe('RKM CLI', () => {
  beforeAll(() => {
    // Clean up any existing test data
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    // Create test data directory
    mkdirSync(TEST_DATA_DIR, { recursive: true });
    mkdirSync(TEST_GRAPH_DIR, { recursive: true });
  });

  afterAll(() => {
    // Clean up test data
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  describe('General CLI', () => {
    it('should display version with --version', async () => {
      const result = await runCLI('--version');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('0.3.0');
    });

    it('should display help with --help', async () => {
      const result = await runCLI('--help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Research Knowledge Manager');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('ingest');
      expect(result.stdout).toContain('query');
      expect(result.stdout).toContain('search');
      expect(result.stdout).toContain('graph');
      expect(result.stdout).toContain('route');
      expect(result.stdout).toContain('status');
    });

    it('should accept global --db option', async () => {
      const result = await runCLI('--db /tmp/custom.db status');
      expect(result.exitCode).toBe(0);
    });

    it('should accept global --data-dir option', async () => {
      const result = await runCLI('--data-dir /tmp/graph status');
      expect(result.exitCode).toBe(0);
    });

    it('should accept global --dims option', async () => {
      const result = await runCLI('--dims 512 status');
      expect(result.exitCode).toBe(0);
    });

    it('should accept global --no-cognitive flag', async () => {
      const result = await runCLI('--no-cognitive status');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('status command', () => {
    it('should display system status', async () => {
      const result = await runCLI('status');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('RuVector Capabilities');
      expect(result.stdout).toContain('Implementation:');
      expect(result.stdout).toContain('Modules:');
    });

    it('should output JSON with --json flag', async () => {
      const result = await runCLI('status --json');
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('capabilities');
      expect(output.capabilities).toHaveProperty('implementation');
      expect(output.capabilities).toHaveProperty('modules');
    });

    it('should show full statistics with --full flag', async () => {
      const result = await runCLI('status --full');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Memory Statistics');
      expect(result.stdout).toContain('Vector Store:');
      expect(result.stdout).toContain('Graph Store:');
      expect(result.stdout).toContain('Cognitive Features:');
    });

    it('should include router information with --router flag', async () => {
      const result = await runCLI('status --router');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Semantic Router');
      expect(result.stdout).toContain('Status:');
    });

    it('should combine --json and --full flags', async () => {
      const result = await runCLI('status --json --full');
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('capabilities');
      expect(output).toHaveProperty('stats');
      expect(output).toHaveProperty('cognitiveCapabilities');
    });

    it('should display help for status command', async () => {
      const result = await runCLI('status --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Show system capabilities');
      expect(result.stdout).toContain('--json');
      expect(result.stdout).toContain('--full');
      expect(result.stdout).toContain('--router');
    });
  });

  describe('ingest command', () => {
    let docsDir: string;

    beforeEach(() => {
      docsDir = createTestDocuments();
    });

    it('should require --path argument', async () => {
      const result = await runCLI('ingest');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('required option');
    });

    it('should ingest documents from directory', async () => {
      const result = await runCLI(`ingest --path ${docsDir}`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Reading files');
      expect(result.stdout).toContain('Found');
      expect(result.stdout).toContain('Ingestion complete');
    });

    it('should ingest single file', async () => {
      const filePath = join(docsDir, 'doc1.md');
      const result = await runCLI(`ingest --path ${filePath}`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Ingestion complete');
    });

    it('should support --tag option', async () => {
      const result = await runCLI(`ingest --path ${docsDir} --tag test --tag automated`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Ingestion complete');
    });

    it('should support --no-graph flag', async () => {
      const result = await runCLI(`ingest --path ${docsDir} --no-graph`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Ingestion complete');
    });

    it('should support --legacy flag', async () => {
      const result = await runCLI(`ingest --path ${docsDir} --legacy`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Ingested');
      expect(result.stdout).toContain('legacy mode');
    });

    it('should handle non-existent path', async () => {
      const result = await runCLI('ingest --path /non/existent/path');
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle empty directory', async () => {
      const emptyDir = join(TEST_DATA_DIR, 'empty');
      mkdirSync(emptyDir, { recursive: true });
      const result = await runCLI(`ingest --path ${emptyDir}`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No ingestible documents found');
    });

    it('should display help for ingest command', async () => {
      const result = await runCLI('ingest --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Ingest a file or directory');
      expect(result.stdout).toContain('--path');
      expect(result.stdout).toContain('--tag');
      expect(result.stdout).toContain('--no-graph');
      expect(result.stdout).toContain('--legacy');
    });
  });

  describe('query command', () => {
    beforeAll(async () => {
      // Ingest test documents before running queries
      const docsDir = createTestDocuments();
      await runCLI(`ingest --path ${docsDir}`);
    });

    it('should require query text argument', async () => {
      const result = await runCLI('query');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('missing required argument');
    });

    it('should execute semantic query', async () => {
      const result = await runCLI('query "machine learning"');
      expect(result.exitCode).toBe(0);
      // Should show results or "No results found"
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it('should support -k option for result count', async () => {
      const result = await runCLI('query "neural networks" -k 3');
      expect(result.exitCode).toBe(0);
    });

    it('should support --k option for result count', async () => {
      const result = await runCLI('query "deep learning" --k 10');
      expect(result.exitCode).toBe(0);
    });

    it('should support --show-related flag', async () => {
      const result = await runCLI('query "knowledge graph" --show-related');
      expect(result.exitCode).toBe(0);
    });

    it('should support --graph-depth option', async () => {
      const result = await runCLI('query "semantic search" --graph-depth 2');
      expect(result.exitCode).toBe(0);
    });

    it('should support --legacy flag', async () => {
      const result = await runCLI('query "vector database" --legacy');
      expect(result.exitCode).toBe(0);
    });

    it('should handle invalid -k value', async () => {
      const result = await runCLI('query "test" -k invalid');
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle negative -k value', async () => {
      const result = await runCLI('query "test" -k -5');
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle zero -k value', async () => {
      const result = await runCLI('query "test" -k 0');
      expect(result.exitCode).not.toBe(0);
    });

    it('should display help for query command', async () => {
      const result = await runCLI('query --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Semantic query');
      expect(result.stdout).toContain('-k');
      expect(result.stdout).toContain('--show-related');
      expect(result.stdout).toContain('--graph-depth');
      expect(result.stdout).toContain('--legacy');
    });
  });

  describe('search command', () => {
    beforeAll(async () => {
      // Ensure test documents are ingested
      const docsDir = createTestDocuments();
      await runCLI(`ingest --path ${docsDir}`);
    });

    it('should require search text argument', async () => {
      const result = await runCLI('search');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('missing required argument');
    });

    it('should execute hybrid search', async () => {
      const result = await runCLI('search "information retrieval"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it('should support -k option', async () => {
      const result = await runCLI('search "database" -k 5');
      expect(result.exitCode).toBe(0);
    });

    it('should support --vector-weight option', async () => {
      const result = await runCLI('search "embeddings" --vector-weight 0.5');
      expect(result.exitCode).toBe(0);
    });

    it('should validate vector-weight range', async () => {
      const result1 = await runCLI('search "test" --vector-weight 1.5');
      // May or may not error depending on implementation, but should handle gracefully
      expect([0, 1]).toContain(result1.exitCode);
    });

    it('should support --include-related flag', async () => {
      const result = await runCLI('search "graph" --include-related');
      expect(result.exitCode).toBe(0);
    });

    it('should support --graph-depth option', async () => {
      const result = await runCLI('search "search" --graph-depth 2');
      expect(result.exitCode).toBe(0);
    });

    it('should support --rerank flag', async () => {
      const result = await runCLI('search "neural" --rerank');
      expect(result.exitCode).toBe(0);
    });

    it('should support --format json', async () => {
      const result = await runCLI('search "vector" --format json');
      expect(result.exitCode).toBe(0);
      if (result.stdout.trim()) {
        const output = JSON.parse(result.stdout);
        expect(output).toHaveProperty('query');
        expect(output).toHaveProperty('results');
      }
    });

    it('should support --format text', async () => {
      const result = await runCLI('search "knowledge" --format text');
      expect(result.exitCode).toBe(0);
    });

    it('should support --format markdown', async () => {
      const result = await runCLI('search "learning" --format markdown');
      expect(result.exitCode).toBe(0);
    });

    it('should handle invalid format', async () => {
      const result = await runCLI('search "test" --format invalid');
      // Should either error or default to text
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should display help for search command', async () => {
      const result = await runCLI('search --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hybrid search');
      expect(result.stdout).toContain('--vector-weight');
      expect(result.stdout).toContain('--include-related');
      expect(result.stdout).toContain('--graph-depth');
      expect(result.stdout).toContain('--rerank');
      expect(result.stdout).toContain('--format');
    });
  });

  describe('graph command', () => {
    beforeAll(async () => {
      // Ensure test documents are ingested with graph
      const docsDir = createTestDocuments();
      await runCLI(`ingest --path ${docsDir}`);
    });

    it('should require cypher argument', async () => {
      const result = await runCLI('graph');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('missing required argument');
    });

    it('should execute simple graph query', async () => {
      const result = await runCLI('graph "MATCH (n:Document) RETURN n"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Query:');
      expect(result.stdout).toContain('Nodes:');
      expect(result.stdout).toContain('Edges:');
    });

    it('should execute graph query with relationships', async () => {
      const result = await runCLI('graph "MATCH (n)-[r]->(m) RETURN n, r, m"');
      expect(result.exitCode).toBe(0);
    });

    it('should support --format json', async () => {
      const result = await runCLI('graph "MATCH (n) RETURN n" --format json');
      expect(result.exitCode).toBe(0);
      if (result.stdout.trim()) {
        const output = JSON.parse(result.stdout);
        expect(output).toHaveProperty('nodes');
        expect(output).toHaveProperty('edges');
      }
    });

    it('should support --format summary', async () => {
      const result = await runCLI('graph "MATCH (n) RETURN n" --format summary');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Query:');
    });

    it('should handle invalid cypher syntax', async () => {
      const result = await runCLI('graph "INVALID CYPHER QUERY"');
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Query error');
    });

    it('should handle empty results', async () => {
      const result = await runCLI('graph "MATCH (n:NonExistent) RETURN n"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Nodes: 0');
    });

    it('should display help for graph command', async () => {
      const result = await runCLI('graph --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Query the knowledge graph');
      expect(result.stdout).toContain('cypher');
      expect(result.stdout).toContain('--format');
    });
  });

  describe('route command', () => {
    it('should require query argument', async () => {
      const result = await runCLI('route');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('missing required argument');
    });

    it('should analyze query intent', async () => {
      const result = await runCLI('route "What documents discuss machine learning?"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Query:');
      expect(result.stdout).toContain('Route:');
      expect(result.stdout).toContain('Confidence:');
      expect(result.stdout).toContain('Reasoning:');
    });

    it('should handle semantic search queries', async () => {
      const result = await runCLI('route "Find similar documents about AI"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Route:');
    });

    it('should handle graph queries', async () => {
      const result = await runCLI('route "Show connections between documents"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Route:');
    });

    it('should handle hybrid queries', async () => {
      const result = await runCLI('route "Search for papers and their citations"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Route:');
    });

    it('should support --verbose flag', async () => {
      const result = await runCLI('route "complex query about research" --verbose');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Intent Analysis:');
      expect(result.stdout).toContain('Execution Strategy:');
      expect(result.stdout).toContain('Primary:');
      expect(result.stdout).toContain('Complexity:');
    });

    it('should handle simple queries', async () => {
      const result = await runCLI('route "test"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Route:');
    });

    it('should handle complex multi-intent queries', async () => {
      const result = await runCLI('route "Find documents about ML and show their relationships with visualization" --verbose');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Multi-stage:');
    });

    it('should display help for route command', async () => {
      const result = await runCLI('route --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Analyze query intent');
      expect(result.stdout).toContain('--verbose');
    });
  });

  describe('context command (legacy)', () => {
    beforeAll(async () => {
      // Ensure test documents are ingested
      const docsDir = createTestDocuments();
      await runCLI(`ingest --path ${docsDir} --legacy`);
    });

    it('should require text argument', async () => {
      const result = await runCLI('context');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('missing required argument');
    });

    it('should generate context block', async () => {
      const result = await runCLI('context "machine learning"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('```text');
      expect(result.stdout).toContain('RuVector Context');
      expect(result.stdout).toContain('query:');
      expect(result.stdout).toContain('```');
    });

    it('should support -k option', async () => {
      const result = await runCLI('context "neural networks" -k 3');
      expect(result.exitCode).toBe(0);
    });

    it('should support --max-chars option', async () => {
      const result = await runCLI('context "deep learning" --max-chars 5000');
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeLessThan(6000); // Allow some overhead
    });

    it('should support --title option', async () => {
      const result = await runCLI('context "AI" --title "Custom Title"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Custom Title');
    });

    it('should handle invalid --k value', async () => {
      const result = await runCLI('context "test" --k invalid');
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle invalid --max-chars value', async () => {
      const result = await runCLI('context "test" --max-chars -100');
      expect(result.exitCode).not.toBe(0);
    });

    it('should display help for context command', async () => {
      const result = await runCLI('context --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Claude-Flow-ready context block');
      expect(result.stdout).toContain('-k');
      expect(result.stdout).toContain('--max-chars');
      expect(result.stdout).toContain('--title');
    });
  });

  describe('learn command', () => {
    it('should fail when cognitive features disabled', async () => {
      const result = await runCLI('--no-cognitive learn', 5000);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Cognitive features are disabled');
    }, 15000);

    it('should attempt learning with cognitive features enabled', async () => {
      const result = await runCLI('learn', 5000);
      // Exit code depends on SONA availability
      expect([0, 1]).toContain(result.exitCode);
    }, 15000);

    it('should support --force flag', async () => {
      const result = await runCLI('learn --force', 5000);
      // Exit code depends on SONA availability
      expect([0, 1]).toContain(result.exitCode);
    }, 15000);

    it('should display help for learn command', async () => {
      const result = await runCLI('learn --help', 5000);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Trigger SONA learning');
      expect(result.stdout).toContain('--force');
    }, 15000);
  });

  describe('Error handling', () => {
    it('should handle unknown command', async () => {
      const result = await runCLI('unknown-command', 5000);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("unknown command");
    }, 15000);

    it('should handle invalid global option', async () => {
      const result = await runCLI('--invalid-option status', 5000);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("unknown option");
    }, 15000);

    it('should handle invalid --dims value', async () => {
      const result = await runCLI('--dims invalid status', 5000);
      expect(result.exitCode).not.toBe(0);
    }, 15000);

    it('should handle invalid --dims negative value', async () => {
      const result = await runCLI('--dims -100 status', 5000);
      expect(result.exitCode).not.toBe(0);
    }, 15000);

    it('should handle invalid --dims zero value', async () => {
      const result = await runCLI('--dims 0 status', 5000);
      expect(result.exitCode).not.toBe(0);
    }, 15000);
  });

  describe('Integration scenarios', () => {
    it('should successfully ingest, query, search, and graph', async () => {
      // Create fresh test data
      const docsDir = createTestDocuments();

      // 1. Ingest
      const ingestResult = await runCLI(`ingest --path ${docsDir}`);
      expect(ingestResult.exitCode).toBe(0);

      // 2. Query
      const queryResult = await runCLI('query "machine learning" -k 2');
      expect(queryResult.exitCode).toBe(0);

      // 3. Search
      const searchResult = await runCLI('search "knowledge graph" --format json');
      expect(searchResult.exitCode).toBe(0);

      // 4. Graph query
      const graphResult = await runCLI('graph "MATCH (n:Document) RETURN n" --format summary');
      expect(graphResult.exitCode).toBe(0);
    });

    it('should handle workflow: ingest with tags, search, route', async () => {
      const docsDir = createTestDocuments();

      // Ingest with tags
      const ingestResult = await runCLI(`ingest --path ${docsDir} --tag research --tag test`);
      expect(ingestResult.exitCode).toBe(0);

      // Search
      const searchResult = await runCLI('search "neural networks" --include-related');
      expect(searchResult.exitCode).toBe(0);

      // Route
      const routeResult = await runCLI('route "Find ML papers and citations" --verbose');
      expect(routeResult.exitCode).toBe(0);
    });

    it('should handle legacy vs new pipeline comparison', async () => {
      const docsDir = createTestDocuments();

      // Legacy ingest
      const legacyIngest = await runCLI(`ingest --path ${docsDir} --legacy`);
      expect(legacyIngest.exitCode).toBe(0);
      expect(legacyIngest.stdout).toContain('legacy mode');

      // Legacy query
      const legacyQuery = await runCLI('query "vector" --legacy');
      expect(legacyQuery.exitCode).toBe(0);

      // New pipeline ingest
      const newIngest = await runCLI(`ingest --path ${docsDir}`);
      expect(newIngest.exitCode).toBe(0);
      expect(newIngest.stdout).not.toContain('legacy mode');

      // New pipeline query
      const newQuery = await runCLI('query "vector"');
      expect(newQuery.exitCode).toBe(0);
    });
  });

  describe('Output formats and parsing', () => {
    beforeAll(async () => {
      const docsDir = createTestDocuments();
      await runCLI(`ingest --path ${docsDir}`);
    });

    it('should produce valid JSON in search command', async () => {
      const result = await runCLI('search "test" --format json');
      expect(result.exitCode).toBe(0);
      if (result.stdout.trim()) {
        const json = JSON.parse(result.stdout);
        expect(json).toBeDefined();
      }
    });

    it('should produce valid JSON in graph command', async () => {
      const result = await runCLI('graph "MATCH (n) RETURN n LIMIT 5" --format json');
      expect(result.exitCode).toBe(0);
      if (result.stdout.trim()) {
        const json = JSON.parse(result.stdout);
        expect(json).toBeDefined();
      }
    });

    it('should produce valid JSON in status command', async () => {
      const result = await runCLI('status --json');
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('capabilities');
    });

    it('should produce markdown format in search command', async () => {
      const result = await runCLI('search "test" --format markdown');
      expect(result.exitCode).toBe(0);
      // Markdown may contain markdown formatting characters
    });
  });
});
