# Cortexis Collection Management API Reference

## Overview

This document provides a complete API reference for the Collection Management System designed for Cortexis integration with Ranger.

---

## Collection API

### Types

#### Collection

```typescript
interface Collection {
  name: string;                    // Unique identifier
  dimension: number;               // Vector embedding dimension
  metric: 'cosine' | 'euclidean' | 'dot';
  vectorCount: number;             // Total vectors in collection
  documentCount: number;           // Total documents in collection
  createdAt: string;               // ISO 8601 timestamp
  lastUpdated: string;             // ISO 8601 timestamp
  description?: string;
  tags?: string[];
  stats: {
    avgSearchTime: number;         // Average search latency (ms)
    queriesPerDay: number;         // Queries executed per day
    gnnImprovement: number;        // GNN reranking improvement (0-1)
  };
  metadata?: {
    owner?: string;
    privacy?: 'public' | 'private' | 'shared';
    [key: string]: unknown;
  };
}
```

#### CollectionStats

```typescript
interface CollectionStats {
  name: string;
  vectorCount: number;
  documentCount: number;
  storageSize: number;
  performance: {
    avgSearchTime: number;
    queriesPerDay: number;
    gnnImprovement: number;
  };
  tierDistribution: {
    hot: number;
    warm: number;
    cold: number;
  };
  lastQueryTime?: string;
  indexStatus: 'building' | 'ready' | 'updating';
}
```

#### AggregatedStats

```typescript
interface AggregatedStats {
  totalVectors: number;           // Sum across all collections
  totalDocuments: number;         // Sum across all collections
  collectionCount: number;        // Number of collections
  avgSearchTime: number;          // Average across all collections
  totalQueriesPerDay: number;     // Sum across all collections
  collections: CollectionStats[]; // Per-collection stats
}
```

### Methods

#### createCollection(request: CreateCollectionRequest): Collection

Create a new collection.

**Parameters:**
```typescript
interface CreateCollectionRequest {
  name: string;                   // Alphanumeric + underscore/dash
  dimension: number;              // e.g., 768, 1536
  metric?: 'cosine' | 'euclidean' | 'dot';
  description?: string;
  tags?: string[];
  metadata?: {
    owner?: string;
    privacy?: 'public' | 'private' | 'shared';
    [key: string]: unknown;
  };
}
```

**Returns:** `Collection`

**Example:**
```typescript
const collection = manager.createCollection({
  name: 'documents-2024',
  dimension: 768,
  metric: 'cosine',
  description: 'Q4 2024 documents',
  tags: ['production', 'documents'],
  metadata: {
    owner: 'team-a',
    privacy: 'shared'
  }
});
```

**Errors:**
- `Error`: Collection name invalid (must be alphanumeric)
- `Error`: Collection already exists

---

#### getCollection(name: string): Collection | null

Get a collection by name.

**Parameters:**
- `name: string` - Collection name

**Returns:** `Collection | null`

**Example:**
```typescript
const collection = manager.getCollection('documents-2024');
if (collection) {
  console.log(`Vectors: ${collection.vectorCount}`);
}
```

---

#### listCollections(filter?: CollectionFilter): Collection[]

List all collections with optional filtering.

**Parameters:**
```typescript
interface CollectionFilter {
  owner?: string;
  privacy?: 'public' | 'private' | 'shared';
}
```

**Returns:** `Collection[]`

**Example:**
```typescript
// List all collections
const all = manager.listCollections();

// List by owner
const teamA = manager.listCollections({ owner: 'team-a' });

// List public collections
const public = manager.listCollections({ privacy: 'public' });
```

---

#### updateCollection(name: string, request: UpdateCollectionRequest): Collection

Update collection metadata.

**Parameters:**
```typescript
interface UpdateCollectionRequest {
  description?: string;
  tags?: string[];
  metadata?: {
    owner?: string;
    privacy?: 'public' | 'private' | 'shared';
    [key: string]: unknown;
  };
}
```

**Returns:** `Collection` (updated)

**Example:**
```typescript
const updated = manager.updateCollection('documents-2024', {
  description: 'Updated Q4 2024 documents',
  tags: ['production', 'documents', 'archived'],
  metadata: { owner: 'team-b' }
});
```

---

#### deleteCollection(name: string, migrateToCollection?: string): boolean

Delete a collection with optional data migration.

**Parameters:**
- `name: string` - Collection to delete
- `migrateToCollection?: string` - Target collection for data migration

**Returns:** `boolean` (true if deleted)

**Example:**
```typescript
// Delete without migration
manager.deleteCollection('documents-2024');

// Delete with migration
manager.deleteCollection('documents-2024', 'archive-2024');
// Creates migration task: documents-2024 → archive-2024
```

---

## Statistics API

#### getCollectionStats(collectionName: string): CollectionStats | null

Get statistics for a specific collection.

**Parameters:**
- `collectionName: string` - Collection name

**Returns:** `CollectionStats | null`

**Example:**
```typescript
const stats = manager.getCollectionStats('documents-2024');

if (stats) {
  console.log(`Vectors: ${stats.vectorCount}`);
  console.log(`Avg search time: ${stats.performance.avgSearchTime}ms`);
  console.log(`Queries/day: ${stats.performance.queriesPerDay}`);
  console.log(`GNN improvement: ${(stats.performance.gnnImprovement * 100).toFixed(2)}%`);
}
```

**Cortexis Output:**
```json
{
  "name": "documents-2024",
  "vectorCount": 10000,
  "documentCount": 5000,
  "storageSize": 52428800,
  "performance": {
    "avgSearchTime": 42.5,
    "queriesPerDay": 150,
    "gnnImprovement": 0.18
  },
  "tierDistribution": {
    "hot": 2000,
    "warm": 5000,
    "cold": 3000
  },
  "lastQueryTime": "2024-12-23T19:06:00Z",
  "indexStatus": "ready"
}
```

---

#### getAggregatedStats(): AggregatedStats

Get aggregated statistics across all collections.

**Returns:** `AggregatedStats`

**Example:**
```typescript
const aggregated = manager.getAggregatedStats();

console.log(`Total vectors: ${aggregated.totalVectors}`);
console.log(`Total documents: ${aggregated.totalDocuments}`);
console.log(`Collections: ${aggregated.collectionCount}`);
console.log(`Overall avg search: ${aggregated.avgSearchTime}ms`);
console.log(`Total queries/day: ${aggregated.totalQueriesPerDay}`);
```

**Cortexis Output:**
```json
{
  "totalVectors": 50000,
  "totalDocuments": 25000,
  "collectionCount": 5,
  "avgSearchTime": 45.2,
  "totalQueriesPerDay": 1250,
  "collections": [
    {
      "name": "documents-2024",
      "vectorCount": 10000,
      "documentCount": 5000,
      ...
    },
    ...
  ]
}
```

---

#### recordSearchMetric(collectionName: string, searchTime: number, gnnImprovement?: number): void

Record search metrics for a collection.

**Parameters:**
- `collectionName: string` - Collection name
- `searchTime: number` - Search duration in milliseconds
- `gnnImprovement?: number` - GNN improvement factor (0-1)

**Note:** Automatically called by search operations. Manual calls for custom search implementations.

**Example:**
```typescript
const startTime = performance.now();
const results = await customSearch(query);
const searchTime = performance.now() - startTime;

manager.recordSearchMetric('documents-2024', searchTime, 0.15);
```

---

## Vector Namespace API

#### generateNamespacedId(collectionName: string, originalId: string): string

Generate a namespaced vector ID for a collection.

**Parameters:**
- `collectionName: string` - Collection name
- `originalId: string` - Original vector ID

**Returns:** `string` (namespaced ID)

**Format:** `{collectionName}:{originalId}`

**Example:**
```typescript
const namespacedId = manager.generateNamespacedId('documents-2024', 'vec_12345');
// Result: 'documents-2024:vec_12345'
```

---

#### getCollectionFromNamespacedId(namespacedId: string): string | null

Extract collection name from a namespaced vector ID.

**Parameters:**
- `namespacedId: string` - Namespaced vector ID

**Returns:** `string | null` (collection name or null)

**Example:**
```typescript
const collectionName = manager.getCollectionFromNamespacedId('documents-2024:vec_12345');
// Result: 'documents-2024'
```

---

#### recordVectorMapping(collectionName: string, vectorId: string, metadata?: Record<string, unknown>): void

Record a vector in the collection mapping table.

**Parameters:**
- `collectionName: string` - Collection name
- `vectorId: string` - Original vector ID
- `metadata?: Record<string, unknown>` - Optional vector metadata

**Note:** Automatically called by document insertion. Manual calls for bulk imports.

**Example:**
```typescript
manager.recordVectorMapping('documents-2024', 'vec_12345', {
  text: 'Document content',
  source: 'file.txt'
});
```

---

#### recordDocumentInCollection(collectionName: string, documentId: string): void

Record a document as part of a collection.

**Parameters:**
- `collectionName: string` - Collection name
- `documentId: string` - Document ID

**Note:** Automatically called by document insertion.

**Example:**
```typescript
manager.recordDocumentInCollection('documents-2024', 'doc_123');
```

---

#### removeVectorMapping(namespacedId: string): void

Remove a vector from the collection mapping.

**Parameters:**
- `namespacedId: string` - Namespaced vector ID

**Example:**
```typescript
manager.removeVectorMapping('documents-2024:vec_12345');
```

---

## Search API

### SearchResult Types

#### CollectionSearchResult

```typescript
interface CollectionSearchResult extends SearchResult {
  collectionName: string;
  collectionMetadata?: Partial<Collection>;
}
```

### Methods

#### getSearchCollections(options?: CollectionSearchOptions): string[]

Determine which collections to search based on options.

**Parameters:**
```typescript
interface CollectionSearchOptions {
  collections?: string[];        // Specific collections
  searchAll?: boolean;           // Search all collections
  k?: number;                    // Results per collection
  filter?: MetadataFilters;
  includeCollectionInfo?: boolean;
  mergeResults?: boolean;
  collectionWeights?: Record<string, number>;
}
```

**Returns:** `string[]` (array of collection names)

**Example:**
```typescript
// Search specific collections
const collections = manager.getSearchCollections({
  collections: ['documents-2024', 'archive-2024']
});
// Result: ['documents-2024', 'archive-2024']

// Search all collections
const allCollections = manager.getSearchCollections({ searchAll: true });
// Result: ['documents-2024', 'archive-2024', 'temp-docs', ...]
```

---

#### applyCollectionContext(results: SearchResult[], options?: CollectionSearchOptions): CollectionSearchResult[]

Enrich search results with collection context.

**Parameters:**
- `results: SearchResult[]` - Raw vector search results
- `options?: CollectionSearchOptions` - Search options

**Returns:** `CollectionSearchResult[]` (results with collection info)

**Example:**
```typescript
const rawResults = await vectorStore.search(embedding, 10);

const enrichedResults = manager.applyCollectionContext(rawResults, {
  includeCollectionInfo: true
});

// Each result now has:
// - collectionName: 'documents-2024'
// - collectionMetadata: { name, dimension, metric, vectorCount }
```

---

## Migration API

### Types

#### MigrationTask

```typescript
interface MigrationTask {
  id: string;
  source: string;                // Source collection or 'unassigned'
  target: string;                // Target collection
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  vectorCount: number;           // Total vectors to migrate
  migratedCount: number;         // Vectors migrated so far
  error?: string;                // Error message if failed
  createdAt: string;             // ISO 8601
  completedAt?: string;          // ISO 8601 (if completed/failed)
}
```

### Methods

#### createMigrationTask(request: MigrationRequest): MigrationTask

Create a migration task.

**Parameters:**
```typescript
interface MigrationRequest {
  source?: string;
  target: string;
  vectorCount: number;
}
```

**Returns:** `MigrationTask`

**Example:**
```typescript
const task = manager.createMigrationTask({
  source: 'documents-2024',
  target: 'archive-2024',
  vectorCount: 10000
});

console.log(`Migration ${task.id} created`);
console.log(`Status: ${task.status}`); // 'pending'
```

---

#### getMigrationTask(id: string): MigrationTask | null

Get migration task by ID.

**Parameters:**
- `id: string` - Task ID

**Returns:** `MigrationTask | null`

**Example:**
```typescript
const task = manager.getMigrationTask('migration_123_abc');

if (task) {
  console.log(`Progress: ${task.migratedCount}/${task.vectorCount}`);
  console.log(`Status: ${task.status}`);
  if (task.error) console.error(`Error: ${task.error}`);
}
```

---

#### listMigrationTasks(filter?: MigrationFilter): MigrationTask[]

List migration tasks with optional filtering.

**Parameters:**
```typescript
interface MigrationFilter {
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  targetCollection?: string;
}
```

**Returns:** `MigrationTask[]`

**Example:**
```typescript
// List all pending migrations
const pending = manager.listMigrationTasks({ status: 'pending' });

// List migrations to specific collection
const toArchive = manager.listMigrationTasks({ targetCollection: 'archive-2024' });
```

---

#### updateMigrationProgress(id: string, migratedCount: number, status?: string, error?: string): void

Update migration task progress.

**Parameters:**
- `id: string` - Task ID
- `migratedCount: number` - New migrated count
- `status?: string` - New status
- `error?: string` - Optional error message

**Example:**
```typescript
// During migration
manager.updateMigrationProgress(task.id, 5000, 'in_progress');

// On completion
manager.updateMigrationProgress(task.id, 10000, 'completed');

// On error
manager.updateMigrationProgress(task.id, 7500, 'failed', 'Database error');
```

---

#### migrateExistingData(defaultCollectionName?: string): MigrationTask

Migrate existing unassigned vectors to a default collection.

**Parameters:**
- `defaultCollectionName?: string` - Target collection name (default: 'default')

**Returns:** `MigrationTask`

**Example:**
```typescript
// Create migration for all existing data
const task = manager.migrateExistingData('default');

console.log(`Migrating ${task.vectorCount} vectors to 'default' collection`);

// Monitor progress
const interval = setInterval(() => {
  const updated = manager.getMigrationTask(task.id);
  console.log(`Progress: ${updated.migratedCount}/${updated.vectorCount}`);

  if (updated.status === 'completed') {
    console.log('Migration complete!');
    clearInterval(interval);
  }
}, 5000);
```

---

## Cortexis REST Endpoints

### Collection Management

#### POST /api/v1/collections

Create a new collection.

**Request:**
```json
{
  "name": "documents-2024",
  "dimension": 768,
  "metric": "cosine",
  "description": "Q4 2024 documents",
  "tags": ["production"],
  "metadata": {
    "owner": "team-a",
    "privacy": "shared"
  }
}
```

**Response (201 Created):**
```json
{
  "name": "documents-2024",
  "dimension": 768,
  "metric": "cosine",
  "vectorCount": 0,
  "documentCount": 0,
  "createdAt": "2024-12-23T19:06:00Z",
  "lastUpdated": "2024-12-23T19:06:00Z",
  "stats": {
    "avgSearchTime": 0,
    "queriesPerDay": 0,
    "gnnImprovement": 0
  }
}
```

---

#### GET /api/v1/collections

List all collections.

**Query Parameters:**
- `owner?: string` - Filter by owner
- `privacy?: string` - Filter by privacy level

**Response (200 OK):**
```json
[
  {
    "name": "documents-2024",
    "dimension": 768,
    "metric": "cosine",
    "vectorCount": 10000,
    "documentCount": 5000,
    ...
  },
  ...
]
```

---

#### GET /api/v1/collections/{name}

Get collection details.

**Path Parameters:**
- `name: string` - Collection name

**Response (200 OK):**
```json
{
  "name": "documents-2024",
  "dimension": 768,
  "metric": "cosine",
  "vectorCount": 10000,
  "documentCount": 5000,
  ...
}
```

**Response (404 Not Found):**
```json
{
  "error": "Collection not found",
  "name": "documents-2024"
}
```

---

#### PATCH /api/v1/collections/{name}

Update collection metadata.

**Path Parameters:**
- `name: string` - Collection name

**Request:**
```json
{
  "description": "Updated Q4 2024 documents",
  "tags": ["production", "archived"],
  "metadata": {
    "owner": "team-b"
  }
}
```

**Response (200 OK):**
```json
{
  "name": "documents-2024",
  "lastUpdated": "2024-12-23T19:10:00Z",
  ...
}
```

---

#### DELETE /api/v1/collections/{name}

Delete a collection.

**Path Parameters:**
- `name: string` - Collection name

**Query Parameters:**
- `migrateToCollection?: string` - Target collection for migration

**Response (204 No Content)**

---

### Statistics

#### GET /api/v1/collections/{name}/stats

Get collection statistics.

**Path Parameters:**
- `name: string` - Collection name

**Response (200 OK):**
```json
{
  "name": "documents-2024",
  "vectorCount": 10000,
  "documentCount": 5000,
  "storageSize": 52428800,
  "performance": {
    "avgSearchTime": 42.5,
    "queriesPerDay": 150,
    "gnnImprovement": 0.18
  },
  "tierDistribution": {
    "hot": 2000,
    "warm": 5000,
    "cold": 3000
  },
  "lastQueryTime": "2024-12-23T19:06:00Z",
  "indexStatus": "ready"
}
```

---

#### GET /api/v1/collections/stats/aggregated

Get aggregated statistics across all collections.

**Response (200 OK):**
```json
{
  "totalVectors": 50000,
  "totalDocuments": 25000,
  "collectionCount": 5,
  "avgSearchTime": 45.2,
  "totalQueriesPerDay": 1250,
  "collections": [
    {
      "name": "documents-2024",
      ...
    },
    ...
  ]
}
```

---

### Search

#### POST /api/v1/search

Search across collections.

**Request:**
```json
{
  "query": "search query",
  "collections": ["documents-2024", "archive-2024"],
  "k": 10,
  "filters": {
    "category": "reports"
  }
}
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": "documents-2024:vec_12345",
      "score": 0.95,
      "collectionName": "documents-2024",
      "metadata": {
        "title": "Document Title",
        "text": "Document content...",
        "source": "source.txt"
      }
    },
    ...
  ],
  "count": 10,
  "totalTime": 42.5
}
```

---

### Migration

#### POST /api/v1/migrations

Create a migration task.

**Request:**
```json
{
  "source": "documents-2024",
  "target": "archive-2024",
  "vectorCount": 10000
}
```

**Response (201 Created):**
```json
{
  "id": "migration_123_abc",
  "source": "documents-2024",
  "target": "archive-2024",
  "status": "pending",
  "vectorCount": 10000,
  "migratedCount": 0,
  "createdAt": "2024-12-23T19:06:00Z"
}
```

---

#### GET /api/v1/migrations/{id}

Get migration task status.

**Path Parameters:**
- `id: string` - Migration task ID

**Response (200 OK):**
```json
{
  "id": "migration_123_abc",
  "source": "documents-2024",
  "target": "archive-2024",
  "status": "in_progress",
  "vectorCount": 10000,
  "migratedCount": 5000,
  "createdAt": "2024-12-23T19:06:00Z"
}
```

---

#### GET /api/v1/migrations

List migration tasks.

**Query Parameters:**
- `status?: string` - Filter by status
- `targetCollection?: string` - Filter by target

**Response (200 OK):**
```json
{
  "tasks": [
    {
      "id": "migration_123_abc",
      "source": "documents-2024",
      "target": "archive-2024",
      "status": "in_progress",
      ...
    },
    ...
  ]
}
```

---

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: string;              // Error message
  code?: string;              // Error code
  details?: Record<string, unknown>;  // Additional details
}
```

### Common Errors

| HTTP Status | Error | Description |
|------------|-------|-------------|
| 400 | `INVALID_COLLECTION_NAME` | Collection name doesn't match pattern |
| 400 | `INVALID_DIMENSION` | Dimension not supported |
| 409 | `COLLECTION_EXISTS` | Collection name already in use |
| 404 | `NOT_FOUND` | Collection or resource not found |
| 500 | `INTERNAL_ERROR` | Database or system error |

---

## Rate Limiting

Recommended rate limits for Cortexis endpoints:

- **Search**: 1000 requests/minute
- **Collection CRUD**: 100 requests/minute
- **Statistics**: 500 requests/minute
- **Migration**: No limit (background task)

---

## Pagination

For list endpoints supporting pagination:

```typescript
interface PaginationParams {
  page?: number;      // 1-indexed (default: 1)
  pageSize?: number;  // Default: 20, max: 100
  sort?: string;      // Field to sort by
  order?: 'asc' | 'desc';  // Default: desc
}
```

**Example:**
```
GET /api/v1/collections?page=2&pageSize=10&sort=createdAt&order=desc
```

---

## Versioning

The API uses version prefixes: `/api/v1/`

Future versions will use `/api/v2/`, `/api/v3/`, etc.

Backward compatibility is maintained for v1 endpoints across minor versions.

