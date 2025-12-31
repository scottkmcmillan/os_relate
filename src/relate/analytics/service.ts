import { prisma } from '../../lib/prisma';
import { AccountabilityEngine } from './accountability';
import { PatternDetector } from './patterns';
import { redisClient } from '../../lib/redis';

export interface WeeklySummary {
  weekOf: Date;
  totalInteractions: number;
  positiveOutcomeRate: number;
  topEmotions: string[];
  focusAreaProgress: FocusProgress[];
  keyInsights: string[];
  recommendations: string[];
}

export interface FocusProgress {
  focusAreaId: string;
  focusAreaName: string;
  completedInteractions: number;
  totalInteractions: number;
  completionRate: number;
  trend: 'improving' | 'stable' | 'declining';
  lastInteractionAt?: Date;
}

export interface PatternAnalysis {
  communicationPatterns: CommunicationPattern[];
  emotionalTrends: EmotionTrend[];
  relationshipHealthScores: { person: string; score: number }[];
  growthAreas: string[];
}

export interface CommunicationPattern {
  type: 'avoidance' | 'directness' | 'passive_aggressive' | 'assertive';
  frequency: number;
  contexts: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: number;
}

export interface EmotionTrend {
  emotion: string;
  frequency: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  associatedPeople: string[];
  associatedOutcomes: string[];
  confidence: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  streakType: 'daily' | 'weekly';
  lastInteractionDate?: Date;
  nextMilestone: number;
}

export interface AccountabilityAlert {
  id: string;
  userId: string;
  type: 'value_contradiction' | 'goal_drift' | 'pattern_detected' | 'neglected_area';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  evidence: string[];
  suggestedActions: string[];
  createdAt: Date;
  acknowledgedAt?: Date;
  dismissedAt?: Date;
  dismissReason?: string;
}

export interface DriftAlert {
  id: string;
  type: 'value_drift' | 'goal_drift' | 'behavior_drift';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
  relatedValues?: string[];
  relatedGoals?: string[];
  suggestedActions: string[];
  confidence: number;
  metrics: {
    alignmentScore: number;
    trendChange: number;
    daysDetected: number;
  };
}

export interface RealTimeDriftData {
  currentAlignment: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  alerts: DriftAlert[];
  lastChecked: Date;
  metrics: {
    valueAlignment: number;
    goalAlignment: number;
    behaviorAlignment: number;
  };
}

export type Period = 'week' | 'month' | 'quarter' | 'year';

export class AnalyticsService {
  private accountabilityEngine: AccountabilityEngine;
  private patternDetector: PatternDetector;
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    this.accountabilityEngine = new AccountabilityEngine();
    this.patternDetector = new PatternDetector();
  }

  /**
   * Get weekly summary for a user
   */
  async getWeeklySummary(userId: string, weekOf?: Date): Promise<WeeklySummary> {
    const targetDate = weekOf || new Date();
    const cacheKey = `weekly-summary:${userId}:${targetDate.toISOString().split('T')[0]}`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Generate new summary
    const summary = await this.generateWeeklySummary(userId, targetDate);

    // Cache result
    await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(summary));

    return summary;
  }

  /**
   * Generate weekly summary
   */
  async generateWeeklySummary(userId: string, weekOf: Date = new Date()): Promise<WeeklySummary> {
    const weekStart = this.getWeekStart(weekOf);
    const weekEnd = this.getWeekEnd(weekStart);

    // Get interactions for the week
    const interactions = await prisma.interaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        emotions: true,
        focusAreas: true,
      },
    });

    // Calculate metrics
    const totalInteractions = interactions.length;
    const positiveOutcomes = interactions.filter(
      (i) => i.outcome === 'positive' || i.outcome === 'neutral'
    ).length;
    const positiveOutcomeRate = totalInteractions > 0 ? positiveOutcomes / totalInteractions : 0;

    // Extract top emotions
    const emotionCounts = new Map<string, number>();
    interactions.forEach((interaction) => {
      interaction.emotions.forEach((emotion) => {
        emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
      });
    });
    const topEmotions = Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion]) => emotion);

    // Get focus area progress
    const focusAreaProgress = await this.getFocusProgress(userId, undefined, 'week');

    // Generate insights and recommendations
    const keyInsights = await this.generateInsights(userId, interactions, weekStart, weekEnd);
    const recommendations = await this.generateRecommendations(userId, interactions, focusAreaProgress);

    return {
      weekOf: weekStart,
      totalInteractions,
      positiveOutcomeRate,
      topEmotions,
      focusAreaProgress,
      keyInsights,
      recommendations,
    };
  }

  /**
   * Get focus area progress
   */
  async getFocusProgress(
    userId: string,
    focusAreaId?: string,
    period: Period = 'week'
  ): Promise<FocusProgress[]> {
    const { start, end } = this.getPeriodDates(period);

    const focusAreas = await prisma.focusArea.findMany({
      where: {
        userId,
        ...(focusAreaId && { id: focusAreaId }),
      },
      include: {
        interactions: {
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return Promise.all(
      focusAreas.map(async (area) => {
        const totalInteractions = area.interactions.length;
        const completedInteractions = area.interactions.filter(
          (i) => i.outcome === 'positive'
        ).length;

        // Calculate trend by comparing with previous period
        const trend = await this.calculateTrend(userId, area.id, period);

        return {
          focusAreaId: area.id,
          focusAreaName: area.name,
          completedInteractions,
          totalInteractions,
          completionRate: totalInteractions > 0 ? completedInteractions / totalInteractions : 0,
          trend,
          lastInteractionAt: area.interactions[0]?.createdAt,
        };
      })
    );
  }

  /**
   * Get interaction patterns
   */
  async getInteractionPatterns(userId: string, period: Period = 'month'): Promise<PatternAnalysis> {
    const { start, end } = this.getPeriodDates(period);

    const interactions = await prisma.interaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        emotions: true,
      },
    });

    const communicationPatterns = await this.patternDetector.detectCommunicationPatterns(
      userId,
      interactions
    );

    const emotionalTrends = await this.patternDetector.detectEmotionalPatterns(
      userId,
      interactions
    );

    // Calculate relationship health scores
    const peopleMap = new Map<string, any[]>();
    interactions.forEach((interaction) => {
      const people = peopleMap.get(interaction.peopleInvolved) || [];
      people.push(interaction);
      peopleMap.set(interaction.peopleInvolved, people);
    });

    const relationshipHealthScores = await Promise.all(
      Array.from(peopleMap.keys()).map(async (person) => ({
        person,
        score: await this.patternDetector.calculateRelationshipHealth(userId, person),
      }))
    );

    // Identify growth areas
    const growthAreas = await this.identifyGrowthAreas(
      userId,
      communicationPatterns,
      emotionalTrends
    );

    return {
      communicationPatterns,
      emotionalTrends,
      relationshipHealthScores,
      growthAreas,
    };
  }

  /**
   * Get streak data
   */
  async getStreakData(userId: string): Promise<StreakData> {
    const cacheKey = `streak:${userId}`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const interactions = await prisma.interaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (interactions.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakType: 'daily',
        nextMilestone: 7,
      };
    }

    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(interactions);

    const streakData: StreakData = {
      currentStreak,
      longestStreak,
      streakType: 'daily',
      lastInteractionDate: interactions[0].createdAt,
      nextMilestone: this.getNextMilestone(currentStreak),
    };

    // Cache for 1 hour
    await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(streakData));

    return streakData;
  }

  /**
   * Get accountability alerts
   */
  async getAccountabilityAlerts(userId: string): Promise<AccountabilityAlert[]> {
    return this.accountabilityEngine.runAccountabilityCheck(userId);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(userId: string, alertId: string): Promise<AccountabilityAlert> {
    const alert = await prisma.accountabilityAlert.update({
      where: { id: alertId, userId },
      data: { acknowledgedAt: new Date() },
    });

    return alert as AccountabilityAlert;
  }

  /**
   * Get drift alerts (A8: Missing endpoint)
   */
  async getDriftAlerts(userId: string): Promise<DriftAlert[]> {
    const cacheKey = `drift-alerts:${userId}`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const alerts: DriftAlert[] = [];

    // Detect value drift
    const valueDrift = await this.detectValueDrift(userId);
    alerts.push(...valueDrift);

    // Detect goal drift
    const goalDrift = await this.detectGoalDrift(userId);
    alerts.push(...goalDrift);

    // Detect behavior drift
    const behaviorDrift = await this.detectBehaviorDrift(userId);
    alerts.push(...behaviorDrift);

    // Cache for 30 minutes
    await redisClient.setex(cacheKey, 1800, JSON.stringify(alerts));

    return alerts;
  }

  /**
   * Get real-time drift data (A9: Missing endpoint)
   */
  async getRealTimeDrift(userId: string): Promise<RealTimeDriftData> {
    const cacheKey = `real-time-drift:${userId}`;

    // Check cache (short TTL for real-time)
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate current alignment scores
    const valueAlignment = await this.calculateValueAlignment(userId);
    const goalAlignment = await this.calculateGoalAlignment(userId);
    const behaviorAlignment = await this.calculateBehaviorAlignment(userId);

    const currentAlignment = (valueAlignment + goalAlignment + behaviorAlignment) / 3;

    // Determine trend direction
    const historicalAlignment = await this.getHistoricalAlignment(userId);
    const trendDirection = this.determineTrend(currentAlignment, historicalAlignment);

    // Get active alerts
    const alerts = await this.getDriftAlerts(userId);

    const driftData: RealTimeDriftData = {
      currentAlignment,
      trendDirection,
      alerts,
      lastChecked: new Date(),
      metrics: {
        valueAlignment,
        goalAlignment,
        behaviorAlignment,
      },
    };

    // Cache for 5 minutes (real-time with short TTL)
    await redisClient.setex(cacheKey, 300, JSON.stringify(driftData));

    return driftData;
  }

  // Private helper methods

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  private getWeekEnd(weekStart: Date): Date {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private getPeriodDates(period: Period): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start, end };
  }

  private async calculateTrend(
    userId: string,
    focusAreaId: string,
    period: Period
  ): Promise<'improving' | 'stable' | 'declining'> {
    const { start: currentStart, end: currentEnd } = this.getPeriodDates(period);
    const previousEnd = new Date(currentStart);
    const previousStart = new Date(previousEnd);

    switch (period) {
      case 'week':
        previousStart.setDate(previousStart.getDate() - 7);
        break;
      case 'month':
        previousStart.setMonth(previousStart.getMonth() - 1);
        break;
      case 'quarter':
        previousStart.setMonth(previousStart.getMonth() - 3);
        break;
      case 'year':
        previousStart.setFullYear(previousStart.getFullYear() - 1);
        break;
    }

    const currentRate = await this.getCompletionRate(
      userId,
      focusAreaId,
      currentStart,
      currentEnd
    );
    const previousRate = await this.getCompletionRate(
      userId,
      focusAreaId,
      previousStart,
      previousEnd
    );

    const diff = currentRate - previousRate;

    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  private async getCompletionRate(
    userId: string,
    focusAreaId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    const interactions = await prisma.interaction.findMany({
      where: {
        userId,
        focusAreas: { some: { id: focusAreaId } },
        createdAt: { gte: start, lte: end },
      },
    });

    if (interactions.length === 0) return 0;

    const completed = interactions.filter((i) => i.outcome === 'positive').length;
    return completed / interactions.length;
  }

  private async generateInsights(
    userId: string,
    interactions: any[],
    start: Date,
    end: Date
  ): Promise<string[]> {
    const insights: string[] = [];

    // Insight: Most productive day
    const dayCount = new Map<string, number>();
    interactions.forEach((i) => {
      const day = i.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
      dayCount.set(day, (dayCount.get(day) || 0) + 1);
    });
    const mostProductiveDay = Array.from(dayCount.entries()).sort((a, b) => b[1] - a[1])[0];
    if (mostProductiveDay) {
      insights.push(`Your most active day this week was ${mostProductiveDay[0]}`);
    }

    // Insight: Emotion patterns
    const positiveEmotions = ['joy', 'gratitude', 'contentment', 'love', 'hope'];
    const emotionCounts = new Map<string, number>();
    interactions.forEach((i) => {
      i.emotions.forEach((e: string) => emotionCounts.set(e, (emotionCounts.get(e) || 0) + 1));
    });
    const topEmotion = Array.from(emotionCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topEmotion && positiveEmotions.includes(topEmotion[0])) {
      insights.push(`You experienced ${topEmotion[0]} frequently this week`);
    }

    return insights;
  }

  private async generateRecommendations(
    userId: string,
    interactions: any[],
    focusProgress: FocusProgress[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Check for neglected focus areas
    const neglected = focusProgress.filter((fp) => fp.totalInteractions === 0);
    if (neglected.length > 0) {
      recommendations.push(
        `Consider scheduling time for: ${neglected.map((n) => n.focusAreaName).join(', ')}`
      );
    }

    // Check for declining trends
    const declining = focusProgress.filter((fp) => fp.trend === 'declining');
    if (declining.length > 0) {
      recommendations.push(
        `Focus areas needing attention: ${declining.map((d) => d.focusAreaName).join(', ')}`
      );
    }

    return recommendations;
  }

  private calculateStreaks(interactions: { createdAt: Date }[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    let lastDate = new Date(interactions[0].createdAt);
    lastDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < interactions.length; i++) {
      const currentDate = new Date(interactions[i].createdAt);
      currentDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        tempStreak++;
      } else if (daysDiff > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }

      lastDate = currentDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    currentStreak = tempStreak;

    return { currentStreak, longestStreak };
  }

  private getNextMilestone(currentStreak: number): number {
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    return milestones.find((m) => m > currentStreak) || currentStreak + 30;
  }

  private async identifyGrowthAreas(
    userId: string,
    patterns: CommunicationPattern[],
    trends: EmotionTrend[]
  ): Promise<string[]> {
    const areas: string[] = [];

    // Check for negative patterns
    const negativePatterns = patterns.filter(
      (p) => p.type === 'avoidance' || p.type === 'passive_aggressive'
    );
    if (negativePatterns.length > 0) {
      areas.push('Consider practicing more direct communication');
    }

    // Check for negative emotion trends
    const negativeEmotions = ['anxiety', 'frustration', 'anger', 'sadness'];
    const increasingNegative = trends.filter(
      (t) => negativeEmotions.includes(t.emotion) && t.trend === 'increasing'
    );
    if (increasingNegative.length > 0) {
      areas.push('Focus on emotional regulation techniques');
    }

    return areas;
  }

  private async detectValueDrift(userId: string): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];
    const { start } = this.getPeriodDates('month');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        coreValues: true,
        interactions: {
          where: { createdAt: { gte: start } },
          include: { coreValues: true },
        },
      },
    });

    if (!user) return alerts;

    // Check for values not reflected in interactions
    for (const value of user.coreValues) {
      const relatedInteractions = user.interactions.filter((i) =>
        i.coreValues.some((v) => v.id === value.id)
      );

      const alignmentScore =
        user.interactions.length > 0 ? relatedInteractions.length / user.interactions.length : 0;

      if (alignmentScore < 0.2) {
        alerts.push({
          id: `value-drift-${value.id}`,
          type: 'value_drift',
          severity: alignmentScore < 0.1 ? 'high' : 'medium',
          description: `Your interactions rarely align with core value: ${value.name}`,
          detectedAt: new Date(),
          relatedValues: [value.name],
          suggestedActions: [
            `Schedule interactions that support ${value.name}`,
            'Reflect on whether this value still resonates with you',
          ],
          confidence: 0.85,
          metrics: {
            alignmentScore: alignmentScore * 100,
            trendChange: -0.15,
            daysDetected: 7,
          },
        });
      }
    }

    return alerts;
  }

  private async detectGoalDrift(userId: string): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];
    const { start } = this.getPeriodDates('month');

    const focusAreas = await prisma.focusArea.findMany({
      where: {
        userId,
        goal: { not: null },
      },
      include: {
        interactions: {
          where: { createdAt: { gte: start } },
        },
      },
    });

    for (const area of focusAreas) {
      const daysSinceLastInteraction = area.interactions[0]
        ? Math.floor(
            (Date.now() - area.interactions[0].createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999;

      if (daysSinceLastInteraction > 14) {
        alerts.push({
          id: `goal-drift-${area.id}`,
          type: 'goal_drift',
          severity: daysSinceLastInteraction > 30 ? 'high' : 'medium',
          description: `No progress on goal: ${area.goal}`,
          detectedAt: new Date(),
          relatedGoals: [area.goal!],
          suggestedActions: [
            'Schedule time to work on this goal',
            'Break down the goal into smaller steps',
            'Re-evaluate if this goal is still important',
          ],
          confidence: 0.9,
          metrics: {
            alignmentScore: 0,
            trendChange: -0.3,
            daysDetected: daysSinceLastInteraction,
          },
        });
      }
    }

    return alerts;
  }

  private async detectBehaviorDrift(userId: string): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];
    const { start: currentStart } = this.getPeriodDates('month');
    const { start: previousStart, end: previousEnd } = this.getPeriodDates('quarter');

    const currentInteractions = await prisma.interaction.findMany({
      where: { userId, createdAt: { gte: currentStart } },
    });

    const previousInteractions = await prisma.interaction.findMany({
      where: {
        userId,
        createdAt: { gte: previousStart, lte: previousEnd },
      },
    });

    const currentPositiveRate =
      currentInteractions.length > 0
        ? currentInteractions.filter((i) => i.outcome === 'positive').length /
          currentInteractions.length
        : 0;

    const previousPositiveRate =
      previousInteractions.length > 0
        ? previousInteractions.filter((i) => i.outcome === 'positive').length /
          previousInteractions.length
        : 0;

    const drift = previousPositiveRate - currentPositiveRate;

    if (drift > 0.2) {
      alerts.push({
        id: 'behavior-drift-outcomes',
        type: 'behavior_drift',
        severity: drift > 0.3 ? 'high' : 'medium',
        description: 'Your positive interaction rate has decreased significantly',
        detectedAt: new Date(),
        suggestedActions: [
          'Review recent interactions for patterns',
          'Consider stress management techniques',
          'Reach out to supportive relationships',
        ],
        confidence: 0.8,
        metrics: {
          alignmentScore: currentPositiveRate * 100,
          trendChange: -drift,
          daysDetected: 30,
        },
      });
    }

    return alerts;
  }

  private async calculateValueAlignment(userId: string): Promise<number> {
    const { start } = this.getPeriodDates('month');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        coreValues: true,
        interactions: {
          where: { createdAt: { gte: start } },
          include: { coreValues: true },
        },
      },
    });

    if (!user || user.coreValues.length === 0 || user.interactions.length === 0) {
      return 50; // Neutral score
    }

    const alignedInteractions = user.interactions.filter(
      (i) => i.coreValues.length > 0
    ).length;

    return (alignedInteractions / user.interactions.length) * 100;
  }

  private async calculateGoalAlignment(userId: string): Promise<number> {
    const { start } = this.getPeriodDates('month');

    const focusAreas = await prisma.focusArea.findMany({
      where: {
        userId,
        goal: { not: null },
      },
      include: {
        interactions: {
          where: { createdAt: { gte: start } },
        },
      },
    });

    if (focusAreas.length === 0) return 50;

    const activeAreas = focusAreas.filter((area) => area.interactions.length > 0).length;

    return (activeAreas / focusAreas.length) * 100;
  }

  private async calculateBehaviorAlignment(userId: string): Promise<number> {
    const { start } = this.getPeriodDates('month');

    const interactions = await prisma.interaction.findMany({
      where: { userId, createdAt: { gte: start } },
    });

    if (interactions.length === 0) return 50;

    const positiveInteractions = interactions.filter((i) => i.outcome === 'positive').length;

    return (positiveInteractions / interactions.length) * 100;
  }

  private async getHistoricalAlignment(userId: string): Promise<number> {
    const { start, end } = this.getPeriodDates('quarter');

    const valueAlignment = await this.calculateValueAlignment(userId);
    const goalAlignment = await this.calculateGoalAlignment(userId);
    const behaviorAlignment = await this.calculateBehaviorAlignment(userId);

    return (valueAlignment + goalAlignment + behaviorAlignment) / 3;
  }

  private determineTrend(
    current: number,
    historical: number
  ): 'improving' | 'stable' | 'declining' {
    const diff = current - historical;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }
}

export const analyticsService = new AnalyticsService();
