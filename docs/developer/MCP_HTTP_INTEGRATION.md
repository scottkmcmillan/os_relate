# MCP Server and HTTP API Integration

## 1. Unified Memory Sharing Architecture

### Shared Memory Layer

```typescript
// src/api/memory/shared.ts

import { UnifiedMemory, createUnifiedMemory } from '../../memory/index.js';

/**
 * Singleton instance of UnifiedMemory shared between:
 * - HTTP API server (REST endpoints)
 * - MCP server (tool handlers)
 * - CLI (command handlers)
 */

let sharedMemoryInstance: UnifiedMemory | null = null;

export function initializeSharedMemory(): UnifiedMemory {
  if (!sharedMemoryInstance) {
    sharedMemoryInstance = createUnifiedMemory({
      graphDataDir: process.env.GRAPH_DATA_DIR || './data/graph',
      vectorConfig: {
        dbPath: process.env.RUVECTOR_DB || './ruvector.db'
      }
    });
  }
  return sharedMemoryInstance;
}

export function getSharedMemory(): UnifiedMemory {
  if (!sharedMemoryInstance) {
    throw new Error('Shared memory not initialized. Call initializeSharedMemory() first.');
  }
  return sharedMemoryInstance;
}

export function isMemoryInitialized(): boolean {
  return sharedMemoryInstance !== null;
}
```

### HTTP Server Integration

```typescript
// src/api/server.ts

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { initializeSharedMemory, getSharedMemory } from './memory/shared.js';
import { setupCorsMiddleware } from './middleware/cors.js';
import { setupErrorHandling } from './middleware/errors.js';
import documentRoutes from './routes/documents.js';
import searchRoutes from './routes/search.js';
import jobRoutes from './routes/jobs.js';

const app = new Hono();

// Middleware
setupCorsMiddleware(app);
setupErrorHandling(app);

// Initialize shared memory on first request
app.use('*', async (c, next) => {
  initializeSharedMemory();
  // Attach memory to context for easy access
  c.set('memory', getSharedMemory());
  await next();
});

// Routes
app.route('/api/documents', documentRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/jobs', jobRoutes);

// Health check
app.get('/health', async (c) => {
  const memory = getSharedMemory();
  const stats = await memory.getStats();

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    memory: {
      documents: stats.vector.count,
      graphNodes: stats.graph.nodeCount,
      graphEdges: stats.graph.edgeCount
    }
  });
});

export async function startServer(port = 3000): Promise<void> {
  console.log(`Starting Ranger HTTP API on http://localhost:${port}/api`);

  serve({
    fetch: app.fetch,
    port
  });
}
```

### MCP Server Integration

```typescript
// src/mcp/server.ts (Modified)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initializeSharedMemory, getSharedMemory } from '../api/memory/shared.js';

const server = new McpServer({
  name: 'ruvector-memory',
  version: '0.2.0'
});

// Initialize shared memory on MCP server startup
let initialized = false;

function ensureMemoryInitialized() {
  if (!initialized) {
    initializeSharedMemory();
    initialized = true;
  }
}

// All existing MCP tools now use getSharedMemory()

server.tool(
  'ruvector_hybrid_search',
  { /* schema */ },
  async ({ query, k, vectorWeight, includeRelated, graphDepth, rerank, format }) => {
    ensureMemoryInitialized();
    const memory = getSharedMemory(); // Shared instance!

    const searchOptions = {
      k,
      vectorWeight,
      includeRelated,
      graphDepth,
      rerank
    };

    const results = await memory.search(query, searchOptions);
    // ... rest of implementation
  }
);

server.tool(
  'ruvector_add_document',
  { /* schema */ },
  async ({ id, title, text, source, category, tags }) => {
    ensureMemoryInitialized();
    const memory = getSharedMemory();

    const document = {
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
        documentId: docId
      }, null, 2))
    };
  }
);

// Start MCP server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## 2. Running Both Servers Concurrently

### npm scripts

```json
{
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/cli.js",
    "mcp": "node dist/mcp/server.js",
    "api": "tsx src/api/server.ts",
    "api:dev": "NODE_ENV=development tsx src/api/server.ts",
    "dev:both": "concurrently \"npm run mcp\" \"npm run api:dev\" --names MCP,API",
    "test": "vitest"
  }
}
```

### Docker Composition

```dockerfile
# Dockerfile

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY tsconfig.json .
COPY src ./src

RUN npm run build

# Run both services via supervisor or docker-compose
CMD ["sh", "-c", "node dist/mcp/server.js & node dist/api/server.js & wait"]
```

```yaml
# docker-compose.yml

version: '3.8'

services:
  ranger-api:
    build: .
    environment:
      - NODE_ENV=production
      - RUVECTOR_DB=/data/ruvector.db
      - GRAPH_DATA_DIR=/data/graph
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    depends_on:
      - redis

  ranger-mcp:
    build: .
    environment:
      - NODE_ENV=production
      - RUVECTOR_DB=/data/ruvector.db
      - GRAPH_DATA_DIR=/data/graph
    volumes:
      - ./data:/data
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"

volumes:
  redis-data:
```

## 3. Cross-Service Communication Patterns

### Pattern 1: HTTP API Calls from MCP Tools

```typescript
// If MCP tools need to call HTTP endpoints

import fetch from 'node-fetch';

async function callHttpEndpoint(path: string, options?: RequestInit) {
  const response = await fetch(`http://localhost:3000/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Call': 'true', // Mark internal calls
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

server.tool(
  'ruvector_trigger_processing',
  { documentId: z.string() },
  async ({ documentId }) => {
    // Call HTTP API from MCP
    const result = await callHttpEndpoint('/documents/process', {
      method: 'POST',
      body: JSON.stringify({ documentId })
    });

    return {
      content: toTextContent(JSON.stringify(result, null, 2))
    };
  }
);
```

### Pattern 2: Shared Event Emitter

```typescript
// src/api/events/emitter.ts

import { EventEmitter } from 'events';

export const sharedEvents = new EventEmitter();

// HTTP API emits events when documents are processed
export function emitDocumentProcessed(event: {
  documentId: string;
  title: string;
  nodeCount: number;
}) {
  sharedEvents.emit('document:processed', event);
}

// MCP tools can listen
function setupMcpEventListeners() {
  sharedEvents.on('document:processed', (event) => {
    console.log(`[MCP] Document processed: ${event.documentId}`);
  });
}
```

```typescript
// In HTTP route handler
documentRoutes.post('/documents/process', async (c) => {
  try {
    const memory = c.get('memory');
    const body = await c.req.json();

    // Process document...
    const result = await processDocument(body.documentId, memory);

    // Emit event for MCP tools
    emitDocumentProcessed({
      documentId: result.documentId,
      title: result.title,
      nodeCount: result.nodeCount
    });

    return c.json(result);
  } catch (error) {
    throw error;
  }
});
```

## 4. API Routes Mapping to MCP Tools

### Document Management

| HTTP Route | Method | MCP Tool | Purpose |
|-----------|--------|----------|---------|
| `/documents` | GET | ruvector_stats | List documents |
| `/documents` | POST | ruvector_add_document | Add document |
| `/documents/:id` | GET | - | Get document details |
| `/documents/:id` | DELETE | ruvector_delete_document | Delete document |
| `/documents/upload` | POST | - | Upload file (queues processing) |

### Search

| HTTP Route | Method | MCP Tool | Purpose |
|-----------|--------|----------|---------|
| `/search` | POST | ruvector_hybrid_search | Hybrid search |
| `/search/graph` | POST | ruvector_graph_query | Graph query |
| `/search/traverse` | POST | ruvector_graph_traverse | Graph traversal |
| `/search/route` | POST | ruvector_route | Semantic routing |

### Cognitive Features

| HTTP Route | Method | MCP Tool | Purpose |
|-----------|--------|----------|---------|
| `/cognitive/trajectory/start` | POST | cognitive_begin_trajectory | Start trajectory |
| `/cognitive/trajectory/:id/step` | POST | cognitive_record_step | Record step |
| `/cognitive/trajectory/:id/end` | POST | cognitive_end_trajectory | End trajectory |
| `/cognitive/patterns` | GET | cognitive_find_patterns | Find patterns |

### Job Management

| HTTP Route | Method | Purpose |
|-----------|--------|---------|
| `/jobs/:jobId` | GET | Get job status |
| `/jobs/:jobId/retry` | POST | Retry failed job |
| `/jobs` | GET | List jobs |

## 5. Memory Coherence Strategy

### Consistency Guarantees

```typescript
// src/api/memory/coherence.ts

export class MemoryCoherence {
  private locks = new Map<string, Promise<void>>();

  /**
   * Ensure exclusive access to document
   * Prevents race conditions between HTTP API and MCP tools
   */
  async withLock<T>(
    documentId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    while (this.locks.has(documentId)) {
      await this.locks.get(documentId);
    }

    const lockPromise = fn();
    this.locks.set(documentId, lockPromise);

    try {
      return await lockPromise;
    } finally {
      this.locks.delete(documentId);
    }
  }
}

export const memoryCoherence = new MemoryCoherence();
```

### Usage in HTTP Routes

```typescript
// Ensure atomic updates
documentRoutes.post('/documents/:id', async (c) => {
  const memory = c.get('memory');
  const { id } = c.req.param();

  return memoryCoherence.withLock(id, async () => {
    // Multiple concurrent requests to same document won't cause issues
    const doc = await memory.getDocument(id);
    // Update...
    await memory.updateDocument(id, updated);
  });
});
```

## 6. Configuration Environment Variables

```env
# .env

# Server
NODE_ENV=production
API_PORT=3000
MCP_STDIO=true

# Storage
RUVECTOR_DB=./ruvector.db
GRAPH_DATA_DIR=./data/graph

# Job Queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
JOB_TIMEOUT_MS=300000
JOB_MAX_RETRIES=3
JOB_CONCURRENCY=4

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```
