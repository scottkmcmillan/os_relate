/**
 * Authentication Middleware for PKA-STRAT API
 * Implements JWT token validation using Supabase public key
 * @module api/middleware/auth
 */
import { Request, Response, NextFunction } from 'express';
import { APIException } from './error.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User roles within the PKA-STRAT system
 * - leader: Full access to all organizational data and settings
 * - manager: Access to team-level data and limited org settings
 * - member: Access to own data and team visibility
 */
export type UserRole = 'leader' | 'manager' | 'member';

/**
 * Authenticated user information extracted from JWT
 */
export interface AuthUser {
  /** Supabase user ID (UUID) */
  id: string;
  /** User email address */
  email: string;
  /** User role determining permissions */
  role: UserRole;
  /** Organization the user belongs to */
  organizationId: string;
  /** Optional team ID for team-scoped access */
  teamId?: string;
  /** JWT expiration timestamp */
  exp?: number;
  /** JWT issued at timestamp */
  iat?: number;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * JWT payload structure from Supabase
 */
interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: {
    role?: UserRole;
    organization_id?: string;
    team_id?: string;
  };
  user_metadata?: {
    role?: UserRole;
    organization_id?: string;
    team_id?: string;
  };
  exp?: number;
  iat?: number;
  aud?: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get Supabase JWT secret from environment
 * In production, this should be the Supabase JWT secret or public key
 */
function getJwtSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    console.warn('WARNING: No JWT secret configured. Using development fallback.');
    return 'development-secret-do-not-use-in-production';
  }
  return secret;
}

/**
 * Validate if a string is a valid role
 */
function isValidRole(role: string | undefined): role is UserRole {
  return role === 'leader' || role === 'manager' || role === 'member';
}

// ============================================================================
// JWT Utilities
// ============================================================================

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

/**
 * Decode JWT payload without verification (for payload extraction)
 * Note: In production, use proper JWT library with signature verification
 */
function decodeJwtPayload(token: string): SupabaseJwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new APIException(401, 'INVALID_TOKEN', 'Malformed JWT token');
  }

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload as SupabaseJwtPayload;
  } catch (error) {
    throw new APIException(401, 'INVALID_TOKEN', 'Failed to decode JWT payload');
  }
}

/**
 * Verify JWT signature using HMAC-SHA256
 * For production with RS256, use crypto.createVerify with public key
 */
async function verifyJwtSignature(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;

  try {
    // Use Web Crypto API for HMAC verification
    const { createHmac } = await import('crypto');
    const expectedSignature = createHmac('sha256', secret)
      .update(data)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const sig = signature.replace(/=/g, '');
    const expected = expectedSignature.replace(/=/g, '');

    if (sig.length !== expected.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error('JWT signature verification failed:', error);
    return false;
  }
}

/**
 * Extract user information from decoded JWT payload
 */
function extractUserFromPayload(payload: SupabaseJwtPayload): AuthUser {
  // Try app_metadata first (Supabase convention), then user_metadata
  const metadata = payload.app_metadata || payload.user_metadata || {};

  const role = metadata.role || payload.role;
  if (!isValidRole(role)) {
    throw new APIException(401, 'INVALID_ROLE', 'User role is missing or invalid');
  }

  const organizationId = metadata.organization_id;
  if (!organizationId) {
    throw new APIException(401, 'MISSING_ORG', 'Organization ID is missing from token');
  }

  return {
    id: payload.sub,
    email: payload.email || '',
    role,
    organizationId,
    teamId: metadata.team_id,
    exp: payload.exp,
    iat: payload.iat
  };
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

/**
 * Primary authentication middleware
 * Validates JWT token and enriches request with user information
 *
 * Usage:
 * ```typescript
 * app.use('/api/protected', authenticateToken);
 * ```
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      throw new APIException(401, 'NO_TOKEN', 'No authentication token provided');
    }

    // Decode and validate token structure
    const payload = decodeJwtPayload(token);

    // Check token expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new APIException(401, 'TOKEN_EXPIRED', 'Authentication token has expired');
    }

    // Verify signature in production
    const secret = getJwtSecret();
    if (secret !== 'development-secret-do-not-use-in-production') {
      const isValid = await verifyJwtSignature(token, secret);
      if (!isValid) {
        throw new APIException(401, 'INVALID_SIGNATURE', 'Token signature verification failed');
      }
    }

    // Extract and attach user to request
    req.user = extractUserFromPayload(payload);
    next();
  } catch (error) {
    if (error instanceof APIException) {
      next(error);
    } else {
      next(new APIException(401, 'AUTH_ERROR', 'Authentication failed'));
    }
  }
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but allows request to proceed if no token
 *
 * Usage:
 * ```typescript
 * app.use('/api/public', optionalAuth);
 * ```
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      // No token provided, proceed without user context
      next();
      return;
    }

    // Attempt to authenticate
    const payload = decodeJwtPayload(token);

    // Skip if expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      next();
      return;
    }

    // Verify signature if configured
    const secret = getJwtSecret();
    if (secret !== 'development-secret-do-not-use-in-production') {
      const isValid = await verifyJwtSignature(token, secret);
      if (!isValid) {
        next();
        return;
      }
    }

    // Extract user if valid
    try {
      req.user = extractUserFromPayload(payload);
    } catch {
      // Ignore extraction errors for optional auth
    }

    next();
  } catch {
    // Ignore all errors for optional auth
    next();
  }
}

/**
 * Require specific organization access
 * Validates that the authenticated user belongs to the specified organization
 *
 * Usage:
 * ```typescript
 * router.get('/org/:orgId/data', authenticateToken, requireOrganization, handler);
 * ```
 */
export function requireOrganization(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  const requestedOrgId = req.params.organizationId || req.params.orgId || req.body?.organizationId;

  if (!user) {
    next(new APIException(401, 'NOT_AUTHENTICATED', 'Authentication required'));
    return;
  }

  // Leaders can access any organization data (for multi-org support)
  if (user.role === 'leader') {
    next();
    return;
  }

  if (requestedOrgId && user.organizationId !== requestedOrgId) {
    next(new APIException(403, 'ORG_MISMATCH', 'Access denied to this organization'));
    return;
  }

  next();
}

/**
 * Require specific team access
 * Validates that the authenticated user belongs to or manages the specified team
 */
export function requireTeamAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  const requestedTeamId = req.params.teamId || req.body?.teamId;

  if (!user) {
    next(new APIException(401, 'NOT_AUTHENTICATED', 'Authentication required'));
    return;
  }

  // Leaders and managers have broader team access
  if (user.role === 'leader' || user.role === 'manager') {
    next();
    return;
  }

  // Members can only access their own team
  if (requestedTeamId && user.teamId !== requestedTeamId) {
    next(new APIException(403, 'TEAM_ACCESS_DENIED', 'Access denied to this team'));
    return;
  }

  next();
}

/**
 * Get current authenticated user from request
 * Utility function for use in route handlers
 */
export function getCurrentUser(req: AuthenticatedRequest): AuthUser {
  if (!req.user) {
    throw new APIException(401, 'NOT_AUTHENTICATED', 'No authenticated user');
  }
  return req.user;
}

/**
 * Check if user has specific role
 */
export function hasRole(user: AuthUser | undefined, role: UserRole): boolean {
  return user?.role === role;
}

/**
 * Check if user has minimum role level
 * Role hierarchy: leader > manager > member
 */
export function hasMinimumRole(user: AuthUser | undefined, minimumRole: UserRole): boolean {
  if (!user) return false;

  const roleHierarchy: Record<UserRole, number> = {
    leader: 3,
    manager: 2,
    member: 1
  };

  return roleHierarchy[user.role] >= roleHierarchy[minimumRole];
}
