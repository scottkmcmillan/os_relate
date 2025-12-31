/**
 * Enhanced Chat Service - Entry Point
 * Phase 4: RAG-based chat with tough love mode
 */

export { EnhancedChatService } from './service';
export { ContextBuilder } from './context';
export { ToughLoveEngine } from './tough-love';
export { SYSTEM_PROMPTS, formatWithSources, generateFollowUps } from './prompts';

export type {
  // Core chat types
  ChatConversation,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatFeedback,
  ChatChunk,
  Pagination,

  // Context types
  UserContext,
  SearchContext,
  ContextOptions,
  ChatSource,
  ContentItem,
  SearchResult,

  // User profile types
  PsychologicalProfile,
  AttachmentStyle,
  CommunicationStyle,
  ConflictPattern,
  CoreValue,
  Mentor,
  FocusArea,
  Interaction,
  RelationshipInsight,

  // Tough love types
  ToughLoveDecision,
  BehavioralPattern,
  ValueContradiction,
  RepetitionInfo,

  // Other types
  ContentType,
  ProvenanceChain,
  SourceRelationship,
  ExternalSource,
  UserSettings,
} from './types';

// Default export for convenience
import router from './routes';
export default router;
