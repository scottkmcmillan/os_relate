# Collection Management Implementation Guide

## Quick Reference

### File Structure
```
src/memory/
├── collections.ts              [NEW] CollectionManager class
├── vectorStore.ts              [UNCHANGED] VectorStore with namespace support
├── graphStore.ts               [UNCHANGED] GraphStore for relationships
├── cognitive.ts                [UNCHANGED] SONA + GNN engine
├── index.ts                    [MODIFY] Extend UnifiedMemory with collections
└── types.ts                    [OPTIONAL] Additional type definitions
```

### Database Files
```
data/
├── collections.db              [NEW] Collection metadata & mappings
├── graph.db                    [EXISTING] Graph relationships
└── (../ruvector.db)            [EXISTING] Vector embeddings
```

---

## Integration with UnifiedMemory

### Step 1: Extend UnifiedMemory Class

Update `/workspaces/ranger/src/memory/index.ts`:

```typescript
import {
  CollectionManager,
  Collection,
  CollectionStats,
  CollectionSearchOptions,
  CollectionSearchResult,
  createCollectionManager
} from './collections.js';

export class UnifiedMemory {
  private vectorStore: VectorStore;
  private graphStore: GraphStore;
  private cognitiveEngine: CognitiveEngine | null;
  private collections: CollectionManager;  // NEW
  private config: Required<UnifiedMemoryConfig>;

  constructor(config: UnifiedMemoryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize vector store
    this.vectorStore = createVectorStore(
      this.config.vectorConfig.storagePath || './ruvector.db',
      this.config.dimensions
    );

    // Initialize graph store
    this.graphStore = new GraphStore(this.config.graphDataDir);

    // Initialize collection manager (NEW)
    this.collections = createCollectionManager(
      this.config.graphDataDir,
      this.graphStore
    );

    // ... rest of initialization
  }

  // ========================================================================
  // Collection Operations (NEW)
  // ========================================================================

  /**
   * Create a new collection
   */
  createCollection(request: {
    name: string;
    dimension: number;
    metric?: 'cosine' | 'euclidean' | 'dot';
    description?: string;
    tags?: string[];
  }): Collection {
    return this.collections.createCollection(request);
  }

  /**
   * Get collection by name
   */
  getCollection(name: string): Collection | null {
    return this.collections.getCollection(name);
  }

  /**
   * List all collections with optional filtering
   */
  listCollections(filter?: {
    owner?: string;
    privacy?: string;
  }): Collection[] {
    return this.collections.listCollections(filter);
  }

  /**
   * Update collection metadata
   */
  updateCollection(name: string, request: {
    description?: string;
    tags?: string[];
    metadata?: Collection['metadata'];
  }): Collection {
    return this.collections.updateCollection(name, request);
  }

  /**
   * Delete a collection with optional data migration
   */
  deleteCollection(name: string, migrateToCollection?: string): boolean {
    return this.collections.deleteCollection(name, migrateToCollection);
  }

  // ========================================================================
  // Collection-Aware Document Operations (MODIFIED)
  // ========================================================================

  /**
   * Add a document to a specific collection
   */
  async addDocument(
    document: Document,
    collectionName: string = 'default'
  ): Promise<string> {
    // Ensure collection exists
    let collection = this.collections.getCollection(collectionName);
    if (!collection) {
      // Auto-create default collection if needed
      if (collectionName === 'default') {
        collection = this.createCollection({
          name: 'default',
          dimension: this.config.dimensions,
          metric: 'cosine'
        });
      } else {
        throw new Error(`Collection '${collectionName}' not found`);
      }
    }

    // Generate namespaced vector ID
    const namespacedId = this.collections.generateNamespacedId(
      collectionName,
      document.id
    );

    // Generate embedding
    const embedding = await embedOne(document.text, this.config.dimensions);

    // Create vector metadata with collection reference
    const vectorMetadata: StoredMetadata = {
      id: namespacedId,  // CHANGED: use namespaced ID
      text: document.text,
      timestamp: new Date().toISOString(),
      source: document.source,
      category: document.category,
      tags: document.tags,
      title: document.title,
      collection: collectionName,  // NEW: track collection
      ...document.metadata
    };

    // Insert into vector store
    await this.vectorStore.insert(embedding, vectorMetadata);

    // Record mapping in collection manager
    this.collections.recordVectorMapping(collectionName, document.id, vectorMetadata);

    // Record in graph store
    this.graphStore.createNode('Document', {
      id: namespacedId,
      title: document.title,
      source: document.source,
      category: document.category,
      tags: document.tags,
      collection: collectionName,  // NEW
      ...document.metadata
    });

    // Record document in collection
    this.collections.recordDocumentInCollection(collectionName, document.id);

    return document.id;
  }

  /**
   * Add multiple documents to a collection
   */
  async addDocuments(
    documents: Document[],
    collectionName: string = 'default'
  ): Promise<string[]> {
    // Ensure collection exists
    const collection = this.collections.getCollection(collectionName);
    if (!collection) {
      throw new Error(`Collection '${collectionName}' not found`);
    }

    // Generate embeddings in batch
    const texts = documents.map(d => d.text);
    const embeddings = await embedMany(texts, this.config.dimensions);

    // Prepare vector items with namespaced IDs
    const vectorItems: VectorItem[] = documents.map((doc, i) => {
      const namespacedId = this.collections.generateNamespacedId(
        collectionName,
        doc.id
      );

      return {
        vector: embeddings[i]!,
        metadata: {
          id: namespacedId,
          text: doc.text,
          timestamp: new Date().toISOString(),
          source: doc.source,
          category: doc.category,
          tags: doc.tags,
          title: doc.title,
          collection: collectionName,
          ...doc.metadata
        }
      };
    });

    // Batch insert into vector store
    await this.vectorStore.insertBatch(vectorItems);

    // Record all mappings
    for (const doc of documents) {
      this.collections.recordVectorMapping(collectionName, doc.id);
      this.collections.recordDocumentInCollection(collectionName, doc.id);

      // Record in graph
      const namespacedId = this.collections.generateNamespacedId(
        collectionName,
        doc.id
      );
      this.graphStore.createNode('Document', {
        id: namespacedId,
        title: doc.title,
        source: doc.source,
        category: doc.category,
        tags: doc.tags,
        collection: collectionName,
        ...doc.metadata
      });
    }

    return documents.map(d => d.id);
  }

  // ========================================================================
  // Collection-Scoped Search (NEW)
  // ========================================================================

  /**
   * Perform collection-scoped search
   */
  async searchCollections(
    query: string,
    options: CollectionSearchOptions = {}
  ): Promise<CollectionSearchResult[]> {
    // Determine which collections to search
    const collectionsToSearch = this.collections.getSearchCollections(options);

    if (collectionsToSearch.length === 0) {
      return [];
    }

    // Generate query embedding
    const queryEmbedding = await embedOne(query, this.config.dimensions);

    // Search each collection
    const allResults: SearchResult[] = [];

    for (const collectionName of collectionsToSearch) {
      const collectionPrefix = `${collectionName}:`;

      // Build collection filter
      // NOTE: This requires VectorStore support for namespace filtering
      // For now, we'll filter results after search
      const results = await this.vectorStore.search(
        queryEmbedding,
        (options.k || 10) * 2,  // Get more for filtering
        options.filter
      );

      // Filter to this collection
      const collectionResults = results.filter(r =>
        r.id.startsWith(collectionPrefix)
      );

      allResults.push(...collectionResults);
    }

    // Apply collection context
    const enriched = this.collections.applyCollectionContext(allResults, options);

    // Sort and limit
    enriched.sort((a, b) => b.score - a.score);
    const final = enriched.slice(0, options.k || 10);

    // Record search metrics
    if (options.collections && options.collections.length === 1) {
      const searchTime = 0; // TODO: measure actual time
      this.collections.recordSearchMetric(
        options.collections[0],
        searchTime,
        0  // GNN improvement
      );
    }

    return final as CollectionSearchResult[];
  }

  /**
   * Enhanced hybrid search with collection support
   */
  async search(
    query: string,
    options: HybridSearchOptions & CollectionSearchOptions = {}
  ): Promise<CollectionSearchResult[] | UnifiedSearchResult[]> {
    // If collection options provided, use collection-scoped search
    if (options.collections || options.searchAll) {
      return this.searchCollections(query, options);
    }

    // Otherwise use existing search (backward compatible)
    const results = await this.hybridSearch(query, options);

    // Enrich with collection context
    return this.collections.applyCollectionContext(
      results,
      { searchAll: true }
    ) as CollectionSearchResult[];
  }

  private async hybridSearch(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<UnifiedSearchResult[]> {
    // Existing hybrid search implementation
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

    const queryEmbedding = await embedOne(query, this.config.dimensions);
    const vectorResults = await this.vectorStore.search(
      queryEmbedding,
      opts.k * 2,
      opts.filters
    );

    let results: UnifiedSearchResult[] = vectorResults.map(vr => ({
      id: vr.id,
      title: String(vr.metadata.title || '(untitled)'),
      text: vr.metadata.text,
      source: vr.metadata.source,
      vectorScore: vr.score,
      combinedScore: vr.score * opts.vectorWeight,
      metadata: vr.metadata
    }));

    if (opts.includeRelated) {
      results = await this.enrichWithGraphData(results, opts);
    }

    if (opts.rerank && this.cognitiveEngine) {
      results = await this.rerankResults(query, results);
    }

    results.sort((a, b) => b.combinedScore - a.combinedScore);
    return results.slice(0, opts.k);
  }

  // ========================================================================
  // Collection Statistics (NEW)
  // ========================================================================

  /**
   * Get statistics for a specific collection
   */
  getCollectionStats(collectionName: string): CollectionStats | null {
    return this.collections.getCollectionStats(collectionName);
  }

  /**
   * Get aggregated statistics across all collections
   */
  getAggregatedCollectionStats() {
    return this.collections.getAggregatedStats();
  }

  /**
   * Extended stats including collection information
   */
  async getStats(): Promise<UnifiedMemoryStats & {
    collections: CollectionStats[];
    aggregatedCollections?: ReturnType<CollectionManager['getAggregatedStats']>;
  }> {
    const vectorStats = await this.vectorStore.getStats();
    const graphStats = this.graphStore.getStats();

    const collectionStats = this.collections.listCollections()
      .map(c => this.collections.getCollectionStats(c.name)!)
      .filter(Boolean);

    const stats: any = {
      vector: vectorStats,
      graph: graphStats,
      collections: collectionStats,
      aggregatedCollections: this.collections.getAggregatedStats()
    };

    if (this.cognitiveEngine) {
      stats.cognitive = this.cognitiveEngine.getStats();
    }

    return stats;
  }

  // ========================================================================
  // Migration Operations (NEW)
  // ========================================================================

  /**
   * Migrate existing unassigned data to a default collection
   */
  migrateExistingData(defaultCollectionName: string = 'default') {
    return this.collections.migrateExistingData(defaultCollectionName);
  }

  /**
   * Get migration task status
   */
  getMigrationTask(taskId: string) {
    return this.collections.getMigrationTask(taskId);
  }

  /**
   * List all migration tasks
   */
  listMigrationTasks(filter?: { status?: string; targetCollection?: string }) {
    return this.collections.listMigrationTasks(filter);
  }

  // ========================================================================
  // Resource Cleanup (MODIFIED)
  // ========================================================================

  async close(): Promise<void> {
    await this.vectorStore.close();
    this.graphStore.close();
    this.collections.close();  // NEW
  }
}
```

---

## VectorStore Modifications

### Add Namespace-Aware Filtering

Update `/workspaces/ranger/src/memory/vectorStore.ts`:

```typescript
export interface MetadataFilters {
  tier?: 'hot' | 'warm' | 'cold';
  source?: string;
  category?: string;
  tags?: string[];
  minAccessCount?: number;
  dateRange?: { start: string; end: string };
  collection?: string;              // NEW: filter by collection prefix
  _collections?: string[];          // NEW: internal use for prefixes
}

// In VectorStore class, update applyFilters:

private applyFilters(results: SearchResult[], filters: MetadataFilters): SearchResult[] {
  return results.filter(result => {
    const metadata = result.metadata;

    // NEW: Collection filter by prefix
    if (filters._collections && filters._collections.length > 0) {
      const hasCollection = filters._collections.some(prefix =>
        result.id.startsWith(prefix)
      );
      if (!hasCollection) return false;
    }

    // NEW: Collection filter by name
    if (filters.collection) {
      if (!result.id.startsWith(`${filters.collection}:`)) {
        return false;
      }
    }

    // ... rest of existing filters
    return true;
  });
}
```

---

## CLI Integration

### Add Collection Commands

Create `/workspaces/ranger/src/commands/collections.ts`:

```typescript
import { Command } from 'commander';
import { createUnifiedMemory } from '../memory/index.js';

export function addCollectionCommands(program: Command): void {
  const memory = createUnifiedMemory();

  // Collections management
  program
    .command('collections:list')
    .description('List all collections')
    .action(() => {
      const collections = memory.listCollections();
      console.table(collections.map(c => ({
        name: c.name,
        dimension: c.dimension,
        vectors: c.vectorCount,
        documents: c.documentCount,
        created: c.createdAt
      })));
    });

  program
    .command('collections:create <name>')
    .option('--dimension <number>', 'Vector dimension', '768')
    .option('--metric <type>', 'Distance metric', 'cosine')
    .option('--description <text>', 'Collection description')
    .option('--tags <tags>', 'Comma-separated tags')
    .action((name, options) => {
      const collection = memory.createCollection({
        name,
        dimension: parseInt(options.dimension),
        metric: options.metric as 'cosine' | 'euclidean' | 'dot',
        description: options.description,
        tags: options.tags?.split(',').map((t: string) => t.trim())
      });
      console.log('✓ Collection created:', collection);
    });

  program
    .command('collections:stats <name>')
    .description('Show collection statistics')
    .action((name) => {
      const stats = memory.getCollectionStats(name);
      if (!stats) {
        console.error(`Collection '${name}' not found`);
        process.exit(1);
      }
      console.table(stats);
    });

  program
    .command('collections:search <query>')
    .option('--collections <names>', 'Collections to search (comma-separated)')
    .option('-k <number>', 'Number of results', '10')
    .action(async (query, options) => {
      const collections = options.collections
        ? options.collections.split(',').map((c: string) => c.trim())
        : undefined;

      const results = await memory.searchCollections(query, {
        collections,
        k: parseInt(options.k)
      });

      console.table(results.map(r => ({
        id: r.id,
        title: r.metadata.title,
        collection: r.collectionName,
        score: r.score.toFixed(3)
      })));
    });

  program
    .command('collections:migrate')
    .option('--to <name>', 'Target collection', 'default')
    .description('Migrate existing data to collection')
    .action((options) => {
      const task = memory.migrateExistingData(options.to);
      console.log('✓ Migration started:', task.id);
      console.log(`Source: ${task.source}`);
      console.log(`Target: ${task.target}`);
      console.log(`Vectors: ${task.vectorCount}`);
    });
}
```

---

## Testing Examples

### Unit Tests

Create `/workspaces/ranger/tests/collections.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CollectionManager } from '../src/memory/collections.js';
import { GraphStore } from '../src/memory/graphStore.js';

describe('CollectionManager', () => {
  let manager: CollectionManager;
  let graphStore: GraphStore;

  beforeEach(() => {
    graphStore = new GraphStore('./test-data');
    manager = new CollectionManager('./test-data', graphStore);
  });

  describe('Collection CRUD', () => {
    it('should create a collection', () => {
      const collection = manager.createCollection({
        name: 'test-collection',
        dimension: 768,
        metric: 'cosine'
      });

      expect(collection.name).toBe('test-collection');
      expect(collection.dimension).toBe(768);
      expect(collection.metric).toBe('cosine');
    });

    it('should list collections', () => {
      manager.createCollection({
        name: 'col-1',
        dimension: 768,
        metric: 'cosine'
      });

      manager.createCollection({
        name: 'col-2',
        dimension: 1536,
        metric: 'euclidean'
      });

      const collections = manager.listCollections();
      expect(collections).toHaveLength(2);
    });

    it('should get collection by name', () => {
      manager.createCollection({
        name: 'test',
        dimension: 768,
        metric: 'cosine'
      });

      const collection = manager.getCollection('test');
      expect(collection).not.toBeNull();
      expect(collection?.name).toBe('test');
    });

    it('should update collection', () => {
      manager.createCollection({
        name: 'test',
        dimension: 768,
        metric: 'cosine'
      });

      const updated = manager.updateCollection('test', {
        description: 'Updated description',
        tags: ['production']
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.tags).toContain('production');
    });

    it('should delete collection', () => {
      manager.createCollection({
        name: 'test',
        dimension: 768,
        metric: 'cosine'
      });

      const deleted = manager.deleteCollection('test');
      expect(deleted).toBe(true);
      expect(manager.getCollection('test')).toBeNull();
    });
  });

  describe('Namespace Management', () => {
    it('should generate namespaced IDs', () => {
      const namespacedId = manager.generateNamespacedId('col-1', 'vec-123');
      expect(namespacedId).toBe('col-1:vec-123');
    });

    it('should extract collection from namespaced ID', () => {
      const collection = manager.getCollectionFromNamespacedId('col-1:vec-123');
      expect(collection).toBe('col-1');
    });

    it('should record vector mappings', () => {
      manager.createCollection({
        name: 'test-col',
        dimension: 768,
        metric: 'cosine'
      });

      manager.recordVectorMapping('test-col', 'vec-1', { text: 'content' });

      const col = manager.getCollection('test-col');
      expect(col?.vectorCount).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should record search metrics', () => {
      manager.createCollection({
        name: 'test-col',
        dimension: 768,
        metric: 'cosine'
      });

      manager.recordSearchMetric('test-col', 45.2, 0.15);

      const stats = manager.getCollectionStats('test-col');
      expect(stats?.performance.avgSearchTime).toBeGreaterThan(0);
      expect(stats?.performance.queriesPerDay).toBe(1);
    });

    it('should aggregate statistics', () => {
      manager.createCollection({
        name: 'col-1',
        dimension: 768,
        metric: 'cosine'
      });

      manager.createCollection({
        name: 'col-2',
        dimension: 1536,
        metric: 'euclidean'
      });

      const aggregated = manager.getAggregatedStats();
      expect(aggregated.collectionCount).toBe(2);
    });
  });

  describe('Migration', () => {
    it('should create migration task', () => {
      manager.createCollection({
        name: 'source',
        dimension: 768,
        metric: 'cosine'
      });

      manager.createCollection({
        name: 'target',
        dimension: 768,
        metric: 'cosine'
      });

      const task = manager.createMigrationTask({
        source: 'source',
        target: 'target',
        vectorCount: 1000
      });

      expect(task.status).toBe('pending');
      expect(task.vectorCount).toBe(1000);
    });

    it('should update migration progress', () => {
      manager.createCollection({
        name: 'target',
        dimension: 768,
        metric: 'cosine'
      });

      const task = manager.createMigrationTask({
        source: 'unassigned',
        target: 'target',
        vectorCount: 1000
      });

      manager.updateMigrationProgress(task.id, 500, 'in_progress');

      const updated = manager.getMigrationTask(task.id);
      expect(updated?.migratedCount).toBe(500);
      expect(updated?.status).toBe('in_progress');
    });
  });
});
```

---

## Performance Benchmarks

### Expected Performance

```
Operation                    Time        Notes
─────────────────────────────────────────────────────
Create collection            < 10ms     Single INSERT
Get collection               < 1ms      Single SELECT
List collections (100)       < 50ms     Full table scan
Generate namespaced ID       < 1μs      String operation
Extract collection from ID   < 1μs      Prefix matching
Record vector mapping        < 5ms      INSERT + UPDATE
Search 1 collection          45-100ms   VectorStore search
Search 5 collections         150-200ms  5x parallel searches
Record search metric         < 10ms     INSERT + UPDATE
Aggregate stats (10 cols)    < 100ms    Multiple SELECTs
Migrate 10K vectors          10-50s     Batch processing
```

### Optimization Tips

1. **Search**: Use parallel Promise.all() for multi-collection search
2. **Statistics**: Cache aggregated stats for 5 minutes
3. **Migration**: Process vectors in 5K batches for throughput
4. **Indexing**: Add indexes on frequently filtered columns
5. **Caching**: Cache collection metadata in memory after list()

---

## Migration Workflow

### Timeline

**Week 1:** Core Collection Manager
- [ ] Implement CollectionManager class
- [ ] Create database schema
- [ ] Basic CRUD operations

**Week 2:** Integration
- [ ] Extend UnifiedMemory
- [ ] Add namespace support to VectorStore
- [ ] Update CLI commands

**Week 3:** Statistics & Migration
- [ ] Statistics recording
- [ ] Aggregation queries
- [ ] Migration operations

**Week 4:** Testing & Documentation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance benchmarks
- [ ] Update documentation

---

## Troubleshooting

### Common Issues

**Issue:** "Collection not found" error
```typescript
// Solution: Ensure collection exists before adding documents
const col = memory.getCollection('col-name');
if (!col) {
  memory.createCollection({
    name: 'col-name',
    dimension: 768
  });
}
```

**Issue:** Search returns no results
```typescript
// Solution: Check namespace prefix in results
const results = await memory.searchCollections('query', {
  searchAll: true  // Don't restrict to specific collections
});
```

**Issue:** Statistics not updating
```typescript
// Solution: Ensure recordSearchMetric is called
manager.recordSearchMetric(collectionName, searchTime, gnnImprovement);

// Then query
const stats = manager.getCollectionStats(collectionName);
```

---

## Next Steps

1. **Review Design**: Get feedback on architecture
2. **Implement Phase 1**: Core CollectionManager
3. **Test Thoroughly**: Unit + integration tests
4. **Integrate Gradually**: Start with CLI, then MCP
5. **Document**: Keep docs in sync with code
6. **Optimize**: Benchmark and tune performance
7. **Deploy**: Roll out to production with migration plan

