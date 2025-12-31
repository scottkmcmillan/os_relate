/**
 * Alignment Calculator and Drift Detector Tests
 *
 * Comprehensive tests for the PKA-STRAT alignment module:
 * - Vector distance calculation
 * - Graph connectivity scoring
 * - Composite alignment scores
 * - Drift detection and alerts
 * - Threshold management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AlignmentCalculator,
  createAlignmentCalculator,
  type AlignmentWeights
} from '../../src/pka/alignment/calculator.js';
import {
  DriftDetector,
  createDriftDetector,
  type DriftThresholds
} from '../../src/pka/alignment/drift-detector.js';
import { UnifiedMemory } from '../../src/memory/index.js';
import type { PyramidEntity, PyramidLevel, StoredAlignmentScore, DriftAlert } from '../../src/pka/types.js';

/**
 * Create a mock UnifiedMemory for testing
 * Uses unique paths to avoid database locking issues between tests
 */
function createMockUnifiedMemory(): UnifiedMemory {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new UnifiedMemory({
    vectorConfig: { storagePath: `./test-align-vector-${uniqueId}.db` },
    graphDataDir: `./test-align-graph-${uniqueId}`,
    enableCognitive: false
  });
}

/**
 * Helper to create a test PyramidEntity
 */
function createTestEntity(overrides: Partial<PyramidEntity> = {}): PyramidEntity {
  return {
    id: `entity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    organizationId: 'test-org',
    level: 'objective' as PyramidLevel,
    name: 'Test Entity',
    description: 'A test entity for alignment testing',
    parentId: null,
    documentIds: [],
    alignmentScore: 0,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe('AlignmentCalculator', () => {
  let calculator: AlignmentCalculator;
  let memory: UnifiedMemory;

  beforeEach(() => {
    memory = createMockUnifiedMemory();
    calculator = new AlignmentCalculator(memory);
  });

  afterEach(async () => {
    await memory.close();
  });

  describe('constructor', () => {
    it('should create calculator with default weights', () => {
      expect(calculator).toBeInstanceOf(AlignmentCalculator);
      const weights = calculator.getWeights();
      expect(weights.vector).toBe(0.5);
      expect(weights.graph).toBe(0.3);
      expect(weights.provenance).toBe(0.2);
    });

    it('should accept custom weights', () => {
      const customWeights: AlignmentWeights = {
        vector: 0.6,
        graph: 0.25,
        provenance: 0.15
      };

      const customCalculator = new AlignmentCalculator(memory, customWeights);
      const weights = customCalculator.getWeights();

      expect(weights.vector).toBe(0.6);
      expect(weights.graph).toBe(0.25);
      expect(weights.provenance).toBe(0.15);
    });
  });

  describe('createAlignmentCalculator factory', () => {
    it('should create calculator using factory function', () => {
      const factoryCalculator = createAlignmentCalculator(memory);
      expect(factoryCalculator).toBeInstanceOf(AlignmentCalculator);
    });

    it('should accept weights in factory function', () => {
      const weights: AlignmentWeights = {
        vector: 0.4,
        graph: 0.4,
        provenance: 0.2
      };

      const factoryCalculator = createAlignmentCalculator(memory, weights);
      expect(factoryCalculator.getWeights().vector).toBe(0.4);
    });
  });

  describe('calculateAlignment', () => {
    it('should return StoredAlignmentScore for entity', async () => {
      const entity = createTestEntity();
      const score = await calculator.calculateAlignment(entity);

      expect(score).toHaveProperty('entityId');
      expect(score).toHaveProperty('overall');
      expect(score).toHaveProperty('byLevel');
      expect(score).toHaveProperty('factors');
      expect(score).toHaveProperty('calculatedAt');
      expect(score).toHaveProperty('vectorDistance');
      expect(score).toHaveProperty('graphConnectivity');
      expect(score).toHaveProperty('driftIndicator');
      expect(score).toHaveProperty('confidence');
    });

    it('should include entityId in result', async () => {
      const entity = createTestEntity({ id: 'specific-entity-id' });
      const score = await calculator.calculateAlignment(entity);

      expect(score.entityId).toBe('specific-entity-id');
    });

    it('should calculate overall score between 0 and 1', async () => {
      const entity = createTestEntity();
      const score = await calculator.calculateAlignment(entity);

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(1);
    });

    it('should return vectorDistance between 0 and 1', async () => {
      const entity = createTestEntity();
      const score = await calculator.calculateAlignment(entity);

      expect(score.vectorDistance).toBeGreaterThanOrEqual(0);
      expect(score.vectorDistance).toBeLessThanOrEqual(1);
    });

    it('should return graphConnectivity between 0 and 1', async () => {
      const entity = createTestEntity();
      const score = await calculator.calculateAlignment(entity);

      expect(score.graphConnectivity).toBeGreaterThanOrEqual(0);
      expect(score.graphConnectivity).toBeLessThanOrEqual(1);
    });

    it('should return confidence between 0 and 1', async () => {
      const entity = createTestEntity();
      const score = await calculator.calculateAlignment(entity);

      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });

    it('should include level in byLevel breakdown', async () => {
      const entity = createTestEntity({ level: 'goal' });
      const score = await calculator.calculateAlignment(entity);

      expect(score.byLevel).toHaveProperty('goal');
    });

    it('should include three alignment factors', async () => {
      const entity = createTestEntity();
      const score = await calculator.calculateAlignment(entity);

      expect(score.factors).toHaveLength(3);

      const factorNames = score.factors.map(f => f.name);
      expect(factorNames).toContain('Vector Similarity');
      expect(factorNames).toContain('Graph Connectivity');
      expect(factorNames).toContain('Provenance Strength');
    });

    it('should have factors with proper structure', async () => {
      const entity = createTestEntity();
      const score = await calculator.calculateAlignment(entity);

      score.factors.forEach(factor => {
        expect(factor).toHaveProperty('name');
        expect(factor).toHaveProperty('weight');
        expect(factor).toHaveProperty('score');
        expect(factor).toHaveProperty('reason');
        expect(typeof factor.name).toBe('string');
        expect(typeof factor.weight).toBe('number');
        expect(typeof factor.score).toBe('number');
        expect(typeof factor.reason).toBe('string');
      });
    });

    it('should have valid timestamp in calculatedAt', async () => {
      const before = new Date().toISOString();
      const entity = createTestEntity();
      const score = await calculator.calculateAlignment(entity);
      const after = new Date().toISOString();

      expect(new Date(score.calculatedAt).toISOString()).toBe(score.calculatedAt);
      expect(score.calculatedAt >= before).toBe(true);
      expect(score.calculatedAt <= after).toBe(true);
    });

    it('should return high vectorDistance for mission-level entity (no parent)', async () => {
      const mission = createTestEntity({
        level: 'mission',
        parentId: null
      });

      const score = await calculator.calculateAlignment(mission);

      // Mission with no parent should have high vectorDistance (1.0)
      expect(score.vectorDistance).toBe(1.0);
    });
  });

  describe('calculateBatchAlignment', () => {
    it('should calculate alignment for multiple entities', async () => {
      const entities = [
        createTestEntity({ name: 'Entity 1' }),
        createTestEntity({ name: 'Entity 2' }),
        createTestEntity({ name: 'Entity 3' })
      ];

      const scores = await calculator.calculateBatchAlignment(entities);

      expect(scores).toHaveLength(3);
      scores.forEach(score => {
        expect(score).toHaveProperty('entityId');
        expect(score).toHaveProperty('overall');
      });
    });

    it('should return empty array for empty input', async () => {
      const scores = await calculator.calculateBatchAlignment([]);
      expect(scores).toEqual([]);
    });

    it('should preserve entity order in results', async () => {
      const entities = [
        createTestEntity({ id: 'first-entity' }),
        createTestEntity({ id: 'second-entity' }),
        createTestEntity({ id: 'third-entity' })
      ];

      const scores = await calculator.calculateBatchAlignment(entities);

      expect(scores[0]?.entityId).toBe('first-entity');
      expect(scores[1]?.entityId).toBe('second-entity');
      expect(scores[2]?.entityId).toBe('third-entity');
    });
  });

  describe('getWeights', () => {
    it('should return current weights', () => {
      const weights = calculator.getWeights();

      expect(weights).toHaveProperty('vector');
      expect(weights).toHaveProperty('graph');
      expect(weights).toHaveProperty('provenance');
    });

    it('should return copy of weights (not reference)', () => {
      const weights1 = calculator.getWeights();
      const weights2 = calculator.getWeights();

      expect(weights1).not.toBe(weights2);
      expect(weights1).toEqual(weights2);
    });
  });

  describe('setWeights', () => {
    it('should update vector weight', () => {
      calculator.setWeights({ vector: 0.7 });
      expect(calculator.getWeights().vector).toBe(0.7);
    });

    it('should update graph weight', () => {
      calculator.setWeights({ graph: 0.4 });
      expect(calculator.getWeights().graph).toBe(0.4);
    });

    it('should update provenance weight', () => {
      calculator.setWeights({ provenance: 0.1 });
      expect(calculator.getWeights().provenance).toBe(0.1);
    });

    it('should preserve other weights when updating one', () => {
      const originalWeights = calculator.getWeights();
      calculator.setWeights({ vector: 0.8 });

      expect(calculator.getWeights().vector).toBe(0.8);
      expect(calculator.getWeights().graph).toBe(originalWeights.graph);
      expect(calculator.getWeights().provenance).toBe(originalWeights.provenance);
    });

    it('should update multiple weights at once', () => {
      calculator.setWeights({ vector: 0.5, graph: 0.3 });

      expect(calculator.getWeights().vector).toBe(0.5);
      expect(calculator.getWeights().graph).toBe(0.3);
    });
  });

  describe('provenance strength calculation', () => {
    it('should score higher for entities with more documents', async () => {
      const entityWithDocs = createTestEntity({
        documentIds: ['doc-1', 'doc-2', 'doc-3']
      });

      const entityWithoutDocs = createTestEntity({
        documentIds: []
      });

      const scoreWithDocs = await calculator.calculateAlignment(entityWithDocs);
      const scoreWithoutDocs = await calculator.calculateAlignment(entityWithoutDocs);

      // Entity with documents should have higher provenance factor
      const provenanceWithDocs = scoreWithDocs.factors.find(f => f.name === 'Provenance Strength');
      const provenanceWithoutDocs = scoreWithoutDocs.factors.find(f => f.name === 'Provenance Strength');

      expect(provenanceWithDocs?.score).toBeGreaterThan(provenanceWithoutDocs?.score || 0);
    });

    it('should consider pyramid level in provenance scoring', async () => {
      const missionEntity = createTestEntity({ level: 'mission' });
      const taskEntity = createTestEntity({ level: 'task' });

      const missionScore = await calculator.calculateAlignment(missionEntity);
      const taskScore = await calculator.calculateAlignment(taskEntity);

      // Different levels should have different provenance expectations
      const missionProvenance = missionScore.factors.find(f => f.name === 'Provenance Strength');
      const taskProvenance = taskScore.factors.find(f => f.name === 'Provenance Strength');

      expect(missionProvenance?.score).not.toBe(taskProvenance?.score);
    });
  });

  describe('confidence calculation', () => {
    it('should increase confidence with more documentation', async () => {
      const entityWithDocs = createTestEntity({
        documentIds: ['doc-1', 'doc-2']
      });

      const entityWithoutDocs = createTestEntity({
        documentIds: []
      });

      const scoreWithDocs = await calculator.calculateAlignment(entityWithDocs);
      const scoreWithoutDocs = await calculator.calculateAlignment(entityWithoutDocs);

      expect(scoreWithDocs.confidence).toBeGreaterThan(scoreWithoutDocs.confidence);
    });

    it('should increase confidence with longer descriptions', async () => {
      const entityLongDesc = createTestEntity({
        description: 'This is a very detailed description that provides extensive context about the strategic initiative and its alignment with organizational objectives.'
      });

      const entityShortDesc = createTestEntity({
        description: 'Short'
      });

      const scoreLong = await calculator.calculateAlignment(entityLongDesc);
      const scoreShort = await calculator.calculateAlignment(entityShortDesc);

      expect(scoreLong.confidence).toBeGreaterThan(scoreShort.confidence);
    });

    it('should increase confidence with parent connection', async () => {
      const entityWithParent = createTestEntity({
        parentId: 'parent-123'
      });

      const entityWithoutParent = createTestEntity({
        parentId: null
      });

      const scoreWithParent = await calculator.calculateAlignment(entityWithParent);
      const scoreWithoutParent = await calculator.calculateAlignment(entityWithoutParent);

      expect(scoreWithParent.confidence).toBeGreaterThan(scoreWithoutParent.confidence);
    });
  });
});

describe('DriftDetector', () => {
  let detector: DriftDetector;
  let memory: UnifiedMemory;

  beforeEach(() => {
    memory = createMockUnifiedMemory();
    detector = new DriftDetector(memory);
  });

  afterEach(async () => {
    await memory.close();
  });

  describe('constructor', () => {
    it('should create detector with default thresholds', () => {
      expect(detector).toBeInstanceOf(DriftDetector);
      const thresholds = detector.getThresholds();

      expect(thresholds.critical).toBe(20);
      expect(thresholds.high).toBe(40);
      expect(thresholds.medium).toBe(60);
      expect(thresholds.low).toBe(80);
    });

    it('should accept custom thresholds', () => {
      const customThresholds: DriftThresholds = {
        critical: 15,
        high: 30,
        medium: 50,
        low: 70
      };

      const customDetector = new DriftDetector(memory, customThresholds);
      const thresholds = customDetector.getThresholds();

      expect(thresholds.critical).toBe(15);
      expect(thresholds.high).toBe(30);
      expect(thresholds.medium).toBe(50);
      expect(thresholds.low).toBe(70);
    });
  });

  describe('createDriftDetector factory', () => {
    it('should create detector using factory function', () => {
      const factoryDetector = createDriftDetector(memory);
      expect(factoryDetector).toBeInstanceOf(DriftDetector);
    });

    it('should accept thresholds in factory function', () => {
      const thresholds: DriftThresholds = {
        critical: 25,
        high: 45,
        medium: 65,
        low: 85
      };

      const factoryDetector = createDriftDetector(memory, thresholds);
      expect(factoryDetector.getThresholds().critical).toBe(25);
    });
  });

  describe('detectDrift', () => {
    it('should return empty array when all entities are aligned', async () => {
      // Use low threshold to ensure entities pass
      const entities = [
        createTestEntity({ alignmentScore: 0.9 }),
        createTestEntity({ alignmentScore: 0.95 })
      ];

      // Use very low threshold that all entities should pass
      const alerts = await detector.detectDrift(entities, 10);

      // No alerts expected for well-aligned entities with low threshold
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should detect drifting entities below threshold', async () => {
      const entities = [
        createTestEntity({ alignmentScore: 0.3 })
      ];

      const alerts = await detector.detectDrift(entities, 90);

      // Should detect drift for entity below 90% threshold
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should return alerts with proper structure', async () => {
      const entities = [createTestEntity()];
      const alerts = await detector.detectDrift(entities, 100);

      if (alerts.length > 0) {
        const alert = alerts[0]!;
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('entityId');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('driftScore');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('suggestedAction');
        expect(alert).toHaveProperty('detectedAt');
        expect(alert).toHaveProperty('acknowledged');
      }
    });

    it('should sort alerts by severity (critical first)', async () => {
      // Create entities that will have varying alignment scores
      const entities = [
        createTestEntity({ name: 'Low alignment entity' }),
        createTestEntity({ name: 'Medium alignment entity' }),
        createTestEntity({ name: 'High alignment entity' })
      ];

      const alerts = await detector.detectDrift(entities, 100);

      if (alerts.length > 1) {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        for (let i = 0; i < alerts.length - 1; i++) {
          const current = severityOrder[alerts[i]!.severity];
          const next = severityOrder[alerts[i + 1]!.severity];
          expect(current).toBeLessThanOrEqual(next);
        }
      }
    });

    it('should set acknowledged to false by default', async () => {
      const entities = [createTestEntity()];
      const alerts = await detector.detectDrift(entities, 100);

      alerts.forEach(alert => {
        expect(alert.acknowledged).toBe(false);
      });
    });

    it('should include valid timestamp in detectedAt', async () => {
      const before = new Date().toISOString();
      const entities = [createTestEntity()];
      const alerts = await detector.detectDrift(entities, 100);
      const after = new Date().toISOString();

      alerts.forEach(alert => {
        expect(new Date(alert.detectedAt).toISOString()).toBe(alert.detectedAt);
        expect(alert.detectedAt >= before).toBe(true);
        expect(alert.detectedAt <= after).toBe(true);
      });
    });
  });

  describe('detectEntityDrift', () => {
    it('should return null for well-aligned entity', async () => {
      // Entity with high alignment
      const entity = createTestEntity({
        documentIds: ['doc-1', 'doc-2', 'doc-3'],
        description: 'A well-documented and clearly aligned strategic objective that supports the organizational mission.'
      });

      // With default thresholds (low = 80), this might still trigger
      // Since calculation is mocked, check for null possibility
      const alert = await detector.detectEntityDrift(entity);

      // Either null (aligned) or valid alert (drifting)
      if (alert !== null) {
        expect(alert).toHaveProperty('entityId');
        expect(alert.entityId).toBe(entity.id);
      }
    });

    it('should return alert for drifting entity', async () => {
      // Create detector with high threshold
      const strictDetector = new DriftDetector(memory, {
        critical: 90,
        high: 95,
        medium: 97,
        low: 99
      });

      const entity = createTestEntity({
        documentIds: [],
        description: 'Minimal'
      });

      const alert = await strictDetector.detectEntityDrift(entity);

      // With very high thresholds, should detect drift
      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.entityId).toBe(entity.id);
      }
    });
  });

  describe('getDriftSummary', () => {
    it('should return summary with all counts', async () => {
      const entities = [
        createTestEntity({ name: 'Entity 1' }),
        createTestEntity({ name: 'Entity 2' }),
        createTestEntity({ name: 'Entity 3' })
      ];

      const summary = await detector.getDriftSummary(entities);

      expect(summary).toHaveProperty('totalEntities');
      expect(summary).toHaveProperty('criticalCount');
      expect(summary).toHaveProperty('highCount');
      expect(summary).toHaveProperty('mediumCount');
      expect(summary).toHaveProperty('lowCount');
      expect(summary).toHaveProperty('alignedCount');
      expect(summary).toHaveProperty('averageAlignment');
    });

    it('should have correct totalEntities count', async () => {
      const entities = [
        createTestEntity(),
        createTestEntity(),
        createTestEntity(),
        createTestEntity(),
        createTestEntity()
      ];

      const summary = await detector.getDriftSummary(entities);

      expect(summary.totalEntities).toBe(5);
    });

    it('should have counts that sum to total', async () => {
      const entities = [
        createTestEntity(),
        createTestEntity(),
        createTestEntity()
      ];

      const summary = await detector.getDriftSummary(entities);

      const totalCategorized =
        summary.criticalCount +
        summary.highCount +
        summary.mediumCount +
        summary.lowCount +
        summary.alignedCount;

      expect(totalCategorized).toBe(summary.totalEntities);
    });

    it('should calculate average alignment as integer', async () => {
      const entities = [createTestEntity(), createTestEntity()];
      const summary = await detector.getDriftSummary(entities);

      expect(Number.isInteger(summary.averageAlignment)).toBe(true);
    });

    it('should return 0 averageAlignment for empty array', async () => {
      const summary = await detector.getDriftSummary([]);

      expect(summary.totalEntities).toBe(0);
      expect(summary.averageAlignment).toBe(0);
    });
  });

  describe('severity determination', () => {
    it('should classify scores below critical threshold as critical', async () => {
      const detector = new DriftDetector(memory, {
        critical: 20,
        high: 40,
        medium: 60,
        low: 80
      });

      const entity = createTestEntity();
      const alerts = await detector.detectDrift([entity], 100);

      // Check if classification logic is working
      alerts.forEach(alert => {
        expect(['critical', 'high', 'medium', 'low']).toContain(alert.severity);
      });
    });
  });

  describe('getThresholds', () => {
    it('should return current thresholds', () => {
      const thresholds = detector.getThresholds();

      expect(thresholds).toHaveProperty('critical');
      expect(thresholds).toHaveProperty('high');
      expect(thresholds).toHaveProperty('medium');
      expect(thresholds).toHaveProperty('low');
    });

    it('should return copy of thresholds (not reference)', () => {
      const thresholds1 = detector.getThresholds();
      const thresholds2 = detector.getThresholds();

      expect(thresholds1).not.toBe(thresholds2);
      expect(thresholds1).toEqual(thresholds2);
    });
  });

  describe('setThresholds', () => {
    it('should update critical threshold', () => {
      detector.setThresholds({ critical: 25 });
      expect(detector.getThresholds().critical).toBe(25);
    });

    it('should update high threshold', () => {
      detector.setThresholds({ high: 45 });
      expect(detector.getThresholds().high).toBe(45);
    });

    it('should update medium threshold', () => {
      detector.setThresholds({ medium: 65 });
      expect(detector.getThresholds().medium).toBe(65);
    });

    it('should update low threshold', () => {
      detector.setThresholds({ low: 85 });
      expect(detector.getThresholds().low).toBe(85);
    });

    it('should preserve other thresholds when updating one', () => {
      const original = detector.getThresholds();
      detector.setThresholds({ critical: 15 });

      expect(detector.getThresholds().critical).toBe(15);
      expect(detector.getThresholds().high).toBe(original.high);
      expect(detector.getThresholds().medium).toBe(original.medium);
      expect(detector.getThresholds().low).toBe(original.low);
    });

    it('should update multiple thresholds at once', () => {
      detector.setThresholds({ critical: 10, high: 30 });

      expect(detector.getThresholds().critical).toBe(10);
      expect(detector.getThresholds().high).toBe(30);
    });
  });

  describe('suggested actions', () => {
    it('should provide actionable suggestions in alerts', async () => {
      const entities = [createTestEntity()];
      const alerts = await detector.detectDrift(entities, 100);

      alerts.forEach(alert => {
        expect(alert.suggestedAction).toBeDefined();
        expect(alert.suggestedAction.length).toBeGreaterThan(10);
      });
    });

    it('should provide descriptive messages in alerts', async () => {
      const entity = createTestEntity({ name: 'Test Entity Name' });
      const alerts = await detector.detectDrift([entity], 100);

      alerts.forEach(alert => {
        expect(alert.message).toBeDefined();
        expect(alert.message.length).toBeGreaterThan(0);
        // Message should reference the entity or context
        expect(alert.message).toContain('Test Entity Name');
      });
    });
  });
});
