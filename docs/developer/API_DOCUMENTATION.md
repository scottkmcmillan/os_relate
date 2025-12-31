# Cortexis API Integration Guide

This document describes the API contract that the Ranger backend must implement to work with the Cortexis frontend.

## Base Configuration

- **Base URL (Local)**: `http://localhost:3000/api`
- **Base URL (Public)**: `https://albertina-inspiratory-pausingly.ngrok-free.dev/api`
- **Frontend Config**: Set `VITE_API_BASE_URL` environment variable to the appropriate URL
- **Content-Type**: `application/json` (except file uploads)
- **CORS**: Enable CORS for the frontend origin

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/collections` | List all collections |
| POST | `/collections` | Create a new collection |
| GET | `/collections/:name` | Get a specific collection |
| DELETE | `/collections/:name` | Delete a collection |
| GET | `/collections/:name/stats` | Get collection statistics |
| POST | `/collections/:name/search` | Search within a collection |
| POST | `/documents/upload` | Upload a document |
| GET | `/documents/upload/:jobId/status` | Get upload job status |
| POST | `/chat` | Send a chat message |
| GET | `/chat/history` | Get chat history |
| GET | `/metrics` | Get system metrics |
| GET | `/insights` | Get learning insights |

---

## Data Types

### Collection

```typescript
interface Collection {
  name: string;                    // Unique collection identifier
  dimension: number;               // Vector dimension (e.g., 768, 1536)
  metric: 'cosine' | 'euclidean' | 'dot';  // Distance metric
  vectorCount: number;             // Total vectors in collection
  documentCount: number;           // Total documents
  createdAt: string;               // ISO 8601 timestamp
  lastUpdated: string;             // ISO 8601 timestamp
  stats: {
    avgSearchTime: number;         // Average search time in ms
    queriesPerDay: number;         // Query count per day
    gnnImprovement: number;        // GNN improvement percentage (0-100)
  };
}
```

### SearchResult

```typescript
interface SearchResult {
  id: string;                      // Unique result identifier
  score: number;                   // Similarity score (0-1 for cosine)
  metadata: {
    title: string;                 // Document title
    content: string;               // Document content/snippet
    author?: string;               // Optional author
    department?: string;           // Optional department
    tags?: string[];               // Optional tags array
    createdAt?: string;            // Optional creation date
    updatedAt?: string;            // Optional update date
  };
  explanation: {
    attentionMechanism: string;    // Which attention was used
    gnnBoost: number;              // GNN boost applied (percentage)
    searchTime: string;            // Search time (e.g., "45ms")
  };
}
```

### SearchResponse

```typescript
interface SearchResponse {
  results: SearchResult[];
  stats: {
    totalFound: number;            // Total matching results
    searchTime: number;            // Total search time in ms
    algorithm: string;             // Algorithm used (e.g., "HNSW + GNN")
  };
}
```

### UploadJob

```typescript
interface UploadJob {
  jobId: string;                   // Unique job identifier
  status: 'queued' | 'processing' | 'complete' | 'error';
  stage: 'parsing' | 'chunking' | 'embedding' | 'inserting' | 'learning';
  progress: number;                // 0-100 percentage
  vectorsAdded: number;            // Vectors added so far
  error?: string;                  // Error message if status is 'error'
}
```

### ChatMessage

```typescript
interface ChatMessage {
  id: string;                      // Unique message identifier
  role: 'user' | 'assistant' | 'system';
  content: string;                 // Message content
  sources?: ChatSource[];          // Sources used for response
  confidence?: number;             // Response confidence (0-1)
  searchTime?: number;             // Time to search in ms
  generationTime?: number;         // Time to generate in ms
  timestamp: Date;                 // Message timestamp
}

interface ChatSource {
  id: string;                      // Source document ID
  title: string;                   // Source title
  score: number;                   // Relevance score
  snippet: string;                 // Relevant snippet
  gnnBoost: number;                // GNN boost applied
}
```

### Metrics

```typescript
interface Metrics {
  performance: {
    avgSearchTime: number;         // Average search time in ms
    p95SearchTime: number;         // 95th percentile search time
    p99SearchTime: number;         // 99th percentile search time
    throughput: number;            // Queries per second
    successRate: number;           // Success rate (0-100)
  };
  learning: {
    gnnImprovement: number;        // Overall GNN improvement %
    trainingIterations: number;    // Total training iterations
    lastTrainingTime: string;      // ISO 8601 timestamp
    attentionOverhead: number;     // Attention overhead in ms
    patternConfidence: number;     // Pattern confidence (0-1)
  };
  usage: {
    totalQueries: number;          // All-time query count
    queriesToday: number;          // Today's query count
    queriesPerHour: number;        // Current rate
    activeUsers: number;           // Active users count
    avgQueriesPerUser: number;     // Avg queries per user
    peakHour: string;              // Peak hour (e.g., "14:00")
  };
  collections: Collection[];       // All collections summary
  storage: {
    totalVectors: number;          // Total vectors stored
    totalDocuments: number;        // Total documents stored
    storageUsed: string;           // Human readable (e.g., "2.4 GB")
    compressionRatio: number;      // Compression ratio
  };
}
```

### LearningInsight

```typescript
interface LearningInsight {
  type: 'pattern' | 'improvement' | 'behavior' | 'relationship';
  title: string;                   // Short title
  description: string;             // Detailed description
  value?: number;                  // Optional numeric value
  timestamp: Date;                 // When insight was generated
}
```

---

## Endpoint Details

### GET /collections

Returns all collections.

**Response**: `Collection[]`

```json
[
  {
    "name": "engineering-docs",
    "dimension": 768,
    "metric": "cosine",
    "vectorCount": 15420,
    "documentCount": 342,
    "createdAt": "2024-01-15T10:30:00Z",
    "lastUpdated": "2024-01-20T14:22:00Z",
    "stats": {
      "avgSearchTime": 45,
      "queriesPerDay": 1250,
      "gnnImprovement": 23.5
    }
  }
]
```

---

### POST /collections

Create a new collection.

**Request Body**:
```json
{
  "name": "my-collection",
  "dimension": 768,
  "metric": "cosine"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | Yes | - | Unique collection name |
| dimension | number | No | 768 | Vector dimension |
| metric | string | No | "cosine" | Distance metric |

**Response**: `Collection`

---

### GET /collections/:name

Get a specific collection by name.

**Response**: `Collection`

**Errors**:
- `404`: Collection not found

---

### DELETE /collections/:name

Delete a collection.

**Response**: `204 No Content`

**Errors**:
- `404`: Collection not found

---

### GET /collections/:name/stats

Get collection statistics.

**Response**:
```json
{
  "avgSearchTime": 45,
  "queriesPerDay": 1250,
  "gnnImprovement": 23.5
}
```

---

### POST /collections/:name/search

Perform a semantic search within a collection.

**Request Body**:
```json
{
  "query": "How do I configure authentication?",
  "limit": 10,
  "attention_mechanism": "Auto",
  "use_gnn": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| query | string | Yes | - | Search query text |
| limit | number | No | 10 | Max results to return |
| attention_mechanism | string | No | "Auto" | Attention type to use |
| use_gnn | boolean | No | true | Enable GNN enhancement |

**Attention Mechanisms**: `"FlashAttention"`, `"HyperbolicAttention"`, `"GraphAttention"`, `"CrossAttention"`, `"Auto"`

**Response**: `SearchResponse`

```json
{
  "results": [
    {
      "id": "doc-123",
      "score": 0.92,
      "metadata": {
        "title": "Authentication Guide",
        "content": "To configure authentication, first...",
        "author": "John Doe",
        "department": "Security",
        "tags": ["auth", "security", "config"]
      },
      "explanation": {
        "attentionMechanism": "FlashAttention",
        "gnnBoost": 15,
        "searchTime": "42ms"
      }
    }
  ],
  "stats": {
    "totalFound": 24,
    "searchTime": 42,
    "algorithm": "HNSW + GNN"
  }
}
```

**Note**: Use collection name `"all"` to search across all collections.

---

### POST /documents/upload

Upload a document for processing.

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Document file (PDF, DOCX, TXT, MD, JSON) |
| collection | string | Yes | Target collection name |

**Response**: `UploadJob`

```json
{
  "jobId": "job-abc123",
  "status": "queued",
  "stage": "parsing",
  "progress": 0,
  "vectorsAdded": 0
}
```

---

### GET /documents/upload/:jobId/status

Poll upload job status.

**Response**: `UploadJob`

```json
{
  "jobId": "job-abc123",
  "status": "processing",
  "stage": "embedding",
  "progress": 65,
  "vectorsAdded": 127
}
```

**Stages** (in order):
1. `parsing` - Extracting text from document
2. `chunking` - Splitting into chunks
3. `embedding` - Generating vector embeddings
4. `inserting` - Adding to vector store
5. `learning` - GNN learning phase

---

### POST /chat

Send a chat message for RAG-based response.

**Request Body**:
```json
{
  "message": "What are the best practices for API design?",
  "collection": "engineering-docs",
  "conversationId": "conv-xyz789"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | User message |
| collection | string | No | Collection to search (null = all) |
| conversationId | string | No | Existing conversation ID |

**Response**:
```json
{
  "message": {
    "id": "msg-456",
    "role": "assistant",
    "content": "Based on our documentation, here are the best practices...",
    "sources": [
      {
        "id": "doc-789",
        "title": "API Design Guidelines",
        "score": 0.89,
        "snippet": "When designing APIs, consider...",
        "gnnBoost": 12
      }
    ],
    "confidence": 0.87,
    "searchTime": 45,
    "generationTime": 1250,
    "timestamp": "2024-01-20T14:30:00Z"
  },
  "conversationId": "conv-xyz789"
}
```

---

### GET /chat/history

Get chat history.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | No | Conversation ID (omit for all) |

**Response**: `ChatMessage[]`

---

### GET /metrics

Get system-wide metrics.

**Response**: `Metrics`

---

### GET /insights

Get learning insights.

**Response**: `LearningInsight[]`

```json
[
  {
    "type": "pattern",
    "title": "Query Clustering Detected",
    "description": "Users frequently search for authentication and security topics together",
    "value": 0.85,
    "timestamp": "2024-01-20T14:00:00Z"
  }
]
```

---

## Error Handling

All endpoints should return errors in this format:

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {}
}
```

**HTTP Status Codes**:
- `200`: Success
- `201`: Created
- `204`: No Content (successful delete)
- `400`: Bad Request (invalid input)
- `404`: Not Found
- `500`: Internal Server Error

---

## Terminal CLI Commands

The frontend includes a terminal interface. These are the commands it supports:

| Command | Description | API Call |
|---------|-------------|----------|
| `help` | Show available commands | None |
| `search <query>` | Semantic search | POST /collections/all/search |
| `search <query> --collection <name>` | Search specific collection | POST /collections/:name/search |
| `collections` | List all collections | GET /collections |
| `ask <question>` | Chat/Q&A | POST /chat |
| `metrics` | Show system metrics | GET /metrics |
| `insights` | Show learning insights | GET /insights |
| `status` | Show system status | GET /metrics |
| `version` | Show version | None |
| `clear` | Clear terminal | None |

---

## Environment Variables

The frontend uses these environment variables:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Polling Behavior

The frontend polls these endpoints:

| Endpoint | Interval | Condition |
|----------|----------|-----------|
| `/documents/upload/:jobId/status` | 1 second | While status is `queued` or `processing` |
| `/metrics` | 30 seconds | While on dashboard |
| `/insights` | 30 seconds | While on dashboard |

---

## File Upload Support

Supported file types for document upload:
- Markdown (`.md`)
- Text files (`.txt`)
- JSON (`.json`)
- JSON Lines (`.jsonl`)

> **Note**: PDF and Word document support is planned for a future release. Currently, please convert these documents to supported formats before uploading.

Maximum file size should be configured on the backend (recommended: 50MB).

---

## Example Backend Implementation (Express.js)

```javascript
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Collections
app.get('/api/collections', (req, res) => {
  res.json([/* collections array */]);
});

app.post('/api/collections', (req, res) => {
  const { name, dimension = 768, metric = 'cosine' } = req.body;
  // Create collection logic
  res.status(201).json({ name, dimension, metric, /* ... */ });
});

// Search
app.post('/api/collections/:name/search', (req, res) => {
  const { name } = req.params;
  const { query, limit = 10, attention_mechanism = 'Auto', use_gnn = true } = req.body;
  // Search logic
  res.json({ results: [], stats: { totalFound: 0, searchTime: 0, algorithm: 'HNSW' } });
});

// Upload
app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  const { collection } = req.body;
  const jobId = generateJobId();
  // Start async processing
  res.json({ jobId, status: 'queued', stage: 'parsing', progress: 0, vectorsAdded: 0 });
});

app.get('/api/documents/upload/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  // Get job status
  res.json({ jobId, status: 'processing', stage: 'embedding', progress: 50, vectorsAdded: 100 });
});

// Chat
app.post('/api/chat', (req, res) => {
  const { message, collection, conversationId } = req.body;
  // RAG logic
  res.json({ message: { /* ChatMessage */ }, conversationId: conversationId || generateId() });
});

// Metrics
app.get('/api/metrics', (req, res) => {
  res.json({ performance: {}, learning: {}, usage: {}, collections: [], storage: {} });
});

app.get('/api/insights', (req, res) => {
  res.json([/* insights array */]);
});

app.listen(3000, () => console.log('Cortexis API running on port 3000'));
```

---

## Questions?

This frontend expects the API to follow REST conventions and return JSON responses matching the TypeScript interfaces defined above.
