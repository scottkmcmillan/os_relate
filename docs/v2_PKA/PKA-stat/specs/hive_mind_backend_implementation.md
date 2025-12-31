# PKA-STRAT Backend Implementation - Hive Mind Orchestration Prompt

## Version: 1.0.0
## Date: 2025-12-29
## Status: Ready for Hive-Mind Execution

---

## Executive Summary

This document provides a comprehensive prompt for orchestrating a **hive-mind swarm** to implement the PKA-STRAT backend by extending the existing **Ranger** codebase. The implementation leverages Ranger's proven cognitive knowledge graph architecture (UnifiedMemory, VectorStore, GraphStore) while adding the new API endpoints, data models, and alignment scoring algorithms required for PKA-STRAT.

### Key Decisions Made
1. **Use existing Ranger codebase** as the foundation
2. **Extend (not replace)** the current backend implementation
3. **Add new routes** for PKA-STRAT-specific functionality
4. **Integrate with Supabase** for authentication (JWT validation)
5. **Build on RuVector** for vector embeddings and hypergraph relationships

---

## Hive-Mind Configuration

```yaml
swarm_config:
  topology: hierarchical
  strategy: adaptive
  max_agents: 8
  mode: queen-led

coordination:
  consensus: raft
  memory_sync: enabled
  progress_tracking: mandatory

quality_gates:
  code_review: required
  testing: comprehensive
  verification: continuous
```

---

## Agent Roles & Responsibilities

### Queen Coordinator
**Role**: Orchestrate overall implementation, manage dependencies, ensure coherence
**Capabilities**: task_assignment, progress_monitoring, conflict_resolution, quality_assurance

### Architect Agent
**Role**: Design system extensions, define interfaces, ensure architectural consistency
**Capabilities**: system_design, api_design, database_schema, integration_patterns

### Backend Developer Agents (x2)
**Role**: Implement API routes, business logic, data models
**Capabilities**: typescript, express, ruvector, postgresql, testing

### Data Engineer Agent
**Role**: Implement alignment scoring, embeddings, hypergraph operations
**Capabilities**: vector_operations, graph_algorithms, embeddings, optimization

### Test Engineer Agent
**Role**: Write and execute tests, ensure coverage, validate functionality
**Capabilities**: vitest, integration_testing, api_testing, coverage_analysis

### Documentation Agent
**Role**: Update documentation, generate API docs, maintain code comments
**Capabilities**: markdown, openapi, jsdoc, architecture_diagrams

---

## Phase 1: Foundation & Architecture (Days 1-2)

### Objective
Extend Ranger's architecture to support PKA-STRAT data models and prepare the foundation for new API endpoints.

### Tasks

#### 1.1 Create PKA-STRAT Type Definitions
**File**: `src/pka/types.ts`

```typescript
/**
 * PKA-STRAT Type Definitions
 *
 * Implements the Pyramid of Clarity data model:
 * Mission → Vision → Objectives → Goals → Portfolios → Programs → Projects → Tasks
 */

// Core entity types following Pyramid of Clarity
export type PyramidLevel =
  | 'mission'
  | 'vision'
  | 'objective'
  | 'goal'
  | 'portfolio'
  | 'program'
  | 'project'
  | 'task';

export interface PyramidEntity {
  id: string;
  organizationId: string;
  level: PyramidLevel;
  name: string;
  description: string;
  parentId: string | null;
  documentIds: string[];
  alignmentScore: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AlignmentScore {
  entityId: string;
  score: number;           // 0-100
  vectorDistance: number;  // Semantic distance to parent
  graphConnectivity: number; // Structural connectivity
  driftIndicator: number;  // Mission drift signal
  confidence: number;      // Score confidence 0-1
  lastCalculated: string;
}

export interface DriftAlert {
  id: string;
  entityId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  driftScore: number;
  message: string;
  suggestedAction: string;
  detectedAt: string;
  acknowledged: boolean;
}

export interface DocumentIngestion {
  id: string;
  filename: string;
  documentType: DocumentType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  organizationId: string;
  linkedEntityId?: string;
  extractedChunks: number;
  processingErrors: string[];
  uploadedAt: string;
  completedAt?: string;
}

export type DocumentType =
  | 'mission_statement'
  | 'vision_document'
  | 'strategic_plan'
  | 'okr_framework'
  | 'project_plan'
  | 'research_report'
  | 'product_spec'
  | 'org_chart'
  | 'other';

export interface UserRole {
  role: 'leader' | 'manager' | 'member';
  organizationId: string;
  teamId?: string;
}

export interface StoryExtraction {
  id: string;
  documentId: string;
  entityId: string;
  narrative: string;
  strategicConnection: string;
  provenance: ProvenanceChain;
  extractedAt: string;
}

export interface ProvenanceChain {
  documentSource: string;
  chunkIds: string[];
  pathToMission: PyramidEntity[];
  confidenceScores: number[];
}
```

#### 1.2 Extend Graph Store Schema
**File**: `src/memory/graphStore.ts` (extend existing)

Add new node and edge types:
```typescript
// Add to existing NodeType
export type NodeType =
  | 'Document'
  | 'Section'
  | 'Concept'
  | 'Topic'
  // PKA-STRAT additions:
  | 'Organization'
  | 'Mission'
  | 'Vision'
  | 'Objective'
  | 'Goal'
  | 'Portfolio'
  | 'Program'
  | 'Project'
  | 'Task'
  | 'Team'
  | 'User';

// Add to existing EdgeType
export type EdgeType =
  | 'CITES'
  | 'PARENT_OF'
  | 'RELATES_TO'
  | 'DERIVED_FROM'
  // PKA-STRAT additions:
  | 'ALIGNS_TO'       // Child aligns to parent in pyramid
  | 'SUPPORTS'        // Document supports entity
  | 'MEMBER_OF'       // User member of team/org
  | 'MANAGES'         // User manages entity
  | 'EXTRACTED_FROM'  // Story extracted from document
  | 'ADVANCES';       // Project advances objective
```

#### 1.3 Create PKA Memory Manager
**File**: `src/pka/memory.ts`

```typescript
/**
 * PKA Memory Manager
 *
 * Extends UnifiedMemory with PKA-STRAT specific operations:
 * - Pyramid entity management
 * - Alignment score calculation
 * - Mission drift detection
 * - Story extraction and provenance tracking
 */

import { UnifiedMemory, Document, Relationship } from '../memory/index.js';
import { PyramidEntity, AlignmentScore, DriftAlert, DocumentType } from './types.js';

export class PKAMemoryManager {
  private memory: UnifiedMemory;

  constructor(memory: UnifiedMemory) {
    this.memory = memory;
  }

  // Pyramid entity operations
  async createPyramidEntity(entity: Omit<PyramidEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<PyramidEntity>;
  async getPyramidEntity(id: string): Promise<PyramidEntity | null>;
  async updatePyramidEntity(id: string, updates: Partial<PyramidEntity>): Promise<PyramidEntity>;
  async deletePyramidEntity(id: string): Promise<boolean>;

  // Hierarchy operations
  async getChildren(entityId: string, depth?: number): Promise<PyramidEntity[]>;
  async getPathToMission(entityId: string): Promise<PyramidEntity[]>;
  async getPyramidTree(organizationId: string): Promise<PyramidEntity[]>;

  // Alignment operations
  async calculateAlignment(entityId: string): Promise<AlignmentScore>;
  async calculateBatchAlignment(entityIds: string[]): Promise<AlignmentScore[]>;
  async getAlignmentHeatmap(organizationId: string): Promise<Map<string, AlignmentScore>>;

  // Drift detection
  async detectDrift(organizationId: string, threshold?: number): Promise<DriftAlert[]>;
  async acknowledgeDriftAlert(alertId: string): Promise<void>;

  // Document linking
  async linkDocumentToEntity(documentId: string, entityId: string, type: DocumentType): Promise<void>;
  async getLinkedDocuments(entityId: string): Promise<Document[]>;

  // Story extraction
  async extractStory(documentId: string, entityId: string): Promise<StoryExtraction>;
  async getProvenance(entityId: string): Promise<ProvenanceChain>;
}
```

### Verification Checkpoints (Phase 1)

```bash
# 1. Type checking passes
npm run typecheck

# 2. New types are properly exported
grep -r "PyramidEntity" src/pka/

# 3. Graph store extension compiles
npm run build

# 4. Unit tests for new types
npm test -- src/pka/__tests__/types.test.ts
```

---

## Phase 2: Core API Routes (Days 3-5)

### Objective
Implement the core PKA-STRAT API endpoints following the existing route pattern.

### Tasks

#### 2.1 Create Pyramid Routes
**File**: `src/api/routes/pyramid.ts`

```typescript
/**
 * Pyramid of Clarity API Routes
 *
 * Endpoints for managing the strategic hierarchy:
 * - CRUD operations for pyramid entities
 * - Hierarchy navigation
 * - Tree visualization data
 */

import { Router } from 'express';
import { PKAMemoryManager } from '../../pka/memory.js';
import { PyramidLevel } from '../../pka/types.js';

export function createPyramidRouter(pkaMemory: PKAMemoryManager): Router {
  const router = Router();

  // GET /api/pyramid/:orgId - Get full pyramid tree
  router.get('/:orgId', async (req, res) => {
    const { orgId } = req.params;
    const tree = await pkaMemory.getPyramidTree(orgId);
    res.json({ success: true, data: tree });
  });

  // GET /api/pyramid/:orgId/mission - Get mission statement
  router.get('/:orgId/mission', async (req, res) => {
    // Implementation
  });

  // POST /api/pyramid/entity - Create pyramid entity
  router.post('/entity', async (req, res) => {
    const entity = req.body;
    const created = await pkaMemory.createPyramidEntity(entity);
    res.status(201).json({ success: true, data: created });
  });

  // GET /api/pyramid/entity/:id - Get single entity
  router.get('/entity/:id', async (req, res) => {
    const entity = await pkaMemory.getPyramidEntity(req.params.id);
    if (!entity) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }
    res.json({ success: true, data: entity });
  });

  // PUT /api/pyramid/entity/:id - Update entity
  router.put('/entity/:id', async (req, res) => {
    const updated = await pkaMemory.updatePyramidEntity(req.params.id, req.body);
    res.json({ success: true, data: updated });
  });

  // DELETE /api/pyramid/entity/:id - Delete entity
  router.delete('/entity/:id', async (req, res) => {
    await pkaMemory.deletePyramidEntity(req.params.id);
    res.json({ success: true, message: 'Entity deleted' });
  });

  // GET /api/pyramid/entity/:id/children - Get children
  router.get('/entity/:id/children', async (req, res) => {
    const depth = parseInt(req.query.depth as string) || 1;
    const children = await pkaMemory.getChildren(req.params.id, depth);
    res.json({ success: true, data: children });
  });

  // GET /api/pyramid/entity/:id/path - Get path to mission
  router.get('/entity/:id/path', async (req, res) => {
    const path = await pkaMemory.getPathToMission(req.params.id);
    res.json({ success: true, data: path });
  });

  // GET /api/pyramid/explorer - Interactive pyramid explorer data
  router.get('/explorer', async (req, res) => {
    const { orgId } = req.query;
    // Return formatted data for pyramid visualization
  });

  return router;
}
```

#### 2.2 Create Alignment Routes
**File**: `src/api/routes/alignment.ts`

```typescript
/**
 * Strategic Alignment API Routes
 *
 * Endpoints for:
 * - Alignment score calculation
 * - Alignment heatmap generation
 * - Strategic distance metrics
 */

import { Router } from 'express';
import { PKAMemoryManager } from '../../pka/memory.js';

export function createAlignmentRouter(pkaMemory: PKAMemoryManager): Router {
  const router = Router();

  // GET /api/alignment/summary - Overall alignment summary
  router.get('/summary', async (req, res) => {
    const { orgId } = req.query;
    // Calculate organization-wide alignment metrics
  });

  // GET /api/alignment/heatmap - Alignment heatmap data
  router.get('/heatmap', async (req, res) => {
    const { orgId } = req.query;
    const heatmap = await pkaMemory.getAlignmentHeatmap(orgId as string);
    res.json({ success: true, data: Object.fromEntries(heatmap) });
  });

  // GET /api/alignment/entity/:id - Single entity alignment
  router.get('/entity/:id', async (req, res) => {
    const score = await pkaMemory.calculateAlignment(req.params.id);
    res.json({ success: true, data: score });
  });

  // POST /api/alignment/calculate - Batch calculate alignments
  router.post('/calculate', async (req, res) => {
    const { entityIds } = req.body;
    const scores = await pkaMemory.calculateBatchAlignment(entityIds);
    res.json({ success: true, data: scores });
  });

  // GET /api/alignment/strategic-distance - Distance from mission
  router.get('/strategic-distance', async (req, res) => {
    const { entityId, targetId } = req.query;
    // Calculate semantic + structural distance
  });

  return router;
}
```

#### 2.3 Create Drift Detection Routes
**File**: `src/api/routes/drift.ts`

```typescript
/**
 * Mission Drift Detection API Routes
 *
 * Endpoints for:
 * - Real-time drift monitoring
 * - Drift alerts management
 * - Strategic integrity warnings
 */

import { Router } from 'express';
import { PKAMemoryManager } from '../../pka/memory.js';

export function createDriftRouter(pkaMemory: PKAMemoryManager): Router {
  const router = Router();

  // GET /api/drift/alerts - Get all drift alerts
  router.get('/alerts', async (req, res) => {
    const { orgId, severity, acknowledged } = req.query;
    const alerts = await pkaMemory.detectDrift(
      orgId as string,
      parseFloat(req.query.threshold as string) || 0.3
    );
    res.json({ success: true, data: alerts });
  });

  // GET /api/drift/alerts/:id - Get single alert
  router.get('/alerts/:id', async (req, res) => {
    // Implementation
  });

  // PUT /api/drift/alerts/:id/acknowledge - Acknowledge alert
  router.put('/alerts/:id/acknowledge', async (req, res) => {
    await pkaMemory.acknowledgeDriftAlert(req.params.id);
    res.json({ success: true, message: 'Alert acknowledged' });
  });

  // GET /api/drift/monitor - Real-time drift metrics
  router.get('/monitor', async (req, res) => {
    const { orgId } = req.query;
    // Return real-time drift indicators
  });

  // GET /api/drift/trends - Historical drift trends
  router.get('/trends', async (req, res) => {
    const { orgId, period } = req.query;
    // Return drift trends over time
  });

  return router;
}
```

#### 2.4 Create Team Routes
**File**: `src/api/routes/teams.ts`

```typescript
/**
 * Team Management API Routes
 *
 * Endpoints for:
 * - Team CRUD operations
 * - Team alignment metrics
 * - Team member management
 */

import { Router } from 'express';
import { PKAMemoryManager } from '../../pka/memory.js';

export function createTeamsRouter(pkaMemory: PKAMemoryManager): Router {
  const router = Router();

  // GET /api/teams - List teams
  router.get('/', async (req, res) => {
    const { orgId } = req.query;
    // List teams for organization
  });

  // GET /api/teams/:id - Get team details
  router.get('/:id', async (req, res) => {
    // Implementation
  });

  // GET /api/teams/:id/alignment - Team alignment metrics
  router.get('/:id/alignment', async (req, res) => {
    // Calculate team-level alignment
  });

  // GET /api/teams/:id/projects - Team's projects
  router.get('/:id/projects', async (req, res) => {
    // List projects assigned to team
  });

  // GET /api/teams/:id/members - Team members
  router.get('/:id/members', async (req, res) => {
    // List team members
  });

  return router;
}
```

#### 2.5 Create Reports Routes
**File**: `src/api/routes/reports.ts`

```typescript
/**
 * Reports API Routes
 *
 * Endpoints for:
 * - Board-level narratives
 * - Progress reports
 * - Strategic analysis reports
 */

import { Router } from 'express';
import { PKAMemoryManager } from '../../pka/memory.js';

export function createReportsRouter(pkaMemory: PKAMemoryManager): Router {
  const router = Router();

  // GET /api/reports/board-narrative - Generate board report
  router.get('/board-narrative', async (req, res) => {
    const { orgId, period } = req.query;
    // Generate narrative with mathematical alignment proof
  });

  // GET /api/reports/progress - Progress-to-strategy report
  router.get('/progress', async (req, res) => {
    const { orgId, teamId } = req.query;
    // Generate progress report with strategic context
  });

  // GET /api/reports/impact - Impact analysis
  router.get('/impact', async (req, res) => {
    const { entityId } = req.query;
    // Calculate contribution impact
  });

  // GET /api/reports/duplicate-work - Duplicate work analysis
  router.get('/duplicate-work', async (req, res) => {
    const { orgId } = req.query;
    // Detect redundant efforts
  });

  // POST /api/reports/generate - Custom report generation
  router.post('/generate', async (req, res) => {
    const { type, parameters } = req.body;
    // Generate custom report
  });

  return router;
}
```

#### 2.6 Extend Documents Routes
**File**: `src/api/routes/documents.ts` (extend existing)

Add PKA-STRAT specific endpoints:
```typescript
// Add to existing documents router:

// POST /api/documents/:id/link - Link document to pyramid entity
router.post('/:id/link', async (req, res) => {
  const { entityId, documentType } = req.body;
  await pkaMemory.linkDocumentToEntity(req.params.id, entityId, documentType);
  res.json({ success: true, message: 'Document linked' });
});

// GET /api/documents/:id/provenance - Get document provenance
router.get('/:id/provenance', async (req, res) => {
  // Return provenance chain
});

// POST /api/documents/:id/extract-story - Extract strategic story
router.post('/:id/extract-story', async (req, res) => {
  const { entityId } = req.body;
  const story = await pkaMemory.extractStory(req.params.id, entityId);
  res.json({ success: true, data: story });
});
```

### Verification Checkpoints (Phase 2)

```bash
# 1. All routes compile
npm run build

# 2. Route registration check
curl http://localhost:3000/api/pyramid/test-org
curl http://localhost:3000/api/alignment/summary?orgId=test-org
curl http://localhost:3000/api/drift/alerts?orgId=test-org

# 3. Integration tests pass
npm test -- src/api/routes/__tests__/pyramid.test.ts
npm test -- src/api/routes/__tests__/alignment.test.ts
npm test -- src/api/routes/__tests__/drift.test.ts

# 4. API response format validation
npm run test:api
```

---

## Phase 3: Strategic Resonance Engine (Days 6-8)

### Objective
Implement the core alignment scoring and drift detection algorithms using RuVector and the graph store.

### Tasks

#### 3.1 Implement Alignment Calculator
**File**: `src/pka/alignment/calculator.ts`

```typescript
/**
 * Strategic Alignment Calculator
 *
 * Calculates alignment scores using:
 * 1. Vector similarity (semantic alignment)
 * 2. Graph connectivity (structural alignment)
 * 3. Provenance chain strength (documentation support)
 *
 * Formula: Score = α * VectorSim + β * GraphConn + γ * Provenance
 * Where α + β + γ = 1
 */

import { UnifiedMemory } from '../../memory/index.js';
import { PyramidEntity, AlignmentScore } from '../types.js';
import { embedOne } from '../../embedding.js';

export class AlignmentCalculator {
  private memory: UnifiedMemory;
  private weights: { vector: number; graph: number; provenance: number };

  constructor(memory: UnifiedMemory, weights?: { vector: number; graph: number; provenance: number }) {
    this.memory = memory;
    this.weights = weights || { vector: 0.5, graph: 0.3, provenance: 0.2 };
  }

  /**
   * Calculate alignment score for a single entity
   */
  async calculateAlignment(entity: PyramidEntity): Promise<AlignmentScore> {
    // 1. Get parent entity for comparison
    const parent = entity.parentId
      ? await this.getParentEntity(entity.parentId)
      : null;

    // 2. Calculate vector similarity to parent/mission
    const vectorDistance = await this.calculateVectorDistance(entity, parent);

    // 3. Calculate graph connectivity
    const graphConnectivity = this.calculateGraphConnectivity(entity);

    // 4. Calculate provenance strength
    const provenanceStrength = await this.calculateProvenanceStrength(entity);

    // 5. Calculate drift indicator
    const driftIndicator = this.calculateDriftIndicator(vectorDistance, graphConnectivity);

    // 6. Combine scores
    const score = this.combineScores(vectorDistance, graphConnectivity, provenanceStrength);

    // 7. Calculate confidence
    const confidence = this.calculateConfidence(entity);

    return {
      entityId: entity.id,
      score: Math.round(score * 100),
      vectorDistance,
      graphConnectivity,
      driftIndicator,
      confidence,
      lastCalculated: new Date().toISOString()
    };
  }

  /**
   * Calculate semantic distance using vector embeddings
   */
  private async calculateVectorDistance(entity: PyramidEntity, parent: PyramidEntity | null): Promise<number> {
    // Generate embedding for entity description
    const entityEmbedding = await embedOne(entity.description, 384);

    // Get target embedding (parent or mission)
    const targetText = parent?.description || entity.description;
    const targetEmbedding = await embedOne(targetText, 384);

    // Calculate cosine similarity
    const similarity = this.cosineSimilarity(entityEmbedding, targetEmbedding);

    return similarity;
  }

  /**
   * Calculate structural connectivity in the graph
   */
  private calculateGraphConnectivity(entity: PyramidEntity): number {
    // Use graph store to find relationships
    const related = this.memory.findRelated(entity.id, 2);

    // Score based on:
    // - Number of supporting documents
    // - Connections to other entities
    // - Path strength to mission

    const documentConnections = related.filter(r =>
      r.path.some(e => e.type === 'SUPPORTS')
    ).length;

    const entityConnections = related.filter(r =>
      r.path.some(e => e.type === 'ALIGNS_TO' || e.type === 'ADVANCES')
    ).length;

    // Normalize to 0-1
    return Math.min((documentConnections + entityConnections) / 10, 1);
  }

  /**
   * Calculate strength of provenance chain to mission
   */
  private async calculateProvenanceStrength(entity: PyramidEntity): Promise<number> {
    // Get path to mission
    const pathToMission = await this.getPathToMission(entity.id);

    if (pathToMission.length === 0) return 0;

    // Score based on:
    // - Path length (shorter = better)
    // - Each node's alignment score
    // - Document support at each level

    const maxPathLength = 8; // Mission to Task
    const pathScore = Math.max(0, 1 - (pathToMission.length / maxPathLength));

    return pathScore;
  }

  /**
   * Calculate drift indicator (negative = drifting)
   */
  private calculateDriftIndicator(vectorDistance: number, graphConnectivity: number): number {
    // Drift = semantic misalignment + structural isolation
    const semanticDrift = 1 - vectorDistance;
    const structuralDrift = 1 - graphConnectivity;

    // Combined drift indicator (-1 to 1, negative = drifting)
    return 1 - (semanticDrift * 0.6 + structuralDrift * 0.4);
  }

  /**
   * Combine all scores into final alignment score
   */
  private combineScores(vector: number, graph: number, provenance: number): number {
    return (
      vector * this.weights.vector +
      graph * this.weights.graph +
      provenance * this.weights.provenance
    );
  }

  /**
   * Calculate confidence in the alignment score
   */
  private calculateConfidence(entity: PyramidEntity): number {
    // Confidence based on:
    // - Amount of data available
    // - Age of last calculation
    // - Consistency of scores

    const hasDocuments = entity.documentIds.length > 0;
    const hasDescription = entity.description.length > 50;
    const hasParent = entity.parentId !== null;

    let confidence = 0.5; // Base confidence
    if (hasDocuments) confidence += 0.2;
    if (hasDescription) confidence += 0.15;
    if (hasParent) confidence += 0.15;

    return Math.min(confidence, 1);
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async getParentEntity(parentId: string): Promise<PyramidEntity | null> {
    // Implementation
    return null;
  }

  private async getPathToMission(entityId: string): Promise<PyramidEntity[]> {
    // Implementation
    return [];
  }
}
```

#### 3.2 Implement Drift Detector
**File**: `src/pka/alignment/drift-detector.ts`

```typescript
/**
 * Mission Drift Detector
 *
 * Monitors entities for strategic drift using:
 * 1. Semantic distance changes over time
 * 2. Graph isolation indicators
 * 3. Activity patterns
 */

import { UnifiedMemory } from '../../memory/index.js';
import { PyramidEntity, DriftAlert } from '../types.js';
import { AlignmentCalculator } from './calculator.js';

export class DriftDetector {
  private memory: UnifiedMemory;
  private calculator: AlignmentCalculator;
  private thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  constructor(memory: UnifiedMemory) {
    this.memory = memory;
    this.calculator = new AlignmentCalculator(memory);
    this.thresholds = {
      low: 0.7,      // Alignment < 70%
      medium: 0.5,   // Alignment < 50%
      high: 0.3,     // Alignment < 30%
      critical: 0.1  // Alignment < 10%
    };
  }

  /**
   * Detect drift across all entities in an organization
   */
  async detectDrift(organizationId: string, minThreshold: number = 0.5): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];

    // Get all entities for organization
    const entities = await this.getOrganizationEntities(organizationId);

    for (const entity of entities) {
      // Calculate current alignment
      const alignment = await this.calculator.calculateAlignment(entity);

      // Check if drifting
      if (alignment.driftIndicator < minThreshold) {
        const severity = this.determineSeverity(alignment.score / 100);

        alerts.push({
          id: `drift-${entity.id}-${Date.now()}`,
          entityId: entity.id,
          severity,
          driftScore: alignment.driftIndicator,
          message: this.generateDriftMessage(entity, alignment),
          suggestedAction: this.suggestAction(entity, alignment),
          detectedAt: new Date().toISOString(),
          acknowledged: false
        });
      }
    }

    // Sort by severity
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Determine alert severity based on alignment score
   */
  private determineSeverity(score: number): DriftAlert['severity'] {
    if (score < this.thresholds.critical) return 'critical';
    if (score < this.thresholds.high) return 'high';
    if (score < this.thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Generate human-readable drift message
   */
  private generateDriftMessage(entity: PyramidEntity, alignment: AlignmentScore): string {
    const scorePercent = Math.round(alignment.score);
    return `${entity.name} (${entity.level}) has alignment score of ${scorePercent}%, ` +
           `indicating potential strategic drift from organizational mission.`;
  }

  /**
   * Suggest corrective action
   */
  private suggestAction(entity: PyramidEntity, alignment: AlignmentScore): string {
    if (alignment.vectorDistance < 0.5) {
      return 'Review and update description to better align with parent objectives.';
    }
    if (alignment.graphConnectivity < 0.3) {
      return 'Add supporting documents or link to related strategic initiatives.';
    }
    return 'Schedule alignment review with stakeholders.';
  }

  private async getOrganizationEntities(organizationId: string): Promise<PyramidEntity[]> {
    // Implementation
    return [];
  }
}
```

#### 3.3 Implement Hypergraph Manager
**File**: `src/pka/alignment/hypergraph.ts`

```typescript
/**
 * Strategic Hypergraph Manager
 *
 * Manages multi-entity relationships using RuVector's hypergraph capabilities.
 * Enables queries like: "What connects Product Feature X to Q3 Revenue Goal to Sustainability Mission?"
 */

import { UnifiedMemory } from '../../memory/index.js';

export interface HyperedgeQuery {
  entities: string[];           // Entity IDs to connect
  relationTypes?: string[];     // Optional filter by relation type
  maxHops?: number;             // Maximum traversal depth
}

export interface HyperedgeResult {
  path: string[];               // Ordered list of entity IDs
  relationships: string[];      // Relationships between entities
  strength: number;             // Connection strength 0-1
  provenance: string[];         // Supporting document IDs
}

export class HypergraphManager {
  private memory: UnifiedMemory;

  constructor(memory: UnifiedMemory) {
    this.memory = memory;
  }

  /**
   * Find connections between multiple entities
   */
  async queryHyperedge(query: HyperedgeQuery): Promise<HyperedgeResult[]> {
    // Implementation using graph store
    const results: HyperedgeResult[] = [];

    // For each pair of entities, find paths
    for (let i = 0; i < query.entities.length - 1; i++) {
      const from = query.entities[i];
      const to = query.entities[i + 1];

      // Use graph traversal to find path
      const related = this.memory.findRelated(from, query.maxHops || 3);

      // Filter to find paths leading to target
      const matchingPaths = related.filter(r =>
        r.node.properties?.id === to ||
        r.path.some(e => e.to === to)
      );

      // Convert to results
      for (const match of matchingPaths) {
        results.push({
          path: [from, ...match.path.map(e => e.to)],
          relationships: match.path.map(e => e.type),
          strength: this.calculatePathStrength(match.path),
          provenance: this.extractProvenance(match.path)
        });
      }
    }

    return results;
  }

  /**
   * Calculate strategic distance between entities
   */
  async calculateStrategicDistance(entityA: string, entityB: string): Promise<number> {
    const results = await this.queryHyperedge({
      entities: [entityA, entityB],
      maxHops: 10
    });

    if (results.length === 0) return 1; // Maximum distance (no connection)

    // Return inverse of strongest path strength
    const maxStrength = Math.max(...results.map(r => r.strength));
    return 1 - maxStrength;
  }

  private calculatePathStrength(path: any[]): number {
    // Strength decreases with path length
    const lengthPenalty = Math.max(0, 1 - (path.length * 0.1));

    // Average relationship strength
    const relationStrength = 0.8; // TODO: Calculate from actual relationships

    return lengthPenalty * relationStrength;
  }

  private extractProvenance(path: any[]): string[] {
    // Extract document IDs from path
    return path
      .filter(e => e.type === 'SUPPORTS' || e.type === 'EXTRACTED_FROM')
      .map(e => e.from);
  }
}
```

### Verification Checkpoints (Phase 3)

```bash
# 1. Alignment calculation tests
npm test -- src/pka/alignment/__tests__/calculator.test.ts

# 2. Drift detection tests
npm test -- src/pka/alignment/__tests__/drift-detector.test.ts

# 3. Hypergraph query tests
npm test -- src/pka/alignment/__tests__/hypergraph.test.ts

# 4. Integration test - full alignment flow
npm test -- src/pka/__tests__/integration.test.ts

# 5. Performance benchmarks
npm run benchmark:alignment
```

---

## Phase 4: Authentication & Authorization (Days 9-10)

### Objective
Integrate Supabase JWT validation and implement role-based access control.

### Tasks

#### 4.1 Create Auth Middleware
**File**: `src/api/middleware/auth.ts`

```typescript
/**
 * Authentication Middleware
 *
 * Validates Supabase JWTs and extracts user information.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'leader' | 'manager' | 'member';
    organizationId: string;
  };
}

export function createAuthMiddleware(supabaseJwtSecret: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, supabaseJwtSecret) as any;

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.user_metadata?.role || 'member',
        organizationId: decoded.user_metadata?.organization_id
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  };
}

/**
 * Role-based access control middleware
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Organization access control
 */
export function requireOrgAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const requestedOrgId = req.params.orgId || req.query.orgId;

  if (requestedOrgId && requestedOrgId !== req.user?.organizationId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this organization'
    });
  }

  next();
}
```

#### 4.2 Apply Auth to Routes
**File**: `src/api/routes/index.ts` (update)

```typescript
// Add auth middleware to PKA routes
import { createAuthMiddleware, requireRole, requireOrgAccess } from '../middleware/auth.js';

export function createApiRouter(memory: UnifiedMemory, collectionManager: CollectionManager): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(process.env.SUPABASE_JWT_SECRET!);

  // Public routes (existing Ranger functionality)
  router.use('/collections', searchRouter);
  router.use('/collections', collectionsRouter);

  // Protected PKA routes
  router.use('/pyramid', authMiddleware, requireOrgAccess, pyramidRouter);
  router.use('/alignment', authMiddleware, requireOrgAccess, alignmentRouter);
  router.use('/drift', authMiddleware, requireRole('leader', 'manager'), driftRouter);
  router.use('/teams', authMiddleware, teamsRouter);
  router.use('/reports', authMiddleware, reportsRouter);

  // ...
}
```

### Verification Checkpoints (Phase 4)

```bash
# 1. Auth middleware tests
npm test -- src/api/middleware/__tests__/auth.test.ts

# 2. Protected route tests
npm test -- src/api/routes/__tests__/auth-integration.test.ts

# 3. Manual JWT validation test
curl -H "Authorization: Bearer <valid_jwt>" http://localhost:3000/api/pyramid/test-org

# 4. Role-based access tests
npm test -- src/api/__tests__/rbac.test.ts
```

---

## Phase 5: Testing & Verification (Days 11-12)

### Objective
Comprehensive testing of all new functionality with high coverage.

### Tasks

#### 5.1 Unit Tests
**File**: `tests/pka/types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { PyramidEntity, AlignmentScore } from '../../src/pka/types.js';

describe('PKA Types', () => {
  describe('PyramidEntity', () => {
    it('should have all required fields', () => {
      const entity: PyramidEntity = {
        id: 'test-1',
        organizationId: 'org-1',
        level: 'mission',
        name: 'Test Mission',
        description: 'Our mission statement',
        parentId: null,
        documentIds: [],
        alignmentScore: 100,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(entity.level).toBe('mission');
      expect(entity.parentId).toBeNull();
    });
  });

  describe('AlignmentScore', () => {
    it('should calculate valid score ranges', () => {
      const score: AlignmentScore = {
        entityId: 'test-1',
        score: 85,
        vectorDistance: 0.9,
        graphConnectivity: 0.75,
        driftIndicator: 0.8,
        confidence: 0.95,
        lastCalculated: new Date().toISOString()
      };

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });
  });
});
```

#### 5.2 Integration Tests
**File**: `tests/api/pyramid.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { RangerServer } from '../../src/api/server.js';

describe('Pyramid API', () => {
  let server: RangerServer;
  let app: any;

  beforeAll(async () => {
    server = new RangerServer();
    app = server.getApp();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('GET /api/pyramid/:orgId', () => {
    it('should return pyramid tree for organization', async () => {
      const response = await request(app)
        .get('/api/pyramid/test-org')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/pyramid/entity', () => {
    it('should create new pyramid entity', async () => {
      const entity = {
        organizationId: 'test-org',
        level: 'objective',
        name: 'Q1 Growth Objective',
        description: 'Achieve 20% growth in Q1',
        parentId: 'mission-1'
      };

      const response = await request(app)
        .post('/api/pyramid/entity')
        .set('Authorization', 'Bearer test-token')
        .send(entity);

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('GET /api/pyramid/entity/:id/path', () => {
    it('should return path to mission', async () => {
      const response = await request(app)
        .get('/api/pyramid/entity/test-project/path')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
```

#### 5.3 Alignment Tests
**File**: `tests/pka/alignment.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { AlignmentCalculator } from '../../src/pka/alignment/calculator.js';
import { DriftDetector } from '../../src/pka/alignment/drift-detector.js';
import { createUnifiedMemory } from '../../src/memory/index.js';

describe('Alignment System', () => {
  let calculator: AlignmentCalculator;
  let detector: DriftDetector;

  beforeAll(() => {
    const memory = createUnifiedMemory();
    calculator = new AlignmentCalculator(memory);
    detector = new DriftDetector(memory);
  });

  describe('AlignmentCalculator', () => {
    it('should calculate alignment score', async () => {
      const entity = {
        id: 'test-1',
        organizationId: 'org-1',
        level: 'project' as const,
        name: 'Test Project',
        description: 'A project aligned with our mission',
        parentId: 'program-1',
        documentIds: ['doc-1'],
        alignmentScore: 0,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const score = await calculator.calculateAlignment(entity);

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score.entityId).toBe('test-1');
    });

    it('should calculate higher scores for well-aligned entities', async () => {
      // Test that entities with supporting documents score higher
    });
  });

  describe('DriftDetector', () => {
    it('should detect drift when alignment is low', async () => {
      const alerts = await detector.detectDrift('test-org', 0.5);

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should categorize drift severity correctly', async () => {
      const alerts = await detector.detectDrift('test-org', 0.1);

      const severities = alerts.map(a => a.severity);
      expect(severities).toContain('critical');
    });
  });
});
```

#### 5.4 E2E Test Suite
**File**: `tests/e2e/pka-workflow.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { RangerServer } from '../../src/api/server.js';

describe('PKA-STRAT E2E Workflow', () => {
  let server: RangerServer;
  let app: any;
  let authToken: string;
  let createdEntityIds: string[] = [];

  beforeAll(async () => {
    server = new RangerServer();
    app = server.getApp();
    authToken = 'test-bearer-token'; // Replace with actual test token
  });

  afterAll(async () => {
    // Cleanup created entities
    await server.stop();
  });

  it('should complete full strategic alignment workflow', async () => {
    // Step 1: Create organization mission
    const missionResponse = await request(app)
      .post('/api/pyramid/entity')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        organizationId: 'test-org',
        level: 'mission',
        name: 'Test Mission',
        description: 'To innovate and lead in sustainable technology'
      });

    expect(missionResponse.status).toBe(201);
    const missionId = missionResponse.body.data.id;
    createdEntityIds.push(missionId);

    // Step 2: Create strategic objective
    const objectiveResponse = await request(app)
      .post('/api/pyramid/entity')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        organizationId: 'test-org',
        level: 'objective',
        name: 'Market Expansion',
        description: 'Expand into 3 new markets by 2025',
        parentId: missionId
      });

    expect(objectiveResponse.status).toBe(201);
    const objectiveId = objectiveResponse.body.data.id;
    createdEntityIds.push(objectiveId);

    // Step 3: Create project under objective
    const projectResponse = await request(app)
      .post('/api/pyramid/entity')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        organizationId: 'test-org',
        level: 'project',
        name: 'APAC Launch',
        description: 'Launch operations in Asia Pacific region',
        parentId: objectiveId
      });

    expect(projectResponse.status).toBe(201);
    const projectId = projectResponse.body.data.id;
    createdEntityIds.push(projectId);

    // Step 4: Calculate alignment
    const alignmentResponse = await request(app)
      .get(`/api/alignment/entity/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(alignmentResponse.status).toBe(200);
    expect(alignmentResponse.body.data.score).toBeGreaterThan(0);

    // Step 5: Get path to mission
    const pathResponse = await request(app)
      .get(`/api/pyramid/entity/${projectId}/path`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(pathResponse.status).toBe(200);
    expect(pathResponse.body.data).toHaveLength(3); // project -> objective -> mission

    // Step 6: Check for drift
    const driftResponse = await request(app)
      .get('/api/drift/alerts?orgId=test-org')
      .set('Authorization', `Bearer ${authToken}`);

    expect(driftResponse.status).toBe(200);
  });
});
```

### Verification Checkpoints (Phase 5)

```bash
# 1. Run all tests
npm test

# 2. Check coverage
npm run test:coverage

# 3. Verify coverage thresholds
# Target: >80% line coverage for new code

# 4. Run E2E tests
npm run test:e2e

# 5. Generate test report
npm run test:report
```

---

## Phase 6: Documentation & Deployment Prep (Days 13-14)

### Objective
Complete documentation and prepare for deployment.

### Tasks

#### 6.1 API Documentation
**File**: `docs/api/pka-api-reference.md`

```markdown
# PKA-STRAT API Reference

## Authentication
All PKA endpoints require a valid Supabase JWT in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Pyramid Management

#### GET /api/pyramid/:orgId
Returns the complete pyramid tree for an organization.

**Parameters:**
- `orgId` (path): Organization ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mission-1",
      "level": "mission",
      "name": "Our Mission",
      "children": [...]
    }
  ]
}
```

#### POST /api/pyramid/entity
Creates a new pyramid entity.

**Request Body:**
```json
{
  "organizationId": "string",
  "level": "mission|vision|objective|goal|portfolio|program|project|task",
  "name": "string",
  "description": "string",
  "parentId": "string|null"
}
```

### Alignment

#### GET /api/alignment/summary?orgId=:orgId
Returns organization-wide alignment summary.

#### GET /api/alignment/heatmap?orgId=:orgId
Returns alignment data formatted for heatmap visualization.

#### GET /api/alignment/entity/:id
Returns alignment score for a specific entity.

### Drift Detection

#### GET /api/drift/alerts?orgId=:orgId
Returns active drift alerts for an organization.

**Query Parameters:**
- `severity`: Filter by severity (low, medium, high, critical)
- `acknowledged`: Filter by acknowledgment status (true, false)

### Reports

#### GET /api/reports/board-narrative?orgId=:orgId
Generates executive board narrative with alignment proof.
```

#### 6.2 Update Server Documentation
**File**: `src/api/server.ts` (update startup message)

```typescript
console.log(`
╔══════════════════════════════════════════════════════════════╗
║              PKA-STRAT API Server (Ranger Core)              ║
╠══════════════════════════════════════════════════════════════╣
║  Status:     Running                                          ║
║  Port:       ${String(this.config.port).padEnd(46)}║
║  CORS:       ${this.config.corsOrigin.padEnd(46)}║
║  Data Dir:   ${this.config.dataDir.padEnd(46)}║
╠══════════════════════════════════════════════════════════════╣
║  Core Endpoints (Ranger):                                     ║
║    GET  /api/health           - Health check                  ║
║    GET  /api/collections      - List collections              ║
║    POST /api/collections/:n/search - Search collection        ║
║    POST /api/documents/upload - Upload document               ║
╠══════════════════════════════════════════════════════════════╣
║  PKA-STRAT Endpoints:                                         ║
║    GET  /api/pyramid/:orgId   - Get pyramid tree              ║
║    POST /api/pyramid/entity   - Create pyramid entity         ║
║    GET  /api/alignment/summary - Alignment summary            ║
║    GET  /api/alignment/heatmap - Alignment heatmap            ║
║    GET  /api/drift/alerts     - Drift alerts                  ║
║    GET  /api/reports/board-narrative - Board report           ║
╚══════════════════════════════════════════════════════════════╝
`);
```

### Verification Checkpoints (Phase 6)

```bash
# 1. Documentation generation
npm run docs:generate

# 2. Build verification
npm run build

# 3. Start server and verify endpoints
npm run api:dev

# 4. OpenAPI spec validation
npm run docs:validate

# 5. Final test run
npm test -- --run

# 6. Build production bundle
npm run build:prod
```

---

## Quality Gates

### Code Quality
- [ ] TypeScript strict mode passes
- [ ] ESLint rules satisfied
- [ ] No `any` types in new code
- [ ] All functions have JSDoc comments

### Testing
- [ ] Unit test coverage > 80%
- [ ] Integration tests pass
- [ ] E2E workflow tests pass
- [ ] Performance benchmarks met

### Security
- [ ] JWT validation implemented
- [ ] Role-based access control working
- [ ] Organization isolation verified
- [ ] Input validation on all endpoints

### Documentation
- [ ] API reference complete
- [ ] Code comments updated
- [ ] Architecture diagrams current
- [ ] Deployment guide ready

---

## Coordination Protocol

### Memory Sharing
All agents MUST share discoveries via memory coordination:

```bash
# Before starting work
npx claude-flow@alpha hooks pre-task --description "[task]"

# After completing work
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "pka/[phase]/[component]"

# Share findings
npx claude-flow@alpha hooks notify --message "[what was completed]"
```

### Progress Tracking
Update progress after each task:

```bash
npx claude-flow@alpha memory store --key "pka/progress/phase-[N]" --value "[status]"
```

### Quality Verification
Each phase requires verification before proceeding:

```bash
# Run phase verification
npm run verify:phase-[N]

# Report results
npx claude-flow@alpha hooks post-task --task-id "phase-[N]"
```

---

## Success Criteria

### Phase Completion
- All tasks in phase completed
- All verification checkpoints passed
- Memory updated with results
- No blocking issues for next phase

### Final Deliverable
- PKA-STRAT API fully functional
- All tests passing
- Documentation complete
- Ready for Lovable frontend integration

---

## Notes for Hive-Mind Execution

1. **Parallel Execution**: Phases 2-3 can have parallel agent work within each phase
2. **Dependencies**: Phase 4 requires Phase 2-3 completion; Phase 5 requires Phase 4
3. **Memory Sync**: All agents must sync to shared memory before phase transitions
4. **Conflict Resolution**: Queen coordinator handles merge conflicts and design decisions
5. **Testing**: Test engineer runs continuous verification during implementation
6. **Documentation**: Documentation agent updates docs in parallel with implementation

---

**End of Hive-Mind Implementation Prompt**
