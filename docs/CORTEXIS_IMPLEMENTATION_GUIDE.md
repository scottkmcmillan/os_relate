# Cortexis API Implementation Guide

**Technical Reference for Hive Mind Swarm Integration**

---

## Section 1: Collection Registry Implementation

### 1.1 CollectionRegistry Class

```typescript
// File: /workspaces/ranger/src/api/collectionRegistry.ts

import {
  UnifiedMemory,
  createCustomUnifiedMemory,
  UnifiedMemoryConfig,
  UnifiedMemoryStats
} from '../memory/index.js';

export interface CollectionConfig {
  name: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dot';
  created_at: string;
}

export interface CollectionMetadata extends CollectionConfig {
  vectorDbPath: string;
  graphDbDir: string;
  stats: UnifiedMemoryStats;
}

export class CollectionRegistry {
  private collections = new Map<string, {
    memory: UnifiedMemory;
    config: CollectionMetadata;
  }>();

  private baseStoragePath = './collections';
  private baseDataDir = './data/collections';

  /**
   * Create a new named collection
   */
  async createCollection(
    name: string,
    dimension: number,
    metric: 'cosine' | 'euclidean' | 'dot' = 'cosine'
  ): Promise<CollectionMetadata> {
    if (this.collections.has(name)) {
      throw new Error(`Collection '${name}' already exists`);
    }

    // Validate inputs
    if (dimension < 64 || dimension > 4096) {
      throw new Error('Dimension must be between 64 and 4096');
    }

    // Create collection-specific paths
    const vectorDbPath = `${this.baseStoragePath}/${name}.db`;
    const graphDbDir = `${this.baseDataDir}/${name}`;

    // Initialize UnifiedMemory for this collection
    const memory = createCustomUnifiedMemory({
      vectorConfig: {
        storagePath: vectorDbPath,
        dimensions: dimension,
        distanceMetric: metric === 'dot' ? 'DotProduct' :
                       metric === 'euclidean' ? 'Euclidean' : 'Cosine'
      },
      graphDataDir: graphDbDir,
      dimensions: dimension,
      enableCognitive: true
    });

    const config: CollectionMetadata = {
      name,
      dimension,
      metric,
      vectorDbPath,
      graphDbDir,
      created_at: new Date().toISOString(),
      stats: await memory.getStats()
    };

    this.collections.set(name, { memory, config });
    return config;
  }

  /**
   * Get a collection by name
   */
  getCollection(name: string): UnifiedMemory | null {
    const entry = this.collections.get(name);
    return entry?.memory || null;
  }

  /**
   * Get collection metadata
   */
  async getCollectionMetadata(name: string): Promise<CollectionMetadata | null> {
    const entry = this.collections.get(name);
    if (!entry) return null;

    return {
      ...entry.config,
      stats: await entry.memory.getStats()
    };
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<CollectionMetadata[]> {
    const results: CollectionMetadata[] = [];

    for (const [, entry] of this.collections) {
      results.push({
        ...entry.config,
        stats: await entry.memory.getStats()
      });
    }

    return results;
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<boolean> {
    const entry = this.collections.get(name);
    if (!entry) return false;

    try {
      // Close all resources
      await entry.memory.close();

      // Delete from registry
      this.collections.delete(name);

      // Note: Actual file deletion should be handled separately
      // to ensure data integrity
      return true;
    } catch (error) {
      console.error(`Failed to delete collection '${name}':`, error);
      return false;
    }
  }

  /**
   * Get a collection or create default if none exists
   */
  async getOrCreateDefault(): Promise<UnifiedMemory> {
    const existing = this.getCollection('default');
    if (existing) return existing;

    await this.createCollection('default', 384, 'cosine');
    return this.getCollection('default')!;
  }
}

// Singleton instance
let registryInstance: CollectionRegistry | null = null;

export function getCollectionRegistry(): CollectionRegistry {
  if (!registryInstance) {
    registryInstance = new CollectionRegistry();
  }
  return registryInstance;
}
```

### 1.2 Initialize Collections at Startup

```typescript
// In main server file or initialization module

import { getCollectionRegistry } from './api/collectionRegistry.js';

export async function initializeCollections() {
  const registry = getCollectionRegistry();

  // Ensure default collection exists
  try {
    await registry.getOrCreateDefault();
    console.log('✓ Default collection initialized');
  } catch (error) {
    console.error('Failed to initialize default collection:', error);
    process.exit(1);
  }
}
```

---

## Section 2: REST API Routes Implementation

### 2.1 Collections Routes

```typescript
// File: /workspaces/ranger/src/api/routes/collections.ts

import { Hono } from 'hono';
import { getCollectionRegistry } from '../collectionRegistry.js';

const router = new Hono();

// GET /collections - List all collections
router.get('/', async (c) => {
  try {
    const registry = getCollectionRegistry();
    const collections = await registry.listCollections();

    return c.json({
      collections: collections.map(col => ({
        name: col.name,
        dimension: col.dimension,
        metric: col.metric,
        created_at: col.created_at
      }))
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      400
    );
  }
});

// POST /collections - Create collection
router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, dimension, metric } = body;

    if (!name || typeof name !== 'string') {
      return c.json({ error: 'Missing or invalid "name"' }, 400);
    }

    if (!dimension || typeof dimension !== 'number') {
      return c.json({ error: 'Missing or invalid "dimension"' }, 400);
    }

    const registry = getCollectionRegistry();
    const collection = await registry.createCollection(
      name,
      dimension,
      metric || 'cosine'
    );

    return c.json({
      name: collection.name,
      dimension: collection.dimension,
      metric: collection.metric,
      created_at: collection.created_at
    }, 201);

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      400
    );
  }
});

// GET /collections/:name - Get collection details
router.get('/:name', async (c) => {
  try {
    const name = c.req.param('name');
    const registry = getCollectionRegistry();
    const collection = await registry.getCollectionMetadata(name);

    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    return c.json({
      name: collection.name,
      dimension: collection.dimension,
      metric: collection.metric,
      created_at: collection.created_at,
      vectorDbPath: collection.vectorDbPath,
      graphDbDir: collection.graphDbDir
    });

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// DELETE /collections/:name - Delete collection
router.delete('/:name', async (c) => {
  try {
    const name = c.req.param('name');

    if (name === 'default') {
      return c.json({ error: 'Cannot delete default collection' }, 400);
    }

    const registry = getCollectionRegistry();
    const success = await registry.deleteCollection(name);

    if (!success) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    return c.json({ message: 'Collection deleted successfully' });

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// GET /collections/:name/stats - Get collection statistics
router.get('/:name/stats', async (c) => {
  try {
    const name = c.req.param('name');
    const registry = getCollectionRegistry();
    const collection = await registry.getCollectionMetadata(name);

    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    return c.json({
      vector: collection.stats.vector,
      graph: collection.stats.graph,
      cognitive: collection.stats.cognitive,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

export default router;
```

### 2.2 Search Routes

```typescript
// File: /workspaces/ranger/src/api/routes/search.ts

import { Hono } from 'hono';
import { getCollectionRegistry } from '../collectionRegistry.js';
import { createSemanticRouter } from '../../tools/router.js';
import { createContextFormatter } from '../../tools/context.js';
import type { HybridSearchOptions } from '../../memory/index.js';

const router = new Hono();
const semanticRouter = createSemanticRouter();
const contextFormatter = createContextFormatter();

interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    source?: string[];
    category?: string[];
    tags?: string[];
    dateRange?: { start: string; end: string };
  };
  weights?: {
    vector?: number;
    graph?: number;
  };
  rerank?: boolean;
  outputFormat?: 'json' | 'markdown' | 'context';
}

// POST /collections/:name/search
router.post('/:name/search', async (c) => {
  try {
    const name = c.req.param('name');
    const request: SearchRequest = await c.req.json();

    // Validate request
    if (!request.query || typeof request.query !== 'string') {
      return c.json({ error: 'Missing or invalid "query"' }, 400);
    }

    // Get collection
    const registry = getCollectionRegistry();
    const memory = registry.getCollection(name);

    if (!memory) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    // Route the query for intent classification
    const route = semanticRouter.routeQuery(request.query);

    // Build search options
    const searchOptions: HybridSearchOptions = {
      k: request.limit || 10,
      vectorWeight: request.weights?.vector || 0.7,
      includeRelated: true,
      graphDepth: route.route === 'RELATIONAL' ? 2 : 1,
      filters: request.filters ? {
        source: request.filters.source?.[0],
        category: request.filters.category?.[0],
        tags: request.filters.tags,
        dateRange: request.filters.dateRange
      } : undefined,
      rerank: request.rerank !== false
    };

    // Perform search
    const results = await memory.search(request.query, searchOptions);

    // Format response based on output format
    const format = request.outputFormat || 'json';

    if (format === 'markdown') {
      const block = contextFormatter.formatVectorResults(
        request.query,
        results.map(r => ({
          score: r.combinedScore,
          metadata: {
            title: r.title,
            text: r.text,
            source: r.source
          }
        }))
      );
      return c.text(contextFormatter.render(block));
    }

    if (format === 'context') {
      const block = contextFormatter.formatVectorResults(
        request.query,
        results.map(r => ({
          score: r.combinedScore,
          metadata: {
            title: r.title,
            text: r.text,
            source: r.source
          }
        }))
      );
      return c.json({
        context: contextFormatter.render(block),
        route: route.route,
        confidence: route.confidence
      });
    }

    // JSON format (default)
    return c.json({
      query: request.query,
      route: route.route,
      confidence: route.confidence,
      hits: results.map(r => ({
        id: r.id,
        title: r.title,
        content: r.text,
        source: r.source,
        vectorScore: r.vectorScore,
        graphScore: r.graphScore,
        score: r.combinedScore,
        relatedDocuments: r.relatedNodes?.map(n => n.id) || [],
        metadata: r.metadata
      })),
      totalHits: results.length,
      offset: request.offset || 0
    });

  } catch (error) {
    console.error('Search error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

export default router;
```

### 2.3 Metrics Routes

```typescript
// File: /workspaces/ranger/src/api/routes/metrics.ts

import { Hono } from 'hono';
import { getCollectionRegistry } from '../collectionRegistry.js';

const router = new Hono();

// GET /metrics - System-wide metrics
router.get('/', async (c) => {
  try {
    const registry = getCollectionRegistry();
    const collections = await registry.listCollections();

    // Aggregate metrics across all collections
    let totalVectors = 0;
    let totalGraphNodes = 0;
    let totalGraphEdges = 0;
    let totalPatterns = 0;

    for (const collection of collections) {
      totalVectors += collection.stats.vector.totalVectors;
      totalGraphNodes += collection.stats.graph.nodeCount;
      totalGraphEdges += collection.stats.graph.edgeCount;
      totalPatterns += collection.stats.cognitive?.patternsLearned || 0;
    }

    return c.json({
      system: {
        collectionCount: collections.length,
        timestamp: new Date().toISOString()
      },
      aggregated: {
        totalVectors,
        totalGraphNodes,
        totalGraphEdges,
        totalPatterns,
        averageVectorsPerCollection: collections.length > 0
          ? Math.round(totalVectors / collections.length)
          : 0
      },
      collections: collections.map(col => ({
        name: col.name,
        dimension: col.dimension,
        vectors: col.stats.vector.totalVectors,
        graphNodes: col.stats.graph.nodeCount,
        graphEdges: col.stats.graph.edgeCount,
        patterns: col.stats.cognitive?.patternsLearned || 0
      }))
    });

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// GET /insights - Learning insights across all collections
router.get('/insights', async (c) => {
  try {
    const registry = getCollectionRegistry();
    const collections = await registry.listCollections();

    const insights = [];

    for (const collection of collections) {
      const memory = registry.getCollection(collection.name);
      if (!memory) continue;

      // Get patterns from cognitive engine
      const patterns = await memory.findPatterns('', 5);

      insights.push({
        collection: collection.name,
        learningStats: {
          trajectoriesRecorded: collection.stats.cognitive?.trajectoriesRecorded || 0,
          patternsLearned: collection.stats.cognitive?.patternsLearned || 0,
          microLoraUpdates: collection.stats.cognitive?.microLoraUpdates || 0,
          avgLearningTime: collection.stats.cognitive?.avgLearningTimeMs || 0
        },
        topPatterns: patterns.slice(0, 3).map(p => ({
          id: p.id,
          clusterSize: p.clusterSize,
          avgQuality: p.avgQuality
        }))
      });
    }

    return c.json({
      timestamp: new Date().toISOString(),
      insights
    });

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

export default router;
```

---

## Section 3: Document Upload Management

### 3.1 UploadManager Class

```typescript
// File: /workspaces/ranger/src/api/uploadManager.ts

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface UploadJob {
  jobId: string;
  collectionName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  completedAt?: string;
  documentCount: number;
  successCount: number;
  failureCount: number;
  errors?: Array<{ documentId: string; error: string }>;
}

export class DocumentUploadManager {
  private db: Database.Database;
  private jobs = new Map<string, UploadJob>();

  constructor(dataDir: string = './data') {
    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = join(dataDir, 'uploads.db');
    this.db = new Database(dbPath);

    // Initialize schema
    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS upload_jobs (
        id INTEGER PRIMARY KEY,
        job_id TEXT UNIQUE NOT NULL,
        collection_name TEXT NOT NULL,
        status TEXT NOT NULL,
        document_count INTEGER,
        success_count INTEGER,
        failure_count INTEGER,
        uploaded_at TEXT NOT NULL,
        completed_at TEXT,
        errors_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_job_id ON upload_jobs(job_id);
      CREATE INDEX IF NOT EXISTS idx_collection ON upload_jobs(collection_name);
      CREATE INDEX IF NOT EXISTS idx_status ON upload_jobs(status);
    `);
  }

  /**
   * Create a new upload job
   */
  createJob(collectionName: string, documentCount: number): UploadJob {
    const jobId = uuidv4();
    const now = new Date().toISOString();

    const job: UploadJob = {
      jobId,
      collectionName,
      status: 'pending',
      uploadedAt: now,
      documentCount,
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    // Store in database
    const stmt = this.db.prepare(`
      INSERT INTO upload_jobs (
        job_id, collection_name, status, document_count,
        success_count, failure_count, uploaded_at, errors_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      jobId,
      collectionName,
      'pending',
      documentCount,
      0,
      0,
      now,
      '[]'
    );

    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): UploadJob | null {
    // Check memory cache first
    if (this.jobs.has(jobId)) {
      return this.jobs.get(jobId) || null;
    }

    // Check database
    const stmt = this.db.prepare(`
      SELECT * FROM upload_jobs WHERE job_id = ?
    `);

    const row = stmt.get(jobId) as any;
    if (!row) return null;

    const job: UploadJob = {
      jobId: row.job_id,
      collectionName: row.collection_name,
      status: row.status,
      uploadedAt: row.uploaded_at,
      completedAt: row.completed_at,
      documentCount: row.document_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      errors: row.errors_json ? JSON.parse(row.errors_json) : []
    };

    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * Update job status
   */
  updateJob(jobId: string, update: Partial<UploadJob>) {
    const job = this.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Merge updates
    const updated = { ...job, ...update };

    // Persist to database
    const stmt = this.db.prepare(`
      UPDATE upload_jobs
      SET status = ?, success_count = ?, failure_count = ?,
          completed_at = ?, errors_json = ?
      WHERE job_id = ?
    `);

    stmt.run(
      updated.status,
      updated.successCount,
      updated.failureCount,
      updated.completedAt,
      JSON.stringify(updated.errors || []),
      jobId
    );

    this.jobs.set(jobId, updated);
  }

  /**
   * Record a document success
   */
  recordSuccess(jobId: string) {
    const job = this.getJob(jobId);
    if (job) {
      job.successCount++;
      this.updateJob(jobId, job);
    }
  }

  /**
   * Record a document failure
   */
  recordFailure(jobId: string, documentId: string, error: string) {
    const job = this.getJob(jobId);
    if (job) {
      job.failureCount++;
      if (!job.errors) job.errors = [];
      job.errors.push({ documentId, error });
      this.updateJob(jobId, job);
    }
  }

  /**
   * List jobs for a collection
   */
  listJobs(collectionName: string): UploadJob[] {
    const stmt = this.db.prepare(`
      SELECT * FROM upload_jobs WHERE collection_name = ?
      ORDER BY uploaded_at DESC
    `);

    const rows = stmt.all(collectionName) as any[];

    return rows.map(row => ({
      jobId: row.job_id,
      collectionName: row.collection_name,
      status: row.status,
      uploadedAt: row.uploaded_at,
      completedAt: row.completed_at,
      documentCount: row.document_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      errors: row.errors_json ? JSON.parse(row.errors_json) : []
    }));
  }
}

// Singleton
let uploadManagerInstance: DocumentUploadManager | null = null;

export function getUploadManager(dataDir?: string): DocumentUploadManager {
  if (!uploadManagerInstance) {
    uploadManagerInstance = new DocumentUploadManager(dataDir);
  }
  return uploadManagerInstance;
}
```

### 3.2 Document Upload Routes

```typescript
// File: /workspaces/ranger/src/api/routes/documents.ts

import { Hono } from 'hono';
import { getUploadManager } from '../uploadManager.js';
import { getCollectionRegistry } from '../collectionRegistry.js';
import { parseDocument } from '../../ingestion/parser.js';
import type { Document } from '../../memory/index.js';

const router = new Hono();

// POST /documents/upload
router.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();

    const collectionName = formData.get('collection') as string || 'default';
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return c.json({ error: 'No files provided' }, 400);
    }

    // Create upload job
    const uploadManager = getUploadManager();
    const job = uploadManager.createJob(collectionName, files.length);

    // Start background processing
    processUploadInBackground(job, files, collectionName);

    return c.json({
      jobId: job.jobId,
      status: job.status,
      uploadedAt: job.uploadedAt,
      documentCount: job.documentCount
    }, 202); // Accepted

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// GET /documents/upload/:jobId/status
router.get('/upload/:jobId/status', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const uploadManager = getUploadManager();
    const job = uploadManager.getJob(jobId);

    if (!job) {
      return c.json({ error: 'Upload job not found' }, 404);
    }

    return c.json(job);

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// Background job processor
async function processUploadInBackground(
  job: any,
  files: File[],
  collectionName: string
) {
  const uploadManager = getUploadManager();
  const registry = getCollectionRegistry();

  try {
    // Update job status
    uploadManager.updateJob(job.jobId, { status: 'processing' });

    const memory = registry.getCollection(collectionName);
    if (!memory) {
      throw new Error(`Collection '${collectionName}' not found`);
    }

    // Process each file
    const documents: Document[] = [];

    for (const file of files) {
      try {
        // Read file content
        const content = await file.text();
        const extension = file.name.split('.').pop() || 'txt';
        const docType = extension === 'md' ? 'markdown' :
                       extension === 'json' ? 'json' :
                       extension === 'jsonl' ? 'jsonl' : 'text';

        // Parse document
        const parsed = await parseDocument(content, docType as any);

        // Create document object
        const doc: Document = {
          id: `${job.jobId}-${file.name}`,
          title: parsed.title || file.name,
          text: parsed.content,
          source: file.name,
          category: 'uploaded',
          tags: ['upload', job.jobId.substring(0, 8)],
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            uploadJobId: job.jobId
          }
        };

        documents.push(doc);
        uploadManager.recordSuccess(job.jobId);

      } catch (error) {
        uploadManager.recordFailure(
          job.jobId,
          file.name,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    // Batch add documents to memory
    if (documents.length > 0) {
      await memory.addDocuments(documents);
    }

    // Mark job as completed
    uploadManager.updateJob(job.jobId, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    uploadManager.updateJob(job.jobId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      errors: [{
        documentId: 'job',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    });
  }
}

export default router;
```

---

## Section 4: Chat Management

### 4.1 ChatManager Class

```typescript
// File: /workspaces/ranger/src/api/chatManager.ts

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { UnifiedSearchResult } from '../memory/index.js';
import type { RouteType } from '../tools/router.js';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: {
    searchResults: Array<{
      id: string;
      title: string;
      score: number;
    }>;
    route: RouteType;
    relatedDocuments: string[];
  };
}

export interface ChatSession {
  sessionId: string;
  collectionName: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export class ChatSessionManager {
  private db: Database.Database;
  private sessions = new Map<string, ChatSession>();

  constructor(dataDir: string = './data') {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = join(dataDir, 'chat.db');
    this.db = new Database(dbPath);

    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        collection_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY,
        session_id TEXT NOT NULL,
        message_id TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        context_json TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(session_id)
      );

      CREATE INDEX IF NOT EXISTS idx_session_id ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON chat_messages(timestamp);
    `);
  }

  /**
   * Create a new chat session
   */
  createSession(collectionName: string): ChatSession {
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    const session: ChatSession = {
      sessionId,
      collectionName,
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    };

    const stmt = this.db.prepare(`
      INSERT INTO chat_sessions (session_id, collection_name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(sessionId, collectionName, now, now);
    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ChatSession | null {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId) || null;
    }

    const stmt = this.db.prepare(`
      SELECT * FROM chat_sessions WHERE session_id = ?
    `);

    const row = stmt.get(sessionId) as any;
    if (!row) return null;

    const session: ChatSession = {
      sessionId: row.session_id,
      collectionName: row.collection_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: this.getMessageCount(sessionId)
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Add a message to session
   */
  addMessage(message: ChatMessage): void {
    const session = this.getSession(message.sessionId);
    if (!session) {
      throw new Error(`Session ${message.sessionId} not found`);
    }

    const stmt = this.db.prepare(`
      INSERT INTO chat_messages (
        session_id, message_id, role, content, context_json, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.sessionId,
      message.id,
      message.role,
      message.content,
      message.context ? JSON.stringify(message.context) : null,
      message.timestamp
    );

    // Update session timestamp
    const updateStmt = this.db.prepare(`
      UPDATE chat_sessions SET updated_at = ? WHERE session_id = ?
    `);
    updateStmt.run(message.timestamp, message.sessionId);

    // Update cache
    session.updatedAt = message.timestamp;
    session.messageCount++;
  }

  /**
   * Get message history for session
   */
  getHistory(sessionId: string, limit: number = 50): ChatMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_messages
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(sessionId, limit) as any[];

    return rows.reverse().map(row => ({
      id: row.message_id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      context: row.context_json ? JSON.parse(row.context_json) : undefined
    }));
  }

  /**
   * List sessions for collection
   */
  listSessions(collectionName: string): ChatSession[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_sessions
      WHERE collection_name = ?
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all(collectionName) as any[];

    return rows.map(row => ({
      sessionId: row.session_id,
      collectionName: row.collection_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: this.getMessageCount(row.session_id)
    }));
  }

  /**
   * Delete session and its messages
   */
  deleteSession(sessionId: string): boolean {
    const stmt1 = this.db.prepare(`
      DELETE FROM chat_messages WHERE session_id = ?
    `);
    stmt1.run(sessionId);

    const stmt2 = this.db.prepare(`
      DELETE FROM chat_sessions WHERE session_id = ?
    `);
    const result = stmt2.run(sessionId);

    this.sessions.delete(sessionId);
    return result.changes > 0;
  }

  private getMessageCount(sessionId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM chat_messages WHERE session_id = ?
    `);
    const row = stmt.get(sessionId) as any;
    return row?.count || 0;
  }
}

let chatManagerInstance: ChatSessionManager | null = null;

export function getChatManager(dataDir?: string): ChatSessionManager {
  if (!chatManagerInstance) {
    chatManagerInstance = new ChatSessionManager(dataDir);
  }
  return chatManagerInstance;
}
```

### 4.2 Chat Routes

```typescript
// File: /workspaces/ranger/src/api/routes/chat.ts

import { Hono } from 'hono';
import { getChatManager } from '../chatManager.js';
import { getCollectionRegistry } from '../collectionRegistry.js';
import { createSemanticRouter } from '../../tools/router.js';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '../chatManager.js';

const router = new Hono();
const semanticRouter = createSemanticRouter();

interface ChatRequest {
  sessionId?: string;
  collectionName?: string;
  message: string;
  includeContext?: boolean;
}

// POST /chat
router.post('/', async (c) => {
  try {
    const request: ChatRequest = await c.req.json();

    if (!request.message) {
      return c.json({ error: 'Missing "message" field' }, 400);
    }

    const collectionName = request.collectionName || 'default';
    const chatManager = getChatManager();
    const registry = getCollectionRegistry();

    // Get or create session
    let sessionId = request.sessionId;
    if (!sessionId) {
      const session = chatManager.createSession(collectionName);
      sessionId = session.sessionId;
    }

    // Verify session belongs to collection
    const session = chatManager.getSession(sessionId);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.collectionName !== collectionName) {
      return c.json(
        { error: 'Session does not belong to specified collection' },
        400
      );
    }

    // Get collection memory
    const memory = registry.getCollection(collectionName);
    if (!memory) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    // Route the query
    const route = semanticRouter.routeQuery(request.message);

    // Perform search
    const searchResults = await memory.search(request.message, {
      k: 5,
      rerank: route.route !== 'SUMMARY'
    });

    // Create user message with context
    const userMessage: ChatMessage = {
      id: uuidv4(),
      sessionId,
      role: 'user',
      content: request.message,
      timestamp: new Date().toISOString(),
      context: {
        searchResults: searchResults.map(r => ({
          id: r.id,
          title: r.title,
          score: r.combinedScore
        })),
        route: route.route,
        relatedDocuments: searchResults.map(r => r.id)
      }
    };

    chatManager.addMessage(userMessage);

    // Return response ready for LLM processing
    return c.json({
      sessionId,
      messageId: userMessage.id,
      route: route.route,
      confidence: route.confidence,
      context: request.includeContext ? {
        searchResults: searchResults.map(r => ({
          id: r.id,
          title: r.title,
          content: r.text,
          source: r.source,
          score: r.combinedScore
        })),
        route: route.route
      } : undefined
    });

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// GET /chat/history
router.get('/history', async (c) => {
  try {
    const sessionId = c.req.query('sessionId');
    const limit = parseInt(c.req.query('limit') || '50', 10);

    if (!sessionId) {
      return c.json({ error: 'Missing "sessionId" query parameter' }, 400);
    }

    const chatManager = getChatManager();
    const session = chatManager.getSession(sessionId);

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const messages = chatManager.getHistory(sessionId, limit);

    return c.json({
      sessionId,
      collectionName: session.collectionName,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        context: m.context
      }))
    });

  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

export default router;
```

---

## Section 5: Server Setup

### 5.1 Main Server File

```typescript
// File: /workspaces/ranger/src/api/server.ts

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import collectionsRouter from './routes/collections.js';
import searchRouter from './routes/search.js';
import documentsRouter from './routes/documents.js';
import chatRouter from './routes/chat.js';
import metricsRouter from './routes/metrics.js';
import { initializeCollections } from './init.js';

const app = new Hono();

// Middleware
app.use('*', async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path}`);
  await next();
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

// Mount routers
app.route('/collections', collectionsRouter);
app.route('/collections/:name/search', searchRouter);
app.route('/documents', documentsRouter);
app.route('/chat', chatRouter);
app.route('/metrics', metricsRouter);
app.route('/', metricsRouter);

// Error handling
app.onError((error, c) => {
  console.error('Unhandled error:', error);
  return c.json({ error: 'Internal server error' }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export async function startServer(port: number = 3000) {
  try {
    // Initialize collections
    await initializeCollections();

    // Start server
    console.log(`Starting Cortexis API server on port ${port}...`);
    serve({
      fetch: app.fetch,
      port
    });

    console.log(`✓ Server running at http://localhost:${port}`);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3000', 10);
  startServer(port);
}
```

---

## Testing Examples

### Integration Test Example

```typescript
// File: /workspaces/ranger/tests/api/integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCollectionRegistry } from '../../src/api/collectionRegistry.js';

describe('Cortexis API Integration', () => {
  let collectionName: string;

  beforeAll(async () => {
    collectionName = `test-${Date.now()}`;
    const registry = getCollectionRegistry();
    await registry.createCollection(collectionName, 384, 'cosine');
  });

  afterAll(async () => {
    const registry = getCollectionRegistry();
    await registry.deleteCollection(collectionName);
  });

  it('should create and retrieve collection', async () => {
    const registry = getCollectionRegistry();
    const metadata = await registry.getCollectionMetadata(collectionName);

    expect(metadata).toBeDefined();
    expect(metadata?.name).toBe(collectionName);
    expect(metadata?.dimension).toBe(384);
  });

  it('should add document and search', async () => {
    const registry = getCollectionRegistry();
    const memory = registry.getCollection(collectionName);

    expect(memory).toBeDefined();

    if (memory) {
      await memory.addDocument({
        id: 'test-doc-1',
        title: 'Test Document',
        text: 'This is a test document for search',
        source: 'test'
      });

      const results = await memory.search('test document', { k: 5 });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('test-doc-1');
    }
  });
});
```

---

## Summary

This implementation guide provides production-ready code for integrating Cortexis API with Ranger's Cognitive Knowledge Graph. All components are designed to:

1. **Leverage existing Ranger capabilities** (UnifiedMemory, VectorStore, GraphStore, CognitiveEngine)
2. **Provide HTTP REST endpoints** matching Cortexis specifications
3. **Support multiple named collections** with isolated vector/graph stores
4. **Track upload jobs** with background processing
5. **Maintain chat sessions** with search context
6. **Aggregate metrics** across all collections

Total implementation: ~2000 LOC of new code across 10-12 files
