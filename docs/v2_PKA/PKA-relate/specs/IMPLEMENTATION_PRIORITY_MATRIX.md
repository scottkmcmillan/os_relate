# PKA-Relate Implementation Priority Matrix

**Document Version:** 1.0.0
**Generated:** 2025-12-30
**Source:** Hive-Mind Swarm Analysis (4 Agents)

---

## Executive Summary

This priority matrix consolidates findings from all swarm agents to provide a unified implementation roadmap. The matrix identifies critical gaps, prioritizes work items, and provides adjusted timeline estimates.

---

## 1. Critical Gap Resolution

### 1.1 Missing API Endpoints (9 Total)

| Priority | Endpoint | Phase | Effort | Dependencies |
|----------|----------|-------|--------|--------------|
| **P0** | `GET /users/me/values/:valueId` | Phase 1 | Low | None |
| **P0** | `PUT /users/me/values/:valueId` | Phase 1 | Low | None |
| **P0** | `PUT /users/me/mentors/:mentorId` | Phase 1 | Low | None |
| **P0** | `GET /users/me/focus-areas/:focusAreaId` | Phase 1 | Low | None |
| **P1** | `POST /content-items/upload` | Phase 2 | Medium | Multer setup |
| **P1** | `GET /conversations/:id` | Phase 4 | Low | Conversation CRUD |
| **P1** | `PUT /conversations/:id` | Phase 4 | Low | Conversation CRUD |
| **P2** | `GET /analytics/drift-alerts` | Phase 5 | Medium | AccountabilityEngine |
| **P2** | `GET /analytics/real-time-drift` | Phase 5 | High | SSE infrastructure |

### 1.2 Missing Services (6 Total)

| Priority | Service | Database Table | Phase | Effort |
|----------|---------|---------------|-------|--------|
| **P0** | GraphNodeService | graph_nodes | Phase 0 | Medium |
| **P0** | GraphEdgeService | graph_edges | Phase 0 | Medium |
| **P0** | MemoryEntryService | memory_entries | Phase 0 | Medium |
| **P1** | FileIngestionService | content_items | Phase 2 | High |
| **P1** | RelationshipMetricsService | relationship_metrics | Phase 3 | Medium |
| **P1** | RelationshipInsightsService | relationship_insights | Phase 3 | Medium |

### 1.3 Schema Corrections Required

| Priority | Issue | Fix | Phase |
|----------|-------|-----|-------|
| **P0** | Missing `password_hash` in User interface | Add `password_hash: string` | Phase 0 |
| **P0** | Missing `tags` column in mentors table | Add `tags TEXT[] DEFAULT ARRAY[]::TEXT[]` | Phase 0 |
| **P1** | Vector dimension mismatch (1536 vs 384) | Make configurable, document strategy | Phase 0 |
| **P1** | JWT algorithm inconsistency (RS256 vs HS256) | Standardize on RS256 | Phase 1 |
| **P2** | Missing Zod validation schemas | Create for all endpoints | Phase 0-1 |

---

## 2. Phase-by-Phase Priority Matrix

### Phase 0: Foundation & Infrastructure

**Adjusted Effort:** +50% from original estimate

| Task ID | Task | Priority | Effort | Status |
|---------|------|----------|--------|--------|
| 0.1 | Project structure setup | P0 | Low | Pending |
| 0.2 | Extend GraphStore NodeType/EdgeType | P0 | Low | Complete |
| 0.3 | Create RelateMemoryManager | P0 | High | Pending |
| 0.4 | Create type definitions | P0 | Medium | Pending |
| **0.5** | **Add GraphNodeService** | **P0** | **Medium** | **NEW** |
| **0.6** | **Add GraphEdgeService** | **P0** | **Medium** | **NEW** |
| **0.7** | **Add MemoryEntryService** | **P0** | **Medium** | **NEW** |
| **0.8** | **Add password_hash to User interface** | **P0** | **Low** | **NEW** |
| **0.9** | **Document vector dimension strategy** | **P1** | **Low** | **NEW** |
| **0.10** | **Create Zod validation base schemas** | **P1** | **Medium** | **NEW** |

### Phase 1: Authentication & User Management

**Adjusted Effort:** +20% from original estimate

| Task ID | Task | Priority | Effort | Status |
|---------|------|----------|--------|--------|
| 1.1 | User database setup | P0 | Medium | Pending |
| 1.2 | AuthService with JWT (RS256) | P0 | High | Pending |
| 1.3 | Auth middleware | P0 | Medium | Pending |
| 1.4 | UserService | P0 | High | Pending |
| 1.5 | Auth routes | P0 | Medium | Pending |
| 1.6 | User routes | P0 | Medium | Pending |
| **1.7** | **Add GET /users/me/values/:valueId** | **P0** | **Low** | **NEW** |
| **1.8** | **Add PUT /users/me/values/:valueId** | **P0** | **Low** | **NEW** |
| **1.9** | **Add PUT /users/me/mentors/:mentorId** | **P0** | **Low** | **NEW** |
| **1.10** | **Add GET /users/me/focus-areas/:focusAreaId** | **P0** | **Low** | **NEW** |
| **1.11** | **Add tags column to mentors table** | **P1** | **Low** | **NEW** |

### Phase 2: Sub-Systems & Content

**Adjusted Effort:** +30% from original estimate

| Task ID | Task | Priority | Effort | Status |
|---------|------|----------|--------|--------|
| 2.1 | SubSystemService | P0 | High | Pending |
| 2.2 | ContentService | P0 | High | Pending |
| 2.3 | Sub-system routes | P0 | Medium | Pending |
| 2.4 | Content routes | P0 | Medium | Pending |
| 2.5 | Vector store integration | P0 | Medium | Pending |
| **2.6** | **Add FileIngestionService** | **P1** | **High** | **NEW** |
| **2.7** | **Add POST /content-items/upload** | **P1** | **Medium** | **NEW** |

### Phase 3: Interactions & Tracking

**Adjusted Effort:** +40% from original estimate

| Task ID | Task | Priority | Effort | Status |
|---------|------|----------|--------|--------|
| 3.1 | InteractionService | P0 | High | Pending |
| 3.2 | Progress tracking | P0 | Medium | Pending |
| 3.3 | Interaction routes | P0 | Medium | Pending |
| **3.4** | **Add RelationshipMetricsService** | **P1** | **Medium** | **NEW** |
| **3.5** | **Add RelationshipInsightsService** | **P1** | **Medium** | **NEW** |
| **3.6** | **Add ValueAlignmentService** | **P1** | **Medium** | **NEW** |

### Phase 4: AI Chat Enhancement

**Adjusted Effort:** +10% from original estimate

| Task ID | Task | Priority | Effort | Status |
|---------|------|----------|--------|--------|
| 4.1 | EnhancedChatService | P0 | High | Pending |
| 4.2 | Context builder | P0 | Medium | Pending |
| 4.3 | ToughLoveEngine | P0 | High | Pending |
| 4.4 | Prompt templates | P0 | Medium | Pending |
| 4.5 | Chat routes | P0 | Medium | Pending |
| **4.6** | **Add GET /conversations/:id** | **P1** | **Low** | **NEW** |
| **4.7** | **Add PUT /conversations/:id** | **P1** | **Low** | **NEW** |

### Phase 5: Analytics & Insights

**Adjusted Effort:** +20% from original estimate

| Task ID | Task | Priority | Effort | Status |
|---------|------|----------|--------|--------|
| 5.1 | AnalyticsService | P0 | High | Pending |
| 5.2 | AccountabilityEngine | P0 | High | Pending |
| 5.3 | Analytics routes | P0 | Medium | Pending |
| **5.4** | **Add GET /analytics/drift-alerts** | **P2** | **Medium** | **NEW** |
| **5.5** | **Add GET /analytics/real-time-drift** | **P2** | **High** | **NEW** |
| **5.6** | **Add POST /analytics/generate-audit** | **P2** | **Medium** | **NEW** |
| **5.7** | **Add GET /recommendations/readings** | **P2** | **Medium** | **NEW** |

### Phase 6: Polish & Export

**Adjusted Effort:** No change

| Task ID | Task | Priority | Effort | Status |
|---------|------|----------|--------|--------|
| 6.1 | ExportService | P1 | Medium | Pending |
| 6.2 | EventService | P1 | Medium | Pending |
| 6.3 | Export routes | P1 | Low | Pending |
| 6.4 | Event routes | P1 | Low | Pending |
| 6.5 | Production readiness | P0 | High | Pending |
| **6.6** | **Add POST /analytics/compatibility** | **P2** | **Medium** | **NEW** |
| **6.7** | **Add POST /assistance/draft-message** | **P3** | **High** | **NEW** |
| **6.8** | **Add POST /assistance/critique-message** | **P3** | **Medium** | **NEW** |

---

## 3. Code Reuse Matrix

### 3.1 Directly Reusable (100%)

| File | Purpose | Lines |
|------|---------|-------|
| `src/memory/index.ts` | UnifiedMemory class | ~200 |
| `src/memory/types.ts` | Memory type definitions | ~100 |
| `src/memory/graphStore.ts` | Graph-based storage | ~250 |
| `src/memory/vectorStore.ts` | Vector embeddings | ~300 |
| `src/memory/cognitive.ts` | Cognitive operations | ~150 |
| `src/memory/collections.ts` | Collection management | ~100 |
| `src/embedding.ts` | Embedding service | ~80 |
| `src/ingestion/parser.ts` | Document parsing | ~150 |
| `src/ingestion/reader.ts` | Chunk extraction | ~100 |

**Total Reusable:** ~1,430 lines

### 3.2 Requires Modification (60-80%)

| File | Modifications Needed | Effort |
|------|---------------------|--------|
| `src/api/server.ts` | Add auth middleware, CORS config | Low |
| `src/api/types.ts` | Add relationship types | Low |
| `src/api/routes/index.ts` | Add relate route aggregator | Low |
| `src/api/routes/chat.ts` | Add tough love, sources | Medium |
| `src/api/routes/documents.ts` | Add user scoping | Medium |
| `src/api/routes/search.ts` | Add filters, scoping | Medium |
| `src/api/routes/collections.ts` | Map to SubSystems | Medium |
| `src/ingestion/graphBuilder.ts` | Add new node/edge types | Medium |

**Modification Effort:** ~40 hours

### 3.3 New Files Required

| Category | Count | Estimated Lines |
|----------|-------|-----------------|
| Type definitions | 1 | 500 |
| Memory manager | 1 | 400 |
| Auth module | 5 | 600 |
| User module | 2 | 400 |
| Systems module | 2 | 400 |
| Content module | 2 | 300 |
| Interactions module | 3 | 500 |
| Chat module | 4 | 800 |
| Analytics module | 3 | 600 |
| Events module | 2 | 200 |
| Export module | 2 | 200 |
| **Total** | **27** | **~4,900** |

---

## 4. Risk-Prioritized Backlog

### 4.1 High Risk Items (Mitigate First)

| ID | Risk | Impact | Mitigation | Phase |
|----|------|--------|------------|-------|
| R1 | JWT signing algorithm inconsistency | Auth failures | Standardize on RS256, document clearly | 0 |
| R2 | Vector dimension mismatch | Search failures | Add dimension config, migration script | 0 |
| R3 | Missing graph/memory services | Core functionality gaps | Add to Phase 0 deliverables | 0 |
| R4 | Breaking existing routes | PKA-STRAT regression | Feature flags, parallel deployment | All |

### 4.2 Medium Risk Items

| ID | Risk | Impact | Mitigation | Phase |
|----|------|--------|------------|-------|
| R5 | LLM quality for tough love | User experience | Extensive prompt engineering, feedback loop | 4 |
| R6 | External research (US-2.5) | Delayed feature | Implement as optional, use caching | 4+ |
| R7 | SSE streaming complexity | Mobile compatibility | Use proven SSE library, test on devices | 4 |
| R8 | Analytics performance at scale | Slow dashboards | Materialized views, caching | 5 |

### 4.3 Low Risk Items

| ID | Risk | Impact | Mitigation | Phase |
|----|------|--------|------------|-------|
| R9 | Default sub-system seeding race | Minor UX issue | Use transaction | 2 |
| R10 | Export file size limits | Large exports fail | Chunked export with progress | 6 |

---

## 5. Adjusted Timeline

### 5.1 Original vs Revised Estimates

| Phase | Original | Adjustment | Revised | Reason |
|-------|----------|------------|---------|--------|
| Phase 0 | 1.0x | +50% | 1.5x | Graph/memory services added |
| Phase 1 | 1.0x | +20% | 1.2x | 4 missing endpoints added |
| Phase 2 | 1.0x | +30% | 1.3x | File upload service added |
| Phase 3 | 1.0x | +40% | 1.4x | Metrics/insights services added |
| Phase 4 | 1.0x | +10% | 1.1x | 2 missing endpoints added |
| Phase 5 | 1.0x | +20% | 1.2x | Drift monitoring added |
| Phase 6 | 1.0x | +0% | 1.0x | No change |
| **Total** | **7.0x** | **+24%** | **8.7x** | |

### 5.2 Critical Path

```
Foundation (1.5x)
    └── Authentication (1.2x)
            └── Sub-Systems (1.3x)
                    ├── Interactions (1.4x)
                    │       └── AI Chat (1.1x) ─┐
                    └────────────────────────────────┴── Analytics (1.2x)
                                                              └── Polish (1.0x)

Total Critical Path: 1.5 + 1.2 + 1.3 + 1.4 + 1.2 + 1.0 = 7.6x
Parallel Path Savings: Analytics can start with Chat completion
Effective Duration: ~7.0x with optimal parallelization
```

---

## 6. Implementation Sequence

### Week 1-2: Phase 0 (Foundation)
1. Set up project structure
2. Create type definitions with Zod schemas
3. Extend GraphStore types
4. Implement GraphNodeService, GraphEdgeService, MemoryEntryService
5. Create RelateMemoryManager
6. Document vector dimension strategy

### Week 3-4: Phase 1 (Authentication)
1. Set up user database with password_hash
2. Implement AuthService with RS256 JWT
3. Create auth middleware
4. Implement UserService
5. Create all auth/user routes (including 4 new endpoints)
6. Add tags column to mentors

### Week 5-6: Phase 2 (Sub-Systems & Content)
1. Implement SubSystemService
2. Implement ContentService
3. Create FileIngestionService for uploads
4. Create all system/content routes
5. Integrate vector store
6. Seed default sub-systems

### Week 7-8: Phase 3 (Interactions)
1. Implement InteractionService
2. Create progress tracking
3. Implement RelationshipMetricsService
4. Implement RelationshipInsightsService
5. Create all interaction routes
6. Add value contradiction detection

### Week 9-10: Phase 4 (AI Chat)
1. Implement EnhancedChatService
2. Create ContextBuilder
3. Implement ToughLoveEngine
4. Create prompt templates
5. Create all chat routes (including 2 new)
6. Add SSE streaming support

### Week 11-12: Phase 5 (Analytics)
1. Implement AnalyticsService
2. Create AccountabilityEngine
3. Add drift monitoring endpoints
4. Create analytics routes
5. Implement pattern detection

### Week 13: Phase 6 (Polish)
1. Implement ExportService
2. Create EventService
3. Production readiness audit
4. Security hardening
5. API documentation

---

## 7. Success Criteria

### 7.1 Coverage Metrics

| Metric | Target | Current Gap |
|--------|--------|-------------|
| API Endpoint Coverage | 100% | 9 endpoints missing |
| Database Table Coverage | 100% | 3 services missing |
| User Story Coverage | 100% | Already at 100% |
| Test Coverage | 80% | TBD |

### 7.2 Performance Metrics

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 200ms |
| Chat Response Time | < 3s |
| Vector Search Time | < 100ms |
| Error Rate | < 0.1% |

### 7.3 Quality Metrics

| Metric | Target |
|--------|--------|
| User Data Isolation | 100% |
| Security Vulnerabilities | 0 Critical/High |
| Type Coverage | 100% |
| Zod Validation Coverage | 100% |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-30 | Hive Mind Swarm | Initial priority matrix from consolidated agent findings |
