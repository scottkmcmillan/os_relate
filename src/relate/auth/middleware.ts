/**
 * Authentication Middleware for Express
 *
 * Provides middleware for protecting routes and extracting user information from JWT tokens.
 * Includes rate limiting for authentication endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { extractTokenFromHeader, verifyToken } from './jwt.js';
import { validateToken } from './service.js';
import type { User } from './service.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Authentication middleware - requires valid JWT token
 * Attaches user to req.user if token is valid
 *
 * Usage:
 *   router.get('/protected', requireAuth, (req, res) => {
 *     res.json({ user: req.user });
 *   });
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization token required',
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Validate token and get user
    const user = await validateToken(token);

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'TOKEN_EXPIRED' || errorMessage.includes('expired')) {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (errorMessage === 'TOKEN_INVALID' || errorMessage.includes('invalid')) {
      res.status(401).json({
        error: {
          code: 'TOKEN_INVALID',
          message: 'Invalid access token',
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user to req.user if token is present and valid, but doesn't fail if token is missing
 *
 * Usage:
 *   router.get('/public-or-private', optionalAuth, (req, res) => {
 *     if (req.user) {
 *       // User is authenticated
 *     } else {
 *       // User is not authenticated
 *     }
 *   });
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }

    // Validate token and get user
    const user = await validateToken(token);

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    // Token was provided but invalid - continue without user
    // This allows the route to decide if authentication is truly required
    next();
  }
}

/**
 * Rate limiting middleware for login endpoint
 * Limit: 5 requests per minute per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again later.',
      details: {
        limit: 5,
        window: '1 minute',
      },
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again later.',
        details: {
          limit: 5,
          resetAt: new Date(Date.now() + 60 * 1000).toISOString(),
          retryAfter: 60,
        },
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Rate limiting middleware for signup endpoint
 * Limit: 3 requests per hour per IP
 */
export const signupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many signup attempts. Please try again later.',
      details: {
        limit: 3,
        window: '1 hour',
      },
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many signup attempts. Please try again later.',
        details: {
          limit: 3,
          resetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          retryAfter: 3600,
        },
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Rate limiting middleware for token refresh endpoint
 * Limit: 10 requests per minute per IP
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many token refresh attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many token refresh attempts. Please try again later.',
        details: {
          limit: 10,
          resetAt: new Date(Date.now() + 60 * 1000).toISOString(),
          retryAfter: 60,
        },
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Error handler middleware for authentication errors
 */
export function authErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Auth Error]', error);

  // Don't send stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred during authentication',
      ...(isDevelopment && { details: error.message }),
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
    },
  });
}
