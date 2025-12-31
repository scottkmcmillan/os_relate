# PKA-Relate Backend Quick Start Guide

## Phase 0: Using the Graph and Memory Services

### Prerequisites

```bash
# Install PostgreSQL client
npm install pg @types/pg

# Or use existing better-sqlite3 for testing
npm install better-sqlite3 @types/better-sqlite3
```

### Basic Setup

#### 1. Database Connection

```typescript
import { Pool } from 'pg';

// PostgreSQL setup
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pka_relate',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

// Wrapper to match DatabaseClient interface
const database = {
  async query(sql: string, params: any[]) {
    return pool.query(sql, params);
  }
};
```

#### 2. Initialize Services

```typescript
import { GraphService } from './src/relate/graph/index.js';
import { MemoryEntryService } from './src/relate/memory/index.js';

const graphService = new GraphService(database);
const memoryService = new MemoryEntryService(database);
```

### Common Use Cases

#### Use Case 1: Building a Personal Knowledge Graph

```typescript
// 1. Create core value node
const coreValue = await graphService.createNode(userId, {
  type: 'value',
  label: 'Continuous Learning',
  metadata: {
    category: 'Primary',
    description: 'Always seeking new knowledge and skills'
  }
});

// 2. Create focus area
const focusArea = await graphService.createNode(userId, {
  type: 'focus_area',
  label: 'Master TypeScript',
  metadata: {
    progress: 65,
    target_date: '2025-06-30',
    streak: 12
  }
});

// 3. Link value to focus area
const alignment = await graphService.createEdge(userId, {
  source_id: coreValue.id,
  target_id: focusArea.id,
  type: 'aligns_with',
  weight: 0.95,
  metadata: { reason: 'Learning TypeScript aligns with continuous learning value' }
});

// 4. Create content item
const contentItem = await graphService.createNode(userId, {
  type: 'content',
  label: 'Advanced TypeScript Course',
  metadata: {
    url: 'https://example.com/typescript-course',
    type: 'video',
    status: 'in_progress'
  }
});

// 5. Link content to focus area
await graphService.createEdge(userId, {
  source_id: focusArea.id,
  target_id: contentItem.id,
  type: 'supported_by',
  weight: 0.8
});
```

#### Use Case 2: Tracking Relationship Interactions

```typescript
// 1. Create person node
const person = await graphService.createNode(userId, {
  type: 'person',
  label: 'Sarah Johnson',
  metadata: {
    relationship_type: 'colleague',
    met_date: '2024-01-15'
  }
});

// 2. Create interaction node
const interaction = await graphService.createNode(userId, {
  type: 'interaction',
  label: 'Coffee Chat - Q4 Planning',
  metadata: {
    date: '2025-12-28',
    type: 'conversation',
    outcome: 'positive',
    duration_minutes: 45
  }
});

// 3. Link person to interaction
await graphService.createEdge(userId, {
  source_id: person.id,
  target_id: interaction.id,
  type: 'participated_in',
  weight: 1.0
});

// 4. Store memory of interaction
const embedding = await generateEmbedding(
  'Had a productive coffee chat with Sarah about Q4 planning. ' +
  'Discussed project priorities and team collaboration strategies.'
);

await memoryService.createEntry(userId, {
  content: 'Productive Q4 planning discussion with Sarah. Key topics: project priorities, team collaboration, upcoming milestones.',
  content_type: 'interaction',
  embedding: embedding,
  entity_id: interaction.id,
  entity_type: 'interaction',
  metadata: {
    sentiment: 'positive',
    topics: ['planning', 'collaboration', 'priorities'],
    action_items: ['Schedule team sync', 'Review Q4 goals']
  }
});
```

#### Use Case 3: Semantic Memory Search

```typescript
// Search for related memories
async function searchRelatedMemories(query: string) {
  // Generate embedding for search query
  const queryEmbedding = await generateEmbedding(query);

  // Search with filters
  const results = await memoryService.searchEntries(userId, queryEmbedding, {
    limit: 10,
    content_type: 'interaction',
    similarity_threshold: 0.7,
    start_date: new Date('2025-01-01')
  });

  return results.map(entry => ({
    content: entry.content,
    date: entry.timestamp,
    metadata: entry.metadata,
    entity_type: entry.entity_type
  }));
}

// Example: Find interactions about career growth
const careerMemories = await searchRelatedMemories('career growth discussions');
```

#### Use Case 4: Graph Traversal and Analysis

```typescript
// Find all content supporting a focus area (2 hops)
const focusAreaId = 'uuid-of-focus-area';
const relatedContent = await graphService.findConnectedNodes(
  userId,
  focusAreaId,
  2 // depth
);

// Filter to only content nodes
const contentNodes = relatedContent.filter(node => node.type === 'content');

// Get subgraph for visualization
const subgraph = await graphService.getSubgraph(userId, focusAreaId, 2);
console.log(`Subgraph: ${subgraph.nodes.length} nodes, ${subgraph.edges.length} edges`);

// Calculate node importance
const degree = await graphService.getNodeDegree(userId, focusAreaId);
console.log(`Node connections: ${degree.total} (${degree.in} in, ${degree.out} out)`);

// Find path between two nodes
const pathToValue = await graphService.findPath(userId, contentItem.id, coreValue.id);
if (pathToValue) {
  console.log('Connection path:', pathToValue.map(n => n.label).join(' -> '));
}
```

#### Use Case 5: System Integration

```typescript
// Create a sub-system for organizing knowledge
const system = await graphService.createNode(userId, {
  type: 'system',
  label: 'Professional Development',
  metadata: {
    description: 'Career growth and skill development',
    icon: 'target',
    color: 'hsl(221, 83%, 53%)',
    item_count: 0
  }
});

// Link focus area to system
await graphService.createEdge(userId, {
  source_id: system.id,
  target_id: focusArea.id,
  type: 'contains',
  weight: 1.0
});

// Get all focus areas in a system
const systemEdges = await graphService.getNodeEdges(userId, system.id, 'out');
const focusAreaIds = systemEdges
  .filter(e => e.type === 'contains')
  .map(e => e.target_id);

const focusAreas = await Promise.all(
  focusAreaIds.map(id => graphService.getNode(userId, id))
);
```

### Helper Functions

#### Embedding Generation

```typescript
// Using OpenAI (example)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536
  });

  return response.data[0].embedding;
}
```

#### Batch Operations

```typescript
// Create multiple nodes in a transaction
async function createKnowledgeGraph(userId: string, data: any) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create nodes
    const nodes = [];
    for (const item of data.nodes) {
      const node = await graphService.createNode(userId, item);
      nodes.push(node);
    }

    // Create edges
    for (const edge of data.edges) {
      await graphService.createEdge(userId, {
        source_id: nodes[edge.sourceIndex].id,
        target_id: nodes[edge.targetIndex].id,
        type: edge.type,
        weight: edge.weight
      });
    }

    await client.query('COMMIT');
    return nodes;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Error Handling

```typescript
import {
  NodeNotFoundError,
  EdgeNotFoundError,
  InvalidEdgeError,
  EntryNotFoundError
} from './src/relate/graph/index.js';

async function safeNodeUpdate(userId: string, nodeId: string, updates: any) {
  try {
    return await graphService.updateNode(userId, nodeId, updates);
  } catch (error) {
    if (error instanceof NodeNotFoundError) {
      console.error('Node does not exist:', nodeId);
      return null;
    }
    throw error; // Re-throw other errors
  }
}

async function safeEdgeCreation(userId: string, edge: any) {
  try {
    return await graphService.createEdge(userId, edge);
  } catch (error) {
    if (error instanceof InvalidEdgeError) {
      console.error('Invalid edge:', error.message);
      return null;
    }
    throw error;
  }
}
```

### Testing Setup

```typescript
// Mock database for testing
const mockDatabase = {
  data: new Map(),

  async query(sql: string, params: any[]) {
    // Simple mock implementation
    if (sql.includes('INSERT INTO graph_nodes')) {
      const id = params[0];
      this.data.set(id, {
        id,
        user_id: params[1],
        type: params[2],
        label: params[3],
        metadata: params[4],
        embedding: params[5],
        position: params[6],
        created_at: params[7]
      });
      return { rows: [this.data.get(id)] };
    }

    if (sql.includes('SELECT * FROM graph_nodes WHERE id')) {
      const node = this.data.get(params[0]);
      return { rows: node ? [node] : [] };
    }

    return { rows: [] };
  }
};

// Use in tests
const testGraph = new GraphService(mockDatabase);
const testNode = await testGraph.createNode('test-user', {
  type: 'person',
  label: 'Test Person'
});
```

### Performance Tips

1. **Batch Reads**: Use `Promise.all()` for parallel node fetches
2. **Depth Limits**: Keep graph traversal depth ≤ 3 for performance
3. **Index Usage**: Always filter by `user_id` first
4. **Vector Search**: Use appropriate similarity thresholds (0.7-0.85)
5. **Connection Pooling**: Reuse database connections

### Next Steps

1. Set up PostgreSQL database with schema from `database_schema.sql`
2. Configure environment variables for database connection
3. Implement authentication to generate `userId` values
4. Create REST API endpoints for graph and memory operations
5. Build frontend components to visualize the knowledge graph

---

For complete implementation details, see:
- `/docs/v2_PKA/PKA-relate/PHASE_0_SERVICES_IMPLEMENTATION.md`
- `/docs/v2_PKA/PKA-relate/data-models/database_schema.sql`
