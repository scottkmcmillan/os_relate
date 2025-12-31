/**
 * Mission Drift Detector
 *
 * Monitors entities for strategic drift using:
 * 1. Alignment score thresholds
 * 2. Trend analysis
 * 3. Connectivity monitoring
 */

import { UnifiedMemory } from '../../memory/index.js';
import { PyramidEntity, DriftAlert, AlignmentScore } from '../types.js';
import { AlignmentCalculator } from './calculator.js';

export interface DriftThresholds {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const DEFAULT_THRESHOLDS: DriftThresholds = {
  critical: 20,
  high: 40,
  medium: 60,
  low: 80
};

export class DriftDetector {
  private memory: UnifiedMemory;
  private calculator: AlignmentCalculator;
  private thresholds: DriftThresholds;

  constructor(
    memory: UnifiedMemory,
    thresholds: DriftThresholds = DEFAULT_THRESHOLDS
  ) {
    this.memory = memory;
    this.calculator = new AlignmentCalculator(memory);
    this.thresholds = thresholds;
  }

  /**
   * Detect drift across all entities in an organization
   */
  async detectDrift(
    entities: PyramidEntity[],
    minThreshold: number = 80
  ): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];

    for (const entity of entities) {
      // Calculate current alignment
      const alignment = await this.calculator.calculateAlignment(entity);

      // Check if drifting (below threshold)
      if (alignment.score < minThreshold) {
        const severity = this.determineSeverity(alignment.score);

        alerts.push({
          id: `drift-${entity.id}-${Date.now()}`,
          entityId: entity.id,
          severity,
          driftScore: (100 - alignment.score) / 100,
          message: this.generateDriftMessage(entity, alignment),
          suggestedAction: this.suggestAction(entity, alignment),
          detectedAt: new Date().toISOString(),
          acknowledged: false
        });
      }
    }

    // Sort by severity (critical first)
    return this.sortBySeverity(alerts);
  }

  /**
   * Detect drift for a single entity
   */
  async detectEntityDrift(entity: PyramidEntity): Promise<DriftAlert | null> {
    const alignment = await this.calculator.calculateAlignment(entity);

    if (alignment.score < this.thresholds.low) {
      return {
        id: `drift-${entity.id}-${Date.now()}`,
        entityId: entity.id,
        severity: this.determineSeverity(alignment.score),
        driftScore: (100 - alignment.score) / 100,
        message: this.generateDriftMessage(entity, alignment),
        suggestedAction: this.suggestAction(entity, alignment),
        detectedAt: new Date().toISOString(),
        acknowledged: false
      };
    }

    return null;
  }

  /**
   * Get drift summary for organization
   */
  async getDriftSummary(entities: PyramidEntity[]): Promise<{
    totalEntities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    alignedCount: number;
    averageAlignment: number;
  }> {
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let alignedCount = 0;
    let totalScore = 0;

    for (const entity of entities) {
      const alignment = await this.calculator.calculateAlignment(entity);
      totalScore += alignment.score;

      if (alignment.score < this.thresholds.critical) {
        criticalCount++;
      } else if (alignment.score < this.thresholds.high) {
        highCount++;
      } else if (alignment.score < this.thresholds.medium) {
        mediumCount++;
      } else if (alignment.score < this.thresholds.low) {
        lowCount++;
      } else {
        alignedCount++;
      }
    }

    return {
      totalEntities: entities.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      alignedCount,
      averageAlignment: Math.round(totalScore / entities.length) || 0
    };
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
  private generateDriftMessage(
    entity: PyramidEntity,
    alignment: AlignmentScore
  ): string {
    const scorePercent = alignment.score;
    const severity = this.determineSeverity(scorePercent);

    const severityText = {
      critical: 'CRITICAL: Severely misaligned',
      high: 'WARNING: Significantly drifting',
      medium: 'ATTENTION: Moderate drift detected',
      low: 'NOTICE: Minor alignment gap'
    };

    return `${severityText[severity]} - "${entity.name}" (${entity.level}) has ${scorePercent}% alignment. ` +
           `Vector distance: ${Math.round(alignment.vectorDistance * 100)}%, ` +
           `Graph connectivity: ${Math.round(alignment.graphConnectivity * 100)}%`;
  }

  /**
   * Suggest corrective action based on drift cause
   */
  private suggestAction(
    entity: PyramidEntity,
    alignment: AlignmentScore
  ): string {
    // Check primary drift cause
    if (alignment.vectorDistance < 0.4) {
      return 'SEMANTIC: Update description to better reflect strategic alignment with parent objectives. ' +
             'Consider rewriting to include key strategic terminology.';
    }

    if (alignment.graphConnectivity < 0.3) {
      return 'STRUCTURAL: Strengthen connections by linking supporting documents and ' +
             'establishing explicit relationships to strategic initiatives.';
    }

    if (entity.documentIds.length === 0) {
      return 'PROVENANCE: Add supporting documentation to establish strategic justification ' +
             'and create audit trail for alignment.';
    }

    // General recommendation
    if (alignment.score < this.thresholds.critical) {
      return 'URGENT: Schedule immediate alignment review with stakeholders. ' +
             'Consider reassessing strategic relevance or terminating initiative.';
    }

    return 'Schedule periodic alignment review and update strategic documentation.';
  }

  /**
   * Sort alerts by severity
   */
  private sortBySeverity(alerts: DriftAlert[]): DriftAlert[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Update thresholds
   */
  setThresholds(thresholds: Partial<DriftThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): DriftThresholds {
    return { ...this.thresholds };
  }
}

export function createDriftDetector(
  memory: UnifiedMemory,
  thresholds?: DriftThresholds
): DriftDetector {
  return new DriftDetector(memory, thresholds);
}
