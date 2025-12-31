import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { createDocumentsRouter } from '../../../src/api/routes/documents.js';
import { UnifiedMemory } from '../../../src/memory/index.js';
import { CollectionManager, createCollectionManager } from '../../../src/memory/collections.js';
import { errorHandler } from '../../../src/api/middleware/error.js';

/**
 * Document Upload API Route Tests
 *
 * Tests for document ingestion endpoints:
 * - POST /documents/upload
 * - GET /documents/upload/:jobId/status
 * - GET /documents/jobs
 * - DELETE /documents/jobs/:jobId
 */
describe('Document Upload API Routes', () => {
  let app: Express;
  let memory: UnifiedMemory;
  let collectionManager: CollectionManager;
  let testDataDir: string;

  beforeAll(async () => {
    // Create unique temp directory for this test suite
    const tmpDir = os.tmpdir();
    testDataDir = path.join(tmpDir, `rkm-documents-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDataDir, { recursive: true });

    // Initialize memory and collection manager with unique paths
    memory = new UnifiedMemory({
      vectorConfig: { storagePath: path.join(testDataDir, 'vectors.db') },
      graphDataDir: testDataDir,
      enableCognitive: false
    });
    collectionManager = createCollectionManager(testDataDir, memory.getGraphStore());

    // Set up Express app with documents router
    app = express();
    app.use(express.json());
    app.use('/documents', createDocumentsRouter(memory, collectionManager));
    // Add error handler to properly format error responses
    app.use(errorHandler);
  });

  afterAll(async () => {
    if (memory) {
      await memory.close();
    }
    // Clean up temp directory
    if (testDataDir) {
      await fs.rm(testDataDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  // =========================================================================
  // POST /documents/upload - File Upload Tests
  // =========================================================================

  describe('POST /documents/upload', () => {
    it('should upload valid markdown file and return 202 with job info', async () => {
      const markdownContent = '# Test Document\n\nThis is a test markdown file.';
      const buffer = Buffer.from(markdownContent);

      const response = await request(app)
        .post('/documents/upload')
        .field('collection', 'test-collection')
        .attach('file', buffer, 'test.md')
        .expect('Content-Type', /json/)
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      // Status can be 'queued' or 'processing' depending on timing
      expect(['queued', 'processing']).toContain(response.body.status);
      expect(response.body).toHaveProperty('stage');
      expect(response.body).toHaveProperty('progress');
      expect(response.body).toHaveProperty('vectorsAdded');
      expect(response.body.jobId).toMatch(/^job-[a-f0-9]{8}$/);
    });

    it('should upload valid text file and return 202 with job info', async () => {
      const textContent = 'This is a plain text document.\nIt has multiple lines.';
      const buffer = Buffer.from(textContent);

      const response = await request(app)
        .post('/documents/upload')
        .field('collection', 'test-collection')
        .attach('file', buffer, 'document.txt')
        .expect('Content-Type', /json/)
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      // Status can be 'queued' or 'processing' depending on timing
      expect(['queued', 'processing']).toContain(response.body.status);
      expect(response.body).toHaveProperty('stage');
      expect(response.body).toHaveProperty('progress');
      expect(response.body).toHaveProperty('vectorsAdded');
    });

    it('should upload valid JSON file and return 202 with job info', async () => {
      const jsonContent = JSON.stringify({
        title: 'Test JSON Document',
        content: 'This is test content in JSON format'
      }, null, 2);
      const buffer = Buffer.from(jsonContent);

      const response = await request(app)
        .post('/documents/upload')
        .field('collection', 'json-docs')
        .attach('file', buffer, 'data.json')
        .expect('Content-Type', /json/)
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      // Status can be 'queued' or 'processing' depending on timing
      expect(['queued', 'processing']).toContain(response.body.status);
      expect(response.body).toHaveProperty('stage');
    });

    it('should upload valid JSONL file and return 202 with job info', async () => {
      const jsonlContent = [
        '{"title": "Document 1", "text": "First document"}',
        '{"title": "Document 2", "text": "Second document"}'
      ].join('\n');
      const buffer = Buffer.from(jsonlContent);

      const response = await request(app)
        .post('/documents/upload')
        .field('collection', 'jsonl-docs')
        .attach('file', buffer, 'data.jsonl')
        .expect('Content-Type', /json/)
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      // Status can be 'queued' or 'processing' depending on timing
      expect(['queued', 'processing']).toContain(response.body.status);
    });

    it('should return 400 when file is missing', async () => {
      const response = await request(app)
        .post('/documents/upload')
        .field('collection', 'test-collection')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'MISSING_FILE');
      expect(response.body.error).toContain('No file uploaded');
    });

    it('should return 400 when collection field is missing', async () => {
      const buffer = Buffer.from('Test content');

      const response = await request(app)
        .post('/documents/upload')
        .attach('file', buffer, 'test.txt')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELD');
      expect(response.body.error).toContain('Collection name is required');
    });

    it('should return 400 for unsupported file type', async () => {
      const buffer = Buffer.from('PDF content simulation');

      const response = await request(app)
        .post('/documents/upload')
        .field('collection', 'test-collection')
        .attach('file', buffer, 'document.pdf')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'UPLOAD_ERROR');
      expect(response.body.error).toContain('Unsupported file type');
    });
  });

  // =========================================================================
  // GET /documents/upload/:jobId/status - Job Status Tests
  // =========================================================================

  describe('GET /documents/upload/:jobId/status', () => {
    it('should get job status for existing job', async () => {
      // First, create a job
      const buffer = Buffer.from('# Status Test\n\nTesting job status endpoint.');
      const uploadResponse = await request(app)
        .post('/documents/upload')
        .field('collection', 'status-test')
        .attach('file', buffer, 'status.md')
        .expect(202);

      const jobId = uploadResponse.body.jobId;

      // Get job status immediately (should still exist)
      const statusResponse = await request(app)
        .get(`/documents/upload/${jobId}/status`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(statusResponse.body).toHaveProperty('jobId', jobId);
      expect(statusResponse.body).toHaveProperty('status');
      expect(statusResponse.body).toHaveProperty('stage');
      expect(statusResponse.body).toHaveProperty('progress');
      expect(statusResponse.body).toHaveProperty('vectorsAdded');

      // Status should be one of the valid states
      expect(['queued', 'processing', 'complete', 'error']).toContain(statusResponse.body.status);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/documents/upload/job-nonexistent/status')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toContain('not found');
    });
  });

  // =========================================================================
  // GET /documents/jobs - List Jobs Tests
  // =========================================================================

  describe('GET /documents/jobs', () => {
    it('should list all upload jobs', async () => {
      // Create a couple of jobs
      const buffer1 = Buffer.from('# Job List Test 1');
      const buffer2 = Buffer.from('# Job List Test 2');

      await request(app)
        .post('/documents/upload')
        .field('collection', 'jobs-list-test')
        .attach('file', buffer1, 'doc1.md')
        .expect(202);

      await request(app)
        .post('/documents/upload')
        .field('collection', 'jobs-list-test')
        .attach('file', buffer2, 'doc2.md')
        .expect(202);

      // List jobs
      const response = await request(app)
        .get('/documents/jobs')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);
      expect(response.body.jobs.length).toBeGreaterThan(0);

      // Each job should have required properties
      const firstJob = response.body.jobs[0];
      expect(firstJob).toHaveProperty('jobId');
      expect(firstJob).toHaveProperty('status');
      expect(firstJob).toHaveProperty('stage');
      expect(firstJob).toHaveProperty('progress');
      expect(firstJob).toHaveProperty('vectorsAdded');
    });

    it('should return correct structure for jobs endpoint', async () => {
      const response = await request(app)
        .get('/documents/jobs')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });
  });

  // =========================================================================
  // DELETE /documents/jobs/:jobId - Delete Job Tests
  // =========================================================================

  describe('DELETE /documents/jobs/:jobId', () => {
    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .delete('/documents/jobs/job-doesnotexist')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toContain('not found');
    });

    it('should reject deletion of queued/processing job', async () => {
      // Create a job
      const buffer = Buffer.from('# Content for delete test');
      const uploadResponse = await request(app)
        .post('/documents/upload')
        .field('collection', 'delete-test')
        .attach('file', buffer, 'todelete.md')
        .expect(202);

      const jobId = uploadResponse.body.jobId;

      // Immediately try to delete (should be queued/processing)
      const response = await request(app)
        .delete(`/documents/jobs/${jobId}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'JOB_IN_PROGRESS');
      expect(response.body.error).toContain('Cannot delete job while processing');
    });
  });

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  describe('Error Handling', () => {
    it('should accept malformed JSON file (processing handles error)', async () => {
      const malformedJson = '{"invalid": json content without closing brace';
      const buffer = Buffer.from(malformedJson);

      const uploadResponse = await request(app)
        .post('/documents/upload')
        .field('collection', 'error-test')
        .attach('file', buffer, 'malformed.json')
        .expect(202);

      // Upload is accepted, error occurs during processing
      expect(uploadResponse.body).toHaveProperty('jobId');
      // Status can be 'queued' or 'processing' depending on timing
      expect(['queued', 'processing', 'error']).toContain(uploadResponse.body.status);
    });

    it('should accept empty file (processing handles content)', async () => {
      const buffer = Buffer.from('');

      const uploadResponse = await request(app)
        .post('/documents/upload')
        .field('collection', 'empty-test')
        .attach('file', buffer, 'empty.txt')
        .expect(202);

      // Upload is accepted
      expect(uploadResponse.body).toHaveProperty('jobId');
      // Status can be 'queued' or 'processing' depending on timing
      expect(['queued', 'processing']).toContain(uploadResponse.body.status);
    });
  });
});
