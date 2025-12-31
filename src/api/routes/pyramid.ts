/**
 * Pyramid of Clarity API Routes
 * Manages the strategic hierarchy from Mission to Tasks
 *
 * Endpoints for:
 * - CRUD operations for pyramid entities
 * - Hierarchy navigation
 * - Tree visualization data
 *
 * @module api/routes/pyramid
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PKAMemoryManager } from '../../pka/memory.js';
import { PyramidLevel } from '../../pka/types.js';

/**
 * Create pyramid router with PKA memory manager
 *
 * @param pkaMemory - PKA Memory Manager instance
 * @returns Express router
 */
export function createPyramidRouter(pkaMemory: PKAMemoryManager): Router {
  const router = Router();

  /**
   * GET /api/pyramid/:orgId
   * Get full pyramid tree for an organization
   */
  router.get('/:orgId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.params;
      const tree = await pkaMemory.getPyramidTree(orgId);
      res.json({ success: true, data: tree });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/pyramid/:orgId/mission
   * Get organization mission
   */
  router.get('/:orgId/mission', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.params;
      const tree = await pkaMemory.getPyramidTree(orgId);
      const mission = tree.find((e) => e.level === 'mission');
      if (!mission) {
        res.status(404).json({ success: false, error: 'Mission not found' });
        return;
      }
      res.json({ success: true, data: mission });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/pyramid/entity
   * Create pyramid entity
   */
  router.post('/entity', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entity = req.body;

      // Validate required fields
      if (!entity.organizationId) {
        res.status(400).json({ success: false, error: 'organizationId is required' });
        return;
      }
      if (!entity.level) {
        res.status(400).json({ success: false, error: 'level is required' });
        return;
      }
      if (!entity.name) {
        res.status(400).json({ success: false, error: 'name is required' });
        return;
      }

      // Validate level is a valid PyramidLevel
      const validLevels: PyramidLevel[] = [
        'mission',
        'vision',
        'objective',
        'goal',
        'portfolio',
        'program',
        'project',
        'task',
      ];
      if (!validLevels.includes(entity.level)) {
        res.status(400).json({
          success: false,
          error: `Invalid level. Must be one of: ${validLevels.join(', ')}`,
        });
        return;
      }

      const created = await pkaMemory.createPyramidEntity({
        organizationId: entity.organizationId,
        level: entity.level,
        name: entity.name,
        description: entity.description ?? '',
        parentId: entity.parentId ?? null,
        documentIds: entity.documentIds ?? [],
        metadata: entity.metadata ?? {},
      });

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/pyramid/entity/:id
   * Get single entity
   */
  router.get('/entity/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entity = await pkaMemory.getPyramidEntity(req.params.id);
      if (!entity) {
        res.status(404).json({ success: false, error: 'Entity not found' });
        return;
      }
      res.json({ success: true, data: entity });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /api/pyramid/entity/:id
   * Update entity
   */
  router.put('/entity/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validate level if provided
      if (updates.level) {
        const validLevels: PyramidLevel[] = [
          'mission',
          'vision',
          'objective',
          'goal',
          'portfolio',
          'program',
          'project',
          'task',
        ];
        if (!validLevels.includes(updates.level)) {
          res.status(400).json({
            success: false,
            error: `Invalid level. Must be one of: ${validLevels.join(', ')}`,
          });
          return;
        }
      }

      const updated = await pkaMemory.updatePyramidEntity(id, updates);
      res.json({ success: true, data: updated });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  });

  /**
   * DELETE /api/pyramid/entity/:id
   * Delete entity
   */
  router.delete('/entity/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await pkaMemory.deletePyramidEntity(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Entity not found' });
        return;
      }
      res.json({ success: true, message: 'Entity deleted' });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/pyramid/entity/:id/children
   * Get children of an entity
   */
  router.get(
    '/entity/:id/children',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const depth = parseInt(req.query.depth as string) || 1;
        const children = await pkaMemory.getChildren(req.params.id, depth);
        res.json({ success: true, data: children });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/pyramid/entity/:id/path
   * Get path from entity to mission
   */
  router.get(
    '/entity/:id/path',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const path = await pkaMemory.getPathToMission(req.params.id);
        res.json({ success: true, data: path });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/pyramid/explorer
   * Pyramid explorer data for visualization
   */
  router.get('/explorer', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.query;
      if (!orgId) {
        res.status(400).json({ success: false, error: 'orgId query parameter is required' });
        return;
      }

      const tree = await pkaMemory.getPyramidTree(orgId as string);

      // Format for visualization
      const formatted = {
        levels: [
          'mission',
          'vision',
          'objective',
          'goal',
          'portfolio',
          'program',
          'project',
          'task',
        ] as PyramidLevel[],
        entities: tree,
        connections: tree
          .filter((e) => e.parentId)
          .map((e) => ({
            from: e.id,
            to: e.parentId,
            type: 'ALIGNS_TO',
          })),
        stats: {
          totalEntities: tree.length,
          byLevel: tree.reduce(
            (acc, e) => {
              acc[e.level] = (acc[e.level] || 0) + 1;
              return acc;
            },
            {} as Record<PyramidLevel, number>
          ),
        },
      };

      res.json({ success: true, data: formatted });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export { createPyramidRouter as default };
