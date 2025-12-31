import { db } from '../../infrastructure/db';
import { UnifiedMemory } from '../../infrastructure/unified-memory';
import {
  UserContext,
  SearchContext,
  ContextOptions,
  ChatSource,
  ContentItem,
  SearchResult,
  PsychologicalProfile,
  CoreValue,
  Mentor,
  FocusArea,
  Interaction,
  RelationshipInsight,
} from './types';
import { embedOne } from '../../infrastructure/embeddings';

/**
 * Context Builder
 * Builds comprehensive context for RAG-based chat
 */
export class ContextBuilder {
  private memory: UnifiedMemory;

  constructor(memory: UnifiedMemory) {
    this.memory = memory;
  }

  /**
   * Build comprehensive user context
   */
  async buildUserContext(userId: string): Promise<UserContext> {
    // Get psychological profile
    const profile = await db('psychological_profiles')
      .where('user_id', userId)
      .first();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Get core values
    const values = await db('core_values')
      .where('user_id', userId)
      .orderBy('importance', 'desc')
      .select('*');

    // Get mentors
    const mentors = await db('mentors')
      .where('user_id', userId)
      .select('*');

    // Get active focus areas
    const focusAreas = await db('focus_areas')
      .where('user_id', userId)
      .where('status', 'active')
      .orderBy('priority', 'desc')
      .limit(5)
      .select('*');

    // Get recent interactions
    const recentInteractions = await db('interactions')
      .where('user_id', userId)
      .orderBy('date', 'desc')
      .limit(10)
      .select('*');

    return {
      profile: profile as PsychologicalProfile,
      values: values as CoreValue[],
      mentors: mentors as Mentor[],
      focusAreas: focusAreas as FocusArea[],
      recentInteractions: recentInteractions as Interaction[],
    };
  }

  /**
   * Build search context for a query
   */
  async buildSearchContext(
    userId: string,
    query: string,
    options: ContextOptions = {}
  ): Promise<SearchContext> {
    const maxResults = options.maxResults || 8;

    // 1. Search SubSystems
    const subSystemResults = await this.searchSubSystems(userId, query, options.systemIds);

    // 2. Search ContentItems
    const contentResults = await this.searchContentItems(userId, query, options.systemIds);

    // 3. Search external sources (if enabled)
    let externalResults: SearchResult[] = [];
    if (process.env.ENABLE_EXTERNAL_SEARCH === 'true') {
      externalResults = await this.searchExternalSources(query);
    }

    // 4. Combine and rank
    const allResults = [...subSystemResults, ...contentResults, ...externalResults];
    const rankedResults = await this.rankSources(allResults, query);

    // 5. Take top results
    const topResults = rankedResults.slice(0, maxResults);

    // 6. Get related interactions
    const relatedInteractions = await this.findRelatedInteractions(userId, query);

    // 7. Get matching insights
    const matchingInsights = await this.findMatchingInsights(userId, query);

    // 8. Calculate confidence
    const confidence = this.calculateConfidence(topResults);

    return {
      relevantContent: topResults,
      relatedInteractions,
      matchingInsights,
      confidence,
    };
  }

  /**
   * Search user's SubSystems
   */
  private async searchSubSystems(
    userId: string,
    query: string,
    systemIds?: string[]
  ): Promise<SearchResult[]> {
    let systemQuery = db('sub_systems')
      .where('user_id', userId);

    if (systemIds && systemIds.length > 0) {
      systemQuery = systemQuery.whereIn('id', systemIds);
    }

    const systems = await systemQuery.select('*');

    // Generate query embedding
    const queryEmbedding = await embedOne(query, 384);

    // Search in memory store
    const results: SearchResult[] = [];
    for (const system of systems) {
      const searchableText = [system.name, system.description].filter(Boolean).join(' ');
      const embedding = await embedOne(searchableText, 384);
      const score = this.cosineSimilarity(queryEmbedding, embedding);

      if (score > 0.4) {
        results.push({
          id: system.id,
          type: 'subsystem',
          title: system.name,
          snippet: system.description || '',
          subSystemName: system.name,
          score,
          metadata: system,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Search user's ContentItems
   */
  private async searchContentItems(
    userId: string,
    query: string,
    systemIds?: string[]
  ): Promise<SearchResult[]> {
    let itemQuery = db('content_items')
      .where('user_id', userId);

    if (systemIds && systemIds.length > 0) {
      itemQuery = itemQuery.whereIn('system_id', systemIds);
    }

    const items = await itemQuery.select('*');

    // Generate query embedding
    const queryEmbedding = await embedOne(query, 384);

    const results: SearchResult[] = [];
    for (const item of items) {
      const searchableText = [
        item.title,
        item.content,
        Array.isArray(item.highlights) ? item.highlights.join(' ') : '',
        item.personal_notes,
      ].filter(Boolean).join('\n');

      const embedding = await embedOne(searchableText, 384);
      const score = this.cosineSimilarity(queryEmbedding, embedding);

      if (score > 0.4) {
        // Get system name
        const system = await db('sub_systems')
          .where('id', item.system_id)
          .first();

        results.push({
          id: item.id,
          type: 'content_item',
          contentType: item.type,
          title: item.title,
          author: item.author,
          snippet: this.extractSnippet(searchableText, query),
          subSystemName: system?.name,
          systemId: item.system_id,
          score,
          highlightedText: Array.isArray(item.highlights) ? item.highlights[0] : null,
          personalNote: item.personal_notes,
          metadata: item,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Search external sources cache
   */
  private async searchExternalSources(query: string): Promise<SearchResult[]> {
    const queryEmbedding = await embedOne(query, 384);

    const sources = await db('external_sources')
      .where('cached_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .select('*');

    const results: SearchResult[] = [];
    for (const source of sources) {
      const embedding = await embedOne(source.content || '', 384);
      const score = this.cosineSimilarity(queryEmbedding, embedding);

      if (score > 0.5) {
        results.push({
          id: source.id,
          type: 'external',
          title: source.title,
          author: source.author,
          snippet: this.extractSnippet(source.content || '', query),
          url: source.url,
          score,
          metadata: source,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  /**
   * Rank sources using hybrid scoring
   */
  async rankSources(sources: SearchResult[], query: string): Promise<SearchResult[]> {
    // Build connectivity graph
    const systemIds = new Set(
      sources
        .map(s => s.systemId || (s.type === 'subsystem' ? s.id : null))
        .filter(Boolean) as string[]
    );

    const graphScores: Record<string, number> = {};

    for (const systemId of systemIds) {
      const system = await db('sub_systems').where('id', systemId).first();

      if (system?.linked_system_ids) {
        const linkedIds = Array.isArray(system.linked_system_ids)
          ? system.linked_system_ids
          : [];

        // Simple connectivity score
        graphScores[systemId] = linkedIds.length / 10; // Normalize
      }
    }

    // Combine vector and graph scores
    const vectorWeight = 0.7;
    const graphWeight = 0.3;

    return sources.map(source => {
      const systemId = source.systemId || (source.type === 'subsystem' ? source.id : null);
      const graphScore = systemId ? (graphScores[systemId] || 0) : 0;

      const combinedScore = (source.score * vectorWeight) + (graphScore * graphWeight);

      return {
        ...source,
        score: combinedScore,
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Find related interactions
   */
  private async findRelatedInteractions(
    userId: string,
    query: string
  ): Promise<Interaction[]> {
    const queryEmbedding = await embedOne(query, 384);
    const interactions = await db('interactions')
      .where('user_id', userId)
      .orderBy('date', 'desc')
      .limit(20)
      .select('*');

    const scored = await Promise.all(
      interactions.map(async interaction => {
        const text = [interaction.summary, interaction.notes].filter(Boolean).join(' ');
        const embedding = await embedOne(text, 384);
        const score = this.cosineSimilarity(queryEmbedding, embedding);
        return { interaction, score };
      })
    );

    return scored
      .filter(s => s.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.interaction);
  }

  /**
   * Find matching insights
   */
  private async findMatchingInsights(
    userId: string,
    query: string
  ): Promise<RelationshipInsight[]> {
    const queryEmbedding = await embedOne(query, 384);
    const insights = await db('relationship_insights')
      .where('user_id', userId)
      .select('*');

    const scored = await Promise.all(
      insights.map(async insight => {
        const text = [insight.title, insight.description].filter(Boolean).join(' ');
        const embedding = await embedOne(text, 384);
        const score = this.cosineSimilarity(queryEmbedding, embedding);
        return { insight, score };
      })
    );

    return scored
      .filter(s => s.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.insight);
  }

  /**
   * Format context for LLM
   */
  formatContextForLLM(context: SearchContext, profile: UserContext): string {
    const parts: string[] = [];

    // Add relevant content sources
    if (context.relevantContent.length > 0) {
      parts.push('RELEVANT KNOWLEDGE FROM YOUR LIBRARY:\n');
      context.relevantContent.forEach((item, idx) => {
        parts.push(`[${idx + 1}] ${item.title}`);
        if (item.author) parts.push(`   by ${item.author}`);
        if (item.subSystemName) parts.push(`   from ${item.subSystemName} SubSystem`);
        parts.push(`   ${item.snippet}`);
        if (item.highlightedText) {
          parts.push(`   Your highlight: "${item.highlightedText}"`);
        }
        if (item.personalNote) {
          parts.push(`   Your note: "${item.personalNote}"`);
        }
        parts.push('');
      });
    }

    // Add related interactions
    if (context.relatedInteractions.length > 0) {
      parts.push('\nRELATED PAST INTERACTIONS:\n');
      context.relatedInteractions.slice(0, 3).forEach(interaction => {
        parts.push(`- ${interaction.summary} (${interaction.outcome})`);
      });
      parts.push('');
    }

    // Add matching insights
    if (context.matchingInsights.length > 0) {
      parts.push('\nRELATED INSIGHTS:\n');
      context.matchingInsights.forEach(insight => {
        parts.push(`- ${insight.title}: ${insight.description}`);
      });
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Format source citations
   */
  formatSourceCitations(results: SearchResult[]): ChatSource[] {
    return results.map(result => ({
      id: result.id,
      type: result.type,
      title: result.title,
      author: result.author,
      contentType: result.contentType,
      subSystemName: result.subSystemName,
      snippet: result.snippet,
      url: result.url,
      score: result.score,
      highlightedText: result.highlightedText,
      personalNote: result.personalNote,
      provenanceLevel: 0,
    }));
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(results: SearchResult[]): number {
    if (results.length === 0) return 0;

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const diversity = new Set(results.map(r => r.subSystemName)).size / Math.max(results.length, 1);

    return (avgScore * 0.7) + (diversity * 0.3);
  }

  /**
   * Extract relevant snippet from text
   */
  private extractSnippet(text: string, query: string, length = 300): string {
    const words = query.toLowerCase().split(/\s+/);
    const lowerText = text.toLowerCase();

    // Find first occurrence of any query word
    let bestIndex = 0;
    let bestScore = 0;

    for (let i = 0; i < text.length - length; i++) {
      const snippet = lowerText.substring(i, i + length);
      const score = words.reduce((sum, word) =>
        sum + (snippet.includes(word) ? 1 : 0), 0
      );

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    let snippet = text.substring(bestIndex, bestIndex + length);
    if (bestIndex > 0) snippet = '...' + snippet;
    if (bestIndex + length < text.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Calculate cosine similarity
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
