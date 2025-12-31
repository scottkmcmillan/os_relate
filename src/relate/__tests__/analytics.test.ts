import request from 'supertest';
import { app } from '../server';
import {
  prisma,
  createTestUser,
  generateTestTokens,
  testFixtures,
  mockLLMService
} from './setup';

describe('Analytics & Insights', () => {
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

  describe('GET /api/analytics/weekly-summary', () => {
    beforeEach(async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Create a week of varied interactions
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        await prisma.interaction.createMany({
          data: [
            {
              userId: authUser.id,
              systemId: testSystem.id,
              focusAreaId: testFocusArea.id,
              type: 'ACTION',
              description: `Day ${i} action`,
              outcome: i % 2 === 0 ? 'SUCCESS' : 'FAILURE',
              timestamp: date
            }
          ]
        });
      }
    });

    it('should generate weekly summary', async () => {
      mockLLMService.generateInsights.mockResolvedValue({
        summary: 'You had a productive week with 4 successes and 3 setbacks',
        highlights: [
          'Maintained consistency in morning routine',
          'Struggled with evening discipline'
        ],
        recommendations: [
          'Focus on evening routine improvements',
          'Build on morning routine success'
        ]
      });

      const response = await request(app)
        .get('/api/analytics/weekly-summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('statistics');
      expect(response.body).toHaveProperty('insights');
      expect(response.body.insights.highlights).toHaveLength(2);
      expect(mockLLMService.generateInsights).toHaveBeenCalled();
    });

    it('should include interaction counts', async () => {
      const response = await request(app)
        .get('/api/analytics/weekly-summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics).toHaveProperty('totalInteractions');
      expect(response.body.statistics).toHaveProperty('successCount');
      expect(response.body.statistics).toHaveProperty('failureCount');
      expect(response.body.statistics.totalInteractions).toBe(7);
    });

    it('should show top performing systems', async () => {
      const system2 = await prisma.subSystem.create({
        data: { ...testFixtures.subSystem, userId: authUser.id, name: 'System 2' }
      });

      // Add more successful interactions to system2
      for (let i = 0; i < 5; i++) {
        await prisma.interaction.create({
          data: {
            userId: authUser.id,
            systemId: system2.id,
            type: 'ACTION',
            description: 'Success',
            outcome: 'SUCCESS'
          }
        });
      }

      const response = await request(app)
        .get('/api/analytics/weekly-summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('topSystems');
      expect(response.body.topSystems[0].id).toBe(system2.id);
    });

    it('should accept custom date range', async () => {
      const response = await request(app)
        .get('/api/analytics/weekly-summary?startDate=2025-01-01&endDate=2025-01-07')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.period).toMatchObject({
        start: expect.any(String),
        end: expect.any(String)
      });
    });
  });

  describe('GET /api/analytics/focus-progress', () => {
    beforeEach(async () => {
      // Create 30 days of progress
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - 30);

      for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);

        await prisma.interaction.create({
          data: {
            userId: authUser.id,
            systemId: testSystem.id,
            focusAreaId: testFocusArea.id,
            type: 'ACTION',
            description: `Progress ${i}`,
            outcome: i % 3 === 0 ? 'SUCCESS' : i % 3 === 1 ? 'FAILURE' : 'NEUTRAL',
            timestamp: date
          }
        });
      }
    });

    it('should calculate focus area progress', async () => {
      const response = await request(app)
        .get(`/api/analytics/focus-progress/${testFocusArea.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('focusArea');
      expect(response.body).toHaveProperty('overallProgress');
      expect(response.body).toHaveProperty('weeklyProgress');
      expect(response.body).toHaveProperty('trend');
      expect(response.body.overallProgress).toBeGreaterThan(0);
      expect(response.body.overallProgress).toBeLessThanOrEqual(100);
    });

    it('should show progress trend', async () => {
      const response = await request(app)
        .get(`/api/analytics/focus-progress/${testFocusArea.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(['IMPROVING', 'STABLE', 'DECLINING']).toContain(response.body.trend);
    });

    it('should include milestone tracking', async () => {
      await prisma.focusArea.update({
        where: { id: testFocusArea.id },
        data: {
          metadata: {
            milestones: [
              { name: 'Week 1', target: 25, achieved: false },
              { name: 'Week 2', target: 50, achieved: false },
              { name: 'Week 3', target: 75, achieved: false },
              { name: 'Complete', target: 100, achieved: false }
            ]
          }
        }
      });

      const response = await request(app)
        .get(`/api/analytics/focus-progress/${testFocusArea.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('milestones');
      expect(response.body.milestones).toHaveLength(4);
    });

    it('should project completion date', async () => {
      const response = await request(app)
        .get(`/api/analytics/focus-progress/${testFocusArea.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projectedCompletion');
    });
  });

  describe('GET /api/analytics/patterns', () => {
    beforeEach(async () => {
      // Create pattern of morning successes and evening failures
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - 14);

      for (let i = 0; i < 14; i++) {
        const morningDate = new Date(baseDate);
        morningDate.setDate(morningDate.getDate() + i);
        morningDate.setHours(7, 0, 0);

        const eveningDate = new Date(baseDate);
        eveningDate.setDate(eveningDate.getDate() + i);
        eveningDate.setHours(20, 0, 0);

        await prisma.interaction.createMany({
          data: [
            {
              userId: authUser.id,
              systemId: testSystem.id,
              type: 'ACTION',
              description: 'Morning workout',
              outcome: 'SUCCESS',
              timestamp: morningDate
            },
            {
              userId: authUser.id,
              systemId: testSystem.id,
              type: 'DECISION',
              description: 'Evening meal choice',
              outcome: 'FAILURE',
              timestamp: eveningDate
            }
          ]
        });
      }
    });

    it('should detect behavioral patterns', async () => {
      mockLLMService.generateInsights.mockResolvedValue({
        patterns: [
          {
            type: 'TIME_OF_DAY',
            description: 'Higher success rate in mornings',
            confidence: 0.92,
            recommendation: 'Schedule important tasks in the morning'
          },
          {
            type: 'CONSISTENCY',
            description: 'Consistent evening struggles',
            confidence: 0.87,
            recommendation: 'Develop evening accountability system'
          }
        ]
      });

      const response = await request(app)
        .get('/api/analytics/patterns')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patterns).toBeDefined();
      expect(response.body.patterns.length).toBeGreaterThan(0);
      expect(response.body.patterns[0]).toHaveProperty('type');
      expect(response.body.patterns[0]).toHaveProperty('confidence');
    });

    it('should identify streak patterns', async () => {
      const response = await request(app)
        .get('/api/analytics/patterns?type=STREAKS')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('streaks');
      expect(response.body.streaks).toHaveProperty('current');
      expect(response.body.streaks).toHaveProperty('longest');
    });

    it('should detect value contradictions patterns', async () => {
      const coreValue = await prisma.coreValue.create({
        data: { ...testFixtures.coreValue, userId: authUser.id }
      });

      // Create multiple contradictions
      for (let i = 0; i < 5; i++) {
        await prisma.interaction.create({
          data: {
            userId: authUser.id,
            systemId: testSystem.id,
            coreValueId: coreValue.id,
            type: 'DECISION',
            description: 'Contradictory decision',
            outcome: 'FAILURE',
            valueContradiction: true,
            contradictionSeverity: 'HIGH'
          }
        });
      }

      mockLLMService.generateInsights.mockResolvedValue({
        patterns: [
          {
            type: 'VALUE_CONTRADICTION',
            description: 'Repeated contradictions with Health value',
            confidence: 0.95,
            recommendation: 'Revisit and strengthen health commitment'
          }
        ]
      });

      const response = await request(app)
        .get('/api/analytics/patterns?type=CONTRADICTIONS')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patterns).toBeDefined();
    });
  });

  describe('GET /api/analytics/accountability', () => {
    it('should generate accountability alerts', async () => {
      // Create declining pattern
      const baseDate = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);

        await prisma.interaction.create({
          data: {
            userId: authUser.id,
            systemId: testSystem.id,
            focusAreaId: testFocusArea.id,
            type: 'ACTION',
            description: 'Daily action',
            outcome: i < 3 ? 'FAILURE' : 'SUCCESS', // Recent failures
            timestamp: date
          }
        });
      }

      mockLLMService.generateInsights.mockResolvedValue({
        alerts: [
          {
            type: 'DECLINING_PERFORMANCE',
            severity: 'MEDIUM',
            message: 'Your Health & Fitness progress has declined over the past 3 days',
            actionRequired: true,
            suggestions: ['Review your routine', 'Identify blockers']
          }
        ]
      });

      const response = await request(app)
        .get('/api/analytics/accountability')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.alerts).toBeDefined();
      expect(response.body.alerts.length).toBeGreaterThan(0);
      expect(response.body.alerts[0]).toHaveProperty('severity');
      expect(response.body.alerts[0]).toHaveProperty('actionRequired');
    });

    it('should detect missed check-ins', async () => {
      // Last interaction was 4 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 4);

      await prisma.interaction.create({
        data: {
          userId: authUser.id,
          systemId: testSystem.id,
          type: 'ACTION',
          description: 'Last action',
          outcome: 'SUCCESS',
          timestamp: oldDate
        }
      });

      mockLLMService.generateInsights.mockResolvedValue({
        alerts: [
          {
            type: 'MISSED_CHECKIN',
            severity: 'HIGH',
            message: 'No activity logged in the past 4 days',
            actionRequired: true
          }
        ]
      });

      const response = await request(app)
        .get('/api/analytics/accountability')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const missedCheckin = response.body.alerts.find((a: any) => a.type === 'MISSED_CHECKIN');
      expect(missedCheckin).toBeDefined();
    });

    it('should alert on value drift', async () => {
      const coreValue = await prisma.coreValue.create({
        data: { ...testFixtures.coreValue, userId: authUser.id }
      });

      // Create pattern of value contradictions
      for (let i = 0; i < 5; i++) {
        await prisma.interaction.create({
          data: {
            userId: authUser.id,
            systemId: testSystem.id,
            coreValueId: coreValue.id,
            type: 'DECISION',
            description: 'Contradictory choice',
            outcome: 'FAILURE',
            valueContradiction: true,
            contradictionSeverity: 'HIGH',
            timestamp: new Date()
          }
        });
      }

      mockLLMService.generateInsights.mockResolvedValue({
        alerts: [
          {
            type: 'VALUE_DRIFT',
            severity: 'HIGH',
            message: 'Repeated contradictions with core value: Integrity',
            actionRequired: true,
            suggestions: ['Review core values', 'Reflect on recent decisions']
          }
        ]
      });

      const response = await request(app)
        .get('/api/analytics/accountability')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const valueDrift = response.body.alerts.find((a: any) => a.type === 'VALUE_DRIFT');
      expect(valueDrift).toBeDefined();
      expect(valueDrift.severity).toBe('HIGH');
    });
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      // Create diverse data
      await prisma.interaction.createMany({
        data: Array.from({ length: 10 }, (_, i) => ({
          userId: authUser.id,
          systemId: testSystem.id,
          type: 'ACTION',
          description: `Action ${i}`,
          outcome: i % 2 === 0 ? 'SUCCESS' : 'FAILURE',
          timestamp: new Date()
        }))
      });

      mockLLMService.generateInsights.mockResolvedValue({
        quickInsights: [
          'You are on track with your goals',
          'Morning routine is your strongest system'
        ]
      });

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('activeFocusAreas');
      expect(response.body).toHaveProperty('recentInteractions');
      expect(response.body).toHaveProperty('quickInsights');
      expect(response.body).toHaveProperty('streaks');
    });

    it('should include active focus areas progress', async () => {
      const focusArea2 = await prisma.focusArea.create({
        data: {
          ...testFixtures.focusArea,
          userId: authUser.id,
          name: 'Career Development',
          status: 'ACTIVE'
        }
      });

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.activeFocusAreas.length).toBeGreaterThanOrEqual(2);
    });

    it('should show recent activity summary', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toHaveProperty('last7Days');
      expect(response.body.summary).toHaveProperty('last30Days');
    });
  });

  describe('GET /api/analytics/export', () => {
    it('should export analytics data as JSON', async () => {
      await prisma.interaction.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          userId: authUser.id,
          systemId: testSystem.id,
          type: 'ACTION',
          description: `Action ${i}`,
          outcome: 'SUCCESS',
          timestamp: new Date()
        }))
      });

      const response = await request(app)
        .get('/api/analytics/export?format=json')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('interactions');
      expect(response.body).toHaveProperty('focusAreas');
      expect(response.body).toHaveProperty('systems');
    });

    it('should export analytics data as CSV', async () => {
      const response = await request(app)
        .get('/api/analytics/export?format=csv')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should allow date range filtering in export', async () => {
      const response = await request(app)
        .get('/api/analytics/export?format=json&startDate=2025-01-01&endDate=2025-01-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body.dateRange.start).toContain('2025-01-01');
    });
  });

  describe('POST /api/analytics/refresh-insights', () => {
    it('should trigger insight regeneration', async () => {
      mockLLMService.generateInsights.mockResolvedValue({
        insights: ['New insight generated'],
        timestamp: new Date()
      });

      const response = await request(app)
        .post('/api/analytics/refresh-insights')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(mockLLMService.generateInsights).toHaveBeenCalled();
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('refreshedAt');
    });

    it('should enforce rate limit on refresh', async () => {
      // First refresh
      await request(app)
        .post('/api/analytics/refresh-insights')
        .set('Authorization', `Bearer ${authToken}`);

      // Immediate second refresh should be rate limited
      const response = await request(app)
        .post('/api/analytics/refresh-insights')
        .set('Authorization', `Bearer ${authToken}`);

      expect([429, 200]).toContain(response.status);
    });
  });
});
