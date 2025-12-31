import request from 'supertest';
import { app } from '../server';
import { prisma, createTestUser, generateTestTokens, testFixtures } from './setup';

describe('Systems Management', () => {
  let authUser: any;
  let authToken: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    authUser = user;
    const { accessToken } = generateTestTokens(user.id);
    authToken = accessToken;
  });

  describe('POST /api/systems', () => {
    it('should create a new sub-system', async () => {
      const response = await request(app)
        .post('/api/systems')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testFixtures.subSystem);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: testFixtures.subSystem.name,
        description: testFixtures.subSystem.description,
        category: testFixtures.subSystem.category
      });
      expect(response.body).toHaveProperty('id');
    });

    it('should validate category enum', async () => {
      const response = await request(app)
        .post('/api/systems')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testFixtures.subSystem, category: 'INVALID_CATEGORY' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('category');
    });

    it('should create system with parent', async () => {
      const parent = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'Parent System' }
      });

      const response = await request(app)
        .post('/api/systems')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testFixtures.subSystem, parentId: parent.id });

      expect(response.status).toBe(201);
      expect(response.body.parentId).toBe(parent.id);
    });

    it('should prevent circular parent relationships', async () => {
      const system1 = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 1' }
      });

      const system2 = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2', parentId: system1.id }
      });

      // Try to make system1 a child of system2 (circular)
      const response = await request(app)
        .patch(`/api/systems/${system1.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: system2.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('circular');
    });
  });

  describe('GET /api/systems', () => {
    it('should list all user systems', async () => {
      await prisma.subSystem.createMany({
        data: [
          { ...testFixtures.subSystem, userId: authUser.id, name: 'System 1' },
          { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2' },
          { ...testFixtures.subSystem, userId: authUser.id, name: 'System 3' }
        ]
      });

      const response = await request(app)
        .get('/api/systems')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should filter systems by category', async () => {
      await prisma.subSystem.createMany({
        data: [
          { ...testFixtures.subSystem, userId: authUser.id, category: 'HABITS' },
          { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2', category: 'PROJECTS' },
          { ...testFixtures.subSystem, userId: authUser.id, name: 'System 3', category: 'HABITS' }
        ]
      });

      const response = await request(app)
        .get('/api/systems?category=HABITS')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.every((s: any) => s.category === 'HABITS')).toBe(true);
    });

    it('should include content items count', async () => {
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      await prisma.contentItem.createMany({
        data: [
          { ...testFixtures.contentItem, userId: authUser.id, systemId: system.id },
          { ...testFixtures.contentItem, userId: authUser.id, systemId: system.id, title: 'Item 2' }
        ]
      });

      const response = await request(app)
        .get('/api/systems')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const foundSystem = response.body.find((s: any) => s.id === system.id);
      expect(foundSystem._count.contentItems).toBe(2);
    });
  });

  describe('GET /api/systems/:id', () => {
    it('should retrieve system details with relationships', async () => {
      const parent = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'Parent' }
      });

      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, parentId: parent.id }
      });

      const child = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'Child', parentId: system.id }
      });

      const response = await request(app)
        .get(`/api/systems/${system.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.parent).toBeDefined();
      expect(response.body.parent.id).toBe(parent.id);
      expect(response.body.children).toHaveLength(1);
      expect(response.body.children[0].id).toBe(child.id);
    });

    it('should include linked systems', async () => {
      const system1 = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 1' }
      });

      const system2 = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2' }
      });

      // Create bidirectional link
      await prisma.systemLink.create({
        data: {
          fromSystemId: system1.id,
          toSystemId: system2.id,
          relationshipType: 'SUPPORTS'
        }
      });

      const response = await request(app)
        .get(`/api/systems/${system1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.linkedTo).toHaveLength(1);
      expect(response.body.linkedTo[0].toSystem.id).toBe(system2.id);
    });

    it('should not allow viewing other users systems', async () => {
      const { user: otherUser } = await createTestUser();
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: otherUser.id }
      });

      const response = await request(app)
        .get(`/api/systems/${system.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/systems/:id', () => {
    it('should update system properties', async () => {
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      const response = await request(app)
        .patch(`/api/systems/${system.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          isActive: false
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.isActive).toBe(false);
    });

    it('should update system metadata', async () => {
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      const metadata = { color: 'blue', icon: 'star', customField: 'value' };
      const response = await request(app)
        .patch(`/api/systems/${system.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ metadata });

      expect(response.status).toBe(200);
      expect(response.body.metadata).toMatchObject(metadata);
    });
  });

  describe('DELETE /api/systems/:id', () => {
    it('should delete system without children', async () => {
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      const response = await request(app)
        .delete(`/api/systems/${system.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      const deleted = await prisma.subSystem.findUnique({ where: { id: system.id } });
      expect(deleted).toBeNull();
    });

    it('should prevent deleting system with children', async () => {
      const parent = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'Child', parentId: parent.id }
      });

      const response = await request(app)
        .delete(`/api/systems/${parent.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('children');
    });

    it('should cascade delete content items', async () => {
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      const content = await prisma.contentItem.create({
        data: { ...testFixtures.contentItem, userId: authUser.id, systemId: system.id }
      });

      await request(app)
        .delete(`/api/systems/${system.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const deletedContent = await prisma.contentItem.findUnique({ where: { id: content.id } });
      expect(deletedContent).toBeNull();
    });
  });

  describe('System Links', () => {
    describe('POST /api/systems/:id/link', () => {
      it('should create link between systems', async () => {
        const system1 = await prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 1' }
        });

        const system2 = await prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2' }
        });

        const response = await request(app)
          .post(`/api/systems/${system1.id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            toSystemId: system2.id,
            relationshipType: 'SUPPORTS',
            description: 'System 1 supports System 2'
          });

        expect(response.status).toBe(201);
        expect(response.body.relationshipType).toBe('SUPPORTS');
      });

      it('should validate relationship type enum', async () => {
        const system1 = await prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id }
        });

        const system2 = await prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2' }
        });

        const response = await request(app)
          .post(`/api/systems/${system1.id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ toSystemId: system2.id, relationshipType: 'INVALID' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('relationship type');
      });

      it('should prevent duplicate links', async () => {
        const system1 = await prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id }
        });

        const system2 = await prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2' }
        });

        await prisma.systemLink.create({
          data: {
            fromSystemId: system1.id,
            toSystemId: system2.id,
            relationshipType: 'SUPPORTS'
          }
        });

        const response = await request(app)
          .post(`/api/systems/${system1.id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ toSystemId: system2.id, relationshipType: 'SUPPORTS' });

        expect(response.status).toBe(409);
      });
    });

    describe('DELETE /api/systems/:id/link/:linkId', () => {
      it('should remove system link', async () => {
        const system1 = await prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id }
        });

        const system2 = await prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2' }
        });

        const link = await prisma.systemLink.create({
          data: {
            fromSystemId: system1.id,
            toSystemId: system2.id,
            relationshipType: 'SUPPORTS'
          }
        });

        const response = await request(app)
          .delete(`/api/systems/${system1.id}/link/${link.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        const deleted = await prisma.systemLink.findUnique({ where: { id: link.id } });
        expect(deleted).toBeNull();
      });
    });
  });

  describe('GET /api/systems/graph', () => {
    it('should return graph data structure', async () => {
      const systems = await Promise.all([
        prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id, name: 'S1' }
        }),
        prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id, name: 'S2' }
        }),
        prisma.subSystem.create({
          data: { ...testFixtures.subSystem, userId: authUser.id, name: 'S3' }
        })
      ]);

      await prisma.systemLink.createMany({
        data: [
          { fromSystemId: systems[0].id, toSystemId: systems[1].id, relationshipType: 'SUPPORTS' },
          { fromSystemId: systems[1].id, toSystemId: systems[2].id, relationshipType: 'DEPENDS_ON' }
        ]
      });

      const response = await request(app)
        .get('/api/systems/graph')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.nodes).toHaveLength(3);
      expect(response.body.edges).toHaveLength(2);
      expect(response.body.nodes[0]).toHaveProperty('id');
      expect(response.body.nodes[0]).toHaveProperty('label');
      expect(response.body.edges[0]).toHaveProperty('source');
      expect(response.body.edges[0]).toHaveProperty('target');
    });

    it('should include node metadata', async () => {
      const system = await prisma.subSystem.create({
        data: {
          ...testFixtures.subSystem,
          userId: authUser.id,
          metadata: { color: 'red', importance: 'high' }
        }
      });

      const response = await request(app)
        .get('/api/systems/graph')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const node = response.body.nodes.find((n: any) => n.id === system.id);
      expect(node.metadata).toMatchObject({ color: 'red' });
    });
  });

  describe('POST /api/systems/seed-defaults', () => {
    it('should seed default systems for new user', async () => {
      const response = await request(app)
        .post('/api/systems/seed-defaults')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.created).toBeGreaterThan(0);

      const systems = await prisma.subSystem.findMany({
        where: { userId: authUser.id }
      });

      expect(systems.length).toBeGreaterThan(0);
      expect(systems.some(s => s.category === 'HABITS')).toBe(true);
      expect(systems.some(s => s.category === 'PROJECTS')).toBe(true);
    });

    it('should not duplicate default systems', async () => {
      // First seed
      await request(app)
        .post('/api/systems/seed-defaults')
        .set('Authorization', `Bearer ${authToken}`);

      const firstCount = await prisma.subSystem.count({
        where: { userId: authUser.id }
      });

      // Second seed attempt
      await request(app)
        .post('/api/systems/seed-defaults')
        .set('Authorization', `Bearer ${authToken}`);

      const secondCount = await prisma.subSystem.count({
        where: { userId: authUser.id }
      });

      expect(secondCount).toBe(firstCount);
    });
  });

  describe('GET /api/systems/:id/content', () => {
    it('should list content items in system', async () => {
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      await prisma.contentItem.createMany({
        data: [
          { ...testFixtures.contentItem, userId: authUser.id, systemId: system.id },
          { ...testFixtures.contentItem, userId: authUser.id, systemId: system.id, title: 'Item 2' }
        ]
      });

      const response = await request(app)
        .get(`/api/systems/${system.id}/content`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should paginate content items', async () => {
      const system = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id }
      });

      // Create 25 content items
      const items = Array.from({ length: 25 }, (_, i) => ({
        ...testFixtures.contentItem,
        userId: authUser.id,
        systemId: system.id,
        title: `Item ${i}`
      }));

      await prisma.contentItem.createMany({ data: items });

      const response = await request(app)
        .get(`/api/systems/${system.id}/content?page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(10);
      expect(response.body.total).toBe(25);
      expect(response.body.pages).toBe(3);
    });
  });
});
