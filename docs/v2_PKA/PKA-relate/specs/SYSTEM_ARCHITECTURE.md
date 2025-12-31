# PKA-Relate System Architecture Design

**Version:** 1.0
**Date:** 2025-12-30
**Author:** SystemDesigner Agent (Hive Mind Swarm)
**Status:** Architecture Specification

---

## Executive Summary

This document defines the complete system architecture for **PKA-Relate**, a mobile-first personal knowledge assistant for relationship management. The architecture adapts the proven PKA-STRAT strategic alignment platform for individual relationship tracking, personal growth, and AI-powered relationship advice.

### Key Architectural Decisions

1. **60% Code Reuse** from PKA-STRAT infrastructure (UnifiedMemory, vector search, RAG chat)
2. **Mobile-First Architecture** optimized for React Native with offline-first capabilities
3. **Hybrid Storage Strategy** combining vector embeddings + graph relationships + relational data
4. **Streaming AI Chat** with source citations and "tough love" behavioral analysis
5. **Privacy-First Design** supporting on-device processing with optional cloud sync

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Component Diagrams (C4 Model)](#component-diagrams-c4-model)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Technology Stack](#technology-stack)
6. [API Architecture](#api-architecture)
7. [Storage Architecture](#storage-architecture)
8. [Security Architecture](#security-architecture)
9. [Scalability & Performance](#scalability--performance)
10. [Deployment Architecture](#deployment-architecture)
11. [Architecture Decision Records (ADRs)](#architecture-decision-records-adrs)

---

## Architecture Overview

### Conceptual Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                      PKA-Relate Platform                           │
│                Mobile-First Personal Knowledge Assistant            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────┐         ┌──────────────────┐                │
│  │  Mobile Client  │◄────────│  Web Dashboard   │                │
│  │  (React Native) │         │   (React SPA)    │                │
│  └────────┬────────┘         └────────┬─────────┘                │
│           │                           │                            │
│           └───────────┬───────────────┘                            │
│                       │                                            │
│           ┌───────────▼──────────────┐                            │
│           │    API Gateway           │                            │
│           │  (Express + JWT Auth)    │                            │
│           └───────────┬──────────────┘                            │
│                       │                                            │
│       ┌───────────────┼───────────────┐                           │
│       │               │               │                            │
│   ┌───▼────┐    ┌────▼─────┐   ┌────▼──────┐                    │
│   │Content │    │   Chat   │   │Analytics  │                     │
│   │Service │    │ Service  │   │  Service  │                     │
│   └───┬────┘    └────┬─────┘   └────┬──────┘                    │
│       │              │              │                              │
│   ┌───▼──────────────▼──────────────▼────┐                       │
│   │      UnifiedMemory (Core Engine)     │                        │
│   │  Vector Store + Graph Store + Cache  │                        │
│   └──────────────────┬───────────────────┘                       │
│                      │                                             │
│       ┌──────────────┼──────────────┐                            │
│       │              │              │                             │
│   ┌───▼──────┐  ┌───▼──────┐  ┌───▼──────┐                     │
│   │PostgreSQL│  │RuVector  │  │  Redis   │                      │
│   │ +pgvector│  │(Vectors) │  │ (Cache)  │                      │
│   └──────────┘  └──────────┘  └──────────┘                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles

1. **Simplicity First** - Flat 3-level hierarchy (Values → SubSystems → Content) vs PKA-STRAT's 8 levels
2. **Mobile-Optimized** - Offline-first, lazy loading, background sync
3. **Reuse PKA-STRAT** - 60% infrastructure reuse (vector search, graph store, chat)
4. **Privacy by Design** - On-device mode, encrypted sync, GDPR compliance
5. **RAG-Native** - Everything is vector-embedded for semantic search

---

## System Components

### Layer 1: Presentation Layer

#### Mobile Client (React Native)
- **Responsibility:** Primary user interface for iOS/Android
- **Key Features:**
  - Bottom tab navigation (Home, Ask, Systems, Growth, Profile)
  - Offline-first data persistence (SQLite + AsyncStorage)
  - Background sync with optimistic UI updates
  - Biometric authentication integration
  - Push notifications for drift alerts

- **Technology:**
  - React Native 0.72+
  - TanStack Query for server state
  - React Navigation for routing
  - Zustand for local state
  - SQLite for offline storage

#### Web Dashboard (Optional)
- **Responsibility:** Desktop companion for detailed analytics
- **Key Features:**
  - Knowledge graph visualization (D3.js force layout)
  - Advanced analytics dashboards
  - Bulk content upload
  - Export/import functionality

- **Technology:**
  - React 18+
  - Vite build system
  - TanStack Query
  - Recharts for analytics

### Layer 2: API Gateway Layer

#### Express API Server
- **Responsibility:** HTTP API gateway with authentication/authorization
- **Key Features:**
  - JWT-based authentication (access + refresh tokens)
  - Request validation (Zod schemas)
  - Rate limiting (per-user quotas)
  - Request/response logging
  - Error handling middleware

- **Endpoints:** 71 endpoints across 10 functional areas
  - Authentication (5): signup, login, logout, refresh, me
  - User Profile (6): profile, psychological profile, settings
  - Core Values (3): CRUD operations
  - Mentors (3): CRUD operations
  - Focus Areas (4): CRUD operations with progress tracking
  - Sub-Systems (10): CRUD + graph linking
  - Content Items (5): CRUD + semantic search
  - Interactions (5): CRUD + analytics
  - Chat/AI (4): conversations + streaming
  - Analytics (4): weekly summary, patterns, streaks
  - Events (5): calendar integration
  - Export (1): GDPR data export

### Layer 3: Service Layer

#### Content Service
- **Responsibility:** Content item management and ingestion
- **Key Operations:**
  - Document upload (PDF, EPUB, text, URLs)
  - URL scraping (Cheerio/Puppeteer)
  - Content parsing and chunking
  - Vector embedding generation
  - Auto-tagging and categorization
  - Personal notes management

#### Chat Service
- **Responsibility:** RAG-based AI conversation
- **Key Operations:**
  - Context retrieval (semantic search across user's library)
  - Multi-source synthesis (SubSystems + ContentItems + external research)
  - Tough love mode (behavioral analysis)
  - Source citation tracking
  - Streaming responses (SSE)
  - External research integration (SerpAPI)

#### Analytics Service
- **Responsibility:** Personal growth metrics and insights
- **Key Operations:**
  - Weekly summary generation
  - Focus area progress tracking
  - Streak calculation
  - Interaction pattern detection
  - Drift alert generation
  - Relationship metric scoring

#### User Service
- **Responsibility:** User profile and settings management
- **Key Operations:**
  - User authentication (JWT)
  - Psychological profile management
  - Core values CRUD
  - Mentor management
  - Settings persistence

### Layer 4: Data Layer

#### UnifiedMemory (Core Engine)
**Adapted from PKA-STRAT**
- **Responsibility:** Unified interface for vector + graph + cache operations
- **Key Features:**
  - Semantic search with HNSW indexing
  - GNN re-ranking for graph connectivity
  - Collection-based organization (maps to SubSystems)
  - Hybrid scoring (vector similarity + graph centrality)

- **Reusable Components from PKA-STRAT:**
  - `VectorStore` interface
  - `GraphStore` interface
  - `CollectionManager`
  - `PKAMemoryManager` (adapted for SubSystems)

#### PostgreSQL + pgvector
- **Responsibility:** Relational data + vector embeddings
- **Schema:**
  - Users, PsychologicalProfiles, CoreValues, Mentors
  - SubSystems, ContentItems, Interactions
  - FocusAreas, UpcomingEvents, ChatMessages
  - Settings, Metrics, Alignments

- **Vector Indexes:**
  - ContentItem.embedding (384-1536 dimensions)
  - Interaction.embedding
  - CoreValue.embedding
  - SubSystem.embedding

#### RuVector (Vector Database)
**Reused from PKA-STRAT**
- **Responsibility:** High-performance vector search
- **Features:**
  - 384-dimensional n-gram embeddings
  - HNSW indexing (150x faster than brute force)
  - Quantization support (4-32x memory reduction)
  - Tier-based storage (hot/warm/cold)

#### Redis Cache
- **Responsibility:** Session management and performance caching
- **Cached Data:**
  - JWT tokens (blacklist for logout)
  - User settings (5-minute TTL)
  - Recent interactions (session cache)
  - Semantic search results (5-minute TTL)
  - Weekly analytics (24-hour TTL)

---

## Component Diagrams (C4 Model)

### C4 Level 1: System Context Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ Uses mobile app
       │ and web dashboard
       ▼
┌──────────────────────────────────────────────┐
│         PKA-Relate Platform                  │
│                                              │
│  • Personal knowledge management             │
│  • AI relationship advisor                   │
│  • Growth tracking & analytics               │
│  • Semantic search & RAG                     │
└─────┬────────────────────────────────┬───────┘
      │                                │
      │ Uses embeddings                │ Searches external
      ▼                                │ research
┌──────────────┐                       ▼
│ OpenAI API   │                 ┌──────────────┐
│ (Embeddings) │                 │  SerpAPI     │
└──────────────┘                 │ (Web Search) │
                                 └──────────────┘
```

### C4 Level 2: Container Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                     PKA-Relate Platform                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐         ┌──────────────────┐           │
│  │ Mobile App       │         │ Web Dashboard    │           │
│  │ (React Native)   │◄────────│ (React SPA)      │           │
│  │                  │  HTTPS  │                  │           │
│  │ • Offline-first  │  /v1    │ • Analytics      │           │
│  │ • Push notifs    │         │ • Graph viz      │           │
│  └────────┬─────────┘         └────────┬─────────┘           │
│           │                            │                      │
│           │ REST API                   │                      │
│           ▼                            ▼                      │
│  ┌─────────────────────────────────────────────────┐         │
│  │        API Gateway (Express.js)                 │         │
│  │                                                 │         │
│  │ • JWT Authentication                            │         │
│  │ • Rate Limiting                                 │         │
│  │ • Request Validation                            │         │
│  │ • Error Handling                                │         │
│  └──────┬──────────────┬──────────────┬───────────┘         │
│         │              │              │                      │
│    ┌────▼────┐    ┌────▼────┐    ┌───▼──────┐             │
│    │Content  │    │  Chat   │    │Analytics │             │
│    │Service  │    │ Service │    │ Service  │             │
│    └────┬────┘    └────┬────┘    └───┬──────┘             │
│         │              │              │                      │
│         └──────────────┼──────────────┘                      │
│                        │                                      │
│         ┌──────────────▼──────────────┐                     │
│         │   UnifiedMemory Engine      │                     │
│         │  (Vector + Graph + Cache)   │                     │
│         └──────┬──────────┬───────────┘                     │
│                │          │                                  │
│       ┌────────▼─┐    ┌──▼─────┐    ┌──────┐              │
│       │PostgreSQL│    │RuVector│    │Redis │              │
│       │+pgvector │    │        │    │Cache │              │
│       └──────────┘    └────────┘    └──────┘              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### C4 Level 3: Component Diagram - Chat Service

```
┌────────────────────────────────────────────────────────┐
│                   Chat Service                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  POST /conversations/:id/messages                      │
│         │                                              │
│         ▼                                              │
│  ┌───────────────────┐                                │
│  │ Message Handler   │                                │
│  └─────────┬─────────┘                                │
│            │                                           │
│            ▼                                           │
│  ┌───────────────────────────────────────┐           │
│  │   Context Retrieval Engine            │           │
│  │                                       │           │
│  │  1. SubSystem Search                  │           │
│  │  2. ContentItem Search                │           │
│  │  3. External Research (optional)      │           │
│  │  4. Hybrid Ranking (vector + graph)   │           │
│  └─────────┬─────────────────────────────┘           │
│            │                                           │
│            ▼                                           │
│  ┌───────────────────────────────────────┐           │
│  │   Tough Love Detector (optional)      │           │
│  │                                       │           │
│  │  1. Check user settings               │           │
│  │  2. Analyze repetitive questioning    │           │
│  │  3. Detect avoidance patterns         │           │
│  │  4. Check value misalignment          │           │
│  └─────────┬─────────────────────────────┘           │
│            │                                           │
│            ▼                                           │
│  ┌───────────────────────────────────────┐           │
│  │   Response Generator                  │           │
│  │                                       │           │
│  │  1. Build system prompt               │           │
│  │  2. Synthesize context                │           │
│  │  3. Call LLM (Claude/GPT-4)          │           │
│  │  4. Stream response (SSE)             │           │
│  └─────────┬─────────────────────────────┘           │
│            │                                           │
│            ▼                                           │
│  ┌───────────────────────────────────────┐           │
│  │   Source Tracker                      │           │
│  │                                       │           │
│  │  1. Track cited sources               │           │
│  │  2. Build provenance chain            │           │
│  │  3. Format citations                  │           │
│  └─────────┬─────────────────────────────┘           │
│            │                                           │
│            ▼                                           │
│      Response (JSON or SSE)                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

### Content Ingestion Flow

```
User uploads content (URL/PDF/text)
    │
    ▼
┌───────────────────────────────────────┐
│ 1. Content Service                    │
│    • Validate input                   │
│    • Scrape URL (if applicable)       │
│    • Parse document                   │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 2. Auto-Categorization                │
│    • Extract topics via NLP           │
│    • Semantic search SubSystems       │
│    • Suggest top 3 matches            │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 3. Embedding Generation                │
│    • Chunk text (512 tokens)          │
│    • Generate 384-dim embeddings      │
│    • Store in RuVector                │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 4. Graph Store Update                 │
│    • Create ContentItem node          │
│    • Create CONTAINS edge             │
│    • Update SubSystem.item_count      │
└─────────────┬─────────────────────────┘
              │
              ▼
      Return: ContentItem ID
```

### AI Chat Flow (with Tough Love)

```
User asks question
    │
    ▼
┌───────────────────────────────────────┐
│ 1. Chat Service                       │
│    • Validate message                 │
│    • Get/create conversation          │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 2. Context Retrieval                  │
│    • Parallel search:                 │
│      - SubSystems (k=20)              │
│      - ContentItems (k=30)            │
│      - External (k=5, if enabled)     │
│    • Hybrid ranking (vector + graph)  │
│    • Filter top 8 sources             │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 3. Tough Love Detection               │
│    • Check UserSettings.tough_love    │
│    • Analyze conversation history     │
│    • Detect contradictions:           │
│      - Repetitive questioning         │
│      - Avoidance language             │
│      - Value misalignment             │
│    • Set is_tough_love flag           │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 4. Response Generation                │
│    • Build system prompt:             │
│      - User profile                   │
│      - Core values                    │
│      - Tough love mode (if triggered) │
│    • Synthesize context from sources  │
│    • Call LLM API (streaming)         │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 5. Source Citation                    │
│    • Track cited sources              │
│    • Build provenance chain           │
│    • Format citations [1], [2], etc.  │
└─────────────┬─────────────────────────┘
              │
              ▼
      Response (SSE stream)
      {
        event: content_delta
        data: { delta: "text..." }

        event: sources
        data: { sources: [...] }

        event: message_complete
        data: { is_tough_love: true }
      }
```

### Interaction Logging & Growth Tracking Flow

```
User logs interaction
    │
    ▼
┌───────────────────────────────────────┐
│ 1. Create Interaction Record          │
│    • Store: type, person, summary,    │
│      outcome, emotions, learnings     │
│    • Generate embedding                │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 2. Link to Focus Areas                │
│    • Semantic search FocusArea.title  │
│    • If similarity > 0.7:             │
│      - Create RELATES_TO edge         │
│      - Update progress:               │
│        • positive → +5                │
│        • negative → -2                │
│      - Update streak                  │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 3. Profile Update Check (async)       │
│    • Every 30 interactions:           │
│      - Analyze pattern shift          │
│      - Update PsychologicalProfile    │
│        if patterns changed            │
└─────────────┬─────────────────────────┘
              │
              ▼
      Return: Interaction ID
```

---

## Technology Stack

### Frontend

#### Mobile (React Native)
- **Framework:** React Native 0.72+
- **Navigation:** React Navigation 6
- **State Management:**
  - Server state: TanStack Query v4
  - Local state: Zustand
  - Form state: React Hook Form
- **Offline Storage:** SQLite (expo-sqlite)
- **Styling:** NativeWind (Tailwind for RN)
- **Auth:** expo-secure-store for token storage
- **Notifications:** expo-notifications

#### Web (Optional)
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **State:** TanStack Query + Zustand
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Graph Viz:** D3.js + react-force-graph

### Backend

#### API Server
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js 4
- **Validation:** Zod schemas
- **Auth:** jsonwebtoken (JWT)
- **Rate Limiting:** express-rate-limit
- **Logging:** pino
- **Testing:** Vitest + Supertest

#### Services (Reused from PKA-STRAT)
- **UnifiedMemory:** Vector + Graph interface
- **VectorStore:** RuVector integration
- **GraphStore:** In-memory graph + PostgreSQL
- **CollectionManager:** SubSystem mapping

#### New Services (PKA-Relate specific)
- **ContentService:** Upload, parsing, auto-tagging
- **ChatService:** RAG, tough love, streaming
- **AnalyticsService:** Metrics, patterns, insights
- **UserService:** Auth, profile, settings

### Data Layer

#### Primary Database
- **PostgreSQL 14+** with extensions:
  - `pgvector` for vector similarity
  - `pg_trgm` for fuzzy text search
  - `uuid-ossp` for UUID generation

#### Vector Database
- **RuVector** (from PKA-STRAT)
  - 384-dimensional embeddings
  - HNSW indexing
  - Quantization support
  - Tier-based storage

#### Cache
- **Redis 7+**
  - Session storage
  - Rate limiting counters
  - Semantic search cache

#### Graph Processing
- **In-memory graph store** (from PKA-STRAT)
  - Node-edge model
  - PageRank for centrality
  - Bidirectional traversal

### External Services

#### AI/ML
- **LLM:** Claude 3.5 Sonnet or GPT-4 Turbo
- **Embeddings:** OpenAI text-embedding-3-small (1536-dim) or all-MiniLM-L6-v2 (384-dim, local)
- **Web Search:** SerpAPI or Brave Search API

#### Infrastructure
- **Cloud:** AWS or Fly.io
- **CDN:** CloudFront or Cloudflare
- **File Storage:** S3 or R2
- **Monitoring:** Sentry + Prometheus

---

## API Architecture

### REST API Design Principles

1. **RESTful Resources** - Noun-based URLs, HTTP verbs
2. **JWT Authentication** - Access (1hr) + Refresh (30d) tokens
3. **Versioning** - `/v1` prefix for all endpoints
4. **Pagination** - Cursor-based for large lists
5. **Filtering** - Query params for filters/sorts
6. **Streaming** - SSE for AI chat responses
7. **Rate Limiting** - Per-user quotas
8. **Error Handling** - Consistent error response format

### Endpoint Organization

```
/v1
├── /auth
│   ├── POST /signup
│   ├── POST /login
│   ├── POST /logout
│   ├── POST /refresh
│   └── GET  /me
│
├── /users/me
│   ├── GET  /profile
│   ├── PUT  /profile
│   ├── GET  /psychological-profile
│   ├── PUT  /psychological-profile
│   ├── GET  /settings
│   └── PUT  /settings
│
├── /users/me/values       (Core Values)
├── /users/me/mentors      (Mentors)
├── /users/me/focus-areas  (Focus Areas)
│
├── /systems               (SubSystems)
│   ├── GET  /
│   ├── POST /
│   ├── GET  /:id
│   ├── PUT  /:id
│   ├── DELETE /:id
│   ├── GET  /graph
│   ├── POST /:id/link/:targetId
│   └── DELETE /:id/link/:targetId
│
├── /content-items         (Content)
│   ├── GET  /
│   ├── POST /
│   ├── POST /upload
│   ├── GET  /search
│   ├── GET  /:id
│   ├── PUT  /:id
│   └── DELETE /:id
│
├── /interactions          (Interactions)
│   ├── GET  /
│   ├── POST /
│   ├── GET  /:id
│   ├── PUT  /:id
│   ├── DELETE /:id
│   └── GET  /stats
│
├── /conversations         (AI Chat)
│   ├── GET  /
│   ├── POST /
│   ├── GET  /:id/messages
│   ├── POST /:id/messages (streaming SSE)
│   └── POST /:id/feedback
│
├── /events                (Calendar)
│   ├── GET  /
│   ├── POST /
│   ├── GET  /:id
│   ├── PUT  /:id
│   ├── DELETE /:id
│   └── GET  /upcoming
│
├── /analytics             (Growth Tracking)
│   ├── GET  /weekly-summary
│   ├── GET  /focus-progress
│   ├── GET  /interaction-patterns
│   └── GET  /streak-data
│
└── /export
    └── POST /data
```

### Authentication Flow

```
1. User signs up/logs in
   POST /auth/signup
   → Returns: { accessToken, refreshToken }

2. Client stores tokens
   - accessToken in memory
   - refreshToken in secure storage

3. Client makes authenticated request
   Authorization: Bearer <accessToken>

4. Token expires (1 hour)
   Server returns 401 with TOKEN_EXPIRED

5. Client refreshes token
   POST /auth/refresh
   { refreshToken }
   → Returns: { new accessToken, new refreshToken }

6. Client retries original request
```

---

## Storage Architecture

### Database Schema Design

#### Core Entities
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Psychological Profiles
CREATE TABLE psychological_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  attachment_style TEXT,
  communication_style TEXT,
  conflict_pattern TEXT,
  updated_at TIMESTAMPTZ
);

-- Core Values
CREATE TABLE core_values (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('Primary', 'Secondary', 'Aspirational')),
  value TEXT NOT NULL,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ
);

-- SubSystems (Knowledge Domains)
CREATE TABLE sub_systems (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  item_count INT DEFAULT 0,
  linked_system_ids UUID[],
  embedding VECTOR(384),
  created_at TIMESTAMPTZ
);

-- Content Items
CREATE TABLE content_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  system_id UUID REFERENCES sub_systems(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('article', 'video', 'book', 'podcast', 'note')),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  highlights TEXT[],
  personal_notes TEXT,
  tags TEXT[],
  embedding VECTOR(384),
  created_at TIMESTAMPTZ
);

-- Interactions (Relationship Events)
CREATE TABLE interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('conversation', 'date', 'conflict', 'milestone', 'observation')),
  person TEXT NOT NULL,
  summary TEXT NOT NULL,
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'mixed')),
  emotions TEXT[],
  learnings TEXT,
  embedding VECTOR(384),
  date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ
);

-- Focus Areas (Growth Tracking)
CREATE TABLE focus_areas (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  progress DECIMAL(3,2) CHECK (progress >= 0 AND progress <= 1),
  streak INT DEFAULT 0,
  weekly_change DECIMAL(3,2),
  target_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Vector Indexes
```sql
-- Vector similarity indexes (ivfflat)
CREATE INDEX idx_content_embedding
ON content_items
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_interaction_embedding
ON interactions
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_value_embedding
ON core_values
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

-- Full-text search indexes
CREATE INDEX idx_content_search
ON content_items
USING gin(to_tsvector('english', content));
```

### Graph Data Model

**Node Types:**
- `User` (singleton per user)
- `CoreValue` (3-10 per user)
- `SubSystem` (5-20 per user)
- `ContentItem` (unlimited)
- `Interaction` (unlimited)
- `FocusArea` (3-10 per user)

**Edge Types:**
- `HAS_VALUE` → User to CoreValue
- `HAS_SYSTEM` → User to SubSystem
- `LINKS_TO` → SubSystem to SubSystem (knowledge graph)
- `CONTAINS` → SubSystem to ContentItem
- `RELATES_TO` → Interaction to FocusArea
- `ALIGNS_WITH` → Interaction to CoreValue

### Hybrid Storage Strategy

```
┌──────────────────────────────────────────────────┐
│ Storage Decision Matrix                          │
├──────────────────────────────────────────────────┤
│                                                  │
│ PostgreSQL:                                      │
│   • User accounts, profiles, settings            │
│   • SubSystems, FocusAreas, CoreValues          │
│   • Interactions, Events                         │
│   • Relational integrity, ACID transactions      │
│                                                  │
│ PostgreSQL + pgvector:                           │
│   • ContentItem embeddings                       │
│   • Interaction embeddings                       │
│   • Semantic search (cosine similarity)          │
│                                                  │
│ RuVector:                                        │
│   • High-performance vector search               │
│   • HNSW indexing for speed                     │
│   • Quantization for memory efficiency          │
│   • Tier-based storage (hot/warm/cold)         │
│                                                  │
│ Redis:                                           │
│   • JWT token blacklist (logout)                │
│   • User settings cache (5min TTL)              │
│   • Weekly analytics cache (24hr TTL)           │
│   • Rate limiting counters                       │
│   • Session data                                 │
│                                                  │
│ In-Memory Graph:                                 │
│   • SubSystem linking (fast traversal)          │
│   • Knowledge graph visualization               │
│   • PageRank centrality calculation              │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Security Architecture

### Authentication & Authorization

#### JWT Token Strategy
```javascript
// Access Token (1 hour expiry)
{
  "sub": "usr_1a2b3c4d",     // User ID
  "email": "user@example.com",
  "iat": 1737159600,         // Issued at
  "exp": 1737163200,         // Expires at (1hr)
  "type": "access"
}

// Refresh Token (30 days expiry)
{
  "sub": "usr_1a2b3c4d",
  "token_id": "rt_xyz789",   // Unique token ID
  "iat": 1737159600,
  "exp": 1739751600,         // Expires at (30d)
  "type": "refresh"
}
```

#### Token Lifecycle
1. **Login** → Issue access + refresh tokens
2. **Request** → Verify access token (JWT signature + expiry)
3. **Expired** → Client calls `/auth/refresh` with refresh token
4. **Refresh** → Issue new access + refresh tokens (rotation)
5. **Logout** → Blacklist refresh token in Redis

### Data Encryption

#### At Rest
- **Database:** PostgreSQL TDE (Transparent Data Encryption)
- **Files:** S3 server-side encryption (AES-256)
- **Backups:** Encrypted with KMS

#### In Transit
- **API:** HTTPS only (TLS 1.3)
- **WebSocket/SSE:** WSS with TLS
- **Database:** SSL connections

#### Sensitive Fields (Application-Level Encryption)
- `UserSession.sync_token` → AES-256-GCM
- `ChatMessage.content` (optional) → AES-256-GCM
- `Interaction.summary` (optional) → AES-256-GCM

### Privacy Architecture

#### On-Device Mode
```
User enables privacy mode
    │
    ▼
┌───────────────────────────────────────┐
│ 1. Disable cloud sync                 │
│    • All data stored in SQLite        │
│    • No API calls except LLM          │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 2. Local embedding generation         │
│    • Use quantized model              │
│    • all-MiniLM-L6-v2 (384-dim)      │
│    • Runs on-device                   │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 3. Local vector search                │
│    • SQLite with VSS extension        │
│    • Cosine similarity in SQL         │
└─────────────┬─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────┐
│ 4. LLM calls (optional)               │
│    • Use privacy-preserving API       │
│    • Or disable AI features           │
└───────────────────────────────────────┘
```

#### GDPR Compliance
- **Right to Access** → `GET /users/me/profile`, `POST /export/data`
- **Right to Erasure** → `DELETE /users/me` (cascade delete)
- **Right to Portability** → `POST /export/data` (JSON/CSV export)
- **Right to Rectification** → `PUT /users/me/*` endpoints
- **Data Minimization** → Only collect essential data
- **Consent Management** → Explicit opt-in for external research

---

## Scalability & Performance

### Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| API Response Time (p95) | <500ms | Caching, indexing, query optimization |
| Semantic Search (p95) | <200ms | HNSW indexing, quantization |
| AI Chat Response Start | <2s | Streaming, parallel context retrieval |
| Mobile App Load Time | <2s on 4G | Lazy loading, code splitting |
| Offline Sync Time | <5s for daily changes | Incremental sync, batching |
| Database Query Time (p95) | <100ms | Proper indexes, connection pooling |

### Horizontal Scaling Strategy

```
┌────────────────────────────────────────────────┐
│          Load Balancer (AWS ALB)               │
└─────┬──────────────┬──────────────┬───────────┘
      │              │              │
┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ API Server │ │ API Server │ │ API Server │
│ Instance 1 │ │ Instance 2 │ │ Instance 3 │
└─────┬──────┘ └─────┬──────┘ └─────┬──────┘
      │              │              │
      └──────────────┼──────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ PostgreSQL │ │  RuVector  │ │   Redis    │
│  Primary   │ │  (Sharded) │ │ (Cluster)  │
└────────────┘ └────────────┘ └────────────┘
```

### Caching Strategy

#### Multi-Layer Cache
```
Request → Redis Cache → PostgreSQL → Response
           (5min TTL)    (authoritative)
```

#### Cache Invalidation
- **User Settings** → Invalidate on `PUT /users/me/settings`
- **Weekly Analytics** → Invalidate on new interaction
- **Semantic Search** → LRU cache with 5-minute TTL
- **Graph Data** → Invalidate on system linking changes

### Database Optimization

#### Query Patterns
```sql
-- ✅ OPTIMIZED: Use indexes
SELECT * FROM content_items
WHERE user_id = $1
  AND system_id = $2
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- ✅ OPTIMIZED: Vector search with pre-filter
SELECT id, title,
       1 - (embedding <=> $1) AS similarity
FROM content_items
WHERE user_id = $2
ORDER BY embedding <=> $1
LIMIT 10;

-- ❌ AVOID: Full table scan
SELECT * FROM content_items
WHERE content LIKE '%neural%';

-- ✅ INSTEAD: Use full-text search
SELECT * FROM content_items
WHERE to_tsvector('english', content) @@ to_tsquery('neural');
```

#### Connection Pooling
```typescript
// PostgreSQL connection pool
const pool = new Pool({
  max: 20,              // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### Mobile Optimization

#### Offline-First Architecture
```
1. User action
   ↓
2. Optimistic UI update (immediate)
   ↓
3. Store in local SQLite
   ↓
4. Queue for sync
   ↓
5. Background sync (when online)
   ↓
6. Resolve conflicts (last-write-wins)
```

#### Data Sync Strategy
- **Incremental Sync** → Only sync changes since last sync
- **Batching** → Group multiple updates into single request
- **Compression** → gzip response payloads
- **Pagination** → Cursor-based for large datasets
- **Lazy Loading** → Load recent data first

---

## Deployment Architecture

### Production Deployment (AWS)

```
┌──────────────────────────────────────────────────────┐
│                   AWS Cloud                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────┐         │
│  │  CloudFront CDN                        │         │
│  │  • Static assets (mobile bundles)      │         │
│  │  • Global edge caching                 │         │
│  └───────────────┬────────────────────────┘         │
│                  │                                   │
│  ┌───────────────▼────────────────────────┐         │
│  │  Application Load Balancer             │         │
│  │  • HTTPS termination                   │         │
│  │  • Health checks                       │         │
│  │  • Auto-scaling trigger                │         │
│  └───────────────┬────────────────────────┘         │
│                  │                                   │
│  ┌───────────────▼────────────────────────┐         │
│  │  ECS Fargate Cluster                   │         │
│  │  ┌──────────┐  ┌──────────┐           │         │
│  │  │API Server│  │API Server│ (Auto-scale)         │
│  │  │Container │  │Container │           │         │
│  │  └─────┬────┘  └─────┬────┘           │         │
│  └────────┼─────────────┼─────────────────┘         │
│           │             │                            │
│  ┌────────▼─────────────▼────────────────┐         │
│  │  RDS PostgreSQL (Multi-AZ)            │         │
│  │  • Primary + Read Replica             │         │
│  │  • Automated backups                  │         │
│  │  • Point-in-time recovery             │         │
│  └───────────────────────────────────────┘         │
│                                                      │
│  ┌────────────────────────────────────────┐         │
│  │  ElastiCache Redis (Cluster Mode)     │         │
│  │  • Session cache                       │         │
│  │  • Rate limiting                       │         │
│  └───────────────────────────────────────┘         │
│                                                      │
│  ┌────────────────────────────────────────┐         │
│  │  S3 Buckets                            │         │
│  │  • User uploads (private)              │         │
│  │  • Data exports                        │         │
│  └───────────────────────────────────────┘         │
│                                                      │
│  ┌────────────────────────────────────────┐         │
│  │  Secrets Manager                       │         │
│  │  • Database credentials                │         │
│  │  • API keys (OpenAI, SerpAPI)         │         │
│  └───────────────────────────────────────┘         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Infrastructure as Code (Terraform)
```hcl
# Example Terraform configuration
resource "aws_ecs_cluster" "pka_relate" {
  name = "pka-relate-cluster"
}

resource "aws_ecs_service" "api" {
  name            = "pka-relate-api"
  cluster         = aws_ecs_cluster.pka_relate.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_configuration {
    minimum_healthy_percent = 50
    maximum_percent         = 200
  }
}

resource "aws_db_instance" "postgres" {
  identifier           = "pka-relate-db"
  engine              = "postgres"
  engine_version      = "14.7"
  instance_class      = "db.t3.medium"
  allocated_storage   = 100
  storage_encrypted   = true
  multi_az            = true

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
}
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run typecheck

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: pka-relate/api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster pka-relate-cluster \
            --service pka-relate-api \
            --force-new-deployment
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Reuse PKA-STRAT Infrastructure

**Status:** Accepted

**Context:**
PKA-STRAT has proven vector search, graph storage, and RAG chat infrastructure. PKA-Relate needs similar capabilities for semantic search and AI chat.

**Decision:**
Reuse 60% of PKA-STRAT codebase:
- UnifiedMemory engine
- VectorStore interface (RuVector)
- GraphStore interface
- Document upload pipeline
- RAG chat with source citations

**Consequences:**
- ✅ Faster development (weeks vs months)
- ✅ Battle-tested infrastructure
- ✅ Proven performance (HNSW indexing, GNN ranking)
- ⚠️ Need to adapt pyramid hierarchy to flat SubSystems
- ⚠️ Need to modify alignment scoring for personal growth

---

### ADR-002: Mobile-First Architecture

**Status:** Accepted

**Context:**
Primary use case is mobile relationship tracking on-the-go. Desktop web is secondary for detailed analytics.

**Decision:**
Build React Native mobile app as primary client with optional web dashboard.

**Consequences:**
- ✅ Native mobile UX (bottom tabs, gestures, biometrics)
- ✅ Offline-first capabilities (SQLite + sync)
- ✅ Push notifications
- ⚠️ Need to maintain two codebases (mobile + backend)
- ⚠️ Limited code sharing with web (shared API only)

---

### ADR-003: PostgreSQL + pgvector for Primary Storage

**Status:** Accepted

**Context:**
Need ACID transactions for user data, relational integrity, and vector similarity search.

**Decision:**
Use PostgreSQL 14+ with pgvector extension as primary database.

**Consequences:**
- ✅ ACID compliance for user data integrity
- ✅ Vector embeddings co-located with relational data
- ✅ Mature ecosystem, excellent tooling
- ✅ Easy backup/restore, point-in-time recovery
- ⚠️ Vector search slower than specialized DBs (mitigated by HNSW indexes)
- ⚠️ Need to manage index maintenance

---

### ADR-004: Streaming AI Chat with SSE

**Status:** Accepted

**Context:**
Users expect real-time AI responses like ChatGPT. Waiting 10+ seconds for full response hurts UX.

**Decision:**
Implement Server-Sent Events (SSE) for streaming chat responses.

**Consequences:**
- ✅ Real-time response streaming (tokens appear as generated)
- ✅ Better perceived performance
- ✅ Can show "thinking" indicators
- ⚠️ More complex client handling
- ⚠️ Need to handle connection failures gracefully

---

### ADR-005: Tough Love Mode with Behavioral Analysis

**Status:** Accepted

**Context:**
Users want accountability, not just validation. Relationship growth requires addressing blind spots.

**Decision:**
Implement "tough love" mode that detects contradictions between stated goals and reported behaviors.

**Consequences:**
- ✅ Differentiated feature (non-sycophantic AI)
- ✅ Drives personal growth
- ✅ Uses existing data (FocusAreas, Interactions)
- ⚠️ Risk of offending users if too aggressive
- ⚠️ Need careful prompt engineering
- ⚠️ Requires user opt-in

---

### ADR-006: Hybrid Vector + Graph Search

**Status:** Accepted

**Context:**
Pure vector search misses graph relationships (linked SubSystems). Pure graph search misses semantic similarity.

**Decision:**
Combine vector similarity (0.6 weight) + graph centrality (0.4 weight) for hybrid ranking.

**Consequences:**
- ✅ Better context retrieval (related systems get boosted)
- ✅ Leverages both semantic and structural information
- ⚠️ More complex ranking algorithm
- ⚠️ Need to tune weights empirically

---

### ADR-007: Flat 3-Level Hierarchy (Values → SubSystems → Content)

**Status:** Accepted

**Context:**
PKA-STRAT has 8-level pyramid (Mission→Vision→...→Tasks). Too complex for personal use.

**Decision:**
Simplify to 3 levels: CoreValues (mission) → SubSystems (domains) → ContentItems (knowledge).

**Consequences:**
- ✅ Simpler mental model for users
- ✅ Faster queries (less joins)
- ✅ More flexible (user-defined SubSystems)
- ⚠️ Lose fine-grained alignment scoring
- ⚠️ Need to adapt PKA-STRAT's PyramidEntity model

---

### ADR-008: JWT with Refresh Token Rotation

**Status:** Accepted

**Context:**
Need secure authentication with good UX (don't force re-login frequently).

**Decision:**
Use short-lived access tokens (1hr) + long-lived refresh tokens (30d) with rotation on refresh.

**Consequences:**
- ✅ Security: Stolen access token expires quickly
- ✅ UX: Users stay logged in for 30 days
- ✅ Rotation: Refresh token changes on each use (prevents replay)
- ⚠️ More complex token management
- ⚠️ Need Redis for token blacklist

---

### ADR-009: On-Device Privacy Mode

**Status:** Accepted

**Context:**
Relationship data is highly sensitive. Some users want zero cloud storage.

**Decision:**
Support optional on-device mode: all data in SQLite, local embeddings, no sync.

**Consequences:**
- ✅ Privacy-first for sensitive users
- ✅ GDPR compliance (data never leaves device)
- ✅ Works offline by default
- ⚠️ Limited AI capabilities (need local LLM or API calls)
- ⚠️ No multi-device sync
- ⚠️ Risk of data loss if device lost

---

### ADR-010: External Research via SerpAPI

**Status:** Accepted

**Context:**
User's personal library may lack expert content. Need to integrate external sources (Esther Perel, John Gottman, etc.).

**Decision:**
Use SerpAPI to search for thought leader content, scrape, cache (24hr TTL), and include in RAG context.

**Consequences:**
- ✅ Access to expert content beyond user's library
- ✅ Fresh content (recent articles)
- ✅ Differentiated feature
- ⚠️ Cost: $0.002/search (budget carefully)
- ⚠️ Legal: Respect robots.txt, copyright
- ⚠️ Quality: Web scraping can be unreliable

---

## Appendix A: Technology Evaluation Matrix

### Vector Database Options

| Technology | Pros | Cons | Decision |
|------------|------|------|----------|
| **PostgreSQL + pgvector** | ✅ Co-located with relational data<br>✅ ACID compliance<br>✅ Mature tooling | ⚠️ Slower than specialized DBs<br>⚠️ Index maintenance | ✅ **Selected** |
| **Pinecone** | ✅ Fast vector search<br>✅ Managed service | ❌ Separate from relational DB<br>❌ Cost at scale | ❌ Rejected |
| **Weaviate** | ✅ Fast hybrid search<br>✅ Graph features | ❌ Another DB to manage<br>❌ Learning curve | ❌ Rejected |
| **RuVector** (PKA-STRAT) | ✅ Proven in PKA-STRAT<br>✅ HNSW indexing<br>✅ Quantization | ⚠️ Custom solution<br>⚠️ Maintenance burden | ✅ **Use alongside PostgreSQL** |

### LLM Provider Options

| Provider | Model | Pros | Cons | Decision |
|----------|-------|------|------|----------|
| **Anthropic** | Claude 3.5 Sonnet | ✅ Best for nuanced advice<br>✅ 200k context window<br>✅ Strong reasoning | ⚠️ Cost: $3/1M tokens | ✅ **Recommended** |
| **OpenAI** | GPT-4 Turbo | ✅ Reliable performance<br>✅ Strong ecosystem | ⚠️ Cost: $10/1M tokens<br>⚠️ Shorter context | ⚠️ Alternative |
| **OpenRouter** | Multiple models | ✅ Model flexibility<br>✅ Lower cost | ⚠️ Complexity<br>⚠️ Quality variance | ⚠️ Backup option |

### Embedding Model Options

| Model | Dimensions | Pros | Cons | Decision |
|-------|-----------|------|------|----------|
| **text-embedding-3-small** (OpenAI) | 1536 | ✅ High quality<br>✅ Managed API | ⚠️ Cost: $0.02/1M tokens<br>❌ API dependency | ✅ **Cloud Mode** |
| **all-MiniLM-L6-v2** (Sentence Transformers) | 384 | ✅ Fast<br>✅ Free<br>✅ Runs locally | ⚠️ Lower quality<br>⚠️ Need quantization | ✅ **Privacy Mode** |
| **all-mpnet-base-v2** | 768 | ✅ Higher quality | ⚠️ Slower<br>⚠️ Larger | ⚠️ Alternative |

---

## Appendix B: Migration Plan from PKA-STRAT

### Phase 1: Core Infrastructure (Week 1-2)
- ✅ Copy UnifiedMemory engine
- ✅ Adapt VectorStore for RuVector
- ✅ Adapt GraphStore for SubSystems
- ✅ Set up PostgreSQL schema
- ⚠️ Modify PyramidEntity → SubSystem

### Phase 2: API Foundation (Week 3-4)
- ✅ Set up Express API server
- ✅ Implement JWT authentication
- ⚠️ Create user management routes
- ⚠️ Create SubSystem CRUD routes
- ⚠️ Adapt document upload → content items

### Phase 3: Chat & Search (Week 5-6)
- ✅ Reuse chat service from PKA-STRAT
- ⚠️ Add streaming SSE support
- ⚠️ Implement tough love mode
- ⚠️ Add external research integration
- ✅ Reuse semantic search

### Phase 4: Analytics & Growth (Week 7-8)
- ⚠️ Build interaction tracking
- ⚠️ Build focus area progress
- ⚠️ Build weekly analytics
- ⚠️ Build drift detection
- ⚠️ Adapt PKA-STRAT drift alerts

### Phase 5: Mobile Client (Week 9-10)
- ⚠️ React Native app setup
- ⚠️ Offline-first SQLite
- ⚠️ API integration
- ⚠️ Push notifications
- ⚠️ Background sync

---

## Document Status

**Version:** 1.0
**Status:** ✅ Complete
**Next Steps:**
1. Review with technical team
2. Validate technology choices with stakeholders
3. Create implementation tickets from ADRs
4. Begin Phase 1 development

**Architecture Owner:** SystemDesigner Agent
**Review Cycle:** Quarterly or on significant changes
**Last Updated:** 2025-12-30
