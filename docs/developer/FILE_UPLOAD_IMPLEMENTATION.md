# File Upload Implementation Guide for Ranger HTTP API

## 1. File Upload with Progress Tracking (Hono + Node.js Streams)

### Architecture

```typescript
// src/api/middleware/multipart.ts - Streaming multipart handler

import { Hono } from 'hono';
import { createReadStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

interface UploadProgress {
  totalSize: number;
  uploadedSize: number;
  percentage: number;
  fileName: string;
  uploadId: string;
}

interface UploadedFile {
  uploadId: string;
  fileName: string;
  mimeType: string;
  size: number;
  tempPath: string;
  uploadedAt: Date;
}

// In-memory progress tracker (replace with Redis in production)
const uploadProgress = new Map<string, UploadProgress>();

export async function handleFileUpload(
  request: Request,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedFile> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 500 * 1024 * 1024) { // 500 MB limit
    throw new Error('File too large');
  }

  const uploadId = randomBytes(16).toString('hex');
  const fileName = getFileName(request);

  const tempPath = `${tmpdir()}/ranger-upload-${uploadId}`;
  const writeStream = createWriteStream(tempPath);

  let uploadedSize = 0;

  // Wrap request body for progress tracking
  const progressStream = new TransformStream({
    transform(chunk: Uint8Array, controller) {
      uploadedSize += chunk.length;
      const progress: UploadProgress = {
        totalSize: contentLength,
        uploadedSize,
        percentage: Math.round((uploadedSize / contentLength) * 100),
        fileName,
        uploadId
      };

      uploadProgress.set(uploadId, progress);
      onProgress?.(progress);

      controller.enqueue(chunk);
    }
  });

  // Stream: Request → ProgressStream → FileStream
  const reader = request.body?.getReader();
  if (!reader) throw new Error('No request body');

  const writer = writeStream;
  try {
    await pipeline(
      ReadableStream.prototype.getIterator.call(
        new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
              controller.close();
            } catch (e) {
              controller.error(e);
            }
          }
        })
      ),
      progressStream,
      writer
    );
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    uploadProgress.delete(uploadId);
    throw error;
  }

  uploadProgress.delete(uploadId);

  return {
    uploadId,
    fileName,
    mimeType: request.headers.get('content-type') || 'application/octet-stream',
    size: uploadedSize,
    tempPath,
    uploadedAt: new Date()
  };
}

function getFileName(request: Request): string {
  const header = request.headers.get('content-disposition');
  if (!header) return `upload-${Date.now()}`;

  const match = header.match(/filename="?([^"]+)"?/);
  return match ? match[1] : `upload-${Date.now()}`;
}
```

### Usage in Routes

```typescript
// src/api/routes/documents.ts

import { Hono } from 'hono';
import { handleFileUpload, UploadedFile } from '../middleware/multipart.js';

const documentRoutes = new Hono();

// POST /api/documents/upload - Single file upload with progress
documentRoutes.post('/upload', async (c) => {
  try {
    const uploadedFile = await handleFileUpload(c.req.raw, (progress) => {
      // Can emit progress via WebSocket or store in cache
      console.log(`Upload progress: ${progress.percentage}%`);
    });

    // Queue document processing job
    const jobId = await queueDocumentProcessing(uploadedFile);

    return c.json({
      success: true,
      uploadId: uploadedFile.uploadId,
      fileName: uploadedFile.fileName,
      size: uploadedFile.size,
      jobId
    }, 202); // 202 Accepted - async processing
  } catch (error) {
    return c.json({
      error: 'upload_failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 400);
  }
});

// GET /api/documents/upload/:uploadId/progress - Check upload progress
documentRoutes.get('/upload/:uploadId/progress', (c) => {
  const uploadId = c.req.param('uploadId');
  const progress = uploadProgress.get(uploadId);

  if (!progress) {
    return c.json({
      error: 'not_found',
      message: 'Upload not found or completed'
    }, 404);
  }

  return c.json(progress);
});
```

## 2. Async Job Queue Implementation

### Job Queue Architecture with Bull/Bee-Queue

```typescript
// src/api/jobs/queue.ts

import Queue from 'bee-queue';
import { UnifiedMemory } from '../memory/index.js';
import { Document } from '../memory/types.js';
import { parseDocument, DocumentType } from '../ingestion/parser.js';
import { buildDocumentGraph } from '../ingestion/graphBuilder.js';

interface ProcessingJob {
  uploadId: string;
  fileName: string;
  tempPath: string;
  tags?: string[];
  processGraph?: boolean;
}

interface ProcessingResult {
  documentId: string;
  title: string;
  vectorEmbedded: boolean;
  graphBuilt: boolean;
  nodeCount?: number;
  edgeCount?: number;
}

// Initialize job queue
const documentQueue = new Queue('document-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null
  },
  settings: {
    retries: 3,
    retryDelay: 5000, // 5 seconds
    retryBackoff: true,
    maxConcurrency: 4, // Process 4 documents in parallel
    timeoutMs: 300000 // 5 minute timeout
  }
});

// Process documents asynchronously
documentQueue.process(
  async (job: { data: ProcessingJob }) => {
    const { uploadId, fileName, tempPath, tags = [], processGraph = true } = job.data;
    const memory = getUnifiedMemory();

    try {
      // Parse document based on file type
      const extension = getFileExtension(fileName);
      const docType = getDocumentType(extension);

      const fileContent = await readFile(tempPath);
      const parsed = parseDocument(fileContent, docType);

      // Create document object
      const doc: Document = {
        id: `doc-${uploadId}`,
        title: parsed.title || fileName,
        text: parsed.text,
        source: fileName,
        category: extension.slice(1).toUpperCase(),
        tags,
        metadata: {
          uploadId,
          uploadedAt: new Date(),
          fileSize: fileContent.length
        }
      };

      // Add to vector store
      const docId = await memory.addDocument(doc);

      let nodeCount = 0;
      let edgeCount = 0;

      // Build knowledge graph if requested
      if (processGraph && parsed.sections && parsed.sections.length > 0) {
        const graphResult = buildDocumentGraph(
          docId,
          parsed.sections,
          parsed.entities || []
        );

        // Add nodes and edges to graph store
        for (const node of graphResult.nodes) {
          memory.graphStore.addNode(node);
          nodeCount++;
        }
        for (const edge of graphResult.edges) {
          memory.addRelationship({
            from: edge.from,
            to: edge.to,
            type: edge.type,
            properties: edge.properties
          });
          edgeCount++;
        }
      }

      return {
        documentId: docId,
        title: doc.title,
        vectorEmbedded: true,
        graphBuilt: processGraph,
        nodeCount,
        edgeCount
      } as ProcessingResult;
    } catch (error) {
      throw new Error(
        `Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Cleanup temp file
      await fs.unlink(tempPath).catch(() => {});
    }
  }
);

// Event handlers
documentQueue.on('succeeded', (job, result) => {
  console.log(`Job ${job.id} succeeded:`, result);
});

documentQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error.message);
});

documentQueue.on('retrying', (job, error) => {
  console.warn(`Job ${job.id} retrying:`, error.message);
});

export async function queueDocumentProcessing(
  uploadedFile: UploadedFile,
  options?: { tags?: string[]; processGraph?: boolean }
): Promise<string> {
  const job = await documentQueue.createJob({
    uploadId: uploadedFile.uploadId,
    fileName: uploadedFile.fileName,
    tempPath: uploadedFile.tempPath,
    tags: options?.tags,
    processGraph: options?.processGraph ?? true
  }).save();

  return job.id;
}

export function getJobQueue() {
  return documentQueue;
}
```

### Job Status Polling

```typescript
// src/api/routes/jobs.ts

import { Hono } from 'hono';
import { getJobQueue } from '../jobs/queue.js';

const jobRoutes = new Hono();

// GET /api/jobs/:jobId - Get job status
jobRoutes.get('/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const queue = getJobQueue();

  try {
    const job = await queue.getJob(jobId);

    if (!job) {
      return c.json({
        error: 'not_found',
        message: 'Job not found'
      }, 404);
    }

    const progress = job.progress();
    const state = await job.getState();

    return c.json({
      jobId: job.id,
      state, // 'created' | 'queued' | 'active' | 'succeeded' | 'failed'
      progress,
      startedOn: job.startedOn,
      completedOn: job.completedOn,
      failedReason: job.failedReason,
      result: state === 'succeeded' ? job.result() : null
    });
  } catch (error) {
    return c.json({
      error: 'job_error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// POST /api/jobs/:jobId/retry - Retry failed job
jobRoutes.post('/:jobId/retry', async (c) => {
  const jobId = c.req.param('jobId');
  const queue = getJobQueue();

  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      return c.json({ error: 'not_found' }, 404);
    }

    await job.retry();
    return c.json({ success: true, message: 'Job queued for retry' });
  } catch (error) {
    return c.json({
      error: 'retry_failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default jobRoutes;
```

## 3. Fallback: In-Memory Queue (Without Redis)

For development/testing without Redis:

```typescript
// src/api/jobs/queue-memory.ts - Fallback implementation

interface JobState {
  id: string;
  data: ProcessingJob;
  state: 'queued' | 'active' | 'succeeded' | 'failed';
  progress: number;
  result?: ProcessingResult;
  error?: Error;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

class InMemoryQueue {
  private jobs = new Map<string, JobState>();
  private processing = new Map<string, AbortController>();
  private maxConcurrency = 2;

  async createJob(data: ProcessingJob): Promise<{ id: string }> {
    const id = randomUUID();
    this.jobs.set(id, {
      id,
      data,
      state: 'queued',
      progress: 0,
      createdAt: new Date()
    });

    this.processNext();
    return { id };
  }

  async getJob(id: string) {
    return this.jobs.get(id);
  }

  private async processNext() {
    if (this.processing.size >= this.maxConcurrency) return;

    const queue = Array.from(this.jobs.values())
      .filter(j => j.state === 'queued')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (queue.length === 0) return;

    const job = queue[0];
    const abortController = new AbortController();
    this.processing.set(job.id, abortController);

    try {
      job.state = 'active';
      job.startedAt = new Date();

      // Process job...
      job.result = await this.processJob(job.data, abortController.signal);
      job.state = 'succeeded';
    } catch (error) {
      job.error = error as Error;
      job.state = 'failed';
    } finally {
      job.completedAt = new Date();
      this.processing.delete(job.id);
      this.processNext();
    }
  }

  private async processJob(data: ProcessingJob, signal: AbortSignal) {
    // Implementation similar to Bull version
  }
}
```

## 4. Redis Configuration (Production)

```env
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0

# Queue settings
JOB_TIMEOUT_MS=300000
JOB_MAX_RETRIES=3
JOB_CONCURRENCY=4
```

## Key Design Decisions

1. **Streaming Upload**: Use Node.js streams for memory efficiency
   - Avoid loading entire file into memory
   - Progress tracking via TransformStream
   - Cleanup temp files on failure

2. **Async Processing**: Use job queue for document ingestion
   - Non-blocking API responses (202 Accepted)
   - Retry mechanism for failures
   - Configurable concurrency

3. **Storage Tiers**:
   - Redis for production (persistent, cluster-aware)
   - In-memory for development (simple, no external deps)
   - SQLite fallback if needed

4. **Error Handling**:
   - 400 Bad Request: Invalid input
   - 413 Payload Too Large: File exceeds size limit
   - 202 Accepted: Job queued successfully
   - 500 Server Error: Processing failure
