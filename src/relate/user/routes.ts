/**
 * User Management Routes for PKA-Relate
 * Implements all user profile, psychological profile, settings, core values, mentors, and focus areas endpoints
 * @module relate/user/routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService, ServiceError, NotFoundError, ValidationError } from './service.js';
import { authenticateToken, AuthenticatedRequest } from '../../api/middleware/auth.js';

// ============================================================================
// Zod Validation Schemas
// ============================================================================

// Profile update schema
const ProfileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional(),
  sync_enabled: z.boolean().optional()
});

// Psychological profile update schema
const PsychProfileUpdateSchema = z.object({
  attachment_style: z.enum(['Secure', 'Anxious', 'Avoidant', 'Disorganized']).optional(),
  communication_style: z.enum(['Direct', 'Indirect', 'Assertive', 'Passive']).optional(),
  conflict_pattern: z.string().max(500).optional(),
  traits: z.record(z.string()).optional()
});

// Settings update schema
const SettingsUpdateSchema = z.object({
  push_notifications_enabled: z.boolean().optional(),
  data_privacy_strict: z.boolean().optional(),
  reflection_reminder_enabled: z.boolean().optional(),
  reflection_reminder_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  app_lock_enabled: z.boolean().optional(),
  tough_love_mode_enabled: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().optional(),
  notifications: z.object({
    interaction_reminders: z.boolean().optional(),
    focus_area_milestones: z.boolean().optional(),
    relationship_insights: z.boolean().optional(),
    weekly_summary: z.boolean().optional()
  }).optional()
});

// Core value create schema
const CoreValueCreateSchema = z.object({
  category: z.enum(['Primary', 'Secondary', 'Aspirational']),
  value: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  display_order: z.number().int().min(0).optional()
});

// Core value update schema
const CoreValueUpdateSchema = z.object({
  category: z.enum(['Primary', 'Secondary', 'Aspirational']).optional(),
  value: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  display_order: z.number().int().min(0).optional()
});

// Mentor create schema
const MentorCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).max(10).optional()
});

// Mentor update schema
const MentorUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).max(10).optional()
});

// Focus area create schema
const FocusAreaCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  target_date: z.string().datetime().optional(),
  linked_value_ids: z.array(z.string()).optional()
});

// Focus area update schema
const FocusAreaUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  progress: z.number().min(0).max(100).optional(),
  streak: z.number().int().min(0).optional(),
  weekly_change: z.number().optional(),
  target_date: z.string().datetime().optional(),
  linked_value_ids: z.array(z.string()).optional()
});

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Middleware to validate request body against Zod schema
 */
function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        next(error);
      }
    }
  };
}

// ============================================================================
// Response Formatting
// ============================================================================

/**
 * Standard API success response
 */
function successResponse<T>(data: T, statusCode: number = 200) {
  return { data, statusCode };
}

/**
 * Standard API error response
 */
function errorResponse(error: Error, req: Request) {
  if (error instanceof NotFoundError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      },
      statusCode: 404
    };
  }

  if (error instanceof ValidationError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      },
      statusCode: 400
    };
  }

  if (error instanceof ServiceError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      },
      statusCode: error.statusCode
    };
  }

  // Unknown error
  console.error('Unhandled error:', error);
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    },
    statusCode: 500
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// Profile Routes
// ============================================================================

/**
 * GET /users/me/profile
 * Get user profile information
 */
router.get('/me/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await UserService.getProfile(userId);
    const response = successResponse(profile);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

/**
 * PUT /users/me/profile
 * Update user profile
 */
router.put(
  '/me/profile',
  validateBody(ProfileUpdateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const profile = await UserService.updateProfile(userId, req.body);
      const response = successResponse(profile);
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      const response = errorResponse(error as Error, req);
      res.status(response.statusCode).json(response.error);
    }
  }
);

// ============================================================================
// Psychological Profile Routes
// ============================================================================

/**
 * GET /users/me/psychological-profile
 * Get user's psychological profile
 */
router.get('/me/psychological-profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await UserService.getPsychProfile(userId);
    const response = successResponse(profile);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

/**
 * PUT /users/me/psychological-profile
 * Update psychological profile
 */
router.put(
  '/me/psychological-profile',
  validateBody(PsychProfileUpdateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const profile = await UserService.updatePsychProfile(userId, req.body);
      const response = successResponse(profile);
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      const response = errorResponse(error as Error, req);
      res.status(response.statusCode).json(response.error);
    }
  }
);

// ============================================================================
// Settings Routes
// ============================================================================

/**
 * GET /users/me/settings
 * Get user settings
 */
router.get('/me/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const settings = await UserService.getSettings(userId);
    const response = successResponse(settings);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

/**
 * PUT /users/me/settings
 * Update user settings
 */
router.put(
  '/me/settings',
  validateBody(SettingsUpdateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const settings = await UserService.updateSettings(userId, req.body);
      const response = successResponse(settings);
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      const response = errorResponse(error as Error, req);
      res.status(response.statusCode).json(response.error);
    }
  }
);

// ============================================================================
// Core Values Routes (Including Missing A1, A2)
// ============================================================================

/**
 * GET /users/me/values
 * Get all core values
 */
router.get('/me/values', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const values = await UserService.getCoreValues(userId);
    const response = successResponse(values);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

/**
 * GET /users/me/values/:valueId
 * Get a specific core value (A1: NEW - Missing endpoint)
 */
router.get('/me/values/:valueId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { valueId } = req.params;
    const value = await UserService.getCoreValue(userId, valueId);

    if (!value) {
      throw new NotFoundError('CoreValue', valueId);
    }

    const response = successResponse(value);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

/**
 * POST /users/me/values
 * Create a new core value
 */
router.post(
  '/me/values',
  validateBody(CoreValueCreateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const value = await UserService.addCoreValue(userId, req.body);
      const response = successResponse(value, 201);
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      const response = errorResponse(error as Error, req);
      res.status(response.statusCode).json(response.error);
    }
  }
);

/**
 * PUT /users/me/values/:valueId
 * Update a core value (A2: NEW - Missing endpoint)
 */
router.put(
  '/me/values/:valueId',
  validateBody(CoreValueUpdateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { valueId } = req.params;
      const value = await UserService.updateCoreValue(userId, valueId, req.body);
      const response = successResponse(value);
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      const response = errorResponse(error as Error, req);
      res.status(response.statusCode).json(response.error);
    }
  }
);

/**
 * DELETE /users/me/values/:valueId
 * Delete a core value
 */
router.delete('/me/values/:valueId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { valueId } = req.params;
    await UserService.removeCoreValue(userId, valueId);
    res.status(204).send();
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

// ============================================================================
// Mentors Routes (Including Missing A3)
// ============================================================================

/**
 * GET /users/me/mentors
 * Get all mentors
 */
router.get('/me/mentors', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const mentors = await UserService.getMentors(userId);
    const response = successResponse(mentors);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

/**
 * GET /users/me/mentors/:mentorId
 * Get a specific mentor
 */
router.get('/me/mentors/:mentorId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { mentorId } = req.params;
    const mentor = await UserService.getMentor(userId, mentorId);

    if (!mentor) {
      throw new NotFoundError('Mentor', mentorId);
    }

    const response = successResponse(mentor);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

/**
 * POST /users/me/mentors
 * Create a new mentor
 */
router.post(
  '/me/mentors',
  validateBody(MentorCreateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const mentor = await UserService.addMentor(userId, req.body);
      const response = successResponse(mentor, 201);
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      const response = errorResponse(error as Error, req);
      res.status(response.statusCode).json(response.error);
    }
  }
);

/**
 * PUT /users/me/mentors/:mentorId
 * Update a mentor (A3: NEW - Missing endpoint)
 */
router.put(
  '/me/mentors/:mentorId',
  validateBody(MentorUpdateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { mentorId } = req.params;
      const mentor = await UserService.updateMentor(userId, mentorId, req.body);
      const response = successResponse(mentor);
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      const response = errorResponse(error as Error, req);
      res.status(response.statusCode).json(response.error);
    }
  }
);

/**
 * DELETE /users/me/mentors/:mentorId
 * Delete a mentor
 */
router.delete('/me/mentors/:mentorId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { mentorId } = req.params;
    await UserService.removeMentor(userId, mentorId);
    res.status(204).send();
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

// ============================================================================
// Focus Areas Routes (Including Missing A4)
// ============================================================================

/**
 * GET /users/me/focus-areas
 * Get all focus areas
 */
router.get('/me/focus-areas', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const focusAreas = await UserService.getFocusAreas(userId);
    const response = successResponse(focusAreas);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

/**
 * GET /users/me/focus-areas/:focusAreaId
 * Get a specific focus area (A4: NEW - Missing endpoint)
 */
router.get('/me/focus-areas/:focusAreaId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { focusAreaId } = req.params;
    const focusArea = await UserService.getFocusArea(userId, focusAreaId);

    if (!focusArea) {
      throw new NotFoundError('FocusArea', focusAreaId);
    }

    const response = successResponse(focusArea);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

/**
 * POST /users/me/focus-areas
 * Create a new focus area
 */
router.post(
  '/me/focus-areas',
  validateBody(FocusAreaCreateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const focusArea = await UserService.createFocusArea(userId, req.body);
      const response = successResponse(focusArea, 201);
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      const response = errorResponse(error as Error, req);
      res.status(response.statusCode).json(response.error);
    }
  }
);

/**
 * PUT /users/me/focus-areas/:focusAreaId
 * Update a focus area
 */
router.put(
  '/me/focus-areas/:focusAreaId',
  validateBody(FocusAreaUpdateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { focusAreaId } = req.params;
      const focusArea = await UserService.updateFocusArea(userId, focusAreaId, req.body);
      const response = successResponse(focusArea);
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      const response = errorResponse(error as Error, req);
      res.status(response.statusCode).json(response.error);
    }
  }
);

/**
 * DELETE /users/me/focus-areas/:focusAreaId
 * Delete a focus area
 */
router.delete('/me/focus-areas/:focusAreaId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { focusAreaId } = req.params;
    await UserService.deleteFocusArea(userId, focusAreaId);
    res.status(204).send();
  } catch (error) {
    const response = errorResponse(error as Error, req);
    res.status(response.statusCode).json(response.error);
  }
});

// ============================================================================
// Export Router
// ============================================================================

export default router;
