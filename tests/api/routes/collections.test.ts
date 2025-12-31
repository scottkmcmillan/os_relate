import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { createCollectionsRouter } from '../../../src/api/routes/collections.js';
import { CollectionManager, createCollectionManager } from '../../../src/memory/collections.js';
import { UnifiedMemory } from '../../../src/memory/index.js';
import { errorHandler } from '../../../src/api/middleware/error.js';

/**
 * Collections API Route Tests
 *
 * Tests for collection management endpoints:
 * - GET /collections - List all collections
 * - GET /collections/names - List collection names only
 * - POST /collections - Create a new collection
 * - GET /collections/:name - Get specific collection
 * - DELETE /collections/:name - Delete a collection
 */
describe('Collections API Routes', () => {
  let app: Express;
  let collectionManager: CollectionManager;
  let testDataDir: string;
  let memory: UnifiedMemory;

  beforeAll(async () => {
    // Create unique temp directory for this test suite
    const tmpDir = os.tmpdir();
    testDataDir = path.join(tmpDir, `rkm-collections-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDataDir, { recursive: true });

    // Initialize memory and collection manager with unique paths
    memory = new UnifiedMemory({
      vectorConfig: { storagePath: path.join(testDataDir, 'vectors.db') },
      graphDataDir: testDataDir,
      enableCognitive: false
    });
    collectionManager = createCollectionManager(testDataDir, memory.getGraphStore());

    // Set up Express app with collections router
    app = express();
    app.use(express.json());
    app.use('/collections', createCollectionsRouter(collectionManager));
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
  // GET /collections - List All Collections
  // =========================================================================

  describe('GET /collections', () => {
    it('should return empty array when no collections exist', async () => {
      const response = await request(app)
        .get('/collections')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should list all collections with full details', async () => {
      // Create a test collection
      collectionManager.createCollection({
        name: 'test-collection-1',
        dimension: 384,
        metric: 'cosine'
      });

      const response = await request(app)
        .get('/collections')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const collection = response.body[0];
      expect(collection).toHaveProperty('name');
      expect(collection).toHaveProperty('dimension');
      expect(collection).toHaveProperty('metric');
      expect(collection).toHaveProperty('vectorCount');
      expect(collection).toHaveProperty('documentCount');
      expect(collection).toHaveProperty('createdAt');
      expect(collection).toHaveProperty('lastUpdated');
      expect(collection).toHaveProperty('stats');
      expect(collection.stats).toHaveProperty('avgSearchTime');
      expect(collection.stats).toHaveProperty('queriesPerDay');
      expect(collection.stats).toHaveProperty('gnnImprovement');
    });
  });

  // =========================================================================
  // GET /collections/names - List Collection Names Only
  // =========================================================================

  describe('GET /collections/names', () => {
    it('should return collection names array', async () => {
      // Create a couple more test collections
      collectionManager.createCollection({
        name: 'test-collection-2',
        dimension: 384,
        metric: 'cosine'
      });

      const response = await request(app)
        .get('/collections/names')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('names');
      expect(Array.isArray(response.body.names)).toBe(true);
      expect(response.body.names.length).toBeGreaterThan(0);
      expect(response.body.names).toContain('test-collection-1');
      expect(response.body.names).toContain('test-collection-2');
    });

    it('should return lightweight response (names only)', async () => {
      const response = await request(app)
        .get('/collections/names')
        .expect(200);

      // Response should only have 'names' property
      expect(Object.keys(response.body)).toEqual(['names']);
      // Each name should be a string
      response.body.names.forEach((name: unknown) => {
        expect(typeof name).toBe('string');
      });
    });
  });

  // =========================================================================
  // POST /collections - Create Collection
  // =========================================================================

  describe('POST /collections', () => {
    it('should create a new collection with valid data', async () => {
      const newCollection = {
        name: 'new-test-collection',
        dimension: 384,
        metric: 'cosine'
      };

      const response = await request(app)
        .post('/collections')
        .send(newCollection)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('name', 'new-test-collection');
      expect(response.body).toHaveProperty('dimension', 384);
      expect(response.body).toHaveProperty('metric', 'cosine');
      expect(response.body).toHaveProperty('vectorCount', 0);
      expect(response.body).toHaveProperty('documentCount', 0);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should create collection with default values when optional fields omitted', async () => {
      const response = await request(app)
        .post('/collections')
        .send({ name: 'minimal-collection' })
        .expect(201);

      expect(response.body).toHaveProperty('name', 'minimal-collection');
      expect(response.body).toHaveProperty('dimension', 384); // Default
      expect(response.body).toHaveProperty('metric', 'cosine'); // Default
    });

    it('should return 400 when collection name is missing', async () => {
      const response = await request(app)
        .post('/collections')
        .send({ dimension: 384 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELD');
      expect(response.body.error).toContain('Collection name is required');
    });

    it('should return 409 when collection already exists', async () => {
      const duplicate = {
        name: 'new-test-collection', // Already created in earlier test
        dimension: 384,
        metric: 'cosine'
      };

      const response = await request(app)
        .post('/collections')
        .send(duplicate)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'COLLECTION_EXISTS');
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 for invalid collection name', async () => {
      const invalidName = {
        name: 'invalid name with spaces!@#',
        dimension: 384,
        metric: 'cosine'
      };

      const response = await request(app)
        .post('/collections')
        .send(invalidName)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'INVALID_NAME');
    });
  });

  // =========================================================================
  // GET /collections/:name - Get Specific Collection
  // =========================================================================

  describe('GET /collections/:name', () => {
    it('should get collection details by name', async () => {
      const response = await request(app)
        .get('/collections/new-test-collection')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'new-test-collection');
      expect(response.body).toHaveProperty('dimension');
      expect(response.body).toHaveProperty('metric');
      expect(response.body).toHaveProperty('stats');
    });

    it('should return 404 for non-existent collection', async () => {
      const response = await request(app)
        .get('/collections/does-not-exist')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toContain('not found');
    });
  });

  // =========================================================================
  // DELETE /collections/:name - Delete Collection
  // =========================================================================

  describe('DELETE /collections/:name', () => {
    it('should delete existing collection', async () => {
      // Create a collection to delete
      collectionManager.createCollection({
        name: 'to-be-deleted',
        dimension: 384,
        metric: 'cosine'
      });

      await request(app)
        .delete('/collections/to-be-deleted')
        .expect(204);

      // Verify it's gone
      const response = await request(app)
        .get('/collections/to-be-deleted')
        .expect(404);

      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 404 when deleting non-existent collection', async () => {
      const response = await request(app)
        .delete('/collections/never-existed')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // =========================================================================
  // GET /collections/:name/stats - Get Collection Stats
  // =========================================================================

  describe('GET /collections/:name/stats', () => {
    it('should get collection statistics', async () => {
      const response = await request(app)
        .get('/collections/new-test-collection/stats')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('avgSearchTime');
      expect(response.body).toHaveProperty('queriesPerDay');
      expect(response.body).toHaveProperty('gnnImprovement');
      expect(typeof response.body.avgSearchTime).toBe('number');
      expect(typeof response.body.queriesPerDay).toBe('number');
      expect(typeof response.body.gnnImprovement).toBe('number');
    });

    it('should return 404 for stats of non-existent collection', async () => {
      const response = await request(app)
        .get('/collections/nonexistent/stats')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // =========================================================================
  // Integration Tests - Collection Selection for Uploads
  // =========================================================================

  describe('Collection Selection Integration', () => {
    it('should provide collection names for upload UI dropdown', async () => {
      const response = await request(app)
        .get('/collections/names')
        .expect(200);

      expect(response.body).toHaveProperty('names');
      expect(Array.isArray(response.body.names)).toBe(true);

      // Verify names are strings (suitable for dropdown options)
      response.body.names.forEach((name: unknown) => {
        expect(typeof name).toBe('string');
        expect(name).toBeTruthy();
      });
    });

    it('should allow creating collection during upload flow', async () => {
      // Simulate pre-upload collection creation
      const newUploadCollection = {
        name: 'user-uploads',
        dimension: 384,
        metric: 'cosine'
      };

      const createResponse = await request(app)
        .post('/collections')
        .send(newUploadCollection)
        .expect(201);

      expect(createResponse.body).toHaveProperty('name', 'user-uploads');

      // Verify it appears in names list
      const namesResponse = await request(app)
        .get('/collections/names')
        .expect(200);

      expect(namesResponse.body.names).toContain('user-uploads');
    });
  });
});
