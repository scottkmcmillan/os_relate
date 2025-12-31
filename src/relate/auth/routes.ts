/**
 * Authentication Routes
 *
 * Provides REST API endpoints for user authentication:
 * - POST /auth/signup - Register new user
 * - POST /auth/login - Login and get tokens
 * - POST /auth/logout - Invalidate session
 * - POST /auth/refresh - Refresh access token
 * - GET /auth/me - Get current user info
 */

import { Router, Request, Response } from 'express';
import * as authService from './service.js';
import {
  requireAuth,
  loginRateLimiter,
  signupRateLimiter,
  refreshRateLimiter,
} from './middleware.js';

const router = Router();

/**
 * POST /auth/signup
 * Register a new user account
 */
router.post('/signup', signupRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, timezone } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: {
            email: !email ? 'Email is required' : undefined,
            password: !password ? 'Password is required' : undefined,
            fullName: !fullName ? 'Full name is required' : undefined,
          },
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Create user
    const result = await authService.signup(email, password, fullName, timezone);

    res.status(201).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        createdAt: result.user.createdAt,
      },
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('already exists')) {
      res.status(409).json({
        error: {
          code: 'DUPLICATE_RESOURCE',
          message: errorMessage,
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: errorMessage,
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and receive JWT tokens
 */
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, deviceId } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Authenticate user
    const result = await authService.login(email, password, deviceId);

    res.status(200).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        lastLoginAt: result.user.lastLoginAt,
      },
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Use generic error message for security
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /auth/logout
 * Invalidate refresh token and logout user
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { refreshToken, sessionId } = req.body;
    const userId = req.user!.id;

    // Logout user
    await authService.logout(userId, sessionId);

    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to logout',
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', refreshRateLimiter, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Validate refresh token
    if (!refreshToken) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Refresh tokens
    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(401).json({
      error: {
        code: 'TOKEN_INVALID',
        message: errorMessage,
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user information
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    res.status(200).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      timezone: user.timezone,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      settings: {
        theme: 'dark', // TODO: Load from user settings
        notifications: true,
        weeklyReportDay: 'monday',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user information',
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /auth/change-password
 * Change user password (requires current password)
 */
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current password and new password are required',
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Change password
    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('incorrect')) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: errorMessage,
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: errorMessage,
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /auth/sessions
 * Get all active sessions for current user
 */
router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const sessions = await authService.getUserSessions(userId);

    res.status(200).json({
      sessions: sessions.map((session) => ({
        id: session.id,
        deviceId: session.deviceId,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get sessions',
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * DELETE /auth/sessions
 * Revoke all sessions (logout from all devices)
 */
router.delete('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await authService.revokeAllSessions(userId);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to revoke sessions',
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default router;
