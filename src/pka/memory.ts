/**
 * PKA Memory Manager
 *
 * Extends UnifiedMemory with PKA-STRAT specific operations for managing
 * the Strategic Pyramid hierarchy. Provides CRUD operations for pyramid
 * entities, hierarchy traversal, and document linking capabilities.
 *
 * @module pka/memory
 */

import { UnifiedMemory, Document, Relationship } from '../memory/index.js';
import { NodeType, EdgeType, GraphNode } from '../memory/graphStore.js';
import {
  PyramidEntity,
  PyramidLevel,
  AlignmentScore,
  AlignmentScoreBreakdown,
  AlignmentFactor,
  DriftAlert,
  DocumentType,
  StoryExtraction,
  ProvenanceChain,
  Team
} from './types.js';
import { randomUUID } from 'crypto';

// ============================================================================
// Local Types & Constants
// ============================================================================

/**
 * Weight multipliers for each pyramid level
 * Higher levels have more weight in alignment calculations
 */
const PYRAMID_WEIGHTS: Record<PyramidLevel, number> = {
  mission: 1.0,
  vision: 0.95,
  objective: 0.80,
  goal: 0.70,
  portfolio: 0.60,
  program: 0.50,
  project: 0.40,
  task: 0.30
};

/**
 * Maps lowercase PyramidLevel to Title Case NodeType
 */
const LEVEL_TO_NODE_TYPE: Record<PyramidLevel, NodeType> = {
  mission: 'Mission',
  vision: 'Vision',
  objective: 'Objective',
  goal: 'Goal',
  portfolio: 'Portfolio',
  program: 'Program',
  project: 'Project',
  task: 'Task'
};

/**
 * Filter options for querying pyramid entities
 */
export interface PyramidFilter {
  /** Filter by organization */
  organizationId?: string;
  /** Filter by pyramid levels */
  levels?: PyramidLevel[];
  /** Filter by parent */
  parentId?: string;
  /** Filter by minimum alignment score */
  minAlignmentScore?: number;
  /** Filter by maximum alignment score */
  maxAlignmentScore?: number;
  /** Filter by creation date range */
  createdAfter?: string;
  createdBefore?: string;
  /** Full-text search on name/description */
  search?: string;
}

// AlignmentScoreBreakdown and AlignmentFactor imported from types.ts

/**
 * PKA Memory Manager
 *
 * Provides PKA-STRAT specific operations on top of UnifiedMemory.
 * Manages the strategic pyramid hierarchy with alignment tracking.
 */
export class PKAMemoryManager {
  private memory: UnifiedMemory;

  constructor(memory: UnifiedMemory) {
    this.memory = memory;
  }

  // ============================================================================
  // Pyramid Entity Operations
  // ============================================================================

  /**
   * Create a new pyramid entity
   *
   * @param entity - Entity data (without id, timestamps, and alignmentScore)
   * @returns The created entity with all fields populated
   */
  async createPyramidEntity(
    entity: Omit<PyramidEntity, 'id' | 'createdAt' | 'updatedAt' | 'alignmentScore'>
  ): Promise<PyramidEntity> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const fullEntity: PyramidEntity = {
      ...entity,
      id,
      alignmentScore: 0,
      documentIds: entity.documentIds || [],
      createdAt: now,
      updatedAt: now
    };

    // Map lowercase level to Title Case NodeType for graph storage
    const nodeType = LEVEL_TO_NODE_TYPE[entity.level];

    // Add to graph store as node
    this.memory.getGraphStore().createNode(nodeType, {
      id,
      name: entity.name,
      description: entity.description,
      level: entity.level,
      parentId: entity.parentId,
      organizationId: entity.organizationId,
      alignmentScore: 0,
      documentIds: fullEntity.documentIds,
      metadata: entity.metadata,
      createdAt: now,
      updatedAt: now
    });

    // Create relationship to parent if exists
    if (entity.parentId) {
      try {
        this.memory.addRelationship({
          from: id,
          to: entity.parentId,
          type: 'ALIGNS_TO' as EdgeType,
          properties: { createdAt: now }
        });
      } catch (error) {
        // Parent might not exist yet in a batch creation scenario
        console.warn(`Could not create ALIGNS_TO relationship to parent ${entity.parentId}:`, error);
      }
    }

    // Add to vector store for semantic search
    await this.memory.addDocument({
      id,
      title: entity.name,
      text: `${entity.name}: ${entity.description}`,
      source: `pyramid/${entity.level}`,
      category: entity.level,
      metadata: {
        organizationId: entity.organizationId,
        level: entity.level,
        parentId: entity.parentId
      }
    });

    return fullEntity;
  }

  /**
   * Get a pyramid entity by ID
   *
   * @param id - Entity ID
   * @returns The entity or null if not found
   */
  async getPyramidEntity(id: string): Promise<PyramidEntity | null> {
    const node = this.memory.getGraphStore().getNodeById(id);
    if (!node) return null;

    return this.nodeToEntity(node);
  }

  /**
   * Update a pyramid entity
   *
   * @param id - Entity ID
   * @param updates - Fields to update
   * @returns The updated entity
   * @throws Error if entity not found
   */
  async updatePyramidEntity(
    id: string,
    updates: Partial<Omit<PyramidEntity, 'id' | 'createdAt'>>
  ): Promise<PyramidEntity> {
    const existing = await this.getPyramidEntity(id);
    if (!existing) {
      throw new Error(`Entity ${id} not found`);
    }

    const now = new Date().toISOString();
    const updated: PyramidEntity = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID cannot be changed
      createdAt: existing.createdAt, // Ensure createdAt cannot be changed
      updatedAt: now
    };

    // Map lowercase level to Title Case NodeType for graph storage
    const nodeType = LEVEL_TO_NODE_TYPE[updated.level];

    // Update in graph store by creating a new node with the same properties
    // Note: GraphStore.createNode will overwrite if ID exists
    this.memory.getGraphStore().createNode(nodeType, {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      level: updated.level,
      parentId: updated.parentId,
      organizationId: updated.organizationId,
      alignmentScore: updated.alignmentScore,
      documentIds: updated.documentIds,
      metadata: updated.metadata,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    });

    return updated;
  }

  /**
   * Delete a pyramid entity
   *
   * @param id - Entity ID
   * @returns True if deleted
   */
  async deletePyramidEntity(id: string): Promise<boolean> {
    // Delete from graph store (also removes edges)
    const graphDeleted = this.memory.getGraphStore().deleteNode(id);

    // Delete from vector store
    const vectorDeleted = await this.memory.deleteDocument(id);

    return graphDeleted || vectorDeleted;
  }

  // ============================================================================
  // Hierarchy Operations
  // ============================================================================

  /**
   * Get child entities of a given entity
   *
   * @param entityId - Parent entity ID
   * @param depth - Maximum depth to traverse (default: 1)
   * @returns Array of child entities
   */
  async getChildren(entityId: string, depth: number = 1): Promise<PyramidEntity[]> {
    const related = this.memory.findRelated(entityId, depth, ['ALIGNS_TO' as EdgeType]);

    // Filter to only include entities that have this entity as their parent
    const children: PyramidEntity[] = [];

    for (const r of related) {
      const entity = this.nodeToEntity(r.node);
      if (entity && entity.parentId === entityId) {
        children.push(entity);
      }
    }

    return children;
  }

  /**
   * Get the path from an entity up to the Organization (Mission)
   *
   * @param entityId - Starting entity ID
   * @returns Array of entities from entity to Organization
   */
  async getPathToMission(entityId: string): Promise<PyramidEntity[]> {
    const path: PyramidEntity[] = [];
    let currentId: string | null = entityId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const entity = await this.getPyramidEntity(currentId);
      if (!entity) break;

      path.push(entity);
      currentId = entity.parentId;
    }

    return path;
  }

  /**
   * Get the entire pyramid tree for an organization
   *
   * @param organizationId - Organization ID
   * @returns Array of all entities in the organization
   */
  async getPyramidTree(organizationId: string): Promise<PyramidEntity[]> {
    // Query for all nodes with matching organizationId
    const allNodes = this.memory.getGraphStore().getStats();
    const result = this.memory.graphQuery(
      `MATCH (n {organizationId: "${organizationId}"}) RETURN n`
    );

    return result.nodes
      .map(n => this.nodeToEntity(n))
      .filter((e): e is PyramidEntity => e !== null);
  }

  /**
   * Get entities at a specific pyramid level
   *
   * @param organizationId - Organization ID
   * @param level - Pyramid level
   * @returns Array of entities at that level
   */
  async getEntitiesByLevel(
    organizationId: string,
    level: PyramidLevel
  ): Promise<PyramidEntity[]> {
    const result = this.memory.graphQuery(
      `MATCH (n:${level}) RETURN n`
    );

    return result.nodes
      .map(n => this.nodeToEntity(n))
      .filter((e): e is PyramidEntity =>
        e !== null && e.organizationId === organizationId
      );
  }

  // ============================================================================
  // Document Linking
  // ============================================================================

  /**
   * Link a document to a pyramid entity
   *
   * @param documentId - Document ID
   * @param entityId - Entity ID to link to
   * @param type - Document type
   */
  async linkDocumentToEntity(
    documentId: string,
    entityId: string,
    type: DocumentType
  ): Promise<void> {
    const now = new Date().toISOString();

    this.memory.addRelationship({
      from: documentId,
      to: entityId,
      type: 'SUPPORTS' as EdgeType,
      properties: {
        documentType: type,
        linkedAt: now
      }
    });
  }

  /**
   * Get documents linked to an entity
   *
   * @param entityId - Entity ID
   * @returns Array of linked documents
   */
  async getLinkedDocuments(entityId: string): Promise<Document[]> {
    const related = this.memory.findRelated(entityId, 1, ['SUPPORTS' as EdgeType]);

    // Return document metadata from related nodes
    return related.map(r => ({
      id: r.node.id,
      title: String(r.node.properties?.title || r.node.properties?.name || ''),
      text: String(r.node.properties?.text || r.node.properties?.description || ''),
      source: r.node.properties?.source as string | undefined
    }));
  }

  /**
   * Unlink a document from an entity
   *
   * @param documentId - Document ID
   * @param entityId - Entity ID
   * @returns True if unlinked
   */
  async unlinkDocumentFromEntity(
    documentId: string,
    entityId: string
  ): Promise<boolean> {
    // Note: Would need to add deleteEdge method to GraphStore for full implementation
    // For now, return true as a placeholder
    console.warn('unlinkDocumentFromEntity: Edge deletion not fully implemented');
    return true;
  }

  // ============================================================================
  // Alignment Operations
  // ============================================================================

  /**
   * Calculate alignment score for an entity
   *
   * @param entityId - Entity ID
   * @returns Alignment score breakdown
   */
  async calculateAlignment(entityId: string): Promise<AlignmentScoreBreakdown> {
    const entity = await this.getPyramidEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const path = await this.getPathToMission(entityId);
    const byLevel: Partial<Record<PyramidLevel, number>> = {};
    const factors: AlignmentFactor[] = [];

    let totalWeight = 0;
    let weightedScore = 0;

    for (const pathEntity of path) {
      const levelWeight = PYRAMID_WEIGHTS[pathEntity.level] || 0.5;
      const hasParent = pathEntity.parentId !== null;
      const levelScore = hasParent ? 1.0 : 0.8; // Entities with parents are more aligned

      byLevel[pathEntity.level] = levelScore;
      totalWeight += levelWeight;
      weightedScore += levelScore * levelWeight;

      factors.push({
        name: `${pathEntity.level} connection`,
        weight: levelWeight,
        score: levelScore,
        reason: hasParent
          ? `Connected to parent at ${pathEntity.level} level`
          : `Root entity at ${pathEntity.level} level`
      });
    }

    const score = totalWeight > 0 ? weightedScore / totalWeight : 0;

    return {
      entityId,
      score,
      overall: score,  // Alias for score for backward compatibility
      byLevel,
      factors,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Update alignment score for an entity
   *
   * @param entityId - Entity ID
   * @returns Updated entity
   */
  async updateAlignmentScore(entityId: string): Promise<PyramidEntity> {
    const alignment = await this.calculateAlignment(entityId);
    return this.updatePyramidEntity(entityId, {
      alignmentScore: alignment.score
    });
  }

  // ============================================================================
  // Search Operations
  // ============================================================================

  /**
   * Search pyramid entities semantically
   *
   * @param query - Search query
   * @param filter - Optional filters
   * @returns Matching entities
   */
  async searchEntities(
    query: string,
    filter?: PyramidFilter
  ): Promise<PyramidEntity[]> {
    // Build metadata filters compatible with VectorStore
    const metadataFilters = filter?.levels?.[0]
      ? { category: filter.levels[0] }
      : undefined;

    const results = await this.memory.search(query, {
      k: 20,
      filters: metadataFilters
    });

    const entities: PyramidEntity[] = [];

    for (const result of results) {
      const entity = await this.getPyramidEntity(result.id);
      if (entity) {
        // Apply additional filters that can't be done at search level
        if (filter?.organizationId && entity.organizationId !== filter.organizationId) continue;
        if (filter?.levels && !filter.levels.includes(entity.level)) continue;
        if (filter?.parentId && entity.parentId !== filter.parentId) continue;
        if (filter?.minAlignmentScore && entity.alignmentScore < filter.minAlignmentScore) continue;
        if (filter?.maxAlignmentScore && entity.alignmentScore > filter.maxAlignmentScore) continue;

        entities.push(entity);
      }
    }

    return entities;
  }

  // ============================================================================
  // Direct Access
  // ============================================================================

  /**
   * Get the underlying UnifiedMemory instance
   *
   * @returns UnifiedMemory instance
   */
  getUnifiedMemory(): UnifiedMemory {
    return this.memory;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Convert a GraphNode to a PyramidEntity
   */
  private nodeToEntity(node: GraphNode): PyramidEntity | null {
    const props = node.properties;
    if (!props) return null;

    // Validate required fields
    if (!props.id || !props.name || !props.level) {
      return null;
    }

    // Handle level case conversion (graph stores Title Case, types use lowercase)
    const level = String(props.level).toLowerCase() as PyramidLevel;

    return {
      id: String(props.id),
      organizationId: String(props.organizationId || ''),
      level,
      name: String(props.name),
      description: String(props.description || ''),
      parentId: props.parentId as string | null,
      documentIds: Array.isArray(props.documentIds) ? props.documentIds : [],
      alignmentScore: Number(props.alignmentScore || 0),
      metadata: (props.metadata as Record<string, unknown>) || {},
      createdAt: String(props.createdAt || new Date().toISOString()),
      updatedAt: String(props.updatedAt || new Date().toISOString())
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new PKAMemoryManager instance
 *
 * @param memory - UnifiedMemory instance
 * @returns PKAMemoryManager instance
 */
export function createPKAMemoryManager(memory: UnifiedMemory): PKAMemoryManager {
  return new PKAMemoryManager(memory);
}
