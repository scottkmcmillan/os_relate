import request from 'supertest';
import { app } from '../server';
import { prisma, createTestUser, generateTestTokens, testFixtures } from './setup';

describe('User Management', () => {
  let authUser: any;
  let authToken: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    authUser = user;
    const { accessToken } = generateTestTokens(user.id);
    authToken = accessToken;
  });

  describe('GET /api/user/profile', () => {
    it('should retrieve user profile', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: authUser.id,
        email: authUser.email,
        profile: expect.objectContaining({
          name: authUser.profile.name
        })
      });
    });

    it('should include all profile fields', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.profile).toHaveProperty('timezone');
      expect(response.body.profile).toHaveProperty('language');
      expect(response.body.profile).toHaveProperty('toughLoveEnabled');
    });
  });

  describe('PATCH /api/user/profile', () => {
    it('should update profile information', async () => {
      const updateData = {
        name: 'Updated Name',
        timezone: 'America/New_York',
        language: 'es'
      };

      const response = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.profile).toMatchObject(updateData);

      // Verify in database
      const profile = await prisma.userProfile.findUnique({
        where: { userId: authUser.id }
      });
      expect(profile?.name).toBe('Updated Name');
      expect(profile?.timezone).toBe('America/New_York');
    });

    it('should reject invalid timezone', async () => {
      const response = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ timezone: 'Invalid/Timezone' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('timezone');
    });

    it('should reject invalid language code', async () => {
      const response = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('language');
    });
  });

  describe('Psychological Profile', () => {
    describe('PUT /api/user/psychological-profile', () => {
      it('should create psychological profile', async () => {
        const response = await request(app)
          .put('/api/user/psychological-profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testFixtures.psychologicalProfile);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(testFixtures.psychologicalProfile);

        // Verify in database
        const profile = await prisma.psychologicalProfile.findUnique({
          where: { userId: authUser.id }
        });
        expect(profile?.meyersBriggs).toBe('INTJ');
        expect(profile?.enneagram).toBe('5w4');
      });

      it('should update existing psychological profile', async () => {
        // Create initial profile
        await prisma.psychologicalProfile.create({
          data: {
            userId: authUser.id,
            ...testFixtures.psychologicalProfile
          }
        });

        // Update profile
        const updateData = { ...testFixtures.psychologicalProfile, meyersBriggs: 'ENTJ' };
        const response = await request(app)
          .put('/api/user/psychological-profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.meyersBriggs).toBe('ENTJ');
      });

      it('should validate Myers-Briggs format', async () => {
        const invalidData = { ...testFixtures.psychologicalProfile, meyersBriggs: 'INVALID' };
        const response = await request(app)
          .put('/api/user/psychological-profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Myers-Briggs');
      });

      it('should validate Big Five scores range (0-100)', async () => {
        const invalidData = {
          ...testFixtures.psychologicalProfile,
          bigFive: { ...testFixtures.psychologicalProfile.bigFive, openness: 150 }
        };

        const response = await request(app)
          .put('/api/user/psychological-profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Big Five');
      });
    });

    describe('GET /api/user/psychological-profile', () => {
      it('should retrieve psychological profile', async () => {
        await prisma.psychologicalProfile.create({
          data: {
            userId: authUser.id,
            ...testFixtures.psychologicalProfile
          }
        });

        const response = await request(app)
          .get('/api/user/psychological-profile')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(testFixtures.psychologicalProfile);
      });

      it('should return 404 if no profile exists', async () => {
        const response = await request(app)
          .get('/api/user/psychological-profile')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Core Values', () => {
    describe('POST /api/user/core-values', () => {
      it('should create core value', async () => {
        const response = await request(app)
          .post('/api/user/core-values')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testFixtures.coreValue);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject(testFixtures.coreValue);
        expect(response.body).toHaveProperty('id');
      });

      it('should enforce priority uniqueness', async () => {
        await prisma.coreValue.create({
          data: { ...testFixtures.coreValue, userId: authUser.id }
        });

        const response = await request(app)
          .post('/api/user/core-values')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...testFixtures.coreValue, name: 'Different Value' });

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('priority');
      });

      it('should validate priority range (1-10)', async () => {
        const response = await request(app)
          .post('/api/user/core-values')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...testFixtures.coreValue, priority: 15 });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('priority');
      });
    });

    describe('GET /api/user/core-values', () => {
      it('should list all core values ordered by priority', async () => {
        await prisma.coreValue.createMany({
          data: [
            { ...testFixtures.coreValue, userId: authUser.id, priority: 1 },
            { ...testFixtures.coreValue, userId: authUser.id, name: 'Growth', priority: 2 },
            { ...testFixtures.coreValue, userId: authUser.id, name: 'Family', priority: 3 }
          ]
        });

        const response = await request(app)
          .get('/api/user/core-values')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(3);
        expect(response.body[0].priority).toBe(1);
        expect(response.body[2].priority).toBe(3);
      });
    });

    describe('PATCH /api/user/core-values/:id', () => {
      it('should update core value', async () => {
        const value = await prisma.coreValue.create({
          data: { ...testFixtures.coreValue, userId: authUser.id }
        });

        const response = await request(app)
          .patch(`/api/user/core-values/${value.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ description: 'Updated description' });

        expect(response.status).toBe(200);
        expect(response.body.description).toBe('Updated description');
      });

      it('should not allow updating other users values', async () => {
        const { user: otherUser } = await createTestUser();
        const value = await prisma.coreValue.create({
          data: { ...testFixtures.coreValue, userId: otherUser.id }
        });

        const response = await request(app)
          .patch(`/api/user/core-values/${value.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ description: 'Hacked' });

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/user/core-values/:id', () => {
      it('should delete core value', async () => {
        const value = await prisma.coreValue.create({
          data: { ...testFixtures.coreValue, userId: authUser.id }
        });

        const response = await request(app)
          .delete(`/api/user/core-values/${value.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        const deleted = await prisma.coreValue.findUnique({ where: { id: value.id } });
        expect(deleted).toBeNull();
      });
    });
  });

  describe('Mentors', () => {
    describe('POST /api/user/mentors', () => {
      it('should create mentor', async () => {
        const response = await request(app)
          .post('/api/user/mentors')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testFixtures.mentor);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject(testFixtures.mentor);
      });

      it('should enforce maximum of 5 mentors', async () => {
        // Create 5 mentors
        for (let i = 0; i < 5; i++) {
          await prisma.mentor.create({
            data: { ...testFixtures.mentor, userId: authUser.id, name: `Mentor ${i}` }
          });
        }

        const response = await request(app)
          .post('/api/user/mentors')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...testFixtures.mentor, name: 'Sixth Mentor' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('maximum');
      });
    });

    describe('GET /api/user/mentors', () => {
      it('should list all mentors', async () => {
        await prisma.mentor.createMany({
          data: [
            { ...testFixtures.mentor, userId: authUser.id },
            { ...testFixtures.mentor, userId: authUser.id, name: 'Seneca' }
          ]
        });

        const response = await request(app)
          .get('/api/user/mentors')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
      });
    });

    describe('DELETE /api/user/mentors/:id', () => {
      it('should delete mentor', async () => {
        const mentor = await prisma.mentor.create({
          data: { ...testFixtures.mentor, userId: authUser.id }
        });

        const response = await request(app)
          .delete(`/api/user/mentors/${mentor.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);
      });
    });
  });

  describe('Focus Areas', () => {
    describe('POST /api/user/focus-areas', () => {
      it('should create focus area', async () => {
        const response = await request(app)
          .post('/api/user/focus-areas')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testFixtures.focusArea);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          name: testFixtures.focusArea.name,
          status: testFixtures.focusArea.status
        });
      });

      it('should validate target date is in future', async () => {
        const response = await request(app)
          .post('/api/user/focus-areas')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...testFixtures.focusArea, targetDate: new Date('2020-01-01') });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('future');
      });

      it('should validate status enum', async () => {
        const response = await request(app)
          .post('/api/user/focus-areas')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...testFixtures.focusArea, status: 'INVALID' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('status');
      });
    });

    describe('GET /api/user/focus-areas', () => {
      it('should filter focus areas by status', async () => {
        await prisma.focusArea.createMany({
          data: [
            { ...testFixtures.focusArea, userId: authUser.id, status: 'ACTIVE' },
            { ...testFixtures.focusArea, userId: authUser.id, name: 'Old Goal', status: 'COMPLETED' }
          ]
        });

        const response = await request(app)
          .get('/api/user/focus-areas?status=ACTIVE')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].status).toBe('ACTIVE');
      });
    });

    describe('PATCH /api/user/focus-areas/:id', () => {
      it('should update focus area progress', async () => {
        const focusArea = await prisma.focusArea.create({
          data: { ...testFixtures.focusArea, userId: authUser.id }
        });

        const response = await request(app)
          .patch(`/api/user/focus-areas/${focusArea.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ progress: 75, status: 'IN_PROGRESS' });

        expect(response.status).toBe(200);
        expect(response.body.progress).toBe(75);
        expect(response.body.status).toBe('IN_PROGRESS');
      });
    });
  });

  describe('Settings', () => {
    it('should update tough love preference', async () => {
      const response = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ toughLoveEnabled: true });

      expect(response.status).toBe(200);
      expect(response.body.profile.toughLoveEnabled).toBe(true);
    });

    it('should update notification preferences', async () => {
      const response = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notificationPreferences: {
            email: true,
            push: false,
            weeklyDigest: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.profile.notificationPreferences).toMatchObject({
        email: true,
        push: false
      });
    });
  });
});
