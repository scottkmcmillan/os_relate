# PKA-STRAT to PKA-Relate: Comprehensive Architectural Mapping Analysis

**Date**: 2025-12-30
**Analyst**: Research Agent (Hive Mind)
**Objective**: Map existing PKA-STRAT backend to PKA-Relate requirements for component reuse strategy

---

## Executive Summary

This analysis examines the existing **PKA-STRAT** strategic business alignment platform backend and its reusability for **PKA-Relate**, a personal relationship management application. While both systems share foundational architectural patterns (hierarchical knowledge organization, semantic search, document ingestion), they serve fundamentally different domains requiring strategic adaptation rather than direct reuse.

**Key Finding**: Approximately **60-70% of the infrastructure layer** can be reused, **40-50% of business logic** requires modification, and **30% requires new development** for relationship-specific features.

---

## 1. Component Reuse Analysis

### 1.1 DIRECT REUSE Components (No Modification Required)

These components can be used as-is from PKA-STRAT:

| Component | Location | Purpose | Reuse Confidence |
|-----------|----------|---------|------------------|
| **RuVector Memory System** | `src/memory/` | Vector database with HNSW indexing, SONA learning, GNN reranking | ✅ 100% |
| **Document Ingestion Pipeline** | `src/ingestion/` | File reading (MD, JSON, PDF, TXT), parsing, chunking | ✅ 95% |
| **Graph Store** | `src/memory/graphStore.ts` | SQLite-based knowledge graph with Cypher queries | ✅ 100% |
| **Embedding Generation** | `src/embedding.ts` | LocalNGramProvider, batch processing | ✅ 100% |
| **MCP Server Infrastructure** | `src/mcp/server.ts` | Model Context Protocol integration | ✅ 100% |
| **Authentication Middleware** | API Spec (JWT) | User authentication, token refresh | ✅ 90% |
| **File Upload Handler** | `src/api/routes/documents.ts` | Multipart form-data processing with Multer | ✅ 95% |
| **Semantic Router** | `src/tools/router.ts` | Query intent classification (RETRIEVAL, RELATIONAL, SUMMARY) | ✅ 90% |
| **WebSocket Real-time Updates** | API Spec `/ws/alignment`, `/ws/drift` | Real-time push notifications | ✅ 85% |
| **Cognitive Engine (SONA)** | `src/memory/cognitive.ts` | Self-optimizing neural attention, trajectory tracking | ✅ 100% |

**Rationale**: These are domain-agnostic infrastructure components focused on data storage, retrieval, and processing mechanics.

---

### 1.2 MODIFY Components (Adaptation Required)

These components require business logic changes to fit PKA-Relate:

| Component | Original Purpose (PKA-STRAT) | Required Modification for PKA-Relate | Effort Estimate |
|-----------|------------------------------|--------------------------------------|-----------------|
| **Pyramid Entity Model** | `PyramidEntity` 8-level hierarchy (mission → task) | Transform to `SubSystem` model (5 fixed systems: General, Dating, Masculinity, Femininity, Management) | Medium |
| **Alignment Calculator** | `src/pka/alignment/calculator.ts` | Repurpose for relationship quality scoring (interaction outcome analysis) | High |
| **Drift Detector** | `src/pka/alignment/drift-detector.ts` | Detect relationship pattern deviations (e.g., increasing conflict frequency) | Medium |
| **Dashboard Data Aggregation** | Leader/Manager/Member dashboards | Transform to Growth/Profile screen data (focus areas, weekly stats) | Medium |
| **API Endpoint Structure** | `/pyramid/{level}/{id}` | Restructure to `/systems/{id}`, `/interactions/{id}`, `/focus-areas/{id}` | Medium |
| **Document Type Classification** | Strategic documents (mission, vision, OKR) | Content types (note, article, book, video, podcast) | Low |
| **Team Management** | Organization → Teams → Members | Personal user model (no multi-tenancy) | High |
| **Access Control** | Role-based (Leader, Manager, Member) | Single-user ownership (all data belongs to authenticated user) | Medium |

**Rationale**: These contain PKA-STRAT-specific business rules that must be reinterpreted for personal relationship management.

---

### 1.3 BUILD NEW Components

These features are unique to PKA-Relate and have no PKA-STRAT equivalent:

| Component | Requirement | Implementation Notes | Complexity |
|-----------|-------------|----------------------|------------|
| **Psychological Profile Management** | Track attachment style, communication style, conflict patterns | New data model + CRUD API | Medium |
| **Core Values Categorization** | Primary/Secondary/Aspirational value grouping | Simple CRUD with categorization | Low |
| **Mentors List** | Personal guidance sources tracking | Simple CRUD | Low |
| **Interaction Logging** | Multi-step modal flow (type, person, outcome, emotions, learnings) | New API + multi-step validation | Medium |
| **AI Chat with Tough Love Mode** | Conversational AI with personality toggle | RAG pipeline + LLM integration + mode switching | High |
| **Chat Source Citations** | Attribute AI responses to content items | Enhance RAG pipeline with provenance tracking | Medium |
| **Focus Area Progress Tracking** | Streak tracking, weekly change calculations | New metrics calculation engine | Medium |
| **Upcoming Events Management** | Event scheduling with preparation notes | Calendar integration + CRUD | Medium |
| **Knowledge Graph Visualization** | Interactive node-link diagram for Systems | Frontend visualization + graph API | High |
| **Reflection Reminders** | Daily/weekly push notifications | Notification scheduler + user preferences | Medium |
| **App Lock (PIN/Biometric)** | Security layer for sensitive content | Platform-specific auth integration | High |
| **Data Export (Privacy)** | Full user data export in JSON format | Aggregation endpoint across all entities | Low |

**Rationale**: These are relationship-domain-specific features with no business analogue.

---

## 2. Data Model Transformation Strategy

### 2.1 Pyramid of Clarity → Sub-Systems Mapping

**PKA-STRAT Hierarchy (8 levels, tree structure)**:
```
Mission (1)
 └─ Vision (N)
     └─ Objectives (N)
         └─ Goals (N)
             └─ Portfolios (N)
                 └─ Programs (N)
                     └─ Projects (N)
                         └─ Tasks (N)
```

**PKA-Relate Structure (2 levels, graph structure)**:
```
SubSystem (5 fixed)
 ├─ General
 ├─ Dating
 ├─ Masculinity
 ├─ Femininity
 └─ Management
      └─ ContentItem (N per system)
           ├─ Note
           ├─ Article
           ├─ Book
           ├─ Video
           └─ Podcast
```

**Transformation Strategy**:

| PKA-STRAT Concept | PKA-Relate Equivalent | Transformation Logic |
|-------------------|----------------------|----------------------|
| `PyramidEntity.level` (enum of 8) | `SubSystem.name` (fixed enum of 5) | Flatten hierarchy: Remove levels, replace with flat system taxonomy |
| `PyramidEntity.parentId` | `SubSystem.linked_system_ids[]` | Transform tree to graph: Replace parent-child with peer-to-peer links |
| `PyramidEntity.documentIds[]` | `ContentItem.system_id` | Invert relationship: Documents become children of systems, not metadata |
| `PyramidEntity.alignmentScore` | `SubSystem.item_count` (computed) | Replace alignment with content volume metric |
| Hierarchical traversal | Graph traversal with depth limit | Use existing `graphStore.findRelated()` |

**Implementation Impact**:
- **Database Schema**: Replace `pyramid_entities` table with `systems` + `content_items` tables
- **API Routes**: `/pyramid/{level}/{id}` → `/systems/{id}` + `/systems/{id}/items`
- **Business Logic**: Remove alignment calculation, add graph connectivity scoring

---

### 2.2 Document Ingestion → Content Item Mapping

| PKA-STRAT Concept | PKA-Relate Equivalent | Notes |
|-------------------|----------------------|-------|
| `DocumentIngestion.documentType` (strategic docs) | `ContentItem.type` (media types) | Replace taxonomy: mission_statement → note, research_report → article |
| `DocumentIngestion.linkedEntityId` (pyramid) | `ContentItem.system_id` (sub-system) | Direct mapping with cardinality change (1:N → N:1) |
| `DocumentIngestion.extractedChunks` | `ContentItem.highlights[]` | Semantic chunks become manual highlights |
| Full-text embedding for alignment | Full-text embedding for semantic search | Reuse vector storage, change retrieval purpose |

**Reuse Verdict**: **80% reusable**. Same ingestion mechanics (file upload, parsing, chunking, embedding), different metadata schema.

---

### 2.3 Alignment Scoring → Interaction Quality Metrics

| PKA-STRAT | PKA-Relate | Transformation |
|-----------|-----------|----------------|
| `AlignmentScore` (entity-to-mission similarity) | `Interaction.outcome` (positive/neutral/negative/mixed) | Replace continuous score with categorical outcome |
| `AlignmentFactor[]` (document similarity, graph connectivity) | `Interaction.emotions[]` (multi-select tags) | Replace numeric factors with qualitative tags |
| `DriftAlert` (mission drift detection) | Relationship pattern analysis (e.g., conflict frequency trending up) | Repurpose drift logic for time-series pattern detection |
| `AlignmentProvenance` (L-Score source tracking) | Chat source citations (AI response → content items) | Reuse provenance mechanism for RAG attribution |

**Reuse Verdict**: **50% reusable**. Core algorithms (vector similarity, graph analysis) transfer, but business interpretation differs.

---

## 3. API Endpoint Mapping Table

### 3.1 Authentication Endpoints

| PKA-STRAT | PKA-Relate | Modification |
|-----------|-----------|--------------|
| `POST /auth/login` | `POST /auth/login` | ✅ Direct reuse |
| `POST /auth/logout` | `POST /auth/logout` | ✅ Direct reuse |
| `POST /auth/refresh` | `POST /auth/refresh` | ✅ Direct reuse |
| `GET /auth/api-keys` | ❌ Not needed | Remove (no API key integrations) |
| ❌ | `POST /auth/signup` | ➕ Add new endpoint |
| ❌ | `GET /auth/me` | ➕ Add new endpoint |

---

### 3.2 Core Entity Management

| PKA-STRAT | PKA-Relate | Modification |
|-----------|-----------|--------------|
| `GET /pyramid` | `GET /systems` | Rename + simplify (no depth parameter) |
| `POST /pyramid/{level}` | `POST /systems` | Remove `{level}` path param |
| `GET /pyramid/{level}/{id}` | `GET /systems/{id}` | Remove `{level}` path param |
| `PUT /pyramid/{level}/{id}` | `PUT /systems/{id}` | Remove `{level}` path param |
| `DELETE /pyramid/{level}/{id}` | `DELETE /systems/{id}` | Remove `{level}` path param |
| `GET /pyramid/{level}/{id}/children` | `GET /systems/{id}/items` | Rename (children → items) |
| `POST /pyramid/link` | `POST /systems/{id}/link/{targetId}` | Simplify to RESTful nested route |
| ❌ | `GET /systems/graph` | ➕ Add graph visualization endpoint |

**Key Change**: Remove hierarchical routing. PKA-STRAT uses `/pyramid/{level}/{id}` to enforce hierarchy. PKA-Relate uses `/systems/{id}` for flat structure.

---

### 3.3 Document/Content Management

| PKA-STRAT | PKA-Relate | Modification |
|-----------|-----------|--------------|
| `GET /documents` | `GET /content-items` | Rename |
| `POST /documents` | `POST /systems/{id}/items` | Nest under systems |
| `GET /documents/{id}` | `GET /content-items/{id}` | Rename |
| `DELETE /documents/{id}` | `DELETE /content-items/{id}` | Rename |
| `GET /documents/{id}/chunks` | ❌ Not exposed | Internal only (used for search) |
| `GET /documents/{id}/embedding` | ❌ Not exposed | Internal only |
| `POST /documents/{id}/reprocess` | ❌ Not needed | Remove (no admin features) |
| ❌ | `GET /content-items/search?q=` | ➕ Add full-text search |

---

### 3.4 Strategic Features → Relationship Features

| PKA-STRAT | PKA-Relate Equivalent | Notes |
|-----------|----------------------|-------|
| `GET /alignment/scores` | `GET /analytics/focus-progress` | Replace alignment with progress metrics |
| `GET /alignment/drift` | `GET /analytics/interaction-patterns` | Reuse drift logic for pattern detection |
| `POST /alignment/analyze` | ❌ Not needed | Remove (no manual recalculation) |
| `GET /alignment/heatmap` | ❌ Not needed | Remove (no heat map visualization) |
| `GET /alignment/provenance/{id}` | `GET /conversations/{id}/messages` + sources | Repurpose for chat citations |
| `GET /dashboards/leader` | `GET /analytics/weekly-summary` | Personal analytics dashboard |
| `GET /dashboards/manager` | ❌ Not needed | Remove (no multi-user) |
| `GET /dashboards/member` | ❌ Not needed | Remove (no multi-user) |
| `POST /reports/generate` | ❌ Not needed | Remove (no report generation) |
| `POST /reports/board-deck` | ❌ Not needed | Remove (no board decks) |
| `POST /market/analyze` | ❌ Not needed | Remove (no market intelligence) |

---

### 3.5 New PKA-Relate Endpoints

| Endpoint | Purpose | Build Effort |
|----------|---------|--------------|
| `GET /users/me/profile` | User profile CRUD | Low |
| `GET /users/me/psychological-profile` | Psychological traits | Medium |
| `GET /users/me/values` | Core values CRUD | Low |
| `GET /users/me/mentors` | Mentors list CRUD | Low |
| `GET /users/me/focus-areas` | Focus areas with progress | Medium |
| `POST /interactions` | Log interaction (multi-step) | Medium |
| `GET /interactions/stats` | Weekly/monthly aggregation | Medium |
| `POST /conversations` | Start AI chat session | High |
| `POST /conversations/{id}/messages` | Send message, get AI response | High |
| `GET /events/upcoming` | Next 7 days events | Medium |
| `POST /export/data` | Full data export | Low |

---

## 4. Critical Architectural Decisions

### 4.1 Multi-Tenancy → Single-User

**PKA-STRAT**: Multi-tenant SaaS (organizations, teams, role-based access)
**PKA-Relate**: Single-user personal app (one user owns all data)

**Decision Required**:
- **Option A**: Keep multi-tenant schema, default to single organization per user
  - ✅ Preserves existing schema
  - ❌ Unnecessary complexity for personal app
  - ❌ `organizationId` foreign keys everywhere

- **Option B**: Remove multi-tenancy, use `userId` as root owner ⭐ **RECOMMENDED**
  - ✅ Simplifies data model
  - ✅ Clearer ownership semantics
  - ❌ Requires schema rewrite

**Recommendation**: **Option B**. Remove `Organization` and `Team` tables. Replace `organizationId` with `userId` in all tables.

**Migration Impact**:
```sql
-- PKA-STRAT schema
CREATE TABLE pyramid_entities (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  ...
);

-- PKA-Relate schema
CREATE TABLE sub_systems (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),  -- Direct ownership
  ...
);
```

---

### 4.2 Hierarchical Structure → Graph Structure

**PKA-STRAT**: Strict tree hierarchy (enforced by `parentId` + `level`)
**PKA-Relate**: Flexible graph (peer-to-peer `linked_system_ids[]`)

**Decision Required**:
- **Option A**: Keep tree structure in database, expose as graph in API
  - ✅ Preserves referential integrity
  - ❌ Limits cross-linking

- **Option B**: Implement many-to-many link table ⭐ **RECOMMENDED**
  - ✅ Supports true graph topology
  - ✅ Aligns with frontend "knowledge graph" visualization
  - ❌ Requires new table

**Recommendation**: **Option B**. Create `system_links` table for many-to-many relationships.

**Schema**:
```sql
CREATE TABLE system_links (
  id UUID PRIMARY KEY,
  source_system_id UUID REFERENCES sub_systems(id),
  target_system_id UUID REFERENCES sub_systems(id),
  strength FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ
);
```

---

### 4.3 Strategic Alignment → Relationship Quality Metrics

**PKA-STRAT**: Vector similarity + graph connectivity → alignment score (0-1)
**PKA-Relate**: Interaction outcomes + emotional tags → relationship health

**Decision Required**:
- **Option A**: Repurpose alignment calculator for relationship scoring
  - ✅ Reuses existing engine
  - ❌ May not fit qualitative data (emotions are categorical, not numeric)

- **Option B**: Build new metrics engine using interaction data ⭐ **RECOMMENDED**
  - ✅ Designed for categorical + temporal data
  - ✅ Supports trend analysis (conflict frequency over time)
  - ❌ New development required

**Recommendation**: **Option B**. Build new `InteractionAnalyzer` that uses RuVector for semantic clustering of interaction summaries but calculates quality metrics differently:

```typescript
interface InteractionMetrics {
  positiveRatio: number;  // % positive outcomes
  conflictFrequency: number;  // conflicts per week
  emotionalDiversity: number;  // unique emotions logged
  learningRate: number;  // insights per interaction
  trendDirection: 'improving' | 'declining' | 'stable';
}
```

**Reuse from PKA-STRAT**:
- Vector search for similar past interactions
- Graph analysis for pattern detection
- Drift detection logic for trend analysis

---

### 4.4 Document Provenance → AI Chat Source Attribution

**PKA-STRAT**: Track which document chunks contributed to alignment scores
**PKA-Relate**: Track which content items contributed to AI responses

**Decision Required**:
- **Option A**: Reuse provenance chain mechanism ⭐ **RECOMMENDED**
  - ✅ Already implements source tracking
  - ✅ Fits RAG (retrieval-augmented generation) pattern
  - ✅ Minimal modification needed

- **Option B**: Build new citation system
  - ❌ Duplicates existing functionality

**Recommendation**: **Option A**. Transform `ProvenanceChain`:

```typescript
// PKA-STRAT
interface ProvenanceChain {
  documentSource: string;
  chunkIds: string[];
  pathToMission: PyramidEntity[];  // Hierarchical path
  confidenceScores: number[];
}

// PKA-Relate
interface ChatSource {
  contentItemId: string;
  title: string;
  author?: string;
  relevanceScore: number;  // Vector similarity score
  chunkText: string;  // Quoted excerpt
}

interface ChatMessage {
  content: string;
  sources: ChatSource[];  // Array of contributing content items
}
```

**Reuse**: `AlignmentProvenance` logic becomes `ChatSourceAttribution` with field renaming.

---

### 4.5 RuVector Cognitive Features: Use or Disable?

**Available Features**:
- SONA (Self-Optimizing Neural Attention) - Adaptive learning
- GNN Reranking - Neural reordering of search results
- Trajectory Tracking - User interaction patterns

**Decision Required**:
- **Option A**: Enable full cognitive features ⭐ **RECOMMENDED**
  - ✅ Improves search quality over time
  - ✅ Personalizes to user's query patterns
  - ✅ Already implemented in PKA-STRAT
  - ❌ Adds complexity

- **Option B**: Disable cognitive features (`--no-cognitive` flag)
  - ✅ Simpler deployment
  - ❌ Loses adaptive search quality

**Recommendation**: **Option A**. Enable SONA and GNN for:
1. **Personalized Content Search**: Learn which content items user finds most relevant
2. **Interaction Pattern Recognition**: Detect recurring relationship dynamics
3. **Focus Area Recommendations**: Suggest areas needing attention based on interaction history

**Implementation**: Use existing `src/memory/cognitive.ts` engine. Track trajectories:
```typescript
// When user searches content
memory.beginTrajectory("Find articles about active listening");
memory.recordStep(trajectoryId, "clicked_article_123", rewardScore);
memory.endTrajectory(trajectoryId, userRating);
```

---

### 4.6 Database Choice: PostgreSQL vs SQLite

**PKA-STRAT**: PostgreSQL (scalable, multi-user)
**PKA-Relate Options**:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **PostgreSQL** | Production-ready, supports RuVector extension | Overkill for single-user, requires server | ❌ |
| **SQLite** | Simple, local-first, privacy-focused | Limited concurrency | ✅ **RECOMMENDED** |

**Recommendation**: **SQLite** for PKA-Relate.

**Rationale**:
- Single-user app benefits from local-first architecture
- Aligns with "on-device only mode" privacy requirement
- Simpler deployment (no database server)
- RuVector already uses SQLite for vector storage

**Migration Path**:
- PKA-STRAT uses PostgreSQL schemas
- Convert to SQLite schemas (minor syntax changes)
- Keep RuVector's existing SQLite vector database
- Add SQLite database for relational data (users, interactions, systems)

---

## 5. Reuse Summary Matrix

| Layer | Reuse % | Modification % | New Build % | Notes |
|-------|---------|----------------|-------------|-------|
| **Infrastructure** | 70% | 20% | 10% | RuVector, ingestion, MCP server mostly reusable |
| **Data Layer** | 40% | 50% | 10% | Schema requires major transformation (multi-tenant → single-user, hierarchy → graph) |
| **Business Logic** | 30% | 40% | 30% | Alignment logic repurposed, new relationship-specific features needed |
| **API Layer** | 40% | 30% | 30% | Authentication reused, entity endpoints modified, new chat/interaction endpoints |
| **Overall** | 45% | 35% | 20% | Nearly half the codebase reusable with modifications |

---

## 6. Risk Assessment

### High-Risk Decisions

1. **Removing Multi-Tenancy**
   - **Risk**: Extensive schema changes could introduce bugs
   - **Mitigation**: Automated migration scripts + comprehensive testing

2. **Repurposing Alignment Calculator**
   - **Risk**: Business logic mismatch (strategic alignment ≠ relationship quality)
   - **Mitigation**: Build new `InteractionAnalyzer` using alignment engine as reference, not direct reuse

3. **AI Chat Implementation**
   - **Risk**: No equivalent in PKA-STRAT, requires RAG pipeline + LLM integration
   - **Mitigation**: Use proven patterns (LangChain, LlamaIndex), reuse provenance logic

### Medium-Risk Decisions

4. **Graph Visualization**
   - **Risk**: Frontend-heavy feature, no backend precedent
   - **Mitigation**: Leverage existing `graphStore.findRelated()`, use D3.js or Cytoscape.js

5. **Cognitive Features Complexity**
   - **Risk**: SONA/GNN may overcomplicate personal app
   - **Mitigation**: Make configurable (`--no-cognitive` flag), default to enabled

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Reuse-First)
1. Clone PKA-STRAT repository
2. Remove multi-tenant tables (`organizations`, `teams`)
3. Simplify schema (SQLite + single `users` table)
4. Test RuVector integration with new schema
5. Implement authentication (reuse PKA-STRAT JWT logic)

### Phase 2: Data Model Transformation
6. Create `sub_systems`, `content_items`, `system_links` tables
7. Migrate `DocumentIngestion` to `ContentItem` model
8. Build `InteractionAnalyzer` (new) using alignment calculator patterns
9. Implement psychological profile + core values CRUD

### Phase 3: API Development
10. Modify API routes (`/pyramid` → `/systems`)
11. Build new endpoints (`/interactions`, `/focus-areas`)
12. Implement AI chat with RAG + source attribution
13. Add analytics endpoints (`/weekly-summary`, `/interaction-patterns`)

### Phase 4: Advanced Features
14. Knowledge graph visualization API
15. Focus area progress tracking with streaks
16. Event management with reminders
17. Data export functionality

---

## 8. Technology Stack Alignment

| Component | PKA-STRAT | PKA-Relate | Compatibility |
|-----------|-----------|-----------|---------------|
| **Runtime** | Node.js + TypeScript | Node.js + TypeScript | ✅ Perfect match |
| **API Framework** | Express 5.x | Express 5.x | ✅ Perfect match |
| **Database** | PostgreSQL | SQLite | ⚠️ Requires migration |
| **Vector DB** | RuVector (local) | RuVector (local) | ✅ Perfect match |
| **Authentication** | JWT + bcrypt | JWT + bcrypt | ✅ Perfect match |
| **File Processing** | Multer | Multer | ✅ Perfect match |
| **Graph Query** | Cypher-like (custom) | Cypher-like (custom) | ✅ Perfect match |
| **Real-time** | WebSocket (ws) | WebSocket (ws) | ✅ Perfect match |
| **LLM Integration** | ❌ None | OpenAI/Anthropic API | ➕ New addition |

---

## 9. Estimated Effort Breakdown

| Task Category | Reuse Effort | Modify Effort | Build New Effort | Total Person-Days |
|---------------|--------------|---------------|------------------|-------------------|
| **Infrastructure Setup** | 2 days | 3 days | 1 day | 6 days |
| **Data Model** | 1 day | 8 days | 4 days | 13 days |
| **Authentication** | 1 day | 2 days | 1 day | 4 days |
| **Core Entity APIs** | 2 days | 6 days | 3 days | 11 days |
| **Content Management** | 2 days | 4 days | 2 days | 8 days |
| **Interaction System** | 0 days | 2 days | 8 days | 10 days |
| **AI Chat + RAG** | 0 days | 3 days | 10 days | 13 days |
| **Analytics** | 1 day | 5 days | 5 days | 11 days |
| **Advanced Features** | 0 days | 2 days | 10 days | 12 days |
| **Testing** | 2 days | 5 days | 5 days | 12 days |
| **Total** | 11 days | 40 days | 49 days | **100 person-days** |

**Assumptions**:
- 1 full-stack developer (backend + light frontend integration)
- 8-hour workdays
- Moderate complexity
- Includes testing and documentation

**Calendar Time**: 20 weeks (5 months) with 1 developer, OR 10 weeks with 2 developers

---

## 10. Conclusion

The PKA-STRAT backend provides a **robust foundation** for PKA-Relate, particularly in infrastructure (RuVector, document processing, MCP integration). However, the domain shift from **strategic business alignment to personal relationship management** requires substantial business logic transformation.

### Recommended Approach:
1. **Fork PKA-STRAT** as starting point
2. **Strip multi-tenancy** (remove org/team complexity)
3. **Flatten hierarchy** (transform pyramid to graph)
4. **Repurpose alignment engine** for relationship metrics
5. **Build new features** (AI chat, interaction logging, psychological profile)

### Key Success Factors:
- ✅ Leverage RuVector's cognitive features for personalized search
- ✅ Reuse provenance tracking for AI source attribution
- ✅ Maintain SQLite for privacy-focused local-first architecture
- ✅ Avoid over-engineering: PKA-Relate is simpler than PKA-STRAT

### Next Steps:
1. **Schema Design**: Finalize SQLite schema for PKA-Relate entities
2. **API Contract**: Generate OpenAPI 3.0 spec for PKA-Relate
3. **RAG Pipeline**: Design retrieval-augmented generation flow for AI chat
4. **Interaction Metrics**: Define relationship quality scoring algorithm

---

**Analysis Complete**
**Confidence Level**: High (based on comprehensive code review + documentation analysis)
**Stored in Memory**: `/docs/analysis/PKA_ARCHITECTURAL_MAPPING_ANALYSIS.md`
