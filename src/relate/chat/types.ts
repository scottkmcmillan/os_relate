/**
 * Type definitions for Enhanced Chat Service
 */

// Core chat types
export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_at?: Date;
  tags: string[];
  related_systems: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: string; // JSON stringified ChatSource[]
  provenance?: string; // JSON stringified ProvenanceChain
  is_tough_love?: boolean;
  tough_love_reasons?: string[];
  confidence?: number;
  synthesized_from?: number;
  includes_external?: boolean;
  feedback?: 'positive' | 'negative';
  feedback_note?: string;
  created_at: Date;
}

export interface ChatOptions {
  toughLoveMode?: boolean;
  systemIds?: string[];
  mentorPersona?: string;
  includeHistory?: number;
  streaming?: boolean;
}

export interface ChatResponse {
  message: ChatMessage;
  sources: ChatSource[];
  suggestedFollowUps?: string[];
}

export interface ChatFeedback {
  rating: 'positive' | 'negative';
  note?: string;
}

export interface ChatChunk {
  type: 'start' | 'source' | 'content' | 'complete' | 'error';
  conversationId?: string;
  messageId?: string;
  source?: ChatSource;
  delta?: string;
  metadata?: {
    messageId: string;
    confidence: number;
    sourceCount: number;
    isToughLove: boolean;
    suggestedFollowUps?: string[];
  };
  error?: string;
}

export interface Pagination {
  limit: number;
  offset: number;
}

// Context types
export interface UserContext {
  profile: PsychologicalProfile;
  values: CoreValue[];
  mentors: Mentor[];
  focusAreas: FocusArea[];
  recentInteractions: Interaction[];
}

export interface SearchContext {
  relevantContent: ContentItem[];
  relatedInteractions: Interaction[];
  matchingInsights: RelationshipInsight[];
  confidence?: number;
}

export interface ContextOptions {
  systemIds?: string[];
  maxResults?: number;
  includeExternal?: boolean;
}

export interface ChatSource {
  id: string;
  type: 'subsystem' | 'content_item' | 'external';
  title: string;
  author?: string;
  contentType?: ContentType;
  subSystemName?: string;
  snippet: string;
  url?: string;
  score: number;
  highlightedText?: string;
  personalNote?: string;
  provenanceLevel: number;
}

export interface ContentItem extends SearchResult {
  // Extends SearchResult with specific properties
}

export interface SearchResult {
  id: string;
  type: 'subsystem' | 'content_item' | 'external';
  title: string;
  author?: string;
  contentType?: ContentType;
  subSystemName?: string;
  systemId?: string;
  snippet: string;
  url?: string;
  score: number;
  highlightedText?: string | null;
  personalNote?: string | null;
  metadata?: any;
}

// User profile types
export interface PsychologicalProfile {
  id: string;
  user_id: string;
  attachment_style: AttachmentStyle;
  communication_style: CommunicationStyle;
  conflict_pattern: ConflictPattern;
  love_languages: string[];
  created_at: Date;
  updated_at: Date;
}

export type AttachmentStyle =
  | 'secure'
  | 'anxious'
  | 'avoidant'
  | 'fearful-avoidant'
  | 'unknown';

export type CommunicationStyle =
  | 'direct'
  | 'indirect'
  | 'passive'
  | 'aggressive'
  | 'passive-aggressive'
  | 'assertive';

export type ConflictPattern =
  | 'pursuer-withdrawer'
  | 'collaborative'
  | 'competitive'
  | 'avoidant'
  | 'accommodating';

export interface CoreValue {
  id: string;
  user_id: string;
  value: string;
  category: 'Primary' | 'Secondary' | 'Aspirational';
  importance: number;
  created_at: Date;
}

export interface Mentor {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  expertise_area?: string;
  approach?: string;
  created_at: Date;
}

export interface FocusArea {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'paused';
  priority: number;
  created_at: Date;
}

export interface Interaction {
  id: string;
  user_id: string;
  date: Date;
  summary: string;
  outcome: 'positive' | 'negative' | 'neutral' | 'mixed';
  notes?: string;
  created_at: Date;
}

export interface RelationshipInsight {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: Date;
}

// Tough love types
export interface ToughLoveDecision {
  activate: boolean;
  confidence: number;
  triggeredPatterns: string[];
  valueContradictions: string[];
  suggestedApproach: 'gentle' | 'moderate' | 'direct';
}

export interface BehavioralPattern {
  type: 'self_justification' | 'blame_shifting' | 'avoidance' | 'repetitive_complaint';
  description: string;
  frequency: number;
  lastOccurrence: Date;
  examples: string[];
}

export interface ValueContradiction {
  value: string;
  category: string;
  contradiction: string;
  confidence: number;
}

export interface RepetitionInfo {
  count: number;
  examples: string[];
  firstOccurrence: Date;
  lastOccurrence: Date;
}

// Content types
export type ContentType =
  | 'article'
  | 'book'
  | 'video'
  | 'podcast'
  | 'note'
  | 'excerpt'
  | 'course';

// Provenance tracking
export interface ProvenanceChain {
  sources: ChatSource[];
  relationships: SourceRelationship[];
  synthesisPath: string[];
}

export interface SourceRelationship {
  from: string;
  to: string;
  type: 'linked_system' | 'references' | 'contradicts' | 'supports';
  strength: number;
}

// External sources
export interface ExternalSource {
  id: string;
  author: string;
  title: string;
  type: ContentType;
  url: string;
  content?: string;
  publication_date?: Date;
  topics: string[];
  cached_at: Date;
  last_verified: Date;
}

// User settings
export interface UserSettings {
  user_id: string;
  tough_love_mode_enabled: boolean;
  default_mentor_id?: string;
  streaming_enabled: boolean;
  max_history_messages: number;
  created_at: Date;
  updated_at: Date;
}
