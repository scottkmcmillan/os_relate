# PKA-Relate Data Models

**Version:** 1.0.0
**Date:** 2025-12-30
**Status:** Complete - Ready for Implementation

## Overview

This directory contains the complete data model schema for **PKA-Relate**, a personal relationship and knowledge management application adapted from the **PKA-STRAT** strategic alignment platform.

## Files

### 1. `data_models_schema.ts`
Complete TypeScript interface definitions for all data models.

**Contents:**
- 25 core entity interfaces
- Type definitions and enums
- JSDoc comments for all fields
- Vector embedding support
- Graph integration types

**Usage:**
```typescript
import {
  User,
  SubSystem,
  Interaction,
  RelationshipMetrics
} from './data_models_schema';
```

### 2. `DATA_MODEL_DESIGN.md`
Comprehensive design documentation explaining the architecture, adaptations from PKA-STRAT, and implementation guidance.

**Contents:**
- Architecture overview
- Entity adaptation explanations
- Vector embedding strategy
- Graph database integration
- API endpoint mapping
- Migration guide from PKA-STRAT

**Key Sections:**
- Pyramid → SubSystem transformation
- AlignmentScore → GrowthMetrics adaptation
- DriftAlert → RelationshipInsight evolution
- ProvenanceChain → ValueAlignment mapping

### 3. `database_schema.sql`
Production-ready PostgreSQL schema with pgvector extension.

**Contents:**
- 25+ tables with constraints
- Vector similarity indexes (ivfflat)
- Full-text search indexes (tsvector)
- Automatic triggers for denormalized counts
- Default data seed functions
- Materialized views for common queries

**Features:**
- ✅ PostgreSQL 14+ compatible
- ✅ pgvector extension for embeddings
- ✅ Optimized indexes for mobile queries
- ✅ Foreign key constraints with cascades
- ✅ Check constraints for data integrity
- ✅ Automatic timestamp updates

## Quick Start

### 1. Database Setup

```bash
# Create database
createdb pka_relate

# Enable extensions
psql pka_relate -c "CREATE EXTENSION vector;"

# Run schema
psql pka_relate -f database_schema.sql
```

### 2. Initialize User

```sql
-- Create user
INSERT INTO users (name, email)
VALUES ('John Doe', 'john@example.com')
RETURNING id;

-- Seed default sub-systems
SELECT seed_default_subsystems('user-id-here');

-- Create default settings
INSERT INTO user_settings (user_id)
VALUES ('user-id-here');
```

### 3. TypeScript Integration

```typescript
import { Pool } from 'pg';
import { User, SubSystem } from './data_models_schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Query with type safety
const user = await pool.query<User>(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
```

## Key Adaptations from PKA-STRAT

### 1. Hierarchical → Graph-Based

**PKA-STRAT:**
- 8-level pyramid (Mission → Tasks)
- Strict parent-child relationships
- Organizational structure

**PKA-Relate:**
- 3-level hierarchy (Values → Systems → Content)
- Free-form graph connections
- Personal knowledge organization

### 2. Strategic Alignment → Personal Growth

**PKA-STRAT:**
- Mission alignment scoring
- Organizational drift detection
- Document provenance

**PKA-Relate:**
- Value alignment tracking
- Relationship quality metrics
- Interaction-based insights

### 3. Enterprise Scale → Mobile-First

**PKA-STRAT:**
- Multi-tenant architecture
- Role-based access control
- Complex organizational hierarchies

**PKA-Relate:**
- Single-user architecture
- On-device processing option
- Optimized for mobile performance

## Architecture Highlights

### Vector Embeddings
All key entities support semantic search:
- `core_values.embedding` (1536 dimensions)
- `sub_systems.embedding` (1536 dimensions)
- `content_items.embedding` (1536 dimensions)
- `interactions.embedding` (1536 dimensions)

### Graph Relationships
Knowledge graph visualization:
- `sub_systems` → nodes
- `system_links` → edges
- `graph_nodes` → unified graph view
- `graph_edges` → relationships

### Denormalized Counts
Optimized for mobile queries:
- `sub_systems.item_count` (auto-updated)
- `conversations.message_count` (auto-updated)
- `core_values.reference_count` (manual update)

## Entity Overview

### Core Entities (16)
1. **User** - Account identity
2. **UserSession** - Multi-device sessions
3. **PsychologicalProfile** - Self-awareness traits
4. **CoreValue** - Personal mission/vision
5. **Mentor** - Guidance sources
6. **FocusArea** - Growth goals
7. **FocusAreaProgress** - Goal checkpoints
8. **SubSystem** - Knowledge domains
9. **SystemLink** - Domain connections
10. **ContentItem** - Knowledge base
11. **Interaction** - Relationship events
12. **RelationshipMetrics** - Quality scores
13. **RelationshipInsight** - AI insights
14. **Conversation** - Chat threads
15. **ChatMessage** - AI messages
16. **UpcomingEvent** - Calendar events

### Supporting Entities (9)
17. **UserSettings** - Preferences
18. **WeeklySummary** - Analytics
19. **AccountabilityAlert** - Nudges
20. **ValueAlignment** - Action tracking
21. **GraphNode** - Graph visualization
22. **GraphEdge** - Graph connections
23. **MemoryEntry** - Semantic memory
24. **DataExportRequest** - GDPR compliance

## Vector Search Examples

### 1. Find Related Content
```sql
SELECT id, title, 1 - (embedding <=> $1) as similarity
FROM content_items
WHERE system_id = ANY($2)
ORDER BY embedding <=> $1
LIMIT 5;
```

### 2. Value Alignment Scoring
```sql
SELECT
  v.value,
  1 - (i.embedding <=> v.embedding) as alignment_score
FROM core_values v
CROSS JOIN interactions i
WHERE i.id = $1 AND v.user_id = $2
ORDER BY alignment_score DESC;
```

### 3. Relationship Pattern Detection
```sql
SELECT id, summary, date
FROM interactions
WHERE person = $1
ORDER BY embedding <=> $2
LIMIT 10;
```

## Graph Query Examples

### 1. Knowledge Graph Traversal
```sql
WITH RECURSIVE connected_systems AS (
  SELECT id, name, 0 as depth
  FROM sub_systems
  WHERE id = $1

  UNION ALL

  SELECT s.id, s.name, cs.depth + 1
  FROM sub_systems s
  JOIN system_links sl ON (sl.source_system_id = s.id OR sl.target_system_id = s.id)
  JOIN connected_systems cs ON (sl.source_system_id = cs.id OR sl.target_system_id = cs.id)
  WHERE cs.depth < 3
)
SELECT * FROM connected_systems;
```

### 2. Value Alignment Path
```sql
SELECT
  i.id,
  i.person,
  i.summary,
  va.alignment_score,
  cv.value
FROM interactions i
JOIN value_alignments va ON va.interaction_id = i.id
JOIN core_values cv ON cv.id = va.value_id
WHERE i.user_id = $1
ORDER BY va.alignment_score DESC;
```

## Performance Considerations

### Indexes
- **Vector indexes:** ivfflat with lists=10-100 (depends on data size)
- **B-tree indexes:** All foreign keys and frequently queried columns
- **GIN indexes:** Arrays and JSONB fields
- **Full-text:** tsvector for content search

### Query Optimization
- Use `LIMIT` for mobile pagination
- Denormalized counts avoid expensive aggregations
- Materialized views for complex analytics
- Partial indexes for common filters (e.g., `WHERE completed = false`)

### Mobile Optimizations
- Lazy load old interactions (paginate by date)
- Cache sub-systems client-side
- Use connection pooling
- Enable prepared statement caching

## Migration from PKA-STRAT

### Reusable Backend Components
✅ Vector database integration
✅ UnifiedMemory service
✅ GraphStore service
✅ Document ingestion pipeline
✅ Embedding generation

### New Backend Components
❌ Relationship metrics calculation
❌ Interaction pattern detection
❌ Value alignment scoring
❌ Mobile-optimized API endpoints

### Reusable Frontend Components
✅ TanStack Query hooks
✅ Semantic search UI
✅ Graph visualization
⚠️ Dashboard charts (modify metrics)

### New Frontend Components
❌ Mobile navigation (bottom tabs)
❌ Interaction logging flow
❌ Focus area tracking UI
❌ Psychological profile onboarding

## Next Steps

### Phase 1: Backend Setup ✅
- [x] Design data models
- [x] Create database schema
- [x] Document architecture

### Phase 2: API Implementation
- [ ] REST endpoints
- [ ] Authentication middleware
- [ ] Vector search integration
- [ ] Graph query endpoints

### Phase 3: Frontend Development
- [ ] React Native setup
- [ ] TanStack Query hooks
- [ ] Mobile navigation
- [ ] Offline support

### Phase 4: AI Integration
- [ ] Embedding generation
- [ ] RAG chat implementation
- [ ] Insight generation
- [ ] Alignment scoring

## Additional Resources

### Documentation
- **PKA-STRAT API Spec:** `../PKA backend platform/specs/backend/api_specification.md`
- **Frontend Spec:** `../FRONTEND_SPECIFICATION.md`
- **Tech Guidance:** `../agentic_tech_guidancereport.md`

### Tools & Libraries
- **PostgreSQL + pgvector:** Vector similarity search
- **TypeScript:** Type-safe API development
- **TanStack Query:** React server state management
- **React Native:** Mobile frontend
- **OpenAI Embeddings:** Text embeddings for semantic search

---

**Contributors:**
System Architect Agent (Hive Mind Collective)

**License:**
Proprietary - PKA-Relate Project

**Last Updated:**
2025-12-30
