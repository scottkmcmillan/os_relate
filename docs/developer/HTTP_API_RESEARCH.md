# HTTP API Server Requirements for Ranger - Research Summary

## Executive Summary

This research document provides comprehensive specifications for adding an HTTP/REST API server to Ranger (Research Knowledge Manager). The API will enable integration with Cortexis while maintaining compatibility with the existing MCP server and CLI interfaces.

**Key Recommendation: Use Hono.js as the HTTP framework**

---

## 1. HTTP Framework Selection

### Recommended: Hono.js

**Why Hono?**

1. **Already Installed**: Via @modelcontextprotocol/sdk → @hono/node-server
   - Zero additional dependencies required
   - Proven compatibility with MCP SDK

2. **Perfect TypeScript Support**
   - Built from ground up for TypeScript
   - Strong type inference for routes and handlers
   - No type definition mismatches

3. **Minimalist Design**
   - Only 6-8 KB core size
   - Matches Ranger's cognitive architecture philosophy
   - Easy to audit and maintain

4. **Performance**
   - 2000-5000 req/s on Node.js
   - Sufficient for document processing workloads
   - Better than Express for streaming file uploads

5. **Modern Patterns**
   - Native async/await support
   - Streaming-friendly architecture
   - Edge-ready for future serverless scaling

### Framework Comparison

| Criteria | Express | Fastify | Hono | Koa |
|----------|---------|---------|------|-----|
| Performance | 600 req/s | 50k+ req/s | 2-5k req/s | 2.5k req/s |
| TypeScript | 3/5 | 5/5 | 5/5 | 3/5 |
| Already Installed | 4/5 (transitive) | 0/5 | 5/5 | 0/5 |
| Ecosystem | 5/5 | 3/5 | 2/5 | 2/5 |
| Streaming | 2/5 | 5/5 | 4/5 | 3/5 |
| Setup Speed | 3/5 | 4/5 | 5/5 | 3/5 |
| Future-Proof | 2/5 | 4/5 | 5/5 | 2/5 |

**Alternative:** Fastify if performance becomes critical (>5k req/s) or ecosystem needs grow significantly.

---

## 2. File Upload with Progress Tracking

### Architecture Pattern

```
Client HTTP Request
    ↓
[CORS Middleware] ← Validates origin
    ↓
[Route Handler] ← Receives request
    ↓
[Stream Pipeline] ← Memory-efficient processing
  ├─ Request Body Stream
  ├─ Progress Transform Stream (tracks bytes)
  └─ File Write Stream (saves to temp)
    ↓
[Progress API] ← GET /api/documents/upload/:uploadId/progress
    ↓
[Job Queue] ← Sends to async processing
    ↓
[Response 202 Accepted]
```

### Key Implementation Details

1. **Streaming Strategy**
   - Use Node.js streams (no in-memory loading)
   - TransformStream for progress tracking
   - Automatic cleanup of temp files on failure

2. **Progress Tracking**
   - Content-Length header required
   - Real-time percentage calculation
   - In-memory map (production: Redis)
   - Custom X-Upload-Progress header in responses

3. **File Limits**
   - Default: 500 MB maximum
   - Configurable via environment variable
   - Return 413 Payload Too Large on exceed

4. **Supported Formats**
   - multipart/form-data for file uploads
   - application/json for metadata
   - Content-Disposition header for filename extraction

### Code Structure

```
src/api/
├── middleware/
│   └── multipart.ts (streaming upload handler)
├── routes/
│   └── documents.ts (POST /api/documents/upload)
└── types/
    └── uploads.ts (UploadedFile, UploadProgress)
```

---

## 3. Async Job Queue for Document Processing

### Architecture Pattern

```
File Upload (202 Accepted)
    ↓
Temp File Saved
    ↓
Job Queued (Redis)
    ↓
Return jobId to Client
    ↓
[Job Queue Worker] (separate process/thread)
  ├─ Parse document
  ├─ Embed vectors
  ├─ Build knowledge graph
  └─ Store in UnifiedMemory
    ↓
Job Completed (Database updated)
    ↓
Client Polls: GET /api/jobs/:jobId
    ↓
Return Status + Result
```

### Technology Stack

**Primary: Bee-Queue (Redis-backed)**
- Built on Redis, simpler than Bull
- Automatic retry with exponential backoff
- Event-based monitoring
- Configurable concurrency (default: 4)

**Fallback: In-Memory (Development)**
- No external dependencies
- Simple Map-based implementation
- Perfect for local testing

### Configuration

```env
JOB_TIMEOUT_MS=300000        # 5 minutes
JOB_MAX_RETRIES=3             # Retry failed jobs
JOB_CONCURRENCY=4             # Process 4 docs in parallel
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Job States

- `queued`: Waiting to process
- `active`: Currently processing
- `succeeded`: Completed successfully
- `failed`: Failed (eligible for retry)

### Processing Pipeline

1. Parse document (MD, JSON, TXT)
2. Extract title, sections, entities
3. Create Document object
4. Add to vector store (embedding)
5. Build knowledge graph (optional)
6. Add nodes and edges to graph store
7. Update metadata with processing stats
8. Cleanup temp file

---

## 4. CORS Configuration

### Requirements for Cortexis

```typescript
// Allowed Origins (Development)
- http://localhost:3000
- http://localhost:3001
- http://localhost:5173    // Vite dev server
- http://127.0.0.1:3000
- http://127.0.0.1:3001

// Allowed Methods
- GET, POST, PUT, DELETE, PATCH, OPTIONS

// Allowed Headers
- Content-Type
- Authorization
- X-Upload-ID (custom)
- X-API-Key (custom)

// Exposed Headers
- X-Total-Count (pagination)
- X-Job-ID (job tracking)
- X-Upload-Progress
- Content-Range (for resume)

// Credentials
- true (for session/auth)

// Cache Duration
- 86400 seconds (24 hours)
```

### Hono CORS Middleware

```typescript
import { cors } from '@hono/cors';

const corsMiddleware = cors({
  origin: (origin) => {
    if (process.env.NODE_ENV !== 'production') return true;
    return allowedOrigins.includes(origin);
  },
  credentials: true,
  maxAge: 86400
});

app.use('/api/*', corsMiddleware);
```

### Automatic Preflight Handling

Hono automatically responds to OPTIONS requests with appropriate CORS headers. No manual implementation needed.

---

## 5. Error Response Format

### Standard Error Schema

```typescript
{
  "error": "error_code",                    // snake_case error identifier
  "message": "Human-readable message",      // For logging/display
  "statusCode": 400,                        // HTTP status code
  "timestamp": "2025-12-23T10:30:45.123Z", // ISO 8601
  "path": "/api/documents/upload",          // Request path
  "method": "POST",                         // HTTP method
  "requestId": "req-1734951045123-xxx",    // Correlation ID
  "details": { /* additional context */ }, // Error-specific details
  "cause": "Root error message"             // For debugging
}
```

### Error Code to HTTP Status Mapping

| Error Code | Status | Description |
|-----------|--------|-------------|
| invalid_input | 400 | Bad request format |
| validation_error | 400 | Field validation failed |
| file_too_large | 413 | Exceeds size limit |
| unauthorized | 401 | Missing/invalid auth |
| not_found | 404 | Resource not found |
| conflict | 409 | Duplicate/conflict |
| server_error | 500 | Internal error |
| job_failed | 500 | Job processing error |

### Middleware Implementation

Use Hono's `onError()` handler to catch all errors and format consistently:

```typescript
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(createErrorResponse(...), statusCode);
  }
  // Handle other error types...
});
```

---

## 6. MCP Server Integration

### Unified Memory Architecture

**Goal:** Single source of truth for document storage

```
┌─────────────────────────────────────┐
│    UnifiedMemory (Singleton)        │
│  - Vector Store (RuVector)          │
│  - Graph Store (SQLite)             │
│  - Cognitive Engine (SONA/GNN)      │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┐
       ↓       ↓       ↓
    CLI      HTTP     MCP
   Server    API      Server
```

### Implementation Pattern

```typescript
// src/api/memory/shared.ts
let instance: UnifiedMemory | null = null;

export function initializeSharedMemory(): UnifiedMemory {
  if (!instance) {
    instance = createUnifiedMemory({
      graphDataDir: process.env.GRAPH_DATA_DIR,
      vectorConfig: { dbPath: process.env.RUVECTOR_DB }
    });
  }
  return instance;
}

export function getSharedMemory(): UnifiedMemory {
  if (!instance) throw new Error('Not initialized');
  return instance;
}
```

### Both Servers Use Same Instance

**HTTP Server:**
```typescript
app.use('*', async (c, next) => {
  initializeSharedMemory();
  c.set('memory', getSharedMemory());
  await next();
});
```

**MCP Server:**
```typescript
server.tool('ruvector_hybrid_search', ..., async (args) => {
  initializeSharedMemory();
  const memory = getSharedMemory(); // Same instance!
  // Use memory...
});
```

### Benefits

1. **Single Database**: All changes visible everywhere
2. **Atomic Operations**: Updates atomic across both APIs
3. **Performance**: No network overhead between services
4. **Simplicity**: Same code path for CLI, HTTP, MCP
5. **Consistency**: SONA learning applies to all interfaces

---

## 7. API Endpoint Mapping

### Document Management

```
POST   /api/documents/upload              Upload document (returns jobId)
GET    /api/documents                     List documents
GET    /api/documents/:id                 Get document details
DELETE /api/documents/:id                 Delete document
POST   /api/documents                     Add document directly
```

### Search

```
POST   /api/search                        Hybrid search (vector + graph)
POST   /api/search/graph                  Graph query (Cypher-like)
POST   /api/search/traverse               Graph traversal
POST   /api/search/route                  Semantic routing
```

### Job Management

```
GET    /api/jobs/:jobId                   Get job status
POST   /api/jobs/:jobId/retry             Retry failed job
GET    /api/jobs                          List all jobs
```

### Cognitive Features

```
POST   /api/cognitive/trajectory/start    Begin learning trajectory
POST   /api/cognitive/trajectory/:id/step Record step
POST   /api/cognitive/trajectory/:id/end  End trajectory
GET    /api/cognitive/patterns            Find learned patterns
```

### Health & Status

```
GET    /health                            Server health check
GET    /api/status                        API status + memory stats
```

---

## 8. Directory Structure

```
src/
├── api/                          # HTTP API server
│   ├── server.ts                # Hono app initialization
│   ├── middleware/
│   │   ├── cors.ts             # CORS setup
│   │   ├── errors.ts           # Error handling
│   │   └── multipart.ts        # File upload streaming
│   ├── routes/
│   │   ├── documents.ts        # Document endpoints
│   │   ├── search.ts           # Search endpoints
│   │   ├── jobs.ts             # Job status endpoints
│   │   └── cognitive.ts        # Cognitive endpoints
│   ├── jobs/
│   │   ├── queue.ts            # Job queue (Bee-Queue)
│   │   └── queue-memory.ts     # Fallback in-memory
│   ├── memory/
│   │   ├── shared.ts           # Singleton UnifiedMemory
│   │   └── coherence.ts        # Locking for consistency
│   ├── types/
│   │   ├── errors.ts           # Error types
│   │   └── uploads.ts          # Upload types
│   └── events/
│       └── emitter.ts          # Shared event bus
│
├── mcp/
│   └── server.ts               # MCP server (modified)
│
├── memory/                       # Existing UnifiedMemory
│   ├── index.ts
│   ├── vectorStore.ts
│   ├── graphStore.ts
│   ├── cognitive.ts
│   └── ...
│
├── ingestion/                    # Existing document parsing
│   ├── reader.ts
│   ├── parser.ts
│   └── graphBuilder.ts
│
└── cli.ts                        # Existing CLI (unchanged)
```

---

## 9. Dependencies to Add

```json
{
  "dependencies": {
    "@hono/cors": "^0.1.12",
    "@hono/node-server": "^1.19.7",
    "bee-queue": "^1.3.3",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/bee-queue": "^1.3.3",
    "concurrently": "^8.2.1"
  }
}
```

Note: `@hono/node-server` and `hono` already installed via MCP SDK.

---

## 10. Development Workflow

### Local Development

```bash
# Terminal 1: HTTP API (with hot reload)
npm run api:dev

# Terminal 2: MCP Server
npm run mcp

# Both at once
npm run dev:both
```

### Environment Setup

```bash
# .env.local (development)
NODE_ENV=development
RUVECTOR_DB=./ruvector.db
GRAPH_DATA_DIR=./data/graph
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Testing File Upload

```bash
# Upload a document
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Content-Type: application/pdf" \
  --data-binary @research.pdf

# Check upload progress
curl http://localhost:3000/api/documents/upload/{uploadId}/progress

# Check job status
curl http://localhost:3000/api/jobs/{jobId}

# Search after processing
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"machine learning","k":10}'
```

---

## 11. Production Considerations

### Docker Deployment

Use docker-compose to run:
- API server (port 3000)
- MCP server (stdio)
- Redis (port 6379)

All share same data volumes.

### Scaling

1. **Horizontal:** Run multiple API instances behind load balancer
2. **Queue:** Redis shared across all instances
3. **Storage:** Shared RuVector.db and graph directory

### Security

- CORS origin whitelist in production
- API key authentication (optional add-on)
- Request rate limiting (optional)
- HTTPS in production

---

## 12. Success Criteria

The HTTP API implementation will be successful when:

1. Accepts file uploads with progress tracking
2. Queues async document processing
3. Supports CORS for Cortexis frontend
4. Provides consistent error responses
5. Shares UnifiedMemory with MCP server
6. Maintains data consistency
7. Handles 500+ MB files efficiently
8. Provides job status polling
9. Supports search and graph queries
10. Integrates with cognitive learning

---

## 13. Next Steps

1. **Create API server structure** (src/api/server.ts)
2. **Implement file upload handler** with progress tracking
3. **Setup job queue** with Bee-Queue or in-memory fallback
4. **Create shared memory layer** (src/api/memory/shared.ts)
5. **Implement core routes** (documents, search, jobs)
6. **Update MCP server** to use shared memory
7. **Add tests** for file uploads and job processing
8. **Create Docker configuration**
9. **Update package.json** with new dependencies
10. **Document API with OpenAPI/Swagger** (optional)

---

## References

- Hono Documentation: https://hono.dev
- @hono/node-server: https://github.com/honojs/node-server
- @hono/cors: https://github.com/honojs/middleware
- Bee-Queue: https://github.com/bee-queue/bee-queue
- Node.js Streams: https://nodejs.org/api/stream.html
- Model Context Protocol: https://modelcontextprotocol.io
