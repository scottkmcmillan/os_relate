/**
 * Content Routes - HTTP endpoints for content management
 *
 * Handles CRUD operations, search, and file uploads for content items.
 *
 * @module relate/content/routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { contentService, ContentFilters, SearchOptions } from './service';
import { fileIngestionService } from './ingestion';

// ============================================================================
// Multer Configuration for File Uploads
// ============================================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1 // Single file upload only
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types
    const allowedTypes = [
      'application/pdf',
      'application/json',
      'text/markdown',
      'text/plain',
      'text/html'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// ============================================================================
// Type Extensions for Express Request
// ============================================================================

interface AuthRequest extends Request {
  userId?: string;
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Mock authentication middleware
 * In production, replace with real JWT verification
 */
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Mock: Extract userId from header
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  req.userId = userId;
  next();
};

// ============================================================================
// Route Handlers
// ============================================================================

const router = Router();

/**
 * GET /content-items
 * List all content items with optional filters
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Parse query parameters
    const filters: ContentFilters = {
      systemId: req.query.systemId as string | undefined,
      type: req.query.type as any,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
    };

    const items = await contentService.getAll(userId, filters);

    res.json({
      items,
      total: items.length,
      filters
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /content-items/search
 * Semantic search across content items
 */
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter "q" is required'
        }
      });
    }

    // Parse search options
    const options: SearchOptions = {
      systemIds: req.query.systemIds
        ? (req.query.systemIds as string).split(',')
        : undefined,
      types: req.query.types
        ? (req.query.types as string).split(',') as any
        : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      threshold: req.query.threshold ? parseFloat(req.query.threshold as string) : 0.7
    };

    const startTime = Date.now();
    const results = await contentService.search(userId, query, options);
    const searchTime = Date.now() - startTime;

    res.json({
      results: results.map(r => ({
        id: r.item.id,
        systemId: r.item.systemId,
        type: r.item.type,
        title: r.item.title,
        snippet: r.snippet,
        score: r.score,
        createdAt: r.item.createdAt
      })),
      total: results.length,
      query,
      searchTime
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /content-items/:id
 * Get specific content item
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const itemId = req.params.id;

    const item = await contentService.get(userId, itemId);

    if (!item) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Content item not found'
        }
      });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * PUT /content-items/:id
 * Update content item
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const itemId = req.params.id;

    const updated = await contentService.update(userId, itemId, req.body);

    res.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Content item not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * DELETE /content-items/:id
 * Delete content item
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const itemId = req.params.id;

    await contentService.delete(userId, itemId);

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Content item not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * POST /content-items/upload
 * Upload and process a file
 * ENDPOINT A5 - Previously missing from specification
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const systemId = req.body.systemId;

      if (!systemId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'systemId is required'
          }
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No file uploaded'
          }
        });
      }

      const item = await fileIngestionService.uploadFile(userId, systemId, {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      res.status(201).json({
        item,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('exceeds')) {
        return res.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
);

/**
 * POST /content-items/ingest-url
 * Ingest content from URL
 */
router.post('/ingest-url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { systemId, url } = req.body;

    if (!systemId || !url) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'systemId and url are required'
        }
      });
    }

    const item = await fileIngestionService.ingestUrl(userId, systemId, url);

    res.status(201).json({
      item,
      message: 'URL content ingested successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid URL')) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * POST /content-items/ingest-text
 * Ingest text snippet
 */
router.post('/ingest-text', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { systemId, text, metadata } = req.body;

    if (!systemId || !text) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'systemId and text are required'
        }
      });
    }

    const item = await fileIngestionService.ingestText(userId, systemId, text, metadata);

    res.status(201).json({
      item,
      message: 'Text ingested successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// ============================================================================
// Export Router
// ============================================================================

export default router;
