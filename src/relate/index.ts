import { Router } from 'express';
import authRoutes from './auth/routes';
import userRoutes from './user/routes';
import systemRoutes from './systems/routes';
import contentRoutes from './content/routes';
import interactionRoutes from './interactions/routes';
import chatRoutes from './chat/routes';
import analyticsRoutes from './analytics/routes';
import eventRoutes from './events/routes';
import exportRoutes from './export/routes';

// Export all types
export * from './types';

// Export all services
export { memoryService } from './memory/service';
export { authService } from './auth/service';
export { userService } from './user/service';
export { systemService } from './systems/service';
export { contentService } from './content/service';
export { interactionService } from './interactions/service';
export { chatService } from './chat/service';
export { analyticsService } from './analytics/service';
export { eventService } from './events/service';
export { exportService } from './export/service';

// Export middleware
export { authenticateToken } from './auth/middleware';

/**
 * Create and configure the main PKA-Relate router
 *
 * This aggregates all module routes into a single router
 * that can be mounted in the Express application.
 *
 * @returns {Router} Configured Express router with all PKA-Relate routes
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createRelateRouter } from './relate';
 *
 * const app = express();
 * app.use('/api/relate', createRelateRouter());
 * ```
 */
export function createRelateRouter(): Router {
  const router = Router();

  // Mount all module routes
  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/systems', systemRoutes);
  router.use('/content-items', contentRoutes);
  router.use('/interactions', interactionRoutes);
  router.use('/conversations', chatRoutes);
  router.use('/analytics', analyticsRoutes);
  router.use('/events', eventRoutes);
  router.use('/export', exportRoutes);

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'PKA-Relate',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // API info endpoint
  router.get('/', (req, res) => {
    res.json({
      name: 'PKA-Relate API',
      version: '1.0.0',
      description: 'Personal Knowledge Assistant - Relationship Management System',
      endpoints: {
        auth: '/auth',
        users: '/users',
        systems: '/systems',
        content: '/content-items',
        interactions: '/interactions',
        chat: '/conversations',
        analytics: '/analytics',
        events: '/events',
        export: '/export',
        health: '/health'
      },
      documentation: '/api/docs'
    });
  });

  return router;
}

/**
 * Export individual route modules for granular mounting
 */
export const routes = {
  auth: authRoutes,
  user: userRoutes,
  systems: systemRoutes,
  content: contentRoutes,
  interactions: interactionRoutes,
  chat: chatRoutes,
  analytics: analyticsRoutes,
  events: eventRoutes,
  export: exportRoutes
};

/**
 * Module metadata
 */
export const metadata = {
  name: 'PKA-Relate',
  version: '1.0.0',
  description: 'Personal Knowledge Assistant - Relationship Management System',
  author: 'PKA Development Team',
  license: 'MIT'
};

/**
 * Default export for convenience
 */
export default {
  createRelateRouter,
  routes,
  metadata
};
