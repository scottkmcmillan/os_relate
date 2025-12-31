# PKA-Relate Backend Modification Specification

## Executive Summary

This document specifies the modifications required to transform the existing PKA-STRAT (Strategic Alignment Platform) backend into a personal relationship management backend for PKA-Relate. The transformation involves converting the business-focused Pyramid of Clarity hierarchy into a personal knowledge sub-system architecture while preserving the core RAG capabilities, graph-based relationships, and alignment tracking mechanisms.

**Document Version:** 1.0.0
**Last Updated:** 2025-12-31
**Status:** Draft Specification

---

## 1. Architecture Overview

### 1.1 Current Architecture (PKA-STRAT)

The existing backend is a document-centric strategic alignment platform for organizations:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PKA-STRAT Backend                           │
├─────────────────────────────────────────────────────────────────┤
│  Express HTTP Server (port 3000)                                │
│  ├── Middleware: CORS, JSON parsing, Error handling             │
│  └── Routes: /api/*                                             │
├─────────────────────────────────────────────────────────────────┤
│  Core Components:                                               │
│  ├── UnifiedMemory        (Vector + Graph + Cognitive)          │
│  ├── PKAMemoryManager     (Pyramid Entity Operations)           │
│  ├── CollectionManager    (Document Collections)                │
│  └── GraphStore           (SQLite-backed graph DB)              │
├─────────────────────────────────────────────────────────────────┤
│  PKA-STRAT Routes:                                              │
│  ├── /pyramid      (Hierarchy management)                       │
│  ├── /alignment    (Scoring & heatmaps)                         │
│  ├── /drift        (Drift detection & alerts)                   │
│  ├── /teams        (Team management)                            │
│  └── /reports      (Strategic reports)                          │
├─────────────────────────────────────────────────────────────────┤
│  Storage Layer:                                                 │
│  ├── SQLite (graph.db) - Nodes & Edges                          │
│  ├── RuVector DB       - Embeddings & semantic search           │
│  └── File System       - Documents                              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Target Architecture (PKA-Relate)

The modified backend supports personal relationship management:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PKA-Relate Backend                          │
├─────────────────────────────────────────────────────────────────┤
│  Express HTTP Server (port 3000)                                │
│  ├── Middleware: CORS, JSON, Auth (JWT), Error handling         │
│  └── Routes: /api/*                                             │
├─────────────────────────────────────────────────────────────────┤
│  Core Components (REUSED):                                      │
│  ├── UnifiedMemory        (Vector + Graph + Cognitive)          │
│  ├── RelateMemoryManager  (NEW - replaces PKAMemoryManager)     │
│  ├── CollectionManager    (Document Collections - reused)       │
│  └── GraphStore           (Extended for new node types)         │
├─────────────────────────────────────────────────────────────────┤
│  New Route Groups:                                              │
│  ├── /auth         (Authentication & JWT)                       │
│  ├── /users/me     (Profile, Psych Profile, Settings)           │
│  ├── /systems      (SubSystems - replaces pyramid)              │
│  ├── /content      (Content Items within systems)               │
│  ├── /interactions (Relationship interaction logs)              │
│  ├── /chat         (AI Assistant with tough love mode)          │
│  ├── /analytics    (Growth tracking & insights)                 │
│  └── /export       (Data export functionality)                  │
├─────────────────────────────────────────────────────────────────┤
│  Storage Layer:                                                 │
│  ├── SQLite (graph.db) - Extended node/edge types               │
│  ├── SQLite (users.db) - User accounts & sessions               │
│  ├── RuVector DB       - Embeddings (reused)                    │
│  └── File System       - Content items                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Reuse Analysis

### 2.1 Components to REUSE (Direct)

| Component | File Location | Reuse Strategy |
|-----------|---------------|----------------|
| UnifiedMemory | `src/memory/index.ts` | Direct reuse - core memory abstraction |
| GraphStore | `src/memory/graphStore.ts` | Extend with new NodeTypes and EdgeTypes |
| CollectionManager | `src/memory/collections.ts` | Direct reuse for content organization |
| VectorStore | `src/memory/vectorStore.ts` | Direct reuse for semantic search |
| CognitiveMemory | `src/memory/cognitive.ts` | Direct reuse for learning patterns |
| Embedding | `src/embedding.ts` | Direct reuse for text embeddings |
| Parser/Reader | `src/ingestion/*` | Direct reuse for document processing |
| CORS/Error Middleware | `src/api/middleware/*` | Direct reuse |
| Chat Routes (base) | `src/api/routes/chat.ts` | Extend for relationship context |

### 2.2 Components to MODIFY

| Component | Current Purpose | New Purpose | Changes Required |
|-----------|-----------------|-------------|------------------|
| PKAMemoryManager | Pyramid hierarchy CRUD | SubSystem management | Replace with RelateMemoryManager |
| Alignment Calculator | Strategic alignment scoring | Personal growth tracking | Modify scoring logic |
| Drift Detector | Mission drift detection | Goal inconsistency detection | Adapt for personal values |
| GraphStore Types | Business entity types | Personal relationship types | Add new NodeType/EdgeType enums |

### 2.3 Components to BUILD NEW

| Component | Purpose | Priority |
|-----------|---------|----------|
| AuthService | JWT authentication, sessions | P0 - Critical |
| UserManager | User CRUD, profiles | P0 - Critical |
| PsychProfileManager | Psychological profile management | P1 - High |
| InteractionLogger | Relationship interaction tracking | P1 - High |
| FocusAreaTracker | Progress & streak management | P1 - High |
| ToughLoveChatEngine | AI with candid mode | P1 - High |
| AnalyticsEngine | Weekly summaries, patterns | P2 - Medium |
| ExportService | Data export functionality | P3 - Low |

---

## 3. Data Model Transformation

### 3.1 Type Definitions

```typescript
// src/relate/types.ts

/**
 * Node types for PKA-Relate knowledge graph
 */
export type RelateNodeType =
  // User-related
  | 'User'
  | 'PsychologicalProfile'
  | 'CoreValue'
  | 'Mentor'
  | 'FocusArea'
  // Knowledge organization
  | 'SubSystem'
  | 'ContentItem'
  // Activity tracking
  | 'Interaction'
  | 'Conversation'
  | 'ChatMessage'
  | 'UpcomingEvent';

/**
 * Edge types for relationships between entities
 */
export type RelateEdgeType =
  // User relationships
  | 'OWNS'           // User owns SubSystem/ContentItem
  | 'HAS_PROFILE'    // User has PsychologicalProfile
  | 'VALUES'         // User values CoreValue
  | 'FOLLOWS'        // User follows Mentor
  | 'FOCUSES_ON'     // User focuses on FocusArea
  // Content relationships
  | 'CONTAINS'       // SubSystem contains ContentItem
  | 'LINKS_TO'       // SubSystem links to SubSystem
  | 'TAGGED_WITH'    // ContentItem tagged with concept
  | 'RELATES_TO'     // Generic relationship
  // Activity relationships
  | 'LOGGED'         // User logged Interaction
  | 'PARTICIPATED'   // Conversation includes ChatMessage
  | 'CITES'          // ChatMessage cites ContentItem
  | 'SCHEDULED'      // User scheduled UpcomingEvent
  // Progress relationships
  | 'IMPROVES'       // Interaction improves FocusArea
  | 'CONTRADICTS';   // Interaction contradicts CoreValue

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Psychological profile tracking
 */
export interface PsychologicalProfile {
  id: string;
  userId: string;
  attachmentStyle: 'Secure' | 'Anxious' | 'Avoidant' | 'Disorganized';
  attachmentUpdatedAt: string;
  communicationStyle: 'Direct' | 'Indirect' | 'Assertive' | 'Passive';
  communicationUpdatedAt: string;
  conflictPattern: string;
  conflictUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core values for alignment tracking
 */
export interface CoreValue {
  id: string;
  userId: string;
  category: 'Primary' | 'Secondary' | 'Aspirational';
  value: string;
  description?: string;
  createdAt: string;
}

/**
 * Mentor/thought leader
 */
export interface Mentor {
  id: string;
  userId: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
}

/**
 * Focus area for personal growth
 */
export interface FocusArea {
  id: string;
  userId: string;
  title: string;
  description?: string;
  progress: number;        // 0-100
  streak: number;          // consecutive days
  weeklyChange: number;    // percentage
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sub-system for knowledge organization
 * Replaces PyramidEntity with personal knowledge domains
 */
export interface SubSystem {
  id: string;
  userId: string;
  name: string;
  description: string;
  icon: 'grid' | 'heart' | 'shield' | 'flower' | 'users' | 'star' | 'book' | 'target';
  color: string;           // HSL color string
  itemCount: number;       // computed
  linkedSystemIds: string[];
  isDefault: boolean;      // Default systems like General, Dating
  createdAt: string;
  updatedAt: string;
}

/**
 * Content item within a sub-system
 */
export interface ContentItem {
  id: string;
  userId: string;
  systemId: string;
  type: 'note' | 'article' | 'book' | 'video' | 'podcast';
  title: string;
  content?: string;        // for notes
  url?: string;            // for external content
  highlights?: string[];
  personalNotes?: string;
  tags: string[];
  linkedSystemIds: string[];
  sourceMetadata?: {
    author?: string;
    publishedAt?: string;
    duration?: number;     // for videos/podcasts
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Relationship interaction log
 */
export interface Interaction {
  id: string;
  userId: string;
  type: 'conversation' | 'date' | 'conflict' | 'milestone' | 'observation';
  person: string;
  summary: string;
  outcome: 'positive' | 'neutral' | 'negative' | 'mixed';
  emotions: string[];
  learnings?: string;
  relatedFocusAreas?: string[];   // IDs of affected focus areas
  contradictedValues?: string[];  // IDs of contradicted core values
  date: string;
  createdAt: string;
}

/**
 * Chat conversation
 */
export interface ChatConversation {
  id: string;
  userId: string;
  title?: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Chat message with source citations
 */
export interface ChatMessage {
  id: string;
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  isToughLove?: boolean;     // candid perspective mode
  confidence?: number;
  processingTime?: number;
  createdAt: string;
}

/**
 * Source citation for AI responses
 */
export interface ChatSource {
  id: string;
  title: string;
  author?: string;
  systemName?: string;
  snippet: string;
  relevanceScore: number;
  contentItemId?: string;
}

/**
 * Upcoming event for preparation
 */
export interface UpcomingEvent {
  id: string;
  userId: string;
  title: string;
  person: string;
  eventType: string;
  datetime: string;
  preparationNotes?: string;
  talkingPoints?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * User settings
 */
export interface UserSettings {
  userId: string;
  pushNotificationsEnabled: boolean;
  dataPrivacyStrict: boolean;      // on-device only mode
  reflectionReminderEnabled: boolean;
  reflectionReminderTime: string;  // HH:mm format
  appLockEnabled: boolean;
  toughLoveModeEnabled: boolean;
  updatedAt: string;
}

/**
 * Weekly analytics summary
 */
export interface WeeklySummary {
  userId: string;
  weekStartDate: string;
  interactionsLogged: number;
  insightsGained: number;
  currentStreak: number;
  weekOverWeekChange: {
    interactions: number;
    insights: number;
  };
  topEmotions: string[];
  focusAreaProgress: Record<string, number>;
  generatedAt: string;
}

/**
 * Accountability alert for inconsistency detection
 * Replaces DriftAlert for personal use
 */
export interface AccountabilityAlert {
  id: string;
  userId: string;
  severity: 'info' | 'warning' | 'important';
  type: 'value_contradiction' | 'goal_drift' | 'pattern_detected';
  message: string;
  suggestedAction: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  acknowledged: boolean;
  detectedAt: string;
}
```

### 3.2 Transformation Mapping

| PKA-STRAT Entity | PKA-Relate Entity | Transformation Logic |
|------------------|-------------------|---------------------|
| PyramidEntity | SubSystem | level → fixed "system", organizationId → userId |
| AlignmentScore | FocusArea.progress + analytics | Simplified personal metrics |
| DriftAlert | AccountabilityAlert | Adapted for personal growth context |
| Team | (removed) | N/A - personal app |
| Organization | User | Root entity becomes user |
| DocumentIngestion | ContentItem | Adapted for content types |

---

## 4. API Endpoint Specification

### 4.1 Authentication Endpoints

```yaml
# Authentication - NEW IMPLEMENTATION REQUIRED
POST /auth/signup:
  description: Register new user
  requestBody:
    email: string (required)
    password: string (required, min 8 chars)
    name: string (required)
  response:
    201: { user: User, accessToken: string, refreshToken: string }
    400: { error: { code: 'VALIDATION_ERROR', details: {...} } }
    409: { error: { code: 'EMAIL_EXISTS' } }

POST /auth/login:
  description: User login
  requestBody:
    email: string (required)
    password: string (required)
  response:
    200: { user: User, accessToken: string, refreshToken: string }
    401: { error: { code: 'INVALID_CREDENTIALS' } }
  rateLimit: 5/minute per IP

POST /auth/logout:
  description: Invalidate current session
  headers:
    Authorization: Bearer <accessToken>
  response:
    204: No content
    401: { error: { code: 'UNAUTHORIZED' } }

POST /auth/refresh:
  description: Refresh access token
  requestBody:
    refreshToken: string (required)
  response:
    200: { accessToken: string, refreshToken: string }
    401: { error: { code: 'INVALID_TOKEN' } }

GET /auth/me:
  description: Get current user
  headers:
    Authorization: Bearer <accessToken>
  response:
    200: User
    401: { error: { code: 'UNAUTHORIZED' } }
```

### 4.2 User Profile Endpoints

```yaml
# User Profile - NEW IMPLEMENTATION REQUIRED
GET /users/me/profile:
  description: Get user profile
  response:
    200: User

PUT /users/me/profile:
  description: Update user profile
  requestBody:
    name?: string
    avatarUrl?: string
  response:
    200: User

GET /users/me/psychological-profile:
  description: Get psychological profile
  response:
    200: PsychologicalProfile

PUT /users/me/psychological-profile:
  description: Update psychological profile
  requestBody:
    attachmentStyle?: AttachmentStyle
    communicationStyle?: CommunicationStyle
    conflictPattern?: string
  response:
    200: PsychologicalProfile

GET /users/me/settings:
  description: Get user settings
  response:
    200: UserSettings

PUT /users/me/settings:
  description: Update user settings
  requestBody:
    pushNotificationsEnabled?: boolean
    dataPrivacyStrict?: boolean
    reflectionReminderEnabled?: boolean
    reflectionReminderTime?: string
    appLockEnabled?: boolean
    toughLoveModeEnabled?: boolean
  response:
    200: UserSettings
```

### 4.3 Core Values & Mentors Endpoints

```yaml
# Core Values - NEW IMPLEMENTATION REQUIRED
GET /users/me/values:
  description: Get all core values
  response:
    200: CoreValue[]

POST /users/me/values:
  description: Add core value
  requestBody:
    category: 'Primary' | 'Secondary' | 'Aspirational'
    value: string
    description?: string
  response:
    201: CoreValue

DELETE /users/me/values/:id:
  description: Remove core value
  response:
    204: No content

# Mentors - NEW IMPLEMENTATION REQUIRED
GET /users/me/mentors:
  description: Get all mentors
  response:
    200: Mentor[]

POST /users/me/mentors:
  description: Add mentor
  requestBody:
    name: string
    description?: string
    tags?: string[]
  response:
    201: Mentor

DELETE /users/me/mentors/:id:
  description: Remove mentor
  response:
    204: No content
```

### 4.4 Focus Areas Endpoints

```yaml
# Focus Areas - NEW IMPLEMENTATION REQUIRED
GET /users/me/focus-areas:
  description: Get all focus areas with progress
  response:
    200: FocusArea[]

POST /users/me/focus-areas:
  description: Create focus area
  requestBody:
    title: string
    description?: string
  response:
    201: FocusArea

PUT /users/me/focus-areas/:id:
  description: Update focus area (including progress)
  requestBody:
    title?: string
    description?: string
    progress?: number
  response:
    200: FocusArea

DELETE /users/me/focus-areas/:id:
  description: Delete focus area
  response:
    204: No content
```

### 4.5 Sub-Systems Endpoints (MODIFIED from Pyramid)

```yaml
# Sub-Systems - MODIFIED FROM /pyramid ROUTES
GET /systems:
  description: Get all user's sub-systems
  queryParams:
    includeItemCounts?: boolean
  response:
    200: SubSystem[]

POST /systems:
  description: Create new sub-system
  requestBody:
    name: string
    description: string
    icon: string
    color: string
  response:
    201: SubSystem

GET /systems/:id:
  description: Get sub-system details
  response:
    200: SubSystem & { items: ContentItem[] }

PUT /systems/:id:
  description: Update sub-system
  requestBody:
    name?: string
    description?: string
    icon?: string
    color?: string
  response:
    200: SubSystem

DELETE /systems/:id:
  description: Delete sub-system (moves items to General)
  response:
    204: No content

GET /systems/:id/items:
  description: Get content items in system
  queryParams:
    type?: ContentType
    page?: number
    limit?: number
  response:
    200: { items: ContentItem[], pagination: Pagination }

POST /systems/:id/items:
  description: Add content item to system
  requestBody:
    type: ContentType
    title: string
    content?: string
    url?: string
    highlights?: string[]
    personalNotes?: string
    tags?: string[]
  response:
    201: ContentItem

GET /systems/graph:
  description: Get knowledge graph data for visualization
  response:
    200: {
      nodes: Array<{ id: string, name: string, itemCount: number, color: string }>,
      edges: Array<{ source: string, target: string, strength: number }>
    }

POST /systems/:id/link/:targetId:
  description: Link two systems
  response:
    201: { linked: true }

DELETE /systems/:id/link/:targetId:
  description: Unlink two systems
  response:
    204: No content
```

### 4.6 Content Items Endpoints

```yaml
# Content Items - NEW IMPLEMENTATION (uses CollectionManager pattern)
GET /content-items:
  description: Get all content items
  queryParams:
    systemId?: string
    type?: ContentType
    tags?: string[]
    page?: number
    limit?: number
  response:
    200: { items: ContentItem[], pagination: Pagination }

GET /content-items/:id:
  description: Get content item details
  response:
    200: ContentItem

PUT /content-items/:id:
  description: Update content item
  requestBody:
    title?: string
    content?: string
    personalNotes?: string
    highlights?: string[]
    tags?: string[]
    linkedSystemIds?: string[]
  response:
    200: ContentItem

DELETE /content-items/:id:
  description: Delete content item
  response:
    204: No content

GET /content-items/search:
  description: Full-text semantic search across content
  queryParams:
    q: string (required)
    systemId?: string
    type?: ContentType
    limit?: number
  response:
    200: Array<ContentItem & { relevanceScore: number, snippet: string }>
```

### 4.7 Interactions Endpoints

```yaml
# Interactions - NEW IMPLEMENTATION REQUIRED
GET /interactions:
  description: Get interaction history
  queryParams:
    type?: InteractionType
    person?: string
    outcome?: Outcome
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  response:
    200: { items: Interaction[], pagination: Pagination }

POST /interactions:
  description: Log new interaction
  requestBody:
    type: InteractionType
    person: string
    summary: string
    outcome: Outcome
    emotions: string[]
    learnings?: string
    relatedFocusAreas?: string[]
    date?: string
  response:
    201: Interaction

GET /interactions/:id:
  description: Get interaction details
  response:
    200: Interaction

PUT /interactions/:id:
  description: Update interaction
  requestBody:
    summary?: string
    outcome?: Outcome
    emotions?: string[]
    learnings?: string
  response:
    200: Interaction

DELETE /interactions/:id:
  description: Delete interaction
  response:
    204: No content

GET /interactions/stats:
  description: Get interaction statistics
  queryParams:
    period?: '7d' | '30d' | '90d'
  response:
    200: {
      total: number,
      byType: Record<InteractionType, number>,
      byOutcome: Record<Outcome, number>,
      topPeople: Array<{ person: string, count: number }>,
      emotionFrequency: Record<string, number>
    }
```

### 4.8 Chat/AI Assistant Endpoints (MODIFIED)

```yaml
# Chat - MODIFIED FROM EXISTING /chat ROUTES
GET /conversations:
  description: List user's conversations
  response:
    200: ChatConversation[]

POST /conversations:
  description: Start new conversation
  requestBody:
    title?: string
  response:
    201: ChatConversation

GET /conversations/:id/messages:
  description: Get conversation messages
  queryParams:
    page?: number
    limit?: number
  response:
    200: { messages: ChatMessage[], pagination: Pagination }

POST /conversations/:id/messages:
  description: Send message and get AI response
  requestBody:
    content: string
    mentorContext?: string[]  # IDs of mentors to consider
    systemContext?: string[]  # IDs of systems to search
  response:
    200: {
      userMessage: ChatMessage,
      assistantMessage: ChatMessage
    }
  # For streaming, use Server-Sent Events
  headers:
    Accept: text/event-stream  # Optional, for streaming response

POST /conversations/:id/feedback:
  description: Provide feedback on AI response
  requestBody:
    messageId: string
    feedback: 'helpful' | 'not_helpful'
    reason?: string
  response:
    200: { acknowledged: true }
```

### 4.9 Analytics Endpoints

```yaml
# Analytics - NEW IMPLEMENTATION (uses alignment patterns)
GET /analytics/weekly-summary:
  description: Get weekly analytics summary
  queryParams:
    weekOf?: string  # ISO date
  response:
    200: WeeklySummary

GET /analytics/focus-progress:
  description: Get focus area progress over time
  queryParams:
    focusAreaId?: string
    period?: '7d' | '30d' | '90d'
  response:
    200: Array<{
      date: string,
      focusAreaId: string,
      progress: number
    }>

GET /analytics/interaction-patterns:
  description: Get interaction pattern analysis
  queryParams:
    period?: '7d' | '30d' | '90d'
  response:
    200: {
      patterns: Array<{
        type: string,
        description: string,
        frequency: number,
        sentiment: 'positive' | 'neutral' | 'negative'
      }>,
      suggestions: string[]
    }

GET /analytics/streak-data:
  description: Get streak information
  response:
    200: {
      currentStreak: number,
      longestStreak: number,
      streakHistory: Array<{ date: string, active: boolean }>
    }

GET /analytics/accountability:
  description: Get accountability alerts
  response:
    200: AccountabilityAlert[]

PUT /analytics/accountability/:id/acknowledge:
  description: Acknowledge alert
  response:
    200: AccountabilityAlert
```

### 4.10 Export Endpoints

```yaml
# Export - NEW IMPLEMENTATION REQUIRED
POST /export/data:
  description: Export all user data
  requestBody:
    format?: 'json' | 'csv'
    includeContent?: boolean
  response:
    202: { exportId: string, status: 'processing' }

GET /export/:exportId:
  description: Get export status/download
  response:
    200: Export data file
    202: { status: 'processing', progress: number }
```

---

## 5. AI Chat System Design

### 5.1 Enhanced Chat Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Chat Request Flow                         │
├─────────────────────────────────────────────────────────────────┤
│  1. User Message Input                                          │
│     └── POST /conversations/:id/messages                        │
├─────────────────────────────────────────────────────────────────┤
│  2. Context Retrieval                                           │
│     ├── Search user's ContentItems (via VectorStore)            │
│     ├── Search user's Interactions (pattern matching)           │
│     ├── Retrieve PsychologicalProfile for personalization       │
│     ├── Check CoreValues for alignment context                  │
│     └── Load Mentor context if specified                        │
├─────────────────────────────────────────────────────────────────┤
│  3. Tough Love Detection                                        │
│     ├── Analyze message for:                                    │
│     │   - Self-justification patterns                           │
│     │   - Repetitive complaint patterns                         │
│     │   - Value contradiction indicators                        │
│     │   - Growth resistance signals                             │
│     └── Set isToughLove flag if enabled + criteria met          │
├─────────────────────────────────────────────────────────────────┤
│  4. Response Generation                                         │
│     ├── Build system prompt with:                               │
│     │   - User's psychological profile                          │
│     │   - Active focus areas                                    │
│     │   - Core values                                           │
│     │   - Retrieved context (with citations)                    │
│     │   - Tough love mode instructions                          │
│     ├── Generate response via LLM                               │
│     └── Extract and format source citations                     │
├─────────────────────────────────────────────────────────────────┤
│  5. Response Delivery                                           │
│     ├── Store user message                                      │
│     ├── Store assistant message with sources                    │
│     └── Return response (streaming optional)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 System Prompt Template

```typescript
// src/relate/prompts.ts

export const RELATIONSHIP_ASSISTANT_PROMPT = `
You are a relationship personal knowledge assistant helping the user develop
their personal operating system for managing relationships. You have access
to the user's curated knowledge base.

## User Profile
- Attachment Style: {{attachmentStyle}}
- Communication Style: {{communicationStyle}}
- Conflict Pattern: {{conflictPattern}}

## Active Focus Areas
{{focusAreas}}

## Core Values
{{coreValues}}

## Your Role
1. Provide advice grounded in the user's knowledge base
2. Always cite your sources when referencing their materials
3. Synthesize information from multiple sources when relevant
4. Help the user move from reactive emotions to conscious, value-based action

{{#if toughLoveMode}}
## Candid Mode Active
The user has enabled tough love mode. When appropriate:
- Challenge perspectives that contradict their stated values
- Point out patterns of self-defeating behavior
- Provide direct feedback rather than validation
- Reference specific examples from their interaction history
- Use phrases like "Based on your stated value of X, your behavior Y seems inconsistent"
{{/if}}

## Available Context
{{context}}

Remember: Your goal is to help the user grow, not just feel good.
Balance support with honest feedback.
`;
```

### 5.3 Source Citation Format

```typescript
interface AIResponse {
  content: string;
  sources: Array<{
    id: string;
    title: string;
    author?: string;
    systemName: string;
    snippet: string;
    relevanceScore: number;
  }>;
  isToughLove: boolean;
  relatedFocusAreas?: string[];
  suggestedActions?: string[];
}
```

---

## 6. GraphStore Extensions

### 6.1 New Node Types

Add to `src/memory/graphStore.ts`:

```typescript
export type NodeType =
  // Original types (keep for backward compatibility)
  | 'Document'
  | 'Section'
  | 'Concept'
  // PKA-Relate types
  | 'User'
  | 'PsychologicalProfile'
  | 'CoreValue'
  | 'Mentor'
  | 'FocusArea'
  | 'SubSystem'
  | 'ContentItem'
  | 'Interaction'
  | 'Conversation'
  | 'ChatMessage'
  | 'UpcomingEvent'
  | 'AccountabilityAlert';
```

### 6.2 New Edge Types

```typescript
export type EdgeType =
  // Original types (keep for backward compatibility)
  | 'CITES'
  | 'PARENT_OF'
  | 'RELATES_TO'
  | 'DERIVED_FROM'
  // PKA-Relate relationship types
  | 'OWNS'
  | 'HAS_PROFILE'
  | 'VALUES'
  | 'FOLLOWS'
  | 'FOCUSES_ON'
  | 'CONTAINS'
  | 'LINKS_TO'
  | 'TAGGED_WITH'
  | 'LOGGED'
  | 'PARTICIPATED'
  | 'SCHEDULED'
  | 'IMPROVES'
  | 'CONTRADICTS';
```

---

## 7. Default Data Seeding

### 7.1 Default Sub-Systems

On user creation, seed the following sub-systems:

```typescript
const DEFAULT_SUBSYSTEMS = [
  {
    name: 'General',
    description: 'General relationship knowledge and insights',
    icon: 'grid',
    color: 'hsl(210, 40%, 50%)',
    isDefault: true
  },
  {
    name: 'Dating',
    description: 'Dating dynamics, attraction, and early relationship stages',
    icon: 'heart',
    color: 'hsl(350, 80%, 60%)',
    isDefault: true
  },
  {
    name: 'Masculinity',
    description: 'Healthy masculinity, male psychology, and masculine development',
    icon: 'shield',
    color: 'hsl(220, 60%, 45%)',
    isDefault: true
  },
  {
    name: 'Femininity',
    description: 'Feminine psychology, feminine energy, and feminine development',
    icon: 'flower',
    color: 'hsl(320, 70%, 60%)',
    isDefault: true
  },
  {
    name: 'Management',
    description: 'Relationship management, communication, and conflict resolution',
    icon: 'users',
    color: 'hsl(140, 50%, 45%)',
    isDefault: true
  }
];
```

### 7.2 Default Emotion Options

```typescript
const EMOTION_OPTIONS = [
  'Connected', 'Anxious', 'Hopeful', 'Frustrated',
  'Calm', 'Excited', 'Confused', 'Vulnerable',
  'Secure', 'Rejected', 'Appreciated', 'Defensive',
  'Grateful', 'Distant', 'Understood', 'Overwhelmed'
];
```

---

## 8. Migration Strategy

### 8.1 Database Migration

Since the existing system uses SQLite for graph storage:

1. **Add new tables** (users, sessions, etc.) without modifying existing
2. **Add new node/edge types** to existing graph schema
3. **Create migration scripts** for any data transformations

### 8.2 Route Migration

| Old Route | New Route | Migration Action |
|-----------|-----------|------------------|
| /api/pyramid/* | /api/systems/* | Refactor handlers, adapt data models |
| /api/alignment/* | /api/analytics/* | Adapt for personal metrics |
| /api/drift/* | /api/analytics/accountability | Adapt alerting logic |
| /api/teams/* | (removed) | N/A |
| /api/reports/* | /api/export/* | Simplify for personal use |
| /api/chat/* | /api/conversations/* | Enhance with tough love mode |
| /api/collections/* | /api/systems/* | Merge into systems |
| /api/documents/* | /api/content-items/* | Adapt for content types |

---

## 9. Security Considerations

### 9.1 Authentication

- JWT tokens with RS256 signing
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry
- Password hashing with bcrypt (cost factor 12)
- Rate limiting on auth endpoints

### 9.2 Data Privacy

- All data scoped to user ID
- Support for on-device only mode (dataPrivacyStrict setting)
- Encryption at rest for sensitive fields
- Complete data export capability
- Full data deletion on account removal

### 9.3 API Security

- CORS configuration for mobile apps
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS prevention in content handling

---

## 10. Performance Targets

| Metric | Target |
|--------|--------|
| API Response (reads) | < 200ms p95 |
| API Response (writes) | < 500ms p95 |
| AI Chat Response (first token) | < 1s |
| AI Chat Response (complete) | < 5s |
| Semantic Search | < 300ms p95 |
| Graph Queries | < 100ms p95 |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-31 | Hive Mind | Initial specification |
