/**
 * CORS Configuration Middleware
 * @module api/middleware/cors
 */
import cors from 'cors';

/**
 * Create CORS middleware with configurable origin
 *
 * Supports drag-and-drop file uploads by including all required headers
 * for browser preflight requests.
 *
 * @returns Configured CORS middleware
 */
export function createCorsMiddleware() {
  const corsOrigin = process.env.CORS_ORIGIN || '*';

  return cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name',
      'X-File-Size',
      'ngrok-skip-browser-warning'  // Required for ngrok tunnels
    ],
    exposedHeaders: [
      'Content-Length',
      'Content-Range',
      'X-Job-Id',
      'X-Upload-Status'
    ],
    optionsSuccessStatus: 200, // Use 200 instead of 204 for better compatibility
    maxAge: 86400 // Cache preflight requests for 24 hours
  });
}
