# Ruvector Integration Architecture for PKA-STRAT

**Version:** 1.0
**Status:** Specification
**Author:** PKA-STRAT Architecture Team
**Date:** 2025-12-28

---

## Executive Summary

This document specifies the integration architecture for **Ruvector**—the semantic embedding and hypergraph technology that powers PKA-STRAT's Strategic Resonance Engine. Ruvector transforms abstract strategic concepts (mission, vision, objectives) into computable mathematical representations, enabling measurable alignment tracking and automated mission drift detection.

**Core Value Proposition:**
- **Vision-to-Vector Encoding**: Convert qualitative strategic documents into quantifiable hypergraph representations
- **Mission Drift Detection**: Real-time monitoring using subpolynomial dynamic min-cut algorithms
- **Provenance Tracking**: Mathematical traceability from every recommendation to source documents
- **Self-Optimizing Intelligence**: GNN-powered indexing that improves with usage

---

## 1. Ruvector Capabilities & Integration Points

### 1.1 Core Capabilities

#### **1.1.1 Semantic Embeddings**
Ruvector provides multi-level embedding generation for organizational documents:

- **Document-Level Embeddings**: Entire strategic documents (mission statements, vision documents, strategic plans)
- **Chunk-Level Embeddings**: Semantic sections within documents (paragraphs, sections, policy statements)
- **Entity Extraction Embeddings**: Key concepts, strategic objectives, OKRs, initiatives
- **Cross-Document Similarity**: Semantic distance calculation between documents and concepts

#### **1.1.2 Hypergraph Construction**
Unlike simple vector databases, Ruvector builds **Causal Hypergraphs** that connect multiple entities simultaneously:

- **Multi-Entity Relationships**: `{Product Feature X} ↔ {Q3 Revenue Goal} ↔ {Sustainability Mission}`
- **Edge Weight Calculation**: Alignment scores representing semantic similarity and strategic coherence
- **Graph Traversal**: Navigation from tactical work to strategic objectives (provenance tracking)
- **Temporal Dynamics**: Tracking how relationships evolve as strategy and execution progress

#### **1.1.3 Subpolynomial Dynamic Min-Cut (ruvector-mincut)**
The algorithmic breakthrough that enables real-time mission drift detection:

- **Deterministic Exact Fully-Dynamic Minimum Cut**: Update time grows slower than polynomial ($O(n^{o(1)})$)
- **Real-Time Monitoring**: Track strategic integrity in microseconds
- **Weak Connection Identification**: Identify projects/teams becoming disconnected from objectives
- **Self-Healing Triggers**: Automated alerts when structural integrity drops below threshold

#### **1.1.4 Vector Search & Retrieval**
Advanced hybrid search capabilities:

- **Semantic Search**: Natural language queries across all organizational documents
- **Similar Document Discovery**: Find precedents, examples, and related strategic artifacts
- **Strategic Objective Matching**: Map work items to relevant objectives
- **Recommendation Generation**: Suggest alignment improvements based on semantic patterns

### 1.2 Integration Points in PKA-STRAT

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PKA-STRAT Platform                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Document Ingestion Pipeline → Ruvector Embeddings                   │
│  ├─ Leadership Documents (Mission, Vision, Objectives)               │
│  ├─ Strategy Translation (Portfolios, Programs)                      │
│  ├─ Execution Documents (Projects, Research Reports)                 │
│  └─ Market Intelligence (Analyst Reports, Competitive Analyses)      │
│                                                                       │
│  Strategic Resonance Engine ← Ruvector Hypergraph                    │
│  ├─ Vision-to-Vector Encoding                                        │
│  ├─ Causal Hypergraph Construction                                   │
│  ├─ Alignment Score Calculation                                      │
│  └─ Mission Drift Detection (via min-cut)                            │
│                                                                       │
│  Provenance Tracking ← Ruvector Graph Traversal                      │
│  ├─ L-Score Calculation (Provenance Metric)                          │
│  ├─ Trace from Task → Project → Program → Objective → Mission        │
│  └─ Bidirectional Visibility (Leadership ↔ Teams)                    │
│                                                                       │
│  Dashboard & Reports ← Ruvector Analytics                            │
│  ├─ Alignment Heat Maps (Strategic Distance Metrics)                 │
│  ├─ Strategic Integrity Warnings (Min-Cut Alerts)                    │
│  ├─ Board-Level Narratives (Provenance-Backed Reports)               │
│  └─ Recommendation Engine (Semantic Pattern Matching)                │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Service Architecture: Microservice Design

### 2.1 Architectural Overview

Ruvector operates as a **distributed microservices architecture** with clear separation of concerns:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Ruvector Service Layer                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │  Embedding       │  │  Hypergraph      │  │  Min-Cut         │    │
│  │  Generator       │  │  Builder         │  │  Monitor         │    │
│  │  Service         │  │  Service         │  │  Service         │    │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘    │
│           │                     │                     │               │
│           └─────────────────────┴─────────────────────┘               │
│                                 │                                     │
│                    ┌────────────┴────────────┐                        │
│                    │   Ruvector Core Engine   │                        │
│                    │   (Rust + GNN)           │                        │
│                    └────────────┬────────────┘                        │
│                                 │                                     │
│           ┌─────────────────────┼─────────────────────┐               │
│           │                     │                     │               │
│  ┌────────┴─────────┐  ┌────────┴─────────┐  ┌────────┴─────────┐    │
│  │  Vector Storage  │  │  Graph Storage   │  │  Cache Layer     │    │
│  │  (RuVector)      │  │  (RuVector)      │  │  (Redis)         │    │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘    │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Microservice Components

#### **2.2.1 Embedding Generator Service**
**Responsibility:** Convert documents and text into high-dimensional vector representations

**Technology Stack:**
- **Language:** Python (FastAPI)
- **ML Models:**
  - Primary: `text-embedding-3-large` (OpenAI) or `voyage-2` (Voyage AI)
  - Secondary: Domain-specific fine-tuned models for organizational terminology
- **Input:** Raw text (documents, chunks, entities)
- **Output:** 1024-3072 dimensional vectors + metadata

**API Endpoints:**
```python
POST /embed/document
  Request: { "text": str, "doc_type": str, "metadata": dict }
  Response: { "embedding": float[], "dimension": int, "model": str }

POST /embed/batch
  Request: { "items": [{"text": str, "id": str}] }
  Response: { "embeddings": [{"id": str, "embedding": float[]}] }

GET /embed/models
  Response: { "available_models": [{"name": str, "dimension": int, "cost": float}] }
```

**Performance Requirements:**
- **Latency:** < 200ms for single document embedding
- **Throughput:** 100+ documents/second for batch processing
- **Caching:** 95% cache hit rate for repeated queries

#### **2.2.2 Hypergraph Builder Service**
**Responsibility:** Construct and maintain the Causal Hypergraph from embedded documents

**Technology Stack:**
- **Language:** Rust (Actix-web)
- **Graph Library:** `petgraph` + custom hypergraph extensions
- **GNN Engine:** PyTorch Geometric (via PyO3 FFI)

**API Endpoints:**
```rust
POST /hypergraph/add-node
  Request: { "id": str, "type": str, "embedding": float[], "metadata": dict }
  Response: { "node_id": str, "inserted_at": timestamp }

POST /hypergraph/add-edge
  Request: { "nodes": [str], "weight": float, "relationship": str }
  Response: { "edge_id": str, "weight": float }

POST /hypergraph/calculate-alignment
  Request: { "source_node": str, "target_nodes": [str] }
  Response: { "alignments": [{"node": str, "score": float, "path": [str]}] }

GET /hypergraph/traverse
  Request: { "start": str, "end": str, "max_depth": int }
  Response: { "paths": [[str]], "provenance_score": float }
```

**Performance Requirements:**
- **Graph Size:** Support 10M+ nodes, 100M+ edges
- **Update Latency:** < 50ms for node/edge insertion
- **Query Latency:** < 100ms for traversal queries

#### **2.2.3 Min-Cut Monitor Service**
**Responsibility:** Continuous monitoring of strategic integrity using dynamic min-cut algorithms

**Technology Stack:**
- **Language:** Rust (core algorithm) + Python (monitoring logic)
- **Algorithm:** `ruvector-mincut` (deterministic exact fully-dynamic min-cut)
- **Monitoring:** Prometheus + Grafana for telemetry

**API Endpoints:**
```rust
POST /mincut/monitor/start
  Request: { "graph_id": str, "threshold": float, "callback_url": str }
  Response: { "monitor_id": str, "current_mincut": int }

GET /mincut/status
  Request: { "monitor_id": str }
  Response: { "mincut_value": int, "bottleneck_edges": [str], "integrity": float }

POST /mincut/alert/configure
  Request: { "monitor_id": str, "threshold": float, "alert_type": str }
  Response: { "alert_config_id": str }
```

**Performance Requirements:**
- **Update Time:** $O(n^{o(1)})$ subpolynomial complexity
- **Monitoring Frequency:** Every 1-5 seconds for active graphs
- **Alert Latency:** < 1 second from threshold breach to callback

### 2.3 Service Communication

**Message Queue:** RabbitMQ for async processing
- **Embedding Queue:** Documents → Embedding Generator
- **Graph Update Queue:** Embeddings → Hypergraph Builder
- **Alert Queue:** Min-Cut breaches → PKA-STRAT notification service

**Service Mesh:** Istio for service discovery, load balancing, and observability

---

## 3. Embedding Generation Pipeline

### 3.1 Pipeline Architecture

```
Document Ingestion → Document Processing → Embedding Generation → Storage
                    ↓                     ↓                      ↓
              Text Extraction      Batch Processing       Vector DB
              Chunking Strategy    Model Selection        + Graph DB
              Metadata Tagging     Deduplication          + Cache
```

### 3.2 Document Processing Stages

#### **Stage 1: Document Classification**
**Purpose:** Determine document type and appropriate embedding strategy

**Classification Taxonomy:**
```yaml
Leadership:
  - mission_statement
  - vision_document
  - strategic_objectives
  - annual_strategic_plan
  - board_deck

Strategy_Translation:
  - product_specification
  - product_roadmap
  - portfolio_definition
  - program_brief
  - program_charter

Execution:
  - project_plan
  - project_proposal
  - research_report
  - progress_update
  - retrospective
  - outcome_documentation

Market_Intelligence:
  - analyst_report
  - competitive_analysis
  - industry_whitepaper
```

**Classifier:** Fine-tuned BERT model (95%+ accuracy)

#### **Stage 2: Text Extraction & Chunking**

**Chunking Strategy (Document Type-Aware):**

```python
# Mission/Vision Documents: Semantic boundary chunking
chunk_strategy = {
    "mission_statement": {
        "method": "semantic_boundary",
        "max_tokens": 512,
        "overlap": 50,
        "preserve_paragraphs": True
    },

    # Project Plans: Section-based chunking
    "project_plan": {
        "method": "section_based",
        "section_headers": ["Objectives", "Deliverables", "Timeline", "Resources"],
        "max_tokens": 1024,
        "overlap": 100
    },

    # Research Reports: Citation-aware chunking
    "research_report": {
        "method": "citation_aware",
        "preserve_references": True,
        "max_tokens": 768,
        "overlap": 75
    }
}
```

**Output:** Document chunks with metadata:
```json
{
  "chunk_id": "doc123_chunk_05",
  "text": "Our strategic objective for 2025 is to...",
  "doc_type": "strategic_objectives",
  "parent_doc_id": "doc123",
  "chunk_index": 5,
  "total_chunks": 12,
  "section": "Q1 Objectives",
  "metadata": {
    "author": "CEO",
    "department": "Executive",
    "date": "2025-01-15",
    "tags": ["strategy", "2025", "objectives"]
  }
}
```

#### **Stage 3: Embedding Generation**

**Multi-Model Strategy:**

```python
class EmbeddingStrategy:
    def select_model(self, doc_type: str, chunk: Dict) -> str:
        """Select appropriate embedding model based on document type"""

        if doc_type in ["mission_statement", "vision_document"]:
            # High-dimension model for strategic nuance
            return "text-embedding-3-large"  # 3072 dimensions

        elif doc_type in ["project_plan", "research_report"]:
            # Balanced model for execution documents
            return "voyage-2"  # 1536 dimensions

        elif doc_type == "market_intelligence":
            # Domain-specific model fine-tuned on business terminology
            return "custom-business-model-v2"  # 1024 dimensions

        else:
            # Default efficient model
            return "text-embedding-3-small"  # 1536 dimensions
```

**Batch Processing:**
- **Batch Size:** 32 documents per API call (optimize for API rate limits)
- **Parallelization:** 4-8 concurrent workers
- **Rate Limiting:** Respect API quotas (OpenAI: 3000 RPM, Voyage: 300 RPM)
- **Retry Logic:** Exponential backoff with jitter

#### **Stage 4: Entity Extraction**

**Named Entity Recognition (NER) for Strategic Elements:**

```python
entity_types = [
    "STRATEGIC_OBJECTIVE",
    "GOAL",
    "OKR",
    "INITIATIVE",
    "PRODUCT_FEATURE",
    "DEPARTMENT",
    "STAKEHOLDER",
    "METRIC",
    "TIMELINE"
]

# Example extraction
entities = extract_entities(chunk_text, entity_types)
# Output: [
#   {"text": "Increase market share by 15%", "type": "STRATEGIC_OBJECTIVE"},
#   {"text": "Product Launch Q3 2025", "type": "INITIATIVE"},
#   {"text": "Revenue Growth", "type": "METRIC"}
# ]

# Each entity gets its own embedding
for entity in entities:
    entity_embedding = embed(entity.text)
    store_entity_embedding(entity, entity_embedding)
```

### 3.3 Deduplication & Versioning

**Deduplication Strategy:**
- **Exact Duplicates:** MD5 hash comparison before embedding
- **Near Duplicates:** Cosine similarity > 0.98 → flag as duplicate
- **Versioning:** Track document versions with temporal graph edges

```python
def deduplicate_before_embedding(new_doc: Document) -> Optional[str]:
    """Check if document already exists before expensive embedding"""

    # Exact duplicate check
    doc_hash = hashlib.md5(new_doc.text.encode()).hexdigest()
    if exists_in_db(doc_hash):
        return get_existing_embedding(doc_hash)

    # Near-duplicate check (using cheap MinHash approximation)
    minhash = MinHash(new_doc.text)
    similar_docs = find_similar_minhash(minhash, threshold=0.95)

    if similar_docs:
        # Return existing embedding, mark as version
        return link_as_version(new_doc, similar_docs[0])

    # New document, proceed with embedding
    return None
```

---

## 4. Hypergraph Storage & Retrieval

### 4.1 Storage Architecture

**Hybrid Storage Model:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ruvector Storage Layer                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Vector Store    │  │  Graph Store     │  │  Cache       │  │
│  │  (RuVector)      │  │  (RuVector)      │  │  (Redis)     │  │
│  │                  │  │                  │  │              │  │
│  │  - Embeddings    │  │  - Nodes         │  │  - Hot       │  │
│  │  - HNSW Index    │  │  - Edges         │  │    Queries   │  │
│  │  - ANN Search    │  │  - Hyperedges    │  │  - Frequent  │  │
│  │                  │  │  - Provenance    │  │    Paths     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Vector Database Configuration

**Technology:** PostgreSQL + RuVector extension (Docker: `ruvector/postgres:latest`)

**Schema Design:**

```sql
-- Embeddings table
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL,  -- document, chunk, entity
    embedding vector(3072),  -- Configurable dimension
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- HNSW index for fast ANN search
    INDEX USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)
);

-- Document metadata table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    content TEXT,
    author VARCHAR(255),
    department VARCHAR(255),
    upload_date TIMESTAMP,
    metadata JSONB,
    embedding_id UUID REFERENCES embeddings(id)
);

-- Entity embeddings table
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_text TEXT NOT NULL,
    entity_type VARCHAR(100),  -- STRATEGIC_OBJECTIVE, GOAL, etc.
    source_doc_id UUID REFERENCES documents(id),
    embedding_id UUID REFERENCES embeddings(id),
    metadata JSONB
);
```

**Index Optimization:**

```sql
-- HNSW parameters tuned for strategic documents
-- m=16: Number of connections per layer (balance between speed and recall)
-- ef_construction=64: Size of candidate list during index build
-- ef_search=40: Size of candidate list during search (set at query time)

-- For mission-critical alignment queries, use higher ef_search
SET LOCAL hnsw.ef_search = 100;

-- Example similarity search
SELECT
    d.title,
    d.doc_type,
    1 - (e1.embedding <=> e2.embedding) AS similarity
FROM embeddings e1
CROSS JOIN LATERAL (
    SELECT * FROM embeddings e2
    WHERE e2.content_type = 'document'
    ORDER BY e1.embedding <=> e2.embedding
    LIMIT 10
) e2
JOIN documents d ON e2.content_id::uuid = d.id
WHERE e1.id = $target_embedding_id;
```

### 4.3 Hypergraph Data Model

**Graph Schema:**

```sql
-- Nodes table (strategic elements)
CREATE TABLE graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_type VARCHAR(100) NOT NULL,  -- mission, objective, project, task, etc.
    label TEXT NOT NULL,
    embedding_id UUID REFERENCES embeddings(id),
    pyramid_level INT,  -- 1=Mission, 2=Vision, 3=Objectives, ..., 8=Tasks
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Edges table (relationships)
CREATE TABLE graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_id UUID REFERENCES graph_nodes(id),
    target_node_id UUID REFERENCES graph_nodes(id),
    edge_type VARCHAR(100),  -- supports, derives_from, contributes_to, etc.
    weight FLOAT DEFAULT 1.0,  -- Alignment score
    confidence FLOAT,  -- Confidence in relationship
    provenance JSONB,  -- How this edge was created
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate edges
    UNIQUE(source_node_id, target_node_id, edge_type)
);

-- Hyperedges table (multi-entity relationships)
CREATE TABLE graph_hyperedges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hyperedge_type VARCHAR(100),
    description TEXT,
    weight FLOAT DEFAULT 1.0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Hyperedge membership
CREATE TABLE hyperedge_nodes (
    hyperedge_id UUID REFERENCES graph_hyperedges(id),
    node_id UUID REFERENCES graph_nodes(id),
    role VARCHAR(100),  -- e.g., "objective", "deliverable", "dependency"
    PRIMARY KEY (hyperedge_id, node_id)
);

-- Min-cut monitoring cache
CREATE TABLE mincut_cache (
    graph_id UUID PRIMARY KEY,
    mincut_value INT,
    bottleneck_edges UUID[],
    last_computed TIMESTAMP DEFAULT NOW(),
    computation_time_ms INT
);
```

### 4.4 Retrieval Strategies

#### **4.4.1 Semantic Search**

```python
def semantic_search(query: str, top_k: int = 10, filters: Dict = None) -> List[SearchResult]:
    """
    Perform semantic search across all documents

    Args:
        query: Natural language query
        top_k: Number of results to return
        filters: Optional filters (doc_type, department, date_range)

    Returns:
        List of search results with similarity scores and provenance
    """

    # Generate query embedding
    query_embedding = embed(query)

    # Build filter clause
    filter_clause = ""
    if filters:
        if "doc_type" in filters:
            filter_clause += f"AND d.doc_type = '{filters['doc_type']}'"
        if "department" in filters:
            filter_clause += f"AND d.department = '{filters['department']}'"

    # Execute hybrid search (vector + keyword)
    sql = f"""
    SELECT
        d.id,
        d.title,
        d.doc_type,
        d.content,
        1 - (e.embedding <=> %s::vector) AS similarity,
        ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', %s)) AS keyword_rank
    FROM embeddings e
    JOIN documents d ON e.content_id::uuid = d.id
    WHERE e.content_type = 'document'
    {filter_clause}
    ORDER BY
        (0.7 * (1 - (e.embedding <=> %s::vector))) +
        (0.3 * ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', %s)))
        DESC
    LIMIT %s
    """

    results = execute_query(sql, [query_embedding, query, query_embedding, query, top_k])

    # Add provenance for each result
    for result in results:
        result.provenance = get_provenance_path(result.id)

    return results
```

#### **4.4.2 Alignment Path Discovery**

```python
def find_alignment_path(source_node: str, target_node: str) -> AlignmentPath:
    """
    Find the provenance path from a source (e.g., task) to target (e.g., mission)

    This traverses the hypergraph upward through the Pyramid of Clarity

    Returns:
        AlignmentPath with nodes, edges, and L-Score (Provenance Metric)
    """

    # Use Dijkstra's algorithm weighted by alignment scores
    sql = """
    WITH RECURSIVE path_search AS (
        -- Base case: start node
        SELECT
            n.id,
            n.label,
            n.pyramid_level,
            ARRAY[n.id] as path,
            0 as total_distance,
            1.0 as cumulative_alignment
        FROM graph_nodes n
        WHERE n.id = %s

        UNION

        -- Recursive case: follow edges upward
        SELECT
            target.id,
            target.label,
            target.pyramid_level,
            path || target.id,
            total_distance + 1,
            cumulative_alignment * e.weight
        FROM path_search ps
        JOIN graph_edges e ON ps.id = e.source_node_id
        JOIN graph_nodes target ON e.target_node_id = target.id
        WHERE
            target.id != ALL(path)  -- Prevent cycles
            AND target.pyramid_level < ps.pyramid_level  -- Only go upward in pyramid
    )
    SELECT * FROM path_search
    WHERE id = %s
    ORDER BY cumulative_alignment DESC
    LIMIT 1;
    """

    path = execute_query(sql, [source_node, target_node])

    if path:
        # Calculate L-Score (Provenance Metric)
        l_score = path.cumulative_alignment * (1 / (1 + path.total_distance))

        return AlignmentPath(
            nodes=path.path,
            alignment_score=path.cumulative_alignment,
            l_score=l_score,
            distance=path.total_distance
        )
    else:
        return AlignmentPath(nodes=[], l_score=0.0)
```

#### **4.4.3 Strategic Distance Calculation**

```python
def calculate_strategic_distance(entity_id: str) -> Dict[str, float]:
    """
    Calculate semantic distance from entity to all strategic objectives

    Used for Alignment Heat Maps and Mission Drift Detection

    Returns:
        Dictionary mapping objective_id -> distance score (0-1, lower is better aligned)
    """

    # Get entity embedding
    entity_embedding = get_embedding(entity_id)

    # Find all strategic objectives (pyramid_level = 3)
    sql = """
    SELECT
        n.id as objective_id,
        n.label,
        e.embedding,
        1 - (e.embedding <=> %s::vector) AS semantic_similarity
    FROM graph_nodes n
    JOIN embeddings e ON n.embedding_id = e.id
    WHERE n.pyramid_level = 3  -- Strategic Objectives level
    ORDER BY semantic_similarity DESC
    """

    objectives = execute_query(sql, [entity_embedding])

    # Calculate composite distance (semantic + graph topology)
    distances = {}
    for obj in objectives:
        # Semantic component (0-1, lower is better)
        semantic_distance = 1 - obj.semantic_similarity

        # Topological component (path length)
        path = find_alignment_path(entity_id, obj.objective_id)
        topological_distance = path.distance / 8.0  # Normalize by pyramid height

        # Composite distance (weighted average)
        composite_distance = (0.6 * semantic_distance) + (0.4 * topological_distance)

        distances[obj.objective_id] = composite_distance

    return distances
```

---

## 5. Min-Cut Algorithm Implementation

### 5.1 Algorithm Overview

**Technology:** `ruvector-mincut` Rust crate implementing deterministic exact fully-dynamic minimum cut

**Theoretical Basis:** El-Hayek, Henzinger, Li (SODA 2026) - Subpolynomial time complexity $O(n^{o(1)})$

**Core Capability:** Maintain minimum cut of a dynamic graph (with edge insertions/deletions) in subpolynomial time

### 5.2 Integration Architecture

```rust
// Rust service wrapping ruvector-mincut

use ruvector_mincut::{DynamicGraph, MinCutMonitor};
use actix_web::{web, App, HttpServer, Responder};

pub struct MinCutService {
    monitors: HashMap<String, MinCutMonitor>,
    alert_thresholds: HashMap<String, f64>,
}

impl MinCutService {
    pub fn start_monitoring(&mut self, graph_id: String, threshold: f64) -> Result<String> {
        // Initialize dynamic graph from database
        let edges = load_graph_from_db(&graph_id)?;
        let graph = DynamicGraph::from_edges(edges);

        // Create monitor
        let monitor = MinCutMonitor::new(graph, threshold);

        // Register alert callback
        monitor.on_threshold_breach(|mincut_value, bottleneck_edges| {
            self.alert_mission_drift(graph_id.clone(), mincut_value, bottleneck_edges);
        });

        let monitor_id = format!("monitor_{}", uuid::Uuid::new_v4());
        self.monitors.insert(monitor_id.clone(), monitor);
        self.alert_thresholds.insert(monitor_id.clone(), threshold);

        Ok(monitor_id)
    }

    pub fn update_graph(&mut self, monitor_id: &str, edge_update: EdgeUpdate) -> Result<MinCutStatus> {
        let monitor = self.monitors.get_mut(monitor_id)
            .ok_or("Monitor not found")?;

        // Apply update in O(n^{o(1)}) time
        match edge_update.operation {
            Operation::Insert => monitor.insert_edge(edge_update.source, edge_update.target, edge_update.weight),
            Operation::Delete => monitor.delete_edge(edge_update.source, edge_update.target),
            Operation::UpdateWeight => monitor.update_weight(edge_update.source, edge_update.target, edge_update.weight),
        }

        // Get current min-cut value
        let mincut_value = monitor.get_mincut();
        let bottleneck_edges = monitor.get_bottleneck_edges();

        Ok(MinCutStatus {
            mincut_value,
            bottleneck_edges,
            integrity: self.calculate_integrity(mincut_value, monitor_id),
        })
    }

    fn calculate_integrity(&self, mincut_value: i32, monitor_id: &str) -> f64 {
        let threshold = self.alert_thresholds.get(monitor_id).unwrap();
        (mincut_value as f64) / threshold
    }

    fn alert_mission_drift(&self, graph_id: String, mincut_value: i32, bottleneck_edges: Vec<(String, String)>) {
        // Identify which strategic objective is at risk
        let at_risk_objectives = self.identify_at_risk_objectives(&bottleneck_edges);

        // Send alert to PKA-STRAT notification service
        send_alert(Alert {
            alert_type: "MISSION_DRIFT_DETECTED",
            severity: "HIGH",
            graph_id,
            mincut_value,
            bottleneck_edges,
            at_risk_objectives,
            timestamp: Utc::now(),
        });
    }
}
```

### 5.3 Mission Drift Detection Logic

```python
class MissionDriftDetector:
    """
    Monitor strategic integrity using min-cut analysis
    """

    def __init__(self, mincut_service_url: str):
        self.mincut_service = MinCutServiceClient(mincut_service_url)
        self.drift_threshold = 3  # If min-cut drops below 3, alert

    def monitor_organizational_graph(self, org_graph_id: str):
        """
        Continuously monitor the organizational strategic graph
        """

        # Start monitoring with threshold
        monitor_id = self.mincut_service.start_monitoring(
            graph_id=org_graph_id,
            threshold=self.drift_threshold
        )

        # Register callback for alerts
        self.mincut_service.register_callback(
            monitor_id=monitor_id,
            callback_url=f"{SELF_URL}/api/alerts/mission-drift"
        )

        return monitor_id

    def handle_graph_update(self, update: GraphUpdate):
        """
        Handle real-time graph updates (new projects, completed tasks, etc.)
        """

        # Example: New project added
        if update.type == "PROJECT_ADDED":
            # Add node for project
            project_node_id = self.add_project_node(update.project)

            # Connect to strategic objectives based on project description
            objectives = self.find_related_objectives(update.project.description)

            for objective in objectives:
                edge_weight = calculate_alignment_score(update.project, objective)

                # Add edge to graph
                self.mincut_service.update_graph(
                    monitor_id=self.monitor_id,
                    edge_update=EdgeUpdate(
                        operation="INSERT",
                        source=project_node_id,
                        target=objective.node_id,
                        weight=edge_weight
                    )
                )

        # Check min-cut status after update
        status = self.mincut_service.get_status(self.monitor_id)

        if status.integrity < 0.8:  # Integrity dropping
            self.generate_drift_warning(status)

    def generate_drift_warning(self, status: MinCutStatus):
        """
        Generate actionable mission drift warning
        """

        # Identify bottleneck (weak connections)
        bottleneck_analysis = self.analyze_bottlenecks(status.bottleneck_edges)

        # Determine which teams/projects are drifting
        drifting_entities = []
        for edge in status.bottleneck_edges:
            source_entity = self.get_entity(edge.source)
            if source_entity.pyramid_level >= 5:  # Projects or Tasks level
                drifting_entities.append(source_entity)

        # Generate warning with recommendations
        warning = MissionDriftWarning(
            severity="HIGH" if status.integrity < 0.5 else "MEDIUM",
            mincut_value=status.mincut_value,
            integrity_score=status.integrity,
            drifting_entities=drifting_entities,
            recommendations=[
                f"Review alignment of {entity.label} with strategic objectives"
                for entity in drifting_entities
            ],
            bottleneck_analysis=bottleneck_analysis
        )

        # Send to dashboard
        publish_to_dashboard(warning)

        return warning
```

### 5.4 Performance Monitoring

```python
class MinCutPerformanceMonitor:
    """
    Track and optimize min-cut computation performance
    """

    def __init__(self):
        self.metrics = PrometheusMetrics()

    def track_computation(self, graph_size: int, computation_time_ms: int):
        """
        Track min-cut computation performance
        """

        # Verify subpolynomial scaling
        # Expected: O(n^{o(1)}) should be slower than O(log n) but faster than O(n)

        self.metrics.histogram("mincut_computation_time_ms", computation_time_ms, {
            "graph_size_bucket": self.bucket_size(graph_size)
        })

        # Alert if computation time exceeds expected bounds
        expected_max_time = self.calculate_expected_time(graph_size)

        if computation_time_ms > expected_max_time * 1.5:
            alert("MIN_CUT_PERFORMANCE_DEGRADATION", {
                "graph_size": graph_size,
                "computation_time_ms": computation_time_ms,
                "expected_max_time_ms": expected_max_time
            })

    def calculate_expected_time(self, n: int) -> float:
        """
        Calculate expected computation time for subpolynomial algorithm

        For O(n^{o(1)}), we model as O(n^{0.3}) based on empirical testing
        """
        baseline_time_ms = 10  # 10ms for n=1000
        return baseline_time_ms * (n / 1000) ** 0.3
```

---

## 6. Vector Database Selection & Configuration

### 6.1 Database Comparison

| Database | Pros | Cons | Verdict |
|----------|------|------|---------|
| **RuVector** | pgvector-compatible + SIMD acceleration (2x faster), 77+ SQL functions, native hypergraph/Cypher queries, tiered compression | Requires RuVector PostgreSQL image | ✅ **RECOMMENDED** for PKA-STRAT (vectors + hypergraph unified) |
| **pgvector** | Integrated with PostgreSQL, ACID compliance, cost-effective | Slower than RuVector, no hypergraph support, no SIMD | ⚠️ Fallback option if RuVector unavailable |
| **Pinecone** | Fully managed, extremely fast ANN, scales to billions | Expensive, vendor lock-in, cloud-only, no hypergraph | ❌ Not suitable (violates local-first requirement) |
| **Milvus** | Open-source, fast, purpose-built for vectors | Complex deployment, separate service, no hypergraph | ❌ Not suitable (separate service complexity) |

### 6.2 RuVector Configuration

**Deployment Architecture:**

```yaml
# PostgreSQL with RuVector extension
# Docker: ruvector/postgres:latest
# Installation: docker run -d -e POSTGRES_PASSWORD=secret -p 5432:5432 ruvector/postgres:latest

Database Sizing:
  Initial: 100GB storage, 16GB RAM, 4 vCPU
  Scaling: Up to 1TB storage, 64GB RAM, 16 vCPU

Connection Pooling:
  Tool: PgBouncer
  Pool Size: 100 connections
  Max Client Connections: 1000

Replication:
  Primary: Write operations
  Replicas: 2 read replicas for search queries
  Replication Lag: < 100ms target

Backup:
  Strategy: Continuous WAL archiving + daily snapshots
  Retention: 30 days
  Recovery Time Objective (RTO): < 1 hour
```

**Index Tuning:**

```sql
-- HNSW index configuration for different query patterns

-- For high-recall mission-critical queries (alignment scoring)
CREATE INDEX idx_embeddings_high_recall
ON embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 128);

-- For fast approximate queries (real-time search)
CREATE INDEX idx_embeddings_fast
ON embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 12, ef_construction = 32);

-- Partitioning for large tables
CREATE TABLE embeddings_partitioned (
    LIKE embeddings INCLUDING ALL
) PARTITION BY LIST (content_type);

CREATE TABLE embeddings_documents PARTITION OF embeddings_partitioned
    FOR VALUES IN ('document');

CREATE TABLE embeddings_chunks PARTITION OF embeddings_partitioned
    FOR VALUES IN ('chunk');

CREATE TABLE embeddings_entities PARTITION OF embeddings_partitioned
    FOR VALUES IN ('entity');
```

**Query Optimization:**

```sql
-- Optimize for hybrid queries (vector + metadata filters)

-- Bad: Filter after vector search
SELECT * FROM embeddings
ORDER BY embedding <=> $query_vector
LIMIT 100
WHERE content_type = 'document';  -- Filter AFTER sort (slow)

-- Good: Use covering index + filter pushdown
SELECT * FROM embeddings
WHERE content_type = 'document'  -- Filter FIRST
ORDER BY embedding <=> $query_vector
LIMIT 100;

-- Create covering index for common filter patterns
CREATE INDEX idx_embeddings_type_vector
ON embeddings (content_type)
INCLUDE (embedding);
```

---

## 7. Caching Strategy for Embeddings

### 7.1 Multi-Tier Caching Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Caching Hierarchy                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  L1: In-Memory Cache (Application Server)                    │
│  ├─ LRU Cache (10,000 most recent embeddings)                │
│  ├─ Size: 512MB per server                                   │
│  └─ Hit Rate: 40-50%                                          │
│                                                               │
│  L2: Redis (Distributed Cache)                               │
│  ├─ Hot embeddings (frequently accessed)                     │
│  ├─ Size: 16GB                                               │
│  ├─ TTL: 24 hours                                            │
│  └─ Hit Rate: 30-40% (cumulative: 70-90%)                    │
│                                                               │
│  L3: PostgreSQL (Persistent Storage)                         │
│  ├─ All embeddings                                           │
│  └─ Hit Rate: 100% (cache miss falls through here)           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Cache Implementation

```python
class EmbeddingCache:
    """
    Multi-tier caching for embeddings
    """

    def __init__(self):
        # L1: In-memory LRU cache
        self.l1_cache = LRUCache(maxsize=10000)

        # L2: Redis distributed cache
        self.l2_cache = redis.StrictRedis(
            host='redis-cluster',
            port=6379,
            db=0,
            decode_responses=False  # Store binary vectors
        )

        # L3: PostgreSQL (accessed via ORM)
        self.l3_db = Database('postgresql://...')

    def get_embedding(self, content_id: str) -> Optional[np.ndarray]:
        """
        Retrieve embedding from cache hierarchy
        """

        # Try L1 (in-memory)
        embedding = self.l1_cache.get(content_id)
        if embedding is not None:
            metrics.increment('cache_hit', tags=['tier:l1'])
            return embedding

        # Try L2 (Redis)
        cached_bytes = self.l2_cache.get(f"emb:{content_id}")
        if cached_bytes:
            embedding = np.frombuffer(cached_bytes, dtype=np.float32)

            # Promote to L1
            self.l1_cache.set(content_id, embedding)

            metrics.increment('cache_hit', tags=['tier:l2'])
            return embedding

        # L3 (Database)
        embedding = self.l3_db.query(
            "SELECT embedding FROM embeddings WHERE content_id = %s",
            [content_id]
        )

        if embedding:
            # Promote to L2 and L1
            self.set_in_cache(content_id, embedding)
            metrics.increment('cache_hit', tags=['tier:l3'])
            return embedding

        metrics.increment('cache_miss')
        return None

    def set_in_cache(self, content_id: str, embedding: np.ndarray):
        """
        Store embedding in all cache tiers
        """

        # L1: In-memory
        self.l1_cache.set(content_id, embedding)

        # L2: Redis with TTL
        self.l2_cache.setex(
            f"emb:{content_id}",
            time=86400,  # 24 hour TTL
            value=embedding.tobytes()
        )

    def warm_cache(self, content_ids: List[str]):
        """
        Pre-warm cache with frequently accessed embeddings
        """

        # Bulk load from database
        embeddings = self.l3_db.bulk_query(
            "SELECT content_id, embedding FROM embeddings WHERE content_id = ANY(%s)",
            [content_ids]
        )

        # Load into L2 and L1
        for content_id, embedding in embeddings:
            self.set_in_cache(content_id, embedding)

    def invalidate(self, content_id: str):
        """
        Invalidate cache entry (e.g., when document is updated)
        """
        self.l1_cache.delete(content_id)
        self.l2_cache.delete(f"emb:{content_id}")
```

### 7.3 Cache Warming Strategies

```python
class CacheWarmer:
    """
    Intelligent cache warming based on usage patterns
    """

    def __init__(self, cache: EmbeddingCache):
        self.cache = cache

    def warm_strategic_documents(self):
        """
        Pre-load mission-critical strategic documents
        """

        # Always keep mission, vision, and objectives in cache
        strategic_docs = query_db("""
            SELECT content_id FROM embeddings e
            JOIN documents d ON e.content_id::uuid = d.id
            WHERE d.doc_type IN ('mission_statement', 'vision_document', 'strategic_objectives')
        """)

        self.cache.warm_cache([doc.content_id for doc in strategic_docs])

    def warm_from_access_patterns(self):
        """
        Pre-load frequently accessed embeddings
        """

        # Analyze query logs from last 24 hours
        frequent_ids = query_db("""
            SELECT content_id, COUNT(*) as access_count
            FROM query_logs
            WHERE timestamp > NOW() - INTERVAL '24 hours'
            GROUP BY content_id
            ORDER BY access_count DESC
            LIMIT 5000
        """)

        self.cache.warm_cache([row.content_id for row in frequent_ids])

    def warm_related_documents(self, content_id: str):
        """
        Pre-load semantically related documents (prefetch optimization)
        """

        # When a document is accessed, pre-load similar documents
        similar_ids = query_db("""
            SELECT e2.content_id
            FROM embeddings e1
            CROSS JOIN LATERAL (
                SELECT content_id
                FROM embeddings e2
                WHERE e2.content_type = 'document'
                ORDER BY e1.embedding <=> e2.embedding
                LIMIT 20
            ) e2
            WHERE e1.content_id = %s
        """, [content_id])

        # Warm in background (don't block request)
        asyncio.create_task(
            self.cache.warm_cache([row.content_id for row in similar_ids])
        )
```

---

## 8. Batch vs Real-Time Processing

### 8.1 Processing Mode Decision Matrix

| Operation | Mode | Rationale | SLA |
|-----------|------|-----------|-----|
| **Initial Document Upload** | Batch | Bulk processing more efficient for large document sets | < 1 hour for 1000 documents |
| **Single Document Upload** | Real-Time | Immediate availability for user | < 30 seconds end-to-end |
| **Hypergraph Construction** | Batch | Complex graph building benefits from batching | Daily rebuild at 2 AM |
| **Alignment Score Calculation** | Real-Time | Users expect immediate feedback | < 5 seconds |
| **Min-Cut Monitoring** | Real-Time | Mission drift detection requires continuous monitoring | < 1 second update latency |
| **Entity Extraction** | Batch | Can be done asynchronously after upload | < 5 minutes after document upload |
| **Embedding Generation** | Hybrid | Real-time for single docs, batch for bulk uploads | < 10 seconds (single), < 30 min (batch) |

### 8.2 Real-Time Processing Pipeline

```python
class RealTimeProcessor:
    """
    Handle real-time document processing
    """

    async def process_document_upload(self, document: Document) -> ProcessingResult:
        """
        Real-time pipeline for single document upload
        """

        start_time = time.time()

        try:
            # Step 1: Text extraction and chunking (fast)
            chunks = await self.extract_and_chunk(document)
            logger.info(f"Chunked into {len(chunks)} pieces", elapsed_ms=(time.time()-start_time)*1000)

            # Step 2: Generate embeddings (rate-limited, may queue)
            embeddings = await self.generate_embeddings_realtime(chunks)
            logger.info(f"Generated embeddings", elapsed_ms=(time.time()-start_time)*1000)

            # Step 3: Store in database
            await self.store_embeddings(document.id, embeddings)
            logger.info(f"Stored embeddings", elapsed_ms=(time.time()-start_time)*1000)

            # Step 4: Update hypergraph (incremental)
            graph_update = await self.update_hypergraph_incremental(document, embeddings)
            logger.info(f"Updated hypergraph", elapsed_ms=(time.time()-start_time)*1000)

            # Step 5: Trigger min-cut update (async, non-blocking)
            asyncio.create_task(self.update_mincut_monitor(graph_update))

            # Step 6: Schedule async tasks (entity extraction, detailed analysis)
            self.queue_async_tasks(document.id)

            total_time = (time.time() - start_time) * 1000
            logger.info(f"Real-time processing complete", total_time_ms=total_time)

            return ProcessingResult(
                document_id=document.id,
                status="COMPLETED",
                processing_time_ms=total_time,
                embeddings_generated=len(embeddings)
            )

        except Exception as e:
            logger.error(f"Real-time processing failed", error=str(e))
            # Fall back to batch queue
            await self.queue_for_batch_processing(document)
            return ProcessingResult(
                document_id=document.id,
                status="QUEUED_FOR_BATCH",
                error=str(e)
            )

    async def generate_embeddings_realtime(self, chunks: List[Chunk]) -> List[Embedding]:
        """
        Generate embeddings with rate limiting and timeout
        """

        # For real-time, use faster/cheaper model if under time pressure
        model = "text-embedding-3-small"  # Faster than 3-large

        # Batch chunks into API call
        embeddings = []
        for batch in batched(chunks, size=32):
            try:
                # Timeout after 5 seconds
                result = await asyncio.wait_for(
                    self.embedding_api.embed_batch(batch, model=model),
                    timeout=5.0
                )
                embeddings.extend(result)
            except asyncio.TimeoutError:
                # Fall back to queue for retry
                logger.warning(f"Embedding generation timeout, queuing batch")
                await self.queue_embedding_batch(batch)

        return embeddings

    async def update_hypergraph_incremental(self, document: Document, embeddings: List[Embedding]):
        """
        Incrementally update hypergraph (don't rebuild entire graph)
        """

        # Add new node for document
        node_id = await self.graph_service.add_node(
            node_type=document.doc_type,
            label=document.title,
            embedding_id=embeddings[0].id,  # Document-level embedding
            pyramid_level=self.infer_pyramid_level(document.doc_type)
        )

        # Find related nodes using semantic similarity
        related_nodes = await self.find_related_nodes(embeddings[0], top_k=10)

        # Add edges with alignment scores
        for related_node in related_nodes:
            alignment_score = self.calculate_alignment_score(embeddings[0], related_node.embedding)

            if alignment_score > 0.7:  # Threshold for edge creation
                await self.graph_service.add_edge(
                    source=node_id,
                    target=related_node.id,
                    edge_type="contributes_to",
                    weight=alignment_score
                )

        return GraphUpdate(node_id=node_id, edges_added=len(related_nodes))
```

### 8.3 Batch Processing Pipeline

```python
class BatchProcessor:
    """
    Handle large-scale batch processing
    """

    def __init__(self):
        self.batch_queue = BatchQueue(name="embedding_generation")
        self.workers = 8  # Parallel workers

    async def process_batch(self, documents: List[Document]):
        """
        Batch processing for bulk document uploads
        """

        logger.info(f"Starting batch processing for {len(documents)} documents")

        # Step 1: Parallel chunking
        all_chunks = await asyncio.gather(*[
            self.extract_and_chunk(doc) for doc in documents
        ])

        # Step 2: Batch embedding generation (optimize for throughput)
        flat_chunks = [chunk for doc_chunks in all_chunks for chunk in doc_chunks]

        embeddings = await self.generate_embeddings_batch(
            flat_chunks,
            batch_size=100,  # Larger batches for efficiency
            model="text-embedding-3-large"  # Use best model for batch
        )

        # Step 3: Bulk insert into database
        await self.bulk_insert_embeddings(embeddings)

        # Step 4: Full hypergraph rebuild (more efficient than incremental for large batches)
        await self.rebuild_hypergraph()

        # Step 5: Recalculate all min-cut monitors
        await self.recalculate_mincut_monitors()

        logger.info(f"Batch processing complete")

    async def generate_embeddings_batch(
        self,
        chunks: List[Chunk],
        batch_size: int = 100,
        model: str = "text-embedding-3-large"
    ) -> List[Embedding]:
        """
        Optimized batch embedding generation
        """

        embeddings = []

        # Process in large batches with retry logic
        for batch in batched(chunks, size=batch_size):
            retry_count = 0
            max_retries = 3

            while retry_count < max_retries:
                try:
                    result = await self.embedding_api.embed_batch(
                        batch,
                        model=model,
                        timeout=30.0  # Longer timeout for batch
                    )
                    embeddings.extend(result)

                    # Rate limiting (respect API quotas)
                    await asyncio.sleep(0.1)
                    break

                except RateLimitError:
                    # Exponential backoff
                    wait_time = 2 ** retry_count
                    logger.warning(f"Rate limited, waiting {wait_time}s")
                    await asyncio.sleep(wait_time)
                    retry_count += 1

                except Exception as e:
                    logger.error(f"Batch embedding failed", error=str(e))
                    retry_count += 1

        return embeddings

    async def rebuild_hypergraph(self):
        """
        Full hypergraph rebuild (more efficient for large updates)
        """

        logger.info("Starting full hypergraph rebuild")

        # Load all nodes and embeddings
        nodes = await self.db.query("SELECT * FROM graph_nodes")
        embeddings = await self.db.query("SELECT * FROM embeddings")

        # Calculate all pairwise similarities (using efficient matrix operations)
        similarity_matrix = self.calculate_similarity_matrix(embeddings)

        # Build edges from similarity matrix (threshold-based)
        edges = []
        threshold = 0.7

        for i in range(len(nodes)):
            for j in range(i+1, len(nodes)):
                if similarity_matrix[i][j] > threshold:
                    edges.append({
                        'source': nodes[i].id,
                        'target': nodes[j].id,
                        'weight': similarity_matrix[i][j],
                        'edge_type': 'semantic_similarity'
                    })

        # Bulk insert edges
        await self.db.bulk_insert("graph_edges", edges)

        logger.info(f"Hypergraph rebuilt with {len(edges)} edges")
```

### 8.4 Hybrid Processing Strategy

```python
class HybridProcessor:
    """
    Intelligently route to real-time vs batch processing
    """

    def __init__(self):
        self.realtime_processor = RealTimeProcessor()
        self.batch_processor = BatchProcessor()
        self.batch_threshold = 10  # Route to batch if more than 10 docs

    async def process_documents(self, documents: List[Document]) -> ProcessingResult:
        """
        Route to appropriate processing mode
        """

        if len(documents) == 1:
            # Single document: always real-time
            return await self.realtime_processor.process_document_upload(documents[0])

        elif len(documents) < self.batch_threshold:
            # Small batch: parallel real-time processing
            results = await asyncio.gather(*[
                self.realtime_processor.process_document_upload(doc)
                for doc in documents
            ])
            return ProcessingResult(status="COMPLETED", results=results)

        else:
            # Large batch: use batch processor
            return await self.batch_processor.process_batch(documents)
```

---

## 9. Scaling Considerations

### 9.1 Scaling Dimensions

#### **9.1.1 Document Volume Scaling**

| Scale Tier | Documents | Embeddings | Storage | Compute | Cost/Month |
|------------|-----------|-----------|---------|---------|------------|
| **Startup** (10-100 employees) | 10K | 100K | 50GB | 4 vCPU, 16GB RAM | $500 |
| **Growth** (100-500 employees) | 100K | 1M | 500GB | 16 vCPU, 64GB RAM | $2,000 |
| **Enterprise** (500-5K employees) | 1M | 10M | 5TB | 64 vCPU, 256GB RAM | $10,000 |
| **Large Enterprise** (5K+ employees) | 10M+ | 100M+ | 50TB+ | Distributed cluster | $50,000+ |

#### **9.1.2 Query Load Scaling**

```python
class LoadBalancer:
    """
    Distribute query load across read replicas
    """

    def __init__(self):
        self.primary_db = Database("postgresql://primary:5432")
        self.read_replicas = [
            Database("postgresql://replica1:5432"),
            Database("postgresql://replica2:5432"),
            Database("postgresql://replica3:5432"),
        ]
        self.replica_index = 0

    def get_connection(self, query_type: str) -> Database:
        """
        Route queries to appropriate database instance
        """

        if query_type in ["INSERT", "UPDATE", "DELETE"]:
            # Write operations: primary only
            return self.primary_db

        else:
            # Read operations: round-robin across replicas
            replica = self.read_replicas[self.replica_index]
            self.replica_index = (self.replica_index + 1) % len(self.read_replicas)
            return replica

    async def execute_query(self, sql: str, params: List, query_type: str = "SELECT"):
        """
        Execute query with load balancing
        """

        connection = self.get_connection(query_type)

        # Add retry logic for replica lag
        if query_type == "SELECT":
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    result = await connection.query(sql, params)
                    return result
                except ReplicationLagError:
                    # Fall back to primary if replica is behind
                    if attempt == max_retries - 1:
                        return await self.primary_db.query(sql, params)
                    await asyncio.sleep(0.1)
        else:
            return await connection.query(sql, params)
```

### 9.2 Horizontal Scaling Strategy

#### **9.2.1 Database Sharding**

```python
class ShardingStrategy:
    """
    Shard embeddings across multiple databases for horizontal scaling
    """

    def __init__(self):
        self.shards = [
            Database("postgresql://shard1:5432"),
            Database("postgresql://shard2:5432"),
            Database("postgresql://shard3:5432"),
            Database("postgresql://shard4:5432"),
        ]
        self.num_shards = len(self.shards)

    def get_shard(self, content_id: str) -> Database:
        """
        Determine which shard contains the data

        Sharding key: Hash of content_id
        """

        shard_index = hash(content_id) % self.num_shards
        return self.shards[shard_index]

    async def insert_embedding(self, content_id: str, embedding: np.ndarray, metadata: dict):
        """
        Insert embedding into appropriate shard
        """

        shard = self.get_shard(content_id)

        await shard.execute(
            "INSERT INTO embeddings (content_id, embedding, metadata) VALUES (%s, %s, %s)",
            [content_id, embedding.tolist(), json.dumps(metadata)]
        )

    async def search_all_shards(self, query_embedding: np.ndarray, top_k: int = 10) -> List[SearchResult]:
        """
        Fan-out search across all shards, merge results
        """

        # Execute search on each shard in parallel
        shard_results = await asyncio.gather(*[
            self.search_single_shard(shard, query_embedding, top_k)
            for shard in self.shards
        ])

        # Merge results from all shards
        all_results = [result for shard_result in shard_results for result in shard_result]

        # Re-rank and return top-k globally
        all_results.sort(key=lambda x: x.similarity, reverse=True)
        return all_results[:top_k]

    async def search_single_shard(self, shard: Database, query_embedding: np.ndarray, top_k: int) -> List[SearchResult]:
        """
        Search within a single shard
        """

        results = await shard.query(
            """
            SELECT content_id, 1 - (embedding <=> %s::vector) AS similarity
            FROM embeddings
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            [query_embedding.tolist(), query_embedding.tolist(), top_k]
        )

        return [SearchResult(content_id=r.content_id, similarity=r.similarity) for r in results]
```

#### **9.2.2 Service Scaling (Docker Compose)**

```yaml
# Docker Compose scaling configuration
# Scale with: docker-compose up --scale embedding-generator=3

services:
  embedding-generator:
    deploy:
      replicas: 2  # Base replicas for local deployment
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 1G
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: embedding_queue_length
      target:
        type: AverageValue
        averageValue: "100"  # Scale when queue > 100 per pod
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 min cooldown before scale-down
    scaleUp:
      stabilizationWindowSeconds: 60   # 1 min cooldown before scale-up
      policies:
      - type: Percent
        value: 50  # Increase by 50% at a time
        periodSeconds: 60
```

### 9.3 Performance Optimization Techniques

#### **9.3.1 HNSW Index Optimization**

```sql
-- Monitor index performance
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as number_of_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'embeddings'
ORDER BY idx_scan DESC;

-- Rebuild index if performance degrades
REINDEX INDEX CONCURRENTLY idx_embeddings_hnsw;

-- Adjust ef_search dynamically based on query requirements
-- For dashboard queries (need high recall)
SET LOCAL hnsw.ef_search = 200;

-- For autocomplete/search-as-you-type (need low latency)
SET LOCAL hnsw.ef_search = 20;
```

#### **9.3.2 Query Result Materialization**

```python
class MaterializedViewManager:
    """
    Maintain materialized views for expensive queries
    """

    async def create_alignment_scorecard_view(self):
        """
        Pre-compute alignment scores for all projects to strategic objectives

        This avoids expensive graph traversals on every dashboard load
        """

        await self.db.execute("""
            CREATE MATERIALIZED VIEW IF NOT EXISTS alignment_scorecard AS
            SELECT
                p.id as project_id,
                p.label as project_name,
                o.id as objective_id,
                o.label as objective_name,
                (
                    SELECT AVG(e.weight)
                    FROM graph_edges e
                    WHERE e.source_node_id = p.id
                    AND e.target_node_id IN (
                        SELECT node_id FROM find_path_to_objective(p.id, o.id)
                    )
                ) as alignment_score,
                (
                    SELECT COUNT(*)
                    FROM find_path_to_objective(p.id, o.id)
                ) as path_length
            FROM graph_nodes p
            CROSS JOIN graph_nodes o
            WHERE p.pyramid_level = 7  -- Projects
            AND o.pyramid_level = 3    -- Strategic Objectives
            WITH DATA;

            -- Create index on materialized view
            CREATE INDEX idx_alignment_project ON alignment_scorecard(project_id);
            CREATE INDEX idx_alignment_objective ON alignment_scorecard(objective_id);
        """)

    async def refresh_materialized_views(self):
        """
        Refresh materialized views (run daily or after major updates)
        """

        await self.db.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY alignment_scorecard")
        logger.info("Refreshed alignment scorecard materialized view")
```

---

## 10. Summary & Recommendations

### 10.1 Architecture Summary

**Ruvector Integration for PKA-STRAT** implements a **microservices-based architecture** with:

1. **Embedding Generator Service** (Python/FastAPI) - Multi-model embedding generation
2. **Hypergraph Builder Service** (Rust/Actix) - GNN-powered graph construction
3. **Min-Cut Monitor Service** (Rust) - Real-time mission drift detection
4. **Unified Storage** - RuVector PostgreSQL extension (vectors + hypergraph + relational) + Redis (cache)
5. **Dual Processing** - Real-time for interactive use, batch for bulk operations

### 10.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **RuVector PostgreSQL extension** | SIMD-accelerated (2x faster), 77+ SQL functions, native Cypher queries for hypergraph |
| **Rust for min-cut service** | Performance critical, subpolynomial algorithm requires optimization |
| **Multi-tier caching** | 70-90% cache hit rate reduces database load |
| **Hybrid processing** | Balance between user experience (real-time) and cost (batch) |
| **Materialized views** | Dashboard queries too expensive to run on-demand |
| **Sharding by content_id** | Linear scalability for large enterprises |

### 10.3 Implementation Roadmap

#### **Phase 1: Foundation (Weeks 1-4)**
- [ ] Deploy RuVector PostgreSQL extension (ruvector/postgres:latest)
- [ ] Implement Embedding Generator Service
- [ ] Build basic vector storage and retrieval
- [ ] Set up Redis caching layer
- [ ] Create document ingestion pipeline

#### **Phase 2: Hypergraph (Weeks 5-8)**
- [ ] Implement Hypergraph Builder Service
- [ ] Create Pyramid of Clarity node hierarchy
- [ ] Build alignment score calculation
- [ ] Implement provenance tracking (L-Score)
- [ ] Create graph traversal APIs

#### **Phase 3: Min-Cut Integration (Weeks 9-12)**
- [ ] Deploy ruvector-mincut service
- [ ] Implement continuous monitoring
- [ ] Build mission drift detection logic
- [ ] Create alert system for strategic integrity warnings
- [ ] Integrate with PKA-STRAT dashboards

#### **Phase 4: Optimization (Weeks 13-16)**
- [ ] Implement materialized views
- [ ] Set up database replication
- [ ] Configure autoscaling
- [ ] Optimize HNSW indexes
- [ ] Performance testing and tuning

#### **Phase 5: Production Hardening (Weeks 17-20)**
- [ ] Implement sharding for scale
- [ ] Set up monitoring and observability
- [ ] Create backup and disaster recovery
- [ ] Security hardening
- [ ] Load testing and capacity planning

### 10.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Embedding Generation Latency** | < 200ms (single doc) | P95 latency from embedding API |
| **Search Latency** | < 100ms | P95 for semantic search queries |
| **Min-Cut Update Latency** | < 50ms | Time to process graph update |
| **Cache Hit Rate** | > 80% | (L1 + L2 hits) / total requests |
| **Alignment Score Accuracy** | > 90% | Human validation of top-10 alignments |
| **Mission Drift Detection Accuracy** | > 95% | True positives / (TP + FP) |
| **System Availability** | 99.9% | Uptime excluding planned maintenance |

### 10.5 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Embedding API rate limits** | Multi-tier retry with exponential backoff, fallback to batch queue |
| **Database performance degradation** | Read replicas, materialized views, query optimization, sharding |
| **Min-cut computation complexity** | Algorithm guarantees subpolynomial time, monitor and alert on anomalies |
| **Cache invalidation errors** | TTL-based expiration + manual invalidation on updates |
| **Hypergraph staleness** | Incremental updates for real-time, full rebuild daily for consistency |
| **Vendor lock-in (embedding models)** | Abstract behind service interface, support multiple models |

---

## Appendix A: API Reference

### Embedding Generator Service

```
POST /embed/document
POST /embed/batch
GET /embed/models
GET /embed/status

POST /extract/entities
POST /extract/chunks
```

### Hypergraph Builder Service

```
POST /hypergraph/add-node
POST /hypergraph/add-edge
POST /hypergraph/calculate-alignment
GET /hypergraph/traverse
GET /hypergraph/neighbors
DELETE /hypergraph/node
DELETE /hypergraph/edge

POST /hypergraph/rebuild
GET /hypergraph/stats
```

### Min-Cut Monitor Service

```
POST /mincut/monitor/start
GET /mincut/status
POST /mincut/alert/configure
DELETE /mincut/monitor/stop

GET /mincut/bottlenecks
GET /mincut/integrity
POST /mincut/update-graph
```

---

## Appendix B: Configuration Examples

### RuVector Connection Configuration

```python
# config/database.py

DATABASE_CONFIG = {
    'primary': {
        'host': 'postgresql-primary.internal',
        'port': 5432,
        'database': 'pka_strat',
        'user': 'ruvector_service',
        'password': '${DATABASE_PASSWORD}',  # From env var
        'pool_size': 20,
        'max_overflow': 10,
        'pool_timeout': 30,
    },
    'replicas': [
        {
            'host': 'postgresql-replica-1.internal',
            'port': 5432,
            'database': 'pka_strat',
            'user': 'ruvector_readonly',
            'password': '${DATABASE_PASSWORD}',
            'pool_size': 50,
        },
        {
            'host': 'postgresql-replica-2.internal',
            'port': 5432,
            'database': 'pka_strat',
            'user': 'ruvector_readonly',
            'password': '${DATABASE_PASSWORD}',
            'pool_size': 50,
        },
    ],
    'ruvector': {
        'dimension': 3072,
        'hnsw_m': 16,
        'hnsw_ef_construction': 64,
        'hnsw_ef_search': 40,  # Default, can be overridden per query
        'simd_enabled': True,  # SIMD acceleration (2x faster)
        'compression': 'tiered',  # f32→f16→PQ8→PQ4
    }
}
```

### Redis Caching Configuration

```python
# config/cache.py

REDIS_CONFIG = {
    'host': 'redis-cluster.internal',
    'port': 6379,
    'db': 0,
    'password': '${REDIS_PASSWORD}',
    'max_connections': 100,
    'socket_timeout': 5,
    'socket_connect_timeout': 5,
    'retry_on_timeout': True,
    'health_check_interval': 30,

    'cache_ttl': {
        'embeddings': 86400,  # 24 hours
        'graph_paths': 3600,  # 1 hour
        'alignment_scores': 1800,  # 30 minutes
        'search_results': 600,  # 10 minutes
    }
}
```

---

**END OF SPECIFICATION**

This specification provides a comprehensive blueprint for integrating Ruvector into PKA-STRAT. Implementation teams should refer to this document for architectural decisions, performance targets, and scaling strategies.

For questions or clarifications, contact the PKA-STRAT Architecture Team.
