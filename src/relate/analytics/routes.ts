import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { analyticsService } from './service';
import { accountabilityEngine } from './accountability';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /analytics/weekly-summary
 * Get weekly summary for the authenticated user
 *
 * Query params:
 * - weekOf: Date (optional) - ISO date string for the week
 */
router.get(
  '/weekly-summary',
  [
    query('weekOf')
      .optional()
      .isISO8601()
      .withMessage('weekOf must be a valid ISO date'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const weekOf = req.query.weekOf ? new Date(req.query.weekOf as string) : undefined;

      const summary = await analyticsService.getWeeklySummary(userId, weekOf);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/focus-progress
 * Get focus area progress
 *
 * Query params:
 * - focusAreaId: string (optional) - Specific focus area ID
 * - period: string (optional) - week, month, quarter, year
 */
router.get(
  '/focus-progress',
  [
    query('focusAreaId')
      .optional()
      .isString()
      .withMessage('focusAreaId must be a string'),
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('period must be one of: week, month, quarter, year'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const focusAreaId = req.query.focusAreaId as string | undefined;
      const period = (req.query.period as 'week' | 'month' | 'quarter' | 'year') || 'week';

      const progress = await analyticsService.getFocusProgress(userId, focusAreaId, period);

      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/interaction-patterns
 * Get interaction patterns and analysis
 *
 * Query params:
 * - period: string (optional) - week, month, quarter, year
 */
router.get(
  '/interaction-patterns',
  [
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('period must be one of: week, month, quarter, year'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const period = (req.query.period as 'week' | 'month' | 'quarter' | 'year') || 'month';

      const patterns = await analyticsService.getInteractionPatterns(userId, period);

      res.json({
        success: true,
        data: patterns,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/streak-data
 * Get streak information for the user
 */
router.get('/streak-data', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const streakData = await analyticsService.getStreakData(userId);

    res.json({
      success: true,
      data: streakData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/accountability
 * Get accountability alerts for the user
 *
 * Query params:
 * - includeDismissed: boolean (optional) - Include dismissed alerts
 */
router.get(
  '/accountability',
  [
    query('includeDismissed')
      .optional()
      .isBoolean()
      .withMessage('includeDismissed must be a boolean'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const includeDismissed = req.query.includeDismissed === 'true';

      let alerts = await analyticsService.getAccountabilityAlerts(userId);

      if (!includeDismissed) {
        alerts = alerts.filter((alert) => !alert.dismissedAt);
      }

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /analytics/accountability/:id/acknowledge
 * Acknowledge an accountability alert
 */
router.put(
  '/accountability/:id/acknowledge',
  [
    param('id')
      .isString()
      .withMessage('Alert ID must be a string'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const alertId = req.params.id;

      const alert = await analyticsService.acknowledgeAlert(userId, alertId);

      res.json({
        success: true,
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /analytics/accountability/:id
 * Dismiss an accountability alert
 *
 * Body:
 * - reason: string (optional) - Reason for dismissing
 */
router.delete(
  '/accountability/:id',
  [
    param('id')
      .isString()
      .withMessage('Alert ID must be a string'),
    body('reason')
      .optional()
      .isString()
      .withMessage('Reason must be a string'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const alertId = req.params.id;
      const reason = req.body.reason;

      await accountabilityEngine.dismissAlert(userId, alertId, reason);

      res.json({
        success: true,
        message: 'Alert dismissed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/drift-alerts
 * Get drift alerts (value, goal, behavior drift)
 * A8: NEW ENDPOINT for drift monitoring
 *
 * Query params:
 * - type: string (optional) - Filter by drift type
 * - severity: string (optional) - Filter by severity
 */
router.get(
  '/drift-alerts',
  [
    query('type')
      .optional()
      .isIn(['value_drift', 'goal_drift', 'behavior_drift'])
      .withMessage('type must be one of: value_drift, goal_drift, behavior_drift'),
    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('severity must be one of: low, medium, high'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const type = req.query.type as string | undefined;
      const severity = req.query.severity as string | undefined;

      let alerts = await analyticsService.getDriftAlerts(userId);

      // Apply filters
      if (type) {
        alerts = alerts.filter((alert) => alert.type === type);
      }

      if (severity) {
        alerts = alerts.filter((alert) => alert.severity === severity);
      }

      res.json({
        success: true,
        data: {
          alerts,
          totalCount: alerts.length,
          bySeverity: {
            low: alerts.filter((a) => a.severity === 'low').length,
            medium: alerts.filter((a) => a.severity === 'medium').length,
            high: alerts.filter((a) => a.severity === 'high').length,
          },
          byType: {
            value_drift: alerts.filter((a) => a.type === 'value_drift').length,
            goal_drift: alerts.filter((a) => a.type === 'goal_drift').length,
            behavior_drift: alerts.filter((a) => a.type === 'behavior_drift').length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/real-time-drift
 * Get real-time drift monitoring data
 * A9: NEW ENDPOINT for real-time drift tracking
 *
 * Returns current alignment scores, trend direction, and active alerts
 */
router.get('/real-time-drift', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const driftData = await analyticsService.getRealTimeDrift(userId);

    res.json({
      success: true,
      data: {
        ...driftData,
        status: driftData.currentAlignment >= 70
          ? 'healthy'
          : driftData.currentAlignment >= 50
          ? 'warning'
          : 'critical',
        recommendations: driftData.currentAlignment < 70
          ? [
              'Review your core values and ensure alignment',
              'Schedule time for neglected focus areas',
              'Address active drift alerts',
            ]
          : [
              'Keep up the good work!',
              'Continue monitoring your progress',
            ],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /analytics/run-check
 * Manually trigger accountability check
 *
 * Body:
 * - checkTypes: string[] (optional) - Specific check types to run
 */
router.post(
  '/run-check',
  [
    body('checkTypes')
      .optional()
      .isArray()
      .withMessage('checkTypes must be an array'),
    body('checkTypes.*')
      .optional()
      .isIn(['value_contradiction', 'goal_drift', 'pattern_detected', 'neglected_area'])
      .withMessage('Invalid check type'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const checkTypes = req.body.checkTypes as string[] | undefined;

      let alerts;

      if (checkTypes && checkTypes.length > 0) {
        // Run specific checks
        const results = await Promise.all(
          checkTypes.map((type) => {
            switch (type) {
              case 'value_contradiction':
                return accountabilityEngine.detectValueContradictions(userId);
              case 'goal_drift':
                return accountabilityEngine.detectGoalDrift(userId);
              case 'pattern_detected':
                return accountabilityEngine.detectPatterns(userId);
              case 'neglected_area':
                return accountabilityEngine.detectNeglectedAreas(userId);
              default:
                return Promise.resolve([]);
            }
          })
        );
        alerts = results.flat();
      } else {
        // Run all checks
        alerts = await accountabilityEngine.runAccountabilityCheck(userId);
      }

      res.json({
        success: true,
        data: {
          alerts,
          totalCount: alerts.length,
          suggestions: accountabilityEngine.generateSuggestions(alerts),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/summary
 * Get comprehensive analytics summary
 *
 * Query params:
 * - period: string (optional) - week, month, quarter, year
 */
router.get(
  '/summary',
  [
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('period must be one of: week, month, quarter, year'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const period = (req.query.period as 'week' | 'month' | 'quarter' | 'year') || 'week';

      // Get all analytics in parallel
      const [
        weeklySummary,
        focusProgress,
        patterns,
        streakData,
        accountabilityAlerts,
        driftData,
      ] = await Promise.all([
        period === 'week' ? analyticsService.getWeeklySummary(userId) : null,
        analyticsService.getFocusProgress(userId, undefined, period),
        analyticsService.getInteractionPatterns(userId, period),
        analyticsService.getStreakData(userId),
        analyticsService.getAccountabilityAlerts(userId),
        analyticsService.getRealTimeDrift(userId),
      ]);

      res.json({
        success: true,
        data: {
          period,
          weeklySummary,
          focusProgress,
          patterns,
          streakData,
          accountability: {
            activeAlerts: accountabilityAlerts.filter((a) => !a.dismissedAt).length,
            recentAlerts: accountabilityAlerts.slice(0, 5),
          },
          drift: {
            currentAlignment: driftData.currentAlignment,
            trendDirection: driftData.trendDirection,
            activeAlertCount: driftData.alerts.length,
            metrics: driftData.metrics,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
