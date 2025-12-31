import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import type {
  UpcomingEvent,
  EventCreate,
  EventBriefing,
  Interaction,
  InteractionOutcome,
  ContentItem
} from '../types';

export class EventService {
  private events: Map<string, UpcomingEvent> = new Map();

  // CRUD Operations

  async getAll(userId: string): Promise<UpcomingEvent[]> {
    const userEvents: UpcomingEvent[] = [];

    for (const event of this.events.values()) {
      if (event.userId === userId) {
        userEvents.push(event);
      }
    }

    return userEvents.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  }

  async get(userId: string, eventId: string): Promise<UpcomingEvent | null> {
    const event = this.events.get(eventId);

    if (!event) {
      return null;
    }

    if (event.userId !== userId) {
      throw new AppError('Unauthorized access to event', 403);
    }

    return event;
  }

  async create(userId: string, data: EventCreate): Promise<UpcomingEvent> {
    // Validate datetime
    const eventDate = new Date(data.datetime);
    if (isNaN(eventDate.getTime())) {
      throw new AppError('Invalid datetime format', 400);
    }

    if (eventDate < new Date()) {
      throw new AppError('Event datetime must be in the future', 400);
    }

    const event: UpcomingEvent = {
      id: uuidv4(),
      userId,
      title: data.title,
      person: data.person,
      eventType: data.eventType,
      datetime: eventDate,
      preparationNotes: data.preparationNotes,
      talkingPoints: data.talkingPoints || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.events.set(event.id, event);
    logger.info(`Event created: ${event.id} for user ${userId}`);

    return event;
  }

  async update(
    userId: string,
    eventId: string,
    updates: Partial<UpcomingEvent>
  ): Promise<UpcomingEvent> {
    const event = await this.get(userId, eventId);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Validate datetime if provided
    if (updates.datetime) {
      const newDate = new Date(updates.datetime);
      if (isNaN(newDate.getTime())) {
        throw new AppError('Invalid datetime format', 400);
      }
      updates.datetime = newDate;
    }

    // Prevent updating immutable fields
    delete (updates as any).id;
    delete (updates as any).userId;
    delete (updates as any).createdAt;

    const updatedEvent = {
      ...event,
      ...updates,
      updatedAt: new Date()
    };

    this.events.set(eventId, updatedEvent);
    logger.info(`Event updated: ${eventId}`);

    return updatedEvent;
  }

  async delete(userId: string, eventId: string): Promise<void> {
    const event = await this.get(userId, eventId);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    this.events.delete(eventId);
    logger.info(`Event deleted: ${eventId}`);
  }

  // Filtering Operations

  async getUpcoming(userId: string, days: number = 7): Promise<UpcomingEvent[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const allEvents = await this.getAll(userId);

    return allEvents.filter(
      event => event.datetime >= now && event.datetime <= futureDate
    );
  }

  async getByPerson(userId: string, person: string): Promise<UpcomingEvent[]> {
    const allEvents = await this.getAll(userId);

    return allEvents.filter(
      event => event.person.toLowerCase() === person.toLowerCase()
    );
  }

  async getPast(userId: string, days: number = 30): Promise<UpcomingEvent[]> {
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    const allEvents = await this.getAll(userId);

    return allEvents.filter(
      event => event.datetime < now && event.datetime >= pastDate
    );
  }

  async getByType(userId: string, eventType: string): Promise<UpcomingEvent[]> {
    const allEvents = await this.getAll(userId);

    return allEvents.filter(
      event => event.eventType.toLowerCase() === eventType.toLowerCase()
    );
  }

  async searchEvents(userId: string, query: string): Promise<UpcomingEvent[]> {
    const allEvents = await this.getAll(userId);
    const lowerQuery = query.toLowerCase();

    return allEvents.filter(
      event =>
        event.title.toLowerCase().includes(lowerQuery) ||
        event.person.toLowerCase().includes(lowerQuery) ||
        event.eventType.toLowerCase().includes(lowerQuery) ||
        event.preparationNotes?.toLowerCase().includes(lowerQuery)
    );
  }

  // Briefing Generation

  async generateBriefing(userId: string, eventId: string): Promise<EventBriefing> {
    const event = await this.get(userId, eventId);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    logger.info(`Generating briefing for event: ${eventId}`);

    // Gather person history
    const personHistory = await this.getPersonHistory(userId, event.person);

    // Generate suggested topics based on context
    const suggestedTopics = await this.generateSuggestedTopics(
      userId,
      event,
      personHistory
    );

    // Generate warnings and cautions
    const warningsAndCautions = await this.generateWarnings(
      userId,
      event,
      personHistory
    );

    // Find relevant content
    const relevantContent = await this.findRelevantContent(userId, event);

    // Generate preparation checklist
    const preparationChecklist = this.generatePreparationChecklist(event, personHistory);

    const briefing: EventBriefing = {
      event,
      personHistory,
      suggestedTopics,
      warningsAndCautions,
      relevantContent,
      preparationChecklist
    };

    logger.info(`Briefing generated successfully for event: ${eventId}`);

    return briefing;
  }

  private async getPersonHistory(
    userId: string,
    person: string
  ): Promise<{
    recentInteractions: Interaction[];
    relationshipHealth: number;
    lastOutcome: InteractionOutcome;
  }> {
    // In production, this would fetch from interaction service
    // Placeholder implementation
    const recentInteractions: Interaction[] = [];

    // Calculate relationship health based on recent interactions
    let relationshipHealth = 0.5; // Default neutral

    if (recentInteractions.length > 0) {
      const positiveOutcomes = recentInteractions.filter(
        i => i.outcome === 'very_positive' || i.outcome === 'positive'
      ).length;

      relationshipHealth = positiveOutcomes / recentInteractions.length;
    }

    const lastOutcome: InteractionOutcome =
      recentInteractions.length > 0
        ? recentInteractions[0].outcome
        : 'neutral';

    return {
      recentInteractions: recentInteractions.slice(0, 5), // Last 5 interactions
      relationshipHealth,
      lastOutcome
    };
  }

  private async generateSuggestedTopics(
    userId: string,
    event: UpcomingEvent,
    personHistory: any
  ): Promise<string[]> {
    const topics: string[] = [];

    // Add topics from event preparation notes
    if (event.preparationNotes) {
      topics.push(...this.extractTopicsFromNotes(event.preparationNotes));
    }

    // Add topics from talking points
    if (event.talkingPoints && event.talkingPoints.length > 0) {
      topics.push(...event.talkingPoints);
    }

    // Add topics based on relationship health
    if (personHistory.relationshipHealth < 0.4) {
      topics.push('Address any recent concerns or misunderstandings');
      topics.push('Rebuild rapport and trust');
    }

    // Add event-type specific topics
    const eventTopics = this.getEventTypeTopics(event.eventType);
    topics.push(...eventTopics);

    // Remove duplicates and limit to top 10
    return [...new Set(topics)].slice(0, 10);
  }

  private extractTopicsFromNotes(notes: string): string[] {
    // Simple extraction - in production, use NLP
    const sentences = notes.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.map(s => s.trim()).slice(0, 3);
  }

  private getEventTypeTopics(eventType: string): string[] {
    const topicMap: Record<string, string[]> = {
      'business_meeting': [
        'Review quarterly goals',
        'Discuss project timelines',
        'Address any blockers'
      ],
      'coffee_chat': [
        'Catch up on recent developments',
        'Share interesting insights',
        'Discuss mutual interests'
      ],
      'interview': [
        'Review candidate background',
        'Prepare technical questions',
        'Discuss role expectations'
      ],
      'presentation': [
        'Review presentation materials',
        'Prepare for Q&A',
        'Check technical setup'
      ],
      'social': [
        'Plan conversation starters',
        'Review shared interests',
        'Prepare light topics'
      ]
    };

    return topicMap[eventType.toLowerCase()] || [
      'Discuss recent updates',
      'Share relevant information',
      'Address any pending items'
    ];
  }

  private async generateWarnings(
    userId: string,
    event: UpcomingEvent,
    personHistory: any
  ): Promise<string[]> {
    const warnings: string[] = [];

    // Relationship health warnings
    if (personHistory.relationshipHealth < 0.3) {
      warnings.push(
        'CAUTION: Recent interactions suggest strained relationship. Approach with care.'
      );
    }

    // Last interaction outcome warnings
    if (
      personHistory.lastOutcome === 'negative' ||
      personHistory.lastOutcome === 'very_negative'
    ) {
      warnings.push(
        'WARNING: Last interaction had a negative outcome. Consider addressing this early.'
      );
    }

    // Time-based warnings
    const hoursUntilEvent = (event.datetime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 2) {
      warnings.push('URGENT: Event is less than 2 hours away. Final preparations needed.');
    } else if (hoursUntilEvent < 24) {
      warnings.push('REMINDER: Event is tomorrow. Ensure all preparations are complete.');
    }

    // Interaction gap warnings
    if (personHistory.recentInteractions.length === 0) {
      warnings.push(
        'NOTE: No recent interaction history with this person. First-time or reconnection meeting.'
      );
    } else {
      const lastInteraction = personHistory.recentInteractions[0];
      const daysSinceLastInteraction =
        (Date.now() - lastInteraction.createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastInteraction > 90) {
        warnings.push(
          `NOTE: Last interaction was ${Math.floor(daysSinceLastInteraction)} days ago. Consider re-establishing context.`
        );
      }
    }

    return warnings;
  }

  private async findRelevantContent(
    userId: string,
    event: UpcomingEvent
  ): Promise<ContentItem[]> {
    // In production, this would use RAG to find semantically similar content
    // Placeholder implementation
    const relevantContent: ContentItem[] = [];

    // Search keywords from event
    const keywords = [
      event.title,
      event.person,
      event.eventType,
      ...(event.talkingPoints || [])
    ];

    // In production, perform vector search using keywords
    // For now, return empty array
    return relevantContent;
  }

  private generatePreparationChecklist(
    event: UpcomingEvent,
    personHistory: any
  ): string[] {
    const checklist: string[] = [];

    // Time-based tasks
    const hoursUntilEvent = (event.datetime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 1) {
      checklist.push('Join meeting/Leave for venue now');
    } else if (hoursUntilEvent < 24) {
      checklist.push('Review briefing materials one final time');
      checklist.push('Prepare any necessary documents or materials');
      checklist.push('Test technology (if virtual meeting)');
    } else {
      checklist.push('Review this briefing thoroughly');
      checklist.push('Research recent developments related to discussion topics');
    }

    // Relationship-based tasks
    if (personHistory.relationshipHealth < 0.5) {
      checklist.push('Prepare approach to address any relationship concerns');
      checklist.push('Consider starting with positive acknowledgments');
    }

    // Event-type specific tasks
    checklist.push(...this.getEventTypeChecklist(event.eventType));

    // General tasks
    checklist.push('Review talking points from previous interactions');
    checklist.push('Prepare questions or discussion topics');
    checklist.push('Set clear objectives for the meeting');
    checklist.push('Plan follow-up actions');

    return checklist;
  }

  private getEventTypeChecklist(eventType: string): string[] {
    const checklistMap: Record<string, string[]> = {
      'business_meeting': [
        'Review agenda items',
        'Prepare status updates',
        'Bring necessary documents or reports'
      ],
      'coffee_chat': [
        'Choose a comfortable venue',
        'Prepare interesting conversation topics',
        'Keep schedule flexible'
      ],
      'interview': [
        'Review candidate resume',
        'Prepare evaluation criteria',
        'Coordinate with other interviewers'
      ],
      'presentation': [
        'Test presentation equipment',
        'Rehearse key points',
        'Prepare backup materials'
      ],
      'social': [
        'Confirm attendance',
        'Prepare appropriate attire',
        'Plan arrival time'
      ]
    };

    return checklistMap[eventType.toLowerCase()] || [
      'Confirm meeting details',
      'Prepare discussion materials',
      'Set reminders'
    ];
  }

  // Utility methods

  async getEventCountByType(userId: string): Promise<Record<string, number>> {
    const allEvents = await this.getAll(userId);
    const counts: Record<string, number> = {};

    for (const event of allEvents) {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
    }

    return counts;
  }

  async getEventsInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UpcomingEvent[]> {
    const allEvents = await this.getAll(userId);

    return allEvents.filter(
      event => event.datetime >= startDate && event.datetime <= endDate
    );
  }

  async markEventAsCompleted(userId: string, eventId: string): Promise<void> {
    // In production, this would move the event to a "completed" state
    // and potentially trigger creation of an interaction record
    const event = await this.get(userId, eventId);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    logger.info(`Event marked as completed: ${eventId}`);

    // For now, we'll keep it in the system
    // In production, might move to a different collection or add a "completed" flag
  }

  async getEventReminders(userId: string): Promise<UpcomingEvent[]> {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const allEvents = await this.getAll(userId);

    return allEvents.filter(
      event => event.datetime >= now && event.datetime <= next24Hours
    );
  }
}

export const eventService = new EventService();
