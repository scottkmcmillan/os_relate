/**
 * Graph Edge Service
 *
 * Provides CRUD operations for graph_edges table in PostgreSQL.
 * Manages relationships between graph nodes with weighted connections.
 * All operations are scoped by user_id for multi-tenancy.
 */

import { randomUUID } from 'crypto';

/**
 * Graph edge structure matching database schema
 */
export interface GraphEdge {
  id: string;
  user_id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight: number;
  metadata: Record<string, any>;
  created_at: Date;
}

/**
 * Input type for creating a new graph edge
 */
export interface GraphEdgeCreate {
  source_id: string;
  target_id: string;
  type: string;
  weight?: number;
  metadata?: Record<string, any>;
}

/**
 * Database client interface (PostgreSQL)
 */
export interface DatabaseClient {
  query(sql: string, params: any[]): Promise<{ rows: any[] }>;
}

/**
 * Custom error for not found scenarios
 */
export class EdgeNotFoundError extends Error {
  constructor(edgeId: string) {
    super(`Graph edge not found: ${edgeId}`);
    this.name = 'EdgeNotFoundError';
  }
}

/**
 * Custom error for invalid edge scenarios
 */
export class InvalidEdgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEdgeError';
  }
}

/**
 * GraphEdgeService - CRUD operations for graph edges
 *
 * All operations are scoped by user_id to ensure data isolation.
 * Enforces referential integrity with graph_nodes table.
 */
export class GraphEdgeService {
  private db: DatabaseClient;

  constructor(database: DatabaseClient) {
    this.db = database;
  }

  /**
   * Create a new graph edge
   *
   * @param userId - User ID for data scoping
   * @param edge - Edge data to create
   * @returns The created edge with generated ID
   * @throws InvalidEdgeError if source/target nodes don't exist or are the same
   */
  async createEdge(userId: string, edge: GraphEdgeCreate): Promise<GraphEdge> {
    // Validate that source and target are different
    if (edge.source_id === edge.target_id) {
      throw new InvalidEdgeError('Cannot create self-referencing edge');
    }

    // Verify both nodes exist and belong to the user
    const nodeCheckSql = `
      SELECT id FROM graph_nodes
      WHERE user_id = $1 AND id = ANY($2::uuid[])
    `;

    const nodeCheck = await this.db.query(nodeCheckSql, [
      userId,
      [edge.source_id, edge.target_id]
    ]);

    if (nodeCheck.rows.length !== 2) {
      throw new InvalidEdgeError('Source or target node not found or does not belong to user');
    }

    const id = randomUUID();
    const weight = edge.weight ?? 0.5;
    const metadata = edge.metadata || {};
    const now = new Date();

    const sql = `
      INSERT INTO graph_edges (id, user_id, source_id, target_id, type, weight, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      id,
      userId,
      edge.source_id,
      edge.target_id,
      edge.type,
      weight,
      JSON.stringify(metadata),
      now
    ];

    const result = await this.db.query(sql, params);
    return this.mapRowToEdge(result.rows[0]);
  }

  /**
   * Get an edge by its ID
   *
   * @param userId - User ID for access control
   * @param edgeId - Edge ID to retrieve
   * @returns The edge or null if not found
   */
  async getEdge(userId: string, edgeId: string): Promise<GraphEdge | null> {
    const sql = `
      SELECT * FROM graph_edges
      WHERE id = $1 AND user_id = $2
    `;

    const result = await this.db.query(sql, [edgeId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEdge(result.rows[0]);
  }

  /**
   * Get all edges between two specific nodes
   *
   * @param userId - User ID for data scoping
   * @param sourceId - Source node ID
   * @param targetId - Target node ID
   * @returns Array of edges between the nodes (both directions)
   */
  async getEdgesBetween(
    userId: string,
    sourceId: string,
    targetId: string
  ): Promise<GraphEdge[]> {
    const sql = `
      SELECT * FROM graph_edges
      WHERE user_id = $1
        AND ((source_id = $2 AND target_id = $3) OR (source_id = $3 AND target_id = $2))
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(sql, [userId, sourceId, targetId]);
    return result.rows.map(row => this.mapRowToEdge(row));
  }

  /**
   * Get all edges connected to a node
   *
   * @param userId - User ID for data scoping
   * @param nodeId - Node ID to find edges for
   * @param direction - Filter by edge direction: 'in', 'out', or 'both' (default)
   * @returns Array of edges connected to the node
   */
  async getNodeEdges(
    userId: string,
    nodeId: string,
    direction: 'in' | 'out' | 'both' = 'both'
  ): Promise<GraphEdge[]> {
    let sql: string;

    switch (direction) {
      case 'in':
        sql = `
          SELECT * FROM graph_edges
          WHERE user_id = $1 AND target_id = $2
          ORDER BY created_at DESC
        `;
        break;
      case 'out':
        sql = `
          SELECT * FROM graph_edges
          WHERE user_id = $1 AND source_id = $2
          ORDER BY created_at DESC
        `;
        break;
      case 'both':
      default:
        sql = `
          SELECT * FROM graph_edges
          WHERE user_id = $1 AND (source_id = $2 OR target_id = $2)
          ORDER BY created_at DESC
        `;
        break;
    }

    const result = await this.db.query(sql, [userId, nodeId]);
    return result.rows.map(row => this.mapRowToEdge(row));
  }

  /**
   * Update an edge's properties
   *
   * @param userId - User ID for access control
   * @param edgeId - Edge ID to update
   * @param updates - Partial edge data to update
   * @returns The updated edge
   * @throws EdgeNotFoundError if edge doesn't exist
   */
  async updateEdge(
    userId: string,
    edgeId: string,
    updates: Partial<Omit<GraphEdge, 'id' | 'user_id' | 'source_id' | 'target_id' | 'created_at'>>
  ): Promise<GraphEdge> {
    // First verify the edge exists and belongs to the user
    const existing = await this.getEdge(userId, edgeId);
    if (!existing) {
      throw new EdgeNotFoundError(edgeId);
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      params.push(updates.type);
    }

    if (updates.weight !== undefined) {
      updateFields.push(`weight = $${paramIndex++}`);
      params.push(updates.weight);
    }

    if (updates.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(updates.metadata));
    }

    if (updateFields.length === 0) {
      return existing; // No updates requested
    }

    // Add WHERE clause parameters
    params.push(edgeId, userId);

    const sql = `
      UPDATE graph_edges
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await this.db.query(sql, params);
    return this.mapRowToEdge(result.rows[0]);
  }

  /**
   * Delete an edge
   *
   * @param userId - User ID for access control
   * @param edgeId - Edge ID to delete
   * @throws EdgeNotFoundError if edge doesn't exist
   */
  async deleteEdge(userId: string, edgeId: string): Promise<void> {
    const sql = `
      DELETE FROM graph_edges
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await this.db.query(sql, [edgeId, userId]);

    if (result.rows.length === 0) {
      throw new EdgeNotFoundError(edgeId);
    }
  }

  /**
   * Get edges by type
   *
   * @param userId - User ID for data scoping
   * @param type - Edge type to filter by
   * @returns Array of matching edges
   */
  async getEdgesByType(userId: string, type: string): Promise<GraphEdge[]> {
    const sql = `
      SELECT * FROM graph_edges
      WHERE user_id = $1 AND type = $2
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(sql, [userId, type]);
    return result.rows.map(row => this.mapRowToEdge(row));
  }

  /**
   * Map database row to GraphEdge object
   *
   * @param row - Database row
   * @returns GraphEdge object
   */
  private mapRowToEdge(row: any): GraphEdge {
    return {
      id: row.id,
      user_id: row.user_id,
      source_id: row.source_id,
      target_id: row.target_id,
      type: row.type,
      weight: parseFloat(row.weight),
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      created_at: new Date(row.created_at)
    };
  }
}
