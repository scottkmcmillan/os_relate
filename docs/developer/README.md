# HTTP API Server Research & Implementation Guide

This directory contains comprehensive research and implementation specifications for adding an HTTP/REST API server to Ranger (Research Knowledge Manager).

## Documentation Index

### 1. [HTTP_API_RESEARCH.md](./HTTP_API_RESEARCH.md) - Executive Summary
**The starting point** - High-level overview of requirements and framework selection.

**Contents:**
- HTTP framework comparison (Express, Fastify, Hono, Koa)
- Recommendation: **Hono.js** (already installed via MCP SDK)
- Key architectural patterns
- Success criteria
- 13-point implementation roadmap

**Reading time:** 10 minutes

---

### 2. [FILE_UPLOAD_IMPLEMENTATION.md](./FILE_UPLOAD_IMPLEMENTATION.md) - File Upload & Job Queue
**Deep dive into streaming uploads and async processing.**

**Contents:**
- Streaming multipart file upload handler
- Progress tracking implementation
- Job queue architecture (Bee-Queue + Redis fallback)
- In-memory job queue for development
- Document processing pipeline
- Code examples with full TypeScript types

**Reading time:** 15 minutes

---

### 3. [CORS_ERROR_HANDLING.md](./CORS_ERROR_HANDLING.md) - Cross-Origin & Error Responses
**CORS configuration and standardized error handling.**

**Contents:**
- CORS middleware setup with Hono
- Cortexis frontend origin whitelisting
- Standard error response schema
- Error code to HTTP status mapping
- Error middleware implementation
- Request/response examples

**Reading time:** 10 minutes

---

### 4. [MCP_HTTP_INTEGRATION.md](./MCP_HTTP_INTEGRATION.md) - Server Integration
**How HTTP API and MCP server share memory and coordinate.**

**Contents:**
- Unified memory singleton pattern
- Shared memory initialization
- Running both servers concurrently
- Docker composition setup
- Cross-service communication patterns
- Memory coherence strategy with locking
- Environment variable configuration

**Reading time:** 12 minutes

---

## Quick Start Overview

### Framework Decision: Hono.js

**Why Hono?**

```
Already Installed:     Via @modelcontextprotocol/sdk → @hono/node-server
Perfect TypeScript:    Built from ground up for TypeScript
Minimalist Design:     Only 6-8 KB core size
Performance:           2000-5000 req/s on Node.js
Modern Patterns:       Native async/await, streaming-friendly
```

**Comparison:**
| Framework | Performance | TypeScript | Already Installed | Best For |
|-----------|------------|-----------|-------------------|----------|
| Express | 600 req/s | 3/5 | Transitive | Traditional apps |
| Fastify | 50k+ req/s | 5/5 | No | High-performance APIs |
| **Hono** | 2-5k req/s | 5/5 | **Yes** | **REST APIs (Recommended)** |
| Koa | 2.5k req/s | 3/5 | No | Middleware-heavy apps |

---

## Architecture Overview

### Unified Memory Stack

```
┌──────────────────────────────────────────┐
│       UnifiedMemory (Singleton)          │
│  - RuVector (Vector Store)               │
│  - GraphStore (SQLite)                   │
│  - CognitiveEngine (SONA/GNN)            │
└──────────────────┬───────────────────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ↓           ↓           ↓
      CLI        HTTP         MCP
    Server       API         Server
   (existing)  (new!)    (existing)
```

**Key Benefits:**
- Single database for all interfaces
- Atomic operations across APIs
- No network overhead
- SONA learning applies everywhere
- Consistent state

---

## File Structure

```
src/
├── api/                      # NEW: HTTP API Server
│   ├── server.ts            # Hono app + initialization
│   ├── middleware/
│   │   ├── cors.ts         # CORS setup
│   │   ├── errors.ts       # Error handling
│   │   └── multipart.ts    # File upload streaming
│   ├── routes/
│   │   ├── documents.ts    # Document endpoints
│   │   ├── search.ts       # Search endpoints
│   │   ├── jobs.ts         # Job management
│   │   └── cognitive.ts    # Learning endpoints
│   ├── jobs/
│   │   ├── queue.ts        # Bee-Queue (Redis)
│   │   └── queue-memory.ts # Development fallback
│   ├── memory/
│   │   ├── shared.ts       # Singleton instance
│   │   └── coherence.ts    # Locking mechanism
│   ├── types/
│   │   ├── errors.ts       # Error types
│   │   └── uploads.ts      # Upload types
│   └── events/
│       └── emitter.ts      # Event bus
│
├── mcp/
│   └── server.ts           # MODIFIED: Use shared memory
│
├── memory/                  # EXISTING: UnifiedMemory
├── ingestion/              # EXISTING: Document parsing
└── cli.ts                  # EXISTING: CLI (unchanged)
```

---

## API Endpoints Overview

### Documents
```
POST   /api/documents/upload              Upload file with progress tracking
GET    /api/documents                     List all documents
GET    /api/documents/:id                 Get document details
DELETE /api/documents/:id                 Delete document
```

### Search
```
POST   /api/search                        Hybrid search (vector + graph)
POST   /api/search/graph                  Graph query
POST   /api/search/traverse               Graph traversal
POST   /api/search/route                  Semantic routing
```

### Jobs
```
GET    /api/jobs/:jobId                   Get job status
POST   /api/jobs/:jobId/retry             Retry failed job
GET    /api/jobs                          List jobs
```

### Cognitive Learning
```
POST   /api/cognitive/trajectory/start    Start learning trajectory
POST   /api/cognitive/trajectory/:id/step Record step
POST   /api/cognitive/trajectory/:id/end  End trajectory
GET    /api/cognitive/patterns            Find patterns
```

### Health
```
GET    /health                            Server status
GET    /api/status                        Memory stats
```

---

## Key Implementation Patterns

### 1. File Upload with Progress

```
Request → [Streaming] → [Progress Tracking] → [File Save] → [Job Queue]
                ↓
         Real-time percentage
         via GET /upload/:id/progress
```

**Features:**
- Memory-efficient streaming
- Real-time progress updates
- Automatic cleanup on failure
- 500 MB size limit (configurable)

### 2. Async Document Processing

```
Upload (202 Accepted) → Job Queued (Redis) → Processing
                                              │
                                          Client polls
                                         GET /jobs/:id
```

**Features:**
- Non-blocking response
- Automatic retry (3x with backoff)
- Configurable concurrency (4 parallel)
- 5 minute timeout per document

### 3. CORS for Cortexis

```
Preflight OPTIONS → [CORS Middleware] → Approved Origins
                  → Allowed Headers
                  → Allowed Methods
```

**Development:** All origins allowed
**Production:** Whitelist enforced

### 4. Shared Memory Architecture

```
HTTP Request → [Route Handler] → [getSharedMemory()] → Database
MCP Tool    → [Tool Handler]   → [getSharedMemory()] → Database
```

**Thread-safe:** Memory locking prevents race conditions

---

## Error Response Format

All errors follow a consistent schema:

```json
{
  "error": "error_code",
  "message": "Human-readable message",
  "statusCode": 400,
  "timestamp": "2025-12-23T10:30:45.123Z",
  "path": "/api/documents/upload",
  "method": "POST",
  "requestId": "req-1234-5678",
  "details": { /* additional context */ },
  "cause": "Root cause message"
}
```

**Error Codes:**
- `400`: invalid_input, validation_error, file_too_large
- `401`: unauthorized, invalid_api_key
- `404`: not_found, document_not_found
- `409`: conflict, duplicate_document
- `500`: server_error, job_failed, processing_error

---

## Dependencies to Add

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

**Note:** Hono and @hono/node-server already installed via MCP SDK

---

## Development Commands

```bash
# Run HTTP API with hot reload
npm run api:dev

# Run MCP server
npm run mcp

# Run both concurrently
npm run dev:both

# Build for production
npm run build

# Run tests
npm run test
```

---

## Configuration

```env
# Server
NODE_ENV=development
API_PORT=3000

# Storage
RUVECTOR_DB=./ruvector.db
GRAPH_DATA_DIR=./data/graph

# Job Queue (if using Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
JOB_TIMEOUT_MS=300000
JOB_MAX_RETRIES=3
JOB_CONCURRENCY=4

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=true
```

---

## Success Criteria

Implementation is complete when:

1. ✅ File uploads stream efficiently (no full in-memory load)
2. ✅ Progress tracking works via polling endpoint
3. ✅ Document processing queued asynchronously
4. ✅ Job status retrievable via polling
5. ✅ CORS enabled for Cortexis frontend
6. ✅ Standard error responses for all failures
7. ✅ Shared memory between HTTP and MCP servers
8. ✅ No data loss on processing failures
9. ✅ Automatic job retries with backoff
10. ✅ Graph building integrated with uploads

---

## Next Steps Implementation Sequence

1. **Create API server structure** (src/api/server.ts)
   - Initialize Hono app
   - Setup CORS middleware
   - Setup error handling
   - Health check endpoint

2. **Implement file upload** (src/api/middleware/multipart.ts)
   - Streaming handler
   - Progress tracking
   - Temp file management

3. **Setup job queue** (src/api/jobs/queue.ts)
   - Bee-Queue with Redis
   - Document processing logic
   - Job state management

4. **Create document routes** (src/api/routes/documents.ts)
   - POST /upload
   - GET /upload/:id/progress
   - GET /documents

5. **Implement search routes** (src/api/routes/search.ts)
   - Hybrid search
   - Graph queries
   - Traversal

6. **Create shared memory layer** (src/api/memory/shared.ts)
   - Singleton initialization
   - MCP integration

7. **Update MCP server** (src/mcp/server.ts)
   - Use shared memory
   - Ensure compatibility

8. **Add tests**
   - Upload tests
   - Job queue tests
   - CORS tests
   - Integration tests

9. **Docker setup**
   - Dockerfile
   - docker-compose.yml
   - Redis container

10. **Documentation**
    - OpenAPI/Swagger (optional)
    - Deployment guide
    - Troubleshooting

---

## References

### Frameworks
- [Hono Documentation](https://hono.dev)
- [@hono/node-server](https://github.com/honojs/node-server)
- [@hono/cors](https://github.com/honojs/middleware)

### Job Queue
- [Bee-Queue](https://github.com/bee-queue/bee-queue)
- [Bull](https://github.com/OptimalBits/bull) (alternative)

### Node.js APIs
- [Streams](https://nodejs.org/api/stream.html)
- [File System](https://nodejs.org/api/fs.html)
- [HTTP](https://nodejs.org/api/http.html)

### Standards
- [Model Context Protocol](https://modelcontextprotocol.io)
- [CORS Specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [REST API Best Practices](https://restfulapi.net/)

---

## Related Documentation

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Full endpoint documentation
- [CORTEXIS_DEVELOPMENT_PLAN.md](./CORTEXIS_DEVELOPMENT_PLAN.md) - Cortexis integration details

---

## Questions?

Refer to the detailed guides:
- **Framework choice?** → See HTTP_API_RESEARCH.md
- **File uploads?** → See FILE_UPLOAD_IMPLEMENTATION.md
- **CORS/Errors?** → See CORS_ERROR_HANDLING.md
- **Integration?** → See MCP_HTTP_INTEGRATION.md

---

**Document Status:** Complete Research & Specifications
**Target Implementation:** Ready for development
**Last Updated:** 2025-12-23
