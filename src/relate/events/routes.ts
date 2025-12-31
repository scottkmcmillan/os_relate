import { Router, Request, Response, NextFunction } from 'express';
import { eventService } from './service';
import { authenticateToken } from '../auth/middleware';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { EventCreate } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /events
 * List all events for the authenticated user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Check for query parameters
    const { person, type, search, days } = req.query;

    let events;

    if (person) {
      events = await eventService.getByPerson(userId, person as string);
    } else if (type) {
      events = await eventService.getByType(userId, type as string);
    } else if (search) {
      events = await eventService.searchEvents(userId, search as string);
    } else if (days) {
      const daysNum = parseInt(days as string, 10);
      if (isNaN(daysNum)) {
        throw new AppError('Invalid days parameter', 400);
      }
      events = await eventService.getUpcoming(userId, daysNum);
    } else {
      events = await eventService.getAll(userId);
    }

    res.json({
      events,
      total: events.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /events
 * Create a new event
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const eventData: EventCreate = {
      title: req.body.title,
      person: req.body.person,
      eventType: req.body.eventType,
      datetime: req.body.datetime,
      preparationNotes: req.body.preparationNotes,
      talkingPoints: req.body.talkingPoints
    };

    // Validation
    if (!eventData.title || eventData.title.trim().length === 0) {
      throw new AppError('Title is required', 400);
    }

    if (!eventData.person || eventData.person.trim().length === 0) {
      throw new AppError('Person is required', 400);
    }

    if (!eventData.eventType || eventData.eventType.trim().length === 0) {
      throw new AppError('Event type is required', 400);
    }

    if (!eventData.datetime) {
      throw new AppError('Datetime is required', 400);
    }

    const event = await eventService.create(userId, eventData);

    logger.info(`Event created: ${event.id} for user ${userId}`);

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /events/upcoming
 * Get upcoming events (next 7 days by default)
 */
router.get('/upcoming', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;

    if (isNaN(days) || days < 1) {
      throw new AppError('Days must be a positive number', 400);
    }

    const events = await eventService.getUpcoming(userId, days);

    res.json({
      events,
      total: events.length,
      days
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /events/past
 * Get past events (last 30 days by default)
 */
router.get('/past', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

    if (isNaN(days) || days < 1) {
      throw new AppError('Days must be a positive number', 400);
    }

    const events = await eventService.getPast(userId, days);

    res.json({
      events,
      total: events.length,
      days
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /events/reminders
 * Get events happening in the next 24 hours
 */
router.get('/reminders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const events = await eventService.getEventReminders(userId);

    res.json({
      events,
      total: events.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /events/stats
 * Get event statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [
      allEvents,
      upcomingEvents,
      countByType
    ] = await Promise.all([
      eventService.getAll(userId),
      eventService.getUpcoming(userId, 30),
      eventService.getEventCountByType(userId)
    ]);

    res.json({
      stats: {
        total: allEvents.length,
        upcoming: upcomingEvents.length,
        byType: countByType
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /events/date-range
 * Get events within a specific date range
 */
router.get('/date-range', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('Both startDate and endDate are required', 400);
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime())) {
      throw new AppError('Invalid startDate format', 400);
    }

    if (isNaN(end.getTime())) {
      throw new AppError('Invalid endDate format', 400);
    }

    if (start >= end) {
      throw new AppError('startDate must be before endDate', 400);
    }

    const events = await eventService.getEventsInDateRange(userId, start, end);

    res.json({
      events,
      total: events.length,
      dateRange: {
        from: start,
        to: end
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /events/:id
 * Get a specific event
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const event = await eventService.get(userId, id);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    res.json({
      event
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /events/:id
 * Update an event
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const updates: Partial<EventCreate> = {
      title: req.body.title,
      person: req.body.person,
      eventType: req.body.eventType,
      datetime: req.body.datetime,
      preparationNotes: req.body.preparationNotes,
      talkingPoints: req.body.talkingPoints
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof EventCreate] === undefined) {
        delete updates[key as keyof EventCreate];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new AppError('No updates provided', 400);
    }

    const event = await eventService.update(userId, id, updates);

    logger.info(`Event updated: ${id} by user ${userId}`);

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /events/:id
 * Delete an event
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await eventService.delete(userId, id);

    logger.info(`Event deleted: ${id} by user ${userId}`);

    res.json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /events/:id/briefing
 * Generate event briefing
 */
router.post('/:id/briefing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const briefing = await eventService.generateBriefing(userId, id);

    logger.info(`Briefing generated for event: ${id}`);

    res.json({
      briefing
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /events/:id/complete
 * Mark event as completed
 */
router.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await eventService.markEventAsCompleted(userId, id);

    logger.info(`Event marked as completed: ${id}`);

    res.json({
      message: 'Event marked as completed'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
