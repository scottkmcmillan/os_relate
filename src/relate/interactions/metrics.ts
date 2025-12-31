/**
 * Relationship Metrics Service (S5: Missing Service)
 *
 * Calculates per-person relationship metrics, tracks metric history,
 * and identifies top/neglected relationships.
 *
 * @module relate/interactions/metrics
 */

import { Interaction, InteractionOutcome, Period } from './service';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface RelationshipMetrics {
  id: string;
  userId: string;
  person: string;
  interactionCount: number;
  lastInteraction: Date;
  firstInteraction: Date;
  positiveRatio: number; // 0.0 - 1.0
  dominantEmotions: string[];
  healthScore: number; // 0.0 - 1.0
  averageDuration?: number; // minutes
  interactionFrequency: number; // per month
  trendDirection: 'improving' | 'stable' | 'declining';
  calculatedAt: Date;
}

export interface RelationshipMetricsHistory {
  metricsId: string;
  period: string; // ISO date
  metrics: RelationshipMetrics;
}

// ============================================================================
// In-Memory Storage
// ============================================================================

class MetricsStore {
  private metrics: Map<string, RelationshipMetrics> = new Map();
  private history: Map<string, RelationshipMetricsHistory[]> = new Map();

  // Current metrics
  getMetrics(userId: string, person: string): RelationshipMetrics | null {
    const key = `${userId}:${person}`;
    return this.metrics.get(key) || null;
  }

  setMetrics(metrics: RelationshipMetrics): void {
    const key = `${metrics.userId}:${metrics.person}`;
    this.metrics.set(key, metrics);
  }

  getAllMetrics(userId: string): RelationshipMetrics[] {
    return Array.from(this.metrics.values())
      .filter(m => m.userId === userId);
  }

  // Historical metrics
  addHistory(userId: string, person: string, metrics: RelationshipMetrics): void {
    const key = `${userId}:${person}`;
    const history = this.history.get(key) || [];

    history.push({
      metricsId: metrics.id,
      period: new Date().toISOString().split('T')[0],
      metrics
    });

    // Keep only last 52 weeks of history
    if (history.length > 52) {
      history.shift();
    }

    this.history.set(key, history);
  }

  getHistory(userId: string, person: string): RelationshipMetricsHistory[] {
    const key = `${userId}:${person}`;
    return this.history.get(key) || [];
  }
}

// Singleton store instance
const store = new MetricsStore();

// ============================================================================
// Relationship Metrics Service Implementation
// ============================================================================

export class RelationshipMetricsService {
  /**
   * Calculate metrics for a specific person
   */
  async calculate(
    userId: string,
    person: string,
    interactions: Interaction[]
  ): Promise<RelationshipMetrics> {
    const personInteractions = interactions.filter(i => i.person === person);

    if (personInteractions.length === 0) {
      throw new Error(`No interactions found for ${person}`);
    }

    // Sort by date
    personInteractions.sort((a, b) => a.date.getTime() - b.date.getTime());

    const firstInteraction = personInteractions[0].date;
    const lastInteraction = personInteractions[personInteractions.length - 1].date;

    // Calculate positive ratio
    const positiveCount = personInteractions.filter(
      i => i.outcome === 'positive'
    ).length;
    const positiveRatio = positiveCount / personInteractions.length;

    // Calculate dominant emotions
    const emotionCounts: Record<string, number> = {};
    personInteractions.forEach(i => {
      i.emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });

    const dominantEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion]) => emotion);

    // Calculate average duration
    const durationsWithValue = personInteractions.filter(i => i.duration !== undefined);
    const averageDuration = durationsWithValue.length > 0
      ? durationsWithValue.reduce((sum, i) => sum + (i.duration || 0), 0) / durationsWithValue.length
      : undefined;

    // Calculate interaction frequency (per month)
    const daysSinceFirst = (Date.now() - firstInteraction.getTime()) / (1000 * 60 * 60 * 24);
    const monthsSinceFirst = Math.max(daysSinceFirst / 30, 1);
    const interactionFrequency = personInteractions.length / monthsSinceFirst;

    // Calculate health score (0.0 - 1.0)
    const healthScore = this.calculateHealthScore(
      positiveRatio,
      interactionFrequency,
      lastInteraction
    );

    // Determine trend direction
    const trendDirection = this.calculateTrend(userId, person, healthScore);

    const metrics: RelationshipMetrics = {
      id: `met_${uuidv4()}`,
      userId,
      person,
      interactionCount: personInteractions.length,
      lastInteraction,
      firstInteraction,
      positiveRatio,
      dominantEmotions,
      healthScore,
      averageDuration,
      interactionFrequency,
      trendDirection,
      calculatedAt: new Date()
    };

    // Store metrics and history
    store.setMetrics(metrics);
    store.addHistory(userId, person, metrics);

    return metrics;
  }

  /**
   * Get historical metrics for a person
   */
  async getHistory(userId: string, person: string, period: Period): Promise<RelationshipMetrics[]> {
    const history = store.getHistory(userId, person);

    // Filter by period
    const cutoffDate = this.getCutoffDate(period);
    const filtered = history.filter(h =>
      new Date(h.period) >= cutoffDate
    );

    return filtered.map(h => h.metrics);
  }

  /**
   * Get top relationships by health score
   */
  async getTopRelationships(userId: string, limit: number = 10): Promise<RelationshipMetrics[]> {
    const allMetrics = store.getAllMetrics(userId);

    return allMetrics
      .sort((a, b) => b.healthScore - a.healthScore)
      .slice(0, limit);
  }

  /**
   * Get neglected relationships (no interaction in X days)
   */
  async getNeglectedRelationships(
    userId: string,
    daysThreshold: number = 30
  ): Promise<string[]> {
    const allMetrics = store.getAllMetrics(userId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    return allMetrics
      .filter(m => m.lastInteraction < cutoffDate)
      .map(m => m.person)
      .sort();
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate relationship health score (0.0 - 1.0)
   */
  private calculateHealthScore(
    positiveRatio: number,
    frequency: number,
    lastInteraction: Date
  ): number {
    // Component 1: Positive ratio (40% weight)
    const positiveScore = positiveRatio * 0.4;

    // Component 2: Frequency score (30% weight)
    // Normalize frequency to 0-1 (assuming 4 interactions/month is ideal)
    const frequencyScore = Math.min(frequency / 4, 1.0) * 0.3;

    // Component 3: Recency score (30% weight)
    const daysSinceLastInteraction = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysSinceLastInteraction / 60)) * 0.3; // 60 days = 0 score

    return Math.min(positiveScore + frequencyScore + recencyScore, 1.0);
  }

  /**
   * Calculate trend direction based on historical data
   */
  private calculateTrend(
    userId: string,
    person: string,
    currentHealthScore: number
  ): 'improving' | 'stable' | 'declining' {
    const history = store.getHistory(userId, person);

    if (history.length < 2) {
      return 'stable';
    }

    // Compare current with average of last 3 periods
    const recentHistory = history.slice(-3);
    const avgPreviousScore = recentHistory.reduce(
      (sum, h) => sum + h.metrics.healthScore, 0
    ) / recentHistory.length;

    const change = currentHealthScore - avgPreviousScore;

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Get cutoff date for period
   */
  private getCutoffDate(period: Period): Date {
    const now = new Date();
    const date = new Date(now);

    switch (period) {
      case 'day':
        date.setDate(date.getDate() - 1);
        break;
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'quarter':
        date.setMonth(date.getMonth() - 3);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }

    return date;
  }
}

// ============================================================================
// Export Service Instance
// ============================================================================

export const relationshipMetricsService = new RelationshipMetricsService();
export default relationshipMetricsService;
