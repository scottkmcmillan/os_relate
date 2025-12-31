/**
 * Interaction Routes - REST API endpoints for relationship tracking
 *
 * Provides endpoints for CRUD operations, statistics, and insights
 * for relationship interactions.
 *
 * @module relate/interactions/routes
 */

import { Router, Request, Response } from 'express';
import { interactionService, InteractionFilters, Period } from './service';
import { progressTracker } from './progress';
import { relationshipMetricsService } from './metrics';
import { relationshipInsightsService } from './insights';

// ============================================================================
// Router Setup
// ============================================================================

const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user ID from request (assumes auth middleware sets this)
 */
function getUserId(req: Request): string {
  // In production, this would come from authenticated user
  return (req as any).user?.id || 'default-user';
}

/**
 * Handle async route errors
 */
function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: Function) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Interaction CRUD Routes
// ============================================================================

/**
 * GET /interactions
 * List interactions with filters
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);

  // Parse filters from query params
  const filters: InteractionFilters = {
    type: req.query.type as any,
    person: req.query.person as string,
    outcome: req.query.outcome as any,
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
  };

  const interactions = await interactionService.getAll(userId, filters);

  res.json({
    interactions,
    total: interactions.length,
    filters
  });
}));

/**
 * POST /interactions
 * Log new interaction
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);

  // Validate required fields
  const { person, type, date, summary, outcome, emotions } = req.body;

  if (!person || !type || !date || !summary || !outcome || !emotions) {
    return res.status(400).json({
      error: 'Missing required fields: person, type, date, summary, outcome, emotions'
    });
  }

  // Create interaction
  const interaction = await interactionService.create(userId, {
    person,
    type,
    date: new Date(date),
    duration: req.body.duration,
    location: req.body.location,
    summary,
    outcome,
    emotions,
    linkedFocusAreas: req.body.linkedFocusAreas || [],
    linkedValues: req.body.linkedValues || [],
    notes: req.body.notes,
    metadata: req.body.metadata
  });

  // Auto-link to focus areas
  const linkedFocusAreas = await progressTracker.linkInteractionToFocusAreas(
    userId,
    interaction
  );

  // Detect value contradictions
  const contradictions = await interactionService.detectValueContradictions(
    userId,
    interaction
  );

  res.status(201).json({
    interaction,
    linkedFocusAreas,
    contradictions: contradictions.length > 0 ? contradictions : undefined
  });
}));

/**
 * GET /interactions/:id
 * Get interaction details
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const interactionId = req.params.id;

  const interaction = await interactionService.get(userId, interactionId);

  if (!interaction) {
    return res.status(404).json({ error: 'Interaction not found' });
  }

  res.json({ interaction });
}));

/**
 * PUT /interactions/:id
 * Update interaction
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const interactionId = req.params.id;

  try {
    const interaction = await interactionService.update(userId, interactionId, req.body);
    res.json({ interaction });
  } catch (error) {
    if (error instanceof Error && error.message === 'Interaction not found') {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
}));

/**
 * DELETE /interactions/:id
 * Delete interaction
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const interactionId = req.params.id;

  try {
    await interactionService.delete(userId, interactionId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Interaction not found') {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
}));

// ============================================================================
// Statistics Routes
// ============================================================================

/**
 * GET /interactions/stats
 * Get interaction statistics
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const period = (req.query.period as Period) || 'month';

  const stats = await interactionService.getStats(userId, period);

  // Get emotion trends
  const emotionTrends = await interactionService.getEmotionTrends(userId, period);

  // Get streak data
  const streakData = await progressTracker.getStreak(userId);

  res.json({
    period,
    stats,
    emotionTrends,
    streak: {
      current: streakData.currentStreak,
      longest: streakData.longestStreak,
      totalActiveDays: streakData.totalActiveDays
    }
  });
}));

// ============================================================================
// Relationship Metrics Routes
// ============================================================================

/**
 * GET /interactions/metrics
 * Get relationship metrics for all people
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

  const topRelationships = await relationshipMetricsService.getTopRelationships(userId, limit);

  res.json({
    metrics: topRelationships,
    total: topRelationships.length
  });
}));

/**
 * GET /interactions/metrics/:person
 * Get metrics for specific person
 */
router.get('/metrics/:person', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const person = decodeURIComponent(req.params.person);

  // Get person's interactions
  const interactions = await interactionService.getByPerson(userId, person);

  if (interactions.length === 0) {
    return res.status(404).json({ error: 'No interactions found for this person' });
  }

  // Calculate metrics
  const allInteractions = await interactionService.getAll(userId);
  const metrics = await relationshipMetricsService.calculate(userId, person, allInteractions);

  // Get history
  const period = (req.query.period as Period) || 'month';
  const history = await relationshipMetricsService.getHistory(userId, person, period);

  res.json({
    metrics,
    history,
    interactionCount: interactions.length
  });
}));

/**
 * GET /interactions/neglected
 * Get neglected relationships
 */
router.get('/neglected', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const daysThreshold = req.query.days ? parseInt(req.query.days as string) : 30;

  const neglectedPeople = await relationshipMetricsService.getNeglectedRelationships(
    userId,
    daysThreshold
  );

  res.json({
    neglected: neglectedPeople,
    threshold: daysThreshold,
    count: neglectedPeople.length
  });
}));

// ============================================================================
// Insights Routes
// ============================================================================

/**
 * GET /interactions/insights
 * Get relationship insights
 */
router.get('/insights', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);

  // Get all interactions and metrics
  const interactions = await interactionService.getAll(userId);
  const topMetrics = await relationshipMetricsService.getTopRelationships(userId, 20);

  // Detect insights
  const insights = await relationshipInsightsService.detect(userId, interactions, topMetrics);

  // Get patterns
  const patterns = await relationshipInsightsService.detectPatterns(userId, interactions);

  // Get value alignments
  const valueAlignments = await relationshipInsightsService.detectValueAlignments(
    userId,
    interactions
  );

  res.json({
    insights,
    patterns,
    valueAlignments,
    summary: {
      totalInsights: insights.length,
      totalPatterns: patterns.length,
      totalAlignments: valueAlignments.length
    }
  });
}));

/**
 * POST /interactions/insights/:id/acknowledge
 * Acknowledge an insight
 */
router.post('/insights/:id/acknowledge', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const insightId = req.params.id;

  try {
    await relationshipInsightsService.acknowledge(userId, insightId);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Insight not found') {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
}));

// ============================================================================
// Export Router
// ============================================================================

export default router;
