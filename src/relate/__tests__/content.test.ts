import request from 'supertest';
import { app } from '../server';
import {
  prisma,
  createTestUser,
  generateTestTokens,
  testFixtures,
  mockLLMService,
  mockEmbeddingService,
  mockStorageService
} from './setup';

describe('Content Management', () => {
  let authUser: any;
  let authToken: string;
  let testSystem: any;

  beforeEach(async () => {
    const { user } = await createTestUser();
    authUser = user;
    const { accessToken } = generateTestTokens(user.id);
    authToken = accessToken;

    testSystem = await prisma.subSystem.create({
      data: { ...testFixtures.subSystem, userId: authUser.id }
    });
  });

  describe('POST /api/content', () => {
    it('should create content item with manual input', async () => {
      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testFixtures.contentItem,
          systemId: testSystem.id
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: testFixtures.contentItem.title,
        contentType: testFixtures.contentItem.contentType
      });
      expect(response.body).toHaveProperty('id');
    });

    it('should generate embedding for content', async () => {
      mockEmbeddingService.embed.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testFixtures.contentItem,
          systemId: testSystem.id
        });

      expect(response.status).toBe(201);
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith(
        expect.stringContaining(testFixtures.contentItem.rawContent)
      );
      expect(response.body.embedding).toBeDefined();
    });

    it('should auto-generate tags using LLM', async () => {
      mockLLMService.analyzeContent.mockResolvedValue({
        tags: ['productivity', 'habits', 'self-improvement'],
        summary: 'Key insights about building better habits'
      });

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testFixtures.contentItem,
          systemId: testSystem.id,
          autoTag: true
        });

      expect(response.status).toBe(201);
      expect(mockLLMService.analyzeContent).toHaveBeenCalled();
      expect(response.body.tags).toEqual(expect.arrayContaining(['productivity', 'habits']));
    });

    it('should validate content type enum', async () => {
      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testFixtures.contentItem,
          systemId: testSystem.id,
          contentType: 'INVALID_TYPE'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('content type');
    });

    it('should require either rawContent or source', async () => {
      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Content',
          contentType: 'NOTE',
          systemId: testSystem.id
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('content or source');
    });
  });

  describe('POST /api/content/upload', () => {
    it('should upload file and create content item', async () => {
      mockStorageService.upload.mockResolvedValue({
        url: 'https://storage.example.com/files/document.pdf'
      });

      mockLLMService.analyzeContent.mockResolvedValue({
        title: 'Extracted Document Title',
        summary: 'Document summary',
        tags: ['document', 'pdf']
      });

      const response = await request(app)
        .post('/api/content/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('systemId', testSystem.id)
        .field('contentType', 'BOOK_SUMMARY')
        .attach('file', Buffer.from('PDF content'), 'document.pdf');

      expect(response.status).toBe(201);
      expect(mockStorageService.upload).toHaveBeenCalled();
      expect(response.body.source).toContain('storage.example.com');
    });

    it('should reject unsupported file types', async () => {
      const response = await request(app)
        .post('/api/content/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('systemId', testSystem.id)
        .attach('file', Buffer.from('content'), 'file.exe');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('file type');
    });

    it('should enforce file size limit', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/content/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('systemId', testSystem.id)
        .attach('file', largeBuffer, 'large.pdf');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('size');
    });
  });

  describe('POST /api/content/ingest-url', () => {
    it('should fetch and ingest content from URL', async () => {
      mockLLMService.analyzeContent.mockResolvedValue({
        title: 'Article Title',
        rawContent: 'Extracted article content...',
        summary: 'Article summary',
        tags: ['article', 'web']
      });

      const response = await request(app)
        .post('/api/content/ingest-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com/article',
          systemId: testSystem.id,
          contentType: 'ARTICLE'
        });

      expect(response.status).toBe(201);
      expect(response.body.source).toBe('https://example.com/article');
      expect(response.body.rawContent).toBeDefined();
    });

    it('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/content/ingest-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'not-a-valid-url',
          systemId: testSystem.id
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('URL');
    });

    it('should handle ingestion failures gracefully', async () => {
      mockLLMService.analyzeContent.mockRejectedValue(new Error('Failed to fetch'));

      const response = await request(app)
        .post('/api/content/ingest-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://unreachable.com/article',
          systemId: testSystem.id
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('ingest');
    });
  });

  describe('GET /api/content', () => {
    it('should list all content items', async () => {
      await prisma.contentItem.createMany({
        data: [
          { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id },
          { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id, title: 'Item 2' },
          { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id, title: 'Item 3' }
        ]
      });

      const response = await request(app)
        .get('/api/content')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should filter by content type', async () => {
      await prisma.contentItem.createMany({
        data: [
          { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id, contentType: 'ARTICLE' },
          { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id, title: 'Book', contentType: 'BOOK_SUMMARY' },
          { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id, title: 'Note', contentType: 'NOTE' }
        ]
      });

      const response = await request(app)
        .get('/api/content?type=ARTICLE')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].contentType).toBe('ARTICLE');
    });

    it('should filter by system', async () => {
      const system2 = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2' }
      });

      await prisma.contentItem.createMany({
        data: [
          { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id },
          { ...testFixtures.contentItem, userId: authUser.id, systemId: system2.id, title: 'Item 2' }
        ]
      });

      const response = await request(app)
        .get(`/api/content?systemId=${testSystem.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].systemId).toBe(testSystem.id);
    });

    it('should search by tags', async () => {
      await prisma.contentItem.createMany({
        data: [
          { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id, tags: ['productivity', 'habits'] },
          { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id, title: 'Item 2', tags: ['health'] }
        ]
      });

      const response = await request(app)
        .get('/api/content?tags=productivity')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].tags).toContain('productivity');
    });
  });

  describe('GET /api/content/search', () => {
    it('should perform semantic search', async () => {
      const content1 = await prisma.contentItem.create({
        data: {
          ...testFixtures.contentItem,
          userId: authUser.id,
          systemId: testSystem.id,
          embedding: [0.1, 0.2, 0.3],
          title: 'Building Better Habits'
        }
      });

      const content2 = await prisma.contentItem.create({
        data: {
          ...testFixtures.contentItem,
          userId: authUser.id,
          systemId: testSystem.id,
          embedding: [0.9, 0.8, 0.7],
          title: 'Cooking Recipes'
        }
      });

      mockEmbeddingService.embed.mockResolvedValue([0.1, 0.2, 0.3]);
      mockEmbeddingService.similarity.mockImplementation((a, b) => {
        if (JSON.stringify(b) === JSON.stringify([0.1, 0.2, 0.3])) return 0.95;
        return 0.2;
      });

      const response = await request(app)
        .get('/api/content/search?q=how to build habits')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith('how to build habits');
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0].similarity).toBeGreaterThan(0.5);
    });

    it('should limit search results', async () => {
      // Create 10 content items
      const items = Array.from({ length: 10 }, (_, i) => ({
        ...testFixtures.contentItem,
        userId: authUser.id,
        systemId: testSystem.id,
        title: `Item ${i}`,
        embedding: [Math.random(), Math.random(), Math.random()]
      }));

      await prisma.contentItem.createMany({ data: items });

      mockEmbeddingService.embed.mockResolvedValue([0.5, 0.5, 0.5]);
      mockEmbeddingService.similarity.mockReturnValue(0.7);

      const response = await request(app)
        .get('/api/content/search?q=test&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/content/:id', () => {
    it('should retrieve content item details', async () => {
      const content = await prisma.contentItem.create({
        data: { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id }
      });

      const response = await request(app)
        .get(`/api/content/${content.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(content.id);
      expect(response.body).toHaveProperty('system');
    });

    it('should not allow viewing other users content', async () => {
      const { user: otherUser } = await createTestUser();
      const content = await prisma.contentItem.create({
        data: { ...testFixtures.contentItem, userId: otherUser.id, systemId: testSystem.id }
      });

      const response = await request(app)
        .get(`/api/content/${content.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/content/:id', () => {
    it('should update content item', async () => {
      const content = await prisma.contentItem.create({
        data: { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id }
      });

      const response = await request(app)
        .patch(`/api/content/${content.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          summary: 'Updated summary',
          tags: ['updated', 'tags']
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.tags).toEqual(['updated', 'tags']);
    });

    it('should regenerate embedding on content update', async () => {
      const content = await prisma.contentItem.create({
        data: { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id }
      });

      mockEmbeddingService.embed.mockResolvedValue([0.5, 0.6, 0.7]);

      const response = await request(app)
        .patch(`/api/content/${content.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawContent: 'Completely new content' });

      expect(response.status).toBe(200);
      expect(mockEmbeddingService.embed).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/content/:id', () => {
    it('should delete content item', async () => {
      const content = await prisma.contentItem.create({
        data: { ...testFixtures.contentItem, userId: authUser.id, systemId: testSystem.id }
      });

      const response = await request(app)
        .delete(`/api/content/${content.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      const deleted = await prisma.contentItem.findUnique({ where: { id: content.id } });
      expect(deleted).toBeNull();
    });

    it('should delete associated file from storage', async () => {
      const content = await prisma.contentItem.create({
        data: {
          ...testFixtures.contentItem,
          userId: authUser.id,
          systemId: testSystem.id,
          source: 'https://storage.example.com/files/document.pdf'
        }
      });

      await request(app)
        .delete(`/api/content/${content.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(mockStorageService.delete).toHaveBeenCalled();
    });
  });
});
