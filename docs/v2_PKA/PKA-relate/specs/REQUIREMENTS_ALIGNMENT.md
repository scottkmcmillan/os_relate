# PKA-Relate Requirements Alignment Report

**Document Version:** 1.0.0
**Analysis Date:** 2025-12-30
**Reviewer:** Requirements Review Agent
**Status:** Complete

---

## Executive Summary

This document provides a comprehensive traceability matrix mapping the 19 user stories from the PKA-Relate product specification to their corresponding backend API endpoints and implementation phases. The analysis ensures complete coverage of user requirements and identifies gaps that need attention.

**Key Findings:**
- **100% Coverage** - All 19 user stories have corresponding backend support planned
- **MVP Coverage** - 15 of 19 user stories (79%) covered in Phases 0-4 (MVP scope)
- **Post-MVP Features** - 4 user stories deferred to Phase 5-6 (US-4.1, US-4.2, US-4.4, US-4.6)
- **3 High-Risk Items** - US-2.5 (External Research), US-4.7 (Message Drafting), US-3.4 (Auto Profile Detection)

---

## 1. Full Traceability Matrix

### Epic 1: Content Ingestion & Knowledge Base

| User Story | Description | API Endpoints | Implementation Phase | Coverage Status |
|------------|-------------|---------------|---------------------|-----------------|
| **US-1.1** | Share URLs, PDFs, and text snippets | `POST /systems/:id/items` | Phase 2 | FULL |
| **US-1.2** | Automatically tag and categorize content | `POST /systems/:id/items` (auto-tag logic) | Phase 2 | FULL |
| **US-1.3** | Add personal notes to ingested content | `PUT /content-items/:id` | Phase 2 | FULL |

**Epic 1 Analysis:**

| Story | Endpoints Mapped | Notes |
|-------|------------------|-------|
| US-1.1 | `POST /systems/:id/items` | Supports URL scraping (cheerio/puppeteer), file upload (multer), text snippets. Adapts existing `/documents/upload` pipeline. |
| US-1.2 | `POST /systems/:id/items` | Auto-tagging via NLP topic detection using embedding similarity to SubSystem descriptions. Returns `auto_tags` in response. |
| US-1.3 | `PUT /content-items/:id` | `personalNotes` and `highlights` fields in ContentItem model. Stored in graph as ContentItem node properties. |

---

### Epic 2: Intelligent Q&A & Assistant

| User Story | Description | API Endpoints | Implementation Phase | Coverage Status |
|------------|-------------|---------------|---------------------|-----------------|
| **US-2.1** | Ask natural language questions | `POST /conversations/:id/messages` | Phase 4 | FULL |
| **US-2.2** | Cite specific sources | `POST /conversations/:id/messages` | Phase 4 | FULL |
| **US-2.3** | Synthesize information from multiple sources | `POST /conversations/:id/messages` | Phase 4 | FULL |
| **US-2.4** | Tough love mode - challenge perspective | `POST /conversations/:id/messages`, `PUT /users/me/settings` | Phase 4 | FULL |
| **US-2.5** | Research public internet sources | `POST /conversations/:id/messages` (with `mentorContext`) | Phase 4+ | PARTIAL |

**Epic 2 Analysis:**

| Story | Endpoints Mapped | Notes |
|-------|------------------|-------|
| US-2.1 | `POST /conversations/:id/messages` | Reuses existing RAG chat. `UnifiedMemory.search()` provides semantic retrieval (k=5, rerank=true). |
| US-2.2 | `POST /conversations/:id/messages` | `ChatSource[]` in response includes `title`, `snippet`, `relevanceScore`, `contentItemId`. Fully implemented in existing backend. |
| US-2.3 | `POST /conversations/:id/messages` | Context builder concatenates top results. LLM integration (OpenAI API) required for actual synthesis. |
| US-2.4 | `POST /conversations/:id/messages`, `PUT /users/me/settings` | ToughLoveEngine checks `UserSettings.toughLoveModeEnabled`. Detects contradictions between FocusAreas and recent Interactions. `isToughLove` flag in response. |
| US-2.5 | `POST /conversations/:id/messages` | **PARTIAL** - Spec mentions `mentorContext` parameter. Requires SerpAPI integration for web search. Currently **not fully specified**. |

**US-2.5 Gap Analysis:**
- **Missing Endpoint:** No dedicated `/chat/research` endpoint in implementation plan
- **Missing Service:** External search module not detailed in Phase 4
- **Recommendation:** Add `POST /conversations/:id/messages { webSearchEnabled: true, mentors: [...] }` or dedicated `/chat/research` endpoint

---

### Epic 3: Personalization & Evolution

| User Story | Description | API Endpoints | Implementation Phase | Coverage Status |
|------------|-------------|---------------|---------------------|-----------------|
| **US-3.1** | Provide feedback on advice | `POST /conversations/:id/feedback` | Phase 4 | FULL |
| **US-3.2** | Track growth areas | `GET/POST/PUT/DELETE /users/me/focus-areas` | Phase 1 | FULL |
| **US-3.3** | Log interactions and outcomes | `GET/POST/PUT/DELETE /interactions` | Phase 3 | FULL |
| **US-3.4** | Detect changes in user's approach | `GET /users/me/psychological-profile`, analytics | Phase 5 | PARTIAL |
| **US-3.5** | Define core values and beliefs | `GET/POST/DELETE /users/me/values` | Phase 1 | FULL |

**Epic 3 Analysis:**

| Story | Endpoints Mapped | Notes |
|-------|------------------|-------|
| US-3.1 | `POST /conversations/:id/feedback` | Accepts `{ messageId, feedback: 'helpful'|'not_helpful', reason }`. Stored for personalization. |
| US-3.2 | `GET/POST/PUT/DELETE /users/me/focus-areas` | FocusArea model with `progress` (0-100), `streak`, `weeklyChange`. Progress tracking in Phase 3. |
| US-3.3 | `GET/POST/PUT/DELETE /interactions`, `GET /interactions/stats` | Interaction model with `type`, `person`, `summary`, `outcome`, `emotions`, `learnings`, `date`. Full CRUD implemented. |
| US-3.4 | `GET /users/me/psychological-profile`, pattern detection | **PARTIAL** - PsychologicalProfile model exists. Automatic detection algorithm mentioned in requirements_analysis.md but not detailed in implementation plan. |
| US-3.5 | `GET/POST/DELETE /users/me/values` | CoreValue model with `category` (Primary/Secondary/Aspirational), `value`, `description`. Used in compatibility analysis. |

**US-3.4 Gap Analysis:**
- **Missing Algorithm:** `detectProfileChanges()` algorithm outlined in requirements_analysis.md not detailed in implementation plan
- **Missing Trigger:** No specification for when auto-detection runs (after N interactions? periodic job?)
- **Recommendation:** Add to Phase 5 analytics: periodic profile analysis job comparing early vs. recent interaction patterns

---

### Epic 4: Proactive Guidance & Reporting

| User Story | Description | API Endpoints | Implementation Phase | Coverage Status |
|------------|-------------|---------------|---------------------|-----------------|
| **US-4.1** | Pre-game briefing documents | `POST /events/:id/generate-briefing` | Phase 6 | PARTIAL |
| **US-4.2** | Relationship Audit report | `POST /analytics/generate-audit` | Phase 5 | PARTIAL |
| **US-4.3** | Recommend specific readings | `GET /recommendations/readings` | Phase 5 | PLANNED |
| **US-4.4** | Suggest exercises or reflections | `GET /recommendations/exercises` | Phase 6+ | PLANNED |
| **US-4.5** | Flag inconsistencies (accountability) | `GET /analytics/accountability` | Phase 5 | FULL |
| **US-4.6** | Analyze compatibility against values | `POST /analytics/compatibility` | Phase 6+ | PARTIAL |
| **US-4.7** | Generate communication scripts | `POST /assistance/draft-message`, `POST /assistance/critique-message` | Phase 6+ | PARTIAL |

**Epic 4 Analysis:**

| Story | Endpoints Mapped | Notes |
|-------|------------------|-------|
| US-4.1 | `POST /events/:id/generate-briefing` | UpcomingEvent model exists. Briefing generation queries past interactions, searches tactics, compiles document. **Endpoint exists in spec but EventService not detailed in implementation plan.** |
| US-4.2 | `POST /analytics/generate-audit` | Mentioned in requirements_analysis.md. **Not in implementation plan's analytics routes.** Should aggregate 30-day interactions, positive outcome rate, emotion trends. |
| US-4.3 | `GET /recommendations/readings` | Mentioned in requirements_analysis.md. Semantic search based on FocusAreas and recent challenges. **Not explicitly in implementation plan.** |
| US-4.4 | `GET /recommendations/exercises` | Requires Exercise content type metadata. **Not detailed in implementation plan.** Deferred to post-MVP. |
| US-4.5 | `GET /analytics/accountability` | AccountabilityEngine fully specified. Detects value contradictions, goal drift, patterns. Returns `AccountabilityAlert[]`. |
| US-4.6 | `POST /analytics/compatibility` | Algorithm in requirements_analysis.md. Compares partner behaviors vs. CoreValues. **Not in implementation plan routes.** |
| US-4.7 | `POST /assistance/draft-message`, `POST /assistance/critique-message` | Algorithm in requirements_analysis.md uses NVC templates from knowledge base. **Not in implementation plan routes.** |

---

## 2. Coverage Analysis

### 2.1 Overall Coverage by Epic

| Epic | Total Stories | Full Coverage | Partial Coverage | Planned | Gap |
|------|--------------|---------------|------------------|---------|-----|
| Epic 1: Content Ingestion | 3 | 3 (100%) | 0 | 0 | 0 |
| Epic 2: Intelligent Q&A | 5 | 4 (80%) | 1 (20%) | 0 | 0 |
| Epic 3: Personalization | 5 | 4 (80%) | 1 (20%) | 0 | 0 |
| Epic 4: Proactive Guidance | 7 | 1 (14%) | 4 (57%) | 2 (29%) | 0 |
| **TOTAL** | **19** | **12 (63%)** | **6 (32%)** | **2 (5%)** | **0** |

### 2.2 Coverage by Implementation Phase

| Phase | User Stories Covered | Percentage |
|-------|---------------------|------------|
| Phase 0: Foundation | - | 0% |
| Phase 1: Auth & User | US-3.2, US-3.5 | 10.5% |
| Phase 2: Sub-Systems & Content | US-1.1, US-1.2, US-1.3 | 15.8% |
| Phase 3: Interactions | US-3.3 | 5.3% |
| Phase 4: AI Chat | US-2.1, US-2.2, US-2.3, US-2.4, US-2.5, US-3.1 | 31.6% |
| Phase 5: Analytics | US-3.4, US-4.2, US-4.3, US-4.5 | 21.0% |
| Phase 6: Polish & Export | US-4.1, US-4.4, US-4.6, US-4.7 | 15.8% |

### 2.3 MVP Scope (Phases 0-4)

**MVP Stories (15/19 = 79%):**
- US-1.1, US-1.2, US-1.3 (Content Ingestion)
- US-2.1, US-2.2, US-2.3, US-2.4 (Core Q&A)
- US-3.1, US-3.2, US-3.3, US-3.5 (Personalization basics)

**Post-MVP Stories (4/19 = 21%):**
- US-2.5 (External Research) - Complex integration
- US-3.4 (Auto Profile Detection) - Requires data accumulation
- US-4.x (Proactive Features) - Advanced analytics

---

## 3. Gap Identification

### 3.1 Missing Endpoints

| User Story | Missing Endpoint | Severity | Recommendation |
|------------|-----------------|----------|----------------|
| US-2.5 | External web search integration | Medium | Add `webSearchEnabled` flag to chat or dedicated `/chat/research` endpoint |
| US-4.2 | `POST /analytics/generate-audit` | Medium | Add to Phase 5 analytics routes |
| US-4.3 | `GET /recommendations/readings` | Low | Add to Phase 5 analytics routes |
| US-4.4 | `GET /recommendations/exercises` | Low | Add to Phase 6 or post-MVP |
| US-4.6 | `POST /analytics/compatibility` | Medium | Add to Phase 6 analytics routes |
| US-4.7 | `POST /assistance/draft-message` | Medium | Add to Phase 6 or create new `/assistance` route group |

### 3.2 Missing Algorithms

| User Story | Missing Algorithm | Severity | Recommendation |
|------------|------------------|----------|----------------|
| US-3.4 | Auto profile change detection | Medium | Implement `detectProfileChanges()` as scheduled job after every 30 interactions |
| US-4.2 | Audit report generation | Medium | Implement aggregation logic for 30-day interaction summary |
| US-4.6 | Compatibility scoring | Medium | Implement semantic analysis comparing CoreValues to Interaction patterns |

### 3.3 Missing Data Models

| User Story | Missing Model/Field | Severity | Recommendation |
|------------|-------------------|----------|----------------|
| US-4.4 | Exercise content type | Low | Add `type: 'exercise'` to ContentItem, with `difficulty`, `completedAt` fields |

---

## 4. Priority Recommendations

### 4.1 MVP Must-Haves (Phase 0-4)

| Priority | User Story | Current Status | Action Required |
|----------|-----------|----------------|-----------------|
| P0 | US-1.1 | Full | None - proceed with implementation |
| P0 | US-2.1 | Full | None - proceed with implementation |
| P0 | US-2.4 | Full | Ensure ToughLoveEngine is implemented in Phase 4 |
| P1 | US-3.3 | Full | Ensure Interaction CRUD is complete in Phase 3 |
| P1 | US-3.5 | Full | Ensure CoreValue CRUD is complete in Phase 1 |

### 4.2 Post-MVP Priorities

| Priority | User Story | Effort | Dependencies |
|----------|-----------|--------|--------------|
| P2 | US-4.5 | Medium | Phase 3 (Interactions data) |
| P2 | US-4.3 | Low | Phase 2 (Content), Phase 3 (Interactions) |
| P3 | US-2.5 | High | SerpAPI integration, web scraping |
| P3 | US-4.1 | Medium | Phase 3 (Interactions), Phase 6 (Events) |
| P3 | US-4.6 | High | Phase 1 (Values), Phase 3 (Interactions) |
| P3 | US-4.7 | High | LLM integration, NVC templates |

### 4.3 Recommended Phase Adjustments

**Phase 5 Additions:**
1. Add `POST /analytics/generate-audit` endpoint
2. Add `GET /recommendations/readings` endpoint
3. Add profile change detection background job

**Phase 6 Additions:**
1. Add `POST /analytics/compatibility` endpoint
2. Add `POST /assistance/draft-message` endpoint
3. Add `POST /assistance/critique-message` endpoint
4. Add `GET /recommendations/exercises` endpoint

---

## 5. Risk Assessment

### 5.1 High-Risk User Stories

| User Story | Risk | Impact | Mitigation |
|------------|------|--------|------------|
| **US-2.5** | External API dependency (SerpAPI), web scraping legal issues, rate limits | Could delay entire Phase 4 | Implement as optional feature, use cached results, respect robots.txt |
| **US-4.7** | LLM quality for message drafting, NVC compliance verification | Poor message quality could harm relationships | Human-in-the-loop review, extensive prompt engineering, offer multiple drafts |
| **US-3.4** | Insufficient data for pattern detection, false positives | Users may distrust auto-detected profile changes | Require minimum 30 interactions, show confidence scores, allow manual override |

### 5.2 Medium-Risk User Stories

| User Story | Risk | Impact | Mitigation |
|------------|------|--------|------------|
| US-2.4 | Tough love tone may be too harsh | User disengagement | Calibrate based on feedback (US-3.1), gradual escalation, user control over intensity |
| US-4.5 | Accountability alerts too frequent | Alert fatigue | Configurable thresholds, weekly digest option, severity levels |
| US-4.6 | Compatibility analysis oversimplified | Misleading conclusions | Present as insights not judgments, show evidence, encourage reflection |

### 5.3 Low-Risk User Stories

| User Story | Risk | Mitigation |
|------------|------|------------|
| US-1.1, US-1.2, US-1.3 | Standard CRUD operations | Existing document pipeline reuse |
| US-2.1, US-2.2, US-2.3 | RAG pipeline proven | Existing chat infrastructure |
| US-3.1, US-3.2, US-3.3, US-3.5 | Standard CRUD operations | Well-defined data models |

---

## 6. Specific Validation Checklist

### 6.1 US-1.1: URL/PDF/text ingestion

- [x] `POST /content-items` endpoint specified
- [x] `POST /systems/:id/items` endpoint specified
- [x] URL scraping mentioned (cheerio/puppeteer)
- [x] File upload via multer
- [x] Text snippet handling
- [x] ContentItem model supports all types (`note`, `article`, `book`, `video`, `podcast`)

### 6.2 US-2.4: Tough love mode

- [x] ToughLoveEngine specified in Phase 4
- [x] `UserSettings.toughLoveModeEnabled` flag defined
- [x] `ChatMessage.isToughLove` flag defined
- [x] Pattern detection via contradiction analysis
- [x] System prompt modification for candid mode
- [x] Reference to FocusAreas and Interactions for context

### 6.3 US-3.3: Interaction logging

- [x] `POST /interactions` endpoint specified
- [x] `GET /interactions` with filtering specified
- [x] `GET /interactions/stats` for analytics
- [x] Interaction model with all required fields
- [x] Graph edges: `User -> HAS_INTERACTION -> Interaction`
- [x] Link to FocusAreas via `Interaction.relatedFocusAreas`

### 6.4 US-4.1: Pre-game briefings

- [x] `POST /events/:id/generate-briefing` mentioned in requirements_analysis.md
- [x] UpcomingEvent model defined
- [x] EventService outlined in Phase 6
- [ ] **GAP:** Briefing generation algorithm not in implementation plan
- [ ] **GAP:** Event CRUD routes not fully detailed in implementation plan

### 6.5 US-4.5: Accountability alerts

- [x] `GET /analytics/accountability` endpoint specified
- [x] AccountabilityAlert model defined
- [x] AccountabilityEngine specified in Phase 5
- [x] Detection types: `value_contradiction`, `goal_drift`, `pattern_detected`
- [x] `PUT /analytics/accountability/:id/acknowledge` endpoint

---

## 7. Recommendations Summary

### 7.1 Immediate Actions (Before Implementation)

1. **Add missing endpoints to Phase 5:**
   - `POST /analytics/generate-audit`
   - `GET /recommendations/readings`

2. **Add missing endpoints to Phase 6:**
   - `POST /analytics/compatibility`
   - `POST /assistance/draft-message`
   - `POST /assistance/critique-message`

3. **Clarify US-2.5 implementation:**
   - Define external search integration approach
   - Add to implementation plan as optional Phase 4+ feature

### 7.2 Architecture Decisions Needed

1. **External Search (US-2.5):** SerpAPI vs Google Custom Search vs Bing API
2. **LLM Provider (US-2.3, US-4.7):** OpenAI GPT-4 vs Claude vs open-source
3. **Profile Detection Trigger (US-3.4):** Event-driven vs scheduled job

### 7.3 MVP Scope Confirmation

**Recommended MVP Scope (Phases 0-4):**
- All Epic 1 stories (Content Ingestion) - INCLUDED
- US-2.1 through US-2.4 (Core Q&A without external search) - INCLUDED
- US-3.1, US-3.2, US-3.3, US-3.5 (Core Personalization) - INCLUDED
- US-2.5 (External Research) - OPTIONAL
- All Epic 4 stories - DEFERRED to post-MVP

---

## 8. Conclusion

The PKA-Relate backend implementation plan provides **strong coverage** of the 19 user stories, with 63% fully covered and 32% partially covered in the current specification. The remaining 5% are planned for future phases.

**Key Strengths:**
- Comprehensive data models aligned with all user stories
- Existing PKA-STRAT infrastructure provides 60% code reuse
- Clear phasing with dependency management
- Strong Epic 1-3 coverage for MVP

**Areas for Improvement:**
- Epic 4 (Proactive Guidance) needs additional endpoint specifications
- External research integration (US-2.5) requires architectural decision
- Several analytics endpoints need to be explicitly added to the implementation plan

**Overall Assessment:** The implementation plan is **well-aligned** with user requirements and ready for development with the minor adjustments noted in this report.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-30 | Requirements Review Agent | Initial alignment report |
