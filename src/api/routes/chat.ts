/**
 * Chat Routes
 *
 * Handles RAG-based chat functionality with source citations.
 * @module api/routes/chat
 */
import { Router, Request, Response, NextFunction } from 'express';
import { UnifiedMemory } from '../../memory/index.js';
import { CollectionManager } from '../../memory/collections.js';
import { APIException } from '../middleware/error.js';
import {
  ChatRequest,
  ChatResponse,
  ChatMessage,
  ChatSource
} from '../types.js';

// ============================================================================
// In-Memory Conversation Store
// ============================================================================

interface Conversation {
  id: string;
  messages: ChatMessage[];
  collection?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Simple in-memory store (would be replaced with persistent storage in production)
const conversationStore = new Map<string, Conversation>();

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create chat router
 *
 * @param memory - UnifiedMemory instance
 * @param collectionManager - CollectionManager instance
 * @returns Express router
 */
export function createChatRouter(
  memory: UnifiedMemory,
  collectionManager: CollectionManager
): Router {
  const router = Router();

  /**
   * POST /chat
   * Send a chat message for RAG-based response
   */
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, collection, conversationId } = req.body as ChatRequest;

      // Validate message
      if (!message || typeof message !== 'string') {
        throw new APIException(400, 'MISSING_FIELD', 'Message is required');
      }

      const startTime = Date.now();

      // Get or create conversation
      let conversation: Conversation;
      const convId = conversationId || generateId();

      if (conversationId && conversationStore.has(conversationId)) {
        conversation = conversationStore.get(conversationId)!;
      } else {
        conversation = {
          id: convId,
          messages: [],
          collection,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        conversationStore.set(convId, conversation);
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      conversation.messages.push(userMessage);

      // Perform semantic search to find relevant context
      const searchStartTime = Date.now();

      // Search in specified collection or all collections
      const searchResults = await memory.search(message, {
        k: 5,
        rerank: true
      });

      const searchTime = Date.now() - searchStartTime;

      // Build sources from search results
      const sources: ChatSource[] = searchResults.map(result => {
        const text = (result.text || '').trim();
        // Generate a meaningful title - use actual title, source filename, or generic label
        let displayTitle = result.title;
        if (!displayTitle || displayTitle === '(untitled)') {
          if (result.source) {
            const filename = result.source.split(/[/\\]/).pop();
            displayTitle = filename || 'Document';
          } else {
            displayTitle = 'Document';
          }
        }
        return {
          id: result.id,
          title: displayTitle,
          score: result.combinedScore,
          snippet: text.length > 0
            ? text.substring(0, 200) + (text.length > 200 ? '...' : '')
            : '(No content available)',
          gnnBoost: result.graphScore ? Math.round(result.graphScore * 100) : 0
        };
      });

      // Build context from search results (use improved titles)
      const contextParts = searchResults.map((result, index) => {
        let ctxTitle = result.title;
        if (!ctxTitle || ctxTitle === '(untitled)') {
          if (result.source) {
            const filename = result.source.split(/[/\\]/).pop();
            ctxTitle = filename || 'Document';
          } else {
            ctxTitle = 'Document';
          }
        }
        return `[Source ${index + 1}] ${ctxTitle}:\n${result.text || ''}`;
      });
      const context = contextParts.join('\n\n---\n\n');

      // Generate response based on context
      // For MVP, we create a structured response based on found sources
      // In production, this would use an LLM to generate a natural response
      let responseContent: string;
      let confidence: number;

      if (searchResults.length === 0) {
        responseContent = "I couldn't find any relevant information in the knowledge base to answer your question. Please try rephrasing your query or ensure the relevant documents have been uploaded.";
        confidence = 0;
      } else {
        // Build a synthesized response from the top sources
        const topSource = searchResults[0];
        // Lower threshold for n-gram embeddings which typically score 0.35-0.55
        const relevantSources = searchResults.filter(r => r.combinedScore > 0.4);

        // Helper to get a meaningful display title
        const getDisplayTitle = (result: typeof topSource): string => {
          if (!result) return 'Document';
          // Use title if available and not the fallback value
          if (result.title && result.title !== '(untitled)') {
            return result.title;
          }
          // Fall back to source filename if available
          if (result.source) {
            const filename = result.source.split(/[/\\]/).pop();
            if (filename) return filename;
          }
          return 'Document';
        };

        if (relevantSources.length > 0) {
          const topText = (topSource?.text || '').trim();
          const displayTitle = getDisplayTitle(topSource);

          if (topText.length > 0) {
            responseContent = `Based on the knowledge base, here's what I found:\n\n`;
            responseContent += `**${displayTitle}**\n\n${topText.substring(0, 500)}${topText.length > 500 ? '...' : ''}`;

            if (relevantSources.length > 1) {
              responseContent += `\n\n*Additional relevant sources found: ${relevantSources.length - 1}*`;
            }
          } else {
            // Handle case where text content is empty
            responseContent = `I found a matching document titled "${displayTitle}", but the content appears to be empty or unavailable.`;
            if (relevantSources.length > 1) {
              responseContent += `\n\n*${relevantSources.length - 1} additional sources were also found.*`;
            }
          }

          confidence = topSource?.combinedScore || 0;
        } else {
          // Low confidence results
          const topText = (topSource?.text || '').trim();
          const displayTitle = getDisplayTitle(topSource);

          if (topText.length > 0) {
            responseContent = `I found some potentially related information, but the relevance is low:\n\n`;
            responseContent += `**${displayTitle}**\n\n${topText.substring(0, 300)}${topText.length > 300 ? '...' : ''}`;
            responseContent += `\n\n*Note: This information may not directly answer your question.*`;
          } else {
            responseContent = `I found a document titled "${displayTitle}" with low relevance, but its content is unavailable.`;
            responseContent += `\n\n*Note: This result may not be relevant to your question.*`;
          }
          confidence = topSource?.combinedScore || 0;
        }
      }

      const generationTime = Date.now() - startTime - searchTime;

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: responseContent,
        sources: sources.length > 0 ? sources : undefined,
        confidence,
        searchTime,
        generationTime,
        timestamp: new Date()
      };
      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date();

      // Record search metrics if collection specified
      if (collection && collection !== 'all') {
        try {
          const avgGnnBoost = sources.length > 0
            ? sources.reduce((sum, s) => sum + s.gnnBoost, 0) / sources.length / 100
            : 0;
          collectionManager.recordSearchMetric(collection, searchTime, avgGnnBoost);
        } catch {
          // Ignore metric recording errors
        }
      }

      const response: ChatResponse = {
        message: assistantMessage,
        conversationId: convId
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /chat/history
   * Get chat history, optionally filtered by conversation ID
   */
  router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.query;

      if (id && typeof id === 'string') {
        // Return specific conversation
        const conversation = conversationStore.get(id);
        if (!conversation) {
          throw new APIException(404, 'NOT_FOUND', `Conversation '${id}' not found`);
        }
        res.json(conversation.messages);
      } else {
        // Return all conversations (messages flattened)
        const allMessages: ChatMessage[] = [];
        for (const conversation of conversationStore.values()) {
          allMessages.push(...conversation.messages);
        }
        // Sort by timestamp, most recent first
        allMessages.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        res.json(allMessages);
      }
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /chat/history/:id
   * Delete a conversation by ID
   */
  router.delete('/history/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!conversationStore.has(id)) {
        throw new APIException(404, 'NOT_FOUND', `Conversation '${id}' not found`);
      }

      conversationStore.delete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /chat/conversations
   * List all conversations (metadata only)
   */
  router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversations = Array.from(conversationStore.values()).map(conv => ({
        id: conv.id,
        messageCount: conv.messages.length,
        collection: conv.collection,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        preview: conv.messages[0]?.content.substring(0, 100) || ''
      }));

      // Sort by most recently updated
      conversations.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      res.json(conversations);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
