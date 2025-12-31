/**
 * Routes Index
 *
 * Aggregates all API routes including PKA-STRAT strategic alignment routes.
 * @module api/routes
 */
import { Router } from 'express';
import { UnifiedMemory } from '../../memory/index.js';
import { CollectionManager } from '../../memory/collections.js';
import { createCollectionsRouter } from './collections.js';
import { createSearchRouter } from './search.js';
import { createMetricsRouter } from './metrics.js';
import { createChatRouter } from './chat.js';
import { createDocumentsRouter } from './documents.js';

// PKA-STRAT route imports
import { PKAMemoryManager } from '../../pka/memory.js';
import { createPyramidRouter } from './pyramid.js';
import { createAlignmentRouter } from './alignment.js';
import { createDriftRouter } from './drift.js';
import { createTeamsRouter } from './teams.js';
import { createReportsRouter } from './reports.js';

/**
 * Create main API router with all sub-routes
 *
 * @param memory - UnifiedMemory instance
 * @param collectionManager - CollectionManager instance
 * @returns Express router
 */
export function createApiRouter(
  memory: UnifiedMemory,
  collectionManager: CollectionManager
): Router {
  const router = Router();

  // Mount search routes FIRST (more specific routes should come before less specific)
  // POST /collections/:name/search needs to be matched before GET /collections/:name
  const searchRouter = createSearchRouter(memory, collectionManager);
  router.use('/collections', searchRouter);

  // Mount collections routes SECOND (less specific /:name patterns)
  const collectionsRouter = createCollectionsRouter(collectionManager);
  router.use('/collections', collectionsRouter);

  // Mount metrics routes
  const metricsRouter = createMetricsRouter(memory, collectionManager);
  router.use('/metrics', metricsRouter);

  // Insights endpoint (also under metrics for convenience)
  router.use('/insights', (req, res, next) => {
    req.url = '/insights';
    metricsRouter(req, res, next);
  });

  // Mount chat routes
  const chatRouter = createChatRouter(memory, collectionManager);
  router.use('/chat', chatRouter);

  // Mount documents routes (upload and processing)
  const documentsRouter = createDocumentsRouter(memory, collectionManager);
  router.use('/documents', documentsRouter);

  // =========================================================================
  // PKA-STRAT Strategic Alignment Routes
  // =========================================================================

  // Create PKA Memory Manager for strategic alignment features
  const pkaMemory = new PKAMemoryManager(memory);

  // Mount pyramid routes - Strategic hierarchy management
  const pyramidRouter = createPyramidRouter(pkaMemory);
  router.use('/pyramid', pyramidRouter);

  // Mount alignment routes - Alignment scoring and heatmaps
  const alignmentRouter = createAlignmentRouter(pkaMemory);
  router.use('/alignment', alignmentRouter);

  // Mount drift routes - Drift detection and alerts
  const driftRouter = createDriftRouter(pkaMemory);
  router.use('/drift', driftRouter);

  // Mount teams routes - Team management
  const teamsRouter = createTeamsRouter(pkaMemory);
  router.use('/teams', teamsRouter);

  // Mount reports routes - Strategic reports and analytics
  const reportsRouter = createReportsRouter(pkaMemory);
  router.use('/reports', reportsRouter);

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      features: {
        pkaStrat: true,
        collections: true,
        chat: true,
        documents: true
      }
    });
  });

  return router;
}

export { createCollectionsRouter } from './collections.js';
export { createSearchRouter } from './search.js';
export { createMetricsRouter } from './metrics.js';
export { createChatRouter } from './chat.js';
export { createDocumentsRouter } from './documents.js';

// PKA-STRAT route exports
export { createPyramidRouter } from './pyramid.js';
export { createAlignmentRouter } from './alignment.js';
export { createDriftRouter } from './drift.js';
export { createTeamsRouter } from './teams.js';
export { createReportsRouter } from './reports.js';
