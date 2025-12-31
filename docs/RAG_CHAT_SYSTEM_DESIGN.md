# Cortexis RAG Chat System Design

## Executive Summary

This document specifies the design of a sophisticated Retrieval-Augmented Generation (RAG) chat system for Cortexis, built on top of Ranger's Cognitive Knowledge Graph. The system integrates:

- **Hybrid Search**: Vector similarity (HNSW) + Graph traversal + GNN reranking
- **Semantic Routing**: Intent classification with multi-stage execution strategies
- **Continuous Learning**: SONA trajectories for learning from chat interactions
- **Source Attribution**: Confidence scoring and provenance tracking
- **Conversation Persistence**: SQLite-backed session management
- **LLM Flexibility**: Pluggable LLM providers (OpenAI, Anthropic, local models)

---

## 1. Core Data Structures

### 1.1 Chat Message Interface

```typescript
/**
 * Represents a single message in a conversation
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;

  // For assistant-generated messages only
  sources?: ChatSource[];
  confidence?: number;
  searchTime?: number;
  generationTime?: number;

  // Metadata
  timestamp: Date;
  conversationId: string;

  // SONA learning integration
  trajectoryId?: number;
  feedback?: ChatFeedback;
}

/**
 * Source attribution from search results
 */
export interface ChatSource {
  id: string;
  title: string;
  score: number;              // Vector similarity score (0-1)
  snippet: string;            // Relevant excerpt
  gnnBoost: number;           // GNN reranking boost (0-2x)

  // Provenance
  source?: string;            // URL, file path, etc.
  type: 'vector' | 'graph' | 'hybrid';
  graphContext?: {
    nodeId: string;
    relatedNodeCount: number;
    pathDepth: number;
  };
}

/**
 * User feedback on assistant responses
 */
export interface ChatFeedback {
  rating: 'good' | 'neutral' | 'bad';
  sourceHelpfulness?: Record<string, number>; // source.id -> score
  comment?: string;
  markedAsFactual?: boolean;
  correctedContent?: string;
}
```

### 1.2 Conversation Session Interface

```typescript
/**
 * Represents a complete conversation session
 */
export interface ChatSession {
  id: string;
  title?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  userId?: string;

  // SONA integration
  trajectoryId?: number;        // Active learning trajectory
  trajectoryQuality?: number;   // Session quality score

  // Configuration
  model: string;                // 'openai' | 'anthropic' | 'local'
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;

  // Search/routing configuration
  searchDepth: 'shallow' | 'medium' | 'deep';
  enableGNN: boolean;
  enableGraphTraversal: boolean;

  // Statistics
  messageCount: number;
  totalSearchTime: number;
  totalGenerationTime: number;
}

/**
 * Session creation parameters
 */
export interface CreateSessionParams {
  title?: string;
  userId?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  searchDepth?: 'shallow' | 'medium' | 'deep';
  enableGNN?: boolean;
}
```

---

## 2. Search Pipeline Architecture

### 2.1 Query Processing Flow

```
User Query
    ↓
[1] Semantic Routing (SemanticRouter)
    - Classify intent (RETRIEVAL, RELATIONAL, SYNTHESIS, HYBRID)
    - Determine execution strategy
    ↓
[2] Hybrid Search (UnifiedMemory.search)
    - Vector similarity search (HNSW)
    - Graph traversal (optional, based on route)
    - GNN reranking (optional)
    ↓
[3] Source Attribution & Formatting
    - Extract snippets
    - Calculate confidence scores
    - Format context block
    ↓
[4] SONA Learning Trajectory (Optional)
    - Record search queries and results
    - Prepare for feedback loop
    ↓
[5] LLM Generation
    - Create prompt with context
    - Stream/generate response
    - Track generation time
    ↓
[6] Response Assembly
    - Combine LLM text + sources
    - Calculate overall confidence
    - Store in conversation history
```

### 2.2 Semantic Routing Decision Tree

```typescript
/**
 * Routing configuration based on query intent
 */
export interface RoutingConfig {
  // RETRIEVAL: Simple document lookup
  retrieval: {
    vectorOnly: true;
    k: 6;
    threshold: 0.7;
    useGNN: false;
  };

  // RELATIONAL: Graph traversal queries
  relational: {
    vectorFirst: true;
    graphDepth: 2;
    relationshipTypes: ['CITES', 'RELATES_TO', 'DERIVED_FROM'];
    useGNN: true;
    gnnCandidates: 20;
  };

  // SYNTHESIS: Multi-source summaries
  synthesis: {
    vectorSearch: true;
    k: 15;
    aggregationMethod: 'relevance-weighted';
    useGNN: true;
    enableGraphContext: true;
  };

  // HYBRID: Complex multi-intent queries
  hybrid: {
    vectorSearch: true;
    graphTraversal: true;
    k: 10;
    parallelExecution: true;
    fusionMethod: 'reciprocal-rank';
    useGNN: true;
  };
}
```

---

## 3. Confidence Scoring Methodology

### 3.1 Multi-Factor Confidence Calculation

```typescript
/**
 * Confidence scoring breaks down into five factors
 */
export interface ConfidenceBreakdown {
  // 1. Source Quality (0-1): Based on search score
  sourceQuality: number;

  // 2. Source Diversity (0-1): How many sources support the answer
  sourceDiversity: number;

  // 3. Semantic Cohesion (0-1): How well sources relate to each other
  semanticCohesion: number;

  // 4. Graph Context (0-1): Support from knowledge graph relationships
  graphContext: number;

  // 5. LLM Certainty (0-1): Model's expressed confidence in generation
  llmCertainty: number;

  // Final composite score
  overall: number;  // Weighted average
}

/**
 * Confidence calculation weights (configurable)
 */
const CONFIDENCE_WEIGHTS = {
  sourceQuality: 0.30,
  sourceDiversity: 0.20,
  semanticCohesion: 0.15,
  graphContext: 0.20,
  llmCertainty: 0.15
};

/**
 * Calculate overall confidence for a response
 */
export function calculateConfidence(
  sources: ChatSource[],
  graphScore?: number,
  llmCertaintySignal?: number
): ConfidenceBreakdown {
  // Source Quality: average of individual source scores
  const sourceQuality = sources.length > 0
    ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length
    : 0;

  // Source Diversity: penalize single source, reward multiple diverse sources
  const sourceDiversity = Math.min(
    1.0,
    (Math.sqrt(sources.length) / Math.sqrt(10)) * 0.8 + 0.2
  );

  // Semantic Cohesion: measure similarity variance
  // Low variance = high cohesion
  if (sources.length > 1) {
    const scores = sources.map(s => s.score);
    const mean = scores.reduce((a, b) => a + b) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    // Cohesion is inverse of variance (normalized)
    var semanticCohesion = Math.exp(-stdDev * 2);
  } else {
    var semanticCohesion = sources.length === 1 ? 0.7 : 0;
  }

  // Graph Context: leverage GNN boost and relationship depth
  const graphContext = graphScore ?? 0;

  // LLM Certainty: extracted from model (or use heuristics)
  const llmCertainty = llmCertaintySignal ?? 0.75; // default

  // Calculate weighted average
  const overall =
    sourceQuality * CONFIDENCE_WEIGHTS.sourceQuality +
    sourceDiversity * CONFIDENCE_WEIGHTS.sourceDiversity +
    semanticCohesion * CONFIDENCE_WEIGHTS.semanticCohesion +
    graphContext * CONFIDENCE_WEIGHTS.graphContext +
    llmCertainty * CONFIDENCE_WEIGHTS.llmCertainty;

  return {
    sourceQuality: Math.round(sourceQuality * 100) / 100,
    sourceDiversity: Math.round(sourceDiversity * 100) / 100,
    semanticCohesion: Math.round(semanticCohesion * 100) / 100,
    graphContext: Math.round(graphContext * 100) / 100,
    llmCertainty: Math.round(llmCertainty * 100) / 100,
    overall: Math.round(overall * 100) / 100
  };
}
```

### 3.2 Confidence Categories

```typescript
export enum ConfidenceLevel {
  // < 0.40: Low confidence - heavily caveated, acknowledge uncertainty
  LOW = 'low',

  // 0.40-0.70: Medium confidence - partial support, some uncertainty
  MEDIUM = 'medium',

  // > 0.70: High confidence - strong evidence base
  HIGH = 'high'
}

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score < 0.4) return ConfidenceLevel.LOW;
  if (score < 0.7) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.HIGH;
}
```

---

## 4. Conversation Persistence (SQLite Schema)

### 4.1 Database Schema

```sql
-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT,

  -- Model configuration
  model TEXT NOT NULL DEFAULT 'anthropic',
  system_prompt TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,

  -- Search configuration
  search_depth TEXT DEFAULT 'medium',
  enable_gnn INTEGER DEFAULT 1,
  enable_graph_traversal INTEGER DEFAULT 1,

  -- SONA integration
  trajectory_id INTEGER,
  trajectory_quality REAL,

  -- Statistics
  message_count INTEGER DEFAULT 0,
  total_search_time_ms INTEGER DEFAULT 0,
  total_generation_time_ms INTEGER DEFAULT 0,

  -- Archival
  archived INTEGER DEFAULT 0,
  archived_at TEXT
);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Timing
  created_at TEXT NOT NULL,
  search_time_ms INTEGER,
  generation_time_ms INTEGER,

  -- Assistant metadata
  confidence REAL,
  trajectory_id INTEGER,

  FOREIGN KEY (conversation_id) REFERENCES sessions(id)
);

-- Sources table (for attribution)
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  score REAL NOT NULL,
  gnn_boost REAL DEFAULT 1.0,

  snippet TEXT,
  source_url TEXT,
  source_type TEXT DEFAULT 'vector',

  graph_node_id TEXT,
  graph_path_depth INTEGER,

  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Feedback table (for SONA learning)
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK(rating IN ('good', 'neutral', 'bad')),

  source_helpfulness TEXT,  -- JSON: {source_id: score}
  comment TEXT,
  marked_as_factual INTEGER,
  corrected_content TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Trajectories table (SONA learning sessions)
CREATE TABLE trajectories (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,

  initial_query TEXT,
  final_quality REAL,
  route TEXT,

  step_count INTEGER DEFAULT 0,
  total_reward REAL DEFAULT 0.0,

  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),

  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Trajectory steps (for learning)
CREATE TABLE trajectory_steps (
  id TEXT PRIMARY KEY,
  trajectory_id INTEGER NOT NULL,
  step_number INTEGER NOT NULL,

  message_id TEXT,
  query_text TEXT,
  reward REAL,

  created_at TEXT NOT NULL,

  FOREIGN KEY (trajectory_id) REFERENCES trajectories(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Indices for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_sources_message_id ON sources(message_id);
CREATE INDEX idx_feedback_message_id ON feedback(message_id);
CREATE INDEX idx_trajectories_session_id ON trajectories(session_id);
CREATE INDEX idx_trajectory_steps_trajectory_id ON trajectory_steps(trajectory_id);
```

### 4.2 TypeScript Type Definitions for Database

```typescript
/**
 * Raw database record types (as stored in SQLite)
 */
export interface SessionRecord {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  model: string;
  system_prompt: string | null;
  temperature: number;
  max_tokens: number;
  search_depth: string;
  enable_gnn: number;
  enable_graph_traversal: number;
  trajectory_id: number | null;
  trajectory_quality: number | null;
  message_count: number;
  total_search_time_ms: number;
  total_generation_time_ms: number;
  archived: number;
  archived_at: string | null;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  search_time_ms: number | null;
  generation_time_ms: number | null;
  confidence: number | null;
  trajectory_id: number | null;
}

export interface SourceRecord {
  id: string;
  message_id: string;
  source_id: string;
  title: string;
  score: number;
  gnn_boost: number;
  snippet: string | null;
  source_url: string | null;
  source_type: string;
  graph_node_id: string | null;
  graph_path_depth: number | null;
}

export interface FeedbackRecord {
  id: string;
  message_id: string;
  rating: 'good' | 'neutral' | 'bad';
  source_helpfulness: string | null; // JSON
  comment: string | null;
  marked_as_factual: number | null;
  corrected_content: string | null;
  created_at: string;
}

export interface TrajectoryRecord {
  id: number;
  session_id: string | null;
  started_at: string;
  ended_at: string | null;
  initial_query: string;
  final_quality: number | null;
  route: string | null;
  step_count: number;
  total_reward: number;
  status: 'active' | 'completed' | 'abandoned';
}
```

---

## 5. LLM Integration Layer

### 5.1 Provider Abstraction

```typescript
/**
 * LLM provider interface - pluggable design
 */
export interface LLMProvider {
  /**
   * Generate a response given a prompt and context
   */
  generate(params: GenerateParams): Promise<GenerateResult>;

  /**
   * Stream tokens for real-time response
   */
  stream(params: GenerateParams): AsyncGenerator<string>;

  /**
   * Get provider metadata
   */
  getMetadata(): LLMMetadata;
}

/**
 * Parameters for generation
 */
export interface GenerateParams {
  // Input
  systemPrompt: string;
  userPrompt: string;
  contextBlock?: string;  // Formatted search results

  // Configuration
  temperature?: number;
  maxTokens?: number;
  topP?: number;

  // Optional: Extract model confidence signal
  extractCertainty?: boolean;
}

/**
 * Generation result
 */
export interface GenerateResult {
  // Generated text
  text: string;

  // Metadata
  tokensUsed?: number;

  // Optional: Model's certainty signal (e.g., Claude's "thinking" or "confidence")
  certainty?: number;

  // Usage stats
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

/**
 * Provider metadata
 */
export interface LLMMetadata {
  name: string;
  type: 'openai' | 'anthropic' | 'local' | 'custom';
  maxContextWindow: number;
  supportedModels: string[];
}
```

### 5.2 Concrete Provider Implementations

```typescript
/**
 * OpenAI provider
 */
export class OpenAIProvider implements LLMProvider {
  constructor(apiKey: string, model: string = 'gpt-4-turbo') {
    this.apiKey = apiKey;
    this.model = model;
    this.client = new OpenAI({ apiKey });
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const messages: Array<{role: string, content: string}> = [
      { role: 'system', content: params.systemPrompt },
      {
        role: 'user',
        content: params.contextBlock
          ? `${params.contextBlock}\n\nQuestion: ${params.userPrompt}`
          : params.userPrompt
      }
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2048
    });

    return {
      text: response.choices[0]?.message?.content ?? '',
      tokensUsed: response.usage?.total_tokens,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens
    };
  }

  async *stream(params: GenerateParams): AsyncGenerator<string> {
    const messages = [
      { role: 'system', content: params.systemPrompt },
      {
        role: 'user',
        content: params.contextBlock
          ? `${params.contextBlock}\n\nQuestion: ${params.userPrompt}`
          : params.userPrompt
      }
    ];

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2048
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  }

  getMetadata(): LLMMetadata {
    return {
      name: 'OpenAI',
      type: 'openai',
      maxContextWindow: 128000,
      supportedModels: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
    };
  }
}

/**
 * Anthropic (Claude) provider
 */
export class AnthropicProvider implements LLMProvider {
  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.apiKey = apiKey;
    this.model = model;
    this.client = new Anthropic({ apiKey });
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const userContent = params.contextBlock
      ? `${params.contextBlock}\n\nQuestion: ${params.userPrompt}`
      : params.userPrompt;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.7,
      system: params.systemPrompt,
      messages: [
        { role: 'user', content: userContent }
      ]
    });

    return {
      text: response.content[0]?.type === 'text' ? response.content[0].text : '',
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    };
  }

  async *stream(params: GenerateParams): AsyncGenerator<string> {
    const userContent = params.contextBlock
      ? `${params.contextBlock}\n\nQuestion: ${params.userPrompt}`
      : params.userPrompt;

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.7,
      system: params.systemPrompt,
      messages: [
        { role: 'user', content: userContent }
      ]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  getMetadata(): LLMMetadata {
    return {
      name: 'Anthropic',
      type: 'anthropic',
      maxContextWindow: 200000,
      supportedModels: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
    };
  }
}

/**
 * Local model provider (e.g., Ollama, LM Studio)
 */
export class LocalLLMProvider implements LLMProvider {
  constructor(endpoint: string = 'http://localhost:11434', model: string = 'mistral') {
    this.endpoint = endpoint;
    this.model = model;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const prompt = params.contextBlock
      ? `${params.systemPrompt}\n\n${params.contextBlock}\n\nQuestion: ${params.userPrompt}`
      : `${params.systemPrompt}\n\n${params.userPrompt}`;

    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        temperature: params.temperature ?? 0.7,
        stream: false
      })
    });

    const data = await response.json();
    return {
      text: data.response,
      tokensUsed: data.eval_count + data.prompt_eval_count
    };
  }

  async *stream(params: GenerateParams): AsyncGenerator<string> {
    const prompt = params.contextBlock
      ? `${params.systemPrompt}\n\n${params.contextBlock}\n\nQuestion: ${params.userPrompt}`
      : `${params.systemPrompt}\n\n${params.userPrompt}`;

    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        temperature: params.temperature ?? 0.7,
        stream: true
      })
    });

    const reader = response.body?.getReader();
    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      for (const line of chunk.split('\n')) {
        if (line) {
          const data = JSON.parse(line);
          if (data.response) yield data.response;
        }
      }
    }
  }

  getMetadata(): LLMMetadata {
    return {
      name: 'Local LLM',
      type: 'local',
      maxContextWindow: 4096,
      supportedModels: ['mistral', 'llama2', 'neural-chat']
    };
  }
}
```

### 5.3 Provider Factory

```typescript
/**
 * Factory for creating LLM providers
 */
export class LLMProviderFactory {
  static createProvider(config: LLMProviderConfig): LLMProvider {
    switch (config.type) {
      case 'openai':
        if (!config.apiKey) throw new Error('OpenAI API key required');
        return new OpenAIProvider(config.apiKey, config.model);

      case 'anthropic':
        if (!config.apiKey) throw new Error('Anthropic API key required');
        return new AnthropicProvider(config.apiKey, config.model);

      case 'local':
        return new LocalLLMProvider(config.endpoint, config.model);

      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }
}

export interface LLMProviderConfig {
  type: 'openai' | 'anthropic' | 'local';
  model?: string;
  apiKey?: string;
  endpoint?: string;
}
```

---

## 6. SONA Learning Integration

### 6.1 Learning from Chat Interactions

```typescript
/**
 * SONA trajectory events in a chat session
 */
export interface SONATrajectoryEvent {
  // Initialization
  beginTrajectory(query: string, route: string): Promise<TrajectoryId>;

  // Recording each turn
  recordMessageStep(
    trajectoryId: TrajectoryId,
    messageId: string,
    sources: ChatSource[],
    generatedText: string,
    reward: number
  ): Promise<void>;

  // User feedback as reward signal
  recordFeedback(
    trajectoryId: TrajectoryId,
    feedback: ChatFeedback
  ): Promise<void>;

  // End trajectory
  endTrajectory(
    trajectoryId: TrajectoryId,
    sessionQuality: number
  ): void;
}

/**
 * Reward calculation from feedback
 */
export function calculateFeedbackReward(feedback: ChatFeedback): number {
  let reward = 0;

  // Base reward from rating
  switch (feedback.rating) {
    case 'good':
      reward = 1.0;
      break;
    case 'neutral':
      reward = 0.5;
      break;
    case 'bad':
      reward = -0.5; // Negative feedback
      break;
  }

  // Adjust for source helpfulness
  if (feedback.sourceHelpfulness) {
    const avgSourceScore = Object.values(feedback.sourceHelpfulness)
      .reduce((a, b) => a + b, 0) / Object.keys(feedback.sourceHelpfulness).length;

    // Weight source feedback (0.3x of main rating)
    reward = reward * 0.7 + (avgSourceScore - 0.5) * 0.3;
  }

  // Factuality correction (strong signal)
  if (feedback.markedAsFactual === false && feedback.correctedContent) {
    reward = Math.min(reward, -0.3); // Force negative if factually wrong
  }

  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, reward));
}

/**
 * Session quality assessment
 */
export function assessSessionQuality(
  session: ChatSession,
  messages: ChatMessage[]
): number {
  let quality = 0.5; // Start at neutral

  // Messages with high confidence boost quality
  const highConfidenceCount = messages.filter(
    m => m.role === 'assistant' && (m.confidence ?? 0) > 0.7
  ).length;
  quality += (highConfidenceCount / Math.max(messages.length, 1)) * 0.2;

  // Messages with positive feedback boost quality
  const positiveMessages = messages.filter(
    m => m.feedback?.rating === 'good'
  ).length;
  quality += (positiveMessages / Math.max(messages.length, 1)) * 0.2;

  // Penalize bad feedback
  const negativeMessages = messages.filter(
    m => m.feedback?.rating === 'bad'
  ).length;
  quality -= (negativeMessages / Math.max(messages.length, 1)) * 0.2;

  // Reward source diversity
  const totalSources = messages.reduce(
    (sum, m) => sum + (m.sources?.length ?? 0), 0
  );
  const avgSources = totalSources / messages.filter(m => m.role === 'assistant').length;
  quality += Math.min((avgSources / 5) * 0.2, 0.2);

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, quality));
}
```

### 6.2 Continuous Learning Loop

```typescript
/**
 * Manages SONA learning cycles for chat sessions
 */
export class ChatLearningManager {
  private sonaEngine: SONAEngine;
  private trajectoryMap: Map<string, number> = new Map(); // sessionId -> trajectoryId

  /**
   * Start learning for a new chat session
   */
  async startLearning(sessionId: string, initialQuery: string): Promise<number> {
    const trajectoryId = await this.sonaEngine.beginTrajectory(
      initialQuery,
      { route: 'chat-rag' }
    );
    this.trajectoryMap.set(sessionId, trajectoryId);
    return trajectoryId;
  }

  /**
   * Record a message turn for learning
   */
  async recordTurn(
    sessionId: string,
    message: ChatMessage,
    sources: ChatSource[],
    userFeedback?: ChatFeedback
  ): Promise<void> {
    const trajectoryId = this.trajectoryMap.get(sessionId);
    if (!trajectoryId) return;

    // Prepare step text
    const stepText = `Query: ${message.content}\nSources: ${sources.length}, Confidence: ${message.confidence}`;

    // Calculate reward from user feedback or confidence
    let reward = message.confidence ?? 0.5;
    if (userFeedback) {
      reward = calculateFeedbackReward(userFeedback);
    }

    // Record in SONA
    await this.sonaEngine.recordStep(trajectoryId, stepText, reward);
  }

  /**
   * End learning trajectory and assess quality
   */
  endLearning(
    sessionId: string,
    messages: ChatMessage[]
  ): void {
    const trajectoryId = this.trajectoryMap.get(sessionId);
    if (!trajectoryId) return;

    const quality = assessSessionQuality(
      { messageCount: messages.length } as ChatSession,
      messages
    );

    this.sonaEngine.endTrajectory(trajectoryId, quality);
    this.trajectoryMap.delete(sessionId);
  }

  /**
   * Get patterns learned from similar queries
   */
  async findLearningPatterns(query: string, k: number = 5): Promise<ReasoningPattern[]> {
    return this.sonaEngine.findPatterns(query, k);
  }
}
```

---

## 7. Chat API Endpoints

### 7.1 POST /chat - Send Message with RAG

```typescript
/**
 * Request body for chat message
 */
export interface ChatRequest {
  conversationId: string;
  message: string;

  // Optional: Override session settings for this message
  temperature?: number;
  searchDepth?: 'shallow' | 'medium' | 'deep';
  enableGNN?: boolean;
  stream?: boolean;
}

/**
 * Response body for chat message
 */
export interface ChatResponse {
  messageId: string;
  conversationId: string;

  // Generated response
  text: string;

  // Source attribution
  sources: ChatSource[];
  confidence: ConfidenceBreakdown;

  // Timing
  searchTime: number;      // milliseconds
  generationTime: number;  // milliseconds
  totalTime: number;       // milliseconds

  // Metadata
  tokensUsed?: number;
  model: string;
  timestamp: Date;
}

/**
 * Implementation
 */
export async function handleChatMessage(
  db: Database,
  memory: UnifiedMemory,
  llmProvider: LLMProvider,
  learningManager: ChatLearningManager,
  request: ChatRequest
): Promise<ChatResponse> {
  const startTime = Date.now();
  const searchStartTime = Date.now();

  // 1. Load session (create if needed)
  let session = await getOrCreateSession(db, request.conversationId);

  // 2. Semantic routing
  const router = createSemanticRouter();
  const route = router.routeQuery(request.message);

  // 3. Hybrid search with timing
  const searchOptions: HybridSearchOptions = {
    k: request.searchDepth === 'deep' ? 15 : (request.searchDepth === 'shallow' ? 5 : 10),
    useGNN: request.enableGNN ?? session.enableGNN,
    graphDepth: request.searchDepth === 'deep' ? 2 : 1
  };

  const searchResults = await memory.search(request.message, searchOptions);
  const searchTime = Date.now() - searchStartTime;

  // 4. Format context
  const formatter = createContextFormatter({ maxChars: 8000 });
  const contextBlock = formatter.formatAndRender(request.message,
    searchResults.map(r => ({
      score: r.combinedScore,
      metadata: {
        title: r.title,
        text: r.text,
        source: r.source
      }
    }))
  );

  // 5. Generate response via LLM
  const generationStartTime = Date.now();
  const systemPrompt = session.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  let responseText = '';
  if (request.stream) {
    // Streaming would be handled by SSE
    for await (const chunk of llmProvider.stream({
      systemPrompt,
      userPrompt: request.message,
      contextBlock,
      temperature: request.temperature ?? session.temperature,
      maxTokens: session.maxTokens
    })) {
      responseText += chunk;
    }
  } else {
    const result = await llmProvider.generate({
      systemPrompt,
      userPrompt: request.message,
      contextBlock,
      temperature: request.temperature ?? session.temperature,
      maxTokens: session.maxTokens
    });
    responseText = result.text;
  }

  const generationTime = Date.now() - generationStartTime;

  // 6. Create source attribution
  const sources: ChatSource[] = searchResults.map((r, idx) => ({
    id: `src-${idx}`,
    title: r.title,
    score: r.vectorScore,
    snippet: r.text.slice(0, 150),
    gnnBoost: 1.0, // Would come from GNN reranking
    source: r.source,
    type: 'vector',
    graphContext: r.relatedNodes ? {
      nodeId: r.id,
      relatedNodeCount: r.relatedNodes.length,
      pathDepth: 1
    } : undefined
  }));

  // 7. Calculate confidence
  const confidence = calculateConfidence(sources);

  // 8. Create message record
  const messageId = crypto.randomUUID();
  const message: ChatMessage = {
    id: messageId,
    conversationId: request.conversationId,
    role: 'assistant',
    content: responseText,
    sources,
    confidence: confidence.overall,
    searchTime,
    generationTime,
    timestamp: new Date()
  };

  // 9. Store in database
  await storeMessage(db, message);

  // 10. Record for SONA learning
  if (session.trajectoryId) {
    await learningManager.recordTurn(
      request.conversationId,
      message,
      sources
    );
  }

  // 11. Update session statistics
  await updateSessionStats(db, request.conversationId, {
    messageCount: session.messageCount + 1,
    totalSearchTime: session.totalSearchTime + searchTime,
    totalGenerationTime: session.totalGenerationTime + generationTime
  });

  const totalTime = Date.now() - startTime;

  return {
    messageId,
    conversationId: request.conversationId,
    text: responseText,
    sources,
    confidence,
    searchTime,
    generationTime,
    totalTime,
    model: session.model,
    timestamp: new Date()
  };
}
```

### 7.2 GET /chat/history - Retrieve Conversation History

```typescript
/**
 * Request parameters for history retrieval
 */
export interface HistoryRequest {
  conversationId: string;
  limit?: number;      // default 50
  offset?: number;     // default 0
  includeSources?: boolean; // default true
  includeFeedback?: boolean; // default false
}

/**
 * Response structure
 */
export interface HistoryResponse {
  conversationId: string;
  session: ChatSession;
  messages: ChatMessage[];
  totalMessages: number;
  limit: number;
  offset: number;
}

/**
 * Implementation
 */
export async function getConversationHistory(
  db: Database,
  request: HistoryRequest
): Promise<HistoryResponse> {
  // Load session
  const session = await loadSession(db, request.conversationId);
  if (!session) {
    throw new Error('Conversation not found');
  }

  // Load messages
  const messages = await loadMessages(
    db,
    request.conversationId,
    request.limit ?? 50,
    request.offset ?? 0,
    request.includeSources ?? true
  );

  // Count total messages
  const totalCount = await getMessageCount(db, request.conversationId);

  return {
    conversationId: request.conversationId,
    session,
    messages,
    totalMessages: totalCount,
    limit: request.limit ?? 50,
    offset: request.offset ?? 0
  };
}
```

---

## 8. Implementation Roadmap

### Phase 1: Core Chat Infrastructure (Weeks 1-2)
- [ ] Define and implement core TypeScript interfaces
- [ ] Set up SQLite database with schema and migrations
- [ ] Create basic conversation session management
- [ ] Implement message storage and retrieval

### Phase 2: Search Integration (Weeks 2-3)
- [ ] Integrate UnifiedMemory for hybrid search
- [ ] Implement semantic routing with SemanticRouter
- [ ] Add source attribution and formatting
- [ ] Create confidence scoring system

### Phase 3: LLM Integration (Week 3)
- [ ] Implement LLMProvider abstraction
- [ ] Create OpenAI, Anthropic, and local providers
- [ ] Add streaming support
- [ ] Implement token counting and rate limiting

### Phase 4: SONA Learning (Week 4)
- [ ] Integrate SONA trajectory management
- [ ] Implement feedback recording
- [ ] Add session quality assessment
- [ ] Create learning patterns endpoint

### Phase 5: API & Deployment (Week 5)
- [ ] Build Express/Hono API endpoints
- [ ] Add authentication and rate limiting
- [ ] Implement WebSocket for streaming
- [ ] Write integration tests

### Phase 6: Optimization & Polish (Week 6)
- [ ] Performance profiling and optimization
- [ ] Comprehensive error handling
- [ ] Documentation and examples
- [ ] User feedback incorporation

---

## 9. Configuration Examples

### 9.1 Environment Setup

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=anthropic  # openai | anthropic | local
LLM_MODEL=claude-3-5-sonnet-20241022

# Database
DATABASE_PATH=./cortexis.db
VECTOR_DB_PATH=./ruvector.db
GRAPH_DB_PATH=./data

# Search Configuration
SEARCH_DEPTH=medium      # shallow | medium | deep
ENABLE_GNN=true
ENABLE_GRAPH_TRAVERSAL=true

# SONA Learning
ENABLE_SONA=true
SONA_LEARNING_RATE=0.01

# API
PORT=3000
HOST=localhost
```

### 9.2 Session Configuration Examples

```typescript
// Simple retrieval-focused session
const simpleSession: CreateSessionParams = {
  title: 'Quick Lookup',
  model: 'anthropic',
  temperature: 0.3,
  searchDepth: 'shallow',
  enableGNN: false
};

// Deep research session with learning
const researchSession: CreateSessionParams = {
  title: 'Deep Research',
  model: 'anthropic',
  temperature: 0.7,
  searchDepth: 'deep',
  enableGNN: true,
  systemPrompt: `You are a research assistant. Provide comprehensive,
    well-sourced answers with citations to the knowledge base.`
};

// Code-focused session
const codeSession: CreateSessionParams = {
  title: 'Code Helper',
  model: 'openai',
  temperature: 0.2,
  searchDepth: 'medium',
  enableGNN: true,
  systemPrompt: `You are an expert programmer. Provide clear,
    practical code examples with explanations.`
};
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
describe('Confidence Scoring', () => {
  test('single high-quality source', () => {
    const sources: ChatSource[] = [{
      id: 'src-1',
      title: 'Test',
      score: 0.95,
      snippet: 'test',
      gnnBoost: 1.0,
      type: 'vector'
    }];

    const confidence = calculateConfidence(sources);
    expect(confidence.overall).toBeGreaterThan(0.75);
  });

  test('multiple diverse sources', () => {
    const sources: ChatSource[] = [
      { id: 'src-1', title: 'Test1', score: 0.85, snippet: 'test', gnnBoost: 1.0, type: 'vector' },
      { id: 'src-2', title: 'Test2', score: 0.80, snippet: 'test', gnnBoost: 1.0, type: 'graph' }
    ];

    const confidence = calculateConfidence(sources);
    expect(confidence.sourceDiversity).toBeGreaterThan(
      calculateConfidence([sources[0]]).sourceDiversity
    );
  });
});

describe('SONA Learning', () => {
  test('positive feedback increases trajectory quality', async () => {
    const feedback: ChatFeedback = {
      rating: 'good',
      markedAsFactual: true
    };

    const reward = calculateFeedbackReward(feedback);
    expect(reward).toBe(1.0);
  });

  test('negative feedback with correction', () => {
    const feedback: ChatFeedback = {
      rating: 'bad',
      markedAsFactual: false,
      correctedContent: 'correct answer'
    };

    const reward = calculateFeedbackReward(feedback);
    expect(reward).toBeLessThan(-0.2);
  });
});
```

### 10.2 Integration Tests

```typescript
describe('Chat API', () => {
  let db: Database;
  let memory: UnifiedMemory;
  let llmProvider: LLMProvider;

  beforeEach(() => {
    // Setup test database and memory
  });

  test('complete chat flow: query -> search -> generate -> store', async () => {
    const request: ChatRequest = {
      conversationId: 'test-session',
      message: 'What is machine learning?'
    };

    const response = await handleChatMessage(
      db, memory, llmProvider, learningManager, request
    );

    expect(response.text).toBeTruthy();
    expect(response.sources.length).toBeGreaterThan(0);
    expect(response.confidence.overall).toBeGreaterThan(0);
    expect(response.searchTime).toBeGreaterThan(0);
    expect(response.generationTime).toBeGreaterThan(0);
  });

  test('conversation persistence across sessions', async () => {
    // Make multiple requests to same session
    // Verify history retrieval
  });
});
```

---

## 11. Future Enhancements

1. **Multi-turn Context Management**: Implement sliding window context with importance-based summarization for long conversations
2. **Fact-checking Integration**: Add automated fact verification against knowledge base
3. **Citation Generation**: Auto-generate formatted citations (APA, MLA, Chicago)
4. **Conversation Branching**: Support hypothetical branches ("what if...") and rollback
5. **Real-time Collaboration**: WebSocket support for multi-user sessions
6. **Analytics Dashboard**: Session analytics, user behavior tracking, learning progress visualization
7. **Custom Knowledge Integration**: Plug-and-play document ingestion for domain-specific knowledge
8. **Hybrid Prompting**: Integrate prompt caching for faster multi-turn interactions
9. **Safety Guardrails**: Add content moderation and hallucination detection
10. **Knowledge Synthesis**: Auto-generate knowledge summaries and gap detection

---

## Appendix: Class Diagram

```
┌─────────────────────┐
│  ChatMessage        │
├─────────────────────┤
│ id: string          │
│ role: string        │
│ content: string     │
│ sources[]: Source   │
│ confidence: number  │
└──────────┬──────────┘
           │
           │ part of
           │
┌──────────▼──────────┐
│  ChatSession        │
├─────────────────────┤
│ id: string          │
│ title: string       │
│ model: string       │
│ trajectoryId: num   │
└──────────┬──────────┘
           │
           │ uses
           │
┌──────────▼──────────────────────┐
│  UnifiedMemory (Ranger)         │
├─────────────────────────────────┤
│ - vectorStore: VectorStore      │
│ - graphStore: GraphStore        │
│ - cognitive: CognitiveEngine    │
│ + search()                      │
│ + beginTrajectory()             │
└─────────────────────────────────┘
           │
           │ records learning
           │
┌──────────▼──────────────────────┐
│  ChatLearningManager (SONA)     │
├─────────────────────────────────┤
│ - sonaEngine: SONAEngine        │
│ + startLearning()               │
│ + recordTurn()                  │
│ + endLearning()                 │
└─────────────────────────────────┘
           │
           │ generates with
           │
┌──────────▼──────────────────────┐
│  LLMProvider (Abstract)         │
├─────────────────────────────────┤
│ + generate(params): Result      │
│ + stream(params): AsyncGen      │
│ + getMetadata(): Metadata       │
└──────────┬──────────────────────┘
           │
      ┌────┼────┬─────────┐
      │    │    │         │
      ▼    ▼    ▼         ▼
   OpenAI Anthropic Local  Custom
```

---

**Document Version**: 1.0
**Date**: December 2024
**Status**: Design Specification (Ready for Implementation)
