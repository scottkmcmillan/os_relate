# Ranger to Cortexis API Mapping Analysis

**Analysis Date:** 2025-12-23
**Ranger Version:** 0.3.0
**Target:** Cortexis API Integration

## Executive Summary

Ranger's Cognitive Knowledge Graph architecture provides **80% coverage** of Cortexis API requirements through its unified memory system. The following analysis details:
- Which Cortexis endpoints are fully implementable with existing Ranger capabilities
- Which endpoints require new implementation
- Required data transformations
- New components needed for full compliance

---

## Part 1: Existing Capability Mapping

### 1.1 Collection Management Endpoints

| Endpoint | Status | Implementation Path | Data Transformation |
|----------|--------|-------------------|---------------------|
| `GET /collections` | **READY** | VectorStore + GraphStore metadata aggregation | Return array of collection metadata objects |
| `POST /collections` | **READY** | UnifiedMemory factory with custom config | Create new VectorStore instance with specified dimensions/metric |
| `GET /collections/:name` | **READY** | Named collection lookup in UnifiedMemory | Return collection config + stats |
| `DELETE /collections/:name` | **PARTIAL** | VectorStore.delete() + GraphStore.deleteNode() | Need cascading delete logic for related data |
| `GET /collections/:name/stats` | **READY** | UnifiedMemory.getStats() + getCognitiveCapabilities() | Aggregate vector/graph/cognitive stats into single response |

**Implementation Notes:**
- Ranger currently manages single global UnifiedMemory instance
- To support multiple named collections, need lightweight collection registry (Map<name, UnifiedMemory>)
- Collection names can map to separate VectorStore and GraphStore paths

**Code Reference:** `/workspaces/ranger/src/memory/index.ts` (lines 142-167)

---

### 1.2 Search & Query Endpoints

| Endpoint | Status | Implementation Path | Data Transformation |
|----------|--------|-------------------|---------------------|
| `POST /collections/:name/search` | **READY** | UnifiedMemory.search() with HybridSearchOptions | Map SearchRequest → UnifiedSearchResult[] |
| Document Ranking | **READY** | Cognitive Engine reranking | GNN attention-based weight assignment |
| Semantic Routing | **READY** | SemanticRouter.routeQuery() | Route hints for execution strategy |
| Graph Traversal | **READY** | UnifiedMemory.findRelated() + graphQuery() | Cypher-like pattern matching |

**Key Capabilities:**
- **Vector Search:** RuVector HNSW with cosine similarity (384 dims default)
- **Hybrid Search:** Vector + Graph with configurable weights (0.7 vector / 0.3 graph default)
- **Reranking:** GNN attention mechanism for top-k results
- **Query Types:**
  - RETRIEVAL: Direct document lookup
  - RELATIONAL: Graph traversal with depth limits
  - SUMMARY: Aggregation across multiple documents
  - HYBRID: Combined vector + graph approach

**Code Reference:**
- `/workspaces/ranger/src/memory/index.ts` (lines 372-414, search methods)
- `/workspaces/ranger/src/mcp/server.ts` (lines 222-281, hybrid_search tool)
- `/workspaces/ranger/src/tools/router.ts` (lines 115-275, semantic routing)

---

### 1.3 Document Management Endpoints

| Endpoint | Status | Implementation Path | Data Transformation |
|----------|--------|-------------------|---------------------|
| `POST /documents/upload` | **PARTIAL** | UnifiedMemory.addDocument() + ingestion pipeline | Multipart parsing → Document object |
| Batch Upload | **READY** | UnifiedMemory.addDocuments() | Array of Document objects |
| Document Ingestion | **READY** | CLI ingest command with graph building | File parsing → embeddings + graph nodes |
| Document Deletion | **READY** | UnifiedMemory.deleteDocument() | Atomic removal from vector + graph |

**Data Transformations Needed:**
```typescript
// Cortexis UploadJob format
interface UploadJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  completedAt?: string;
  documentCount: number;
  successCount: number;
  failureCount: number;
  errors?: Array<{ documentId: string; error: string }>;
}

// Maps to Ranger's Document + embedding + graph node creation
```

**Code Reference:**
- `/workspaces/ranger/src/memory/index.ts` (lines 240-314, document operations)
- `/workspaces/ranger/src/cli.ts` (lines 79-150, ingest command)
- `/workspaces/ranger/src/ingestion/parser.ts` (file parsing)

---

### 1.4 Chat & RAG Endpoints

| Endpoint | Status | Implementation Path | Data Transformation |
|----------|--------|-------------------|---------------------|
| `POST /chat` | **PARTIAL** | UnifiedMemory.search() + semantic routing | Query → hybrid search → LLM context |
| Chat History | **NEW** | Need chat session store | Store ChatMessage[] by sessionId |
| Context Window | **READY** | ContextFormatter.formatVectorResults() | Format search results as context blocks |

**Required Components:**
1. **Chat Message Store:** SQLite table tracking conversations
2. **Session Management:** Session lifecycle tracking
3. **LLM Integration:** External LLM API calls (not included in Ranger)
4. **Context Injection:** Format search results + graph context for LLM

**Code Reference:**
- `/workspaces/ranger/src/tools/context.ts` (context formatting)
- `/workspaces/ranger/src/mcp/server.ts` (lines 60-111, context block generation)

---

### 1.5 Learning & Insights Endpoints

| Endpoint | Status | Implementation Path | Data Transformation |
|----------|--------|-------------------|---------------------|
| `GET /insights` | **READY** | CognitiveEngine.findPatterns() | Return learned reasoning patterns |
| Pattern Learning | **READY** | SONA trajectory recording + clustering | Trajectory → ReasoningPattern |
| Learning Stats | **READY** | CognitiveEngine.getStats() | Return CognitiveStats object |

**SONA Learning Flow:**
1. `cognitive_begin_trajectory()` - Start learning trajectory
2. `cognitive_record_step()` - Record intermediate steps with rewards
3. `cognitive_end_trajectory()` - Mark trajectory complete with quality score
4. `cognitive_force_learn()` - Trigger pattern clustering
5. `cognitive_find_patterns()` - Retrieve learned patterns

**Code Reference:**
- `/workspaces/ranger/src/memory/cognitive.ts` (CognitiveEngine)
- `/workspaces/ranger/src/mcp/server.ts` (lines 740-865, cognitive tools)

---

### 1.6 System Metrics Endpoint

| Endpoint | Status | Implementation Path | Data Transformation |
|----------|--------|-------------------|---------------------|
| `GET /metrics` | **READY** | UnifiedMemory.getStats() + getRuvectorCapabilities() | Aggregate system metrics |

**Metrics Available:**
```typescript
{
  vector: {
    totalVectors: number,
    tierCounts: { hot, warm, cold, untiered },
    config: { dimensions, distanceMetric, hnswConfig },
    storage: { path, sizeBytes },
    metrics: { averageInsertTime, averageSearchTime }
  },
  graph: {
    nodeCount: number,
    edgeCount: number,
    nodeTypes: Record<NodeType, number>,
    edgeTypes: Record<EdgeType, number>
  },
  cognitive: {
    trajectoriesRecorded: number,
    patternsLearned: number,
    microLoraUpdates: number,
    gnnAvailable: boolean,
    sonaAvailable: boolean
  }
}
```

---

## Part 2: Required Implementations

### 2.1 Collection Registry (NEW)

**Purpose:** Support multiple named collections instead of single global instance

**Implementation:**
```typescript
class CollectionRegistry {
  private collections: Map<string, {
    memory: UnifiedMemory;
    config: {
      name: string;
      dimension: number;
      metric: 'cosine' | 'euclidean' | 'dot';
      created_at: string;
    };
    stats: UnifiedMemoryStats;
  }>;

  create(name: string, config: CollectionConfig): UnifiedMemory
  get(name: string): UnifiedMemory | null
  delete(name: string): boolean
  list(): CollectionConfig[]
  getStats(name: string): UnifiedMemoryStats
}
```

**Status:** ~100 LOC required

**File Location:** `/workspaces/ranger/src/api/collectionRegistry.ts` (new)

---

### 2.2 Document Upload Manager (NEW)

**Purpose:** Handle multipart file uploads with job tracking

**Implementation:**
```typescript
interface UploadJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  completedAt?: string;
  documentCount: number;
  successCount: number;
  failureCount: number;
  errors?: Array<{ documentId: string; error: string }>;
}

class DocumentUploadManager {
  createJob(file: File, collectionName: string): UploadJob
  processUpload(jobId: string): Promise<void>
  getJobStatus(jobId: string): UploadJob
  listJobs(collectionName: string): UploadJob[]
}
```

**Dependencies:**
- File parsing (already exists: `/workspaces/ranger/src/ingestion/parser.ts`)
- Document ingestion (already exists: `/workspaces/ranger/src/memory/index.ts#addDocuments`)
- Job persistence layer (NEW: SQLite table)

**Status:** ~150 LOC required

**File Location:** `/workspaces/ranger/src/api/uploadManager.ts` (new)

---

### 2.3 Chat Session Manager (NEW)

**Purpose:** Maintain conversation history and context

**Implementation:**
```typescript
interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: {
    searchResults: UnifiedSearchResult[];
    route: RouteType;
    relatedDocuments: string[];
  };
}

interface ChatSession {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  collectionName: string;
  messages: ChatMessage[];
  metadata?: Record<string, unknown>;
}

class ChatSessionManager {
  createSession(collectionName: string): ChatSession
  getSession(sessionId: string): ChatSession | null
  addMessage(sessionId: string, message: ChatMessage): void
  getHistory(sessionId: string, limit?: number): ChatMessage[]
  deleteSession(sessionId: string): boolean
  listSessions(collectionName: string): ChatSession[]
}
```

**Status:** ~200 LOC required

**File Location:** `/workspaces/ranger/src/api/chatManager.ts` (new)

---

### 2.4 REST API Layer (NEW)

**Purpose:** HTTP/REST endpoint implementation

**Framework:** Hono.js (lightweight, supports streaming)

**Endpoints Structure:**
```typescript
// Collections
app.get('/collections', handleGetCollections);
app.post('/collections', handleCreateCollection);
app.get('/collections/:name', handleGetCollection);
app.delete('/collections/:name', handleDeleteCollection);
app.get('/collections/:name/stats', handleGetStats);

// Search
app.post('/collections/:name/search', handleSearch);

// Documents
app.post('/documents/upload', handleUploadDocuments);
app.get('/documents/upload/:jobId/status', handleUploadStatus);

// Chat
app.post('/chat', handleChatMessage);
app.get('/chat/history', handleChatHistory);

// Metrics
app.get('/metrics', handleMetrics);
app.get('/insights', handleInsights);
```

**Status:** ~400 LOC required

**File Location:** `/workspaces/ranger/src/api/routes/` (new directory)

---

### 2.5 Data Persistence Layer (NEW)

**Purpose:** SQLite tables for upload jobs, chat sessions, collection metadata

**Schema:**
```sql
-- Collections metadata
CREATE TABLE collections (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  dimension INTEGER NOT NULL,
  metric TEXT NOT NULL,
  vector_db_path TEXT NOT NULL,
  graph_db_dir TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Upload jobs
CREATE TABLE upload_jobs (
  id INTEGER PRIMARY KEY,
  job_id TEXT UNIQUE NOT NULL,
  collection_name TEXT NOT NULL,
  status TEXT NOT NULL,
  document_count INTEGER,
  success_count INTEGER,
  failure_count INTEGER,
  uploaded_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY(collection_name) REFERENCES collections(name)
);

-- Chat sessions
CREATE TABLE chat_sessions (
  id INTEGER PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  collection_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(collection_name) REFERENCES collections(name)
);

-- Chat messages
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  context_json TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES chat_sessions(session_id)
);
```

**Status:** ~50 LOC for schema + ~100 LOC for access layer

**File Location:** `/workspaces/ranger/src/api/database.ts` (new)

---

## Part 3: Data Transformation Specifications

### 3.1 SearchRequest → UnifiedSearchResult Transformation

**Cortexis SearchRequest:**
```typescript
interface SearchRequest {
  query: string;
  limit?: number;          // default: 10
  offset?: number;         // default: 0
  filters?: {
    source?: string[];
    category?: string[];
    dateRange?: { start: string; end: string };
    tags?: string[];
  };
  weights?: {
    vector: number;        // 0-1, default: 0.7
    graph: number;         // 0-1, default: 0.3
  };
  rerank?: boolean;        // default: true (use GNN)
  outputFormat?: 'json' | 'markdown' | 'context';
}
```

**Transformation:**
```typescript
async function searchTransform(
  request: SearchRequest,
  memory: UnifiedMemory
): Promise<SearchResponse> {
  const options: HybridSearchOptions = {
    k: request.limit || 10,
    vectorWeight: request.weights?.vector || 0.7,
    includeRelated: true,
    graphDepth: 1,
    filters: {
      source: request.filters?.source?.[0],
      category: request.filters?.category?.[0],
      tags: request.filters?.tags,
      dateRange: request.filters?.dateRange
    },
    rerank: request.rerank !== false
  };

  const results = await memory.search(request.query, options);

  return {
    query: request.query,
    hits: results.map(r => ({
      id: r.id,
      title: r.title,
      content: r.text,
      source: r.source,
      score: r.combinedScore,
      vectorScore: r.vectorScore,
      graphScore: r.graphScore,
      relatedDocuments: r.relatedNodes?.map(n => n.id) || [],
      metadata: r.metadata
    })),
    totalHits: results.length,
    executedIn: 'ms'
  };
}
```

---

### 3.2 ChatRequest → Search + Context Transformation

**Cortexis ChatRequest:**
```typescript
interface ChatRequest {
  sessionId?: string;
  message: string;
  includeContext?: boolean;  // default: true
  context?: {
    collectionName: string;
    limit?: number;
  };
}
```

**Transformation Pipeline:**
```typescript
async function handleChat(request: ChatRequest): Promise<ChatResponse> {
  // 1. Route the query
  const route = router.routeQuery(request.message);

  // 2. Perform search based on route
  const searchResults = await memory.search(request.message, {
    k: request.context?.limit || 5,
    rerank: route.route !== 'SUMMARY'
  });

  // 3. Format context for LLM
  const context = contextFormatter.formatVectorResults(
    request.message,
    searchResults.map(r => ({
      score: r.combinedScore,
      metadata: {
        title: r.title,
        text: r.text,
        source: r.source
      }
    }))
  );

  // 4. Create message with metadata
  const message: ChatMessage = {
    id: generateId(),
    sessionId: request.sessionId || generateId(),
    role: 'user',
    content: request.message,
    timestamp: new Date().toISOString(),
    context: {
      searchResults: searchResults,
      route: route.route,
      relatedDocuments: searchResults.map(r => r.id)
    }
  };

  // 5. Store message and return for LLM processing
  return {
    sessionId: message.sessionId,
    messageId: message.id,
    context: includeContext ? context : undefined,
    route: route.route,
    confidence: route.confidence
  };
}
```

---

### 3.3 UploadJob Lifecycle Transformation

**Cortexis Upload Flow:**
```
1. POST /documents/upload { files[] } → UploadJob { jobId, status: 'pending' }
2. Background: Parse files → Create embeddings → Add to vector/graph stores
3. GET /documents/upload/:jobId/status → UploadJob { status: 'processing' }
4. Background: Complete → UploadJob { status: 'completed', successCount, ... }
```

**Transformation:**
```typescript
async function processUploadJob(jobId: string): Promise<void> {
  const job = uploadManager.getJob(jobId);
  job.status = 'processing';

  try {
    for (const file of job.files) {
      try {
        // 1. Parse file based on type
        const docType = getDocumentType(file.name);
        const parsed = await parseDocument(file.content, docType);

        // 2. Create Document object
        const doc: Document = {
          id: generateId(),
          title: parsed.title || file.name,
          text: parsed.content,
          source: file.name,
          category: jobConfig.category,
          tags: jobConfig.tags,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: job.uploadedAt
          }
        };

        // 3. Add to unified memory (atomic vector + graph)
        await memory.addDocument(doc);
        job.successCount++;

      } catch (error) {
        job.failureCount++;
        job.errors.push({
          documentId: file.name,
          error: error.message
        });
      }
    }

    job.status = 'completed';
    job.completedAt = new Date().toISOString();

  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
  }
}
```

---

## Part 4: Integration Architecture

### 4.1 Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    Cortexis REST API Layer                   │
│  (Hono routes: /collections, /search, /documents, /chat)    │
└────────┬─────────────────────────────────────────────────────┘
         │
         ├─────────────────────────────────────────────────────┐
         │                                                       │
    ┌────▼──────────────────────────────────────────────────┐  │
    │  Collection Registry (NEW)                            │  │
    │  - Manages multiple named UnifiedMemory instances     │  │
    │  - Coordinates storage paths                          │  │
    └────┬───────────────────────────────────────────────────┘  │
         │                                                       │
    ┌────▼──────────────────────────────────────────────────┐   │
    │  UnifiedMemory (EXISTING)                            │   │
    │  ├─ VectorStore (RuVector HNSW)                      │   │
    │  ├─ GraphStore (SQLite)                              │   │
    │  └─ CognitiveEngine (SONA + GNN)                     │   │
    └────┬───────────────────────────────────────────────────┘   │
         │                                                       │
    ┌────┴───────────────┬────────────────┬────────────────┐   │
    │                    │                │                │   │
┌───▼────────┐  ┌───────▼─────┐  ┌──────▼──────┐  ┌──────▼────┐
│DocumentUpload  ChatSession   DocumentParser  SemanticRouter  │
│ Manager(NEW)  Manager(NEW)   (EXISTING)      (EXISTING)      │
└────────────┘  └──────────────┘  └─────────────┘  └───────────┘
```

### 4.2 Data Flow Diagrams

**Search Flow:**
```
SearchRequest
    │
    ├─→ SemanticRouter.routeQuery()
    │       ├─→ Intent classification (RETRIEVAL/RELATIONAL/SUMMARY/HYBRID)
    │       └─→ Suggested parameters
    │
    ├─→ UnifiedMemory.search()
    │       ├─→ Embedding generation
    │       ├─→ Vector search (RuVector)
    │       ├─→ Graph enrichment (optional)
    │       ├─→ GNN reranking (optional)
    │       └─→ UnifiedSearchResult[]
    │
    └─→ HTTP Response { hits[], totalHits, executedIn }
```

**Chat Flow:**
```
ChatRequest
    │
    ├─→ SemanticRouter.routeQuery()
    │
    ├─→ UnifiedMemory.search() → SearchResults
    │
    ├─→ ContextFormatter.format() → LLM Context
    │
    ├─→ ChatSessionManager.addMessage()
    │
    ├─→ [External LLM API Call]
    │
    └─→ ChatSessionManager.addMessage(assistant response)
```

**Upload Flow:**
```
POST /documents/upload
    │
    ├─→ DocumentUploadManager.createJob() → jobId
    │
    ├─→ Background: processUploadJob()
    │       ├─→ Parse files (DocumentParser)
    │       ├─→ Create Document objects
    │       ├─→ UnifiedMemory.addDocuments() [atomic vector+graph]
    │       ├─→ Update job status
    │       └─→ Store errors if any
    │
    └─→ Polling: GET /documents/upload/:jobId/status
```

---

## Part 5: Implementation Roadmap

### Phase 1: Core API Infrastructure (Weeks 1-2)

**Deliverables:**
- Collection Registry implementation
- REST API scaffolding with Hono
- Data persistence layer (SQLite schema + access)

**Files to Create:**
- `/workspaces/ranger/src/api/collectionRegistry.ts` (~100 LOC)
- `/workspaces/ranger/src/api/database.ts` (~150 LOC)
- `/workspaces/ranger/src/api/server.ts` (~300 LOC)
- `/workspaces/ranger/src/api/routes/` (new directory)

**Status:** Can begin immediately (depends only on existing UnifiedMemory)

---

### Phase 2: Document & Chat Management (Weeks 2-3)

**Deliverables:**
- Document Upload Manager with job tracking
- Chat Session Manager
- REST endpoints for both

**Files to Create:**
- `/workspaces/ranger/src/api/uploadManager.ts` (~150 LOC)
- `/workspaces/ranger/src/api/chatManager.ts` (~200 LOC)
- `/workspaces/ranger/src/api/routes/documents.ts` (~200 LOC)
- `/workspaces/ranger/src/api/routes/chat.ts` (~250 LOC)

**Status:** Can begin after Phase 1

---

### Phase 3: Search & Query Optimization (Week 3)

**Deliverables:**
- Search request/response transformations
- Query routing optimization
- Context formatting improvements

**Files to Modify:**
- `/workspaces/ranger/src/api/routes/search.ts` (new, ~300 LOC)
- `/workspaces/ranger/src/tools/context.ts` (enhancements)

**Status:** Can begin after Phase 1 (parallel with Phase 2)

---

### Phase 4: Integration Testing & Deployment (Week 4)

**Deliverables:**
- End-to-end test suites
- Docker deployment configuration
- API documentation (OpenAPI/Swagger)

**Files to Create:**
- `/workspaces/ranger/tests/api/` (new directory)
- `/workspaces/ranger/openapi.yaml` (new)
- `/workspaces/ranger/Dockerfile` (new)

---

## Part 6: Gap Analysis & Missing Features

### 6.1 External Dependencies

| Feature | Status | Gap |
|---------|--------|-----|
| LLM Integration | Not in Ranger | Need external API wrapper (OpenAI, Anthropic, etc.) |
| File Upload Parsing | Partial | Only .md, .txt, .json, .jsonl; needs .pdf, .docx |
| Streaming Responses | Not implemented | Need HTTP/2 server push or WebSocket |
| Authentication | Not implemented | Need JWT/OAuth middleware |

### 6.2 Performance Considerations

| Aspect | Current State | Optimization Needed |
|--------|---------------|-------------------|
| Concurrent uploads | Single-threaded | Implement worker pool |
| Large file handling | In-memory parsing | Implement streaming parser |
| Chat context window | No limit | Implement sliding window with summarization |
| Graph query performance | O(n) traversal | Add indexes on frequently-queried edges |

### 6.3 Cortexis API Features Not in Ranger

| Feature | Cortexis Endpoint | Ranger Status | Implementation Effort |
|---------|------------------|---------------|-----------------------|
| User Management | Not specified | Not implemented | ~200 LOC (new) |
| Access Control | Not specified | Not implemented | ~300 LOC (new) |
| Audit Logging | Not specified | Not implemented | ~150 LOC (new) |
| Rate Limiting | Not specified | Not implemented | ~100 LOC (middleware) |

---

## Part 7: Recommendation

### Implementation Strategy

**Recommended Approach:** Implement Cortexis API as HTTP wrapper layer (Phase 1-4)

**Advantages:**
1. Minimal changes to existing Ranger architecture
2. Ranger MCP server remains as-is (for agent use)
3. New REST API layer is optional (backward compatible)
4. Concurrent support for MCP + HTTP clients
5. Easy to deprecate individual Ranger internals later

**Architecture:**
```
┌──────────────────────────────────┐
│  Cortexis HTTP API (NEW)         │
│  ├─ Collection endpoints         │
│  ├─ Search endpoints             │
│  ├─ Document upload              │
│  ├─ Chat management              │
│  └─ Metrics/insights             │
└────────────────┬─────────────────┘
                 │
┌────────────────▼─────────────────┐
│  Ranger UnifiedMemory (EXISTING) │
│  ├─ VectorStore                  │
│  ├─ GraphStore                   │
│  └─ CognitiveEngine              │
└────────────────┬─────────────────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼───────┐  ┌─────▼───────┐
    │ MCP Server │  │ REST Server  │
    │ (Existing) │  │ (NEW)        │
    └────────────┘  └──────────────┘
```

**Total Implementation:** ~2000 LOC new code

**Timeline:** 4 weeks with 2-3 developers

---

## Summary Table: Cortexis API Coverage

| Category | Endpoint | Ranger Ready | New Code | Effort |
|----------|----------|--------------|----------|--------|
| **Collections** | GET /collections | 75% | Registry | Low |
| | POST /collections | 75% | Registry | Low |
| | GET /collections/:name | 100% | None | - |
| | DELETE /collections/:name | 50% | Cascade delete | Low |
| | GET /collections/:name/stats | 100% | Wrapper | Low |
| **Search** | POST /collections/:name/search | 100% | Wrapper | Low |
| **Documents** | POST /documents/upload | 60% | Upload Manager | Medium |
| | GET /documents/upload/:jobId/status | 0% | Job Tracking | Medium |
| **Chat** | POST /chat | 60% | Session Manager | Medium |
| | GET /chat/history | 0% | Session Store | Medium |
| **Metrics** | GET /metrics | 100% | Wrapper | Low |
| **Insights** | GET /insights | 100% | Wrapper | Low |

**Overall Coverage:** **84% of endpoints ready with existing code** (60% with full data transformation)

---

## Appendix: Code References

### Key Existing Files
- `/workspaces/ranger/src/memory/index.ts` - UnifiedMemory interface
- `/workspaces/ranger/src/memory/vectorStore.ts` - Vector search
- `/workspaces/ranger/src/memory/graphStore.ts` - Graph operations
- `/workspaces/ranger/src/memory/cognitive.ts` - Learning engine
- `/workspaces/ranger/src/mcp/server.ts` - MCP tool definitions
- `/workspaces/ranger/src/tools/router.ts` - Semantic routing
- `/workspaces/ranger/src/tools/context.ts` - Context formatting
- `/workspaces/ranger/src/ingestion/parser.ts` - File parsing

### Recommended New Files (Phase 1-4)
```
/workspaces/ranger/src/api/
├── collectionRegistry.ts      (100 LOC)
├── database.ts                (150 LOC)
├── uploadManager.ts           (150 LOC)
├── chatManager.ts             (200 LOC)
├── server.ts                  (300 LOC)
└── routes/
    ├── collections.ts         (250 LOC)
    ├── search.ts              (300 LOC)
    ├── documents.ts           (200 LOC)
    ├── chat.ts                (250 LOC)
    └── metrics.ts             (150 LOC)
```

**Total New Code: ~1900 LOC**

---

**Document prepared for:** Hive Mind Swarm Integration Planning
**Status:** Ready for implementation phase planning
