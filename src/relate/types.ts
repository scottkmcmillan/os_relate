/**
 * PKA-Relate Type Definitions and Validation Schemas
 *
 * Complete TypeScript interfaces and Zod schemas for the PKA-Relate backend.
 * This file provides runtime validation and type safety for all domain entities.
 *
 * @module relate/types
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Configurable embedding dimensions
 * - Development: 384 (smaller, faster, local models)
 * - Production: 1536 (OpenAI text-embedding-3-small)
 */
export const EMBEDDING_DIMENSIONS = (process.env.EMBEDDING_DIMENSIONS
  ? parseInt(process.env.EMBEDDING_DIMENSIONS, 10)
  : 1536) as 384 | 768 | 1536;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * UUID string type (RFC 4122)
 */
export type UUID = string;

/**
 * ISO 8601 timestamp string
 */
export type Timestamp = string;

/**
 * Pagination parameters for list queries
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().optional(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Generic API response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .optional(),
    meta: z
      .object({
        timestamp: z.string(),
        requestId: z.string().optional(),
      })
      .optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
};

/**
 * API error type
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  statusCode: z.number().int().min(400).max(599),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============================================================================
// CORE USER TYPES
// ============================================================================

/**
 * User entity - Core user account
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password_hash: z.string(), // bcrypt hash
  avatar_url: z.string().url().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  sync_enabled: z.boolean().default(false),
  sync_token: z.string().optional(), // Encrypted sync token
});

export type User = z.infer<typeof UserSchema>;

/**
 * User session for multi-device support
 */
export const UserSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.string().datetime(),
  device_id: z.string().max(255),
  last_active_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type UserSession = z.infer<typeof UserSessionSchema>;

/**
 * Attachment styles from attachment theory
 */
export const AttachmentStyleSchema = z.enum([
  'Secure',
  'Anxious',
  'Avoidant',
  'Disorganized',
]);

export type AttachmentStyle = z.infer<typeof AttachmentStyleSchema>;

/**
 * Communication style patterns
 */
export const CommunicationStyleSchema = z.enum([
  'Direct',
  'Indirect',
  'Assertive',
  'Passive',
]);

export type CommunicationStyle = z.infer<typeof CommunicationStyleSchema>;

/**
 * Psychological profile for self-awareness
 */
export const PsychologicalProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),

  // Attachment theory
  attachment_style: AttachmentStyleSchema,
  attachment_updated_at: z.string().datetime(),

  // Communication patterns
  communication_style: CommunicationStyleSchema,
  communication_updated_at: z.string().datetime(),

  // Conflict patterns
  conflict_pattern: z.string().optional(),
  conflict_updated_at: z.string().datetime(),

  // Extensible traits
  traits: z.record(z.unknown()).default({}),

  // Completeness tracking
  completeness_score: z.number().min(0).max(1).default(0),

  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type PsychologicalProfile = z.infer<typeof PsychologicalProfileSchema>;

/**
 * User settings and preferences
 */
export const UserSettingsSchema = z.object({
  user_id: z.string().uuid(),

  // Notifications
  push_notifications_enabled: z.boolean().default(true),
  reflection_reminder_enabled: z.boolean().default(true),
  reflection_reminder_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).default('21:00:00'),

  // Privacy
  data_privacy_strict: z.boolean().default(false),

  // Security
  app_lock_enabled: z.boolean().default(false),

  // AI behavior
  tough_love_mode_enabled: z.boolean().default(false),

  // Display
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  language: z.string().length(2).default('en'),

  // Additional notification preferences
  notifications: z.object({
    interaction_reminders: z.boolean().default(true),
    focus_area_milestones: z.boolean().default(true),
    relationship_insights: z.boolean().default(true),
    weekly_summary: z.boolean().default(true),
  }).default({}),

  updated_at: z.string().datetime(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

/**
 * Core value categories (mission/vision alignment)
 */
export const ValueCategorySchema = z.enum(['Primary', 'Secondary', 'Aspirational']);

export type ValueCategory = z.infer<typeof ValueCategorySchema>;

/**
 * Core value entity
 */
export const CoreValueSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  category: ValueCategorySchema,
  value: z.string().min(1).max(255),
  description: z.string().optional(),
  display_order: z.number().int().default(0),
  embedding: z.instanceof(Float32Array).optional(),
  reference_count: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CoreValue = z.infer<typeof CoreValueSchema>;

/**
 * Mentor/thought leader reference
 */
export const MentorSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  embedding: z.instanceof(Float32Array).optional(),
  reference_count: z.number().int().default(0),
  created_at: z.string().datetime(),
});

export type Mentor = z.infer<typeof MentorSchema>;

/**
 * Focus area for personal growth tracking
 */
export const FocusAreaSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  progress: z.number().int().min(0).max(100).default(0),
  streak: z.number().int().min(0).default(0),
  weekly_change: z.number().default(0),
  target_date: z.string().datetime().optional(),
  linked_value_ids: z.array(z.string().uuid()).default([]),
  embedding: z.instanceof(Float32Array).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type FocusArea = z.infer<typeof FocusAreaSchema>;

// ============================================================================
// CONTENT TYPES (SubSystems & Knowledge Base)
// ============================================================================

/**
 * SubSystem icon options
 */
export const SubSystemIconSchema = z.enum([
  'grid',
  'heart',
  'shield',
  'flower',
  'users',
  'star',
  'book',
  'target',
]);

export type SubSystemIcon = z.infer<typeof SubSystemIconSchema>;

/**
 * SubSystem (Knowledge domain node)
 */
export const SubSystemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string(),
  icon: SubSystemIconSchema,
  color: z.string(), // HSL color string
  item_count: z.number().int().default(0),
  linked_system_ids: z.array(z.string().uuid()).default([]),
  embedding: z.instanceof(Float32Array).optional(),
  graph_position: z.object({
    x: z.number(),
    y: z.number(),
  }).default({ x: 0, y: 0 }),
  is_default: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type SubSystem = z.infer<typeof SubSystemSchema>;

/**
 * System link (graph edge between SubSystems)
 */
export const SystemLinkSchema = z.object({
  id: z.string().uuid(),
  source_system_id: z.string().uuid(),
  target_system_id: z.string().uuid(),
  strength: z.number().min(0).max(1).default(0.5),
  description: z.string().optional(),
  shared_items_count: z.number().int().default(0),
  created_at: z.string().datetime(),
});

export type SystemLink = z.infer<typeof SystemLinkSchema>;

/**
 * Content item types
 */
export const ContentTypeSchema = z.enum([
  'note',
  'article',
  'book',
  'video',
  'podcast',
]);

export type ContentType = z.infer<typeof ContentTypeSchema>;

/**
 * Content item (knowledge base entry)
 */
export const ContentItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  system_id: z.string().uuid(),
  type: ContentTypeSchema,
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  url: z.string().url().optional(),
  highlights: z.array(z.string()).default([]),
  personal_notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  linked_system_ids: z.array(z.string().uuid()).default([]),
  embedding: z.instanceof(Float32Array).optional(),
  source_metadata: z.record(z.unknown()).default({}),
  reference_count: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ContentItem = z.infer<typeof ContentItemSchema>;

// ============================================================================
// INTERACTION TYPES (Relationship Tracking)
// ============================================================================

/**
 * Interaction types
 */
export const InteractionTypeSchema = z.enum([
  'conversation',
  'date',
  'conflict',
  'milestone',
  'observation',
]);

export type InteractionType = z.infer<typeof InteractionTypeSchema>;

/**
 * Interaction outcomes
 */
export const InteractionOutcomeSchema = z.enum([
  'positive',
  'neutral',
  'negative',
  'mixed',
]);

export type InteractionOutcome = z.infer<typeof InteractionOutcomeSchema>;

/**
 * Interaction (relationship event)
 */
export const InteractionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: InteractionTypeSchema,
  person: z.string().min(1).max(255),
  summary: z.string().min(1),
  outcome: InteractionOutcomeSchema,
  emotions: z.array(z.string()).default([]),
  learnings: z.string().optional(),
  date: z.string().datetime(),
  linked_focus_area_ids: z.array(z.string().uuid()).default([]),
  linked_value_ids: z.array(z.string().uuid()).default([]),
  related_content_ids: z.array(z.string().uuid()).default([]),
  embedding: z.instanceof(Float32Array).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Interaction = z.infer<typeof InteractionSchema>;

// ============================================================================
// CHAT TYPES (AI Assistant)
// ============================================================================

/**
 * Chat conversation container
 */
export const ChatConversationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().max(500),
  archived: z.boolean().default(false),
  message_count: z.number().int().default(0),
  created_at: z.string().datetime(),
  last_message_at: z.string().datetime(),
});

export type ChatConversation = z.infer<typeof ChatConversationSchema>;

/**
 * Message type (user or assistant)
 */
export const MessageTypeSchema = z.enum(['user', 'assistant']);

export type MessageType = z.infer<typeof MessageTypeSchema>;

/**
 * Chat source citation
 */
export const ChatSourceSchema = z.object({
  id: z.string(),
  type: z.enum(['subsystem', 'content_item', 'external']),
  title: z.string(),
  author: z.string().optional(),
  content_type: ContentTypeSchema.optional(),
  sub_system_name: z.string().optional(),
  snippet: z.string(),
  url: z.string().url().optional(),
  score: z.number().min(0).max(1),
  highlighted_text: z.string().optional(),
  personal_note: z.string().optional(),
  provenance_level: z.number().int().min(0).default(0),
});

export type ChatSource = z.infer<typeof ChatSourceSchema>;

/**
 * Chat message
 */
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  type: MessageTypeSchema,
  content: z.string().min(1),
  sources: z.array(ChatSourceSchema).default([]),
  is_tough_love: z.boolean().default(false),
  feedback: z.enum(['positive', 'negative']).optional(),
  related_interaction_ids: z.array(z.string().uuid()).default([]),
  related_content_ids: z.array(z.string().uuid()).default([]),
  created_at: z.string().datetime(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Chat feedback
 */
export const ChatFeedbackSchema = z.object({
  message_id: z.string().uuid(),
  feedback: z.enum(['positive', 'negative']),
  feedback_note: z.string().optional(),
});

export type ChatFeedback = z.infer<typeof ChatFeedbackSchema>;

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Weekly summary analytics
 */
export const WeeklySummarySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  week_start: z.string().date(),
  week_end: z.string().date(),
  interactions_logged: z.number().int().default(0),
  insights_gained: z.number().int().default(0),
  current_streak: z.number().int().default(0),
  week_over_week_change: z.record(z.unknown()).default({}),
  top_focus_areas: z.array(z.unknown()).default([]),
  generated_at: z.string().datetime(),
});

export type WeeklySummary = z.infer<typeof WeeklySummarySchema>;

/**
 * Focus area progress checkpoint
 */
export const FocusProgressSchema = z.object({
  id: z.string().uuid(),
  focus_area_id: z.string().uuid(),
  progress_score: z.number().int().min(0).max(100),
  notes: z.string().optional(),
  interaction_ids: z.array(z.string().uuid()).default([]),
  recorded_at: z.string().datetime(),
});

export type FocusProgress = z.infer<typeof FocusProgressSchema>;

/**
 * Accountability alert
 */
export const AccountabilityAlertSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(['reminder', 'milestone', 'drift', 'encouragement']),
  message: z.string(),
  suggested_action: z.string().optional(),
  acknowledged: z.boolean().default(false),
  focus_area_id: z.string().uuid().optional(),
  person: z.string().optional(),
  created_at: z.string().datetime(),
});

export type AccountabilityAlert = z.infer<typeof AccountabilityAlertSchema>;

/**
 * Streak data for gamification
 */
export const StreakDataSchema = z.object({
  current_streak: z.number().int().min(0),
  longest_streak: z.number().int().min(0),
  last_activity_date: z.string().date().optional(),
});

export type StreakData = z.infer<typeof StreakDataSchema>;

// ============================================================================
// GRAPH TYPES (Knowledge Graph)
// ============================================================================

/**
 * Graph node types union
 */
export const RelateNodeTypeSchema = z.enum([
  'system',
  'value',
  'focus_area',
  'content',
  'person',
  'interaction',
]);

export type RelateNodeType = z.infer<typeof RelateNodeTypeSchema>;

/**
 * Graph edge types union
 */
export const RelateEdgeTypeSchema = z.enum([
  'linked_to',
  'contains',
  'demonstrates',
  'practiced',
  'aligned_with',
  'references',
]);

export type RelateEdgeType = z.infer<typeof RelateEdgeTypeSchema>;

/**
 * Graph node
 */
export const GraphNodeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: RelateNodeTypeSchema,
  label: z.string().max(500),
  metadata: z.record(z.unknown()).default({}),
  embedding: z.instanceof(Float32Array).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).default({ x: 0, y: 0 }),
  created_at: z.string().datetime(),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

/**
 * Graph edge
 */
export const GraphEdgeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  type: z.string().max(100),
  weight: z.number().min(0).max(1).default(0.5),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

/**
 * Memory entry for semantic memory
 */
export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1),
  content_type: z.enum(['interaction', 'note', 'insight', 'reflection']),
  embedding: z.instanceof(Float32Array),
  entity_id: z.string().uuid().optional(),
  entity_type: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  timestamp: z.string().datetime(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

// ============================================================================
// CREATE/UPDATE DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Create user DTO (omit server-generated fields)
 */
export const CreateUserSchema = UserSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

/**
 * Update user DTO (all fields optional except id)
 */
export const UpdateUserSchema = UserSchema.partial().required({ id: true });

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

/**
 * Create SubSystem DTO
 */
export const CreateSubSystemSchema = SubSystemSchema.omit({
  id: true,
  item_count: true,
  created_at: true,
  updated_at: true,
});

export type CreateSubSystem = z.infer<typeof CreateSubSystemSchema>;

/**
 * Update SubSystem DTO
 */
export const UpdateSubSystemSchema = SubSystemSchema.partial().required({ id: true });

export type UpdateSubSystem = z.infer<typeof UpdateSubSystemSchema>;

/**
 * Create ContentItem DTO
 */
export const CreateContentItemSchema = ContentItemSchema.omit({
  id: true,
  reference_count: true,
  created_at: true,
  updated_at: true,
});

export type CreateContentItem = z.infer<typeof CreateContentItemSchema>;

/**
 * Update ContentItem DTO
 */
export const UpdateContentItemSchema = ContentItemSchema.partial().required({ id: true });

export type UpdateContentItem = z.infer<typeof UpdateContentItemSchema>;

/**
 * Create Interaction DTO
 */
export const CreateInteractionSchema = InteractionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateInteraction = z.infer<typeof CreateInteractionSchema>;

/**
 * Update Interaction DTO
 */
export const UpdateInteractionSchema = InteractionSchema.partial().required({ id: true });

export type UpdateInteraction = z.infer<typeof UpdateInteractionSchema>;

/**
 * Create ChatMessage DTO
 */
export const CreateChatMessageSchema = ChatMessageSchema.omit({
  id: true,
  created_at: true,
});

export type CreateChatMessage = z.infer<typeof CreateChatMessageSchema>;

// ============================================================================
// QUERY FILTERS
// ============================================================================

/**
 * SubSystem filter options
 */
export const SubSystemFilterSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().optional(),
  is_default: z.boolean().optional(),
  icon: SubSystemIconSchema.optional(),
});

export type SubSystemFilter = z.infer<typeof SubSystemFilterSchema>;

/**
 * ContentItem filter options
 */
export const ContentItemFilterSchema = z.object({
  user_id: z.string().uuid(),
  system_id: z.string().uuid().optional(),
  type: ContentTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(), // Full-text search
});

export type ContentItemFilter = z.infer<typeof ContentItemFilterSchema>;

/**
 * Interaction filter options
 */
export const InteractionFilterSchema = z.object({
  user_id: z.string().uuid(),
  person: z.string().optional(),
  type: InteractionTypeSchema.optional(),
  outcome: InteractionOutcomeSchema.optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
});

export type InteractionFilter = z.infer<typeof InteractionFilterSchema>;

// ============================================================================
// SEMANTIC SEARCH TYPES
// ============================================================================

/**
 * Semantic search query
 */
export const SemanticSearchQuerySchema = z.object({
  query: z.string().min(1),
  user_id: z.string().uuid(),
  limit: z.number().int().positive().max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  filters: z.object({
    system_ids: z.array(z.string().uuid()).optional(),
    content_types: z.array(ContentTypeSchema).optional(),
    date_from: z.string().date().optional(),
    date_to: z.string().date().optional(),
  }).optional(),
});

export type SemanticSearchQuery = z.infer<typeof SemanticSearchQuerySchema>;

/**
 * Semantic search result
 */
export const SemanticSearchResultSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['subsystem', 'content_item', 'interaction', 'chat_message']),
  title: z.string(),
  snippet: z.string(),
  score: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).default({}),
});

export type SemanticSearchResult = z.infer<typeof SemanticSearchResultSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and parse data with a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed and validated data
 * @throws {z.ZodError} If validation fails
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safe validation that returns success/error result
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns SafeParseReturnType with success flag and data/error
 */
export function safeValidate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.SafeParseReturnType<unknown, z.infer<T>> {
  return schema.safeParse(data);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for User
 */
export function isUser(value: unknown): value is User {
  return UserSchema.safeParse(value).success;
}

/**
 * Type guard for SubSystem
 */
export function isSubSystem(value: unknown): value is SubSystem {
  return SubSystemSchema.safeParse(value).success;
}

/**
 * Type guard for ContentItem
 */
export function isContentItem(value: unknown): value is ContentItem {
  return ContentItemSchema.safeParse(value).success;
}

/**
 * Type guard for Interaction
 */
export function isInteraction(value: unknown): value is Interaction {
  return InteractionSchema.safeParse(value).success;
}

/**
 * Type guard for ChatMessage
 */
export function isChatMessage(value: unknown): value is ChatMessage {
  return ChatMessageSchema.safeParse(value).success;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export all schemas for runtime validation
export const schemas = {
  // Utility
  Pagination: PaginationSchema,
  ApiError: ApiErrorSchema,

  // Core User
  User: UserSchema,
  CreateUser: CreateUserSchema,
  UpdateUser: UpdateUserSchema,
  UserSession: UserSessionSchema,
  PsychologicalProfile: PsychologicalProfileSchema,
  UserSettings: UserSettingsSchema,
  CoreValue: CoreValueSchema,
  Mentor: MentorSchema,
  FocusArea: FocusAreaSchema,

  // Content
  SubSystem: SubSystemSchema,
  CreateSubSystem: CreateSubSystemSchema,
  UpdateSubSystem: UpdateSubSystemSchema,
  SystemLink: SystemLinkSchema,
  ContentItem: ContentItemSchema,
  CreateContentItem: CreateContentItemSchema,
  UpdateContentItem: UpdateContentItemSchema,

  // Interactions
  Interaction: InteractionSchema,
  CreateInteraction: CreateInteractionSchema,
  UpdateInteraction: UpdateInteractionSchema,

  // Chat
  ChatConversation: ChatConversationSchema,
  ChatMessage: ChatMessageSchema,
  CreateChatMessage: CreateChatMessageSchema,
  ChatSource: ChatSourceSchema,
  ChatFeedback: ChatFeedbackSchema,

  // Analytics
  WeeklySummary: WeeklySummarySchema,
  FocusProgress: FocusProgressSchema,
  AccountabilityAlert: AccountabilityAlertSchema,
  StreakData: StreakDataSchema,

  // Graph
  GraphNode: GraphNodeSchema,
  GraphEdge: GraphEdgeSchema,
  MemoryEntry: MemoryEntrySchema,

  // Filters
  SubSystemFilter: SubSystemFilterSchema,
  ContentItemFilter: ContentItemFilterSchema,
  InteractionFilter: InteractionFilterSchema,

  // Search
  SemanticSearchQuery: SemanticSearchQuerySchema,
  SemanticSearchResult: SemanticSearchResultSchema,
};

// Re-export all enums
export const enums = {
  AttachmentStyle: AttachmentStyleSchema,
  CommunicationStyle: CommunicationStyleSchema,
  ValueCategory: ValueCategorySchema,
  SubSystemIcon: SubSystemIconSchema,
  ContentType: ContentTypeSchema,
  InteractionType: InteractionTypeSchema,
  InteractionOutcome: InteractionOutcomeSchema,
  MessageType: MessageTypeSchema,
  RelateNodeType: RelateNodeTypeSchema,
  RelateEdgeType: RelateEdgeTypeSchema,
};
