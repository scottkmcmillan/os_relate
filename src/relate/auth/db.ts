/**
 * Database Operations for Authentication
 *
 * Handles database operations for users and sessions.
 * Uses SQLite for development with in-memory fallback.
 *
 * SECURITY NOTES:
 * - Passwords are NEVER stored in plain text
 * - All passwords are hashed with bcrypt (cost factor 12)
 * - Sessions are tracked for token revocation
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Database instance
let db: Database.Database;

// Initialize database
function initializeDatabase(): void {
  try {
    // Use SQLite file for persistence in development
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'auth.db');
    db = new Database(dbPath);

    console.log('[Auth DB] Initialized SQLite database at:', dbPath);
  } catch (error) {
    console.warn('[Auth DB] Failed to create file-based database, using in-memory:', error);
    db = new Database(':memory:');
  }

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  createTables();
}

/**
 * Create database tables
 */
function createTables(): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      timezone TEXT DEFAULT 'UTC',
      created_at TEXT NOT NULL,
      last_login_at TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // Create index on email for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token TEXT UNIQUE NOT NULL,
      device_id TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create index on user_id and refresh_token
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
  `);

  console.log('[Auth DB] Tables created successfully');
}

// Initialize on module load
initializeDatabase();

/**
 * User database interface
 */
export interface UserData {
  email: string;
  fullName: string;
  passwordHash: string;
  timezone?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  timezone: string;
  createdAt: string;
  lastLoginAt?: string;
  updatedAt: string;
}

/**
 * Session database interface
 */
export interface SessionData {
  userId: string;
  refreshToken: string;
  deviceId?: string;
  expiresAt: string;
}

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  deviceId?: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
}

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Create a new user
 *
 * @param userData - User data (email, name, password hash)
 * @returns Created user
 */
export function createUser(userData: UserData): User {
  const id = generateId('usr');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, full_name, password_hash, timezone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    userData.email,
    userData.fullName,
    userData.passwordHash,
    userData.timezone || 'UTC',
    now,
    now
  );

  return {
    id,
    email: userData.email,
    fullName: userData.fullName,
    passwordHash: userData.passwordHash,
    timezone: userData.timezone || 'UTC',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Find user by email
 *
 * @param email - User email
 * @returns User or undefined if not found
 */
export function findUserByEmail(email: string): User | undefined {
  const stmt = db.prepare(`
    SELECT
      id,
      email,
      full_name as fullName,
      password_hash as passwordHash,
      timezone,
      created_at as createdAt,
      last_login_at as lastLoginAt,
      updated_at as updatedAt
    FROM users
    WHERE email = ?
  `);

  return stmt.get(email) as User | undefined;
}

/**
 * Find user by ID
 *
 * @param id - User ID
 * @returns User or undefined if not found
 */
export function findUserById(id: string): User | undefined {
  const stmt = db.prepare(`
    SELECT
      id,
      email,
      full_name as fullName,
      password_hash as passwordHash,
      timezone,
      created_at as createdAt,
      last_login_at as lastLoginAt,
      updated_at as updatedAt
    FROM users
    WHERE id = ?
  `);

  return stmt.get(id) as User | undefined;
}

/**
 * Update user's last login timestamp
 *
 * @param userId - User ID
 */
export function updateUserLastLogin(userId: string): void {
  const stmt = db.prepare(`
    UPDATE users
    SET last_login_at = ?, updated_at = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();
  stmt.run(now, now, userId);
}

/**
 * Update user password
 *
 * @param userId - User ID
 * @param passwordHash - New password hash
 */
export function updateUserPassword(userId: string, passwordHash: string): void {
  const stmt = db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();
  stmt.run(passwordHash, now, userId);
}

/**
 * Create a new session
 *
 * @param sessionData - Session data
 * @returns Created session
 */
export function createSession(sessionData: SessionData): Session {
  const id = generateId('ses');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, refresh_token, device_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    sessionData.userId,
    sessionData.refreshToken,
    sessionData.deviceId || null,
    now,
    sessionData.expiresAt
  );

  return {
    id,
    userId: sessionData.userId,
    refreshToken: sessionData.refreshToken,
    deviceId: sessionData.deviceId,
    createdAt: now,
    expiresAt: sessionData.expiresAt,
  };
}

/**
 * Find session by refresh token
 *
 * @param refreshToken - Refresh token
 * @returns Session or undefined if not found
 */
export function findSessionByToken(refreshToken: string): Session | undefined {
  const stmt = db.prepare(`
    SELECT
      id,
      user_id as userId,
      refresh_token as refreshToken,
      device_id as deviceId,
      created_at as createdAt,
      expires_at as expiresAt,
      last_used_at as lastUsedAt
    FROM sessions
    WHERE refresh_token = ?
  `);

  return stmt.get(refreshToken) as Session | undefined;
}

/**
 * Update session
 *
 * @param sessionId - Session ID
 * @param updates - Session updates
 */
export function updateSession(
  sessionId: string,
  updates: { refreshToken?: string; lastUsedAt?: string }
): void {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.refreshToken) {
    fields.push('refresh_token = ?');
    values.push(updates.refreshToken);
  }

  if (updates.lastUsedAt) {
    fields.push('last_used_at = ?');
    values.push(updates.lastUsedAt);
  }

  if (fields.length === 0) {
    return;
  }

  values.push(sessionId);

  const stmt = db.prepare(`
    UPDATE sessions
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);
}

/**
 * Delete a session
 *
 * @param sessionId - Session ID
 */
export function deleteSession(sessionId: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(sessionId);
}

/**
 * Delete all sessions for a user
 *
 * @param userId - User ID
 */
export function deleteUserSessions(userId: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
  stmt.run(userId);
}

/**
 * Get all sessions for a user
 *
 * @param userId - User ID
 * @returns List of sessions
 */
export function getUserSessions(userId: string): Session[] {
  const stmt = db.prepare(`
    SELECT
      id,
      user_id as userId,
      refresh_token as refreshToken,
      device_id as deviceId,
      created_at as createdAt,
      expires_at as expiresAt,
      last_used_at as lastUsedAt
    FROM sessions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(userId) as Session[];
}

/**
 * Clean up expired sessions
 * Should be called periodically (e.g., via cron job)
 */
export function cleanupExpiredSessions(): number {
  const stmt = db.prepare(`
    DELETE FROM sessions
    WHERE expires_at < ?
  `);

  const now = new Date().toISOString();
  const result = stmt.run(now);

  return result.changes;
}

/**
 * Get database instance (for testing or advanced operations)
 */
export function getDatabase(): Database.Database {
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
