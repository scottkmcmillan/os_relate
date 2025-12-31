# Research Knowledge Manager (RKM) - Architecture Documentation

> **Version:** 0.1.0 | **CLI Version:** 0.3.0 | **MCP Server:** 0.2.0

## Overview

The Research Knowledge Manager (RKM) is a local-first **Cognitive Knowledge Graph** designed to ingest, store, and retrieve research artifacts. Unlike traditional vector stores, RKM utilizes **RuVector** to create a "living" memory system that learns from interaction. It bridges raw research outputs (markdown, JSON, text) and AI agents (specifically Claude-Flow) by providing not just semantic search, but **graph-based reasoning**, **adaptive reranking**, and **continuous learning**.

### Key Capabilities

| Capability | Description | Implementation |
|------------|-------------|----------------|
| **Semantic Search** | Vector similarity matching | RuVector with 384-dim embeddings, HNSW indexing |
| **Graph Reasoning** | Structural relationship traversal | SQLite graph with Cypher-like queries |
| **Adaptive Reranking** | Neural reordering of results | GNN via `@ruvector/gnn` (optional) |
| **Continuous Learning** | Pattern extraction from usage | SONA trajectories with micro-LoRA updates |

> **Note:** Cognitive features (SONA/GNN) are optional. Use `--no-cognitive` flag or `createLightweightMemory()` for simpler deployments that only need vector + graph capabilities.

### Core Philosophy

The system leverages the full spectrum of RuVector capabilities to transform static data into actionable intelligence:

1. **Hybrid Storage**: Combining HNSW Vector Search with a Graph Database (Cypher) to capture both semantic similarity and structural relationships.

2. **Active Learning**: Using Graph Neural Networks (GNN) and SONA to refine search results based on agent feedback (Reinforcement Learning).

3. **Intelligent Retrieval**: Employing semantic routing and tiered storage to efficiently navigate large knowledge bases.

## System Architecture

```
                          ┌─────────────────────────────────────────────────────────┐
                          │                     INTERFACES                          │
                          ├──────────────┬──────────────┬──────────────────────────┤
                          │  CLI (rkm)   │  MCP Server  │     REST API (Express)   │
                          │  8 commands  │  26 tools    │     15+ endpoints        │
                          └──────┬───────┴──────┬───────┴────────────┬─────────────┘
                                 │              │                    │
                          ┌──────▼──────────────▼────────────────────▼─────────────┐
                          │                   UNIFIED MEMORY                        │
                          │   Facade coordinating atomic operations across stores   │
                          └──────┬──────────────┬────────────────────┬─────────────┘
                                 │              │                    │
        ┌────────────────────────▼────┐   ┌─────▼─────┐   ┌──────────▼──────────┐
        │       VECTOR STORE          │   │  GRAPH    │   │  COGNITIVE ENGINE   │
        │  ─────────────────────────  │   │  STORE    │   │  ──────────────────  │
        │  • 384-dim embeddings       │   │  ───────  │   │  • SONA learning    │
        │  • Cosine similarity        │   │  SQLite   │   │  • GNN reranking    │
        │  • Tiered storage           │   │  Graph DB │   │  • Pattern memory   │
        │  • HNSW indexing            │   │  Cypher   │   │  • Trajectory track │
        └─────────────────────────────┘   └───────────┘   └─────────────────────┘
                     │                          │                    │
        ┌────────────▼────────────────────────▼────────────────────▼─────────────┐
        │                        STORAGE LAYER                                    │
        │  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
        │  │  ruvector.db   │  │   data/*.db     │  │  In-memory patterns     │  │
        │  │  (Vector DB)   │  │ (Graph + Coll.) │  │  (SONA trajectories)    │  │
        │  └────────────────┘  └─────────────────┘  └─────────────────────────┘  │
        └─────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Unified Memory (`src/memory/index.ts`)

The **UnifiedMemory** class is the central facade that coordinates operations across all three storage layers:

```typescript
class UnifiedMemory {
  // Atomic document operations (updates vector + graph simultaneously)
  addDocument(doc: Document): Promise<string>
  addDocuments(docs: Document[]): Promise<string[]>
  deleteDocument(id: string): Promise<boolean>

  // Hybrid search (vector similarity + graph relationships)
  search(query: string, options: HybridSearchOptions): Promise<UnifiedSearchResult[]>

  // Direct store access
  vectorSearch(query: string, k: number): Promise<SearchResult[]>
  graphQuery(cypher: string): QueryResult
  findRelated(nodeId: string, depth: number): TraversalResult[]

  // Cognitive operations (SONA learning)
  beginTrajectory(query: string, options?: TrajectoryOptions): Promise<TrajectoryId>
  recordStep(id: TrajectoryId, step: string, reward: number): Promise<void>
  endTrajectory(id: TrajectoryId, quality: number): void
  forceLearn(): string
}
```

**Key Features:**
- **Atomic Operations**: Document additions update both vector embeddings and graph nodes
- **Hybrid Search**: Combines vector similarity (default 70%) with graph connectivity (30%)
- **Optional Cognitive Features**: SONA learning and GNN reranking can be disabled
- **Factory Functions**: `createUnifiedMemory()`, `createLightweightMemory()`

### 2. Vector Store (`src/memory/vectorStore.ts`)

High-performance vector storage using the `ruvector` package:

| Feature | Description |
|---------|-------------|
| **Dimensions** | 384 (LocalNGramProvider default) |
| **Distance Metric** | Cosine similarity |
| **Indexing** | HNSW (Hierarchical Navigable Small World) |
| **Storage Tiers** | Hot (active), Warm (recent), Cold (archived) |
| **Persistence** | SQLite-backed (ruvector.db) |

**Embedding Generation** (`src/embedding.ts`):
- Uses `LocalNGramProvider` (no external API required)
- Batch processing with 32-item batches
- 10,000 embedding cache

### 3. Graph Store (`src/memory/graphStore.ts`)

SQLite-based knowledge graph with Cypher-like query support:

**Node Types:**
- `Document` - Ingested research documents
- `Section` - Document sections (from markdown headers)
- `Topic` - Extracted topics/concepts
- `Entity` - Named entities

**Edge Types:**
- `CITES` - Citation relationships
- `PARENT_OF` - Hierarchical structure
- `RELATES_TO` - Semantic connections
- `DERIVED_FROM` - Provenance tracking

**Query Syntax:**
```cypher
MATCH (n:Document) RETURN n
MATCH (a:Document)-[:CITES]->(b:Document) RETURN a, b
MATCH (a)-[:RELATES_TO*1..3]->(b) RETURN a, b
```

### 4. Cognitive Engine (`src/memory/cognitive.ts`)

Self-Optimizing Neural Attention (SONA) system for active learning:

```typescript
interface CognitiveEngine {
  // Trajectory tracking
  beginTrajectory(query: string, options?: TrajectoryOptions): TrajectoryId
  recordStep(id: TrajectoryId, step: string, reward: number): void
  endTrajectory(id: TrajectoryId, quality: number): void

  // Learning
  tick(): string | null     // Process learning queue
  forceLearn(): string      // Immediate learning cycle

  // Pattern matching
  findPatterns(query: string, k: number): ReasoningPattern[]
  rerank(query: string, candidates: RerankCandidate[]): RerankResult[]
}
```

**Learning Metrics:**
- `trajectoriesRecorded` - Total learning episodes
- `patternsLearned` - Distilled reasoning patterns
- `microLoraUpdates` - Fine-grained weight updates
- `baseLoraUpdates` - Major model adaptations
- `ewcConsolidations` - Elastic Weight Consolidation (catastrophic forgetting prevention)

### 5. Semantic Router (`src/tools/router.ts`)

"Tiny Dancer" - Query intent classification and execution strategy:

**Route Types:**
| Route | Description | Example Queries |
|-------|-------------|-----------------|
| `RETRIEVAL` | Direct document lookup | "Find docs about X" |
| `RELATIONAL` | Graph traversal | "What cites X?" |
| `SUMMARY` | Aggregation/synthesis | "Summarize findings" |
| `HYBRID` | Combined approach | "Compare A and B" |

**API:**
```typescript
routeQuery(query: string): { route: RouteType, confidence: number, reasoning: string }
analyzeIntent(query: string): IntentAnalysis
suggestStrategy(query: string): ExecutionStrategy
```

## Interfaces

### CLI (`src/cli.ts`)

```bash
rkm --version  # 0.3.0

# Ingestion
rkm ingest --path <dir> --tag <tag>     # Graph-aware ingestion
rkm ingest --path <dir> --legacy        # Vector-only (backward compat)

# Search
rkm query "text" -k 5 --show-related    # Hybrid search with graph
rkm search "text" --rerank --format json # Advanced hybrid search

# Graph Operations
rkm graph "MATCH (n:Document) RETURN n" # Cypher queries

# Analysis
rkm route "query" --verbose             # Query intent analysis
rkm status --full --router              # System capabilities

# Learning
rkm learn --force                       # Trigger SONA learning

# Export
rkm context "text" -k 6 --max-chars 12000  # Claude-ready context
```

### MCP Server (`src/mcp/server.ts`)

26 tools exposed via Model Context Protocol for AI agent integration:

**Core Search Tools:**
| Tool | Description |
|------|-------------|
| `ruvector_hybrid_search` | Vector + graph hybrid search |
| `ruvector_graph_query` | Cypher-like graph queries |
| `ruvector_graph_traverse` | Relationship navigation |
| `ruvector_route` | Semantic query routing |

**Document Management:**
| Tool | Description |
|------|-------------|
| `ruvector_add_document` | Add to vector + graph |
| `ruvector_add_relationship` | Create graph edges |
| `ruvector_delete_document` | Remove from both stores |

**SONA Learning Tools:**
| Tool | Description |
|------|-------------|
| `sona_begin` / `cognitive_begin_trajectory` | Start trajectory |
| `sona_step` / `cognitive_record_step` | Record step with reward |
| `sona_end` / `cognitive_end_trajectory` | End with quality score |
| `sona_learn` / `cognitive_force_learn` | Trigger learning |
| `sona_patterns` / `cognitive_find_patterns` | Pattern matching |

**GNN Tools:**
| Tool | Description |
|------|-------------|
| `gnn_available` | Check GNN availability |
| `gnn_rerank` | Neural reranking |

**Legacy Compatible:**
| Tool | Description |
|------|-------------|
| `ruvector_search` | Vector-only search |
| `ruvector_context` | Claude-ready context block |
| `ruvector_status` | System capabilities |

### REST API (`src/api/server.ts`)

Express 5.x HTTP API for frontend integration:

```
POST /api/collections                    # Create collection
GET  /api/collections                    # List collections
GET  /api/collections/:name              # Get collection details
DELETE /api/collections/:name            # Delete collection

POST /api/documents/upload               # Upload file (multipart/form-data)
GET  /api/documents/upload/:id/status    # Upload job status

POST /api/collections/:name/search       # Hybrid search
POST /api/chat                           # RAG-powered chat
GET  /api/chat/history                   # Conversation history

GET  /api/metrics                        # Performance metrics
GET  /api/insights                       # SONA learning insights
```

## Ingestion Pipeline

```
File → Reader → Parser → GraphBuilder → UnifiedMemory
```

### Document Reader (`src/ingestion/reader.ts`)

Recursive file reading with format detection:

| Format | Extensions | Features |
|--------|------------|----------|
| Markdown | `.md` | Frontmatter, sections, wikilinks |
| JSON | `.json` | Flexible field mapping |
| JSON Lines | `.jsonl` | Batch processing |
| Text | `.txt` | Plain content |

### Document Parser (`src/ingestion/parser.ts`)

Extracts structured metadata and relationships:

**Markdown Features:**
- YAML frontmatter extraction
- Section hierarchy (headers)
- Wikilink detection: `[[target]]`, `[[target|label]]`
- Citation detection: `[1]`, `[@ref]`

**Output Structure:**
```typescript
interface ParsedDocument {
  text: string
  metadata: {
    title?: string
    tags?: string[]
    custom?: Record<string, unknown>
  }
  sections: Section[]
  links: Link[]
}
```

### Graph Builder (`src/ingestion/graphBuilder.ts`)

Converts parsed documents into knowledge graph:

```typescript
buildDocumentGraph(docs: ParsedDocument[]): {
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata: { nodeCount: number, edgeCount: number }
}
```

## Hybrid Search Algorithm

The search combines vector similarity with graph connectivity:

```
1. Vector Search (semantic similarity)
   vectorResults = vectorStore.search(queryEmbedding, k*2)
   vectorScore = cosineSimilarity(query, document)

2. Graph Enrichment (structural relevance)
   graphScore = connectivity(documentNode) / 5  // Normalized 0-1
   relatedNodes = graphStore.findRelated(docId, depth)

3. Weighted Combination
   combinedScore = (vectorScore × vectorWeight) + (graphScore × graphWeight)
   // Default: 70% vector + 30% graph

4. Optional GNN Reranking
   if (rerank && gnnAvailable) {
     results = cognitiveEngine.rerank(query, results)
   }

5. Sort and Limit
   return results.sortBy(combinedScore).limit(k)
```

**Configuration Options:**
```typescript
interface HybridSearchOptions {
  k?: number                    // Results to return (default: 10)
  vectorWeight?: number         // Vector similarity weight (default: 0.7)
  includeRelated?: boolean      // Traverse graph (default: true)
  graphDepth?: number           // Traversal depth (default: 1)
  relationshipTypes?: EdgeType[] // Filter relationships
  rerank?: boolean              // GNN reranking (default: false)
  filters?: MetadataFilters     // Metadata filtering
}
```

## Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `ruvector` | latest | Vector database with WASM acceleration |
| `@ruvector/attention` | 0.1.1 | Attention mechanisms |
| `@ruvector/gnn` | 0.1.19 | Graph Neural Network |
| `better-sqlite3` | 12.5.0 | Embedded graph database |
| `@modelcontextprotocol/sdk` | 1.0.0 | MCP server |
| `express` | 5.2.1 | HTTP API |
| `commander` | 13.0.0 | CLI framework |
| `zod` | 3.25.0 | Schema validation |
| `multer` | 2.0.2 | File uploads |
| `cors` | 2.8.5 | CORS middleware |

### Optional Dependencies

| Package | Purpose | Required For |
|---------|---------|--------------|
| `claude-flow` | Claude-Flow integration | Orchestration workflows |
| `@ruvector/gnn` | Neural reranking | `--rerank` option |
| `@ruvector/attention` | Attention mechanisms | Advanced cognitive features |

## File Structure

```
ranger/
├── src/
│   ├── cli.ts                  # CLI entry point
│   ├── embedding.ts            # Embedding generation
│   ├── ingest.ts               # Legacy ingestion
│   ├── ruvectorDb.ts           # Vector DB factory
│   ├── sonaEngine.ts           # SONA engine wrapper
│   ├── status.ts               # Capability detection
│   ├── memory/
│   │   ├── index.ts            # UnifiedMemory facade
│   │   ├── vectorStore.ts      # Vector storage
│   │   ├── graphStore.ts       # Graph database
│   │   ├── cognitive.ts        # SONA/GNN engine
│   │   ├── collections.ts      # Collection management
│   │   └── types.ts            # Shared types
│   ├── ingestion/
│   │   ├── reader.ts           # File reader
│   │   ├── parser.ts           # Document parser
│   │   └── graphBuilder.ts     # Graph construction
│   ├── tools/
│   │   ├── router.ts           # Semantic router
│   │   └── context.ts          # Context formatter
│   ├── mcp/
│   │   └── server.ts           # MCP server (26 tools)
│   └── api/
│       ├── server.ts           # Express server
│       ├── types.ts            # API types
│       ├── routes/             # Route handlers
│       └── middleware/         # Express middleware
├── tests/                      # Vitest test suite
├── data/                       # Graph database storage
├── docs/                       # Documentation
└── dist/                       # Compiled JavaScript
```

## Scripts

```bash
# Development
npm run dev              # CLI with tsx
npm run api:dev          # API with watch mode

# Production
npm run build            # TypeScript compilation
npm start                # Run CLI
npm run mcp              # Start MCP server
npm run api              # Start API server

# Testing
npm test                 # Vitest
npm run test:ui          # Interactive UI
npm run test:coverage    # Coverage report

# Verification
npm run verify           # Build + system verification
```

## Configuration

### Environment Variables

```bash
# API Server
CORS_ORIGIN=*           # CORS allowed origins
PORT=3000               # API server port

# Database Paths
RUVECTOR_DB=./ruvector.db    # Vector storage
DATA_DIR=./data              # Graph storage
```

### CLI Global Options

```bash
--db <path>         # Vector database (default: ./ruvector.db)
--data-dir <path>   # Graph data directory (default: ./data)
--dims <number>     # Embedding dimensions (default: 384)
--no-cognitive      # Disable SONA/GNN features
```

## Integration Patterns

### Claude Code Integration

Register MCP server:
```bash
# Windows
claude mcp add ruvector-memory "cmd" "/c" "node dist\\mcp\\server.js"

# Linux/macOS
claude mcp add ruvector-memory node /path/to/dist/mcp/server.js
```

### Claude-Flow Workflow

```bash
# 1. Run Claude-Flow research
npx claude-flow@alpha research "topic"

# 2. Ingest outputs
rkm ingest --path ./outputs --tag claude-flow

# 3. Query knowledge
rkm search "findings about X" --rerank

# 4. Export for next task
rkm context "background on X" -k 10
```

### Frontend Integration

```typescript
// Search with collections
const response = await fetch('/api/collections/research/search', {
  method: 'POST',
  body: JSON.stringify({ query: 'neural networks', k: 10, rerank: true })
});

// RAG chat
const chat = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message: 'Explain X', collection: 'research' })
});
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Vector Insert | O(log n) | HNSW indexing |
| Vector Search | O(log n) | Approximate NN |
| Graph Insert | O(1) | SQLite index |
| Graph Query | O(edges) | Depends on query |
| Hybrid Search | O(log n + edges) | Combined |
| Batch Embed | O(n/32) | 32-item batches |

## Known Limitations

1. **Single-process**: No distributed scaling (design for single-machine use)
2. **Embedding Model**: LocalNGramProvider is simpler than transformer models
3. **Graph Queries**: Subset of Cypher syntax supported
4. **GNN Optional**: Reranking requires `@ruvector/gnn` installation
5. **SONA Learning**: Patterns stored in-memory (no persistence across restarts)

## Future Considerations

- [ ] Distributed graph database support
- [ ] Transformer-based embeddings (optional)
- [ ] Persistent SONA pattern storage
- [ ] GraphQL API alternative
- [ ] Real-time sync with external knowledge bases
