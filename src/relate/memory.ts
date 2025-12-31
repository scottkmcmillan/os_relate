/**
 * PKA-Relate Memory Manager
 *
 * Extends UnifiedMemory with Relate-specific operations for managing
 * personal relationship data, knowledge organization, and growth tracking.
 * Provides CRUD operations for SubSystems, ContentItems, Interactions,
 * and user profile data with semantic search and graph traversal.
 *
 * @module relate/memory
 */

import { UnifiedMemory, Document, Relationship } from '../memory/index.js';
import { NodeType, EdgeType, GraphNode } from '../memory/graphStore.js';
import {
  SubSystem,
  SystemLink,
  ContentItem,
  Interaction,
  CoreValue,
  Mentor,
  FocusArea,
  PsychologicalProfile,
  ChatSource,
  SemanticSearchResult,
  InteractionFilter,
  ContentItemFilter,
  UUID,
  Timestamp,
  RelateNodeType,
  RelateEdgeType
} from './types.js';
import { randomUUID } from 'crypto';

// ============================================================================
// Local Types & Constants
// ============================================================================

/**
 * Chat context for RAG-based chat
 */
export interface ChatContext {
  userId: string;
  profile: Partial<PsychologicalProfile>;
  coreValues: CoreValue[];
  activeSystems: SubSystem[];
  relevantContent: ChatSource[];
  recentInteractions: Interaction[];
}

/**
 * User profile context for personalization
 */
export interface ProfileContext {
  userId: string;
  profile: PsychologicalProfile | null;
  coreValues: CoreValue[];
  mentors: Mentor[];
  focusAreas: FocusArea[];
  settings: {
    toughLoveEnabled: boolean;
  };
}

/**
 * Graph data for knowledge visualization
 */
export interface GraphData {
  nodes: SubSystem[];
  links: SystemLink[];
}

/**
 * Interaction statistics
 */
export interface InteractionStats {
  total: number;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
  byPerson: Record<string, number>;
  averagePerWeek: number;
  currentStreak: number;
}

/**
 * Error types for domain-specific errors
 */
export class RelateMemoryError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RelateMemoryError';
  }
}

// ============================================================================
// RelateMemoryManager Class
// ============================================================================

/**
 * RelateMemoryManager
 *
 * Provides PKA-Relate specific operations on top of UnifiedMemory.
 * Manages personal relationships, knowledge organization, and growth tracking.
 */
export class RelateMemoryManager {
  private memory: UnifiedMemory;

  constructor(memory: UnifiedMemory) {
    this.memory = memory;
  }

  // ==========================================================================
  // Sub-System Operations
  // ==========================================================================

  /**
   * Create a new SubSystem (knowledge domain)
   *
   * @param userId - User ID for data isolation
   * @param data - SubSystem data (without id and timestamps)
   * @returns The created SubSystem with all fields populated
   */
  async createSubSystem(
    userId: string,
    data: Omit<SubSystem, 'id' | 'created_at' | 'updated_at' | 'item_count'>
  ): Promise<SubSystem> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const fullSystem: SubSystem = {
      ...data,
      id,
      user_id: userId,
      item_count: 0,
      created_at: now,
      updated_at: now
    };

    // Add to graph store as node
    this.memory.getGraphStore().createNode('system' as NodeType, {
      id,
      user_id: userId,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      linked_system_ids: data.linked_system_ids || [],
      graph_position: data.graph_position,
      is_default: data.is_default || false,
      created_at: now,
      updated_at: now
    });

    // Add to vector store for semantic search
    if (data.embedding) {
      await this.memory.addDocument({
        id,
        title: data.name,
        text: `${data.name}: ${data.description}`,
        source: `subsystem/${userId}`,
        category: 'subsystem',
        metadata: {
          user_id: userId,
          icon: data.icon,
          color: data.color,
          is_default: data.is_default
        }
      });
    }

    return fullSystem;
  }

  /**
   * Get a SubSystem by ID
   *
   * @param userId - User ID for data isolation
   * @param systemId - System ID
   * @returns The SubSystem or null if not found
   */
  async getSubSystem(userId: string, systemId: string): Promise<SubSystem | null> {
    const node = this.memory.getGraphStore().getNodeById(systemId);
    if (!node || node.properties.user_id !== userId) return null;

    return this.nodeToSubSystem(node);
  }

  /**
   * Get all SubSystems for a user
   *
   * @param userId - User ID
   * @returns Array of all user's SubSystems
   */
  async getUserSubSystems(userId: string): Promise<SubSystem[]> {
    const result = this.memory.graphQuery(
      `MATCH (s:system {user_id: "${userId}"}) RETURN s`
    );

    return result.nodes
      .map(n => this.nodeToSubSystem(n))
      .filter((s): s is SubSystem => s !== null);
  }

  /**
   * Update a SubSystem
   *
   * @param userId - User ID for data isolation
   * @param systemId - System ID
   * @param updates - Fields to update
   * @returns The updated SubSystem
   * @throws RelateMemoryError if system not found or access denied
   */
  async updateSubSystem(
    userId: string,
    systemId: string,
    updates: Partial<Omit<SubSystem, 'id' | 'user_id' | 'created_at'>>
  ): Promise<SubSystem> {
    const existing = await this.getSubSystem(userId, systemId);
    if (!existing) {
      throw new RelateMemoryError(
        `SubSystem ${systemId} not found or access denied`,
        'SYSTEM_NOT_FOUND'
      );
    }

    const now = new Date().toISOString();
    const updated: SubSystem = {
      ...existing,
      ...updates,
      id: existing.id,
      user_id: userId,
      created_at: existing.created_at,
      updated_at: now
    };

    // Update in graph store
    this.memory.getGraphStore().createNode('system' as NodeType, {
      id: updated.id,
      user_id: userId,
      name: updated.name,
      description: updated.description,
      icon: updated.icon,
      color: updated.color,
      item_count: updated.item_count,
      linked_system_ids: updated.linked_system_ids,
      graph_position: updated.graph_position,
      is_default: updated.is_default,
      created_at: updated.created_at,
      updated_at: updated.updated_at
    });

    return updated;
  }

  /**
   * Delete a SubSystem
   *
   * @param userId - User ID for data isolation
   * @param systemId - System ID
   * @throws RelateMemoryError if system not found or access denied
   */
  async deleteSubSystem(userId: string, systemId: string): Promise<void> {
    const existing = await this.getSubSystem(userId, systemId);
    if (!existing) {
      throw new RelateMemoryError(
        `SubSystem ${systemId} not found or access denied`,
        'SYSTEM_NOT_FOUND'
      );
    }

    // Delete from graph store (also removes edges)
    this.memory.getGraphStore().deleteNode(systemId);

    // Delete from vector store
    await this.memory.deleteDocument(systemId);
  }

  /**
   * Link two SubSystems together
   *
   * @param userId - User ID for data isolation
   * @param sourceId - Source system ID
   * @param targetId - Target system ID
   */
  async linkSubSystems(
    userId: string,
    sourceId: string,
    targetId: string
  ): Promise<void> {
    // Verify both systems exist and belong to user
    const source = await this.getSubSystem(userId, sourceId);
    const target = await this.getSubSystem(userId, targetId);

    if (!source || !target) {
      throw new RelateMemoryError('One or both systems not found', 'SYSTEM_NOT_FOUND');
    }

    // Create bidirectional link
    this.memory.addRelationship({
      from: sourceId,
      to: targetId,
      type: 'linked_to' as EdgeType,
      properties: {
        created_at: new Date().toISOString(),
        strength: 0.5
      }
    });

    // Update linked_system_ids
    const updatedSource = {
      ...source,
      linked_system_ids: [...new Set([...source.linked_system_ids, targetId])]
    };
    const updatedTarget = {
      ...target,
      linked_system_ids: [...new Set([...target.linked_system_ids, sourceId])]
    };

    await this.updateSubSystem(userId, sourceId, updatedSource);
    await this.updateSubSystem(userId, targetId, updatedTarget);
  }

  /**
   * Unlink two SubSystems
   *
   * @param userId - User ID for data isolation
   * @param sourceId - Source system ID
   * @param targetId - Target system ID
   */
  async unlinkSubSystems(
    userId: string,
    sourceId: string,
    targetId: string
  ): Promise<void> {
    const source = await this.getSubSystem(userId, sourceId);
    const target = await this.getSubSystem(userId, targetId);

    if (!source || !target) return;

    // Remove from linked_system_ids
    const updatedSource = {
      ...source,
      linked_system_ids: source.linked_system_ids.filter(id => id !== targetId)
    };
    const updatedTarget = {
      ...target,
      linked_system_ids: target.linked_system_ids.filter(id => id !== sourceId)
    };

    await this.updateSubSystem(userId, sourceId, updatedSource);
    await this.updateSubSystem(userId, targetId, updatedTarget);
  }

  /**
   * Get the knowledge graph for visualization
   *
   * @param userId - User ID
   * @returns Graph data with nodes and links
   */
  async getSubSystemGraph(userId: string): Promise<GraphData> {
    const systems = await this.getUserSubSystems(userId);
    const links: SystemLink[] = [];

    // Build links from system relationships
    for (const system of systems) {
      for (const targetId of system.linked_system_ids) {
        // Avoid duplicate bidirectional links
        if (system.id < targetId) {
          links.push({
            id: randomUUID(),
            source_system_id: system.id,
            target_system_id: targetId,
            strength: 0.5,
            shared_items_count: 0,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    return { nodes: systems, links };
  }

  // ==========================================================================
  // Content Item Operations
  // ==========================================================================

  /**
   * Create a new ContentItem
   *
   * @param userId - User ID for data isolation
   * @param systemId - System to add content to
   * @param data - Content item data
   * @returns The created ContentItem
   */
  async createContentItem(
    userId: string,
    systemId: string,
    data: Omit<ContentItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'reference_count'>
  ): Promise<ContentItem> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const fullItem: ContentItem = {
      ...data,
      id,
      user_id: userId,
      system_id: systemId,
      reference_count: 0,
      created_at: now,
      updated_at: now
    };

    // Add to graph store
    this.memory.getGraphStore().createNode('content' as NodeType, {
      id,
      user_id: userId,
      system_id: systemId,
      type: data.type,
      title: data.title,
      content: data.content,
      url: data.url,
      highlights: data.highlights || [],
      personal_notes: data.personal_notes,
      tags: data.tags || [],
      linked_system_ids: data.linked_system_ids || [],
      source_metadata: data.source_metadata || {},
      created_at: now,
      updated_at: now
    });

    // Create relationship to system
    this.memory.addRelationship({
      from: systemId,
      to: id,
      type: 'contains' as EdgeType,
      properties: { created_at: now }
    });

    // Add to vector store for semantic search
    if (data.embedding) {
      await this.memory.addDocument({
        id,
        title: data.title,
        text: data.content || data.title,
        source: `content/${systemId}`,
        category: data.type,
        metadata: {
          user_id: userId,
          system_id: systemId,
          type: data.type,
          tags: data.tags,
          url: data.url
        }
      });
    }

    // Increment system item_count
    const system = await this.getSubSystem(userId, systemId);
    if (system) {
      await this.updateSubSystem(userId, systemId, {
        item_count: system.item_count + 1
      });
    }

    return fullItem;
  }

  /**
   * Get a ContentItem by ID
   *
   * @param userId - User ID for data isolation
   * @param itemId - Content item ID
   * @returns The ContentItem or null if not found
   */
  async getContentItem(userId: string, itemId: string): Promise<ContentItem | null> {
    const node = this.memory.getGraphStore().getNodeById(itemId);
    if (!node || node.properties.user_id !== userId) return null;

    return this.nodeToContentItem(node);
  }

  /**
   * Get all ContentItems in a system
   *
   * @param userId - User ID for data isolation
   * @param systemId - System ID
   * @returns Array of content items
   */
  async getSystemContentItems(userId: string, systemId: string): Promise<ContentItem[]> {
    const result = this.memory.graphQuery(
      `MATCH (s:system {id: "${systemId}"})-[:contains]->(c:content {user_id: "${userId}"}) RETURN c`
    );

    return result.nodes
      .map(n => this.nodeToContentItem(n))
      .filter((c): c is ContentItem => c !== null);
  }

  /**
   * Search ContentItems semantically
   *
   * @param userId - User ID for data isolation
   * @param query - Search query
   * @param options - Search options
   * @returns Array of matching content items
   */
  async searchContentItems(
    userId: string,
    query: string,
    options?: {
      systemIds?: string[];
      contentTypes?: string[];
      limit?: number;
      threshold?: number;
    }
  ): Promise<ContentItem[]> {
    const filters: Record<string, unknown> = { user_id: userId };

    if (options?.systemIds && options.systemIds.length > 0) {
      filters.system_id = options.systemIds[0]; // Basic filter
    }

    if (options?.contentTypes && options.contentTypes.length > 0) {
      filters.type = options.contentTypes[0]; // Basic filter
    }

    const results = await this.memory.search(query, {
      k: options?.limit || 10,
      filters
    });

    const items: ContentItem[] = [];
    for (const result of results) {
      if (result.metadata.category === 'content' ||
          ['note', 'article', 'book', 'video', 'podcast'].includes(String(result.metadata.type))) {
        const item = await this.getContentItem(userId, result.id);
        if (item) items.push(item);
      }
    }

    return items;
  }

  /**
   * Update a ContentItem
   *
   * @param userId - User ID for data isolation
   * @param itemId - Content item ID
   * @param updates - Fields to update
   * @returns The updated ContentItem
   */
  async updateContentItem(
    userId: string,
    itemId: string,
    updates: Partial<Omit<ContentItem, 'id' | 'user_id' | 'created_at'>>
  ): Promise<ContentItem> {
    const existing = await this.getContentItem(userId, itemId);
    if (!existing) {
      throw new RelateMemoryError('Content item not found', 'CONTENT_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const updated: ContentItem = {
      ...existing,
      ...updates,
      id: existing.id,
      user_id: userId,
      created_at: existing.created_at,
      updated_at: now
    };

    // Update in graph store
    this.memory.getGraphStore().createNode('content' as NodeType, {
      id: updated.id,
      user_id: userId,
      system_id: updated.system_id,
      type: updated.type,
      title: updated.title,
      content: updated.content,
      url: updated.url,
      highlights: updated.highlights,
      personal_notes: updated.personal_notes,
      tags: updated.tags,
      linked_system_ids: updated.linked_system_ids,
      reference_count: updated.reference_count,
      source_metadata: updated.source_metadata,
      created_at: updated.created_at,
      updated_at: updated.updated_at
    });

    return updated;
  }

  /**
   * Delete a ContentItem
   *
   * @param userId - User ID for data isolation
   * @param itemId - Content item ID
   */
  async deleteContentItem(userId: string, itemId: string): Promise<void> {
    const existing = await this.getContentItem(userId, itemId);
    if (!existing) {
      throw new RelateMemoryError('Content item not found', 'CONTENT_NOT_FOUND');
    }

    // Delete from graph store
    this.memory.getGraphStore().deleteNode(itemId);

    // Delete from vector store
    await this.memory.deleteDocument(itemId);

    // Decrement system item_count
    const system = await this.getSubSystem(userId, existing.system_id);
    if (system) {
      await this.updateSubSystem(userId, existing.system_id, {
        item_count: Math.max(0, system.item_count - 1)
      });
    }
  }

  // ==========================================================================
  // Interaction Operations
  // ==========================================================================

  /**
   * Log a new interaction
   *
   * @param userId - User ID for data isolation
   * @param data - Interaction data
   * @returns The created Interaction
   */
  async logInteraction(
    userId: string,
    data: Omit<Interaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<Interaction> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const fullInteraction: Interaction = {
      ...data,
      id,
      user_id: userId,
      created_at: now,
      updated_at: now
    };

    // Add to graph store
    this.memory.getGraphStore().createNode('interaction' as NodeType, {
      id,
      user_id: userId,
      type: data.type,
      person: data.person,
      summary: data.summary,
      outcome: data.outcome,
      emotions: data.emotions || [],
      learnings: data.learnings,
      date: data.date,
      linked_focus_area_ids: data.linked_focus_area_ids || [],
      linked_value_ids: data.linked_value_ids || [],
      related_content_ids: data.related_content_ids || [],
      created_at: now,
      updated_at: now
    });

    // Add to vector store for pattern detection
    if (data.embedding) {
      await this.memory.addDocument({
        id,
        title: `${data.type} with ${data.person}`,
        text: `${data.summary}\n${data.learnings || ''}`,
        source: `interaction/${userId}`,
        category: data.type,
        metadata: {
          user_id: userId,
          person: data.person,
          outcome: data.outcome,
          date: data.date
        }
      });
    }

    // Create relationships
    for (const valueId of data.linked_value_ids || []) {
      this.memory.addRelationship({
        from: id,
        to: valueId,
        type: 'aligned_with' as EdgeType,
        properties: { created_at: now }
      });
    }

    for (const focusAreaId of data.linked_focus_area_ids || []) {
      this.memory.addRelationship({
        from: id,
        to: focusAreaId,
        type: 'practiced' as EdgeType,
        properties: { created_at: now }
      });
    }

    return fullInteraction;
  }

  /**
   * Get an interaction by ID
   *
   * @param userId - User ID for data isolation
   * @param interactionId - Interaction ID
   * @returns The Interaction or null if not found
   */
  async getInteraction(userId: string, interactionId: string): Promise<Interaction | null> {
    const node = this.memory.getGraphStore().getNodeById(interactionId);
    if (!node || node.properties.user_id !== userId) return null;

    return this.nodeToInteraction(node);
  }

  /**
   * Get user interactions with optional filters
   *
   * @param userId - User ID
   * @param filters - Optional filters
   * @returns Array of interactions
   */
  async getUserInteractions(
    userId: string,
    filters?: Partial<InteractionFilter>
  ): Promise<Interaction[]> {
    let query = `MATCH (i:interaction {user_id: "${userId}"})`;

    if (filters?.person) {
      query += ` WHERE i.person = "${filters.person}"`;
    }

    query += ` RETURN i ORDER BY i.date DESC`;

    const result = this.memory.graphQuery(query);

    return result.nodes
      .map(n => this.nodeToInteraction(n))
      .filter((i): i is Interaction => i !== null);
  }

  /**
   * Update an interaction
   *
   * @param userId - User ID for data isolation
   * @param interactionId - Interaction ID
   * @param updates - Fields to update
   * @returns The updated Interaction
   */
  async updateInteraction(
    userId: string,
    interactionId: string,
    updates: Partial<Omit<Interaction, 'id' | 'user_id' | 'created_at'>>
  ): Promise<Interaction> {
    const existing = await this.getInteraction(userId, interactionId);
    if (!existing) {
      throw new RelateMemoryError('Interaction not found', 'INTERACTION_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const updated: Interaction = {
      ...existing,
      ...updates,
      id: existing.id,
      user_id: userId,
      created_at: existing.created_at,
      updated_at: now
    };

    // Update in graph store
    this.memory.getGraphStore().createNode('interaction' as NodeType, {
      id: updated.id,
      user_id: userId,
      type: updated.type,
      person: updated.person,
      summary: updated.summary,
      outcome: updated.outcome,
      emotions: updated.emotions,
      learnings: updated.learnings,
      date: updated.date,
      linked_focus_area_ids: updated.linked_focus_area_ids,
      linked_value_ids: updated.linked_value_ids,
      related_content_ids: updated.related_content_ids,
      created_at: updated.created_at,
      updated_at: updated.updated_at
    });

    return updated;
  }

  /**
   * Delete an interaction
   *
   * @param userId - User ID for data isolation
   * @param interactionId - Interaction ID
   */
  async deleteInteraction(userId: string, interactionId: string): Promise<void> {
    const existing = await this.getInteraction(userId, interactionId);
    if (!existing) {
      throw new RelateMemoryError('Interaction not found', 'INTERACTION_NOT_FOUND');
    }

    // Delete from graph store
    this.memory.getGraphStore().deleteNode(interactionId);

    // Delete from vector store
    await this.memory.deleteDocument(interactionId);
  }

  /**
   * Get interaction statistics
   *
   * @param userId - User ID
   * @param period - Time period (days)
   * @returns Interaction statistics
   */
  async getInteractionStats(userId: string, period: number = 30): Promise<InteractionStats> {
    const interactions = await this.getUserInteractions(userId);

    const stats: InteractionStats = {
      total: interactions.length,
      byType: {},
      byOutcome: {},
      byPerson: {},
      averagePerWeek: 0,
      currentStreak: 0
    };

    // Count by type, outcome, person
    for (const interaction of interactions) {
      stats.byType[interaction.type] = (stats.byType[interaction.type] || 0) + 1;
      stats.byOutcome[interaction.outcome] = (stats.byOutcome[interaction.outcome] || 0) + 1;
      stats.byPerson[interaction.person] = (stats.byPerson[interaction.person] || 0) + 1;
    }

    // Calculate average per week
    if (period > 0) {
      stats.averagePerWeek = (interactions.length / period) * 7;
    }

    return stats;
  }

  // ==========================================================================
  // Profile Operations
  // ==========================================================================

  /**
   * Get psychological profile
   *
   * @param userId - User ID
   * @returns Psychological profile or null
   */
  async getPsychologicalProfile(userId: string): Promise<PsychologicalProfile | null> {
    const result = this.memory.graphQuery(
      `MATCH (p:psychological_profile {user_id: "${userId}"}) RETURN p`
    );

    if (result.nodes.length === 0) return null;
    return this.nodeToPsychProfile(result.nodes[0]!);
  }

  /**
   * Update psychological profile
   *
   * @param userId - User ID
   * @param updates - Profile updates
   * @returns Updated profile
   */
  async updatePsychologicalProfile(
    userId: string,
    updates: Partial<Omit<PsychologicalProfile, 'id' | 'user_id'>>
  ): Promise<PsychologicalProfile> {
    const existing = await this.getPsychologicalProfile(userId);
    const id = existing?.id || randomUUID();
    const now = new Date().toISOString();

    const updated: PsychologicalProfile = {
      ...existing,
      ...updates,
      id,
      user_id: userId,
      updated_at: now,
      created_at: existing?.created_at || now
    } as PsychologicalProfile;

    // Store in graph
    this.memory.getGraphStore().createNode('psychological_profile' as NodeType, {
      ...updated
    });

    return updated;
  }

  /**
   * Get core values
   *
   * @param userId - User ID
   * @returns Array of core values
   */
  async getCoreValues(userId: string): Promise<CoreValue[]> {
    const result = this.memory.graphQuery(
      `MATCH (v:value {user_id: "${userId}"}) RETURN v ORDER BY v.display_order`
    );

    return result.nodes
      .map(n => this.nodeToCoreValue(n))
      .filter((v): v is CoreValue => v !== null);
  }

  /**
   * Add a core value
   *
   * @param userId - User ID
   * @param data - Core value data
   * @returns Created core value
   */
  async addCoreValue(
    userId: string,
    data: Omit<CoreValue, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'reference_count'>
  ): Promise<CoreValue> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const value: CoreValue = {
      ...data,
      id,
      user_id: userId,
      reference_count: 0,
      created_at: now,
      updated_at: now
    };

    this.memory.getGraphStore().createNode('value' as NodeType, value);

    return value;
  }

  /**
   * Update a core value
   *
   * @param userId - User ID
   * @param valueId - Value ID
   * @param updates - Updates
   * @returns Updated value
   */
  async updateCoreValue(
    userId: string,
    valueId: string,
    updates: Partial<Omit<CoreValue, 'id' | 'user_id' | 'created_at'>>
  ): Promise<CoreValue> {
    const node = this.memory.getGraphStore().getNodeById(valueId);
    if (!node || node.properties.user_id !== userId) {
      throw new RelateMemoryError('Core value not found', 'VALUE_NOT_FOUND');
    }

    const existing = this.nodeToCoreValue(node);
    if (!existing) {
      throw new RelateMemoryError('Invalid core value data', 'INVALID_DATA');
    }

    const updated: CoreValue = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.memory.getGraphStore().createNode('value' as NodeType, updated);

    return updated;
  }

  /**
   * Remove a core value
   *
   * @param userId - User ID
   * @param valueId - Value ID
   */
  async removeCoreValue(userId: string, valueId: string): Promise<void> {
    const node = this.memory.getGraphStore().getNodeById(valueId);
    if (!node || node.properties.user_id !== userId) {
      throw new RelateMemoryError('Core value not found', 'VALUE_NOT_FOUND');
    }

    this.memory.getGraphStore().deleteNode(valueId);
  }

  /**
   * Get mentors
   *
   * @param userId - User ID
   * @returns Array of mentors
   */
  async getMentors(userId: string): Promise<Mentor[]> {
    const result = this.memory.graphQuery(
      `MATCH (m:mentor {user_id: "${userId}"}) RETURN m`
    );

    return result.nodes
      .map(n => this.nodeToMentor(n))
      .filter((m): m is Mentor => m !== null);
  }

  /**
   * Add a mentor
   *
   * @param userId - User ID
   * @param data - Mentor data
   * @returns Created mentor
   */
  async addMentor(
    userId: string,
    data: Omit<Mentor, 'id' | 'user_id' | 'created_at' | 'reference_count'>
  ): Promise<Mentor> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const mentor: Mentor = {
      ...data,
      id,
      user_id: userId,
      reference_count: 0,
      created_at: now
    };

    this.memory.getGraphStore().createNode('mentor' as NodeType, mentor);

    return mentor;
  }

  /**
   * Update a mentor
   *
   * @param userId - User ID
   * @param mentorId - Mentor ID
   * @param updates - Updates
   * @returns Updated mentor
   */
  async updateMentor(
    userId: string,
    mentorId: string,
    updates: Partial<Omit<Mentor, 'id' | 'user_id' | 'created_at'>>
  ): Promise<Mentor> {
    const node = this.memory.getGraphStore().getNodeById(mentorId);
    if (!node || node.properties.user_id !== userId) {
      throw new RelateMemoryError('Mentor not found', 'MENTOR_NOT_FOUND');
    }

    const existing = this.nodeToMentor(node);
    if (!existing) {
      throw new RelateMemoryError('Invalid mentor data', 'INVALID_DATA');
    }

    const updated: Mentor = {
      ...existing,
      ...updates
    };

    this.memory.getGraphStore().createNode('mentor' as NodeType, updated);

    return updated;
  }

  /**
   * Remove a mentor
   *
   * @param userId - User ID
   * @param mentorId - Mentor ID
   */
  async removeMentor(userId: string, mentorId: string): Promise<void> {
    const node = this.memory.getGraphStore().getNodeById(mentorId);
    if (!node || node.properties.user_id !== userId) {
      throw new RelateMemoryError('Mentor not found', 'MENTOR_NOT_FOUND');
    }

    this.memory.getGraphStore().deleteNode(mentorId);
  }

  // ==========================================================================
  // Focus Area Operations
  // ==========================================================================

  /**
   * Get focus areas
   *
   * @param userId - User ID
   * @returns Array of focus areas
   */
  async getFocusAreas(userId: string): Promise<FocusArea[]> {
    const result = this.memory.graphQuery(
      `MATCH (f:focus_area {user_id: "${userId}"}) RETURN f`
    );

    return result.nodes
      .map(n => this.nodeToFocusArea(n))
      .filter((f): f is FocusArea => f !== null);
  }

  /**
   * Create a focus area
   *
   * @param userId - User ID
   * @param data - Focus area data
   * @returns Created focus area
   */
  async createFocusArea(
    userId: string,
    data: Omit<FocusArea, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<FocusArea> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const focusArea: FocusArea = {
      ...data,
      id,
      user_id: userId,
      created_at: now,
      updated_at: now
    };

    this.memory.getGraphStore().createNode('focus_area' as NodeType, focusArea);

    return focusArea;
  }

  /**
   * Update a focus area
   *
   * @param userId - User ID
   * @param focusAreaId - Focus area ID
   * @param updates - Updates
   * @returns Updated focus area
   */
  async updateFocusArea(
    userId: string,
    focusAreaId: string,
    updates: Partial<Omit<FocusArea, 'id' | 'user_id' | 'created_at'>>
  ): Promise<FocusArea> {
    const node = this.memory.getGraphStore().getNodeById(focusAreaId);
    if (!node || node.properties.user_id !== userId) {
      throw new RelateMemoryError('Focus area not found', 'FOCUS_AREA_NOT_FOUND');
    }

    const existing = this.nodeToFocusArea(node);
    if (!existing) {
      throw new RelateMemoryError('Invalid focus area data', 'INVALID_DATA');
    }

    const updated: FocusArea = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.memory.getGraphStore().createNode('focus_area' as NodeType, updated);

    return updated;
  }

  /**
   * Update focus area progress
   *
   * @param userId - User ID
   * @param focusAreaId - Focus area ID
   * @param progress - New progress value (0-100)
   * @returns Updated focus area
   */
  async updateFocusAreaProgress(
    userId: string,
    focusAreaId: string,
    progress: number
  ): Promise<FocusArea> {
    return this.updateFocusArea(userId, focusAreaId, { progress });
  }

  /**
   * Delete a focus area
   *
   * @param userId - User ID
   * @param focusAreaId - Focus area ID
   */
  async deleteFocusArea(userId: string, focusAreaId: string): Promise<void> {
    const node = this.memory.getGraphStore().getNodeById(focusAreaId);
    if (!node || node.properties.user_id !== userId) {
      throw new RelateMemoryError('Focus area not found', 'FOCUS_AREA_NOT_FOUND');
    }

    this.memory.getGraphStore().deleteNode(focusAreaId);
  }

  // ==========================================================================
  // RAG Context Operations
  // ==========================================================================

  /**
   * Build chat context for RAG
   *
   * @param userId - User ID
   * @param query - User query
   * @param systemIds - Optional system IDs to search within
   * @returns Chat context with relevant content
   */
  async buildChatContext(
    userId: string,
    query: string,
    systemIds?: string[]
  ): Promise<ChatContext> {
    // Get user profile
    const profile = await this.getPsychologicalProfile(userId);
    const coreValues = await this.getCoreValues(userId);
    const activeSystems = systemIds
      ? await Promise.all(systemIds.map(id => this.getSubSystem(userId, id)))
          .then(systems => systems.filter((s): s is SubSystem => s !== null))
      : await this.getUserSubSystems(userId);

    // Search for relevant content
    const contentItems = await this.searchContentItems(userId, query, {
      systemIds,
      limit: 5
    });

    // Get recent interactions
    const allInteractions = await this.getUserInteractions(userId);
    const recentInteractions = allInteractions.slice(0, 5);

    // Convert content items to chat sources
    const relevantContent: ChatSource[] = contentItems.map(item => ({
      id: item.id,
      type: 'content_item' as const,
      title: item.title,
      content_type: item.type,
      sub_system_name: activeSystems.find(s => s.id === item.system_id)?.name,
      snippet: item.content?.slice(0, 200) || '',
      url: item.url,
      score: 0.8,
      highlighted_text: item.highlights[0],
      personal_note: item.personal_notes,
      provenance_level: 1
    }));

    return {
      userId,
      profile: profile ? {
        attachment_style: profile.attachment_style,
        communication_style: profile.communication_style,
        conflict_pattern: profile.conflict_pattern
      } : {},
      coreValues,
      activeSystems,
      relevantContent,
      recentInteractions
    };
  }

  /**
   * Get user profile context
   *
   * @param userId - User ID
   * @returns Profile context for personalization
   */
  async getUserProfileContext(userId: string): Promise<ProfileContext> {
    const profile = await this.getPsychologicalProfile(userId);
    const coreValues = await this.getCoreValues(userId);
    const mentors = await this.getMentors(userId);
    const focusAreas = await this.getFocusAreas(userId);

    return {
      userId,
      profile,
      coreValues,
      mentors,
      focusAreas,
      settings: {
        toughLoveEnabled: false // Would come from user settings
      }
    };
  }

  // ==========================================================================
  // Direct Access
  // ==========================================================================

  /**
   * Get the underlying UnifiedMemory instance
   *
   * @returns UnifiedMemory instance
   */
  getUnifiedMemory(): UnifiedMemory {
    return this.memory;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Convert GraphNode to SubSystem
   */
  private nodeToSubSystem(node: GraphNode): SubSystem | null {
    const props = node.properties;
    if (!props || !props.id) return null;

    return {
      id: String(props.id),
      user_id: String(props.user_id),
      name: String(props.name),
      description: String(props.description || ''),
      icon: String(props.icon) as any,
      color: String(props.color),
      item_count: Number(props.item_count || 0),
      linked_system_ids: Array.isArray(props.linked_system_ids) ? props.linked_system_ids as string[] : [],
      embedding: props.embedding as Float32Array | undefined,
      graph_position: props.graph_position as { x: number; y: number } || { x: 0, y: 0 },
      is_default: Boolean(props.is_default),
      created_at: String(props.created_at),
      updated_at: String(props.updated_at)
    };
  }

  /**
   * Convert GraphNode to ContentItem
   */
  private nodeToContentItem(node: GraphNode): ContentItem | null {
    const props = node.properties;
    if (!props || !props.id) return null;

    return {
      id: String(props.id),
      user_id: String(props.user_id),
      system_id: String(props.system_id),
      type: String(props.type) as any,
      title: String(props.title),
      content: props.content as string | undefined,
      url: props.url as string | undefined,
      highlights: Array.isArray(props.highlights) ? props.highlights as string[] : [],
      personal_notes: props.personal_notes as string | undefined,
      tags: Array.isArray(props.tags) ? props.tags as string[] : [],
      linked_system_ids: Array.isArray(props.linked_system_ids) ? props.linked_system_ids as string[] : [],
      embedding: props.embedding as Float32Array | undefined,
      source_metadata: props.source_metadata as Record<string, unknown> || {},
      reference_count: Number(props.reference_count || 0),
      created_at: String(props.created_at),
      updated_at: String(props.updated_at)
    };
  }

  /**
   * Convert GraphNode to Interaction
   */
  private nodeToInteraction(node: GraphNode): Interaction | null {
    const props = node.properties;
    if (!props || !props.id) return null;

    return {
      id: String(props.id),
      user_id: String(props.user_id),
      type: String(props.type) as any,
      person: String(props.person),
      summary: String(props.summary),
      outcome: String(props.outcome) as any,
      emotions: Array.isArray(props.emotions) ? props.emotions as string[] : [],
      learnings: props.learnings as string | undefined,
      date: String(props.date),
      linked_focus_area_ids: Array.isArray(props.linked_focus_area_ids) ? props.linked_focus_area_ids as string[] : [],
      linked_value_ids: Array.isArray(props.linked_value_ids) ? props.linked_value_ids as string[] : [],
      related_content_ids: Array.isArray(props.related_content_ids) ? props.related_content_ids as string[] : [],
      embedding: props.embedding as Float32Array | undefined,
      created_at: String(props.created_at),
      updated_at: String(props.updated_at)
    };
  }

  /**
   * Convert GraphNode to PsychologicalProfile
   */
  private nodeToPsychProfile(node: GraphNode): PsychologicalProfile | null {
    const props = node.properties;
    if (!props || !props.id) return null;

    return {
      id: String(props.id),
      user_id: String(props.user_id),
      attachment_style: String(props.attachment_style) as any,
      attachment_updated_at: String(props.attachment_updated_at),
      communication_style: String(props.communication_style) as any,
      communication_updated_at: String(props.communication_updated_at),
      conflict_pattern: props.conflict_pattern as string | undefined,
      conflict_updated_at: String(props.conflict_updated_at),
      traits: props.traits as Record<string, unknown> || {},
      completeness_score: Number(props.completeness_score || 0),
      created_at: String(props.created_at),
      updated_at: String(props.updated_at)
    };
  }

  /**
   * Convert GraphNode to CoreValue
   */
  private nodeToCoreValue(node: GraphNode): CoreValue | null {
    const props = node.properties;
    if (!props || !props.id) return null;

    return {
      id: String(props.id),
      user_id: String(props.user_id),
      category: String(props.category) as any,
      value: String(props.value),
      description: props.description as string | undefined,
      display_order: Number(props.display_order || 0),
      embedding: props.embedding as Float32Array | undefined,
      reference_count: Number(props.reference_count || 0),
      created_at: String(props.created_at),
      updated_at: String(props.updated_at)
    };
  }

  /**
   * Convert GraphNode to Mentor
   */
  private nodeToMentor(node: GraphNode): Mentor | null {
    const props = node.properties;
    if (!props || !props.id) return null;

    return {
      id: String(props.id),
      user_id: String(props.user_id),
      name: String(props.name),
      description: props.description as string | undefined,
      tags: Array.isArray(props.tags) ? props.tags as string[] : [],
      embedding: props.embedding as Float32Array | undefined,
      reference_count: Number(props.reference_count || 0),
      created_at: String(props.created_at)
    };
  }

  /**
   * Convert GraphNode to FocusArea
   */
  private nodeToFocusArea(node: GraphNode): FocusArea | null {
    const props = node.properties;
    if (!props || !props.id) return null;

    return {
      id: String(props.id),
      user_id: String(props.user_id),
      title: String(props.title),
      description: props.description as string | undefined,
      progress: Number(props.progress || 0),
      streak: Number(props.streak || 0),
      weekly_change: Number(props.weekly_change || 0),
      target_date: props.target_date as string | undefined,
      linked_value_ids: Array.isArray(props.linked_value_ids) ? props.linked_value_ids as string[] : [],
      embedding: props.embedding as Float32Array | undefined,
      created_at: String(props.created_at),
      updated_at: String(props.updated_at)
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new RelateMemoryManager instance
 *
 * @param memory - UnifiedMemory instance
 * @returns RelateMemoryManager instance
 */
export function createRelateMemoryManager(memory: UnifiedMemory): RelateMemoryManager {
  return new RelateMemoryManager(memory);
}
