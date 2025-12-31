# Ranger + Cortexis Integration Development Plan

## Executive Summary

This document outlines the development plan to integrate Cortexis as the frontend for the Ranger Research Knowledge Manager. The plan is organized into three phases: **MVP (Minimal Viable Functionality)**, **P1 (Priority 1)**, and **P2 (Priority 2)**.

**Key Insight**: Ranger already has most of the core capabilities needed. The primary work involves:
1. Adding an HTTP/REST API layer
2. Implementing multi-collection support
3. Adding chat/RAG capabilities with LLM integration
4. Exposing existing functionality through the Cortexis API contract

---

## Current State Analysis

### What Ranger Has (Existing Capabilities)

| Capability | Implementation | Status |
|------------|----------------|--------|
| Vector Search | `VectorStore` via RuVector HNSW | ✅ Ready |
| Hybrid Search | `UnifiedMemory.search()` | ✅ Ready |
| Graph Storage | `GraphStore` via SQLite | ✅ Ready |
| Graph Traversal | `findRelated()`, Cypher queries | ✅ Ready |
| Document Ingestion | CLI `ingest` command | ✅ Ready |
| Semantic Routing | `SemanticRouter` | ✅ Ready |
| GNN Reranking | `CognitiveEngine.rerank()` | ✅ Ready |
| SONA Learning | `CognitiveEngine` trajectories | ✅ Ready |
| MCP Server | stdio transport | ✅ Ready |
| Embeddings | Local n-gram (384 dims) | ✅ Ready |

### What's Missing for Cortexis

| Requirement | Current State | Work Needed |
|-------------|---------------|-------------|
| HTTP REST API | None | New API server layer |
| Multi-collection | Single DB | Collection abstraction |
| File Upload | CLI only | HTTP multipart handler |
| Async Job Queue | None | Job processing system |
| Chat/RAG | No LLM integration | LLM + conversation mgmt |
| Chat History | None | SQLite persistence |
| System Metrics | Partial | Expand metrics collection |
| Learning Insights | Partial | Aggregate SONA stats |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cortexis Frontend                         │
│                     (React + TypeScript)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP/REST
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEW: HTTP API Layer                          │
│               src/api/server.ts (Express/Fastify)                │
├─────────────────────────────────────────────────────────────────┤
│  /collections  │  /documents  │  /chat  │  /metrics  │  /insights │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ NEW: Collection│   │ Existing:        │   │ NEW:             │
│ Manager        │   │ UnifiedMemory    │   │ Chat Service     │
│                │   │ (Vector + Graph) │   │ (LLM + RAG)      │
└───────────────┘   └──────────────────┘   └──────────────────┘
        │                   │                       │
        ▼                   ▼                       ▼
┌───────────────────────────────────────────────────────────────┐
│              Existing Core (No Changes Needed)                 │
├──────────────┬─────────────┬────────────────┬─────────────────┤
│ VectorStore  │ GraphStore  │ CognitiveEngine │ SemanticRouter │
│ (RuVector)   │ (SQLite)    │ (SONA + GNN)    │ (Intent)       │
└──────────────┴─────────────┴────────────────┴─────────────────┘
```

---

## MVP: Minimal Viable Functionality

**Goal**: Enable basic Cortexis connectivity with core search functionality.

**Timeline Estimate**: Foundation phase

### MVP-1: HTTP API Server Framework

**Files to Create**:
- `src/api/server.ts` - Main Express server
- `src/api/routes/index.ts` - Route aggregator
- `src/api/middleware/cors.ts` - CORS configuration
- `src/api/middleware/error.ts` - Error handling
- `src/api/types.ts` - API type definitions

**Implementation**:
```typescript
// src/api/server.ts
import express from 'express';
import cors from 'cors';
import { createUnifiedMemory } from '../memory/index.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Shared memory instance
const memory = createUnifiedMemory();

// Mount routes
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ranger API on port ${PORT}`));
```

**Dependencies to Add**:
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "@types/express": "^4.17.21",
  "@types/cors": "^2.8.17"
}
```

### MVP-2: Collection Management (Simplified)

**Approach**: Use metadata-based virtual collections (single DB with `collection` field)

**Files to Create**:
- `src/api/services/collectionService.ts`
- `src/api/routes/collections.ts`

**Implementation**:
```typescript
// Collection stored as metadata on vectors
interface CollectionConfig {
  name: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dot';
  createdAt: string;
  lastUpdated: string;
}

// Store collection configs in SQLite (alongside graph.db)
// Use metadata.collection field for filtering searches
```

**Endpoints**:
| Method | Endpoint | Implementation |
|--------|----------|----------------|
| GET | `/api/collections` | Query collection configs table |
| POST | `/api/collections` | Insert collection config |
| GET | `/api/collections/:name` | Get config by name |
| DELETE | `/api/collections/:name` | Delete config + vectors |
| GET | `/api/collections/:name/stats` | Aggregate from vectors |

### MVP-3: Basic Search Endpoint

**Files to Create**:
- `src/api/routes/search.ts`

**Implementation**:
```typescript
// POST /api/collections/:name/search
app.post('/api/collections/:name/search', async (req, res) => {
  const { name } = req.params;
  const { query, limit = 10, attention_mechanism, use_gnn } = req.body;

  // Use existing UnifiedMemory.search() with collection filter
  const results = await memory.search(query, {
    k: limit,
    rerank: use_gnn,
    filters: { collection: name === 'all' ? undefined : name }
  });

  // Transform to Cortexis format
  res.json({
    results: results.map(r => ({
      id: r.id,
      score: r.combinedScore,
      metadata: { title: r.title, content: r.text, ...r.metadata },
      explanation: {
        attentionMechanism: attention_mechanism || 'Auto',
        gnnBoost: r.graphScore ? Math.round(r.graphScore * 100) : 0,
        searchTime: `${Date.now() - startTime}ms`
      }
    })),
    stats: {
      totalFound: results.length,
      searchTime: Date.now() - startTime,
      algorithm: use_gnn ? 'HNSW + GNN' : 'HNSW'
    }
  });
});
```

### MVP-4: Basic Metrics Endpoint

**Files to Create**:
- `src/api/routes/metrics.ts`

**Implementation**:
```typescript
// GET /api/metrics
app.get('/api/metrics', async (req, res) => {
  const stats = await memory.getStats();
  const cognitiveStats = memory.getCognitiveCapabilities();

  res.json({
    performance: {
      avgSearchTime: stats.vector.metrics?.averageSearchTime || 0,
      p95SearchTime: 0, // Would need histogram
      p99SearchTime: 0,
      throughput: 0,
      successRate: 100
    },
    learning: {
      gnnImprovement: stats.cognitive?.patternsLearned || 0,
      trainingIterations: stats.cognitive?.microLoraUpdates || 0,
      lastTrainingTime: new Date().toISOString(),
      attentionOverhead: 0,
      patternConfidence: 0.8
    },
    usage: {
      totalQueries: 0, // Needs counter
      queriesToday: 0,
      queriesPerHour: 0,
      activeUsers: 1,
      avgQueriesPerUser: 0,
      peakHour: '14:00'
    },
    collections: [], // From collection service
    storage: {
      totalVectors: stats.vector.totalVectors,
      totalDocuments: stats.graph.nodeCount,
      storageUsed: '0 MB',
      compressionRatio: 1.0
    }
  });
});
```

### MVP Checklist

- [ ] Create `src/api/` directory structure
- [ ] Install Express and middleware dependencies
- [ ] Implement basic Express server with CORS
- [ ] Create collection config SQLite table
- [ ] Implement GET/POST /collections endpoints
- [ ] Implement POST /collections/:name/search endpoint
- [ ] Implement GET /metrics endpoint
- [ ] Add `npm run api` script to package.json
- [ ] Add environment variable support (PORT, CORS_ORIGIN)
- [ ] Basic error handling middleware

---

## P1: Priority 1 Features

**Goal**: Full document management and chat functionality.

### P1-1: Document Upload & Processing

**Files to Create**:
- `src/api/routes/documents.ts`
- `src/api/services/uploadService.ts`
- `src/api/services/jobQueue.ts`

**Dependencies**:
```json
{
  "multer": "^1.4.5-lts.1",
  "@types/multer": "^1.4.11",
  "pdf-parse": "^1.1.1"
}
```

**Implementation**:
```typescript
// Job queue using SQLite
interface UploadJob {
  jobId: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  stage: 'parsing' | 'chunking' | 'embedding' | 'inserting' | 'learning';
  progress: number;
  vectorsAdded: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// POST /api/documents/upload
const upload = multer({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } });

app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  const { collection } = req.body;
  const file = req.file;

  // Create job
  const jobId = generateJobId();
  await createJob(jobId, 'queued', 'parsing', 0);

  // Start async processing
  processDocumentAsync(jobId, file, collection);

  res.json({ jobId, status: 'queued', stage: 'parsing', progress: 0, vectorsAdded: 0 });
});

// GET /api/documents/upload/:jobId/status
app.get('/api/documents/upload/:jobId/status', async (req, res) => {
  const job = await getJob(req.params.jobId);
  res.json(job);
});
```

### P1-2: Chat/RAG System

**Files to Create**:
- `src/api/routes/chat.ts`
- `src/api/services/chatService.ts`
- `src/api/services/llmService.ts`

**Implementation**:
```typescript
// Chat conversation storage (SQLite)
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  last_message_at INTEGER
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  role TEXT,
  content TEXT,
  sources_json TEXT,
  confidence REAL,
  search_time INTEGER,
  generation_time INTEGER,
  created_at INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

// LLM integration (configurable)
interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  const { message, collection, conversationId } = req.body;

  // 1. Search for relevant documents
  const searchStart = Date.now();
  const results = await memory.search(message, {
    k: 5,
    rerank: true,
    filters: collection ? { collection } : undefined
  });
  const searchTime = Date.now() - searchStart;

  // 2. Build RAG prompt
  const context = results.map(r => `[${r.title}]: ${r.text}`).join('\n\n');
  const prompt = `Based on the following context, answer the question.

Context:
${context}

Question: ${message}

Answer:`;

  // 3. Generate response via LLM
  const genStart = Date.now();
  const response = await llmService.generate(prompt);
  const generationTime = Date.now() - genStart;

  // 4. Record SONA trajectory for learning
  const trajectoryId = await memory.beginTrajectory(message);
  await memory.recordStep(trajectoryId, response, 0.8);
  memory.endTrajectory(trajectoryId, 0.8);

  // 5. Persist and respond
  const msgId = await saveMessage(conversationId, 'assistant', response, results);

  res.json({
    message: {
      id: msgId,
      role: 'assistant',
      content: response,
      sources: results.map(r => ({
        id: r.id,
        title: r.title,
        score: r.combinedScore,
        snippet: r.text.slice(0, 200),
        gnnBoost: Math.round((r.graphScore || 0) * 100)
      })),
      confidence: 0.87,
      searchTime,
      generationTime,
      timestamp: new Date()
    },
    conversationId: conversationId || generateConversationId()
  });
});
```

### P1-3: Chat History

**Implementation**:
```typescript
// GET /api/chat/history
app.get('/api/chat/history', async (req, res) => {
  const { id } = req.query;

  if (id) {
    const messages = await getMessagesByConversation(id);
    res.json(messages);
  } else {
    const conversations = await getAllConversations();
    res.json(conversations.flatMap(c => c.messages));
  }
});
```

### P1-4: Learning Insights

**Files to Create**:
- `src/api/routes/insights.ts`

**Implementation**:
```typescript
// GET /api/insights
app.get('/api/insights', async (req, res) => {
  const stats = await memory.getStats();

  const insights: LearningInsight[] = [];

  // Pattern-based insights from SONA
  if (stats.cognitive) {
    if (stats.cognitive.patternsLearned > 0) {
      insights.push({
        type: 'pattern',
        title: 'Query Patterns Detected',
        description: `System has learned ${stats.cognitive.patternsLearned} reasoning patterns`,
        value: stats.cognitive.patternsLearned,
        timestamp: new Date()
      });
    }

    if (stats.cognitive.microLoraUpdates > 0) {
      insights.push({
        type: 'improvement',
        title: 'Model Adaptation',
        description: `${stats.cognitive.microLoraUpdates} micro-LoRA updates applied`,
        value: stats.cognitive.microLoraUpdates,
        timestamp: new Date()
      });
    }
  }

  // Graph-based insights
  if (stats.graph.edgeCount > 0) {
    const avgConnections = stats.graph.edgeCount / Math.max(stats.graph.nodeCount, 1);
    insights.push({
      type: 'relationship',
      title: 'Knowledge Connectivity',
      description: `Average ${avgConnections.toFixed(1)} connections per document`,
      value: avgConnections,
      timestamp: new Date()
    });
  }

  res.json(insights);
});
```

### P1 Checklist

- [ ] Implement file upload with multer
- [ ] Create job queue system in SQLite
- [ ] Implement async document processing pipeline
- [ ] Add PDF parsing support
- [ ] Create chat service with conversation management
- [ ] Implement LLM service abstraction (Anthropic/OpenAI/Ollama)
- [ ] Create RAG pipeline using existing search
- [ ] Persist chat history in SQLite
- [ ] Implement GET /chat/history endpoint
- [ ] Implement GET /insights endpoint
- [ ] Integrate SONA trajectory recording with chat

---

## P2: Priority 2 Features

**Goal**: Enhanced functionality and optimization.

### P2-1: Multi-Database Collections

**Description**: Move from virtual collections to separate SQLite files per collection for better isolation and performance.

**Files to Modify**:
- `src/api/services/collectionService.ts`
- `src/memory/vectorStore.ts`

**Implementation**:
```typescript
// Collection isolation
class CollectionManager {
  private collections: Map<string, UnifiedMemory> = new Map();

  async getOrCreate(name: string, config: CollectionConfig): Promise<UnifiedMemory> {
    if (!this.collections.has(name)) {
      const memory = createUnifiedMemory({
        vectorConfig: { storagePath: `./data/${name}/vectors.db` },
        graphDataDir: `./data/${name}`,
        dimensions: config.dimension
      });
      this.collections.set(name, memory);
    }
    return this.collections.get(name)!;
  }
}
```

### P2-2: Real-time Metrics & Monitoring

**Description**: Add Prometheus-compatible metrics and real-time WebSocket updates.

**Files to Create**:
- `src/api/services/metricsService.ts`
- `src/api/routes/ws.ts`

**Dependencies**:
```json
{
  "prom-client": "^15.0.0",
  "ws": "^8.14.2"
}
```

### P2-3: Advanced Attention Mechanisms

**Description**: Expose all attention types from RuVector (@ruvector/attention).

**Implementation**:
```typescript
// Map Cortexis attention mechanisms to RuVector
const ATTENTION_MAP = {
  'FlashAttention': 'flash',
  'HyperbolicAttention': 'hyperbolic',
  'GraphAttention': 'graph',
  'CrossAttention': 'cross',
  'Auto': 'auto'
};
```

### P2-4: Batch Operations API

**Description**: Add bulk endpoints for efficiency.

**Endpoints**:
- `POST /api/documents/batch` - Bulk document upload
- `POST /api/collections/:name/search/batch` - Batch search

### P2-5: Authentication & Authorization

**Description**: Add optional API key authentication.

**Implementation**:
```typescript
// Simple API key auth
app.use('/api', (req, res, next) => {
  if (process.env.API_KEY_REQUIRED === 'true') {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
});
```

### P2-6: Export/Import

**Description**: Collection backup and restore.

**Endpoints**:
- `GET /api/collections/:name/export` - Export collection
- `POST /api/collections/:name/import` - Import collection

### P2 Checklist

- [ ] Implement per-collection isolated databases
- [ ] Add Prometheus metrics endpoint
- [ ] Implement WebSocket for real-time updates
- [ ] Add all attention mechanism mappings
- [ ] Implement batch document upload
- [ ] Implement batch search
- [ ] Add API key authentication (optional)
- [ ] Implement collection export
- [ ] Implement collection import
- [ ] Add rate limiting

---

## File Structure (Final)

```
src/
├── api/
│   ├── server.ts                 # MVP
│   ├── types.ts                  # MVP
│   ├── middleware/
│   │   ├── cors.ts               # MVP
│   │   ├── error.ts              # MVP
│   │   └── auth.ts               # P2
│   ├── routes/
│   │   ├── index.ts              # MVP
│   │   ├── collections.ts        # MVP
│   │   ├── search.ts             # MVP
│   │   ├── documents.ts          # P1
│   │   ├── chat.ts               # P1
│   │   ├── metrics.ts            # MVP
│   │   ├── insights.ts           # P1
│   │   └── ws.ts                 # P2
│   └── services/
│       ├── collectionService.ts  # MVP
│       ├── uploadService.ts      # P1
│       ├── jobQueue.ts           # P1
│       ├── chatService.ts        # P1
│       ├── llmService.ts         # P1
│       └── metricsService.ts     # P2
├── cli.ts                        # Existing
├── mcp/
│   └── server.ts                 # Existing
├── memory/                       # Existing (no changes)
├── ingestion/                    # Existing (no changes)
└── tools/                        # Existing (no changes)
```

---

## Package.json Updates

```json
{
  "scripts": {
    "api": "node dist/api/server.js",
    "api:dev": "tsx watch src/api/server.ts",
    "dev": "tsx src/cli.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/cli.js",
    "mcp": "node dist/mcp/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.11"
  }
}
```

---

## Environment Variables

```env
# API Configuration
PORT=3000
CORS_ORIGIN=http://localhost:5173

# LLM Configuration (P1)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=sk-...

# Optional: OpenAI
# LLM_PROVIDER=openai
# LLM_MODEL=gpt-4
# OPENAI_API_KEY=sk-...

# Optional: Ollama
# LLM_PROVIDER=ollama
# LLM_MODEL=llama3
# OLLAMA_BASE_URL=http://localhost:11434

# Security (P2)
API_KEY_REQUIRED=false
API_KEY=your-secret-key

# Storage
DATA_DIR=./data
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
```

---

## Testing Strategy

### Unit Tests
- Collection service CRUD operations
- Search result transformation
- Job queue state transitions
- Chat message persistence

### Integration Tests
- Full search flow (API → Memory → Response)
- Document upload → processing → search
- Chat flow (message → RAG → response)

### E2E Tests
- Cortexis frontend → Ranger API connectivity
- Terminal commands (from API docs)

---

## Migration from Existing Data

If you have existing data in `./ruvector.db`:

1. Create a "default" collection config
2. Add `collection: 'default'` to all existing vector metadata
3. Or keep single-DB mode and treat all searches as "all" collection

---

## Summary

| Phase | Scope | Key Deliverables |
|-------|-------|------------------|
| **MVP** | Core connectivity | HTTP API, Collections, Search, Metrics |
| **P1** | Full functionality | Upload, Chat/RAG, History, Insights |
| **P2** | Optimization | Multi-DB, WebSocket, Auth, Batch ops |

The plan maximizes reuse of existing Ranger code while adding the minimal new components needed for Cortexis integration.

---

## Alignment with Ranger README.md

This plan maintains full alignment with Ranger's core mission as a **Research Knowledge Manager**:

| README Feature | Integration Approach |
|----------------|---------------------|
| CLI for ingestion | Keep as-is; API adds parallel path |
| MCP server for Claude agents | Keep as-is; shared UnifiedMemory |
| RuVector database | Core of all API operations |
| SONA learning | Integrated into chat for trajectory learning |
| GNN reranking | Exposed via `use_gnn` search parameter |
| Claude-Flow integration | MCP server continues to work alongside API |

**Key Principle**: The HTTP API is an *additional interface*, not a replacement. The CLI, MCP server, and new REST API all share the same `UnifiedMemory` core.

---

## Quick Start (After Implementation)

```bash
# 1. Build the project
npm run build

# 2. Start the API server
npm run api

# 3. Verify it's running
curl http://localhost:3000/api/metrics

# 4. Create a collection
curl -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -d '{"name": "docs", "dimension": 384, "metric": "cosine"}'

# 5. Point Cortexis to your API
# In Cortexis .env:
# VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Open Questions for Implementation

1. **LLM Provider Default**: Should we default to Anthropic (Claude), OpenAI, or local (Ollama)?
2. **Embedding Model**: Currently uses local n-gram (384 dims). Should we add OpenAI/HuggingFace embeddings for higher quality?
3. **Collection Isolation**: Start with virtual collections (metadata-based) or full isolation (separate DBs)?
4. **Rate Limiting**: Needed for MVP or defer to P2?

---

## Next Steps

1. Review this plan and approve approach
2. Install dependencies: `npm install express cors`
3. Create `src/api/` directory structure
4. Implement MVP endpoints
5. Test with Cortexis frontend
