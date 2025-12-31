# PKA-Relate Data Model Design Document

## Executive Summary

This document describes the complete data model architecture for **PKA-Relate**, a personal relationship and knowledge management application. The data models are adapted from **PKA-STRAT** (strategic alignment platform) to support individual relationship tracking, personal growth, and knowledge organization.

**Key Design Principles:**
1. **Single-user architecture** with optional multi-device sync
2. **Graph-based knowledge organization** replacing hierarchical pyramid
3. **Vector embeddings** for semantic search and alignment scoring
4. **Value-driven alignment** tracking personal growth against core values
5. **Privacy-first** with on-device processing option

---

## Architecture Overview

### Conceptual Model

```
┌────────────────────────────────────────────────────────────────┐
│                         PKA-Relate                             │
│                    Personal Relationship PKA                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐      ┌──────────────┐      ┌─────────────┐ │
│  │   User       │──────│ Psych Profile│──────│ Core Values │ │
│  │   Identity   │      │              │      │  (Mission)  │ │
│  └──────────────┘      └──────────────┘      └─────────────┘ │
│         │                      │                      │        │
│         ├──────────────────────┼──────────────────────┤        │
│         │                      │                      │        │
│  ┌──────▼──────┐      ┌────────▼──────┐      ┌───────▼─────┐ │
│  │ Focus Areas │◄─────│  Interactions │◄─────│ SubSystems  │ │
│  │  (Goals)    │      │  (Activity)   │      │ (Knowledge) │ │
│  └─────────────┘      └───────────────┘      └─────────────┘ │
│         │                      │                      │        │
│         └──────────────────────┼──────────────────────┘        │
│                                │                               │
│                      ┌─────────▼─────────┐                     │
│                      │  Graph + Memory   │                     │
│                      │  (Unified Search) │                     │
│                      └───────────────────┘                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Entity Adaptations from PKA-STRAT

### 1. Pyramid → SubSystem Transformation

**PKA-STRAT (Hierarchical):**
```
Mission
  ↓
Vision
  ↓
Objectives
  ↓
Goals
  ↓
Portfolios
  ↓
Programs
  ↓
Projects
  ↓
Tasks
```

**PKA-Relate (Graph-Based):**
```
Core Values (Mission/Vision)
    ↓
SubSystems (Knowledge Domains)
    ├─ General
    ├─ Dating
    ├─ Masculinity
    ├─ Femininity
    ├─ Management
    └─ [User-Created]
        ↓
    ContentItems (Knowledge Base)
```

**Key Differences:**
- **Flat hierarchy**: Core Values → SubSystems → Content (3 levels vs. 8)
- **Graph connections**: SubSystems can link to each other freely
- **User-defined domains**: No prescribed structure beyond defaults
- **Lightweight**: Optimized for mobile, not enterprise org charts

### 2. AlignmentScore → GrowthMetrics Transformation

**PKA-STRAT AlignmentScore:**
```typescript
interface AlignmentScore {
  itemId: UUID;
  level: PyramidLevel;
  score: number; // Alignment to mission
  components: {
    documentAlignment: number;
    hierarchyAlignment: number;
    stakeholderAlignment: number;
  };
}
```

**PKA-Relate GrowthMetrics:**
```typescript
interface RelationshipMetrics {
  person: string;
  quality_score: number; // Relationship quality
  components: {
    positive_frequency: number;
    emotional_connection: number;
    communication_quality: number;
    value_alignment: number;
  };
}

interface FocusAreaProgress {
  focus_area_id: UUID;
  progress_score: number; // Personal growth
}
```

**Key Adaptations:**
- **Relationship quality** replaces organizational alignment
- **Personal growth** replaces strategic alignment
- **Value alignment** replaces mission alignment
- **Emotional metrics** added for relationship context

### 3. DriftAlert → RelationshipInsight Transformation

**PKA-STRAT DriftAlert:**
```typescript
interface DriftAlert {
  severity: "critical" | "high" | "medium" | "low";
  driftScore: number; // Divergence from mission
  recommendations: string[];
}
```

**PKA-Relate RelationshipInsight:**
```typescript
interface RelationshipInsight {
  severity: "critical" | "high" | "medium" | "low";
  type: "drift" | "opportunity" | "pattern" | "milestone";
  recommendations: string[];
}
```

**Key Adaptations:**
- **Multiple insight types** beyond just drift
- **Positive insights** (opportunities, milestones) added
- **Pattern detection** for recurring behaviors
- **Proactive suggestions** for relationship improvement

### 4. ProvenanceChain → ValueAlignment Transformation

**PKA-STRAT ProvenanceChain:**
```typescript
// Tracks document → chunk → pyramid item → mission
interface ProvenanceChain {
  sources: DocumentChunk[];
  ancestorScores: AlignmentScore[];
  lScore: number; // Loyalty to mission
}
```

**PKA-Relate ValueAlignment:**
```typescript
// Tracks interaction → core value alignment
interface ValueAlignment {
  interaction_id: UUID;
  value_id: UUID;
  alignment_score: number; // How well action reflects value
  is_positive: boolean; // Living the value vs. violating it
}
```

**Key Adaptations:**
- **Action-value alignment** replaces document-mission alignment
- **Behavioral tracking** instead of document provenance
- **Positive/negative** distinction for learning
- **Personal integrity** vs. organizational strategy

---

## Core Entities Deep Dive

### User & Authentication

**Entity:** `User`
- **Purpose:** Single-user account with optional multi-device sync
- **Key Features:**
  - JWT-based authentication
  - Optional device sync with encrypted tokens
  - Privacy-first (can disable cloud sync)

**Entity:** `UserSession`
- **Purpose:** Session management for multiple devices
- **Key Features:**
  - Device fingerprinting
  - Automatic session expiration
  - Refresh token rotation

### Psychological Profile

**Entity:** `PsychologicalProfile`
- **Purpose:** Self-awareness framework for personal growth
- **Inspired By:** User entity in PKA-STRAT
- **Key Features:**
  - Attachment theory classification
  - Communication style assessment
  - Conflict pattern recognition
  - Completeness tracking for onboarding

**Design Rationale:**
- **Evidence-based:** Uses established psychological frameworks
- **Progressive disclosure:** Can be filled in over time
- **Learning-oriented:** Traits evolve with user insights

### Core Values

**Entity:** `CoreValue`
- **Purpose:** Personal mission/vision statements
- **Adapted From:** PyramidEntity at Mission/Vision levels
- **Key Features:**
  - Hierarchical categories (Primary/Secondary/Aspirational)
  - Vector embeddings for semantic alignment
  - Reference counting for usage tracking

**Design Rationale:**
- **Value-driven decision making:** Core to alignment scoring
- **Semantic search:** Find content aligned with values
- **Growth tracking:** Monitor alignment improvement over time

### SubSystems (Knowledge Graph)

**Entity:** `SubSystem`
- **Purpose:** Personal knowledge domains (replaces Pyramid)
- **Adapted From:** PyramidEntity
- **Key Features:**
  - Graph-based connections (not hierarchical)
  - Visual representation (icon, color, position)
  - Default seeded systems (General, Dating, etc.)

**Entity:** `SystemLink`
- **Purpose:** Connections between knowledge domains
- **Adapted From:** PyramidLink
- **Key Features:**
  - Bidirectional relationships
  - Weighted strength
  - Shared content tracking

**Design Rationale:**
- **Flexible organization:** No rigid structure
- **Natural relationships:** Knowledge domains interconnect naturally
- **Visual learning:** Graph visualization aids understanding

### Content Items

**Entity:** `ContentItem`
- **Purpose:** Knowledge base entries (notes, articles, books, etc.)
- **Adapted From:** DocumentChunk
- **Key Features:**
  - Multiple content types
  - Cross-system linking
  - Personal annotations
  - Semantic embeddings

**Design Rationale:**
- **RAG-ready:** Vector embeddings for AI chat
- **Rich metadata:** Author, source, highlights
- **Personal context:** Notes and reflections

### Interactions

**Entity:** `Interaction`
- **Purpose:** Relationship event tracking
- **New Entity:** No direct PKA-STRAT equivalent
- **Key Features:**
  - Type classification
  - Outcome tracking
  - Emotional context
  - Value/focus area linking

**Entity:** `RelationshipMetrics`
- **Purpose:** Relationship quality scoring over time
- **Adapted From:** AlignmentScore
- **Key Features:**
  - Quality score with components
  - Trend analysis
  - Historical tracking

**Entity:** `RelationshipInsight`
- **Purpose:** AI-generated relationship insights
- **Adapted From:** DriftAlert
- **Key Features:**
  - Multiple insight types
  - Actionable recommendations
  - User acknowledgment tracking

**Design Rationale:**
- **Data-driven insights:** AI analyzes patterns
- **Proactive guidance:** Suggest improvements before issues
- **Learning loop:** User feedback improves recommendations

### Focus Areas

**Entity:** `FocusArea`
- **Purpose:** Personal growth objectives
- **Adapted From:** PyramidEntity at Goals/Objectives levels
- **Key Features:**
  - Progress tracking
  - Streak counting
  - Value alignment
  - Target dates

**Entity:** `FocusAreaProgress`
- **Purpose:** Progress checkpoints
- **Adapted From:** AlignmentScore history
- **Key Features:**
  - Time-series data
  - Linked interactions
  - Reflective notes

**Design Rationale:**
- **Gamification:** Streaks motivate consistency
- **Evidence-based:** Linked to real interactions
- **Flexible goals:** User-defined focus areas

### Chat & AI Assistant

**Entity:** `Conversation`, `ChatMessage`
- **Purpose:** RAG-based AI relationship advisor
- **Adapted From:** PKA-STRAT chat functionality
- **Key Features:**
  - Source citations
  - Tough love mode
  - Feedback collection
  - Context-aware responses

**Design Rationale:**
- **Trust through transparency:** Always cite sources
- **Personalized advice:** Based on user's values and history
- **Learning system:** Feedback improves future responses

---

## Vector Embeddings & Semantic Search

### Embedding Strategy

**Entities with Embeddings:**
1. `CoreValue.embedding` - For value alignment scoring
2. `SubSystem.embedding` - For system similarity
3. `ContentItem.embedding` - For RAG chat responses
4. `Interaction.embedding` - For pattern detection
5. `FocusArea.embedding` - For goal recommendations
6. `Mentor.embedding` - For advisor matching

**Embedding Model:**
- **Recommended:** `text-embedding-3-small` (OpenAI) or `all-MiniLM-L6-v2` (local)
- **Dimensions:** 384-1536
- **Storage:** PostgreSQL with pgvector or RuVector extension

### Semantic Search Use Cases

1. **Content Discovery:**
   ```sql
   SELECT * FROM content_items
   WHERE system_id = ANY(user_systems)
   ORDER BY embedding <=> query_embedding
   LIMIT 5
   ```

2. **Value Alignment Scoring:**
   ```typescript
   const alignmentScore = cosineSimilarity(
     interaction.embedding,
     coreValue.embedding
   );
   ```

3. **Relationship Pattern Detection:**
   ```sql
   SELECT * FROM interactions
   WHERE person = 'Alice'
   ORDER BY embedding <=> recent_interaction_embedding
   LIMIT 10
   ```

4. **RAG Chat Context:**
   ```typescript
   const relevantContent = await semanticSearch(
     userMessage,
     { system_ids: user.active_systems, limit: 5 }
   );
   ```

---

## Graph Database Integration

### Graph Schema

**Nodes:**
- `User` (singleton)
- `CoreValue` (3-10 per user)
- `SubSystem` (5-20 per user)
- `ContentItem` (unlimited)
- `Interaction` (unlimited)
- `FocusArea` (3-10 per user)
- `Person` (derived from interactions)

**Edges:**
- `USER_HAS_VALUE` → CoreValue
- `USER_HAS_SYSTEM` → SubSystem
- `SYSTEM_LINKS_TO` → SubSystem (weighted)
- `SYSTEM_CONTAINS` → ContentItem
- `CONTENT_LINKS_TO` → SubSystem (cross-linking)
- `INTERACTION_ALIGNS_WITH` → CoreValue
- `INTERACTION_RELATES_TO` → FocusArea
- `FOCUS_AREA_LINKED_TO` → CoreValue

### Graph Queries

**Example 1: Find Related Knowledge**
```cypher
MATCH (s1:SubSystem {id: $systemId})-[r:SYSTEM_LINKS_TO]-(s2:SubSystem)
WHERE r.strength > 0.5
RETURN s2, r.strength
ORDER BY r.strength DESC
LIMIT 10
```

**Example 2: Value Alignment Path**
```cypher
MATCH path = (i:Interaction)-[:INTERACTION_ALIGNS_WITH]->(v:CoreValue)
WHERE i.person = $personName
  AND i.date > $startDate
RETURN path, length(path) as alignment_count
```

**Example 3: Knowledge Graph Visualization**
```cypher
MATCH (s:SubSystem)
OPTIONAL MATCH (s)-[r:SYSTEM_LINKS_TO]-(s2:SubSystem)
RETURN s, collect(s2) as linked_systems, collect(r) as links
```

---

## Database Schema Recommendations

### PostgreSQL + pgvector

**Primary Tables:**
```sql
-- Core entities
CREATE TABLE users (...);
CREATE TABLE psychological_profiles (...);
CREATE TABLE core_values (...);
CREATE TABLE sub_systems (...);
CREATE TABLE content_items (...);
CREATE TABLE interactions (...);
CREATE TABLE focus_areas (...);

-- Relationships
CREATE TABLE system_links (...);
CREATE TABLE value_alignments (...);
CREATE TABLE relationship_metrics (...);

-- Supporting
CREATE TABLE chat_messages (...);
CREATE TABLE upcoming_events (...);
CREATE TABLE user_settings (...);
```

**Vector Indexes:**
```sql
CREATE INDEX idx_content_embedding ON content_items
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_interaction_embedding ON interactions
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Full-Text Search:**
```sql
CREATE INDEX idx_content_search ON content_items
USING gin(to_tsvector('english', content));
```

### Alternative: SQLite + VSS Extension (Mobile)

For mobile-first deployment:
```sql
-- Use SQLite with VSS (Vector Similarity Search) extension
-- Suitable for on-device processing
-- 10-100x smaller than PostgreSQL
```

---

## Privacy & Security Considerations

### Data Residency

**On-Device Mode:**
- All data stored locally (SQLite)
- No cloud sync
- Embeddings generated locally (quantized models)
- Chat uses local LLM or privacy-preserving API

**Cloud Mode:**
- Encrypted at rest (AES-256)
- Encrypted in transit (TLS 1.3)
- End-to-end encrypted sync
- GDPR-compliant data export

### Sensitive Data

**Encrypted Fields:**
- `UserSession.sync_token`
- `ChatMessage.content` (optional)
- `Interaction.summary` (optional)

**Anonymization:**
- Export removes PII
- Analytics use aggregate data
- Crash reports strip user content

---

## Scaling Considerations

### Single-User Architecture

**Assumptions:**
- 1 user per app instance
- 10-1000 interactions per year
- 100-5000 content items
- 5-50 sub-systems

**Performance Targets:**
- Semantic search: <200ms
- Graph query: <100ms
- Chat response: <2s (with streaming)
- Sync: <5s for daily changes

### Mobile Optimization

**Strategies:**
1. **Lazy loading:** Load recent data first
2. **Pagination:** Interactions/content by date
3. **Quantized embeddings:** Reduce storage 4-8x
4. **Local caching:** React Query with stale-while-revalidate
5. **Background sync:** Incremental updates

---

## Migration from PKA-STRAT Codebase

### Reusable Components

**Backend:**
- ✅ Vector database integration (RuVector/pgvector)
- ✅ UnifiedMemory service
- ✅ GraphStore service
- ✅ Document ingestion pipeline (adapt for content items)
- ✅ Embedding generation

**Frontend:**
- ✅ TanStack Query hooks
- ✅ Semantic search UI
- ✅ Graph visualization (adapt for SubSystems)
- ⚠️ Dashboard charts (modify metrics)

### New Components Needed

**Backend:**
- ❌ Relationship metrics calculation
- ❌ Interaction pattern detection
- ❌ Value alignment scoring
- ❌ Mobile-optimized API endpoints

**Frontend:**
- ❌ Mobile navigation (bottom tabs)
- ❌ Interaction logging flow
- ❌ Focus area tracking UI
- ❌ Psychological profile onboarding

---

## API Endpoint Mapping

### PKA-STRAT → PKA-Relate

| PKA-STRAT | PKA-Relate | Notes |
|-----------|------------|-------|
| `GET /pyramid` | `GET /systems` | Flat structure |
| `GET /pyramid/{level}/{id}` | `GET /systems/{id}` | No levels |
| `GET /alignment/scores` | `GET /growth/metrics` | Personal metrics |
| `GET /alignment/drift` | `GET /relationships/insights` | Relationship insights |
| `POST /documents/upload` | `POST /content-items` | Simplified |
| `POST /chat` | `POST /conversations/{id}/messages` | Same |
| `GET /dashboards/leader` | `GET /analytics/weekly-summary` | Personal dashboard |

---

## Next Steps

### Phase 1: Core Data Models (✅ Complete)
- [x] Define TypeScript interfaces
- [x] Document design decisions
- [x] Map adaptations from PKA-STRAT

### Phase 2: Database Schema
- [ ] PostgreSQL schema DDL
- [ ] Migration scripts
- [ ] Seed data for default SubSystems
- [ ] Vector indexes

### Phase 3: API Implementation
- [ ] REST endpoints
- [ ] Authentication middleware
- [ ] Vector search integration
- [ ] Graph query endpoints

### Phase 4: Frontend Integration
- [ ] React Native components
- [ ] TanStack Query hooks
- [ ] Mobile navigation
- [ ] Offline support

---

## Appendix A: Complete Entity List

### Core Entities (16)
1. User
2. UserSession
3. PsychologicalProfile
4. CoreValue
5. Mentor
6. FocusArea
7. FocusAreaProgress
8. SubSystem
9. SystemLink
10. ContentItem
11. Interaction
12. RelationshipMetrics
13. RelationshipInsight
14. Conversation
15. ChatMessage
16. UpcomingEvent

### Supporting Entities (9)
17. UserSettings
18. WeeklySummary
19. AccountabilityAlert
20. ValueAlignment
21. GraphNode
22. GraphEdge
23. MemoryEntry
24. DataExportRequest
25. SemanticSearchResult

---

## Appendix B: Vector Embedding Strategy

### Embedding Models

**Production:**
- OpenAI `text-embedding-3-small` (1536 dimensions)
- Cohere `embed-english-v3.0` (1024 dimensions)

**Local/Privacy Mode:**
- `all-MiniLM-L6-v2` (384 dimensions)
- `all-mpnet-base-v2` (768 dimensions)

### Embedding Generation Pipeline

```typescript
async function generateEmbeddings(entity: any, type: string) {
  const text = extractText(entity, type);
  const embedding = await embeddingService.generate(text);

  // Store in entity
  entity.embedding = embedding;

  // Index in vector DB
  await vectorDB.upsert({
    id: entity.id,
    vector: embedding,
    metadata: { type, ...entity }
  });
}
```

### Similarity Search

```typescript
async function semanticSearch(
  query: string,
  options: SemanticSearchQuery
): Promise<SemanticSearchResult[]> {
  const queryEmbedding = await embeddingService.generate(query);

  return await vectorDB.query({
    vector: queryEmbedding,
    topK: options.limit || 10,
    filter: buildFilter(options.filters)
  });
}
```

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-30
**Author:** System Architect Agent (Hive Mind)
**Status:** Complete - Ready for Implementation
