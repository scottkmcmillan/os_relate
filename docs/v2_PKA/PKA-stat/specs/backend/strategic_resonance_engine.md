# Strategic Resonance Engine: Technical Specification

## Document Information

- **Version**: 1.0
- **Last Updated**: December 28, 2025
- **Status**: Draft Specification
- **Authors**: PKA-STRAT Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Hypergraph Data Structure](#3-hypergraph-data-structure)
4. [Vision-to-Vector Encoding](#4-vision-to-vector-encoding)
5. [Mission Drift Detection](#5-mission-drift-detection)
6. [Provenance Tracking (L-Score)](#6-provenance-tracking-l-score)
7. [Alignment Score Computation](#7-alignment-score-computation)
8. [Real-Time Monitoring Architecture](#8-real-time-monitoring-architecture)
9. [Alert Generation System](#9-alert-generation-system)
10. [API Specifications](#10-api-specifications)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

The Strategic Resonance Engine is the core AI component of PKA-STRAT that transforms abstract strategic concepts (Mission, Vision, OKRs) into a computable mathematical framework. It enables real-time measurement of "Strategic Distance" between daily operations and long-term organizational goals.

### 1.2 Core Innovation

Unlike traditional project management systems that track *what* is being done, the Strategic Resonance Engine measures *why* it matters and *whether* it aligns with strategic intent through:

- **Hypergraph-based semantic modeling** using Ruvector
- **Subpolynomial dynamic min-cut algorithms** for drift detection
- **Multi-entity relationship tracking** beyond simple vector similarity
- **Provenance-based accountability** with paragraph-level attribution

### 1.3 Technology Foundation

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Semantic Embeddings | Ruvector | Multi-entity hypergraph construction |
| Drift Detection | ruvector-mincut | Real-time topological integrity monitoring |
| Graph Storage | PostgreSQL + Hypergraph extensions | Persistent strategic relationship storage |
| Learning Engine | T2 Agent-Supervised Adaptation | Continuous alignment optimization |
| Provenance Tracking | L-Score calculation | Source attribution and accountability |

### 1.4 Key Capabilities

1. **Vision-to-Vector Encoding**: Convert strategic documents into semantic hypergraph representations
2. **Mission Drift Detection**: Real-time monitoring using min-cut algorithms
3. **Provenance Tracking**: Trace every recommendation to source documents (L-Score)
4. **Alignment Scoring**: Calculate alignment at all Pyramid of Clarity levels
5. **Self-Healing**: Automatic detection and correction of strategic disconnects

---

## 2. System Overview

### 2.1 Architectural Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PKA-STRAT SYSTEM ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────┐         ┌──────────────────────────────┐   │
│  │ Document Ingestion│────────▶│  Strategic Resonance Engine  │   │
│  │    (Upload API)   │         │     (This Specification)     │   │
│  └───────────────────┘         └──────────────────────────────┘   │
│           │                                  │                     │
│           │                                  ▼                     │
│           │                    ┌──────────────────────────────┐   │
│           │                    │    Hypergraph Memory Store   │   │
│           │                    │   (Ruvector + PostgreSQL)    │   │
│           │                    └──────────────────────────────┘   │
│           │                                  │                     │
│           ▼                                  ▼                     │
│  ┌───────────────────┐         ┌──────────────────────────────┐   │
│  │ Pyramid of Clarity│◀────────│   Alignment Computation      │   │
│  │  Mapping Engine   │         │      & Scoring Engine        │   │
│  └───────────────────┘         └──────────────────────────────┘   │
│           │                                  │                     │
│           ▼                                  ▼                     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │            Dashboard & Visualization Layer                 │   │
│  │  (Strategic Alignment Map, Drift Alerts, Board Reports)   │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Principles

1. **Computability**: All strategic concepts must be mathematically representable
2. **Provenance**: Every alignment score traces back to specific source documents
3. **Real-Time**: Alignment monitoring operates continuously, not in batch
4. **Self-Correcting**: System detects and recommends corrections for drift
5. **Transparency**: All calculations are explainable and auditable

### 2.3 Integration Points

| System Component | Integration Method | Data Flow |
|-----------------|-------------------|-----------|
| Document Upload API | REST endpoint callbacks | Strategic documents → Encoding |
| Pyramid Mapper | Event-driven triggers | Hierarchy changes → Re-alignment |
| Ruvector Database | Direct library integration | Embeddings ↔ Hypergraph |
| Alert System | Message queue (RabbitMQ) | Drift events → Notifications |
| Dashboard API | GraphQL subscriptions | Real-time metrics → UI |

---

## 3. Hypergraph Data Structure

### 3.1 Conceptual Model

The Strategic Resonance Engine models organizational strategy as a **Causal Hypergraph** where:

- **Nodes** represent strategic entities (Mission statements, OKRs, Projects, Tasks)
- **Hyperedges** represent relationships connecting 3+ entities simultaneously
- **Weights** represent semantic similarity and causal strength
- **Attributes** contain metadata (document source, creation date, confidence)

#### Example: Mission → OKR → Project → Task

```
Hypergraph Representation:

Nodes:
  N1: Mission = "Become market leader in sustainable energy"
  N2: Strategic Objective = "Reduce carbon footprint by 40%"
  N3: Q3 OKR = "Launch solar panel product line"
  N4: Project = "Solar Panel R&D Initiative"
  N5: Task = "Conduct materials sustainability analysis"

Hyperedges:
  H1: {N1, N2, N3} - "Sustainability Alignment"
     Weight: 0.92 (high semantic coherence)
     Type: "Mission→Objective→Goal"

  H2: {N2, N3, N4} - "Execution Pathway"
     Weight: 0.87
     Type: "Objective→Goal→Project"

  H3: {N4, N5} - "Project→Task"
     Weight: 0.95
     Type: "Hierarchical"

  H4: {N1, N3, N5} - "End-to-End Alignment"
     Weight: 0.78 (transitive relationship)
     Type: "Mission→Task (multi-hop)"
```

### 3.2 Data Schema

#### 3.2.1 Node Schema

```typescript
interface StrategyNode {
  id: string;                          // UUID
  type: PyramidLevel;                  // Mission | Vision | Objective | Goal | Portfolio | Program | Project | Task
  content: string;                     // Text content
  embedding: number[];                 // Ruvector semantic embedding (dimension: 1536)
  metadata: {
    sourceDocument: string;            // Document ID that created this node
    sourceParagraph: string;           // Specific paragraph (for provenance)
    createdAt: string;                 // ISO timestamp
    updatedAt: string;
    createdBy: string;                 // User ID or "system"
    tags: string[];
    confidence: number;                // 0.0-1.0 (extraction confidence)
  };
  attributes: Record<string, any>;     // Extensible attributes
}

enum PyramidLevel {
  Mission = "mission",
  Vision = "vision",
  Objective = "objective",
  Goal = "goal",
  Portfolio = "portfolio",
  Program = "program",
  Project = "project",
  Task = "task"
}
```

#### 3.2.2 Hyperedge Schema

```typescript
interface StrategyHyperedge {
  id: string;                          // UUID
  nodes: string[];                     // Array of node IDs (minimum 2, typically 3+)
  weight: number;                      // 0.0-1.0 (relationship strength)
  type: EdgeType;                      // Classification of relationship
  causalDirection: string[];           // Ordered node IDs showing causal flow
  metadata: {
    derivationMethod: string;          // "semantic-similarity" | "explicit-reference" | "inferred"
    createdAt: string;
    confidence: number;                // Relationship confidence
    gnnBoost: number;                  // GNN-learned relevance boost (-1.0 to 1.0)
  };
  provenance: {
    sourceNodes: string[];             // Which nodes contributed to this edge
    reasoning: string;                 // Why this relationship exists
  };
}

enum EdgeType {
  Hierarchical = "hierarchical",       // Parent-child in pyramid
  Causal = "causal",                   // A causes/enables B
  Semantic = "semantic",               // Similar meaning
  Contributory = "contributory",       // A contributes to achieving B
  Conflicting = "conflicting",         // A conflicts with B (negative weight)
}
```

#### 3.2.3 Hypergraph Aggregate

```typescript
interface StrategyHypergraph {
  id: string;                          // Organization ID
  nodes: Map<string, StrategyNode>;
  edges: Map<string, StrategyHyperedge>;
  topology: {
    globalMinCut: number;              // From ruvector-mincut
    criticalEdges: string[];           // Edges in minimum cut
    disconnectedComponents: string[][]; // Groups of disconnected nodes
    pyramidIntegrity: number;          // 0.0-1.0 score
  };
  metadata: {
    lastUpdated: string;
    nodeCount: number;
    edgeCount: number;
    avgNodeDegree: number;
  };
}
```

### 3.3 Storage Implementation

#### PostgreSQL Schema

```sql
-- Strategic Nodes Table
CREATE TABLE strategy_nodes (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),              -- RuVector extension (SIMD-accelerated)
  metadata JSONB NOT NULL,
  attributes JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nodes_org ON strategy_nodes(organization_id);
CREATE INDEX idx_nodes_type ON strategy_nodes(type);
CREATE INDEX idx_nodes_embedding ON strategy_nodes USING ivfflat (embedding vector_cosine_ops);

-- Strategic Hyperedges Table
CREATE TABLE strategy_hyperedges (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  node_ids UUID[] NOT NULL,            -- Array of connected node IDs
  weight FLOAT NOT NULL,
  type VARCHAR(50) NOT NULL,
  causal_direction UUID[],
  metadata JSONB NOT NULL,
  provenance JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_edges_org ON strategy_hyperedges(organization_id);
CREATE INDEX idx_edges_nodes ON strategy_hyperedges USING GIN(node_ids);

-- Min-Cut Topology Cache
CREATE TABLE topology_snapshots (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  global_min_cut FLOAT NOT NULL,
  critical_edges UUID[] NOT NULL,
  disconnected_components JSONB,
  pyramid_integrity FLOAT NOT NULL,
  computed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_topology_org_time ON topology_snapshots(organization_id, computed_at DESC);
```

#### Ruvector Integration

```typescript
// Ruvector Collection Configuration
const strategyGraphConfig = {
  collection: "strategic_hypergraph",
  dimension: 1536,
  metric: "cosine",
  hybridSearch: {
    enabledKeywordSearch: true,
    enableGraphTraversal: true,
    enableHyperedgeQueries: true
  },
  gnnOptimization: {
    enabled: true,
    architecture: "SONA",               // Self-Optimizing Neural Architecture
    updateFrequency: "realtime",
    learningSignal: "t2-agent-supervised"
  },
  indexing: {
    type: "HNSW",
    m: 16,
    efConstruction: 200,
    gnnBoost: true                      // Use GNN to reweight edges
  }
};
```

### 3.4 Graph Construction Algorithm

```typescript
/**
 * Constructs hypergraph from uploaded strategic documents
 */
async function constructHypergraphFromDocument(
  document: UploadedDocument,
  organizationId: string
): Promise<StrategyNode[]> {

  // Step 1: Extract strategic entities (using NLP)
  const entities = await extractStrategicEntities(document);

  // Step 2: Classify entities into Pyramid levels
  const classifiedNodes = await classifyPyramidLevel(entities);

  // Step 3: Generate semantic embeddings
  const embeddedNodes = await Promise.all(
    classifiedNodes.map(async (node) => ({
      ...node,
      embedding: await ruvector.embed(node.content),
      metadata: {
        ...node.metadata,
        sourceDocument: document.id,
        sourceParagraph: node.originalParagraph
      }
    }))
  );

  // Step 4: Store nodes in hypergraph
  await ruvector.insertNodes(embeddedNodes);

  // Step 5: Infer hyperedges
  const hyperedges = await inferHyperedges(embeddedNodes);
  await ruvector.insertEdges(hyperedges);

  // Step 6: Update topology metrics
  await updateTopologyMetrics(organizationId);

  return embeddedNodes;
}

/**
 * Infer relationships between strategic entities
 */
async function inferHyperedges(
  nodes: StrategyNode[]
): Promise<StrategyHyperedge[]> {

  const edges: StrategyHyperedge[] = [];

  // Hierarchical edges (explicit parent-child in pyramid)
  edges.push(...inferHierarchicalEdges(nodes));

  // Semantic edges (similar meaning, even across levels)
  edges.push(...await inferSemanticEdges(nodes));

  // Causal edges (A enables B, extracted via NLP)
  edges.push(...await inferCausalEdges(nodes));

  // Multi-entity hyperedges (3+ nodes)
  edges.push(...await inferMultiEntityEdges(nodes));

  return edges;
}
```

---

## 4. Vision-to-Vector Encoding

### 4.1 Encoding Pipeline

The Vision-to-Vector Encoding process transforms abstract strategic documents into computable hypergraph representations through a multi-stage pipeline.

```
Strategic Document (PDF/DOCX)
         │
         ▼
┌────────────────────┐
│  1. Text Extraction│  ─── Parse structure (headings, paragraphs, lists)
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  2. Entity Extraction│ ─── NLP: Identify strategic statements
│     (NER + Custom)  │      - Goals, objectives, initiatives
└────────────────────┘      - Key metrics, timelines
         │
         ▼
┌────────────────────┐
│ 3. Pyramid Classifier│ ─── Classify each entity into pyramid level
│   (ML Classifier)   │      Using fine-tuned BERT model
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ 4. Semantic Embedding│ ─── Generate vector representations
│    (Ruvector API)   │      Dimension: 1536
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ 5. Relationship     │ ─── Infer hyperedges
│    Inference        │      - Explicit references
└────────────────────┘      - Semantic similarity
         │                   - Causal dependencies
         ▼
┌────────────────────┐
│ 6. Hypergraph Store │ ─── Insert nodes + edges into Ruvector
│    (Ruvector DB)    │      Update topology metrics
└────────────────────┘
```

### 4.2 Entity Extraction Details

#### 4.2.1 Strategic Statement Patterns

The system identifies strategic statements using pattern matching and NLP:

```typescript
interface EntityExtractionConfig {
  patterns: {
    mission: RegExp[];      // e.g., "Our mission is to...", "We exist to..."
    vision: RegExp[];       // e.g., "We envision...", "Our vision..."
    objective: RegExp[];    // e.g., "Strategic objective:", "We will..."
    goal: RegExp[];         // e.g., "Q[1-4] Goal:", "Annual target:"
    okr: RegExp[];          // e.g., "Key Result:", "KR:"
  };
  nlpModels: {
    ner: string;            // spaCy or Hugging Face model
    sentimentAnalysis: string;
    dependencyParser: string;
  };
}

const extractionPatterns = {
  mission: [
    /our mission is to (.+)/i,
    /we exist to (.+)/i,
    /the company's purpose is (.+)/i
  ],
  vision: [
    /our vision is (.+)/i,
    /we envision (.+)/i,
    /by \d{4}, we will (.+)/i
  ],
  objective: [
    /strategic objective[:\s]+(.+)/i,
    /we will achieve (.+)/i,
    /key focus area[:\s]+(.+)/i
  ],
  // ... additional patterns
};
```

#### 4.2.2 NLP Processing

```typescript
async function extractStrategicEntities(
  document: UploadedDocument
): Promise<ExtractedEntity[]> {

  const text = await extractText(document);
  const paragraphs = splitIntoParagraphs(text);

  const entities: ExtractedEntity[] = [];

  for (const paragraph of paragraphs) {
    // Named Entity Recognition
    const nerEntities = await nlpService.extractEntities(paragraph);

    // Pattern matching for strategic statements
    for (const [type, patterns] of Object.entries(extractionPatterns)) {
      for (const pattern of patterns) {
        const match = paragraph.match(pattern);
        if (match) {
          entities.push({
            type: type as PyramidLevel,
            content: match[1] || paragraph,
            originalParagraph: paragraph,
            confidence: calculateConfidence(match, nerEntities),
            metadata: {
              extractionMethod: "pattern-match",
              pattern: pattern.source
            }
          });
        }
      }
    }

    // ML-based extraction for ambiguous cases
    const mlExtraction = await mlClassifier.extractEntities(paragraph);
    entities.push(...mlExtraction);
  }

  // Deduplicate and merge similar entities
  return deduplicateEntities(entities);
}
```

### 4.3 Pyramid Level Classification

#### 4.3.1 ML Classifier

Fine-tuned BERT model for pyramid level classification:

```typescript
interface PyramidClassifier {
  model: "distilbert-base-uncased-finetuned-pyramid";
  labels: PyramidLevel[];
  confidenceThreshold: number;  // Minimum 0.75 for auto-classification
}

async function classifyPyramidLevel(
  entity: ExtractedEntity
): Promise<StrategyNode> {

  const classification = await mlClassifier.predict(entity.content);

  // If confidence is low, use heuristic fallback
  if (classification.confidence < 0.75) {
    classification.level = heuristicClassification(entity);
    classification.confidence = 0.5;
  }

  return {
    id: generateUUID(),
    type: classification.level,
    content: entity.content,
    embedding: [], // Will be populated next
    metadata: {
      ...entity.metadata,
      classificationConfidence: classification.confidence,
      classificationMethod: classification.confidence >= 0.75 ? "ml" : "heuristic"
    },
    attributes: {}
  };
}

/**
 * Heuristic classification based on document structure
 */
function heuristicClassification(entity: ExtractedEntity): PyramidLevel {
  const content = entity.content.toLowerCase();

  // Mission: Abstract, purpose-driven
  if (content.includes("purpose") || content.includes("exist to")) {
    return PyramidLevel.Mission;
  }

  // Vision: Future-oriented, temporal markers
  if (/\d{4}/.test(content) || content.includes("become")) {
    return PyramidLevel.Vision;
  }

  // OKR/Goal: Measurable, contains metrics
  if (/\d+%/.test(content) || content.includes("increase by")) {
    return PyramidLevel.Goal;
  }

  // Project: Tactical, contains action verbs
  if (content.includes("implement") || content.includes("develop")) {
    return PyramidLevel.Project;
  }

  // Default to Objective
  return PyramidLevel.Objective;
}
```

### 4.4 Semantic Embedding Generation

#### 4.4.1 Embedding Model

```typescript
interface EmbeddingConfig {
  model: "ruvector-v2-1536";          // Ruvector's semantic model
  dimension: 1536;
  normalization: "l2";                 // L2 normalization
  contextWindow: 512;                  // Token limit
  pooling: "mean";                     // Mean pooling strategy
}

async function generateEmbedding(
  content: string,
  context?: string[]                   // Optional: related paragraphs for context
): Promise<number[]> {

  // Prepare input with context
  const input = context
    ? `Context: ${context.join(" ")} \n\n Content: ${content}`
    : content;

  // Generate embedding via Ruvector API
  const embedding = await ruvector.embed(input, {
    model: "ruvector-v2-1536",
    normalize: true
  });

  return embedding;
}
```

### 4.5 Relationship Inference

#### 4.5.1 Semantic Similarity Edges

```typescript
/**
 * Infer edges based on semantic similarity
 */
async function inferSemanticEdges(
  nodes: StrategyNode[]
): Promise<StrategyHyperedge[]> {

  const edges: StrategyHyperedge[] = [];
  const similarityThreshold = 0.7;    // Cosine similarity minimum

  // Compute pairwise similarities
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const similarity = cosineSimilarity(
        nodes[i].embedding,
        nodes[j].embedding
      );

      if (similarity >= similarityThreshold) {
        edges.push({
          id: generateUUID(),
          nodes: [nodes[i].id, nodes[j].id],
          weight: similarity,
          type: EdgeType.Semantic,
          causalDirection: [],          // Non-directional
          metadata: {
            derivationMethod: "semantic-similarity",
            createdAt: new Date().toISOString(),
            confidence: similarity,
            gnnBoost: 0.0                // Will be learned
          },
          provenance: {
            sourceNodes: [nodes[i].id, nodes[j].id],
            reasoning: `Semantic similarity: ${similarity.toFixed(3)}`
          }
        });
      }
    }
  }

  return edges;
}
```

#### 4.5.2 Causal Dependency Edges

```typescript
/**
 * Infer causal relationships using dependency parsing
 */
async function inferCausalEdges(
  nodes: StrategyNode[]
): Promise<StrategyHyperedge[]> {

  const edges: StrategyHyperedge[] = [];

  for (const node of nodes) {
    // Parse for causal language
    const causalPatterns = [
      /in order to (.+), we will (.+)/i,
      /by achieving (.+), we enable (.+)/i,
      /(.+) supports (.+)/i,
      /(.+) contributes to (.+)/i
    ];

    for (const pattern of causalPatterns) {
      const match = node.content.match(pattern);
      if (match) {
        // Find nodes matching the cause/effect
        const causeNode = findNodeByContent(nodes, match[1]);
        const effectNode = findNodeByContent(nodes, match[2]);

        if (causeNode && effectNode) {
          edges.push({
            id: generateUUID(),
            nodes: [causeNode.id, effectNode.id],
            weight: 0.85,                // High confidence for explicit causality
            type: EdgeType.Causal,
            causalDirection: [causeNode.id, effectNode.id],
            metadata: {
              derivationMethod: "explicit-reference",
              createdAt: new Date().toISOString(),
              confidence: 0.85,
              gnnBoost: 0.0
            },
            provenance: {
              sourceNodes: [node.id],
              reasoning: `Explicit causal reference in: "${node.content}"`
            }
          });
        }
      }
    }
  }

  return edges;
}
```

#### 4.5.3 Multi-Entity Hyperedges

```typescript
/**
 * Create hyperedges connecting 3+ nodes (true hypergraph)
 */
async function inferMultiEntityEdges(
  nodes: StrategyNode[]
): Promise<StrategyHyperedge[]> {

  const edges: StrategyHyperedge[] = [];

  // Group nodes by pyramid level
  const nodesByLevel = groupBy(nodes, (n) => n.type);

  // Create Mission → Objective → Goal → Project chains
  for (const mission of nodesByLevel[PyramidLevel.Mission] || []) {
    const relatedObjectives = await findRelatedNodes(
      mission,
      nodesByLevel[PyramidLevel.Objective] || [],
      0.6  // Similarity threshold
    );

    for (const objective of relatedObjectives) {
      const relatedGoals = await findRelatedNodes(
        objective,
        nodesByLevel[PyramidLevel.Goal] || [],
        0.6
      );

      for (const goal of relatedGoals) {
        // Create 3-node hyperedge: {Mission, Objective, Goal}
        edges.push({
          id: generateUUID(),
          nodes: [mission.id, objective.id, goal.id],
          weight: calculateChainWeight([mission, objective, goal]),
          type: EdgeType.Hierarchical,
          causalDirection: [mission.id, objective.id, goal.id],
          metadata: {
            derivationMethod: "inferred",
            createdAt: new Date().toISOString(),
            confidence: 0.75,
            gnnBoost: 0.0
          },
          provenance: {
            sourceNodes: [mission.id, objective.id, goal.id],
            reasoning: "Semantic alignment through pyramid hierarchy"
          }
        });
      }
    }
  }

  return edges;
}

async function findRelatedNodes(
  sourceNode: StrategyNode,
  candidateNodes: StrategyNode[],
  threshold: number
): Promise<StrategyNode[]> {

  const related: StrategyNode[] = [];

  for (const candidate of candidateNodes) {
    const similarity = cosineSimilarity(
      sourceNode.embedding,
      candidate.embedding
    );

    if (similarity >= threshold) {
      related.push(candidate);
    }
  }

  // Sort by similarity descending
  return related.sort((a, b) => {
    const simA = cosineSimilarity(sourceNode.embedding, a.embedding);
    const simB = cosineSimilarity(sourceNode.embedding, b.embedding);
    return simB - simA;
  });
}
```

---

## 5. Mission Drift Detection

### 5.1 Conceptual Overview

**Mission Drift** occurs when current organizational activities become semantically and structurally disconnected from strategic objectives. The Strategic Resonance Engine detects drift using:

1. **Topological Analysis**: Min-cut algorithm identifies weak structural connections
2. **Semantic Distance**: Vector space distance between current work and strategic goals
3. **Temporal Monitoring**: Track drift metrics over time to detect trends
4. **GNN Learning**: Reinforcement learning to improve drift prediction

### 5.2 Min-Cut Integration (ruvector-mincut)

#### 5.2.1 Theoretical Foundation

The `ruvector-mincut` algorithm (based on El-Hayek, Henzinger, Li, SODA 2026) provides **subpolynomial-time dynamic minimum cut** computation. This enables real-time monitoring of hypergraph structural integrity.

**Key Insight**: The minimum cut value represents the "fragility" of strategic alignment. A low min-cut indicates the organization is one or two disconnects away from strategic fracture.

```typescript
interface MinCutResult {
  minCutValue: number;                 // Minimum edges to disconnect graph
  cutEdges: string[];                  // Edge IDs in the minimum cut
  partitionA: string[];                // Node IDs in first partition
  partitionB: string[];                // Node IDs in second partition
  bottleneckNodes: string[];           // Nodes critical to connectivity
  computationTime: number;             // Microseconds
}
```

#### 5.2.2 Min-Cut Monitoring Service

```typescript
/**
 * Continuous monitoring service for min-cut metrics
 */
class MinCutMonitoringService {

  private minCutThreshold = 3.0;       // Alert if min-cut < 3
  private checkInterval = 60000;       // Check every 60 seconds

  async startMonitoring(organizationId: string): Promise<void> {

    setInterval(async () => {
      const result = await this.computeMinCut(organizationId);

      // Store result
      await this.storeTopologySnapshot(organizationId, result);

      // Check for drift
      if (result.minCutValue < this.minCutThreshold) {
        await this.triggerDriftAlert(organizationId, result);
      }

      // Update GNN with structural learning
      await this.updateGNNFromTopology(organizationId, result);

    }, this.checkInterval);
  }

  async computeMinCut(organizationId: string): Promise<MinCutResult> {

    // Load hypergraph from Ruvector
    const hypergraph = await ruvector.loadHypergraph(organizationId);

    // Convert to format for ruvector-mincut
    const graph = this.convertToMinCutFormat(hypergraph);

    // Compute minimum cut using Rust library
    const result = await ruvectorMincut.computeDynamicMinCut(graph);

    return {
      minCutValue: result.cut_value,
      cutEdges: result.cut_edges,
      partitionA: result.partition_a,
      partitionB: result.partition_b,
      bottleneckNodes: this.identifyBottlenecks(result),
      computationTime: result.computation_time_us
    };
  }

  private identifyBottlenecks(result: any): string[] {
    // Nodes that appear in many cut edges are bottlenecks
    const nodeCounts = new Map<string, number>();

    for (const edgeId of result.cut_edges) {
      const edge = this.getEdge(edgeId);
      for (const nodeId of edge.nodes) {
        nodeCounts.set(nodeId, (nodeCounts.get(nodeId) || 0) + 1);
      }
    }

    // Return nodes appearing in >1 cut edge
    return Array.from(nodeCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([nodeId, _]) => nodeId);
  }
}
```

### 5.3 Semantic Distance Computation

#### 5.3.1 Strategic Distance Metric

**Definition**: The Strategic Distance $D_s(A, B)$ between two strategic entities $A$ and $B$ combines:

1. **Embedding Distance**: Cosine distance in vector space
2. **Graph Distance**: Shortest path length in hypergraph
3. **Pyramid Distance**: Hierarchical separation in Pyramid of Clarity

$$
D_s(A, B) = \alpha \cdot D_{embed}(A, B) + \beta \cdot D_{graph}(A, B) + \gamma \cdot D_{pyramid}(A, B)
$$

Where:
- $D_{embed}(A, B) = 1 - \text{cosine\_similarity}(\vec{A}, \vec{B})$
- $D_{graph}(A, B) = \text{shortest\_path\_length}(A, B) / \text{max\_path\_length}$
- $D_{pyramid}(A, B) = |\text{level}(A) - \text{level}(B)| / 7$ (normalized by pyramid height)
- $\alpha, \beta, \gamma$ are learned weights (default: 0.5, 0.3, 0.2)

```typescript
async function computeStrategicDistance(
  nodeA: StrategyNode,
  nodeB: StrategyNode,
  hypergraph: StrategyHypergraph
): Promise<number> {

  // Embedding distance (cosine)
  const embeddingDist = 1 - cosineSimilarity(nodeA.embedding, nodeB.embedding);

  // Graph distance (shortest path)
  const pathLength = await findShortestPath(
    hypergraph,
    nodeA.id,
    nodeB.id
  );
  const maxPathLength = hypergraph.nodes.size;  // Worst case: diameter
  const graphDist = pathLength / maxPathLength;

  // Pyramid distance
  const pyramidLevels = Object.values(PyramidLevel);
  const levelA = pyramidLevels.indexOf(nodeA.type);
  const levelB = pyramidLevels.indexOf(nodeB.type);
  const pyramidDist = Math.abs(levelA - levelB) / (pyramidLevels.length - 1);

  // Weighted combination
  const alpha = 0.5, beta = 0.3, gamma = 0.2;
  const strategicDist =
    alpha * embeddingDist +
    beta * graphDist +
    gamma * pyramidDist;

  return strategicDist;
}
```

#### 5.3.2 Mission Drift Score

**Definition**: For a given task/project, compute its drift from the mission:

$$
\text{Drift}(T) = \min_{M \in \text{Missions}} D_s(T, M)
$$

A high drift score indicates the task is far from all mission statements.

```typescript
async function computeMissionDrift(
  taskNode: StrategyNode,
  hypergraph: StrategyHypergraph
): Promise<DriftAnalysis> {

  // Find all mission nodes
  const missionNodes = Array.from(hypergraph.nodes.values())
    .filter(n => n.type === PyramidLevel.Mission);

  if (missionNodes.length === 0) {
    throw new Error("No mission statements found in hypergraph");
  }

  // Compute distance to each mission
  const distances = await Promise.all(
    missionNodes.map(async (mission) => ({
      missionId: mission.id,
      missionContent: mission.content,
      distance: await computeStrategicDistance(taskNode, mission, hypergraph)
    }))
  );

  // Find minimum distance (closest mission)
  const closestMission = distances.reduce((min, curr) =>
    curr.distance < min.distance ? curr : min
  );

  // Drift categories
  const driftScore = closestMission.distance;
  const driftLevel =
    driftScore < 0.3 ? "aligned" :
    driftScore < 0.6 ? "moderate-drift" :
    "critical-drift";

  return {
    taskId: taskNode.id,
    driftScore: driftScore,
    driftLevel: driftLevel,
    closestMission: closestMission.missionId,
    closestMissionContent: closestMission.missionContent,
    distances: distances,
    recommendation: generateDriftRecommendation(driftLevel, closestMission)
  };
}

interface DriftAnalysis {
  taskId: string;
  driftScore: number;                  // 0.0 = aligned, 1.0 = completely disconnected
  driftLevel: "aligned" | "moderate-drift" | "critical-drift";
  closestMission: string;              // Mission ID
  closestMissionContent: string;
  distances: Array<{
    missionId: string;
    missionContent: string;
    distance: number;
  }>;
  recommendation: string;
}
```

### 5.4 Temporal Drift Tracking

#### 5.4.1 Time-Series Monitoring

```typescript
interface DriftTimeSeries {
  organizationId: string;
  measurements: DriftMeasurement[];
  trend: "improving" | "stable" | "degrading";
  projectedDrift: number;              // Forecasted drift in 30 days
}

interface DriftMeasurement {
  timestamp: string;
  globalDrift: number;                 // Average drift across all active tasks
  minCutValue: number;
  criticalDriftNodes: string[];        // Node IDs with drift > 0.6
  topBottlenecks: Array<{
    nodeId: string;
    bottleneckScore: number;
  }>;
}

/**
 * Track drift over time and forecast trends
 */
class DriftTrendAnalyzer {

  async analyzeTrend(
    organizationId: string,
    lookbackDays: number = 30
  ): Promise<DriftTimeSeries> {

    // Fetch historical measurements
    const measurements = await this.fetchHistoricalDrift(
      organizationId,
      lookbackDays
    );

    // Compute trend (linear regression)
    const trend = this.computeTrend(measurements);

    // Forecast drift 30 days ahead
    const projectedDrift = this.forecastDrift(measurements, 30);

    return {
      organizationId,
      measurements,
      trend,
      projectedDrift
    };
  }

  private computeTrend(
    measurements: DriftMeasurement[]
  ): "improving" | "stable" | "degrading" {

    if (measurements.length < 2) return "stable";

    // Simple linear regression on globalDrift
    const drifts = measurements.map(m => m.globalDrift);
    const slope = this.linearRegressionSlope(drifts);

    if (slope < -0.01) return "improving";
    if (slope > 0.01) return "degrading";
    return "stable";
  }

  private forecastDrift(
    measurements: DriftMeasurement[],
    daysAhead: number
  ): number {

    const drifts = measurements.map(m => m.globalDrift);
    const slope = this.linearRegressionSlope(drifts);
    const intercept = this.linearRegressionIntercept(drifts);

    const currentDay = measurements.length - 1;
    const futureDay = currentDay + daysAhead;

    return slope * futureDay + intercept;
  }
}
```

### 5.5 Strategic Integrity Warnings

#### 5.5.1 Warning Triggers

```typescript
enum WarningLevel {
  Info = "info",
  Warning = "warning",
  Critical = "critical"
}

interface StrategicIntegrityWarning {
  id: string;
  organizationId: string;
  level: WarningLevel;
  category: "drift" | "min-cut" | "disconnected" | "bottleneck";
  title: string;
  description: string;
  affectedNodes: string[];
  recommendation: string;
  createdAt: string;
  resolved: boolean;
}

/**
 * Generate warnings based on drift detection
 */
async function generateIntegrityWarnings(
  organizationId: string,
  minCutResult: MinCutResult,
  driftAnalysis: DriftAnalysis[]
): Promise<StrategicIntegrityWarning[]> {

  const warnings: StrategicIntegrityWarning[] = [];

  // Warning 1: Low min-cut (fragile topology)
  if (minCutResult.minCutValue < 3.0) {
    warnings.push({
      id: generateUUID(),
      organizationId,
      level: WarningLevel.Critical,
      category: "min-cut",
      title: "Strategic Fragility Detected",
      description: `The organizational strategy graph has a minimum cut value of ${minCutResult.minCutValue.toFixed(2)}. The removal of ${Math.floor(minCutResult.minCutValue)} connections would fracture strategic alignment into disconnected components.`,
      affectedNodes: minCutResult.bottleneckNodes,
      recommendation: "Create additional connections between mission statements and isolated projects. Consider adding cross-functional initiatives that bridge strategic themes.",
      createdAt: new Date().toISOString(),
      resolved: false
    });
  }

  // Warning 2: Critical drift tasks
  const criticalDriftTasks = driftAnalysis.filter(
    d => d.driftLevel === "critical-drift"
  );

  if (criticalDriftTasks.length > 0) {
    warnings.push({
      id: generateUUID(),
      organizationId,
      level: WarningLevel.Warning,
      category: "drift",
      title: `${criticalDriftTasks.length} Tasks Critically Disconnected from Mission`,
      description: `The following tasks have strategic drift scores > 0.6, indicating weak alignment with organizational mission: ${criticalDriftTasks.map(t => t.taskId).join(", ")}`,
      affectedNodes: criticalDriftTasks.map(t => t.taskId),
      recommendation: "Review these tasks for strategic relevance. Consider reprioritizing or linking them explicitly to strategic objectives.",
      createdAt: new Date().toISOString(),
      resolved: false
    });
  }

  // Warning 3: Disconnected components
  if (minCutResult.partitionA.length > 0 && minCutResult.partitionB.length > 0) {
    const partitionATypes = await getNodeTypes(minCutResult.partitionA);
    const partitionBTypes = await getNodeTypes(minCutResult.partitionB);

    warnings.push({
      id: generateUUID(),
      organizationId,
      level: WarningLevel.Critical,
      category: "disconnected",
      title: "Strategy Graph Partitioned",
      description: `The strategy hypergraph has been partitioned into two disconnected groups: Group A (${partitionATypes}) and Group B (${partitionBTypes}). This indicates complete strategic misalignment between organizational units.`,
      affectedNodes: [...minCutResult.partitionA, ...minCutResult.partitionB],
      recommendation: "Immediate intervention required. Create explicit connections between these groups through shared OKRs or cross-functional programs.",
      createdAt: new Date().toISOString(),
      resolved: false
    });
  }

  return warnings;
}
```

---

## 6. Provenance Tracking (L-Score)

### 6.1 Provenance Concept

**L-Score (Lineage Score)** is a metric that traces every strategic recommendation, alignment score, or computed insight back to the specific source documents and paragraphs that justify it.

**Purpose**:
- **Accountability**: Leadership can verify the origin of all AI-generated insights
- **Auditability**: Compliance teams can trace decision-making logic
- **Transparency**: Users understand why the system made a recommendation
- **Trust**: Provenance builds confidence in AI outputs

### 6.2 L-Score Calculation

#### 6.2.1 Definition

For a given recommendation $R$ (e.g., "Project X has 78% alignment with Mission Y"), the L-Score is computed as:

$$
L(R) = \sum_{i=1}^{n} w_i \cdot c_i
$$

Where:
- $n$ = number of source documents contributing to $R$
- $w_i$ = weight of source $i$ (based on relevance and recency)
- $c_i$ = confidence of extraction from source $i$

**Interpretation**:
- $L(R) > 0.8$: High provenance (multiple authoritative sources)
- $0.5 < L(R) < 0.8$: Moderate provenance (some sources, or lower confidence)
- $L(R) < 0.5$: Low provenance (inferred, not explicitly stated)

#### 6.2.2 Implementation

```typescript
interface ProvenanceRecord {
  recommendationId: string;
  lScore: number;                      // 0.0-1.0
  sources: ProvenanceSource[];
  generatedAt: string;
  verifiedBy?: string;                 // User ID who verified (optional)
}

interface ProvenanceSource {
  documentId: string;
  documentTitle: string;
  paragraphId: string;
  paragraphText: string;
  weight: number;                      // Contribution weight
  confidence: number;                  // Extraction confidence
  relevanceScore: number;              // How relevant to recommendation
  recencyWeight: number;               // Decay based on document age
}

/**
 * Compute L-Score for a strategic alignment recommendation
 */
async function computeLScore(
  recommendation: AlignmentRecommendation,
  hypergraph: StrategyHypergraph
): Promise<ProvenanceRecord> {

  // Identify all nodes involved in this recommendation
  const involvedNodes = recommendation.involvedNodeIds;

  // Extract source documents from node metadata
  const sources: ProvenanceSource[] = [];

  for (const nodeId of involvedNodes) {
    const node = hypergraph.nodes.get(nodeId);
    if (!node) continue;

    const document = await getDocument(node.metadata.sourceDocument);
    const paragraph = node.metadata.sourceParagraph;

    // Compute weights
    const relevanceScore = await computeRelevance(
      paragraph,
      recommendation.content
    );

    const recencyWeight = computeRecencyWeight(
      document.createdAt,
      new Date()
    );

    const weight = relevanceScore * recencyWeight;

    sources.push({
      documentId: document.id,
      documentTitle: document.title,
      paragraphId: node.metadata.sourceParagraph,
      paragraphText: paragraph,
      weight: weight,
      confidence: node.metadata.confidence,
      relevanceScore: relevanceScore,
      recencyWeight: recencyWeight
    });
  }

  // Compute L-Score
  const lScore = sources.reduce(
    (sum, source) => sum + (source.weight * source.confidence),
    0
  ) / sources.length;  // Normalize by number of sources

  return {
    recommendationId: recommendation.id,
    lScore: lScore,
    sources: sources.sort((a, b) => b.weight - a.weight),  // Sort by weight
    generatedAt: new Date().toISOString()
  };
}

/**
 * Compute recency weight (exponential decay)
 */
function computeRecencyWeight(
  documentDate: Date,
  currentDate: Date,
  halfLifeDays: number = 180  // 6 months
): number {

  const ageInDays = (currentDate.getTime() - documentDate.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay: weight = 2^(-age / halfLife)
  const weight = Math.pow(2, -ageInDays / halfLifeDays);

  return weight;
}
```

### 6.3 Provenance UI Display

#### 6.3.1 Citation Format

```typescript
interface ProvenanceCitation {
  summary: string;                     // "Based on 3 strategic documents"
  sources: Array<{
    title: string;
    excerpt: string;                   // Highlighted paragraph
    relevance: string;                 // "Primary source" | "Supporting evidence"
    url: string;                       // Link to document viewer
  }>;
  lScore: number;
  lScoreLabel: string;                 // "High confidence" | "Moderate" | "Low"
}

function formatProvenanceForUI(
  provenance: ProvenanceRecord
): ProvenanceCitation {

  const lScoreLabel =
    provenance.lScore > 0.8 ? "High confidence" :
    provenance.lScore > 0.5 ? "Moderate confidence" :
    "Low confidence";

  return {
    summary: `Based on ${provenance.sources.length} strategic document${provenance.sources.length > 1 ? 's' : ''}`,
    sources: provenance.sources.slice(0, 5).map(source => ({
      title: source.documentTitle,
      excerpt: truncate(source.paragraphText, 200),
      relevance: source.weight > 0.7 ? "Primary source" : "Supporting evidence",
      url: `/documents/${source.documentId}#paragraph-${source.paragraphId}`
    })),
    lScore: provenance.lScore,
    lScoreLabel: lScoreLabel
  };
}
```

### 6.4 Provenance Verification Workflow

#### 6.4.1 Human-in-the-Loop Validation

```typescript
/**
 * Allow users to verify or dispute provenance claims
 */
async function verifyProvenance(
  recommendationId: string,
  userId: string,
  verification: {
    isAccurate: boolean;
    feedback?: string;
    suggestedSources?: string[];       // Document IDs
  }
): Promise<void> {

  const provenance = await getProvenance(recommendationId);

  // Update verification status
  provenance.verifiedBy = userId;
  provenance.verificationFeedback = verification.feedback;

  if (!verification.isAccurate) {
    // Flag for review
    await flagProvenanceForReview(recommendationId, verification);

    // Update GNN learning signal (negative reinforcement)
    await updateGNNLearning(recommendationId, {
      signal: "incorrect-provenance",
      userFeedback: verification
    });
  } else {
    // Positive reinforcement
    await updateGNNLearning(recommendationId, {
      signal: "verified-provenance"
    });
  }

  await saveProvenance(provenance);
}
```

---

## 7. Alignment Score Computation

### 7.1 Pyramid-Level Alignment

The system computes alignment scores at every level of the Pyramid of Clarity:

```
Mission
  ↓ (Mission-to-Vision Alignment)
Vision
  ↓ (Vision-to-Objective Alignment)
Strategic Objectives
  ↓ (Objective-to-Goal Alignment)
Goals/OKRs
  ↓ (Goal-to-Portfolio Alignment)
Portfolios
  ↓ (Portfolio-to-Program Alignment)
Programs
  ↓ (Program-to-Project Alignment)
Projects
  ↓ (Project-to-Task Alignment)
Tasks
```

### 7.2 Alignment Score Formula

For adjacent pyramid levels $L_i$ and $L_{i+1}$:

$$
A(L_i, L_{i+1}) = \frac{1}{|L_{i+1}|} \sum_{n \in L_{i+1}} \max_{m \in L_i} S(n, m)
$$

Where:
- $L_i$ = set of nodes at level $i$
- $S(n, m)$ = similarity between node $n$ and node $m$ (semantic + graph + causal)
- The formula averages the "best match" for each child node

```typescript
/**
 * Compute alignment between two pyramid levels
 */
async function computeLevelAlignment(
  parentLevel: PyramidLevel,
  childLevel: PyramidLevel,
  hypergraph: StrategyHypergraph
): Promise<LevelAlignmentScore> {

  const parentNodes = Array.from(hypergraph.nodes.values())
    .filter(n => n.type === parentLevel);

  const childNodes = Array.from(hypergraph.nodes.values())
    .filter(n => n.type === childLevel);

  if (parentNodes.length === 0 || childNodes.length === 0) {
    return {
      parentLevel,
      childLevel,
      score: 0,
      alignedPairs: [],
      misalignedChildren: []
    };
  }

  const alignedPairs: AlignedPair[] = [];
  const misalignedChildren: string[] = [];

  let totalScore = 0;

  for (const child of childNodes) {
    // Find best matching parent
    let bestParent: StrategyNode | null = null;
    let bestScore = 0;

    for (const parent of parentNodes) {
      const score = await computeSimilarity(parent, child, hypergraph);
      if (score > bestScore) {
        bestScore = score;
        bestParent = parent;
      }
    }

    if (bestParent && bestScore > 0.4) {  // Minimum threshold
      alignedPairs.push({
        parentId: bestParent.id,
        childId: child.id,
        score: bestScore
      });
      totalScore += bestScore;
    } else {
      misalignedChildren.push(child.id);
    }
  }

  const avgScore = totalScore / childNodes.length;

  return {
    parentLevel,
    childLevel,
    score: avgScore,
    alignedPairs,
    misalignedChildren
  };
}

interface LevelAlignmentScore {
  parentLevel: PyramidLevel;
  childLevel: PyramidLevel;
  score: number;                       // 0.0-1.0
  alignedPairs: AlignedPair[];
  misalignedChildren: string[];        // Child nodes with no good parent match
}

interface AlignedPair {
  parentId: string;
  childId: string;
  score: number;
}
```

### 7.3 Team Alignment Score

```typescript
/**
 * Compute alignment score for a team/department
 */
async function computeTeamAlignment(
  teamId: string,
  hypergraph: StrategyHypergraph
): Promise<TeamAlignmentScore> {

  // Get all tasks/projects assigned to this team
  const teamNodes = await getTeamNodes(teamId, hypergraph);

  // Compute drift for each node
  const driftScores = await Promise.all(
    teamNodes.map(node => computeMissionDrift(node, hypergraph))
  );

  // Average drift score (invert to get alignment)
  const avgDrift = driftScores.reduce((sum, d) => sum + d.driftScore, 0) / driftScores.length;
  const alignmentScore = 1 - avgDrift;

  // Identify team's strategic themes (most connected objectives)
  const strategicThemes = await identifyStrategicThemes(teamNodes, hypergraph);

  return {
    teamId,
    score: alignmentScore,
    level: categorizeAlignment(alignmentScore),
    totalNodes: teamNodes.length,
    alignedNodes: driftScores.filter(d => d.driftLevel === "aligned").length,
    criticalDriftNodes: driftScores.filter(d => d.driftLevel === "critical-drift").length,
    strategicThemes: strategicThemes,
    recommendations: generateTeamRecommendations(alignmentScore, driftScores)
  };
}

interface TeamAlignmentScore {
  teamId: string;
  score: number;                       // 0.0-1.0
  level: "excellent" | "good" | "needs-improvement" | "critical";
  totalNodes: number;
  alignedNodes: number;
  criticalDriftNodes: number;
  strategicThemes: string[];           // Objective IDs
  recommendations: string[];
}

function categorizeAlignment(score: number): string {
  if (score >= 0.8) return "excellent";
  if (score >= 0.6) return "good";
  if (score >= 0.4) return "needs-improvement";
  return "critical";
}
```

### 7.4 Project Alignment Score

```typescript
/**
 * Compute alignment score for a specific project
 */
async function computeProjectAlignment(
  projectId: string,
  hypergraph: StrategyHypergraph
): Promise<ProjectAlignmentScore> {

  const projectNode = hypergraph.nodes.get(projectId);
  if (!projectNode || projectNode.type !== PyramidLevel.Project) {
    throw new Error("Invalid project node");
  }

  // Find connected strategic objectives
  const connectedObjectives = await findConnectedNodes(
    projectNode,
    PyramidLevel.Objective,
    hypergraph
  );

  // Find connected programs
  const connectedPrograms = await findConnectedNodes(
    projectNode,
    PyramidLevel.Program,
    hypergraph
  );

  // Compute drift from mission
  const missionDrift = await computeMissionDrift(projectNode, hypergraph);

  // Compute contribution score (how many objectives does this advance?)
  const contributionScore = connectedObjectives.length /
    Array.from(hypergraph.nodes.values())
      .filter(n => n.type === PyramidLevel.Objective).length;

  // Overall alignment
  const alignmentScore = (1 - missionDrift.driftScore) * 0.7 + contributionScore * 0.3;

  return {
    projectId,
    score: alignmentScore,
    missionDrift: missionDrift.driftScore,
    connectedObjectives: connectedObjectives.map(n => ({
      id: n.id,
      content: n.content,
      alignmentStrength: 0  // TODO: compute
    })),
    connectedPrograms: connectedPrograms.map(n => n.id),
    strategicValue: categorizeStrategicValue(alignmentScore),
    provenance: await computeLScore({
      id: `project-alignment-${projectId}`,
      content: `Project ${projectNode.content} has alignment score ${alignmentScore}`,
      involvedNodeIds: [projectId, ...connectedObjectives.map(n => n.id)]
    } as any, hypergraph)
  };
}

interface ProjectAlignmentScore {
  projectId: string;
  score: number;
  missionDrift: number;
  connectedObjectives: Array<{
    id: string;
    content: string;
    alignmentStrength: number;
  }>;
  connectedPrograms: string[];
  strategicValue: "high" | "medium" | "low" | "questionable";
  provenance: ProvenanceRecord;
}

function categorizeStrategicValue(score: number): string {
  if (score >= 0.8) return "high";
  if (score >= 0.6) return "medium";
  if (score >= 0.4) return "low";
  return "questionable";
}
```

### 7.5 Task Alignment Score

```typescript
/**
 * Compute alignment score for individual task
 */
async function computeTaskAlignment(
  taskId: string,
  hypergraph: StrategyHypergraph
): Promise<TaskAlignmentScore> {

  const taskNode = hypergraph.nodes.get(taskId);
  if (!taskNode || taskNode.type !== PyramidLevel.Task) {
    throw new Error("Invalid task node");
  }

  // Drift from mission
  const missionDrift = await computeMissionDrift(taskNode, hypergraph);

  // Find parent project
  const parentProject = await findParentNode(
    taskNode,
    PyramidLevel.Project,
    hypergraph
  );

  // Task alignment = inverse drift + parent project alignment
  const alignmentScore = 1 - missionDrift.driftScore;

  return {
    taskId,
    score: alignmentScore,
    driftLevel: missionDrift.driftLevel,
    parentProject: parentProject?.id,
    closestMission: missionDrift.closestMissionContent,
    recommendation: missionDrift.recommendation,
    shouldPrioritize: alignmentScore >= 0.7
  };
}

interface TaskAlignmentScore {
  taskId: string;
  score: number;
  driftLevel: "aligned" | "moderate-drift" | "critical-drift";
  parentProject?: string;
  closestMission: string;
  recommendation: string;
  shouldPrioritize: boolean;
}
```

---

## 8. Real-Time Monitoring Architecture

### 8.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Real-Time Monitoring System                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────────────┐    │
│  │  Event Stream    │────────▶│  Drift Detection Engine  │    │
│  │  (RabbitMQ)      │         │  (Min-Cut + Semantic)    │    │
│  └──────────────────┘         └──────────────────────────┘    │
│         │                                   │                  │
│         │                                   ▼                  │
│         │                     ┌──────────────────────────┐    │
│         │                     │  Alert Generation        │    │
│         │                     │  (Warning Rules Engine)  │    │
│         │                     └──────────────────────────┘    │
│         │                                   │                  │
│         ▼                                   ▼                  │
│  ┌──────────────────┐         ┌──────────────────────────┐    │
│  │  Metrics Store   │◀────────│  Dashboard WebSocket     │    │
│  │  (TimescaleDB)   │         │  (Real-time Push)        │    │
│  └──────────────────┘         └──────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Event-Driven Architecture

#### 8.2.1 Event Types

```typescript
enum StrategyEvent {
  DocumentUploaded = "document.uploaded",
  NodeCreated = "node.created",
  EdgeCreated = "edge.created",
  NodeUpdated = "node.updated",
  EdgeUpdated = "edge.updated",
  TopologyChanged = "topology.changed",
  DriftDetected = "drift.detected",
  MinCutUpdated = "mincut.updated"
}

interface StrategyEventMessage {
  eventType: StrategyEvent;
  organizationId: string;
  timestamp: string;
  payload: any;
  metadata: {
    userId?: string;
    source: string;
  };
}
```

#### 8.2.2 Event Handlers

```typescript
/**
 * Event-driven drift monitoring
 */
class DriftMonitoringEventHandler {

  constructor(
    private messageQueue: RabbitMQClient,
    private driftEngine: DriftDetectionEngine
  ) {
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {

    // When new nodes are created, recompute alignment
    this.messageQueue.subscribe(
      StrategyEvent.NodeCreated,
      async (event: StrategyEventMessage) => {
        await this.handleNodeCreated(event);
      }
    );

    // When edges change, recompute min-cut
    this.messageQueue.subscribe(
      StrategyEvent.EdgeUpdated,
      async (event: StrategyEventMessage) => {
        await this.handleEdgeUpdated(event);
      }
    );

    // When topology changes significantly, trigger full analysis
    this.messageQueue.subscribe(
      StrategyEvent.TopologyChanged,
      async (event: StrategyEventMessage) => {
        await this.handleTopologyChanged(event);
      }
    );
  }

  private async handleNodeCreated(event: StrategyEventMessage): Promise<void> {
    const { nodeId, nodeType } = event.payload;

    // If it's a task/project, immediately compute alignment
    if (nodeType === PyramidLevel.Task || nodeType === PyramidLevel.Project) {
      const alignment = await this.driftEngine.computeNodeAlignment(nodeId);

      // Publish alignment score for dashboard
      await this.messageQueue.publish({
        eventType: "alignment.computed",
        organizationId: event.organizationId,
        timestamp: new Date().toISOString(),
        payload: { nodeId, alignment }
      });

      // If critical drift, trigger alert
      if (alignment.driftLevel === "critical-drift") {
        await this.messageQueue.publish({
          eventType: StrategyEvent.DriftDetected,
          organizationId: event.organizationId,
          timestamp: new Date().toISOString(),
          payload: { nodeId, alignment }
        });
      }
    }
  }

  private async handleTopologyChanged(event: StrategyEventMessage): Promise<void> {
    const { organizationId } = event;

    // Trigger full min-cut recomputation
    const minCutResult = await this.driftEngine.computeMinCut(organizationId);

    // Store result
    await this.driftEngine.storeTopologySnapshot(organizationId, minCutResult);

    // Publish for dashboard
    await this.messageQueue.publish({
      eventType: StrategyEvent.MinCutUpdated,
      organizationId,
      timestamp: new Date().toISOString(),
      payload: { minCutResult }
    });
  }
}
```

### 8.3 Time-Series Metrics Storage

#### 8.3.1 TimescaleDB Schema

```sql
-- Time-series table for alignment metrics
CREATE TABLE alignment_metrics (
  time TIMESTAMPTZ NOT NULL,
  organization_id UUID NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  entity_id UUID,                    -- Node ID (optional, for entity-specific metrics)
  value FLOAT NOT NULL,
  metadata JSONB
);

SELECT create_hypertable('alignment_metrics', 'time');

CREATE INDEX idx_alignment_org_time ON alignment_metrics (organization_id, time DESC);
CREATE INDEX idx_alignment_type ON alignment_metrics (metric_type, time DESC);

-- Continuous aggregate for hourly averages
CREATE MATERIALIZED VIEW alignment_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS hour,
  organization_id,
  metric_type,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS sample_count
FROM alignment_metrics
GROUP BY hour, organization_id, metric_type;

-- Retention policy (keep raw data for 90 days)
SELECT add_retention_policy('alignment_metrics', INTERVAL '90 days');
```

#### 8.3.2 Metric Collection

```typescript
/**
 * Periodic metric collection service
 */
class MetricsCollectionService {

  private collectionInterval = 60000;  // Collect every 60 seconds

  async startCollection(organizationId: string): Promise<void> {

    setInterval(async () => {
      await this.collectMetrics(organizationId);
    }, this.collectionInterval);
  }

  private async collectMetrics(organizationId: string): Promise<void> {

    const timestamp = new Date();
    const hypergraph = await ruvector.loadHypergraph(organizationId);

    // Metric 1: Global alignment score
    const globalAlignment = await this.computeGlobalAlignment(hypergraph);
    await this.storeMetric(organizationId, "global_alignment", globalAlignment, timestamp);

    // Metric 2: Min-cut value
    const minCut = await this.computeMinCut(organizationId);
    await this.storeMetric(organizationId, "min_cut_value", minCut.minCutValue, timestamp);

    // Metric 3: Average task drift
    const avgTaskDrift = await this.computeAvgTaskDrift(hypergraph);
    await this.storeMetric(organizationId, "avg_task_drift", avgTaskDrift, timestamp);

    // Metric 4: Pyramid integrity
    const pyramidIntegrity = await this.computePyramidIntegrity(hypergraph);
    await this.storeMetric(organizationId, "pyramid_integrity", pyramidIntegrity, timestamp);

    // Per-team metrics
    const teams = await getTeams(organizationId);
    for (const team of teams) {
      const teamAlignment = await computeTeamAlignment(team.id, hypergraph);
      await this.storeMetric(
        organizationId,
        "team_alignment",
        teamAlignment.score,
        timestamp,
        { entityId: team.id }
      );
    }
  }

  private async storeMetric(
    organizationId: string,
    metricType: string,
    value: number,
    timestamp: Date,
    extra?: { entityId?: string; metadata?: any }
  ): Promise<void> {

    await db.query(`
      INSERT INTO alignment_metrics (time, organization_id, metric_type, entity_id, value, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [timestamp, organizationId, metricType, extra?.entityId, value, extra?.metadata || {}]);
  }
}
```

### 8.4 WebSocket Real-Time Updates

#### 8.4.1 WebSocket Server

```typescript
/**
 * WebSocket server for real-time dashboard updates
 */
class StrategyWebSocketServer {

  private wss: WebSocketServer;
  private subscriptions: Map<string, Set<WebSocket>>;

  constructor(private messageQueue: RabbitMQClient) {
    this.wss = new WebSocketServer({ port: 8080 });
    this.subscriptions = new Map();
    this.setupMessageQueueListeners();
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {

    this.wss.on('connection', (ws: WebSocket, req: any) => {

      ws.on('message', (message: string) => {
        const msg = JSON.parse(message);

        if (msg.type === 'subscribe') {
          this.subscribe(ws, msg.organizationId);
        }

        if (msg.type === 'unsubscribe') {
          this.unsubscribe(ws, msg.organizationId);
        }
      });

      ws.on('close', () => {
        this.removeAllSubscriptions(ws);
      });
    });
  }

  private subscribe(ws: WebSocket, organizationId: string): void {
    if (!this.subscriptions.has(organizationId)) {
      this.subscriptions.set(organizationId, new Set());
    }
    this.subscriptions.get(organizationId)!.add(ws);
  }

  private setupMessageQueueListeners(): void {

    // Listen for drift events
    this.messageQueue.subscribe(
      StrategyEvent.DriftDetected,
      (event: StrategyEventMessage) => {
        this.broadcast(event.organizationId, {
          type: 'drift-alert',
          payload: event.payload
        });
      }
    );

    // Listen for min-cut updates
    this.messageQueue.subscribe(
      StrategyEvent.MinCutUpdated,
      (event: StrategyEventMessage) => {
        this.broadcast(event.organizationId, {
          type: 'mincut-update',
          payload: event.payload
        });
      }
    );

    // Listen for alignment updates
    this.messageQueue.subscribe(
      "alignment.computed",
      (event: StrategyEventMessage) => {
        this.broadcast(event.organizationId, {
          type: 'alignment-update',
          payload: event.payload
        });
      }
    );
  }

  private broadcast(organizationId: string, message: any): void {
    const subscribers = this.subscriptions.get(organizationId);
    if (!subscribers) return;

    const messageStr = JSON.stringify(message);

    subscribers.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}
```

---

## 9. Alert Generation System

### 9.1 Alert Rules Engine

```typescript
interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (context: AlertContext) => boolean;
  severity: "info" | "warning" | "critical";
  notificationChannels: NotificationChannel[];
  cooldownPeriod: number;              // Seconds before same alert can fire again
}

interface AlertContext {
  organizationId: string;
  hypergraph: StrategyHypergraph;
  minCutResult: MinCutResult;
  driftAnalysis: DriftAnalysis[];
  teamAlignment: TeamAlignmentScore[];
  metrics: Map<string, number>;
}

enum NotificationChannel {
  Email = "email",
  Slack = "slack",
  InApp = "in-app",
  SMS = "sms"
}
```

### 9.2 Pre-Defined Alert Rules

```typescript
const ALERT_RULES: AlertRule[] = [

  // Rule 1: Critical Min-Cut
  {
    id: "critical-mincut",
    name: "Strategic Fragility Warning",
    description: "Minimum cut value has fallen below critical threshold",
    condition: (ctx) => ctx.minCutResult.minCutValue < 3.0,
    severity: "critical",
    notificationChannels: [NotificationChannel.Email, NotificationChannel.Slack],
    cooldownPeriod: 3600  // 1 hour
  },

  // Rule 2: High Team Drift
  {
    id: "team-drift-critical",
    name: "Team Alignment Critical",
    description: "One or more teams have critical alignment issues",
    condition: (ctx) => {
      return ctx.teamAlignment.some(team => team.level === "critical");
    },
    severity: "warning",
    notificationChannels: [NotificationChannel.Email, NotificationChannel.InApp],
    cooldownPeriod: 7200  // 2 hours
  },

  // Rule 3: Mission Drift Trend
  {
    id: "drift-trend-degrading",
    name: "Strategic Drift Increasing",
    description: "Organization-wide drift has been increasing for 7+ days",
    condition: (ctx) => {
      const trend = ctx.metrics.get("drift_trend_slope") || 0;
      return trend > 0.01;  // Positive slope = degrading
    },
    severity: "warning",
    notificationChannels: [NotificationChannel.Slack, NotificationChannel.InApp],
    cooldownPeriod: 86400  // 1 day
  },

  // Rule 4: Disconnected Components
  {
    id: "disconnected-components",
    name: "Strategy Graph Partitioned",
    description: "Organizational strategy has fractured into disconnected groups",
    condition: (ctx) => {
      return ctx.minCutResult.partitionA.length > 0 &&
             ctx.minCutResult.partitionB.length > 0;
    },
    severity: "critical",
    notificationChannels: [
      NotificationChannel.Email,
      NotificationChannel.Slack,
      NotificationChannel.SMS
    ],
    cooldownPeriod: 3600
  },

  // Rule 5: Low Pyramid Integrity
  {
    id: "low-pyramid-integrity",
    name: "Pyramid of Clarity Degraded",
    description: "Overall pyramid integrity below 60%",
    condition: (ctx) => {
      const integrity = ctx.metrics.get("pyramid_integrity") || 1.0;
      return integrity < 0.6;
    },
    severity: "warning",
    notificationChannels: [NotificationChannel.InApp],
    cooldownPeriod: 10800  // 3 hours
  }
];
```

### 9.3 Alert Execution Engine

```typescript
/**
 * Evaluates alert rules and triggers notifications
 */
class AlertExecutionEngine {

  private firedAlerts: Map<string, Date> = new Map();

  async evaluateRules(context: AlertContext): Promise<void> {

    for (const rule of ALERT_RULES) {

      // Check cooldown
      const lastFired = this.firedAlerts.get(rule.id);
      if (lastFired) {
        const secondsSinceFired = (Date.now() - lastFired.getTime()) / 1000;
        if (secondsSinceFired < rule.cooldownPeriod) {
          continue;  // Still in cooldown
        }
      }

      // Evaluate condition
      try {
        const shouldFire = rule.condition(context);

        if (shouldFire) {
          await this.fireAlert(rule, context);
          this.firedAlerts.set(rule.id, new Date());
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  private async fireAlert(
    rule: AlertRule,
    context: AlertContext
  ): Promise<void> {

    const alert: Alert = {
      id: generateUUID(),
      ruleId: rule.id,
      organizationId: context.organizationId,
      severity: rule.severity,
      title: rule.name,
      description: rule.description,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata: this.extractRelevantMetadata(rule, context)
    };

    // Store alert
    await this.storeAlert(alert);

    // Send notifications
    for (const channel of rule.notificationChannels) {
      await this.sendNotification(channel, alert, context);
    }
  }

  private async sendNotification(
    channel: NotificationChannel,
    alert: Alert,
    context: AlertContext
  ): Promise<void> {

    switch (channel) {
      case NotificationChannel.Email:
        await this.sendEmailNotification(alert, context);
        break;

      case NotificationChannel.Slack:
        await this.sendSlackNotification(alert, context);
        break;

      case NotificationChannel.InApp:
        await this.sendInAppNotification(alert, context);
        break;

      case NotificationChannel.SMS:
        await this.sendSMSNotification(alert, context);
        break;
    }
  }

  private async sendSlackNotification(
    alert: Alert,
    context: AlertContext
  ): Promise<void> {

    const color = alert.severity === "critical" ? "danger" : "warning";

    const message = {
      channel: "#strategic-alignment",
      attachments: [{
        color: color,
        title: `🚨 ${alert.title}`,
        text: alert.description,
        fields: [
          {
            title: "Organization",
            value: context.organizationId,
            short: true
          },
          {
            title: "Severity",
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: "Details",
            value: JSON.stringify(alert.metadata, null, 2)
          }
        ],
        footer: "PKA-STRAT Strategic Resonance Engine",
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    await slackClient.sendMessage(message);
  }
}

interface Alert {
  id: string;
  ruleId: string;
  organizationId: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata: any;
}
```

---

## 10. API Specifications

### 10.1 REST API Endpoints

#### 10.1.1 Document Ingestion

```typescript
/**
 * POST /api/v1/strategy/documents
 * Upload strategic document for hypergraph construction
 */
interface UploadDocumentRequest {
  file: File;                          // Multipart form data
  documentType: "mission" | "vision" | "objective" | "okr" | "project" | "other";
  metadata?: {
    title?: string;
    author?: string;
    department?: string;
    tags?: string[];
  };
}

interface UploadDocumentResponse {
  documentId: string;
  jobId: string;                       // For polling status
  status: "queued" | "processing";
  estimatedCompletion: string;         // ISO timestamp
}

/**
 * GET /api/v1/strategy/documents/{documentId}/status
 * Check processing status
 */
interface DocumentProcessingStatus {
  documentId: string;
  status: "queued" | "processing" | "complete" | "error";
  stage: "extraction" | "classification" | "embedding" | "graph-construction" | "complete";
  progress: number;                    // 0-100
  nodesCreated: number;
  edgesCreated: number;
  error?: string;
}
```

#### 10.1.2 Alignment Queries

```typescript
/**
 * GET /api/v1/strategy/alignment/global
 * Get organization-wide alignment metrics
 */
interface GlobalAlignmentResponse {
  organizationId: string;
  overallScore: number;                // 0.0-1.0
  level: "excellent" | "good" | "needs-improvement" | "critical";
  metrics: {
    avgTaskDrift: number;
    minCutValue: number;
    pyramidIntegrity: number;
    totalNodes: number;
    totalEdges: number;
  };
  breakdown: {
    byLevel: LevelAlignmentScore[];
    byTeam: TeamAlignmentScore[];
  };
  trends: {
    last7Days: number[];               // Daily scores
    last30Days: number[];
    projection30Days: number;
  };
}

/**
 * GET /api/v1/strategy/alignment/team/{teamId}
 * Get team-specific alignment
 */
interface TeamAlignmentResponse {
  team: TeamAlignmentScore;
  tasks: TaskAlignmentScore[];
  projects: ProjectAlignmentScore[];
  strategicThemes: Array<{
    objectiveId: string;
    content: string;
    relevance: number;
  }>;
  recommendations: string[];
}

/**
 * GET /api/v1/strategy/alignment/project/{projectId}
 * Get project alignment details
 */
interface ProjectAlignmentResponse {
  project: ProjectAlignmentScore;
  tasks: TaskAlignmentScore[];
  provenance: ProvenanceRecord;
  recommendations: string[];
}
```

#### 10.1.3 Drift Detection

```typescript
/**
 * GET /api/v1/strategy/drift
 * Get current drift status
 */
interface DriftStatusResponse {
  organizationId: string;
  globalDrift: number;                 // 0.0-1.0
  minCutValue: number;
  criticalNodes: Array<{
    nodeId: string;
    type: PyramidLevel;
    content: string;
    driftScore: number;
  }>;
  warnings: StrategicIntegrityWarning[];
  trends: {
    trend: "improving" | "stable" | "degrading";
    projectedDrift30Days: number;
  };
}

/**
 * GET /api/v1/strategy/drift/topology
 * Get topological analysis (min-cut details)
 */
interface TopologyAnalysisResponse {
  minCutResult: MinCutResult;
  bottlenecks: Array<{
    nodeId: string;
    content: string;
    bottleneckScore: number;
    recommendation: string;
  }>;
  graphMetrics: {
    nodeCount: number;
    edgeCount: number;
    avgDegree: number;
    diameter: number;
    clusteringCoefficient: number;
  };
}
```

#### 10.1.4 Provenance Tracking

```typescript
/**
 * GET /api/v1/strategy/provenance/{recommendationId}
 * Get provenance for a recommendation
 */
interface ProvenanceResponse {
  recommendation: {
    id: string;
    content: string;
    type: string;
  };
  provenance: ProvenanceRecord;
  citation: ProvenanceCitation;
}

/**
 * POST /api/v1/strategy/provenance/{recommendationId}/verify
 * Verify or dispute provenance
 */
interface VerifyProvenanceRequest {
  isAccurate: boolean;
  feedback?: string;
  suggestedSources?: string[];
}

interface VerifyProvenanceResponse {
  success: boolean;
  updatedLScore?: number;
}
```

#### 10.1.5 Alerts & Warnings

```typescript
/**
 * GET /api/v1/strategy/alerts
 * List active alerts
 */
interface AlertsListResponse {
  alerts: Alert[];
  total: number;
  unresolved: number;
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
}

/**
 * POST /api/v1/strategy/alerts/{alertId}/resolve
 * Mark alert as resolved
 */
interface ResolveAlertRequest {
  resolutionNotes: string;
}

interface ResolveAlertResponse {
  alert: Alert;
  success: boolean;
}
```

### 10.2 GraphQL Schema

```graphql
type Query {
  # Alignment queries
  globalAlignment(organizationId: ID!): GlobalAlignment!
  teamAlignment(teamId: ID!): TeamAlignment!
  projectAlignment(projectId: ID!): ProjectAlignment!
  taskAlignment(taskId: ID!): TaskAlignment!

  # Drift detection
  driftStatus(organizationId: ID!): DriftStatus!
  topologyAnalysis(organizationId: ID!): TopologyAnalysis!

  # Provenance
  provenance(recommendationId: ID!): Provenance!

  # Alerts
  alerts(organizationId: ID!, status: AlertStatus): [Alert!]!

  # Hypergraph exploration
  node(nodeId: ID!): StrategyNode
  connectedNodes(nodeId: ID!, levels: Int): [StrategyNode!]!
  shortestPath(fromId: ID!, toId: ID!): [StrategyNode!]!
}

type Mutation {
  # Document ingestion
  uploadDocument(input: UploadDocumentInput!): UploadDocumentResult!

  # Alert management
  resolveAlert(alertId: ID!, notes: String!): Alert!

  # Provenance verification
  verifyProvenance(input: VerifyProvenanceInput!): ProvenanceVerification!

  # Manual alignment override
  setNodeAlignment(nodeId: ID!, alignmentScore: Float!, reason: String!): StrategyNode!
}

type Subscription {
  # Real-time updates
  alignmentUpdated(organizationId: ID!): AlignmentUpdate!
  driftDetected(organizationId: ID!): DriftAlert!
  minCutChanged(organizationId: ID!): MinCutUpdate!
  alertCreated(organizationId: ID!): Alert!
}

# Types
type GlobalAlignment {
  organizationId: ID!
  overallScore: Float!
  level: AlignmentLevel!
  metrics: AlignmentMetrics!
  breakdown: AlignmentBreakdown!
  trends: AlignmentTrends!
}

type StrategyNode {
  id: ID!
  type: PyramidLevel!
  content: String!
  metadata: NodeMetadata!
  connectedNodes: [StrategyNode!]!
  alignmentScore: Float
  driftScore: Float
}

enum PyramidLevel {
  MISSION
  VISION
  OBJECTIVE
  GOAL
  PORTFOLIO
  PROGRAM
  PROJECT
  TASK
}

enum AlignmentLevel {
  EXCELLENT
  GOOD
  NEEDS_IMPROVEMENT
  CRITICAL
}

# ... additional types
```

### 10.3 WebSocket Protocol

```typescript
// Client → Server
interface WSClientMessage {
  type: "subscribe" | "unsubscribe" | "ping";
  organizationId?: string;
  subscriptions?: string[];            // Event types to subscribe to
}

// Server → Client
interface WSServerMessage {
  type: "drift-alert" | "alignment-update" | "mincut-update" | "pong";
  timestamp: string;
  payload: any;
}

// Example: Drift Alert
interface DriftAlertPayload {
  nodeId: string;
  driftScore: number;
  driftLevel: "aligned" | "moderate-drift" | "critical-drift";
  recommendation: string;
}

// Example: Alignment Update
interface AlignmentUpdatePayload {
  entityId: string;
  entityType: "team" | "project" | "task";
  score: number;
  previousScore: number;
  change: number;
}
```

---

## 11. Implementation Roadmap

### 11.1 Phase 1: Core Hypergraph Engine (Weeks 1-4)

**Objectives**:
- Implement basic hypergraph data structures
- Integrate Ruvector for semantic embeddings
- Build document parsing and entity extraction pipeline
- Create pyramid level classifier

**Deliverables**:
- PostgreSQL schema deployed
- Ruvector collection configured
- Document upload API functional
- Entity extraction working with >80% accuracy

**Success Metrics**:
- Successfully ingest 100+ test documents
- Create hypergraph with 500+ nodes
- Classification accuracy >75%

### 11.2 Phase 2: Min-Cut & Drift Detection (Weeks 5-8)

**Objectives**:
- Integrate ruvector-mincut algorithm
- Implement semantic distance calculations
- Build drift detection engine
- Create temporal tracking system

**Deliverables**:
- Min-cut computation service running
- Drift scores calculated for all tasks/projects
- Time-series metrics storage (TimescaleDB)
- Drift trend analysis functional

**Success Metrics**:
- Min-cut computation <500ms for 10K node graph
- Drift detection accuracy validated by domain experts
- Historical metrics retained for 90+ days

### 11.3 Phase 3: Provenance & Alignment (Weeks 9-12)

**Objectives**:
- Implement L-Score calculation
- Build alignment score computation for all pyramid levels
- Create provenance verification workflow
- Develop recommendation generation

**Deliverables**:
- L-Score computed for all recommendations
- Alignment scores at Team/Project/Task levels
- Provenance UI with source citations
- Human-in-the-loop verification system

**Success Metrics**:
- L-Score >0.7 for >80% of recommendations
- Alignment scores correlate with expert assessments (r>0.8)
- Provenance verification by users >90% accuracy

### 11.4 Phase 4: Real-Time Monitoring (Weeks 13-16)

**Objectives**:
- Deploy event-driven architecture (RabbitMQ)
- Build WebSocket server for real-time updates
- Implement alert rules engine
- Create notification system

**Deliverables**:
- Real-time dashboard with live updates
- Alert system sending notifications (Email/Slack)
- Metrics collection every 60 seconds
- Continuous aggregate queries for dashboards

**Success Metrics**:
- WebSocket latency <100ms
- Alert delivery within 60 seconds of trigger
- Dashboard handles 100+ concurrent users

### 11.5 Phase 5: GNN Learning & Optimization (Weeks 17-20)

**Objectives**:
- Implement T2 agent-supervised learning
- Train GNN to optimize edge weights
- Build self-healing topology system
- Create adaptive alignment scoring

**Deliverables**:
- GNN training pipeline
- Learned edge weights improving search relevance
- Automated topology optimization
- Adaptive thresholds for drift detection

**Success Metrics**:
- GNN improves alignment prediction accuracy by >15%
- Edge weight learning converges within 1000 iterations
- Self-healing reduces manual interventions by >50%

### 11.6 Phase 6: Dashboard & Visualization (Weeks 21-24)

**Objectives**:
- Build Strategic Alignment Map visualization
- Create Board-Level Report generator
- Implement drill-down analytics
- Deploy user-facing dashboards

**Deliverables**:
- Interactive hypergraph visualization
- Heat-map overlays on org chart
- Automated Board deck generation
- Role-specific dashboards (Leader/Manager/Member)

**Success Metrics**:
- Dashboard load time <2 seconds
- Board report generation <10 seconds
- User satisfaction score >4.0/5.0

---

## 12. Appendices

### 12.1 Glossary

| Term | Definition |
|------|------------|
| **Hypergraph** | Graph structure where edges can connect 3+ nodes simultaneously |
| **L-Score** | Lineage Score - metric measuring provenance confidence |
| **Min-Cut** | Minimum number of edges to remove to disconnect a graph |
| **Mission Drift** | Semantic/structural disconnection from strategic objectives |
| **Pyramid of Clarity** | Asana's hierarchical model: Mission → Vision → Objectives → Goals → Projects → Tasks |
| **Ruvector** | Semantic vector database with GNN optimization |
| **Strategic Distance** | Combined metric of semantic, graph, and hierarchical separation |
| **T2 Learning** | Agent-supervised tool adaptation (academic paradigm) |

### 12.2 References

1. **Asana Pyramid of Clarity**: https://asana.com/resources/pyramid-of-clarity
2. **Ruvector Documentation**: (Internal reference)
3. **ruvector-mincut**: El-Hayek, Henzinger, Li, "Deterministic Exact Fully-Dynamic Minimum Cut in Subpolynomial Time", SODA 2026
4. **Agentic Adaptation**: Jiang et al., "Adaptation of Agentic AI"
5. **Flow-GRPO**: AgentFlow paper (Internal reference)

### 12.3 Configuration Examples

#### Ruvector Collection Setup

```bash
# Create strategic hypergraph collection
ruvector create-collection \
  --name "strategic_hypergraph" \
  --dimension 1536 \
  --metric cosine \
  --enable-gnn true \
  --gnn-architecture SONA \
  --hyperedge-support true
```

#### Environment Variables

```bash
# Strategic Resonance Engine Configuration
RUVECTOR_API_URL=http://localhost:6333
POSTGRES_URL=postgresql://user:pass@localhost:5432/pka_strat
TIMESCALEDB_URL=postgresql://user:pass@localhost:5432/pka_metrics
RABBITMQ_URL=amqp://localhost:5672

# Min-Cut Configuration
MINCUT_THRESHOLD=3.0
MINCUT_UPDATE_INTERVAL=60000  # milliseconds

# Drift Detection
DRIFT_CRITICAL_THRESHOLD=0.6
DRIFT_WARNING_THRESHOLD=0.4

# GNN Learning
GNN_LEARNING_RATE=0.001
GNN_UPDATE_FREQUENCY=realtime  # or: hourly, daily
GNN_T2_ENABLED=true

# Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_FROM=noreply@pka-strat.com
```

### 12.4 Performance Benchmarks

**Target Performance** (for 10,000 node hypergraph):

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| Document Upload | <10s | Includes parsing, embedding, graph construction |
| Min-Cut Computation | <500ms | Using ruvector-mincut subpolynomial algorithm |
| Drift Score (single node) | <50ms | Cached embeddings |
| Alignment Score (team) | <200ms | Includes 50-100 task nodes |
| L-Score Calculation | <100ms | With provenance traversal |
| Real-time Update Latency | <100ms | WebSocket message delivery |
| Dashboard Load | <2s | Full page with visualizations |

### 12.5 Security Considerations

1. **Data Privacy**: All strategic documents contain sensitive information - implement row-level security in PostgreSQL
2. **Access Control**: Role-based access (RBAC) for Leaders/Managers/Members
3. **Audit Logging**: Track all alignment score computations and provenance verifications
4. **Encryption**: At-rest encryption for embeddings, in-transit encryption for API calls
5. **Rate Limiting**: Prevent abuse of expensive operations (min-cut, GNN training)

---

**END OF SPECIFICATION**

*This document represents the complete technical specification for the PKA-STRAT Strategic Resonance Engine. Implementation should follow the roadmap outlined in Section 11, with continuous validation against the success metrics defined for each phase.*
