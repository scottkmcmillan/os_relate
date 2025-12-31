/**
 * Graph Node Service
 *
 * Provides CRUD operations for graph_nodes table in PostgreSQL.
 * Supports PKA-Relate entity types: system, value, focus_area, content, person, interaction.
 * All operations are scoped by user_id for multi-tenancy.
 */

import { randomUUID } from 'crypto';

/**
 * Supported node types for PKA-Relate graph
 */
export type RelateNodeType =
  | 'system'
  | 'value'
  | 'focus_area'
  | 'content'
  | 'person'
  | 'interaction';

/**
 * Graph node structure matching database schema
 */
export interface GraphNode {
  id: string;
  user_id: string;
  type: RelateNodeType;
  label: string;
  metadata: Record<string, any>;
  embedding?: number[];
  position: { x: number; y: number };
  created_at: Date;
}

/**
 * Input type for creating a new graph node
 */
export interface GraphNodeCreate {
  type: RelateNodeType;
  label: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  position?: { x: number; y: number };
}

/**
 * Database client interface (PostgreSQL)
 * Supports both pg and better-sqlite3 for testing
 */
export interface DatabaseClient {
  query(sql: string, params: any[]): Promise<{ rows: any[] }>;
}

/**
 * Custom error for not found scenarios
 */
export class NodeNotFoundError extends Error {
  constructor(nodeId: string) {
    super(`Graph node not found: ${nodeId}`);
    this.name = 'NodeNotFoundError';
  }
}

/**
 * GraphNodeService - CRUD operations for graph nodes
 *
 * All operations are scoped by user_id to ensure data isolation.
 * Supports vector embeddings for semantic search capabilities.
 */
export class GraphNodeService {
  private db: DatabaseClient;

  constructor(database: DatabaseClient) {
    this.db = database;
  }

  /**
   * Create a new graph node
   *
   * @param userId - User ID for data scoping
   * @param node - Node data to create
   * @returns The created node with generated ID
   */
  async createNode(userId: string, node: GraphNodeCreate): Promise<GraphNode> {
    const id = randomUUID();
    const position = node.position || { x: 0, y: 0 };
    const metadata = node.metadata || {};
    const now = new Date();

    const sql = `
      INSERT INTO graph_nodes (id, user_id, type, label, metadata, embedding, position, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      id,
      userId,
      node.type,
      node.label,
      JSON.stringify(metadata),
      node.embedding ? JSON.stringify(node.embedding) : null,
      JSON.stringify(position),
      now
    ];

    const result = await this.db.query(sql, params);
    return this.mapRowToNode(result.rows[0]);
  }

  /**
   * Get a node by its ID
   *
   * @param userId - User ID for access control
   * @param nodeId - Node ID to retrieve
   * @returns The node or null if not found
   */
  async getNode(userId: string, nodeId: string): Promise<GraphNode | null> {
    const sql = `
      SELECT * FROM graph_nodes
      WHERE id = $1 AND user_id = $2
    `;

    const result = await this.db.query(sql, [nodeId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNode(result.rows[0]);
  }

  /**
   * Get all nodes of a specific type
   *
   * @param userId - User ID for data scoping
   * @param type - Node type to filter by
   * @returns Array of matching nodes
   */
  async getNodesByType(userId: string, type: RelateNodeType): Promise<GraphNode[]> {
    const sql = `
      SELECT * FROM graph_nodes
      WHERE user_id = $1 AND type = $2
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(sql, [userId, type]);
    return result.rows.map(row => this.mapRowToNode(row));
  }

  /**
   * Update a node's properties
   *
   * @param userId - User ID for access control
   * @param nodeId - Node ID to update
   * @param updates - Partial node data to update
   * @returns The updated node
   * @throws NodeNotFoundError if node doesn't exist
   */
  async updateNode(
    userId: string,
    nodeId: string,
    updates: Partial<Omit<GraphNode, 'id' | 'user_id' | 'created_at'>>
  ): Promise<GraphNode> {
    // First verify the node exists and belongs to the user
    const existing = await this.getNode(userId, nodeId);
    if (!existing) {
      throw new NodeNotFoundError(nodeId);
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.label !== undefined) {
      updateFields.push(`label = $${paramIndex++}`);
      params.push(updates.label);
    }

    if (updates.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(updates.metadata));
    }

    if (updates.embedding !== undefined) {
      updateFields.push(`embedding = $${paramIndex++}`);
      params.push(updates.embedding ? JSON.stringify(updates.embedding) : null);
    }

    if (updates.position !== undefined) {
      updateFields.push(`position = $${paramIndex++}`);
      params.push(JSON.stringify(updates.position));
    }

    if (updateFields.length === 0) {
      return existing; // No updates requested
    }

    // Add WHERE clause parameters
    params.push(nodeId, userId);

    const sql = `
      UPDATE graph_nodes
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await this.db.query(sql, params);
    return this.mapRowToNode(result.rows[0]);
  }

  /**
   * Delete a node
   *
   * @param userId - User ID for access control
   * @param nodeId - Node ID to delete
   * @throws NodeNotFoundError if node doesn't exist
   */
  async deleteNode(userId: string, nodeId: string): Promise<void> {
    const sql = `
      DELETE FROM graph_nodes
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await this.db.query(sql, [nodeId, userId]);

    if (result.rows.length === 0) {
      throw new NodeNotFoundError(nodeId);
    }
  }

  /**
   * Find nodes connected to a given node through graph traversal
   *
   * @param userId - User ID for data scoping
   * @param nodeId - Starting node ID
   * @param depth - Maximum traversal depth (default: 1)
   * @returns Array of connected nodes
   */
  async findConnectedNodes(
    userId: string,
    nodeId: string,
    depth: number = 1
  ): Promise<GraphNode[]> {
    // Verify starting node exists
    const startNode = await this.getNode(userId, nodeId);
    if (!startNode) {
      throw new NodeNotFoundError(nodeId);
    }

    // Use recursive CTE for graph traversal
    const sql = `
      WITH RECURSIVE connected_nodes AS (
        -- Base case: directly connected nodes
        SELECT DISTINCT target_id as node_id, 1 as depth
        FROM graph_edges
        WHERE source_id = $1 AND user_id = $2

        UNION

        SELECT DISTINCT target_id as node_id, 0 as depth
        FROM graph_edges
        WHERE target_id = $1 AND user_id = $2

        UNION ALL

        -- Recursive case: traverse deeper
        SELECT DISTINCT e.target_id as node_id, cn.depth + 1 as depth
        FROM graph_edges e
        INNER JOIN connected_nodes cn ON e.source_id = cn.node_id
        WHERE e.user_id = $2 AND cn.depth < $3
      )
      SELECT n.*
      FROM graph_nodes n
      INNER JOIN connected_nodes cn ON n.id = cn.node_id
      WHERE n.user_id = $2
      ORDER BY cn.depth, n.created_at DESC
    `;

    const result = await this.db.query(sql, [nodeId, userId, depth]);
    return result.rows.map(row => this.mapRowToNode(row));
  }

  /**
   * Map database row to GraphNode object
   *
   * @param row - Database row
   * @returns GraphNode object
   */
  private mapRowToNode(row: any): GraphNode {
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type as RelateNodeType,
      label: row.label,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      embedding: row.embedding ?
        (typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding) :
        undefined,
      position: typeof row.position === 'string' ? JSON.parse(row.position) : row.position,
      created_at: new Date(row.created_at)
    };
  }
}
