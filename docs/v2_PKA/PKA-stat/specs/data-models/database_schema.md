# PKA-STRAT Database Schema Specification

## Version: 1.0.0
## Date: 2025-12-28
## Status: Draft

---

## Table of Contents

1. [Overview](#overview)
2. [Entity-Relationship Diagram](#entity-relationship-diagram)
3. [Core Entities](#core-entities)
4. [Pyramid of Clarity Hierarchy](#pyramid-of-clarity-hierarchy)
5. [Document System](#document-system)
6. [Hypergraph Structures](#hypergraph-structures)
7. [Users & Organizations](#users--organizations)
8. [Alignment Metrics](#alignment-metrics)
9. [Market Intelligence](#market-intelligence)
10. [Indexes & Performance](#indexes--performance)
11. [Vector Storage Design](#vector-storage-design)
12. [Temporal Data Handling](#temporal-data-handling)
13. [Multi-Tenant Architecture](#multi-tenant-architecture)
14. [Migration Strategy](#migration-strategy)

---

## Overview

PKA-STRAT database schema implements a hierarchical strategic alignment system based on the Pyramid of Clarity framework, enhanced with semantic vector search (Ruvector), hypergraph relationship modeling, and temporal alignment tracking.

### Key Design Principles

1. **Hierarchical Integrity**: Enforce pyramid structure from Mission → Vision → Objectives → Goals → Portfolios → Programs → Projects → Tasks
2. **Semantic Intelligence**: Vector embeddings for all strategic entities and documents
3. **Graph Relationships**: Hypergraph structure for complex multi-entity relationships
4. **Temporal Tracking**: Complete audit trail and historical alignment snapshots
5. **Multi-Tenancy**: Organization-level isolation with row-level security
6. **Performance**: Optimized for read-heavy workloads with vector similarity search

### Technology Stack

- **Primary Database**: PostgreSQL 15+
- **Vector Extension**: RuVector PostgreSQL extension (77+ SQL functions, SIMD-accelerated)
- **Graph Extension**: Apache AGE (for hypergraph queries)
- **Temporal Extension**: temporal_tables
- **Full-Text Search**: PostgreSQL built-in
- **Connection Pooling**: PgBouncer
- **Replication**: Streaming replication for read replicas

---

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MULTI-TENANT ISOLATION LAYER                         │
│                              (organizations)                                 │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│    USERS     │◄────────►│    TEAMS     │          │  ROLES &     │
│              │          │              │          │  PERMISSIONS │
└──────────────┘          └──────────────┘          └──────────────┘
        │
        │ creates/owns
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PYRAMID OF CLARITY HIERARCHY                            │
│                                                                              │
│  ┌────────────┐                                                             │
│  │  MISSION   │ (1 per org)                                                 │
│  └─────┬──────┘                                                             │
│        │ has_many                                                           │
│        ▼                                                                     │
│  ┌────────────┐                                                             │
│  │   VISION   │ (1-3 per mission)                                           │
│  └─────┬──────┘                                                             │
│        │ has_many                                                           │
│        ▼                                                                     │
│  ┌─────────────────┐                                                        │
│  │   STRATEGIC     │ (3-5 year goals)                                       │
│  │   OBJECTIVES    │                                                        │
│  └─────┬───────────┘                                                        │
│        │ has_many                                                           │
│        ▼                                                                     │
│  ┌────────────┐                                                             │
│  │ GOALS/OKRs │ (quarterly/annual)                                          │
│  └─────┬──────┘                                                             │
│        │ has_many                                                           │
│        ├──────────┬──────────┐                                              │
│        ▼          ▼          ▼                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                    │
│  │PORTFOLIOS│ │ PROGRAMS │ │ PROJECTS │                                    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                                    │
│       │            │            │                                           │
│       └────────────┴────────────┘                                           │
│                    │                                                         │
│                    ▼                                                         │
│              ┌──────────┐                                                   │
│              │  TASKS   │                                                   │
│              └──────────┘                                                   │
│                                                                              │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           │ linked_to
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DOCUMENT SYSTEM                                     │
│                                                                              │
│  ┌────────────┐     chunks_into    ┌──────────────────┐                   │
│  │ DOCUMENTS  │────────────────────►│ DOCUMENT_CHUNKS  │                   │
│  │(raw files) │                     │  (semantic segs) │                   │
│  └────┬───────┘                     └────────┬─────────┘                   │
│       │                                      │                              │
│       │ has_many                             │ has_one                      │
│       ▼                                      ▼                              │
│  ┌──────────────────┐              ┌──────────────────────┐               │
│  │ DOCUMENT_METADATA│              │ DOCUMENT_EMBEDDINGS  │               │
│  │  (type, author,  │              │  (Ruvector vectors)  │               │
│  │  classification) │              │                      │               │
│  └──────────────────┘              └──────────────────────┘               │
│                                                                              │
│  ┌────────────┐                                                             │
│  │  STORIES   │ (extracted narratives from execution docs)                 │
│  │            │                                                             │
│  └────────────┘                                                             │
│                                                                              │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           │ represented_in
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HYPERGRAPH STRUCTURES                                   │
│                         (Ruvector Engine)                                    │
│                                                                              │
│  ┌────────────┐     participates_in    ┌──────────────┐                   │
│  │   NODES    │◄───────────────────────►│  HYPEREDGES  │                   │
│  │ (entities) │                         │ (multi-rel)  │                   │
│  └────────────┘                         └──────┬───────┘                   │
│                                                │                            │
│                                                │ has_many                   │
│                                                ▼                            │
│                                        ┌──────────────────┐                │
│                                        │  EDGE_WEIGHTS    │                │
│                                        │(alignment scores)│                │
│                                        └──────────────────┘                │
│                                                                              │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           │ measures
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ALIGNMENT METRICS                                     │
│                                                                              │
│  ┌──────────────────┐    ┌─────────────────────┐    ┌─────────────────┐  │
│  │ ALIGNMENT_SCORES │    │ MISSION_DRIFT_ALERTS│    │    L_SCORES     │  │
│  │ (per entity)     │    │  (threshold alerts) │    │  (provenance)   │  │
│  └──────────────────┘    └─────────────────────┘    └─────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────┐                                          │
│  │ ALIGNMENT_HISTORY_SNAPSHOTS  │ (temporal tracking)                      │
│  └──────────────────────────────┘                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      MARKET INTELLIGENCE                                     │
│                                                                              │
│  ┌────────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │ COMPETITIVE_ANALYSIS│  │  MARKET_SIGNALS  │  │ STRATEGIC_SIMULATIONS │  │
│  │                    │  │                  │  │                       │  │
│  └────────────────────┘  └──────────────────┘  └───────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Entities

### Design Patterns Used

1. **Single Table Inheritance**: Pyramid hierarchy shares base attributes
2. **Adjacency List**: Parent-child relationships within pyramid
3. **Closure Table**: Fast ancestor/descendant queries
4. **Materialized Path**: Efficient hierarchy traversal
5. **Temporal Tables**: Complete change history
6. **Soft Deletes**: Logical deletion with audit trail

---

## Pyramid of Clarity Hierarchy

### 1. Base Hierarchy Table

All pyramid entities inherit from this base structure.

```sql
-- Base table for all pyramid entities
CREATE TABLE pyramid_entities (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Polymorphic type
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
        'mission', 'vision', 'strategic_objective', 'goal',
        'portfolio', 'program', 'project', 'task'
    )),

    -- Hierarchy structure (adjacency list)
    parent_id UUID REFERENCES pyramid_entities(id) ON DELETE CASCADE,

    -- Materialized path for efficient queries (e.g., "/mission/vision/objective")
    path LTREE NOT NULL,

    -- Core attributes
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Ownership & accountability
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

    -- Status tracking
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'proposed', 'active', 'on_hold', 'completed',
        'cancelled', 'archived'
    )),

    -- Temporal tracking
    start_date DATE,
    target_date DATE,
    completed_date DATE,

    -- Vector embedding for semantic search
    embedding vector(1536), -- OpenAI ada-002 dimension

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Version control
    version INTEGER DEFAULT 1,

    CONSTRAINT valid_hierarchy CHECK (
        (entity_type = 'mission' AND parent_id IS NULL) OR
        (entity_type != 'mission' AND parent_id IS NOT NULL)
    )
);

-- Enable row-level security
ALTER TABLE pyramid_entities ENABLE ROW LEVEL SECURITY;

-- Index for multi-tenant queries
CREATE INDEX idx_pyramid_entities_org ON pyramid_entities(organization_id)
    WHERE deleted_at IS NULL;

-- Index for hierarchy queries
CREATE INDEX idx_pyramid_entities_parent ON pyramid_entities(parent_id)
    WHERE deleted_at IS NULL;

-- GiST index for path queries
CREATE INDEX idx_pyramid_entities_path ON pyramid_entities USING GIST(path);

-- Vector similarity index
CREATE INDEX idx_pyramid_entities_embedding ON pyramid_entities
    USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search index
CREATE INDEX idx_pyramid_entities_fulltext ON pyramid_entities
    USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Composite index for common queries
CREATE INDEX idx_pyramid_entities_type_status ON pyramid_entities(
    organization_id, entity_type, status
) WHERE deleted_at IS NULL;
```

### 2. Closure Table for Hierarchy

Efficiently query all ancestors/descendants.

```sql
CREATE TABLE pyramid_hierarchy_closure (
    ancestor_id UUID NOT NULL REFERENCES pyramid_entities(id) ON DELETE CASCADE,
    descendant_id UUID NOT NULL REFERENCES pyramid_entities(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL CHECK (depth >= 0),

    PRIMARY KEY (ancestor_id, descendant_id),

    -- Self-referential check
    CONSTRAINT different_nodes CHECK (
        depth > 0 OR ancestor_id = descendant_id
    )
);

-- Indexes for fast ancestor/descendant lookups
CREATE INDEX idx_closure_ancestor ON pyramid_hierarchy_closure(ancestor_id, depth);
CREATE INDEX idx_closure_descendant ON pyramid_hierarchy_closure(descendant_id, depth);
```

### 3. Mission Table

Top of the pyramid - one per organization.

```sql
CREATE TABLE missions (
    id UUID PRIMARY KEY REFERENCES pyramid_entities(id) ON DELETE CASCADE,

    -- Mission-specific fields
    purpose TEXT NOT NULL,
    core_values TEXT[],

    -- Strategic timeframe
    horizon_years INTEGER DEFAULT 10 CHECK (horizon_years > 0),

    -- Alignment baseline
    baseline_alignment_score DECIMAL(5,2) CHECK (
        baseline_alignment_score >= 0 AND baseline_alignment_score <= 100
    ),

    CONSTRAINT one_mission_per_org UNIQUE (id)
        -- Enforced by app logic and triggers
);
```

### 4. Vision Table

Strategic direction supporting the mission.

```sql
CREATE TABLE visions (
    id UUID PRIMARY KEY REFERENCES pyramid_entities(id) ON DELETE CASCADE,

    -- Vision-specific fields
    vision_statement TEXT NOT NULL,
    success_criteria TEXT[],

    -- Timeframe (typically 3-5 years)
    target_year INTEGER NOT NULL,

    -- Link to mission (redundant but useful)
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,

    -- Market context
    market_conditions TEXT,
    competitive_position TEXT
);

CREATE INDEX idx_visions_mission ON visions(mission_id);
```

### 5. Strategic Objectives Table

3-5 year strategic goals.

```sql
CREATE TABLE strategic_objectives (
    id UUID PRIMARY KEY REFERENCES pyramid_entities(id) ON DELETE CASCADE,

    -- Strategic objective fields
    objective_statement TEXT NOT NULL,
    success_metrics JSONB, -- [{metric: "...", target: "...", unit: "..."}]

    -- Timeframe
    planning_horizon INTEGER DEFAULT 3 CHECK (planning_horizon BETWEEN 1 AND 10),

    -- Strategic importance
    strategic_priority VARCHAR(20) CHECK (strategic_priority IN (
        'critical', 'high', 'medium', 'low'
    )),

    -- Link to vision
    vision_id UUID NOT NULL REFERENCES visions(id) ON DELETE CASCADE,

    -- Resource allocation
    budget_allocated DECIMAL(15,2),
    budget_currency VARCHAR(3) DEFAULT 'USD'
);

CREATE INDEX idx_objectives_vision ON strategic_objectives(vision_id);
CREATE INDEX idx_objectives_priority ON strategic_objectives(strategic_priority);
```

### 6. Goals/OKRs Table

Quarterly or annual measurable goals.

```sql
CREATE TABLE goals (
    id UUID PRIMARY KEY REFERENCES pyramid_entities(id) ON DELETE CASCADE,

    -- OKR framework
    objective_text TEXT NOT NULL,

    -- Parent strategic objective
    strategic_objective_id UUID REFERENCES strategic_objectives(id) ON DELETE CASCADE,

    -- Temporal scope
    quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
    fiscal_year INTEGER NOT NULL,

    -- Progress tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0.0 CHECK (
        progress_percentage >= 0 AND progress_percentage <= 100
    ),

    -- Confidence level (0-100%)
    confidence_level DECIMAL(5,2) CHECK (
        confidence_level >= 0 AND confidence_level <= 100
    ),

    -- Risk assessment
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
);

-- Key Results (child table for goals)
CREATE TABLE key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

    -- Key result details
    description TEXT NOT NULL,
    metric_name VARCHAR(200) NOT NULL,
    unit VARCHAR(100),

    -- Targets
    baseline_value DECIMAL(15,2),
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2),

    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,

    -- Temporal tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_progress CHECK (
        progress_percentage >= 0 AND progress_percentage <= 100
    )
);

CREATE INDEX idx_goals_objective ON goals(strategic_objective_id);
CREATE INDEX idx_goals_period ON goals(fiscal_year, quarter);
CREATE INDEX idx_key_results_goal ON key_results(goal_id);
```

### 7. Portfolios Table

Strategic investment themes.

```sql
CREATE TABLE portfolios (
    id UUID PRIMARY KEY REFERENCES pyramid_entities(id) ON DELETE CASCADE,

    -- Portfolio-specific fields
    strategic_theme TEXT NOT NULL,
    investment_thesis TEXT,

    -- Financial tracking
    total_budget DECIMAL(15,2),
    allocated_budget DECIMAL(15,2) DEFAULT 0.0,
    spent_to_date DECIMAL(15,2) DEFAULT 0.0,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Performance tracking
    roi_target DECIMAL(5,2), -- Expected return on investment
    roi_actual DECIMAL(5,2), -- Actual ROI

    -- Link to goals
    primary_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

    CONSTRAINT budget_allocation_valid CHECK (
        allocated_budget <= total_budget
    ),
    CONSTRAINT spending_valid CHECK (
        spent_to_date <= allocated_budget
    )
);

CREATE INDEX idx_portfolios_goal ON portfolios(primary_goal_id);
```

### 8. Programs Table

Sustained efforts spanning multiple projects.

```sql
CREATE TABLE programs (
    id UUID PRIMARY KEY REFERENCES pyramid_entities(id) ON DELETE CASCADE,

    -- Program-specific fields
    program_charter TEXT,
    success_criteria JSONB,

    -- Program management
    program_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    governance_model TEXT,

    -- Financial tracking
    budget DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Dependencies
    dependencies JSONB, -- [{type: "...", entity_id: "...", description: "..."}]

    -- Link to portfolio or goal
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

    -- Health metrics
    health_status VARCHAR(20) CHECK (health_status IN (
        'green', 'yellow', 'red', 'unknown'
    )),

    CONSTRAINT has_parent_entity CHECK (
        portfolio_id IS NOT NULL OR goal_id IS NOT NULL
    )
);

CREATE INDEX idx_programs_portfolio ON programs(portfolio_id);
CREATE INDEX idx_programs_goal ON programs(goal_id);
CREATE INDEX idx_programs_manager ON programs(program_manager_id);
```

### 9. Projects Table

Specific initiatives with defined deliverables.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY REFERENCES pyramid_entities(id) ON DELETE CASCADE,

    -- Project-specific fields
    project_charter TEXT,
    deliverables JSONB, -- [{name: "...", due_date: "...", status: "..."}]

    -- Project management
    project_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    methodology VARCHAR(50), -- e.g., 'agile', 'waterfall', 'hybrid'

    -- Financial tracking
    budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2) DEFAULT 0.0,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Link to program or goal
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,

    -- Progress tracking
    completion_percentage DECIMAL(5,2) DEFAULT 0.0,

    -- Risk and issues
    risks JSONB,
    issues JSONB,

    -- Dependencies
    blockers JSONB,

    CONSTRAINT completion_valid CHECK (
        completion_percentage >= 0 AND completion_percentage <= 100
    ),
    CONSTRAINT budget_valid CHECK (
        actual_cost <= budget * 1.5 -- Allow 50% overage for tracking
    )
);

CREATE INDEX idx_projects_program ON projects(program_id);
CREATE INDEX idx_projects_goal ON projects(goal_id);
CREATE INDEX idx_projects_portfolio ON projects(portfolio_id);
CREATE INDEX idx_projects_manager ON projects(project_manager_id);
CREATE INDEX idx_projects_completion ON projects(completion_percentage);
```

### 10. Tasks Table

Individual actions and work items.

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY REFERENCES pyramid_entities(id) ON DELETE CASCADE,

    -- Task-specific fields
    task_type VARCHAR(50) CHECK (task_type IN (
        'feature', 'bug', 'enhancement', 'research',
        'documentation', 'testing', 'other'
    )),

    -- Assignment
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Priority
    priority VARCHAR(20) CHECK (priority IN (
        'critical', 'high', 'medium', 'low'
    )),

    -- Effort estimation
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),

    -- Story points (for agile)
    story_points INTEGER CHECK (story_points > 0),

    -- Link to project
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Sprint/iteration
    sprint_id UUID, -- Reference to sprint if using agile

    -- Dependencies
    blocked_by UUID[] DEFAULT '{}', -- Array of task IDs

    -- Completion
    completed_percentage DECIMAL(5,2) DEFAULT 0.0,

    CONSTRAINT effort_valid CHECK (
        actual_hours IS NULL OR estimated_hours IS NOT NULL
    )
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status)
    USING HASH WHERE status IN ('active', 'in_progress');
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

---

## Document System

### 1. Documents Table

Raw uploaded files and strategic documents.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Document metadata
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- File information
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL, -- MIME type
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    file_path TEXT, -- Storage path (local filesystem)
    file_hash VARCHAR(64), -- SHA-256 for deduplication

    -- Document classification
    doc_type VARCHAR(100) NOT NULL CHECK (doc_type IN (
        'strategic_plan', 'execution_report', 'market_analysis',
        'financial_report', 'project_charter', 'meeting_notes',
        'research', 'policy', 'contract', 'other'
    )),

    -- Classification metadata
    classification_level VARCHAR(50) CHECK (classification_level IN (
        'public', 'internal', 'confidential', 'restricted'
    )),

    -- Authorship
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    contributors UUID[] DEFAULT '{}',

    -- Link to pyramid entities
    linked_entity_type VARCHAR(50),
    linked_entity_id UUID, -- Could reference any pyramid_entities.id

    -- Processing status
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processing', 'indexed', 'failed', 'archived'
    )),
    processing_error TEXT,

    -- Full-text content (extracted)
    content_text TEXT,

    -- Vector embedding
    embedding vector(1536),

    -- Temporal tracking
    document_date DATE, -- Date document was created/published
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    indexed_at TIMESTAMP WITH TIME ZONE,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Version control
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES documents(id) ON DELETE SET NULL
);

-- Row-level security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_documents_org ON documents(organization_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_type ON documents(doc_type);
CREATE INDEX idx_documents_author ON documents(author_id);
CREATE INDEX idx_documents_linked_entity ON documents(linked_entity_type, linked_entity_id);
CREATE INDEX idx_documents_hash ON documents(file_hash);
CREATE INDEX idx_documents_processing ON documents(processing_status)
    WHERE processing_status IN ('pending', 'processing');

-- Vector similarity index
CREATE INDEX idx_documents_embedding ON documents
    USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search
CREATE INDEX idx_documents_fulltext ON documents
    USING GIN(to_tsvector('english',
        title || ' ' || COALESCE(description, '') || ' ' || COALESCE(content_text, '')
    ));
```

### 2. Document Chunks Table

Semantic segmentation for RAG and contextual search.

```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent document
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Chunk identification
    chunk_index INTEGER NOT NULL,
    chunk_type VARCHAR(50) DEFAULT 'paragraph' CHECK (chunk_type IN (
        'title', 'heading', 'paragraph', 'list', 'table',
        'code', 'quote', 'footnote'
    )),

    -- Chunk content
    content TEXT NOT NULL,
    content_length INTEGER NOT NULL,

    -- Position in document
    start_page INTEGER,
    end_page INTEGER,
    start_position INTEGER,
    end_position INTEGER,

    -- Semantic metadata
    section_title VARCHAR(500),
    parent_section_title VARCHAR(500),

    -- Context window
    context_before TEXT, -- Previous chunk for context
    context_after TEXT,  -- Next chunk for context

    -- Vector embedding
    embedding vector(1536) NOT NULL,

    -- Extracted entities (NER)
    entities JSONB, -- [{type: "PERSON|ORG|DATE|...", value: "...", confidence: 0.95}]

    -- Keywords
    keywords TEXT[],

    -- Temporal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_chunk_index CHECK (chunk_index >= 0),
    UNIQUE (document_id, chunk_index)
);

-- Indexes
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_type ON document_chunks(chunk_type);

-- Vector similarity index
CREATE INDEX idx_chunks_embedding ON document_chunks
    USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search on chunks
CREATE INDEX idx_chunks_fulltext ON document_chunks
    USING GIN(to_tsvector('english', content));

-- GIN index for entity search
CREATE INDEX idx_chunks_entities ON document_chunks USING GIN(entities);
```

### 3. Document Embeddings Table

Dedicated vector storage with metadata.

```sql
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,

    -- Embedding details
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-ada-002',
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    embedding vector NOT NULL,

    -- Embedding metadata
    token_count INTEGER,
    embedding_cost DECIMAL(10,6), -- Cost in USD

    -- Quality metrics
    embedding_quality_score DECIMAL(5,4), -- 0-1 confidence

    -- Temporal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT one_reference CHECK (
        (document_id IS NOT NULL AND chunk_id IS NULL) OR
        (document_id IS NULL AND chunk_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_embeddings_document ON document_embeddings(document_id);
CREATE INDEX idx_embeddings_chunk ON document_embeddings(chunk_id);
CREATE INDEX idx_embeddings_model ON document_embeddings(embedding_model);

-- Vector similarity index
CREATE INDEX idx_embeddings_vector ON document_embeddings
    USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
```

### 4. Document Metadata Table

Extended metadata and custom attributes.

```sql
CREATE TABLE document_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Custom metadata
    metadata_key VARCHAR(200) NOT NULL,
    metadata_value TEXT,
    metadata_type VARCHAR(50) CHECK (metadata_type IN (
        'string', 'number', 'date', 'boolean', 'json', 'url'
    )),

    -- Indexed metadata
    is_searchable BOOLEAN DEFAULT TRUE,
    is_filterable BOOLEAN DEFAULT TRUE,

    -- Source tracking
    extraction_method VARCHAR(100), -- e.g., 'manual', 'pdf_metadata', 'llm_extraction'
    confidence DECIMAL(5,4), -- 0-1 confidence for automated extraction

    -- Temporal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (document_id, metadata_key)
);

-- Indexes
CREATE INDEX idx_doc_metadata_document ON document_metadata(document_id);
CREATE INDEX idx_doc_metadata_key ON document_metadata(metadata_key);
CREATE INDEX idx_doc_metadata_searchable ON document_metadata(metadata_key, metadata_value)
    WHERE is_searchable = TRUE;
```

### 5. Stories Table

Extracted narratives from execution documents.

```sql
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Source documents
    source_document_ids UUID[] NOT NULL,

    -- Story content
    title VARCHAR(500) NOT NULL,
    narrative TEXT NOT NULL,
    summary TEXT,

    -- Story classification
    story_type VARCHAR(100) CHECK (story_type IN (
        'success', 'failure', 'challenge', 'innovation',
        'lesson_learned', 'best_practice', 'case_study'
    )),

    -- Entities involved
    related_entities JSONB, -- [{entity_type: "project", entity_id: "..."}]

    -- Key participants
    participants UUID[] DEFAULT '{}',

    -- Temporal context
    story_date_start DATE,
    story_date_end DATE,

    -- Sentiment analysis
    sentiment_score DECIMAL(5,4), -- -1 to 1
    sentiment_label VARCHAR(50), -- 'positive', 'negative', 'neutral'

    -- Impact assessment
    impact_areas TEXT[], -- e.g., ['revenue', 'customer_satisfaction', 'efficiency']
    impact_score DECIMAL(5,2), -- 0-100

    -- Vector embedding
    embedding vector(1536),

    -- Tags and themes
    tags TEXT[],
    themes TEXT[],

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Row-level security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_stories_org ON stories(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stories_type ON stories(story_type);
CREATE INDEX idx_stories_date ON stories(story_date_start, story_date_end);
CREATE INDEX idx_stories_embedding ON stories
    USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_stories_tags ON stories USING GIN(tags);
CREATE INDEX idx_stories_themes ON stories USING GIN(themes);
```

---

## Hypergraph Structures

### 1. Nodes Table

Entities in the hypergraph (documents, pyramid entities, etc.).

```sql
CREATE TABLE hypergraph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Node identity
    node_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL, -- References actual entity (polymorphic)

    -- Node attributes
    label VARCHAR(500),
    properties JSONB DEFAULT '{}',

    -- Vector representation
    embedding vector(1536),

    -- Centrality metrics (computed)
    degree_centrality DECIMAL(10,8),
    betweenness_centrality DECIMAL(10,8),
    eigenvector_centrality DECIMAL(10,8),
    pagerank DECIMAL(10,8),

    -- Temporal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (organization_id, node_type, entity_id)
);

-- Indexes
CREATE INDEX idx_hypergraph_nodes_org ON hypergraph_nodes(organization_id);
CREATE INDEX idx_hypergraph_nodes_type ON hypergraph_nodes(node_type);
CREATE INDEX idx_hypergraph_nodes_entity ON hypergraph_nodes(entity_id);
CREATE INDEX idx_hypergraph_nodes_embedding ON hypergraph_nodes
    USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
```

### 2. Hyperedges Table

Multi-entity relationships.

```sql
CREATE TABLE hypergraph_hyperedges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Edge type/relationship
    edge_type VARCHAR(200) NOT NULL,

    -- Edge semantics
    relationship_label VARCHAR(500),
    description TEXT,

    -- Directionality
    is_directed BOOLEAN DEFAULT FALSE,

    -- Edge properties
    properties JSONB DEFAULT '{}',

    -- Temporal validity
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE,

    -- Confidence/strength
    confidence DECIMAL(5,4) DEFAULT 1.0 CHECK (
        confidence >= 0 AND confidence <= 1
    ),

    -- Source of relationship
    derived_from VARCHAR(100), -- e.g., 'manual', 'document_analysis', 'ml_inference'

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_hyperedges_org ON hypergraph_hyperedges(organization_id);
CREATE INDEX idx_hyperedges_type ON hypergraph_hyperedges(edge_type);
CREATE INDEX idx_hyperedges_valid ON hypergraph_hyperedges(valid_from, valid_to)
    WHERE valid_to IS NULL OR valid_to > NOW();
```

### 3. Hyperedge Members Table

Nodes participating in hyperedges.

```sql
CREATE TABLE hypergraph_hyperedge_members (
    hyperedge_id UUID NOT NULL REFERENCES hypergraph_hyperedges(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES hypergraph_nodes(id) ON DELETE CASCADE,

    -- Member role in the hyperedge
    role VARCHAR(100), -- e.g., 'source', 'target', 'context', 'contributor'

    -- Weight/importance of this node in the relationship
    weight DECIMAL(10,6) DEFAULT 1.0 CHECK (weight > 0),

    -- Order (for directed hyperedges)
    sequence_order INTEGER,

    -- Temporal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (hyperedge_id, node_id)
);

-- Indexes
CREATE INDEX idx_hyperedge_members_edge ON hypergraph_hyperedge_members(hyperedge_id);
CREATE INDEX idx_hyperedge_members_node ON hypergraph_hyperedge_members(node_id);
CREATE INDEX idx_hyperedge_members_role ON hypergraph_hyperedge_members(role);
```

### 4. Edge Weights Table

Alignment scores and relationship strengths.

```sql
CREATE TABLE hypergraph_edge_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hyperedge_id UUID NOT NULL REFERENCES hypergraph_hyperedges(id) ON DELETE CASCADE,

    -- Weight type
    weight_type VARCHAR(100) NOT NULL CHECK (weight_type IN (
        'alignment_score', 'semantic_similarity', 'temporal_correlation',
        'causal_strength', 'dependency_strength', 'custom'
    )),

    -- Weight value
    weight_value DECIMAL(10,6) NOT NULL,

    -- Normalization
    is_normalized BOOLEAN DEFAULT FALSE,
    normalization_method VARCHAR(100),

    -- Computation metadata
    computation_method VARCHAR(200),
    computation_params JSONB,

    -- Temporal validity
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,

    -- Confidence
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes
CREATE INDEX idx_edge_weights_hyperedge ON hypergraph_edge_weights(hyperedge_id);
CREATE INDEX idx_edge_weights_type ON hypergraph_edge_weights(weight_type);
CREATE INDEX idx_edge_weights_value ON hypergraph_edge_weights(weight_value);
```

---

## Users & Organizations

### 1. Organizations Table

Multi-tenant isolation root.

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization details
    name VARCHAR(500) NOT NULL,
    display_name VARCHAR(500),
    description TEXT,

    -- Identifiers
    slug VARCHAR(200) UNIQUE NOT NULL,
    domain VARCHAR(200), -- Primary email domain

    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7), -- Hex color

    -- Settings
    settings JSONB DEFAULT '{}',

    -- Subscription/tier
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN (
        'free', 'starter', 'professional', 'enterprise'
    )),
    subscription_status VARCHAR(50) DEFAULT 'active',

    -- Limits
    max_users INTEGER DEFAULT 10,
    max_storage_gb INTEGER DEFAULT 10,
    max_projects INTEGER DEFAULT 50,

    -- Contact
    billing_email VARCHAR(500),
    support_email VARCHAR(500),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE UNIQUE INDEX idx_orgs_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_orgs_domain ON organizations(domain);
CREATE INDEX idx_orgs_tier ON organizations(subscription_tier, subscription_status);
```

### 2. Users Table

User accounts across organizations.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Authentication
    email VARCHAR(500) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(500), -- bcrypt/argon2

    -- Profile
    first_name VARCHAR(200),
    last_name VARCHAR(200),
    display_name VARCHAR(500),
    avatar_url TEXT,

    -- Contact
    phone VARCHAR(50),
    timezone VARCHAR(100) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',

    -- Preferences
    preferences JSONB DEFAULT '{}',

    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(200),

    -- Session management
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,

    -- Account status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
        'active', 'inactive', 'suspended', 'deleted'
    )),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_active ON users(last_active_at);
```

### 3. Organization Members Table

User-organization relationship with roles.

```sql
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'owner', 'admin', 'leader', 'manager', 'member', 'viewer'
    )),

    -- Permissions
    permissions JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
        'active', 'invited', 'suspended', 'removed'
    )),

    -- Invitation
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (organization_id, user_id)
);

-- Indexes
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);
CREATE INDEX idx_org_members_status ON organization_members(status);
```

### 4. Teams Table

Organizational units within an organization.

```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Team details
    name VARCHAR(500) NOT NULL,
    description TEXT,

    -- Hierarchy
    parent_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

    -- Leadership
    team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Settings
    settings JSONB DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT unique_team_name_per_org UNIQUE (organization_id, name)
);

-- Indexes
CREATE INDEX idx_teams_org ON teams(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_parent ON teams(parent_team_id);
CREATE INDEX idx_teams_lead ON teams(team_lead_id);
```

### 5. Team Members Table

User-team relationship.

```sql
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role in team
    team_role VARCHAR(100) DEFAULT 'member',

    -- Status
    status VARCHAR(50) DEFAULT 'active',

    -- Temporal
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,

    UNIQUE (team_id, user_id)
);

-- Indexes
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
```

### 6. Roles & Permissions Table

Fine-grained permission system.

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Role definition
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Role type
    role_type VARCHAR(50) CHECK (role_type IN (
        'system', 'custom'
    )),

    -- Permissions
    permissions JSONB NOT NULL, -- {resource: [actions]}

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_role_name_per_org UNIQUE (organization_id, name)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    PRIMARY KEY (user_id, role_id, organization_id)
);

-- Indexes
CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

---

## Alignment Metrics

### 1. Alignment Scores Table

Real-time alignment tracking for all entities.

```sql
CREATE TABLE alignment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Entity being scored
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,

    -- Alignment metrics
    mission_alignment_score DECIMAL(5,2) NOT NULL CHECK (
        mission_alignment_score >= 0 AND mission_alignment_score <= 100
    ),
    vision_alignment_score DECIMAL(5,2) CHECK (
        vision_alignment_score >= 0 AND vision_alignment_score <= 100
    ),
    objective_alignment_score DECIMAL(5,2) CHECK (
        objective_alignment_score >= 0 AND objective_alignment_score <= 100
    ),

    -- Overall alignment
    overall_alignment_score DECIMAL(5,2) NOT NULL CHECK (
        overall_alignment_score >= 0 AND overall_alignment_score <= 100
    ),

    -- Alignment dimensions
    strategic_fit DECIMAL(5,2),
    resource_alignment DECIMAL(5,2),
    outcome_alignment DECIMAL(5,2),
    cultural_alignment DECIMAL(5,2),

    -- Computation metadata
    computation_method VARCHAR(200),
    computation_params JSONB,
    confidence DECIMAL(5,4),

    -- Contributing factors
    factors JSONB, -- [{factor: "...", weight: 0.3, score: 85}]

    -- Temporal
    score_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,

    -- Audit
    computed_by VARCHAR(100), -- 'system', 'user', 'ml_model'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alignment_scores_org ON alignment_scores(organization_id);
CREATE INDEX idx_alignment_scores_entity ON alignment_scores(entity_type, entity_id);
CREATE INDEX idx_alignment_scores_date ON alignment_scores(score_date DESC);
CREATE INDEX idx_alignment_scores_overall ON alignment_scores(overall_alignment_score);

-- Composite index for entity timeseries
CREATE INDEX idx_alignment_scores_entity_timeseries
    ON alignment_scores(entity_type, entity_id, score_date DESC);
```

### 2. Mission Drift Alerts Table

Automated alerts for alignment degradation.

```sql
CREATE TABLE mission_drift_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Affected entity
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,

    -- Alert details
    alert_type VARCHAR(100) CHECK (alert_type IN (
        'alignment_drop', 'threshold_breach', 'trend_negative',
        'anomaly_detected', 'dependency_conflict'
    )),

    severity VARCHAR(50) CHECK (severity IN (
        'low', 'medium', 'high', 'critical'
    )),

    -- Drift metrics
    previous_score DECIMAL(5,2),
    current_score DECIMAL(5,2),
    score_change DECIMAL(5,2),
    threshold_value DECIMAL(5,2),

    -- Alert message
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Recommendations
    recommendations JSONB, -- [{action: "...", priority: "...", rationale: "..."}]

    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
        'active', 'acknowledged', 'investigating', 'resolved', 'dismissed'
    )),

    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,

    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,

    -- Temporal
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drift_alerts_org ON mission_drift_alerts(organization_id);
CREATE INDEX idx_drift_alerts_entity ON mission_drift_alerts(entity_type, entity_id);
CREATE INDEX idx_drift_alerts_status ON mission_drift_alerts(status)
    WHERE status IN ('active', 'acknowledged');
CREATE INDEX idx_drift_alerts_severity ON mission_drift_alerts(severity);
CREATE INDEX idx_drift_alerts_assigned ON mission_drift_alerts(assigned_to)
    WHERE status NOT IN ('resolved', 'dismissed');
```

### 3. L-Scores Table

Provenance and lineage metrics.

```sql
CREATE TABLE l_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Entity being scored
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,

    -- L-Score components
    lineage_clarity DECIMAL(5,2) NOT NULL CHECK (
        lineage_clarity >= 0 AND lineage_clarity <= 100
    ),
    source_credibility DECIMAL(5,2) NOT NULL CHECK (
        source_credibility >= 0 AND source_credibility <= 100
    ),
    traceability DECIMAL(5,2) NOT NULL CHECK (
        traceability >= 0 AND traceability <= 100
    ),

    -- Overall L-Score
    l_score DECIMAL(5,2) NOT NULL CHECK (
        l_score >= 0 AND l_score <= 100
    ),

    -- Provenance chain
    provenance_chain JSONB, -- [{source_entity: "...", relationship: "...", confidence: 0.9}]
    provenance_depth INTEGER,

    -- Source documents
    source_document_ids UUID[] DEFAULT '{}',

    -- Computation metadata
    computation_method VARCHAR(200),
    confidence DECIMAL(5,4),

    -- Temporal
    score_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_l_scores_org ON l_scores(organization_id);
CREATE INDEX idx_l_scores_entity ON l_scores(entity_type, entity_id);
CREATE INDEX idx_l_scores_date ON l_scores(score_date DESC);
CREATE INDEX idx_l_scores_value ON l_scores(l_score);
```

### 4. Alignment History Snapshots Table

Temporal tracking of alignment over time.

```sql
CREATE TABLE alignment_history_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Snapshot metadata
    snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL,
    snapshot_type VARCHAR(50) CHECK (snapshot_type IN (
        'daily', 'weekly', 'monthly', 'quarterly', 'annual',
        'on_demand', 'milestone'
    )),

    -- Mission-level metrics
    mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
    overall_mission_alignment DECIMAL(5,2),

    -- Aggregated metrics
    total_entities_tracked INTEGER,
    entities_aligned INTEGER, -- Score >= 70
    entities_misaligned INTEGER, -- Score < 70
    entities_critical INTEGER, -- Score < 50

    -- Average scores by level
    avg_vision_alignment DECIMAL(5,2),
    avg_objective_alignment DECIMAL(5,2),
    avg_goal_alignment DECIMAL(5,2),
    avg_project_alignment DECIMAL(5,2),

    -- Trend indicators
    alignment_trend VARCHAR(50) CHECK (alignment_trend IN (
        'improving', 'stable', 'declining', 'volatile'
    )),

    -- Snapshot data
    snapshot_data JSONB, -- Full detail snapshot for point-in-time analysis

    -- Computation metadata
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    computation_duration_ms INTEGER,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100) -- 'system', 'scheduled_job', user_id
);

-- Indexes
CREATE INDEX idx_alignment_snapshots_org ON alignment_history_snapshots(organization_id);
CREATE INDEX idx_alignment_snapshots_mission ON alignment_history_snapshots(mission_id);
CREATE INDEX idx_alignment_snapshots_date ON alignment_history_snapshots(snapshot_date DESC);
CREATE INDEX idx_alignment_snapshots_type ON alignment_history_snapshots(snapshot_type);

-- Unique constraint for snapshot type per period
CREATE UNIQUE INDEX idx_alignment_snapshots_unique_daily
    ON alignment_history_snapshots(organization_id, DATE(snapshot_date))
    WHERE snapshot_type = 'daily';
```

---

## Market Intelligence

### 1. Competitive Analysis Table

Track competitors and market position.

```sql
CREATE TABLE competitive_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Competitor identification
    competitor_name VARCHAR(500) NOT NULL,
    competitor_type VARCHAR(100) CHECK (competitor_type IN (
        'direct', 'indirect', 'potential', 'partner', 'substitute'
    )),

    -- Analysis details
    analysis_title VARCHAR(500) NOT NULL,
    analysis_summary TEXT,

    -- SWOT components
    strengths TEXT[],
    weaknesses TEXT[],
    opportunities TEXT[],
    threats TEXT[],

    -- Market positioning
    market_share_percentage DECIMAL(5,2),
    revenue_estimate DECIMAL(15,2),
    growth_rate DECIMAL(5,2),

    -- Competitive metrics
    competitive_intensity DECIMAL(5,2), -- 0-100
    differentiation_score DECIMAL(5,2), -- 0-100

    -- Strategic implications
    strategic_responses JSONB, -- [{response: "...", priority: "...", owner: "..."}]

    -- Source documents
    source_document_ids UUID[] DEFAULT '{}',

    -- Vector embedding
    embedding vector(1536),

    -- Temporal
    analysis_date DATE NOT NULL,
    valid_from DATE,
    valid_to DATE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_competitive_analysis_org ON competitive_analysis(organization_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_competitive_analysis_competitor ON competitive_analysis(competitor_name);
CREATE INDEX idx_competitive_analysis_type ON competitive_analysis(competitor_type);
CREATE INDEX idx_competitive_analysis_date ON competitive_analysis(analysis_date DESC);
CREATE INDEX idx_competitive_analysis_embedding ON competitive_analysis
    USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
```

### 2. Market Signals Table

External signals affecting strategic alignment.

```sql
CREATE TABLE market_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Signal identification
    signal_type VARCHAR(100) CHECK (signal_type IN (
        'regulatory', 'technology', 'economic', 'social',
        'competitive', 'customer', 'supplier', 'environmental'
    )),

    signal_category VARCHAR(100), -- Domain-specific categorization

    -- Signal details
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    summary TEXT,

    -- Impact assessment
    impact_level VARCHAR(50) CHECK (impact_level IN (
        'negligible', 'low', 'medium', 'high', 'critical'
    )),

    impact_areas TEXT[], -- e.g., ['product_strategy', 'pricing', 'operations']

    -- Strategic relevance
    relevance_score DECIMAL(5,2) CHECK (
        relevance_score >= 0 AND relevance_score <= 100
    ),

    urgency VARCHAR(50) CHECK (urgency IN (
        'low', 'medium', 'high', 'immediate'
    )),

    -- Source information
    source_name VARCHAR(500),
    source_url TEXT,
    source_credibility DECIMAL(5,2),

    -- Related entities
    affected_entities JSONB, -- [{entity_type: "...", entity_id: "...", impact: "..."}]

    -- Recommended actions
    recommendations JSONB,

    -- Vector embedding
    embedding vector(1536),

    -- Status
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN (
        'new', 'reviewing', 'actionable', 'monitoring', 'archived'
    )),

    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Temporal
    signal_date DATE NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_market_signals_org ON market_signals(organization_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_market_signals_type ON market_signals(signal_type);
CREATE INDEX idx_market_signals_impact ON market_signals(impact_level);
CREATE INDEX idx_market_signals_status ON market_signals(status);
CREATE INDEX idx_market_signals_date ON market_signals(signal_date DESC);
CREATE INDEX idx_market_signals_embedding ON market_signals
    USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
```

### 3. Strategic Response Simulations Table

Model strategic responses to market changes.

```sql
CREATE TABLE strategic_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Simulation metadata
    simulation_name VARCHAR(500) NOT NULL,
    description TEXT,

    -- Scenario definition
    scenario_type VARCHAR(100) CHECK (scenario_type IN (
        'what_if', 'best_case', 'worst_case', 'monte_carlo',
        'sensitivity', 'stress_test'
    )),

    -- Input parameters
    input_assumptions JSONB NOT NULL,
    market_conditions JSONB,
    competitive_actions JSONB,

    -- Related signals
    related_signal_ids UUID[] DEFAULT '{}',

    -- Simulation results
    predicted_outcomes JSONB,
    confidence_intervals JSONB,

    -- Impact on alignment
    predicted_mission_alignment DECIMAL(5,2),
    alignment_variance DECIMAL(5,2),

    -- Risk assessment
    risk_factors JSONB,
    risk_score DECIMAL(5,2),

    -- Recommended strategy
    recommended_response TEXT,
    alternative_responses JSONB,

    -- Temporal
    simulation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scenario_timeframe_start DATE,
    scenario_timeframe_end DATE,

    -- Simulation metadata
    simulation_model VARCHAR(200),
    simulation_parameters JSONB,
    computation_time_ms INTEGER,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_strategic_sims_org ON strategic_simulations(organization_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_strategic_sims_type ON strategic_simulations(scenario_type);
CREATE INDEX idx_strategic_sims_date ON strategic_simulations(simulation_date DESC);
```

---

## Indexes & Performance

### Index Strategy

#### 1. Primary Indexes (Mandatory)

All tables include:
- Primary key index (automatically created)
- Multi-tenant isolation index (`organization_id`)
- Soft delete filter (`WHERE deleted_at IS NULL`)

#### 2. Foreign Key Indexes

```sql
-- Example pattern for all foreign keys
CREATE INDEX idx_<table>_<reference> ON <table>(<foreign_key_column>);
```

#### 3. Composite Indexes

For common query patterns:

```sql
-- Pyramid entities: type + status + org
CREATE INDEX idx_pyramid_composite ON pyramid_entities(
    organization_id, entity_type, status
) WHERE deleted_at IS NULL;

-- Alignment scores: entity timeseries
CREATE INDEX idx_alignment_timeseries ON alignment_scores(
    entity_type, entity_id, score_date DESC
);

-- Documents: type + processing status
CREATE INDEX idx_documents_composite ON documents(
    organization_id, doc_type, processing_status
) WHERE deleted_at IS NULL;
```

#### 4. Partial Indexes

For filtered queries:

```sql
-- Active entities only
CREATE INDEX idx_pyramid_active ON pyramid_entities(id)
    WHERE status = 'active' AND deleted_at IS NULL;

-- Pending processing
CREATE INDEX idx_documents_pending ON documents(id)
    WHERE processing_status IN ('pending', 'processing');

-- Active alerts
CREATE INDEX idx_alerts_active ON mission_drift_alerts(id)
    WHERE status IN ('active', 'acknowledged');
```

#### 5. Covering Indexes

For read-heavy queries:

```sql
-- Include commonly selected columns
CREATE INDEX idx_pyramid_covering ON pyramid_entities(
    organization_id, entity_type, status
) INCLUDE (title, owner_id, created_at)
WHERE deleted_at IS NULL;
```

### Query Optimization Patterns

#### 1. Materialized Views for Dashboards

```sql
-- Mission alignment summary
CREATE MATERIALIZED VIEW mv_mission_alignment_summary AS
SELECT
    m.organization_id,
    m.id AS mission_id,
    m.title AS mission_title,
    COUNT(DISTINCT v.id) AS vision_count,
    COUNT(DISTINCT so.id) AS objective_count,
    COUNT(DISTINCT g.id) AS goal_count,
    COUNT(DISTINCT p.id) AS project_count,
    AVG(als.overall_alignment_score) AS avg_alignment_score,
    MAX(als.score_date) AS last_scored_at
FROM missions m
LEFT JOIN visions v ON v.mission_id = m.id
LEFT JOIN strategic_objectives so ON so.vision_id = v.id
LEFT JOIN goals g ON g.strategic_objective_id = so.id
LEFT JOIN projects p ON p.goal_id = g.id
LEFT JOIN alignment_scores als ON als.entity_type = 'mission'
    AND als.entity_id = m.id
WHERE m.deleted_at IS NULL
GROUP BY m.organization_id, m.id, m.title;

-- Refresh strategy
CREATE UNIQUE INDEX ON mv_mission_alignment_summary(mission_id);
CREATE INDEX ON mv_mission_alignment_summary(organization_id);
```

#### 2. Partition Strategy

For large tables with temporal data:

```sql
-- Partition alignment_history_snapshots by month
CREATE TABLE alignment_history_snapshots_partitioned (
    LIKE alignment_history_snapshots INCLUDING ALL
) PARTITION BY RANGE (snapshot_date);

-- Create partitions
CREATE TABLE alignment_history_snapshots_2025_01
    PARTITION OF alignment_history_snapshots_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Automate partition creation with pg_partman extension
```

---

## Vector Storage Design

### Ruvector Integration

PKA-STRAT uses **Ruvector** (hypergraph-based vector engine) for semantic search and relationship modeling.

#### 1. Vector Dimensions

```sql
-- Standard embedding dimension
vector(1536)  -- OpenAI text-embedding-ada-002

-- Alternative models
vector(768)   -- sentence-transformers
vector(384)   -- all-MiniLM-L6-v2
```

#### 2. Vector Index Configuration

```sql
-- IVFFlat index (faster build, good recall)
CREATE INDEX idx_<table>_embedding ON <table>
    USING ivfflat(embedding vector_cosine_ops)
    WITH (lists = 100);

-- HNSW index (slower build, better recall)
CREATE INDEX idx_<table>_embedding_hnsw ON <table>
    USING hnsw(embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

#### 3. Distance Metrics

```sql
-- Cosine similarity (most common for normalized embeddings)
embedding <=> query_embedding  -- Returns distance (0 = identical)

-- L2 distance (Euclidean)
embedding <-> query_embedding

-- Inner product
embedding <#> query_embedding
```

#### 4. Hybrid Search Pattern

Combine vector similarity with traditional filters:

```sql
-- Example: Find similar strategic objectives with filters
SELECT
    id,
    title,
    embedding <=> $1 AS similarity_score
FROM pyramid_entities
WHERE
    organization_id = $2
    AND entity_type = 'strategic_objective'
    AND status = 'active'
    AND deleted_at IS NULL
ORDER BY embedding <=> $1
LIMIT 10;
```

#### 5. Vector Storage Optimization

```sql
-- Compress embeddings for storage efficiency
CREATE EXTENSION IF NOT EXISTS vector_compression;

-- Use half-precision for less critical vectors
ALTER TABLE documents
    ALTER COLUMN embedding TYPE halfvec(1536);
```

### Hypergraph Vector Queries

```sql
-- Find related entities through hypergraph + vector similarity
WITH similar_nodes AS (
    SELECT
        id,
        node_type,
        entity_id,
        embedding <=> $1 AS similarity
    FROM hypergraph_nodes
    WHERE organization_id = $2
    ORDER BY embedding <=> $1
    LIMIT 50
),
connected_entities AS (
    SELECT DISTINCT
        hem.node_id,
        he.edge_type,
        hew.weight_value
    FROM hypergraph_hyperedges he
    JOIN hypergraph_hyperedge_members hem ON hem.hyperedge_id = he.id
    JOIN hypergraph_edge_weights hew ON hew.hyperedge_id = he.id
    WHERE hem.node_id IN (SELECT id FROM similar_nodes)
        AND hew.weight_type = 'alignment_score'
        AND hew.weight_value > 0.7
)
SELECT
    sn.node_type,
    sn.entity_id,
    sn.similarity,
    ce.edge_type,
    ce.weight_value AS alignment_score
FROM similar_nodes sn
JOIN connected_entities ce ON ce.node_id = sn.id
ORDER BY sn.similarity, ce.weight_value DESC;
```

---

## Temporal Data Handling

### Change Data Capture (CDC)

#### 1. Temporal Tables Extension

```sql
CREATE EXTENSION IF NOT EXISTS temporal_tables;

-- Enable versioning for pyramid_entities
CREATE TABLE pyramid_entities_history (LIKE pyramid_entities);

CREATE TRIGGER pyramid_entities_versioning
    BEFORE INSERT OR UPDATE OR DELETE ON pyramid_entities
    FOR EACH ROW EXECUTE FUNCTION versioning(
        'sys_period', 'pyramid_entities_history', true
    );
```

#### 2. Audit Trail Pattern

Every table includes audit fields:

```sql
-- Standard audit columns
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by UUID REFERENCES users(id),
updated_by UUID REFERENCES users(id),
deleted_at TIMESTAMP WITH TIME ZONE,
deleted_by UUID REFERENCES users(id),
version INTEGER DEFAULT 1
```

#### 3. Change Log Table

```sql
CREATE TABLE change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Change metadata
    table_name VARCHAR(200) NOT NULL,
    record_id UUID NOT NULL,

    -- Operation
    operation VARCHAR(20) CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),

    -- Changes
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],

    -- Context
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,

    -- Temporal
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partition by month
CREATE TABLE change_log (
    LIKE change_log INCLUDING ALL
) PARTITION BY RANGE (changed_at);

-- Indexes
CREATE INDEX idx_change_log_org ON change_log(organization_id);
CREATE INDEX idx_change_log_table ON change_log(table_name, record_id);
CREATE INDEX idx_change_log_user ON change_log(user_id);
CREATE INDEX idx_change_log_time ON change_log(changed_at DESC);
```

#### 4. Trigger for Auto-Update

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_pyramid_entities_updated_at
    BEFORE UPDATE ON pyramid_entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Point-in-Time Queries

```sql
-- Query entity state at specific date
SELECT *
FROM pyramid_entities_history
WHERE id = $1
    AND sys_period @> $2::timestamp; -- Point in time

-- Query all changes between dates
SELECT *
FROM pyramid_entities_history
WHERE id = $1
    AND sys_period && tstzrange($2, $3); -- Date range
```

---

## Multi-Tenant Architecture

### Row-Level Security (RLS)

#### 1. Enable RLS on All Tables

```sql
ALTER TABLE pyramid_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alignment_scores ENABLE ROW LEVEL SECURITY;
-- ... etc for all multi-tenant tables
```

#### 2. RLS Policies

```sql
-- Policy: Users can only see their organization's data
CREATE POLICY org_isolation_policy ON pyramid_entities
    USING (organization_id = current_setting('app.current_org_id')::uuid);

-- Policy: Admins can see all
CREATE POLICY org_admin_policy ON pyramid_entities
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE user_id = current_setting('app.current_user_id')::uuid
                AND organization_id = pyramid_entities.organization_id
                AND role IN ('owner', 'admin')
        )
    );

-- Policy: Soft delete filter
CREATE POLICY soft_delete_policy ON pyramid_entities
    USING (deleted_at IS NULL);
```

#### 3. Application-Level Context

```sql
-- Set session variables for RLS
SET app.current_user_id = 'user-uuid';
SET app.current_org_id = 'org-uuid';

-- Reset after transaction
RESET app.current_user_id;
RESET app.current_org_id;
```

### Data Isolation Patterns

#### 1. Schema-per-Tenant (Alternative)

For very large enterprises:

```sql
-- Create isolated schema per organization
CREATE SCHEMA org_acme_corp;
CREATE SCHEMA org_contoso_ltd;

-- Duplicate table structure
CREATE TABLE org_acme_corp.pyramid_entities (LIKE public.pyramid_entities);
CREATE TABLE org_contoso_ltd.pyramid_entities (LIKE public.pyramid_entities);
```

#### 2. Separate Database per Tenant (Ultimate Isolation)

For regulatory compliance:

```sql
-- Create separate database
CREATE DATABASE pka_strat_org_acme;
CREATE DATABASE pka_strat_org_contoso;

-- Clone schema
pg_dump --schema-only pka_strat_template | psql pka_strat_org_acme
```

### Connection Pooling

```sql
-- PgBouncer configuration
[databases]
pka_strat = host=localhost dbname=pka_strat

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1-2)

#### Migration 001: Core Schema

```sql
-- migrations/001_core_schema.up.sql
BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- Organizations
CREATE TABLE organizations (...);

-- Users
CREATE TABLE users (...);

-- Organization members
CREATE TABLE organization_members (...);

COMMIT;
```

#### Migration 002: Pyramid Hierarchy

```sql
-- migrations/002_pyramid_hierarchy.up.sql
BEGIN;

CREATE TABLE pyramid_entities (...);
CREATE TABLE pyramid_hierarchy_closure (...);
CREATE TABLE missions (...);
CREATE TABLE visions (...);
CREATE TABLE strategic_objectives (...);
CREATE TABLE goals (...);
CREATE TABLE key_results (...);
CREATE TABLE portfolios (...);
CREATE TABLE programs (...);
CREATE TABLE projects (...);
CREATE TABLE tasks (...);

-- Indexes
-- ... all pyramid indexes

COMMIT;
```

### Phase 2: Documents & Vectors (Week 3-4)

#### Migration 003: Document System

```sql
-- migrations/003_document_system.up.sql
BEGIN;

CREATE TABLE documents (...);
CREATE TABLE document_chunks (...);
CREATE TABLE document_embeddings (...);
CREATE TABLE document_metadata (...);
CREATE TABLE stories (...);

-- Vector indexes
-- ... all document indexes

COMMIT;
```

### Phase 3: Hypergraph (Week 5)

#### Migration 004: Hypergraph Structures

```sql
-- migrations/004_hypergraph.up.sql
BEGIN;

CREATE TABLE hypergraph_nodes (...);
CREATE TABLE hypergraph_hyperedges (...);
CREATE TABLE hypergraph_hyperedge_members (...);
CREATE TABLE hypergraph_edge_weights (...);

-- Graph indexes
-- ... all hypergraph indexes

COMMIT;
```

### Phase 4: Alignment & Intelligence (Week 6-7)

#### Migration 005: Alignment Metrics

```sql
-- migrations/005_alignment_metrics.up.sql
BEGIN;

CREATE TABLE alignment_scores (...);
CREATE TABLE mission_drift_alerts (...);
CREATE TABLE l_scores (...);
CREATE TABLE alignment_history_snapshots (...);

-- Alignment indexes

COMMIT;
```

#### Migration 006: Market Intelligence

```sql
-- migrations/006_market_intelligence.up.sql
BEGIN;

CREATE TABLE competitive_analysis (...);
CREATE TABLE market_signals (...);
CREATE TABLE strategic_simulations (...);

COMMIT;
```

### Phase 5: Security & Optimization (Week 8)

#### Migration 007: RLS Policies

```sql
-- migrations/007_rls_policies.up.sql
BEGIN;

-- Enable RLS on all tables
ALTER TABLE pyramid_entities ENABLE ROW LEVEL SECURITY;
-- ... etc

-- Create policies
CREATE POLICY org_isolation_policy ON pyramid_entities ...;
-- ... all policies

COMMIT;
```

#### Migration 008: Performance Optimizations

```sql
-- migrations/008_optimizations.up.sql
BEGIN;

-- Materialized views
CREATE MATERIALIZED VIEW mv_mission_alignment_summary ...;

-- Partitioning
-- ... partition tables

-- Additional indexes
-- ... covering indexes, partial indexes

COMMIT;
```

### Migration Tools

#### 1. Using golang-migrate

```bash
# Install
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Create migration
migrate create -ext sql -dir db/migrations -seq core_schema

# Run migrations
migrate -database "postgres://user:pass@localhost:5432/pka_strat?sslmode=disable" \
    -path db/migrations up

# Rollback
migrate -database "..." -path db/migrations down 1
```

#### 2. Seed Data Script

```sql
-- seeds/001_demo_data.sql
BEGIN;

-- Create demo organization
INSERT INTO organizations (id, name, slug, subscription_tier)
VALUES (
    'org-demo-uuid',
    'ACME Corporation',
    'acme-corp',
    'professional'
);

-- Create demo user
INSERT INTO users (id, email, first_name, last_name)
VALUES (
    'user-demo-uuid',
    'demo@acme.com',
    'Jane',
    'Doe'
);

-- Create demo mission
INSERT INTO pyramid_entities (
    id, organization_id, entity_type, title, description, path
)
VALUES (
    'mission-demo-uuid',
    'org-demo-uuid',
    'mission',
    'Transform healthcare through innovative technology',
    'Our mission is to make healthcare accessible, affordable, and personalized.',
    'mission_transform_healthcare'
);

INSERT INTO missions (id, purpose, horizon_years)
VALUES (
    'mission-demo-uuid',
    'Improve patient outcomes through technology-driven solutions',
    10
);

COMMIT;
```

### Rollback Strategy

Each migration includes `.down.sql`:

```sql
-- migrations/002_pyramid_hierarchy.down.sql
BEGIN;

DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;
DROP TABLE IF EXISTS key_results CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS strategic_objectives CASCADE;
DROP TABLE IF EXISTS visions CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP TABLE IF EXISTS pyramid_hierarchy_closure CASCADE;
DROP TABLE IF EXISTS pyramid_entities CASCADE;

COMMIT;
```

---

## Database Maintenance

### 1. Vacuum Strategy

```sql
-- Auto-vacuum configuration
ALTER TABLE pyramid_entities SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

-- Manual vacuum for heavily updated tables
VACUUM ANALYZE alignment_scores;
VACUUM ANALYZE documents;
```

### 2. Index Maintenance

```sql
-- Reindex concurrently (no downtime)
REINDEX INDEX CONCURRENTLY idx_pyramid_entities_embedding;

-- Monitor index bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
        pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Backup Strategy

```bash
# Full backup
pg_dump -Fc pka_strat > backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d pka_strat_new backup_20250128.dump

# Continuous archiving (WAL)
archive_mode = on
archive_command = 'cp %p /mnt/backups/wal/%f'
```

---

## Appendix: Entity Relationship Summary

### Primary Relationships

```
organizations (1) → (*) organization_members → (*) users
organizations (1) → (*) teams → (*) team_members → (*) users

organizations (1) → (1) missions
missions (1) → (*) visions
visions (1) → (*) strategic_objectives
strategic_objectives (1) → (*) goals
goals (1) → (*) key_results

goals (1) → (*) portfolios
goals (1) → (*) programs
programs (1) → (*) projects
projects (1) → (*) tasks

organizations (1) → (*) documents
documents (1) → (*) document_chunks
documents (1) → (*) document_embeddings
document_chunks (1) → (1) document_embeddings

organizations (1) → (*) hypergraph_nodes
organizations (1) → (*) hypergraph_hyperedges
hypergraph_hyperedges (*) → (*) hypergraph_nodes (via hypergraph_hyperedge_members)

pyramid_entities (*) → (*) alignment_scores
pyramid_entities (*) → (*) mission_drift_alerts
pyramid_entities (*) → (*) l_scores

organizations (1) → (*) competitive_analysis
organizations (1) → (*) market_signals
organizations (1) → (*) strategic_simulations
```

---

## Database Configuration Recommendations

### PostgreSQL Settings (postgresql.conf)

```ini
# Memory
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB

# Connections
max_connections = 200

# WAL
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB

# Vector extension
shared_preload_libraries = 'vector'

# Parallelism
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8

# Logging
log_statement = 'ddl'
log_duration = on
log_min_duration_statement = 1000
```

---

## Version History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 1.0.0   | 2025-12-28 | System | Initial schema specification     |

---

## Next Steps

1. **Review & Validate**: Technical review by database architect
2. **Performance Testing**: Load test with sample data
3. **Security Audit**: Penetration testing and RLS validation
4. **Migration Planning**: Detailed timeline and rollback procedures
5. **Documentation**: API documentation and developer guides

---

**End of Database Schema Specification**
