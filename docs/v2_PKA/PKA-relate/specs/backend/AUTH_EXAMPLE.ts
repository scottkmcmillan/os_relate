/**
 * Authentication System Usage Examples
 *
 * This file demonstrates how to use the PKA-Relate authentication system.
 */

import express from 'express';
import { authRoutes, requireAuth, optionalAuth } from '../../../src/relate/auth/index.js';

const app = express();

// Middleware
app.use(express.json());

// Mount authentication routes
app.use('/auth', authRoutes);

/**
 * Example 1: Protected Route (Requires Authentication)
 *
 * This route requires a valid JWT token in the Authorization header.
 * The user object is automatically attached to req.user
 */
app.get('/api/profile', requireAuth, (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user, // User automatically attached by middleware
  });
});

/**
 * Example 2: Optional Authentication
 *
 * This route works with or without authentication.
 * If a valid token is provided, req.user will be set.
 */
app.get('/api/content', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({
      message: 'Welcome back!',
      user: req.user,
      personalizedContent: true,
    });
  } else {
    res.json({
      message: 'Welcome, guest!',
      personalizedContent: false,
    });
  }
});

/**
 * Example 3: Using Authentication Service Directly
 */
import * as authService from '../../../src/relate/auth/service.js';

// Signup example
async function signupExample() {
  try {
    const result = await authService.signup(
      'user@example.com',
      'SecurePass123!',
      'John Doe',
      'America/New_York'
    );

    console.log('User created:', result.user.id);
    console.log('Access token:', result.accessToken);
    console.log('Refresh token:', result.refreshToken);
  } catch (error) {
    console.error('Signup failed:', error.message);
  }
}

// Login example
async function loginExample() {
  try {
    const result = await authService.login(
      'user@example.com',
      'SecurePass123!',
      'device-123' // Optional device ID
    );

    console.log('Login successful:', result.user.email);
    console.log('Access token:', result.accessToken);
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

// Token refresh example
async function refreshExample(refreshToken: string) {
  try {
    const tokens = await authService.refreshToken(refreshToken);

    console.log('New access token:', tokens.accessToken);
    console.log('New refresh token:', tokens.refreshToken);
  } catch (error) {
    console.error('Token refresh failed:', error.message);
  }
}

// Logout example
async function logoutExample(userId: string, sessionId?: string) {
  try {
    await authService.logout(userId, sessionId);
    console.log('Logout successful');
  } catch (error) {
    console.error('Logout failed:', error.message);
  }
}

/**
 * Example 4: Client-Side Authentication Flow
 */

// Step 1: Login and store tokens
async function clientLogin(email: string, password: string) {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();

  // Store tokens (in localStorage, sessionStorage, or secure cookie)
  localStorage.setItem('accessToken', data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.tokens.refreshToken);

  return data.user;
}

// Step 2: Make authenticated requests
async function makeAuthenticatedRequest(url: string) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    // Token expired, try to refresh
    await refreshTokens();
    // Retry request with new token
    return makeAuthenticatedRequest(url);
  }

  return response.json();
}

// Step 3: Refresh tokens when access token expires
async function refreshTokens() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('http://localhost:3000/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    // Refresh token expired, redirect to login
    window.location.href = '/login';
    return;
  }

  const data = await response.json();

  // Update stored tokens
  localStorage.setItem('accessToken', data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.tokens.refreshToken);
}

/**
 * Example 5: Error Handling
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error]', err);

  // Handle authentication errors
  if (err.message === 'TOKEN_EXPIRED') {
    return res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please login again.',
      },
    });
  }

  if (err.message === 'TOKEN_INVALID') {
    return res.status(401).json({
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid authentication token.',
      },
    });
  }

  // Generic error
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
});

/**
 * Example 6: Password Change Flow
 */
app.post('/api/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    await authService.changePassword(userId, currentPassword, newPassword);

    res.json({
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message,
      },
    });
  }
});

/**
 * Example 7: Session Management
 */
app.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessions = await authService.getUserSessions(userId);

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        deviceId: s.deviceId,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get sessions',
      },
    });
  }
});

app.delete('/api/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId;

    await authService.logout(userId, sessionId);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to logout session',
      },
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Auth endpoints available at http://localhost:${PORT}/auth/*`);
});
