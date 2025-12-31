/**
 * Relationship Insights Service (S6: Missing Service)
 *
 * Detects patterns, generates insights, and provides actionable recommendations
 * for improving relationships based on interaction data.
 *
 * @module relate/interactions/insights
 */

import { v4 as uuidv4 } from 'uuid';
import { Interaction, EmotionType } from './service';
import { RelationshipMetrics } from './metrics';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type InsightType = 'pattern' | 'opportunity' | 'concern' | 'milestone';
export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RelationshipInsight {
  id: string;
  userId: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  relatedPeople?: string[];
  relatedInteractions?: string[];
  actionSuggestion?: string;
  confidence: number; // 0.0 - 1.0
  createdAt: Date;
  acknowledgedAt?: Date;
}

export interface Pattern {
  id: string;
  type: 'recurring_conflict' | 'positive_momentum' | 'communication_gap' | 'value_alignment';
  description: string;
  frequency: number;
  firstDetected: Date;
  lastDetected: Date;
  relatedPeople: string[];
  confidence: number;
}

export interface ValueAlignment {
  id: string;
  valueId: string;
  valueName: string;
  alignmentScore: number; // 0.0 - 1.0
  supportingInteractions: string[];
  contradictingInteractions: string[];
  trend: 'improving' | 'stable' | 'declining';
  recommendation?: string;
}

// ============================================================================
// In-Memory Storage
// ============================================================================

class InsightsStore {
  private insights: Map<string, RelationshipInsight> = new Map();
  private patterns: Map<string, Pattern> = new Map();
  private valueAlignments: Map<string, ValueAlignment> = new Map();

  // Insights
  getInsights(userId: string): RelationshipInsight[] {
    return Array.from(this.insights.values())
      .filter(i => i.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getUnacknowledgedInsights(userId: string): RelationshipInsight[] {
    return this.getInsights(userId)
      .filter(i => !i.acknowledgedAt);
  }

  createInsight(insight: RelationshipInsight): void {
    this.insights.set(insight.id, insight);
  }

  acknowledgeInsight(insightId: string): void {
    const insight = this.insights.get(insightId);
    if (insight && !insight.acknowledgedAt) {
      insight.acknowledgedAt = new Date();
    }
  }

  // Patterns
  getPatterns(userId: string): Pattern[] {
    // In production, would filter by userId
    return Array.from(this.patterns.values());
  }

  createPattern(pattern: Pattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  // Value Alignments
  getValueAlignments(userId: string): ValueAlignment[] {
    // In production, would filter by userId
    return Array.from(this.valueAlignments.values());
  }

  createValueAlignment(alignment: ValueAlignment): void {
    this.valueAlignments.set(alignment.id, alignment);
  }
}

// Singleton store instance
const store = new InsightsStore();

// ============================================================================
// Relationship Insights Service Implementation
// ============================================================================

export class RelationshipInsightsService {
  /**
   * Detect insights from interaction and metrics data
   */
  async detect(
    userId: string,
    interactions: Interaction[],
    metrics: RelationshipMetrics[]
  ): Promise<RelationshipInsight[]> {
    const insights: RelationshipInsight[] = [];

    // Detect neglected relationships
    insights.push(...this.detectNeglectedRelationships(userId, metrics));

    // Detect positive momentum
    insights.push(...this.detectPositiveMomentum(userId, metrics));

    // Detect recurring patterns
    insights.push(...this.detectRecurringPatterns(userId, interactions));

    // Detect milestones
    insights.push(...this.detectMilestones(userId, interactions));

    // Store insights
    insights.forEach(insight => store.createInsight(insight));

    return insights;
  }

  /**
   * Acknowledge an insight
   */
  async acknowledge(userId: string, insightId: string): Promise<void> {
    const insights = store.getInsights(userId);
    const insight = insights.find(i => i.id === insightId);

    if (!insight) {
      throw new Error('Insight not found');
    }

    store.acknowledgeInsight(insightId);
  }

  /**
   * Detect patterns in interactions
   */
  async detectPatterns(userId: string, interactions: Interaction[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Detect recurring conflicts with specific people
    patterns.push(...this.detectConflictPatterns(interactions));

    // Detect communication gaps
    patterns.push(...this.detectCommunicationGaps(interactions));

    // Detect value alignment patterns
    patterns.push(...this.detectValueAlignmentPatterns(interactions));

    // Store patterns
    patterns.forEach(pattern => store.createPattern(pattern));

    return patterns;
  }

  /**
   * Detect value alignments
   */
  async detectValueAlignments(userId: string, interactions: Interaction[]): Promise<ValueAlignment[]> {
    const alignments: ValueAlignment[] = [];

    // Group interactions by linked values
    const valueMap: Record<string, Interaction[]> = {};

    interactions.forEach(interaction => {
      interaction.linkedValues.forEach(valueId => {
        if (!valueMap[valueId]) {
          valueMap[valueId] = [];
        }
        valueMap[valueId].push(interaction);
      });
    });

    // Calculate alignment for each value
    Object.entries(valueMap).forEach(([valueId, valueInteractions]) => {
      const alignment = this.calculateValueAlignment(valueId, valueInteractions);
      alignments.push(alignment);
      store.createValueAlignment(alignment);
    });

    return alignments;
  }

  // ============================================================================
  // Detection Methods
  // ============================================================================

  private detectNeglectedRelationships(
    userId: string,
    metrics: RelationshipMetrics[]
  ): RelationshipInsight[] {
    const insights: RelationshipInsight[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    metrics.forEach(metric => {
      if (metric.lastInteraction < thirtyDaysAgo && metric.healthScore > 0.5) {
        insights.push({
          id: `ins_${uuidv4()}`,
          userId,
          type: 'concern',
          severity: 'medium',
          title: `Haven't connected with ${metric.person} recently`,
          description: `It's been ${this.getDaysSince(metric.lastInteraction)} days since your last interaction. This relationship has been important to you.`,
          relatedPeople: [metric.person],
          actionSuggestion: `Consider reaching out to ${metric.person} this week`,
          confidence: 0.85,
          createdAt: new Date()
        });
      }
    });

    return insights;
  }

  private detectPositiveMomentum(
    userId: string,
    metrics: RelationshipMetrics[]
  ): RelationshipInsight[] {
    const insights: RelationshipInsight[] = [];

    metrics.forEach(metric => {
      if (metric.trendDirection === 'improving' && metric.healthScore > 0.7) {
        insights.push({
          id: `ins_${uuidv4()}`,
          userId,
          type: 'opportunity',
          severity: 'low',
          title: `Positive momentum with ${metric.person}`,
          description: `Your relationship with ${metric.person} is improving! Health score: ${(metric.healthScore * 100).toFixed(0)}%`,
          relatedPeople: [metric.person],
          actionSuggestion: `Keep up the positive interactions`,
          confidence: 0.75,
          createdAt: new Date()
        });
      }
    });

    return insights;
  }

  private detectRecurringPatterns(
    userId: string,
    interactions: Interaction[]
  ): RelationshipInsight[] {
    const insights: RelationshipInsight[] = [];

    // Detect recurring negative emotions with specific people
    const personEmotionMap: Record<string, Record<EmotionType, number>> = {};

    interactions.forEach(interaction => {
      if (!personEmotionMap[interaction.person]) {
        personEmotionMap[interaction.person] = {} as Record<EmotionType, number>;
      }

      interaction.emotions.forEach(emotion => {
        personEmotionMap[interaction.person][emotion] =
          (personEmotionMap[interaction.person][emotion] || 0) + 1;
      });
    });

    // Check for concerning patterns
    Object.entries(personEmotionMap).forEach(([person, emotions]) => {
      const negativeEmotions: EmotionType[] = ['anger', 'fear', 'sadness'];
      const totalNegative = negativeEmotions.reduce(
        (sum, emotion) => sum + (emotions[emotion] || 0), 0
      );

      const personInteractions = interactions.filter(i => i.person === person);
      const negativeRatio = totalNegative / personInteractions.length;

      if (negativeRatio > 0.5 && personInteractions.length >= 3) {
        insights.push({
          id: `ins_${uuidv4()}`,
          userId,
          type: 'pattern',
          severity: 'high',
          title: `Recurring negative emotions with ${person}`,
          description: `${(negativeRatio * 100).toFixed(0)}% of interactions with ${person} involve negative emotions`,
          relatedPeople: [person],
          actionSuggestion: `Consider addressing underlying issues or seeking professional guidance`,
          confidence: 0.8,
          createdAt: new Date()
        });
      }
    });

    return insights;
  }

  private detectMilestones(
    userId: string,
    interactions: Interaction[]
  ): RelationshipInsight[] {
    const insights: RelationshipInsight[] = [];

    // Group by person
    const personMap: Record<string, Interaction[]> = {};
    interactions.forEach(i => {
      if (!personMap[i.person]) {
        personMap[i.person] = [];
      }
      personMap[i.person].push(i);
    });

    // Check for milestone counts
    const milestones = [10, 25, 50, 100, 250, 500];

    Object.entries(personMap).forEach(([person, personInteractions]) => {
      const count = personInteractions.length;

      if (milestones.includes(count)) {
        insights.push({
          id: `ins_${uuidv4()}`,
          userId,
          type: 'milestone',
          severity: 'low',
          title: `${count} interactions with ${person}!`,
          description: `You've reached ${count} recorded interactions with ${person}. That's a significant relationship!`,
          relatedPeople: [person],
          confidence: 1.0,
          createdAt: new Date()
        });
      }
    });

    return insights;
  }

  private detectConflictPatterns(interactions: Interaction[]): Pattern[] {
    const patterns: Pattern[] = [];
    const conflictInteractions = interactions.filter(i => i.type === 'conflict');

    if (conflictInteractions.length < 3) {
      return patterns;
    }

    // Group by person
    const personConflicts: Record<string, Interaction[]> = {};
    conflictInteractions.forEach(i => {
      if (!personConflicts[i.person]) {
        personConflicts[i.person] = [];
      }
      personConflicts[i.person].push(i);
    });

    // Detect patterns for people with 3+ conflicts
    Object.entries(personConflicts).forEach(([person, conflicts]) => {
      if (conflicts.length >= 3) {
        conflicts.sort((a, b) => a.date.getTime() - b.date.getTime());

        patterns.push({
          id: `pat_${uuidv4()}`,
          type: 'recurring_conflict',
          description: `Recurring conflicts detected with ${person}`,
          frequency: conflicts.length,
          firstDetected: conflicts[0].date,
          lastDetected: conflicts[conflicts.length - 1].date,
          relatedPeople: [person],
          confidence: 0.8
        });
      }
    });

    return patterns;
  }

  private detectCommunicationGaps(interactions: Interaction[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Group by person
    const personInteractions: Record<string, Interaction[]> = {};
    interactions.forEach(i => {
      if (!personInteractions[i.person]) {
        personInteractions[i.person] = [];
      }
      personInteractions[i.person].push(i);
    });

    // Check for large gaps between interactions
    Object.entries(personInteractions).forEach(([person, personInts]) => {
      if (personInts.length < 2) return;

      personInts.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Find largest gap
      let maxGap = 0;
      for (let i = 1; i < personInts.length; i++) {
        const gap = personInts[i].date.getTime() - personInts[i - 1].date.getTime();
        maxGap = Math.max(maxGap, gap);
      }

      const maxGapDays = maxGap / (1000 * 60 * 60 * 24);

      if (maxGapDays > 60) {
        patterns.push({
          id: `pat_${uuidv4()}`,
          type: 'communication_gap',
          description: `Long communication gaps with ${person} (up to ${Math.floor(maxGapDays)} days)`,
          frequency: 1,
          firstDetected: personInts[0].date,
          lastDetected: personInts[personInts.length - 1].date,
          relatedPeople: [person],
          confidence: 0.7
        });
      }
    });

    return patterns;
  }

  private detectValueAlignmentPatterns(interactions: Interaction[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Find interactions with high value alignment
    const alignedInteractions = interactions.filter(
      i => i.valueAlignmentScore && i.valueAlignmentScore > 0.8
    );

    if (alignedInteractions.length >= 5) {
      const people = [...new Set(alignedInteractions.map(i => i.person))];

      patterns.push({
        id: `pat_${uuidv4()}`,
        type: 'value_alignment',
        description: `Strong value alignment detected across ${alignedInteractions.length} interactions`,
        frequency: alignedInteractions.length,
        firstDetected: alignedInteractions[0].date,
        lastDetected: alignedInteractions[alignedInteractions.length - 1].date,
        relatedPeople: people,
        confidence: 0.85
      });
    }

    return patterns;
  }

  private calculateValueAlignment(valueId: string, interactions: Interaction[]): ValueAlignment {
    const supportingInteractions = interactions.filter(i => i.outcome === 'positive');
    const contradictingInteractions = interactions.filter(i => i.outcome === 'negative');

    const alignmentScore = supportingInteractions.length / interactions.length;

    // Determine trend (simplified - would use historical data in production)
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (alignmentScore > 0.7) trend = 'improving';
    if (alignmentScore < 0.4) trend = 'declining';

    return {
      id: `val_align_${uuidv4()}`,
      valueId,
      valueName: 'Core Value', // Would fetch from values service
      alignmentScore,
      supportingInteractions: supportingInteractions.map(i => i.id),
      contradictingInteractions: contradictingInteractions.map(i => i.id),
      trend,
      recommendation: alignmentScore < 0.5
        ? 'Consider how to better align future interactions with this value'
        : undefined
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

// ============================================================================
// Export Service Instance
// ============================================================================

export const relationshipInsightsService = new RelationshipInsightsService();
export default relationshipInsightsService;
