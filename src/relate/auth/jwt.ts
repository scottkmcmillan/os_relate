/**
 * JWT Token Management with RS256 Algorithm
 *
 * Provides secure token generation and verification using RS256 (RSA with SHA-256).
 * - Access tokens: 15 minute expiry
 * - Refresh tokens: 7 day expiry
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Token payload interfaces
export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export interface SignOptions {
  expiresIn?: string | number;
  audience?: string;
  issuer?: string;
}

// Token expiry constants
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Key storage
let privateKey: string;
let publicKey: string;

/**
 * Initialize or load RS256 key pair
 * Keys are generated if they don't exist or loaded from environment variables
 */
function initializeKeys(): void {
  // Check for keys in environment variables first
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    privateKey = Buffer.from(process.env.JWT_PRIVATE_KEY, 'base64').toString('utf-8');
    publicKey = Buffer.from(process.env.JWT_PUBLIC_KEY, 'base64').toString('utf-8');
    console.log('[JWT] Loaded keys from environment variables');
    return;
  }

  // Try to load from files
  const keysDir = path.join(process.cwd(), 'config', 'keys');
  const privateKeyPath = path.join(keysDir, 'jwt-private.pem');
  const publicKeyPath = path.join(keysDir, 'jwt-public.pem');

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
    console.log('[JWT] Loaded keys from files');
    return;
  }

  // Generate new keys if they don't exist
  console.log('[JWT] Generating new RS256 key pair...');
  const { privateKey: privKey, publicKey: pubKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  privateKey = privKey;
  publicKey = pubKey;

  // Save keys to files
  try {
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
    fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });
    console.log('[JWT] Keys saved to:', keysDir);
  } catch (error) {
    console.warn('[JWT] Failed to save keys to file, using in-memory keys:', error);
  }
}

// Initialize keys on module load
initializeKeys();

/**
 * Sign a JWT token with RS256 algorithm
 *
 * @param payload - Token payload containing user information
 * @param options - Optional signing options
 * @returns Signed JWT token
 */
export function signToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  options?: SignOptions
): string {
  const signOptions: jwt.SignOptions = {
    algorithm: 'RS256',
    expiresIn: options?.expiresIn || ACCESS_TOKEN_EXPIRY,
    issuer: options?.issuer || 'pka-relate-api',
    audience: options?.audience || 'pka-relate-app',
  };

  return jwt.sign(payload, privateKey, signOptions);
}

/**
 * Verify and decode a JWT token
 *
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'pka-relate-api',
      audience: 'pka-relate-app',
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('TOKEN_INVALID');
    } else {
      throw new Error('TOKEN_VERIFICATION_FAILED');
    }
  }
}

/**
 * Generate both access and refresh tokens
 *
 * @param userId - User ID
 * @param email - User email
 * @returns Token pair with access and refresh tokens
 */
export function generateTokenPair(userId: string, email: string): TokenPair {
  const accessToken = signToken(
    { userId, email, type: 'access' },
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = signToken(
    { userId, email, type: 'refresh' },
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  // Calculate expiry time for access token (15 minutes from now)
  const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

/**
 * Decode token without verification (for debugging/logging)
 * WARNING: Do not use for authentication - use verifyToken instead
 *
 * @param token - JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired without verification
 *
 * @param token - JWT token to check
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  return decoded.exp < Math.floor(Date.now() / 1000);
}

/**
 * Get the public key (for external verification if needed)
 *
 * @returns Public key in PEM format
 */
export function getPublicKey(): string {
  return publicKey;
}

/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Extracted token or null
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}
