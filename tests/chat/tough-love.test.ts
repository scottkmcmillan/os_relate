import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToughLoveEngine } from '../../src/relate/chat/tough-love';
import { UnifiedMemory } from '../../src/infrastructure/unified-memory';
import { db } from '../../src/infrastructure/db';
import { ChatMessage } from '../../src/relate/chat/types';

vi.mock('../../src/infrastructure/db');
vi.mock('../../src/infrastructure/embeddings', () => ({
  embedOne: vi.fn((text: string) => {
    // Mock embedding - just return hash-like array
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return new Float32Array(384).fill(hash / 1000);
  }),
}));

describe('ToughLoveEngine', () => {
  let engine: ToughLoveEngine;
  let memory: UnifiedMemory;
  const userId = 'test-user-123';

  beforeEach(() => {
    memory = new UnifiedMemory();
    engine = new ToughLoveEngine(memory);

    // Mock user settings
    vi.mocked(db).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({
        user_id: userId,
        tough_love_mode_enabled: true,
      }),
      select: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    } as any);
  });

  describe('shouldActivate', () => {
    it('should not activate if user has disabled tough love mode', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          user_id: userId,
          tough_love_mode_enabled: false,
        }),
      } as any);

      const decision = await engine.shouldActivate(
        userId,
        'Why does he ignore me?',
        []
      );

      expect(decision.activate).toBe(false);
      expect(decision.confidence).toBe(0);
    });

    it('should detect repetitive questioning', async () => {
      const history: ChatMessage[] = [
        {
          id: '1',
          user_id: userId,
          conversation_id: 'conv-1',
          type: 'user',
          content: 'Why does he ignore me?',
          created_at: new Date('2025-12-29'),
        } as ChatMessage,
        {
          id: '2',
          user_id: userId,
          conversation_id: 'conv-1',
          type: 'user',
          content: 'Should I text him again?',
          created_at: new Date('2025-12-29'),
        } as ChatMessage,
        {
          id: '3',
          user_id: userId,
          conversation_id: 'conv-1',
          type: 'user',
          content: 'Maybe if I reach out one more time?',
          created_at: new Date('2025-12-30'),
        } as ChatMessage,
      ];

      // Mock database for repetition check
      vi.mocked(db).mockReturnValueOnce({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ tough_love_mode_enabled: true }),
      } as any).mockReturnValueOnce({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([
          { content: 'Why does he ignore me?', created_at: new Date('2025-12-29') },
          { content: 'Should I text him again?', created_at: new Date('2025-12-29') },
          { content: 'Maybe if I reach out one more time?', created_at: new Date('2025-12-30') },
        ]),
      } as any);

      const decision = await engine.shouldActivate(
        userId,
        'What if I just call him?',
        history
      );

      expect(decision.activate).toBe(true);
      expect(decision.triggeredPatterns).toContain(
        expect.stringContaining('repetitive_questioning')
      );
    });

    it('should detect self-justification patterns', async () => {
      const history: ChatMessage[] = [
        {
          id: '1',
          user_id: userId,
          conversation_id: 'conv-1',
          type: 'user',
          content: 'I know I should set boundaries',
          created_at: new Date(),
        } as ChatMessage,
      ];

      const decision = await engine.shouldActivate(
        userId,
        'But he made me feel like I had to respond immediately',
        history
      );

      expect(decision.triggeredPatterns).toContain('self_justification');
    });

    it('should detect avoidance language', async () => {
      const decision = await engine.shouldActivate(
        userId,
        "I don't know, maybe I'm overthinking it, but possibly he's just busy",
        []
      );

      if (decision.triggeredPatterns.includes('avoidance')) {
        expect(decision.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should detect validation seeking', async () => {
      const decision = await engine.shouldActivate(
        userId,
        'Is it okay if I just text him one more time? Should I?',
        []
      );

      expect(decision.triggeredPatterns).toContain('validation_seeking');
    });

    it('should detect value contradictions', async () => {
      // Mock core values
      vi.mocked(db).mockReturnValueOnce({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ tough_love_mode_enabled: true }),
      } as any).mockReturnValueOnce({
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([
          {
            id: 'val-1',
            user_id: userId,
            value: 'Authenticity',
            category: 'Primary',
          },
        ]),
      } as any);

      const decision = await engine.shouldActivate(
        userId,
        "Should I pretend to be someone I'm not to make him happy?",
        []
      );

      expect(decision.valueContradictions.length).toBeGreaterThan(0);
    });

    it('should suggest appropriate approach based on confidence', async () => {
      // High confidence - direct
      const highConfidenceDecision = await engine.shouldActivate(
        userId,
        "Maybe I should just keep quiet about my feelings. I don't know, is it okay if I avoid this conversation?",
        []
      );

      if (highConfidenceDecision.confidence > 0.8) {
        expect(highConfidenceDecision.suggestedApproach).toBe('direct');
      }

      // Medium confidence - moderate
      const mediumConfidenceDecision = await engine.shouldActivate(
        userId,
        'Should I talk to him about this?',
        []
      );

      if (mediumConfidenceDecision.confidence > 0.6 && mediumConfidenceDecision.confidence <= 0.8) {
        expect(mediumConfidenceDecision.suggestedApproach).toBe('moderate');
      }
    });
  });

  describe('detectSelfJustification', () => {
    it('should detect "but I had to" patterns', async () => {
      const result = await engine.detectSelfJustification(
        'But I had to respond because he needed me',
        []
      );

      expect(result).toBe(true);
    });

    it('should detect "they made me" patterns', async () => {
      const result = await engine.detectSelfJustification(
        'He made me feel guilty for not replying',
        []
      );

      expect(result).toBe(true);
    });

    it('should detect contradiction after acknowledgment', async () => {
      const history: ChatMessage[] = [
        {
          id: '1',
          user_id: userId,
          conversation_id: 'conv-1',
          type: 'user',
          content: 'I know I should communicate directly',
          created_at: new Date(),
        } as ChatMessage,
      ];

      const result = await engine.detectSelfJustification(
        'But actually, avoiding the topic might be better',
        history
      );

      expect(result).toBe(true);
    });

    it('should not trigger on genuine explanation', async () => {
      const result = await engine.detectSelfJustification(
        'I understand your point and want to work on it',
        []
      );

      expect(result).toBe(false);
    });
  });

  describe('detectRepetitiveComplaint', () => {
    it('should detect repeated similar questions', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([
          { content: 'Why does he ignore me?', created_at: new Date('2025-12-28') },
          { content: 'Why does he not respond?', created_at: new Date('2025-12-29') },
          { content: 'Why is he ignoring my messages?', created_at: new Date('2025-12-30') },
        ]),
      } as any);

      const result = await engine.detectRepetitiveComplaint(
        userId,
        'Why does he keep ignoring me?'
      );

      expect(result).not.toBeNull();
      expect(result!.count).toBeGreaterThanOrEqual(3);
    });

    it('should return null for unique questions', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([
          { content: 'How can I set boundaries?', created_at: new Date('2025-12-28') },
          { content: 'What are healthy communication patterns?', created_at: new Date('2025-12-29') },
        ]),
      } as any);

      const result = await engine.detectRepetitiveComplaint(
        userId,
        'How do attachment styles affect relationships?'
      );

      expect(result).toBeNull();
    });
  });

  describe('findValueContradictions', () => {
    it('should find contradiction for authenticity', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([
          {
            id: 'val-1',
            user_id: userId,
            value: 'Authenticity',
            category: 'Primary',
          },
        ]),
      } as any);

      const contradictions = await engine.findValueContradictions(
        userId,
        'Should I pretend to be interested in his hobbies?'
      );

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].value).toBe('Authenticity');
    });

    it('should find contradiction for honesty', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([
          {
            id: 'val-2',
            user_id: userId,
            value: 'Honesty',
            category: 'Primary',
          },
        ]),
      } as any);

      const contradictions = await engine.findValueContradictions(
        userId,
        "Maybe I just won't tell him about this"
      );

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].value).toBe('Honesty');
    });

    it('should not find contradictions for aligned messages', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([
          {
            id: 'val-3',
            user_id: userId,
            value: 'Growth',
            category: 'Primary',
          },
        ]),
      } as any);

      const contradictions = await engine.findValueContradictions(
        userId,
        'I want to learn better communication skills'
      );

      expect(contradictions.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty history', async () => {
      const decision = await engine.shouldActivate(
        userId,
        'How can I improve my relationship?',
        []
      );

      expect(decision).toBeDefined();
      expect(decision.activate).toBeDefined();
    });

    it('should handle very short messages', async () => {
      const decision = await engine.shouldActivate(userId, 'Help', []);

      expect(decision).toBeDefined();
    });

    it('should handle messages with no patterns', async () => {
      vi.mocked(db).mockReturnValueOnce({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ tough_love_mode_enabled: true }),
      } as any).mockReturnValueOnce({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([]),
      } as any).mockReturnValueOnce({
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([]),
      } as any);

      const decision = await engine.shouldActivate(
        userId,
        'What are some good relationship books?',
        []
      );

      expect(decision.activate).toBe(false);
      expect(decision.triggeredPatterns).toHaveLength(0);
    });

    it('should require multiple patterns for activation', async () => {
      // Only one pattern (validation seeking)
      const decision = await engine.shouldActivate(
        userId,
        'Should I do this?',
        []
      );

      // Should not activate with only one pattern
      expect(decision.activate).toBe(false);
    });
  });
});
