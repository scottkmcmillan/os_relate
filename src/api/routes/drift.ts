/**
 * Mission Drift Detection API Routes
 * Real-time drift monitoring and alerts
 *
 * Provides endpoints for monitoring strategic alignment drift,
 * generating alerts, and tracking drift trends over time.
 *
 * @module api/routes/drift
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PKAMemoryManager } from '../../pka/memory.js';
import { DriftAlert, PyramidEntity } from '../../pka/types.js';

/**
 * Create drift detection router
 *
 * @param pkaMemory - PKAMemoryManager instance
 * @returns Express router
 */
export function createDriftRouter(pkaMemory: PKAMemoryManager): Router {
  const router = Router();

  // In-memory alert storage (replace with persistent storage in production)
  const alertsStore: Map<string, DriftAlert[]> = new Map();

  /**
   * GET /api/drift/alerts
   * Get drift alerts for an organization
   *
   * Query params:
   * - orgId (required): Organization ID
   * - severity: Filter by severity level
   * - acknowledged: Filter by acknowledgement status
   * - threshold: Alignment score threshold (default: 50)
   */
  router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId, severity, acknowledged } = req.query;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: 'orgId query parameter is required'
        });
      }

      // Get entities and detect drift
      const entities = await pkaMemory.getPyramidTree(orgId as string);
      const threshold = parseFloat(req.query.threshold as string) || 50;

      // Generate alerts for entities below threshold
      // Note: alignmentScore in types.ts is 0-1, but we use 0-100 for threshold comparison
      const alerts: DriftAlert[] = entities
        .filter(e => (e.alignmentScore * 100) < threshold)
        .map(entity => ({
          id: `drift-${entity.id}-${Date.now()}`,
          entityId: entity.id,
          severity: getSeverity(entity.alignmentScore * 100),
          driftScore: 1 - entity.alignmentScore, // Invert: higher drift = lower alignment
          message: `${entity.name} (${entity.level}) has alignment score of ${Math.round(entity.alignmentScore * 100)}%, indicating potential strategic drift.`,
          suggestedAction: getSuggestedAction(entity.alignmentScore * 100),
          detectedAt: new Date().toISOString(),
          acknowledged: false
        }));

      // Filter by severity if specified
      let filteredAlerts = alerts;
      if (severity) {
        filteredAlerts = alerts.filter(a => a.severity === severity);
      }
      if (acknowledged !== undefined) {
        const ack = acknowledged === 'true';
        filteredAlerts = filteredAlerts.filter(a => a.acknowledged === ack);
      }

      // Sort by severity (critical first)
      const severityOrder: Record<DriftAlert['severity'], number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3
      };
      filteredAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      res.json({
        success: true,
        data: filteredAlerts,
        meta: {
          total: filteredAlerts.length,
          threshold,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/drift/alerts/:id
   * Get a single drift alert by ID
   */
  router.get('/alerts/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alertId = req.params.id;

      // In production, fetch from persistent storage
      // For now, return a mock response
      res.json({
        success: true,
        data: {
          id: alertId,
          message: 'Alert details would be fetched from persistent storage',
          note: 'This is a placeholder response. Implement persistent storage for production.'
        }
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /api/drift/alerts/:id/acknowledge
   * Acknowledge a drift alert
   */
  router.put('/alerts/:id/acknowledge', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alertId = req.params.id;
      const { acknowledgedBy, notes } = req.body;

      // In production, update persistent storage
      res.json({
        success: true,
        message: 'Alert acknowledged',
        data: {
          id: alertId,
          acknowledged: true,
          acknowledgedAt: new Date().toISOString(),
          acknowledgedBy: acknowledgedBy || 'system',
          notes: notes || null
        }
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/drift/monitor
   * Get real-time drift monitoring metrics
   *
   * Query params:
   * - orgId (required): Organization ID
   */
  router.get('/monitor', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.query;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: 'orgId query parameter is required'
        });
      }

      const entities = await pkaMemory.getPyramidTree(orgId as string);

      // Calculate alignment scores (convert 0-1 to 0-100 for display)
      const alignmentScores = entities.map(e => e.alignmentScore * 100);
      const avgAlignment = alignmentScores.length > 0
        ? alignmentScores.reduce((sum, s) => sum + s, 0) / alignmentScores.length
        : 0;

      const metrics = {
        totalEntities: entities.length,
        criticalDrift: entities.filter(e => (e.alignmentScore * 100) < 20).length,
        highDrift: entities.filter(e => {
          const score = e.alignmentScore * 100;
          return score >= 20 && score < 40;
        }).length,
        mediumDrift: entities.filter(e => {
          const score = e.alignmentScore * 100;
          return score >= 40 && score < 60;
        }).length,
        lowDrift: entities.filter(e => {
          const score = e.alignmentScore * 100;
          return score >= 60 && score < 80;
        }).length,
        aligned: entities.filter(e => (e.alignmentScore * 100) >= 80).length,
        averageAlignment: Math.round(avgAlignment),
        averageDrift: Math.round(100 - avgAlignment),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/drift/trends
   * Get historical drift trends
   *
   * Query params:
   * - orgId: Organization ID
   * - period: Time period (7d, 30d, 90d)
   */
  router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId, period } = req.query;

      // In production, fetch from time-series storage
      // For now, return mock historical data
      const trends = {
        period: period || '30d',
        dataPoints: [
          { date: '2025-12-01', avgAlignment: 72, driftAlerts: 5 },
          { date: '2025-12-08', avgAlignment: 68, driftAlerts: 8 },
          { date: '2025-12-15', avgAlignment: 71, driftAlerts: 6 },
          { date: '2025-12-22', avgAlignment: 74, driftAlerts: 4 },
          { date: '2025-12-29', avgAlignment: 76, driftAlerts: 3 }
        ],
        summary: {
          trendDirection: 'improving',
          changePercent: 5.6,
          peakDriftDate: '2025-12-08',
          currentStatus: 'healthy'
        }
      };

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/drift/entity/:entityId
   * Get drift details for a specific entity
   */
  router.get('/entity/:entityId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;

      const entity = await pkaMemory.getPyramidEntity(entityId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          error: `Entity ${entityId} not found`
        });
      }

      const alignmentPercent = entity.alignmentScore * 100;
      const driftAnalysis = {
        entity: {
          id: entity.id,
          name: entity.name,
          level: entity.level,
          alignmentScore: alignmentPercent
        },
        drift: {
          score: 100 - alignmentPercent,
          severity: getSeverity(alignmentPercent),
          suggestedAction: getSuggestedAction(alignmentPercent)
        },
        pathToMission: await pkaMemory.getPathToMission(entityId),
        analyzedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: driftAnalysis
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/drift/recalculate
   * Trigger recalculation of drift metrics for an organization
   */
  router.post('/recalculate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.body;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: 'orgId is required in request body'
        });
      }

      const entities = await pkaMemory.getPyramidTree(orgId);
      const updatedCount = entities.length;

      // In production, this would trigger alignment recalculation
      // for each entity asynchronously

      res.json({
        success: true,
        message: `Drift recalculation triggered for ${updatedCount} entities`,
        data: {
          orgId,
          entitiesProcessed: updatedCount,
          triggeredAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

/**
 * Determine severity level based on alignment score
 *
 * @param alignmentScore - Alignment score (0-100)
 * @returns Severity level
 */
function getSeverity(alignmentScore: number): DriftAlert['severity'] {
  if (alignmentScore < 20) return 'critical';
  if (alignmentScore < 40) return 'high';
  if (alignmentScore < 60) return 'medium';
  return 'low';
}

/**
 * Generate suggested action based on alignment score
 *
 * @param alignmentScore - Alignment score (0-100)
 * @returns Suggested action string
 */
function getSuggestedAction(alignmentScore: number): string {
  if (alignmentScore < 20) {
    return 'URGENT: Schedule immediate alignment review with leadership. Consider reassigning or terminating initiative.';
  }
  if (alignmentScore < 40) {
    return 'Review strategic objectives and update entity description to better align with parent goals.';
  }
  if (alignmentScore < 60) {
    return 'Add supporting documents or link to related strategic initiatives to strengthen alignment.';
  }
  return 'Monitor and schedule periodic alignment review.';
}

