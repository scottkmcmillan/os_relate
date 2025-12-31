import { prisma } from '../../lib/prisma';
import { PatternDetector } from './patterns';

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
  confidence: number;
  metadata?: Record<string, any>;
}

export interface AccountabilityAlertCreate {
  type: 'value_contradiction' | 'goal_drift' | 'pattern_detected' | 'neglected_area';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  evidence: string[];
  suggestedActions: string[];
  confidence: number;
  metadata?: Record<string, any>;
}

export interface AccountabilityConfig {
  thresholds: {
    valueContradiction: number;
    goalDrift: number;
    patternDetection: number;
    neglectedArea: number;
  };
  checkFrequency: {
    valueCheck: number; // hours
    goalCheck: number;
    patternCheck: number;
  };
  alertLimits: {
    maxAlertsPerDay: number;
    cooldownPeriod: number; // hours
  };
}

export class AccountabilityEngine {
  private patternDetector: PatternDetector;
  private config: AccountabilityConfig;

  constructor() {
    this.patternDetector = new PatternDetector();
    this.config = {
      thresholds: {
        valueContradiction: 0.7,
        goalDrift: 0.75,
        patternDetection: 0.65,
        neglectedArea: 0.8,
      },
      checkFrequency: {
        valueCheck: 24,
        goalCheck: 12,
        patternCheck: 6,
      },
      alertLimits: {
        maxAlertsPerDay: 5,
        cooldownPeriod: 4,
      },
    };
  }

  /**
   * Run complete accountability check for a user
   */
  async runAccountabilityCheck(userId: string): Promise<AccountabilityAlert[]> {
    // Check if we're within alert limits
    const alertsToday = await this.getAlertsToday(userId);
    if (alertsToday.length >= this.config.alertLimits.maxAlertsPerDay) {
      return alertsToday;
    }

    const alerts: AccountabilityAlert[] = [];

    // Run all detection methods in parallel
    const [valueAlerts, goalAlerts, patternAlerts, neglectedAlerts] = await Promise.all([
      this.detectValueContradictions(userId),
      this.detectGoalDrift(userId),
      this.detectPatterns(userId),
      this.detectNeglectedAreas(userId),
    ]);

    alerts.push(...valueAlerts, ...goalAlerts, ...patternAlerts, ...neglectedAlerts);

    // Filter by confidence threshold and prioritize
    const filteredAlerts = alerts
      .filter((alert) => this.meetsThreshold(alert))
      .sort((a, b) => this.priorityScore(b) - this.priorityScore(a))
      .slice(0, this.config.alertLimits.maxAlertsPerDay);

    // Persist alerts
    await this.persistAlerts(userId, filteredAlerts);

    return filteredAlerts;
  }

  /**
   * Detect value contradictions
   */
  async detectValueContradictions(userId: string): Promise<AccountabilityAlert[]> {
    const alerts: AccountabilityAlert[] = [];
    const lookbackDays = 30;
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        coreValues: true,
        interactions: {
          where: { createdAt: { gte: since } },
          include: {
            coreValues: true,
            emotions: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user || user.coreValues.length === 0) return alerts;

    // Check each core value
    for (const value of user.coreValues) {
      const relatedInteractions = user.interactions.filter((interaction) =>
        interaction.coreValues.some((v) => v.id === value.id)
      );

      const contradictoryInteractions = relatedInteractions.filter(
        (interaction) => interaction.outcome === 'negative' || interaction.outcome === 'conflict'
      );

      if (contradictoryInteractions.length > 0) {
        const contradictionRate = contradictoryInteractions.length / relatedInteractions.length;
        const confidence = Math.min(contradictionRate * 1.2, 1.0);

        if (confidence >= this.config.thresholds.valueContradiction) {
          const evidence = contradictoryInteractions.slice(0, 3).map(
            (i) =>
              `${new Date(i.createdAt).toLocaleDateString()}: ${i.context} - ${i.outcome} outcome`
          );

          alerts.push({
            id: `value-contradiction-${value.id}-${Date.now()}`,
            userId,
            type: 'value_contradiction',
            severity: contradictionRate > 0.6 ? 'critical' : 'warning',
            title: `Value Contradiction Detected: ${value.name}`,
            description: `Recent interactions tagged with "${value.name}" have resulted in negative outcomes ${Math.round(contradictionRate * 100)}% of the time.`,
            evidence,
            suggestedActions: this.generateValueContradictionActions(value.name, contradictoryInteractions),
            createdAt: new Date(),
            confidence,
            metadata: {
              valueId: value.id,
              valueName: value.name,
              contradictionRate,
              totalInteractions: relatedInteractions.length,
              contradictoryCount: contradictoryInteractions.length,
            },
          });
        }
      }

      // Check for value neglect
      const daysSinceLastUse = relatedInteractions[0]
        ? Math.floor(
            (Date.now() - relatedInteractions[0].createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : lookbackDays;

      if (daysSinceLastUse > 21) {
        alerts.push({
          id: `value-neglect-${value.id}-${Date.now()}`,
          userId,
          type: 'value_contradiction',
          severity: daysSinceLastUse > 28 ? 'warning' : 'info',
          title: `Core Value Neglected: ${value.name}`,
          description: `You haven't had interactions aligned with "${value.name}" in ${daysSinceLastUse} days.`,
          evidence: [`Last interaction: ${relatedInteractions[0]?.createdAt.toLocaleDateString() || 'Never'}`],
          suggestedActions: [
            `Identify opportunities to practice ${value.name}`,
            `Schedule interactions that align with ${value.name}`,
            'Reflect on whether this value still matters to you',
          ],
          createdAt: new Date(),
          confidence: Math.min(daysSinceLastUse / 30, 1.0),
          metadata: {
            valueId: value.id,
            valueName: value.name,
            daysSinceLastUse,
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Detect goal drift
   */
  async detectGoalDrift(userId: string): Promise<AccountabilityAlert[]> {
    const alerts: AccountabilityAlert[] = [];
    const lookbackDays = 14;
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const focusAreas = await prisma.focusArea.findMany({
      where: {
        userId,
        goal: { not: null },
      },
      include: {
        interactions: {
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    for (const area of focusAreas) {
      const daysSinceLastInteraction = area.interactions[0]
        ? Math.floor(
            (Date.now() - area.interactions[0].createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : lookbackDays;

      const interactionRate = area.interactions.length / lookbackDays;
      const confidence = Math.min((daysSinceLastInteraction / lookbackDays) * 1.5, 1.0);

      // Alert if no progress in 7+ days
      if (daysSinceLastInteraction >= 7 && confidence >= this.config.thresholds.goalDrift) {
        const severity: 'info' | 'warning' | 'critical' =
          daysSinceLastInteraction > 14 ? 'critical' : daysSinceLastInteraction > 10 ? 'warning' : 'info';

        alerts.push({
          id: `goal-drift-${area.id}-${Date.now()}`,
          userId,
          type: 'goal_drift',
          severity,
          title: `Goal Progress Stalled: ${area.name}`,
          description: `No progress on "${area.goal}" in ${daysSinceLastInteraction} days.`,
          evidence: [
            `Last activity: ${area.interactions[0]?.createdAt.toLocaleDateString() || 'Never'}`,
            `Average activity rate: ${interactionRate.toFixed(2)} interactions/day`,
          ],
          suggestedActions: this.generateGoalDriftActions(area.name, area.goal!, daysSinceLastInteraction),
          createdAt: new Date(),
          confidence,
          metadata: {
            focusAreaId: area.id,
            focusAreaName: area.name,
            goal: area.goal,
            daysSinceLastInteraction,
            interactionRate,
          },
        });
      }

      // Alert if declining engagement
      const recentInteractions = area.interactions.slice(0, 7);
      const olderInteractions = area.interactions.slice(7, 14);

      if (recentInteractions.length < olderInteractions.length * 0.5 && olderInteractions.length > 0) {
        alerts.push({
          id: `goal-decline-${area.id}-${Date.now()}`,
          userId,
          type: 'goal_drift',
          severity: 'warning',
          title: `Declining Engagement: ${area.name}`,
          description: `Your engagement with "${area.name}" has decreased by ${Math.round((1 - recentInteractions.length / olderInteractions.length) * 100)}%.`,
          evidence: [
            `Recent week: ${recentInteractions.length} interactions`,
            `Previous week: ${olderInteractions.length} interactions`,
          ],
          suggestedActions: [
            'Identify obstacles preventing progress',
            'Break down the goal into smaller milestones',
            'Schedule dedicated time for this focus area',
          ],
          createdAt: new Date(),
          confidence: 0.8,
          metadata: {
            focusAreaId: area.id,
            recentCount: recentInteractions.length,
            previousCount: olderInteractions.length,
            declineRate: 1 - recentInteractions.length / olderInteractions.length,
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Detect behavioral patterns
   */
  async detectPatterns(userId: string): Promise<AccountabilityAlert[]> {
    const alerts: AccountabilityAlert[] = [];
    const lookbackDays = 30;
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

    if (interactions.length === 0) return alerts;

    // Detect communication patterns
    const communicationPatterns = await this.patternDetector.detectCommunicationPatterns(
      userId,
      interactions
    );

    for (const pattern of communicationPatterns) {
      if (
        (pattern.type === 'avoidance' || pattern.type === 'passive_aggressive') &&
        pattern.confidence >= this.config.thresholds.patternDetection
      ) {
        alerts.push({
          id: `pattern-${pattern.type}-${Date.now()}`,
          userId,
          type: 'pattern_detected',
          severity: pattern.frequency > 5 ? 'warning' : 'info',
          title: `Communication Pattern Detected: ${pattern.type.replace('_', ' ')}`,
          description: `You've shown ${pattern.type.replace('_', ' ')} behavior in ${pattern.frequency} recent interactions.`,
          evidence: pattern.contexts.slice(0, 3),
          suggestedActions: this.generatePatternActions(pattern.type),
          createdAt: new Date(),
          confidence: pattern.confidence,
          metadata: {
            patternType: pattern.type,
            frequency: pattern.frequency,
            trend: pattern.trend,
          },
        });
      }
    }

    // Detect emotional patterns
    const emotionalPatterns = await this.patternDetector.detectEmotionalPatterns(
      userId,
      interactions
    );

    const negativeEmotions = ['anxiety', 'frustration', 'anger', 'sadness', 'overwhelm'];
    const concerningPatterns = emotionalPatterns.filter(
      (ep) => negativeEmotions.includes(ep.emotion) && ep.trend === 'increasing'
    );

    for (const pattern of concerningPatterns) {
      if (pattern.confidence >= this.config.thresholds.patternDetection) {
        alerts.push({
          id: `emotion-pattern-${pattern.emotion}-${Date.now()}`,
          userId,
          type: 'pattern_detected',
          severity: pattern.frequency > 10 ? 'critical' : 'warning',
          title: `Increasing ${pattern.emotion} Pattern`,
          description: `You've experienced ${pattern.emotion} with increasing frequency (${pattern.frequency} times this month).`,
          evidence: [
            `Associated with: ${pattern.associatedPeople.slice(0, 3).join(', ')}`,
            `Trend: ${pattern.trend}`,
          ],
          suggestedActions: [
            `Consider strategies to manage ${pattern.emotion}`,
            'Talk to someone you trust about these feelings',
            'Reflect on triggers for this emotion',
          ],
          createdAt: new Date(),
          confidence: pattern.confidence,
          metadata: {
            emotion: pattern.emotion,
            frequency: pattern.frequency,
            trend: pattern.trend,
            associatedPeople: pattern.associatedPeople,
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Detect neglected areas
   */
  async detectNeglectedAreas(userId: string): Promise<AccountabilityAlert[]> {
    const alerts: AccountabilityAlert[] = [];
    const lookbackDays = 30;
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const interactions = await prisma.interaction.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
    });

    // Detect neglected relationships
    const peopleMap = new Map<string, Date>();
    interactions.forEach((interaction) => {
      const people = interaction.peopleInvolved.split(',').map((p) => p.trim());
      people.forEach((person) => {
        const lastInteraction = peopleMap.get(person);
        if (!lastInteraction || interaction.createdAt > lastInteraction) {
          peopleMap.set(person, interaction.createdAt);
        }
      });
    });

    for (const [person, lastInteraction] of peopleMap.entries()) {
      const daysSince = Math.floor((Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince > 21) {
        const confidence = Math.min(daysSince / 30, 1.0);

        if (confidence >= this.config.thresholds.neglectedArea) {
          alerts.push({
            id: `neglected-person-${person}-${Date.now()}`,
            userId,
            type: 'neglected_area',
            severity: daysSince > 45 ? 'warning' : 'info',
            title: `Neglected Relationship: ${person}`,
            description: `You haven't interacted with ${person} in ${daysSince} days.`,
            evidence: [`Last interaction: ${lastInteraction.toLocaleDateString()}`],
            suggestedActions: [
              `Reach out to ${person}`,
              'Schedule a catch-up',
              'Send a thoughtful message',
            ],
            createdAt: new Date(),
            confidence,
            metadata: {
              person,
              daysSinceLastInteraction: daysSince,
              lastInteraction,
            },
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Generate context-specific suggestions
   */
  generateSuggestions(alerts: AccountabilityAlert[]): string[] {
    const suggestions: string[] = [];
    const alertsByType = new Map<string, AccountabilityAlert[]>();

    alerts.forEach((alert) => {
      const existing = alertsByType.get(alert.type) || [];
      existing.push(alert);
      alertsByType.set(alert.type, existing);
    });

    // Generate type-specific suggestions
    if (alertsByType.has('value_contradiction')) {
      suggestions.push('Review your core values and ensure they align with your actions');
    }

    if (alertsByType.has('goal_drift')) {
      suggestions.push('Set aside dedicated time each week for your important goals');
    }

    if (alertsByType.has('pattern_detected')) {
      suggestions.push('Consider working with a coach or therapist to address behavioral patterns');
    }

    if (alertsByType.has('neglected_area')) {
      suggestions.push('Create a regular schedule for maintaining important relationships');
    }

    return suggestions;
  }

  /**
   * Create a new alert
   */
  async createAlert(
    userId: string,
    alertData: AccountabilityAlertCreate
  ): Promise<AccountabilityAlert> {
    const alert = await prisma.accountabilityAlert.create({
      data: {
        userId,
        type: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        description: alertData.description,
        evidence: alertData.evidence,
        suggestedActions: alertData.suggestedActions,
        confidence: alertData.confidence,
        metadata: alertData.metadata || {},
      },
    });

    return alert as AccountabilityAlert;
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(userId: string, alertId: string, reason?: string): Promise<void> {
    await prisma.accountabilityAlert.update({
      where: { id: alertId, userId },
      data: {
        dismissedAt: new Date(),
        dismissReason: reason,
      },
    });
  }

  // Private helper methods

  private async getAlertsToday(userId: string): Promise<AccountabilityAlert[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const alerts = await prisma.accountabilityAlert.findMany({
      where: {
        userId,
        createdAt: { gte: startOfDay },
        dismissedAt: null,
      },
    });

    return alerts as AccountabilityAlert[];
  }

  private meetsThreshold(alert: AccountabilityAlert): boolean {
    const threshold = this.config.thresholds[alert.type.replace('-', '') as keyof typeof this.config.thresholds];
    return alert.confidence >= (threshold || 0.7);
  }

  private priorityScore(alert: AccountabilityAlert): number {
    const severityScores = { critical: 3, warning: 2, info: 1 };
    return severityScores[alert.severity] * 10 + alert.confidence * 10;
  }

  private async persistAlerts(userId: string, alerts: AccountabilityAlert[]): Promise<void> {
    // Check for duplicate alerts in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const existingAlerts = await prisma.accountabilityAlert.findMany({
      where: {
        userId,
        createdAt: { gte: yesterday },
      },
    });

    const existingTitles = new Set(existingAlerts.map((a) => a.title));

    const newAlerts = alerts.filter((alert) => !existingTitles.has(alert.title));

    for (const alert of newAlerts) {
      await this.createAlert(userId, {
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        evidence: alert.evidence,
        suggestedActions: alert.suggestedActions,
        confidence: alert.confidence,
        metadata: alert.metadata,
      });
    }
  }

  private generateValueContradictionActions(valueName: string, interactions: any[]): string[] {
    const actions = [
      `Reflect on whether "${valueName}" is truly a core value for you`,
      `Identify situations where you can better honor ${valueName}`,
      'Consider if external pressures are causing this contradiction',
    ];

    // Add context-specific actions based on emotions
    const commonEmotions = new Map<string, number>();
    interactions.forEach((i) => {
      i.emotions.forEach((e: string) => {
        commonEmotions.set(e, (commonEmotions.get(e) || 0) + 1);
      });
    });

    const topEmotion = Array.from(commonEmotions.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topEmotion) {
      actions.push(`Address recurring ${topEmotion[0]} in value-related situations`);
    }

    return actions;
  }

  private generateGoalDriftActions(areaName: string, goal: string, daysSince: number): string[] {
    const actions = [
      `Break "${goal}" into smaller, actionable steps`,
      `Schedule specific time for ${areaName} this week`,
      'Identify and address obstacles preventing progress',
    ];

    if (daysSince > 14) {
      actions.push('Re-evaluate if this goal is still relevant and important');
      actions.push('Consider accountability partnerships for this goal');
    }

    return actions;
  }

  private generatePatternActions(patternType: string): string[] {
    const actionMap: Record<string, string[]> = {
      avoidance: [
        'Practice addressing issues directly in low-stakes situations',
        'Identify what makes you avoid difficult conversations',
        'Consider role-playing difficult conversations with a trusted friend',
      ],
      passive_aggressive: [
        'Practice expressing needs and frustrations directly',
        'Reflect on why direct communication feels unsafe',
        'Work on assertiveness skills',
      ],
      directness: [
        'Continue being direct while staying compassionate',
        'Balance honesty with empathy',
      ],
      assertive: [
        'Your assertive communication is healthy - keep it up!',
        'Share your approach with others who might benefit',
      ],
    };

    return actionMap[patternType] || ['Reflect on this pattern and its impact'];
  }
}

export const accountabilityEngine = new AccountabilityEngine();
