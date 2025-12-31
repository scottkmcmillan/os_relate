/**
 * Graph Services Module
 *
 * Provides a unified interface for graph node and edge operations.
 * Combines GraphNodeService and GraphEdgeService into a cohesive API.
 *
 * Usage:
 * ```typescript
 * const graphService = new GraphService(database);
 *
 * // Create nodes
 * const node1 = await graphService.createNode(userId, {
 *   type: 'person',
 *   label: 'Alice',
 *   metadata: { role: 'friend' }
 * });
 *
 * const node2 = await graphService.createNode(userId, {
 *   type: 'person',
 *   label: 'Bob',
 *   metadata: { role: 'colleague' }
 * });
 *
 * // Create edge between nodes
 * const edge = await graphService.createEdge(userId, {
 *   source_id: node1.id,
 *   target_id: node2.id,
 *   type: 'knows',
 *   weight: 0.8
 * });
 *
 * // Find connected nodes
 * const connected = await graphService.findConnectedNodes(userId, node1.id, 2);
 * ```
 */

import { DatabaseClient } from './nodeService.js';
import {
  GraphNodeService,
  GraphNode,
  GraphNodeCreate,
  RelateNodeType,
  NodeNotFoundError
} from './nodeService.js';
import {
  GraphEdgeService,
  GraphEdge,
  GraphEdgeCreate,
  EdgeNotFoundError,
  InvalidEdgeError
} from './edgeService.js';

// Re-export types for convenience
export type {
  GraphNode,
  GraphNodeCreate,
  RelateNodeType,
  GraphEdge,
  GraphEdgeCreate,
  DatabaseClient
};

export {
  NodeNotFoundError,
  EdgeNotFoundError,
  InvalidEdgeError,
  GraphNodeService,
  GraphEdgeService
};

/**
 * Graph traversal result with path information
 */
export interface GraphTraversalResult {
  node: GraphNode;
  edges: GraphEdge[];
  depth: number;
}

/**
 * Subgraph containing nodes and their relationships
 */
export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  center_node_id: string;
  max_depth: number;
}

/**
 * GraphService - Unified facade for graph operations
 *
 * Combines node and edge services into a single, cohesive API.
 * Provides high-level graph operations like subgraph extraction,
 * neighbor finding, and relationship management.
 */
export class GraphService {
  private nodeService: GraphNodeService;
  private edgeService: GraphEdgeService;

  constructor(database: DatabaseClient) {
    this.nodeService = new GraphNodeService(database);
    this.edgeService = new GraphEdgeService(database);
  }

  // ============================================================================
  // Node Operations (delegated to GraphNodeService)
  // ============================================================================

  /**
   * Create a new graph node
   */
  async createNode(userId: string, node: GraphNodeCreate): Promise<GraphNode> {
    return this.nodeService.createNode(userId, node);
  }

  /**
   * Get a node by ID
   */
  async getNode(userId: string, nodeId: string): Promise<GraphNode | null> {
    return this.nodeService.getNode(userId, nodeId);
  }

  /**
   * Get nodes by type
   */
  async getNodesByType(userId: string, type: RelateNodeType): Promise<GraphNode[]> {
    return this.nodeService.getNodesByType(userId, type);
  }

  /**
   * Update a node
   */
  async updateNode(
    userId: string,
    nodeId: string,
    updates: Partial<GraphNode>
  ): Promise<GraphNode> {
    return this.nodeService.updateNode(userId, nodeId, updates);
  }

  /**
   * Delete a node (also deletes connected edges via CASCADE)
   */
  async deleteNode(userId: string, nodeId: string): Promise<void> {
    return this.nodeService.deleteNode(userId, nodeId);
  }

  // ============================================================================
  // Edge Operations (delegated to GraphEdgeService)
  // ============================================================================

  /**
   * Create a new graph edge
   */
  async createEdge(userId: string, edge: GraphEdgeCreate): Promise<GraphEdge> {
    return this.edgeService.createEdge(userId, edge);
  }

  /**
   * Get an edge by ID
   */
  async getEdge(userId: string, edgeId: string): Promise<GraphEdge | null> {
    return this.edgeService.getEdge(userId, edgeId);
  }

  /**
   * Get edges between two nodes
   */
  async getEdgesBetween(
    userId: string,
    sourceId: string,
    targetId: string
  ): Promise<GraphEdge[]> {
    return this.edgeService.getEdgesBetween(userId, sourceId, targetId);
  }

  /**
   * Get edges connected to a node
   */
  async getNodeEdges(
    userId: string,
    nodeId: string,
    direction: 'in' | 'out' | 'both' = 'both'
  ): Promise<GraphEdge[]> {
    return this.edgeService.getNodeEdges(userId, nodeId, direction);
  }

  /**
   * Update an edge
   */
  async updateEdge(
    userId: string,
    edgeId: string,
    updates: Partial<GraphEdge>
  ): Promise<GraphEdge> {
    return this.edgeService.updateEdge(userId, edgeId, updates);
  }

  /**
   * Delete an edge
   */
  async deleteEdge(userId: string, edgeId: string): Promise<void> {
    return this.edgeService.deleteEdge(userId, edgeId);
  }

  // ============================================================================
  // High-Level Graph Operations
  // ============================================================================

  /**
   * Find all nodes connected to a given node
   *
   * @param userId - User ID for data scoping
   * @param nodeId - Starting node ID
   * @param depth - Maximum traversal depth
   * @returns Array of connected nodes
   */
  async findConnectedNodes(
    userId: string,
    nodeId: string,
    depth: number = 1
  ): Promise<GraphNode[]> {
    return this.nodeService.findConnectedNodes(userId, nodeId, depth);
  }

  /**
   * Get immediate neighbors of a node with their connecting edges
   *
   * @param userId - User ID for data scoping
   * @param nodeId - Center node ID
   * @returns Object containing neighbor nodes and connecting edges
   */
  async getNeighbors(userId: string, nodeId: string): Promise<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  }> {
    const edges = await this.edgeService.getNodeEdges(userId, nodeId, 'both');
    const nodeIds = new Set<string>();

    edges.forEach(edge => {
      if (edge.source_id !== nodeId) nodeIds.add(edge.source_id);
      if (edge.target_id !== nodeId) nodeIds.add(edge.target_id);
    });

    const nodes: GraphNode[] = [];
    for (const id of nodeIds) {
      const node = await this.nodeService.getNode(userId, id);
      if (node) nodes.push(node);
    }

    return { nodes, edges };
  }

  /**
   * Extract a subgraph centered on a node
   *
   * @param userId - User ID for data scoping
   * @param centerNodeId - Center node ID
   * @param maxDepth - Maximum distance from center
   * @returns Subgraph containing all nodes and edges within max depth
   */
  async getSubgraph(
    userId: string,
    centerNodeId: string,
    maxDepth: number = 2
  ): Promise<Subgraph> {
    const centerNode = await this.nodeService.getNode(userId, centerNodeId);
    if (!centerNode) {
      throw new NodeNotFoundError(centerNodeId);
    }

    const connectedNodes = await this.nodeService.findConnectedNodes(
      userId,
      centerNodeId,
      maxDepth
    );

    const allNodes = [centerNode, ...connectedNodes];
    const nodeIds = new Set(allNodes.map(n => n.id));

    // Get all edges between nodes in the subgraph
    const allEdges: GraphEdge[] = [];
    for (const nodeId of nodeIds) {
      const edges = await this.edgeService.getNodeEdges(userId, nodeId, 'out');
      // Only include edges where both source and target are in the subgraph
      const relevantEdges = edges.filter(e => nodeIds.has(e.target_id));
      allEdges.push(...relevantEdges);
    }

    // Deduplicate edges
    const uniqueEdges = Array.from(
      new Map(allEdges.map(e => [e.id, e])).values()
    );

    return {
      nodes: allNodes,
      edges: uniqueEdges,
      center_node_id: centerNodeId,
      max_depth: maxDepth
    };
  }

  /**
   * Find shortest path between two nodes
   *
   * @param userId - User ID for data scoping
   * @param sourceId - Source node ID
   * @param targetId - Target node ID
   * @returns Array of nodes representing the path, or null if no path exists
   */
  async findPath(
    userId: string,
    sourceId: string,
    targetId: string
  ): Promise<GraphNode[] | null> {
    // Verify both nodes exist
    const [sourceNode, targetNode] = await Promise.all([
      this.nodeService.getNode(userId, sourceId),
      this.nodeService.getNode(userId, targetId)
    ]);

    if (!sourceNode || !targetNode) {
      return null;
    }

    // BFS to find shortest path
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: sourceId, path: [sourceId] }
    ];
    const visited = new Set<string>([sourceId]);

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === targetId) {
        // Found path - convert node IDs to nodes
        const nodes: GraphNode[] = [];
        for (const id of path) {
          const node = await this.nodeService.getNode(userId, id);
          if (node) nodes.push(node);
        }
        return nodes;
      }

      // Get outgoing edges
      const edges = await this.edgeService.getNodeEdges(userId, nodeId, 'out');

      for (const edge of edges) {
        if (!visited.has(edge.target_id)) {
          visited.add(edge.target_id);
          queue.push({
            nodeId: edge.target_id,
            path: [...path, edge.target_id]
          });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Get node degree (number of connections)
   *
   * @param userId - User ID for data scoping
   * @param nodeId - Node ID
   * @returns Object with in-degree, out-degree, and total degree
   */
  async getNodeDegree(userId: string, nodeId: string): Promise<{
    in: number;
    out: number;
    total: number;
  }> {
    const [inEdges, outEdges] = await Promise.all([
      this.edgeService.getNodeEdges(userId, nodeId, 'in'),
      this.edgeService.getNodeEdges(userId, nodeId, 'out')
    ]);

    return {
      in: inEdges.length,
      out: outEdges.length,
      total: inEdges.length + outEdges.length
    };
  }
}
