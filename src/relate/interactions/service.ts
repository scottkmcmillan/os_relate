/**
 * Interaction Service - Relationship event tracking and analysis
 *
 * Tracks real-world relationship interactions with progress tracking,
 * value contradiction detection, and emotion trend analysis.
 *
 * @module relate/interactions/service
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type InteractionType =
  | 'conversation'
  | 'date'
  | 'conflict'
  | 'quality_time'
  | 'phone_call'
  | 'text_message'
  | 'group_activity'
  | 'one_on_one';

export type InteractionOutcome =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'mixed';

export type EmotionType =
  | 'joy'
  | 'trust'
  | 'anticipation'
  | 'surprise'
  | 'fear'
  | 'sadness'
  | 'anger'
  | 'disgust';

export interface Interaction {
  id: string;
  userId: string;
  person: string;
  type: InteractionType;
  date: Date;
  duration?: number; // in minutes
  location?: string;
  summary: string;
  outcome: InteractionOutcome;
  emotions: EmotionType[];
  valueAlignmentScore?: number; // 0.0 - 1.0
  linkedFocusAreas: string[];
  linkedValues: string[];
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionCreate {
  person: string;
  type: InteractionType;
  date: Date;
  duration?: number;
  location?: string;
  summary: string;
  outcome: InteractionOutcome;
  emotions: EmotionType[];
  linkedFocusAreas?: string[];
  linkedValues?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

export interface InteractionFilters {
  type?: InteractionType;
  person?: string;
  outcome?: InteractionOutcome;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface InteractionStats {
  total: number;
  byType: Record<InteractionType, number>;
  byOutcome: Record<InteractionOutcome, number>;
  avgPerWeek: number;
  topPeople: { person: string; count: number }[];
}

export interface ValueContradiction {
  id: string;
  interactionId: string;
  valueId: string;
  valueName: string;
  contradictionScore: number; // 0.0 - 1.0
  description: string;
  suggestedAction?: string;
  detectedAt: Date;
}

export interface EmotionTrend {
  period: string; // ISO date
  emotion: EmotionType;
  frequency: number;
  intensity: number; // 0.0 - 1.0
}

// ============================================================================
// In-Memory Storage
// ============================================================================

class InteractionStore {
  private interactions: Map<string, Interaction> = new Map();
  private contradictions: Map<string, ValueContradiction> = new Map();

  // Interaction CRUD
  getAll(userId: string, filters?: InteractionFilters): Interaction[] {
    let results = Array.from(this.interactions.values())
      .filter(i => i.userId === userId);

    // Apply filters
    if (filters?.type) {
      results = results.filter(i => i.type === filters.type);
    }
    if (filters?.person) {
      results = results.filter(i => i.person === filters.person);
    }
    if (filters?.outcome) {
      results = results.filter(i => i.outcome === filters.outcome);
    }
    if (filters?.dateFrom) {
      results = results.filter(i => i.date >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      results = results.filter(i => i.date <= filters.dateTo!);
    }

    // Sort by date descending
    results.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Apply limit
    if (filters?.limit && filters.limit > 0) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  get(id: string): Interaction | null {
    return this.interactions.get(id) || null;
  }

  create(interaction: Interaction): Interaction {
    this.interactions.set(interaction.id, interaction);
    return interaction;
  }

  update(id: string, updates: Partial<Interaction>): Interaction | null {
    const interaction = this.interactions.get(id);
    if (!interaction) return null;

    const updated = {
      ...interaction,
      ...updates,
      updatedAt: new Date()
    };
    this.interactions.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    // Delete associated contradictions
    Array.from(this.contradictions.values())
      .filter(c => c.interactionId === id)
      .forEach(c => this.contradictions.delete(c.id));

    return this.interactions.delete(id);
  }

  // Contradiction management
  getContradictions(interactionId: string): ValueContradiction[] {
    return Array.from(this.contradictions.values())
      .filter(c => c.interactionId === interactionId);
  }

  createContradiction(contradiction: ValueContradiction): void {
    this.contradictions.set(contradiction.id, contradiction);
  }
}

// Singleton store instance
const store = new InteractionStore();

// ============================================================================
// Interaction Service Implementation
// ============================================================================

export class InteractionService {
  /**
   * Get all interactions with optional filters
   */
  async getAll(userId: string, filters?: InteractionFilters): Promise<Interaction[]> {
    return store.getAll(userId, filters);
  }

  /**
   * Get a specific interaction
   */
  async get(userId: string, interactionId: string): Promise<Interaction | null> {
    const interaction = store.get(interactionId);

    // Verify ownership
    if (interaction && interaction.userId !== userId) {
      return null;
    }

    return interaction;
  }

  /**
   * Create a new interaction
   */
  async create(userId: string, data: InteractionCreate): Promise<Interaction> {
    const interaction: Interaction = {
      id: `int_${uuidv4()}`,
      userId,
      person: data.person,
      type: data.type,
      date: data.date,
      duration: data.duration,
      location: data.location,
      summary: data.summary,
      outcome: data.outcome,
      emotions: data.emotions,
      linkedFocusAreas: data.linkedFocusAreas || [],
      linkedValues: data.linkedValues || [],
      notes: data.notes,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return store.create(interaction);
  }

  /**
   * Update an interaction
   */
  async update(
    userId: string,
    interactionId: string,
    updates: Partial<Interaction>
  ): Promise<Interaction> {
    const interaction = await this.get(userId, interactionId);
    if (!interaction) {
      throw new Error('Interaction not found');
    }

    // Don't allow changing userId or id
    const { id, userId: _, ...allowedUpdates } = updates;

    const updated = store.update(interactionId, allowedUpdates);
    if (!updated) {
      throw new Error('Failed to update interaction');
    }

    return updated;
  }

  /**
   * Delete an interaction
   */
  async delete(userId: string, interactionId: string): Promise<void> {
    const interaction = await this.get(userId, interactionId);
    if (!interaction) {
      throw new Error('Interaction not found');
    }

    const deleted = store.delete(interactionId);
    if (!deleted) {
      throw new Error('Failed to delete interaction');
    }
  }

  /**
   * Get interaction statistics for a period
   */
  async getStats(userId: string, period: Period): Promise<InteractionStats> {
    const dateFrom = this.getDateFromPeriod(period);
    const interactions = await this.getAll(userId, { dateFrom });

    // Calculate stats
    const byType: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    const personCount: Record<string, number> = {};

    interactions.forEach(i => {
      byType[i.type] = (byType[i.type] || 0) + 1;
      byOutcome[i.outcome] = (byOutcome[i.outcome] || 0) + 1;
      personCount[i.person] = (personCount[i.person] || 0) + 1;
    });

    // Calculate average per week
    const weeks = this.getWeeksInPeriod(period);
    const avgPerWeek = interactions.length / weeks;

    // Get top people
    const topPeople = Object.entries(personCount)
      .map(([person, count]) => ({ person, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: interactions.length,
      byType: byType as Record<InteractionType, number>,
      byOutcome: byOutcome as Record<InteractionOutcome, number>,
      avgPerWeek,
      topPeople
    };
  }

  /**
   * Get interactions for a specific person
   */
  async getByPerson(userId: string, person: string): Promise<Interaction[]> {
    return this.getAll(userId, { person });
  }

  /**
   * Get interactions within a date range
   */
  async getByDateRange(userId: string, from: Date, to: Date): Promise<Interaction[]> {
    return this.getAll(userId, { dateFrom: from, dateTo: to });
  }

  /**
   * Detect value contradictions in an interaction
   */
  async detectValueContradictions(
    userId: string,
    interaction: Interaction
  ): Promise<ValueContradiction[]> {
    const contradictions: ValueContradiction[] = [];

    // Check for negative outcomes with linked values
    if (interaction.outcome === 'negative' && interaction.linkedValues.length > 0) {
      for (const valueId of interaction.linkedValues) {
        const contradiction: ValueContradiction = {
          id: `cont_${uuidv4()}`,
          interactionId: interaction.id,
          valueId,
          valueName: 'Core Value', // Would fetch from values service
          contradictionScore: 0.7,
          description: `This negative interaction may contradict your values`,
          suggestedAction: 'Reflect on how to better align future interactions with your values',
          detectedAt: new Date()
        };

        store.createContradiction(contradiction);
        contradictions.push(contradiction);
      }
    }

    // Check for emotion-value misalignment
    const negativeEmotions: EmotionType[] = ['fear', 'sadness', 'anger', 'disgust'];
    const hasNegativeEmotions = interaction.emotions.some(e => negativeEmotions.includes(e));

    if (hasNegativeEmotions && interaction.linkedValues.length > 0) {
      // Additional contradiction detection logic
      // This is a simplified example
    }

    return contradictions;
  }

  /**
   * Get emotion trends over a period
   */
  async getEmotionTrends(userId: string, period: Period): Promise<EmotionTrend[]> {
    const dateFrom = this.getDateFromPeriod(period);
    const interactions = await this.getAll(userId, { dateFrom });

    // Group by period (e.g., week) and emotion
    const emotionData: Record<string, Record<EmotionType, number>> = {};

    interactions.forEach(interaction => {
      const periodKey = this.getPeriodKey(interaction.date, period);

      if (!emotionData[periodKey]) {
        emotionData[periodKey] = {} as Record<EmotionType, number>;
      }

      interaction.emotions.forEach(emotion => {
        emotionData[periodKey][emotion] = (emotionData[periodKey][emotion] || 0) + 1;
      });
    });

    // Convert to trend format
    const trends: EmotionTrend[] = [];

    Object.entries(emotionData).forEach(([periodKey, emotions]) => {
      Object.entries(emotions).forEach(([emotion, frequency]) => {
        trends.push({
          period: periodKey,
          emotion: emotion as EmotionType,
          frequency,
          intensity: frequency / 10 // Normalize to 0-1 scale (simplified)
        });
      });
    });

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getDateFromPeriod(period: Period): Date {
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

  private getWeeksInPeriod(period: Period): number {
    switch (period) {
      case 'day': return 1 / 7;
      case 'week': return 1;
      case 'month': return 4;
      case 'quarter': return 13;
      case 'year': return 52;
      default: return 1;
    }
  }

  private getPeriodKey(date: Date, period: Period): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const week = this.getWeekNumber(date);

    switch (period) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week':
        return `${year}-W${week.toString().padStart(2, '0')}`;
      case 'month':
        return `${year}-${month.toString().padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      case 'year':
        return year.toString();
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

// ============================================================================
// Export Service Instance
// ============================================================================

export const interactionService = new InteractionService();
export default interactionService;
