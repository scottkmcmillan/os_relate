# Cortexis: Product Design & Architecture Document

## Executive Summary

**Cortexis** is a self-learning knowledge management system that combines semantic vector search with Graph Neural Networks (GNN) to provide intelligent document retrieval and question-answering capabilities. The system learns from user interactions to continuously improve search relevance over time.

---

## 1. Product Vision

### 1.1 Problem Statement
Organizations struggle with information retrieval across vast document repositories. Traditional keyword-based search fails to understand context, relationships, and user intent, leading to:
- Poor search relevance
- Time wasted finding information
- Siloed knowledge across departments
- No learning from user behavior

### 1.2 Solution
Cortexis provides an intelligent knowledge base that:
- Uses **semantic understanding** to find relevant documents regardless of exact keyword matches
- Employs **39 attention mechanisms** to optimize search for different query types
- Leverages **Graph Neural Networks** to learn from user behavior and document relationships
- Offers **conversational Q&A** for natural language interactions with documents

### 1.3 Target Users
- **Knowledge Workers**: Researchers, analysts, and professionals who need to search large document sets
- **Enterprise Teams**: Organizations wanting centralized, intelligent document access
- **Developers**: Teams building AI-powered search into their applications

---

## 2. Core Features

### 2.1 Semantic Search
**Route**: `/search`

Natural language search across the knowledge base with:
- Multi-collection search capability
- Real-time result scoring with confidence indicators
- GNN boost visualization showing learning improvements
- Attention mechanism selection (Auto, FlashAttention, HyperbolicAttention, GraphAttention, CrossAttention)

**Key Metrics Displayed**:
- Search time (ms)
- Total results found
- Algorithm used
- GNN relevance boost percentage

### 2.2 Document Upload & Ingestion
**Route**: `/upload`

Multi-stage document processing pipeline:
1. **Parsing**: Extract text from documents (PDF, DOCX, TXT, etc.)
2. **Chunking**: Split documents into semantic segments
3. **Embedding**: Convert text to vector representations
4. **Inserting**: Store vectors in the collection
5. **Learning**: Update GNN with new document relationships

**Supported Features**:
- Drag-and-drop file upload
- Real-time progress tracking
- Collection assignment
- Batch processing

### 2.3 Collections Management
**Route**: `/collections`

Organize documents into logical collections:
- Create/delete collections
- View collection statistics (vector count, document count)
- Monitor per-collection metrics
- Configure distance metrics (cosine, euclidean, dot product)
- Track GNN improvement per collection

### 2.4 Q&A Assistant (RAG Chat)
**Route**: `/chat`

Retrieval-Augmented Generation (RAG) chat interface:
- Natural language questions
- Source citation with relevance scores
- Conversation history
- Multi-collection queries
- Confidence scoring
- Response time metrics

### 2.5 Analytics Dashboard
**Routes**: `/` (Dashboard), `/analytics`

Comprehensive system monitoring:
- **Performance Metrics**: Average search time, P95/P99 latency, throughput
- **Learning Metrics**: GNN improvement percentage, training iterations, pattern confidence
- **Usage Metrics**: Queries per day, active users, peak hours
- **Storage Metrics**: Total vectors, documents, storage used, compression ratio

### 2.6 Terminal Interface
**Route**: `/terminal`

Developer-focused CLI for:
- Direct API access
- Collection management commands
- System diagnostics
- Advanced configuration

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CORTEXIS FRONTEND                          │
│                    (React + TypeScript + Vite)                      │
├─────────────────────────────────────────────────────────────────────┤
│  Pages        │  Components      │  State Management               │
│  ─────────    │  ───────────     │  ─────────────────               │
│  Dashboard    │  Layout          │  React Query (server state)     │
│  Search       │  Search          │  React useState (local state)   │
│  Chat         │  Chat            │  Zustand (global state)         │
│  Upload       │  Upload          │                                  │
│  Collections  │  Dashboard       │                                  │
│  Analytics    │  Terminal        │                                  │
│  Terminal     │  UI (shadcn)     │                                  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │   REST API     │
                          │  (Backend)     │
                          └────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
┌───────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ Vector Store  │        │  GNN Learning   │        │   LLM Service   │
│  (Embeddings) │        │    Engine       │        │  (Chat/RAG)     │
└───────────────┘        └─────────────────┘        └─────────────────┘
```

### 3.2 Frontend Architecture

#### Technology Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 18 | Component-based UI |
| Build Tool | Vite | Fast development & bundling |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| UI Components | shadcn/ui | Accessible, customizable components |
| State Management | TanStack Query | Server state & caching |
| Routing | React Router v6 | Client-side navigation |
| Charts | Recharts | Data visualization |
| Forms | React Hook Form + Zod | Form handling & validation |

#### Directory Structure
```
src/
├── components/
│   ├── layout/          # App shell (Sidebar, Header, AppLayout)
│   ├── ui/              # shadcn/ui components
│   ├── dashboard/       # Dashboard widgets (Charts, MetricCard)
│   ├── search/          # Search components (SearchBar, ResultCard)
│   ├── chat/            # Chat interface (ChatWindow)
│   ├── collections/     # Collection components (CollectionCard)
│   ├── upload/          # Upload components (UploadZone)
│   └── terminal/        # Terminal emulator
├── pages/               # Route pages
├── hooks/               # Custom React hooks (use-api, use-mobile)
├── lib/                 # Utilities and API layer
│   ├── api.ts           # API service functions
│   ├── api-config.ts    # Endpoint configuration
│   ├── types.ts         # TypeScript interfaces
│   └── utils.ts         # Helper functions
└── index.css            # Design system tokens
```

### 3.3 API Architecture

#### Base Configuration
```typescript
API_BASE_URL = VITE_API_BASE_URL || 'http://localhost:3000/api'
```

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/collections` | GET | List all collections |
| `/collections` | POST | Create new collection |
| `/collections/names` | GET | Get collection names only |
| `/collections/:name` | GET | Get collection details |
| `/collections/:name` | DELETE | Delete collection |
| `/collections/:name/stats` | GET | Get collection statistics |
| `/collections/:name/search` | POST | Search within collection |
| `/documents/upload` | POST | Upload document (multipart) |
| `/documents/upload/:jobId/status` | GET | Get upload job status |
| `/chat` | POST | Send chat message |
| `/chat/history` | GET | Get conversation history |
| `/metrics` | GET | Get system metrics |
| `/insights` | GET | Get learning insights |

#### Data Types

**Collection**
```typescript
interface Collection {
  name: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dot';
  vectorCount: number;
  documentCount: number;
  createdAt: string;
  lastUpdated: string;
  stats: {
    avgSearchTime: number;
    queriesPerDay: number;
    gnnImprovement: number;
  };
}
```

**SearchResult**
```typescript
interface SearchResult {
  id: string;
  score: number;
  metadata: {
    title: string;
    content: string;
    author?: string;
    department?: string;
    tags?: string[];
  };
  explanation: {
    attentionMechanism: string;
    gnnBoost: number;
    searchTime: string;
  };
}
```

**UploadJob**
```typescript
interface UploadJob {
  jobId: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  stage: 'parsing' | 'chunking' | 'embedding' | 'inserting' | 'learning';
  progress: number;
  vectorsAdded: number;
  error?: string;
}
```

---

## 4. Design System

### 4.1 Color Palette

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--primary` | 221 83% 53% | Primary actions, links |
| `--gnn` | 262 83% 58% | GNN/learning indicators |
| `--accent` | 166 76% 41% | Success states, boosts |
| `--background` | 220 14% 96% | Page background |
| `--card` | 0 0% 100% | Card surfaces |
| `--destructive` | 0 84% 60% | Error states |

### 4.2 Typography

| Font | Usage |
|------|-------|
| Inter | Body text, headings, UI |
| JetBrains Mono | Code, metrics, terminal |

### 4.3 Gradients

| Name | Definition | Usage |
|------|------------|-------|
| `--gradient-primary` | Primary → GNN | Hero sections, CTAs |
| `--gradient-gnn` | GNN → Purple | Learning indicators |
| `--gradient-accent` | Accent → Teal | Success highlights |

### 4.4 Component Patterns

- **Cards**: Rounded corners (`radius: 0.75rem`), subtle borders, shadow on hover
- **Score Indicators**: Left border color (excellent/good/weak)
- **Glass Effect**: `backdrop-blur-xl` with semi-transparent backgrounds
- **Neural Pattern**: Radial gradients for ambient background texture

---

## 5. State Management

### 5.1 Server State (TanStack Query)

All API data is managed through React Query hooks in `src/hooks/use-api.ts`:

| Hook | Purpose | Refetch Interval |
|------|---------|------------------|
| `useCollections()` | Fetch all collections | - |
| `useCollectionNames()` | Fetch collection names | - |
| `useMetrics()` | Fetch system metrics | 30 seconds |
| `useInsights()` | Fetch learning insights | 60 seconds |
| `useSearch()` | Execute search mutation | - |
| `useUpload()` | Upload file mutation | - |
| `useUploadStatus()` | Poll upload job status | 1 second |
| `useChat()` | Send chat message | - |
| `useChatHistory()` | Fetch conversation history | - |

### 5.2 Query Keys

```typescript
const queryKeys = {
  collections: ['collections'],
  collectionNames: ['collections', 'names'],
  collection: (name: string) => ['collections', name],
  search: ['search'],
  uploadStatus: (jobId: string) => ['upload', jobId],
  chatHistory: (id?: string) => ['chat', 'history', id],
  metrics: ['metrics'],
  insights: ['insights'],
};
```

---

## 6. Key Workflows

### 6.1 Search Flow

```
User enters query
        │
        ▼
SearchBar.onSearch()
        │
        ▼
useSearch().mutate({ query, collection })
        │
        ▼
POST /collections/:collection/search
        │
        ▼
Backend: Vector similarity search + GNN reranking
        │
        ▼
Display ResultCards with scores & explanations
```

### 6.2 Upload Flow

```
User drops file
        │
        ▼
UploadZone triggers file selection
        │
        ▼
useUpload().mutate({ file, collection })
        │
        ▼
POST /documents/upload (multipart/form-data)
        │
        ▼
Backend returns jobId
        │
        ▼
useUploadStatus(jobId) polls every 1s
        │
        ▼
Display progress through stages:
parsing → chunking → embedding → inserting → learning
        │
        ▼
Job complete → Invalidate collections query
```

### 6.3 Chat (RAG) Flow

```
User sends message
        │
        ▼
useChat().mutate({ message, collection, conversationId })
        │
        ▼
POST /chat
        │
        ▼
Backend:
  1. Embed query
  2. Vector search
  3. GNN reranking
  4. LLM generation with context
        │
        ▼
Display response with:
  - Generated answer
  - Source citations
  - Confidence score
  - Timing metrics
```

---

## 7. Performance Considerations

### 7.1 Frontend Optimizations

- **Code Splitting**: Route-based lazy loading via React Router
- **Query Caching**: React Query with stale-while-revalidate
- **Optimistic Updates**: For mutations where applicable
- **Debounced Search**: Prevent excessive API calls during typing

### 7.2 API Optimizations

- **ngrok-skip-browser-warning**: Header added to bypass ngrok interstitials
- **Collection Names Endpoint**: Lightweight endpoint for dropdowns
- **Polling with Conditions**: Upload status polling stops on completion

---

## 8. Security Considerations

### 8.1 Current Implementation
- Environment-based API URL configuration
- No authentication shown in frontend (assumed backend handles)

### 8.2 Recommendations
- Add authentication layer (JWT/OAuth)
- Implement rate limiting indicators
- Add CSRF protection for mutations
- Secure file upload validation

---

## 9. Future Enhancements

### 9.1 Short Term
- [ ] Real-time search suggestions
- [ ] Batch document uploads
- [ ] Export search results
- [ ] Collection-level access controls

### 9.2 Medium Term
- [ ] User authentication & workspaces
- [ ] Webhook integrations for document ingestion
- [ ] Scheduled GNN retraining
- [ ] Custom embedding models

### 9.3 Long Term
- [ ] Multi-tenant architecture
- [ ] Plugin system for custom attention mechanisms
- [ ] Federated search across external sources
- [ ] Mobile application

---

## 10. Appendix

### 10.1 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3000/api` |

### 10.2 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 10.3 Related Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [README](./README.md)

---

*Document Version: 1.0*  
*Last Updated: December 2024*
