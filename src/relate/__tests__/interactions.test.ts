import request from 'supertest';
import { app } from '../server';
import {
  prisma,
  createTestUser,
  generateTestTokens,
  testFixtures,
  mockLLMService
} from './setup';

describe('Interactions Management', () => {
  let authUser: any;
  let authToken: string;
  let testSystem: any;
  let testFocusArea: any;

  beforeEach(async () => {
    const { user } = await createTestUser();
    authUser = user;
    const { accessToken } = generateTestTokens(user.id);
    authToken = accessToken;

    testSystem = await prisma.subSystem.create({
      data: { ...testFixtures.subSystem, userId: authUser.id }
    });

    testFocusArea = await prisma.focusArea.create({
      data: { ...testFixtures.focusArea, userId: authUser.id }
    });
  });

  describe('POST /api/interactions', () => {
    it('should create interaction with decision', async () => {
      const interactionData = {
        systemId: testSystem.id,
        type: 'DECISION',
        description: 'Decided to wake up at 5 AM daily',
        outcome: 'SUCCESS',
        metadata: { difficulty: 'hard', context: 'morning routine' }
      };

      const response = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(interactionData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        type: 'DECISION',
        description: interactionData.description,
        outcome: 'SUCCESS'
      });
      expect(response.body).toHaveProperty('id');
    });

    it('should create interaction with multiple linked entities', async () => {
      const coreValue = await prisma.coreValue.create({
        data: { ...testFixtures.coreValue, userId: authUser.id }
      });

      const response = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          systemId: testSystem.id,
          focusAreaId: testFocusArea.id,
          coreValueId: coreValue.id,
          type: 'ACTION',
          description: 'Completed workout',
          outcome: 'SUCCESS'
        });

      expect(response.status).toBe(201);
      expect(response.body.systemId).toBe(testSystem.id);
      expect(response.body.focusAreaId).toBe(testFocusArea.id);
      expect(response.body.coreValueId).toBe(coreValue.id);
    });

    it('should validate interaction type enum', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          systemId: testSystem.id,
          type: 'INVALID_TYPE',
          description: 'Test',
          outcome: 'SUCCESS'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('type');
    });

    it('should validate outcome enum', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          systemId: testSystem.id,
          type: 'ACTION',
          description: 'Test',
          outcome: 'INVALID_OUTCOME'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('outcome');
    });

    it('should detect value contradictions', async () => {
      const coreValue = await prisma.coreValue.create({
        data: {
          ...testFixtures.coreValue,
          userId: authUser.id,
          name: 'Health',
          description: 'Prioritize physical and mental wellbeing'
        }
      });

      mockLLMService.detectContradictions.mockResolvedValue({
        hasContradiction: true,
        severity: 'HIGH',
        explanation: 'Skipping workout contradicts health priority'
      });

      const response = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          systemId: testSystem.id,
          coreValueId: coreValue.id,
          type: 'DECISION',
          description: 'Skipped workout to watch TV',
          outcome: 'FAILURE'
        });

      expect(response.status).toBe(201);
      expect(mockLLMService.detectContradictions).toHaveBeenCalled();
      expect(response.body.valueContradiction).toBe(true);
      expect(response.body.contradictionSeverity).toBe('HIGH');
    });
  });

  describe('GET /api/interactions', () => {
    beforeEach(async () => {
      await prisma.interaction.createMany({
        data: [
          {
            userId: authUser.id,
            systemId: testSystem.id,
            type: 'ACTION',
            description: 'Completed task',
            outcome: 'SUCCESS',
            timestamp: new Date('2025-01-01T10:00:00Z')
          },
          {
            userId: authUser.id,
            systemId: testSystem.id,
            type: 'DECISION',
            description: 'Made choice',
            outcome: 'FAILURE',
            timestamp: new Date('2025-01-02T10:00:00Z')
          },
          {
            userId: authUser.id,
            systemId: testSystem.id,
            type: 'OBSERVATION',
            description: 'Noticed pattern',
            outcome: 'NEUTRAL',
            timestamp: new Date('2025-01-03T10:00:00Z')
          }
        ]
      });
    });

    it('should list all interactions', async () => {
      const response = await request(app)
        .get('/api/interactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/interactions?type=ACTION')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('ACTION');
    });

    it('should filter by outcome', async () => {
      const response = await request(app)
        .get('/api/interactions?outcome=SUCCESS')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].outcome).toBe('SUCCESS');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/interactions?startDate=2025-01-02&endDate=2025-01-03')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should filter by system', async () => {
      const system2 = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2' }
      });

      await prisma.interaction.create({
        data: {
          userId: authUser.id,
          systemId: system2.id,
          type: 'ACTION',
          description: 'Different system',
          outcome: 'SUCCESS'
        }
      });

      const response = await request(app)
        .get(`/api/interactions?systemId=${testSystem.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body.every((i: any) => i.systemId === testSystem.id)).toBe(true);
    });

    it('should sort by timestamp descending', async () => {
      const response = await request(app)
        .get('/api/interactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const timestamps = response.body.map((i: any) => new Date(i.timestamp).getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });
  });

  describe('GET /api/interactions/statistics', () => {
    beforeEach(async () => {
      const baseDate = new Date('2025-01-01');

      // Create 30 days of interactions
      for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);

        await prisma.interaction.createMany({
          data: [
            {
              userId: authUser.id,
              systemId: testSystem.id,
              focusAreaId: testFocusArea.id,
              type: 'ACTION',
              description: `Day ${i} action`,
              outcome: i % 3 === 0 ? 'SUCCESS' : i % 3 === 1 ? 'FAILURE' : 'NEUTRAL',
              timestamp: date
            }
          ]
        });
      }
    });

    it('should calculate overall statistics', async () => {
      const response = await request(app)
        .get('/api/interactions/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total', 30);
      expect(response.body).toHaveProperty('successRate');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byOutcome');
    });

    it('should calculate statistics for date range', async () => {
      const response = await request(app)
        .get('/api/interactions/statistics?startDate=2025-01-01&endDate=2025-01-07')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(7);
    });

    it('should calculate statistics by focus area', async () => {
      const response = await request(app)
        .get(`/api/interactions/statistics?focusAreaId=${testFocusArea.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(30);
    });

    it('should include streak information', async () => {
      // Create a 5-day success streak
      const baseDate = new Date();
      for (let i = 0; i < 5; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);

        await prisma.interaction.create({
          data: {
            userId: authUser.id,
            systemId: testSystem.id,
            type: 'ACTION',
            description: 'Daily action',
            outcome: 'SUCCESS',
            timestamp: date
          }
        });
      }

      const response = await request(app)
        .get('/api/interactions/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('currentStreak');
      expect(response.body.currentStreak).toBeGreaterThanOrEqual(5);
    });

    it('should calculate weekly trends', async () => {
      const response = await request(app)
        .get('/api/interactions/statistics?groupBy=week')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('weeklyTrends');
      expect(Array.isArray(response.body.weeklyTrends)).toBe(true);
    });
  });

  describe('GET /api/interactions/contradictions', () => {
    it('should list interactions with value contradictions', async () => {
      const coreValue = await prisma.coreValue.create({
        data: { ...testFixtures.coreValue, userId: authUser.id }
      });

      await prisma.interaction.createMany({
        data: [
          {
            userId: authUser.id,
            systemId: testSystem.id,
            coreValueId: coreValue.id,
            type: 'DECISION',
            description: 'Contradicted value',
            outcome: 'FAILURE',
            valueContradiction: true,
            contradictionSeverity: 'HIGH'
          },
          {
            userId: authUser.id,
            systemId: testSystem.id,
            type: 'ACTION',
            description: 'No contradiction',
            outcome: 'SUCCESS',
            valueContradiction: false
          }
        ]
      });

      const response = await request(app)
        .get('/api/interactions/contradictions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].valueContradiction).toBe(true);
    });

    it('should filter contradictions by severity', async () => {
      const coreValue = await prisma.coreValue.create({
        data: { ...testFixtures.coreValue, userId: authUser.id }
      });

      await prisma.interaction.createMany({
        data: [
          {
            userId: authUser.id,
            systemId: testSystem.id,
            coreValueId: coreValue.id,
            type: 'DECISION',
            description: 'High severity',
            outcome: 'FAILURE',
            valueContradiction: true,
            contradictionSeverity: 'HIGH'
          },
          {
            userId: authUser.id,
            systemId: testSystem.id,
            coreValueId: coreValue.id,
            type: 'DECISION',
            description: 'Low severity',
            outcome: 'FAILURE',
            valueContradiction: true,
            contradictionSeverity: 'LOW'
          }
        ]
      });

      const response = await request(app)
        .get('/api/interactions/contradictions?severity=HIGH')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].contradictionSeverity).toBe('HIGH');
    });
  });

  describe('GET /api/interactions/:id', () => {
    it('should retrieve interaction details', async () => {
      const interaction = await prisma.interaction.create({
        data: {
          userId: authUser.id,
          systemId: testSystem.id,
          type: 'ACTION',
          description: 'Test interaction',
          outcome: 'SUCCESS'
        }
      });

      const response = await request(app)
        .get(`/api/interactions/${interaction.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(interaction.id);
      expect(response.body).toHaveProperty('system');
    });

    it('should not allow viewing other users interactions', async () => {
      const { user: otherUser } = await createTestUser();
      const interaction = await prisma.interaction.create({
        data: {
          userId: otherUser.id,
          systemId: testSystem.id,
          type: 'ACTION',
          description: 'Other user interaction',
          outcome: 'SUCCESS'
        }
      });

      const response = await request(app)
        .get(`/api/interactions/${interaction.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/interactions/:id', () => {
    it('should update interaction', async () => {
      const interaction = await prisma.interaction.create({
        data: {
          userId: authUser.id,
          systemId: testSystem.id,
          type: 'ACTION',
          description: 'Original description',
          outcome: 'SUCCESS'
        }
      });

      const response = await request(app)
        .patch(`/api/interactions/${interaction.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated description',
          outcome: 'FAILURE',
          reflection: 'What I learned from this'
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated description');
      expect(response.body.outcome).toBe('FAILURE');
      expect(response.body.reflection).toBe('What I learned from this');
    });

    it('should recalculate contradictions on update', async () => {
      const coreValue = await prisma.coreValue.create({
        data: { ...testFixtures.coreValue, userId: authUser.id }
      });

      const interaction = await prisma.interaction.create({
        data: {
          userId: authUser.id,
          systemId: testSystem.id,
          type: 'ACTION',
          description: 'Original',
          outcome: 'SUCCESS'
        }
      });

      mockLLMService.detectContradictions.mockResolvedValue({
        hasContradiction: true,
        severity: 'MEDIUM',
        explanation: 'New contradiction detected'
      });

      const response = await request(app)
        .patch(`/api/interactions/${interaction.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ coreValueId: coreValue.id });

      expect(response.status).toBe(200);
      expect(mockLLMService.detectContradictions).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/interactions/:id', () => {
    it('should delete interaction', async () => {
      const interaction = await prisma.interaction.create({
        data: {
          userId: authUser.id,
          systemId: testSystem.id,
          type: 'ACTION',
          description: 'Test',
          outcome: 'SUCCESS'
        }
      });

      const response = await request(app)
        .delete(`/api/interactions/${interaction.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      const deleted = await prisma.interaction.findUnique({
        where: { id: interaction.id }
      });
      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/interactions/progress/:focusAreaId', () => {
    it('should calculate focus area progress', async () => {
      // Create 20 interactions for focus area
      const successCount = 15;
      const failureCount = 5;

      for (let i = 0; i < successCount; i++) {
        await prisma.interaction.create({
          data: {
            userId: authUser.id,
            systemId: testSystem.id,
            focusAreaId: testFocusArea.id,
            type: 'ACTION',
            description: `Success ${i}`,
            outcome: 'SUCCESS'
          }
        });
      }

      for (let i = 0; i < failureCount; i++) {
        await prisma.interaction.create({
          data: {
            userId: authUser.id,
            systemId: testSystem.id,
            focusAreaId: testFocusArea.id,
            type: 'ACTION',
            description: `Failure ${i}`,
            outcome: 'FAILURE'
          }
        });
      }

      const response = await request(app)
        .get(`/api/interactions/progress/${testFocusArea.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalInteractions).toBe(20);
      expect(response.body.successCount).toBe(15);
      expect(response.body.failureCount).toBe(5);
      expect(response.body.successRate).toBe(75);
      expect(response.body).toHaveProperty('trend');
    });

    it('should show progress over time', async () => {
      const baseDate = new Date('2025-01-01');

      for (let i = 0; i < 7; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);

        await prisma.interaction.create({
          data: {
            userId: authUser.id,
            systemId: testSystem.id,
            focusAreaId: testFocusArea.id,
            type: 'ACTION',
            description: `Day ${i}`,
            outcome: 'SUCCESS',
            timestamp: date
          }
        });
      }

      const response = await request(app)
        .get(`/api/interactions/progress/${testFocusArea.id}?groupBy=day`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('dailyProgress');
      expect(response.body.dailyProgress).toHaveLength(7);
    });
  });
});
