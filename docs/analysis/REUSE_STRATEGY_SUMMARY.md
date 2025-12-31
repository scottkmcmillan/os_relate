# PKA-STRAT to PKA-Relate: Reuse Strategy Summary

**Quick Reference Guide for Development Team**

---

## TL;DR

✅ **Reuse 45%** of PKA-STRAT codebase
🔧 **Modify 35%** of existing components
➕ **Build 20%** new features

**Estimated Timeline**: 20 weeks (1 developer) or 10 weeks (2 developers)

---

## What to Reuse Directly (No Changes)

### Infrastructure (Copy & Use)
```
src/memory/                    → RuVector vector database
src/memory/cognitive.ts        → SONA learning engine
src/memory/graphStore.ts       → SQLite graph database
src/ingestion/                 → Document processing pipeline
src/embedding.ts               → Embedding generation
src/mcp/server.ts              → MCP integration
src/tools/router.ts            → Semantic query routing
```

### API Patterns
- JWT authentication (`/auth/login`, `/auth/logout`, `/auth/refresh`)
- WebSocket real-time updates
- File upload with Multer
- Pagination and filtering

---

## What to Modify

### Critical Transformations

#### 1. Data Model: Hierarchy → Graph
**Before (PKA-STRAT)**:
```typescript
interface PyramidEntity {
  level: 'mission' | 'vision' | ... | 'task';  // 8 levels
  parentId: string;  // Tree structure
  organizationId: string;  // Multi-tenant
}
```

**After (PKA-Relate)**:
```typescript
interface SubSystem {
  name: 'General' | 'Dating' | 'Masculinity' | 'Femininity' | 'Management';
  linked_system_ids: string[];  // Graph structure
  userId: string;  // Single-user
}
```

#### 2. API Routes: Remove Hierarchy
**Before**: `GET /pyramid/{level}/{id}`
**After**: `GET /systems/{id}`

**Before**: `POST /pyramid/{level}`
**After**: `POST /systems`

#### 3. Database: PostgreSQL → SQLite
- Convert schemas to SQLite syntax
- Remove multi-tenancy tables (`organizations`, `teams`)
- Simplify to single `users` table

---

## What to Build New

### High Priority (Core Features)

1. **AI Chat with RAG**
   - Endpoint: `POST /conversations/{id}/messages`
   - LLM integration (OpenAI/Anthropic)
   - Source attribution using existing provenance logic
   - Tough love mode toggle

2. **Interaction Logging**
   - Multi-step modal flow
   - Endpoints: `POST /interactions`, `GET /interactions/stats`
   - Emotion tagging system
   - Outcome categorization

3. **Psychological Profile**
   - Attachment style tracking
   - Communication style analysis
   - Conflict pattern detection
   - CRUD endpoints: `/users/me/psychological-profile`

4. **Focus Areas & Progress**
   - Streak tracking
   - Weekly change calculations
   - Endpoints: `/users/me/focus-areas`, `/analytics/focus-progress`

### Medium Priority

5. **Knowledge Graph Visualization**
   - Endpoint: `GET /systems/graph`
   - Returns node-link data for D3.js/Cytoscape.js

6. **Core Values Management**
   - Primary/Secondary/Aspirational categories
   - CRUD: `/users/me/values`

7. **Events & Reminders**
   - Upcoming events scheduling
   - Preparation notes
   - Endpoints: `/events`, `/events/upcoming`

---

## Critical Architectural Decisions

### ✅ APPROVED DECISIONS

| Decision | Rationale |
|----------|-----------|
| **SQLite over PostgreSQL** | Single-user app, local-first privacy |
| **Remove multi-tenancy** | Replace `organizationId` with `userId` |
| **Graph structure** | Use `system_links` table instead of `parentId` tree |
| **Enable SONA/GNN** | Personalized search improves over time |
| **Reuse provenance** | Transform to chat source attribution |
| **New metrics engine** | Build `InteractionAnalyzer` (don't repurpose alignment) |

### 🚧 SCHEMA CHANGES REQUIRED

```sql
-- Remove these PKA-STRAT tables
DROP TABLE organizations;
DROP TABLE teams;
DROP TABLE pyramid_entities;

-- Add these PKA-Relate tables
CREATE TABLE sub_systems (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT CHECK(name IN ('General', 'Dating', 'Masculinity', 'Femininity', 'Management')),
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE system_links (
  id UUID PRIMARY KEY,
  source_system_id UUID REFERENCES sub_systems(id),
  target_system_id UUID REFERENCES sub_systems(id),
  strength FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ
);

CREATE TABLE content_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  system_id UUID REFERENCES sub_systems(id),
  type TEXT CHECK(type IN ('note', 'article', 'book', 'video', 'podcast')),
  title TEXT,
  content TEXT,
  url TEXT,
  highlights TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type TEXT CHECK(type IN ('conversation', 'date', 'conflict', 'milestone', 'observation')),
  person TEXT,
  summary TEXT,
  outcome TEXT CHECK(outcome IN ('positive', 'neutral', 'negative', 'mixed')),
  emotions TEXT[],
  learnings TEXT,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);

CREATE TABLE psychological_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE,
  attachment_style TEXT CHECK(attachment_style IN ('Secure', 'Anxious', 'Avoidant', 'Disorganized')),
  communication_style TEXT CHECK(communication_style IN ('Direct', 'Indirect', 'Assertive', 'Passive')),
  conflict_pattern TEXT,
  updated_at TIMESTAMPTZ
);

CREATE TABLE focus_areas (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  progress INT CHECK(progress >= 0 AND progress <= 100),
  streak INT DEFAULT 0,
  weekly_change FLOAT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## API Endpoint Migration Map

### Authentication (✅ Reuse)
- `POST /auth/login` → No change
- `POST /auth/logout` → No change
- `POST /auth/refresh` → No change
- `POST /auth/signup` → ➕ Add new
- `GET /auth/me` → ➕ Add new

### Core Entities (🔧 Modify)
- `GET /pyramid` → `GET /systems`
- `GET /pyramid/{level}/{id}` → `GET /systems/{id}`
- `POST /pyramid/{level}` → `POST /systems`
- `GET /pyramid/{level}/{id}/children` → `GET /systems/{id}/items`
- `POST /pyramid/link` → `POST /systems/{id}/link/{targetId}`

### Documents (🔧 Rename)
- `GET /documents` → `GET /content-items`
- `POST /documents` → `POST /systems/{id}/items`
- `DELETE /documents/{id}` → `DELETE /content-items/{id}`

### Strategic → Personal (🔧 Transform)
- `GET /alignment/scores` → `GET /analytics/focus-progress`
- `GET /alignment/drift` → `GET /analytics/interaction-patterns`
- `GET /dashboards/leader` → `GET /analytics/weekly-summary`

### New Endpoints (➕ Build)
- `POST /interactions` - Log relationship interaction
- `GET /interactions/stats` - Weekly/monthly stats
- `POST /conversations` - Start AI chat
- `POST /conversations/{id}/messages` - Send message, get AI response
- `GET /users/me/psychological-profile` - Psychological traits
- `GET /users/me/values` - Core values
- `GET /users/me/focus-areas` - Focus areas with progress
- `GET /events/upcoming` - Next 7 days
- `POST /export/data` - Full data export

---

## Development Workflow

### Phase 1: Foundation (Week 1-2)
1. Fork PKA-STRAT repository
2. Remove multi-tenant code
3. Convert PostgreSQL → SQLite schemas
4. Test RuVector integration

### Phase 2: Core Transformation (Week 3-6)
5. Implement new data models (systems, content, interactions)
6. Modify API routes
7. Build authentication with signup
8. Test document ingestion with new schema

### Phase 3: New Features (Week 7-14)
9. Build interaction logging system
10. Implement AI chat with RAG
11. Add psychological profile management
12. Create focus area tracking
13. Build analytics endpoints

### Phase 4: Polish (Week 15-20)
14. Knowledge graph visualization
15. Events & reminders
16. Data export
17. Testing & bug fixes
18. Documentation

---

## Testing Strategy

### What to Test from PKA-STRAT
- ✅ RuVector vector search (should work as-is)
- ✅ Document ingestion (should work with new schema)
- ✅ Graph traversal (should work with system_links)
- ⚠️ Alignment calculation (needs new tests for interaction metrics)

### New Tests Required
- Interaction logging multi-step validation
- AI chat source attribution
- Focus area streak calculation
- Psychological profile CRUD
- Graph visualization data format
- Data export completeness

---

## Key Files to Review

### Start Here (Essential Reading)
```
/docs/v2_PKA/PKA-relate/FRONTEND_SPECIFICATION.md  → Target requirements
/docs/v2_PKA/PKA backend platform/specs/backend/api_specification.md  → Source API
/src/pka/types.ts  → PKA-STRAT data models
/src/memory/index.ts  → RuVector integration
/ARCHITECTURE.md  → System overview
```

### Critical Source Files
```
/src/pka/alignment/calculator.ts  → Repurpose for interaction metrics
/src/pka/alignment/drift-detector.ts  → Repurpose for pattern detection
/src/memory/cognitive.ts  → SONA learning (reuse as-is)
/src/ingestion/parser.ts  → Document parsing (reuse as-is)
/src/api/routes/documents.ts  → File upload pattern (reuse)
```

---

## Success Metrics

### Technical KPIs
- [ ] All 5 sub-systems seedable on signup
- [ ] Content items searchable with SONA learning
- [ ] AI chat responds with source citations
- [ ] Focus area streaks calculate correctly
- [ ] Weekly analytics aggregate accurately
- [ ] Data export includes all user data

### Performance Targets
- Initial load: < 2s on 4G
- AI chat response: < 3s
- Interaction logging: < 500ms
- Search results: < 300ms

---

## Common Pitfalls to Avoid

❌ **Don't** try to preserve PKA-STRAT's 8-level hierarchy
✅ **Do** flatten to 2-level structure (systems → items)

❌ **Don't** keep `organizationId` foreign keys
✅ **Do** replace with `userId` everywhere

❌ **Don't** reuse alignment calculator directly for relationships
✅ **Do** build new `InteractionAnalyzer` using alignment patterns

❌ **Don't** expose internal vector/chunk data to frontend
✅ **Do** abstract behind clean API (search, chat, analytics)

❌ **Don't** require PostgreSQL setup
✅ **Do** use SQLite for simplicity

---

## Questions? Refer to Full Analysis

**Full Document**: `/docs/analysis/PKA_ARCHITECTURAL_MAPPING_ANALYSIS.md`

**Sections**:
1. Component Reuse Analysis (detailed table)
2. Data Model Transformation (full schemas)
3. API Endpoint Mapping (complete list)
4. Critical Architectural Decisions (rationale)
5. Implementation Roadmap (week-by-week)
6. Effort Breakdown (100 person-days estimate)

---

**Last Updated**: 2025-12-30
**Status**: Research Complete ✅
**Next Step**: Schema Design & API Contract Definition
