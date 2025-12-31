# Cortexis RAG Chat System - Architecture & Design Decisions

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Client Layer (Frontend)                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │ Web Browser      │  │ Mobile App       │  │ CLI Tool         │     │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘     │
└───────────┼─────────────────────┼───────────────────────┼──────────────┘
            │                     │                       │
            └─────────────────────┼───────────────────────┘
                                  │ HTTP/REST + WebSocket
┌───────────────────────────────────┼───────────────────────────────────┐
│                        API Layer (Chat Routes)                        │
│  ┌───────────────────────────────────────────────────────────┐        │
│  │  Express/Hono Server                                      │        │
│  │  ├─ POST /chat          (Send message + get response)     │        │
│  │  ├─ GET /chat/history   (Retrieve conversation)          │        │
│  │  ├─ POST /chat/session  (Create new session)             │        │
│  │  ├─ POST /chat/feedback (Record user feedback)           │        │
│  │  └─ GET /health        (System status)                   │        │
│  └───────────────────────────────────────────────────────────┘        │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼─────────────┐   ┌─────────▼──────────┐   ┌──────────▼──────────┐
│  Chat Service Core  │   │  Conversation DB   │   │  Search Pipeline    │
├─────────────────────┤   ├────────────────────┤   ├─────────────────────┤
│ • Session mgmt      │   │ SQLite             │   │ • SemanticRouter    │
│ • Message routing   │   │ ├─ Sessions        │   │ • Hybrid search     │
│ • Response assembly │   │ ├─ Messages        │   │ • Source attr       │
│ • Confidence calc   │   │ ├─ Sources         │   │ • Context formatter │
│                     │   │ ├─ Feedback        │   │                     │
│                     │   │ └─ Trajectories    │   │                     │
└────────┬────────────┘   └────────────────────┘   └──────────┬──────────┘
         │                                                     │
         │                                                     │
         └────────────────────┬────────────────────────────────┘
                              │
┌─────────────────────────────┼─────────────────────────────────────────┐
│                    Cognitive Knowledge Graph (Ranger)                 │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  UnifiedMemory Facade                                           │  │
│  │  ├─ VectorStore (HNSW-based similarity search)                 │  │
│  │  ├─ GraphStore (Cypher-based graph traversal)                  │  │
│  │  └─ CognitiveEngine (SONA + GNN)                               │  │
│  └────────┬──────────────────────────┬──────────────────────┬──────┘  │
│           │                          │                      │          │
│    ┌──────▼──────┐         ┌─────────▼──────┐     ┌────────▼─────┐   │
│    │  RuVector   │         │ Knowledge Graph│     │ SONA Learning│   │
│    │  Vector DB  │         │ (property db)  │     │ + GNN Rerank │   │
│    │  (HNSW idx) │         │                │     │              │   │
│    └─────────────┘         └────────────────┘     └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                      │
         └────────────────────┼──────────────────────┘
                              │
┌─────────────────────────────┼──────────────────────────────────────────┐
│                         LLM Integration Layer                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ LLMProvider (Abstract Interface)                                 │ │
│  │  ├─ generate(params): Promise<GenerateResult>                  │ │
│  │  ├─ stream(params): AsyncGenerator<string>                     │ │
│  │  └─ getMetadata(): LLMMetadata                                 │ │
│  └────────┬────────────┬────────────────┬─────────────────────────┘ │
│           │            │                │                           │
│    ┌──────▼───┐   ┌────▼─────┐   ┌─────▼──────┐                     │
│    │OpenAI    │   │Anthropic │   │Local/Ollama│                     │
│    │(GPT-4)   │   │(Claude)  │   │(Mistral)   │                     │
│    └──────────┘   └──────────┘   └────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components & Design Decisions

### 1. Chat Service Architecture

#### Decision: Layered Service Pattern

**Why This Approach:**
- **Separation of Concerns**: Database, memory, LLM, and learning logic are isolated
- **Testability**: Each layer can be tested independently
- **Flexibility**: Easy to swap implementations (e.g., different LLM providers)
- **Scalability**: Layers can be distributed across different services

**Component Diagram:**
```
┌─────────────────────────────────────┐
│  ChatService (Orchestration Layer)  │
├─────────────────────────────────────┤
│ • Coordinates all layers             │
│ • Implements chat protocol           │
│ • Manages state transitions          │
└────────┬───────────┬───────┬────────┘
         │           │       │
    ┌────▼──┐  ┌─────▼───┐  └──────┐
    │ DB    │  │ Memory  │        │
    │Layer  │  │ Layer   │   LLM  │
    │       │  │         │   Layer│
    └───────┘  └─────────┘  └──────┘
```

### 2. Database Design

#### Decision: SQLite with Normalized Schema

**Why This Approach:**
- **ACID Guarantees**: Transactional consistency for chat history
- **Flexible Querying**: SQL allows complex conversation analytics
- **Local Deployment**: No external database dependency
- **Proven for RAG**: Standard for conversation management systems

**Schema Relationships:**
```
┌──────────────────┐
│    sessions      │  (conversation metadata)
├──────────────────┤
│ id (PK)          │
│ title            │
│ created_at       │
│ model            │
│ trajectory_id    │ ──┐
└──────────────────┘   │
        ▲               │
        │               │ 1:N
        │ 1:N           │
        │               ▼
        │         ┌──────────────────┐
        │         │  trajectories    │  (SONA learning)
        │         ├──────────────────┤
        │         │ id (PK)          │
        │         │ session_id (FK)  │
        │         │ status           │
        │         │ quality          │
        │         └──────────────────┘
        │
    ┌───┴──────────┐
    │              │
    ▼              ▼
┌─────────────┐  ┌──────────────────┐
│  messages   │  │  sources (FK)    │  (attribution)
├─────────────┤  ├──────────────────┤
│ id (PK)     │  │ id (PK)          │
│ role        │  │ message_id (FK)  │
│ content     │  │ title            │
│ confidence  │  │ score            │
└──────┬──────┘  └──────────────────┘
       │
       │ 1:1
       │
       ▼
┌──────────────────┐
│  feedback        │  (user ratings)
├──────────────────┤
│ id (PK)          │
│ message_id (FK)  │
│ rating           │
│ comment          │
└──────────────────┘
```

### 3. Search Pipeline Design

#### Decision: Semantic Routing → Hybrid Search

**Why This Approach:**
```
Graph Query                Vector-Only Query
     ↑                              ↑
     │                              │
  ┌──┴──────────────────────────────┴───┐
  │  SemanticRouter Intent Detection    │
  │  (Query complexity analysis)        │
  └──────────┬─────────────────┬────────┘
             │                 │
        ┌────▼─────┐      ┌────▼─────┐
        │ RELATIONAL│      │ RETRIEVAL │
        │ SYNTHESIS │      │ SIMPLE    │
        │ HYBRID    │      │           │
        └────┬──────┘      └────┬──────┘
             │                  │
    ┌────────▼──────────────────▼──────────┐
    │  UnifiedMemory.search()              │
    │  1. Vector search (HNSW)             │
    │  2. Graph traversal (optional)       │
    │  3. GNN reranking (optional)         │
    │  4. Result fusion                    │
    └────────┬─────────────────────────────┘
             │
    ┌────────▼──────────────────────────┐
    │  Source Attribution                │
    │  1. Snippet extraction             │
    │  2. Confidence calculation         │
    │  3. Provenance tracking            │
    └────────┬──────────────────────────┘
             │
    ┌────────▼──────────────────────────┐
    │  Context Formatting                │
    │  (for LLM input)                   │
    └────────────────────────────────────┘
```

**Routing Strategy Decision Table:**

| Query Type | Route | Vector | Graph | GNN | k | Use Case |
|-----------|-------|--------|-------|-----|---|----------|
| "Find X" | RETRIEVAL | Yes | No | No | 5-6 | Direct lookup, simple facts |
| "How does X relate to Y?" | RELATIONAL | Yes | Yes (2-3 hops) | Yes | 10-15 | Relationship exploration |
| "Summarize X" | SYNTHESIS | Yes | Yes | Yes | 15-20 | Comprehensive synthesis |
| Complex multi-part | HYBRID | Yes | Yes | Yes | 10-12 | Mixed intent queries |

### 4. Confidence Scoring

#### Decision: Multi-Factor Weighted Approach

**Why This Approach:**
- **Transparent**: Users see breakdown of confidence factors
- **Holistic**: Considers multiple signals (sources, diversity, graph context)
- **Actionable**: Guides both response generation and presentation

**Scoring Pipeline:**
```
Sources: [src1, src2, ...]
    │
    ├─► Source Quality Score (vector similarity)
    │   └─► avg(scores) = 0.82
    │
    ├─► Source Diversity Score (how many sources)
    │   └─► sqrt(count)/sqrt(10) = 0.63
    │
    ├─► Semantic Cohesion (variance of scores)
    │   └─► exp(-variance) = 0.71
    │
    ├─► Graph Context (GNN boost + relationships)
    │   └─► connectivity_score = 0.58
    │
    └─► LLM Certainty (model confidence signal)
        └─► heuristic from response = 0.75

Final Score = 0.30*0.82 + 0.20*0.63 + 0.15*0.71 + 0.20*0.58 + 0.15*0.75
           = 0.246 + 0.126 + 0.107 + 0.116 + 0.113
           = 0.708 (MEDIUM-HIGH confidence)
```

**Confidence Level Guidelines:**
```
Confidence Score    Level    Treatment
─────────────────────────────────────────────────
< 0.40              LOW      Heavy caveats, acknowledge limitations
0.40 - 0.70         MEDIUM   Standard with some uncertainty notes
> 0.70              HIGH     Strong presentation with confidence
```

### 5. LLM Provider Abstraction

#### Decision: Pluggable Provider Pattern

**Why This Approach:**
- **Vendor Independence**: Switch providers without code changes
- **Cost Optimization**: Mix models for different use cases
- **Resilience**: Fallback chains in case of provider issues
- **Testing**: Mock providers for unit tests

**Provider Interface:**
```typescript
interface LLMProvider {
  // Core generation
  generate(params): Promise<GenerateResult>

  // Streaming for real-time response
  stream(params): AsyncGenerator<string>

  // Metadata for routing decisions
  getMetadata(): LLMMetadata
}
```

**Provider Selection Strategy:**
```
┌──────────────────────────────┐
│ Session Configuration        │
│ {model: 'anthropic', ...}    │
└────────┬─────────────────────┘
         │
    ┌────▼─────────────────────────┐
    │ LLMProviderFactory            │
    │ .createProvider(config)       │
    └────┬────────┬────────┬────────┘
         │        │        │
    ┌────▼┐   ┌───▼──┐  ┌──▼────┐
    │OpenAI│   │Claude│  │ Local │
    └──────┘   └──────┘  └───────┘
```

### 6. SONA Learning Integration

#### Decision: Trajectory-Based Learning from Chat Interactions

**Why This Approach:**
- **Continuous Improvement**: System learns from every conversation
- **Feedback Loop**: User feedback directly improves future responses
- **Pattern Recognition**: SONA identifies successful strategies
- **Adaptive**: GNN reranking improves over time

**Learning Flow:**
```
┌─────────────────────────────────────────────────────────┐
│  Chat Session Start                                     │
│  └─► ChatLearningManager.startLearning()              │
│      └─► UnifiedMemory.beginTrajectory()              │
│          └─► SONA Engine creates trajectory           │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴──────────┐
         │                      │
    Per Message Turn:      End of Session:
    ┌──────────────────┐  ┌──────────────────┐
    │ recordTurn()     │  │ endLearning()    │
    │ ├─ search       │  │ ├─ quality calc  │
    │ ├─ generation   │  │ ├─ patterns save │
    │ └─ reward       │  │ └─ update SONA   │
    └────────┬────────┘  └────────┬─────────┘
             │                    │
             └────────┬───────────┘
                      │
              ┌───────▼─────────┐
              │ SONA Learning   │
              │ ├─ LoRA adaption│
              │ ├─ EWC++        │
              │ └─ ReasoningBank│
              └─────────────────┘
```

**Reward Signal Sources:**
```
Message Quality
      ├─► Confidence score (automatic)
      ├─► User feedback rating (explicit)
      │   ├─► "Good" → +1.0
      │   ├─► "Neutral" → +0.5
      │   └─► "Bad" → -0.5
      │
      ├─► Source helpfulness (relative)
      │   └─► weighted adjustment
      │
      └─► Factuality corrections
          └─► strong negative signal
```

---

## Data Flow Examples

### Example 1: Simple Retrieval Query

```
User: "What is quantum entanglement?"
│
├─► SemanticRouter
│   └─► Detects: RETRIEVAL intent (confidence: 0.85)
│       └─► Route: Vector-only search, k=6
│
├─► UnifiedMemory.search()
│   └─► HNSW search (no graph traversal)
│       └─► Results: [quantum_paper1, quantum_article2, ...]
│
├─► Source Attribution
│   └─► Extract snippets & calculate confidence
│       └─► Confidence: 0.76 (HIGH)
│
├─► LLM Generation
│   System: "You are a physics expert..."
│   Context: [formatted results]
│   Query: "What is quantum entanglement?"
│   └─► Response: "Quantum entanglement is a phenomenon..."
│
├─► SONA Recording (if learning enabled)
│   └─► recordTurn(
│       "Q: What is quantum entanglement?",
│       sources: [2 sources],
│       confidence: 0.76
│     )
│
└─► Response Sent
    {
      text: "Quantum entanglement is...",
      sources: [{id, title, score: 0.89, ...}, ...],
      confidence: {overall: 0.76, ...},
      searchTime: 145ms,
      generationTime: 1240ms
    }
```

### Example 2: Complex Relational Query

```
User: "How do machine learning and neural networks relate, and what innovations did they enable?"
│
├─► SemanticRouter
│   └─► Detects: HYBRID intent
│       Components:
│       - RELATIONAL: "how do...relate" (0.72)
│       - SYNTHESIS: "innovations" (0.68)
│       └─► Route: Hybrid (vector + graph + GNN)
│
├─► UnifiedMemory.search()
│   ├─► Vector search (k=12)
│   │   └─► Top results: [ml_papers, nn_papers, ...]
│   │
│   ├─► Graph traversal (depth=2)
│   │   └─► Follow RELATES_TO, DERIVED_FROM edges
│   │       └─► Related: [optimization_papers, application_papers, ...]
│   │
│   └─► GNN reranking
│       └─► Reorder by graph context
│           └─► Final results: [most_contextually_relevant, ...]
│
├─► Source Attribution
│   └─► Multiple sources: 15 total
│       └─► Confidence: 0.82 (HIGH due to diversity + graph context)
│
├─► LLM Generation (with extended context)
│   System: "Provide comprehensive analysis with citations..."
│   Context: [15 formatted results + graph relationships]
│   Query: "How do ML and neural networks relate..."
│   └─► Response: "Machine learning and neural networks..."
│
├─► SONA Recording
│   └─► recordTurn(
│       "Complex relational+synthesis query",
│       sources: [15 sources],
│       graphContext: {nodes: 12, edges: 8},
│       confidence: 0.82
│     )
│
└─► Response
    {
      text: "ML and NN are interconnected...",
      sources: [15 attributed items with relationships],
      confidence: {
        sourceQuality: 0.84,
        sourceDiversity: 0.91,
        graphContext: 0.78,
        overall: 0.82
      },
      searchTime: 287ms,
      generationTime: 2140ms
    }
```

---

## Design Trade-offs

### 1. SQLite vs. PostgreSQL

| Aspect | SQLite | PostgreSQL |
|--------|--------|-----------|
| Deployment | Embedded, no server | Requires server |
| Scale | Single-machine ✓ | Multi-machine ✓ |
| Features | Basic ✓ | Advanced (JSON, etc) ✓ |
| Cost | Free | Free/Managed |
| **Choice** | **SQLite for Cortexis MVP** | Consider for scaling |

**Rationale**: SQLite provides sufficient functionality for MVP with zero deployment overhead. Migration to PostgreSQL is straightforward when needed.

### 2. Vector Store: HNSW vs. Alternatives

| Approach | HNSW (Ranger) | Pinecone API | Milvus |
|----------|--------------|------------|--------|
| Performance | Fast ✓ | Moderate | Fast |
| Storage | Local ✓ | Managed | Self-hosted |
| Cost | Free ✓ | $ per use | Free |
| Control | Full ✓ | Limited | Full |
| **Choice** | **HNSW (Ranger)** | | |

**Rationale**: Ranger already provides optimized HNSW with GPU acceleration (when available). Leveraging existing infrastructure is pragmatic.

### 3. Confidence Scoring: Simple vs. Complex

| Model | Simple Avg | Multi-Factor | ML Model |
|-------|-----------|-------------|----------|
| Complexity | Low | Medium | High |
| Interpretability | High ✓ | High ✓ | Low |
| Adaptability | Limited | Good ✓ | Excellent |
| Cost | Minimal ✓ | Minimal ✓ | Moderate |
| **Choice** | **Multi-Factor** | | |

**Rationale**: Multi-factor approach provides explainability (important for RAG systems) while maintaining simplicity. Can be upgraded to ML model later without breaking changes.

### 4. SONA Integration: Full vs. Optional

| Approach | Integrated | Optional Module |
|----------|-----------|-----------------|
| Learning | Automatic | On-demand |
| Complexity | Higher | Lower |
| Value | Continuous improvement | Explicit feedback |
| **Choice** | **Integrated (with option)** | |

**Rationale**: SONA provides continuous learning without extra effort. Can be disabled for privacy-sensitive deployments.

---

## Scalability Considerations

### Current Architecture Limits
- **SQLite**: Single-machine writes (~100 concurrent)
- **HNSW**: Local memory (scales with disk space)
- **Graph DB**: In-memory subset (scales with memory)

### Scaling Strategy

#### Phase 1 (MVP): Single Machine
```
┌─────────────┐
│ Chat Server │
└─────┬───────┘
      │
  ┌───┴──────────┐
  │              │
┌─▼────┐    ┌────▼──┐
│SQLite│    │RuVector│
└──────┘    └────────┘
```

#### Phase 2: Distributed Read Replicas
```
┌──────────────────┐
│  Load Balancer   │
├──────────────────┤
│ Primary | Replicas
└──────────────────┘
         │
    ┌────┴─────┬──────┐
    │           │      │
  ┌─▼──┐   ┌──▼──┐  ┌─▼──┐
  │Chat1│   │Chat2│  │Chat3│
  └──┬──┘   └──┬──┘  └──┬──┘
     │         │        │
  ┌──▼─────────▼────────▼──┐
  │   PostgreSQL (Primary)   │
  │  + Read Replicas        │
  └─────────────────────────┘
```

#### Phase 3: Microservices
```
┌──────────────────────────────────────┐
│  API Gateway                         │
├──────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐         │
│  │Chat Svc  │  │Search Svc│  ...   │
│  └────┬─────┘  └────┬─────┘         │
└───────┼─────────────┼───────────────┘
        │             │
    ┌───┴────┐    ┌───┴─────────┐
    │         │    │             │
  ┌─▼──┐  ┌──▼─┐ ┌▼──┐  ┌──────▼─┐
  │PgSQL│  │Cache│ │Vector│  │Graph Cluster│
  └─────┘  └────┘  │DB   │  └──────────┘
                   └─────┘
```

---

## Security Considerations

### Data Protection
- **SQLite Encryption**: Consider SQLCipher for encrypted database
- **API Authentication**: JWT tokens or API keys (not shown in this doc)
- **Rate Limiting**: Prevent abuse of chat API
- **Input Validation**: Sanitize all user inputs

### Privacy
- **User Data**: GDPR compliance (right to be forgotten)
- **Chat History**: Option to disable history storage
- **LLM API Keys**: Secure key management (use environment variables)
- **SONA Learning**: Option to disable learning from conversations

### Auditability
- **Message Logging**: Audit trail of all interactions
- **Feedback Tracking**: Record source helpfulness ratings
- **Model Tracking**: Document which LLM version was used
- **Error Logging**: Capture and monitor errors

---

## Monitoring & Observability

### Key Metrics
```
Performance:
  - Search latency (target: <500ms)
  - Generation latency (target: <5s)
  - Total E2E latency (target: <10s)

Quality:
  - Confidence distribution
  - User feedback ratings
  - Source helpfulness scores
  - Hallucination detection

Usage:
  - Messages per day
  - Search depth distribution
  - Active sessions
  - User retention
```

### Monitoring Implementation
```typescript
// Example instrumentation
async function chat(request: ChatRequest): Promise<ChatResponse> {
  const timer = metrics.startTimer('chat_request');

  try {
    const searchTimer = metrics.startTimer('search_time');
    // ... search logic
    metrics.recordTime('search_time', searchTimer.end());

    const genTimer = metrics.startTimer('generation_time');
    // ... generation logic
    metrics.recordTime('generation_time', genTimer.end());

    metrics.recordCounter('chat_success', 1);
    metrics.recordGauge('confidence', response.confidence.overall);

    return response;
  } catch (error) {
    metrics.recordCounter('chat_error', 1);
    throw error;
  } finally {
    metrics.recordTime('chat_request', timer.end());
  }
}
```

---

## Future Enhancement Roadmap

### Short Term (Q1 2025)
- [ ] Multi-turn context management
- [ ] Streaming response UI
- [ ] Basic analytics dashboard
- [ ] Citation formatting (APA/MLA)

### Medium Term (Q2 2025)
- [ ] Conversation branching ("what if" scenarios)
- [ ] Real-time collaboration (multi-user)
- [ ] Fact-checking integration
- [ ] Prompt injection detection

### Long Term (Q3-Q4 2025)
- [ ] Distributed architecture (Kubernetes)
- [ ] Custom knowledge base ingestion
- [ ] Advanced SONA patterns visualization
- [ ] Voice input/output support
- [ ] Knowledge synthesis and gap detection

---

## Conclusion

The Cortexis RAG Chat System design prioritizes:

1. **Simplicity**: Leverage existing Ranger infrastructure
2. **Extensibility**: Pluggable components (LLMs, search strategies)
3. **Transparency**: Confidence scoring and source attribution
4. **Learning**: Continuous improvement through SONA
5. **Pragmatism**: MVP-first approach with clear scaling path

The architecture is production-ready for single-machine deployment and has clear upgrade paths for distributed systems as demand scales.

---

**Document Version**: 1.0
**Date**: December 2024
**Architecture Status**: Final Design Approved
