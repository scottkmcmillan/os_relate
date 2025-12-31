/**
 * MCP Server for Research Knowledge Manager
 *
 * Provides Model Context Protocol (MCP) tools for AI agents to interact
 * with the Cognitive Knowledge Graph. Supports:
 * - Hybrid search (vector + graph)
 * - Graph querying (Cypher-like)
 * - Semantic routing
 * - SONA learning loops
 * - GNN reranking
 *
 * @module mcp/server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Unified Memory Architecture
import {
  UnifiedMemory,
  createUnifiedMemory,
  HybridSearchOptions,
  Document,
  Relationship
} from '../memory/index.js';

// Legacy compatibility layer (for backward compatible tools)
import { DEFAULT_DIMENSIONS } from '../ruvectorDb.js';
import { getRuvectorCapabilities } from '../status.js';

import { SemanticRouter, createSemanticRouter } from '../tools/router.js';
import {
  ContextFormatter,
  createContextFormatter,
  formatContextBlock
} from '../tools/context.js';

// ============================================================================
// Types
// ============================================================================

type StoredMetadata = {
  id: string;
  title: string;
  text: string;
  source: string;
  tags?: string[];
  timestamp: string;
};

// ============================================================================
// Helpers
// ============================================================================

function toTextContent(text: string) {
  return [{ type: 'text' as const, text }];
}

function makeContextBlock(params: {
  title: string;
  queryText: string;
  dbPath: string;
  results: Array<{ score: number; metadata?: StoredMetadata }>;
  maxChars: number;
}) {
  const lines: string[] = [];
  lines.push('```text');
  lines.push(`${params.title} (generated from RuVector)`);
  lines.push(`query: ${params.queryText}`);
  lines.push(`db: ${params.dbPath}`);
  lines.push('');

  if (params.results.length === 0) {
    lines.push('No results found.');
    lines.push('```');
    return lines.join('\n');
  }

  let used = lines.join('\n').length;

  for (let i = 0; i < params.results.length; i++) {
    const r = params.results[i]!;
    const md = r.metadata;
    const title = md?.title ?? '(untitled)';
    const source = md?.source ?? '(unknown)';
    const fullText = (md?.text ?? '').trim();

    const header = [
      '---',
      `result: ${i + 1}/${params.results.length}`,
      `title: ${title}`,
      `source: ${source}`,
      `distance: ${r.score}`,
      ''
    ].join('\n');

    const remaining = params.maxChars - used;
    if (remaining <= 0) break;

    const allowanceForBody = Math.max(0, remaining - header.length - '\n'.length);
    const body = fullText.slice(0, allowanceForBody);
    const chunk = header + body + (body.length < fullText.length ? '\n[truncated]\n' : '\n');

    used += chunk.length;
    lines.push(chunk);
  }

  lines.push('```');
  return lines.join('\n');
}

// ============================================================================
// Server Initialization
// ============================================================================

const server = new McpServer({
  name: 'ruvector-memory',
  version: '0.2.0'
});

// Lazy-initialized singletons
let unifiedMemory: UnifiedMemory | null = null;
let semanticRouter: SemanticRouter | null = null;
let contextFormatter: ContextFormatter | null = null;

function getUnifiedMemory(): UnifiedMemory {
  if (!unifiedMemory) {
    unifiedMemory = createUnifiedMemory();
  }
  return unifiedMemory;
}

function getSemanticRouter(): SemanticRouter {
  if (!semanticRouter) {
    semanticRouter = createSemanticRouter();
  }
  return semanticRouter;
}

function getContextFormatter(): ContextFormatter {
  if (!contextFormatter) {
    contextFormatter = createContextFormatter();
  }
  return contextFormatter;
}

// ============================================================================
// Legacy Tools (Backward Compatibility)
// ============================================================================

server.tool(
  'ruvector_search',
  {
    queryText: z.string().min(1),
    k: z.number().int().positive().optional().default(6),
    dbPath: z.string().optional().default('./ruvector.db'),
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS)
  },
  async ({ queryText, k, dbPath, dims }) => {
    // Use unified memory for search (vector-only mode)
    const memory = getUnifiedMemory();
    const results = await memory.vectorSearch(queryText, k);

    return {
      content: toTextContent(JSON.stringify({ results }, null, 2))
    };
  }
);

server.tool(
  'ruvector_context',
  {
    queryText: z.string().min(1),
    k: z.number().int().positive().optional().default(6),
    maxChars: z.number().int().positive().optional().default(12000),
    title: z.string().optional().default('RuVector Context'),
    dbPath: z.string().optional().default('./ruvector.db'),
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS)
  },
  async ({ queryText, k, maxChars, title, dbPath, dims }) => {
    // Use unified memory for search
    const memory = getUnifiedMemory();
    const results = await memory.vectorSearch(queryText, k);

    const simplified = results.map((r) => ({
      score: r.score,
      metadata: {
        title: String(r.metadata?.title || '(untitled)'),
        text: String(r.metadata?.text || ''),
        source: String(r.metadata?.source || ''),
        tags: r.metadata?.tags as string[] | undefined,
        timestamp: Date.now()
      } as unknown as StoredMetadata
    }));

    const text = makeContextBlock({
      title,
      queryText,
      dbPath,
      results: simplified,
      maxChars
    });

    return {
      content: toTextContent(text)
    };
  }
);

server.tool('ruvector_status', {}, async () => {
  const caps = await getRuvectorCapabilities();
  return {
    content: toTextContent(JSON.stringify(caps, null, 2))
  };
});

// ============================================================================
// NEW: Hybrid Search Tool (Vector + Graph)
// ============================================================================

server.tool(
  'ruvector_hybrid_search',
  {
    query: z.string().min(1).describe('Search query text'),
    k: z.number().int().positive().optional().default(10).describe('Number of results'),
    vectorWeight: z.number().min(0).max(1).optional().default(0.7).describe('Weight for vector similarity (0-1)'),
    includeRelated: z.boolean().optional().default(true).describe('Include graph-related results'),
    graphDepth: z.number().int().min(0).max(3).optional().default(1).describe('Graph traversal depth'),
    rerank: z.boolean().optional().default(false).describe('Use GNN for reranking'),
    format: z.enum(['json', 'context', 'markdown']).optional().default('json').describe('Output format')
  },
  async ({ query, k, vectorWeight, includeRelated, graphDepth, rerank, format }) => {
    const memory = getUnifiedMemory();

    const searchOptions: HybridSearchOptions = {
      k,
      vectorWeight,
      includeRelated,
      graphDepth,
      rerank
    };

    const results = await memory.search(query, searchOptions);

    if (format === 'json') {
      return {
        content: toTextContent(JSON.stringify({ query, results }, null, 2))
      };
    }

    if (format === 'context') {
      const formatter = getContextFormatter();
      const block = formatter.formatVectorResults(query, results.map(r => ({
        score: r.combinedScore,
        metadata: {
          title: r.title,
          text: r.text,
          source: r.source
        }
      })));
      return {
        content: toTextContent(formatter.render(block))
      };
    }

    // Markdown format
    const formatter = getContextFormatter();
    const block = formatter.formatVectorResults(query, results.map(r => ({
      score: r.combinedScore,
      metadata: {
        title: r.title,
        text: r.text,
        source: r.source
      }
    })));
    return {
      content: toTextContent(formatter.render(block))
    };
  }
);

// ============================================================================
// NEW: Graph Query Tool (Cypher-like)
// ============================================================================

server.tool(
  'ruvector_graph_query',
  {
    cypher: z.string().min(1).describe('Cypher-like query string'),
    format: z.enum(['json', 'summary']).optional().default('json').describe('Output format')
  },
  async ({ cypher, format }) => {
    const memory = getUnifiedMemory();

    try {
      const result = memory.graphQuery(cypher);

      if (format === 'summary') {
        const summary = [
          `Query: ${cypher}`,
          `Nodes found: ${result.nodes.length}`,
          `Edges found: ${result.edges.length}`,
          '',
          'Nodes:',
          ...result.nodes.slice(0, 10).map(n => `  - [${n.type}] ${n.id}: ${n.properties.title || '(untitled)'}`),
          result.nodes.length > 10 ? `  ... and ${result.nodes.length - 10} more` : '',
          '',
          'Edges:',
          ...result.edges.slice(0, 10).map(e => `  - ${e.from_id} -[${e.type}]-> ${e.to_id}`),
          result.edges.length > 10 ? `  ... and ${result.edges.length - 10} more` : ''
        ].filter(Boolean).join('\n');

        return {
          content: toTextContent(summary)
        };
      }

      return {
        content: toTextContent(JSON.stringify(result, null, 2))
      };
    } catch (error) {
      return {
        content: toTextContent(JSON.stringify({
          error: 'queryError',
          message: error instanceof Error ? error.message : 'Unknown query error',
          cypher
        }, null, 2))
      };
    }
  }
);

// ============================================================================
// NEW: Graph Traversal Tool
// ============================================================================

server.tool(
  'ruvector_graph_traverse',
  {
    nodeId: z.string().min(1).describe('Starting node ID'),
    depth: z.number().int().min(1).max(5).optional().default(1).describe('Traversal depth'),
    relationshipTypes: z.array(z.enum(['CITES', 'PARENT_OF', 'RELATES_TO', 'DERIVED_FROM'])).optional().describe('Filter by relationship types')
  },
  async ({ nodeId, depth, relationshipTypes }) => {
    const memory = getUnifiedMemory();

    const results = memory.findRelated(nodeId, depth, relationshipTypes);

    return {
      content: toTextContent(JSON.stringify({
        startNode: nodeId,
        depth,
        relationshipTypes: relationshipTypes || 'all',
        results: results.map(r => ({
          node: {
            id: r.node.id,
            type: r.node.type,
            properties: r.node.properties
          },
          depth: r.depth,
          path: r.path.map(e => ({
            from: e.from_id,
            to: e.to_id,
            type: e.type
          }))
        }))
      }, null, 2))
    };
  }
);

// ============================================================================
// NEW: Semantic Routing Tool
// ============================================================================

server.tool(
  'ruvector_route',
  {
    query: z.string().min(1).describe('Query to route'),
    includeAnalysis: z.boolean().optional().default(false).describe('Include detailed intent analysis'),
    includeStrategy: z.boolean().optional().default(false).describe('Include execution strategy suggestion')
  },
  async ({ query, includeAnalysis, includeStrategy }) => {
    const router = getSemanticRouter();

    const route = router.routeQuery(query);
    const result: Record<string, unknown> = {
      query,
      route: route.route,
      confidence: route.confidence,
      reasoning: route.reasoning
    };

    if (includeAnalysis) {
      result.analysis = router.analyzeIntent(query);
    }

    if (includeStrategy) {
      result.strategy = router.suggestStrategy(query);
    }

    return {
      content: toTextContent(JSON.stringify(result, null, 2))
    };
  }
);

// ============================================================================
// NEW: Document Management Tools
// ============================================================================

server.tool(
  'ruvector_add_document',
  {
    id: z.string().min(1).describe('Unique document ID'),
    title: z.string().min(1).describe('Document title'),
    text: z.string().min(1).describe('Document text content'),
    source: z.string().optional().describe('Source path or URL'),
    category: z.string().optional().describe('Document category'),
    tags: z.array(z.string()).optional().describe('Document tags')
  },
  async ({ id, title, text, source, category, tags }) => {
    const memory = getUnifiedMemory();

    const document: Document = {
      id,
      title,
      text,
      source,
      category,
      tags
    };

    const docId = await memory.addDocument(document);

    return {
      content: toTextContent(JSON.stringify({
        success: true,
        documentId: docId,
        message: `Document "${title}" added to vector and graph stores`
      }, null, 2))
    };
  }
);

server.tool(
  'ruvector_add_relationship',
  {
    from: z.string().min(1).describe('Source document/node ID'),
    to: z.string().min(1).describe('Target document/node ID'),
    type: z.enum(['CITES', 'PARENT_OF', 'RELATES_TO', 'DERIVED_FROM']).describe('Relationship type'),
    properties: z.record(z.unknown()).optional().describe('Additional relationship properties')
  },
  async ({ from, to, type, properties }) => {
    const memory = getUnifiedMemory();

    try {
      const edge = memory.addRelationship({ from, to, type, properties });

      return {
        content: toTextContent(JSON.stringify({
          success: true,
          edge: {
            id: edge.id,
            from: edge.from_id,
            to: edge.to_id,
            type: edge.type
          },
          message: `Relationship ${from} -[${type}]-> ${to} created`
        }, null, 2))
      };
    } catch (error) {
      return {
        content: toTextContent(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, null, 2))
      };
    }
  }
);

server.tool(
  'ruvector_delete_document',
  {
    id: z.string().min(1).describe('Document ID to delete')
  },
  async ({ id }) => {
    const memory = getUnifiedMemory();

    const deleted = await memory.deleteDocument(id);

    return {
      content: toTextContent(JSON.stringify({
        success: deleted,
        documentId: id,
        message: deleted
          ? `Document "${id}" deleted from vector and graph stores`
          : `Document "${id}" not found`
      }, null, 2))
    };
  }
);

// ============================================================================
// NEW: Unified Stats Tool
// ============================================================================

server.tool(
  'ruvector_stats',
  {
    includeVector: z.boolean().optional().default(true).describe('Include vector store stats'),
    includeGraph: z.boolean().optional().default(true).describe('Include graph store stats'),
    includeCognitive: z.boolean().optional().default(true).describe('Include cognitive engine stats')
  },
  async ({ includeVector, includeGraph, includeCognitive }) => {
    const memory = getUnifiedMemory();

    const fullStats = await memory.getStats();
    const capabilities = memory.getCognitiveCapabilities();

    const stats: Record<string, unknown> = {
      capabilities
    };

    if (includeVector) {
      stats.vector = fullStats.vector;
    }

    if (includeGraph) {
      stats.graph = fullStats.graph;
    }

    if (includeCognitive && fullStats.cognitive) {
      stats.cognitive = fullStats.cognitive;
    }

    return {
      content: toTextContent(JSON.stringify(stats, null, 2))
    };
  }
);

// ============================================================================
// Legacy SONA Tools (Backward Compatibility - Using Unified Memory)
// ============================================================================

server.tool(
  'sona_begin',
  {
    queryText: z.string().min(1),
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS),
    route: z.string().optional(),
    contextIds: z.array(z.string()).optional()
  },
  async ({ queryText, dims, route, contextIds }) => {
    const memory = getUnifiedMemory();
    const trajectoryId = await memory.beginTrajectory(queryText, { route, contextIds });
    return {
      content: toTextContent(JSON.stringify({ trajectoryId }, null, 2))
    };
  }
);

server.tool(
  'sona_step',
  {
    trajectoryId: z.number().int().nonnegative(),
    text: z.string().min(1),
    reward: z.number().min(0).max(1),
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS)
  },
  async ({ trajectoryId, text, reward, dims }) => {
    const memory = getUnifiedMemory();
    await memory.recordStep(trajectoryId, text, reward);
    return {
      content: toTextContent('ok')
    };
  }
);

server.tool(
  'sona_end',
  {
    trajectoryId: z.number().int().nonnegative(),
    quality: z.number().min(0).max(1),
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS)
  },
  async ({ trajectoryId, quality, dims }) => {
    const memory = getUnifiedMemory();
    memory.endTrajectory(trajectoryId, quality);
    return {
      content: toTextContent('ok')
    };
  }
);

server.tool(
  'sona_tick',
  {
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS)
  },
  async ({ dims }) => {
    const memory = getUnifiedMemory();
    const result = memory.tick();
    return {
      content: toTextContent(JSON.stringify({ result }, null, 2))
    };
  }
);

server.tool(
  'sona_learn',
  {
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS)
  },
  async ({ dims }) => {
    const memory = getUnifiedMemory();
    const result = memory.forceLearn();
    return {
      content: toTextContent(JSON.stringify({ result }, null, 2))
    };
  }
);

server.tool(
  'sona_stats',
  {
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS)
  },
  async ({ dims }) => {
    const memory = getUnifiedMemory();
    const stats = await memory.getStats();
    return {
      content: toTextContent(JSON.stringify({ stats: stats.cognitive }, null, 2))
    };
  }
);

server.tool(
  'sona_patterns',
  {
    queryText: z.string().min(1),
    k: z.number().int().positive().optional().default(5),
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS)
  },
  async ({ queryText, k, dims }) => {
    const memory = getUnifiedMemory();
    const patterns = await memory.findPatterns(queryText, k);
    return {
      content: toTextContent(JSON.stringify({ patterns }, null, 2))
    };
  }
);

// ============================================================================
// Legacy GNN Tools (Backward Compatibility - Using Unified Memory)
// ============================================================================

server.tool('gnn_available', {}, async () => {
  const memory = getUnifiedMemory();
  const caps = memory.getCognitiveCapabilities();
  return {
    content: toTextContent(JSON.stringify({ gnnAvailable: caps.gnnAvailable }, null, 2))
  };
});

server.tool(
  'gnn_rerank',
  {
    queryText: z.string().min(1),
    candidates: z.array(z.string()).min(1),
    k: z.number().int().positive().optional().default(5),
    temperature: z.number().positive().optional().default(1.0),
    dims: z.number().int().positive().optional().default(DEFAULT_DIMENSIONS)
  },
  async ({ queryText, candidates, k, temperature, dims }) => {
    const memory = getUnifiedMemory();
    const caps = memory.getCognitiveCapabilities();

    if (!caps.gnnAvailable) {
      return {
        content: toTextContent(
          JSON.stringify(
            {
              error: 'gnnUnavailable',
              message:
                'RuVector GNN module is not available on this machine (gnnAvailable=false). Enable/install the optional GNN package to use reranking.'
            },
            null,
            2
          )
        )
      };
    }

    // Use cognitive engine for reranking
    const cognitiveEngine = memory.getCognitiveEngine();
    if (!cognitiveEngine) {
      return {
        content: toTextContent(
          JSON.stringify(
            { error: 'cognitiveUnavailable', message: 'Cognitive engine not available' },
            null,
            2
          )
        )
      };
    }

    const candidateObjs = candidates.map((text, id) => ({ id: String(id), text }));
    const reranked = await cognitiveEngine.rerank(queryText, candidateObjs, { k, temperature });

    const ranked = reranked.map((r) => ({
      index: r.originalIndex,
      weight: r.weight,
      candidate: r.candidate.text
    }));

    return {
      content: toTextContent(
        JSON.stringify(
          {
            k: Math.min(k, candidates.length),
            temperature,
            ranked
          },
          null,
          2
        )
      )
    };
  }
);

// ============================================================================
// NEW: Cognitive Trajectory Tools (Unified API)
// ============================================================================

server.tool(
  'cognitive_begin_trajectory',
  {
    query: z.string().min(1).describe('Initial query text'),
    route: z.string().optional().describe('Model route identifier'),
    contextIds: z.array(z.string()).optional().describe('Context identifiers')
  },
  async ({ query, route, contextIds }) => {
    const memory = getUnifiedMemory();

    const trajectoryId = await memory.beginTrajectory(query, { route, contextIds });

    if (trajectoryId === null) {
      return {
        content: toTextContent(JSON.stringify({
          error: 'cognitiveDisabled',
          message: 'Cognitive engine is not enabled or SONA is unavailable'
        }, null, 2))
      };
    }

    return {
      content: toTextContent(JSON.stringify({
        trajectoryId,
        message: 'Trajectory started'
      }, null, 2))
    };
  }
);

server.tool(
  'cognitive_record_step',
  {
    trajectoryId: z.number().int().nonnegative().describe('Trajectory ID'),
    step: z.string().min(1).describe('Step text'),
    reward: z.number().min(0).max(1).describe('Reward signal (0-1)')
  },
  async ({ trajectoryId, step, reward }) => {
    const memory = getUnifiedMemory();

    await memory.recordStep(trajectoryId, step, reward);

    return {
      content: toTextContent(JSON.stringify({
        success: true,
        trajectoryId,
        reward
      }, null, 2))
    };
  }
);

server.tool(
  'cognitive_end_trajectory',
  {
    trajectoryId: z.number().int().nonnegative().describe('Trajectory ID'),
    quality: z.number().min(0).max(1).describe('Overall quality score (0-1)')
  },
  async ({ trajectoryId, quality }) => {
    const memory = getUnifiedMemory();

    memory.endTrajectory(trajectoryId, quality);

    return {
      content: toTextContent(JSON.stringify({
        success: true,
        trajectoryId,
        quality,
        message: 'Trajectory ended and queued for learning'
      }, null, 2))
    };
  }
);

server.tool(
  'cognitive_find_patterns',
  {
    query: z.string().min(1).describe('Query to match patterns'),
    k: z.number().int().positive().optional().default(5).describe('Number of patterns to return')
  },
  async ({ query, k }) => {
    const memory = getUnifiedMemory();

    const patterns = await memory.findPatterns(query, k);

    return {
      content: toTextContent(JSON.stringify({
        query,
        patterns
      }, null, 2))
    };
  }
);

server.tool(
  'cognitive_tick',
  {},
  async () => {
    const memory = getUnifiedMemory();

    const result = memory.tick();

    return {
      content: toTextContent(JSON.stringify({
        result: result || 'No learning triggered'
      }, null, 2))
    };
  }
);

server.tool(
  'cognitive_force_learn',
  {},
  async () => {
    const memory = getUnifiedMemory();

    const result = memory.forceLearn();

    return {
      content: toTextContent(JSON.stringify({
        result
      }, null, 2))
    };
  }
);

// ============================================================================
// Start Server
// ============================================================================

const transport = new StdioServerTransport();
await server.connect(transport);
