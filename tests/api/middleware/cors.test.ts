import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { createCorsMiddleware } from '../../../src/api/middleware/cors.js';
import { createDocumentsRouter } from '../../../src/api/routes/documents.js';
import { UnifiedMemory } from '../../../src/memory/index.js';
import { CollectionManager, createCollectionManager } from '../../../src/memory/collections.js';
import { errorHandler } from '../../../src/api/middleware/error.js';

/**
 * CORS Middleware Tests for File Uploads
 *
 * Tests CORS configuration specifically for drag-and-drop file uploads:
 * - Preflight OPTIONS requests
 * - Required headers for multipart/form-data
 * - Cross-origin upload scenarios
 */
describe('CORS Middleware for File Uploads', () => {
  let app: Express;
  let memory: UnifiedMemory;
  let collectionManager: CollectionManager;
  let testDataDir: string;

  beforeAll(async () => {
    // Create unique temp directory for this test suite
    const tmpDir = os.tmpdir();
    testDataDir = path.join(tmpDir, `rkm-cors-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDataDir, { recursive: true });

    // Initialize memory and collection manager
    memory = new UnifiedMemory({
      vectorConfig: { storagePath: path.join(testDataDir, 'vectors.db') },
      graphDataDir: testDataDir,
      enableCognitive: false
    });
    collectionManager = createCollectionManager(testDataDir, memory.getGraphStore());

    // Set up Express app with CORS middleware BEFORE routes
    app = express();
    app.use(createCorsMiddleware());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/documents', createDocumentsRouter(memory, collectionManager));
    app.use(errorHandler);
  });

  afterAll(async () => {
    if (memory) {
      await memory.close();
    }
    if (testDataDir) {
      await fs.rm(testDataDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  // =========================================================================
  // CORS Preflight Tests - Critical for Drag-and-Drop
  // =========================================================================

  describe('CORS Preflight (OPTIONS) Requests', () => {
    it('should accept OPTIONS preflight for upload endpoint', async () => {
      const response = await request(app)
        .options('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should allow X-Requested-With header in preflight (required for drag-drop)', async () => {
      const response = await request(app)
        .options('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type, x-requested-with')
        .expect(200);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders.toLowerCase()).toContain('x-requested-with');
    });

    it('should allow Accept header in preflight', async () => {
      const response = await request(app)
        .options('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type, accept')
        .expect(200);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders.toLowerCase()).toContain('accept');
    });

    it('should allow Authorization header in preflight', async () => {
      const response = await request(app)
        .options('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type, authorization')
        .expect(200);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders.toLowerCase()).toContain('authorization');
    });

    it('should include PATCH in allowed methods', async () => {
      const response = await request(app)
        .options('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'PATCH')
        .expect(200);

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toBeDefined();
      expect(allowedMethods).toContain('PATCH');
    });

    it('should set max-age for preflight caching', async () => {
      const response = await request(app)
        .options('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .expect(200);

      expect(response.headers['access-control-max-age']).toBeDefined();
      expect(parseInt(response.headers['access-control-max-age'])).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Cross-Origin Upload Tests
  // =========================================================================

  describe('Cross-Origin File Upload', () => {
    it('should include CORS headers on successful upload response', async () => {
      const buffer = Buffer.from('# Test CORS Upload\n\nThis tests cross-origin uploads.');

      const response = await request(app)
        .post('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .field('collection', 'cors-test')
        .attach('file', buffer, 'cors-test.md')
        .expect(202);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.body).toHaveProperty('jobId');
    });

    it('should include CORS headers on error responses', async () => {
      const response = await request(app)
        .post('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .field('collection', 'test')
        // No file attached - will trigger error
        .expect(400);

      // CORS headers should still be present on error responses
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.body).toHaveProperty('code', 'MISSING_FILE');
    });

    it('should work with credentials mode', async () => {
      const buffer = Buffer.from('Test content');

      const response = await request(app)
        .post('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', 'session=test123')
        .field('collection', 'creds-test')
        .attach('file', buffer, 'creds-test.txt');

      // Should not reject due to credentials
      expect([200, 202]).toContain(response.status);
    });
  });

  // =========================================================================
  // Exposed Headers Tests
  // =========================================================================

  describe('Exposed Response Headers', () => {
    it('should expose Content-Length header', async () => {
      const response = await request(app)
        .options('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .expect(200);

      const exposedHeaders = response.headers['access-control-expose-headers'];
      expect(exposedHeaders).toBeDefined();
      expect(exposedHeaders.toLowerCase()).toContain('content-length');
    });
  });

  // =========================================================================
  // Integration: Simulated Drag-and-Drop Upload
  // =========================================================================

  describe('Simulated Drag-and-Drop Upload Flow', () => {
    it('should complete full preflight + upload flow', async () => {
      // Step 1: Preflight request (browser does this automatically for drag-drop)
      const preflightResponse = await request(app)
        .options('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type, x-requested-with, accept')
        .expect(200);

      expect(preflightResponse.headers['access-control-allow-methods']).toContain('POST');

      // Step 2: Actual upload (simulating dropped file)
      const fileContent = '# Drag and Drop Test\n\nThis file was "dropped" via drag and drop.';
      const buffer = Buffer.from(fileContent);

      const uploadResponse = await request(app)
        .post('/documents/upload')
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest') // Common header from drag-drop libraries
        .set('Accept', 'application/json')
        .field('collection', 'drag-drop-test')
        .attach('file', buffer, 'dropped-file.md')
        .expect(202);

      expect(uploadResponse.body).toHaveProperty('jobId');
      expect(['queued', 'processing']).toContain(uploadResponse.body.status);

      // Step 3: Poll for status (frontend would do this)
      const jobId = uploadResponse.body.jobId;

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusResponse = await request(app)
        .get(`/documents/upload/${jobId}/status`)
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(statusResponse.headers['access-control-allow-origin']).toBeDefined();
      expect(statusResponse.body.jobId).toBe(jobId);
    });
  });
});
