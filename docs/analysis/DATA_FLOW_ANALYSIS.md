# Data Flow Analysis - Research Knowledge Manager

## Document Ingestion Flow

### CLI Ingestion Path

```
User Command: rkm ingest --path ./docs --tag research

    ↓

1. CLI Entry Point (src/cli.ts)
   ├── Parse command arguments
   ├── Validate paths and options
   └── Route to ingestWithGraph()

    ↓

2. File Reading (src/ingestion/reader.ts)
   ├── Traverse directory tree
   ├── Filter by extensions (.md, .txt, .json, .jsonl)
   └── Read file contents
   Output: FileReadResult[]

    ↓

3. Document Parsing (src/ingestion/parser.ts)
   ├── Detect document type
   ├── Extract metadata (frontmatter, title, tags)
   ├── Parse sections (headings)
   ├── Detect links (URLs, citations, wikilinks)
   └── Count words/lines
   Output: ParsedDocument[]

    ↓

4. Graph Building (src/ingestion/graphBuilder.ts)
   ├── Create document nodes
   ├── Extract citations → CITES edges
   ├── Detect local links → LINKS_TO edges
   ├── Build section hierarchy → PARENT_OF edges
   └── Calculate edge weights
   Output: DocumentGraph { nodes, edges, metadata }

    ↓

5. Unified Memory Integration (src/memory/index.ts)
   ├── Call: memory.addDocuments(documents)
   │
   ├──→ 5a. Embedding Generation (src/embedding.ts)
   │    ├── Batch embed document texts
   │    └── Return: Float32Array[] (384 dims)
   │
   ├──→ 5b. Vector Store (src/memory/vectorStore.ts)
   │    ├── Prepare metadata { id, title, text, tags, source, timestamp }
   │    ├── insertBatch(embeddings + metadata)
   │    └── Write to: ./ruvector.db (SQLite + HNSW index)
   │
   └──→ 5c. Graph Store (src/memory/graphStore.ts)
        ├── createNode('Document', properties) for each doc
        ├── Execute SQLite: INSERT INTO nodes
        └── Write to: ./data/graph.db

    ↓

6. Relationship Creation
   ├── Loop through graph.edges
   ├── memory.addRelationship({ from, to, type })
   └── GraphStore: INSERT INTO edges

    ↓

7. Success Response
   └── Output: "Ingested N documents into ./ruvector.db"
```

**Data Transformations:**
```
Raw Files (bytes)
    → FileReadResult { content: string, metadata }
    → ParsedDocument { text, metadata, sections, links }
    → DocumentGraph { nodes[], edges[] }
    → Document { id, title, text, source, tags }
    → [Embedding: Float32Array(384), Metadata: JSON] → VectorDB
    → [Node: {id, type, properties}, Edge: {from, to, type}] → GraphDB
```

---

## Search Query Flow

### Hybrid Search Path (Vector + Graph)

```
User Query: rkm search "machine learning" --include-related

    ↓

1. CLI Entry Point (src/cli.ts)
   ├── Parse query text and options
   └── Call: memory.search(query, options)

    ↓

2. Unified Memory Search (src/memory/index.ts)
   ├── Options: { k: 10, vectorWeight: 0.7, includeRelated: true }
   │
   ├──→ 2a. Generate Query Embedding (src/embedding.ts)
   │    ├── embedOne("machine learning", 384)
   │    └── Return: Float32Array(384)
   │
   ├──→ 2b. Vector Search (src/memory/vectorStore.ts)
   │    ├── Search RuVector HNSW index
   │    ├── Return top k*2 results (for reranking buffer)
   │    └── Output: SearchResult[] { id, score, metadata }
   │
   ├──→ 2c. Build Initial Unified Results
   │    ├── Map vector results → UnifiedSearchResult
   │    ├── Calculate initial combinedScore = vectorScore * vectorWeight
   │    └── Results: [{ id, title, text, vectorScore, combinedScore }]
   │
   └──→ 2d. Enrich with Graph Data (if includeRelated)
        ├── For each result:
        │   ├── graphStore.findRelated(id, depth=1)
        │   ├── Collect related nodes + edges
        │   ├── Calculate graphScore = min(relatedCount / 5, 1)
        │   └── Update: combinedScore = vectorScore*0.7 + graphScore*0.3
        └── Attach: relatedNodes[], edges[]

    ↓

3. Optional Reranking (if --rerank flag)
   ├── cognitiveEngine.rerank(query, candidates)
   │
   ├──→ 3a. Embed All Candidates (src/embedding.ts)
   │    ├── embedMany([query, ...candidates.map(c => c.text)])
   │    └── Return: Float32Array[]
   │
   ├──→ 3b. GNN Differentiable Search (ruvector/gnn-wrapper)
   │    ├── Apply attention mechanism
   │    ├── Calculate soft weights
   │    └── Return: { indices[], weights[] }
   │
   └──→ 3c. Apply GNN Weights
        ├── Reorder results by GNN weights
        └── Update combinedScore

    ↓

4. Sort and Limit
   ├── Sort by combinedScore (descending)
   └── Take top k results

    ↓

5. Format Output
   ├── If format=text:
   │   └── Print: title, source, scores, preview, related nodes
   ├── If format=json:
   │   └── JSON.stringify(results)
   └── If format=markdown:
       └── ContextFormatter.formatVectorResults()

    ↓

6. Response to User
   └── Display formatted search results
```

**Score Calculation:**
```
Initial Score:
  combinedScore = vectorScore * vectorWeight (e.g., 0.85 * 0.7 = 0.595)

With Graph Enhancement:
  graphScore = min(relatedNodeCount / 5, 1.0)  (e.g., 3/5 = 0.6)
  combinedScore = (vectorScore * 0.7) + (graphScore * 0.3)
                = (0.85 * 0.7) + (0.6 * 0.3) = 0.595 + 0.18 = 0.775

With GNN Reranking:
  combinedScore = gnnWeight  (e.g., 0.92 from attention mechanism)
```

---

## Cognitive Learning Flow (SONA Trajectory)

### Active Learning Cycle

```
Agent Interaction Sequence

    ↓

1. Begin Trajectory (MCP Tool: cognitive_begin_trajectory)
   ├── Query: "How do I implement JWT authentication?"
   ├── embedOne(query) → Float32Array(384)
   └── cognitiveEngine.beginTrajectory(embedding, { route: "claude-opus-4" })
   Output: trajectoryId (e.g., 42)

    ↓

2. Record Steps (MCP Tool: cognitive_record_step)
   ├── Step 1: "Generated JWT signing function"
   │   ├── embedOne(step) → Float32Array(384)
   │   ├── Reward: 0.8 (good progress)
   │   └── sonaEngine.addStep(42, embedding, embedding, 0.8)
   │
   ├── Step 2: "Added token validation middleware"
   │   ├── Reward: 0.9 (excellent)
   │   └── sonaEngine.addStep(42, embedding, embedding, 0.9)
   │
   └── Step 3: "Created refresh token endpoint"
       ├── Reward: 0.7 (acceptable)
       └── sonaEngine.addStep(42, embedding, embedding, 0.7)

    ↓

3. End Trajectory (MCP Tool: cognitive_end_trajectory)
   ├── Quality: 0.85 (overall success)
   └── sonaEngine.endTrajectory(42, 0.85)
   Effect: Trajectory queued for learning

    ↓

4. Background Learning Tick (Periodic: every 1 hour)
   ├── sonaEngine.tick()
   │
   ├──→ 4a. Check Queue
   │    ├── Threshold: quality > 0.5
   │    └── Trajectories with quality ≥ 0.5 are eligible
   │
   ├──→ 4b. Pattern Extraction
   │    ├── Cluster trajectories by similarity
   │    ├── Extract centroids → ReasoningPattern
   │    └── Store in pattern bank (50 clusters)
   │
   ├──→ 4c. Micro-LoRA Update
   │    ├── Ultra-fast weight adjustment (~0.1ms)
   │    ├── Rank: 2 (low-rank approximation)
   │    ├── Learning rate: 0.001
   │    └── Effect: Immediate query adaptation
   │
   ├──→ 4d. Base-LoRA Update (if enough patterns)
   │    ├── Consolidate micro-LoRA updates
   │    ├── Rank: 8 (higher capacity)
   │    ├── Learning rate: 0.0001
   │    └── Effect: Long-term learning
   │
   └──→ 4e. EWC Consolidation
        ├── Elastic Weight Consolidation
        ├── Lambda: 1000.0
        └── Effect: Prevent catastrophic forgetting

    ↓

5. Pattern Retrieval (MCP Tool: cognitive_find_patterns)
   ├── Query: "JWT implementation"
   ├── embedOne(query) → Float32Array(384)
   ├── sonaEngine.findPatterns(embedding, k=3)
   │
   └──→ Return top 3 similar patterns:
        ├── Pattern 1: { id, centroid, clusterSize: 5, avgQuality: 0.87 }
        ├── Pattern 2: { id, centroid, clusterSize: 3, avgQuality: 0.82 }
        └── Pattern 3: { id, centroid, clusterSize: 7, avgQuality: 0.91 }

    ↓

6. Apply Learned Patterns (Automatic in search)
   ├── Future searches for "authentication" benefit from learned patterns
   ├── Micro-LoRA transforms embeddings
   └── GNN reranking uses updated weights
```

**Learning Data Structure:**
```javascript
Trajectory {
  id: number,
  queryEmbedding: Float32Array(384),
  steps: Array<{
    embedding: Float32Array(384),
    activations: Float32Array(384),
    reward: number (0-1)
  }>,
  quality: number (0-1),
  metadata: {
    route?: string,  // Model identifier
    contextIds?: string[]  // Session context
  }
}

ReasoningPattern {
  id: string,
  centroid: Float32Array(384),  // Cluster center
  clusterSize: number,  // Trajectories in cluster
  avgQuality: number,  // Mean quality score
  patternType: string,
  createdAt: timestamp,
  lastAccessed: timestamp,
  accessCount: number
}
```

---

## API Request Flow (Document Upload)

### Document Upload via REST API

```
HTTP POST /api/documents/upload
Content-Type: multipart/form-data
Body: { file: research.md, collection: "research" }

    ↓

1. API Server (src/api/server.ts)
   ├── Express middleware stack:
   │   ├── CORS → Allow origin
   │   ├── Body parser → Parse multipart form
   │   └── Request logger → Log request details
   │
   └── Route to: documentsRouter

    ↓

2. Documents Route Handler (src/api/routes/documents.ts)
   ├── Multer middleware → Save file to ./uploads/
   ├── Extract fields: { file, collection }
   │
   ├──→ 2a. Create Upload Job
   │    ├── Generate jobId (UUID)
   │    ├── Store in jobs map
   │    └── Return: { jobId, status: "processing" }
   │
   └──→ 2b. Background Processing (async)
        ├── Read file content
        ├── parser.parseDocument(content, type)
        │
        ├──→ Create Document object
        │    └── { id, title, text, source, category, tags }
        │
        ├──→ Add to UnifiedMemory
        │    ├── memory.addDocument(doc)
        │    ├── Embedding generation
        │    ├── Vector store insert
        │    └── Graph node creation
        │
        ├──→ Add to Collection (if specified)
        │    ├── collectionManager.getOrCreate(collection)
        │    └── collection.addDocument(docId)
        │
        └──→ Update Job Status
             ├── jobs[jobId].status = "completed"
             └── jobs[jobId].documentId = docId

    ↓

3. Status Polling (GET /api/documents/upload/:jobId/status)
   ├── Retrieve job from jobs map
   └── Return: { jobId, status, documentId? }

    ↓

4. Response to Client
   └── { success: true, jobId, message }
```

**Upload Data Flow:**
```
Client (multipart/form-data)
    → Express.json() + multer()
    → File saved to ./uploads/{timestamp}-{uuid}.{ext}
    → parser.parseDocument()
    → Document { id, title, text, tags }
    → memory.addDocument()
    → [Vector DB + Graph DB writes in parallel]
    → collectionManager.addToCollection()
    → Job status updated
    → Client polls GET /status
    → Response: { status: "completed", documentId }
```

---

## Chat/RAG Flow

### Conversational Search with Context

```
HTTP POST /api/chat
Body: { message: "Tell me about machine learning", collection: "research" }

    ↓

1. Chat Route Handler (src/api/routes/chat.ts)
   ├── Extract: { message, collection }
   │
   ├──→ 1a. Search Collection (if specified)
   │    ├── collectionManager.get(collection)
   │    ├── collection.search(message, { k: 5 })
   │    └── Return: SearchResult[] (relevant documents)
   │
   ├──→ 1b. Semantic Routing (optional)
   │    ├── semanticRouter.routeQuery(message)
   │    └── Return: { route: "HYBRID_SEARCH", confidence: 0.92 }
   │
   └──→ 1c. Build Context
        ├── contextFormatter.formatVectorResults(message, results)
        └── Return: Formatted context string

    ↓

2. LLM Integration (Future Enhancement)
   ├── Construct prompt:
   │   ├── System: "You are a research assistant..."
   │   ├── Context: [Formatted search results]
   │   └── User: message
   │
   ├── Send to LLM API (e.g., Claude, GPT-4)
   └── Stream response

    ↓

3. Store Chat History (if enabled)
   ├── chatHistory.push({ role: "user", content: message })
   ├── chatHistory.push({ role: "assistant", content: response })
   └── Store in session or database

    ↓

4. Response to Client
   └── { response: LLM_output, sources: SearchResult[] }
```

**RAG Context Construction:**
```javascript
Query: "machine learning"
    ↓
Search Results: [
  { title: "ML Basics", text: "...", score: 0.92 },
  { title: "Deep Learning", text: "...", score: 0.87 },
  { title: "Neural Networks", text: "...", score: 0.85 }
]
    ↓
Context Block:
```
Context (from research collection):

1. ML Basics (score: 0.92)
   Source: ml-guide.md
   Machine learning is a subset of artificial intelligence that...
   [truncated to fit context window]

2. Deep Learning (score: 0.87)
   Source: deep-learning.md
   Deep learning uses neural networks with multiple layers...

3. Neural Networks (score: 0.85)
   Source: nn-fundamentals.md
   A neural network consists of interconnected nodes...
```
    ↓
LLM Prompt:
```
System: You are a research assistant with access to the user's knowledge base.
Use the context below to answer questions accurately.

Context:
[Context block above]

User: Tell me about machine learning