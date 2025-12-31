# Component Dependency Analysis

## Component Hierarchy and Dependencies

### Layer 1: Entry Points (3 components)

These are the user-facing interfaces to the system.

```
src/cli.ts
├── Depends on: UnifiedMemory, embedding, ruvectorDb, ingestion/*, tools/*
├── Provides: Command-line interface
└── Commands: ingest, query, search, graph, route, context, status, learn

src/api/server.ts (RangerServer class)
├── Depends on: UnifiedMemory, CollectionManager, routes/*, middleware/*
├── Provides: REST API server
└── Port: 3000 (configurable)

src/mcp/server.ts
├── Depends on: UnifiedMemory, SemanticRouter, ContextFormatter, @modelcontextprotocol/sdk
├── Provides: MCP protocol server for AI agents
└── Tools: 30+ tools (search, graph, cognitive, SONA, GNN)
```

**Integration Pattern:** All three entry points converge on `UnifiedMemory` as the central facade.

---

### Layer 2: Core Facade (1 component)

The unified interface coordinating all subsystems.

```
src/memory/index.ts (UnifiedMemory class)
├── Orchestrates: VectorStore + GraphStore + CognitiveEngine
├── Provides: Atomic operations across all stores
├── Key Methods:
│   ├── addDocument() → vector + graph
│   ├── search() → hybrid vector/graph search
│   ├── beginTrajectory() → cognitive learning
│   ├── graphQuery() → Cypher-like queries
│   └── getStats() → unified statistics
└── Factory Functions:
    ├── createUnifiedMemory() → Full-featured instance
    └── createLightweightMemory() → Vector + graph only (no cognitive)
```

**Design Pattern:** Facade pattern providing simplified interface to complex subsystems.

---

### Layer 3: Core Storage Engines (3 components)

#### 3.1 Vector Store

```
src/memory/vectorStore.ts
├── Wraps: ruvector (VectorDB)
├── Storage: SQLite-based vector database
├── Features:
│   ├── Embedding dimensions: 384 (default)
│   ├── Distance metric: Cosine
│   ├── HNSW indexing for fast search
│   ├── Tiered storage (hot/warm/cold)
│   └── Metadata filtering
├── Dependencies:
│   ├── src/ruvectorDb.ts (database factory)
│   └── ruvector NPM package
└── Key Operations:
    ├── insert() / insertBatch()
    ├── search() → SearchResult[]
    ├── delete()
    └── getStats()
```

#### 3.2 Graph Store

```
src/memory/graphStore.ts
├── Storage: better-sqlite3
├── Schema:
│   ├── nodes table (id, type, properties JSON, created_at)
│   └── edges table (id, from_id, to_id, type, properties JSON, created_at)
├── Node Types (11):
│   ├── Document, Section, Concept (original)
│   └── Organization, Mission, Vision, Objective, Goal, Portfolio, Program, Project, Task, Team, User (PKA-STRAT)
├── Edge Types (10):
│   ├── CITES, PARENT_OF, RELATES_TO, DERIVED_FROM (original)
│   └── ALIGNS_TO, SUPPORTS, MEMBER_OF, MANAGES, EXTRACTED_FROM, ADVANCES (PKA-STRAT)
├── Features:
│   ├── Simplified Cypher-like query language
│   ├── Graph traversal with depth limits
│   ├── Relationship-type filtering
│   └── Path tracking
└── Key Operations:
    ├── createNode() / deleteNode()
    ├── createEdge() / deleteEdge()
    ├── findRelated() → TraversalResult[]
    ├── query() → QueryResult
    └── getStats()
```

#### 3.3 Cognitive Engine

```
src/memory/cognitive.ts (CognitiveEngine class)
├── Integrates: SONA (Self-Optimizing Neural Architecture) + GNN (Graph Neural Network)
├── Dependencies:
│   ├── ruvector (Sona module)
│   ├── ruvector/dist/core/gnn-wrapper.js (differentiableSearch)
│   └── src/embedding.ts
├── SONA Features:
│   ├── Trajectory tracking (query → steps → quality)
│   ├── Micro-LoRA updates (ultra-fast ~0.1ms)
│   ├── Base-LoRA updates (periodic consolidation)
│   ├── EWC (Elastic Weight Consolidation) to prevent catastrophic forgetting
│   ├── Pattern clustering (50 clusters default)
│   └── Background learning (1-hour intervals)
├── GNN Features:
│   ├── Differentiable search with soft attention
│   ├── Reranking with temperature control
│   └── Gradient-based relevance scoring
├── Learning Flow:
│   1. beginTrajectory(query) → TrajectoryId
│   2. recordStep(id, step, reward)
│   3. endTrajectory(id, quality)
│   4. tick() or forceLearn() → Pattern extraction
└── Key Operations:
    ├── beginTrajectory() / recordStep() / endTrajectory()
    ├── rerank() → RerankResult[]
    ├── findPatterns() → ReasoningPattern[]
    ├── tick() / forceLearn()
    └── getStats() → CognitiveStats
```

**Singleton Pattern:** Cognitive engines are cached by dimension to maintain learning state.

---

### Layer 4: Ingestion Pipeline (3 components)

Handles document parsing, link detection, and graph construction.

```
src/ingestion/reader.ts
├── Purpose: File system traversal and content reading
├── Supports: Recursive directory scanning, file filtering by extension
└── Output: FileReadResult[] (content + metadata)

src/ingestion/parser.ts
├── Purpose: Document parsing with format detection
├── Formats:
│   ├── Markdown (frontmatter + body)
│   ├── JSON (structured data)
│   ├── JSONL (newline-delimited JSON)
│   └── Text (plain text)
├── Features:
│   ├── Section extraction (headings)
│   ├── Link detection (URLs, wikilinks, citations)
│   ├── Metadata extraction (frontmatter, title, tags)
│   └── Word/line counting
└── Output: ParsedDocument

src/ingestion/graphBuilder.ts
├── Purpose: Build knowledge graph from parsed documents
├── Processes:
│   ├── Citation detection (numeric, author-year, BibTeX, wikilinks)
│   ├── Link resolution (local file links)
│   ├── Hierarchical relationships (sections)
│   └── Edge weighting
├── Output: DocumentGraph (nodes + edges + metadata)
└── Dependencies: parser.ts
```

**Pipeline Flow:**
```
Files → reader.ts → parser.ts → graphBuilder.ts → DocumentGraph
                                                        ↓
                                                UnifiedMemory.addDocuments()
```

---

### Layer 5: PKA-STRAT Alignment System (3 components)

Strategic alignment framework (Pyramid of Clarity).

```
src/pka/types.ts
├── Defines: PyramidLevel, PyramidEntity, AlignmentScore, DriftAlert
└── Constants: PYRAMID_WEIGHTS (Organization: 1.0 → Task: 0.1)

src/pka/memory.ts (PKAMemoryManager class)
├── Wraps: UnifiedMemory for PKA-specific operations
├── Manages: Strategic pyramid hierarchy
├── Operations:
│   ├── createPyramidEntity()
│   ├── getPyramidTree()
│   ├── calculateAlignment()
│   └── getAlignmentHeatmap()
└── Dependencies: UnifiedMemory, GraphStore

src/pka/alignment/
├── calculator.ts (AlignmentCalculator)
│   ├── Semantic alignment scoring
│   ├── Multi-factor analysis (semantic, structural, temporal, quality, strategic)
│   └── Weighted pyramid scoring
└── drift-detector.ts (DriftDetector)
    ├── Drift detection between entities
    ├── Alert generation (semantic, structural, temporal)
    └── Threshold-based monitoring
```

**PKA-STRAT Integration:** Extends graph schema with strategic node/edge types.

---

### Layer 6: API Routes (15 components)

REST API endpoint handlers.

```
src/api/routes/index.ts
├── Aggregates: All route modules
└── Mounts:
    ├── /api/collections (collectionsRouter, searchRouter)
    ├── /api/metrics (metricsRouter)
    ├── /api/insights (metricsRouter alias)
    ├── /api/chat (chatRouter)
    ├── /api/documents (documentsRouter)
    ├── /api/pyramid (pyramidRouter) [PKA-STRAT]
    ├── /api/alignment (alignmentRouter) [PKA-STRAT]
    ├── /api/drift (driftRouter) [PKA-STRAT]
    ├── /api/teams (teamsRouter) [PKA-STRAT]
    └── /api/reports (reportsRouter) [PKA-STRAT]

Core Routes:
├── src/api/routes/collections.ts → Collection management (CRUD)
├── src/api/routes/search.ts → Collection search endpoint
├── src/api/routes/documents.ts → Document upload & ingestion
├── src/api/routes/chat.ts → RAG-powered chat
└── src/api/routes/metrics.ts → System statistics & learning insights

PKA-STRAT Routes:
├── src/api/routes/pyramid.ts → Pyramid hierarchy management
├── src/api/routes/alignment.ts → Alignment scoring & heatmaps
├── src/api/routes/drift.ts → Drift detection & alerts
├── src/api/routes/teams.ts → Team management
└── src/api/routes/reports.ts → Strategic reports & board narratives
```

---

### Layer 7: Middleware (5 components)

Request processing and error handling.

```
src/api/middleware/
├── auth.ts → Authentication (JWT, API keys)
├── rbac.ts → Role-based access control
├── cors.ts → CORS configuration
├── error.ts → Error handling & logging
└── index.ts → Middleware aggregator
```

---

### Layer 8: Semantic Tools (2 components)

Query routing and context formatting.

```
src/tools/router.ts (SemanticRouter)
├── Purpose: Analyze query intent & suggest execution strategy
├── Routes:
│   ├── VECTOR_SEARCH → Simple similarity search
│   ├── GRAPH_QUERY → Relationship traversal
│   ├── HYBRID_SEARCH → Combined vector + graph
│   ├── MULTI_STAGE → Complex multi-step queries
│   └── COGNITIVE_LEARNING → Trajectory-based learning
├── Features:
│   ├── Intent classification
│   ├── Complexity scoring
│   └── Strategy suggestion
└── Output: RouteDecision (route, confidence, reasoning)

src/tools/context.ts (ContextFormatter)
├── Purpose: Format search results for LLM context
├── Formats:
│   ├── text → Plain text blocks
│   ├── markdown → Structured markdown
│   └── json → Structured JSON
└── Features:
    ├── Character limit enforcement
    ├── Result truncation
    └── Metadata inclusion
```

---

### Layer 9: Utilities (5 components)

Shared utilities and helpers.

```
src/embedding.ts
├── Purpose: Generate text embeddings
├── Uses: RuVector's embedding model (384 dimensions)
├── Functions:
│   ├── embedOne(text, dims) → Float32Array
│   └── embedMany(texts, dims) → Float32Array[]
└── Note: Abstracts embedding provider for easy swapping

src/ruvectorDb.ts
├── Purpose: VectorDB factory
├── Configuration:
│   ├── Dimensions: 384 (default)
│   ├── Distance metric: Cosine
│   └── Storage path: ./ruvector.db
└── Function: openDb(path, dims) → VectorDB

src/sonaEngine.ts (DEPRECATED - use cognitive.ts)
├── Legacy SONA wrapper
└── Compatibility layer for old code

src/status.ts
├── Purpose: System capability detection
└── Function: getRuvectorCapabilities() → CapabilityReport

src/embed.ts, src/ingest.ts
├── Legacy utilities
└── Superseded by ingestion/* modules
```

---

## Dependency Graph Summary

### External Dependencies

```
Core Infrastructure:
├── express ^5.2.1 → REST API framework
├── better-sqlite3 ^12.5.0 → SQLite database
├── commander ^13.0.0 → CLI framework
└── @modelcontextprotocol/sdk ^1.0.0 → MCP protocol

RuVector Ecosystem:
├── ruvector (latest) → Vector database + SONA + GNN
├── @ruvector/attention ^0.1.1 → Attention mechanisms
├── @ruvector/gnn ^0.1.19 → Graph neural networks
├── @ruvector/graph-node ^0.1.25 → Graph utilities
└── @ruvector/tiny-dancer ^0.1.15 → Optimization

Utilities:
├── cors ^2.8.5 → CORS middleware
├── multer ^2.0.2 → File upload handling
├── zod ^3.25.0 → Schema validation
└── claude-flow ^2.7.47 → Agent coordination (optional)
```

### Internal Module Dependencies

**High-Level Flow:**
```
Entry Points (cli.ts, api/server.ts, mcp/server.ts)
    ↓
Unified Facade (memory/index.ts)
    ↓
Core Engines (vectorStore, graphStore, cognitive)
    ↓
Utilities (embedding, ruvectorDb, status)
```

**Cross-Cutting Concerns:**
- `embedding.ts` → Used by ALL components that generate embeddings
- `types.ts` modules → Shared type definitions across layers
- `collections.ts` → Used by API and memory subsystems

---

## Component Coupling Analysis

### Tight Coupling (Strong Dependencies)

1. **UnifiedMemory ← Entry Points**
   - CLI, API, MCP all depend heavily on UnifiedMemory
   - **Risk:** Changes to UnifiedMemory API impact all entry points
   - **Mitigation:** Well-defined interface, extensive tests needed

2. **GraphStore ← PKA-STRAT**
   - PKA subsystem tightly coupled to graph schema
   - **Risk:** Schema changes break PKA operations
   - **Mitigation:** Version graph schema, migration scripts

3. **RuVector ← All Storage**
   - Heavy dependency on RuVector package
   - **Risk:** Vendor lock-in, version compatibility
   - **Mitigation:** Abstraction layers (vectorStore.ts, cognitive.ts)

### Loose Coupling (Weak Dependencies)

1. **Ingestion Pipeline ← UnifiedMemory**
   - Ingestion outputs standard DocumentGraph
   - UnifiedMemory can accept from any source

2. **Semantic Tools ← Core**
   - Router and formatter are optional enhancements
   - System functions without them

3. **PKA-STRAT ← Core System**
   - PKA extends but doesn't modify core
   - Can be disabled without breaking core functionality

---

## Scalability and Extension Points

### Designed for Extension

1. **New Node/Edge Types**
   - Add to `NodeType` / `EdgeType` unions in `graphStore.ts`
   - No code changes required elsewhere

2. **New Document Formats**
   - Implement parser in `parser.ts`
   - Register in format detection

3. **New Embedding Providers**
   - Modify `embedding.ts` only
   - All consumers use abstract interface

4. **New API Routes**
   - Add route module to `api/routes/`
   - Register in `index.ts`

### Bottlenecks

1. **SQLite Write Performance**
   - Graph store uses single SQLite file
   - **Mitigation:** Batch operations, WAL mode, consider PostgreSQL for production

2. **Embedding Generation**
   - Synchronous embedding calls can block
   - **Mitigation:** Batch embedMany(), consider async queue

3. **Memory Usage**
   - In-memory graph operations
   - **Mitigation:** Pagination, lazy loading, external graph DB

---

## Recommendations

### Architectural Improvements

1. **Implement Repository Pattern**
   - Abstract storage backends (vector, graph)
   - Enable swapping SQLite → PostgreSQL, RuVector → Pinecone

2. **Add Event Bus**
   - Decouple components with pub/sub
   - Enable real-time updates, webhooks, notifications

3. **Extract PKA-STRAT as Plugin**
   - Make PKA optional module
   - Define plugin interface for extensions

4. **Add Caching Layer**
   - Cache frequent queries (Redis, in-memory LRU)
   - Reduce database load

5. **API Versioning**
   - Implement /api/v1/ path structure
   - Enable backward-compatible changes

### Code Quality Improvements

1. **Comprehensive Testing**
   - Unit tests for all core components
   - Integration tests for API routes
   - E2E tests for CLI commands

2. **Documentation**
   - API documentation (OpenAPI/Swagger)
   - Architecture decision records (ADRs)
   - Developer onboarding guide

3. **Error Handling**
   - Consistent error types across system
   - Error recovery strategies
   - Graceful degradation

4. **Monitoring & Observability**
   - Structured logging (Winston, Pino)
   - Metrics collection (Prometheus)
   - Distributed tracing (OpenTelemetry)

---

**Last Updated:** 2025-12-30
**Architecture Reviewer:** System Architect Agent
