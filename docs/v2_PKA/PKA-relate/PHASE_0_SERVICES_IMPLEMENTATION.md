# Phase 0: Graph and Memory Services Implementation

**Status**: ✅ Complete
**Date**: 2025-12-30
**Implementation**: Core CRUD services for PKA-Relate backend

## Overview

Phase 0 provides the foundational CRUD services for the PKA-Relate backend graph and memory systems. These services bridge the existing GraphStore (SQLite-based) with the PostgreSQL schema defined in the database specification.

## Files Created

### 1. Graph Node Service
**Location**: `/src/relate/graph/nodeService.ts` (307 lines)

**Purpose**: CRUD operations for `graph_nodes` table

**Key Features**:
- User-scoped node operations (all queries filtered by `user_id`)
- Support for 6 PKA-Relate node types: `system`, `value`, `focus_area`, `content`, `person`, `interaction`
- Vector embedding storage for semantic search
- Graph traversal with configurable depth using recursive CTEs
- UUID-based ID generation using `crypto.randomUUID`

**Interface**:
```typescript
interface GraphNodeService {
  createNode(userId: string, node: GraphNodeCreate): Promise<GraphNode>;
  getNode(userId: string, nodeId: string): Promise<GraphNode | null>;
  getNodesByType(userId: string, type: RelateNodeType): Promise<GraphNode[]>;
  updateNode(userId: string, nodeId: string, updates: Partial<GraphNode>): Promise<GraphNode>;
  deleteNode(userId: string, nodeId: string): Promise<void>;
  findConnectedNodes(userId: string, nodeId: string, depth?: number): Promise<GraphNode[]>;
}
```

### 2. Graph Edge Service
**Location**: `/src/relate/graph/edgeService.ts` (335 lines)

**Purpose**: CRUD operations for `graph_edges` table

**Key Features**:
- User-scoped edge operations
- Referential integrity validation (ensures source/target nodes exist)
- Self-reference prevention
- Weighted relationships (0.0 to 1.0)
- Bidirectional edge queries
- Edge direction filtering: `in`, `out`, `both`

**Interface**:
```typescript
interface GraphEdgeService {
  createEdge(userId: string, edge: GraphEdgeCreate): Promise<GraphEdge>;
  getEdge(userId: string, edgeId: string): Promise<GraphEdge | null>;
  getEdgesBetween(userId: string, sourceId: string, targetId: string): Promise<GraphEdge[]>;
  getNodeEdges(userId: string, nodeId: string, direction?: 'in' | 'out' | 'both'): Promise<GraphEdge[]>;
  updateEdge(userId: string, edgeId: string, updates: Partial<GraphEdge>): Promise<GraphEdge>;
  deleteEdge(userId: string, edgeId: string): Promise<void>;
}
```

### 3. Memory Entry Service
**Location**: `/src/relate/memory/entryService.ts` (396 lines)

**Purpose**: CRUD operations for `memory_entries` table

**Key Features**:
- User-scoped memory operations
- Vector similarity search using pgvector (`<=>` operator)
- Support for 4 content types: `interaction`, `note`, `insight`, `reflection`
- Namespace-based filtering (entity types)
- Date range queries
- Similarity threshold filtering
- Embedding update operations

**Interface**:
```typescript
interface MemoryEntryService {
  createEntry(userId: string, entry: MemoryEntryCreate): Promise<MemoryEntry>;
  getEntry(userId: string, entryId: string): Promise<MemoryEntry | null>;
  searchEntries(userId: string, queryEmbedding: number[], options?: SearchOptions): Promise<MemoryEntry[]>;
  getEntriesByNamespace(userId: string, namespace: string): Promise<MemoryEntry[]>;
  updateEntry(userId: string, entryId: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry>;
  deleteEntry(userId: string, entryId: string): Promise<void>;
  updateEmbedding(userId: string, entryId: string, embedding: number[]): Promise<MemoryEntry>;
}
```

### 4. Graph Services Index
**Location**: `/src/relate/graph/index.ts` (386 lines)

**Purpose**: Unified facade combining node and edge services

**Key Features**:
- Combined API for graph operations
- High-level graph algorithms:
  - `getNeighbors()` - Get immediate neighbors with edges
  - `getSubgraph()` - Extract subgraph within max depth
  - `findPath()` - BFS shortest path between nodes
  - `getNodeDegree()` - Calculate in/out/total degree
- Re-exports all types from node and edge services
- Provides `GraphService` facade class

### 5. Memory Services Index
**Location**: `/src/relate/memory/index.ts` (39 lines)

**Purpose**: Export memory services and types

## Design Decisions

### 1. Database Abstraction
All services use a `DatabaseClient` interface:
```typescript
interface DatabaseClient {
  query(sql: string, params: any[]): Promise<{ rows: any[] }>;
}
```

This allows compatibility with:
- PostgreSQL (`pg` library)
- SQLite (`better-sqlite3` with async wrapper)
- Mock databases for testing

### 2. User-Based Multi-Tenancy
All operations require a `userId` parameter and automatically filter by `user_id` column. This ensures:
- Data isolation between users
- Row-level security
- Simplified authorization (service layer enforces access control)

### 3. UUID Generation
Uses Node.js built-in `crypto.randomUUID()` for ID generation:
- No external dependencies
- RFC 4122 compliant UUIDs
- Cryptographically secure

### 4. Error Handling
Custom error classes for domain-specific exceptions:
- `NodeNotFoundError` - Node doesn't exist
- `EdgeNotFoundError` - Edge doesn't exist
- `InvalidEdgeError` - Edge validation failed
- `EntryNotFoundError` - Memory entry doesn't exist

### 5. Type Safety
Full TypeScript typing with:
- Strict interface definitions
- Discriminated unions for node/content types
- Partial types for update operations
- Type guards in mapping functions

### 6. Vector Search
Memory service uses pgvector's cosine similarity operator:
```sql
1 - (embedding <=> $1::vector) as similarity
```

Returns results ordered by similarity with configurable threshold.

## Usage Examples

### Creating a Knowledge Graph

```typescript
import { GraphService } from './src/relate/graph/index.js';

const graph = new GraphService(database);

// Create person node
const person = await graph.createNode(userId, {
  type: 'person',
  label: 'Alice',
  metadata: { role: 'friend', age: 30 }
});

// Create focus area node
const focus = await graph.createNode(userId, {
  type: 'focus_area',
  label: 'Career Growth',
  metadata: { progress: 75, priority: 'high' }
});

// Connect them
const edge = await graph.createEdge(userId, {
  source_id: person.id,
  target_id: focus.id,
  type: 'influences',
  weight: 0.9
});

// Find connected nodes
const connected = await graph.findConnectedNodes(userId, person.id, 2);
```

### Storing and Searching Memories

```typescript
import { MemoryEntryService } from './src/relate/memory/index.js';

const memory = new MemoryEntryService(database);

// Store interaction
const entry = await memory.createEntry(userId, {
  content: 'Had a productive conversation about career goals',
  content_type: 'interaction',
  embedding: await embedText('productive conversation career goals'),
  entity_id: person.id,
  entity_type: 'person',
  metadata: { sentiment: 'positive', duration: '30min' }
});

// Search by similarity
const queryEmbedding = await embedText('career discussions');
const similar = await memory.searchEntries(userId, queryEmbedding, {
  limit: 10,
  content_type: 'interaction',
  similarity_threshold: 0.7
});
```

## Testing Considerations

### Unit Tests Needed
1. **Node Service**:
   - CRUD operations
   - User isolation
   - Graph traversal
   - Type filtering

2. **Edge Service**:
   - CRUD operations
   - Referential integrity
   - Self-reference prevention
   - Direction filtering

3. **Memory Service**:
   - CRUD operations
   - Vector similarity search
   - Namespace filtering
   - Embedding updates

### Integration Tests Needed
1. Complete graph operations (nodes + edges)
2. Subgraph extraction
3. Path finding algorithms
4. Memory search with real embeddings

## Next Steps (Phase 1)

1. **Database Client Implementation**:
   - Create PostgreSQL client wrapper
   - Add connection pooling
   - Implement transaction support

2. **Migration Tools**:
   - SQLite → PostgreSQL migration scripts
   - Data validation and integrity checks

3. **API Routes**:
   - REST endpoints for graph operations
   - REST endpoints for memory operations
   - Authentication middleware integration

4. **Testing Suite**:
   - Unit tests with mock database
   - Integration tests with test database
   - Performance benchmarks

5. **Documentation**:
   - API documentation
   - Usage examples
   - Performance guidelines

## Schema Compatibility

All services are fully compatible with the database schema defined in:
`/docs/v2_PKA/PKA-relate/data-models/database_schema.sql`

**Tables Used**:
- `graph_nodes` (lines 456-471)
- `graph_edges` (lines 472-487)
- `memory_entries` (lines 488-506)

**Indexes Used**:
- `idx_nodes_user` - User filtering
- `idx_nodes_type` - Type filtering
- `idx_edges_source` - Edge traversal
- `idx_edges_target` - Reverse traversal
- `idx_memory_embedding` - Vector similarity (IVFFlat)

## Performance Notes

1. **Graph Traversal**: Uses PostgreSQL recursive CTEs for efficient multi-hop queries
2. **Vector Search**: Leverages IVFFlat indexes for fast similarity search (100 lists)
3. **User Filtering**: All queries use indexed `user_id` column
4. **JSON Storage**: Uses JSONB for metadata with GIN indexing support

## Lines of Code Summary

| Service | Lines | Purpose |
|---------|-------|---------|
| nodeService.ts | 307 | Graph node CRUD |
| edgeService.ts | 335 | Graph edge CRUD |
| entryService.ts | 396 | Memory entry CRUD |
| graph/index.ts | 386 | Graph facade & algorithms |
| memory/index.ts | 39 | Memory exports |
| **Total** | **1,463** | **Phase 0 Implementation** |

---

**Status**: ✅ Implementation complete and ready for integration testing
