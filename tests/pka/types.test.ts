/**
 * PKA-STRAT Type Validation Tests
 *
 * Tests for type definitions and validation functions in the PKA module.
 * Covers PyramidEntity, AlignmentScore, DriftAlert, and related types.
 */

import { describe, it, expect } from 'vitest';
import {
  PYRAMID_WEIGHTS,
  type PyramidLevel,
  type PyramidEntity,
  type AlignmentScore,
  type AlignmentFactor,
  type DriftAlert,
  type DocumentType,
  type PyramidFilter,
  type PaginatedResult,
  type Organization,
  type Team,
  type StoryExtraction,
  type ProvenanceChain
} from '../../src/pka/types.js';

/**
 * Helper to create a valid PyramidEntity for testing
 */
function createTestEntity(overrides: Partial<PyramidEntity> = {}): PyramidEntity {
  return {
    id: 'test-entity-123',
    organizationId: 'org-456',
    level: 'objective' as PyramidLevel,
    name: 'Test Objective',
    description: 'This is a test objective for unit testing',
    parentId: 'parent-789',
    documentIds: ['doc-1', 'doc-2'],
    alignmentScore: 0.85,
    metadata: { priority: 'high' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    ...overrides
  };
}

describe('PKA Types', () => {

  describe('PyramidLevel', () => {
    it('should include all 8 pyramid levels', () => {
      const validLevels: PyramidLevel[] = [
        'mission',
        'vision',
        'objective',
        'goal',
        'portfolio',
        'program',
        'project',
        'task'
      ];

      // Verify each level is valid
      validLevels.forEach(level => {
        expect(typeof level).toBe('string');
        expect(level.length).toBeGreaterThan(0);
      });

      expect(validLevels).toHaveLength(8);
    });

    it('should maintain hierarchical order (mission highest, task lowest)', () => {
      const levels: PyramidLevel[] = [
        'mission',
        'vision',
        'objective',
        'goal',
        'portfolio',
        'program',
        'project',
        'task'
      ];

      // Verify weights are in descending order
      for (let i = 0; i < levels.length - 1; i++) {
        const currentWeight = PYRAMID_WEIGHTS[levels[i]!];
        const nextWeight = PYRAMID_WEIGHTS[levels[i + 1]!];
        expect(currentWeight).toBeGreaterThanOrEqual(nextWeight);
      }
    });
  });

  describe('PYRAMID_WEIGHTS', () => {
    it('should define weights for all pyramid levels', () => {
      expect(PYRAMID_WEIGHTS).toHaveProperty('mission');
      expect(PYRAMID_WEIGHTS).toHaveProperty('vision');
      expect(PYRAMID_WEIGHTS).toHaveProperty('objective');
      expect(PYRAMID_WEIGHTS).toHaveProperty('goal');
      expect(PYRAMID_WEIGHTS).toHaveProperty('portfolio');
      expect(PYRAMID_WEIGHTS).toHaveProperty('program');
      expect(PYRAMID_WEIGHTS).toHaveProperty('project');
      expect(PYRAMID_WEIGHTS).toHaveProperty('task');
    });

    it('should have mission weight as 1.0 (highest)', () => {
      expect(PYRAMID_WEIGHTS.mission).toBe(1.0);
    });

    it('should have task weight as lowest', () => {
      expect(PYRAMID_WEIGHTS.task).toBe(0.35);
      expect(PYRAMID_WEIGHTS.task).toBeLessThan(PYRAMID_WEIGHTS.project);
    });

    it('should have all weights between 0 and 1', () => {
      Object.values(PYRAMID_WEIGHTS).forEach(weight => {
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('PyramidEntity', () => {
    it('should have required fields', () => {
      const entity = createTestEntity();

      expect(entity).toHaveProperty('id');
      expect(entity).toHaveProperty('organizationId');
      expect(entity).toHaveProperty('level');
      expect(entity).toHaveProperty('name');
      expect(entity).toHaveProperty('description');
      expect(entity).toHaveProperty('parentId');
      expect(entity).toHaveProperty('documentIds');
      expect(entity).toHaveProperty('alignmentScore');
      expect(entity).toHaveProperty('createdAt');
      expect(entity).toHaveProperty('updatedAt');
    });

    it('should support null parentId for mission-level entities', () => {
      const missionEntity = createTestEntity({
        level: 'mission',
        parentId: null
      });

      expect(missionEntity.parentId).toBeNull();
      expect(missionEntity.level).toBe('mission');
    });

    it('should support optional metadata field', () => {
      const entityWithMetadata = createTestEntity({
        metadata: { key: 'value', nested: { data: 123 } }
      });

      expect(entityWithMetadata.metadata).toBeDefined();
      expect(entityWithMetadata.metadata?.key).toBe('value');

      const entityWithoutMetadata = createTestEntity();
      delete entityWithoutMetadata.metadata;
      expect(entityWithoutMetadata.metadata).toBeUndefined();
    });

    it('should have documentIds as an array', () => {
      const entity = createTestEntity({
        documentIds: ['doc-1', 'doc-2', 'doc-3']
      });

      expect(Array.isArray(entity.documentIds)).toBe(true);
      expect(entity.documentIds).toHaveLength(3);
    });

    it('should have alignmentScore between 0 and 1', () => {
      const entity = createTestEntity({ alignmentScore: 0.75 });
      expect(entity.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(entity.alignmentScore).toBeLessThanOrEqual(1);
    });

    it('should have valid ISO timestamps for createdAt and updatedAt', () => {
      const entity = createTestEntity();

      // Verify timestamps are valid ISO 8601 format
      const createdDate = new Date(entity.createdAt);
      const updatedDate = new Date(entity.updatedAt);

      expect(createdDate instanceof Date).toBe(true);
      expect(updatedDate instanceof Date).toBe(true);
      expect(isNaN(createdDate.getTime())).toBe(false);
      expect(isNaN(updatedDate.getTime())).toBe(false);

      // Verify format matches ISO string pattern
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(entity.createdAt).toMatch(isoPattern);
      expect(entity.updatedAt).toMatch(isoPattern);
    });
  });

  describe('AlignmentFactor', () => {
    it('should have required factor properties', () => {
      const factor: AlignmentFactor = {
        name: 'Semantic Similarity',
        weight: 0.5,
        score: 0.8,
        reason: 'High semantic overlap with parent objective'
      };

      expect(factor.name).toBe('Semantic Similarity');
      expect(factor.weight).toBe(0.5);
      expect(factor.score).toBe(0.8);
      expect(factor.reason).toContain('semantic');
    });

    it('should have weight and score between 0 and 1', () => {
      const factor: AlignmentFactor = {
        name: 'Test Factor',
        weight: 0.3,
        score: 0.9,
        reason: 'Test reason'
      };

      expect(factor.weight).toBeGreaterThanOrEqual(0);
      expect(factor.weight).toBeLessThanOrEqual(1);
      expect(factor.score).toBeGreaterThanOrEqual(0);
      expect(factor.score).toBeLessThanOrEqual(1);
    });
  });

  describe('AlignmentScore', () => {
    it('should have required score properties', () => {
      const score: AlignmentScore = {
        entityId: 'entity-123',
        score: 0.82,
        vectorDistance: 0.15,
        graphConnectivity: 0.9,
        driftIndicator: 0.05,
        confidence: 0.95,
        lastCalculated: '2025-01-01T12:00:00Z'
      };

      expect(score.entityId).toBe('entity-123');
      expect(score.score).toBe(0.82);
      expect(score.vectorDistance).toBe(0.15);
      expect(score.graphConnectivity).toBe(0.9);
      expect(score.driftIndicator).toBe(0.05);
      expect(score.confidence).toBe(0.95);
    });

    it('should have valid lastCalculated timestamp', () => {
      const score: AlignmentScore = {
        entityId: 'entity-123',
        score: 0.8,
        vectorDistance: 0.2,
        graphConnectivity: 0.85,
        driftIndicator: 0.1,
        confidence: 0.9,
        lastCalculated: new Date().toISOString()
      };

      const date = new Date(score.lastCalculated);
      expect(date.toISOString()).toBe(score.lastCalculated);
    });
  });

  describe('DriftAlert', () => {
    it('should have required alert properties', () => {
      const alert: DriftAlert = {
        id: 'alert-123',
        entityId: 'entity-456',
        severity: 'high',
        driftScore: 0.45,
        message: 'Significant drift detected from strategic objectives',
        suggestedAction: 'Review and realign with parent goal',
        detectedAt: '2025-01-01T10:00:00Z',
        acknowledged: false
      };

      expect(alert.id).toBe('alert-123');
      expect(alert.entityId).toBe('entity-456');
      expect(alert.severity).toBe('high');
      expect(alert.driftScore).toBe(0.45);
      expect(alert.acknowledged).toBe(false);
    });

    it('should support all severity levels', () => {
      const severities: DriftAlert['severity'][] = ['low', 'medium', 'high', 'critical'];

      severities.forEach(severity => {
        const alert: DriftAlert = {
          id: 'alert-1',
          entityId: 'entity-1',
          severity,
          driftScore: 0.5,
          message: 'Test message',
          suggestedAction: 'Test action',
          detectedAt: new Date().toISOString(),
          acknowledged: false
        };

        expect(alert.severity).toBe(severity);
      });
    });

    it('should allow acknowledgement of alerts', () => {
      const alert: DriftAlert = {
        id: 'alert-123',
        entityId: 'entity-456',
        severity: 'medium',
        driftScore: 0.3,
        message: 'Minor drift detected',
        suggestedAction: 'Monitor for changes',
        detectedAt: '2025-01-01T10:00:00Z',
        acknowledged: true
      };

      expect(alert.acknowledged).toBe(true);
    });
  });

  describe('DocumentType', () => {
    it('should include all document types', () => {
      const types: DocumentType[] = [
        'mission_statement',
        'vision_document',
        'strategic_plan',
        'okr_framework',
        'project_plan',
        'research_report',
        'product_spec',
        'org_chart',
        'other'
      ];

      expect(types).toHaveLength(9);
      types.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('PyramidFilter', () => {
    it('should support filtering by organizationId', () => {
      const filter: PyramidFilter = {
        organizationId: 'org-123'
      };

      expect(filter.organizationId).toBe('org-123');
    });

    it('should support filtering by multiple levels', () => {
      const filter: PyramidFilter = {
        levels: ['objective', 'goal', 'project']
      };

      expect(filter.levels).toHaveLength(3);
      expect(filter.levels).toContain('objective');
    });

    it('should support filtering by parent', () => {
      const filter: PyramidFilter = {
        parentId: 'parent-123'
      };

      expect(filter.parentId).toBe('parent-123');
    });

    it('should support alignment score range filtering', () => {
      const filter: PyramidFilter = {
        minAlignmentScore: 0.6,
        maxAlignmentScore: 0.9
      };

      expect(filter.minAlignmentScore).toBe(0.6);
      expect(filter.maxAlignmentScore).toBe(0.9);
    });

    it('should support combining multiple filters', () => {
      const filter: PyramidFilter = {
        organizationId: 'org-123',
        levels: ['project', 'task'],
        minAlignmentScore: 0.5,
        maxAlignmentScore: 1.0
      };

      expect(filter.organizationId).toBe('org-123');
      expect(filter.levels).toContain('project');
      expect(filter.minAlignmentScore).toBe(0.5);
    });
  });

  describe('PaginatedResult', () => {
    it('should provide pagination metadata', () => {
      const result: PaginatedResult<PyramidEntity> = {
        items: [createTestEntity()],
        total: 100,
        page: 1,
        pageSize: 10,
        hasMore: true
      };

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should indicate no more pages when at end', () => {
      const result: PaginatedResult<PyramidEntity> = {
        items: [createTestEntity()],
        total: 5,
        page: 1,
        pageSize: 10,
        hasMore: false
      };

      expect(result.hasMore).toBe(false);
    });

    it('should work with generic types', () => {
      const alertResult: PaginatedResult<DriftAlert> = {
        items: [{
          id: 'alert-1',
          entityId: 'entity-1',
          severity: 'low',
          driftScore: 0.1,
          message: 'Test',
          suggestedAction: 'None',
          detectedAt: new Date().toISOString(),
          acknowledged: false
        }],
        total: 1,
        page: 1,
        pageSize: 10,
        hasMore: false
      };

      expect(alertResult.items[0]?.severity).toBe('low');
    });
  });

  describe('Organization', () => {
    it('should have required organization properties', () => {
      const org: Organization = {
        id: 'org-123',
        name: 'Test Organization',
        missionId: 'mission-456',
        createdAt: '2025-01-01T00:00:00Z'
      };

      expect(org.id).toBe('org-123');
      expect(org.name).toBe('Test Organization');
      expect(org.missionId).toBe('mission-456');
      expect(org.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Team', () => {
    it('should have required team properties', () => {
      const team: Team = {
        id: 'team-123',
        organizationId: 'org-456',
        name: 'Engineering Team',
        managerId: 'user-789',
        memberIds: ['user-1', 'user-2', 'user-3'],
        projectIds: ['proj-1', 'proj-2'],
        alignmentScore: 0.88,
        createdAt: '2025-01-01T00:00:00Z'
      };

      expect(team.id).toBe('team-123');
      expect(team.memberIds).toHaveLength(3);
      expect(team.projectIds).toHaveLength(2);
      expect(team.alignmentScore).toBe(0.88);
    });
  });

  describe('ProvenanceChain', () => {
    it('should track document source and path', () => {
      const chain: ProvenanceChain = {
        documentSource: 'strategy-doc-2025.pdf',
        chunkIds: ['chunk-1', 'chunk-2', 'chunk-3'],
        pathToMission: [
          createTestEntity({ level: 'task', name: 'My Task' }),
          createTestEntity({ level: 'project', name: 'Parent Project' }),
          createTestEntity({ level: 'goal', name: 'Strategic Goal' }),
          createTestEntity({ level: 'mission', name: 'Company Mission', parentId: null })
        ],
        confidenceScores: [0.95, 0.88, 0.82, 1.0]
      };

      expect(chain.documentSource).toBe('strategy-doc-2025.pdf');
      expect(chain.chunkIds).toHaveLength(3);
      expect(chain.pathToMission).toHaveLength(4);
      expect(chain.confidenceScores).toHaveLength(4);
      expect(chain.pathToMission[0]?.level).toBe('task');
      expect(chain.pathToMission[3]?.level).toBe('mission');
    });
  });

  describe('StoryExtraction', () => {
    it('should have required extraction properties', () => {
      const story: StoryExtraction = {
        id: 'story-123',
        documentId: 'doc-456',
        entityId: 'entity-789',
        narrative: 'This task directly supports our mission by...',
        strategicConnection: 'Aligned with Q1 objective to increase customer satisfaction',
        provenance: {
          documentSource: 'quarterly-review.pdf',
          chunkIds: ['chunk-1'],
          pathToMission: [createTestEntity()],
          confidenceScores: [0.9]
        },
        extractedAt: '2025-01-01T12:00:00Z'
      };

      expect(story.id).toBe('story-123');
      expect(story.narrative).toContain('mission');
      expect(story.strategicConnection).toContain('objective');
      expect(story.provenance.documentSource).toBe('quarterly-review.pdf');
    });
  });
});
