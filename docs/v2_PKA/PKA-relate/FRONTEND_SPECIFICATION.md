# Relationship PKA - Frontend Specification

## Overview

A mobile-first personal knowledge assistant for relationship management. The app helps users track interactions, organize knowledge into sub-systems, receive AI-powered advice, and monitor personal growth.

---

## App Architecture

### Navigation Structure
- **Bottom Tab Navigation** (5 tabs):
  1. Home - Dashboard with quick actions and daily focus
  2. Ask - AI chat interface for relationship advice
  3. Systems - Knowledge graph of sub-systems
  4. Growth - Progress tracking and analytics
  5. Profile - User settings and psychological profile

### Screen Flow
```
Home ─────────────────────────────────────────────────────────────────┐
  ├── Quick Ask → Ask Screen                                          │
  ├── Add Content → Systems Screen                                    │
  ├── Log Interaction → Log Interaction Screen (modal flow)           │
  ├── Focus Area Cards → Growth Screen                                │
  └── Upcoming Events → Event Detail (future)                         │
                                                                      │
Ask ──────────────────────────────────────────────────────────────────┤
  └── Chat with AI → Receives responses with sources                  │
                                                                      │
Systems ──────────────────────────────────────────────────────────────┤
  ├── Grid View → System Cards                                        │
  ├── Graph View → Knowledge Graph Visualization                      │
  ├── Add New System → Modal                                          │
  └── System Detail → Sheet with stats and linked systems             │
                                                                      │
Growth ───────────────────────────────────────────────────────────────┤
  ├── Weekly Overview → Stats cards                                   │
  ├── Focus Areas → Progress tracking                                 │
  └── Interaction Log → List of past interactions                     │
                                                                      │
Profile ──────────────────────────────────────────────────────────────┘
  ├── Psychological Profile → Trait cards
  ├── Core Values → Categorized value chips
  ├── Mentors → Mentor list
  └── Settings → Toggles and preferences
```

---

## Data Models

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Psychological Profile
```typescript
interface PsychologicalProfile {
  id: string;
  user_id: string;
  attachment_style: "Secure" | "Anxious" | "Avoidant" | "Disorganized";
  attachment_updated_at: timestamp;
  communication_style: "Direct" | "Indirect" | "Assertive" | "Passive";
  communication_updated_at: timestamp;
  conflict_pattern: string; // e.g., "Avoidant → Explosive"
  conflict_updated_at: timestamp;
}
```

### Core Values
```typescript
interface CoreValue {
  id: string;
  user_id: string;
  category: "Primary" | "Secondary" | "Aspirational";
  value: string; // e.g., "Authenticity", "Growth", "Connection"
  created_at: timestamp;
}
```

### Mentor
```typescript
interface Mentor {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: timestamp;
}
```

### Focus Area
```typescript
interface FocusArea {
  id: string;
  user_id: string;
  title: string; // e.g., "Active Listening", "Boundary Setting"
  progress: number; // 0-100
  streak: number; // consecutive days
  weekly_change: number; // percentage change
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Sub-System
```typescript
interface SubSystem {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: "grid" | "heart" | "shield" | "flower" | "users" | "star" | "book" | "target";
  color: string; // HSL color string
  item_count: number; // computed from content items
  linked_system_ids: string[]; // for knowledge graph connections
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Content Item (within Sub-Systems)
```typescript
interface ContentItem {
  id: string;
  user_id: string;
  system_id: string;
  type: "note" | "article" | "book" | "video" | "podcast";
  title: string;
  content?: string; // for notes
  url?: string; // for external content
  highlights?: string[];
  personal_notes?: string;
  tags: string[];
  linked_system_ids: string[]; // cross-system linking
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Interaction
```typescript
interface Interaction {
  id: string;
  user_id: string;
  type: "conversation" | "date" | "conflict" | "milestone" | "observation";
  person: string;
  summary: string;
  outcome: "positive" | "neutral" | "negative" | "mixed";
  emotions: string[]; // e.g., ["Connected", "Anxious", "Hopeful"]
  learnings?: string;
  date: timestamp;
  created_at: timestamp;
}
```

### Chat Message
```typescript
interface ChatMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  type: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  is_tough_love?: boolean; // candid perspective mode
  created_at: timestamp;
}

interface ChatSource {
  title: string;
  author?: string;
}
```

### Upcoming Event
```typescript
interface UpcomingEvent {
  id: string;
  user_id: string;
  title: string;
  person: string;
  event_type: string;
  datetime: timestamp;
  preparation_notes?: string;
  talking_points?: string[];
  created_at: timestamp;
}
```

### User Settings
```typescript
interface UserSettings {
  user_id: string;
  push_notifications_enabled: boolean;
  data_privacy_strict: boolean; // on-device only mode
  reflection_reminder_enabled: boolean;
  reflection_reminder_time: string; // e.g., "21:00"
  app_lock_enabled: boolean;
  tough_love_mode_enabled: boolean;
  updated_at: timestamp;
}
```

---

## API Endpoints Required

### Authentication
```
POST   /auth/signup
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
```

### User Profile
```
GET    /users/me/profile
PUT    /users/me/profile
GET    /users/me/psychological-profile
PUT    /users/me/psychological-profile
GET    /users/me/settings
PUT    /users/me/settings
```

### Core Values
```
GET    /users/me/values
POST   /users/me/values
DELETE /users/me/values/:id
```

### Mentors
```
GET    /users/me/mentors
POST   /users/me/mentors
DELETE /users/me/mentors/:id
```

### Focus Areas
```
GET    /users/me/focus-areas
POST   /users/me/focus-areas
PUT    /users/me/focus-areas/:id
DELETE /users/me/focus-areas/:id
```

### Sub-Systems
```
GET    /systems
POST   /systems
GET    /systems/:id
PUT    /systems/:id
DELETE /systems/:id
GET    /systems/:id/items          # Get content items
POST   /systems/:id/items          # Add content item
GET    /systems/graph              # Get graph data with connections
POST   /systems/:id/link/:targetId # Link two systems
DELETE /systems/:id/link/:targetId # Unlink two systems
```

### Content Items
```
GET    /content-items
GET    /content-items/:id
PUT    /content-items/:id
DELETE /content-items/:id
GET    /content-items/search?q=    # Full-text search
```

### Interactions
```
GET    /interactions
POST   /interactions
GET    /interactions/:id
PUT    /interactions/:id
DELETE /interactions/:id
GET    /interactions/stats         # Weekly/monthly stats
```

### Chat / AI Assistant
```
GET    /conversations
POST   /conversations
GET    /conversations/:id/messages
POST   /conversations/:id/messages # Send message, receive AI response
POST   /conversations/:id/feedback # Thumbs up/down on AI response
```

### Events
```
GET    /events
POST   /events
GET    /events/:id
PUT    /events/:id
DELETE /events/:id
GET    /events/upcoming            # Next 7 days
```

### Analytics / Growth
```
GET    /analytics/weekly-summary
GET    /analytics/focus-progress
GET    /analytics/interaction-patterns
GET    /analytics/streak-data
```

### Export
```
POST   /export/data               # Full data export
```

---

## Screen Specifications

### 1. Home Screen

**Purpose:** Dashboard showing today's focus and quick actions

**Components:**
| Component | Data Source | Interactions |
|-----------|-------------|--------------|
| Quick Actions (Add Content, Log Interaction) | Static | Navigate to respective screens |
| Quick Ask Card | Static | Navigate to Ask screen |
| Focus Areas (horizontal scroll) | `GET /users/me/focus-areas` | Tap to view details in Growth |
| Daily Reflection Card | `GET /analytics/weekly-summary` | Tap to log interaction |
| Upcoming Event Card | `GET /events/upcoming` | Tap to view event details |

**Refresh:** On screen focus, pull-to-refresh

---

### 2. Ask Screen (AI Chat)

**Purpose:** Conversational AI for relationship advice

**Components:**
| Component | Data Source | Interactions |
|-----------|-------------|--------------|
| Message List | `GET /conversations/:id/messages` | Scroll, view sources |
| Suggested Questions | Static/AI-generated | Tap to send as message |
| Input Field | User input | Type and send message |
| Source Citations | From AI response | Tap to view source detail |
| Feedback Buttons | - | `POST /conversations/:id/feedback` |
| "Candid Perspective" Badge | `is_tough_love` flag | Visual indicator only |

**Real-time:** Messages should stream or update as AI responds

**AI Response Format:**
```json
{
  "content": "string",
  "sources": [{ "title": "string", "author": "string" }],
  "is_tough_love": boolean
}
```

---

### 3. Systems Screen

**Purpose:** Knowledge graph of relationship sub-systems

**Views:**
1. **Grid View** - Cards showing each sub-system
2. **Graph View** - Visual node-link diagram of connections

**Components:**
| Component | Data Source | Interactions |
|-----------|-------------|--------------|
| System Count | `GET /systems` (count) | - |
| Add New Button | - | Opens Add System Modal |
| View Toggle (Grid/Graph) | Local state | Switch views |
| Search Bar | - | Filter systems (client-side) |
| System Cards | `GET /systems` | Tap to open detail sheet |
| Knowledge Graph | `GET /systems/graph` | Tap nodes to open detail |
| Add System Modal | - | `POST /systems` |
| System Detail Sheet | `GET /systems/:id` | View stats, linked systems |

**Default Sub-Systems (seeded on signup):**
- General
- Dating
- Masculinity
- Femininity
- Management

---

### 4. Growth Screen

**Purpose:** Track progress, view analytics, review interactions

**Components:**
| Component | Data Source | Interactions |
|-----------|-------------|--------------|
| Week Selector | Local state | Navigate weeks |
| Stats Cards (Interactions, Insights, Streak) | `GET /analytics/weekly-summary` | - |
| Accountability Alert | AI-generated | Tap to take action |
| Core Values Display | `GET /users/me/values` | - |
| Focus Area Progress | `GET /users/me/focus-areas` | Tap to view details |
| Recent Interactions | `GET /interactions?limit=5` | Tap to view/edit |

**Weekly Summary Response:**
```json
{
  "interactions_logged": number,
  "insights_gained": number,
  "current_streak": number,
  "week_over_week_change": {
    "interactions": number,
    "insights": number
  }
}
```

---

### 5. Profile Screen

**Purpose:** User settings, psychological profile, preferences

**Sections:**
1. **User Info** - Avatar, name, member since
2. **Psychological Profile** - Attachment style, communication style, conflict pattern
3. **Core Values** - Grouped by Primary/Secondary/Aspirational
4. **Mentors** - List of guidance sources
5. **Settings** - Toggles for various preferences
6. **Stats** - Total interactions, library items, days active

**Components:**
| Component | Data Source | Interactions |
|-----------|-------------|--------------|
| Edit Profile Button | - | Navigate to edit screen |
| Profile Traits | `GET /users/me/psychological-profile` | Tap to edit |
| Value Cards | `GET /users/me/values` | - |
| Mentor Chips | `GET /users/me/mentors` | Tap to view/edit |
| Setting Toggles | `GET /users/me/settings` | `PUT /users/me/settings` |
| Export Data | - | `POST /export/data` |

---

### 6. Log Interaction Screen (Multi-step Modal)

**Purpose:** Record a relationship interaction

**Steps:**
1. **Type Selection** - Choose interaction type
2. **Details** - Person name, summary text
3. **Outcome** - Select positive/neutral/negative/mixed
4. **Emotions** - Multi-select emotion chips
5. **Learnings** - Optional text input

**Flow:**
```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Save
   ↑_____________________________________|  (Back navigation)
```

**Payload:**
```json
{
  "type": "conversation" | "date" | "conflict" | "milestone" | "observation",
  "person": "string",
  "summary": "string",
  "outcome": "positive" | "neutral" | "negative" | "mixed",
  "emotions": ["string"],
  "learnings": "string",
  "date": "ISO timestamp"
}
```

---

## UI Components Library

### Design Tokens (from index.css)
- **Colors:** All colors use HSL via CSS variables (--primary, --secondary, --accent, etc.)
- **Typography:** 
  - Sans: Lato
  - Serif: EB Garamond  
  - Mono: Fira Code
- **Spacing:** Tailwind default scale
- **Border Radius:** `--radius: 0.75rem`
- **Shadows:** Custom shadow tokens defined

### Reusable Components
- `Card` - Content containers
- `Button` - Actions (variants: default, outline, ghost)
- `Input` / `Textarea` - Text entry
- `Badge` - Status indicators
- `Progress` - Progress bars
- `Sheet` - Bottom slide-up panels
- `Dialog` - Modal dialogs
- `Switch` - Toggle settings
- `ScrollArea` - Scrollable containers

---

## State Management

### Local State (React useState)
- Current screen/tab
- Modal open/closed states
- Form input values
- View toggles (grid/graph)

### Server State (React Query recommended)
- User profile data
- Systems and content items
- Interactions list
- Chat messages
- Analytics data

### Caching Strategy
- Profile data: Cache for session, invalidate on update
- Systems: Cache with background refresh
- Interactions: Cache recent, paginate older
- Chat: No cache, always fetch fresh

---

## Offline Considerations

If offline support is required:
1. Cache recent interactions locally
2. Queue new interactions for sync
3. Cache system structure (not content)
4. Show cached data with "offline" indicator

---

## Security Requirements

1. **Authentication:** JWT tokens with refresh
2. **Data Privacy:** Option for on-device only mode
3. **App Lock:** Optional PIN/biometric lock
4. **Export:** User can export all their data
5. **Deletion:** User can delete account and all data

---

## Performance Targets

- **Initial Load:** < 2s on 4G
- **Screen Transitions:** < 100ms
- **API Responses:** < 500ms for reads, < 1s for AI
- **Smooth Scrolling:** 60fps on message lists

---

## Future Considerations

1. **Pre-game Briefing:** Detailed preparation screen before events
2. **Relationship Audit:** Periodic comprehensive review
3. **Notifications:** Push notifications for reminders
4. **Sharing:** Share insights (anonymized) with therapist
5. **Multi-device Sync:** Web app companion
