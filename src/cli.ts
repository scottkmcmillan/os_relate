#!/usr/bin/env node
/**
 * Research Knowledge Manager CLI
 *
 * Command-line interface for the Cognitive Knowledge Graph.
 * Supports ingestion, hybrid search, graph queries, and SONA learning stats.
 *
 * @module cli
 */

import { Command } from 'commander';
import { openDb, DEFAULT_DIMENSIONS } from './ruvectorDb.js';
import { embedMany, embedOne } from './embedding.js';
import { readDocsFromPath } from './ingest.js';
import { getRuvectorCapabilities } from './status.js';

// New imports for Cognitive Knowledge Graph
import {
  UnifiedMemory,
  createUnifiedMemory,
  createLightweightMemory,
  Document
} from './memory/index.js';
import { readFiles } from './ingestion/reader.js';
import { parseDocument, DocumentType } from './ingestion/parser.js';
import { buildDocumentGraph } from './ingestion/graphBuilder.js';
import { SemanticRouter, createSemanticRouter } from './tools/router.js';
import { ContextFormatter, createContextFormatter } from './tools/context.js';

// ============================================================================
// Types
// ============================================================================

type StoredMetadata = {
  title: string;
  text: string;
  source: string;
  tags?: string[];
  timestamp: number;
};

// ============================================================================
// Helpers
// ============================================================================

function getDocumentType(extension: string): DocumentType {
  const ext = extension.toLowerCase();
  if (ext === '.md') return 'markdown';
  if (ext === '.json') return 'json';
  if (ext === '.jsonl') return 'jsonl';
  return 'text';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// CLI Program
// ============================================================================

const program = new Command();

program
  .name('rkm')
  .description('Research Knowledge Manager - Cognitive Knowledge Graph CLI')
  .version('0.3.0')
  .option('--db <path>', 'Path to RuVector storage file', './ruvector.db')
  .option('--data-dir <path>', 'Path to graph data directory', './data')
  .option('--dims <number>', 'Embedding dimensions', String(DEFAULT_DIMENSIONS))
  .option('--no-cognitive', 'Disable cognitive features (SONA/GNN)');

// ============================================================================
// Ingest Command (Refactored to Use New Architecture)
// ============================================================================

program
  .command('ingest')
  .description('Ingest a file or directory of research outputs into Cognitive Knowledge Graph')
  .requiredOption('--path <path>', 'File or directory to ingest')
  .option('--tag <tag...>', 'Tags to attach (repeatable)', [])
  .option('--no-graph', 'Disable knowledge graph building (vector-only)')
  .option('--legacy', 'Use legacy ingestion pipeline (for backward compatibility)')
  .action(async (opts) => {
    const globals = program.opts<{ db: string; dataDir: string; dims: string; cognitive: boolean }>();
    const dims = Number(globals.dims);
    if (!Number.isFinite(dims) || dims <= 0) throw new Error('Invalid --dims');

    if (opts.legacy) {
      // Legacy behavior for backward compatibility
      const db = openDb(globals.db, dims);

      const tags: string[] | undefined = opts.tag?.length ? opts.tag : undefined;
      const docs = await readDocsFromPath(opts.path, tags);

      if (docs.length === 0) {
        process.stdout.write('No ingestible documents found. Supported: .md, .txt, .json\n');
        return;
      }

      const texts = docs.map((d) => `${d.title}\n\n${d.text}`);
      const vectors = await embedMany(texts, dims);

      const ids = await db.insertBatch(
        docs.map((d, i) => ({
          vector: vectors[i]!,
          metadata: {
            title: d.title,
            text: d.text,
            source: d.source,
            tags: d.tags,
            timestamp: d.timestamp
          } satisfies StoredMetadata
        }))
      );

      process.stdout.write(`Ingested ${ids.length} documents into ${globals.db} (legacy mode)\n`);
    } else {
      // Default: Use new unified memory pipeline
      await ingestWithGraph(opts.path, opts.tag, globals, opts.graph);
    }
  });

/**
 * Graph-aware ingestion using the new pipeline
 */
async function ingestWithGraph(
  inputPath: string,
  tags: string[],
  globals: { db: string; dataDir: string; dims: string; cognitive: boolean },
  buildGraph: boolean = true
): Promise<void> {
  const dims = Number(globals.dims);

  process.stdout.write('Reading files...\n');
  const files = await readFiles(inputPath, {
    extensions: ['.md', '.txt', '.json', '.jsonl']
  });

  if (files.length === 0) {
    process.stdout.write('No ingestible documents found.\n');
    return;
  }

  process.stdout.write(`Found ${files.length} files\n`);

  // Parse all documents
  process.stdout.write('Parsing documents...\n');
  const parsedDocs = files.map(file => {
    const docType = getDocumentType(file.metadata.extension);
    const parsed = parseDocument(file.content, docType);
    return {
      id: file.metadata.path,
      parsed,
      path: file.metadata.path
    };
  });

  // Build knowledge graph if enabled
  let graph: ReturnType<typeof buildDocumentGraph> | null = null;
  if (buildGraph) {
    process.stdout.write('Building knowledge graph...\n');
    graph = buildDocumentGraph(parsedDocs);
    process.stdout.write(`Graph: ${graph.metadata.nodeCount} nodes, ${graph.metadata.edgeCount} edges\n`);
  }

  // Create unified memory
  const memory = globals.cognitive
    ? createUnifiedMemory()
    : createLightweightMemory(globals.db, globals.dataDir);

  // Add documents to unified memory
  process.stdout.write('Adding documents to memory...\n');
  const documents: Document[] = parsedDocs.map(doc => ({
    id: doc.id,
    title: doc.parsed.metadata.title || doc.path || doc.id,
    text: doc.parsed.text,
    source: doc.path,
    category: doc.parsed.metadata.custom?.category as string | undefined,
    tags: [...(doc.parsed.metadata.tags || []), ...tags]
  }));

  await memory.addDocuments(documents);

  // Add graph relationships if graph was built
  if (graph) {
    process.stdout.write('Adding relationships...\n');
    for (const edge of graph.edges) {
      try {
        memory.addRelationship({
          from: edge.from,
          to: edge.to,
          type: edge.type as 'CITES' | 'PARENT_OF' | 'RELATES_TO' | 'DERIVED_FROM',
          properties: edge.metadata
        });
      } catch {
        // Skip edges where nodes don't exist (e.g., external citations)
      }
    }
  }

  await memory.close();

  process.stdout.write(`\nIngestion complete:\n`);
  process.stdout.write(`  Documents: ${documents.length}\n`);
  if (graph) {
    process.stdout.write(`  Graph edges: ${graph.metadata.edgeCount}\n`);
  }
  process.stdout.write(`  Storage: ${globals.db}\n`);
}

// ============================================================================
// Query Command (Enhanced with Graph Results)
// ============================================================================

program
  .command('query')
  .description('Semantic query over stored research with optional graph exploration')
  .argument('<text>', 'Query text')
  .option('-k, --k <number>', 'Top K results', '5')
  .option('--show-related', 'Show graph-related nodes for each result')
  .option('--graph-depth <number>', 'Graph traversal depth for related nodes', '1')
  .option('--legacy', 'Use legacy vector-only search')
  .action(async (text, opts) => {
    const globals = program.opts<{ db: string; dataDir: string; dims: string; cognitive: boolean }>();
    const dims = Number(globals.dims);
    const k = Number(opts.k);
    if (!Number.isFinite(dims) || dims <= 0) throw new Error('Invalid --dims');
    if (!Number.isFinite(k) || k <= 0) throw new Error('Invalid --k');

    if (opts.legacy) {
      // Legacy vector-only search
      const db = openDb(globals.db, dims);

      const results = await db.search({
        vector: await embedOne(text, dims),
        k
      });

      if (results.length === 0) {
        process.stdout.write('No results found.\n');
        return;
      }

      for (const r of results) {
        const md = r.metadata as StoredMetadata | undefined;
        const title = md?.title ?? '(untitled)';
        const source = md?.source ?? '(unknown)';
        const preview = (md?.text ?? '').slice(0, 240).replace(/\s+/g, ' ').trim();
        process.stdout.write(`\n${title}\n`);
        process.stdout.write(`source: ${source}\n`);
        process.stdout.write(`distance: ${r.score}\n`);
        if (preview) process.stdout.write(`${preview}${(md?.text?.length ?? 0) > 240 ? '…' : ''}\n`);
      }
    } else {
      // Enhanced search with graph integration
      const memory = globals.cognitive
        ? createUnifiedMemory()
        : createLightweightMemory(globals.db, globals.dataDir);

      const results = await memory.search(text, {
        k,
        vectorWeight: 0.8,
        includeRelated: opts.showRelated || false,
        graphDepth: Number(opts.graphDepth || 1)
      });

      if (results.length === 0) {
        process.stdout.write('No results found.\n');
        await memory.close();
        return;
      }

      for (let i = 0; i < results.length; i++) {
        const r = results[i]!;
        const preview = r.text.slice(0, 240).replace(/\s+/g, ' ').trim();

        process.stdout.write(`\n${i + 1}. ${r.title}\n`);
        process.stdout.write(`   source: ${r.source || '(unknown)'}\n`);
        process.stdout.write(`   score: ${r.combinedScore.toFixed(4)}`);

        if (r.graphScore !== undefined) {
          process.stdout.write(` (vector: ${r.vectorScore.toFixed(4)}, graph: ${r.graphScore.toFixed(4)})`);
        }
        process.stdout.write('\n');

        if (opts.showRelated && r.relatedNodes && r.relatedNodes.length > 0) {
          process.stdout.write(`   related nodes: ${r.relatedNodes.length}\n`);
          for (const node of r.relatedNodes.slice(0, 3)) {
            process.stdout.write(`     - [${node.type}] ${node.id}\n`);
          }
          if (r.relatedNodes.length > 3) {
            process.stdout.write(`     ... and ${r.relatedNodes.length - 3} more\n`);
          }
        }

        process.stdout.write(`   ${preview}${r.text.length > 240 ? '…' : ''}\n`);
      }

      await memory.close();
    }
  });

// ============================================================================
// NEW: Hybrid Search Command
// ============================================================================

program
  .command('search')
  .description('Hybrid search combining vector similarity and graph relationships')
  .argument('<text>', 'Search query text')
  .option('-k, --k <number>', 'Number of results', '10')
  .option('--vector-weight <number>', 'Weight for vector similarity (0-1)', '0.7')
  .option('--include-related', 'Include graph-related results')
  .option('--graph-depth <number>', 'Graph traversal depth', '1')
  .option('--rerank', 'Use GNN for reranking')
  .option('--format <format>', 'Output format (json|text|markdown)', 'text')
  .action(async (text, opts) => {
    const globals = program.opts<{ db: string; dataDir: string; dims: string; cognitive: boolean }>();
    const dims = Number(globals.dims);

    const memory = globals.cognitive
      ? createUnifiedMemory()
      : createLightweightMemory(globals.db, globals.dataDir);

    const results = await memory.search(text, {
      k: Number(opts.k),
      vectorWeight: Number(opts.vectorWeight),
      includeRelated: opts.includeRelated,
      graphDepth: Number(opts.graphDepth),
      rerank: opts.rerank
    });

    if (opts.format === 'json') {
      process.stdout.write(JSON.stringify({ query: text, results }, null, 2) + '\n');
    } else if (opts.format === 'markdown') {
      const formatter = createContextFormatter({ format: 'markdown' });
      const block = formatter.formatVectorResults(text, results.map(r => ({
        score: r.combinedScore,
        metadata: { title: r.title, text: r.text, source: r.source }
      })));
      process.stdout.write(formatter.render(block) + '\n');
    } else {
      // Text format
      if (results.length === 0) {
        process.stdout.write('No results found.\n');
        return;
      }

      process.stdout.write(`\nSearch: "${text}"\n`);
      process.stdout.write(`Results: ${results.length}\n\n`);

      for (let i = 0; i < results.length; i++) {
        const r = results[i]!;
        const preview = r.text.slice(0, 200).replace(/\s+/g, ' ').trim();

        process.stdout.write(`${i + 1}. ${r.title}\n`);
        process.stdout.write(`   source: ${r.source || '(unknown)'}\n`);
        process.stdout.write(`   score: ${r.combinedScore.toFixed(4)}`);
        if (r.graphScore !== undefined) {
          process.stdout.write(` (vector: ${r.vectorScore.toFixed(4)}, graph: ${r.graphScore.toFixed(4)})`);
        }
        process.stdout.write('\n');
        if (r.relatedNodes && r.relatedNodes.length > 0) {
          process.stdout.write(`   related: ${r.relatedNodes.length} nodes\n`);
        }
        process.stdout.write(`   ${preview}${r.text.length > 200 ? '…' : ''}\n\n`);
      }
    }

    await memory.close();
  });

// ============================================================================
// NEW: Graph Query Command
// ============================================================================

program
  .command('graph')
  .description('Query the knowledge graph using Cypher-like syntax')
  .argument('<cypher>', 'Cypher query (e.g., "MATCH (n:Document) RETURN n")')
  .option('--format <format>', 'Output format (json|summary)', 'summary')
  .action(async (cypher, opts) => {
    const globals = program.opts<{ db: string; dataDir: string; dims: string; cognitive: boolean }>();

    const memory = globals.cognitive
      ? createUnifiedMemory()
      : createLightweightMemory(globals.db, globals.dataDir);

    try {
      const result = memory.graphQuery(cypher);

      if (opts.format === 'json') {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      } else {
        // Summary format
        process.stdout.write(`\nQuery: ${cypher}\n\n`);
        process.stdout.write(`Nodes: ${result.nodes.length}\n`);
        process.stdout.write(`Edges: ${result.edges.length}\n\n`);

        if (result.nodes.length > 0) {
          process.stdout.write('Nodes:\n');
          for (const node of result.nodes.slice(0, 20)) {
            process.stdout.write(`  [${node.type}] ${node.id}\n`);
            if (node.properties.title) {
              process.stdout.write(`    title: ${node.properties.title}\n`);
            }
          }
          if (result.nodes.length > 20) {
            process.stdout.write(`  ... and ${result.nodes.length - 20} more\n`);
          }
        }

        if (result.edges.length > 0) {
          process.stdout.write('\nEdges:\n');
          for (const edge of result.edges.slice(0, 20)) {
            process.stdout.write(`  ${edge.from_id} -[${edge.type}]-> ${edge.to_id}\n`);
          }
          if (result.edges.length > 20) {
            process.stdout.write(`  ... and ${result.edges.length - 20} more\n`);
          }
        }
      }
    } catch (error) {
      process.stderr.write(`Query error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      process.exit(1);
    }

    await memory.close();
  });

// ============================================================================
// NEW: Route Command
// ============================================================================

program
  .command('route')
  .description('Analyze query intent and suggest execution strategy')
  .argument('<query>', 'Query to analyze')
  .option('--verbose', 'Show detailed analysis')
  .action(async (query, opts) => {
    const router = createSemanticRouter();

    const route = router.routeQuery(query);

    process.stdout.write(`\nQuery: "${query}"\n\n`);
    process.stdout.write(`Route: ${route.route}\n`);
    process.stdout.write(`Confidence: ${(route.confidence * 100).toFixed(1)}%\n`);
    process.stdout.write(`Reasoning: ${route.reasoning}\n`);

    if (opts.verbose) {
      const analysis = router.analyzeIntent(query);
      const strategy = router.suggestStrategy(query);

      process.stdout.write(`\nIntent Analysis:\n`);
      process.stdout.write(`  Primary: ${analysis.primaryIntent}\n`);
      if (analysis.secondaryIntents.length > 0) {
        process.stdout.write(`  Secondary: ${analysis.secondaryIntents.join(', ')}\n`);
      }
      process.stdout.write(`  Complexity: ${analysis.complexity.toFixed(2)}\n`);
      process.stdout.write(`  Multi-stage: ${analysis.requiresMultiStage}\n`);

      process.stdout.write(`\nExecution Strategy:\n`);
      process.stdout.write(`  Approach: ${strategy.approach}\n`);
      process.stdout.write(`  Steps: ${strategy.steps.length}\n`);
      for (const step of strategy.steps) {
        process.stdout.write(`    ${step.stage}. [${step.route}] ${step.description}\n`);
      }
      process.stdout.write(`  Complexity: ${strategy.estimatedComplexity}\n`);
    }
  });

// ============================================================================
// Legacy Context Command (Backward Compatible)
// ============================================================================

program
  .command('context')
  .description('Print a Claude-Flow-ready context block from RuVector search results (copy/paste into prompts)')
  .argument('<text>', 'What you want Claude-Flow to reference')
  .option('-k, --k <number>', 'Top K results', '6')
  .option('--max-chars <number>', 'Maximum characters to print', '12000')
  .option('--title <string>', 'Optional title for the context block', 'RuVector Context')
  .action(async (text, opts) => {
    const globals = program.opts<{ db: string; dims: string }>();
    const dims = Number(globals.dims);
    const k = Number(opts.k);
    const maxChars = Number(opts.maxChars);

    if (!Number.isFinite(dims) || dims <= 0) throw new Error('Invalid --dims');
    if (!Number.isFinite(k) || k <= 0) throw new Error('Invalid --k');
    if (!Number.isFinite(maxChars) || maxChars <= 0) throw new Error('Invalid --max-chars');

    const db = openDb(globals.db, dims);
    const results = await db.search({
      vector: await embedOne(text, dims),
      k
    });

    const lines: string[] = [];
    lines.push('```text');
    lines.push(`${String(opts.title)} (generated from RuVector)`);
    lines.push(`query: ${text}`);
    lines.push(`db: ${globals.db}`);
    lines.push('');

    if (results.length === 0) {
      lines.push('No results found.');
      lines.push('```');
      process.stdout.write(lines.join('\n') + '\n');
      return;
    }

    let used = lines.join('\n').length;
    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      const md = r.metadata as StoredMetadata | undefined;
      const title = md?.title ?? '(untitled)';
      const source = md?.source ?? '(unknown)';
      const fullText = (md?.text ?? '').trim();

      const header = [
        '---',
        `result: ${i + 1}/${results.length}`,
        `title: ${title}`,
        `source: ${source}`,
        `distance: ${r.score}`,
        ''
      ].join('\n');

      const remaining = maxChars - used;
      if (remaining <= 0) break;

      const allowanceForBody = Math.max(0, remaining - header.length - '\n'.length);
      const body = fullText.slice(0, allowanceForBody);
      const chunk = header + body + (body.length < fullText.length ? '\n[truncated]\n' : '\n');

      used += chunk.length;
      lines.push(chunk);
    }

    lines.push('```');
    process.stdout.write(lines.join('\n') + '\n');
  });

// ============================================================================
// Enhanced Status Command
// ============================================================================

program
  .command('status')
  .description('Show system capabilities, memory statistics, and learning progress')
  .option('--json', 'Output as JSON')
  .option('--full', 'Include full statistics from all stores')
  .option('--router', 'Test router availability')
  .action(async (opts) => {
    const globals = program.opts<{ db: string; dataDir: string; dims: string; cognitive: boolean }>();

    const caps = await getRuvectorCapabilities();

    if (opts.json) {
      const output: Record<string, unknown> = { capabilities: caps };

      if (opts.full) {
        try {
          const memory = globals.cognitive
            ? createUnifiedMemory()
            : createLightweightMemory(globals.db, globals.dataDir);
          const stats = await memory.getStats();
          const cognitiveCapabilities = memory.getCognitiveCapabilities();
          await memory.close();
          output.stats = stats;
          output.cognitiveCapabilities = cognitiveCapabilities;
        } catch (error) {
          output.error = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      if (opts.router) {
        try {
          const router = createSemanticRouter();
          const testQuery = "Find documents related to machine learning";
          const routeResult = router.routeQuery(testQuery);
          output.router = { available: true, testResult: routeResult };
        } catch (error) {
          output.router = { available: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }

      process.stdout.write(JSON.stringify(output, null, 2) + '\n');
      return;
    }

    // Human-readable output
    process.stdout.write('\n=== RuVector Capabilities ===\n\n');

    process.stdout.write(`Implementation: ${caps.implementation.type}\n`);
    process.stdout.write(`  Native: ${caps.implementation.isNative ? 'Yes' : 'No'}\n`);
    process.stdout.write(`  WASM: ${caps.implementation.isWasm ? 'Yes' : 'No'}\n`);
    process.stdout.write(`  Version: ${caps.implementation.version}\n`);

    process.stdout.write(`\nModules:\n`);
    process.stdout.write(`  GNN (Graph Neural Network): ${caps.modules.gnnAvailable ? 'Available' : 'Not Available'}\n`);
    process.stdout.write(`  Attention: ${caps.modules.attentionAvailable ? 'Available' : 'Not Available'}\n`);
    process.stdout.write(`  SONA (Self-Optimizing): ${caps.modules.sonaAvailable ? 'Available' : 'Not Available'}\n`);

    // Test router availability if requested
    if (opts.router) {
      process.stdout.write(`\n=== Semantic Router ===\n\n`);
      try {
        const router = createSemanticRouter();
        const testQuery = "Find documents related to machine learning";
        const routeResult = router.routeQuery(testQuery);
        process.stdout.write(`Status: Available\n`);
        process.stdout.write(`Test query: "${testQuery}"\n`);
        process.stdout.write(`  Route: ${routeResult.route}\n`);
        process.stdout.write(`  Confidence: ${(routeResult.confidence * 100).toFixed(1)}%\n`);
      } catch (error) {
        process.stdout.write(`Status: Not Available\n`);
        process.stdout.write(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      }
    }

    if (opts.full) {
      try {
        const memory = globals.cognitive
          ? createUnifiedMemory()
          : createLightweightMemory(globals.db, globals.dataDir);
        const stats = await memory.getStats();
        const cognitiveCapabilities = memory.getCognitiveCapabilities();
        await memory.close();

        process.stdout.write(`\n=== Memory Statistics ===\n\n`);

        process.stdout.write(`Vector Store:\n`);
        process.stdout.write(`  Total vectors: ${stats.vector.totalVectors}\n`);
        process.stdout.write(`  Tiers: Hot=${stats.vector.tierCounts.hot}, Warm=${stats.vector.tierCounts.warm}, Cold=${stats.vector.tierCounts.cold}\n`);
        process.stdout.write(`  Dimensions: ${stats.vector.config.dimensions}\n`);
        process.stdout.write(`  Storage: ${stats.vector.storage.path}\n`);
        if (stats.vector.totalVectors > 0 && stats.vector.storage.sizeBytes !== undefined) {
          const avgSize = formatBytes(stats.vector.storage.sizeBytes / stats.vector.totalVectors);
          process.stdout.write(`  Average vector size: ${avgSize}\n`);
          process.stdout.write(`  Total storage: ${formatBytes(stats.vector.storage.sizeBytes)}\n`);
        }

        process.stdout.write(`\nGraph Store:\n`);
        process.stdout.write(`  Nodes: ${stats.graph.nodeCount}\n`);
        process.stdout.write(`  Edges: ${stats.graph.edgeCount}\n`);
        if (stats.graph.nodeCount > 0 && stats.graph.edgeCount > 0) {
          const avgConnectivity = (stats.graph.edgeCount / stats.graph.nodeCount).toFixed(2);
          process.stdout.write(`  Average connectivity: ${avgConnectivity} edges/node\n`);
        }
        if (Object.keys(stats.graph.nodeTypes).length > 0) {
          process.stdout.write(`  Node types:\n`);
          for (const [type, count] of Object.entries(stats.graph.nodeTypes)) {
            process.stdout.write(`    ${type}: ${count}\n`);
          }
        }
        if (Object.keys(stats.graph.edgeTypes).length > 0) {
          process.stdout.write(`  Edge types:\n`);
          for (const [type, count] of Object.entries(stats.graph.edgeTypes)) {
            process.stdout.write(`    ${type}: ${count}\n`);
          }
        }

        process.stdout.write(`\n=== Cognitive Features ===\n\n`);
        process.stdout.write(`Cognitive engine: ${cognitiveCapabilities.enabled ? 'Enabled' : 'Disabled'}\n`);
        if (cognitiveCapabilities.enabled) {
          process.stdout.write(`  SONA: ${cognitiveCapabilities.sonaAvailable ? 'Available' : 'Not Available'}\n`);
          process.stdout.write(`  GNN: ${cognitiveCapabilities.gnnAvailable ? 'Available' : 'Not Available'}\n`);
        }

        if (stats.cognitive) {
          process.stdout.write(`\n=== SONA Learning Statistics ===\n\n`);
          process.stdout.write(`Trajectories recorded: ${stats.cognitive.trajectoriesRecorded}\n`);
          process.stdout.write(`Patterns learned: ${stats.cognitive.patternsLearned}\n`);
          process.stdout.write(`Micro-LoRA updates: ${stats.cognitive.microLoraUpdates}\n`);
          process.stdout.write(`Base-LoRA updates: ${stats.cognitive.baseLoraUpdates}\n`);
          process.stdout.write(`EWC consolidations: ${stats.cognitive.ewcConsolidations}\n`);

          // Calculate learning rate
          if (stats.cognitive.trajectoriesRecorded > 0) {
            const learningRate = (stats.cognitive.patternsLearned / stats.cognitive.trajectoriesRecorded * 100).toFixed(1);
            process.stdout.write(`\nLearning efficiency: ${learningRate}% (patterns per trajectory)\n`);
          }
        }
      } catch (error) {
        process.stdout.write(`\n=== Memory Statistics ===\n\n`);
        process.stdout.write(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        process.stdout.write('(Could not retrieve full statistics)\n');
      }
    }

    process.stdout.write('\n');
  });

// ============================================================================
// NEW: Learn Command (Trigger SONA Learning)
// ============================================================================

program
  .command('learn')
  .description('Trigger SONA learning from recorded trajectories')
  .option('--force', 'Force immediate learning regardless of queue')
  .action(async (opts) => {
    const globals = program.opts<{ db: string; dataDir: string; dims: string; cognitive: boolean }>();

    if (!globals.cognitive) {
      process.stderr.write('Cognitive features are disabled. Use without --no-cognitive flag.\n');
      process.exit(1);
    }

    const memory = createUnifiedMemory();
    const capabilities = memory.getCognitiveCapabilities();

    if (!capabilities.sonaAvailable) {
      process.stderr.write('SONA is not available on this system.\n');
      await memory.close();
      process.exit(1);
    }

    let result: string;
    if (opts.force) {
      result = memory.forceLearn();
    } else {
      result = memory.tick() || 'No learning triggered (queue empty or threshold not reached)';
    }

    process.stdout.write(`Learning result: ${result}\n`);

    await memory.close();
  });

// ============================================================================
// Parse and Run
// ============================================================================

await program.parseAsync(process.argv);
