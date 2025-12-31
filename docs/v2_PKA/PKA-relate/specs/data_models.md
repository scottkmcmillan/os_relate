# PKA-Relate Data Model Specification

## Overview

This document defines the complete data model schema for PKA-Relate, a mobile-first personal knowledge assistant for relationship management. The design integrates TypeScript type definitions, database schema considerations, vector embedding requirements for semantic search, and graph relationships for knowledge graph features.

---

## Design Principles

1. **User-Centric Privacy**: All data is scoped to individual users with optional on-device-only mode
2. **Vector-Enabled Search**: Key entities support semantic search through embeddings
3. **Graph Connectivity**: Knowledge relationships form a traversable graph structure
4. **Temporal Tracking**: Audit trails and version history for learning patterns
5. **Flexible Metadata**: Extensible properties for AI-powered insights
6. **Performance Optimization**: Efficient indexing and caching strategies

---

## Core Entity Models

### 1. User Entity

```typescript
interface User {
  id: string;                    // UUID primary key
  name: string;                  // Display name
  email: string;                 // Unique email address
  avatar_url?: string;           // Optional avatar image URL
  created_at: Date;              // Account creation timestamp
  updated_at: Date;              // Last profile update timestamp

  // Relations
  psychological_profile?: PsychologicalProfile;
  settings?: UserSettings;
  core_values: CoreValue[];
  mentors: Mentor[];
  focus_areas: FocusArea[];
  sub_systems: SubSystem[];
  interactions: Interaction[];
  conversations: ChatConversation[];
  events: UpcomingEvent[];
}
```

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

**Vector Requirements:**
- No direct embeddings (user identity not searchable)
- Privacy-focused: User data never leaves user scope

---

### 2. Psychological Profile

```typescript
interface PsychologicalProfile {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to User

  // Attachment Theory
  attachment_style: AttachmentStyle;
  attachment_updated_at: Date;
  attachment_confidence?: number; // 0-1 score from AI assessment

  // Communication Patterns
  communication_style: CommunicationStyle;
  communication_updated_at: Date;
  communication_notes?: string;

  // Conflict Patterns
  conflict_pattern: string;      // e.g., "Avoidant → Explosive"
  conflict_updated_at: Date;
  conflict_triggers?: string[];  // Identified trigger patterns

  // Metadata
  created_at: Date;
  updated_at: Date;
}

enum AttachmentStyle {
  SECURE = "Secure",
  ANXIOUS = "Anxious",
  AVOIDANT = "Avoidant",
  DISORGANIZED = "Disorganized"
}

enum CommunicationStyle {
  DIRECT = "Direct",
  INDIRECT = "Indirect",
  ASSERTIVE = "Assertive",
  PASSIVE = "Passive",
  AGGRESSIVE = "Aggressive",
  PASSIVE_AGGRESSIVE = "Passive-Aggressive"
}
```

**Database Schema:**
```sql
CREATE TYPE attachment_style AS ENUM ('Secure', 'Anxious', 'Avoidant', 'Disorganized');
CREATE TYPE communication_style AS ENUM ('Direct', 'Indirect', 'Assertive', 'Passive', 'Aggressive', 'Passive-Aggressive');

CREATE TABLE psychological_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  attachment_style attachment_style NOT NULL,
  attachment_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attachment_confidence NUMERIC(3,2) CHECK (attachment_confidence >= 0 AND attachment_confidence <= 1),

  communication_style communication_style NOT NULL,
  communication_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  communication_notes TEXT,

  conflict_pattern VARCHAR(500),
  conflict_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conflict_triggers TEXT[], -- Array of trigger descriptions

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_psych_profiles_user ON psychological_profiles(user_id);
```

**Vector Requirements:**
- Embed `conflict_pattern` and `conflict_triggers` for pattern matching
- Use for recommending similar user patterns (anonymized)

---

### 3. Core Values

```typescript
interface CoreValue {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to User
  category: ValueCategory;       // Classification tier
  value: string;                 // Value name (e.g., "Authenticity")
  description?: string;          // Optional elaboration
  rank?: number;                 // Optional priority ranking within category
  created_at: Date;
  updated_at: Date;
}

enum ValueCategory {
  PRIMARY = "Primary",           // 1-3 core values
  SECONDARY = "Secondary",       // 4-7 important values
  ASPIRATIONAL = "Aspirational"  // Future-oriented values
}
```

**Database Schema:**
```sql
CREATE TYPE value_category AS ENUM ('Primary', 'Secondary', 'Aspirational');

CREATE TABLE core_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category value_category NOT NULL,
  value VARCHAR(100) NOT NULL,
  description TEXT,
  rank INTEGER, -- NULL allowed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_value_per_user UNIQUE(user_id, value)
);

CREATE INDEX idx_core_values_user ON core_values(user_id);
CREATE INDEX idx_core_values_category ON core_values(user_id, category, rank);
```

**Vector Requirements:**
- Embed `value` + `description` for semantic value alignment detection
- Graph: Connect values to SubSystems and ContentItems demonstrating them

---

### 4. Mentors

```typescript
interface Mentor {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to User
  name: string;                  // Mentor name (e.g., "Brené Brown", "Marcus Aurelius")
  description?: string;          // What they represent
  source_type?: MentorSourceType;
  avatar_url?: string;           // Optional mentor image
  created_at: Date;
  updated_at: Date;
}

enum MentorSourceType {
  AUTHOR = "Author",
  THERAPIST = "Therapist",
  PHILOSOPHER = "Philosopher",
  FRIEND = "Friend",
  FAMILY = "Family",
  FICTIONAL = "Fictional",
  OTHER = "Other"
}
```

**Database Schema:**
```sql
CREATE TYPE mentor_source_type AS ENUM (
  'Author', 'Therapist', 'Philosopher', 'Friend', 'Family', 'Fictional', 'Other'
);

CREATE TABLE mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  source_type mentor_source_type,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mentors_user ON mentors(user_id);
```

**Vector Requirements:**
- Embed `name` + `description` for mentor recommendation
- Graph: Link mentors to ContentItems (books, quotes) and SubSystems

---

### 5. Focus Areas

```typescript
interface FocusArea {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to User
  title: string;                 // e.g., "Active Listening", "Boundary Setting"
  description?: string;          // Detailed explanation
  target_behavior?: string;      // Specific behavior to practice

  // Progress Tracking
  progress: number;              // 0-100 percentage
  streak: number;                // Consecutive days of practice
  weekly_change: number;         // Percentage change week-over-week
  last_practiced_at?: Date;      // Last interaction logged for this focus

  // Metadata
  created_at: Date;
  updated_at: Date;
  archived_at?: Date;            // Soft delete for completed focus areas
}
```

**Database Schema:**
```sql
CREATE TABLE focus_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_behavior TEXT,

  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  streak INTEGER NOT NULL DEFAULT 0,
  weekly_change NUMERIC(6,2) DEFAULT 0, -- Can be negative
  last_practiced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_focus_areas_user ON focus_areas(user_id) WHERE archived_at IS NULL;
CREATE INDEX idx_focus_areas_progress ON focus_areas(user_id, progress DESC);
CREATE INDEX idx_focus_areas_streak ON focus_areas(user_id, streak DESC);
```

**Vector Requirements:**
- Embed `title` + `description` + `target_behavior` for similar focus area suggestions
- Graph: Link to Interactions demonstrating practice

---

### 6. Sub-Systems (Knowledge Graph Nodes)

```typescript
interface SubSystem {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to User
  name: string;                  // System name (e.g., "Dating", "Management")
  description: string;           // Rich text description

  // Visual Representation
  icon: SystemIcon;              // Icon identifier
  color: string;                 // HSL color string (e.g., "240 50% 60%")

  // Computed Metrics
  item_count: number;            // Count of ContentItems (computed)
  linked_system_ids: string[];   // Array of connected SubSystem IDs

  // Vector Embedding
  embedding?: Float32Array;      // 768-dim embedding for semantic search

  // Metadata
  created_at: Date;
  updated_at: Date;
  last_accessed_at?: Date;
}

enum SystemIcon {
  GRID = "grid",
  HEART = "heart",
  SHIELD = "shield",
  FLOWER = "flower",
  USERS = "users",
  STAR = "star",
  BOOK = "book",
  TARGET = "target",
  COMPASS = "compass",
  BRAIN = "brain"
}
```

**Database Schema:**
```sql
CREATE TYPE system_icon AS ENUM (
  'grid', 'heart', 'shield', 'flower', 'users', 'star', 'book', 'target', 'compass', 'brain'
);

CREATE TABLE sub_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,

  icon system_icon NOT NULL DEFAULT 'grid',
  color VARCHAR(50) NOT NULL DEFAULT '240 50% 60%',

  item_count INTEGER NOT NULL DEFAULT 0,
  linked_system_ids UUID[] DEFAULT ARRAY[]::UUID[],

  embedding vector(768), -- pgvector extension

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_sub_systems_user ON sub_systems(user_id);
CREATE INDEX idx_sub_systems_name ON sub_systems(user_id, name);
CREATE INDEX idx_sub_systems_embedding ON sub_systems USING ivfflat (embedding vector_cosine_ops);

-- Graph edges table for system-to-system links
CREATE TABLE system_links (
  from_system_id UUID NOT NULL REFERENCES sub_systems(id) ON DELETE CASCADE,
  to_system_id UUID NOT NULL REFERENCES sub_systems(id) ON DELETE CASCADE,
  weight NUMERIC(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (from_system_id, to_system_id),
  CONSTRAINT no_self_links CHECK (from_system_id != to_system_id)
);

CREATE INDEX idx_system_links_from ON system_links(from_system_id);
CREATE INDEX idx_system_links_to ON system_links(to_system_id);
```

**Vector Requirements:**
- Embed `name` + `description` on create/update
- Enable semantic SubSystem discovery ("show me systems related to communication")
- Graph: Nodes in knowledge graph, edges in `system_links` table

**Default Seed Data:**
```typescript
const DEFAULT_SYSTEMS: Partial<SubSystem>[] = [
  { name: "General", description: "General relationship knowledge and insights", icon: "grid", color: "210 50% 60%" },
  { name: "Dating", description: "Dating, attraction, and romantic connection", icon: "heart", color: "340 60% 55%" },
  { name: "Masculinity", description: "Masculine archetypes and healthy masculinity", icon: "shield", color: "200 40% 50%" },
  { name: "Femininity", description: "Feminine archetypes and qualities", icon: "flower", color: "320 55% 60%" },
  { name: "Management", description: "Leadership, team dynamics, and professional relationships", icon: "users", color: "260 45% 55%" }
];
```

---

### 7. Content Items

```typescript
interface ContentItem {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to User
  system_id: string;             // Foreign key to SubSystem

  // Content Properties
  type: ContentType;
  title: string;                 // Item title
  content?: string;              // Full text for notes
  url?: string;                  // External URL for articles/videos

  // Rich Annotations
  highlights?: string[];         // Array of highlighted excerpts
  personal_notes?: string;       // User reflections
  tags: string[];                // Flexible tagging

  // Graph Relationships
  linked_system_ids: string[];   // Cross-system linking
  linked_mentor_ids?: string[];  // Associated mentors
  linked_value_ids?: string[];   // Values this content demonstrates

  // Vector Embedding
  embedding?: Float32Array;      // 768-dim embedding for semantic search

  // Metadata
  created_at: Date;
  updated_at: Date;
  last_accessed_at?: Date;
  access_count: number;          // Popularity tracking
}

enum ContentType {
  NOTE = "note",
  ARTICLE = "article",
  BOOK = "book",
  VIDEO = "video",
  PODCAST = "podcast",
  QUOTE = "quote",
  EXERCISE = "exercise"
}
```

**Database Schema:**
```sql
CREATE TYPE content_type AS ENUM ('note', 'article', 'book', 'video', 'podcast', 'quote', 'exercise');

CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES sub_systems(id) ON DELETE CASCADE,

  type content_type NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  url TEXT,

  highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
  personal_notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  linked_system_ids UUID[] DEFAULT ARRAY[]::UUID[],
  linked_mentor_ids UUID[] DEFAULT ARRAY[]::UUID[],
  linked_value_ids UUID[] DEFAULT ARRAY[]::UUID[],

  embedding vector(768),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_content_items_user ON content_items(user_id);
CREATE INDEX idx_content_items_system ON content_items(system_id);
CREATE INDEX idx_content_items_type ON content_items(user_id, type);
CREATE INDEX idx_content_items_tags ON content_items USING GIN(tags);
CREATE INDEX idx_content_items_embedding ON content_items USING ivfflat (embedding vector_cosine_ops);

-- Full-text search
CREATE INDEX idx_content_items_search ON content_items USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(personal_notes, ''))
);

-- Trigger to update sub_systems.item_count
CREATE OR REPLACE FUNCTION update_system_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sub_systems SET item_count = item_count + 1 WHERE id = NEW.system_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sub_systems SET item_count = item_count - 1 WHERE id = OLD.system_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.system_id != NEW.system_id THEN
    UPDATE sub_systems SET item_count = item_count - 1 WHERE id = OLD.system_id;
    UPDATE sub_systems SET item_count = item_count + 1 WHERE id = NEW.system_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_item_count
  AFTER INSERT OR UPDATE OR DELETE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_system_item_count();
```

**Vector Requirements:**
- Embed `title` + `content` + `personal_notes` + `highlights` on create/update
- Enable semantic content discovery across all SubSystems
- Graph: Nodes linked to SubSystems, Mentors, and CoreValues

---

### 8. Interactions (Relationship Events)

```typescript
interface Interaction {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to User

  // Interaction Details
  type: InteractionType;
  person: string;                // Person involved (free text or contact reference)
  summary: string;               // Brief description
  outcome: InteractionOutcome;

  // Emotional Data
  emotions: string[];            // Multi-select emotions (e.g., ["Connected", "Anxious", "Hopeful"])
  intensity?: number;            // 1-10 emotional intensity

  // Learnings & Growth
  learnings?: string;            // Key takeaways
  linked_focus_area_ids?: string[]; // Focus areas practiced
  linked_value_ids?: string[];   // Values demonstrated/challenged

  // AI Analysis
  ai_insights?: string;          // AI-generated patterns/suggestions
  sentiment_score?: number;      // -1 to 1 (negative to positive)

  // Vector Embedding
  embedding?: Float32Array;      // 768-dim embedding for pattern detection

  // Temporal
  date: Date;                    // When it happened (can be past-dated)
  created_at: Date;
  updated_at: Date;
}

enum InteractionType {
  CONVERSATION = "conversation",
  DATE = "date",
  CONFLICT = "conflict",
  MILESTONE = "milestone",
  OBSERVATION = "observation",
  REFLECTION = "reflection"
}

enum InteractionOutcome {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  NEGATIVE = "negative",
  MIXED = "mixed"
}
```

**Database Schema:**
```sql
CREATE TYPE interaction_type AS ENUM ('conversation', 'date', 'conflict', 'milestone', 'observation', 'reflection');
CREATE TYPE interaction_outcome AS ENUM ('positive', 'neutral', 'negative', 'mixed');

CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type interaction_type NOT NULL,
  person VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  outcome interaction_outcome NOT NULL,

  emotions TEXT[] DEFAULT ARRAY[]::TEXT[],
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),

  learnings TEXT,
  linked_focus_area_ids UUID[] DEFAULT ARRAY[]::UUID[],
  linked_value_ids UUID[] DEFAULT ARRAY[]::UUID[],

  ai_insights TEXT,
  sentiment_score NUMERIC(4,3) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),

  embedding vector(768),

  date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_date ON interactions(user_id, date DESC);
CREATE INDEX idx_interactions_type ON interactions(user_id, type);
CREATE INDEX idx_interactions_outcome ON interactions(user_id, outcome);
CREATE INDEX idx_interactions_person ON interactions(user_id, person);
CREATE INDEX idx_interactions_embedding ON interactions USING ivfflat (embedding vector_cosine_ops);

-- Trigger to update focus_area.last_practiced_at and streak
CREATE OR REPLACE FUNCTION update_focus_area_practice()
RETURNS TRIGGER AS $$
BEGIN
  IF array_length(NEW.linked_focus_area_ids, 1) > 0 THEN
    UPDATE focus_areas
    SET last_practiced_at = NEW.date,
        streak = CASE
          WHEN last_practiced_at IS NULL THEN 1
          WHEN DATE(last_practiced_at) = DATE(NEW.date) - INTERVAL '1 day' THEN streak + 1
          WHEN DATE(last_practiced_at) = DATE(NEW.date) THEN streak
          ELSE 1
        END,
        updated_at = NOW()
    WHERE id = ANY(NEW.linked_focus_area_ids) AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_focus_area_practice
  AFTER INSERT OR UPDATE ON interactions
  FOR EACH ROW EXECUTE FUNCTION update_focus_area_practice();
```

**Vector Requirements:**
- Embed `summary` + `learnings` + `emotions` for pattern detection
- Enable "find similar past interactions" for context-aware advice
- Graph: Link to FocusAreas and CoreValues

---

### 9. Chat Conversations & Messages

```typescript
interface ChatConversation {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to User
  title?: string;                // Optional conversation title (AI-generated)
  created_at: Date;
  updated_at: Date;
  last_message_at?: Date;
}

interface ChatMessage {
  id: string;                    // UUID primary key
  conversation_id: string;       // Foreign key to ChatConversation
  user_id: string;               // Foreign key to User (for security)

  // Message Properties
  type: MessageType;
  content: string;               // Message text

  // AI Response Metadata
  sources?: ChatSource[];        // Citations for AI responses
  is_tough_love?: boolean;       // Candid perspective mode flag
  model_used?: string;           // AI model identifier

  // Vector Embedding (for AI responses)
  embedding?: Float32Array;      // 768-dim embedding for similar advice retrieval

  // Feedback
  feedback_score?: number;       // -1 (thumbs down), 0 (none), 1 (thumbs up)

  // Temporal
  created_at: Date;
}

enum MessageType {
  USER = "user",
  ASSISTANT = "assistant"
}

interface ChatSource {
  title: string;
  author?: string;
  url?: string;
  content_item_id?: string;      // Link to user's library if applicable
}
```

**Database Schema:**
```sql
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id, last_message_at DESC);

CREATE TYPE message_type AS ENUM ('user', 'assistant');

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type message_type NOT NULL,
  content TEXT NOT NULL,

  sources JSONB, -- Array of ChatSource objects
  is_tough_love BOOLEAN DEFAULT FALSE,
  model_used VARCHAR(100),

  embedding vector(768),

  feedback_score INTEGER CHECK (feedback_score IN (-1, 0, 1)),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at ASC);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_type ON chat_messages(conversation_id, type);
CREATE INDEX idx_chat_messages_embedding ON chat_messages USING ivfflat (embedding vector_cosine_ops) WHERE type = 'assistant';

-- Trigger to update conversation.last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();
```

**Vector Requirements:**
- Embed AI assistant messages for similar advice retrieval
- Enable "you previously asked about this" context awareness
- Graph: No direct graph relationships (temporal chain via conversation_id)

---

### 10. Upcoming Events

```typescript
interface UpcomingEvent {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to User

  // Event Details
  title: string;                 // Event name
  person: string;                // Person involved
  event_type: string;            // "dinner", "meeting", "date", etc.
  datetime: Date;                // Scheduled date/time
  location?: string;             // Optional location

  // Preparation
  preparation_notes?: string;    // User's prep notes
  talking_points?: string[];     // Key topics to discuss
  ai_brief?: string;             // AI-generated preparation brief

  // Linked Context
  linked_focus_area_ids?: string[];
  linked_content_item_ids?: string[]; // Reference materials

  // Post-Event
  completed_at?: Date;           // When event occurred
  interaction_id?: string;       // Link to logged Interaction after event

  // Metadata
  created_at: Date;
  updated_at: Date;
}
```

**Database Schema:**
```sql
CREATE TABLE upcoming_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  person VARCHAR(255) NOT NULL,
  event_type VARCHAR(100),
  datetime TIMESTAMPTZ NOT NULL,
  location TEXT,

  preparation_notes TEXT,
  talking_points TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_brief TEXT,

  linked_focus_area_ids UUID[] DEFAULT ARRAY[]::UUID[],
  linked_content_item_ids UUID[] DEFAULT ARRAY[]::UUID[],

  completed_at TIMESTAMPTZ,
  interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upcoming_events_user ON upcoming_events(user_id);
CREATE INDEX idx_upcoming_events_datetime ON upcoming_events(user_id, datetime ASC) WHERE completed_at IS NULL;
CREATE INDEX idx_upcoming_events_completed ON upcoming_events(user_id, completed_at DESC) WHERE completed_at IS NOT NULL;
```

**Vector Requirements:**
- Embed `preparation_notes` + `ai_brief` for similar event preparation retrieval
- Graph: Link to FocusAreas and ContentItems for context

---

### 11. User Settings

```typescript
interface UserSettings {
  user_id: string;               // Primary key, foreign key to User

  // Notifications
  push_notifications_enabled: boolean;
  reflection_reminder_enabled: boolean;
  reflection_reminder_time: string; // HH:MM format (e.g., "21:00")
  event_reminders_enabled: boolean;
  event_reminder_hours_before: number; // Default: 2

  // Privacy
  data_privacy_strict: boolean;  // On-device only mode
  analytics_enabled: boolean;

  // Security
  app_lock_enabled: boolean;
  app_lock_type?: AppLockType;

  // AI Behavior
  tough_love_mode_enabled: boolean; // Candid perspective default
  ai_personality?: string;       // "supportive", "direct", "balanced"

  // Display
  theme?: ThemeMode;
  color_scheme?: string;

  // Metadata
  updated_at: Date;
}

enum AppLockType {
  PIN = "pin",
  BIOMETRIC = "biometric",
  BOTH = "both"
}

enum ThemeMode {
  LIGHT = "light",
  DARK = "dark",
  AUTO = "auto"
}
```

**Database Schema:**
```sql
CREATE TYPE app_lock_type AS ENUM ('pin', 'biometric', 'both');
CREATE TYPE theme_mode AS ENUM ('light', 'dark', 'auto');

CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reflection_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reflection_reminder_time TIME NOT NULL DEFAULT '21:00:00',
  event_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  event_reminder_hours_before INTEGER NOT NULL DEFAULT 2,

  data_privacy_strict BOOLEAN NOT NULL DEFAULT FALSE,
  analytics_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  app_lock_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  app_lock_type app_lock_type,

  tough_love_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ai_personality VARCHAR(50) DEFAULT 'balanced',

  theme theme_mode DEFAULT 'auto',
  color_scheme VARCHAR(50),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create settings on user creation
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_settings
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_settings();
```

**Vector Requirements:**
- No embeddings needed (settings are operational data)

---

## Advanced Features

### Vector Embedding Pipeline

**Embedding Model:** OpenAI `text-embedding-3-small` (768 dimensions)

**Entities with Embeddings:**
1. `SubSystem` - `name` + `description`
2. `ContentItem` - `title` + `content` + `personal_notes` + `highlights`
3. `Interaction` - `summary` + `learnings` + `emotions`
4. `ChatMessage` (assistant only) - `content`
5. `PsychologicalProfile` (optional) - `conflict_pattern` + `conflict_triggers`

**Embedding Generation Flow:**
```typescript
async function generateEmbedding(entity: EmbeddableEntity): Promise<Float32Array> {
  const text = extractTextForEmbedding(entity);
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 768
  });
  return new Float32Array(response.data[0].embedding);
}

function extractTextForEmbedding(entity: any): string {
  switch (entity.constructor.name) {
    case 'SubSystem':
      return `${entity.name}\n${entity.description}`;
    case 'ContentItem':
      return [
        entity.title,
        entity.content,
        entity.personal_notes,
        ...(entity.highlights || [])
      ].filter(Boolean).join('\n');
    case 'Interaction':
      return [
        entity.summary,
        entity.learnings,
        entity.emotions.join(', ')
      ].filter(Boolean).join('\n');
    case 'ChatMessage':
      return entity.content;
    default:
      throw new Error(`No embedding strategy for ${entity.constructor.name}`);
  }
}
```

**Vector Search Queries:**

Using PostgreSQL `pgvector` extension:

```sql
-- Find similar SubSystems
SELECT id, name, description, 1 - (embedding <=> $1::vector) AS similarity
FROM sub_systems
WHERE user_id = $2
ORDER BY embedding <=> $1::vector
LIMIT 5;

-- Find related ContentItems across systems
SELECT c.id, c.title, c.type, s.name AS system_name,
       1 - (c.embedding <=> $1::vector) AS similarity
FROM content_items c
JOIN sub_systems s ON c.system_id = s.id
WHERE c.user_id = $2
  AND 1 - (c.embedding <=> $1::vector) > 0.7  -- Similarity threshold
ORDER BY c.embedding <=> $1::vector
LIMIT 10;

-- Find similar past interactions (pattern matching)
SELECT id, type, person, summary, outcome, date,
       1 - (embedding <=> $1::vector) AS similarity
FROM interactions
WHERE user_id = $2
  AND date > NOW() - INTERVAL '6 months'  -- Recent history
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

---

### Knowledge Graph Structure

**Graph Database:** PostgreSQL with recursive CTEs (or Neo4j for advanced scenarios)

**Node Types:**
- `User` (root node)
- `SubSystem`
- `ContentItem`
- `CoreValue`
- `Mentor`
- `FocusArea`
- `Interaction`
- `UpcomingEvent`

**Edge Types:**
```typescript
enum GraphEdgeType {
  // SubSystem relationships
  SYSTEM_LINKED_TO = "LINKED_TO",           // SubSystem → SubSystem
  SYSTEM_CONTAINS = "CONTAINS",             // SubSystem → ContentItem

  // ContentItem relationships
  CONTENT_REFERENCES = "REFERENCES",        // ContentItem → ContentItem
  CONTENT_DEMONSTRATES = "DEMONSTRATES",    // ContentItem → CoreValue
  CONTENT_AUTHORED_BY = "AUTHORED_BY",      // ContentItem → Mentor

  // Interaction relationships
  INTERACTION_PRACTICED = "PRACTICED",      // Interaction → FocusArea
  INTERACTION_ALIGNED = "ALIGNED_WITH",     // Interaction → CoreValue
  INTERACTION_PRECEDED = "PRECEDED_BY",     // Interaction → UpcomingEvent

  // Event relationships
  EVENT_FOCUSES_ON = "FOCUSES_ON",          // UpcomingEvent → FocusArea
  EVENT_REFERENCES = "REFERENCES",          // UpcomingEvent → ContentItem
}
```

**Graph Query Examples:**

```sql
-- Find all content demonstrating a specific core value
WITH RECURSIVE value_content AS (
  SELECT ci.id, ci.title, ci.type, 1 AS depth
  FROM content_items ci
  WHERE $1 = ANY(ci.linked_value_ids)

  UNION

  SELECT ci2.id, ci2.title, ci2.type, vc.depth + 1
  FROM value_content vc
  JOIN content_items ci2 ON vc.id = ANY(ci2.linked_system_ids)
  WHERE vc.depth < 3  -- Max 3 hops
)
SELECT DISTINCT * FROM value_content;

-- Shortest path between two SubSystems
WITH RECURSIVE system_path AS (
  SELECT id, ARRAY[id] AS path, 0 AS depth
  FROM sub_systems
  WHERE id = $1  -- Start system

  UNION

  SELECT s.id, sp.path || s.id, sp.depth + 1
  FROM system_path sp
  CROSS JOIN LATERAL unnest(
    (SELECT linked_system_ids FROM sub_systems WHERE id = sp.id)
  ) AS linked_id
  JOIN sub_systems s ON s.id = linked_id
  WHERE s.id != ALL(sp.path)  -- Prevent cycles
    AND sp.depth < 5
)
SELECT path, depth
FROM system_path
WHERE id = $2  -- Target system
ORDER BY depth
LIMIT 1;
```

---

### Analytics & Computed Metrics

**Weekly Summary Analytics:**

```typescript
interface WeeklySummary {
  week_start: Date;
  week_end: Date;

  interactions_logged: number;
  interactions_by_type: Record<InteractionType, number>;
  interactions_by_outcome: Record<InteractionOutcome, number>;

  insights_gained: number;        // Interactions with non-empty learnings
  current_streak: number;         // Longest focus area streak

  week_over_week_change: {
    interactions: number;         // Percentage change
    insights: number;
    sentiment: number;            // Average sentiment score change
  };

  top_focus_areas: Array<{
    focus_area_id: string;
    title: string;
    practice_count: number;
  }>;

  dominant_emotions: Array<{
    emotion: string;
    frequency: number;
  }>;
}
```

**SQL Query:**
```sql
WITH current_week AS (
  SELECT
    COUNT(*) AS interactions_logged,
    COUNT(*) FILTER (WHERE learnings IS NOT NULL AND learnings != '') AS insights_gained,
    AVG(sentiment_score) AS avg_sentiment
  FROM interactions
  WHERE user_id = $1
    AND date >= date_trunc('week', CURRENT_DATE)
    AND date < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
),
previous_week AS (
  SELECT
    COUNT(*) AS interactions_logged,
    COUNT(*) FILTER (WHERE learnings IS NOT NULL AND learnings != '') AS insights_gained,
    AVG(sentiment_score) AS avg_sentiment
  FROM interactions
  WHERE user_id = $1
    AND date >= date_trunc('week', CURRENT_DATE) - INTERVAL '1 week'
    AND date < date_trunc('week', CURRENT_DATE)
)
SELECT
  cw.interactions_logged,
  cw.insights_gained,
  (SELECT MAX(streak) FROM focus_areas WHERE user_id = $1) AS current_streak,
  ROUND(((cw.interactions_logged - pw.interactions_logged)::numeric / NULLIF(pw.interactions_logged, 0)) * 100, 1) AS interactions_change,
  ROUND(((cw.insights_gained - pw.insights_gained)::numeric / NULLIF(pw.insights_gained, 0)) * 100, 1) AS insights_change,
  ROUND((cw.avg_sentiment - pw.avg_sentiment) * 100, 1) AS sentiment_change
FROM current_week cw, previous_week pw;
```

---

### Security & Privacy Considerations

**Row-Level Security (RLS):**

```sql
-- Enable RLS on all user-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychological_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY user_isolation ON users
  USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation ON psychological_profiles
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Repeat for all tables...
```

**Data Encryption:**
- Sensitive fields (e.g., `content`, `personal_notes`, `learnings`) encrypted at rest
- JWT-based authentication with short-lived access tokens
- Optional on-device-only mode (no cloud sync when `data_privacy_strict = true`)

**Export & Deletion:**
```sql
-- Full data export function
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user', (SELECT row_to_json(u) FROM users u WHERE id = p_user_id),
    'psychological_profile', (SELECT row_to_json(pp) FROM psychological_profiles pp WHERE user_id = p_user_id),
    'core_values', (SELECT jsonb_agg(row_to_json(cv)) FROM core_values cv WHERE user_id = p_user_id),
    'mentors', (SELECT jsonb_agg(row_to_json(m)) FROM mentors m WHERE user_id = p_user_id),
    'focus_areas', (SELECT jsonb_agg(row_to_json(fa)) FROM focus_areas fa WHERE user_id = p_user_id),
    'sub_systems', (SELECT jsonb_agg(row_to_json(ss)) FROM sub_systems ss WHERE user_id = p_user_id),
    'content_items', (SELECT jsonb_agg(row_to_json(ci)) FROM content_items ci WHERE user_id = p_user_id),
    'interactions', (SELECT jsonb_agg(row_to_json(i)) FROM interactions i WHERE user_id = p_user_id),
    'conversations', (SELECT jsonb_agg(row_to_json(cc)) FROM chat_conversations cc WHERE user_id = p_user_id),
    'upcoming_events', (SELECT jsonb_agg(row_to_json(ue)) FROM upcoming_events ue WHERE user_id = p_user_id),
    'settings', (SELECT row_to_json(us) FROM user_settings us WHERE user_id = p_user_id)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete account deletion
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- All related data deleted via CASCADE constraints
  DELETE FROM users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Database Indexes & Performance

**Index Strategy:**

1. **Primary Keys:** All UUID primary keys have implicit B-tree indexes
2. **Foreign Keys:** All foreign key columns indexed
3. **Temporal Queries:** Indexes on `created_at`, `updated_at`, `date` (DESC)
4. **Vector Search:** IVFFlat indexes on all `embedding` columns
5. **Full-Text Search:** GIN indexes on text columns
6. **Graph Traversal:** Composite indexes on linked ID arrays

**Caching Strategy:**

```typescript
interface CacheConfig {
  // Redis-based caching
  user_profile: { ttl: 3600 },           // 1 hour
  psychological_profile: { ttl: 7200 },  // 2 hours
  sub_systems: { ttl: 1800 },            // 30 minutes
  content_items: { ttl: 900 },           // 15 minutes
  focus_areas: { ttl: 600 },             // 10 minutes
  interactions: { ttl: 300 },            // 5 minutes (recent only)
  chat_messages: { ttl: 0 },             // No cache (always fresh)
}
```

**Query Optimization:**

- Use `EXPLAIN ANALYZE` for all complex queries
- Materialize weekly summary analytics in background job
- Batch embed generation for content items (max 100/request)
- Lazy load graph relationships (don't fetch all linked systems upfront)

---

## Migration Strategy

**Phase 1: Core Tables**
1. Users, UserSettings, PsychologicalProfile
2. CoreValues, Mentors
3. FocusAreas

**Phase 2: Knowledge Graph**
4. SubSystems, SystemLinks
5. ContentItems

**Phase 3: Interactions & Events**
6. Interactions
7. ChatConversations, ChatMessages
8. UpcomingEvents

**Phase 4: Vectors & AI**
9. Add embedding columns to all tables
10. Backfill embeddings for existing data
11. Create vector indexes

---

## Reusable Patterns from PKA-STRAT

**Alignment Score Pattern:**
Adapt PKA-STRAT's `AlignmentScore` for tracking how well daily interactions align with core values:

```typescript
interface ValueAlignmentScore {
  value_id: string;
  interaction_id: string;
  alignment_score: number;      // 0-1 score
  confidence: number;           // 0-1 confidence
  factors: AlignmentFactor[];
  calculated_at: Date;
}
```

**Provenance Chain Pattern:**
Track the origin of insights and learnings:

```typescript
interface LearningProvenance {
  learning_id: string;
  source_chain: Array<{
    type: 'interaction' | 'content_item' | 'chat_message';
    id: string;
    contribution: number;       // 0-1 weight
  }>;
  confidence: number;
}
```

**Drift Detection Pattern:**
Alert when behavior drifts from stated values or goals:

```typescript
interface ValueDriftAlert {
  id: string;
  user_id: string;
  value_id: string;
  severity: 'low' | 'medium' | 'high';
  drift_score: number;          // How far from ideal
  recent_interactions: string[]; // Evidence
  suggested_action: string;
  detected_at: Date;
}
```

---

## Next Steps

1. **TypeScript Type Generation:**
   - Generate TypeScript types from this spec
   - Create Zod schemas for runtime validation
   - Build Prisma schema or TypeORM entities

2. **Database Setup:**
   - PostgreSQL with pgvector extension
   - Create migration files for all tables
   - Set up RLS policies and triggers

3. **Vector Pipeline:**
   - Implement embedding service wrapper
   - Create batch processing queue
   - Set up background jobs for backfill

4. **Graph Implementation:**
   - Build graph query utilities
   - Implement shortest path algorithms
   - Create graph visualization helpers

5. **API Layer:**
   - Map all entities to REST endpoints (see FRONTEND_SPECIFICATION.md)
   - Implement GraphQL schema (optional advanced feature)
   - Add WebSocket support for real-time chat

---

**Document Status:** DRAFT v1.0
**Last Updated:** 2025-12-30
**Owner:** ANALYST Agent (Hive Mind Swarm)
