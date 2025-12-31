/**
 * Authentication Service
 *
 * Handles user authentication operations including signup, login, logout, and token management.
 * Uses bcrypt for password hashing with cost factor 12.
 */

import bcrypt from 'bcryptjs';
import { generateTokenPair, verifyToken, TokenPayload, TokenPair } from './jwt.js';
import * as db from './db.js';

// Bcrypt cost factor (higher = more secure but slower)
const BCRYPT_COST_FACTOR = 12;

// User interface (matches database schema)
export interface User {
  id: string;
  email: string;
  fullName: string;
  passwordHash?: string; // Optional - don't return in API responses
  timezone?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// Authentication result
export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Session information
export interface Session {
  id: string;
  userId: string;
  deviceId?: string;
  refreshToken: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
}

/**
 * Password validation rules
 * - Min 8 characters
 * - At least 1 uppercase
 * - At least 1 lowercase
 * - At least 1 number
 * - At least 1 special character
 */
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least 1 lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least 1 special character');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Email validation
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Verify password against hash using constant-time comparison
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Register a new user account
 *
 * @param email - User email (must be unique)
 * @param password - User password (will be validated and hashed)
 * @param name - User's full name
 * @param timezone - User's timezone (optional)
 * @returns Authentication result with tokens
 * @throws Error if validation fails or email already exists
 */
export async function signup(
  email: string,
  password: string,
  name: string,
  timezone?: string
): Promise<AuthResult> {
  // Validate email
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  // Validate name
  if (!name || name.trim().length < 2 || name.trim().length > 100) {
    throw new Error('Name must be between 2 and 100 characters');
  }

  // Check if user already exists
  const existingUser = await db.findUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await db.createUser({
    email: email.toLowerCase().trim(),
    fullName: name.trim(),
    passwordHash,
    timezone: timezone || 'UTC',
  });

  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);

  // Create session
  await db.createSession({
    userId: user.id,
    refreshToken: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  });

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    ...tokens,
  };
}

/**
 * Authenticate user and return tokens
 *
 * @param email - User email
 * @param password - User password
 * @param deviceId - Optional device identifier for session tracking
 * @returns Authentication result with tokens
 * @throws Error if credentials are invalid
 */
export async function login(
  email: string,
  password: string,
  deviceId?: string
): Promise<AuthResult> {
  // Find user by email
  const user = await db.findUserByEmail(email.toLowerCase().trim());
  if (!user || !user.passwordHash) {
    // Use generic error message to avoid leaking information
    throw new Error('Invalid email or password');
  }

  // Verify password using constant-time comparison
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Update last login timestamp
  await db.updateUserLastLogin(user.id);

  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);

  // Create new session
  await db.createSession({
    userId: user.id,
    refreshToken: tokens.refreshToken,
    deviceId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  });

  // Return user without password hash
  const { passwordHash: _, lastLoginAt, ...userWithoutPassword } = user;

  return {
    user: {
      ...userWithoutPassword,
      lastLoginAt: new Date().toISOString(),
    },
    ...tokens,
  };
}

/**
 * Logout user and invalidate session
 *
 * @param userId - User ID
 * @param sessionId - Optional specific session to invalidate
 */
export async function logout(userId: string, sessionId?: string): Promise<void> {
  if (sessionId) {
    await db.deleteSession(sessionId);
  } else {
    // If no sessionId provided, delete all sessions for user
    await db.deleteUserSessions(userId);
  }
}

/**
 * Refresh access token using refresh token
 *
 * @param refreshToken - Valid refresh token
 * @returns New token pair
 * @throws Error if refresh token is invalid or expired
 */
export async function refreshToken(refreshToken: string): Promise<TokenPair> {
  // Verify refresh token
  let payload: TokenPayload;
  try {
    payload = verifyToken(refreshToken);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }

  // Verify token type
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  // Verify session exists and is valid
  const session = await db.findSessionByToken(refreshToken);
  if (!session) {
    throw new Error('Session not found or expired');
  }

  // Check session expiry
  if (new Date(session.expiresAt) < new Date()) {
    await db.deleteSession(session.id);
    throw new Error('Session expired');
  }

  // Generate new token pair
  const tokens = generateTokenPair(payload.userId, payload.email);

  // Update session with new refresh token
  await db.updateSession(session.id, {
    refreshToken: tokens.refreshToken,
    lastUsedAt: new Date().toISOString(),
  });

  return tokens;
}

/**
 * Validate access token and return user
 *
 * @param accessToken - JWT access token
 * @returns User information
 * @throws Error if token is invalid
 */
export async function validateToken(accessToken: string): Promise<User> {
  // Verify token
  let payload: TokenPayload;
  try {
    payload = verifyToken(accessToken);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }

  // Verify token type
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }

  // Get user from database
  const user = await db.findUserById(payload.userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Revoke all sessions for a user (useful for security incidents)
 *
 * @param userId - User ID
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.deleteUserSessions(userId);
}

/**
 * Get all active sessions for a user
 *
 * @param userId - User ID
 * @returns List of active sessions
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  return db.getUserSessions(userId);
}

/**
 * Change user password
 *
 * @param userId - User ID
 * @param currentPassword - Current password for verification
 * @param newPassword - New password
 * @throws Error if current password is incorrect or new password is invalid
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Get user
  const user = await db.findUserById(userId);
  if (!user || !user.passwordHash) {
    throw new Error('User not found');
  }

  // Verify current password
  const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await db.updateUserPassword(userId, newPasswordHash);

  // Revoke all sessions for security
  await revokeAllSessions(userId);
}
