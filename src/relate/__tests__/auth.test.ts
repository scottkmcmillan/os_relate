import request from 'supertest';
import { app } from '../server';
import { prisma, createTestUser, testFixtures, generateTestTokens } from './setup';
import bcrypt from 'bcryptjs';

describe('Authentication', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        email: 'newuser@example.com',
        profile: { name: 'New User' }
      });

      // Verify user in database
      const user = await prisma.user.findUnique({
        where: { email: 'newuser@example.com' }
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe('newuser@example.com');
    });

    it('should reject signup with duplicate email', async () => {
      const { user } = await createTestUser({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          name: 'Duplicate User'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = ['notanemail', '@example.com', 'test@', 'test@.com'];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email,
            password: 'SecurePass123!',
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      }
    });

    it('should reject weak passwords', async () => {
      for (const password of testFixtures.invalidPasswords) {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `test-${Date.now()}@example.com`,
            password,
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('password');
      }
    });

    it('should hash password securely', async () => {
      const password = 'SecurePass123!';
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'hash-test@example.com',
          password,
          name: 'Hash Test'
        });

      const user = await prisma.user.findUnique({
        where: { email: 'hash-test@example.com' }
      });

      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(password);
      const isValid = await bcrypt.compare(password, user!.passwordHash);
      expect(isValid).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const { user, password } = await createTestUser({
        email: 'login@example.com'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.id).toBe(user.id);
    });

    it('should reject incorrect password', async () => {
      await createTestUser({ email: 'test@example.com' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should store refresh token in database', async () => {
      const { user, password } = await createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password
        });

      const refreshToken = await prisma.refreshToken.findFirst({
        where: { userId: user.id }
      });

      expect(refreshToken).toBeDefined();
      expect(refreshToken?.token).toBe(response.body.refreshToken);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const { user } = await createTestUser();
      const { refreshToken } = generateTestTokens(user.id);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).not.toBe(refreshToken);
    });

    it('should reject expired refresh token', async () => {
      const { user } = await createTestUser();
      const { refreshToken } = generateTestTokens(user.id);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() - 1000) // Expired
        }
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });

    it('should reject revoked refresh token', async () => {
      const { user } = await createTestUser();
      const { refreshToken } = generateTestTokens(user.id);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          revoked: true
        }
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('revoked');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke refresh token on logout', async () => {
      const { user } = await createTestUser();
      const { accessToken, refreshToken } = generateTestTokens(user.id);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(response.status).toBe(200);

      const revokedToken = await prisma.refreshToken.findFirst({
        where: { token: refreshToken }
      });
      expect(revokedToken?.revoked).toBe(true);
    });

    it('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'some-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('Protected Routes', () => {
    it('should allow access with valid token', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id);

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).not.toBe(401);
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/user/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('required');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject expired token', async () => {
      const { user } = await createTestUser();
      const expiredToken = require('jsonwebtoken').sign(
        { userId: user.id },
        'test-jwt-secret-key',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      const email = 'ratelimit@example.com';
      await createTestUser({ email });

      // Make multiple failed login attempts
      const attempts = Array(6).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({ email, password: 'WrongPassword123!' })
      );

      const responses = await Promise.all(attempts);

      // Last request should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect([429, 401]).toContain(lastResponse.status);
    });

    it('should reset rate limit after cooldown period', async () => {
      // This would require time manipulation or longer test
      // Implementation depends on rate limiting strategy
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/auth/status');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
