/**
 * SubSystem Service - Core knowledge domain management
 *
 * Handles CRUD operations, linking, and graph visualization for sub-systems.
 * Sub-systems are the primary organizational unit for personal knowledge in PKA-Relate.
 *
 * @module relate/systems/service
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type SubSystemIcon =
  | 'grid' | 'heart' | 'shield' | 'flower' | 'users'
  | 'brain' | 'book' | 'star' | 'compass' | 'lightbulb'
  | 'target' | 'rocket' | 'chart' | 'code' | 'music';

export interface SubSystem {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon: SubSystemIcon;
  color: string;
  itemCount: number;
  isDefault: boolean;
  position?: { x: number; y: number }; // For graph visualization
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubSystemCreate {
  name: string;
  description?: string;
  icon?: SubSystemIcon;
  color?: string;
  position?: { x: number; y: number };
  metadata?: Record<string, any>;
}

export interface SystemLink {
  id: string;
  sourceId: string;
  targetId: string;
  strength: number; // 0.0 - 1.0
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ContentItem {
  id: string;
  systemId: string;
  userId: string;
  type: 'article' | 'video' | 'book' | 'podcast' | 'note';
  title: string;
  description?: string;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentItemCreate {
  type: 'article' | 'video' | 'book' | 'podcast' | 'note';
  title: string;
  description?: string;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'system' | 'content';
  icon?: SubSystemIcon;
  color?: string;
  itemCount?: number;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'system_link' | 'contains';
  strength?: number;
}

export interface GraphVisualizationData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    systemCount: number;
    contentCount: number;
  };
}

// ============================================================================
// Default Sub-Systems Configuration
// ============================================================================

const DEFAULT_SYSTEMS: Array<Omit<SubSystem, 'id' | 'userId' | 'itemCount' | 'isDefault' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'General',
    icon: 'grid',
    color: '#6B7280',
    description: 'General relationship knowledge and insights',
    position: { x: 0, y: 0 }
  },
  {
    name: 'Dating',
    icon: 'heart',
    color: '#EF4444',
    description: 'Dating and romantic relationship strategies',
    position: { x: 200, y: 100 }
  },
  {
    name: 'Masculinity',
    icon: 'shield',
    color: '#3B82F6',
    description: 'Masculine development and self-improvement',
    position: { x: -200, y: 100 }
  },
  {
    name: 'Femininity',
    icon: 'flower',
    color: '#EC4899',
    description: 'Understanding feminine nature and communication',
    position: { x: 200, y: -100 }
  },
  {
    name: 'Management',
    icon: 'users',
    color: '#10B981',
    description: 'Relationship management and maintenance',
    position: { x: -200, y: -100 }
  }
];

// ============================================================================
// In-Memory Storage (Replace with database in production)
// ============================================================================

class SubSystemStore {
  private systems: Map<string, SubSystem> = new Map();
  private links: Map<string, SystemLink> = new Map();
  private contentItems: Map<string, ContentItem> = new Map();
  private systemsSeeded: Set<string> = new Set();

  // System CRUD
  getAllSystems(userId: string): SubSystem[] {
    return Array.from(this.systems.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getSystem(id: string): SubSystem | null {
    return this.systems.get(id) || null;
  }

  createSystem(system: SubSystem): SubSystem {
    this.systems.set(system.id, system);
    return system;
  }

  updateSystem(id: string, updates: Partial<SubSystem>): SubSystem | null {
    const system = this.systems.get(id);
    if (!system) return null;

    const updated = {
      ...system,
      ...updates,
      updatedAt: new Date()
    };
    this.systems.set(id, updated);
    return updated;
  }

  deleteSystem(id: string): boolean {
    // Delete associated content items
    Array.from(this.contentItems.values())
      .filter(item => item.systemId === id)
      .forEach(item => this.contentItems.delete(item.id));

    // Delete associated links
    Array.from(this.links.values())
      .filter(link => link.sourceId === id || link.targetId === id)
      .forEach(link => this.links.delete(link.id));

    return this.systems.delete(id);
  }

  incrementItemCount(systemId: string): void {
    const system = this.systems.get(systemId);
    if (system) {
      system.itemCount++;
      system.updatedAt = new Date();
    }
  }

  decrementItemCount(systemId: string): void {
    const system = this.systems.get(systemId);
    if (system && system.itemCount > 0) {
      system.itemCount--;
      system.updatedAt = new Date();
    }
  }

  // Link operations
  createLink(link: SystemLink): SystemLink {
    this.links.set(link.id, link);
    return link;
  }

  deleteLink(sourceId: string, targetId: string): boolean {
    const link = Array.from(this.links.values())
      .find(l =>
        (l.sourceId === sourceId && l.targetId === targetId) ||
        (l.sourceId === targetId && l.targetId === sourceId)
      );

    if (link) {
      return this.links.delete(link.id);
    }
    return false;
  }

  getLinkedSystems(systemId: string): string[] {
    const linkedIds = new Set<string>();

    Array.from(this.links.values()).forEach(link => {
      if (link.sourceId === systemId) {
        linkedIds.add(link.targetId);
      } else if (link.targetId === systemId) {
        linkedIds.add(link.sourceId);
      }
    });

    return Array.from(linkedIds);
  }

  getAllLinks(): SystemLink[] {
    return Array.from(this.links.values());
  }

  // Content operations
  getContentItems(systemId: string, pagination?: Pagination): ContentItem[] {
    const items = Array.from(this.contentItems.values())
      .filter(item => item.systemId === systemId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (pagination) {
      const start = (pagination.page - 1) * pagination.limit;
      return items.slice(start, start + pagination.limit);
    }

    return items;
  }

  createContentItem(item: ContentItem): ContentItem {
    this.contentItems.set(item.id, item);
    this.incrementItemCount(item.systemId);
    return item;
  }

  deleteContentItem(id: string): boolean {
    const item = this.contentItems.get(id);
    if (item) {
      this.decrementItemCount(item.systemId);
      return this.contentItems.delete(id);
    }
    return false;
  }

  // Seeding
  hasSeeded(userId: string): boolean {
    return this.systemsSeeded.has(userId);
  }

  markAsSeeded(userId: string): void {
    this.systemsSeeded.add(userId);
  }
}

// Singleton store instance
const store = new SubSystemStore();

// ============================================================================
// SubSystem Service Implementation
// ============================================================================

export class SubSystemService {
  /**
   * Get all sub-systems for a user
   * Lazy-initializes default systems on first access
   */
  async getAll(userId: string): Promise<SubSystem[]> {
    // Seed defaults if not already done
    if (!store.hasSeeded(userId)) {
      await this.seedDefaults(userId);
    }

    return store.getAllSystems(userId);
  }

  /**
   * Get a specific sub-system
   */
  async get(userId: string, systemId: string): Promise<SubSystem | null> {
    const system = store.getSystem(systemId);

    // Verify ownership
    if (system && system.userId !== userId) {
      return null;
    }

    return system;
  }

  /**
   * Create a new sub-system
   */
  async create(userId: string, data: SubSystemCreate): Promise<SubSystem> {
    const system: SubSystem = {
      id: `sys_${uuidv4()}`,
      userId,
      name: data.name,
      description: data.description,
      icon: data.icon || 'grid',
      color: data.color || '#6B7280',
      itemCount: 0,
      isDefault: false,
      position: data.position,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return store.createSystem(system);
  }

  /**
   * Update a sub-system
   */
  async update(
    userId: string,
    systemId: string,
    updates: Partial<SubSystem>
  ): Promise<SubSystem> {
    const system = await this.get(userId, systemId);
    if (!system) {
      throw new Error('Sub-system not found');
    }

    // Don't allow changing userId or id
    const { id, userId: _, ...allowedUpdates } = updates;

    const updated = store.updateSystem(systemId, allowedUpdates);
    if (!updated) {
      throw new Error('Failed to update sub-system');
    }

    return updated;
  }

  /**
   * Delete a sub-system
   */
  async delete(userId: string, systemId: string): Promise<void> {
    const system = await this.get(userId, systemId);
    if (!system) {
      throw new Error('Sub-system not found');
    }

    // Prevent deletion of default systems
    if (system.isDefault) {
      throw new Error('Cannot delete default sub-systems');
    }

    const deleted = store.deleteSystem(systemId);
    if (!deleted) {
      throw new Error('Failed to delete sub-system');
    }
  }

  /**
   * Get content items in a sub-system
   */
  async getItems(
    userId: string,
    systemId: string,
    pagination?: Pagination
  ): Promise<ContentItem[]> {
    const system = await this.get(userId, systemId);
    if (!system) {
      throw new Error('Sub-system not found');
    }

    return store.getContentItems(systemId, pagination);
  }

  /**
   * Add content item to a sub-system
   */
  async addItem(
    userId: string,
    systemId: string,
    data: ContentItemCreate
  ): Promise<ContentItem> {
    const system = await this.get(userId, systemId);
    if (!system) {
      throw new Error('Sub-system not found');
    }

    const item: ContentItem = {
      id: `cnt_${uuidv4()}`,
      systemId,
      userId,
      type: data.type,
      title: data.title,
      description: data.description,
      url: data.url,
      content: data.content,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return store.createContentItem(item);
  }

  /**
   * Link two sub-systems
   */
  async link(
    userId: string,
    sourceId: string,
    targetId: string,
    strength: number = 0.5
  ): Promise<void> {
    const source = await this.get(userId, sourceId);
    const target = await this.get(userId, targetId);

    if (!source || !target) {
      throw new Error('One or both sub-systems not found');
    }

    if (sourceId === targetId) {
      throw new Error('Cannot link a sub-system to itself');
    }

    const link: SystemLink = {
      id: `link_${uuidv4()}`,
      sourceId,
      targetId,
      strength: Math.max(0, Math.min(1, strength)),
      createdAt: new Date()
    };

    store.createLink(link);
  }

  /**
   * Unlink two sub-systems
   */
  async unlink(
    userId: string,
    sourceId: string,
    targetId: string
  ): Promise<void> {
    const source = await this.get(userId, sourceId);
    const target = await this.get(userId, targetId);

    if (!source || !target) {
      throw new Error('One or both sub-systems not found');
    }

    const deleted = store.deleteLink(sourceId, targetId);
    if (!deleted) {
      throw new Error('Link not found');
    }
  }

  /**
   * Get linked sub-systems
   */
  async getLinkedSystems(userId: string, systemId: string): Promise<SubSystem[]> {
    const system = await this.get(userId, systemId);
    if (!system) {
      throw new Error('Sub-system not found');
    }

    const linkedIds = store.getLinkedSystems(systemId);
    const systems: SubSystem[] = [];

    for (const id of linkedIds) {
      const linkedSystem = store.getSystem(id);
      if (linkedSystem && linkedSystem.userId === userId) {
        systems.push(linkedSystem);
      }
    }

    return systems;
  }

  /**
   * Get graph visualization data
   */
  async getGraph(userId: string, includeContent: boolean = false): Promise<GraphVisualizationData> {
    const systems = await this.getAll(userId);
    const links = store.getAllLinks();

    // Create system nodes
    const nodes: GraphNode[] = systems.map(system => ({
      id: system.id,
      label: system.name,
      type: 'system' as const,
      icon: system.icon,
      color: system.color,
      itemCount: system.itemCount,
      metadata: {
        description: system.description,
        isDefault: system.isDefault,
        position: system.position
      }
    }));

    // Create edges from system links
    const edges: GraphEdge[] = links
      .filter(link => {
        // Only include links between this user's systems
        const source = store.getSystem(link.sourceId);
        const target = store.getSystem(link.targetId);
        return source?.userId === userId && target?.userId === userId;
      })
      .map(link => ({
        id: link.id,
        source: link.sourceId,
        target: link.targetId,
        type: 'system_link' as const,
        strength: link.strength
      }));

    // Optionally include content items
    if (includeContent) {
      systems.forEach(system => {
        const items = store.getContentItems(system.id);

        items.forEach(item => {
          // Add content node
          nodes.push({
            id: item.id,
            label: item.title,
            type: 'content' as const,
            metadata: {
              type: item.type,
              description: item.description
            }
          });

          // Add edge from system to content
          edges.push({
            id: `edge_${system.id}_${item.id}`,
            source: system.id,
            target: item.id,
            type: 'contains' as const
          });
        });
      });
    }

    return {
      nodes,
      edges,
      metadata: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        systemCount: systems.length,
        contentCount: includeContent ? nodes.filter(n => n.type === 'content').length : 0
      }
    };
  }

  /**
   * Seed default sub-systems for a new user
   */
  async seedDefaults(userId: string): Promise<SubSystem[]> {
    if (store.hasSeeded(userId)) {
      return store.getAllSystems(userId);
    }

    const systems: SubSystem[] = [];

    for (const defaultSystem of DEFAULT_SYSTEMS) {
      const system: SubSystem = {
        id: `sys_${uuidv4()}`,
        userId,
        name: defaultSystem.name,
        description: defaultSystem.description,
        icon: defaultSystem.icon,
        color: defaultSystem.color,
        itemCount: 0,
        isDefault: true,
        position: defaultSystem.position,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      systems.push(store.createSystem(system));
    }

    store.markAsSeeded(userId);
    return systems;
  }
}

// ============================================================================
// Export Service Instance
// ============================================================================

export const subSystemService = new SubSystemService();
export default subSystemService;
