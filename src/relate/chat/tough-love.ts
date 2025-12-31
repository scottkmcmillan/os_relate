import { db } from '../../infrastructure/db';
import { UnifiedMemory } from '../../infrastructure/unified-memory';
import { embedOne } from '../../infrastructure/embeddings';
import {
  ToughLoveDecision,
  BehavioralPattern,
  ChatMessage,
  CoreValue,
  ValueContradiction,
  RepetitionInfo,
} from './types';

/**
 * Tough Love Engine
 * Detects when candid, challenging feedback is appropriate
 */
export class ToughLoveEngine {
  private memory: UnifiedMemory;

  constructor(memory: UnifiedMemory) {
    this.memory = memory;
  }

  /**
   * Determine if tough love mode should activate
   */
  async shouldActivate(
    userId: string,
    message: string,
    history: ChatMessage[]
  ): Promise<ToughLoveDecision> {
    // Check if user has enabled tough love mode
    const settings = await db('user_settings')
      .where('user_id', userId)
      .first();

    if (!settings?.tough_love_mode_enabled) {
      return {
        activate: false,
        confidence: 0,
        triggeredPatterns: [],
        valueContradictions: [],
        suggestedApproach: 'gentle',
      };
    }

    const triggeredPatterns: string[] = [];
    const valueContradictions: string[] = [];
    let totalConfidence = 0;
    let patternCount = 0;

    // 1. Check for repetitive questioning
    const repetition = await this.detectRepetitiveComplaint(userId, message);
    if (repetition && repetition.count >= 3) {
      triggeredPatterns.push(`repetitive_questioning (${repetition.count} similar questions)`);
      totalConfidence += 0.8;
      patternCount++;
    }

    // 2. Check for self-justification
    const isSelfJustifying = await this.detectSelfJustification(message, history);
    if (isSelfJustifying) {
      triggeredPatterns.push('self_justification');
      totalConfidence += 0.7;
      patternCount++;
    }

    // 3. Check for avoidance patterns
    const avoidanceScore = this.detectAvoidance(message);
    if (avoidanceScore > 0.6) {
      triggeredPatterns.push('avoidance');
      totalConfidence += avoidanceScore;
      patternCount++;
    }

    // 4. Check for validation seeking
    const validationScore = this.detectValidationSeeking(message);
    if (validationScore > 0.7) {
      triggeredPatterns.push('validation_seeking');
      totalConfidence += validationScore;
      patternCount++;
    }

    // 5. Check value contradictions
    const contradictions = await this.findValueContradictions(userId, message);
    if (contradictions.length > 0) {
      contradictions.forEach(c => {
        valueContradictions.push(`${c.value}: ${c.contradiction}`);
      });
      totalConfidence += 0.9;
      patternCount++;
    }

    // Calculate final confidence
    const confidence = patternCount > 0 ? totalConfidence / patternCount : 0;

    // Determine approach
    let suggestedApproach: 'gentle' | 'moderate' | 'direct' = 'gentle';
    if (confidence > 0.8) suggestedApproach = 'direct';
    else if (confidence > 0.6) suggestedApproach = 'moderate';

    return {
      activate: confidence > 0.6 && (triggeredPatterns.length >= 2 || valueContradictions.length > 0),
      confidence,
      triggeredPatterns,
      valueContradictions,
      suggestedApproach,
    };
  }

  /**
   * Get behavioral patterns for user
   */
  async getPatterns(userId: string): Promise<BehavioralPattern[]> {
    const patterns = await this.memory.retrieve('tough_love/patterns', userId);
    return patterns?.value || [];
  }

  /**
   * Detect self-justification in message
   */
  async detectSelfJustification(message: string, history: ChatMessage[]): Promise<boolean> {
    const justificationPatterns = [
      /\b(but|however)\b.*\b(had to|needed to|forced to)\b/gi,
      /\b(they|he|she)\b.*\b(made me|caused me|left me no choice)\b/gi,
      /\b(I know.*but|I understand.*but)\b/gi,
      /\b(it's just|it's only|I was just)\b/gi,
    ];

    let matchCount = 0;
    justificationPatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) matchCount += matches.length;
    });

    // Check if user previously acknowledged an issue but is now justifying
    if (history.length > 2) {
      const recentMessages = history.slice(-5).filter(m => m.type === 'user');
      for (const msg of recentMessages) {
        if (msg.content.match(/\b(I know|I should|you're right)\b/gi)) {
          if (message.match(/\b(but|however|actually)\b/gi)) {
            return true;
          }
        }
      }
    }

    return matchCount >= 2;
  }

  /**
   * Detect repetitive complaints
   */
  async detectRepetitiveComplaint(userId: string, message: string): Promise<RepetitionInfo | null> {
    // Get user's recent chat messages
    const recentMessages = await db('chat_messages')
      .where('user_id', userId)
      .where('type', 'user')
      .orderBy('created_at', 'desc')
      .limit(20)
      .select('content', 'created_at');

    if (recentMessages.length < 3) return null;

    const messageEmbedding = await embedOne(message, 384);
    const similarities: Array<{ similarity: number; content: string; date: Date }> = [];

    for (const msg of recentMessages) {
      const embedding = await embedOne(msg.content, 384);
      const similarity = this.cosineSimilarity(messageEmbedding, embedding);

      if (similarity > 0.7) {
        similarities.push({
          similarity,
          content: msg.content,
          date: msg.created_at,
        });
      }
    }

    if (similarities.length >= 3) {
      return {
        count: similarities.length,
        examples: similarities.slice(0, 3).map(s => s.content),
        firstOccurrence: similarities[similarities.length - 1].date,
        lastOccurrence: similarities[0].date,
      };
    }

    return null;
  }

  /**
   * Find value contradictions
   */
  async findValueContradictions(userId: string, message: string): Promise<ValueContradiction[]> {
    // Get user's core values
    const values = await db('core_values')
      .where('user_id', userId)
      .where('category', 'Primary')
      .select('*');

    const contradictions: ValueContradiction[] = [];

    for (const value of values) {
      const contradiction = await this.checkValueAlignment(message, value);
      if (contradiction) {
        contradictions.push({
          value: value.value,
          category: value.category,
          contradiction,
          confidence: 0.8,
        });
      }
    }

    return contradictions;
  }

  /**
   * Check if message contradicts a value
   */
  private async checkValueAlignment(message: string, value: CoreValue): Promise<string | null> {
    const lowerMessage = message.toLowerCase();
    const lowerValue = value.value.toLowerCase();

    // Define contradiction patterns for common values
    const contradictionMap: Record<string, string[]> = {
      'authenticity': ['pretend', 'fake', 'lie', 'hide who I am'],
      'honesty': ['not tell', 'omit', 'hide the truth', "don't mention"],
      'growth': ['stay the same', 'avoid changing', "can't change"],
      'vulnerability': ['keep it to myself', "won't share", 'stay closed'],
      'respect': ['disrespect', 'ignore their feelings', "don't care what they"],
      'communication': ['not talk about', 'avoid discussing', 'keep silent'],
      'boundaries': ['let them', 'allow them to', 'accept their'],
    };

    // Check for contradictions
    for (const [valueTerm, contradictoryPhrases] of Object.entries(contradictionMap)) {
      if (lowerValue.includes(valueTerm)) {
        for (const phrase of contradictoryPhrases) {
          if (lowerMessage.includes(phrase)) {
            return `Message suggests "${phrase}" which contradicts your value of ${value.value}`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Detect avoidance language
   */
  private detectAvoidance(message: string): number {
    const avoidancePatterns = [
      /\b(maybe|might|could|possibly|perhaps)\b/gi,
      /\b(I don't know|not sure|unclear|uncertain)\b/gi,
      /\b(but|however|although)\b.*\b(reason|excuse|explain)\b/gi,
      /\b(they|he|she|them)\b.*\b(made me|caused|forced)\b/gi,
      /\b(I can't|unable to|impossible to)\b/gi,
    ];

    let score = 0;
    avoidancePatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        score += matches.length * 0.2;
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Detect validation seeking
   */
  private detectValidationSeeking(message: string): number {
    const validationPatterns = [
      /\b(right|wrong|okay|fine|acceptable)\b.*\b(to|if I)\b/gi,
      /\b(should I|is it okay|am I wrong)\b/gi,
      /\b(tell me|reassure|confirm)\b.*\b(that|it's)\b/gi,
      /\b(just|only|simply)\b/gi,
      /\b(would it be|is it bad)\b/gi,
    ];

    let score = 0;
    validationPatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        score += matches.length * 0.25;
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Cosine similarity helper
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
