# Cortexis RAG Chat System - Implementation Reference

This document provides concrete code examples and implementation patterns for the RAG chat system described in `RAG_CHAT_SYSTEM_DESIGN.md`.

## Table of Contents

1. [Database Layer](#database-layer)
2. [Chat Service Core](#chat-service-core)
3. [Search Pipeline](#search-pipeline)
4. [LLM Integration](#llm-integration)
5. [SONA Learning Integration](#sona-learning-integration)
6. [API Routes](#api-routes)
7. [Error Handling & Middleware](#error-handling--middleware)
8. [Configuration & Initialization](#configuration--initialization)

---

## Database Layer

### Database Initialization

```typescript
// src/chat/database.ts
import Database from 'better-sqlite3';
import path from 'path';

export class ChatDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './cortexis.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  private initialize(): void {
    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT,
        model TEXT NOT NULL DEFAULT 'anthropic',
        system_prompt TEXT,
        temperature REAL DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 2048,
        search_depth TEXT DEFAULT 'medium',
        enable_gnn INTEGER DEFAULT 1,
        enable_graph_traversal INTEGER DEFAULT 1,
        trajectory_id INTEGER,
        trajectory_quality REAL,
        message_count INTEGER DEFAULT 0,
        total_search_time_ms INTEGER DEFAULT 0,
        total_generation_time_ms INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0,
        archived_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
    `);

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        search_time_ms INTEGER,
        generation_time_ms INTEGER,
        confidence REAL,
        trajectory_id INTEGER,
        FOREIGN KEY (conversation_id) REFERENCES sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `);

    // Sources table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sources (
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

      CREATE INDEX IF NOT EXISTS idx_sources_message_id ON sources(message_id);
    `);

    // Feedback table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        rating TEXT NOT NULL CHECK(rating IN ('good', 'neutral', 'bad')),
        source_helpfulness TEXT,
        comment TEXT,
        marked_as_factual INTEGER,
        corrected_content TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id)
      );

      CREATE INDEX IF NOT EXISTS idx_feedback_message_id ON feedback(message_id);
    `);
  }

  /**
   * Create a new session
   */
  createSession(params: {
    id: string;
    title?: string;
    userId?: string;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    searchDepth?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        id, title, user_id, model, system_prompt, temperature, search_depth
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      params.id,
      params.title ?? null,
      params.userId ?? null,
      params.model ?? 'anthropic',
      params.systemPrompt ?? null,
      params.temperature ?? 0.7,
      params.searchDepth ?? 'medium'
    );
  }

  /**
   * Get session by ID
   */
  getSession(id: string): SessionRecord | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    return stmt.get(id) as SessionRecord | undefined ?? null;
  }

  /**
   * Store a message
   */
  storeMessage(message: ChatMessage): void {
    const stmt = this.db.prepare(`
      INSERT INTO messages (
        id, conversation_id, role, content, created_at,
        search_time_ms, generation_time_ms, confidence, trajectory_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      message.conversationId,
      message.role,
      message.content,
      message.timestamp.toISOString(),
      message.searchTime ?? null,
      message.generationTime ?? null,
      message.confidence ?? null,
      message.trajectoryId ?? null
    );

    // Store sources
    if (message.sources) {
      const sourceStmt = this.db.prepare(`
        INSERT INTO sources (
          id, message_id, source_id, title, score, gnn_boost,
          snippet, source_url, source_type, graph_node_id, graph_path_depth
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const source of message.sources) {
        sourceStmt.run(
          source.id,
          message.id,
          source.id,
          source.title,
          source.score,
          source.gnnBoost ?? 1.0,
          source.snippet ?? null,
          source.source ?? null,
          source.type,
          source.graphContext?.nodeId ?? null,
          source.graphContext?.pathDepth ?? null
        );
      }
    }
  }

  /**
   * Get messages for a conversation
   */
  getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): (MessageRecord & { sources: SourceRecord[] })[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const messages = stmt.all(conversationId, limit, offset) as MessageRecord[];

    // Load sources for each message
    return messages.map(msg => {
      const sourceStmt = this.db.prepare('SELECT * FROM sources WHERE message_id = ?');
      const sources = sourceStmt.all(msg.id) as SourceRecord[];
      return { ...msg, sources };
    });
  }

  /**
   * Store user feedback on a message
   */
  storeFeedback(feedback: ChatFeedback & { messageId: string }): void {
    const stmt = this.db.prepare(`
      INSERT INTO feedback (
        id, message_id, rating, source_helpfulness, comment,
        marked_as_factual, corrected_content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      `feedback-${Date.now()}`,
      feedback.messageId,
      feedback.rating,
      feedback.sourceHelpfulness ? JSON.stringify(feedback.sourceHelpfulness) : null,
      feedback.comment ?? null,
      feedback.markedAsFactual ? 1 : null,
      feedback.correctedContent ?? null,
      new Date().toISOString()
    );
  }

  /**
   * Update session statistics
   */
  updateSessionStats(
    sessionId: string,
    stats: {
      messageCount?: number;
      totalSearchTime?: number;
      totalGenerationTime?: number;
    }
  ): void {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (stats.messageCount !== undefined) {
      updates.push('message_count = ?');
      values.push(stats.messageCount);
    }
    if (stats.totalSearchTime !== undefined) {
      updates.push('total_search_time_ms = total_search_time_ms + ?');
      values.push(stats.totalSearchTime);
    }
    if (stats.totalGenerationTime !== undefined) {
      updates.push('total_generation_time_ms = total_generation_time_ms + ?');
      values.push(stats.totalGenerationTime);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(sessionId);

    const stmt = this.db.prepare(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);
  }

  close(): void {
    this.db.close();
  }
}
```

---

## Chat Service Core

### Main Chat Service

```typescript
// src/chat/chatService.ts
import { v4 as uuidv4 } from 'uuid';
import { UnifiedMemory, HybridSearchOptions } from '../memory/index.js';
import { createSemanticRouter } from '../tools/router.js';
import { createContextFormatter } from '../tools/context.js';
import { ChatDatabase } from './database.js';
import { LLMProvider, LLMProviderFactory } from './llmProvider.js';
import { ChatLearningManager } from './learning.js';

export class ChatService {
  private db: ChatDatabase;
  private memory: UnifiedMemory;
  private llmProvider: LLMProvider;
  private learningManager: ChatLearningManager;
  private contextFormatter = createContextFormatter({
    maxChars: 8000,
    includeScores: true,
    format: 'text'
  });

  constructor(
    db: ChatDatabase,
    memory: UnifiedMemory,
    llmProvider: LLMProvider,
    learningManager: ChatLearningManager
  ) {
    this.db = db;
    this.memory = memory;
    this.llmProvider = llmProvider;
    this.learningManager = learningManager;
  }

  /**
   * Create a new conversation session
   */
  async createSession(params: CreateSessionParams): Promise<ChatSession> {
    const sessionId = uuidv4();
    const now = new Date();

    const session: ChatSession = {
      id: sessionId,
      title: params.title,
      createdAt: now,
      updatedAt: now,
      userId: params.userId,
      model: params.model ?? 'anthropic',
      systemPrompt: params.systemPrompt,
      temperature: params.temperature ?? 0.7,
      maxTokens: 2048,
      searchDepth: params.searchDepth ?? 'medium',
      enableGNN: params.enableGNN ?? true,
      enableGraphTraversal: true,
      messageCount: 0,
      totalSearchTime: 0,
      totalGenerationTime: 0
    };

    this.db.createSession({
      id: sessionId,
      title: params.title,
      userId: params.userId,
      model: session.model,
      systemPrompt: session.systemPrompt,
      temperature: session.temperature,
      searchDepth: session.searchDepth
    });

    // Start SONA trajectory if enabled
    if (params.enableLearning) {
      const trajectoryId = await this.learningManager.startLearning(
        sessionId,
        `Chat session started: ${params.title ?? 'Untitled'}`
      );
      session.trajectoryId = trajectoryId;
    }

    return session;
  }

  /**
   * Send a message and get RAG-enhanced response
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    // Load or validate session
    const sessionRecord = this.db.getSession(request.conversationId);
    if (!sessionRecord) {
      throw new Error(`Session not found: ${request.conversationId}`);
    }

    const session = this.recordToSession(sessionRecord);

    // Store user message
    const userMessageId = uuidv4();
    const userMessage: ChatMessage = {
      id: userMessageId,
      conversationId: request.conversationId,
      role: 'user',
      content: request.message,
      timestamp: new Date()
    };
    this.db.storeMessage(userMessage);

    // Step 1: Semantic routing
    const router = createSemanticRouter();
    const route = router.routeQuery(request.message);

    // Step 2: Hybrid search
    const searchStartTime = Date.now();
    const searchOptions = this.buildSearchOptions(
      session,
      request,
      route
    );

    const searchResults = await this.memory.search(
      request.message,
      searchOptions
    );
    const searchTime = Date.now() - searchStartTime;

    // Step 3: Format context
    const contextBlock = this.contextFormatter.formatAndRender(
      request.message,
      searchResults.map(r => ({
        score: r.combinedScore,
        metadata: {
          title: r.title,
          text: r.text,
          source: r.source
        }
      }))
    );

    // Step 4: Generate response
    const generationStartTime = Date.now();
    const systemPrompt = session.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    let generatedText = '';
    try {
      if (request.stream) {
        // For streaming, we'd handle this differently in the route handler
        // This is simplified for demonstration
        for await (const chunk of this.llmProvider.stream({
          systemPrompt,
          userPrompt: request.message,
          contextBlock,
          temperature: request.temperature ?? session.temperature,
          maxTokens: session.maxTokens
        })) {
          generatedText += chunk;
        }
      } else {
        const result = await this.llmProvider.generate({
          systemPrompt,
          userPrompt: request.message,
          contextBlock,
          temperature: request.temperature ?? session.temperature,
          maxTokens: session.maxTokens
        });
        generatedText = result.text;
      }
    } catch (error) {
      throw new Error(`LLM generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const generationTime = Date.now() - generationStartTime;

    // Step 5: Create source attribution
    const sources: ChatSource[] = searchResults.map((r, idx) => ({
      id: `src-${idx}`,
      title: r.title,
      score: r.vectorScore,
      snippet: r.text.slice(0, 200) + (r.text.length > 200 ? '...' : ''),
      gnnBoost: 1.0,
      source: r.source,
      type: 'vector',
      graphContext: r.relatedNodes ? {
        nodeId: r.id,
        relatedNodeCount: r.relatedNodes.length,
        pathDepth: 1
      } : undefined
    }));

    // Step 6: Calculate confidence
    const confidenceBreakdown = calculateConfidence(sources);

    // Step 7: Create assistant message
    const assistantMessageId = uuidv4();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      conversationId: request.conversationId,
      role: 'assistant',
      content: generatedText,
      sources,
      confidence: confidenceBreakdown.overall,
      searchTime,
      generationTime,
      timestamp: new Date(),
      trajectoryId: session.trajectoryId
    };

    // Step 8: Store message
    this.db.storeMessage(assistantMessage);

    // Step 9: Record for learning
    if (session.trajectoryId) {
      await this.learningManager.recordTurn(
        request.conversationId,
        assistantMessage,
        sources
      );
    }

    // Step 10: Update session stats
    this.db.updateSessionStats(request.conversationId, {
      messageCount: session.messageCount + 1,
      totalSearchTime: searchTime,
      totalGenerationTime: generationTime
    });

    const totalTime = Date.now() - startTime;

    return {
      messageId: assistantMessageId,
      conversationId: request.conversationId,
      text: generatedText,
      sources,
      confidence: confidenceBreakdown,
      searchTime,
      generationTime,
      totalTime,
      tokensUsed: 0, // Would be populated from LLM response
      model: session.model,
      timestamp: new Date()
    };
  }

  /**
   * Get conversation history
   */
  getHistory(request: HistoryRequest): HistoryResponse {
    const session = this.db.getSession(request.conversationId);
    if (!session) {
      throw new Error(`Session not found: ${request.conversationId}`);
    }

    const messageRecords = this.db.getMessages(
      request.conversationId,
      request.limit ?? 50,
      request.offset ?? 0
    );

    const messages: ChatMessage[] = messageRecords.map(record => ({
      id: record.id,
      conversationId: record.conversation_id,
      role: record.role as 'user' | 'assistant' | 'system',
      content: record.content,
      sources: request.includeSources !== false ? record.sources.map(s => ({
        id: s.id,
        title: s.title,
        score: s.score,
        snippet: s.snippet ?? '',
        gnnBoost: s.gnn_boost,
        source: s.source_url ?? undefined,
        type: (s.source_type as 'vector' | 'graph' | 'hybrid') ?? 'vector',
        graphContext: s.graph_node_id ? {
          nodeId: s.graph_node_id,
          relatedNodeCount: 0,
          pathDepth: s.graph_path_depth ?? 1
        } : undefined
      })) : undefined,
      confidence: record.confidence ?? undefined,
      searchTime: record.search_time_ms ?? undefined,
      generationTime: record.generation_time_ms ?? undefined,
      timestamp: new Date(record.created_at),
      trajectoryId: record.trajectory_id ?? undefined
    }));

    return {
      conversationId: request.conversationId,
      session: this.recordToSession(session),
      messages,
      totalMessages: this.getMessageCount(request.conversationId),
      limit: request.limit ?? 50,
      offset: request.offset ?? 0
    };
  }

  /**
   * Record feedback on a message
   */
  recordFeedback(
    messageId: string,
    feedback: ChatFeedback
  ): void {
    this.db.storeFeedback({ ...feedback, messageId });

    // TODO: Update SONA learning with feedback signal
  }

  /**
   * Private helper: build search options based on route and session config
   */
  private buildSearchOptions(
    session: ChatSession,
    request: ChatRequest,
    route: ReturnType<typeof createSemanticRouter>['routeQuery']
  ): HybridSearchOptions {
    const depth = request.searchDepth ?? session.searchDepth;

    const baseOptions: HybridSearchOptions = {
      k: depth === 'deep' ? 15 : (depth === 'shallow' ? 5 : 10),
      vectorWeight: 0.7,
      includeRelated: request.enableGraphTraversal ?? session.enableGraphTraversal,
      graphDepth: depth === 'deep' ? 2 : 1,
      rerank: request.enableGNN ?? session.enableGNN
    };

    return baseOptions;
  }

  /**
   * Private helper: convert database record to session object
   */
  private recordToSession(record: SessionRecord): ChatSession {
    return {
      id: record.id,
      title: record.title ?? undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      userId: record.user_id ?? undefined,
      model: record.model,
      systemPrompt: record.system_prompt ?? undefined,
      temperature: record.temperature,
      maxTokens: record.max_tokens,
      searchDepth: (record.search_depth as 'shallow' | 'medium' | 'deep') || 'medium',
      enableGNN: record.enable_gnn === 1,
      enableGraphTraversal: record.enable_graph_traversal === 1,
      trajectoryId: record.trajectory_id ?? undefined,
      trajectoryQuality: record.trajectory_quality ?? undefined,
      messageCount: record.message_count,
      totalSearchTime: record.total_search_time_ms,
      totalGenerationTime: record.total_generation_time_ms
    };
  }

  private getMessageCount(conversationId: string): number {
    // Implementation would query database
    return 0; // Placeholder
  }
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful research assistant powered by a knowledge graph.
Your role is to provide accurate, well-sourced answers based on the retrieved context.
Always cite your sources and acknowledge when information comes from the knowledge base.
Be honest about limitations and uncertainty in your knowledge.`;
```

---

## Search Pipeline

### Search Orchestration

```typescript
// src/chat/search.ts
import { UnifiedMemory, HybridSearchOptions } from '../memory/index.js';
import { RoutingDecision } from '../tools/router.js';

export interface SearchContext {
  query: string;
  routing: RoutingDecision;
  options: HybridSearchOptions;
  startTime: number;
}

export interface SearchResults {
  query: string;
  results: SearchResult[];
  routing: RoutingDecision;
  timing: {
    routing: number;
    search: number;
    total: number;
  };
  stats: {
    vectorResultsCount: number;
    graphResultsCount: number;
    rerankedCount: number;
  };
}

/**
 * Execute complete search pipeline
 */
export async function executeSearch(
  memory: UnifiedMemory,
  query: string,
  options: HybridSearchOptions,
  routing: RoutingDecision
): Promise<SearchResults> {
  const overallStart = Date.now();
  const searchStart = Date.now();

  // Execute hybrid search with timing
  const results = await memory.search(query, options);

  const searchTime = Date.now() - searchStart;
  const totalTime = Date.now() - overallStart;

  return {
    query,
    results,
    routing,
    timing: {
      routing: 0, // Routing was done before calling this
      search: searchTime,
      total: totalTime
    },
    stats: {
      vectorResultsCount: results.filter(r => r.type === 'vector').length,
      graphResultsCount: results.filter(r => r.type === 'graph').length,
      rerankedCount: results.filter(r => r.gnnBoost && r.gnnBoost > 1.0).length
    }
  };
}
```

---

## LLM Integration

### LLM Provider Implementations

```typescript
// src/chat/llmProvider.ts
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export interface GenerateParams {
  systemPrompt: string;
  userPrompt: string;
  contextBlock?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  extractCertainty?: boolean;
}

export interface GenerateResult {
  text: string;
  tokensUsed?: number;
  certainty?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface LLMProvider {
  generate(params: GenerateParams): Promise<GenerateResult>;
  stream(params: GenerateParams): AsyncGenerator<string>;
  getMetadata(): LLMMetadata;
}

export interface LLMMetadata {
  name: string;
  type: 'openai' | 'anthropic' | 'local' | 'custom';
  maxContextWindow: number;
  supportedModels: string[];
}

/**
 * Anthropic Claude provider
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const userContent = params.contextBlock
      ? `<context>\n${params.contextBlock}\n</context>\n\nQuestion: ${params.userPrompt}`
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

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens
    };
  }

  async *stream(params: GenerateParams): AsyncGenerator<string> {
    const userContent = params.contextBlock
      ? `<context>\n${params.contextBlock}\n</context>\n\nQuestion: ${params.userPrompt}`
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
      name: 'Anthropic Claude',
      type: 'anthropic',
      maxContextWindow: 200000,
      supportedModels: [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-haiku-20240307'
      ]
    };
  }
}

/**
 * OpenAI GPT provider
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const userContent = params.contextBlock
      ? `${params.contextBlock}\n\nQuestion: ${params.userPrompt}`
      : params.userPrompt;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2048
    });

    const text = response.choices[0]?.message?.content ?? '';

    return {
      text,
      tokensUsed: response.usage?.total_tokens,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens
    };
  }

  async *stream(params: GenerateParams): AsyncGenerator<string> {
    const userContent = params.contextBlock
      ? `${params.contextBlock}\n\nQuestion: ${params.userPrompt}`
      : params.userPrompt;

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: userContent }
      ],
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
 * Provider factory
 */
export class LLMProviderFactory {
  static createProvider(config: {
    type: 'openai' | 'anthropic' | 'local';
    apiKey?: string;
    model?: string;
    endpoint?: string;
  }): LLMProvider {
    switch (config.type) {
      case 'openai': {
        if (!config.apiKey) throw new Error('OpenAI API key required');
        return new OpenAIProvider(config.apiKey, config.model);
      }
      case 'anthropic': {
        if (!config.apiKey) throw new Error('Anthropic API key required');
        return new AnthropicProvider(config.apiKey, config.model);
      }
      case 'local':
        throw new Error('Local LLM provider not yet implemented');
      default:
        throw new Error(`Unknown LLM type: ${config.type}`);
    }
  }
}
```

---

## SONA Learning Integration

### Learning Manager

```typescript
// src/chat/learning.ts
import { UnifiedMemory } from '../memory/index.js';
import { ChatSource, ChatMessage, ChatFeedback, ChatSession } from './types.js';

export class ChatLearningManager {
  private memory: UnifiedMemory;
  private trajectoryMap: Map<string, number> = new Map();

  constructor(memory: UnifiedMemory) {
    this.memory = memory;
  }

  /**
   * Start a learning trajectory for a new chat session
   */
  async startLearning(sessionId: string, initialQuery: string): Promise<number> {
    const trajectoryId = await this.memory.beginTrajectory(initialQuery, {
      route: 'cortexis-chat'
    });

    if (trajectoryId !== null) {
      this.trajectoryMap.set(sessionId, trajectoryId);
    }

    return trajectoryId ?? -1;
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
    if (trajectoryId === undefined) return;

    // Build step description
    const sourceDesc = sources
      .map(s => `${s.title} (${(s.score * 100).toFixed(1)}%)`)
      .join('; ');

    const stepText = [
      `Query: ${message.content}`,
      `Sources: ${sourceDesc}`,
      `Confidence: ${(message.confidence ? message.confidence * 100 : 0).toFixed(1)}%`
    ].join(' | ');

    // Calculate reward from feedback or use confidence
    let reward = message.confidence ?? 0.5;
    if (userFeedback) {
      reward = this.calculateFeedbackReward(userFeedback);
    }

    // Record step in SONA
    await this.memory.recordStep(trajectoryId, stepText, reward);
  }

  /**
   * End learning trajectory
   */
  endLearning(sessionId: string, messages: ChatMessage[]): void {
    const trajectoryId = this.trajectoryMap.get(sessionId);
    if (trajectoryId === undefined) return;

    const quality = this.assessSessionQuality(messages);
    this.memory.endTrajectory(trajectoryId, quality);
    this.trajectoryMap.delete(sessionId);
  }

  /**
   * Find patterns learned from similar queries
   */
  async findPatterns(query: string, k: number = 5) {
    return this.memory.findPatterns(query, k);
  }

  /**
   * Calculate reward from feedback
   */
  private calculateFeedbackReward(feedback: ChatFeedback): number {
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
        reward = -0.5;
        break;
    }

    // Adjust for source helpfulness
    if (feedback.sourceHelpfulness) {
      const scores = Object.values(feedback.sourceHelpfulness);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      reward = reward * 0.7 + (avgScore - 0.5) * 0.3;
    }

    // Strong signal for factual errors
    if (feedback.markedAsFactual === false && feedback.correctedContent) {
      reward = Math.min(reward, -0.3);
    }

    return Math.max(-1, Math.min(1, reward));
  }

  /**
   * Assess overall session quality
   */
  private assessSessionQuality(messages: ChatMessage[]): number {
    let quality = 0.5;

    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) return quality;

    // Reward high confidence responses
    const avgConfidence = assistantMessages.reduce(
      (sum, m) => sum + (m.confidence ?? 0.5), 0
    ) / assistantMessages.length;
    quality += (avgConfidence - 0.5) * 0.3;

    // Reward source diversity
    const totalSources = assistantMessages.reduce(
      (sum, m) => sum + (m.sources?.length ?? 0), 0
    );
    const avgSources = totalSources / assistantMessages.length;
    quality += Math.min((avgSources / 5) * 0.2, 0.2);

    return Math.max(0, Math.min(1, quality));
  }
}
```

---

## API Routes

### Express/Hono Integration

```typescript
// src/routes/chat.ts
import { Router, Request, Response } from 'express';
import { ChatService } from '../chat/chatService.js';
import { ChatRequest, ChatResponse } from '../chat/types.js';

export function createChatRoutes(chatService: ChatService): Router {
  const router = Router();

  /**
   * POST /chat - Send message and get RAG response
   */
  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const request: ChatRequest = req.body;

      // Validate required fields
      if (!request.conversationId || !request.message) {
        return res.status(400).json({
          error: 'Missing required fields: conversationId, message'
        });
      }

      // Handle streaming response
      if (request.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Generate response with streaming
        const baseResponse = await chatService.chat({
          ...request,
          stream: false
        });

        // Send initial metadata
        res.write(`data: ${JSON.stringify({
          type: 'metadata',
          messageId: baseResponse.messageId,
          timestamp: baseResponse.timestamp
        })}\n\n`);

        // Stream text in chunks
        const chunkSize = 30;
        for (let i = 0; i < baseResponse.text.length; i += chunkSize) {
          res.write(`data: ${JSON.stringify({
            type: 'text',
            content: baseResponse.text.slice(i, i + chunkSize)
          })}\n\n`);
        }

        // Send sources
        res.write(`data: ${JSON.stringify({
          type: 'sources',
          sources: baseResponse.sources
        })}\n\n`);

        // Send metadata
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          confidence: baseResponse.confidence,
          searchTime: baseResponse.searchTime,
          generationTime: baseResponse.generationTime
        })}\n\n`);

        return res.end();
      }

      // Non-streaming response
      const response = await chatService.chat(request);
      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /chat/history - Get conversation history
   */
  router.get('/chat/history', (req: Request, res: Response) => {
    try {
      const { conversationId, limit = 50, offset = 0 } = req.query;

      if (!conversationId || typeof conversationId !== 'string') {
        return res.status(400).json({
          error: 'Missing required parameter: conversationId'
        });
      }

      const history = chatService.getHistory({
        conversationId,
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
        includeSources: true
      });

      res.json(history);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /chat/session - Create new session
   */
  router.post('/chat/session', async (req: Request, res: Response) => {
    try {
      const params = req.body;
      const session = await chatService.createSession(params);
      res.json(session);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /chat/feedback - Record feedback on a message
   */
  router.post('/chat/feedback', (req: Request, res: Response) => {
    try {
      const { messageId, rating, comment, sourceHelpfulness } = req.body;

      chatService.recordFeedback(messageId, {
        rating,
        comment,
        sourceHelpfulness
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
```

---

## Error Handling & Middleware

### Error Handler

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function createErrorHandler() {
  return (error: ApiError, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      path: req.path,
      method: req.method
    });

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    const code = error.code || 'INTERNAL_ERROR';

    res.status(statusCode).json({
      error: {
        message,
        code,
        timestamp: new Date().toISOString()
      }
    });
  };
}

export class ChatError extends Error implements ApiError {
  statusCode: number;
  code: string;

  constructor(message: string, code: string = 'CHAT_ERROR', statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class SessionNotFoundError extends ChatError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND', 404);
  }
}

export class LLMError extends ChatError {
  constructor(message: string) {
    super(`LLM Error: ${message}`, 'LLM_ERROR', 503);
  }
}
```

---

## Configuration & Initialization

### Application Bootstrap

```typescript
// src/app.ts
import 'dotenv/config';
import express from 'express';
import { createUnifiedMemory } from './memory/index.js';
import { ChatDatabase } from './chat/database.js';
import { ChatService } from './chat/chatService.js';
import { ChatLearningManager } from './chat/learning.js';
import { LLMProviderFactory } from './chat/llmProvider.js';
import { createChatRoutes } from './routes/chat.js';
import { createErrorHandler } from './middleware/errorHandler.js';

export async function createApp() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb' }));

  // Initialize components
  const db = new ChatDatabase(process.env.DATABASE_PATH || './cortexis.db');
  const memory = createUnifiedMemory();

  const llmProvider = LLMProviderFactory.createProvider({
    type: (process.env.LLM_PROVIDER as 'openai' | 'anthropic' | 'local') || 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    model: process.env.LLM_MODEL
  });

  const learningManager = new ChatLearningManager(memory);
  const chatService = new ChatService(db, memory, llmProvider, learningManager);

  // Routes
  app.use('/', createChatRoutes(chatService));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      llm: llmProvider.getMetadata()
    });
  });

  // Error handler (must be last)
  app.use(createErrorHandler());

  return { app, db, memory, chatService };
}

// Server startup
if (import.meta.main) {
  const PORT = parseInt(process.env.PORT || '3000');

  createApp().then(({ app }) => {
    app.listen(PORT, () => {
      console.log(`Cortexis RAG Chat Server listening on port ${PORT}`);
    });
  }).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
```

---

This implementation reference provides concrete examples for all major components of the RAG chat system. Developers should adapt these patterns to their specific needs and integrate with the existing Ranger infrastructure.
