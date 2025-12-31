/**
 * PKA-Relate Data Models Schema
 *
 * Complete TypeScript interface definitions for PKA-Relate,
 * adapted from PKA-STRAT strategic alignment models for
 * personal relationship and knowledge management.
 *
 * Key Adaptations:
 * - PyramidEntity → SubSystem (hierarchical knowledge domains)
 * - AlignmentScore → GrowthMetrics (personal development tracking)
 * - DriftAlert → RelationshipInsights (relationship quality monitoring)
 * - ProvenanceChain → ValueAlignment (tracking alignment to core values)
 *
 * Compatible with UnifiedMemory and GraphStore from PKA-STRAT backend.
 *
 * @version 1.0.0
 * @date 2025-12-30
 */

// ============================================================================
// BASE TYPES & ENUMS
// ============================================================================

/**
 * ISO 8601 timestamp
 */
export type Timestamp = string;

/**
 * UUID v4 identifier
 */
export type UUID = string;

/**
 * HSL color string (e.g., "hsl(221, 83%, 53%)")
 */
export type HSLColor = string;

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

/**
 * User entity representing the PKA-Relate app user
 *
 * @remarks Single-user architecture with optional multi-device sync
 */
export interface User {
  /** Unique user identifier */
  id: UUID;

  /** Full name */
  name: string;

  /** Email address for authentication and notifications */
  email: string;

  /** Profile avatar URL (optional) */
  avatar_url?: string;

  /** Account creation timestamp */
  created_at: Timestamp;

  /** Last profile update timestamp */
  updated_at: Timestamp;

  /** Device sync enabled */
  sync_enabled: boolean;

  /** Encrypted device sync token */
  sync_token?: string;
}

/**
 * User authentication session
 */
export interface UserSession {
  /** Session ID */
  id: UUID;

  /** User ID */
  user_id: UUID;

  /** JWT access token */
  access_token: string;

  /** JWT refresh token */
  refresh_token: string;

  /** Token expiration timestamp */
  expires_at: Timestamp;

  /** Device fingerprint */
  device_id: string;

  /** Last activity timestamp */
  last_active_at: Timestamp;
}

// ============================================================================
// PSYCHOLOGICAL PROFILE
// ============================================================================

/**
 * Attachment styles based on attachment theory
 */
export type AttachmentStyle = "Secure" | "Anxious" | "Avoidant" | "Disorganized";

/**
 * Communication pattern styles
 */
export type CommunicationStyle = "Direct" | "Indirect" | "Assertive" | "Passive";

/**
 * User's psychological profile for self-awareness and growth
 *
 * @remarks Adapted from PKA-STRAT's User entity, focused on personal traits
 */
export interface PsychologicalProfile {
  /** Profile ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Attachment style classification */
  attachment_style: AttachmentStyle;

  /** When attachment style was last updated */
  attachment_updated_at: Timestamp;

  /** Communication style classification */
  communication_style: CommunicationStyle;

  /** When communication style was last updated */
  communication_updated_at: Timestamp;

  /** Conflict pattern description (e.g., "Avoidant → Explosive") */
  conflict_pattern: string;

  /** When conflict pattern was last updated */
  conflict_updated_at: Timestamp;

  /** Additional trait descriptions */
  traits?: Record<string, string>;

  /** Profile completeness score (0-1) */
  completeness_score: number;
}

// ============================================================================
// CORE VALUES (Adapted from Pyramid Mission/Vision)
// ============================================================================

/**
 * Value category hierarchy (similar to Pyramid levels)
 */
export type ValueCategory = "Primary" | "Secondary" | "Aspirational";

/**
 * Core value entity representing user's guiding principles
 *
 * @remarks Adapted from PyramidEntity at Mission/Vision levels
 */
export interface CoreValue {
  /** Value ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Value category in hierarchy */
  category: ValueCategory;

  /** Value name (e.g., "Authenticity", "Growth", "Connection") */
  value: string;

  /** Detailed description of what this value means to the user */
  description?: string;

  /** Value creation timestamp */
  created_at: Timestamp;

  /** Display order within category */
  display_order: number;

  /** Embedding vector for semantic search and alignment scoring */
  embedding?: number[];

  /** How often this value is referenced in interactions */
  reference_count: number;
}

// ============================================================================
// MENTORS (Guidance Sources)
// ============================================================================

/**
 * Mentor or guidance source for relationship advice
 *
 * @remarks Used to personalize AI chat responses
 */
export interface Mentor {
  /** Mentor ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Mentor name (e.g., "Esther Perel", "Dr. John Gottman") */
  name: string;

  /** Description of mentor's expertise or approach */
  description?: string;

  /** Mentor creation timestamp */
  created_at: Timestamp;

  /** Embedding vector for semantic search */
  embedding?: number[];

  /** How often this mentor is referenced */
  reference_count: number;
}

// ============================================================================
// FOCUS AREAS (Personal Growth Tracking)
// ============================================================================

/**
 * Focus area for personal growth and skill development
 *
 * @remarks Adapted from PyramidEntity at Goals/Objectives levels
 */
export interface FocusArea {
  /** Focus area ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Focus area title (e.g., "Active Listening", "Boundary Setting") */
  title: string;

  /** Detailed description */
  description?: string;

  /** Progress percentage (0-100) */
  progress: number;

  /** Current streak in days */
  streak: number;

  /** Weekly progress change percentage */
  weekly_change: number;

  /** Target completion date */
  target_date?: Timestamp;

  /** Focus area creation timestamp */
  created_at: Timestamp;

  /** Last update timestamp */
  updated_at: Timestamp;

  /** Linked core value IDs */
  linked_value_ids: UUID[];

  /** Embedding vector for semantic search */
  embedding?: number[];
}

/**
 * Progress checkpoint for a focus area
 *
 * @remarks Similar to AlignmentScore history tracking
 */
export interface FocusAreaProgress {
  /** Progress entry ID */
  id: UUID;

  /** Focus area ID (foreign key) */
  focus_area_id: UUID;

  /** Progress score at this checkpoint (0-100) */
  progress_score: number;

  /** Notes or reflections */
  notes?: string;

  /** Checkpoint timestamp */
  recorded_at: Timestamp;

  /** Related interaction IDs */
  interaction_ids?: UUID[];
}

// ============================================================================
// SUB-SYSTEMS (Knowledge Graph Nodes)
// ============================================================================

/**
 * Icon types for sub-system visualization
 */
export type SystemIcon = "grid" | "heart" | "shield" | "flower" | "users" | "star" | "book" | "target";

/**
 * Sub-system entity representing a knowledge domain
 *
 * @remarks Adapted from PyramidEntity for personal knowledge organization
 * @remarks Replaces hierarchical pyramid with graph-based knowledge organization
 */
export interface SubSystem {
  /** Sub-system ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Sub-system name (e.g., "Dating", "Masculinity", "Communication") */
  name: string;

  /** Detailed description */
  description: string;

  /** Display icon */
  icon: SystemIcon;

  /** Theme color in HSL */
  color: HSLColor;

  /** Number of content items (computed) */
  item_count: number;

  /** Connected sub-system IDs for knowledge graph */
  linked_system_ids: UUID[];

  /** Sub-system creation timestamp */
  created_at: Timestamp;

  /** Last update timestamp */
  updated_at: Timestamp;

  /** Embedding vector for semantic search */
  embedding?: number[];

  /** Position in graph visualization */
  graph_position?: {
    x: number;
    y: number;
  };

  /** Is this a default/seeded system? */
  is_default: boolean;
}

/**
 * Link between two sub-systems (graph edge)
 *
 * @remarks Adapted from PyramidLink for knowledge graph connections
 */
export interface SystemLink {
  /** Link ID */
  id: UUID;

  /** Source system ID */
  source_system_id: UUID;

  /** Target system ID */
  target_system_id: UUID;

  /** Link strength/relevance (0-1) */
  strength: number;

  /** Reason for connection */
  description?: string;

  /** Link creation timestamp */
  created_at: Timestamp;

  /** Number of shared content items */
  shared_items_count: number;
}

// ============================================================================
// CONTENT ITEMS (Knowledge Base)
// ============================================================================

/**
 * Content item types
 */
export type ContentType = "note" | "article" | "book" | "video" | "podcast";

/**
 * Content item within a sub-system
 *
 * @remarks Adapted from DocumentChunk with metadata
 */
export interface ContentItem {
  /** Content item ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Primary sub-system ID */
  system_id: UUID;

  /** Content type */
  type: ContentType;

  /** Content title */
  title: string;

  /** Full content text (for notes) */
  content?: string;

  /** External URL (for articles, videos, etc.) */
  url?: string;

  /** Key highlights or quotes */
  highlights?: string[];

  /** Personal notes and reflections */
  personal_notes?: string;

  /** Tags for categorization */
  tags: string[];

  /** Cross-linked sub-system IDs */
  linked_system_ids: UUID[];

  /** Content creation timestamp */
  created_at: Timestamp;

  /** Last update timestamp */
  updated_at: Timestamp;

  /** Embedding vector for semantic search */
  embedding?: number[];

  /** Source metadata (author, publisher, etc.) */
  source_metadata?: {
    author?: string;
    publisher?: string;
    published_date?: Timestamp;
  };

  /** Number of times referenced in chat */
  reference_count: number;
}

// ============================================================================
// INTERACTIONS (Relationship Tracking)
// ============================================================================

/**
 * Interaction types
 */
export type InteractionType = "conversation" | "date" | "conflict" | "milestone" | "observation";

/**
 * Interaction outcome classification
 */
export type InteractionOutcome = "positive" | "neutral" | "negative" | "mixed";

/**
 * Relationship interaction record
 *
 * @remarks Core entity for tracking relationship dynamics
 */
export interface Interaction {
  /** Interaction ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Interaction type */
  type: InteractionType;

  /** Person involved */
  person: string;

  /** Summary of the interaction */
  summary: string;

  /** Outcome classification */
  outcome: InteractionOutcome;

  /** Emotions experienced */
  emotions: string[];

  /** Key learnings or insights */
  learnings?: string;

  /** Interaction date/time */
  date: Timestamp;

  /** Record creation timestamp */
  created_at: Timestamp;

  /** Last update timestamp */
  updated_at: Timestamp;

  /** Linked focus area IDs */
  linked_focus_area_ids?: UUID[];

  /** Linked core value IDs */
  linked_value_ids?: UUID[];

  /** Embedding vector for semantic search */
  embedding?: number[];

  /** Related content item IDs */
  related_content_ids?: UUID[];
}

/**
 * Relationship quality metrics over time
 *
 * @remarks Adapted from AlignmentScore for relationship health tracking
 */
export interface RelationshipMetrics {
  /** Metrics ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Person name */
  person: string;

  /** Overall relationship quality score (0-1) */
  quality_score: number;

  /** Previous quality score */
  previous_score?: number;

  /** Trend direction */
  trend: "improving" | "declining" | "stable";

  /** Calculation timestamp */
  calculated_at: Timestamp;

  /** Score components breakdown */
  components: {
    /** Frequency of positive interactions */
    positive_frequency: number;

    /** Emotional connection strength */
    emotional_connection: number;

    /** Communication quality */
    communication_quality: number;

    /** Value alignment */
    value_alignment: number;
  };

  /** Recent interaction IDs used for calculation */
  interaction_ids: UUID[];
}

/**
 * Relationship insight or alert
 *
 * @remarks Adapted from DriftAlert for relationship quality monitoring
 */
export interface RelationshipInsight {
  /** Insight ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Person name */
  person: string;

  /** Insight severity */
  severity: "critical" | "high" | "medium" | "low";

  /** Insight type */
  type: "drift" | "opportunity" | "pattern" | "milestone";

  /** Insight description */
  description: string;

  /** AI-generated recommendations */
  recommendations: string[];

  /** Detection timestamp */
  detected_at: Timestamp;

  /** Has user acknowledged this insight? */
  acknowledged: boolean;

  /** Related interaction IDs */
  interaction_ids: UUID[];

  /** Related metrics ID */
  metrics_id?: UUID;
}

// ============================================================================
// CHAT & AI ASSISTANT
// ============================================================================

/**
 * Chat message type
 */
export type MessageType = "user" | "assistant";

/**
 * Chat conversation thread
 */
export interface Conversation {
  /** Conversation ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Conversation title (auto-generated or user-set) */
  title: string;

  /** Conversation creation timestamp */
  created_at: Timestamp;

  /** Last message timestamp */
  last_message_at: Timestamp;

  /** Is conversation archived? */
  archived: boolean;

  /** Message count */
  message_count: number;
}

/**
 * Chat message with AI assistant
 *
 * @remarks RAG-based responses with source citations
 */
export interface ChatMessage {
  /** Message ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Conversation ID (foreign key) */
  conversation_id: UUID;

  /** Message type */
  type: MessageType;

  /** Message content */
  content: string;

  /** Source citations (for assistant messages) */
  sources?: ChatSource[];

  /** Is this a "tough love" candid response? */
  is_tough_love?: boolean;

  /** Message creation timestamp */
  created_at: Timestamp;

  /** User feedback (thumbs up/down) */
  feedback?: "positive" | "negative";

  /** Related interaction IDs */
  related_interaction_ids?: UUID[];

  /** Related content item IDs */
  related_content_ids?: UUID[];
}

/**
 * Source citation for AI responses
 */
export interface ChatSource {
  /** Source title */
  title: string;

  /** Author name (optional) */
  author?: string;

  /** Content item ID if source is from knowledge base */
  content_item_id?: UUID;

  /** Mentor ID if source is from mentor guidance */
  mentor_id?: UUID;

  /** Relevance score */
  relevance_score?: number;
}

// ============================================================================
// EVENTS & CALENDAR
// ============================================================================

/**
 * Upcoming event or planned interaction
 */
export interface UpcomingEvent {
  /** Event ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Event title */
  title: string;

  /** Person involved */
  person: string;

  /** Event type */
  event_type: string;

  /** Event date/time */
  datetime: Timestamp;

  /** Preparation notes */
  preparation_notes?: string;

  /** Talking points for the event */
  talking_points?: string[];

  /** Event creation timestamp */
  created_at: Timestamp;

  /** Last update timestamp */
  updated_at: Timestamp;

  /** Linked focus area IDs */
  linked_focus_area_ids?: UUID[];

  /** Related content item IDs */
  related_content_ids?: UUID[];

  /** Reminder sent? */
  reminder_sent: boolean;

  /** Event completed? */
  completed: boolean;

  /** Resulting interaction ID (after event) */
  interaction_id?: UUID;
}

// ============================================================================
// USER SETTINGS & PREFERENCES
// ============================================================================

/**
 * User application settings
 */
export interface UserSettings {
  /** User ID (primary key) */
  user_id: UUID;

  /** Push notifications enabled */
  push_notifications_enabled: boolean;

  /** Strict data privacy mode (on-device only, no cloud sync) */
  data_privacy_strict: boolean;

  /** Daily reflection reminder enabled */
  reflection_reminder_enabled: boolean;

  /** Reflection reminder time (HH:MM format) */
  reflection_reminder_time: string;

  /** App lock with PIN/biometric */
  app_lock_enabled: boolean;

  /** Tough love mode (candid AI responses) */
  tough_love_mode_enabled: boolean;

  /** Settings last update timestamp */
  updated_at: Timestamp;

  /** Theme preference */
  theme?: "light" | "dark" | "auto";

  /** Language preference */
  language?: string;

  /** Notification preferences */
  notifications?: {
    interaction_reminders: boolean;
    focus_area_milestones: boolean;
    relationship_insights: boolean;
    weekly_summary: boolean;
  };
}

// ============================================================================
// ANALYTICS & GROWTH TRACKING
// ============================================================================

/**
 * Weekly summary statistics
 *
 * @remarks Adapted from dashboard metrics in PKA-STRAT
 */
export interface WeeklySummary {
  /** Summary ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Week start date */
  week_start: Timestamp;

  /** Week end date */
  week_end: Timestamp;

  /** Number of interactions logged */
  interactions_logged: number;

  /** Number of insights gained */
  insights_gained: number;

  /** Current streak in days */
  current_streak: number;

  /** Week-over-week change */
  week_over_week_change: {
    interactions: number;
    insights: number;
  };

  /** Top focus areas this week */
  top_focus_areas: {
    focus_area_id: UUID;
    progress_delta: number;
  }[];

  /** Summary generation timestamp */
  generated_at: Timestamp;
}

/**
 * Accountability insight or nudge
 *
 * @remarks AI-generated prompts to maintain engagement
 */
export interface AccountabilityAlert {
  /** Alert ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Alert type */
  type: "reminder" | "milestone" | "drift" | "encouragement";

  /** Alert message */
  message: string;

  /** Suggested action */
  suggested_action?: string;

  /** Alert creation timestamp */
  created_at: Timestamp;

  /** Has user acknowledged? */
  acknowledged: boolean;

  /** Related focus area ID */
  focus_area_id?: UUID;

  /** Related person */
  person?: string;
}

// ============================================================================
// VALUE ALIGNMENT (Adapted from Provenance Chain)
// ============================================================================

/**
 * Tracking alignment between actions/interactions and core values
 *
 * @remarks Adapted from ProvenanceChain to track value-action alignment
 */
export interface ValueAlignment {
  /** Alignment record ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Interaction ID */
  interaction_id: UUID;

  /** Core value ID */
  value_id: UUID;

  /** Alignment score (0-1) */
  alignment_score: number;

  /** How this interaction reflected the value */
  description: string;

  /** Calculation timestamp */
  calculated_at: Timestamp;

  /** Was this alignment positive or negative? */
  is_positive: boolean;
}

// ============================================================================
// GRAPH & MEMORY INTEGRATION
// ============================================================================

/**
 * Graph node for knowledge graph visualization
 *
 * @remarks Compatible with GraphStore from PKA-STRAT backend
 */
export interface GraphNode {
  /** Node ID */
  id: UUID;

  /** Node type */
  type: "system" | "value" | "focus_area" | "content" | "person" | "interaction";

  /** Display label */
  label: string;

  /** Node metadata */
  metadata: Record<string, any>;

  /** Embedding vector */
  embedding?: number[];

  /** Position in graph layout */
  position?: {
    x: number;
    y: number;
  };
}

/**
 * Graph edge connecting nodes
 */
export interface GraphEdge {
  /** Edge ID */
  id: UUID;

  /** Source node ID */
  source_id: UUID;

  /** Target node ID */
  target_id: UUID;

  /** Edge type/relationship */
  type: string;

  /** Edge weight/strength */
  weight: number;

  /** Edge metadata */
  metadata?: Record<string, any>;
}

/**
 * Unified memory entry for semantic search
 *
 * @remarks Compatible with UnifiedMemory from PKA-STRAT backend
 */
export interface MemoryEntry {
  /** Memory entry ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Content text */
  content: string;

  /** Content type */
  content_type: "interaction" | "note" | "insight" | "reflection";

  /** Embedding vector */
  embedding: number[];

  /** Entry timestamp */
  timestamp: Timestamp;

  /** Related entity ID */
  entity_id?: UUID;

  /** Related entity type */
  entity_type?: string;

  /** Metadata */
  metadata: Record<string, any>;
}

// ============================================================================
// EXPORT & DATA PORTABILITY
// ============================================================================

/**
 * Data export request
 */
export interface DataExportRequest {
  /** Export request ID */
  id: UUID;

  /** User ID (foreign key) */
  user_id: UUID;

  /** Export format */
  format: "json" | "csv" | "pdf";

  /** Include types */
  include_types: string[];

  /** Request status */
  status: "pending" | "processing" | "ready" | "error";

  /** Request creation timestamp */
  created_at: Timestamp;

  /** Export ready timestamp */
  completed_at?: Timestamp;

  /** Download URL */
  download_url?: string;

  /** URL expiration timestamp */
  expires_at?: Timestamp;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Paginated response metadata
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;

  /** Items per page */
  limit: number;

  /** Total items */
  total: number;

  /** Total pages */
  total_pages: number;

  /** Has next page? */
  has_next: boolean;

  /** Has previous page? */
  has_previous: boolean;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  /** Data items */
  data: T[];

  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * API error response
 */
export interface ApiError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error details */
  details?: Record<string, any>;

  /** Error timestamp */
  timestamp: Timestamp;
}

// ============================================================================
// VECTOR SEARCH & SEMANTIC QUERIES
// ============================================================================

/**
 * Semantic search query
 */
export interface SemanticSearchQuery {
  /** Search query text */
  query: string;

  /** Search filters */
  filters?: {
    /** Content types to search */
    content_types?: ContentType[];

    /** Sub-system IDs to search within */
    system_ids?: UUID[];

    /** Date range */
    date_range?: {
      start: Timestamp;
      end: Timestamp;
    };

    /** Tags to match */
    tags?: string[];
  };

  /** Number of results to return */
  limit?: number;

  /** Minimum relevance score (0-1) */
  min_score?: number;
}

/**
 * Semantic search result
 */
export interface SemanticSearchResult {
  /** Result item ID */
  item_id: UUID;

  /** Item type */
  item_type: string;

  /** Relevance score */
  score: number;

  /** Result metadata */
  metadata: Record<string, any>;

  /** Matched content snippet */
  snippet?: string;
}

// ============================================================================
// GRAPH QUERY & TRAVERSAL
// ============================================================================

/**
 * Graph query for knowledge exploration
 */
export interface GraphQuery {
  /** Starting node ID */
  start_node_id: UUID;

  /** Traversal depth */
  depth: number;

  /** Edge types to follow */
  edge_types?: string[];

  /** Node types to include */
  node_types?: string[];

  /** Minimum edge weight */
  min_weight?: number;
}

/**
 * Graph query result
 */
export interface GraphQueryResult {
  /** Nodes in the subgraph */
  nodes: GraphNode[];

  /** Edges in the subgraph */
  edges: GraphEdge[];

  /** Path from start to each node */
  paths: {
    node_id: UUID;
    path: UUID[];
    distance: number;
  }[];
}
