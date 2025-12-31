# PKA-Relate API Specification v1.0

## Overview

This document defines the complete REST API specification for PKA-Relate, a personal knowledge alignment platform. The API follows RESTful principles, uses JSON for request/response payloads, and implements JWT-based authentication.

**Base URL:** `https://api.pka-relate.com/v1`

**Authentication:** JWT tokens via `Authorization: Bearer <token>` header

**Content-Type:** `application/json` (unless specified otherwise)

---

## Table of Contents

1. [Endpoint Mapping from PKA-STRAT](#endpoint-mapping-from-pka-strat)
2. [Authentication & Authorization](#authentication--authorization)
3. [User Management](#user-management)
4. [Core Values & Mentors](#core-values--mentors)
5. [Focus Areas](#focus-areas)
6. [Sub-Systems & Knowledge Graph](#sub-systems--knowledge-graph)
7. [Content Items](#content-items)
8. [Interactions](#interactions)
9. [AI Chat Assistant](#ai-chat-assistant)
10. [Events](#events)
11. [Analytics](#analytics)
12. [Export](#export)
13. [Error Responses](#error-responses)
14. [Rate Limiting](#rate-limiting)

---

## Endpoint Mapping from PKA-STRAT

### Reusable Endpoints

| PKA-STRAT Endpoint | PKA-Relate Mapping | Status | Notes |
|-------------------|-------------------|---------|-------|
| `/api/documents/upload` | `/content-items/upload` | ✅ Reuse | Modify for personal content upload |
| `/api/chat` | `/conversations/:id/messages` | ✅ Adapt | Add streaming, source citations |
| `/api/collections` | `/content-items/collections` | ✅ Reuse | Collections of personal content |
| `/api/teams` | ❌ Not needed | - | PKA-Relate is single-user |
| `/api/pyramid/*` | ❌ Not needed | - | No organizational hierarchy |
| `/api/alignment/*` | `/analytics/focus-progress` | ⚠️ Adapt | Reframe as personal alignment |
| `/api/drift/alerts` | `/analytics/drift-alerts` | ✅ Reuse | Monitor personal drift |
| `/api/drift/monitor` | `/analytics/real-time-drift` | ✅ Reuse | Real-time personal monitoring |
| `/api/reports/*` | `/analytics/*` | ⚠️ Adapt | Personal reports, not board-level |

### New Endpoints Required

- Authentication (signup, login, refresh)
- User psychological profiles
- Core values & mentors
- Focus areas
- Sub-systems (personal knowledge domains)
- Interactions (engagement tracking)
- Events (calendar integration)
- Analytics (weekly summaries, streak tracking)
- Export (data portability)

---

## Authentication & Authorization

### POST /auth/signup

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "timezone": "America/New_York"
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- `fullName`: 2-100 chars
- `timezone`: Valid IANA timezone string

**Response (201 Created):**
```json
{
  "user": {
    "id": "usr_1a2b3c4d",
    "email": "user@example.com",
    "fullName": "John Doe",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

---

### POST /auth/login

Authenticate user and receive JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "usr_1a2b3c4d",
    "email": "user@example.com",
    "fullName": "John Doe",
    "lastLoginAt": "2025-01-15T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### POST /auth/refresh

Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

---

### POST /auth/logout

Invalidate refresh token and logout user.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (204 No Content)**

---

### GET /auth/me

Get current authenticated user information.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200 OK):**
```json
{
  "id": "usr_1a2b3c4d",
  "email": "user@example.com",
  "fullName": "John Doe",
  "timezone": "America/New_York",
  "createdAt": "2025-01-15T10:30:00Z",
  "lastLoginAt": "2025-01-15T10:30:00Z",
  "settings": {
    "theme": "dark",
    "notifications": true,
    "weeklyReportDay": "monday"
  }
}
```

---

## User Management

### GET /users/me/profile

Get user profile information.

**Response (200 OK):**
```json
{
  "id": "usr_1a2b3c4d",
  "email": "user@example.com",
  "fullName": "John Doe",
  "bio": "Product manager passionate about personal growth",
  "avatarUrl": "https://cdn.pka-relate.com/avatars/usr_1a2b3c4d.jpg",
  "timezone": "America/New_York",
  "joinedAt": "2025-01-15T10:30:00Z",
  "stats": {
    "totalInteractions": 1247,
    "currentStreak": 14,
    "longestStreak": 45,
    "totalFocusAreas": 5
  }
}
```

---

### PUT /users/me/profile

Update user profile.

**Request:**
```json
{
  "fullName": "John A. Doe",
  "bio": "Product manager passionate about personal growth and continuous learning",
  "timezone": "America/Los_Angeles"
}
```

**Validation Rules:**
- `fullName`: 2-100 chars (optional)
- `bio`: Max 500 chars (optional)
- `timezone`: Valid IANA timezone (optional)

**Response (200 OK):**
```json
{
  "id": "usr_1a2b3c4d",
  "email": "user@example.com",
  "fullName": "John A. Doe",
  "bio": "Product manager passionate about personal growth and continuous learning",
  "timezone": "America/Los_Angeles",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

---

### GET /users/me/psychological-profile

Get user's psychological profile (Big Five, MBTI, etc.).

**Response (200 OK):**
```json
{
  "userId": "usr_1a2b3c4d",
  "bigFive": {
    "openness": 0.82,
    "conscientiousness": 0.75,
    "extraversion": 0.45,
    "agreeableness": 0.68,
    "neuroticism": 0.32
  },
  "mbti": {
    "type": "INTJ",
    "confidence": 0.78
  },
  "enneagram": {
    "type": "5w4",
    "wing": "4",
    "confidence": 0.65
  },
  "learningStyle": {
    "visual": 0.72,
    "auditory": 0.45,
    "kinesthetic": 0.58,
    "reading": 0.88
  },
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

---

### PUT /users/me/psychological-profile

Update psychological profile.

**Request:**
```json
{
  "bigFive": {
    "openness": 0.82,
    "conscientiousness": 0.75,
    "extraversion": 0.45,
    "agreeableness": 0.68,
    "neuroticism": 0.32
  },
  "mbti": {
    "type": "INTJ",
    "confidence": 0.78
  }
}
```

**Validation Rules:**
- All Big Five scores: 0.0-1.0 (optional)
- `mbti.type`: Valid MBTI type (optional)
- `mbti.confidence`: 0.0-1.0 (optional)

**Response (200 OK):** Same as GET response

---

### GET /users/me/settings

Get user settings.

**Response (200 OK):**
```json
{
  "theme": "dark",
  "notifications": {
    "email": true,
    "push": false,
    "weeklyReport": true,
    "driftAlerts": true
  },
  "weeklyReportDay": "monday",
  "weeklyReportTime": "09:00",
  "timezone": "America/New_York",
  "language": "en-US",
  "privacyMode": false
}
```

---

### PUT /users/me/settings

Update user settings.

**Request:**
```json
{
  "theme": "light",
  "notifications": {
    "weeklyReport": false
  },
  "weeklyReportDay": "friday"
}
```

**Validation Rules:**
- `theme`: "light" | "dark" | "system"
- `weeklyReportDay`: "monday" | "tuesday" | ... | "sunday"
- `weeklyReportTime`: HH:MM format (24-hour)

**Response (200 OK):** Same as GET response

---

## Core Values & Mentors

### GET /users/me/values

Get all user-defined core values.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `sort`: "createdAt" | "priority" | "name" (default: "priority")

**Response (200 OK):**
```json
{
  "values": [
    {
      "id": "val_1a2b3c4d",
      "name": "Continuous Learning",
      "description": "Always seek to grow and acquire new knowledge",
      "priority": 1,
      "color": "#4CAF50",
      "icon": "📚",
      "linkedFocusAreas": ["fa_abc123", "fa_def456"],
      "linkedMentors": ["mnt_xyz789"],
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /users/me/values

Create a new core value.

**Request:**
```json
{
  "name": "Continuous Learning",
  "description": "Always seek to grow and acquire new knowledge",
  "priority": 1,
  "color": "#4CAF50",
  "icon": "📚"
}
```

**Validation Rules:**
- `name`: 1-100 chars, required
- `description`: Max 500 chars, optional
- `priority`: 1-10, required
- `color`: Valid hex color, optional
- `icon`: Single emoji, optional

**Response (201 Created):**
```json
{
  "id": "val_1a2b3c4d",
  "name": "Continuous Learning",
  "description": "Always seek to grow and acquire new knowledge",
  "priority": 1,
  "color": "#4CAF50",
  "icon": "📚",
  "linkedFocusAreas": [],
  "linkedMentors": [],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

---

### GET /users/me/values/:valueId

Get a specific core value.

**Response (200 OK):** Same as single value object above

---

### PUT /users/me/values/:valueId

Update a core value.

**Request:** Same as POST, all fields optional

**Response (200 OK):** Updated value object

---

### DELETE /users/me/values/:valueId

Delete a core value.

**Response (204 No Content)**

---

### GET /users/me/mentors

Get all mentors (real or virtual).

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `type`: "real" | "virtual" | "all" (default: "all")

**Response (200 OK):**
```json
{
  "mentors": [
    {
      "id": "mnt_xyz789",
      "name": "Richard Feynman",
      "type": "virtual",
      "bio": "Theoretical physicist known for contributions to quantum mechanics",
      "avatarUrl": "https://cdn.pka-relate.com/mentors/feynman.jpg",
      "expertise": ["Physics", "Teaching", "Problem Solving"],
      "linkedValues": ["val_1a2b3c4d"],
      "quotes": [
        "What I cannot create, I do not understand"
      ],
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /users/me/mentors

Create a new mentor.

**Request:**
```json
{
  "name": "Richard Feynman",
  "type": "virtual",
  "bio": "Theoretical physicist known for contributions to quantum mechanics",
  "expertise": ["Physics", "Teaching", "Problem Solving"],
  "linkedValues": ["val_1a2b3c4d"],
  "quotes": ["What I cannot create, I do not understand"]
}
```

**Validation Rules:**
- `name`: 1-100 chars, required
- `type`: "real" | "virtual", required
- `bio`: Max 1000 chars, optional
- `expertise`: Array of strings, max 10 items, optional
- `linkedValues`: Array of value IDs, optional
- `quotes`: Array of strings, max 20 items, optional

**Response (201 Created):** Mentor object

---

### PUT /users/me/mentors/:mentorId

Update a mentor.

**Response (200 OK):** Updated mentor object

---

### DELETE /users/me/mentors/:mentorId

Delete a mentor.

**Response (204 No Content)**

---

## Focus Areas

### GET /users/me/focus-areas

Get all focus areas.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `status`: "active" | "paused" | "completed" | "all" (default: "active")

**Response (200 OK):**
```json
{
  "focusAreas": [
    {
      "id": "fa_abc123",
      "name": "Machine Learning Fundamentals",
      "description": "Build foundational understanding of ML algorithms and applications",
      "status": "active",
      "priority": 1,
      "color": "#2196F3",
      "icon": "🤖",
      "targetDate": "2025-06-30T23:59:59Z",
      "progress": 0.42,
      "linkedValues": ["val_1a2b3c4d"],
      "linkedSystems": ["sys_ml101"],
      "stats": {
        "totalInteractions": 87,
        "hoursSpent": 42.5,
        "itemsCompleted": 15,
        "itemsTotal": 36
      },
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-20T15:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /users/me/focus-areas

Create a new focus area.

**Request:**
```json
{
  "name": "Machine Learning Fundamentals",
  "description": "Build foundational understanding of ML algorithms and applications",
  "status": "active",
  "priority": 1,
  "color": "#2196F3",
  "icon": "🤖",
  "targetDate": "2025-06-30T23:59:59Z",
  "linkedValues": ["val_1a2b3c4d"]
}
```

**Validation Rules:**
- `name`: 1-200 chars, required
- `description`: Max 1000 chars, optional
- `status`: "active" | "paused" | "completed", default: "active"
- `priority`: 1-10, required
- `targetDate`: ISO 8601 date, must be future, optional

**Response (201 Created):** Focus area object

---

### GET /users/me/focus-areas/:focusAreaId

Get a specific focus area.

**Response (200 OK):** Focus area object

---

### PUT /users/me/focus-areas/:focusAreaId

Update a focus area.

**Response (200 OK):** Updated focus area object

---

### DELETE /users/me/focus-areas/:focusAreaId

Delete a focus area.

**Response (204 No Content)**

---

## Sub-Systems & Knowledge Graph

### GET /systems

Get all sub-systems (knowledge domains).

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50, max: 200)
- `parentId`: string (filter by parent system)
- `search`: string (search system names/descriptions)

**Response (200 OK):**
```json
{
  "systems": [
    {
      "id": "sys_ml101",
      "name": "Machine Learning",
      "description": "Algorithms that learn from data",
      "parentId": null,
      "level": 1,
      "color": "#9C27B0",
      "icon": "🧠",
      "linkedFocusAreas": ["fa_abc123"],
      "linkedContentItems": 23,
      "childCount": 5,
      "metadata": {
        "source": "personal",
        "tags": ["AI", "Data Science"]
      },
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /systems

Create a new sub-system.

**Request:**
```json
{
  "name": "Machine Learning",
  "description": "Algorithms that learn from data",
  "parentId": null,
  "color": "#9C27B0",
  "icon": "🧠",
  "metadata": {
    "tags": ["AI", "Data Science"]
  }
}
```

**Validation Rules:**
- `name`: 1-200 chars, required
- `description`: Max 1000 chars, optional
- `parentId`: Valid system ID or null, optional
- `metadata.tags`: Array of strings, max 10 items, optional

**Response (201 Created):** System object

---

### GET /systems/:systemId

Get a specific sub-system with full details.

**Response (200 OK):** System object with additional details

---

### PUT /systems/:systemId

Update a sub-system.

**Response (200 OK):** Updated system object

---

### DELETE /systems/:systemId

Delete a sub-system.

**Query Parameters:**
- `cascade`: boolean (delete children, default: false)

**Response (204 No Content)**

---

### GET /systems/graph

Get knowledge graph data for visualization.

**Query Parameters:**
- `focusAreaId`: string (filter by focus area, optional)
- `maxDepth`: number (max graph depth, default: 3, max: 5)
- `includeContentItems`: boolean (include content items, default: false)

**Response (200 OK):**
```json
{
  "nodes": [
    {
      "id": "sys_ml101",
      "type": "system",
      "label": "Machine Learning",
      "color": "#9C27B0",
      "size": 15,
      "metadata": {
        "contentItemCount": 23,
        "interactionCount": 87
      }
    },
    {
      "id": "sys_supervised",
      "type": "system",
      "label": "Supervised Learning",
      "color": "#9C27B0",
      "size": 10,
      "metadata": {
        "contentItemCount": 12,
        "interactionCount": 45
      }
    },
    {
      "id": "cnt_article_001",
      "type": "content",
      "label": "Introduction to Neural Networks",
      "color": "#4CAF50",
      "size": 5
    }
  ],
  "edges": [
    {
      "source": "sys_ml101",
      "target": "sys_supervised",
      "type": "parent-child",
      "weight": 1.0
    },
    {
      "source": "sys_supervised",
      "target": "cnt_article_001",
      "type": "contains",
      "weight": 0.8
    }
  ],
  "metadata": {
    "totalNodes": 2,
    "totalEdges": 1,
    "maxDepth": 2
  }
}
```

---

### POST /systems/:systemId/link/:targetId

Create a relationship between two systems.

**Request:**
```json
{
  "relationType": "relates-to",
  "weight": 0.75,
  "metadata": {
    "reason": "Both involve pattern recognition"
  }
}
```

**Validation Rules:**
- `relationType`: "parent-child" | "relates-to" | "prerequisite" | "similar-to"
- `weight`: 0.0-1.0, optional

**Response (201 Created):**
```json
{
  "source": "sys_ml101",
  "target": "sys_nlp202",
  "relationType": "relates-to",
  "weight": 0.75,
  "metadata": {
    "reason": "Both involve pattern recognition"
  },
  "createdAt": "2025-01-15T10:30:00Z"
}
```

---

### DELETE /systems/:systemId/link/:targetId

Remove a relationship between systems.

**Response (204 No Content)**

---

## Content Items

### GET /content-items

Get all content items.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `type`: "article" | "video" | "book" | "podcast" | "note" | "all" (default: "all")
- `systemId`: string (filter by system)
- `focusAreaId`: string (filter by focus area)
- `status`: "unread" | "reading" | "completed" | "all" (default: "all")
- `search`: string (search title/description)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "cnt_article_001",
      "type": "article",
      "title": "Introduction to Neural Networks",
      "description": "Comprehensive guide to neural network fundamentals",
      "url": "https://example.com/neural-networks-intro",
      "thumbnailUrl": "https://cdn.pka-relate.com/thumbs/cnt_article_001.jpg",
      "author": "Andrew Ng",
      "publishedAt": "2024-12-01T00:00:00Z",
      "addedAt": "2025-01-15T10:30:00Z",
      "status": "reading",
      "progress": 0.65,
      "linkedSystems": ["sys_ml101", "sys_supervised"],
      "linkedFocusAreas": ["fa_abc123"],
      "tags": ["deep-learning", "neural-networks", "AI"],
      "metadata": {
        "estimatedTimeMinutes": 45,
        "difficulty": "intermediate",
        "source": "Medium"
      },
      "interactions": {
        "totalTime": 28,
        "lastAccessedAt": "2025-01-20T14:30:00Z",
        "highlightCount": 5,
        "noteCount": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /content-items

Create a new content item.

**Request:**
```json
{
  "type": "article",
  "title": "Introduction to Neural Networks",
  "description": "Comprehensive guide to neural network fundamentals",
  "url": "https://example.com/neural-networks-intro",
  "author": "Andrew Ng",
  "publishedAt": "2024-12-01T00:00:00Z",
  "linkedSystems": ["sys_ml101"],
  "linkedFocusAreas": ["fa_abc123"],
  "tags": ["deep-learning", "neural-networks"],
  "metadata": {
    "estimatedTimeMinutes": 45,
    "difficulty": "intermediate"
  }
}
```

**Validation Rules:**
- `type`: "article" | "video" | "book" | "podcast" | "note", required
- `title`: 1-300 chars, required
- `description`: Max 2000 chars, optional
- `url`: Valid URL, optional (required for article/video/podcast)
- `tags`: Array of strings, max 20 items, optional
- `metadata.estimatedTimeMinutes`: Positive integer, optional
- `metadata.difficulty`: "beginner" | "intermediate" | "advanced", optional

**Response (201 Created):** Content item object

---

### GET /content-items/:itemId

Get a specific content item.

**Response (200 OK):** Content item object with full details

---

### PUT /content-items/:itemId

Update a content item.

**Response (200 OK):** Updated content item object

---

### DELETE /content-items/:itemId

Delete a content item.

**Response (204 No Content)**

---

### POST /content-items/upload

Upload content file (PDF, EPUB, etc.).

**Request:**
- Content-Type: `multipart/form-data`
- Body: File upload + metadata JSON

**Form Fields:**
```
file: [binary content]
metadata: {
  "type": "book",
  "title": "Deep Learning Book",
  "linkedSystems": ["sys_ml101"],
  "linkedFocusAreas": ["fa_abc123"]
}
```

**Validation Rules:**
- File size: Max 50MB
- Supported formats: PDF, EPUB, TXT, MD, DOCX
- `metadata`: Same as POST /content-items

**Response (201 Created):**
```json
{
  "id": "cnt_book_002",
  "type": "book",
  "title": "Deep Learning Book",
  "fileUrl": "https://cdn.pka-relate.com/content/usr_1a2b3c4d/cnt_book_002.pdf",
  "fileSize": 15728640,
  "mimeType": "application/pdf",
  "uploadedAt": "2025-01-15T10:30:00Z",
  "processingStatus": "queued",
  "linkedSystems": ["sys_ml101"],
  "linkedFocusAreas": ["fa_abc123"]
}
```

---

### GET /content-items/search

Semantic search across content items.

**Query Parameters:**
- `query`: string (required, min 3 chars)
- `limit`: number (default: 20, max: 100)
- `type`: "article" | "video" | "book" | "podcast" | "note" | "all" (default: "all")
- `systemId`: string (filter by system, optional)

**Response (200 OK):**
```json
{
  "results": [
    {
      "item": {
        "id": "cnt_article_001",
        "type": "article",
        "title": "Introduction to Neural Networks",
        "description": "Comprehensive guide to neural network fundamentals",
        "url": "https://example.com/neural-networks-intro"
      },
      "score": 0.92,
      "highlights": [
        "...fundamentals of <mark>neural networks</mark> including...",
        "...backpropagation and <mark>gradient descent</mark>..."
      ]
    }
  ],
  "metadata": {
    "query": "neural networks basics",
    "total": 1,
    "maxScore": 0.92,
    "searchTimeMs": 45
  }
}
```

---

## Interactions

### GET /interactions

Get user interaction history.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50, max: 200)
- `type`: "view" | "highlight" | "note" | "complete" | "bookmark" | "all" (default: "all")
- `contentItemId`: string (filter by content item)
- `focusAreaId`: string (filter by focus area)
- `startDate`: ISO 8601 date (filter by date range)
- `endDate`: ISO 8601 date (filter by date range)

**Response (200 OK):**
```json
{
  "interactions": [
    {
      "id": "int_xyz123",
      "type": "highlight",
      "contentItemId": "cnt_article_001",
      "focusAreaId": "fa_abc123",
      "timestamp": "2025-01-20T14:30:00Z",
      "duration": 120,
      "metadata": {
        "highlightText": "Neural networks are composed of layers of interconnected nodes",
        "highlightColor": "#FFEB3B",
        "pageNumber": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /interactions

Log a new interaction.

**Request:**
```json
{
  "type": "highlight",
  "contentItemId": "cnt_article_001",
  "focusAreaId": "fa_abc123",
  "duration": 120,
  "metadata": {
    "highlightText": "Neural networks are composed of layers of interconnected nodes",
    "highlightColor": "#FFEB3B",
    "pageNumber": 3
  }
}
```

**Validation Rules:**
- `type`: "view" | "highlight" | "note" | "complete" | "bookmark", required
- `contentItemId`: Valid content item ID, required
- `focusAreaId`: Valid focus area ID, optional
- `duration`: Positive integer (seconds), optional
- `metadata`: Object with type-specific fields, optional

**Response (201 Created):** Interaction object

---

### GET /interactions/:interactionId

Get a specific interaction.

**Response (200 OK):** Interaction object

---

### PUT /interactions/:interactionId

Update an interaction (e.g., edit note).

**Response (200 OK):** Updated interaction object

---

### DELETE /interactions/:interactionId

Delete an interaction.

**Response (204 No Content)**

---

### GET /interactions/stats

Get aggregated interaction statistics.

**Query Parameters:**
- `period`: "day" | "week" | "month" | "year" | "all" (default: "week")
- `focusAreaId`: string (filter by focus area, optional)

**Response (200 OK):**
```json
{
  "period": "week",
  "startDate": "2025-01-13T00:00:00Z",
  "endDate": "2025-01-20T00:00:00Z",
  "stats": {
    "totalInteractions": 87,
    "totalDuration": 3420,
    "uniqueContentItems": 12,
    "breakdown": {
      "view": 45,
      "highlight": 23,
      "note": 12,
      "complete": 5,
      "bookmark": 2
    },
    "dailyActivity": [
      {
        "date": "2025-01-13",
        "count": 8,
        "duration": 480
      },
      {
        "date": "2025-01-14",
        "count": 12,
        "duration": 540
      }
    ],
    "topFocusAreas": [
      {
        "id": "fa_abc123",
        "name": "Machine Learning Fundamentals",
        "count": 45
      }
    ]
  }
}
```

---

## AI Chat Assistant

### GET /conversations

Get all conversations.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `search`: string (search conversation titles)

**Response (200 OK):**
```json
{
  "conversations": [
    {
      "id": "conv_abc123",
      "title": "Understanding Backpropagation",
      "messageCount": 8,
      "createdAt": "2025-01-20T14:00:00Z",
      "updatedAt": "2025-01-20T14:35:00Z",
      "lastMessage": {
        "role": "assistant",
        "content": "Backpropagation is the algorithm used to calculate gradients...",
        "timestamp": "2025-01-20T14:35:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /conversations

Create a new conversation.

**Request:**
```json
{
  "title": "Understanding Backpropagation",
  "contextFocusAreas": ["fa_abc123"],
  "contextSystems": ["sys_ml101"]
}
```

**Validation Rules:**
- `title`: 1-200 chars, optional (auto-generated from first message if not provided)
- `contextFocusAreas`: Array of focus area IDs, optional
- `contextSystems`: Array of system IDs, optional

**Response (201 Created):**
```json
{
  "id": "conv_abc123",
  "title": "Understanding Backpropagation",
  "messageCount": 0,
  "contextFocusAreas": ["fa_abc123"],
  "contextSystems": ["sys_ml101"],
  "createdAt": "2025-01-20T14:00:00Z",
  "updatedAt": "2025-01-20T14:00:00Z"
}
```

---

### GET /conversations/:conversationId

Get a specific conversation with metadata.

**Response (200 OK):** Conversation object

---

### PUT /conversations/:conversationId

Update conversation (title, context).

**Response (200 OK):** Updated conversation object

---

### DELETE /conversations/:conversationId

Delete a conversation and all messages.

**Response (204 No Content)**

---

### GET /conversations/:conversationId/messages

Get all messages in a conversation.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50, max: 200)

**Response (200 OK):**
```json
{
  "messages": [
    {
      "id": "msg_xyz789",
      "conversationId": "conv_abc123",
      "role": "user",
      "content": "Can you explain backpropagation in simple terms?",
      "timestamp": "2025-01-20T14:30:00Z",
      "metadata": {}
    },
    {
      "id": "msg_xyz790",
      "conversationId": "conv_abc123",
      "role": "assistant",
      "content": "Backpropagation is the algorithm used to calculate gradients in neural networks...",
      "timestamp": "2025-01-20T14:30:15Z",
      "metadata": {
        "sources": [
          {
            "contentItemId": "cnt_article_001",
            "title": "Introduction to Neural Networks",
            "excerpt": "Backpropagation is the algorithm...",
            "relevance": 0.92
          }
        ],
        "tokensUsed": 245,
        "model": "claude-3-opus-20240229"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### POST /conversations/:conversationId/messages

Send a message and get AI response.

**Request:**
```json
{
  "content": "Can you explain backpropagation in simple terms?",
  "stream": false,
  "includeContext": true,
  "maxSources": 5
}
```

**Validation Rules:**
- `content`: 1-10000 chars, required
- `stream`: boolean, default: false
- `includeContext`: boolean, default: true (include user's knowledge graph context)
- `maxSources`: 1-10, default: 5

**Response (200 OK) - Non-streaming:**
```json
{
  "userMessage": {
    "id": "msg_xyz789",
    "conversationId": "conv_abc123",
    "role": "user",
    "content": "Can you explain backpropagation in simple terms?",
    "timestamp": "2025-01-20T14:30:00Z"
  },
  "assistantMessage": {
    "id": "msg_xyz790",
    "conversationId": "conv_abc123",
    "role": "assistant",
    "content": "Backpropagation is the algorithm used to calculate gradients in neural networks. Think of it as working backwards through the network to figure out how much each connection (weight) contributed to the error...",
    "timestamp": "2025-01-20T14:30:15Z",
    "metadata": {
      "sources": [
        {
          "contentItemId": "cnt_article_001",
          "title": "Introduction to Neural Networks",
          "url": "https://example.com/neural-networks-intro",
          "author": "Andrew Ng",
          "excerpt": "Backpropagation is the algorithm used to calculate gradients...",
          "relevance": 0.92,
          "linkedSystems": ["sys_ml101"]
        },
        {
          "contentItemId": "cnt_book_002",
          "title": "Deep Learning Book",
          "excerpt": "The chain rule of calculus is fundamental to backpropagation...",
          "relevance": 0.88,
          "pageNumber": 204
        }
      ],
      "tokensUsed": 245,
      "model": "claude-3-opus-20240229",
      "responseTimeMs": 1523
    }
  }
}
```

---

### POST /conversations/:conversationId/messages (Streaming)

**Request with `stream: true`:**
```json
{
  "content": "Can you explain backpropagation in simple terms?",
  "stream": true
}
```

**Response (200 OK) - Server-Sent Events (SSE):**
```
Content-Type: text/event-stream

event: message_start
data: {"messageId": "msg_xyz790", "conversationId": "conv_abc123"}

event: content_delta
data: {"delta": "Backpropagation"}

event: content_delta
data: {"delta": " is the algorithm"}

event: content_delta
data: {"delta": " used to calculate"}

event: sources
data: {"sources": [{"contentItemId": "cnt_article_001", "title": "Introduction to Neural Networks", "relevance": 0.92}]}

event: message_complete
data: {"messageId": "msg_xyz790", "tokensUsed": 245, "responseTimeMs": 1523}
```

**Event Types:**
- `message_start`: Initial message metadata
- `content_delta`: Incremental content chunks
- `sources`: Source citations (sent after content)
- `message_complete`: Final metadata and statistics
- `error`: Error information

---

### POST /conversations/:conversationId/feedback

Submit feedback on an assistant response.

**Request:**
```json
{
  "messageId": "msg_xyz790",
  "rating": "positive",
  "feedback": "Very clear explanation with good examples",
  "issueTypes": []
}
```

**Validation Rules:**
- `messageId`: Valid message ID, required
- `rating`: "positive" | "negative", required
- `feedback`: Max 1000 chars, optional
- `issueTypes`: Array of "inaccurate" | "irrelevant" | "incomplete" | "unclear", optional

**Response (201 Created):**
```json
{
  "id": "fb_abc123",
  "messageId": "msg_xyz790",
  "rating": "positive",
  "feedback": "Very clear explanation with good examples",
  "timestamp": "2025-01-20T14:35:00Z"
}
```

---

## Events

### GET /events

Get all events (calendar items, deadlines).

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50, max: 200)
- `startDate`: ISO 8601 date (filter by date range)
- `endDate`: ISO 8601 date (filter by date range)
- `type`: "deadline" | "milestone" | "reminder" | "meeting" | "all" (default: "all")
- `focusAreaId`: string (filter by focus area)

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "type": "deadline",
      "title": "Complete ML Course Module 3",
      "description": "Finish supervised learning section",
      "startDate": "2025-01-25T09:00:00Z",
      "endDate": "2025-01-25T17:00:00Z",
      "allDay": false,
      "linkedFocusAreas": ["fa_abc123"],
      "linkedContentItems": ["cnt_article_001"],
      "reminder": {
        "enabled": true,
        "minutesBefore": 1440
      },
      "status": "upcoming",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /events

Create a new event.

**Request:**
```json
{
  "type": "deadline",
  "title": "Complete ML Course Module 3",
  "description": "Finish supervised learning section",
  "startDate": "2025-01-25T09:00:00Z",
  "endDate": "2025-01-25T17:00:00Z",
  "allDay": false,
  "linkedFocusAreas": ["fa_abc123"],
  "reminder": {
    "enabled": true,
    "minutesBefore": 1440
  }
}
```

**Validation Rules:**
- `type`: "deadline" | "milestone" | "reminder" | "meeting", required
- `title`: 1-200 chars, required
- `description`: Max 2000 chars, optional
- `startDate`: ISO 8601 date, required
- `endDate`: ISO 8601 date, must be >= startDate, optional
- `allDay`: boolean, default: false
- `reminder.minutesBefore`: Positive integer, optional

**Response (201 Created):** Event object

---

### GET /events/:eventId

Get a specific event.

**Response (200 OK):** Event object

---

### PUT /events/:eventId

Update an event.

**Response (200 OK):** Updated event object

---

### DELETE /events/:eventId

Delete an event.

**Response (204 No Content)**

---

### GET /events/upcoming

Get upcoming events (next 7 days).

**Query Parameters:**
- `days`: number (default: 7, max: 90)
- `focusAreaId`: string (filter by focus area, optional)

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "type": "deadline",
      "title": "Complete ML Course Module 3",
      "startDate": "2025-01-25T09:00:00Z",
      "linkedFocusAreas": ["fa_abc123"],
      "daysUntil": 5
    }
  ],
  "summary": {
    "total": 1,
    "byType": {
      "deadline": 1,
      "milestone": 0,
      "reminder": 0,
      "meeting": 0
    }
  }
}
```

---

## Analytics

### GET /analytics/weekly-summary

Get weekly activity summary.

**Query Parameters:**
- `weekOffset`: number (0 = current week, -1 = last week, default: 0)

**Response (200 OK):**
```json
{
  "week": {
    "startDate": "2025-01-13T00:00:00Z",
    "endDate": "2025-01-20T00:00:00Z",
    "weekNumber": 3
  },
  "summary": {
    "totalInteractions": 87,
    "totalTimeMinutes": 342,
    "uniqueContentItems": 12,
    "completedItems": 5,
    "activeFocusAreas": 3,
    "streakDays": 14
  },
  "focusAreaProgress": [
    {
      "id": "fa_abc123",
      "name": "Machine Learning Fundamentals",
      "interactions": 45,
      "timeMinutes": 210,
      "progressDelta": 0.12,
      "currentProgress": 0.42
    }
  ],
  "topContentItems": [
    {
      "id": "cnt_article_001",
      "title": "Introduction to Neural Networks",
      "interactions": 8,
      "timeMinutes": 45
    }
  ],
  "dailyActivity": [
    {
      "date": "2025-01-13",
      "interactions": 8,
      "timeMinutes": 45
    }
  ],
  "insights": [
    {
      "type": "streak_milestone",
      "message": "You're on a 14-day streak! Keep it up!"
    },
    {
      "type": "focus_progress",
      "message": "You made great progress on Machine Learning Fundamentals this week (12% increase)"
    }
  ]
}
```

---

### GET /analytics/focus-progress

Get progress tracking for focus areas.

**Query Parameters:**
- `focusAreaId`: string (specific focus area, optional)
- `period`: "week" | "month" | "quarter" | "year" (default: "month")

**Response (200 OK):**
```json
{
  "focusAreas": [
    {
      "id": "fa_abc123",
      "name": "Machine Learning Fundamentals",
      "currentProgress": 0.42,
      "targetDate": "2025-06-30T23:59:59Z",
      "onTrack": true,
      "projectedCompletion": "2025-06-15T00:00:00Z",
      "timeline": [
        {
          "date": "2025-01-01",
          "progress": 0.25
        },
        {
          "date": "2025-01-15",
          "progress": 0.35
        },
        {
          "date": "2025-01-20",
          "progress": 0.42
        }
      ],
      "metrics": {
        "totalInteractions": 87,
        "totalTimeMinutes": 342,
        "completedItems": 15,
        "totalItems": 36,
        "averageSessionMinutes": 22
      },
      "alignmentScore": 0.88
    }
  ]
}
```

---

### GET /analytics/interaction-patterns

Get interaction pattern analysis.

**Query Parameters:**
- `period`: "week" | "month" | "quarter" | "year" (default: "month")

**Response (200 OK):**
```json
{
  "period": "month",
  "startDate": "2024-12-20T00:00:00Z",
  "endDate": "2025-01-20T00:00:00Z",
  "patterns": {
    "peakHours": [
      {
        "hour": 14,
        "averageInteractions": 12,
        "dayOfWeek": "weekday"
      },
      {
        "hour": 20,
        "averageInteractions": 8,
        "dayOfWeek": "weekend"
      }
    ],
    "productiveDays": [
      "Monday",
      "Wednesday",
      "Saturday"
    ],
    "averageSessionDuration": 22,
    "preferredContentTypes": [
      {
        "type": "article",
        "percentage": 0.45
      },
      {
        "type": "video",
        "percentage": 0.30
      }
    ],
    "consistencyScore": 0.82
  },
  "recommendations": [
    {
      "type": "timing",
      "message": "You're most productive on Wednesday afternoons. Consider scheduling deep work sessions then."
    },
    {
      "type": "content",
      "message": "You engage most with articles. Consider adding more written content to your focus areas."
    }
  ]
}
```

---

### GET /analytics/streak-data

Get streak and consistency data.

**Response (200 OK):**
```json
{
  "currentStreak": 14,
  "longestStreak": 45,
  "totalActiveDays": 87,
  "calendar": [
    {
      "date": "2025-01-20",
      "active": true,
      "interactions": 8,
      "timeMinutes": 45
    },
    {
      "date": "2025-01-19",
      "active": true,
      "interactions": 12,
      "timeMinutes": 54
    },
    {
      "date": "2025-01-18",
      "active": false,
      "interactions": 0,
      "timeMinutes": 0
    }
  ],
  "streakMilestones": [
    {
      "days": 7,
      "achieved": true,
      "achievedAt": "2025-01-13T00:00:00Z"
    },
    {
      "days": 14,
      "achieved": true,
      "achievedAt": "2025-01-20T00:00:00Z"
    },
    {
      "days": 30,
      "achieved": false
    }
  ]
}
```

---

### GET /analytics/drift-alerts

Get drift alerts (from PKA-STRAT, adapted).

**Query Parameters:**
- `severity`: "low" | "medium" | "high" | "critical" | "all" (default: "all")
- `status`: "active" | "resolved" | "all" (default: "active")

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "id": "alert_abc123",
      "severity": "medium",
      "type": "focus_drift",
      "title": "Declining engagement with Machine Learning Fundamentals",
      "description": "Your interactions with this focus area have decreased by 40% over the last two weeks",
      "focusAreaId": "fa_abc123",
      "detectedAt": "2025-01-20T08:00:00Z",
      "status": "active",
      "metrics": {
        "currentValue": 12,
        "previousValue": 20,
        "changePercent": -0.40
      },
      "recommendations": [
        "Schedule dedicated time blocks for ML study",
        "Break down complex topics into smaller, manageable chunks"
      ]
    }
  ],
  "summary": {
    "total": 1,
    "bySeverity": {
      "low": 0,
      "medium": 1,
      "high": 0,
      "critical": 0
    }
  }
}
```

---

### GET /analytics/real-time-drift

Get real-time drift monitoring (from PKA-STRAT).

**Query Parameters:**
- `focusAreaId`: string (filter by focus area, optional)

**Response (200 OK):**
```json
{
  "timestamp": "2025-01-20T15:30:00Z",
  "focusAreas": [
    {
      "id": "fa_abc123",
      "name": "Machine Learning Fundamentals",
      "alignmentScore": 0.88,
      "drift": {
        "score": 0.12,
        "trend": "increasing",
        "severity": "low"
      },
      "recentActivity": {
        "last7Days": 12,
        "previous7Days": 20,
        "changePercent": -0.40
      }
    }
  ]
}
```

---

## Export

### POST /export/data

Export user data (GDPR compliance).

**Request:**
```json
{
  "format": "json",
  "includeInteractions": true,
  "includeContentItems": true,
  "includeConversations": false,
  "dateRange": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2025-01-20T23:59:59Z"
  }
}
```

**Validation Rules:**
- `format`: "json" | "csv", required
- `includeInteractions`: boolean, default: true
- `includeContentItems`: boolean, default: true
- `includeConversations`: boolean, default: true
- `dateRange`: Optional date range filter

**Response (202 Accepted):**
```json
{
  "exportId": "exp_abc123",
  "status": "processing",
  "estimatedCompletionTime": "2025-01-20T15:45:00Z",
  "webhookUrl": null
}
```

---

### GET /export/data/:exportId

Check export status and download.

**Response (200 OK) - Processing:**
```json
{
  "exportId": "exp_abc123",
  "status": "processing",
  "progress": 0.45,
  "createdAt": "2025-01-20T15:30:00Z"
}
```

**Response (200 OK) - Complete:**
```json
{
  "exportId": "exp_abc123",
  "status": "completed",
  "downloadUrl": "https://cdn.pka-relate.com/exports/usr_1a2b3c4d/exp_abc123.zip",
  "expiresAt": "2025-01-27T15:30:00Z",
  "fileSize": 15728640,
  "createdAt": "2025-01-20T15:30:00Z",
  "completedAt": "2025-01-20T15:35:00Z"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "requestId": "req_abc123",
    "timestamp": "2025-01-20T15:30:00Z"
  }
}
```

### HTTP Status Codes

| Code | Description | Common Scenarios |
|------|-------------|------------------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST requests |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Validation errors, malformed JSON |
| 401 | Unauthorized | Missing/invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, constraint violation |
| 422 | Unprocessable Entity | Semantic validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side errors |
| 503 | Service Unavailable | Temporary unavailability |

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | Invalid email/password | 401 |
| `TOKEN_EXPIRED` | JWT token expired | 401 |
| `TOKEN_INVALID` | JWT token invalid | 401 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `RESOURCE_NOT_FOUND` | Resource doesn't exist | 404 |
| `DUPLICATE_RESOURCE` | Resource already exists | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily down | 503 |

### Example Error Responses

**Validation Error (400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    },
    "requestId": "req_abc123",
    "timestamp": "2025-01-20T15:30:00Z"
  }
}
```

**Not Found (404):**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Focus area not found",
    "details": {
      "resourceType": "FocusArea",
      "resourceId": "fa_invalid"
    },
    "requestId": "req_abc123",
    "timestamp": "2025-01-20T15:30:00Z"
  }
}
```

**Rate Limit (429):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2025-01-20T16:00:00Z"
    },
    "requestId": "req_abc123",
    "timestamp": "2025-01-20T15:30:00Z"
  }
}
```

---

## Rate Limiting

**Rate Limits:**
- Authenticated requests: 1000 requests/hour per user
- AI chat messages: 50 messages/hour per user
- File uploads: 20 uploads/hour per user
- Export requests: 5 exports/day per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1737385200
```

**Exceeding Rate Limits:**
When rate limit is exceeded, API returns 429 status with retry information:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "resetAt": "2025-01-20T16:00:00Z",
      "retryAfter": 1800
    }
  }
}
```

---

## Pagination

All list endpoints support pagination with these parameters:

**Query Parameters:**
- `page`: number (default: 1, min: 1)
- `limit`: number (default: varies by endpoint, max: varies by endpoint)

**Response Format:**
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Filtering & Sorting

**Common Query Parameters:**
- `sort`: Field to sort by (e.g., "createdAt", "name", "priority")
- `order`: "asc" | "desc" (default: "desc")
- `search`: Full-text search query
- `status`: Filter by status
- `type`: Filter by type

**Example:**
```
GET /content-items?type=article&status=reading&sort=createdAt&order=desc&search=neural+networks
```

---

## Webhooks (Future)

**Webhook Events:**
- `focus_area.progress_updated`
- `drift.alert_created`
- `interaction.completed`
- `export.completed`

**Webhook Payload:**
```json
{
  "event": "drift.alert_created",
  "timestamp": "2025-01-20T15:30:00Z",
  "data": {
    "alertId": "alert_abc123",
    "severity": "medium",
    "focusAreaId": "fa_abc123"
  }
}
```

---

## Versioning

**API Version:** v1

**Version Header:**
```
API-Version: v1
```

**Deprecation Notice:**
When endpoints are deprecated, API returns deprecation header:
```
Deprecation: true
Sunset: Sat, 30 Jun 2025 23:59:59 GMT
Link: <https://docs.pka-relate.com/api/v2>; rel="successor-version"
```

---

## Security

**Authentication:**
- JWT tokens (access + refresh)
- Access token expiry: 1 hour
- Refresh token expiry: 30 days

**HTTPS Only:**
All API requests must use HTTPS. HTTP requests are rejected.

**CORS:**
Allowed origins configured per environment.

**Request Signing (Future):**
HMAC-SHA256 request signing for sensitive operations.

---

## Development vs Production

**Development Base URL:** `https://api-dev.pka-relate.com/v1`

**Production Base URL:** `https://api.pka-relate.com/v1`

**Sandbox Mode:**
Development environment supports test data and doesn't affect production.

---

## OpenAPI Specification

Full OpenAPI 3.0 specification available at:
- JSON: `https://api.pka-relate.com/v1/openapi.json`
- YAML: `https://api.pka-relate.com/v1/openapi.yaml`
- Swagger UI: `https://api.pka-relate.com/v1/docs`

---

## Summary

This API specification defines:
- **12 endpoint groups** with 80+ endpoints
- **JWT-based authentication** with refresh tokens
- **RESTful design** with proper HTTP methods and status codes
- **Streaming support** for AI chat with SSE
- **Source citations** in AI responses
- **Comprehensive analytics** for personal insights
- **GDPR compliance** with data export
- **Rate limiting** and pagination
- **Validation rules** for all inputs
- **Reusable PKA-STRAT endpoints** adapted for personal use

**Reused from PKA-STRAT:**
- Document upload → Content item upload
- Chat → Conversations with streaming
- Drift monitoring → Personal drift alerts
- Analytics foundations → Personal analytics

**New for PKA-Relate:**
- Psychological profiles
- Core values & mentors
- Focus areas & progress tracking
- Sub-systems & knowledge graph
- Interaction tracking
- Personal analytics & insights
- Calendar events
- Streak tracking
