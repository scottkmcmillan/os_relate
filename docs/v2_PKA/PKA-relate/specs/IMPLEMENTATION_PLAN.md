# PKA-Relate Backend Implementation Plan

## Overview

This document outlines the phased implementation plan for transforming the PKA-STRAT backend into PKA-Relate. The plan is structured in phases with clear dependencies and deliverables.

**Document Version:** 1.0.0
**Last Updated:** 2025-12-31

---

## Phase Summary

| Phase | Name | Priority | Dependencies |
|-------|------|----------|--------------|
| 0 | Foundation & Infrastructure | P0 | None |
| 1 | Authentication & User Management | P0 | Phase 0 |
| 2 | Sub-Systems & Content | P1 | Phase 1 |
| 3 | Interactions & Tracking | P1 | Phase 2 |
| 4 | AI Chat Enhancement | P1 | Phase 2, 3 |
| 5 | Analytics & Insights | P2 | Phase 3, 4 |
| 6 | Polish & Export | P3 | Phase 5 |

---

## Phase 0: Foundation & Infrastructure

### Objective
Prepare the codebase for PKA-Relate by extending types, creating the new memory manager, and setting up the project structure.

### Tasks

#### 0.1 Project Structure Setup
```
src/
├── relate/                    # NEW - PKA-Relate specific code
│   ├── types.ts              # Type definitions
│   ├── memory.ts             # RelateMemoryManager
│   ├── prompts.ts            # AI prompt templates
│   ├── auth/                 # Authentication module
│   │   ├── service.ts
│   │   ├── middleware.ts
│   │   └── jwt.ts
│   ├── user/                 # User management
│   │   ├── service.ts
│   │   └── routes.ts
│   ├── systems/              # Sub-systems module
│   │   ├── service.ts
│   │   └── routes.ts
│   ├── content/              # Content items
│   │   ├── service.ts
│   │   └── routes.ts
│   ├── interactions/         # Interaction logging
│   │   ├── service.ts
│   │   └── routes.ts
│   ├── chat/                 # Enhanced chat
│   │   ├── service.ts
│   │   ├── tough-love.ts
│   │   └── routes.ts
│   └── analytics/            # Analytics engine
│       ├── service.ts
│       └── routes.ts
├── memory/                   # EXISTING - Extended
│   └── graphStore.ts         # Add new NodeType/EdgeType
├── api/                      # EXISTING - Extended
│   └── routes/
│       └── relate.ts         # NEW - Route aggregator
```

#### 0.2 Extend GraphStore Types
- Add RelateNodeType to NodeType union
- Add RelateEdgeType to EdgeType union
- Ensure backward compatibility with existing types

#### 0.3 Create RelateMemoryManager
- Implement `src/relate/memory.ts`
- Extend UnifiedMemory for relationship domain
- Implement CRUD for all new entity types
- Implement graph traversal for knowledge graph

#### 0.4 Create Type Definitions
- Implement `src/relate/types.ts`
- Define all interfaces from specification
- Add validation schemas (zod or similar)

### Deliverables
- [x] Extended GraphStore types
- [ ] RelateMemoryManager implementation
- [ ] Type definitions with validation
- [ ] Test coverage for new types

### Validation Criteria
- All types compile without errors
- RelateMemoryManager can perform basic CRUD
- Existing PKA-STRAT routes still work

---

## Phase 1: Authentication & User Management

### Objective
Implement secure user authentication and profile management.

### Tasks

#### 1.1 User Database Setup
```typescript
// src/relate/auth/db.ts
// SQLite tables for users, sessions, refresh tokens
```

#### 1.2 Authentication Service
```typescript
// src/relate/auth/service.ts
interface AuthService {
  signup(email: string, password: string, name: string): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  logout(userId: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  validateToken(accessToken: string): Promise<User>;
}
```

#### 1.3 Auth Middleware
```typescript
// src/relate/auth/middleware.ts
// Express middleware for route protection
// Attaches user to request object
```

#### 1.4 User Management Service
```typescript
// src/relate/user/service.ts
interface UserService {
  getProfile(userId: string): Promise<User>;
  updateProfile(userId: string, updates: Partial<User>): Promise<User>;
  getPsychProfile(userId: string): Promise<PsychologicalProfile>;
  updatePsychProfile(userId: string, updates: Partial<PsychologicalProfile>): Promise<PsychologicalProfile>;
  getSettings(userId: string): Promise<UserSettings>;
  updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings>;
  getCoreValues(userId: string): Promise<CoreValue[]>;
  addCoreValue(userId: string, value: CoreValueCreate): Promise<CoreValue>;
  removeCoreValue(userId: string, valueId: string): Promise<void>;
  getMentors(userId: string): Promise<Mentor[]>;
  addMentor(userId: string, mentor: MentorCreate): Promise<Mentor>;
  removeMentor(userId: string, mentorId: string): Promise<void>;
  getFocusAreas(userId: string): Promise<FocusArea[]>;
  createFocusArea(userId: string, focusArea: FocusAreaCreate): Promise<FocusArea>;
  updateFocusArea(userId: string, focusAreaId: string, updates: Partial<FocusArea>): Promise<FocusArea>;
  deleteFocusArea(userId: string, focusAreaId: string): Promise<void>;
}
```

#### 1.5 Auth Routes
```typescript
// src/relate/auth/routes.ts
POST /auth/signup
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET /auth/me
```

#### 1.6 User Routes
```typescript
// src/relate/user/routes.ts
GET /users/me/profile
PUT /users/me/profile
GET /users/me/psychological-profile
PUT /users/me/psychological-profile
GET /users/me/settings
PUT /users/me/settings
GET /users/me/values
POST /users/me/values
DELETE /users/me/values/:id
GET /users/me/mentors
POST /users/me/mentors
DELETE /users/me/mentors/:id
GET /users/me/focus-areas
POST /users/me/focus-areas
PUT /users/me/focus-areas/:id
DELETE /users/me/focus-areas/:id
```

### Deliverables
- [ ] User database schema and migrations
- [ ] AuthService with JWT handling
- [ ] Auth middleware for route protection
- [ ] UserService with profile management
- [ ] All auth and user routes
- [ ] Test coverage

### Validation Criteria
- User can sign up with valid credentials
- User can log in and receive tokens
- Protected routes reject unauthenticated requests
- Token refresh works correctly
- User can update all profile fields

---

## Phase 2: Sub-Systems & Content

### Objective
Implement the knowledge organization system with sub-systems and content items.

### Tasks

#### 2.1 SubSystem Service
```typescript
// src/relate/systems/service.ts
interface SubSystemService {
  getAll(userId: string): Promise<SubSystem[]>;
  get(userId: string, systemId: string): Promise<SubSystem>;
  create(userId: string, data: SubSystemCreate): Promise<SubSystem>;
  update(userId: string, systemId: string, updates: Partial<SubSystem>): Promise<SubSystem>;
  delete(userId: string, systemId: string): Promise<void>;
  link(userId: string, sourceId: string, targetId: string): Promise<void>;
  unlink(userId: string, sourceId: string, targetId: string): Promise<void>;
  getGraph(userId: string): Promise<GraphData>;
  seedDefaults(userId: string): Promise<SubSystem[]>;
}
```

#### 2.2 ContentItem Service
```typescript
// src/relate/content/service.ts
interface ContentService {
  getAll(userId: string, filters?: ContentFilters): Promise<ContentItem[]>;
  get(userId: string, itemId: string): Promise<ContentItem>;
  create(userId: string, systemId: string, data: ContentItemCreate): Promise<ContentItem>;
  update(userId: string, itemId: string, updates: Partial<ContentItem>): Promise<ContentItem>;
  delete(userId: string, itemId: string): Promise<void>;
  search(userId: string, query: string, options?: SearchOptions): Promise<SearchResult[]>;
  moveToSystem(userId: string, itemId: string, newSystemId: string): Promise<ContentItem>;
}
```

#### 2.3 Sub-System Routes
```typescript
// src/relate/systems/routes.ts
GET /systems
POST /systems
GET /systems/:id
PUT /systems/:id
DELETE /systems/:id
GET /systems/:id/items
POST /systems/:id/items
GET /systems/graph
POST /systems/:id/link/:targetId
DELETE /systems/:id/link/:targetId
```

#### 2.4 Content Routes
```typescript
// src/relate/content/routes.ts
GET /content-items
GET /content-items/:id
PUT /content-items/:id
DELETE /content-items/:id
GET /content-items/search
```

#### 2.5 Vector Store Integration
- Index content items for semantic search
- Update embeddings on content changes
- Support multi-system search

### Deliverables
- [ ] SubSystem service with graph operations
- [ ] ContentItem service with semantic search
- [ ] Default sub-system seeding on user creation
- [ ] Knowledge graph visualization data
- [ ] All system and content routes
- [ ] Test coverage

### Validation Criteria
- User can create/edit/delete sub-systems
- Content items are properly categorized
- Semantic search returns relevant results
- Knowledge graph data structure is correct
- Linking/unlinking systems works

---

## Phase 3: Interactions & Tracking

### Objective
Implement interaction logging and focus area progress tracking.

### Tasks

#### 3.1 Interaction Service
```typescript
// src/relate/interactions/service.ts
interface InteractionService {
  getAll(userId: string, filters?: InteractionFilters): Promise<Interaction[]>;
  get(userId: string, interactionId: string): Promise<Interaction>;
  create(userId: string, data: InteractionCreate): Promise<Interaction>;
  update(userId: string, interactionId: string, updates: Partial<Interaction>): Promise<Interaction>;
  delete(userId: string, interactionId: string): Promise<void>;
  getStats(userId: string, period: Period): Promise<InteractionStats>;
  detectValueContradictions(userId: string, interaction: Interaction): Promise<string[]>;
  updateFocusAreaProgress(userId: string, interaction: Interaction): Promise<void>;
}
```

#### 3.2 Progress Tracking
```typescript
// src/relate/interactions/progress.ts
interface ProgressTracker {
  updateStreak(userId: string): Promise<number>;
  calculateWeeklyChange(userId: string, focusAreaId: string): Promise<number>;
  recordActivity(userId: string, focusAreaId: string): Promise<void>;
}
```

#### 3.3 Interaction Routes
```typescript
// src/relate/interactions/routes.ts
GET /interactions
POST /interactions
GET /interactions/:id
PUT /interactions/:id
DELETE /interactions/:id
GET /interactions/stats
```

### Deliverables
- [ ] InteractionService with full CRUD
- [ ] Progress tracking for focus areas
- [ ] Streak calculation logic
- [ ] Value contradiction detection
- [ ] Statistics aggregation
- [ ] All interaction routes
- [ ] Test coverage

### Validation Criteria
- User can log interactions with all fields
- Focus area progress updates on interaction
- Streaks calculate correctly
- Value contradictions are detected
- Statistics aggregate properly

---

## Phase 4: AI Chat Enhancement

### Objective
Enhance the chat system with relationship context, tough love mode, and source citations.

### Tasks

#### 4.1 Enhanced Chat Service
```typescript
// src/relate/chat/service.ts
interface EnhancedChatService {
  getConversations(userId: string): Promise<ChatConversation[]>;
  getConversation(userId: string, conversationId: string): Promise<ChatConversation>;
  createConversation(userId: string, title?: string): Promise<ChatConversation>;
  deleteConversation(userId: string, conversationId: string): Promise<void>;
  getMessages(userId: string, conversationId: string, pagination?: Pagination): Promise<ChatMessage[]>;
  sendMessage(userId: string, conversationId: string, content: string, options?: ChatOptions): Promise<ChatResponse>;
  provideFeedback(userId: string, messageId: string, feedback: Feedback): Promise<void>;
}
```

#### 4.2 Context Builder
```typescript
// src/relate/chat/context.ts
interface ContextBuilder {
  buildUserContext(userId: string): Promise<UserContext>;
  buildSearchContext(userId: string, query: string, options?: ContextOptions): Promise<SearchContext>;
  formatSourceCitations(results: SearchResult[]): ChatSource[];
}
```

#### 4.3 Tough Love Engine
```typescript
// src/relate/chat/tough-love.ts
interface ToughLoveEngine {
  shouldActivate(userId: string, message: string, history: ChatMessage[]): Promise<boolean>;
  getPatterns(userId: string): Promise<Pattern[]>;
  generateCandidPrompt(patterns: Pattern[], values: CoreValue[]): string;
}
```

#### 4.4 Prompt Templates
```typescript
// src/relate/prompts.ts
// System prompts for relationship assistant
// Tough love mode instructions
// Context formatting templates
```

#### 4.5 Chat Routes
```typescript
// src/relate/chat/routes.ts
GET /conversations
POST /conversations
GET /conversations/:id
DELETE /conversations/:id
GET /conversations/:id/messages
POST /conversations/:id/messages
POST /conversations/:id/feedback
```

### Deliverables
- [ ] Enhanced ChatService with conversation management
- [ ] Context builder with user profile integration
- [ ] Tough love detection and activation
- [ ] Source citation extraction and formatting
- [ ] Streaming response support (SSE)
- [ ] Feedback collection
- [ ] All chat routes
- [ ] Test coverage

### Validation Criteria
- Chat responses include source citations
- User context affects response quality
- Tough love mode activates appropriately
- Feedback is recorded
- Streaming works for mobile clients

---

## Phase 5: Analytics & Insights

### Objective
Implement analytics, accountability alerts, and growth insights.

### Tasks

#### 5.1 Analytics Service
```typescript
// src/relate/analytics/service.ts
interface AnalyticsService {
  getWeeklySummary(userId: string, weekOf?: Date): Promise<WeeklySummary>;
  getFocusProgress(userId: string, focusAreaId?: string, period?: Period): Promise<ProgressData[]>;
  getInteractionPatterns(userId: string, period?: Period): Promise<PatternAnalysis>;
  getStreakData(userId: string): Promise<StreakData>;
  getAccountabilityAlerts(userId: string): Promise<AccountabilityAlert[]>;
  acknowledgeAlert(userId: string, alertId: string): Promise<AccountabilityAlert>;
}
```

#### 5.2 Accountability Engine
```typescript
// src/relate/analytics/accountability.ts
interface AccountabilityEngine {
  detectValueContradictions(userId: string): Promise<AccountabilityAlert[]>;
  detectGoalDrift(userId: string): Promise<AccountabilityAlert[]>;
  detectPatterns(userId: string): Promise<AccountabilityAlert[]>;
  generateSuggestions(alerts: AccountabilityAlert[]): string[];
}
```

#### 5.3 Analytics Routes
```typescript
// src/relate/analytics/routes.ts
GET /analytics/weekly-summary
GET /analytics/focus-progress
GET /analytics/interaction-patterns
GET /analytics/streak-data
GET /analytics/accountability
PUT /analytics/accountability/:id/acknowledge
```

### Deliverables
- [ ] AnalyticsService with all metrics
- [ ] AccountabilityEngine for alert generation
- [ ] Pattern detection algorithms
- [ ] Weekly summary generation
- [ ] All analytics routes
- [ ] Test coverage

### Validation Criteria
- Weekly summary includes accurate data
- Focus progress shows trends
- Accountability alerts are relevant
- Pattern detection identifies real patterns
- All analytics endpoints return valid data

---

## Phase 6: Polish & Export

### Objective
Complete remaining features, add data export, and polish for production.

### Tasks

#### 6.1 Data Export Service
```typescript
// src/relate/export/service.ts
interface ExportService {
  initiateExport(userId: string, options: ExportOptions): Promise<ExportJob>;
  getExportStatus(userId: string, exportId: string): Promise<ExportStatus>;
  downloadExport(userId: string, exportId: string): Promise<Buffer>;
  deleteExport(userId: string, exportId: string): Promise<void>;
}
```

#### 6.2 Upcoming Events (Future Feature Prep)
```typescript
// src/relate/events/service.ts
interface EventService {
  getUpcoming(userId: string): Promise<UpcomingEvent[]>;
  create(userId: string, event: EventCreate): Promise<UpcomingEvent>;
  update(userId: string, eventId: string, updates: Partial<UpcomingEvent>): Promise<UpcomingEvent>;
  delete(userId: string, eventId: string): Promise<void>;
}
```

#### 6.3 Export Routes
```typescript
// src/relate/export/routes.ts
POST /export/data
GET /export/:exportId
```

#### 6.4 Events Routes
```typescript
// src/relate/events/routes.ts
GET /events
POST /events
GET /events/:id
PUT /events/:id
DELETE /events/:id
GET /events/upcoming
```

#### 6.5 Production Readiness
- Error handling audit
- Logging and monitoring
- Performance optimization
- Security audit
- Documentation

### Deliverables
- [ ] Export service with full data export
- [ ] Events service (future feature prep)
- [ ] Production logging
- [ ] Performance optimizations
- [ ] Security hardening
- [ ] API documentation

### Validation Criteria
- Full data export works correctly
- Events CRUD functional
- No security vulnerabilities
- Performance targets met
- Documentation complete

---

## Implementation Order & Dependencies

```
Phase 0: Foundation
    └── Phase 1: Authentication
            └── Phase 2: Sub-Systems & Content
                    ├── Phase 3: Interactions
                    │       └── Phase 4: AI Chat ─┐
                    └────────────────────────────────┴── Phase 5: Analytics
                                                              └── Phase 6: Polish
```

---

## File Changes Summary

### New Files to Create

```
src/relate/
├── types.ts                      # All type definitions
├── memory.ts                     # RelateMemoryManager
├── prompts.ts                    # AI prompt templates
├── auth/
│   ├── service.ts               # AuthService
│   ├── middleware.ts            # Auth middleware
│   ├── jwt.ts                   # JWT utilities
│   ├── db.ts                    # User database
│   └── routes.ts                # Auth routes
├── user/
│   ├── service.ts               # UserService
│   └── routes.ts                # User routes
├── systems/
│   ├── service.ts               # SubSystemService
│   └── routes.ts                # System routes
├── content/
│   ├── service.ts               # ContentService
│   └── routes.ts                # Content routes
├── interactions/
│   ├── service.ts               # InteractionService
│   ├── progress.ts              # Progress tracking
│   └── routes.ts                # Interaction routes
├── chat/
│   ├── service.ts               # Enhanced ChatService
│   ├── context.ts               # Context builder
│   ├── tough-love.ts            # Tough love engine
│   └── routes.ts                # Chat routes
├── analytics/
│   ├── service.ts               # AnalyticsService
│   ├── accountability.ts        # Accountability engine
│   └── routes.ts                # Analytics routes
├── events/
│   ├── service.ts               # EventService
│   └── routes.ts                # Event routes
└── export/
    ├── service.ts               # ExportService
    └── routes.ts                # Export routes
```

### Files to Modify

```
src/memory/graphStore.ts         # Add new NodeType/EdgeType
src/api/routes/index.ts          # Add relate routes
src/api/server.ts                # Configure auth middleware
```

---

## Testing Strategy

### Unit Tests
- All service methods
- All utility functions
- Type validation
- Edge cases

### Integration Tests
- API endpoints
- Database operations
- Authentication flow
- Chat with context

### E2E Tests
- Complete user journeys
- Mobile app simulation
- Performance under load

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing routes | Keep PKA-STRAT routes isolated, use feature flags |
| Performance degradation | Profile before/after, optimize vector search |
| Data migration issues | Schema versioning, backup strategy |
| LLM integration reliability | Fallback responses, timeout handling |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| API test coverage | > 80% |
| Response time p95 | < 200ms |
| Chat response time | < 3s |
| Error rate | < 0.1% |
| User data isolation | 100% |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-31 | Hive Mind | Initial implementation plan |
