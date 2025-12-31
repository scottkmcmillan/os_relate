/**
 * Collections Routes
 *
 * Handles CRUD operations for collections.
 * @module api/routes/collections
 */
import { Router, Request, Response, NextFunction } from 'express';
import { CollectionManager, Collection, CreateCollectionRequest } from '../../memory/collections.js';
import { APIException } from '../middleware/error.js';

/**
 * Create collections router
 *
 * @param collectionManager - CollectionManager instance
 * @returns Express router
 */
export function createCollectionsRouter(collectionManager: CollectionManager): Router {
  const router = Router();

  /**
   * GET /collections
   * List all collections
   */
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const collections = collectionManager.listCollections();

      // Transform to API format
      const response = collections.map(c => ({
        name: c.name,
        dimension: c.dimension,
        metric: c.metric,
        vectorCount: c.vectorCount,
        documentCount: c.documentCount,
        createdAt: c.createdAt,
        lastUpdated: c.lastUpdated,
        stats: {
          avgSearchTime: c.stats.avgSearchTime,
          queriesPerDay: c.stats.queriesPerDay,
          gnnImprovement: c.stats.gnnImprovement
        }
      }));

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /collections/names
   * List collection names only (lightweight endpoint for dropdowns)
   */
  router.get('/names', (req: Request, res: Response, next: NextFunction) => {
    try {
      const collections = collectionManager.listCollections();
      const names = collections.map(c => c.name);

      res.json({ names });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /collections
   * Create a new collection
   */
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, dimension, metric } = req.body;

      // Validate required fields
      if (!name) {
        throw new APIException(400, 'MISSING_FIELD', 'Collection name is required');
      }

      const createRequest: CreateCollectionRequest = {
        name,
        dimension: dimension || 384, // Default to Ranger's 384-dim embeddings
        metric: metric || 'cosine'
      };

      const collection = collectionManager.createCollection(createRequest);

      res.status(201).json({
        name: collection.name,
        dimension: collection.dimension,
        metric: collection.metric,
        vectorCount: collection.vectorCount,
        documentCount: collection.documentCount,
        createdAt: collection.createdAt,
        lastUpdated: collection.lastUpdated,
        stats: {
          avgSearchTime: collection.stats.avgSearchTime,
          queriesPerDay: collection.stats.queriesPerDay,
          gnnImprovement: collection.stats.gnnImprovement
        }
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        next(new APIException(409, 'COLLECTION_EXISTS', err.message));
      } else if (err instanceof Error && err.message.includes('must contain only')) {
        next(new APIException(400, 'INVALID_NAME', err.message));
      } else {
        next(err);
      }
    }
  });

  /**
   * GET /collections/:name
   * Get a specific collection by name
   */
  router.get('/:name', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;
      const collection = collectionManager.getCollection(name);

      if (!collection) {
        throw new APIException(404, 'NOT_FOUND', `Collection '${name}' not found`);
      }

      res.json({
        name: collection.name,
        dimension: collection.dimension,
        metric: collection.metric,
        vectorCount: collection.vectorCount,
        documentCount: collection.documentCount,
        createdAt: collection.createdAt,
        lastUpdated: collection.lastUpdated,
        stats: {
          avgSearchTime: collection.stats.avgSearchTime,
          queriesPerDay: collection.stats.queriesPerDay,
          gnnImprovement: collection.stats.gnnImprovement
        }
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /collections/:name
   * Delete a collection
   */
  router.delete('/:name', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;
      const deleted = collectionManager.deleteCollection(name);

      if (!deleted) {
        throw new APIException(404, 'NOT_FOUND', `Collection '${name}' not found`);
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /collections/:name/stats
   * Get collection statistics
   */
  router.get('/:name/stats', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;
      const stats = collectionManager.getCollectionStats(name);

      if (!stats) {
        throw new APIException(404, 'NOT_FOUND', `Collection '${name}' not found`);
      }

      res.json({
        avgSearchTime: stats.performance.avgSearchTime,
        queriesPerDay: stats.performance.queriesPerDay,
        gnnImprovement: stats.performance.gnnImprovement
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
