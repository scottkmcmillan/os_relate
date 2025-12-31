/**
 * Search Routes
 *
 * Handles semantic search within collections.
 * @module api/routes/search
 */
import { Router, Request, Response, NextFunction } from 'express';
import { UnifiedMemory } from '../../memory/index.js';
import { CollectionManager } from '../../memory/collections.js';
import { APIException } from '../middleware/error.js';
import {
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  AttentionMechanism
} from '../types.js';

/**
 * Map Cortexis attention mechanisms to internal representations
 */
const ATTENTION_MAP: Record<AttentionMechanism, string> = {
  FlashAttention: 'flash',
  HyperbolicAttention: 'hyperbolic',
  GraphAttention: 'graph',
  CrossAttention: 'cross',
  Auto: 'auto'
};

/**
 * Create search router
 *
 * @param memory - UnifiedMemory instance
 * @param collectionManager - CollectionManager instance
 * @returns Express router
 */
export function createSearchRouter(
  memory: UnifiedMemory,
  collectionManager: CollectionManager
): Router {
  const router = Router();

  /**
   * POST /collections/:name/search
   * Perform semantic search within a collection
   */
  router.post('/:name/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;

      // Handle missing request body
      if (!req.body) {
        throw new APIException(400, 'MISSING_BODY', 'Request body is required');
      }

      const {
        query,
        limit = 10,
        attention_mechanism = 'Auto',
        use_gnn = true
      } = req.body as SearchRequest;

      // Validate query
      if (!query || typeof query !== 'string') {
        throw new APIException(400, 'MISSING_FIELD', 'Query is required');
      }

      const startTime = Date.now();

      // Check if collection exists (unless searching all)
      if (name !== 'all') {
        const collection = collectionManager.getCollection(name);
        if (!collection) {
          throw new APIException(404, 'NOT_FOUND', `Collection '${name}' not found`);
        }
      }

      // Perform search using UnifiedMemory
      // Filter by collection category metadata when searching a specific collection
      const searchResults = await memory.search(query, {
        k: limit,
        rerank: use_gnn,
        filters: name !== 'all' ? { category: name } : {}
      });

      const searchTime = Date.now() - startTime;

      // Transform results to Cortexis format
      const results: SearchResultItem[] = searchResults.map(r => {
        // Generate a meaningful title - use actual title, source filename, or generic label
        let displayTitle = r.title;
        if (!displayTitle || displayTitle === '(untitled)') {
          if (r.source) {
            const filename = r.source.split(/[/\\]/).pop();
            displayTitle = filename || 'Document';
          } else {
            displayTitle = 'Document';
          }
        }
        return {
          id: r.id,
          score: r.combinedScore,
          metadata: {
            title: displayTitle,
            content: r.text || '(No content available)',
            author: r.metadata?.author as string | undefined,
            department: r.metadata?.department as string | undefined,
            tags: r.metadata?.tags as string[] | undefined,
            createdAt: r.metadata?.createdAt as string | undefined,
            updatedAt: r.metadata?.updatedAt as string | undefined
          },
          explanation: {
            attentionMechanism: attention_mechanism,
            gnnBoost: r.graphScore ? Math.round(r.graphScore * 100) : 0,
            searchTime: `${searchTime}ms`
          }
        };
      });

      // Record search metrics for the collection
      if (name !== 'all') {
        try {
          const gnnImprovement = use_gnn && results.length > 0
            ? results.reduce((sum, r) => sum + r.explanation.gnnBoost, 0) / results.length / 100
            : 0;
          collectionManager.recordSearchMetric(name, searchTime, gnnImprovement);
        } catch {
          // Ignore metric recording errors
        }
      }

      const response: SearchResponse = {
        results,
        stats: {
          totalFound: results.length,
          searchTime,
          algorithm: use_gnn ? 'HNSW + GNN' : 'HNSW'
        }
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
