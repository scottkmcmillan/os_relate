/**
 * Strategic Alignment API Routes
 *
 * Provides endpoints for:
 * - Alignment score calculation
 * - Alignment heatmap generation
 * - Strategic distance metrics
 *
 * @module api/routes/alignment
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PKAMemoryManager } from '../../pka/memory.js';
import { AlignmentScore } from '../../pka/types.js';

/**
 * Create alignment router
 *
 * @param pkaMemory - PKAMemoryManager instance
 * @returns Express router
 */
export function createAlignmentRouter(pkaMemory: PKAMemoryManager): Router {
  const router = Router();

  /**
   * GET /api/alignment/summary
   * Get organization-wide alignment summary
   */
  router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.query;
      if (!orgId) {
        return res.status(400).json({ success: false, error: 'orgId required' });
      }

      const entities = await pkaMemory.getPyramidTree(orgId as string);
      const totalEntities = entities.length;

      if (totalEntities === 0) {
        return res.json({
          success: true,
          data: {
            organizationId: orgId,
            totalEntities: 0,
            averageAlignment: 0,
            aligned: 0,
            atRisk: 0,
            drifting: 0,
            lastCalculated: new Date().toISOString()
          }
        });
      }

      // Calculate average alignment (alignmentScore is 0-1)
      const avgAlignment = entities.reduce((sum, e) => sum + e.alignmentScore, 0) / totalEntities;
      const avgAlignmentPercent = avgAlignment * 100;

      // Count by alignment level (threshold based on 0-1 scale)
      const aligned = entities.filter(e => e.alignmentScore >= 0.70).length;
      const atRisk = entities.filter(e => e.alignmentScore >= 0.40 && e.alignmentScore < 0.70).length;
      const drifting = entities.filter(e => e.alignmentScore < 0.40).length;

      res.json({
        success: true,
        data: {
          organizationId: orgId,
          totalEntities,
          averageAlignment: Math.round(avgAlignmentPercent),
          aligned,
          atRisk,
          drifting,
          lastCalculated: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/alignment/heatmap
   * Get alignment heatmap data for visualization
   */
  router.get('/heatmap', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.query;
      if (!orgId) {
        return res.status(400).json({ success: false, error: 'orgId required' });
      }

      const entities = await pkaMemory.getPyramidTree(orgId as string);

      // Format for heatmap visualization
      const heatmapData = entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        level: entity.level,
        parentId: entity.parentId,
        alignmentScore: Math.round(entity.alignmentScore * 100),
        color: getAlignmentColor(entity.alignmentScore)
      }));

      res.json({ success: true, data: heatmapData });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/alignment/entity/:id
   * Get detailed alignment score for a single entity
   */
  router.get('/entity/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entity = await pkaMemory.getPyramidEntity(req.params.id);
      if (!entity) {
        return res.status(404).json({ success: false, error: 'Entity not found' });
      }

      // Calculate detailed alignment score using PKAMemoryManager
      const alignmentResult = await pkaMemory.calculateAlignment(req.params.id);

      // Build response with alignment details
      const score: AlignmentScore = {
        entityId: entity.id,
        score: alignmentResult.score,
        vectorDistance: 0.85, // TODO: Integrate actual vector distance calculation
        graphConnectivity: Math.min(alignmentResult.factors.length / 5, 1),
        driftIndicator: alignmentResult.score >= 0.5 ? 0.8 : 0.3,
        confidence: Math.min(0.5 + (alignmentResult.factors.length * 0.1), 1),
        lastCalculated: alignmentResult.calculatedAt
      };

      // Include breakdown details in response
      res.json({
        success: true,
        data: {
          ...score,
          byLevel: alignmentResult.byLevel,
          factors: alignmentResult.factors
        }
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/alignment/calculate
   * Batch calculate alignments for multiple entities
   */
  router.post('/calculate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityIds } = req.body;
      if (!entityIds || !Array.isArray(entityIds)) {
        return res.status(400).json({ success: false, error: 'entityIds array required' });
      }

      const scores: AlignmentScore[] = [];
      for (const id of entityIds) {
        try {
          const entity = await pkaMemory.getPyramidEntity(id);
          if (entity) {
            const alignmentResult = await pkaMemory.calculateAlignment(id);
            scores.push({
              entityId: id,
              score: alignmentResult.score,
              vectorDistance: 0.85,
              graphConnectivity: Math.min(alignmentResult.factors.length / 5, 1),
              driftIndicator: alignmentResult.score >= 0.5 ? 0.8 : 0.3,
              confidence: Math.min(0.5 + (alignmentResult.factors.length * 0.1), 1),
              lastCalculated: alignmentResult.calculatedAt
            });
          }
        } catch {
          // Skip entities that don't exist or have errors
        }
      }

      res.json({ success: true, data: scores });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/alignment/strategic-distance
   * Calculate strategic distance between two entities
   */
  router.get('/strategic-distance', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, targetId } = req.query;
      if (!entityId || !targetId) {
        return res.status(400).json({ success: false, error: 'entityId and targetId required' });
      }

      // Calculate path-based distance using path to mission
      const path1 = await pkaMemory.getPathToMission(entityId as string);
      const path2 = await pkaMemory.getPathToMission(targetId as string);

      if (path1.length === 0 && path2.length === 0) {
        return res.json({
          success: true,
          data: {
            entityId,
            targetId,
            distance: 1.0,
            commonAncestorId: null,
            pathLength: 0
          }
        });
      }

      // Find common ancestor by looking for shared entities in paths
      const path1Ids = new Set(path1.map(e => e.id));
      const commonAncestor = path2.find(e => path1Ids.has(e.id));

      // Calculate normalized distance (0-1 scale)
      let distance: number;
      if (commonAncestor) {
        const path1Index = path1.findIndex(e => e.id === commonAncestor.id);
        const path2Index = path2.findIndex(e => e.id === commonAncestor.id);
        // Distance is based on total hops through common ancestor, normalized to max 10 hops
        distance = Math.min((path1Index + path2Index) / 10, 1.0);
      } else {
        distance = 1.0; // Maximum distance if no common ancestor
      }

      res.json({
        success: true,
        data: {
          entityId,
          targetId,
          distance,
          commonAncestorId: commonAncestor?.id || null,
          pathLength: path1.length + path2.length
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

/**
 * Get color representation for alignment score visualization
 *
 * @param score - Alignment score (0-1 scale)
 * @returns Hex color string
 */
function getAlignmentColor(score: number): string {
  // Convert 0-1 scale to percentage for thresholds
  const percentage = score * 100;

  if (percentage >= 80) return '#22c55e'; // green-500
  if (percentage >= 60) return '#84cc16'; // lime-500
  if (percentage >= 40) return '#eab308'; // yellow-500
  if (percentage >= 20) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}
