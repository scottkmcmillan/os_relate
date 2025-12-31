# PKA-Relate Implementation Plan

**Project**: Migration from PKA-STRAT (Strategic Alignment) to PKA-Relate (Relationship Management)
**Date**: 2025-12-30
**Status**: Planning Phase
**Prepared by**: Hive Mind Tester/Planner Agent

---

## Executive Summary

This implementation plan outlines the complete migration path from PKA-STRAT (organizational strategic alignment platform) to PKA-Relate (personal relationship management assistant). The migration leverages the existing backend infrastructure including:

- **UnifiedMemory** system for vector-based semantic search
- **GraphStore** for knowledge graph relationships
- **Express API server** with modular route architecture
- **Ruvector** integration for embeddings and hypergraph
- **Better-SQLite3** for local data persistence

The implementation is structured in 5 phases over an estimated 8-12 weeks, with each phase building incrementally on the previous infrastructure.

---

## Current Architecture Analysis

### Existing Backend Structure

```
src/
├── api/
│   ├── middleware/       # Auth, CORS, RBAC, Error handling
│   ├── routes/           # Pyramid, alignment, drift, chat, documents, search
│   ├── server.ts         # Express server setup
│   └── types.ts          # API type definitions
├── pka/
│   ├── alignment/        # Alignment calculator, drift detector
│   ├── memory.ts         # PKA memory manager
│   ├── types.ts          # Pyramid entities, alignment scores
│   └── index.ts
├── memory/
│   ├── vectorStore.ts    # Ruvector integration
│   ├── graphStore.ts     # Knowledge graph
│   ├── cognitive.ts      # SONA/GNN learning
│   ├── collections.ts    # Collection manager
│   └── index.ts          # Unified memory facade
└── embedding.ts          # Embedding generation
```

### Reusable Components

✅ **Can be reused directly**:
- `src/memory/index.ts` - UnifiedMemory system
- `src/memory/vectorStore.ts` - Vector search
- `src/memory/graphStore.ts` - Graph relationships
- `src/memory/cognitive.ts` - Active learning
- `src/embedding.ts` - Embedding generation
- `src/api/middleware/` - All middleware (auth, CORS, error handling)
- `src/api/server.ts` - Base server structure

🔄 **Needs adaptation**:
- `src/pka/` - Transform from org alignment to personal relationships
- `src/api/routes/` - New endpoints for relationship features
- `src/api/types.ts` - Add PKA-Relate types

---

## Data Model Mapping

### PKA-STRAT → PKA-Relate Transformation

| PKA-STRAT Entity | PKA-Relate Entity | Transformation Notes |
|-----------------|------------------|---------------------|
| `PyramidEntity` | `SubSystem` | Hierarchical knowledge domains |
| `AlignmentScore` | `FocusAreaProgress` | Personal growth tracking |
| `DriftAlert` | `RelationshipInsight` | Relationship quality monitoring |
| `ProvenanceChain` | `ValueAlignment` | Tracking alignment to core values |
| `DocumentIngestion` | `ContentItem` | Knowledge base content |
| `Organization` | `User` | Single-user architecture |
| `Team` | N/A | Not needed (single user) |

### New Entities for PKA-Relate

1. **User Profile**
   - `User` - Core user entity
   - `PsychologicalProfile` - Attachment style, communication patterns
   - `CoreValue` - User's guiding principles
   - `Mentor` - Guidance sources

2. **Knowledge System**
   - `SubSystem` - Knowledge domains (Dating, Communication, etc.)
   - `SystemLink` - Graph edges between systems
   - `ContentItem` - Notes, articles, books, videos, podcasts

3. **Relationship Tracking**
   - `Interaction` - Logged relationship events
   - `RelationshipMetrics` - Quality scores over time
   - `RelationshipInsight` - AI-generated alerts

4. **Growth & Analytics**
   - `FocusArea` - Skills being developed
   - `FocusAreaProgress` - Progress checkpoints
   - `WeeklySummary` - Analytics aggregation
   - `AccountabilityAlert` - Engagement nudges

5. **AI Assistant**
   - `Conversation` - Chat threads
   - `ChatMessage` - Individual messages
   - `ChatSource` - Source citations

6. **Calendar**
   - `UpcomingEvent` - Planned interactions
   - `UserSettings` - App preferences

---

## Phase 1: Core Infrastructure (Week 1-2)

### Objectives
- Set up database schema and migrations
- Implement authentication and user management
- Create base API structure for PKA-Relate

### Database Schema

**Location**: `/src/database/schema.ts`

```typescript
// SQLite schema using better-sqlite3
export const createTables = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_enabled INTEGER DEFAULT 0,
    sync_token TEXT
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    last_active_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS psychological_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    attachment_style TEXT CHECK(attachment_style IN ('Secure', 'Anxious', 'Avoidant', 'Disorganized')),
    attachment_updated_at TEXT,
    communication_style TEXT CHECK(communication_style IN ('Direct', 'Indirect', 'Assertive', 'Passive')),
    communication_updated_at TEXT,
    conflict_pattern TEXT,
    conflict_updated_at TEXT,
    traits TEXT, -- JSON object
    completeness_score REAL DEFAULT 0.0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    push_notifications_enabled INTEGER DEFAULT 1,
    data_privacy_strict INTEGER DEFAULT 0,
    reflection_reminder_enabled INTEGER DEFAULT 1,
    reflection_reminder_time TEXT DEFAULT '21:00',
    app_lock_enabled INTEGER DEFAULT 0,
    tough_love_mode_enabled INTEGER DEFAULT 0,
    theme TEXT DEFAULT 'auto',
    language TEXT DEFAULT 'en',
    notifications TEXT, -- JSON object
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_sessions_user ON user_sessions(user_id);
  CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
`;
```

### Files to Create/Modify

**Create**:
1. `/src/database/schema.ts` - Database table definitions
2. `/src/database/migrations.ts` - Migration runner
3. `/src/database/index.ts` - Database connection manager
4. `/src/api/routes/auth.ts` - Authentication endpoints
5. `/src/api/routes/users.ts` - User profile endpoints
6. `/src/services/auth.ts` - JWT token management
7. `/tests/api/auth.test.ts` - Authentication tests

**Modify**:
1. `/src/api/routes/index.ts` - Add new route registrations
2. `/src/api/server.ts` - Initialize database on startup
3. `/src/api/types.ts` - Add PKA-Relate types

### API Endpoints

```typescript
// Authentication
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me

// User Profile
GET    /api/users/me/profile
PUT    /api/users/me/profile
GET    /api/users/me/psychological-profile
PUT    /api/users/me/psychological-profile
GET    /api/users/me/settings
PUT    /api/users/me/settings
```

### Dependencies
- ✅ `better-sqlite3` - Already installed
- ✅ `express` - Already installed
- Need to add: `jsonwebtoken`, `bcrypt`, `uuid`

### Testing Requirements
- [ ] User registration flow
- [ ] Login with JWT token generation
- [ ] Token refresh mechanism
- [ ] Profile CRUD operations
- [ ] Settings persistence

### Estimated Complexity: **Medium**
- Database schema design: 2 days
- Authentication service: 3 days
- API endpoints: 2 days
- Testing: 1 day

---

## Phase 2: Knowledge System (Week 3-4)

### Objectives
- Implement SubSystems and ContentItems
- Integrate with UnifiedMemory for vector search
- Build knowledge graph relationships

### Database Schema

**Location**: `/src/database/schema.ts` (append)

```typescript
export const knowledgeSystemTables = `
  CREATE TABLE IF NOT EXISTS core_values (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT CHECK(category IN ('Primary', 'Secondary', 'Aspirational')),
    value TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    reference_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mentors (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    reference_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sub_systems (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT CHECK(icon IN ('grid', 'heart', 'shield', 'flower', 'users', 'star', 'book', 'target')),
    color TEXT NOT NULL,
    item_count INTEGER DEFAULT 0,
    linked_system_ids TEXT, -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    graph_position TEXT, -- JSON object {x, y}
    is_default INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS system_links (
    id TEXT PRIMARY KEY,
    source_system_id TEXT NOT NULL,
    target_system_id TEXT NOT NULL,
    strength REAL DEFAULT 1.0,
    description TEXT,
    created_at TEXT NOT NULL,
    shared_items_count INTEGER DEFAULT 0,
    FOREIGN KEY (source_system_id) REFERENCES sub_systems(id) ON DELETE CASCADE,
    FOREIGN KEY (target_system_id) REFERENCES sub_systems(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS content_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    system_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('note', 'article', 'book', 'video', 'podcast')),
    title TEXT NOT NULL,
    content TEXT,
    url TEXT,
    highlights TEXT, -- JSON array
    personal_notes TEXT,
    tags TEXT, -- JSON array
    linked_system_ids TEXT, -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    source_metadata TEXT, -- JSON object
    reference_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (system_id) REFERENCES sub_systems(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_content_items_user ON content_items(user_id);
  CREATE INDEX idx_content_items_system ON content_items(system_id);
  CREATE INDEX idx_content_items_type ON content_items(type);
  CREATE INDEX idx_sub_systems_user ON sub_systems(user_id);
  CREATE INDEX idx_core_values_user ON core_values(user_id);
`;
```

### Files to Create/Modify

**Create**:
1. `/src/services/subsystems.ts` - SubSystem management
2. `/src/services/contentItems.ts` - Content item management
3. `/src/api/routes/systems.ts` - SubSystem endpoints
4. `/src/api/routes/content.ts` - Content item endpoints
5. `/src/api/routes/values.ts` - Core values endpoints
6. `/src/api/routes/mentors.ts` - Mentors endpoints
7. `/src/utils/defaultSystems.ts` - Seed default systems
8. `/tests/services/subsystems.test.ts`
9. `/tests/services/contentItems.test.ts`

**Modify**:
1. `/src/api/routes/index.ts` - Register new routes
2. `/src/memory/index.ts` - Add PKA-Relate document types

### API Endpoints

```typescript
// Core Values
GET    /api/users/me/values
POST   /api/users/me/values
DELETE /api/users/me/values/:id

// Mentors
GET    /api/users/me/mentors
POST   /api/users/me/mentors
DELETE /api/users/me/mentors/:id

// Sub-Systems
GET    /api/systems
POST   /api/systems
GET    /api/systems/:id
PUT    /api/systems/:id
DELETE /api/systems/:id
GET    /api/systems/:id/items
POST   /api/systems/:id/items
GET    /api/systems/graph
POST   /api/systems/:id/link/:targetId
DELETE /api/systems/:id/link/:targetId

// Content Items
GET    /api/content-items
GET    /api/content-items/:id
PUT    /api/content-items/:id
DELETE /api/content-items/:id
GET    /api/content-items/search?q=
```

### Vector Store Integration

**Service**: `/src/services/vectorSearch.ts`

```typescript
import { createUnifiedMemory } from '../memory/index.js';

export class VectorSearchService {
  private memory = createUnifiedMemory();

  async indexContentItem(item: ContentItem): Promise<void> {
    await this.memory.addDocument({
      id: item.id,
      title: item.title,
      text: item.content || item.personal_notes || '',
      source: item.url,
      category: item.type,
      tags: item.tags,
      metadata: {
        userId: item.user_id,
        systemId: item.system_id,
        type: item.type,
        createdAt: item.created_at
      }
    });

    // Add graph relationships
    if (item.linked_system_ids.length > 0) {
      for (const linkedId of item.linked_system_ids) {
        this.memory.addRelationship({
          from: item.system_id,
          to: linkedId,
          type: 'SHARES_CONTENT',
          properties: { contentItemId: item.id }
        });
      }
    }
  }

  async searchContent(
    userId: string,
    query: string,
    filters?: { systemIds?: string[], contentTypes?: string[] }
  ): Promise<SearchResult[]> {
    return this.memory.search(query, {
      k: 20,
      filters: {
        userId,
        systemId: filters?.systemIds,
        type: filters?.contentTypes
      },
      includeRelated: true,
      graphDepth: 2
    });
  }
}
```

### Default Systems Seeding

**Utility**: `/src/utils/defaultSystems.ts`

```typescript
export const DEFAULT_SYSTEMS = [
  {
    name: 'General',
    description: 'General relationship and personal development knowledge',
    icon: 'grid',
    color: 'hsl(0, 0%, 50%)'
  },
  {
    name: 'Dating',
    description: 'Dating strategies, attraction, and courtship dynamics',
    icon: 'heart',
    color: 'hsl(340, 82%, 52%)'
  },
  {
    name: 'Masculinity',
    description: 'Masculine development and identity',
    icon: 'shield',
    color: 'hsl(221, 83%, 53%)'
  },
  {
    name: 'Femininity',
    description: 'Feminine energy and expression',
    icon: 'flower',
    color: 'hsl(280, 83%, 53%)'
  },
  {
    name: 'Management',
    description: 'Leadership and professional relationship management',
    icon: 'users',
    color: 'hsl(142, 71%, 45%)'
  }
];
```

### Testing Requirements
- [ ] CRUD operations for SubSystems
- [ ] Content item creation and linking
- [ ] Vector search for content items
- [ ] Graph traversal for related systems
- [ ] Default systems seeded on signup
- [ ] Multi-system content linking

### Estimated Complexity: **High**
- Database schema: 2 days
- SubSystem service: 3 days
- Content item service: 3 days
- Vector integration: 2 days
- API endpoints: 2 days
- Testing: 2 days

---

## Phase 3: AI Assistant & RAG (Week 5-6)

### Objectives
- Build chat interface with conversation history
- Implement RAG (Retrieval-Augmented Generation) for AI responses
- Integrate "tough love" mode for candid feedback
- Source citations from knowledge base

### Database Schema

**Location**: `/src/database/schema.ts` (append)

```typescript
export const chatSystemTables = `
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_message_at TEXT NOT NULL,
    archived INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources TEXT, -- JSON array of ChatSource
    is_tough_love INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    feedback TEXT CHECK(feedback IN ('positive', 'negative', NULL)),
    related_interaction_ids TEXT, -- JSON array
    related_content_ids TEXT, -- JSON array
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id);
  CREATE INDEX idx_messages_created ON chat_messages(created_at DESC);
  CREATE INDEX idx_conversations_user ON conversations(user_id);
`;
```

### Files to Create/Modify

**Create**:
1. `/src/services/chat.ts` - Chat orchestration
2. `/src/services/rag.ts` - RAG implementation
3. `/src/services/aiProvider.ts` - LLM integration (Claude/OpenAI)
4. `/src/api/routes/chat.ts` - Chat endpoints
5. `/tests/services/rag.test.ts`

**Modify**:
1. `/src/api/routes/index.ts` - Add chat routes
2. `/src/memory/index.ts` - Optimize for RAG retrieval

### API Endpoints

```typescript
// Chat
GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages
POST   /api/conversations/:id/feedback
DELETE /api/conversations/:id
```

### RAG Service Architecture

**Service**: `/src/services/rag.ts`

```typescript
import { VectorSearchService } from './vectorSearch.js';
import { AIProvider } from './aiProvider.js';

export class RAGService {
  constructor(
    private vectorSearch: VectorSearchService,
    private aiProvider: AIProvider
  ) {}

  async generateResponse(
    userId: string,
    query: string,
    conversationHistory: ChatMessage[],
    toughLoveMode: boolean
  ): Promise<{
    content: string;
    sources: ChatSource[];
    isToughLove: boolean;
  }> {
    // 1. Semantic search for relevant content
    const searchResults = await this.vectorSearch.searchContent(
      userId,
      query,
      { k: 5, includeRelated: true }
    );

    // 2. Build context from search results
    const context = this.buildContext(searchResults);

    // 3. Build prompt with conversation history
    const prompt = this.buildPrompt({
      query,
      context,
      history: conversationHistory.slice(-5), // Last 5 messages
      toughLoveMode
    });

    // 4. Generate AI response
    const aiResponse = await this.aiProvider.generateCompletion(prompt);

    // 5. Extract sources
    const sources = searchResults.map(r => ({
      title: r.title,
      author: r.metadata.author,
      contentItemId: r.id,
      relevanceScore: r.vectorScore
    }));

    return {
      content: aiResponse,
      sources,
      isToughLove: toughLoveMode && this.containsToughLove(aiResponse)
    };
  }

  private buildPrompt(params: {
    query: string;
    context: string;
    history: ChatMessage[];
    toughLoveMode: boolean;
  }): string {
    const systemPrompt = params.toughLoveMode
      ? `You are a candid relationship coach. Challenge the user when their behavior contradicts healthy principles. Cite specific sources when giving advice.`
      : `You are a supportive relationship assistant. Provide thoughtful advice based on the knowledge base. Cite specific sources.`;

    const contextSection = `
# Knowledge Base Context
${params.context}

# Previous Conversation
${params.history.map(m => `${m.type}: ${m.content}`).join('\n')}

# User Question
${params.query}

Provide a response based on the knowledge base context. Include source citations.
`;

    return `${systemPrompt}\n\n${contextSection}`;
  }

  private buildContext(results: SearchResult[]): string {
    return results.map((r, i) => `
[Source ${i + 1}] ${r.title}
${r.text.slice(0, 500)}...
    `).join('\n\n');
  }

  private containsToughLove(response: string): boolean {
    const toughLoveIndicators = [
      'actually',
      'however',
      'contradicts',
      'but consider',
      'based on the evidence'
    ];
    return toughLoveIndicators.some(ind =>
      response.toLowerCase().includes(ind)
    );
  }
}
```

### AI Provider Integration

**Service**: `/src/services/aiProvider.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

export class AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async generateCompletion(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    return response.content[0].type === 'text'
      ? response.content[0].text
      : '';
  }
}
```

### Dependencies
- Need to add: `@anthropic-ai/sdk` or `openai`

### Testing Requirements
- [ ] Conversation creation and retrieval
- [ ] Message persistence
- [ ] RAG context building
- [ ] Source citation extraction
- [ ] Tough love mode activation
- [ ] Feedback collection

### Estimated Complexity: **High**
- Database schema: 1 day
- RAG service: 4 days
- AI provider integration: 2 days
- Chat API: 2 days
- Testing: 2 days

---

## Phase 4: Interactions & Analytics (Week 7-9)

### Objectives
- Log relationship interactions
- Track focus areas and progress
- Generate weekly summaries
- Calculate relationship metrics
- Create accountability alerts

### Database Schema

**Location**: `/src/database/schema.ts` (append)

```typescript
export const analyticsSystemTables = `
  CREATE TABLE IF NOT EXISTS focus_areas (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    progress REAL DEFAULT 0.0,
    streak INTEGER DEFAULT 0,
    weekly_change REAL DEFAULT 0.0,
    target_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    linked_value_ids TEXT, -- JSON array
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS focus_area_progress (
    id TEXT PRIMARY KEY,
    focus_area_id TEXT NOT NULL,
    progress_score REAL NOT NULL,
    notes TEXT,
    recorded_at TEXT NOT NULL,
    interaction_ids TEXT, -- JSON array
    FOREIGN KEY (focus_area_id) REFERENCES focus_areas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('conversation', 'date', 'conflict', 'milestone', 'observation')),
    person TEXT NOT NULL,
    summary TEXT NOT NULL,
    outcome TEXT CHECK(outcome IN ('positive', 'neutral', 'negative', 'mixed')),
    emotions TEXT, -- JSON array
    learnings TEXT,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    linked_focus_area_ids TEXT, -- JSON array
    linked_value_ids TEXT, -- JSON array
    related_content_ids TEXT, -- JSON array
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS relationship_metrics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    person TEXT NOT NULL,
    quality_score REAL NOT NULL,
    previous_score REAL,
    trend TEXT CHECK(trend IN ('improving', 'declining', 'stable')),
    calculated_at TEXT NOT NULL,
    components TEXT, -- JSON object with breakdown
    interaction_ids TEXT, -- JSON array
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS relationship_insights (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    person TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low')),
    type TEXT CHECK(type IN ('drift', 'opportunity', 'pattern', 'milestone')),
    description TEXT NOT NULL,
    recommendations TEXT, -- JSON array
    detected_at TEXT NOT NULL,
    acknowledged INTEGER DEFAULT 0,
    interaction_ids TEXT, -- JSON array
    metrics_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (metrics_id) REFERENCES relationship_metrics(id)
  );

  CREATE TABLE IF NOT EXISTS weekly_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    interactions_logged INTEGER DEFAULT 0,
    insights_gained INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    week_over_week_change TEXT, -- JSON object
    top_focus_areas TEXT, -- JSON array
    generated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS accountability_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('reminder', 'milestone', 'drift', 'encouragement')),
    message TEXT NOT NULL,
    suggested_action TEXT,
    created_at TEXT NOT NULL,
    acknowledged INTEGER DEFAULT 0,
    focus_area_id TEXT,
    person TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (focus_area_id) REFERENCES focus_areas(id)
  );

  CREATE INDEX idx_interactions_user ON interactions(user_id);
  CREATE INDEX idx_interactions_date ON interactions(date DESC);
  CREATE INDEX idx_focus_areas_user ON focus_areas(user_id);
  CREATE INDEX idx_metrics_user ON relationship_metrics(user_id);
  CREATE INDEX idx_insights_user ON relationship_insights(user_id);
  CREATE INDEX idx_summaries_user ON weekly_summaries(user_id);
`;
```

### Files to Create/Modify

**Create**:
1. `/src/services/interactions.ts` - Interaction logging
2. `/src/services/focusAreas.ts` - Focus area tracking
3. `/src/services/relationshipMetrics.ts` - Metrics calculation
4. `/src/services/insights.ts` - Insight generation
5. `/src/services/analytics.ts` - Weekly summaries
6. `/src/api/routes/interactions.ts` - Interaction endpoints
7. `/src/api/routes/focusAreas.ts` - Focus area endpoints
8. `/src/api/routes/analytics.ts` - Analytics endpoints
9. `/src/utils/metricsCalculator.ts` - Relationship quality algorithm
10. `/tests/services/relationshipMetrics.test.ts`

**Modify**:
1. `/src/api/routes/index.ts` - Register new routes

### API Endpoints

```typescript
// Focus Areas
GET    /api/users/me/focus-areas
POST   /api/users/me/focus-areas
PUT    /api/users/me/focus-areas/:id
DELETE /api/users/me/focus-areas/:id

// Interactions
GET    /api/interactions
POST   /api/interactions
GET    /api/interactions/:id
PUT    /api/interactions/:id
DELETE /api/interactions/:id
GET    /api/interactions/stats

// Analytics
GET    /api/analytics/weekly-summary
GET    /api/analytics/focus-progress
GET    /api/analytics/interaction-patterns
GET    /api/analytics/streak-data

// Relationship Metrics (calculated, read-only)
GET    /api/relationships/:person/metrics
GET    /api/relationships/:person/insights
```

### Relationship Metrics Calculator

**Utility**: `/src/utils/metricsCalculator.ts`

```typescript
export interface MetricsComponents {
  positive_frequency: number;
  emotional_connection: number;
  communication_quality: number;
  value_alignment: number;
}

export class MetricsCalculator {
  calculateQualityScore(
    interactions: Interaction[],
    timeWindowDays: number = 90
  ): { score: number; components: MetricsComponents } {
    const recentInteractions = this.filterByTimeWindow(
      interactions,
      timeWindowDays
    );

    const components = {
      positive_frequency: this.calculatePositiveFrequency(recentInteractions),
      emotional_connection: this.calculateEmotionalConnection(recentInteractions),
      communication_quality: this.calculateCommunicationQuality(recentInteractions),
      value_alignment: this.calculateValueAlignment(recentInteractions)
    };

    // Weighted average
    const score =
      components.positive_frequency * 0.3 +
      components.emotional_connection * 0.3 +
      components.communication_quality * 0.2 +
      components.value_alignment * 0.2;

    return { score, components };
  }

  private calculatePositiveFrequency(interactions: Interaction[]): number {
    if (interactions.length === 0) return 0;
    const positiveCount = interactions.filter(
      i => i.outcome === 'positive'
    ).length;
    return positiveCount / interactions.length;
  }

  private calculateEmotionalConnection(interactions: Interaction[]): number {
    // Analyze emotion diversity and positive emotions
    const emotionSets = interactions.map(i => new Set(i.emotions));
    const positiveEmotions = ['Connected', 'Hopeful', 'Joyful', 'Loved'];

    let positiveCount = 0;
    let totalEmotions = 0;

    emotionSets.forEach(emotions => {
      emotions.forEach(emotion => {
        totalEmotions++;
        if (positiveEmotions.includes(emotion)) {
          positiveCount++;
        }
      });
    });

    return totalEmotions > 0 ? positiveCount / totalEmotions : 0;
  }

  private calculateCommunicationQuality(interactions: Interaction[]): number {
    // Analyze learnings and summary depth
    const interactionsWithLearnings = interactions.filter(
      i => i.learnings && i.learnings.length > 50
    ).length;

    return interactions.length > 0
      ? interactionsWithLearnings / interactions.length
      : 0;
  }

  private calculateValueAlignment(interactions: Interaction[]): number {
    // Check how many interactions are linked to core values
    const alignedInteractions = interactions.filter(
      i => i.linked_value_ids && i.linked_value_ids.length > 0
    ).length;

    return interactions.length > 0
      ? alignedInteractions / interactions.length
      : 0;
  }

  private filterByTimeWindow(
    interactions: Interaction[],
    days: number
  ): Interaction[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return interactions.filter(
      i => new Date(i.date) >= cutoffDate
    );
  }

  detectTrend(currentScore: number, previousScore: number | null):
    'improving' | 'declining' | 'stable' {
    if (previousScore === null) return 'stable';

    const delta = currentScore - previousScore;
    const threshold = 0.05; // 5% change

    if (delta > threshold) return 'improving';
    if (delta < -threshold) return 'declining';
    return 'stable';
  }
}
```

### Insight Generation Service

**Service**: `/src/services/insights.ts`

```typescript
import { RAGService } from './rag.js';

export class InsightGenerationService {
  constructor(private ragService: RAGService) {}

  async generateInsights(
    userId: string,
    metrics: RelationshipMetrics
  ): Promise<RelationshipInsight[]> {
    const insights: RelationshipInsight[] = [];

    // Drift detection
    if (metrics.trend === 'declining' && metrics.quality_score < 0.6) {
      insights.push({
        id: generateId(),
        user_id: userId,
        person: metrics.person,
        severity: metrics.quality_score < 0.4 ? 'critical' : 'high',
        type: 'drift',
        description: `Relationship quality with ${metrics.person} has declined to ${(metrics.quality_score * 100).toFixed(0)}%`,
        recommendations: await this.generateRecommendations(userId, metrics),
        detected_at: new Date().toISOString(),
        acknowledged: false,
        interaction_ids: metrics.interaction_ids,
        metrics_id: metrics.id
      });
    }

    // Milestone detection
    if (metrics.trend === 'improving' && metrics.quality_score > 0.8) {
      insights.push({
        id: generateId(),
        user_id: userId,
        person: metrics.person,
        severity: 'low',
        type: 'milestone',
        description: `Strong progress with ${metrics.person}! Quality score: ${(metrics.quality_score * 100).toFixed(0)}%`,
        recommendations: ['Continue current practices', 'Deepen connection'],
        detected_at: new Date().toISOString(),
        acknowledged: false,
        interaction_ids: metrics.interaction_ids,
        metrics_id: metrics.id
      });
    }

    return insights;
  }

  private async generateRecommendations(
    userId: string,
    metrics: RelationshipMetrics
  ): Promise<string[]> {
    // Use RAG to generate personalized recommendations
    const query = `Based on declining relationship quality (score: ${metrics.quality_score}) with trend "${metrics.trend}", what specific actions should be taken? Components: ${JSON.stringify(metrics.components)}`;

    const ragResponse = await this.ragService.generateResponse(
      userId,
      query,
      [],
      true // Tough love mode
    );

    // Parse recommendations from AI response
    return this.extractRecommendations(ragResponse.content);
  }

  private extractRecommendations(aiResponse: string): string[] {
    // Simple extraction - look for bullet points or numbered lists
    const lines = aiResponse.split('\n');
    return lines
      .filter(line => line.match(/^[-*•\d.]/))
      .map(line => line.replace(/^[-*•\d.]\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 5); // Max 5 recommendations
  }
}
```

### Weekly Summary Generation

**Service**: `/src/services/analytics.ts`

```typescript
export class AnalyticsService {
  async generateWeeklySummary(
    userId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<WeeklySummary> {
    // Fetch data for the week
    const interactions = await this.getInteractionsBetween(
      userId,
      weekStart,
      weekEnd
    );

    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekInteractions = await this.getInteractionsBetween(
      userId,
      previousWeekStart,
      weekStart
    );

    const focusAreaProgress = await this.getFocusAreaChanges(
      userId,
      weekStart,
      weekEnd
    );

    const summary: WeeklySummary = {
      id: generateId(),
      user_id: userId,
      week_start: weekStart.toISOString(),
      week_end: weekEnd.toISOString(),
      interactions_logged: interactions.length,
      insights_gained: this.countInsights(interactions),
      current_streak: await this.calculateStreak(userId),
      week_over_week_change: {
        interactions: this.calculatePercentChange(
          interactions.length,
          previousWeekInteractions.length
        ),
        insights: this.calculatePercentChange(
          this.countInsights(interactions),
          this.countInsights(previousWeekInteractions)
        )
      },
      top_focus_areas: focusAreaProgress.slice(0, 3),
      generated_at: new Date().toISOString()
    };

    return summary;
  }

  private countInsights(interactions: Interaction[]): number {
    return interactions.filter(i => i.learnings && i.learnings.length > 0).length;
  }

  private calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async calculateStreak(userId: string): Promise<number> {
    // Count consecutive days with at least one interaction
    const allInteractions = await this.getAllInteractions(userId);

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    while (true) {
      const dayInteractions = allInteractions.filter(i => {
        const interactionDate = new Date(i.date);
        interactionDate.setHours(0, 0, 0, 0);
        return interactionDate.getTime() === currentDate.getTime();
      });

      if (dayInteractions.length === 0) break;

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }
}
```

### Testing Requirements
- [ ] Interaction CRUD operations
- [ ] Focus area progress tracking
- [ ] Metrics calculation accuracy
- [ ] Insight generation logic
- [ ] Weekly summary generation
- [ ] Streak calculation
- [ ] Trend detection

### Estimated Complexity: **Very High**
- Database schema: 2 days
- Interaction service: 2 days
- Focus area service: 2 days
- Metrics calculator: 3 days
- Insight generation: 3 days
- Analytics service: 3 days
- API endpoints: 3 days
- Testing: 3 days

---

## Phase 5: Events & Data Export (Week 10-11)

### Objectives
- Implement upcoming events calendar
- Build data export functionality
- Add final integration tests
- Performance optimization

### Database Schema

**Location**: `/src/database/schema.ts` (append)

```typescript
export const eventsAndExportTables = `
  CREATE TABLE IF NOT EXISTS upcoming_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    person TEXT NOT NULL,
    event_type TEXT NOT NULL,
    datetime TEXT NOT NULL,
    preparation_notes TEXT,
    talking_points TEXT, -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    linked_focus_area_ids TEXT, -- JSON array
    related_content_ids TEXT, -- JSON array
    reminder_sent INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    interaction_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (interaction_id) REFERENCES interactions(id)
  );

  CREATE TABLE IF NOT EXISTS data_export_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    format TEXT CHECK(format IN ('json', 'csv', 'pdf')),
    include_types TEXT, -- JSON array
    status TEXT CHECK(status IN ('pending', 'processing', 'ready', 'error')),
    created_at TEXT NOT NULL,
    completed_at TEXT,
    download_url TEXT,
    expires_at TEXT,
    error_message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_events_user ON upcoming_events(user_id);
  CREATE INDEX idx_events_datetime ON upcoming_events(datetime);
  CREATE INDEX idx_export_user ON data_export_requests(user_id);
`;
```

### Files to Create/Modify

**Create**:
1. `/src/services/events.ts` - Event management
2. `/src/services/dataExport.ts` - Export service
3. `/src/api/routes/events.ts` - Event endpoints
4. `/src/api/routes/export.ts` - Export endpoints
5. `/src/utils/exportFormatters/` - JSON, CSV, PDF formatters
6. `/tests/integration/fullWorkflow.test.ts` - End-to-end tests
7. `/tests/performance/loadTest.ts` - Performance benchmarks

**Modify**:
1. `/src/api/routes/index.ts` - Register final routes

### API Endpoints

```typescript
// Events
GET    /api/events
POST   /api/events
GET    /api/events/:id
PUT    /api/events/:id
DELETE /api/events/:id
GET    /api/events/upcoming

// Export
POST   /api/export/data
GET    /api/export/requests
GET    /api/export/requests/:id
GET    /api/export/download/:id
```

### Data Export Service

**Service**: `/src/services/dataExport.ts`

```typescript
import { createWriteStream } from 'fs';
import { join } from 'path';

export class DataExportService {
  private exportDir = './data/exports';

  async createExportRequest(
    userId: string,
    format: 'json' | 'csv' | 'pdf',
    includeTypes: string[]
  ): Promise<DataExportRequest> {
    const request: DataExportRequest = {
      id: generateId(),
      user_id: userId,
      format,
      include_types: includeTypes,
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
      download_url: null,
      expires_at: null
    };

    // Save to database
    await this.saveExportRequest(request);

    // Queue background job
    this.processExportAsync(request);

    return request;
  }

  private async processExportAsync(request: DataExportRequest): Promise<void> {
    try {
      // Update status to processing
      await this.updateExportStatus(request.id, 'processing');

      // Gather all requested data
      const data = await this.gatherUserData(
        request.user_id,
        request.include_types
      );

      // Format according to requested format
      let filePath: string;
      switch (request.format) {
        case 'json':
          filePath = await this.exportToJSON(request.id, data);
          break;
        case 'csv':
          filePath = await this.exportToCSV(request.id, data);
          break;
        case 'pdf':
          filePath = await this.exportToPDF(request.id, data);
          break;
      }

      // Generate download URL (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.updateExportStatus(request.id, 'ready', {
        download_url: `/api/export/download/${request.id}`,
        completed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });

    } catch (error) {
      await this.updateExportStatus(request.id, 'error', {
        error_message: error.message
      });
    }
  }

  private async gatherUserData(
    userId: string,
    includeTypes: string[]
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    for (const type of includeTypes) {
      switch (type) {
        case 'profile':
          data.user = await this.getUser(userId);
          data.psychologicalProfile = await this.getPsychologicalProfile(userId);
          data.settings = await this.getUserSettings(userId);
          break;
        case 'values':
          data.coreValues = await this.getCoreValues(userId);
          data.mentors = await this.getMentors(userId);
          break;
        case 'systems':
          data.subSystems = await this.getSubSystems(userId);
          data.systemLinks = await this.getSystemLinks(userId);
          break;
        case 'content':
          data.contentItems = await this.getContentItems(userId);
          break;
        case 'interactions':
          data.interactions = await this.getInteractions(userId);
          data.relationshipMetrics = await this.getRelationshipMetrics(userId);
          data.insights = await this.getRelationshipInsights(userId);
          break;
        case 'growth':
          data.focusAreas = await this.getFocusAreas(userId);
          data.progress = await this.getFocusAreaProgress(userId);
          data.weeklySummaries = await this.getWeeklySummaries(userId);
          break;
        case 'chat':
          data.conversations = await this.getConversations(userId);
          data.messages = await this.getChatMessages(userId);
          break;
        case 'events':
          data.upcomingEvents = await this.getUpcomingEvents(userId);
          break;
      }
    }

    return data;
  }

  private async exportToJSON(
    requestId: string,
    data: Record<string, any>
  ): Promise<string> {
    const filePath = join(this.exportDir, `${requestId}.json`);

    await fs.promises.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    return filePath;
  }

  private async exportToCSV(
    requestId: string,
    data: Record<string, any>
  ): Promise<string> {
    // Create a ZIP file with multiple CSV files (one per data type)
    const filePath = join(this.exportDir, `${requestId}.zip`);

    // Implementation would use a CSV library to convert each data type
    // and zip them together

    return filePath;
  }

  private async exportToPDF(
    requestId: string,
    data: Record<string, any>
  ): Promise<string> {
    // Generate a formatted PDF report
    const filePath = join(this.exportDir, `${requestId}.pdf`);

    // Implementation would use a PDF library (e.g., pdfkit)
    // to create a nicely formatted report

    return filePath;
  }
}
```

### Event Reminder System

**Service**: `/src/services/events.ts`

```typescript
export class EventService {
  async checkUpcomingEvents(userId: string): Promise<UpcomingEvent[]> {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingEvents = await this.getEventsBetween(
      userId,
      now,
      next24Hours
    );

    // Send reminders for events in next 24 hours
    for (const event of upcomingEvents) {
      if (!event.reminder_sent) {
        await this.sendEventReminder(event);
      }
    }

    return upcomingEvents;
  }

  private async sendEventReminder(event: UpcomingEvent): Promise<void> {
    // Generate preparation briefing using RAG
    const briefing = await this.generateEventBriefing(event);

    // Send notification (push notification or email)
    await this.notificationService.send({
      userId: event.user_id,
      title: `Upcoming: ${event.title}`,
      body: briefing,
      action: `/events/${event.id}`
    });

    // Mark reminder as sent
    await this.updateEvent(event.id, { reminder_sent: true });
  }

  private async generateEventBriefing(event: UpcomingEvent): Promise<string> {
    // Use RAG to create a pre-game briefing
    const query = `Generate a preparation briefing for an upcoming ${event.event_type} with ${event.person}. Event: ${event.title}. ${event.preparation_notes || ''}`;

    const response = await this.ragService.generateResponse(
      event.user_id,
      query,
      [],
      false
    );

    return response.content;
  }
}
```

### Dependencies
- Need to add: `archiver` (for ZIP creation), `pdfkit` (for PDF generation), `csv-writer`

### Testing Requirements
- [ ] Event CRUD operations
- [ ] Event reminder generation
- [ ] Data export in all formats (JSON, CSV, PDF)
- [ ] Export request lifecycle
- [ ] Download URL expiration
- [ ] Full end-to-end workflow test
- [ ] Load testing with 1000+ interactions

### Estimated Complexity: **Medium**
- Database schema: 1 day
- Event service: 2 days
- Export service: 3 days
- Export formatters: 2 days
- API endpoints: 1 day
- Integration tests: 2 days
- Performance optimization: 2 days

---

## Technical Architecture Summary

### Database Technology
- **SQLite** with `better-sqlite3` for local persistence
- **Ruvector** extension for vector embeddings (integrated via UnifiedMemory)
- **GraphStore** for relationship traversal

### API Structure
```
/api
  /auth          - Authentication & sessions
  /users         - User profile & settings
  /values        - Core values management
  /mentors       - Mentor management
  /systems       - Sub-systems & knowledge graph
  /content-items - Content management & search
  /focus-areas   - Growth tracking
  /interactions  - Interaction logging
  /conversations - Chat interface
  /analytics     - Summaries & metrics
  /events        - Calendar & reminders
  /export        - Data export
```

### Key Services Layer
```
/services
  auth.ts                  - JWT & session management
  subsystems.ts            - SubSystem CRUD
  contentItems.ts          - Content management
  vectorSearch.ts          - Semantic search wrapper
  chat.ts                  - Chat orchestration
  rag.ts                   - RAG implementation
  aiProvider.ts            - LLM integration
  interactions.ts          - Interaction logging
  focusAreas.ts            - Focus area tracking
  relationshipMetrics.ts   - Quality score calculation
  insights.ts              - Insight generation
  analytics.ts             - Weekly summaries
  events.ts                - Event management
  dataExport.ts            - Export service
```

### Utilities
```
/utils
  defaultSystems.ts        - Seed data for sub-systems
  metricsCalculator.ts     - Relationship quality algorithm
  exportFormatters/        - JSON, CSV, PDF formatters
  idGenerator.ts           - UUID generation
```

---

## Dependencies to Add

### Production Dependencies
```json
{
  "@anthropic-ai/sdk": "^0.31.0",  // AI provider (or "openai": "^4.0.0")
  "jsonwebtoken": "^9.0.2",         // JWT authentication
  "bcrypt": "^5.1.1",               // Password hashing
  "uuid": "^9.0.1",                 // ID generation
  "archiver": "^7.0.1",             // ZIP creation for exports
  "csv-writer": "^1.6.0",           // CSV export
  "pdfkit": "^0.15.0"               // PDF generation
}
```

### Development Dependencies
```json
{
  "@types/jsonwebtoken": "^9.0.5",
  "@types/bcrypt": "^5.0.2",
  "@types/archiver": "^6.0.2",
  "@types/pdfkit": "^0.13.4"
}
```

---

## Testing Strategy

### Unit Tests
- Each service layer function
- Metrics calculation algorithms
- RAG context building
- Export formatters

### Integration Tests
- Full user signup → profile creation → settings
- Content item creation → vector indexing → search
- Interaction logging → metrics calculation → insight generation
- Chat message → RAG retrieval → AI response
- Export request → data gathering → format conversion

### End-to-End Tests
- Complete user journey:
  1. Sign up
  2. Create sub-systems and add content
  3. Log interactions
  4. Chat with AI assistant
  5. Review analytics
  6. Export data

### Performance Tests
- Vector search with 10,000+ content items
- Graph traversal with 100+ systems
- Weekly summary generation with 500+ interactions
- Concurrent chat requests

### Test Coverage Target
- **Unit tests**: 85%+ coverage
- **Integration tests**: All critical paths
- **E2E tests**: Main user workflows

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Vector search performance degradation | Medium | High | Implement HNSW indexing, result caching |
| RAG context quality issues | High | High | Iterative prompt engineering, user feedback loop |
| Database migration complexity | Medium | Medium | Use incremental migrations, test on copies |
| AI API rate limits | Medium | Medium | Implement request queuing, caching |
| Export file size limits | Low | Medium | Stream large exports, paginate results |

### Data Privacy Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Sensitive relationship data exposure | Low | Critical | Encrypt at rest, strict access controls |
| AI provider data retention | Medium | High | Use providers with data processing agreements |
| Export data leakage | Low | High | Time-limited download URLs, secure deletion |

### User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| "Tough love" mode too harsh | Medium | Medium | User feedback, adjustable sensitivity |
| Insight accuracy issues | High | High | Source citations, user correction mechanism |
| Chat latency | Medium | High | Optimize RAG retrieval, streaming responses |

---

## Success Criteria

### Phase 1 Success
- [ ] User can sign up and log in
- [ ] JWT authentication working
- [ ] Profile CRUD operations functional
- [ ] All unit tests passing

### Phase 2 Success
- [ ] Default sub-systems seeded on signup
- [ ] Content items created and indexed in vector store
- [ ] Semantic search returns relevant results
- [ ] Knowledge graph visualizable

### Phase 3 Success
- [ ] Chat conversation creates and persists
- [ ] RAG retrieves relevant context from content
- [ ] AI responses include source citations
- [ ] Tough love mode activates appropriately

### Phase 4 Success
- [ ] Interactions logged with all metadata
- [ ] Relationship quality scores calculated accurately
- [ ] Insights generated for declining relationships
- [ ] Weekly summaries auto-generated

### Phase 5 Success
- [ ] Events created and reminders sent
- [ ] Data export in all 3 formats (JSON, CSV, PDF)
- [ ] Full E2E workflow completes
- [ ] Performance benchmarks met

### Overall Success Metrics
- **API Response Time**: < 200ms for reads, < 500ms for writes
- **Vector Search**: < 100ms for 10k documents
- **RAG Response**: < 3s end-to-end
- **Test Coverage**: > 85%
- **Zero Critical Bugs** in production

---

## Timeline & Milestones

### Week 1-2: Phase 1 (Infrastructure)
- **Week 1**: Database schema, authentication service
- **Week 2**: User API, testing, documentation

### Week 3-4: Phase 2 (Knowledge System)
- **Week 3**: SubSystems, ContentItems, database integration
- **Week 4**: Vector search integration, graph relationships, testing

### Week 5-6: Phase 3 (AI Assistant)
- **Week 5**: RAG implementation, AI provider integration
- **Week 6**: Chat API, source citations, testing

### Week 7-9: Phase 4 (Analytics)
- **Week 7**: Interactions, FocusAreas
- **Week 8**: Metrics calculation, insights generation
- **Week 9**: Analytics API, testing

### Week 10-11: Phase 5 (Events & Export)
- **Week 10**: Events, export service
- **Week 11**: Integration tests, performance optimization

### Week 12: Buffer & Deployment
- **Final testing**
- **Documentation**
- **Deployment preparation**

---

## File Structure After Implementation

```
src/
├── api/
│   ├── middleware/
│   │   ├── auth.ts             # JWT validation
│   │   ├── cors.ts             # CORS configuration
│   │   ├── error.ts            # Error handling
│   │   ├── rbac.ts             # (may not be needed for single-user)
│   │   └── index.ts
│   ├── routes/
│   │   ├── auth.ts             # NEW: Authentication
│   │   ├── users.ts            # NEW: User profile
│   │   ├── values.ts           # NEW: Core values
│   │   ├── mentors.ts          # NEW: Mentors
│   │   ├── systems.ts          # NEW: Sub-systems
│   │   ├── content.ts          # NEW: Content items
│   │   ├── focusAreas.ts       # NEW: Focus areas
│   │   ├── interactions.ts     # NEW: Interactions
│   │   ├── chat.ts             # NEW: Chat/conversations
│   │   ├── analytics.ts        # NEW: Analytics
│   │   ├── events.ts           # NEW: Events
│   │   ├── export.ts           # NEW: Data export
│   │   ├── index.ts            # MODIFIED: Route registration
│   │   ├── alignment.ts        # LEGACY: May remove
│   │   ├── drift.ts            # LEGACY: May remove
│   │   ├── pyramid.ts          # LEGACY: May remove
│   │   ├── teams.ts            # LEGACY: May remove
│   │   └── reports.ts          # LEGACY: May remove
│   ├── server.ts               # MODIFIED: Add database init
│   └── types.ts                # MODIFIED: Add PKA-Relate types
├── database/
│   ├── schema.ts               # NEW: Database schema
│   ├── migrations.ts           # NEW: Migration runner
│   └── index.ts                # NEW: Database connection
├── services/
│   ├── auth.ts                 # NEW: Authentication service
│   ├── subsystems.ts           # NEW: SubSystem management
│   ├── contentItems.ts         # NEW: Content management
│   ├── vectorSearch.ts         # NEW: Vector search wrapper
│   ├── chat.ts                 # NEW: Chat orchestration
│   ├── rag.ts                  # NEW: RAG implementation
│   ├── aiProvider.ts           # NEW: LLM integration
│   ├── interactions.ts         # NEW: Interaction logging
│   ├── focusAreas.ts           # NEW: Focus area tracking
│   ├── relationshipMetrics.ts  # NEW: Metrics calculation
│   ├── insights.ts             # NEW: Insight generation
│   ├── analytics.ts            # NEW: Analytics service
│   ├── events.ts               # NEW: Event management
│   └── dataExport.ts           # NEW: Export service
├── utils/
│   ├── defaultSystems.ts       # NEW: Seed data
│   ├── metricsCalculator.ts    # NEW: Quality algorithm
│   ├── exportFormatters/       # NEW: Export formatters
│   │   ├── json.ts
│   │   ├── csv.ts
│   │   └── pdf.ts
│   └── idGenerator.ts          # NEW: UUID generation
├── pka/                        # LEGACY: May adapt or remove
│   ├── alignment/
│   ├── memory.ts
│   ├── types.ts
│   └── index.ts
├── memory/                     # EXISTING: Reuse as-is
│   ├── vectorStore.ts
│   ├── graphStore.ts
│   ├── cognitive.ts
│   ├── collections.ts
│   ├── types.ts
│   └── index.ts
├── embedding.ts                # EXISTING: Reuse as-is
└── cli.ts                      # EXISTING: May need updates

tests/
├── api/
│   ├── auth.test.ts
│   ├── systems.test.ts
│   ├── content.test.ts
│   ├── chat.test.ts
│   ├── interactions.test.ts
│   └── analytics.test.ts
├── services/
│   ├── rag.test.ts
│   ├── relationshipMetrics.test.ts
│   ├── insights.test.ts
│   └── dataExport.test.ts
├── integration/
│   └── fullWorkflow.test.ts
└── performance/
    └── loadTest.ts

docs/v2_PKA/PKA-relate/
├── FRONTEND_SPECIFICATION.md
├── relationship_pka_user_stories.md
├── data-models/
│   └── data_models_schema.ts
└── specs/
    ├── implementation_plan.md  # THIS DOCUMENT
    ├── api_endpoints.md        # TO BE CREATED
    ├── database_schema.md      # TO BE CREATED
    └── testing_strategy.md     # TO BE CREATED
```

---

## Next Steps

### Immediate Actions (Next 24 hours)
1. **Review and approve this implementation plan** with stakeholders
2. **Set up development environment**:
   - Clone repository
   - Install new dependencies
   - Configure environment variables (.env)
3. **Create feature branch**: `feature/pka-relate-migration`
4. **Initialize database schema files**

### Week 1 Actions
1. Implement Phase 1: Core Infrastructure
2. Set up authentication endpoints
3. Create database migrations
4. Write unit tests for auth service
5. Daily standup to track progress

### Coordination Protocol
- **Daily updates** via hooks: `npx claude-flow@alpha hooks notify`
- **Task tracking** via memory: Store progress in `.swarm/memory.db`
- **Code reviews** before each phase completion
- **Integration testing** after each phase

---

## Questions & Clarifications Needed

### Technical Decisions
1. **AI Provider**: Claude (Anthropic) or OpenAI GPT-4?
   - Recommendation: Claude 3.5 Sonnet for better reasoning
2. **Authentication**: JWT only or add OAuth (Google, Apple)?
   - Recommendation: Start with JWT, add OAuth in v2
3. **Deployment**: Self-hosted or cloud platform?
   - Recommendation: Start local, prepare for cloud migration

### Feature Scope
1. **Mobile vs Web**: Is this mobile-first with web later?
   - Recommendation: Build API-first, works for both
2. **Mentor Content Scraping**: Auto-fetch from public sources?
   - Recommendation: Phase 2 - user manually adds initially
3. **Relationship Profiles**: Track individual person profiles (CRM-style)?
   - Recommendation: Phase 2 backlog feature

### Data & Privacy
1. **Data Residency**: On-device only or cloud sync?
   - Recommendation: Support both modes via `data_privacy_strict` setting
2. **AI Data Processing**: Anthropic DPA requirements?
   - Recommendation: Use Claude with business tier for data protection

---

## Appendix A: API Endpoint Reference

See `/docs/v2_PKA/PKA-relate/specs/api_endpoints.md` (to be created)

---

## Appendix B: Database Schema Details

See `/docs/v2_PKA/PKA-relate/specs/database_schema.md` (to be created)

---

## Appendix C: Testing Checklist

See `/docs/v2_PKA/PKA-relate/specs/testing_strategy.md` (to be created)

---

**End of Implementation Plan**

*This document will be updated as implementation progresses and requirements evolve.*
