/**
 * Authentication System Tests
 *
 * Tests for JWT, service layer, middleware, and routes.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as authService from '../src/relate/auth/service.js';
import * as jwt from '../src/relate/auth/jwt.js';
import * as db from '../src/relate/auth/db.js';

// Clean up database after all tests
afterAll(() => {
  db.closeDatabase();
});

describe('Authentication System', () => {
  describe('JWT Token Management', () => {
    it('should generate and verify RS256 tokens', () => {
      const payload = {
        userId: 'usr_test123',
        email: 'test@example.com',
        type: 'access' as const,
      };

      const token = jwt.signToken(payload);
      expect(token).toBeTruthy();

      const verified = jwt.verifyToken(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
      expect(verified.type).toBe('access');
    });

    it('should generate token pair with correct expiry', () => {
      const tokens = jwt.generateTokenPair('usr_test123', 'test@example.com');

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should extract token from Authorization header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;

      const extracted = jwt.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid Authorization header', () => {
      expect(jwt.extractTokenFromHeader(undefined)).toBeNull();
      expect(jwt.extractTokenFromHeader('InvalidFormat')).toBeNull();
      expect(jwt.extractTokenFromHeader('Basic token123')).toBeNull();
    });

    it('should detect expired tokens', () => {
      // Create a token with -1 second expiry (already expired)
      const payload = {
        userId: 'usr_test123',
        email: 'test@example.com',
        type: 'access' as const,
      };

      const expiredToken = jwt.signToken(payload, { expiresIn: -1 });

      expect(() => jwt.verifyToken(expiredToken)).toThrow();
    });
  });

  describe('Password Validation', () => {
    it('should reject weak passwords', async () => {
      await expect(
        authService.signup('test@example.com', 'weak', 'Test User')
      ).rejects.toThrow();

      await expect(
        authService.signup('test@example.com', 'NoNumbers!', 'Test User')
      ).rejects.toThrow();

      await expect(
        authService.signup('test@example.com', 'nouppercase1!', 'Test User')
      ).rejects.toThrow();

      await expect(
        authService.signup('test@example.com', 'NOLOWERCASE1!', 'Test User')
      ).rejects.toThrow();

      await expect(
        authService.signup('test@example.com', 'NoSpecialChar1', 'Test User')
      ).rejects.toThrow();
    });
  });

  describe('User Signup', () => {
    const testEmail = `test-${Date.now()}@example.com`;

    it('should create a new user with valid credentials', async () => {
      const result = await authService.signup(
        testEmail,
        'SecurePass123!',
        'Test User',
        'America/New_York'
      );

      expect(result.user.id).toBeTruthy();
      expect(result.user.email).toBe(testEmail.toLowerCase());
      expect(result.user.fullName).toBe('Test User');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Password should not be in response
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      await authService.signup(email, 'SecurePass123!', 'User One');

      await expect(
        authService.signup(email, 'SecurePass123!', 'User Two')
      ).rejects.toThrow('already exists');
    });

    it('should reject invalid email format', async () => {
      await expect(
        authService.signup('not-an-email', 'SecurePass123!', 'Test User')
      ).rejects.toThrow('Invalid email format');
    });

    it('should reject invalid name', async () => {
      await expect(
        authService.signup('test@example.com', 'SecurePass123!', 'A')
      ).rejects.toThrow('Name must be between 2 and 100 characters');
    });
  });

  describe('User Login', () => {
    const testEmail = `login-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';

    beforeEach(async () => {
      // Create a test user
      await authService.signup(testEmail, testPassword, 'Test User');
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login(testEmail, testPassword);

      expect(result.user.id).toBeTruthy();
      expect(result.user.email).toBe(testEmail.toLowerCase());
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.lastLoginAt).toBeTruthy();
    });

    it('should reject invalid password', async () => {
      await expect(
        authService.login(testEmail, 'WrongPassword123!')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      await expect(
        authService.login('nonexistent@example.com', testPassword)
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('Token Refresh', () => {
    const testEmail = `refresh-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';
    let refreshToken: string;

    beforeEach(async () => {
      const result = await authService.signup(testEmail, testPassword, 'Test User');
      refreshToken = result.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const tokens = await authService.refreshToken(refreshToken);

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.accessToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow();
    });
  });

  describe('Token Validation', () => {
    const testEmail = `validate-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';
    let accessToken: string;

    beforeEach(async () => {
      const result = await authService.signup(testEmail, testPassword, 'Test User');
      accessToken = result.accessToken;
    });

    it('should validate valid access token', async () => {
      const user = await authService.validateToken(accessToken);

      expect(user.id).toBeTruthy();
      expect(user.email).toBe(testEmail.toLowerCase());
      expect((user as any).passwordHash).toBeUndefined();
    });

    it('should reject invalid access token', async () => {
      await expect(
        authService.validateToken('invalid-token')
      ).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    const testEmail = `session-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';
    let userId: string;

    beforeEach(async () => {
      const result = await authService.signup(testEmail, testPassword, 'Test User');
      userId = result.user.id;
    });

    it('should create session on login', async () => {
      await authService.login(testEmail, testPassword, 'device-123');

      const sessions = await authService.getUserSessions(userId);
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should logout and invalidate session', async () => {
      await authService.login(testEmail, testPassword);
      await authService.logout(userId);

      const sessions = await authService.getUserSessions(userId);
      expect(sessions.length).toBe(0);
    });

    it('should revoke all sessions', async () => {
      await authService.login(testEmail, testPassword, 'device-1');
      await authService.login(testEmail, testPassword, 'device-2');

      await authService.revokeAllSessions(userId);

      const sessions = await authService.getUserSessions(userId);
      expect(sessions.length).toBe(0);
    });
  });

  describe('Database Operations', () => {
    it('should create and find user by email', () => {
      const email = `db-test-${Date.now()}@example.com`;

      const user = db.createUser({
        email,
        fullName: 'DB Test User',
        passwordHash: 'test-hash',
        timezone: 'UTC',
      });

      expect(user.id).toBeTruthy();
      expect(user.email).toBe(email);

      const found = db.findUserByEmail(email);
      expect(found?.id).toBe(user.id);
      expect(found?.email).toBe(email);
    });

    it('should find user by ID', () => {
      const user = db.createUser({
        email: `db-id-${Date.now()}@example.com`,
        fullName: 'DB Test User',
        passwordHash: 'test-hash',
      });

      const found = db.findUserById(user.id);
      expect(found?.id).toBe(user.id);
    });

    it('should update last login timestamp', () => {
      const user = db.createUser({
        email: `db-login-${Date.now()}@example.com`,
        fullName: 'DB Test User',
        passwordHash: 'test-hash',
      });

      db.updateUserLastLogin(user.id);

      const updated = db.findUserById(user.id);
      expect(updated?.lastLoginAt).toBeTruthy();
    });

    it('should create and find session', () => {
      const user = db.createUser({
        email: `db-session-${Date.now()}@example.com`,
        fullName: 'DB Test User',
        passwordHash: 'test-hash',
      });

      const session = db.createSession({
        userId: user.id,
        refreshToken: `token-${Date.now()}`,
        deviceId: 'test-device',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(session.id).toBeTruthy();

      const found = db.findSessionByToken(session.refreshToken);
      expect(found?.id).toBe(session.id);
    });
  });
});
