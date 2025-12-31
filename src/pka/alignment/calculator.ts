/**
 * Strategic Alignment Calculator
 *
 * Calculates alignment scores using:
 * 1. Vector similarity (semantic alignment)
 * 2. Graph connectivity (structural alignment)
 * 3. Provenance chain strength (documentation support)
 *
 * Formula: Score = alpha * VectorSim + beta * GraphConn + gamma * Provenance
 */

import { UnifiedMemory } from '../../memory/index.js';
import { PyramidEntity, StoredAlignmentScore, AlignmentFactor } from '../types.js';
import { embedOne } from '../../embedding.js';

export interface AlignmentWeights {
  vector: number;
  graph: number;
  provenance: number;
}

const DEFAULT_WEIGHTS: AlignmentWeights = {
  vector: 0.5,
  graph: 0.3,
  provenance: 0.2
};

export class AlignmentCalculator {
  private memory: UnifiedMemory;
  private weights: AlignmentWeights;

  constructor(memory: UnifiedMemory, weights: AlignmentWeights = DEFAULT_WEIGHTS) {
    this.memory = memory;
    this.weights = weights;
  }

  /**
   * Calculate alignment score for a single entity
   */
  async calculateAlignment(entity: PyramidEntity): Promise<StoredAlignmentScore> {
    // 1. Calculate vector distance (semantic similarity to parent)
    const vectorDistance = await this.calculateVectorDistance(entity);

    // 2. Calculate graph connectivity
    const graphConnectivity = this.calculateGraphConnectivity(entity);

    // 3. Calculate provenance strength
    const provenanceStrength = this.calculateProvenanceStrength(entity);

    // 4. Calculate drift indicator
    const driftIndicator = this.calculateDriftIndicator(vectorDistance, graphConnectivity);

    // 5. Combine scores using weights
    const overall = this.combineScores(vectorDistance, graphConnectivity, provenanceStrength);

    // 6. Calculate confidence
    const confidence = this.calculateConfidence(entity);

    // 7. Build alignment factors
    const factors: AlignmentFactor[] = [
      {
        name: 'Vector Similarity',
        weight: this.weights.vector,
        score: vectorDistance,
        reason: 'Semantic alignment with parent entity'
      },
      {
        name: 'Graph Connectivity',
        weight: this.weights.graph,
        score: graphConnectivity,
        reason: 'Structural connections in knowledge graph'
      },
      {
        name: 'Provenance Strength',
        weight: this.weights.provenance,
        score: provenanceStrength,
        reason: 'Supporting documentation depth'
      }
    ];

    const timestamp = new Date().toISOString();
    return {
      // Base AlignmentScore properties
      entityId: entity.id,
      score: Math.round(overall * 100),
      vectorDistance,
      graphConnectivity,
      driftIndicator,
      confidence,
      lastCalculated: timestamp,
      // Extended StoredAlignmentScore properties
      overall,
      byLevel: { [entity.level]: overall },
      factors,
      calculatedAt: timestamp
    };
  }

  /**
   * Calculate batch alignments for multiple entities
   */
  async calculateBatchAlignment(entities: PyramidEntity[]): Promise<StoredAlignmentScore[]> {
    const scores: StoredAlignmentScore[] = [];
    for (const entity of entities) {
      const score = await this.calculateAlignment(entity);
      scores.push(score);
    }
    return scores;
  }

  /**
   * Calculate semantic distance using vector embeddings
   */
  private async calculateVectorDistance(entity: PyramidEntity): Promise<number> {
    try {
      // Generate embedding for entity
      // embedOne is called to ensure the entity text is embedded
      await embedOne(
        `${entity.name}: ${entity.description}`,
        384
      );

      // If no parent, return high alignment (mission level)
      if (!entity.parentId) {
        return 1.0;
      }

      // Search for parent in vector store
      const results = await this.memory.vectorSearch(entity.description, 5);

      // Find the best matching score
      const bestScore = results.length > 0 ? results[0].score : 0.5;

      return Math.min(bestScore, 1.0);
    } catch {
      // Return neutral score on error
      return 0.5;
    }
  }

  /**
   * Calculate structural connectivity in the graph
   */
  private calculateGraphConnectivity(entity: PyramidEntity): number {
    try {
      // Use graph store to find relationships
      const related = this.memory.findRelated(entity.id, 2);

      // Score based on connections
      const documentConnections = related.filter(r =>
        r.path.some(e => e.type === 'SUPPORTS')
      ).length;

      const entityConnections = related.filter(r =>
        r.path.some(e => e.type === 'ALIGNS_TO' || e.type === 'ADVANCES')
      ).length;

      // Has parent connection bonus
      const parentBonus = entity.parentId ? 0.3 : 0;

      // Normalize to 0-1
      const rawScore = (documentConnections * 0.1 + entityConnections * 0.15 + parentBonus);
      return Math.min(rawScore + 0.3, 1);
    } catch {
      return 0.3;
    }
  }

  /**
   * Calculate strength of provenance chain
   */
  private calculateProvenanceStrength(entity: PyramidEntity): number {
    // Score based on:
    // - Number of supporting documents
    // - Entity level (higher = more provenance expected)

    const docCount = entity.documentIds.length;
    const docScore = Math.min(docCount / 3, 1) * 0.5;

    // Level score - mission needs less provenance than task
    const levelScores: Record<string, number> = {
      mission: 1.0,
      vision: 0.9,
      objective: 0.8,
      goal: 0.7,
      portfolio: 0.6,
      program: 0.5,
      project: 0.4,
      task: 0.3
    };
    const levelScore = levelScores[entity.level] || 0.5;

    return (docScore + levelScore * 0.5);
  }

  /**
   * Calculate drift indicator
   */
  private calculateDriftIndicator(vectorDistance: number, graphConnectivity: number): number {
    // Positive = aligned, Negative = drifting
    const alignment = (vectorDistance + graphConnectivity) / 2;
    return alignment;
  }

  /**
   * Combine all scores using weights
   */
  private combineScores(vector: number, graph: number, provenance: number): number {
    return (
      vector * this.weights.vector +
      graph * this.weights.graph +
      provenance * this.weights.provenance
    );
  }

  /**
   * Calculate confidence in the score
   */
  private calculateConfidence(entity: PyramidEntity): number {
    let confidence = 0.5;

    if (entity.documentIds.length > 0) confidence += 0.2;
    if (entity.description.length > 50) confidence += 0.15;
    if (entity.parentId) confidence += 0.15;

    return Math.min(confidence, 1);
  }

  /**
   * Get alignment weights
   */
  getWeights(): AlignmentWeights {
    return { ...this.weights };
  }

  /**
   * Update alignment weights
   */
  setWeights(weights: Partial<AlignmentWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }
}

export function createAlignmentCalculator(
  memory: UnifiedMemory,
  weights?: AlignmentWeights
): AlignmentCalculator {
  return new AlignmentCalculator(memory, weights);
}
