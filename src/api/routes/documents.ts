/**
 * Documents Routes
 *
 * Handles document upload and processing operations.
 * @module api/routes/documents
 */
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { UnifiedMemory, Document } from '../../memory/index.js';
import { CollectionManager } from '../../memory/collections.js';
import { parseDocument, DocumentType } from '../../ingestion/parser.js';
import { APIException } from '../middleware/error.js';
import { UploadJob } from '../types.js';

// ============================================================================
// Upload Job Tracking
// ============================================================================

// In-memory job storage (in production, use Redis or database)
const uploadJobs = new Map<string, UploadJob>();

// Job cleanup: remove completed/error jobs after 1 hour
const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_JOBS = 1000; // Maximum jobs to keep in memory

// Cleanup old jobs periodically
function cleanupOldJobs(): void {
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [jobId, job] of uploadJobs.entries()) {
    // Delete completed/error jobs older than TTL
    if ((job.status === 'complete' || job.status === 'error') && job.completedAt) {
      const completedTime = new Date(job.completedAt).getTime();
      if (now - completedTime > JOB_TTL_MS) {
        toDelete.push(jobId);
      }
    }
  }

  for (const jobId of toDelete) {
    uploadJobs.delete(jobId);
  }

  // If still too many jobs, delete oldest completed ones
  if (uploadJobs.size > MAX_JOBS) {
    const sortedJobs = Array.from(uploadJobs.entries())
      .filter(([_, job]) => job.status === 'complete' || job.status === 'error')
      .sort((a, b) => {
        const timeA = a[1].completedAt ? new Date(a[1].completedAt).getTime() : 0;
        const timeB = b[1].completedAt ? new Date(b[1].completedAt).getTime() : 0;
        return timeA - timeB;
      });

    const deleteCount = uploadJobs.size - MAX_JOBS;
    for (let i = 0; i < deleteCount && i < sortedJobs.length; i++) {
      uploadJobs.delete(sortedJobs[i]![0]);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldJobs, 10 * 60 * 1000);

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Supported file extensions and their document types
const SUPPORTED_EXTENSIONS: Record<string, DocumentType> = {
  '.md': 'markdown',
  '.txt': 'text',
  '.json': 'json',
  '.jsonl': 'jsonl'
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (SUPPORTED_EXTENSIONS[ext]) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Supported: ${Object.keys(SUPPORTED_EXTENSIONS).join(', ')}`));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get document type from file extension
 */
function getDocumentType(filename: string): DocumentType {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS[ext] || 'text';
}

/**
 * Process uploaded document asynchronously
 */
async function processDocument(
  job: UploadJob,
  filePath: string,
  filename: string,
  collectionName: string,
  memory: UnifiedMemory,
  collectionManager: CollectionManager
): Promise<void> {
  const startTime = Date.now();
  console.log(`[UPLOAD] Starting processing for job ${job.jobId}: ${filename} -> ${collectionName}`);

  try {
    // Stage 1: Parsing
    job.status = 'processing';
    job.stage = 'parsing';
    job.progress = 10;
    console.log(`[UPLOAD] ${job.jobId}: Stage 1 - Parsing file`);

    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`[UPLOAD] ${job.jobId}: Read ${content.length} bytes from file`);

    const docType = getDocumentType(filename);
    const parsed = parseDocument(content, docType);
    console.log(`[UPLOAD] ${job.jobId}: Parsed as ${docType}, title: ${parsed.metadata.title || 'untitled'}`);

    // Stage 2: Chunking
    job.stage = 'chunking';
    job.progress = 30;
    console.log(`[UPLOAD] ${job.jobId}: Stage 2 - Chunking content`);

    // Split content into chunks (simple paragraph-based chunking)
    const chunks = splitIntoChunks(parsed.text, 1000); // ~1000 chars per chunk
    console.log(`[UPLOAD] ${job.jobId}: Created ${chunks.length} chunks`);

    // Stage 3: Embedding
    job.stage = 'embedding';
    job.progress = 50;
    console.log(`[UPLOAD] ${job.jobId}: Stage 3 - Generating embeddings`);

    // Ensure collection exists
    const collection = collectionManager.getCollection(collectionName);
    if (!collection) {
      // Create collection if it doesn't exist
      console.log(`[UPLOAD] ${job.jobId}: Creating collection "${collectionName}"`);
      collectionManager.createCollection({
        name: collectionName,
        dimension: 384,
        metric: 'cosine'
      });
    }

    // Stage 4: Inserting
    job.stage = 'inserting';
    job.progress = 70;
    console.log(`[UPLOAD] ${job.jobId}: Stage 4 - Inserting into vector store`);

    const documents: Document[] = chunks.map((chunk, index) => ({
      id: `${job.jobId}-chunk-${index}`,
      title: parsed.metadata.title || filename,
      text: chunk,
      source: filename,
      category: collectionName,
      tags: parsed.metadata.tags,
      metadata: {
        chunkIndex: index,
        totalChunks: chunks.length,
        uploadJobId: job.jobId,
        originalFilename: filename,
        ...parsed.metadata
      }
    }));

    // Add documents to memory (this generates embeddings and stores them)
    await memory.addDocuments(documents);
    console.log(`[UPLOAD] ${job.jobId}: Added ${documents.length} documents to memory`);

    // Update collection document count
    collectionManager.incrementDocumentCount(collectionName, 1);
    collectionManager.incrementVectorCount(collectionName, chunks.length);

    job.vectorsAdded = chunks.length;

    // Stage 5: Learning (simulate GNN learning)
    job.stage = 'learning';
    job.progress = 90;
    console.log(`[UPLOAD] ${job.jobId}: Stage 5 - Triggering learning`);

    // Trigger learning tick if cognitive engine is enabled
    memory.tick();

    // Complete
    job.status = 'complete';
    job.progress = 100;
    job.completedAt = new Date().toISOString();

    const duration = Date.now() - startTime;
    console.log(`[UPLOAD] ${job.jobId}: Complete! Processed ${chunks.length} vectors in ${duration}ms`);

    // Cleanup temp file
    await fs.unlink(filePath).catch(() => {});

  } catch (error) {
    job.status = 'error';
    job.error = error instanceof Error ? error.message : 'Unknown processing error';
    job.completedAt = new Date().toISOString();

    const duration = Date.now() - startTime;
    console.error(`[UPLOAD] ${job.jobId}: ERROR after ${duration}ms:`, error);

    // Cleanup temp file on error
    await fs.unlink(filePath).catch(() => {});
  }
}

/**
 * Split text into chunks
 */
function splitIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }

    currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If no chunks were created (single paragraph or no splits), return the whole text
  if (chunks.length === 0 && text.trim()) {
    chunks.push(text.trim());
  }

  return chunks;
}

// ============================================================================
// Router Factory
// ============================================================================

/**
 * Create documents router
 *
 * @param memory - UnifiedMemory instance
 * @param collectionManager - CollectionManager instance
 * @returns Express router
 */
export function createDocumentsRouter(
  memory: UnifiedMemory,
  collectionManager: CollectionManager
): Router {
  const router = Router();

  /**
   * POST /documents/upload
   * Upload a document for processing
   *
   * Request: multipart/form-data with 'file' and 'collection' fields
   * Response: UploadJob with initial status
   */
  router.post('/upload', (req: Request, res: Response, next: NextFunction) => {
    // Wrap multer middleware to catch file filter errors
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new APIException(413, 'FILE_TOO_LARGE', `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`));
          } else {
            return next(new APIException(400, 'UPLOAD_ERROR', err.message));
          }
        } else if (err instanceof Error && err.message.includes('Unsupported file type')) {
          return next(new APIException(400, 'UPLOAD_ERROR', err.message));
        }
        return next(err);
      }

      // Process the upload
      try {
        if (!req.file) {
          throw new APIException(400, 'MISSING_FILE', 'No file uploaded. Use form field "file"');
        }

        const collection = req.body.collection as string;
        if (!collection) {
          // Cleanup uploaded file
          fs.unlink(req.file.path).catch(() => {});

          // Get available collections to suggest to user
          const availableCollections = collectionManager.listCollections().map(c => c.name);
          const errorMessage = availableCollections.length > 0
            ? `Collection name is required in form field "collection". Available collections: ${availableCollections.join(', ')}`
            : 'Collection name is required in form field "collection". No collections exist yet - specify a name to create one.';

          throw new APIException(400, 'MISSING_FIELD', errorMessage);
        }

        // Create job
        const jobId = `job-${randomUUID().slice(0, 8)}`;
        const job: UploadJob = {
          jobId,
          status: 'queued',
          stage: 'parsing',
          progress: 0,
          vectorsAdded: 0,
          createdAt: new Date().toISOString()
        };

        uploadJobs.set(jobId, job);
        console.log(`[UPLOAD] Created job ${jobId} for file: ${req.file.originalname}, collection: ${collection}`);

        // Start async processing (don't await) - with error handler to prevent silent failures
        processDocument(
          job,
          req.file.path,
          req.file.originalname,
          collection,
          memory,
          collectionManager
        ).catch(err => {
          // This catches any unhandled errors in processDocument
          console.error(`[UPLOAD] Unhandled error in job ${jobId}:`, err);
          job.status = 'error';
          job.error = err instanceof Error ? err.message : 'Unknown processing error';
          job.completedAt = new Date().toISOString();
        });

        // Return immediately with job info
        res.status(202).json(job);
      } catch (err) {
        next(err);
      }
    });
  });

  /**
   * GET /documents/upload/:jobId/status
   * Get upload job status
   */
  router.get('/upload/:jobId/status', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const job = uploadJobs.get(jobId);

      if (!job) {
        throw new APIException(404, 'NOT_FOUND', `Job '${jobId}' not found`);
      }

      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /documents/jobs
   * List all upload jobs (for debugging/admin)
   */
  router.get('/jobs', (req: Request, res: Response) => {
    const jobs = Array.from(uploadJobs.values());
    res.json({
      total: jobs.length,
      jobs: jobs.slice(-50) // Return last 50 jobs
    });
  });

  /**
   * DELETE /documents/jobs/:jobId
   * Delete a completed/failed job from tracking
   */
  router.delete('/jobs/:jobId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const job = uploadJobs.get(jobId);

      if (!job) {
        throw new APIException(404, 'NOT_FOUND', `Job '${jobId}' not found`);
      }

      if (job.status === 'processing' || job.status === 'queued') {
        throw new APIException(400, 'JOB_IN_PROGRESS', 'Cannot delete job while processing');
      }

      uploadJobs.delete(jobId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
