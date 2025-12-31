/**
 * Cortexis API Type Definitions
 *
 * These types match the API contract for Cortexis frontend integration.
 * @module api/types
 */

// Re-export collection types from memory module
export {
  Collection,
  CollectionMetric,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CollectionStats
} from '../memory/collections.js';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard API error response format
 */
export interface APIError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Available attention mechanisms for search
 */
export type AttentionMechanism =
  | 'FlashAttention'
  | 'HyperbolicAttention'
  | 'GraphAttention'
  | 'CrossAttention'
  | 'Auto';

/**
 * Search request body
 */
export interface SearchRequest {
  /** Search query text */
  query: string;
  /** Maximum results to return (default: 10) */
  limit?: number;
  /** Attention mechanism to use */
  attention_mechanism?: AttentionMechanism;
  /** Enable GNN enhancement (default: true) */
  use_gnn?: boolean;
}

/**
 * Individual search result item
 */
export interface SearchResultItem {
  /** Unique result identifier */
  id: string;
  /** Similarity score (0-1 for cosine) */
  score: number;
  /** Result metadata */
  metadata: {
    title: string;
    content: string;
    author?: string;
    department?: string;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
  /** Search explanation */
  explanation: {
    attentionMechanism: string;
    gnnBoost: number;
    searchTime: string;
  };
}

/**
 * Search response
 */
export interface SearchResponse {
  results: SearchResultItem[];
  stats: {
    totalFound: number;
    searchTime: number;
    algorithm: string;
  };
}

// ============================================================================
// Metrics Types
// ============================================================================

/**
 * System metrics response
 */
export interface MetricsResponse {
  performance: {
    avgSearchTime: number;
    p95SearchTime: number;
    p99SearchTime: number;
    throughput: number;
    successRate: number;
  };
  learning: {
    gnnImprovement: number;
    trainingIterations: number;
    lastTrainingTime: string;
    attentionOverhead: number;
    patternConfidence: number;
  };
  usage: {
    totalQueries: number;
    queriesToday: number;
    queriesPerHour: number;
    activeUsers: number;
    avgQueriesPerUser: number;
    peakHour: string;
  };
  collections: Array<{
    name: string;
    vectorCount: number;
    documentCount: number;
  }>;
  storage: {
    totalVectors: number;
    totalDocuments: number;
    storageUsed: string;
    compressionRatio: number;
  };
}

// ============================================================================
// Upload Types (P1 - Stub for now)
// ============================================================================

/**
 * Upload job status
 */
export interface UploadJob {
  jobId: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  stage: 'parsing' | 'chunking' | 'embedding' | 'inserting' | 'learning';
  progress: number;
  vectorsAdded: number;
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

// ============================================================================
// Chat Types (P1 - Stub for now)
// ============================================================================

/**
 * Chat request body
 */
export interface ChatRequest {
  message: string;
  collection?: string;
  conversationId?: string;
}

/**
 * Source document reference in chat response
 */
export interface ChatSource {
  id: string;
  title: string;
  score: number;
  snippet: string;
  gnnBoost: number;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: ChatSource[];
  confidence?: number;
  searchTime?: number;
  generationTime?: number;
  timestamp: Date;
}

/**
 * Chat response
 */
export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
}

// ============================================================================
// Learning Insights Types
// ============================================================================

/**
 * Learning insight from SONA/GNN
 */
export interface LearningInsight {
  type: 'pattern' | 'improvement' | 'behavior' | 'relationship';
  title: string;
  description: string;
  value?: number;
  timestamp: Date;
}
