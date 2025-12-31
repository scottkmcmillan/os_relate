# Authentication System Implementation

## Overview

The PKA-Relate authentication system implements secure user authentication using RS256 JWT tokens, bcrypt password hashing, and comprehensive session management.

## Architecture

### Components

1. **JWT Module** (`src/relate/auth/jwt.ts`)
   - RS256 key pair generation and management
   - Token signing and verification
   - Access tokens (15min expiry) and refresh tokens (7d expiry)

2. **Service Layer** (`src/relate/auth/service.ts`)
   - User signup and login
   - Password validation and hashing (bcrypt cost factor 12)
   - Token refresh and validation
   - Session management

3. **Middleware** (`src/relate/auth/middleware.ts`)
   - Route protection (`requireAuth`)
   - Optional authentication (`optionalAuth`)
   - Rate limiting (login: 5/min, signup: 3/hour, refresh: 10/min)

4. **Routes** (`src/relate/auth/routes.ts`)
   - REST API endpoints for authentication
   - Consistent error responses

5. **Database** (`src/relate/auth/db.ts`)
   - SQLite-based persistence
   - User and session management
   - Secure password storage

## Security Features

### RS256 JWT Algorithm
- Asymmetric encryption using RSA 2048-bit keys
- Public key verification (stateless)
- Private key signing (server-side only)
- Keys stored in `config/keys/` or environment variables

### Password Security
- Bcrypt hashing with cost factor 12
- Password validation rules:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character
- Constant-time comparison to prevent timing attacks
- Passwords NEVER logged or stored in plain text

### Rate Limiting
- Login: 5 requests/minute per IP
- Signup: 3 requests/hour per IP
- Token refresh: 10 requests/minute per IP
- Prevents brute force attacks

### Session Management
- Refresh token tracking for revocation
- Device identification for multi-device support
- Session expiry enforcement
- Bulk session revocation (logout from all devices)

## API Endpoints

### POST /auth/signup
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "timezone": "America/New_York"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "usr_1a2b3c4d",
    "email": "user@example.com",
    "fullName": "John Doe",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### POST /auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "deviceId": "device-123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "usr_1a2b3c4d",
    "email": "user@example.com",
    "fullName": "John Doe",
    "lastLoginAt": "2025-01-15T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### POST /auth/logout
Invalidate session and logout.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "sessionId": "ses_abc123"
}
```

**Response (204 No Content)**

### GET /auth/me
Get current authenticated user information.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200 OK):**
```json
{
  "id": "usr_1a2b3c4d",
  "email": "user@example.com",
  "fullName": "John Doe",
  "timezone": "America/New_York",
  "createdAt": "2025-01-15T10:30:00Z",
  "lastLoginAt": "2025-01-15T10:30:00Z",
  "settings": {
    "theme": "dark",
    "notifications": true,
    "weeklyReportDay": "monday"
  }
}
```

### POST /auth/change-password
Change user password.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully. Please login again."
}
```

### GET /auth/sessions
Get all active sessions.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200 OK):**
```json
{
  "sessions": [
    {
      "id": "ses_abc123",
      "deviceId": "device-123",
      "createdAt": "2025-01-15T10:30:00Z",
      "lastUsedAt": "2025-01-15T11:00:00Z",
      "expiresAt": "2025-01-22T10:30:00Z"
    }
  ]
}
```

### DELETE /auth/sessions
Revoke all sessions (logout from all devices).

**Headers:** `Authorization: Bearer <accessToken>`

**Response (204 No Content)**

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "requestId": "req_1234567890_abc",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `TOKEN_INVALID` | 401 | JWT token is invalid |
| `INVALID_CREDENTIALS` | 401 | Incorrect email or password |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_RESOURCE` | 409 | Email already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Usage Examples

### Protecting Routes

```typescript
import { Router } from 'express';
import { requireAuth, optionalAuth } from './relate/auth/middleware.js';

const router = Router();

// Protected route - requires authentication
router.get('/profile', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Optional auth - works with or without authentication
router.get('/content', optionalAuth, (req, res) => {
  if (req.user) {
    // User is authenticated
    res.json({ message: 'Welcome back!', user: req.user });
  } else {
    // User is not authenticated
    res.json({ message: 'Welcome, guest!' });
  }
});
```

### Integrating with Express App

```typescript
import express from 'express';
import { authRoutes } from './relate/auth/index.js';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Environment Variables

```bash
# Optional: Provide pre-generated RS256 keys (base64 encoded)
JWT_PRIVATE_KEY=<base64-encoded-private-key>
JWT_PUBLIC_KEY=<base64-encoded-public-key>

# Database path (optional, defaults to data/auth.db)
AUTH_DB_PATH=./data/auth.db

# Environment
NODE_ENV=development
```

## Key Management

### Development
Keys are automatically generated and stored in `config/keys/`:
- `jwt-private.pem` - Private key (600 permissions)
- `jwt-public.pem` - Public key (644 permissions)

### Production
Set environment variables with base64-encoded keys:

```bash
# Generate keys
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Encode to base64
JWT_PRIVATE_KEY=$(cat private.pem | base64 -w 0)
JWT_PUBLIC_KEY=$(cat public.pem | base64 -w 0)
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  updated_at TEXT NOT NULL
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  device_id TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Testing

Run the test suite:

```bash
npm test tests/auth.test.ts
```

Test coverage includes:
- JWT token generation and verification
- Password validation rules
- User signup and login flows
- Token refresh mechanism
- Session management
- Database operations
- Rate limiting

## Security Considerations

### Do's ✅
- Always use HTTPS in production
- Store keys securely (environment variables or secrets manager)
- Implement proper CORS policies
- Log authentication failures for monitoring
- Use rate limiting on all auth endpoints
- Validate all input data
- Use secure password hashing (bcrypt)

### Don'ts ❌
- Never log passwords or tokens
- Never store passwords in plain text
- Never send passwords in error messages
- Never use weak password validation
- Never skip input validation
- Never use symmetric JWT algorithms (HS256) for this use case
- Never commit private keys to version control

## Performance

- Token verification: O(1) - cryptographic operation
- Password hashing: ~100-200ms (bcrypt cost factor 12)
- Database queries: O(1) for primary key lookups, O(log n) for indexed queries
- Session cleanup: Periodic job recommended (cron)

## Monitoring

Key metrics to monitor:
- Failed login attempts
- Token expiration rate
- Session creation/deletion rate
- Rate limit hits
- Database query performance
- Authentication endpoint latency

## Future Enhancements

- [ ] OAuth2/OIDC integration (Google, GitHub)
- [ ] Two-factor authentication (TOTP)
- [ ] Account email verification
- [ ] Password reset flow
- [ ] Account lockout after failed attempts
- [ ] IP whitelisting/blacklisting
- [ ] Audit logging
- [ ] Refresh token rotation
- [ ] JWT token blacklisting for immediate revocation
