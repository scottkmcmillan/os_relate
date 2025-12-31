# Architecture Recommendations - Research Knowledge Manager

**Prepared by:** System Architect Agent
**Date:** 2025-12-30
**Review Status:** Initial Assessment

---

## Executive Summary

The Research Knowledge Manager exhibits a **well-structured modular architecture** with clear separation of concerns. However, as the system scales and evolves, several architectural improvements are recommended to enhance maintainability, scalability, and extensibility.

**Priority Recommendations:**
1. **High Priority:** Implement repository pattern for storage abstraction
2. **High Priority:** Add comprehensive error handling and logging
3. **Medium Priority:** Introduce event-driven architecture
4. **Medium Priority:** Extract PKA-STRAT as plugin system
5. **Low Priority:** API versioning and OpenAPI documentation

---

## 1. Storage Abstraction Layer (High Priority)

### Current Issue

The system is tightly coupled to specific storage implementations:
- **Vector Store:** RuVector (SQLite-based)
- **Graph Store:** better-sqlite3
- **Cognitive Engine:** RuVector SONA/GNN modules

**Risk:** Vendor lock-in, difficult migration, limited deployment flexibility.

### Recommended Solution: Repository Pattern

Introduce abstract interfaces for storage backends:

```typescript
// src/storage/interfaces.ts

export interface IVectorRepository {
  insert(embedding: Float32Array, metadata: Record<string, any>): Promise<string>;
  search(query: Float32Array, k: number, filters?: MetadataFilters): Promise<SearchResult[]>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<VectorStats>;
}

export interface IGraphRepository {
  createNode(type: NodeType, properties: Record<string, any>): GraphNode;
  createEdge(from: string, to: string, type: EdgeType, properties?: Record<string, any>): GraphEdge;
  findRelated(nodeId: string, depth: number, types?: EdgeType[]): TraversalResult[];
  query(cypher: string): QueryResult;
  getStats(): GraphStats;
}

export interface ICognitiveRepository {
  beginTrajectory(embedding: Float32Array, options?: TrajectoryOptions): Promise<number>;
  recordStep(trajectoryId: number, embedding: Float32Array, reward: number): Promise<void>;
  endTrajectory(trajectoryId: number, quality: number): void;
  findPatterns(embedding: Float32Array, k: number): Promise<ReasoningPattern[]>;
  rerank(query: Float32Array, candidates: Candidate[]): Promise<RerankResult[]>;
}
```

**Implementation Examples:**

```typescript
// src/storage/vector/ruvector-repository.ts
export class RuVectorRepository implements IVectorRepository {
  // Current implementation
}

// src/storage/vector/pinecone-repository.ts (future)
export class PineconeRepository implements IVectorRepository {
  // Cloud-based alternative
}

// src/storage/graph/sqlite-graph-repository.ts
export class SQLiteGraphRepository implements IGraphRepository {
  // Current implementation
}

// src/storage/graph/neo4j-repository.ts (future)
export class Neo4jGraphRepository implements IGraphRepository {
  // Production-grade graph database
}
```

**Factory Pattern:**

```typescript
// src/storage/factory.ts
export class StorageFactory {
  static createVectorRepository(config: StorageConfig): IVectorRepository {
    switch (config.vectorProvider) {
      case 'ruvector':
        return new RuVectorRepository(config.ruvector);
      case 'pinecone':
        return new PineconeRepository(config.pinecone);
      case 'qdrant':
        return new QdrantRepository(config.qdrant);
      default:
        throw new Error(`Unknown vector provider: ${config.vectorProvider}`);
    }
  }

  static createGraphRepository(config: StorageConfig): IGraphRepository {
    switch (config.graphProvider) {
      case 'sqlite':
        return new SQLiteGraphRepository(config.sqlite);
      case 'neo4j':
        return new Neo4jGraphRepository(config.neo4j);
      case 'postgresql':
        return new PostgreSQLGraphRepository(config.postgresql);
      default:
        throw new Error(`Unknown graph provider: ${config.graphProvider}`);
    }
  }
}
```

**Benefits:**
- Enables switching storage backends without code changes
- Facilitates testing with mock repositories
- Supports multi-cloud deployments
- Allows gradual migration (e.g., SQLite → PostgreSQL)

**Migration Path:**
1. Define interfaces (Week 1)
2. Wrap existing implementations (Week 2)
3. Update UnifiedMemory to use interfaces (Week 3)
4. Test with mock repositories (Week 4)
5. Implement alternative backends (ongoing)

---

## 2. Event-Driven Architecture (Medium Priority)

### Current Issue

Components are directly coupled through method calls:
- Document ingestion directly updates vector + graph stores
- API routes directly modify UnifiedMemory
- No notification mechanism for external systems

**Risk:** Difficult to add cross-cutting concerns (webhooks, notifications, audit logs).

### Recommended Solution: Event Bus Pattern

Introduce an event bus for async communication:

```typescript
// src/events/event-bus.ts

export type EventType =
  | 'document.created'
  | 'document.updated'
  | 'document.deleted'
  | 'search.performed'
  | 'trajectory.started'
  | 'trajectory.completed'
  | 'pattern.learned'
  | 'drift.detected';

export interface Event {
  type: EventType;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    source?: string;
  };
}

export interface IEventHandler {
  handle(event: Event): Promise<void>;
}

export class EventBus {
  private handlers: Map<EventType, IEventHandler[]> = new Map();

  subscribe(eventType: EventType, handler: IEventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  async publish(event: Event): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(handlers.map(h => h.handle(event)));
  }
}
```

**Example Handlers:**

```typescript
// src/events/handlers/audit-logger.ts
export class AuditLogHandler implements IEventHandler {
  async handle(event: Event): Promise<void> {
    await this.db.insert('audit_log', {
      event_type: event.type,
      timestamp: event.timestamp,
      data: JSON.stringify(event.data)
    });
  }
}

// src/events/handlers/webhook-notifier.ts
export class WebhookNotifier implements IEventHandler {
  async handle(event: Event): Promise<void> {
    if (this.shouldNotify(event.type)) {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    }
  }
}

// src/events/handlers/drift-alerter.ts
export class DriftAlerter implements IEventHandler {
  async handle(event: Event): Promise<void> {
    if (event.type === 'drift.detected' && event.data.severity === 'high') {
      await this.emailService.send({
        to: event.data.stakeholders,
        subject: 'High-Severity Drift Detected',
        body: this.formatAlert(event.data)
      });
    }
  }
}
```

**Usage in UnifiedMemory:**

```typescript
export class UnifiedMemory {
  constructor(
    private eventBus: EventBus,
    // ... other dependencies
  ) {}

  async addDocument(document: Document): Promise<string> {
    // Existing logic...
    const id = await this.vectorStore.insert(...);
    this.graphStore.createNode(...);

    // Publish event
    await this.eventBus.publish({
      type: 'document.created',
      timestamp: new Date(),
      data: { documentId: id, title: document.title, source: document.source }
    });

    return id;
  }
}
```

**Benefits:**
- Decouples components (publish doesn't know about subscribers)
- Easy to add new features (webhooks, notifications, analytics)
- Enables async processing (background jobs, queue systems)
- Facilitates testing (mock event handlers)

**Implementation Timeline:**
- Phase 1: Core EventBus (1 week)
- Phase 2: Integrate with UnifiedMemory (1 week)
- Phase 3: Add handlers (ongoing)

---

## 3. Plugin Architecture for PKA-STRAT (Medium Priority)

### Current Issue

PKA-STRAT is tightly integrated into core system:
- Node/edge types hardcoded in GraphStore
- Routes directly registered in API server
- No way to disable PKA features

**Risk:** System becomes bloated with domain-specific features.

### Recommended Solution: Plugin System

Define a plugin interface:

```typescript
// src/plugins/plugin-interface.ts

export interface Plugin {
  name: string;
  version: string;
  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
}

export interface PluginContext {
  memory: UnifiedMemory;
  eventBus: EventBus;
  registerRoute(path: string, router: Router): void;
  registerNodeType(type: string): void;
  registerEdgeType(type: string): void;
  registerTool(tool: MCPTool): void;
}
```

**PKA-STRAT as Plugin:**

```typescript
// src/plugins/pka-strat/index.ts

export class PKAStratPlugin implements Plugin {
  name = 'pka-strat';
  version = '1.0.0';

  async initialize(context: PluginContext): Promise<void> {
    // Register node types
    context.registerNodeType('Organization');
    context.registerNodeType('Mission');
    context.registerNodeType('Objective');
    // ... other PKA types

    // Register edge types
    context.registerEdgeType('ALIGNS_TO');
    context.registerEdgeType('SUPPORTS');
    // ... other PKA edges

    // Register API routes
    const pyramidRouter = createPyramidRouter(context.memory);
    context.registerRoute('/api/pyramid', pyramidRouter);

    const alignmentRouter = createAlignmentRouter(context.memory);
    context.registerRoute('/api/alignment', alignmentRouter);

    // Register MCP tools
    context.registerTool({
      name: 'pka_calculate_alignment',
      schema: alignmentSchema,
      handler: this.calculateAlignment.bind(this)
    });

    // Subscribe to events
    context.eventBus.subscribe('drift.detected', new DriftAlerter());
  }

  async shutdown(): Promise<void> {
    // Cleanup resources
  }
}
```

**Plugin Manager:**

```typescript
// src/plugins/plugin-manager.ts

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  async loadPlugin(plugin: Plugin, context: PluginContext): Promise<void> {
    await plugin.initialize(context);
    this.plugins.set(plugin.name, plugin);
  }

  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      await plugin.shutdown();
      this.plugins.delete(name);
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
}
```

**Usage in Server:**

```typescript
// src/api/server.ts

export class RangerServer {
  constructor(config: ServerConfig) {
    this.memory = createUnifiedMemory();
    this.eventBus = new EventBus();
    this.pluginManager = new PluginManager();

    // Load plugins
    if (config.plugins?.includes('pka-strat')) {
      this.pluginManager.loadPlugin(
        new PKAStratPlugin(),
        {
          memory: this.memory,
          eventBus: this.eventBus,
          registerRoute: this.registerRoute.bind(this),
          registerNodeType: this.registerNodeType.bind(this),
          registerEdgeType: this.registerEdgeType.bind(this),
          registerTool: this.registerTool.bind(this)
        }
      );
    }
  }
}
```

**Benefits:**
- Modular, optional features
- Third-party plugin ecosystem
- Easier testing (load/unload plugins)
- Clean separation of core vs. extensions

---

## 4. Comprehensive Error Handling (High Priority)

### Current Issue

Error handling is inconsistent:
- Some functions throw errors
- Some return null/undefined
- No centralized error types
- Limited error context

### Recommended Solution: Structured Error Handling

**Define Error Hierarchy:**

```typescript
// src/errors/base-error.ts

export abstract class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context
    };
  }
}

// Specific error types
export class DocumentNotFoundError extends ApplicationError {
  constructor(documentId: string) {
    super(
      `Document not found: ${documentId}`,
      'DOCUMENT_NOT_FOUND',
      404,
      { documentId }
    );
  }
}

export class VectorSearchError extends ApplicationError {
  constructor(message: string, cause?: Error) {
    super(
      `Vector search failed: ${message}`,
      'VECTOR_SEARCH_ERROR',
      500,
      { cause: cause?.message }
    );
  }
}

export class GraphQueryError extends ApplicationError {
  constructor(query: string, message: string) {
    super(
      `Graph query failed: ${message}`,
      'GRAPH_QUERY_ERROR',
      400,
      { query }
    );
  }
}

export class CognitiveEngineError extends ApplicationError {
  constructor(message: string, operation: string) {
    super(
      `Cognitive engine error: ${message}`,
      'COGNITIVE_ERROR',
      500,
      { operation }
    );
  }
}

export class ValidationError extends ApplicationError {
  constructor(field: string, message: string) {
    super(
      `Validation failed for ${field}: ${message}`,
      'VALIDATION_ERROR',
      400,
      { field }
    );
  }
}
```

**Result Pattern (Alternative to Exceptions):**

```typescript
// src/utils/result.ts

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage
export async function searchDocuments(
  query: string
): Promise<Result<SearchResult[], VectorSearchError>> {
  try {
    const results = await this.vectorStore.search(query);
    return Ok(results);
  } catch (error) {
    return Err(new VectorSearchError(error.message, error));
  }
}

// Consumer
const result = await memory.searchDocuments("machine learning");
if (result.ok) {
  console.log(result.value); // SearchResult[]
} else {
  console.error(result.error); // VectorSearchError
}
```

**Global Error Handler (Express):**

```typescript
// src/api/middleware/error.ts

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error({
    error: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle known errors
  if (err instanceof ApplicationError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      errors: err.errors
    });
  }

  // Default: 500 Internal Server Error
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred'
  });
}
```

---

## 5. Structured Logging and Observability (High Priority)

### Current Issue

- Minimal logging (console.log statements)
- No structured logs for analysis
- No distributed tracing
- Difficult to debug production issues

### Recommended Solution: Comprehensive Logging

**Structured Logger:**

```typescript
// src/utils/logger.ts

import { pino } from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ['password', 'apiKey', 'token'], // Redact sensitive fields
});

// Usage
logger.info({ documentId, collection }, 'Document added');
logger.error({ error, query }, 'Search failed');
logger.warn({ trajectoryId, quality }, 'Low-quality trajectory');
```

**Request Logging Middleware:**

```typescript
// src/api/middleware/request-logger.ts

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }, 'HTTP request');
  });

  next();
}
```

**Distributed Tracing:**

```typescript
// src/utils/tracing.ts (using OpenTelemetry)

import { trace, SpanStatusCode } from '@opentelemetry/api';

export function withTracing<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('rkm');
  const span = tracer.startSpan(operationName);

  return fn()
    .then(result => {
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    })
    .catch(error => {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.recordException(error);
      span.end();
      throw error;
    });
}

// Usage
export async function search(query: string): Promise<SearchResult[]> {
  return withTracing('memory.search', async () => {
    // Search implementation
  });
}
```

---

## 6. API Versioning (Medium Priority)

### Current Issue

- No API versioning (/api/collections)
- Breaking changes will impact all clients
- Difficult to deprecate endpoints

### Recommended Solution: URL-based Versioning

```typescript
// src/api/routes/index.ts

export function createApiRouter(memory: UnifiedMemory): Router {
  const router = Router();

  // v1 routes (current)
  router.use('/v1', createV1Router(memory));

  // Default to latest
  router.use('/', createV1Router(memory));

  return router;
}

function createV1Router(memory: UnifiedMemory): Router {
  const router = Router();
  router.use('/collections', createCollectionsRouter(memory));
  router.use('/documents', createDocumentsRouter(memory));
  // ... other routes
  return router;
}

// Future: v2 with breaking changes
function createV2Router(memory: UnifiedMemory): Router {
  const router = Router();
  // New API design
  return router;
}
```

**OpenAPI Documentation:**

```yaml
# docs/openapi.yaml

openapi: 3.0.0
info:
  title: Research Knowledge Manager API
  version: 1.0.0
  description: REST API for cognitive knowledge graph management

paths:
  /v1/collections:
    get:
      summary: List all collections
      responses:
        '200':
          description: List of collections
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Collection'
    post:
      summary: Create a new collection
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateCollectionRequest'
      responses:
        '201':
          description: Collection created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Collection'

components:
  schemas:
    Collection:
      type: object
      properties:
        name:
          type: string
        documentCount:
          type: integer
        createdAt:
          type: string
          format: date-time
```

---

## 7. Caching Layer (Low Priority)

### Recommended Solution

```typescript
// src/cache/cache-manager.ts

export interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class RedisCacheManager implements CacheManager {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }
}

// Usage in UnifiedMemory
export class UnifiedMemory {
  constructor(
    private cache: CacheManager,
    // ... other dependencies
  ) {}

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const cacheKey = `search:${hash(query)}:${hash(options)}`;

    // Check cache
    const cached = await this.cache.get<SearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Perform search
    const results = await this.performSearch(query, options);

    // Cache results (5 minutes TTL)
    await this.cache.set(cacheKey, results, 300);

    return results;
  }
}
```

---

## Implementation Priority Matrix

| Recommendation | Priority | Effort | Impact | Timeline |
|---|---|---|---|---|
| Error Handling | High | Medium | High | 2 weeks |
| Logging & Observability | High | Medium | High | 2 weeks |
| Repository Pattern | High | High | High | 4 weeks |
| Event Bus | Medium | Medium | Medium | 3 weeks |
| Plugin Architecture | Medium | High | Medium | 6 weeks |
| API Versioning | Medium | Low | Medium | 1 week |
| Caching Layer | Low | Medium | Low | 2 weeks |

---

## Conclusion

The Research Knowledge Manager has a solid architectural foundation. Implementing these recommendations will:

1. **Reduce coupling** → Easier to modify and extend
2. **Improve reliability** → Better error handling and logging
3. **Enable scaling** → Event-driven architecture, caching
4. **Support extensibility** → Plugin system, storage abstraction
5. **Enhance maintainability** → Structured errors, observability

**Recommended Starting Point:**
1. Implement structured error handling (Week 1-2)
2. Add comprehensive logging (Week 3-4)
3. Introduce repository pattern (Week 5-8)
4. Evaluate event bus and plugin system based on growth needs

---

**Next Steps:**
- Review recommendations with development team
- Create implementation plan with milestones
- Set up testing strategy for architectural changes
- Document migration path for each recommendation
