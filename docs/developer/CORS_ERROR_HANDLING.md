# CORS Configuration and Error Response Format

## 1. CORS Configuration for Cortexis Compatibility

### Hono CORS Middleware Setup

```typescript
// src/api/middleware/cors.ts

import { Hono } from 'hono';
import { cors } from '@hono/cors';

/**
 * CORS configuration for Cortexis API compatibility
 *
 * Requirements:
 * - Base URL: http://localhost:3000/api
 * - CORS enabled for cross-origin requests
 * - Content-Type: application/json
 * - multipart/form-data for file uploads
 */

interface CorsConfig {
  origin?: string | string[] | ((origin: string) => boolean);
  allowMethods?: string[];
  allowHeaders?: string[];
  exposeHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function createCorsMiddleware(config?: Partial<CorsConfig>) {
  const defaultConfig: CorsConfig = {
    // Allow requests from Cortexis frontend
    origin: (origin) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://localhost:5173', // Vite dev server
      ];

      // Allow all origins in development
      if (process.env.NODE_ENV !== 'production') {
        return true;
      }

      // Check against whitelist in production
      return allowedOrigins.includes(origin || '');
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Accept-Language',
      'Content-Language',
      'X-Requested-With',
      'X-API-Key',
      'X-Upload-ID' // Custom header for upload tracking
    ],
    exposeHeaders: [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'X-Total-Count', // For pagination
      'X-Job-ID',
      'X-Upload-Progress'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  };

  // Merge custom config
  const finalConfig = { ...defaultConfig, ...config };

  return cors(finalConfig);
}

export function setupCorsMiddleware(app: Hono) {
  // Apply CORS to all routes under /api
  app.use('/api/*', createCorsMiddleware());

  return app;
}
```

### Configuration in Main Server

```typescript
// src/api/server.ts

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { setupCorsMiddleware } from './middleware/cors.js';
import { setupErrorHandling } from './middleware/errors.js';

const app = new Hono();

// Setup middleware in order
setupCorsMiddleware(app);
setupErrorHandling(app);

// API routes
app.route('/api/documents', documentRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/jobs', jobRoutes);

// Health check endpoint (before CORS middleware)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'not_found',
    message: 'Endpoint not found',
    path: c.req.path,
    method: c.req.method
  }, 404);
});

export async function startServer(port = 3000) {
  console.log(`Starting Ranger HTTP API on http://localhost:${port}/api`);

  serve({
    fetch: app.fetch,
    port
  });
}
```

### CORS Preflight Handling (Automatic with Hono)

Hono automatically handles OPTIONS requests for preflight checks:

```
OPTIONS /api/documents/upload

Request Headers:
- Origin: http://localhost:5173
- Access-Control-Request-Method: POST
- Access-Control-Request-Headers: Content-Type

Response Headers:
- Access-Control-Allow-Origin: http://localhost:5173
- Access-Control-Allow-Methods: POST, GET, PUT, DELETE, PATCH
- Access-Control-Allow-Headers: Content-Type, Authorization, ...
- Access-Control-Max-Age: 86400
- Access-Control-Allow-Credentials: true
```

## 2. Error Response Format Standard

### Error Response Schema

```typescript
// src/api/types/errors.ts

/**
 * Standard error response format for Cortexis API compatibility
 */

export interface ErrorResponse {
  error: string; // Error code (snake_case)
  message: string; // Human-readable message
  statusCode: number; // HTTP status code
  timestamp: string; // ISO 8601 timestamp
  path?: string; // Request path
  method?: string; // HTTP method
  requestId?: string; // Correlation ID for debugging
  details?: Record<string, unknown>; // Additional error details
  cause?: string; // Root cause (for debugging)
}

export interface ValidationError extends ErrorResponse {
  error: 'validation_error';
  details: {
    field: string;
    message: string;
    value: unknown;
  }[];
}

// Error codes mapped to HTTP status codes
export const ERROR_CODES = {
  // 400 Bad Request
  'invalid_input': 400,
  'validation_error': 400,
  'malformed_json': 400,
  'file_too_large': 413,
  'unsupported_media_type': 415,

  // 401 Unauthorized
  'unauthorized': 401,
  'invalid_api_key': 401,
  'token_expired': 401,

  // 403 Forbidden
  'forbidden': 403,
  'insufficient_permissions': 403,

  // 404 Not Found
  'not_found': 404,
  'resource_not_found': 404,
  'document_not_found': 404,
  'job_not_found': 404,

  // 409 Conflict
  'conflict': 409,
  'duplicate_document': 409,

  // 500 Server Error
  'server_error': 500,
  'internal_error': 500,
  'database_error': 500,
  'processing_error': 500,
  'upload_failed': 400,
  'job_failed': 500
};

export function getStatusCode(errorCode: string): number {
  return (ERROR_CODES as Record<string, number>)[errorCode] || 500;
}
```

### Error Response Builder

```typescript
// src/api/middleware/errors.ts

import { Hono } from 'hono';
import { ErrorResponse, ValidationError, getStatusCode } from '../types/errors.js';

export class ApiError extends Error {
  constructor(
    public errorCode: string,
    public message: string,
    public details?: Record<string, unknown>,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationErrorResponse extends ApiError {
  constructor(
    public fields: Array<{ field: string; message: string; value?: unknown }>
  ) {
    super(
      'validation_error',
      'Validation failed',
      { fields },
      400
    );
  }
}

export function createErrorResponse(
  errorCode: string,
  message: string,
  options?: {
    statusCode?: number;
    details?: Record<string, unknown>;
    cause?: Error;
    path?: string;
    method?: string;
    requestId?: string;
  }
): ErrorResponse {
  const statusCode = options?.statusCode || getStatusCode(errorCode);

  return {
    error: errorCode,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: options?.path,
    method: options?.method,
    requestId: options?.requestId,
    details: options?.details,
    cause: options?.cause?.message
  };
}

export function setupErrorHandling(app: Hono) {
  // Error handling middleware
  app.onError((err, c) => {
    const requestId = c.req.header('x-request-id') || generateRequestId();
    const path = c.req.path;
    const method = c.req.method;

    let errorResponse: ErrorResponse;

    if (err instanceof ApiError) {
      const statusCode = err.statusCode || getStatusCode(err.errorCode);
      errorResponse = createErrorResponse(
        err.errorCode,
        err.message,
        {
          statusCode,
          details: err.details,
          path,
          method,
          requestId
        }
      );

      console.warn(`[${requestId}] API Error:`, {
        errorCode: err.errorCode,
        statusCode,
        path,
        method,
        message: err.message
      });

      return c.json(errorResponse, statusCode);
    }

    if (err instanceof ValidationErrorResponse) {
      const errorResponse = createErrorResponse(
        'validation_error',
        'Validation failed',
        {
          statusCode: 400,
          details: {
            fields: err.fields
          },
          path,
          method,
          requestId
        }
      );

      console.warn(`[${requestId}] Validation Error:`, {
        path,
        method,
        fields: err.fields
      });

      return c.json(errorResponse, 400);
    }

    // Handle JSON parsing errors
    if (err instanceof SyntaxError && 'body' in err) {
      const errorResponse = createErrorResponse(
        'malformed_json',
        'Invalid JSON in request body',
        {
          statusCode: 400,
          path,
          method,
          requestId,
          cause: err
        }
      );

      console.error(`[${requestId}] JSON Parse Error:`, err.message);
      return c.json(errorResponse, 400);
    }

    // Handle unexpected errors
    const errorCode = 'server_error';
    const statusCode = 500;

    errorResponse = createErrorResponse(
      errorCode,
      'An unexpected error occurred',
      {
        statusCode,
        path,
        method,
        requestId,
        cause: err instanceof Error ? err.message : String(err)
      }
    );

    console.error(`[${requestId}] Unexpected Error:`, {
      statusCode,
      path,
      method,
      error: err instanceof Error ? err : { unknown: true },
      stack: err instanceof Error ? err.stack : undefined
    });

    return c.json(errorResponse, statusCode);
  });

  return app;
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### Usage in Route Handlers

```typescript
// Example route with error handling

documentRoutes.post('/upload', async (c) => {
  try {
    const contentLength = c.req.header('content-length');
    if (!contentLength) {
      throw new ApiError(
        'invalid_input',
        'Content-Length header is required',
        {},
        411
      );
    }

    const size = Number(contentLength);
    const maxSize = 500 * 1024 * 1024; // 500 MB

    if (size > maxSize) {
      throw new ApiError(
        'file_too_large',
        `File exceeds maximum size of ${maxSize / 1024 / 1024} MB`,
        { maxSize, providedSize: size },
        413
      );
    }

    const uploadedFile = await handleFileUpload(c.req.raw);
    const jobId = await queueDocumentProcessing(uploadedFile);

    return c.json({
      success: true,
      uploadId: uploadedFile.uploadId,
      fileName: uploadedFile.fileName,
      size: uploadedFile.size,
      jobId
    }, 202);

  } catch (error) {
    throw error; // Passed to error middleware
  }
});

// Validation example
documentRoutes.post('/search', async (c) => {
  try {
    const body = await c.req.json();

    // Validate request
    const validation = validateSearchRequest(body);
    if (!validation.valid) {
      throw new ValidationErrorResponse(validation.errors);
    }

    const results = await memory.search(body.query, {
      k: body.k || 10,
      vectorWeight: body.vectorWeight || 0.7
    });

    return c.json({ results });
  } catch (error) {
    throw error;
  }
});
```

## 3. Request/Response Examples

### Upload Request

```bash
POST /api/documents/upload HTTP/1.1
Host: localhost:3000
Content-Type: application/pdf
Content-Length: 524288
Content-Disposition: attachment; filename="research.pdf"

[binary file data]

Response 202 Accepted:
{
  "success": true,
  "uploadId": "a1b2c3d4e5f6",
  "fileName": "research.pdf",
  "size": 524288,
  "jobId": "job-12345"
}
```

### Error Response

```json
{
  "error": "file_too_large",
  "message": "File exceeds maximum size of 500 MB",
  "statusCode": 413,
  "timestamp": "2025-12-23T10:30:45.123Z",
  "path": "/api/documents/upload",
  "method": "POST",
  "requestId": "req-1734951045123-a1b2c3d4",
  "details": {
    "maxSize": 524288000,
    "providedSize": 629145600
  }
}
```

### Search Request

```bash
POST /api/search HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "query": "machine learning fundamentals",
  "k": 10,
  "vectorWeight": 0.7,
  "includeRelated": true,
  "graphDepth": 2,
  "rerank": true
}

Response 200 OK:
{
  "results": [
    {
      "id": "doc-001",
      "title": "ML Fundamentals",
      "text": "...",
      "combinedScore": 0.92,
      "vectorScore": 0.88,
      "graphScore": 0.96
    }
  ]
}
```
