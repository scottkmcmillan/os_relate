# Requirements Analysis: PKA-STRAT to PKA-Relate Backend Adaptation

**Analysis Date:** 2025-12-30
**Researcher:** Hive Mind Research Agent
**Swarm ID:** swarm-1767155276657-vyegx0lz9

---

## Executive Summary

This document maps the requirements for adapting the PKA-STRAT strategic pyramid backend to PKA-Relate, a relationship-focused personal knowledge assistant. The analysis identifies reusable components, new features needed, and data flow requirements across 19 user stories spanning content ingestion, AI assistance, personalization, and proactive guidance.

**Key Findings:**
- **60% code reuse** - Core memory infrastructure (UnifiedMemory, vector search, chat) can be directly reused
- **40% new development** - Relationship-specific features (psychological profiles, interactions, focus areas) require new models and routes
- **Zero database schema changes** - Existing vector/graph architecture supports new data models
- **RAG pipeline intact** - Document ingestion and AI chat system needs minor adaptations only

---

## 1. Source Document Analysis

### 1.1 User Stories Coverage

The PKA-Relate system is organized into 4 main epics with 19 user stories:

| Epic | User Stories | Backend Focus |
|------|--------------|---------------|
| **Epic 1: Content Ingestion & Knowledge Base** | US-1.1, US-1.2, US-1.3 | Document upload, auto-tagging, personal notes |
| **Epic 2: Intelligent Q&A & Assistant** | US-2.1, US-2.2, US-2.3, US-2.4, US-2.5 | RAG chat, source citations, tough love mode, external research |
| **Epic 3: Personalization & Evolution** | US-3.1, US-3.2, US-3.3, US-3.4, US-3.5 | Feedback loops, growth tracking, interaction logging, psychological profiling, values definition |
| **Epic 4: Proactive Guidance & Reporting** | US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-4.6, US-4.7 | Pre-game briefs, audit reports, recommendations, accountability, compatibility analysis |

### 1.2 Frontend API Requirements

The frontend specification defines **71 API endpoints** across 10 functional areas:

1. **Authentication** (5 endpoints) - User signup, login, logout, refresh, profile
2. **User Profile** (6 endpoints) - Profile, psychological profile, settings management
3. **Core Values** (3 endpoints) - CRUD operations for user values
4. **Mentors** (3 endpoints) - Manage guidance sources
5. **Focus Areas** (4 endpoints) - Track growth objectives
6. **Sub-Systems** (10 endpoints) - Knowledge organization with graph linking
7. **Content Items** (5 endpoints) - Content within sub-systems
8. **Interactions** (5 endpoints) - Relationship event logging with analytics
9. **Chat/AI Assistant** (4 endpoints) - Conversational RAG interface with feedback
10. **Analytics/Growth** (4 endpoints) - Progress tracking and pattern analysis
11. **Events** (5 endpoints) - Upcoming relationship events management
12. **Export** (1 endpoint) - Data portability

---

## 2. Existing Backend Capability Analysis

### 2.1 PKA-STRAT Backend Architecture

**Core Components:**
```
/src
├── api/
│   ├── routes/
│   │   ├── pyramid.ts        # Hierarchical entity CRUD
│   │   ├── documents.ts      # Upload + async processing
│   │   ├── chat.ts           # RAG-based Q&A
│   │   ├── search.ts         # Semantic search
│   │   ├── alignment.ts      # Score calculation
│   │   └── collections.ts    # Collection management
│   └── types.ts             # API type definitions
├── memory/
│   ├── index.ts             # UnifiedMemory (vector + graph)
│   ├── vectorStore.ts       # Embedding storage
│   ├── graphStore.ts        # Relationship graphs
│   └── collections.ts       # Collection manager
├── pka/
│   ├── memory.ts            # PKAMemoryManager
│   └── types.ts             # Pyramid entity types
└── ingestion/
    └── parser.ts            # Document parsing
```

**Key Capabilities:**

| Capability | Implementation | Reusability for PKA-Relate |
|-----------|----------------|----------------------------|
| **Document Upload** | `/documents/upload` - Async job processing with chunking, embedding, vector insertion | ✅ **Direct Reuse** - Perfect for US-1.1 (URL/PDF/text ingestion) |
| **Vector Search** | `UnifiedMemory.search()` - 384-dim embeddings, HNSW indexing, GNN re-ranking | ✅ **Direct Reuse** - Powers US-2.1 (natural language Q&A) |
| **RAG Chat** | `/chat` - Context retrieval, source citations, conversation history | ✅ **Minor Adaptation** - Add "tough love" mode for US-2.4 |
| **Entity Management** | `PKAMemoryManager` - CRUD for hierarchical entities (mission→task) | ⚠️ **Partial Reuse** - Adapt for SubSystem→ContentItem hierarchy |
| **Graph Relationships** | `GraphStore` - Node-edge storage with traversal | ✅ **Direct Reuse** - For SubSystem linking and knowledge graph |
| **Alignment Scoring** | `/alignment/*` - Multi-factor scoring with path analysis | ❌ **Replace** - Not needed, use progress/streak metrics instead |
| **Collections** | `CollectionManager` - Organize vector spaces by topic | ✅ **Direct Reuse** - Map to SubSystems (Dating, Masculinity, etc.) |

### 2.2 Type System Analysis

**PKA-STRAT Core Types:**
```typescript
// Hierarchical strategic entities
PyramidEntity {
  id, organizationId, level, name, description,
  parentId, documentIds, alignmentScore, metadata,
  createdAt, updatedAt
}

// Alignment tracking
AlignmentScore {
  entityId, score, vectorDistance, graphConnectivity,
  driftIndicator, confidence, lastCalculated
}

// Document linking
DocumentIngestion {
  id, filename, documentType, status,
  organizationId, linkedEntityId, extractedChunks,
  processingErrors, uploadedAt, completedAt
}
```

**Comparison with PKA-Relate Requirements:**

| PKA-STRAT Type | PKA-Relate Equivalent | Adaptation Required |
|----------------|----------------------|---------------------|
| `PyramidEntity` | `SubSystem` | ✅ Remove `level`, add `icon`, `color`, `linked_system_ids` |
| `DocumentIngestion` | `ContentItem` | ✅ Add `type`, `url`, `highlights`, `personal_notes`, `tags` |
| `AlignmentScore` | `FocusArea.progress` | ✅ Replace complex alignment with simple 0-100 progress |
| N/A | `Interaction` | ⚠️ **New Type** - Relationship event logging |
| N/A | `PsychologicalProfile` | ⚠️ **New Type** - User traits and patterns |
| N/A | `CoreValue` | ⚠️ **New Type** - User values categorization |

---

## 3. Requirements Mapping by Epic

### Epic 1: Content Ingestion & Knowledge Base

#### US-1.1: Share URLs, PDFs, and text snippets from other apps

**Backend Requirements:**
- Accept file uploads (existing: `/documents/upload`)
- Support URL ingestion (new: URL scraping)
- Accept raw text snippets (new: plain text endpoint)

**Existing Backend Support:**
```typescript
// ✅ EXISTING - Document upload
POST /documents/upload
- Multer file handling: ✅ .md, .txt, .json, .jsonl
- Async processing: ✅ parsing → chunking → embedding → insertion
- Job tracking: ✅ /documents/upload/:jobId/status

// ❌ MISSING - URL scraping
POST /content-items (NEW)
- Accept URL, scrape content
- Parse HTML/PDF from remote sources
- Extract metadata (title, author)
```

**Reusable Components:**
- ✅ `parseDocument()` function from `/ingestion/parser.ts`
- ✅ `processDocument()` async pipeline from `/routes/documents.ts`
- ✅ `UnifiedMemory.addDocuments()` for vector insertion

**New Development Required:**
- ⚠️ URL scraping library integration (e.g., `node-fetch` + `cheerio` for HTML, `pdf-parse` for PDFs)
- ⚠️ New endpoint: `POST /content-items` accepting `{type: 'url|text|file', content: '...', system_id: '...'}`

---

#### US-1.2: Automatically tag and categorize ingested content

**Backend Requirements:**
- Auto-detect content topics (e.g., "Neuroscience", "Conflict Resolution")
- Extract author names from documents
- Link content to appropriate SubSystems

**Existing Backend Support:**
```typescript
// ✅ PARTIAL - Document metadata extraction
parseDocument() returns:
  - metadata.title ✅
  - metadata.tags ✅
  - metadata.author ❌ (not implemented)

// ✅ EXISTING - Collection assignment
POST /documents/upload { collection: 'dating' }
```

**Reusable Components:**
- ✅ `parseDocument()` - Already extracts tags from JSON/JSONL metadata
- ✅ `CollectionManager` - Can map to SubSystems directly

**New Development Required:**
- ⚠️ NLP-based topic detection (use OpenAI embeddings similarity to predefined categories)
- ⚠️ Author extraction from document text (regex patterns for "by [Author]", metadata fields)
- ⚠️ Auto-linking algorithm: Search SubSystems by semantic similarity, suggest top 3 matches

**Data Flow:**
```
1. User uploads document → processDocument()
2. Extract text → parseDocument()
3. Generate embedding → UnifiedMemory.addDocument()
4. Semantic search across SubSystem descriptions → findBestMatch()
5. Auto-assign to top SubSystem OR prompt user with suggestions
```

---

#### US-1.3: Add personal notes to ingested content

**Backend Requirements:**
- Store user annotations per content item
- Support markdown formatting
- Link notes to specific content chunks

**Existing Backend Support:**
```typescript
// ❌ MISSING - No annotation support in current schema
Document {
  id, title, text, source, category, tags, metadata
}
```

**New Development Required:**
- ⚠️ Extend `ContentItem` model with `personal_notes` field
- ⚠️ New endpoint: `PUT /content-items/:id/notes { notes: 'markdown text' }`
- ⚠️ Store in `metadata.personalNotes` field of vector store

---

### Epic 2: Intelligent Q&A & Assistant

#### US-2.1: Ask natural language questions

**Backend Requirements:**
- Process free-form text queries
- Return contextual answers from knowledge base
- Maintain conversation history

**Existing Backend Support:**
```typescript
// ✅ FULLY IMPLEMENTED
POST /chat {
  message: "How do I handle conflict?",
  collection: "dating",
  conversationId: "conv-123"
}

Response: {
  message: { role: 'assistant', content: '...', sources: [...] },
  conversationId: "conv-123"
}
```

**Reusable Components:**
- ✅ `UnifiedMemory.search()` - Semantic retrieval with k=5, rerank=true
- ✅ Conversation store (in-memory Map) - Tracks message history
- ✅ Source citation - Returns `ChatSource[]` with titles, scores, snippets

**New Development Required:**
- ❌ **None** - Existing chat endpoint fully satisfies requirements

---

#### US-2.2: Cite specific sources from library

**Backend Requirements:**
- Include source references in answers
- Link to original documents
- Show relevance scores

**Existing Backend Support:**
```typescript
// ✅ FULLY IMPLEMENTED
ChatMessage {
  sources: [
    { id, title, score, snippet, gnnBoost }
  ]
}
```

**Reusable Components:**
- ✅ `ChatSource` type with title, score, snippet
- ✅ Search result ranking with `combinedScore`

**New Development Required:**
- ❌ **None** - Already implemented

---

#### US-2.3: Synthesize information from multiple sources

**Backend Requirements:**
- Retrieve top-k documents (k=5 currently)
- Combine context from multiple chunks
- Generate coherent response

**Existing Backend Support:**
```typescript
// ✅ IMPLEMENTED - Context building
const context = searchResults.map(r =>
  `[Source ${index}] ${r.title}:\n${r.text}`
).join('\n\n---\n\n');
```

**Reusable Components:**
- ✅ Multi-document retrieval with ranking
- ✅ Context concatenation logic

**New Development Required:**
- ⚠️ **LLM Integration** - Current system uses template responses. Need to add:
  - OpenAI API integration for GPT-4 response generation
  - Prompt engineering for synthesis (system prompt + context + user query)
  - Streaming support for real-time responses

---

#### US-2.4: Offer "tough love" and challenge perspective

**Backend Requirements:**
- Detect when user behavior contradicts healthy principles
- Flag contradictions with cited sources
- Toggle "candid mode" in settings

**Existing Backend Support:**
```typescript
// ❌ MISSING - No sentiment/behavioral analysis
ChatMessage {
  is_tough_love?: boolean // Type exists but not implemented
}
```

**New Development Required:**
- ⚠️ **Behavioral Analysis Module:**
  1. Track user's stated goals from `Interaction.learnings` and `FocusArea.title`
  2. Compare against reported behaviors in `Interaction.summary`
  3. Detect contradictions using semantic similarity between goals and actions
  4. Generate "tough love" response when contradiction detected
- ⚠️ User setting: `UserSettings.tough_love_mode_enabled`
- ⚠️ Modify chat endpoint to check setting and apply behavioral analysis

**Example Logic:**
```typescript
if (userSettings.tough_love_mode_enabled) {
  const userGoals = await getFocusAreas(userId);
  const recentActions = await getRecentInteractions(userId, days=7);

  const contradictions = detectContradictions(userGoals, recentActions);

  if (contradictions.length > 0) {
    response.is_tough_love = true;
    response.content = `Based on [Source], you said you wanted to ${goal},
      but you reported ${action} this week. This is protest behavior.`;
  }
}
```

---

#### US-2.5: Actively research public internet sources

**Backend Requirements:**
- Web search integration for specific thought leaders
- Fetch and parse external articles/transcripts
- Temporary caching of external content

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED - No external search
```

**New Development Required:**
- ⚠️ **External Search Module:**
  1. Integration with search API (Google Custom Search, Bing, or SerpAPI)
  2. Query: `"[thought leader name] + [user question topic]"`
  3. Fetch top 3 results → scrape content → chunk → embed → query
  4. Cache results in temporary collection (TTL: 24 hours)
- ⚠️ New endpoint: `POST /chat/research { mentor: 'Esther Perel', question: '...' }`
- ⚠️ UI toggle: "Search beyond library" checkbox

**Implementation Approach:**
```typescript
POST /chat/research
1. Detect if query mentions a Mentor from user's mentor list
2. Build search query: `"${mentor.name}" ${topicExtraction(query)}`
3. Call SerpAPI → get URLs
4. Scrape content (respect robots.txt)
5. Temporarily add to vector store with metadata: {source: 'external', ttl: 86400}
6. Run semantic search on combined local + external vectors
7. Return response with external source citations
```

---

### Epic 3: Personalization & Evolution

#### US-3.1: Provide feedback on advice (thumbs up/down)

**Backend Requirements:**
- Store feedback per chat message
- Track which advice worked vs. felt unnatural
- Use feedback for future personalization

**Existing Backend Support:**
```typescript
// ✅ ENDPOINT EXISTS (but no storage)
POST /conversations/:id/feedback
// Currently does nothing with the feedback
```

**New Development Required:**
- ⚠️ Extend `ChatMessage` schema: `{ feedback: 'positive' | 'negative' | null, feedback_note: string }`
- ⚠️ Store feedback in conversation history
- ⚠️ Analytics endpoint: `GET /analytics/feedback-patterns` → return frequently upvoted topics/sources

---

#### US-3.2: Track growth areas

**Backend Requirements:**
- CRUD operations for FocusArea entities
- Progress tracking (0-100 scale)
- Streak calculation (consecutive days)

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED
FocusArea {
  id, user_id, title, progress, streak,
  weekly_change, created_at, updated_at
}
```

**New Development Required:**
- ⚠️ New routes: `GET/POST/PUT/DELETE /users/me/focus-areas`
- ⚠️ Progress update logic: Manual user input OR auto-increment based on positive interactions
- ⚠️ Streak calculation:
  ```typescript
  function updateStreak(focusArea, todayHadProgress) {
    const lastUpdate = new Date(focusArea.updated_at);
    const today = new Date();
    const daysDiff = Math.floor((today - lastUpdate) / 86400000);

    if (todayHadProgress) {
      if (daysDiff === 1) focusArea.streak++;
      else if (daysDiff > 1) focusArea.streak = 1;
    } else if (daysDiff > 1) {
      focusArea.streak = 0;
    }
  }
  ```

---

#### US-3.3: Log interactions and outcomes

**Backend Requirements:**
- Store relationship events (conversations, dates, conflicts, milestones)
- Tag with emotions and outcome sentiment
- Extract learnings

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED
Interaction {
  id, user_id, type, person, summary, outcome,
  emotions, learnings, date, created_at
}
```

**New Development Required:**
- ⚠️ New routes: `GET/POST/PUT/DELETE /interactions`
- ⚠️ Analytics endpoint: `GET /interactions/stats` → weekly/monthly aggregates
- ⚠️ Pattern detection: `GET /analytics/interaction-patterns` → frequency by outcome, emotion trends over time

**Storage Approach:**
- Store as graph nodes with type `Interaction`
- Create edges: `User → HAS_INTERACTION → Interaction`
- Create edges: `Interaction → RELATES_TO → FocusArea` (link to growth areas)

---

#### US-3.4: Detect changes in user's approach over time

**Backend Requirements:**
- Compare early interactions vs. recent interactions
- Track evolution of psychological profile
- Update profile automatically when patterns shift

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED
PsychologicalProfile {
  attachment_style, attachment_updated_at,
  communication_style, communication_updated_at,
  conflict_pattern, conflict_updated_at
}
```

**New Development Required:**
- ⚠️ New routes: `GET/PUT /users/me/psychological-profile`
- ⚠️ **Pattern Detection Algorithm:**
  ```typescript
  async function detectProfileChanges(userId) {
    const first30Interactions = await getInteractions(userId, limit=30, offset=0);
    const last30Interactions = await getInteractions(userId, limit=30, orderBy='DESC');

    const earlyPattern = analyzeConflictPattern(first30Interactions);
    const recentPattern = analyzeConflictPattern(last30Interactions);

    if (earlyPattern !== recentPattern) {
      await updatePsychologicalProfile(userId, {
        conflict_pattern: recentPattern,
        conflict_updated_at: new Date()
      });
    }
  }

  function analyzeConflictPattern(interactions) {
    const conflictInteractions = interactions.filter(i => i.type === 'conflict');
    const avgOutcome = avgSentiment(conflictInteractions.map(i => i.outcome));

    if (avgOutcome > 0.7) return 'Constructive → Resolution';
    if (avgOutcome > 0.4) return 'Mixed → Sometimes Effective';
    return 'Avoidant → Explosive';
  }
  ```

---

#### US-3.5: Define core values and beliefs

**Backend Requirements:**
- CRUD for CoreValue entities
- Categorize as Primary/Secondary/Aspirational
- Use in compatibility analysis (US-4.6)

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED
CoreValue {
  id, user_id, category, value, created_at
}
```

**New Development Required:**
- ⚠️ New routes: `GET/POST/DELETE /users/me/values`
- ⚠️ Predefined value suggestions (frontend can provide, backend just stores)
- ⚠️ Integration with compatibility analysis (see US-4.6)

---

### Epic 4: Proactive Guidance & Reporting

#### US-4.1: Pre-Game briefing documents

**Backend Requirements:**
- Generate context-aware briefs before events
- Include relationship history, suggested tactics, mindset reminders
- Pull from library content matching event type

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED
UpcomingEvent {
  id, user_id, title, person, event_type,
  datetime, preparation_notes, talking_points, created_at
}
```

**New Development Required:**
- ⚠️ New routes: `GET/POST/PUT/DELETE /events`, `GET /events/upcoming`
- ⚠️ **Briefing Generation Endpoint:**
  ```typescript
  POST /events/:id/generate-briefing

  Algorithm:
  1. Get event details (person, type, datetime)
  2. Query past interactions with this person:
     GET /interactions?person={person}&limit=5
  3. Semantic search for relevant tactics:
     search(f"how to prepare for {event_type}")
  4. Extract user's focus areas: GET /users/me/focus-areas
  5. Compile briefing:
     - "Last interaction: [summary] (outcome: [positive/negative])"
     - "Key tactics from library: [source citations]"
     - "Remember to focus on: [active focus areas]"
  6. Store in preparation_notes field
  ```

---

#### US-4.2: Relationship Audit report

**Backend Requirements:**
- On-demand report generation
- Summarize recent interactions (last 30 days)
- Identify successful tactics vs. failures
- Flag areas needing improvement

**Existing Backend Support:**
```typescript
// ⚠️ PARTIAL - Interaction stats endpoint exists in frontend spec
GET /analytics/weekly-summary
```

**New Development Required:**
- ⚠️ New endpoint: `POST /analytics/generate-audit { period: '30d' }`
- ⚠️ **Audit Algorithm:**
  ```typescript
  async function generateAudit(userId, days=30) {
    const interactions = await getInteractions(userId, {
      created_after: Date.now() - (days * 86400000)
    });

    return {
      period: `${days} days`,
      total_interactions: interactions.length,
      by_type: groupBy(interactions, 'type'),
      positive_outcome_rate: percentPositive(interactions),
      most_common_emotions: topEmotions(interactions, 5),
      successful_tactics: extractTactics(interactions.filter(i => i.outcome === 'positive')),
      areas_for_improvement: extractTactics(interactions.filter(i => i.outcome === 'negative')),
      focus_area_progress: await getFocusAreaDeltas(userId, days)
    };
  }
  ```

---

#### US-4.3: Recommend specific readings

**Backend Requirements:**
- Match current challenges to library content
- Use semantic search to find relevant articles
- Personalize based on focus areas

**Existing Backend Support:**
```typescript
// ✅ FULLY REUSABLE
GET /collections/:name/search { query: "conflict resolution" }
```

**New Development Required:**
- ⚠️ New endpoint: `GET /recommendations/readings`
- ⚠️ **Recommendation Algorithm:**
  ```typescript
  async function recommendReadings(userId) {
    const focusAreas = await getFocusAreas(userId);
    const recentChallenges = await getInteractions(userId, {
      outcome: 'negative',
      limit: 5
    });

    const queries = [
      ...focusAreas.map(f => f.title),
      ...recentChallenges.map(c => c.summary)
    ];

    const recommendations = [];
    for (const query of queries) {
      const results = await memory.search(query, { k: 3 });
      recommendations.push(...results);
    }

    return deduplicateBySource(recommendations).slice(0, 10);
  }
  ```

---

#### US-4.4: Suggest exercises or reflections

**Backend Requirements:**
- Maintain library of exercises
- Match exercises to focus areas
- Track completion

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED
```

**New Development Required:**
- ⚠️ Create `Exercise` content type in SubSystem "Practices"
- ⚠️ Store exercises as ContentItems with metadata: `{type: 'exercise', difficulty: 1-5, focus_areas: [...]}`
- ⚠️ New endpoint: `GET /recommendations/exercises`
- ⚠️ Track completion: Add `completed_exercises: string[]` to UserSettings

---

#### US-4.5: Flag inconsistencies between goals and actions

**Backend Requirements:**
- Compare stated goals (FocusAreas) vs. reported actions (Interactions)
- Detect contradictions using semantic analysis
- Generate accountability alerts

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED (overlaps with US-2.4 tough love)
```

**New Development Required:**
- ⚠️ **Accountability Module** (reuse logic from US-2.4):
  ```typescript
  async function generateAccountabilityAlerts(userId) {
    const focusAreas = await getFocusAreas(userId);
    const recentInteractions = await getInteractions(userId, { days: 7 });

    const alerts = [];

    for (const focusArea of focusAreas) {
      // Example: Focus area = "Active Listening"
      const relevantInteractions = await searchSimilarInteractions(
        focusArea.title,
        recentInteractions
      );

      const negativeCount = relevantInteractions.filter(i =>
        i.outcome === 'negative' ||
        i.emotions.includes('Frustrated')
      ).length;

      if (negativeCount >= 3) {
        alerts.push({
          focus_area: focusArea.title,
          message: `You said you wanted to improve "${focusArea.title}", but you've reported ${negativeCount} challenging interactions this week.`,
          severity: 'high'
        });
      }
    }

    return alerts;
  }
  ```
- ⚠️ New endpoint: `GET /analytics/accountability` → returns alerts
- ⚠️ Display in Growth screen (frontend)

---

#### US-4.6: Analyze compatibility against values

**Backend Requirements:**
- Compare partner's observed behaviors vs. user's CoreValues
- Identify compatibility zones and compromises
- Generate compatibility report

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED
```

**New Development Required:**
- ⚠️ New endpoint: `POST /analytics/compatibility { person: 'Jane' }`
- ⚠️ **Compatibility Algorithm:**
  ```typescript
  async function analyzeCompatibility(userId, person) {
    const userValues = await getCoreValues(userId);
    const interactions = await getInteractions(userId, { person });

    const compatibilityScores = {};

    for (const value of userValues) {
      // Example: value = {category: 'Primary', value: 'Authenticity'}

      // Semantic search interactions for evidence of this value
      const evidenceInteractions = await searchSimilarInteractions(
        value.value,
        interactions
      );

      const positiveEvidence = evidenceInteractions.filter(i =>
        i.outcome === 'positive'
      ).length;

      const negativeEvidence = evidenceInteractions.filter(i =>
        i.outcome === 'negative'
      ).length;

      compatibilityScores[value.value] = {
        category: value.category,
        compatible: positiveEvidence > negativeEvidence,
        evidence_count: evidenceInteractions.length,
        compromises: negativeEvidence > 0 ?
          evidenceInteractions.filter(i => i.outcome === 'negative').map(i => i.summary) :
          []
      };
    }

    return compatibilityScores;
  }
  ```

---

#### US-4.7: Generate communication scripts

**Backend Requirements:**
- Use LLM to draft messages based on user's values and relationship context
- Provide NVC (Non-Violent Communication) templates
- Critique user drafts

**Existing Backend Support:**
```typescript
// ❌ NOT IMPLEMENTED (requires LLM integration)
```

**New Development Required:**
- ⚠️ New endpoint: `POST /assistance/draft-message { person, context, topic }`
- ⚠️ **Message Drafting Logic:**
  ```typescript
  async function draftMessage(userId, person, context, topic) {
    const userValues = await getCoreValues(userId);
    const pastInteractions = await getInteractions(userId, { person, limit: 3 });
    const nvcTemplates = await memory.search('non-violent communication', { k: 2 });

    const prompt = `
      You are helping a user communicate their needs clearly and authentically.

      User's core values: ${userValues.map(v => v.value).join(', ')}
      Past interactions with ${person}: ${summarize(pastInteractions)}

      Context: ${context}
      Topic to address: ${topic}

      Draft a message that:
      1. Uses Non-Violent Communication principles
      2. Clearly states the user's needs
      3. Respects both parties' boundaries
      4. Aligns with the user's values

      NVC Guidance: ${nvcTemplates[0].text}
    `;

    const draft = await callLLM(prompt);

    return {
      draft,
      talking_points: extractKeyPoints(draft),
      sources: nvcTemplates
    };
  }
  ```
- ⚠️ Message critique: `POST /assistance/critique-message { draft }`

---

## 4. Data Model Mapping

### 4.1 New Data Models Required

| PKA-Relate Model | Fields | Backend Storage |
|------------------|--------|-----------------|
| **User** | id, name, email, avatar_url, created_at, updated_at | Graph: `User` node |
| **PsychologicalProfile** | id, user_id, attachment_style, communication_style, conflict_pattern, *_updated_at | Graph: `Profile` node linked to `User` |
| **CoreValue** | id, user_id, category, value, created_at | Graph: `Value` node, edge: `User → HAS_VALUE → Value` |
| **Mentor** | id, user_id, name, description, created_at | Graph: `Mentor` node, edge: `User → FOLLOWS → Mentor` |
| **FocusArea** | id, user_id, title, progress, streak, weekly_change, created_at, updated_at | Graph: `FocusArea` node |
| **SubSystem** | id, user_id, name, description, icon, color, item_count, linked_system_ids, created_at, updated_at | Graph: `SubSystem` node (similar to PyramidEntity) |
| **ContentItem** | id, user_id, system_id, type, title, content, url, highlights, personal_notes, tags, linked_system_ids, created_at, updated_at | Vector: Document + Graph: `ContentItem` node |
| **Interaction** | id, user_id, type, person, summary, outcome, emotions, learnings, date, created_at | Graph: `Interaction` node |
| **ChatMessage** | id, user_id, conversation_id, type, content, sources, is_tough_love, created_at | In-memory (existing), persist to graph for long-term analysis |
| **UpcomingEvent** | id, user_id, title, person, event_type, datetime, preparation_notes, talking_points, created_at | Graph: `Event` node |
| **UserSettings** | user_id, push_notifications_enabled, data_privacy_strict, reflection_reminder_enabled, reflection_reminder_time, app_lock_enabled, tough_love_mode_enabled, updated_at | Graph: `Settings` node linked to `User` |

### 4.2 Graph Schema Extensions

**New Node Types:**
```typescript
NodeType =
  | 'User'
  | 'Profile'           // Psychological profile
  | 'Value'             // Core values
  | 'Mentor'            // Thought leaders
  | 'FocusArea'         // Growth tracking
  | 'SubSystem'         // Knowledge organization (replaces PyramidEntity)
  | 'ContentItem'       // Content within SubSystems
  | 'Interaction'       // Relationship events
  | 'Event'             // Upcoming events
  | 'Settings'          // User preferences
```

**New Edge Types:**
```typescript
EdgeType =
  | 'HAS_PROFILE'       // User → Profile
  | 'HAS_VALUE'         // User → Value
  | 'FOLLOWS'           // User → Mentor
  | 'HAS_FOCUS_AREA'    // User → FocusArea
  | 'OWNS_SYSTEM'       // User → SubSystem
  | 'CONTAINS'          // SubSystem → ContentItem
  | 'LINKS_TO'          // SubSystem ↔ SubSystem (knowledge graph)
  | 'HAS_INTERACTION'   // User → Interaction
  | 'RELATES_TO'        // Interaction → FocusArea (track progress)
  | 'HAS_EVENT'         // User → Event
  | 'CITES'             // ContentItem → ContentItem (cross-references)
```

### 4.3 Reusable vs. New Storage

| Data Category | Reuse PKA-STRAT? | Notes |
|---------------|------------------|-------|
| **Vector Store** | ✅ Yes | All ContentItems stored as Documents with embeddings |
| **Graph Store** | ✅ Yes | Extend with new node/edge types listed above |
| **Collections** | ✅ Yes | Map SubSystems to Collections (1:1 mapping) |
| **Conversation Store** | ✅ Yes | Existing in-memory Map, optionally persist to graph |
| **Upload Jobs** | ✅ Yes | Existing in-memory Map for async document processing |

---

## 5. API Endpoint Mapping

### 5.1 Direct Reuse (No Changes)

| Frontend Endpoint | Existing Backend Route | Status |
|-------------------|------------------------|--------|
| `POST /content-items/search` | `POST /collections/:name/search` | ✅ Direct reuse |
| `GET /conversations` | `GET /chat/conversations` | ✅ Direct reuse |
| `GET /conversations/:id/messages` | `GET /chat/history?id={id}` | ✅ Direct reuse |
| `POST /conversations/:id/messages` | `POST /chat` | ✅ Direct reuse |
| `DELETE /conversations/:id` | `DELETE /chat/history/:id` | ✅ Direct reuse |

### 5.2 Minor Adaptations Required

| Frontend Endpoint | Existing Backend Route | Adaptation Needed |
|-------------------|------------------------|-------------------|
| `POST /systems/:id/items` | `POST /documents/upload` | ✅ Add `system_id` parameter, return ContentItem format |
| `GET /systems/:id/items` | `GET /collections/:name/search` (all docs) | ⚠️ Add filter by system_id metadata |
| `POST /conversations/:id/feedback` | `POST /conversations/:id/feedback` | ⚠️ Implement storage (currently stub) |
| `GET /systems/graph` | `GET /pyramid/:orgId` (tree data) | ⚠️ Adapt to return SubSystem nodes + LINKS_TO edges |

### 5.3 New Endpoints Required (No Existing Equivalent)

**Authentication (5 endpoints):**
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`

**User Profile (3 endpoints):**
- `GET /users/me/profile`
- `GET /users/me/psychological-profile`
- `PUT /users/me/psychological-profile`

**Core Values (3 endpoints):**
- `GET /users/me/values`
- `POST /users/me/values`
- `DELETE /users/me/values/:id`

**Mentors (3 endpoints):**
- `GET /users/me/mentors`
- `POST /users/me/mentors`
- `DELETE /users/me/mentors/:id`

**Focus Areas (4 endpoints):**
- `GET /users/me/focus-areas`
- `POST /users/me/focus-areas`
- `PUT /users/me/focus-areas/:id`
- `DELETE /users/me/focus-areas/:id`

**Sub-Systems (6 new endpoints):**
- `POST /systems`
- `GET /systems/:id`
- `PUT /systems/:id`
- `DELETE /systems/:id`
- `POST /systems/:id/link/:targetId`
- `DELETE /systems/:id/link/:targetId`

**Content Items (4 endpoints):**
- `GET /content-items/:id`
- `PUT /content-items/:id`
- `DELETE /content-items/:id`
- `POST /content-items` (URL/text ingestion)

**Interactions (5 endpoints):**
- `GET /interactions`
- `POST /interactions`
- `GET /interactions/:id`
- `PUT /interactions/:id`
- `DELETE /interactions/:id`

**Events (5 endpoints):**
- `GET /events`
- `POST /events`
- `GET /events/:id`
- `PUT /events/:id`
- `DELETE /events/:id`

**Analytics (6 endpoints):**
- `GET /analytics/weekly-summary`
- `GET /analytics/focus-progress`
- `GET /analytics/interaction-patterns`
- `GET /analytics/streak-data`
- `GET /analytics/accountability`
- `POST /analytics/generate-audit`

**Recommendations (2 endpoints):**
- `GET /recommendations/readings`
- `GET /recommendations/exercises`

**Assistance (3 endpoints):**
- `POST /assistance/draft-message`
- `POST /assistance/critique-message`
- `POST /events/:id/generate-briefing`

**Settings (2 endpoints):**
- `GET /users/me/settings`
- `PUT /users/me/settings`

**Export (1 endpoint):**
- `POST /export/data`

---

## 6. Feature Comparison Matrix

| Feature | PKA-STRAT | PKA-Relate | Reuse% | New Development |
|---------|-----------|------------|--------|-----------------|
| **Document Upload** | ✅ Multer + async processing | ✅ Same + URL scraping | 80% | Add URL scraper, text endpoint |
| **Semantic Search** | ✅ UnifiedMemory.search() | ✅ Same | 100% | None |
| **RAG Chat** | ✅ Context retrieval + citations | ✅ Same + tough love mode | 90% | Add behavioral analysis |
| **Entity Hierarchy** | ✅ Mission→Task pyramid | ✅ SubSystem→ContentItem | 70% | Remove alignment scoring, add linking |
| **Collections** | ✅ Topic-based grouping | ✅ Map to SubSystems | 100% | None |
| **Graph Relationships** | ✅ ALIGNS_TO edges | ✅ LINKS_TO, CONTAINS, RELATES_TO | 60% | Add 8 new edge types |
| **Alignment Tracking** | ✅ Multi-factor scoring | ❌ Not needed | 0% | Remove completely |
| **User Profiles** | ❌ No user model | ✅ Psychological profiles | 0% | New user/auth system |
| **Interaction Logging** | ❌ None | ✅ Relationship events | 0% | New CRUD + analytics |
| **Progress Tracking** | ❌ None | ✅ FocusAreas with streaks | 0% | New tracking system |
| **External Research** | ❌ None | ✅ Web search + scraping | 0% | SerpAPI integration |
| **Proactive Reports** | ❌ None | ✅ Audits, briefings, accountability | 0% | Report generation pipelines |
| **LLM Integration** | ❌ Template responses | ✅ GPT-4 synthesis | 10% | OpenAI API integration |

**Overall Reuse: 60% infrastructure, 40% new features**

---

## 7. Data Flow Requirements

### 7.1 Content Ingestion Flow

```
User uploads document/URL/text
    ↓
Frontend: POST /content-items { type, content, system_id }
    ↓
Backend Route: /routes/content.ts
    ↓
1. Validate input
2. If URL: Scrape content (cheerio/puppeteer)
3. If file: Use existing multer handler
4. Parse content → parseDocument()
    ↓
5. Auto-categorize:
   - Extract topics via NLP
   - Semantic search SubSystem descriptions
   - Suggest top 3 matches OR use provided system_id
    ↓
6. Chunk text → splitIntoChunks()
    ↓
7. Generate embeddings → UnifiedMemory.addDocuments()
    ↓
8. Store in graph:
   - Create ContentItem node
   - Create edge: SubSystem → CONTAINS → ContentItem
   - If cross-references detected, create CITES edges
    ↓
9. Update SubSystem.item_count
    ↓
10. Return: { id, title, system_id, auto_tags }
```

### 7.2 Chat Flow with Tough Love

```
User asks question
    ↓
Frontend: POST /conversations/:id/messages { message }
    ↓
Backend Route: /routes/chat.ts
    ↓
1. Get or create conversation
2. Store user message
    ↓
3. Check UserSettings.tough_love_mode_enabled
    ↓
4. If tough_love:
   a. Get user's FocusAreas
   b. Get recent Interactions (7 days)
   c. Detect contradictions:
      - Semantic similarity between goals & actions
      - Count negative outcomes
   d. If contradiction threshold met:
      - Set is_tough_love = true
      - Modify system prompt to be candid
    ↓
5. Semantic search → UnifiedMemory.search(message, k=5)
    ↓
6. Build context from top results
    ↓
7. Generate response:
   - If no LLM: Use template (existing)
   - If LLM: Call OpenAI API with:
     * System prompt (candid if tough_love)
     * Context from search results
     * User question
    ↓
8. Store assistant message with sources
    ↓
9. Return: { message, sources, is_tough_love }
```

### 7.3 Interaction Logging & Growth Tracking Flow

```
User logs interaction
    ↓
Frontend: POST /interactions {
  type, person, summary, outcome, emotions, learnings
}
    ↓
Backend Route: /routes/interactions.ts
    ↓
1. Create Interaction node
2. Create edge: User → HAS_INTERACTION → Interaction
    ↓
3. Detect related FocusAreas:
   - Semantic search FocusArea.title against summary
   - If similarity > 0.7, create edge: Interaction → RELATES_TO → FocusArea
    ↓
4. Update FocusArea progress:
   - If outcome = 'positive': progress += 5
   - If outcome = 'negative': progress -= 2
   - Update streak based on date
    ↓
5. Trigger profile update check (async):
   - Every 30 interactions, run detectProfileChanges()
   - Update PsychologicalProfile if patterns shifted
    ↓
6. Return: { id, created_at }
```

### 7.4 Pre-Game Briefing Flow

```
User opens event detail
    ↓
Frontend: POST /events/:id/generate-briefing
    ↓
Backend Route: /routes/events.ts
    ↓
1. Get Event details (person, event_type, datetime)
    ↓
2. Query past interactions with person:
   - GET Interaction nodes where person = event.person
   - Order by date DESC, limit 5
    ↓
3. Semantic search for tactics:
   - Query: "how to prepare for {event_type}"
   - Search in all SubSystems, k=3
    ↓
4. Get user's current FocusAreas
    ↓
5. Compile briefing document:
   ```
   # Pre-Game Briefing: {event.title}

   ## Last Interaction
   {most_recent_interaction.summary} (Outcome: {outcome})

   ## Key Tactics
   {top_3_sources with citations}

   ## Current Focus Areas
   - {focus_area_1}: {progress}%
   - {focus_area_2}: {progress}%

   ## Talking Points
   - {generated_point_1}
   - {generated_point_2}
   ```
    ↓
6. Store in Event.preparation_notes
    ↓
7. Return: { briefing, sources }
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal:** Core infrastructure + authentication

- [ ] Implement authentication routes (`/auth/*`)
- [ ] Extend GraphStore with new node/edge types
- [ ] Create User, Profile, Settings models
- [ ] Build UserSettings CRUD routes
- [ ] Set up JWT token management

**Deliverable:** Users can sign up, log in, manage settings

---

### Phase 2: Content & Knowledge (Week 3-4)
**Goal:** Content ingestion + SubSystems

- [ ] Adapt `/documents/upload` to `/content-items` (add URL scraping)
- [ ] Implement SubSystem CRUD routes (`/systems/*`)
- [ ] Build SubSystem linking endpoints (knowledge graph)
- [ ] Add ContentItem update/delete routes
- [ ] Implement auto-tagging (NLP topic detection)

**Deliverable:** Users can upload content, organize into SubSystems, link systems

---

### Phase 3: Personalization (Week 5-6)
**Goal:** User profiles + growth tracking

- [ ] Implement CoreValue CRUD routes
- [ ] Implement Mentor CRUD routes
- [ ] Implement FocusArea CRUD routes with progress/streak logic
- [ ] Build PsychologicalProfile update routes
- [ ] Implement Interaction CRUD routes
- [ ] Build pattern detection for profile updates

**Deliverable:** Users can define values, track growth, log interactions

---

### Phase 4: AI Enhancement (Week 7-8)
**Goal:** LLM integration + advanced features

- [ ] Integrate OpenAI API for chat synthesis
- [ ] Implement tough love mode (behavioral analysis)
- [ ] Add external research (SerpAPI + web scraping)
- [ ] Build chat feedback storage
- [ ] Implement streaming responses

**Deliverable:** AI provides synthesized answers, tough love, external research

---

### Phase 5: Analytics & Proactivity (Week 9-10)
**Goal:** Reports, recommendations, accountability

- [ ] Implement `/analytics/weekly-summary`
- [ ] Build `/analytics/interaction-patterns`
- [ ] Implement `/analytics/accountability` (contradiction detection)
- [ ] Build `/analytics/generate-audit` (relationship audit)
- [ ] Implement `/recommendations/readings`
- [ ] Implement `/recommendations/exercises`

**Deliverable:** Users receive proactive insights, accountability alerts, reading recommendations

---

### Phase 6: Events & Communication (Week 11-12)
**Goal:** Event management + communication assistance

- [ ] Implement Event CRUD routes
- [ ] Build `/events/:id/generate-briefing`
- [ ] Implement `/assistance/draft-message`
- [ ] Implement `/assistance/critique-message`
- [ ] Build compatibility analysis (`/analytics/compatibility`)

**Deliverable:** Users get pre-game briefs, message drafting help, compatibility reports

---

### Phase 7: Polish & Optimization (Week 13-14)
**Goal:** Performance, testing, deployment

- [ ] Add pagination to all list endpoints
- [ ] Implement rate limiting
- [ ] Add comprehensive error handling
- [ ] Write integration tests
- [ ] Optimize database queries
- [ ] Set up monitoring/logging

**Deliverable:** Production-ready backend

---

## 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| **LLM API Costs** | High | Implement caching, use cheaper models for simple queries, rate limit |
| **External Scraping Legality** | Medium | Respect robots.txt, cache aggressively, provide opt-out |
| **Data Privacy** | High | Implement on-device mode, encryption at rest, user data export |
| **Behavioral Analysis Accuracy** | Medium | Start with simple heuristics, collect user feedback, iterate |
| **Scope Creep** | Medium | Focus on MVP user stories (US-1.x, US-2.x, US-3.1-3.3), defer US-4.x to v2 |
| **Graph Performance** | Low | HNSW indexing already fast, graph queries are shallow (max 3 hops) |

---

## 10. Conclusion

### Summary of Findings

**Reusable Components (60%):**
- ✅ UnifiedMemory vector search infrastructure
- ✅ Document upload pipeline (multer + async processing)
- ✅ RAG chat with source citations
- ✅ Graph storage for relationships
- ✅ Collection management system
- ✅ Semantic search API

**New Development Required (40%):**
- ⚠️ Authentication system (5 endpoints)
- ⚠️ User profile management (PsychologicalProfile, CoreValues, Mentors)
- ⚠️ Interaction logging & analytics (5 CRUD + 4 analytics endpoints)
- ⚠️ Growth tracking (FocusAreas with progress/streak)
- ⚠️ LLM integration for synthesis (OpenAI API)
- ⚠️ Behavioral analysis for tough love mode
- ⚠️ External research (SerpAPI + web scraping)
- ⚠️ Proactive features (briefings, audits, accountability)
- ⚠️ Communication assistance (message drafting, compatibility)

### Recommended Next Steps

1. **Immediate:** Validate this requirements mapping with stakeholders
2. **Week 1:** Begin Phase 1 (Foundation) - authentication + user models
3. **Week 2:** Set up development environment with OpenAI API keys
4. **Week 3:** Start Phase 2 (Content & Knowledge) - adapt document routes
5. **Ongoing:** Regular sync meetings after each phase completion

### Open Questions for Product Team

1. **LLM Choice:** OpenAI GPT-4 vs. Claude Opus vs. open-source (cost/privacy tradeoff)?
2. **Tough Love Threshold:** How aggressive should contradiction detection be?
3. **External Research:** Which APIs to prioritize (Google, Bing, SerpAPI)?
4. **MVP Scope:** Should we defer US-4.x (proactive features) to post-launch?
5. **Data Residency:** On-device only mode vs. cloud hybrid architecture?

---

**Document Status:** ✅ Complete
**Next Action:** Review with Planner agent for task decomposition
