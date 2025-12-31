import { ChatConversation, ChatMessage, ChatOptions, ChatResponse, ChatFeedback, ChatChunk, Pagination } from './types';
import { ContextBuilder } from './context';
import { ToughLoveEngine } from './tough-love';
import { SYSTEM_PROMPTS, formatWithSources, generateFollowUps } from './prompts';
import { db } from '../../infrastructure/db';
import { UnifiedMemory } from '../../infrastructure/unified-memory';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Enhanced Chat Service
 * Implements RAG-based chat with relationship context and tough love mode
 */
export class EnhancedChatService {
  private anthropic: Anthropic;
  private contextBuilder: ContextBuilder;
  private toughLoveEngine: ToughLoveEngine;
  private memory: UnifiedMemory;

  constructor(
    contextBuilder: ContextBuilder,
    toughLoveEngine: ToughLoveEngine,
    memory: UnifiedMemory,
    anthropicApiKey: string
  ) {
    this.contextBuilder = contextBuilder;
    this.toughLoveEngine = toughLoveEngine;
    this.memory = memory;
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<ChatConversation[]> {
    const conversations = await db('chat_conversations')
      .where('user_id', userId)
      .orderBy('last_message_at', 'desc')
      .select('*');

    return conversations;
  }

  /**
   * Get a specific conversation (A6: Missing endpoint)
   */
  async getConversation(userId: string, conversationId: string): Promise<ChatConversation | null> {
    const conversation = await db('chat_conversations')
      .where('id', conversationId)
      .where('user_id', userId)
      .first();

    return conversation || null;
  }

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title?: string): Promise<ChatConversation> {
    const [conversation] = await db('chat_conversations')
      .insert({
        user_id: userId,
        title: title || 'New Conversation',
        message_count: 0,
        tags: [],
        related_systems: [],
      })
      .returning('*');

    return conversation;
  }

  /**
   * Update conversation metadata (A7: Missing endpoint)
   */
  async updateConversation(
    userId: string,
    conversationId: string,
    updates: Partial<ChatConversation>
  ): Promise<ChatConversation> {
    // Only allow updating specific fields
    const allowedUpdates = {
      title: updates.title,
      tags: updates.tags,
    };

    const [updated] = await db('chat_conversations')
      .where('id', conversationId)
      .where('user_id', userId)
      .update({
        ...allowedUpdates,
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!updated) {
      throw new Error('Conversation not found or access denied');
    }

    return updated;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    await db('chat_conversations')
      .where('id', conversationId)
      .where('user_id', userId)
      .delete();
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    userId: string,
    conversationId: string,
    pagination?: Pagination
  ): Promise<ChatMessage[]> {
    const query = db('chat_messages')
      .where('conversation_id', conversationId)
      .where('user_id', userId)
      .orderBy('created_at', 'asc');

    if (pagination) {
      query
        .limit(pagination.limit || 50)
        .offset(pagination.offset || 0);
    }

    const messages = await query.select('*');
    return messages;
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    // 1. Save user message
    const [userMessage] = await db('chat_messages').insert({
      user_id: userId,
      conversation_id: conversationId,
      type: 'user',
      content,
    }).returning('*');

    // 2. Build user context
    const userContext = await this.contextBuilder.buildUserContext(userId);

    // 3. Build search context
    const searchContext = await this.contextBuilder.buildSearchContext(
      userId,
      content,
      {
        systemIds: options.systemIds,
        maxResults: 8,
      }
    );

    // 4. Get conversation history if requested
    let history: ChatMessage[] = [];
    if (options.includeHistory) {
      history = await this.getMessages(userId, conversationId);
      history = history.slice(-options.includeHistory);
    }

    // 5. Check if tough love mode should activate
    const toughLoveDecision = await this.toughLoveEngine.shouldActivate(
      userId,
      content,
      history
    );

    const activateToughLove = options.toughLoveMode ?? toughLoveDecision.activate;

    // 6. Build system prompt
    let systemPrompt = SYSTEM_PROMPTS.standard;

    if (activateToughLove) {
      systemPrompt = SYSTEM_PROMPTS.toughLove;
    } else if (options.mentorPersona) {
      const mentor = userContext.mentors.find(m => m.id === options.mentorPersona);
      if (mentor) {
        systemPrompt = SYSTEM_PROMPTS.withMentor(mentor);
      }
    }

    // Add user context
    systemPrompt += '\n\n' + SYSTEM_PROMPTS.withContext(userContext);

    // 7. Format context for LLM
    const contextText = this.contextBuilder.formatContextForLLM(searchContext, userContext);

    // 8. Prepare messages for Claude
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    if (history.length > 0) {
      history.forEach(msg => {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      });
    }

    // Add current question with context
    messages.push({
      role: 'user',
      content: `${contextText}\n\nQuestion: ${content}`,
    });

    // 9. Call Claude API
    const response = await this.anthropic.messages.create({
      model: process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '4096'),
      system: systemPrompt,
      messages,
    });

    const assistantContent = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // 10. Format sources
    const sources = this.contextBuilder.formatSourceCitations(searchContext.relevantContent);

    // 11. Generate follow-ups
    const suggestedFollowUps = generateFollowUps(assistantContent, searchContext);

    // 12. Save assistant message
    const [assistantMessage] = await db('chat_messages').insert({
      user_id: userId,
      conversation_id: conversationId,
      type: 'assistant',
      content: assistantContent,
      sources: JSON.stringify(sources),
      is_tough_love: activateToughLove,
      tough_love_reasons: activateToughLove ? toughLoveDecision.triggeredPatterns : null,
      confidence: searchContext.confidence || 0.5,
      synthesized_from: sources.length,
      includes_external: sources.some(s => s.type === 'external'),
    }).returning('*');

    // 13. Track metrics
    const latency = Date.now() - startTime;
    await this.trackMetrics(assistantMessage, latency);

    return {
      message: assistantMessage,
      sources,
      suggestedFollowUps,
    };
  }

  /**
   * Stream a message response (Server-Sent Events)
   */
  async *streamMessage(
    userId: string,
    conversationId: string,
    content: string,
    options: ChatOptions = {}
  ): AsyncGenerator<ChatChunk> {
    const startTime = Date.now();

    // 1. Save user message
    const [userMessage] = await db('chat_messages').insert({
      user_id: userId,
      conversation_id: conversationId,
      type: 'user',
      content,
    }).returning('*');

    yield { type: 'start', conversationId, messageId: userMessage.id };

    // 2. Build contexts (same as sendMessage)
    const userContext = await this.contextBuilder.buildUserContext(userId);
    const searchContext = await this.contextBuilder.buildSearchContext(
      userId,
      content,
      { systemIds: options.systemIds, maxResults: 8 }
    );

    // 3. Stream sources first
    const sources = this.contextBuilder.formatSourceCitations(searchContext.relevantContent);
    for (const source of sources) {
      yield { type: 'source', source };
    }

    // 4. Check tough love
    let history: ChatMessage[] = [];
    if (options.includeHistory) {
      history = await this.getMessages(userId, conversationId);
      history = history.slice(-options.includeHistory);
    }

    const toughLoveDecision = await this.toughLoveEngine.shouldActivate(userId, content, history);
    const activateToughLove = options.toughLoveMode ?? toughLoveDecision.activate;

    // 5. Build prompt
    let systemPrompt = activateToughLove ? SYSTEM_PROMPTS.toughLove : SYSTEM_PROMPTS.standard;
    if (options.mentorPersona && !activateToughLove) {
      const mentor = userContext.mentors.find(m => m.id === options.mentorPersona);
      if (mentor) systemPrompt = SYSTEM_PROMPTS.withMentor(mentor);
    }
    systemPrompt += '\n\n' + SYSTEM_PROMPTS.withContext(userContext);

    const contextText = this.contextBuilder.formatContextForLLM(searchContext, userContext);

    // 6. Prepare messages
    const messages: Anthropic.MessageParam[] = [];
    if (history.length > 0) {
      history.forEach(msg => {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      });
    }
    messages.push({
      role: 'user',
      content: `${contextText}\n\nQuestion: ${content}`,
    });

    // 7. Stream from Claude
    let fullContent = '';
    const stream = await this.anthropic.messages.stream({
      model: process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '4096'),
      system: systemPrompt,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullContent += chunk.delta.text;
        yield { type: 'content', delta: chunk.delta.text };
      }
    }

    // 8. Save assistant message
    const [assistantMessage] = await db('chat_messages').insert({
      user_id: userId,
      conversation_id: conversationId,
      type: 'assistant',
      content: fullContent,
      sources: JSON.stringify(sources),
      is_tough_love: activateToughLove,
      tough_love_reasons: activateToughLove ? toughLoveDecision.triggeredPatterns : null,
      confidence: searchContext.confidence || 0.5,
      synthesized_from: sources.length,
      includes_external: sources.some(s => s.type === 'external'),
    }).returning('*');

    // 9. Generate follow-ups
    const suggestedFollowUps = generateFollowUps(fullContent, searchContext);

    // 10. Complete
    const latency = Date.now() - startTime;
    await this.trackMetrics(assistantMessage, latency);

    yield {
      type: 'complete',
      metadata: {
        messageId: assistantMessage.id,
        confidence: searchContext.confidence || 0.5,
        sourceCount: sources.length,
        isToughLove: activateToughLove,
        suggestedFollowUps,
      },
    };
  }

  /**
   * Provide feedback on a message
   */
  async provideFeedback(
    userId: string,
    messageId: string,
    feedback: ChatFeedback
  ): Promise<void> {
    await db('chat_messages')
      .where('id', messageId)
      .where('user_id', userId)
      .update({
        feedback: feedback.rating,
        feedback_note: feedback.note,
      });

    // Store in memory for learning
    await this.memory.store('chat/feedback', messageId, {
      rating: feedback.rating,
      note: feedback.note,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track response metrics
   */
  private async trackMetrics(message: ChatMessage, latency: number): Promise<void> {
    const sources = message.sources ? JSON.parse(message.sources) : [];
    const wordCount = message.content.split(/\s+/).length;
    const citationCount = (message.content.match(/\[\d+\]/g) || []).length;

    const sourceRelevance = sources.length > 0
      ? sources.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / sources.length
      : 0;

    const uniqueSystems = new Set(sources.map((s: any) => s.subSystemName)).size;
    const sourceDiversity = sources.length > 0 ? uniqueSystems / sources.length : 0;

    const externalCount = sources.filter((s: any) => s.type === 'external').length;
    const externalUsage = sources.length > 0 ? externalCount / sources.length : 0;

    const citationDensity = wordCount > 0 ? (citationCount / wordCount) * 100 : 0;

    await db('chat_quality_metrics').insert({
      message_id: message.id,
      source_relevance: sourceRelevance,
      source_diversity: sourceDiversity,
      external_usage: externalUsage,
      citation_density: citationDensity,
      time_to_response: latency,
    });
  }
}
