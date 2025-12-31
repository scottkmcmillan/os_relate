/**
 * Progress Tracker - Streak management and focus area progress tracking
 *
 * Handles streak counting, focus area progress calculation, and auto-linking
 * of interactions to focus areas.
 *
 * @module relate/interactions/progress
 */

import { v4 as uuidv4 } from 'uuid';
import { Interaction } from './service';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  streakStartDate: Date;
  totalActiveDays: number;
  milestones: StreakMilestone[];
  updatedAt: Date;
}

export interface StreakMilestone {
  days: number;
  achieved: boolean;
  achievedAt?: Date;
}

export interface FocusAreaActivity {
  id: string;
  userId: string;
  focusAreaId: string;
  interactionId: string;
  activityDate: Date;
  contribution: number; // 0.0 - 1.0
  createdAt: Date;
}

// ============================================================================
// In-Memory Storage
// ============================================================================

class ProgressStore {
  private streaks: Map<string, StreakData> = new Map();
  private activities: Map<string, FocusAreaActivity> = new Map();

  // Streak operations
  getStreak(userId: string): StreakData | null {
    return this.streaks.get(userId) || null;
  }

  setStreak(streak: StreakData): void {
    this.streaks.set(streak.userId, streak);
  }

  // Activity operations
  getActivities(userId: string, focusAreaId?: string): FocusAreaActivity[] {
    const activities = Array.from(this.activities.values())
      .filter(a => a.userId === userId);

    if (focusAreaId) {
      return activities.filter(a => a.focusAreaId === focusAreaId);
    }

    return activities;
  }

  createActivity(activity: FocusAreaActivity): void {
    this.activities.set(activity.id, activity);
  }

  getRecentActivities(userId: string, focusAreaId: string, days: number): FocusAreaActivity[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.getActivities(userId, focusAreaId)
      .filter(a => a.activityDate >= cutoffDate)
      .sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());
  }
}

// Singleton store instance
const store = new ProgressStore();

// ============================================================================
// Progress Tracker Implementation
// ============================================================================

export class ProgressTracker {
  private readonly MILESTONE_DAYS = [7, 14, 30, 60, 90, 180, 365];

  /**
   * Update streak based on new activity
   */
  async updateStreak(userId: string): Promise<number> {
    const now = new Date();
    const today = this.stripTime(now);
    let streak = store.getStreak(userId);

    if (!streak) {
      // Initialize new streak
      streak = this.createNewStreak(userId, today);
    } else {
      const lastActivity = this.stripTime(new Date(streak.lastActivityDate));
      const daysSinceLastActivity = this.getDaysDifference(lastActivity, today);

      if (daysSinceLastActivity === 0) {
        // Same day - no change to streak
        return streak.currentStreak;
      } else if (daysSinceLastActivity === 1) {
        // Consecutive day - increment streak
        streak.currentStreak++;
        streak.totalActiveDays++;

        // Update longest streak if current is longer
        if (streak.currentStreak > streak.longestStreak) {
          streak.longestStreak = streak.currentStreak;
        }

        // Check for new milestone achievements
        this.updateMilestones(streak, now);
      } else {
        // Streak broken - reset
        streak.currentStreak = 1;
        streak.streakStartDate = today;
        streak.totalActiveDays++;

        // Reset milestone achievements for current streak
        streak.milestones = this.MILESTONE_DAYS.map(days => ({
          days,
          achieved: false
        }));
      }

      streak.lastActivityDate = today;
      streak.updatedAt = now;
    }

    store.setStreak(streak);
    return streak.currentStreak;
  }

  /**
   * Get current streak data
   */
  async getStreak(userId: string): Promise<StreakData> {
    let streak = store.getStreak(userId);

    if (!streak) {
      const today = new Date();
      streak = this.createNewStreak(userId, today);
      store.setStreak(streak);
    }

    return streak;
  }

  /**
   * Calculate progress for a focus area (0.0 - 1.0)
   */
  async calculateProgress(userId: string, focusAreaId: string): Promise<number> {
    const activities = store.getActivities(userId, focusAreaId);

    if (activities.length === 0) {
      return 0.0;
    }

    // Simple calculation: sum of contributions normalized
    // In production, this would use more sophisticated metrics
    const totalContribution = activities.reduce((sum, a) => sum + a.contribution, 0);
    const maxContribution = 100; // Arbitrary max for normalization

    return Math.min(totalContribution / maxContribution, 1.0);
  }

  /**
   * Calculate weekly change in progress
   */
  async calculateWeeklyChange(userId: string, focusAreaId: string): Promise<number> {
    const thisWeekActivities = store.getRecentActivities(userId, focusAreaId, 7);
    const lastWeekActivities = store.getRecentActivities(userId, focusAreaId, 14)
      .filter(a => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return a.activityDate < weekAgo;
      });

    const thisWeekContribution = thisWeekActivities.reduce((sum, a) => sum + a.contribution, 0);
    const lastWeekContribution = lastWeekActivities.reduce((sum, a) => sum + a.contribution, 0);

    // Return percentage change
    if (lastWeekContribution === 0) {
      return thisWeekContribution > 0 ? 1.0 : 0.0;
    }

    return (thisWeekContribution - lastWeekContribution) / lastWeekContribution;
  }

  /**
   * Record activity for a focus area
   */
  async recordActivity(
    userId: string,
    focusAreaId: string,
    interactionId: string
  ): Promise<void> {
    const activity: FocusAreaActivity = {
      id: `act_${uuidv4()}`,
      userId,
      focusAreaId,
      interactionId,
      activityDate: new Date(),
      contribution: 1.0, // Default contribution
      createdAt: new Date()
    };

    store.createActivity(activity);

    // Update streak
    await this.updateStreak(userId);
  }

  /**
   * Auto-link interaction to relevant focus areas
   */
  async linkInteractionToFocusAreas(
    userId: string,
    interaction: Interaction
  ): Promise<string[]> {
    const linkedFocusAreas: string[] = [];

    // If interaction already has linked focus areas, use those
    if (interaction.linkedFocusAreas.length > 0) {
      for (const focusAreaId of interaction.linkedFocusAreas) {
        await this.recordActivity(userId, focusAreaId, interaction.id);
        linkedFocusAreas.push(focusAreaId);
      }
      return linkedFocusAreas;
    }

    // Auto-linking logic based on interaction type, values, etc.
    // This is simplified - in production would use semantic matching

    // For now, return empty array if no explicit links
    return linkedFocusAreas;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createNewStreak(userId: string, date: Date): StreakData {
    return {
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: date,
      streakStartDate: date,
      totalActiveDays: 1,
      milestones: this.MILESTONE_DAYS.map(days => ({
        days,
        achieved: false
      })),
      updatedAt: new Date()
    };
  }

  private updateMilestones(streak: StreakData, now: Date): void {
    streak.milestones.forEach(milestone => {
      if (!milestone.achieved && streak.currentStreak >= milestone.days) {
        milestone.achieved = true;
        milestone.achievedAt = now;
      }
    });
  }

  private stripTime(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

// ============================================================================
// Export Service Instance
// ============================================================================

export const progressTracker = new ProgressTracker();
export default progressTracker;
