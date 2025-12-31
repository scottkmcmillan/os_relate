import { Router, Request, Response, NextFunction } from 'express';
import { exportService } from './service';
import { authenticateToken } from '../auth/middleware';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { ExportOptions } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /export/data
 * Initiate a new data export
 */
router.post('/data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const options: ExportOptions = {
      format: req.body.format || 'json',
      includeContent: req.body.includeContent !== false,
      includeInteractions: req.body.includeInteractions !== false,
      includeAnalytics: req.body.includeAnalytics !== false,
      dateRange: req.body.dateRange
        ? {
            from: new Date(req.body.dateRange.from),
            to: new Date(req.body.dateRange.to)
          }
        : undefined
    };

    // Validate format
    if (!['json', 'csv', 'pdf'].includes(options.format)) {
      throw new AppError(
        'Invalid export format. Must be one of: json, csv, pdf',
        400
      );
    }

    // Validate date range if provided
    if (options.dateRange) {
      if (isNaN(options.dateRange.from.getTime())) {
        throw new AppError('Invalid dateRange.from format', 400);
      }
      if (isNaN(options.dateRange.to.getTime())) {
        throw new AppError('Invalid dateRange.to format', 400);
      }
      if (options.dateRange.from >= options.dateRange.to) {
        throw new AppError('dateRange.from must be before dateRange.to', 400);
      }
    }

    const job = await exportService.initiateExport(userId, options);

    logger.info(`Export initiated: ${job.id} for user ${userId}`);

    res.status(202).json({
      message: 'Export job initiated',
      job: {
        id: job.id,
        status: job.status,
        format: job.format,
        createdAt: job.createdAt,
        expiresAt: job.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /export/:exportId
 * Get export status or download if completed
 */
router.get('/:exportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { exportId } = req.params;

    const status = await exportService.getExportStatus(userId, exportId);

    if (status.status === 'completed' && req.query.download === 'true') {
      // Download the export
      const buffer = await exportService.downloadExport(userId, exportId);

      // Determine content type based on format
      const contentTypes: Record<string, string> = {
        json: 'application/json',
        csv: 'application/zip',
        pdf: 'application/pdf'
      };

      const job = await exportService.getExportStatus(userId, exportId);
      const contentType = contentTypes[job.status] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="pka-relate-export-${exportId}.${job.status}"`
      );

      return res.send(buffer);
    }

    res.json({
      export: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /export/:exportId
 * Delete an export job
 */
router.delete('/:exportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { exportId } = req.params;

    await exportService.deleteExport(userId, exportId);

    logger.info(`Export deleted: ${exportId} by user ${userId}`);

    res.json({
      message: 'Export deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /export
 * List all exports for the user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const exports = await exportService.getUserExports(userId);

    res.json({
      exports: exports.map(exp => ({
        id: exp.id,
        status: exp.status,
        format: exp.format,
        createdAt: exp.createdAt,
        completedAt: exp.completedAt,
        expiresAt: exp.expiresAt,
        downloadUrl: exp.status === 'completed' ? exp.downloadUrl : undefined,
        error: exp.error
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /export/:exportId/cancel
 * Cancel a pending or processing export
 */
router.post(
  '/:exportId/cancel',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { exportId } = req.params;

      await exportService.cancelExport(userId, exportId);

      logger.info(`Export cancelled: ${exportId} by user ${userId}`);

      res.json({
        message: 'Export cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /export/:exportId/download
 * Direct download endpoint
 */
router.get(
  '/:exportId/download',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { exportId } = req.params;

      const buffer = await exportService.downloadExport(userId, exportId);
      const status = await exportService.getExportStatus(userId, exportId);

      // Determine content type and filename
      const contentTypes: Record<string, string> = {
        json: 'application/json',
        csv: 'application/zip',
        pdf: 'application/pdf'
      };

      const extensions: Record<string, string> = {
        json: 'json',
        csv: 'zip',
        pdf: 'pdf'
      };

      const job = await exportService.getExportStatus(userId, exportId);
      const format = job.status === 'completed' ? 'json' : 'txt'; // Fallback

      const contentType = contentTypes[format] || 'application/octet-stream';
      const extension = extensions[format] || 'dat';

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="pka-relate-export-${exportId}.${extension}"`
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
