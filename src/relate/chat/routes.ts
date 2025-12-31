import { Router, Request, Response } from 'express';
import { EnhancedChatService } from './service';
import { ContextBuilder } from './context';
import { ToughLoveEngine } from './tough-love';
import { UnifiedMemory } from '../../infrastructure/unified-memory';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Initialize services
const memory = new UnifiedMemory();
const contextBuilder = new ContextBuilder(memory);
const toughLoveEngine = new ToughLoveEngine(memory);
const chatService = new EnhancedChatService(
  contextBuilder,
  toughLoveEngine,
  memory,
  process.env.ANTHROPIC_API_KEY!
);

/**
 * GET /conversations
 * List all conversations for authenticated user
 */
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversations = await chatService.getConversations(userId);

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
    });
  }
});

/**
 * POST /conversations
 * Create a new conversation
 */
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title } = req.body;

    const conversation = await chatService.createConversation(userId, title);

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
    });
  }
});

/**
 * GET /conversations/:id (A6: NEW ENDPOINT)
 * Get a specific conversation
 */
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;

    const conversation = await chatService.getConversation(userId, conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation',
    });
  }
});

/**
 * PUT /conversations/:id (A7: NEW ENDPOINT)
 * Update conversation metadata
 */
router.put('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;
    const updates = req.body;

    const conversation = await chatService.updateConversation(
      userId,
      conversationId,
      updates
    );

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error updating conversation:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update conversation',
    });
  }
});

/**
 * DELETE /conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;

    await chatService.deleteConversation(userId, conversationId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
    });
  }
});

/**
 * GET /conversations/:id/messages
 * Get messages for a conversation
 */
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await chatService.getMessages(userId, conversationId, {
      limit,
      offset,
    });

    res.json({
      success: true,
      data: messages,
      pagination: {
        limit,
        offset,
        total: messages.length,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
    });
  }
});

/**
 * POST /conversations/:id/messages
 * Send a message (with optional SSE streaming)
 */
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;
    const { message, options = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message content is required',
      });
    }

    // Check if streaming is requested
    const streaming = req.query.stream === 'true' || options.streaming === true;

    if (streaming) {
      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      try {
        const stream = chatService.streamMessage(userId, conversationId, message, options);

        for await (const chunk of stream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: streamError instanceof Error ? streamError.message : 'Streaming failed',
        })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming response
      const response = await chatService.sendMessage(userId, conversationId, message, options);

      res.status(201).json({
        success: true,
        data: response,
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
});

/**
 * POST /conversations/:id/feedback
 * Provide feedback on a message
 */
router.post('/conversations/:id/feedback', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { messageId, rating, note } = req.body;

    if (!messageId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'messageId and rating are required',
      });
    }

    if (!['positive', 'negative'].includes(rating)) {
      return res.status(400).json({
        success: false,
        error: 'rating must be "positive" or "negative"',
      });
    }

    await chatService.provideFeedback(userId, messageId, {
      rating,
      note,
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error providing feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to provide feedback',
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'chat',
    timestamp: new Date().toISOString(),
  });
});

export default router;
