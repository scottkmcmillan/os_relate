# Enhanced Chat Service

Phase 4 implementation of PKA-Relate's AI chat system with RAG-based context retrieval and tough love mode.

## Quick Start

```typescript
import chatRouter from './relate/chat';

// Mount in Express app
app.use('/api/chat', chatRouter);
```

## Environment Setup

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_MAX_TOKENS=4096
ENABLE_EXTERNAL_SEARCH=true
```

## API Endpoints

### Conversations

```typescript
// List conversations
GET /api/chat/conversations

// Create conversation
POST /api/chat/conversations
{ "title": "Optional Title" }

// Get specific conversation (A6: NEW)
GET /api/chat/conversations/:id

// Update conversation (A7: NEW)
PUT /api/chat/conversations/:id
{ "title": "New Title", "tags": ["tag1", "tag2"] }

// Delete conversation
DELETE /api/chat/conversations/:id
```

### Messages

```typescript
// Get messages with pagination
GET /api/chat/conversations/:id/messages?limit=50&offset=0

// Send message (non-streaming)
POST /api/chat/conversations/:id/messages
{
  "message": "How can I communicate better?",
  "options": {
    "toughLoveMode": false,
    "systemIds": ["system-id-1"],
    "mentorPersona": "mentor-id",
    "includeHistory": 5
  }
}

// Send message (streaming)
POST /api/chat/conversations/:id/messages?stream=true
{
  "message": "How do I handle conflict?",
  "options": { "includeHistory": 3 }
}

// Provide feedback
POST /api/chat/conversations/:id/feedback
{
  "messageId": "msg-123",
  "rating": "positive",
  "note": "Very helpful advice"
}
```

## Core Features

### 1. RAG-based Context Retrieval

Searches user's knowledge library and synthesizes relevant context:

- **SubSystems:** User's organized knowledge domains
- **ContentItems:** Notes, articles, books, highlights
- **External Sources:** Cached thought leader content
- **Hybrid Ranking:** Vector similarity + graph connectivity

### 2. Tough Love Mode

Automatically detects when candid feedback is needed:

**Triggers:**
- Repetitive questioning (3+ similar questions)
- Self-justification patterns
- Avoidance language
- Validation-seeking behavior
- Value contradictions

**Response Style:**
- Direct and challenging
- References user's own sources
- Points out value misalignments
- Asks difficult questions
- Provides growth-focused steps

**Activation:**
```typescript
{
  "options": {
    "toughLoveMode": true  // Force enable
  }
}
```

### 3. Source Citations

All responses include:
- Inline citations [1], [2]
- Full source metadata
- User's highlights
- User's personal notes
- Provenance chain

### 4. Streaming (SSE)

Real-time response generation:

```typescript
// Client-side
const eventSource = new EventSource('/api/chat/conversations/123/messages?stream=true');

eventSource.addEventListener('message', (e) => {
  const chunk = JSON.parse(e.data);

  switch (chunk.type) {
    case 'start':
      console.log('Started:', chunk.messageId);
      break;
    case 'source':
      addSource(chunk.source);
      break;
    case 'content':
      appendContent(chunk.delta);
      break;
    case 'complete':
      finalizeMessage(chunk.metadata);
      eventSource.close();
      break;
  }
});
```

## Architecture

### Service Layer (`service.ts`)
Main orchestrator for all chat operations:
- Conversation management
- Message processing
- Response generation
- Metrics tracking

### Context Builder (`context.ts`)
Builds comprehensive context for RAG:
- Multi-source search
- Hybrid ranking
- User profile aggregation
- Context formatting for LLM

### Tough Love Engine (`tough-love.ts`)
Detects when candid feedback is needed:
- Pattern detection
- Value contradiction analysis
- Behavioral tracking
- Confidence scoring

### Prompts (`prompts.ts`)
System prompt templates:
- Standard supportive mode
- Tough love mode
- Mentor personas
- Context-aware prompts

### Routes (`routes.ts`)
Express router:
- RESTful endpoints
- SSE streaming
- Error handling
- Authentication

## Type System

All types defined in `types.ts`:

```typescript
import {
  ChatConversation,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  UserContext,
  SearchContext,
  ToughLoveDecision,
  // ... 30+ types
} from './relate/chat';
```

## Usage Examples

### Basic Chat

```typescript
import { EnhancedChatService } from './relate/chat';

const service = new EnhancedChatService(
  contextBuilder,
  toughLoveEngine,
  memory,
  process.env.ANTHROPIC_API_KEY
);

const response = await service.sendMessage(
  userId,
  conversationId,
  "How can I set better boundaries?"
);

console.log(response.message.content);
console.log('Sources:', response.sources);
console.log('Follow-ups:', response.suggestedFollowUps);
```

### Streaming Chat

```typescript
const stream = service.streamMessage(
  userId,
  conversationId,
  "Help me understand my attachment style",
  { includeHistory: 5 }
);

for await (const chunk of stream) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.delta);
  }
}
```

### Programmatic Tough Love Detection

```typescript
import { ToughLoveEngine } from './relate/chat';

const decision = await toughLoveEngine.shouldActivate(
  userId,
  message,
  conversationHistory
);

if (decision.activate) {
  console.log('Tough love activated:', decision.triggeredPatterns);
  console.log('Contradictions:', decision.valueContradictions);
  console.log('Suggested approach:', decision.suggestedApproach);
}
```

## Database Schema

See `AI_CHAT_SYSTEM_DESIGN.md` for full schema. Key tables:

- `chat_conversations` - Conversation metadata
- `chat_messages` - Messages with sources
- `chat_quality_metrics` - Response metrics
- `psychological_profiles` - User profiles
- `core_values` - User values
- `content_items` - Knowledge library

## Performance

### Caching
- Embedding cache: 1,000 items (LRU)
- Context cache: 100 items, 5min TTL
- External sources: 30 days

### Metrics Tracked
- Response latency
- Source relevance
- Citation density
- Tough love activation rate
- User feedback

### Optimization Tips
1. Pre-warm common queries
2. Use materialized views for searchable content
3. Batch source loading
4. Enable streaming for better UX
5. Monitor cache hit rates

## Testing

```bash
# Unit tests
npm test src/relate/chat/service.test.ts
npm test src/relate/chat/tough-love.test.ts
npm test src/relate/chat/context.test.ts

# Integration tests
npm test src/relate/chat/integration.test.ts

# E2E tests
npm run test:e2e
```

## Monitoring

Key metrics to track:

```typescript
// Response quality
- source_relevance > 0.6
- source_diversity > 0.4
- citation_density > 2.0

// Performance
- p95_latency < 5000ms
- streaming_chunk_delay < 100ms

// User satisfaction
- positive_feedback_rate > 0.75
- tough_love_false_positive_rate < 0.10
```

## Troubleshooting

### Slow Responses
- Check embedding generation time
- Verify database indexes exist
- Enable caching
- Reduce context size

### Poor Context Quality
- Ensure user has sufficient content
- Check embedding quality
- Adjust relevance thresholds
- Verify graph connectivity

### Tough Love Issues
- Review pattern detection thresholds
- Check user settings enabled
- Validate value contradictions
- Adjust confidence requirements

## Future Enhancements

1. **Voice Support** - Speech-to-text input
2. **Conversation Summaries** - Auto-generated insights
3. **Proactive Suggestions** - Surface relevant content
4. **Multi-modal** - Image analysis for screenshots
5. **Fine-tuning** - Custom model on user's library

## Support

- **Design Doc:** `docs/v2_PKA/PKA-relate/AI_CHAT_SYSTEM_DESIGN.md`
- **Implementation:** `docs/v2_PKA/PKA-relate/specs/PHASE_4_IMPLEMENTATION_SUMMARY.md`
- **Issues:** Create GitHub issue with `chat` label

---

**Version:** 1.0.0
**Last Updated:** 2025-12-30
**Status:** Production Ready
