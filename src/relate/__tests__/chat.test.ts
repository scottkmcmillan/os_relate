import request from 'supertest';
import { app } from '../server';
import {
  prisma,
  createTestUser,
  generateTestTokens,
  testFixtures,
  mockLLMService
} from './setup';

describe('Chat System', () => {
  let authUser: any;
  let authToken: string;
  let testConversation: any;

  beforeEach(async () => {
    const { user } = await createTestUser();
    authUser = user;
    const { accessToken } = generateTestTokens(user.id);
    authToken = accessToken;

    testConversation = await prisma.conversation.create({
      data: {
        userId: authUser.id,
        title: 'Test Conversation'
      }
    });
  });

  describe('POST /api/chat/conversations', () => {
    it('should create new conversation', async () => {
      const response = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Chat Session' });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('New Chat Session');
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(authUser.id);
    });

    it('should auto-generate title if not provided', async () => {
      const response = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body.title).toMatch(/^Conversation/);
    });
  });

  describe('GET /api/chat/conversations', () => {
    it('should list all user conversations', async () => {
      await prisma.conversation.createMany({
        data: [
          { userId: authUser.id, title: 'Chat 1' },
          { userId: authUser.id, title: 'Chat 2' },
          { userId: authUser.id, title: 'Chat 3' }
        ]
      });

      const response = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(4); // 3 + testConversation
    });

    it('should sort by last message timestamp', async () => {
      const conv1 = await prisma.conversation.create({
        data: { userId: authUser.id, title: 'Old Chat' }
      });

      const conv2 = await prisma.conversation.create({
        data: { userId: authUser.id, title: 'Recent Chat' }
      });

      await prisma.message.create({
        data: {
          conversationId: conv1.id,
          role: 'USER',
          content: 'Old message',
          timestamp: new Date('2025-01-01')
        }
      });

      await prisma.message.create({
        data: {
          conversationId: conv2.id,
          role: 'USER',
          content: 'Recent message',
          timestamp: new Date('2025-01-15')
        }
      });

      const response = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].title).toBe('Recent Chat');
    });
  });

  describe('GET /api/chat/conversations/:id', () => {
    it('should retrieve conversation with messages', async () => {
      await prisma.message.createMany({
        data: [
          {
            conversationId: testConversation.id,
            role: 'USER',
            content: 'Hello'
          },
          {
            conversationId: testConversation.id,
            role: 'ASSISTANT',
            content: 'Hi there!'
          }
        ]
      });

      const response = await request(app)
        .get(`/api/chat/conversations/${testConversation.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testConversation.id);
      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[0].role).toBe('USER');
    });

    it('should not allow viewing other users conversations', async () => {
      const { user: otherUser } = await createTestUser();
      const otherConv = await prisma.conversation.create({
        data: { userId: otherUser.id, title: 'Private Chat' }
      });

      const response = await request(app)
        .get(`/api/chat/conversations/${otherConv.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/chat/conversations/:id/messages', () => {
    it('should send message and receive response', async () => {
      mockLLMService.chat.mockResolvedValue({
        content: 'This is my response to your question.',
        citations: []
      });

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'What should I do about my goals?' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userMessage');
      expect(response.body).toHaveProperty('assistantMessage');
      expect(response.body.userMessage.content).toBe('What should I do about my goals?');
      expect(response.body.assistantMessage.content).toBe('This is my response to your question.');
      expect(mockLLMService.chat).toHaveBeenCalled();
    });

    it('should build context from user profile and values', async () => {
      await prisma.coreValue.createMany({
        data: [
          { ...testFixtures.coreValue, userId: authUser.id, priority: 1 },
          { ...testFixtures.coreValue, userId: authUser.id, name: 'Growth', priority: 2 }
        ]
      });

      await prisma.focusArea.create({
        data: { ...testFixtures.focusArea, userId: authUser.id }
      });

      mockLLMService.chat.mockResolvedValue({
        content: 'Response with context',
        citations: []
      });

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Help me stay aligned with my values' });

      expect(response.status).toBe(201);

      // Verify LLM was called with context
      const llmCall = mockLLMService.chat.mock.calls[0][0];
      expect(llmCall.context).toBeDefined();
      expect(llmCall.context.coreValues).toHaveLength(2);
      expect(llmCall.context.focusAreas).toHaveLength(1);
    });

    it('should include relevant content in context', async () => {
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      await prisma.contentItem.create({
        data: {
          ...testFixtures.contentItem,
          userId: authUser.id,
          systemId: system.id,
          title: 'Morning Routine Guide',
          embedding: [0.1, 0.2, 0.3]
        }
      });

      mockLLMService.chat.mockResolvedValue({
        content: 'Here is advice about your morning routine',
        citations: ['Morning Routine Guide']
      });

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'How should I optimize my morning?' });

      expect(response.status).toBe(201);
      expect(response.body.assistantMessage.citations).toContain('Morning Routine Guide');
    });

    it('should activate tough love mode when enabled', async () => {
      await prisma.userProfile.update({
        where: { userId: authUser.id },
        data: { toughLoveEnabled: true }
      });

      mockLLMService.chat.mockResolvedValue({
        content: 'Stop making excuses and take action!',
        citations: []
      });

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'I keep procrastinating...' });

      expect(response.status).toBe(201);

      const llmCall = mockLLMService.chat.mock.calls[0][0];
      expect(llmCall.toughLove).toBe(true);
    });

    it('should include recent interactions in context', async () => {
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      await prisma.interaction.createMany({
        data: [
          {
            userId: authUser.id,
            systemId: system.id,
            type: 'ACTION',
            description: 'Completed workout',
            outcome: 'SUCCESS',
            timestamp: new Date()
          },
          {
            userId: authUser.id,
            systemId: system.id,
            type: 'DECISION',
            description: 'Chose unhealthy meal',
            outcome: 'FAILURE',
            timestamp: new Date()
          }
        ]
      });

      mockLLMService.chat.mockResolvedValue({
        content: 'I see you completed your workout but struggled with diet',
        citations: []
      });

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Review my recent progress' });

      expect(response.status).toBe(201);

      const llmCall = mockLLMService.chat.mock.calls[0][0];
      expect(llmCall.context.recentInteractions).toBeDefined();
      expect(llmCall.context.recentInteractions.length).toBeGreaterThan(0);
    });

    it('should handle conversation history', async () => {
      // Create prior messages
      await prisma.message.createMany({
        data: [
          {
            conversationId: testConversation.id,
            role: 'USER',
            content: 'Previous question'
          },
          {
            conversationId: testConversation.id,
            role: 'ASSISTANT',
            content: 'Previous answer'
          }
        ]
      });

      mockLLMService.chat.mockResolvedValue({
        content: 'Response considering context',
        citations: []
      });

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Follow-up question' });

      expect(response.status).toBe(201);

      const llmCall = mockLLMService.chat.mock.calls[0][0];
      expect(llmCall.history).toBeDefined();
      expect(llmCall.history.length).toBe(2);
    });

    it('should validate message content', async () => {
      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('content');
    });

    it('should enforce message length limit', async () => {
      const longMessage = 'a'.repeat(10001); // Over 10k chars

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: longMessage });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('length');
    });
  });

  describe('PATCH /api/chat/conversations/:id', () => {
    it('should update conversation title', async () => {
      const response = await request(app)
        .patch(`/api/chat/conversations/${testConversation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
    });

    it('should archive conversation', async () => {
      const response = await request(app)
        .patch(`/api/chat/conversations/${testConversation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ archived: true });

      expect(response.status).toBe(200);
      expect(response.body.archived).toBe(true);
    });
  });

  describe('DELETE /api/chat/conversations/:id', () => {
    it('should delete conversation and messages', async () => {
      await prisma.message.createMany({
        data: [
          { conversationId: testConversation.id, role: 'USER', content: 'Test 1' },
          { conversationId: testConversation.id, role: 'ASSISTANT', content: 'Test 2' }
        ]
      });

      const response = await request(app)
        .delete(`/api/chat/conversations/${testConversation.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      const deletedConv = await prisma.conversation.findUnique({
        where: { id: testConversation.id }
      });
      expect(deletedConv).toBeNull();

      const messages = await prisma.message.findMany({
        where: { conversationId: testConversation.id }
      });
      expect(messages).toHaveLength(0);
    });
  });

  describe('POST /api/chat/conversations/:id/messages/:messageId/feedback', () => {
    it('should record positive feedback', async () => {
      const message = await prisma.message.create({
        data: {
          conversationId: testConversation.id,
          role: 'ASSISTANT',
          content: 'Test response'
        }
      });

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages/${message.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 5,
          helpful: true,
          comment: 'Very helpful advice'
        });

      expect(response.status).toBe(200);

      const updatedMessage = await prisma.message.findUnique({
        where: { id: message.id }
      });
      expect(updatedMessage?.feedback).toMatchObject({
        rating: 5,
        helpful: true,
        comment: 'Very helpful advice'
      });
    });

    it('should record negative feedback', async () => {
      const message = await prisma.message.create({
        data: {
          conversationId: testConversation.id,
          role: 'ASSISTANT',
          content: 'Test response'
        }
      });

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages/${message.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 2,
          helpful: false,
          comment: 'Not relevant to my situation'
        });

      expect(response.status).toBe(200);

      const updatedMessage = await prisma.message.findUnique({
        where: { id: message.id }
      });
      expect(updatedMessage?.feedback?.helpful).toBe(false);
    });

    it('should only allow feedback on assistant messages', async () => {
      const userMessage = await prisma.message.create({
        data: {
          conversationId: testConversation.id,
          role: 'USER',
          content: 'User message'
        }
      });

      const response = await request(app)
        .post(`/api/chat/conversations/${testConversation.id}/messages/${userMessage.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 5, helpful: true });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('assistant message');
    });
  });

  describe('GET /api/chat/suggestions', () => {
    it('should generate contextual suggestions', async () => {
      await prisma.focusArea.create({
        data: { ...testFixtures.focusArea, userId: authUser.id }
      });

      mockLLMService.generateInsights.mockResolvedValue({
        suggestions: [
          'Review your morning routine',
          'Reflect on recent decisions',
          'Update your progress on health goals'
        ]
      });

      const response = await request(app)
        .get('/api/chat/suggestions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toHaveLength(3);
      expect(mockLLMService.generateInsights).toHaveBeenCalled();
    });
  });
});
