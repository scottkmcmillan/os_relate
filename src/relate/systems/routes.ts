/**
 * SubSystem Routes - REST API endpoints for sub-systems
 *
 * Provides endpoints for managing knowledge domains, linking systems,
 * and visualizing the knowledge graph.
 *
 * @module relate/systems/routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  subSystemService,
  SubSystemCreate,
  ContentItemCreate,
  Pagination
} from './service.js';

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /systems
 * List all user's sub-systems
 */
async function getAllSystems(req: Request, res: Response, next: NextFunction) {
  try {
    // In a real app, userId would come from authenticated session
    const userId = req.headers['x-user-id'] as string || 'default-user';

    const systems = await subSystemService.getAll(userId);

    res.json({
      systems,
      total: systems.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /systems
 * Create new sub-system
 */
async function createSystem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const data: SubSystemCreate = req.body;

    // Validation
    if (!data.name || data.name.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name is required'
        }
      });
    }

    if (data.name.length > 200) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name must be less than 200 characters'
        }
      });
    }

    const system = await subSystemService.create(userId, data);

    res.status(201).json(system);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /systems/:id
 * Get sub-system details
 */
async function getSystem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { id } = req.params;

    const system = await subSystemService.get(userId, id);

    if (!system) {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Sub-system not found'
        }
      });
    }

    res.json(system);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /systems/:id
 * Update sub-system
 */
async function updateSystem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { id } = req.params;
    const updates = req.body;

    // Validation
    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.trim().length === 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name must be a non-empty string'
          }
        });
      }

      if (updates.name.length > 200) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name must be less than 200 characters'
          }
        });
      }
    }

    const system = await subSystemService.update(userId, id, updates);

    res.json(system);
  } catch (error) {
    if ((error as Error).message === 'Sub-system not found') {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Sub-system not found'
        }
      });
    }
    next(error);
  }
}

/**
 * DELETE /systems/:id
 * Delete sub-system
 */
async function deleteSystem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { id } = req.params;

    await subSystemService.delete(userId, id);

    res.status(204).send();
  } catch (error) {
    if ((error as Error).message === 'Sub-system not found') {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Sub-system not found'
        }
      });
    }

    if ((error as Error).message === 'Cannot delete default sub-systems') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot delete default sub-systems'
        }
      });
    }

    next(error);
  }
}

/**
 * GET /systems/:id/items
 * Get content items in system
 */
async function getSystemItems(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { id } = req.params;

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const pagination: Pagination = { page, limit };
    const items = await subSystemService.getItems(userId, id, pagination);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total: items.length
      }
    });
  } catch (error) {
    if ((error as Error).message === 'Sub-system not found') {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Sub-system not found'
        }
      });
    }
    next(error);
  }
}

/**
 * POST /systems/:id/items
 * Add content item to system
 */
async function addSystemItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { id } = req.params;
    const data: ContentItemCreate = req.body;

    // Validation
    if (!data.type) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Type is required'
        }
      });
    }

    const validTypes = ['article', 'video', 'book', 'podcast', 'note'];
    if (!validTypes.includes(data.type)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Type must be one of: ${validTypes.join(', ')}`
        }
      });
    }

    if (!data.title || data.title.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title is required'
        }
      });
    }

    if (data.title.length > 300) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title must be less than 300 characters'
        }
      });
    }

    const item = await subSystemService.addItem(userId, id, data);

    res.status(201).json(item);
  } catch (error) {
    if ((error as Error).message === 'Sub-system not found') {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Sub-system not found'
        }
      });
    }
    next(error);
  }
}

/**
 * GET /systems/graph
 * Get graph visualization data
 */
async function getSystemsGraph(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const includeContent = req.query.includeContent === 'true';

    const graph = await subSystemService.getGraph(userId, includeContent);

    res.json(graph);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /systems/:id/link/:targetId
 * Link two systems
 */
async function linkSystems(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { id, targetId } = req.params;
    const { strength = 0.5 } = req.body;

    // Validation
    if (typeof strength !== 'number' || strength < 0 || strength > 1) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Strength must be a number between 0 and 1'
        }
      });
    }

    await subSystemService.link(userId, id, targetId, strength);

    res.status(201).json({
      message: 'Systems linked successfully',
      sourceId: id,
      targetId,
      strength
    });
  } catch (error) {
    if ((error as Error).message === 'One or both sub-systems not found') {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'One or both sub-systems not found'
        }
      });
    }

    if ((error as Error).message === 'Cannot link a sub-system to itself') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Cannot link a sub-system to itself'
        }
      });
    }

    next(error);
  }
}

/**
 * DELETE /systems/:id/link/:targetId
 * Unlink two systems
 */
async function unlinkSystems(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { id, targetId } = req.params;

    await subSystemService.unlink(userId, id, targetId);

    res.status(204).send();
  } catch (error) {
    if ((error as Error).message === 'One or both sub-systems not found') {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'One or both sub-systems not found'
        }
      });
    }

    if ((error as Error).message === 'Link not found') {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Link not found'
        }
      });
    }

    next(error);
  }
}

/**
 * GET /systems/:id/linked
 * Get linked systems
 */
async function getLinkedSystems(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { id } = req.params;

    const systems = await subSystemService.getLinkedSystems(userId, id);

    res.json({
      systems,
      total: systems.length
    });
  } catch (error) {
    if ((error as Error).message === 'Sub-system not found') {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Sub-system not found'
        }
      });
    }
    next(error);
  }
}

// ============================================================================
// Router Setup
// ============================================================================

export function createSystemsRouter(): Router {
  const router = Router();

  // Graph endpoint (must come before /:id to avoid conflict)
  router.get('/graph', getSystemsGraph);

  // System CRUD
  router.get('/', getAllSystems);
  router.post('/', createSystem);
  router.get('/:id', getSystem);
  router.put('/:id', updateSystem);
  router.delete('/:id', deleteSystem);

  // Content items
  router.get('/:id/items', getSystemItems);
  router.post('/:id/items', addSystemItem);

  // Linking
  router.post('/:id/link/:targetId', linkSystems);
  router.delete('/:id/link/:targetId', unlinkSystems);
  router.get('/:id/linked', getLinkedSystems);

  return router;
}

export default createSystemsRouter;
