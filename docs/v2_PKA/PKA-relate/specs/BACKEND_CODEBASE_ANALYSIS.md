# PKA-Relate Backend Codebase Analysis Report

**Date:** 2025-12-30
**Author:** Research Agent
**Project:** PKA-Relate (Personal Relationship Knowledge Assistant)
**Source:** PKA-STRAT Codebase Analysis

---

## Executive Summary

This report analyzes the existing PKA-STRAT codebase to identify components reusable for PKA-Relate, a personal relationship management application. The analysis confirms approximately **60-65% code reuse potential** with the core memory, embedding, and ingestion systems being directly reusable while API routes and domain-specific logic require adaptation.

### Key Findings

| Category | Count | Reuse Level |
|----------|-------|-------------|
| Directly Reusable | 12 files | 100% |
| Needs Modification | 8 files | 60-80% |
| New Files Required | 15+ files | 0% (new) |

---

## 1. Current Codebase Structure

```
src/
├── memory/                 # Core memory system (HIGHLY REUSABLE)
│   ├── index.ts           # UnifiedMemory class - central memory orchestrator
│   ├── types.ts           # Memory type definitions
│   ├── graphStore.ts      # Graph-based relationship storage
│   ├── vectorStore.ts     # Vector embeddings with tiered storage
│   ├── cognitive.ts       # Cognitive memory capabilities
│   └── collections.ts     # Collection management
│
├── ingestion/             # Document ingestion pipeline (HIGHLY REUSABLE)
│   ├── parser.ts          # Document parsing (PDF, JSON, MD, TXT)
│   ├── reader.ts          # Chunk extraction and processing
│   └── graphBuilder.ts    # Graph node/edge construction
│
├── api/                   # API layer (NEEDS ADAPTATION)
│   ├── server.ts          # Express server setup
│   ├── types.ts           # API type definitions
│   └── routes/
│       ├── index.ts       # Route aggregator
│       ├── chat.ts        # Chat/RAG endpoints
│       ├── documents.ts   # Document CRUD
│       ├── search.ts      # Semantic search
│       └── collections.ts # Collection management
│
├── pka/                   # PKA-STRAT specific (REPLACE)
│   ├── index.ts           # Module exports
│   ├── types.ts           # Pyramid entity types
│   ├── memory.ts          # PKAMemoryManager
│   └── alignment/
│       ├── index.ts       # Alignment exports
│       ├── calculator.ts  # Alignment scoring
│       └── drift.ts       # Drift detection
│
└── embedding.ts           # Embedding service (DIRECTLY REUSABLE)
```

---

## 2. Reusable Components Inventory

### 2.1 Directly Reusable (No Modifications)

#### `/src/memory/index.ts` - UnifiedMemory
**Reuse Level:** 100%

The core memory orchestration class that integrates vector store, graph store, and cognitive capabilities.

```typescript
export class UnifiedMemory {
  // Vector operations
  async addToVector(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>
  async vectorSearch(query: string, limit?: number): Promise<SearchResult[]>

  // Graph operations
  createNode(id: string, type: NodeType, properties: Record<string, unknown>): void
  createEdge(from: string, to: string, type: EdgeType, properties?: Record<string, unknown>): void
  findRelated(nodeId: string, depth?: number): RelatedResult[]

  // Lifecycle
  async save(path: string): Promise<void>
  async load(path: string): Promise<void>
  clear(): void
}
```

**Why Reusable:** Domain-agnostic memory operations work identically for relationship data as they do for strategic data.

---

#### `/src/memory/graphStore.ts` - GraphStore
**Reuse Level:** 100%

In-memory graph database with configurable node and edge types.

```typescript
export enum NodeType {
  Mission = 'Mission',
  Vision = 'Vision',
  Goal = 'Goal',
  Task = 'Task',
  Document = 'Document',
  Chunk = 'Chunk',
  Concept = 'Concept'
}

export enum EdgeType {
  ALIGNS_TO = 'ALIGNS_TO',
  SUPPORTS = 'SUPPORTS',
  ADVANCES = 'ADVANCES',
  CONTAINS = 'CONTAINS',
  REFERENCES = 'REFERENCES',
  DERIVED_FROM = 'DERIVED_FROM'
}
```

**Adaptation Note:** NodeType and EdgeType enums can be extended for PKA-Relate without modifying core logic:

```typescript
// PKA-Relate additions (extend existing enums)
NodeType.SubSystem = 'SubSystem'
NodeType.ContentItem = 'ContentItem'
NodeType.Interaction = 'Interaction'
NodeType.Person = 'Person'

EdgeType.BELONGS_TO = 'BELONGS_TO'
EdgeType.LINKED_TO = 'LINKED_TO'
EdgeType.INVOLVES = 'INVOLVES'
```

---

#### `/src/memory/vectorStore.ts` - VectorStore
**Reuse Level:** 100%

High-performance vector storage with tiered architecture.

```typescript
export interface VectorStoreConfig {
  dimensions: number;           // Default: 384
  similarityThreshold: number;  // Default: 0.7
  maxResults: number;           // Default: 10
  enableTieredStorage: boolean; // Default: true
  hnswConfig: HNSWConfig;
}
```

**Key Features:**
- HNSW indexing for fast similarity search
- Tiered storage (hot/warm/cold) for memory efficiency
- 384-dimensional embeddings (matches RuVector default)
- Batch operations support

---

#### `/src/embedding.ts` - Embedding Service
**Reuse Level:** 100%

Local embedding generation using RuVector's LocalNGramProvider.

```typescript
import { createEmbeddingService, LocalNGramProvider } from 'ruvector';

export async function embedOne(text: string, dimensions: number = 384): Promise<Float32Array>
export async function embedMany(texts: string[], dimensions: number = 384): Promise<Float32Array[]>
export function getEmbeddingService(): EmbeddingService
```

**Why Reusable:**
- No external API dependencies (runs locally)
- Consistent 384-dimensional output
- Works with any text content type

---

#### `/src/ingestion/parser.ts` - Document Parser
**Reuse Level:** 100%

Multi-format document parsing supporting PDF, JSON, Markdown, and plain text.

```typescript
export async function parseDocument(filePath: string): Promise<ParsedDocument>
export function detectDocumentType(filePath: string): DocumentFormat

interface ParsedDocument {
  content: string;
  metadata: DocumentMetadata;
  format: DocumentFormat;
}
```

---

#### `/src/ingestion/reader.ts` - Chunk Reader
**Reuse Level:** 100%

Text chunking with configurable overlap for RAG applications.

```typescript
export function chunkDocument(content: string, options?: ChunkOptions): Chunk[]

interface ChunkOptions {
  chunkSize?: number;      // Default: 1000
  chunkOverlap?: number;   // Default: 200
  preserveParagraphs?: boolean;
}
```

---

#### `/src/memory/cognitive.ts` - Cognitive Memory
**Reuse Level:** 100%

Higher-level cognitive operations built on vector/graph stores.

---

#### `/src/memory/collections.ts` - Collections
**Reuse Level:** 100%

Collection management for organizing related memories.

---

### 2.2 Requires Modification (60-80% Reusable)

#### `/src/api/server.ts` - Express Server
**Reuse Level:** 80%

**Current Implementation:**
```typescript
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);
```

**Modifications Needed:**
- Add authentication middleware (JWT)
- Add user context extraction
- Add rate limiting for AI endpoints
- Configure CORS for mobile app

---

#### `/src/api/routes/chat.ts` - Chat/RAG Endpoint
**Reuse Level:** 60%

**Current Implementation:**
- Basic chat with RAG context
- Streaming response support
- Vector search for context

**Modifications Needed:**

```typescript
// Add PKA-Relate specific features
interface RelateChatRequest {
  message: string;
  conversationId?: string;
  toughLoveMode?: boolean;      // NEW: Candid perspective toggle
  contextSystemIds?: string[];   // NEW: Filter by sub-systems
}

interface RelateChatResponse {
  content: string;
  sources: ChatSource[];         // NEW: Source citations
  isToughLove: boolean;          // NEW: Response mode indicator
  suggestedFollowUps?: string[]; // NEW: Suggested questions
}

// Add source citation extraction
// Add psychological profile context injection
// Add mentor persona integration
// Add tough love prompt variations
```

---

#### `/src/api/routes/documents.ts` - Document Routes
**Reuse Level:** 70%

**Modifications Needed:**
- Add user_id scoping to all queries
- Map to ContentItem model instead of raw documents
- Add sub-system linking on upload
- Add content type classification (note, article, book, video, podcast)

---

#### `/src/api/routes/search.ts` - Search Routes
**Reuse Level:** 70%

**Modifications Needed:**
- Add user_id scoping
- Add sub-system filtering
- Add content type filtering
- Add date range filtering for interactions

---

#### `/src/ingestion/graphBuilder.ts` - Graph Builder
**Reuse Level:** 60%

**Current Implementation:** Builds graphs for strategic pyramid entities.

**Modifications Needed:**
- Create nodes for SubSystem, ContentItem, Person
- Create edges for BELONGS_TO, LINKED_TO relationships
- Extract and link people mentioned in content
- Build cross-system connections automatically

---

### 2.3 Replace Entirely (PKA-STRAT Specific)

#### `/src/pka/` Directory
**Reuse Level:** 0% (conceptual patterns reusable)**

This entire directory is PKA-STRAT specific and should be replaced with PKA-Relate equivalents.

**Files to Replace:**

| PKA-STRAT File | PKA-Relate Equivalent |
|----------------|----------------------|
| `pka/types.ts` | `relate/types.ts` |
| `pka/memory.ts` | `relate/memory.ts` |
| `pka/alignment/calculator.ts` | `relate/progress/calculator.ts` |
| `pka/alignment/drift.ts` | `relate/progress/tracker.ts` |

**Conceptual Patterns to Reuse:**

1. **Hierarchical Entity Management**
   - PKA-STRAT: Mission → Vision → Goal → Task
   - PKA-Relate: User → SubSystem → ContentItem

2. **Alignment Scoring**
   - PKA-STRAT: Strategic alignment to mission
   - PKA-Relate: Focus area progress tracking

3. **Drift Detection**
   - PKA-STRAT: Strategic drift alerts
   - PKA-Relate: Accountability alerts for neglected areas

---

## 3. New Files Required for PKA-Relate

### 3.1 Type Definitions (`/src/relate/types.ts`)

```typescript
// Core Data Models from Frontend Specification

export interface SubSystem {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: SubSystemIcon;
  color: string;
  item_count: number;
  linked_system_ids: string[];
  created_at: string;
  updated_at: string;
}

export type SubSystemIcon =
  | 'grid' | 'heart' | 'shield' | 'flower'
  | 'users' | 'star' | 'book' | 'target';

export interface ContentItem {
  id: string;
  user_id: string;
  system_id: string;
  type: ContentType;
  title: string;
  content?: string;
  url?: string;
  highlights?: string[];
  personal_notes?: string;
  tags: string[];
  linked_system_ids: string[];
  created_at: string;
  updated_at: string;
}

export type ContentType = 'note' | 'article' | 'book' | 'video' | 'podcast';

export interface Interaction {
  id: string;
  user_id: string;
  type: InteractionType;
  person: string;
  summary: string;
  outcome: InteractionOutcome;
  emotions: string[];
  learnings?: string;
  date: string;
  created_at: string;
}

export type InteractionType =
  | 'conversation' | 'date' | 'conflict'
  | 'milestone' | 'observation';

export type InteractionOutcome =
  | 'positive' | 'neutral' | 'negative' | 'mixed';

export interface PsychologicalProfile {
  id: string;
  user_id: string;
  attachment_style: AttachmentStyle;
  attachment_updated_at: string;
  communication_style: CommunicationStyle;
  communication_updated_at: string;
  conflict_pattern: string;
  conflict_updated_at: string;
}

export type AttachmentStyle =
  | 'Secure' | 'Anxious' | 'Avoidant' | 'Disorganized';

export type CommunicationStyle =
  | 'Direct' | 'Indirect' | 'Assertive' | 'Passive';

export interface CoreValue {
  id: string;
  user_id: string;
  category: ValueCategory;
  value: string;
  created_at: string;
}

export type ValueCategory = 'Primary' | 'Secondary' | 'Aspirational';

export interface Mentor {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface FocusArea {
  id: string;
  user_id: string;
  title: string;
  progress: number;
  streak: number;
  weekly_change: number;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  is_tough_love?: boolean;
  created_at: string;
}

export interface ChatSource {
  title: string;
  author?: string;
  system_id?: string;
  content_item_id?: string;
}

export interface UpcomingEvent {
  id: string;
  user_id: string;
  title: string;
  person: string;
  event_type: string;
  datetime: string;
  preparation_notes?: string;
  talking_points?: string[];
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  push_notifications_enabled: boolean;
  data_privacy_strict: boolean;
  reflection_reminder_enabled: boolean;
  reflection_reminder_time: string;
  app_lock_enabled: boolean;
  tough_love_mode_enabled: boolean;
  updated_at: string;
}
```

### 3.2 Memory Manager (`/src/relate/memory.ts`)

```typescript
// RelateMemoryManager - Replaces PKAMemoryManager

export class RelateMemoryManager {
  private memory: UnifiedMemory;

  // Sub-System Operations
  async createSubSystem(data: Omit<SubSystem, 'id' | 'created_at' | 'updated_at'>): Promise<SubSystem>
  async getSubSystem(id: string): Promise<SubSystem | null>
  async getUserSubSystems(userId: string): Promise<SubSystem[]>
  async updateSubSystem(id: string, updates: Partial<SubSystem>): Promise<SubSystem>
  async deleteSubSystem(id: string): Promise<void>
  async linkSubSystems(systemId: string, targetId: string): Promise<void>
  async unlinkSubSystems(systemId: string, targetId: string): Promise<void>
  async getSubSystemGraph(userId: string): Promise<GraphData>

  // Content Item Operations
  async createContentItem(data: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>): Promise<ContentItem>
  async getContentItem(id: string): Promise<ContentItem | null>
  async getSystemContentItems(systemId: string): Promise<ContentItem[]>
  async searchContentItems(userId: string, query: string): Promise<ContentItem[]>
  async updateContentItem(id: string, updates: Partial<ContentItem>): Promise<ContentItem>
  async deleteContentItem(id: string): Promise<void>

  // Interaction Operations
  async logInteraction(data: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction>
  async getInteraction(id: string): Promise<Interaction | null>
  async getUserInteractions(userId: string, limit?: number): Promise<Interaction[]>
  async getInteractionStats(userId: string, dateRange?: DateRange): Promise<InteractionStats>

  // Profile Operations
  async getPsychologicalProfile(userId: string): Promise<PsychologicalProfile | null>
  async updatePsychologicalProfile(userId: string, updates: Partial<PsychologicalProfile>): Promise<PsychologicalProfile>
  async getCoreValues(userId: string): Promise<CoreValue[]>
  async addCoreValue(data: Omit<CoreValue, 'id' | 'created_at'>): Promise<CoreValue>
  async removeCoreValue(id: string): Promise<void>
  async getMentors(userId: string): Promise<Mentor[]>
  async addMentor(data: Omit<Mentor, 'id' | 'created_at'>): Promise<Mentor>
  async removeMentor(id: string): Promise<void>

  // Focus Area Operations
  async getFocusAreas(userId: string): Promise<FocusArea[]>
  async createFocusArea(data: Omit<FocusArea, 'id' | 'created_at' | 'updated_at'>): Promise<FocusArea>
  async updateFocusAreaProgress(id: string, progress: number): Promise<FocusArea>
  async deleteFocusArea(id: string): Promise<void>

  // Analytics
  async getWeeklySummary(userId: string): Promise<WeeklySummary>
  async getFocusProgress(userId: string): Promise<FocusProgress[]>
  async getInteractionPatterns(userId: string): Promise<InteractionPattern[]>
  async getStreakData(userId: string): Promise<StreakData>

  // RAG Context Building
  async buildChatContext(userId: string, query: string, systemIds?: string[]): Promise<ChatContext>
  async getUserProfileContext(userId: string): Promise<ProfileContext>
}
```

### 3.3 New API Routes

#### `/src/api/routes/systems.ts`
```typescript
// Sub-Systems CRUD
GET    /systems                    // List user's sub-systems
POST   /systems                    // Create sub-system
GET    /systems/:id                // Get sub-system details
PUT    /systems/:id                // Update sub-system
DELETE /systems/:id                // Delete sub-system
GET    /systems/:id/items          // Get content items in system
POST   /systems/:id/items          // Add content item to system
GET    /systems/graph              // Get graph visualization data
POST   /systems/:id/link/:targetId // Link two systems
DELETE /systems/:id/link/:targetId // Unlink two systems
```

#### `/src/api/routes/content-items.ts`
```typescript
// Content Items CRUD
GET    /content-items              // List all content items
GET    /content-items/:id          // Get content item
PUT    /content-items/:id          // Update content item
DELETE /content-items/:id          // Delete content item
GET    /content-items/search       // Full-text search
```

#### `/src/api/routes/interactions.ts`
```typescript
// Interactions CRUD
GET    /interactions               // List interactions
POST   /interactions               // Log new interaction
GET    /interactions/:id           // Get interaction
PUT    /interactions/:id           // Update interaction
DELETE /interactions/:id           // Delete interaction
GET    /interactions/stats         // Get interaction statistics
```

#### `/src/api/routes/profile.ts`
```typescript
// User Profile Management
GET    /users/me/profile                  // Get user profile
PUT    /users/me/profile                  // Update user profile
GET    /users/me/psychological-profile    // Get psychological profile
PUT    /users/me/psychological-profile    // Update psychological profile
GET    /users/me/settings                 // Get user settings
PUT    /users/me/settings                 // Update user settings
GET    /users/me/values                   // List core values
POST   /users/me/values                   // Add core value
DELETE /users/me/values/:id               // Remove core value
GET    /users/me/mentors                  // List mentors
POST   /users/me/mentors                  // Add mentor
DELETE /users/me/mentors/:id              // Remove mentor
```

#### `/src/api/routes/focus-areas.ts`
```typescript
// Focus Areas Management
GET    /users/me/focus-areas       // List focus areas
POST   /users/me/focus-areas       // Create focus area
PUT    /users/me/focus-areas/:id   // Update focus area
DELETE /users/me/focus-areas/:id   // Delete focus area
```

#### `/src/api/routes/conversations.ts`
```typescript
// Chat Conversations
GET    /conversations                      // List conversations
POST   /conversations                      // Create conversation
GET    /conversations/:id/messages         // Get messages
POST   /conversations/:id/messages         // Send message (triggers AI)
POST   /conversations/:id/feedback         // Submit feedback on response
```

#### `/src/api/routes/events.ts`
```typescript
// Upcoming Events
GET    /events                     // List all events
POST   /events                     // Create event
GET    /events/:id                 // Get event details
PUT    /events/:id                 // Update event
DELETE /events/:id                 // Delete event
GET    /events/upcoming            // Get next 7 days
```

#### `/src/api/routes/analytics.ts`
```typescript
// Analytics Endpoints
GET    /analytics/weekly-summary        // Weekly stats
GET    /analytics/focus-progress        // Focus area trends
GET    /analytics/interaction-patterns  // Interaction analysis
GET    /analytics/streak-data           // Streak information
```

#### `/src/api/routes/auth.ts`
```typescript
// Authentication (NEW)
POST   /auth/signup                // User registration
POST   /auth/login                 // User login
POST   /auth/logout                // User logout
POST   /auth/refresh               // Refresh token
GET    /auth/me                    // Get current user
```

### 3.4 AI Chat Enhancements (`/src/relate/chat/`)

```typescript
// /src/relate/chat/index.ts
export class RelateChatService {
  // Core chat with RAG
  async processMessage(
    userId: string,
    conversationId: string,
    message: string,
    options: ChatOptions
  ): Promise<ChatResponse>

  // Build context from user's knowledge base
  async buildContext(userId: string, query: string): Promise<RAGContext>

  // Generate response with appropriate persona
  async generateResponse(
    context: RAGContext,
    profile: ProfileContext,
    toughLoveMode: boolean
  ): Promise<string>

  // Extract and format source citations
  extractSources(context: RAGContext): ChatSource[]

  // Generate follow-up suggestions
  generateSuggestions(response: string, context: RAGContext): string[]
}

// /src/relate/chat/prompts.ts
export const SYSTEM_PROMPTS = {
  standard: `You are a supportive relationship coach...`,
  toughLove: `You are a candid advisor who gives direct, honest feedback...`,
  withMentor: (mentor: Mentor) => `Channel the wisdom of ${mentor.name}...`
}

// /src/relate/chat/sources.ts
export function formatSourceCitation(item: ContentItem): ChatSource
export function rankSourceRelevance(sources: ContentItem[], query: string): ContentItem[]
```

### 3.5 Progress Tracking (`/src/relate/progress/`)

```typescript
// /src/relate/progress/calculator.ts
// Replaces PKA-STRAT's alignment calculator
export class ProgressCalculator {
  // Calculate focus area progress
  calculateFocusProgress(focusArea: FocusArea, interactions: Interaction[]): number

  // Calculate weekly changes
  calculateWeeklyChange(focusArea: FocusArea, previousWeek: Interaction[]): number

  // Update streaks
  calculateStreak(userId: string, focusAreaId: string): number
}

// /src/relate/progress/tracker.ts
// Replaces PKA-STRAT's drift detector
export class AccountabilityTracker {
  // Generate accountability alerts
  checkAccountability(userId: string): AccountabilityAlert[]

  // Identify neglected areas
  findNeglectedAreas(interactions: Interaction[], focusAreas: FocusArea[]): string[]

  // Generate insights
  generateInsights(userId: string): Insight[]
}
```

---

## 4. API Route Mapping

### Current PKA-STRAT Routes vs Required PKA-Relate Routes

| PKA-STRAT Route | PKA-Relate Equivalent | Status |
|-----------------|----------------------|--------|
| `POST /api/chat` | `POST /conversations/:id/messages` | Modify |
| `GET /api/documents` | `GET /content-items` | Modify |
| `POST /api/documents` | `POST /systems/:id/items` | Modify |
| `GET /api/search` | `GET /content-items/search` | Modify |
| `GET /api/collections` | `GET /systems` | Modify |
| - | `POST /auth/*` | NEW |
| - | `GET /users/me/*` | NEW |
| - | `GET /interactions/*` | NEW |
| - | `GET /analytics/*` | NEW |
| - | `GET /events/*` | NEW |

---

## 5. Implementation Recommendations

### Phase 1: Foundation (Week 1)
1. Create `/src/relate/types.ts` with all data models
2. Create `/src/relate/memory.ts` RelateMemoryManager
3. Add authentication middleware
4. Set up user context extraction

### Phase 2: Core Features (Week 2)
1. Implement `/api/routes/systems.ts`
2. Implement `/api/routes/content-items.ts`
3. Implement `/api/routes/interactions.ts`
4. Implement `/api/routes/profile.ts`

### Phase 3: AI Chat (Week 3)
1. Enhance `/api/routes/chat.ts` for PKA-Relate
2. Implement source citation system
3. Add tough love mode
4. Implement psychological profile context

### Phase 4: Analytics & Events (Week 4)
1. Implement `/api/routes/analytics.ts`
2. Implement `/api/routes/events.ts`
3. Implement `/api/routes/focus-areas.ts`
4. Add progress calculation logic

### Phase 5: Polish (Week 5)
1. Add export functionality
2. Implement graph visualization endpoint
3. Performance optimization
4. Security audit

---

## 6. Technical Considerations

### 6.1 Database Strategy
The current implementation uses in-memory storage with file persistence. For production PKA-Relate:

**Recommended:** SQLite + Vector Extension
- Persistent storage across restarts
- Better query capabilities
- User data isolation
- Backup/restore support

### 6.2 Authentication
Current codebase has no authentication. Required additions:
- JWT token generation/validation
- User session management
- Password hashing (bcrypt)
- Refresh token rotation

### 6.3 Multi-tenancy
Every query must be scoped by `user_id`:
```typescript
// Example pattern
async getSubSystems(userId: string): Promise<SubSystem[]> {
  return this.memory.query({
    type: 'SubSystem',
    filter: { user_id: userId }
  });
}
```

### 6.4 AI Integration
Current chat uses basic context injection. Enhancements needed:
- Psychological profile context
- Core values integration
- Mentor persona switching
- Source ranking and citation

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Memory system scalability | Medium | Implement SQLite for production |
| AI response quality | High | Extensive prompt engineering |
| User data privacy | Critical | Encrypt sensitive fields, strict scoping |
| Graph complexity | Low | Lazy loading, pagination |
| Authentication gaps | Critical | Use proven JWT library |

---

## 8. Conclusion

The PKA-STRAT codebase provides a solid foundation for PKA-Relate with:

- **60-65% direct code reuse** from memory, embedding, and ingestion systems
- **Clear separation** between reusable infrastructure and domain-specific logic
- **Proven patterns** for vector search, graph relationships, and RAG

Key development priorities:
1. Replace `pka/` with `relate/` domain logic
2. Add authentication layer
3. Enhance chat with source citations and tough love mode
4. Implement new API routes per frontend specification

Estimated development time: **4-5 weeks** for full backend implementation.

---

## Appendix A: File Inventory

### Directly Reusable Files
```
src/memory/index.ts
src/memory/types.ts
src/memory/graphStore.ts
src/memory/vectorStore.ts
src/memory/cognitive.ts
src/memory/collections.ts
src/embedding.ts
src/ingestion/parser.ts
src/ingestion/reader.ts
```

### Files Requiring Modification
```
src/api/server.ts
src/api/types.ts
src/api/routes/index.ts
src/api/routes/chat.ts
src/api/routes/documents.ts
src/api/routes/search.ts
src/api/routes/collections.ts
src/ingestion/graphBuilder.ts
```

### Files to Replace (PKA-STRAT Specific)
```
src/pka/index.ts
src/pka/types.ts
src/pka/memory.ts
src/pka/alignment/index.ts
src/pka/alignment/calculator.ts
src/pka/alignment/drift.ts
```

### New Files Required
```
src/relate/types.ts
src/relate/memory.ts
src/relate/index.ts
src/relate/chat/index.ts
src/relate/chat/prompts.ts
src/relate/chat/sources.ts
src/relate/progress/calculator.ts
src/relate/progress/tracker.ts
src/api/routes/auth.ts
src/api/routes/systems.ts
src/api/routes/content-items.ts
src/api/routes/interactions.ts
src/api/routes/profile.ts
src/api/routes/focus-areas.ts
src/api/routes/conversations.ts
src/api/routes/events.ts
src/api/routes/analytics.ts
src/api/middleware/auth.ts
```

---

*Report generated by Research Agent - PKA-Relate Backend Implementation Review*
