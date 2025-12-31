/**
 * Error Handling Middleware
 * @module api/middleware/error
 */
import { Request, Response, NextFunction } from 'express';
import { APIError } from '../types.js';

/**
 * Custom API exception with status code and error code
 */
export class APIException extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIException';
  }
}

/**
 * Express error handling middleware
 *
 * Catches all errors and returns standardized API error responses
 */
export function errorHandler(
  err: Error | APIException,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`API Error: ${err.message}`, err.stack);

  if (err instanceof APIException) {
    const response: APIError = {
      error: err.message,
      code: err.code,
      details: err.details
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const response: APIError = {
      error: err.message,
      code: 'VALIDATION_ERROR'
    };
    res.status(400).json(response);
    return;
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    const response: APIError = {
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON'
    };
    res.status(400).json(response);
    return;
  }

  // Default 500 error
  const response: APIError = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  };
  res.status(500).json(response);
}

/**
 * 404 Not Found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: APIError = {
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND'
  };
  res.status(404).json(response);
}
