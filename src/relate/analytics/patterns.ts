import { prisma } from '../../lib/prisma';

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

export interface BehavioralPattern {
  pattern: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendations: string[];
  confidence: number;
}

export interface RelationshipHealthMetrics {
  score: number;
  interactionFrequency: number;
  positiveRatio: number;
  emotionalBalance: number;
  conflictResolution: number;
  lastInteraction: Date;
}

export class PatternDetector {
  /**
   * Detect communication patterns in interactions
   */
  async detectCommunicationPatterns(
    userId: string,
    interactions: any[]
  ): Promise<CommunicationPattern[]> {
    const patterns: CommunicationPattern[] = [];

    // Keywords for pattern detection
    const avoidanceKeywords = [
      'avoid',
      'ignore',
      'postpone',
      'later',
      'not now',
      'maybe',
      'unsure',
      "didn't say",
      'held back',
    ];

    const passsiveAggressiveKeywords = [
      'fine',
      'whatever',
      'nothing',
      'forget it',
      'sarcastic',
      'subtle dig',
      'backhanded',
    ];

    const directnessKeywords = [
      'said directly',
      'told them',
      'clearly stated',
      'honest',
      'frank',
      'straightforward',
      'open',
    ];

    const assertiveKeywords = [
      'assertive',
      'firm',
      'confident',
      'clear boundaries',
      'stood up',
      'expressed needs',
      'respectfully stated',
    ];

    // Detect patterns
    const avoidance = this.detectPattern(interactions, avoidanceKeywords, 'avoidance');
    const passiveAggressive = this.detectPattern(
      interactions,
      passsiveAggressiveKeywords,
      'passive_aggressive'
    );
    const directness = this.detectPattern(interactions, directnessKeywords, 'directness');
    const assertive = this.detectPattern(interactions, assertiveKeywords, 'assertive');

    if (avoidance.frequency > 0) patterns.push(avoidance);
    if (passiveAggressive.frequency > 0) patterns.push(passiveAggressive);
    if (directness.frequency > 0) patterns.push(directness);
    if (assertive.frequency > 0) patterns.push(assertive);

    // Calculate trends by comparing first and second half of interactions
    const halfPoint = Math.floor(interactions.length / 2);
    const older = interactions.slice(halfPoint);
    const newer = interactions.slice(0, halfPoint);

    patterns.forEach((pattern) => {
      const olderFreq = this.countPatternOccurrences(older, pattern.contexts);
      const newerFreq = this.countPatternOccurrences(newer, pattern.contexts);

      if (newerFreq > olderFreq * 1.2) {
        pattern.trend = 'increasing';
      } else if (newerFreq < olderFreq * 0.8) {
        pattern.trend = 'decreasing';
      } else {
        pattern.trend = 'stable';
      }

      // Calculate confidence based on sample size and consistency
      pattern.confidence = this.calculateConfidence(pattern.frequency, interactions.length);
    });

    return patterns;
  }

  /**
   * Detect emotional patterns and trends
   */
  async detectEmotionalPatterns(
    userId: string,
    interactions: any[]
  ): Promise<EmotionTrend[]> {
    const emotionMap = new Map<string, {
      frequency: number;
      people: Set<string>;
      outcomes: string[];
      timeline: Date[];
    }>();

    // Aggregate emotion data
    interactions.forEach((interaction) => {
      interaction.emotions.forEach((emotion: string) => {
        const data = emotionMap.get(emotion) || {
          frequency: 0,
          people: new Set<string>(),
          outcomes: [],
          timeline: [],
        };

        data.frequency++;
        data.timeline.push(interaction.createdAt);
        data.outcomes.push(interaction.outcome);

        const people = interaction.peopleInvolved.split(',').map((p: string) => p.trim());
        people.forEach((person: string) => data.people.add(person));

        emotionMap.set(emotion, data);
      });
    });

    // Convert to trends
    const trends: EmotionTrend[] = [];

    for (const [emotion, data] of emotionMap.entries()) {
      // Calculate trend
      const trend = this.calculateEmotionTrend(data.timeline, interactions.length);
      const confidence = this.calculateConfidence(data.frequency, interactions.length);

      trends.push({
        emotion,
        frequency: data.frequency,
        trend,
        associatedPeople: Array.from(data.people).slice(0, 5),
        associatedOutcomes: this.getTopOutcomes(data.outcomes),
        confidence,
      });
    }

    // Sort by frequency
    return trends.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Detect behavioral patterns
   */
  async detectBehavioralPatterns(userId: string): Promise<BehavioralPattern[]> {
    const patterns: BehavioralPattern[] = [];
    const lookbackDays = 60;
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const interactions = await prisma.interaction.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      include: {
        emotions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (interactions.length === 0) return patterns;

    // Pattern: Conflict avoidance
    const conflictInteractions = interactions.filter(
      (i) => i.outcome === 'conflict' || i.context.toLowerCase().includes('conflict')
    );
    if (conflictInteractions.length > 0) {
      const avoidanceRate = conflictInteractions.length / interactions.length;
      if (avoidanceRate > 0.3) {
        patterns.push({
          pattern: 'High Conflict Frequency',
          frequency: conflictInteractions.length,
          severity: avoidanceRate > 0.5 ? 'high' : 'medium',
          description: `${Math.round(avoidanceRate * 100)}% of your interactions involve conflict`,
          recommendations: [
            'Practice active listening skills',
            'Learn de-escalation techniques',
            'Consider mediation or conflict resolution training',
          ],
          confidence: this.calculateConfidence(conflictInteractions.length, interactions.length),
        });
      }
    }

    // Pattern: Emotional suppression
    const lowEmotionInteractions = interactions.filter((i) => i.emotions.length === 0);
    if (lowEmotionInteractions.length > interactions.length * 0.4) {
      patterns.push({
        pattern: 'Emotional Suppression',
        frequency: lowEmotionInteractions.length,
        severity: 'medium',
        description: 'You may be suppressing or not recognizing emotions in many interactions',
        recommendations: [
          'Practice emotional awareness exercises',
          'Keep an emotion journal',
          'Consider talking to a therapist',
        ],
        confidence: 0.7,
      });
    }

    // Pattern: Isolation tendency
    const soloInteractions = interactions.filter(
      (i) => !i.peopleInvolved || i.peopleInvolved.trim() === ''
    );
    if (soloInteractions.length > interactions.length * 0.6) {
      patterns.push({
        pattern: 'Social Isolation',
        frequency: soloInteractions.length,
        severity: 'high',
        description: 'Most of your logged interactions are solitary',
        recommendations: [
          'Reach out to friends or family',
          'Join a social group or club',
          'Schedule regular social activities',
        ],
        confidence: 0.85,
      });
    }

    // Pattern: Reactive behavior
    const negativeEmotions = ['anger', 'frustration', 'anxiety', 'overwhelm'];
    const reactiveInteractions = interactions.filter((i) =>
      i.emotions.some((e: string) => negativeEmotions.includes(e))
    );
    if (reactiveInteractions.length > interactions.length * 0.5) {
      patterns.push({
        pattern: 'Reactive Emotional Pattern',
        frequency: reactiveInteractions.length,
        severity: 'medium',
        description: 'You frequently experience reactive emotions like anger or frustration',
        recommendations: [
          'Practice mindfulness meditation',
          'Learn emotional regulation techniques',
          'Identify triggers and develop coping strategies',
        ],
        confidence: 0.75,
      });
    }

    // Pattern: Positive momentum
    const positiveInteractions = interactions.filter((i) => i.outcome === 'positive');
    if (positiveInteractions.length > interactions.length * 0.7) {
      patterns.push({
        pattern: 'Positive Momentum',
        frequency: positiveInteractions.length,
        severity: 'low',
        description: 'You maintain predominantly positive interactions',
        recommendations: [
          'Keep up the good work!',
          'Share your strategies with others',
          'Continue building on this positive foundation',
        ],
        confidence: 0.9,
      });
    }

    return patterns;
  }

  /**
   * Calculate relationship health score
   */
  async calculateRelationshipHealth(userId: string, person: string): Promise<number> {
    const lookbackDays = 90;
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const interactions = await prisma.interaction.findMany({
      where: {
        userId,
        peopleInvolved: { contains: person },
        createdAt: { gte: since },
      },
      include: {
        emotions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (interactions.length === 0) return 50; // Neutral score for no data

    const metrics = this.calculateHealthMetrics(interactions);

    // Weighted score calculation
    const weights = {
      interactionFrequency: 0.2,
      positiveRatio: 0.35,
      emotionalBalance: 0.25,
      conflictResolution: 0.2,
    };

    const score =
      metrics.interactionFrequency * weights.interactionFrequency +
      metrics.positiveRatio * weights.positiveRatio +
      metrics.emotionalBalance * weights.emotionalBalance +
      metrics.conflictResolution * weights.conflictResolution;

    return Math.round(score);
  }

  // Private helper methods

  private detectPattern(
    interactions: any[],
    keywords: string[],
    type: CommunicationPattern['type']
  ): CommunicationPattern {
    const contexts: string[] = [];
    let frequency = 0;

    interactions.forEach((interaction) => {
      const text = `${interaction.context} ${interaction.outcome}`.toLowerCase();
      const hasPattern = keywords.some((keyword) => text.includes(keyword.toLowerCase()));

      if (hasPattern) {
        frequency++;
        contexts.push(interaction.context.substring(0, 100));
      }
    });

    return {
      type,
      frequency,
      contexts: contexts.slice(0, 5),
      trend: 'stable',
      confidence: 0,
    };
  }

  private countPatternOccurrences(interactions: any[], contexts: string[]): number {
    let count = 0;
    interactions.forEach((interaction) => {
      if (contexts.some((ctx) => interaction.context.includes(ctx.substring(0, 50)))) {
        count++;
      }
    });
    return count;
  }

  private calculateEmotionTrend(
    timeline: Date[],
    totalInteractions: number
  ): 'increasing' | 'stable' | 'decreasing' {
    if (timeline.length < 4) return 'stable';

    // Sort timeline
    const sorted = timeline.sort((a, b) => a.getTime() - b.getTime());

    // Split into thirds
    const third = Math.floor(sorted.length / 3);
    const early = sorted.slice(0, third).length;
    const middle = sorted.slice(third, third * 2).length;
    const recent = sorted.slice(third * 2).length;

    // Calculate trend
    if (recent > middle * 1.3 && middle > early * 1.2) {
      return 'increasing';
    } else if (recent < middle * 0.7 && middle < early * 0.8) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  private calculateConfidence(frequency: number, totalSample: number): number {
    // Confidence based on sample size and frequency
    const sampleConfidence = Math.min(totalSample / 20, 1.0); // Max confidence at 20+ samples
    const frequencyConfidence = Math.min(frequency / 5, 1.0); // Max confidence at 5+ occurrences

    return Math.round((sampleConfidence * 0.4 + frequencyConfidence * 0.6) * 100) / 100;
  }

  private getTopOutcomes(outcomes: string[]): string[] {
    const counts = new Map<string, number>();
    outcomes.forEach((outcome) => {
      counts.set(outcome, (counts.get(outcome) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([outcome]) => outcome);
  }

  private calculateHealthMetrics(interactions: any[]): RelationshipHealthMetrics {
    // Interaction frequency (normalized to 0-100)
    const daysActive = new Set(
      interactions.map((i) => i.createdAt.toISOString().split('T')[0])
    ).size;
    const interactionFrequency = Math.min((daysActive / 30) * 100, 100);

    // Positive ratio
    const positiveCount = interactions.filter(
      (i) => i.outcome === 'positive' || i.outcome === 'neutral'
    ).length;
    const positiveRatio = (positiveCount / interactions.length) * 100;

    // Emotional balance (variety and positivity of emotions)
    const allEmotions = new Set<string>();
    const positiveEmotions = ['joy', 'gratitude', 'contentment', 'love', 'hope', 'excitement'];
    let positiveEmotionCount = 0;
    let totalEmotionCount = 0;

    interactions.forEach((interaction) => {
      interaction.emotions.forEach((emotion: string) => {
        allEmotions.add(emotion);
        totalEmotionCount++;
        if (positiveEmotions.includes(emotion)) {
          positiveEmotionCount++;
        }
      });
    });

    const emotionalVariety = Math.min((allEmotions.size / 8) * 100, 100);
    const emotionalPositivity = totalEmotionCount > 0
      ? (positiveEmotionCount / totalEmotionCount) * 100
      : 50;
    const emotionalBalance = (emotionalVariety * 0.4 + emotionalPositivity * 0.6);

    // Conflict resolution (ability to resolve conflicts)
    const conflictInteractions = interactions.filter((i) => i.outcome === 'conflict');
    const resolvedConflicts = interactions.filter(
      (i, idx) =>
        idx > 0 &&
        interactions[idx - 1].outcome === 'conflict' &&
        i.outcome === 'positive'
    );
    const conflictResolution =
      conflictInteractions.length > 0
        ? (resolvedConflicts.length / conflictInteractions.length) * 100
        : 100;

    return {
      score: 0, // Calculated by caller
      interactionFrequency,
      positiveRatio,
      emotionalBalance,
      conflictResolution,
      lastInteraction: interactions[0].createdAt,
    };
  }
}

export const patternDetector = new PatternDetector();
