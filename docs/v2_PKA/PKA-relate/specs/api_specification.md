# PKA-Relate API Specification

## Overview

This document defines the complete REST API specification for the PKA-Relate backend. The API follows RESTful principles with JWT-based authentication and supports a mobile-first personal knowledge assistant for relationship management.

**Base URL:** `/api`
**API Version:** `v1`
**Authentication:** JWT Bearer tokens
**Content-Type:** `application/json` (except file uploads)

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [User Profile](#user-profile-endpoints)
   - [Core Values](#core-values-endpoints)
   - [Mentors](#mentors-endpoints)
   - [Focus Areas](#focus-areas-endpoints)
   - [Sub-Systems](#sub-systems-endpoints)
   - [Content Items](#content-items-endpoints)
   - [Interactions](#interactions-endpoints)
   - [Chat/AI Assistant](#chatai-assistant-endpoints)
   - [Events](#events-endpoints)
   - [Analytics](#analytics-endpoints)
   - [Export](#export-endpoints)

---

## Authentication & Authorization

### JWT Token Structure

All authenticated endpoints require a valid JWT token in the `Authorization` header:

```http
Authorization: Bearer <jwt_token>
```

**Token Payload:**
```json
{
  "userId": "string",
  "email": "string",
  "iat": "timestamp",
  "exp": "timestamp"
}
```

**Token Expiry:**
- Access token: 15 minutes
- Refresh token: 7 days

### Protected Endpoints

All endpoints except authentication routes require valid JWT tokens. Tokens are validated using middleware before processing requests.

---

## Error Handling

### Standard Error Response

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "additional context"
    }
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST that creates a resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 413 | Payload Too Large | File/request exceeds size limit |
| 422 | Unprocessable Entity | Valid syntax but semantic errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Temporary outage |

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `MISSING_FIELD` | Required field missing |
| `INVALID_TOKEN` | JWT token invalid or expired |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `ALREADY_EXISTS` | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SERVER_ERROR` | Internal error |

---

## Rate Limiting

**Default Limits:**
- Anonymous: 20 requests/minute
- Authenticated: 100 requests/minute
- Chat endpoints: 10 requests/minute
- Upload endpoints: 5 requests/hour

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

When rate limit is exceeded:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

## Endpoints

### Authentication Endpoints

#### POST /auth/signup

Create a new user account.

**Request:**
```json
{
  "name": "string (required, 2-100 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar_url": null,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "tokens": {
    "access_token": "jwt_token",
    "refresh_token": "jwt_token",
    "expires_in": 900
  }
}
```

**Errors:**
- `400` - Validation error
- `409` - Email already exists

---

#### POST /auth/login

Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar_url": "string | null",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "tokens": {
    "access_token": "jwt_token",
    "refresh_token": "jwt_token",
    "expires_in": 900
  }
}
```

**Errors:**
- `400` - Missing credentials
- `401` - Invalid credentials

---

#### POST /auth/logout

Invalidate current tokens (blacklist).

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `401` - Invalid token

---

#### POST /auth/refresh

Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "jwt_token",
  "refresh_token": "jwt_token",
  "expires_in": 900
}
```

**Errors:**
- `401` - Invalid or expired refresh token

---

#### GET /auth/me

Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "string | null",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

**Errors:**
- `401` - Unauthorized

---

### User Profile Endpoints

#### GET /users/me/profile

Get current user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "string | null",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

#### PUT /users/me/profile

Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "string (optional)",
  "avatar_url": "string (optional, valid URL)"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "email": "john@example.com",
  "avatar_url": "https://example.com/avatar.jpg",
  "updated_at": "2025-01-01T01:00:00Z"
}
```

**Errors:**
- `400` - Validation error

---

#### GET /users/me/psychological-profile

Get user's psychological profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "attachment_style": "Secure | Anxious | Avoidant | Disorganized | null",
  "attachment_updated_at": "2025-01-01T00:00:00Z | null",
  "communication_style": "Direct | Indirect | Assertive | Passive | null",
  "communication_updated_at": "2025-01-01T00:00:00Z | null",
  "conflict_pattern": "string | null",
  "conflict_updated_at": "2025-01-01T00:00:00Z | null"
}
```

---

#### PUT /users/me/psychological-profile

Update psychological profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "attachment_style": "Secure | Anxious | Avoidant | Disorganized (optional)",
  "communication_style": "Direct | Indirect | Assertive | Passive (optional)",
  "conflict_pattern": "string (optional)"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "attachment_style": "Secure",
  "attachment_updated_at": "2025-01-01T01:00:00Z",
  "communication_style": "Direct",
  "communication_updated_at": "2025-01-01T01:00:00Z",
  "conflict_pattern": "Avoidant → Explosive",
  "conflict_updated_at": "2025-01-01T01:00:00Z"
}
```

**Errors:**
- `400` - Invalid enum value

---

#### GET /users/me/settings

Get user settings.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user_id": "uuid",
  "push_notifications_enabled": true,
  "data_privacy_strict": false,
  "reflection_reminder_enabled": true,
  "reflection_reminder_time": "21:00",
  "app_lock_enabled": false,
  "tough_love_mode_enabled": false,
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

#### PUT /users/me/settings

Update user settings.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "push_notifications_enabled": "boolean (optional)",
  "data_privacy_strict": "boolean (optional)",
  "reflection_reminder_enabled": "boolean (optional)",
  "reflection_reminder_time": "string HH:MM (optional)",
  "app_lock_enabled": "boolean (optional)",
  "tough_love_mode_enabled": "boolean (optional)"
}
```

**Response:** `200 OK`
```json
{
  "user_id": "uuid",
  "push_notifications_enabled": true,
  "data_privacy_strict": false,
  "reflection_reminder_enabled": true,
  "reflection_reminder_time": "21:00",
  "app_lock_enabled": false,
  "tough_love_mode_enabled": false,
  "updated_at": "2025-01-01T01:00:00Z"
}
```

**Errors:**
- `400` - Invalid time format

---

### Core Values Endpoints

#### GET /users/me/values

Get user's core values.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `category` (optional): Filter by "Primary" | "Secondary" | "Aspirational"

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "category": "Primary",
    "value": "Authenticity",
    "created_at": "2025-01-01T00:00:00Z"
  },
  {
    "id": "uuid",
    "user_id": "uuid",
    "category": "Secondary",
    "value": "Growth",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

#### POST /users/me/values

Add a new core value.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "category": "Primary | Secondary | Aspirational (required)",
  "value": "string (required, 2-100 chars)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "category": "Primary",
  "value": "Authenticity",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error
- `409` - Value already exists

---

#### DELETE /users/me/values/:id

Delete a core value.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `404` - Value not found

---

### Mentors Endpoints

#### GET /users/me/mentors

Get user's mentors.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Brené Brown",
    "description": "Vulnerability researcher",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

#### POST /users/me/mentors

Add a new mentor.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "string (required, 2-100 chars)",
  "description": "string (optional, max 500 chars)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Brené Brown",
  "description": "Vulnerability researcher",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error

---

#### DELETE /users/me/mentors/:id

Delete a mentor.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `404` - Mentor not found

---

### Focus Areas Endpoints

#### GET /users/me/focus-areas

Get user's focus areas.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Active Listening",
    "progress": 65,
    "streak": 7,
    "weekly_change": 12,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-08T00:00:00Z"
  }
]
```

---

#### POST /users/me/focus-areas

Create a new focus area.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "string (required, 2-100 chars)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Active Listening",
  "progress": 0,
  "streak": 0,
  "weekly_change": 0,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error

---

#### PUT /users/me/focus-areas/:id

Update a focus area.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "string (optional)",
  "progress": "number 0-100 (optional)",
  "streak": "number (optional)",
  "weekly_change": "number (optional)"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Active Listening",
  "progress": 70,
  "streak": 8,
  "weekly_change": 15,
  "updated_at": "2025-01-09T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error
- `404` - Focus area not found

---

#### DELETE /users/me/focus-areas/:id

Delete a focus area.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `404` - Focus area not found

---

### Sub-Systems Endpoints

#### GET /systems

Get all user's sub-systems.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `search` (optional): Filter by name/description

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Dating",
    "description": "Knowledge about dating and romantic relationships",
    "icon": "heart",
    "color": "hsl(340, 82%, 52%)",
    "item_count": 15,
    "linked_system_ids": ["uuid1", "uuid2"],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-05T00:00:00Z"
  }
]
```

---

#### POST /systems

Create a new sub-system.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "string (required, 2-100 chars)",
  "description": "string (required, max 500 chars)",
  "icon": "grid | heart | shield | flower | users | star | book | target (required)",
  "color": "string HSL color (optional, default generated)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Dating",
  "description": "Knowledge about dating and romantic relationships",
  "icon": "heart",
  "color": "hsl(340, 82%, 52%)",
  "item_count": 0,
  "linked_system_ids": [],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error
- `409` - System name already exists

---

#### GET /systems/:id

Get a specific sub-system with details.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Dating",
  "description": "Knowledge about dating and romantic relationships",
  "icon": "heart",
  "color": "hsl(340, 82%, 52%)",
  "item_count": 15,
  "linked_system_ids": ["uuid1", "uuid2"],
  "linked_systems": [
    {
      "id": "uuid1",
      "name": "Masculinity",
      "icon": "shield",
      "color": "hsl(200, 70%, 50%)"
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-05T00:00:00Z"
}
```

**Errors:**
- `404` - System not found

---

#### PUT /systems/:id

Update a sub-system.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "icon": "grid | heart | shield | flower | users | star | book | target (optional)",
  "color": "string HSL color (optional)"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Dating",
  "description": "Updated description",
  "icon": "heart",
  "color": "hsl(340, 82%, 52%)",
  "item_count": 15,
  "linked_system_ids": ["uuid1", "uuid2"],
  "updated_at": "2025-01-10T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error
- `404` - System not found

---

#### DELETE /systems/:id

Delete a sub-system and all its content items.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `404` - System not found

---

#### GET /systems/:id/items

Get content items in a sub-system.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type` (optional): Filter by "note | article | book | video | podcast"
- `limit` (optional): Default 50, max 200
- `offset` (optional): For pagination

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "system_id": "uuid",
      "type": "book",
      "title": "Attached",
      "content": null,
      "url": "https://example.com/attached",
      "highlights": ["Key insight 1", "Key insight 2"],
      "personal_notes": "Great book on attachment theory",
      "tags": ["attachment", "psychology"],
      "linked_system_ids": ["uuid1"],
      "created_at": "2025-01-02T00:00:00Z",
      "updated_at": "2025-01-02T00:00:00Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

**Errors:**
- `404` - System not found

---

#### POST /systems/:id/items

Add a content item to a sub-system.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "type": "note | article | book | video | podcast (required)",
  "title": "string (required, 2-200 chars)",
  "content": "string (optional, for notes)",
  "url": "string (optional, valid URL)",
  "highlights": "array of strings (optional)",
  "personal_notes": "string (optional, max 2000 chars)",
  "tags": "array of strings (optional)",
  "linked_system_ids": "array of uuids (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "system_id": "uuid",
  "type": "book",
  "title": "Attached",
  "content": null,
  "url": "https://example.com/attached",
  "highlights": ["Key insight 1"],
  "personal_notes": "Great book on attachment theory",
  "tags": ["attachment", "psychology"],
  "linked_system_ids": ["uuid1"],
  "created_at": "2025-01-02T00:00:00Z",
  "updated_at": "2025-01-02T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error
- `404` - System not found

---

#### GET /systems/graph

Get knowledge graph data with connections.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "nodes": [
    {
      "id": "uuid",
      "name": "Dating",
      "icon": "heart",
      "color": "hsl(340, 82%, 52%)",
      "item_count": 15
    }
  ],
  "edges": [
    {
      "source": "uuid1",
      "target": "uuid2",
      "strength": 5
    }
  ]
}
```

---

#### POST /systems/:id/link/:targetId

Link two sub-systems.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "source_system_id": "uuid1",
  "target_system_id": "uuid2",
  "created_at": "2025-01-10T00:00:00Z"
}
```

**Errors:**
- `404` - System not found
- `400` - Cannot link to self
- `409` - Link already exists

---

#### DELETE /systems/:id/link/:targetId

Unlink two sub-systems.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `404` - System or link not found

---

### Content Items Endpoints

#### GET /content-items

Get all content items across systems.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type` (optional): Filter by type
- `tags` (optional): Filter by tags (comma-separated)
- `limit` (optional): Default 50, max 200
- `offset` (optional): For pagination

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "system_id": "uuid",
      "system_name": "Dating",
      "type": "book",
      "title": "Attached",
      "url": "https://example.com/attached",
      "tags": ["attachment", "psychology"],
      "created_at": "2025-01-02T00:00:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

#### GET /content-items/:id

Get a specific content item with full details.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "system_id": "uuid",
  "system_name": "Dating",
  "type": "book",
  "title": "Attached",
  "content": null,
  "url": "https://example.com/attached",
  "highlights": ["Key insight 1", "Key insight 2"],
  "personal_notes": "Great book on attachment theory",
  "tags": ["attachment", "psychology"],
  "linked_system_ids": ["uuid1"],
  "linked_systems": [
    {
      "id": "uuid1",
      "name": "Masculinity"
    }
  ],
  "created_at": "2025-01-02T00:00:00Z",
  "updated_at": "2025-01-02T00:00:00Z"
}
```

**Errors:**
- `404` - Item not found

---

#### PUT /content-items/:id

Update a content item.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "string (optional)",
  "content": "string (optional)",
  "url": "string (optional)",
  "highlights": "array (optional)",
  "personal_notes": "string (optional)",
  "tags": "array (optional)",
  "linked_system_ids": "array (optional)"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "system_id": "uuid",
  "type": "book",
  "title": "Updated Title",
  "highlights": ["New insight"],
  "updated_at": "2025-01-10T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error
- `404` - Item not found

---

#### DELETE /content-items/:id

Delete a content item.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `404` - Item not found

---

#### GET /content-items/search

Full-text search across content items.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Default 20, max 100
- `offset` (optional): For pagination

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": "uuid",
      "system_name": "Dating",
      "type": "book",
      "title": "Attached",
      "snippet": "...matching text...",
      "relevance_score": 0.87,
      "created_at": "2025-01-02T00:00:00Z"
    }
  ],
  "total": 5,
  "query": "attachment theory",
  "search_time_ms": 45
}
```

**Errors:**
- `400` - Missing query parameter

---

### Interactions Endpoints

#### GET /interactions

Get user's interactions.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type` (optional): Filter by interaction type
- `person` (optional): Filter by person name
- `outcome` (optional): Filter by outcome
- `startDate` (optional): ISO timestamp
- `endDate` (optional): ISO timestamp
- `limit` (optional): Default 50, max 200
- `offset` (optional): For pagination

**Response:** `200 OK`
```json
{
  "interactions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "conversation",
      "person": "Sarah",
      "summary": "Had a deep conversation about boundaries",
      "outcome": "positive",
      "emotions": ["Connected", "Hopeful"],
      "learnings": "Realized the importance of being direct",
      "date": "2025-01-10T19:30:00Z",
      "created_at": "2025-01-10T20:00:00Z"
    }
  ],
  "total": 127,
  "limit": 50,
  "offset": 0
}
```

---

#### POST /interactions

Log a new interaction.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "type": "conversation | date | conflict | milestone | observation (required)",
  "person": "string (required, 2-100 chars)",
  "summary": "string (required, 10-2000 chars)",
  "outcome": "positive | neutral | negative | mixed (required)",
  "emotions": "array of strings (optional)",
  "learnings": "string (optional, max 2000 chars)",
  "date": "ISO timestamp (optional, defaults to now)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "conversation",
  "person": "Sarah",
  "summary": "Had a deep conversation about boundaries",
  "outcome": "positive",
  "emotions": ["Connected", "Hopeful"],
  "learnings": "Realized the importance of being direct",
  "date": "2025-01-10T19:30:00Z",
  "created_at": "2025-01-10T20:00:00Z"
}
```

**Errors:**
- `400` - Validation error

---

#### GET /interactions/:id

Get a specific interaction.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "conversation",
  "person": "Sarah",
  "summary": "Had a deep conversation about boundaries",
  "outcome": "positive",
  "emotions": ["Connected", "Hopeful"],
  "learnings": "Realized the importance of being direct",
  "date": "2025-01-10T19:30:00Z",
  "created_at": "2025-01-10T20:00:00Z"
}
```

**Errors:**
- `404` - Interaction not found

---

#### PUT /interactions/:id

Update an interaction.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "person": "string (optional)",
  "summary": "string (optional)",
  "outcome": "positive | neutral | negative | mixed (optional)",
  "emotions": "array (optional)",
  "learnings": "string (optional)"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "summary": "Updated summary",
  "updated_at": "2025-01-11T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error
- `404` - Interaction not found

---

#### DELETE /interactions/:id

Delete an interaction.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `404` - Interaction not found

---

#### GET /interactions/stats

Get interaction statistics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period` (optional): "week" | "month" | "all" (default: week)

**Response:** `200 OK`
```json
{
  "period": "week",
  "total_interactions": 12,
  "by_type": {
    "conversation": 8,
    "date": 2,
    "conflict": 1,
    "milestone": 1,
    "observation": 0
  },
  "by_outcome": {
    "positive": 9,
    "neutral": 2,
    "negative": 1,
    "mixed": 0
  },
  "most_common_emotions": [
    { "emotion": "Connected", "count": 7 },
    { "emotion": "Hopeful", "count": 5 }
  ],
  "unique_people": 4
}
```

---

### Chat/AI Assistant Endpoints

#### GET /conversations

Get all user's conversations.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Default 20, max 100
- `offset` (optional): For pagination

**Response:** `200 OK`
```json
{
  "conversations": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "How to handle conflict",
      "message_count": 8,
      "last_message_at": "2025-01-10T15:30:00Z",
      "created_at": "2025-01-10T15:00:00Z"
    }
  ],
  "total": 23,
  "limit": 20,
  "offset": 0
}
```

---

#### POST /conversations

Create a new conversation.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "string (optional, auto-generated from first message)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "New Conversation",
  "message_count": 0,
  "created_at": "2025-01-10T15:00:00Z"
}
```

---

#### GET /conversations/:id/messages

Get messages in a conversation.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Default 50, max 200
- `offset` (optional): For pagination

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "conversation_id": "uuid",
      "type": "user",
      "content": "How do I handle conflict better?",
      "sources": null,
      "is_tough_love": false,
      "created_at": "2025-01-10T15:00:00Z"
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "conversation_id": "uuid",
      "type": "assistant",
      "content": "Based on your profile and knowledge base...",
      "sources": [
        {
          "title": "Attached - Amir Levine",
          "author": "Amir Levine"
        }
      ],
      "is_tough_love": false,
      "created_at": "2025-01-10T15:00:30Z"
    }
  ],
  "total": 8,
  "limit": 50,
  "offset": 0
}
```

**Errors:**
- `404` - Conversation not found

---

#### POST /conversations/:id/messages

Send a message and receive AI response.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "content": "string (required, 1-2000 chars)",
  "tough_love_mode": "boolean (optional, default from user settings)"
}
```

**Response:** `201 Created`
```json
{
  "user_message": {
    "id": "uuid",
    "type": "user",
    "content": "How do I handle conflict better?",
    "created_at": "2025-01-10T15:00:00Z"
  },
  "assistant_message": {
    "id": "uuid",
    "type": "assistant",
    "content": "Based on your profile and knowledge base, here are some strategies...",
    "sources": [
      {
        "title": "Attached - Amir Levine",
        "author": "Amir Levine"
      }
    ],
    "is_tough_love": false,
    "created_at": "2025-01-10T15:00:30Z"
  },
  "processing_time_ms": 1200
}
```

**Errors:**
- `400` - Validation error
- `404` - Conversation not found
- `429` - Rate limit exceeded

---

#### POST /conversations/:id/feedback

Provide feedback on AI response.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "message_id": "uuid (required)",
  "feedback": "positive | negative (required)",
  "comment": "string (optional, max 500 chars)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "message_id": "uuid",
  "feedback": "positive",
  "comment": "Very helpful!",
  "created_at": "2025-01-10T15:05:00Z"
}
```

**Errors:**
- `400` - Validation error
- `404` - Conversation or message not found

---

### Events Endpoints

#### GET /events

Get all user's upcoming events.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate` (optional): ISO timestamp
- `endDate` (optional): ISO timestamp
- `limit` (optional): Default 50, max 200
- `offset` (optional): For pagination

**Response:** `200 OK`
```json
{
  "events": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Coffee with Sarah",
      "person": "Sarah",
      "event_type": "coffee",
      "datetime": "2025-01-15T14:00:00Z",
      "preparation_notes": "Discuss boundary conversation",
      "talking_points": ["Check in on her new job", "Share my progress"],
      "created_at": "2025-01-10T00:00:00Z"
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

---

#### POST /events

Create a new event.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "string (required, 2-200 chars)",
  "person": "string (required, 2-100 chars)",
  "event_type": "string (required)",
  "datetime": "ISO timestamp (required)",
  "preparation_notes": "string (optional, max 2000 chars)",
  "talking_points": "array of strings (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Coffee with Sarah",
  "person": "Sarah",
  "event_type": "coffee",
  "datetime": "2025-01-15T14:00:00Z",
  "preparation_notes": "Discuss boundary conversation",
  "talking_points": ["Check in on her new job"],
  "created_at": "2025-01-10T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error

---

#### GET /events/:id

Get a specific event.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Coffee with Sarah",
  "person": "Sarah",
  "event_type": "coffee",
  "datetime": "2025-01-15T14:00:00Z",
  "preparation_notes": "Discuss boundary conversation",
  "talking_points": ["Check in on her new job", "Share my progress"],
  "created_at": "2025-01-10T00:00:00Z"
}
```

**Errors:**
- `404` - Event not found

---

#### PUT /events/:id

Update an event.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "string (optional)",
  "person": "string (optional)",
  "event_type": "string (optional)",
  "datetime": "ISO timestamp (optional)",
  "preparation_notes": "string (optional)",
  "talking_points": "array (optional)"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Updated title",
  "updated_at": "2025-01-11T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error
- `404` - Event not found

---

#### DELETE /events/:id

Delete an event.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

**Errors:**
- `404` - Event not found

---

#### GET /events/upcoming

Get upcoming events (next 7 days).

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Coffee with Sarah",
    "person": "Sarah",
    "event_type": "coffee",
    "datetime": "2025-01-15T14:00:00Z",
    "days_until": 5
  }
]
```

---

### Analytics Endpoints

#### GET /analytics/weekly-summary

Get weekly summary statistics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `week` (optional): ISO week date (default: current week)

**Response:** `200 OK`
```json
{
  "week_start": "2025-01-06",
  "week_end": "2025-01-12",
  "interactions_logged": 12,
  "insights_gained": 8,
  "current_streak": 7,
  "week_over_week_change": {
    "interactions": 15,
    "insights": 20
  },
  "top_emotions": [
    { "emotion": "Connected", "count": 7 },
    { "emotion": "Hopeful", "count": 5 }
  ]
}
```

---

#### GET /analytics/focus-progress

Get focus area progress over time.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period` (optional): "week" | "month" | "quarter" (default: month)

**Response:** `200 OK`
```json
{
  "period": "month",
  "focus_areas": [
    {
      "id": "uuid",
      "title": "Active Listening",
      "current_progress": 70,
      "trend": [
        { "date": "2025-01-01", "progress": 58 },
        { "date": "2025-01-08", "progress": 65 },
        { "date": "2025-01-15", "progress": 70 }
      ],
      "change_percentage": 20
    }
  ]
}
```

---

#### GET /analytics/interaction-patterns

Get interaction patterns and insights.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period` (optional): "week" | "month" | "all" (default: month)

**Response:** `200 OK`
```json
{
  "period": "month",
  "total_interactions": 45,
  "people": [
    {
      "name": "Sarah",
      "interaction_count": 12,
      "avg_outcome_score": 0.75,
      "common_emotions": ["Connected", "Hopeful"]
    }
  ],
  "patterns": [
    {
      "insight": "Most positive interactions happen on weekends",
      "confidence": 0.85
    }
  ],
  "outcome_distribution": {
    "positive": 32,
    "neutral": 8,
    "negative": 3,
    "mixed": 2
  }
}
```

---

#### GET /analytics/streak-data

Get streak information and history.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "current_streak": 7,
  "longest_streak": 14,
  "total_days_active": 89,
  "streak_history": [
    { "date": "2025-01-10", "active": true },
    { "date": "2025-01-09", "active": true },
    { "date": "2025-01-08", "active": false }
  ],
  "calendar_year": 2025,
  "days_this_year": 10
}
```

---

### Export Endpoints

#### POST /export/data

Export all user data.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "format": "json | csv (optional, default: json)",
  "include": "array of categories (optional, default: all)",
  "date_range": {
    "start": "ISO timestamp (optional)",
    "end": "ISO timestamp (optional)"
  }
}
```

**Categories:**
- `profile`
- `psychological_profile`
- `settings`
- `values`
- `mentors`
- `focus_areas`
- `systems`
- `content_items`
- `interactions`
- `conversations`
- `events`

**Response:** `200 OK`
```json
{
  "export_id": "uuid",
  "format": "json",
  "created_at": "2025-01-10T00:00:00Z",
  "download_url": "/api/export/download/uuid",
  "expires_at": "2025-01-11T00:00:00Z"
}
```

**Errors:**
- `400` - Validation error

---

## Implementation Notes

### Database Schema

The API assumes a PostgreSQL database with the following key tables:
- `users`
- `psychological_profiles`
- `user_settings`
- `core_values`
- `mentors`
- `focus_areas`
- `sub_systems`
- `content_items`
- `system_links`
- `interactions`
- `conversations`
- `chat_messages`
- `chat_feedback`
- `upcoming_events`

### Authentication Middleware

All protected endpoints use JWT verification middleware:

```typescript
async function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN' } });
  }
}
```

### Validation

Use validation middleware (e.g., Joi, Zod, express-validator) for all endpoints:
- Validate request schemas
- Sanitize inputs
- Type checking
- Enum validation

### Rate Limiting

Implement rate limiting using middleware like `express-rate-limit`:

```typescript
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
```

### CORS Configuration

Configure CORS to allow mobile app origins:

```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
```

### AI Integration

Chat endpoints integrate with AI service (OpenAI, Anthropic, etc.):
- Use RAG (Retrieval-Augmented Generation) with user's content items
- Include psychological profile context
- Apply tough love mode filtering
- Track sources for citations

### Performance Optimization

- Add database indexes on frequently queried fields
- Use connection pooling
- Implement query result caching (Redis)
- Paginate large result sets
- Use database transactions for multi-step operations

### Security Best Practices

- Hash passwords with bcrypt (salt rounds: 12)
- Use prepared statements to prevent SQL injection
- Implement CSRF protection
- Add helmet.js for security headers
- Sanitize all user inputs
- Log security events
- Implement account lockout after failed login attempts

### Logging

Use structured logging (Winston, Pino):
- Log all API requests
- Log errors with stack traces
- Track performance metrics
- Monitor AI usage

### Testing

Implement comprehensive tests:
- Unit tests for business logic
- Integration tests for endpoints
- E2E tests for critical workflows
- Load tests for performance

---

## Versioning

API versioning strategy:
- Version in URL path: `/api/v1/`
- Maintain backwards compatibility
- Deprecation notices (6 months)
- Migration guides for breaking changes

---

## Changelog

### Version 1.0.0 (2025-01-01)
- Initial API specification
- All core endpoints defined
- Authentication system
- Chat/AI integration
- Analytics endpoints
