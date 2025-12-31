# Cortexis RAG Chat System - Executive Summary

## Overview

The Cortexis RAG (Retrieval-Augmented Generation) Chat System is a sophisticated conversational AI platform that combines Ranger's Cognitive Knowledge Graph with pluggable LLM providers to deliver context-aware, source-attributed responses with continuous learning capabilities.

## Key Capabilities

### 1. Hybrid Search Intelligence
- **Semantic Vector Search**: HNSW-based similarity matching
- **Graph Traversal**: Relationship-aware context discovery
- **GNN Reranking**: Graph Neural Network-enhanced result ordering
- **Semantic Routing**: Intent-based execution strategy selection

### 2. Confidence & Attribution
- **Multi-Factor Confidence Scoring**: Source quality, diversity, cohesion, graph context, LLM certainty
- **Full Source Attribution**: Title, snippet, score, provenance, graph relationships
- **Confidence Levels**: LOW (<0.4), MEDIUM (0.4-0.7), HIGH (>0.7) with appropriate caveats

### 3. LLM Flexibility
- **Provider Abstraction**: Switch between OpenAI, Anthropic, local models without code changes
- **Streaming Support**: Real-time response generation for better UX
- **Token Management**: Tracking and optimization for cost control

### 4. Continuous Learning
- **SONA Integration**: Self-optimizing neural architecture for trajectory-based learning
- **Feedback Loops**: User ratings and corrections improve future responses
- **Pattern Recognition**: Discover and reuse successful reasoning strategies

### 5. Conversation Management
- **Session Persistence**: SQLite-backed conversation history
- **Multi-turn Context**: Sliding window with importance-based summarization
- **User Analytics**: Track engagement, preferences, learning progress

## Technical Architecture

```
Client Layer (Web, Mobile, CLI)
         ↓
API Layer (Chat Routes)
         ↓
Chat Service (Orchestration)
    ├─ Conversation DB
    ├─ Search Pipeline
    └─ LLM Integration
         ↓
Cognitive Knowledge Graph (Ranger)
    ├─ Vector Store (HNSW)
    ├─ Graph Store
    └─ SONA + GNN Learning
```

## Data Structures

### ChatMessage
```typescript
{
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: ChatSource[];      // For assistant messages
  confidence?: number;         // Overall confidence (0-1)
  searchTime?: number;         // Search latency
  generationTime?: number;     // LLM latency
  timestamp: Date;
  conversationId: string;
  trajectoryId?: number;       // SONA learning ID
  feedback?: ChatFeedback;     // User rating
}
```

### ChatSource
```typescript
{
  id: string;
  title: string;
  score: number;               // Vector similarity (0-1)
  snippet: string;             // Relevant excerpt
  gnnBoost: number;           // GNN reranking multiplier
  source?: string;            // URL/path
  type: 'vector' | 'graph' | 'hybrid';
  graphContext?: {
    nodeId: string;
    relatedNodeCount: number;
    pathDepth: number;
  };
}
```

### ConfidenceBreakdown
```typescript
{
  sourceQuality: number;       // Source relevance
  sourceDiversity: number;     // Multiple sources
  semanticCohesion: number;    // Consistency
  graphContext: number;        // Relationship support
  llmCertainty: number;        // Model confidence
  overall: number;             // Weighted average
}
```

## API Endpoints

### POST /chat
Send a message and receive RAG-enhanced response with sources and confidence.

**Request:**
```json
{
  "conversationId": "session-123",
  "message": "What is machine learning?",
  "temperature": 0.7,
  "searchDepth": "medium",
  "enableGNN": true,
  "stream": false
}
```

**Response:**
```json
{
  "messageId": "msg-456",
  "conversationId": "session-123",
  "text": "Machine learning is...",
  "sources": [
    {
      "id": "src-1",
      "title": "ML Foundations Paper",
      "score": 0.89,
      "snippet": "Machine learning is a subset of AI...",
      "gnnBoost": 1.0,
      "source": "arxiv.org/2101.00123"
    }
  ],
  "confidence": {
    "sourceQuality": 0.87,
    "sourceDiversity": 0.75,
    "semanticCohesion": 0.82,
    "graphContext": 0.68,
    "llmCertainty": 0.80,
    "overall": 0.78
  },
  "searchTime": 234,
  "generationTime": 1560,
  "totalTime": 1794,
  "model": "claude-3-5-sonnet-20241022",
  "timestamp": "2024-12-23T19:30:45.123Z"
}
```

### GET /chat/history
Retrieve conversation history with optional sources and feedback.

**Request:**
```
GET /chat/history?conversationId=session-123&limit=50&offset=0&includeSources=true
```

**Response:**
```json
{
  "conversationId": "session-123",
  "session": {
    "id": "session-123",
    "title": "Machine Learning Q&A",
    "createdAt": "2024-12-23T19:00:00Z",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.7,
    "searchDepth": "medium",
    "messageCount": 12,
    "totalSearchTime": 2800,
    "totalGenerationTime": 18700
  },
  "messages": [
    {
      "id": "msg-123",
      "role": "user",
      "content": "What is machine learning?",
      "timestamp": "2024-12-23T19:00:00Z"
    },
    {
      "id": "msg-124",
      "role": "assistant",
      "content": "Machine learning is...",
      "sources": [...],
      "confidence": 0.78,
      "searchTime": 234,
      "generationTime": 1560
    }
  ],
  "totalMessages": 12,
  "limit": 50,
  "offset": 0
}
```

## Search Pipeline

### Semantic Routing
Automatically determines optimal search strategy:
- **RETRIEVAL**: Simple document lookup (vector-only)
- **RELATIONAL**: Relationship exploration (vector + graph)
- **SYNTHESIS**: Multi-source summaries (vector + graph + GNN)
- **HYBRID**: Complex multi-intent queries (all components)

### Hybrid Search Execution
1. Generate query embedding
2. Vector similarity search (HNSW)
3. Optional graph traversal (2-3 hops)
4. Optional GNN reranking
5. Result fusion and scoring

### Confidence Calculation
```
Overall Confidence =
  0.30 × sourceQuality +
  0.20 × sourceDiversity +
  0.15 × semanticCohesion +
  0.20 × graphContext +
  0.15 × llmCertainty
```

## Conversation Persistence

### SQLite Schema
- **sessions**: Conversation metadata and configuration
- **messages**: User and assistant messages with metadata
- **sources**: Source attribution for each message
- **feedback**: User ratings and corrections
- **trajectories**: SONA learning trajectory records
- **trajectory_steps**: Learning steps within trajectories

All with proper foreign keys, indices, and ACID guarantees.

## LLM Integration

### Pluggable Providers
Implement `LLMProvider` interface to add custom LLM providers:

```typescript
interface LLMProvider {
  generate(params: GenerateParams): Promise<GenerateResult>;
  stream(params: GenerateParams): AsyncGenerator<string>;
  getMetadata(): LLMMetadata;
}
```

### Built-in Providers
- **Anthropic Claude**: Claude 3.5 Sonnet (200K context window)
- **OpenAI GPT**: GPT-4 Turbo (128K context window)
- **Local LLMs**: Ollama, LM Studio (via REST)

## SONA Learning Integration

### Trajectory-Based Learning
1. User initiates chat → SONA begins trajectory
2. Each message turn recorded with reward signal
3. User feedback updates reward signal
4. End of session → SONA learns patterns
5. Future queries benefit from learned patterns

### Reward Signals
- **Confidence Score**: Automatic (query quality)
- **User Feedback**: Explicit rating (good/neutral/bad)
- **Source Helpfulness**: Relative scoring of sources
- **Factuality Corrections**: Strong negative signal

### Continuous Improvement
- LoRA fine-tuning of model weights
- EWC++ prevents catastrophic forgetting
- ReasoningBank clusters successful patterns
- GNN improves with user interaction data

## Database Schema

### Core Tables
```sql
sessions           -- Conversation metadata
├─ id (PK)
├─ user_id, model, temperature
├─ search_depth, enable_gnn
├─ trajectory_id, message_count
└─ timestamps

messages           -- Chat messages
├─ id (PK)
├─ conversation_id (FK)
├─ role, content
├─ confidence, search_time_ms
└─ trajectory_id (FK)

sources            -- Source attribution
├─ id (PK)
├─ message_id (FK)
├─ title, score, snippet
├─ gnn_boost, source_type
└─ graph_node_id

feedback           -- User ratings
├─ id (PK)
├─ message_id (FK)
├─ rating, comment
├─ marked_as_factual
└─ corrected_content

trajectories       -- SONA learning
├─ id (PK)
├─ session_id (FK)
├─ status, quality
└─ step_count

trajectory_steps   -- Learning steps
├─ id (PK)
├─ trajectory_id (FK)
├─ step_number, reward
└─ message_id (FK)
```

## Configuration Example

```yaml
# .env
LLM_PROVIDER: anthropic
ANTHROPIC_API_KEY: sk-ant-...
LLM_MODEL: claude-3-5-sonnet-20241022

DATABASE_PATH: ./cortexis.db
VECTOR_DB_PATH: ./ruvector.db
GRAPH_DB_PATH: ./data

SEARCH_DEPTH: medium
ENABLE_GNN: true
ENABLE_GRAPH_TRAVERSAL: true
ENABLE_SONA: true

PORT: 3000
HOST: localhost
```

## Performance Characteristics

### Latency (Target)
- Search: <500ms (vector) + <200ms (graph)
- Generation: <5 seconds (Anthropic API)
- Total E2E: <10 seconds

### Throughput
- Single machine: ~100 concurrent sessions
- SQLite: ~1000 messages/second write (with WAL)
- Vector search: Sub-millisecond (HNSW)

### Storage
- SQLite: ~1KB per message + metadata
- RuVector: ~4-8 bytes per dimension
- Graph DB: ~500 bytes per node/edge

## Implementation Roadmap

### Phase 1: MVP (Weeks 1-3)
- Core chat service with SQLite persistence
- Hybrid search integration
- Basic LLM integration (Anthropic)
- Source attribution and confidence scoring

### Phase 2: Learning (Week 4)
- SONA trajectory integration
- Feedback recording
- Session quality assessment
- Pattern discovery

### Phase 3: API & Deployment (Week 5)
- REST endpoints
- WebSocket streaming
- Error handling
- Integration tests

### Phase 4: Optimization (Week 6)
- Performance profiling
- Caching strategies
- Monitoring/observability
- Documentation

## Design Principles

1. **Transparency**: Users understand where information comes from
2. **Confidence**: System expresses uncertainty appropriately
3. **Learning**: Every interaction improves future performance
4. **Flexibility**: Easy to adapt to different use cases
5. **Pragmatism**: MVP-first, scale as needed
6. **Quality**: High-fidelity responses with proper attribution

## Key Differentiators

- **Hybrid Search**: Vector + graph + GNN for rich context
- **Confidence Scoring**: Multi-factor approach with explainability
- **Source Attribution**: Full provenance with snippets
- **Continuous Learning**: SONA patterns improve over time
- **Flexible LLMs**: Switch providers based on needs
- **Conversation Memory**: Full history with feedback loops

## Deployment Options

### Single Machine (MVP)
- Express.js server + SQLite + RuVector.db
- Suitable for <100 concurrent users
- Zero external dependencies

### Distributed (Scaling)
- Load balancer + multiple chat servers
- PostgreSQL + read replicas
- Shared RuVector instance or replication
- Kubernetes-ready architecture

## Success Metrics

### Quality
- Confidence score > 0.7 for 75% of responses
- User satisfaction rating > 4.0/5.0
- Source helpfulness > 0.8 average

### Performance
- Search latency < 500ms (95th percentile)
- Generation latency < 5s (95th percentile)
- System uptime > 99.5%

### Learning
- Improvement in response quality over time
- Pattern recognition accuracy > 80%
- Successful knowledge transfer across queries

## Getting Started

1. **Setup Environment**
   ```bash
   npm install
   cp .env.example .env
   # Set ANTHROPIC_API_KEY and other configs
   ```

2. **Initialize Database**
   ```bash
   npm run db:init
   ```

3. **Start Server**
   ```bash
   npm run dev
   ```

4. **Test API**
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -d '{
       "conversationId": "test-1",
       "message": "What is machine learning?"
     }'
   ```

## Documentation

- **RAG_CHAT_SYSTEM_DESIGN.md**: Complete system design with all interfaces
- **RAG_CHAT_IMPLEMENTATION_REFERENCE.md**: Concrete code examples
- **RAG_CHAT_ARCHITECTURE.md**: Architecture patterns and design decisions

## Support & Contributions

This system is built on top of Ranger's Research Knowledge Manager and integrates with Claude-Flow for agent coordination. For questions or contributions:

1. Review the design documents
2. Check existing implementations
3. Test thoroughly before committing
4. Document any changes

---

**Version**: 1.0 (December 2024)
**Status**: Design Complete - Ready for Implementation
**Maintainer**: Cortexis Development Team
