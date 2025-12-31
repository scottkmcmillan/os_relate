import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { createChatRouter } from '../../../src/api/routes/chat.js';
import { UnifiedMemory } from '../../../src/memory/index.js';
import { CollectionManager, createCollectionManager } from '../../../src/memory/collections.js';
import { errorHandler } from '../../../src/api/middleware/error.js';

/**
 * Chat API Route Tests
 *
 * Tests for the POST /chat and GET /chat/history endpoints
 */
describe('Chat API Routes', () => {
  let app: Express;
  let memory: UnifiedMemory;
  let collectionManager: CollectionManager;

  beforeAll(() => {
    // Initialize memory and collection manager
    memory = new UnifiedMemory({
      vectorConfig: { storagePath: ':memory:' },
      graphDataDir: './data',
      enableCognitive: false
    });
    collectionManager = createCollectionManager('./data', memory.getGraphStore());

    // Set up Express app with chat router
    app = express();
    app.use(express.json());
    app.use('/chat', createChatRouter(memory, collectionManager));
    // Add error handler to properly format error responses
    app.use(errorHandler);
  });

  afterAll(async () => {
    await memory.close();
  });

  describe('POST /chat', () => {
    it('should accept a chat message and return a response', async () => {
      const response = await request(app)
        .post('/chat')
        .send({
          message: 'What are the best practices for API design?'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('conversationId');
      expect(response.body.message).toHaveProperty('id');
      expect(response.body.message).toHaveProperty('role', 'assistant');
      expect(response.body.message).toHaveProperty('content');
      expect(response.body.message).toHaveProperty('timestamp');
    });

    it('should reject request without message', async () => {
      const response = await request(app)
        .post('/chat')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELD');
    });

    it('should continue an existing conversation', async () => {
      // First message
      const firstResponse = await request(app)
        .post('/chat')
        .send({
          message: 'Hello, this is the first message'
        })
        .expect(200);

      const conversationId = firstResponse.body.conversationId;

      // Second message in same conversation
      const secondResponse = await request(app)
        .post('/chat')
        .send({
          message: 'This is a follow-up message',
          conversationId
        })
        .expect(200);

      expect(secondResponse.body.conversationId).toBe(conversationId);
    });

    it('should include search metrics in response', async () => {
      const response = await request(app)
        .post('/chat')
        .send({
          message: 'Test query for metrics'
        })
        .expect(200);

      const message = response.body.message;
      expect(message).toHaveProperty('searchTime');
      expect(message).toHaveProperty('generationTime');
      expect(message).toHaveProperty('confidence');
      expect(typeof message.searchTime).toBe('number');
      expect(typeof message.generationTime).toBe('number');
    });

    it('should accept collection parameter', async () => {
      const response = await request(app)
        .post('/chat')
        .send({
          message: 'Search in specific collection',
          collection: 'engineering-docs'
        })
        .expect(200);

      expect(response.body).toHaveProperty('conversationId');
    });
  });

  describe('GET /chat/history', () => {
    let testConversationId: string;

    beforeEach(async () => {
      // Create a test conversation
      const response = await request(app)
        .post('/chat')
        .send({
          message: 'Test message for history'
        });
      testConversationId = response.body.conversationId;
    });

    it('should return all chat history', async () => {
      const response = await request(app)
        .get('/chat/history')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return specific conversation history', async () => {
      const response = await request(app)
        .get('/chat/history')
        .query({ id: testConversationId })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should have at least user and assistant messages
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/chat/history')
        .query({ id: 'non-existent-conversation-id' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('DELETE /chat/history/:id', () => {
    it('should delete a conversation', async () => {
      // Create a conversation
      const createResponse = await request(app)
        .post('/chat')
        .send({
          message: 'Conversation to delete'
        });
      const conversationId = createResponse.body.conversationId;

      // Delete it
      await request(app)
        .delete(`/chat/history/${conversationId}`)
        .expect(204);

      // Verify it's gone
      await request(app)
        .get('/chat/history')
        .query({ id: conversationId })
        .expect(404);
    });

    it('should return 404 for non-existent conversation', async () => {
      await request(app)
        .delete('/chat/history/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /chat/conversations', () => {
    it('should list all conversations', async () => {
      // Create a conversation
      await request(app)
        .post('/chat')
        .send({
          message: 'Test conversation for listing'
        });

      const response = await request(app)
        .get('/chat/conversations')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const conv = response.body[0];
        expect(conv).toHaveProperty('id');
        expect(conv).toHaveProperty('messageCount');
        expect(conv).toHaveProperty('createdAt');
        expect(conv).toHaveProperty('updatedAt');
        expect(conv).toHaveProperty('preview');
      }
    });
  });
});
