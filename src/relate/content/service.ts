/**
 * Content Service - Knowledge item management with semantic search
 *
 * Handles CRUD operations for content items within sub-systems,
 * with vector embedding support for semantic search.
 *
 * @module relate/content/service
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ContentType = 'note' | 'article' | 'book' | 'video' | 'podcast';

export interface ContentItem {
  id: string;
  userId: string;
  systemId: string;
  type: ContentType;
  title: string;
  content?: string;
  url?: string;
  highlights?: string[];
  personalNotes?: string;
  tags: string[];
  linkedSystemIds: string[];
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentItemCreate {
  type: ContentType;
  title: string;
  content?: string;
  url?: string;
  highlights?: string[];
  personalNotes?: string;
  tags?: string[];
  linkedSystemIds?: string[];
}

export interface ContentFilters {
  systemId?: string;
  type?: ContentType;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SearchOptions {
  systemIds?: string[];
  types?: ContentType[];
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  item: ContentItem;
  score: number;
  snippet?: string;
  systemName?: string;
}

export interface ContentMetadata {
  author?: string;
  source?: string;
  publishedDate?: Date;
  [key: string]: any;
}

// ============================================================================
// In-Memory Storage
// ============================================================================

class ContentStore {
  private items: Map<string, ContentItem> = new Map();

  getAll(userId: string, filters?: ContentFilters): ContentItem[] {
    let items = Array.from(this.items.values())
      .filter(item => item.userId === userId);

    if (filters) {
      if (filters.systemId) {
        items = items.filter(item => item.systemId === filters.systemId);
      }
      if (filters.type) {
        items = items.filter(item => item.type === filters.type);
      }
      if (filters.tags && filters.tags.length > 0) {
        items = items.filter(item =>
          filters.tags!.some(tag => item.tags.includes(tag))
        );
      }
      if (filters.dateFrom) {
        items = items.filter(item => item.createdAt >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        items = items.filter(item => item.createdAt <= filters.dateTo!);
      }
    }

    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  get(id: string): ContentItem | null {
    return this.items.get(id) || null;
  }

  create(item: ContentItem): ContentItem {
    this.items.set(item.id, item);
    return item;
  }

  update(id: string, updates: Partial<ContentItem>): ContentItem | null {
    const item = this.items.get(id);
    if (!item) return null;

    const updated = {
      ...item,
      ...updates,
      updatedAt: new Date()
    };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }

  searchByEmbedding(
    userId: string,
    queryEmbedding: number[],
    options?: SearchOptions
  ): Array<{ item: ContentItem; score: number }> {
    let items = Array.from(this.items.values())
      .filter(item => item.userId === userId && item.embedding);

    if (options?.systemIds && options.systemIds.length > 0) {
      items = items.filter(item => options.systemIds!.includes(item.systemId));
    }

    if (options?.types && options.types.length > 0) {
      items = items.filter(item => options.types!.includes(item.type));
    }

    const results = items.map(item => ({
      item,
      score: this.cosineSimilarity(queryEmbedding, item.embedding!)
    }));

    results.sort((a, b) => b.score - a.score);

    const threshold = options?.threshold || 0.7;
    const filtered = results.filter(r => r.score >= threshold);

    const limit = options?.limit || 10;
    return filtered.slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

const store = new ContentStore();

// ============================================================================
// Embedding Service (Mock - Replace with real implementation)
// ============================================================================

class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding: generate random 768-dim vector
    // In production, use OpenAI text-embedding-3-small or similar
    const dimension = 768;
    const embedding = new Array(dimension);

    // Deterministic random based on text for consistency
    const seed = this.hashString(text);
    const random = this.seededRandom(seed);

    for (let i = 0; i < dimension; i++) {
      embedding[i] = random() * 2 - 1; // Range [-1, 1]
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): () => number {
    let value = seed;
    return () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  }

  extractTextForEmbedding(item: ContentItemCreate | ContentItem): string {
    const parts: string[] = [item.title];

    if ('content' in item && item.content) {
      parts.push(item.content);
    }
    if ('personalNotes' in item && item.personalNotes) {
      parts.push(item.personalNotes);
    }
    if ('highlights' in item && item.highlights && item.highlights.length > 0) {
      parts.push(...item.highlights);
    }

    return parts.filter(Boolean).join('\n');
  }
}

const embeddingService = new EmbeddingService();

// ============================================================================
// Content Service Implementation
// ============================================================================

export class ContentService {
  /**
   * Get all content items with optional filters
   */
  async getAll(userId: string, filters?: ContentFilters): Promise<ContentItem[]> {
    return store.getAll(userId, filters);
  }

  /**
   * Get a specific content item
   */
  async get(userId: string, itemId: string): Promise<ContentItem | null> {
    const item = store.get(itemId);

    // Verify ownership
    if (item && item.userId !== userId) {
      return null;
    }

    return item;
  }

  /**
   * Create a new content item
   */
  async create(
    userId: string,
    systemId: string,
    data: ContentItemCreate
  ): Promise<ContentItem> {
    // Generate embedding from content
    const textForEmbedding = embeddingService.extractTextForEmbedding(data);
    const embedding = await embeddingService.generateEmbedding(textForEmbedding);

    const item: ContentItem = {
      id: `cnt_${uuidv4()}`,
      userId,
      systemId,
      type: data.type,
      title: data.title,
      content: data.content,
      url: data.url,
      highlights: data.highlights || [],
      personalNotes: data.personalNotes,
      tags: data.tags || [],
      linkedSystemIds: data.linkedSystemIds || [],
      embedding,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return store.create(item);
  }

  /**
   * Update a content item
   */
  async update(
    userId: string,
    itemId: string,
    updates: Partial<ContentItem>
  ): Promise<ContentItem> {
    const item = await this.get(userId, itemId);
    if (!item) {
      throw new Error('Content item not found');
    }

    // Don't allow changing userId or id
    const { id, userId: _, ...allowedUpdates } = updates;

    // Regenerate embedding if content changed
    let embedding = item.embedding;
    if (
      updates.title !== undefined ||
      updates.content !== undefined ||
      updates.personalNotes !== undefined ||
      updates.highlights !== undefined
    ) {
      const updatedItem = { ...item, ...allowedUpdates };
      const textForEmbedding = embeddingService.extractTextForEmbedding(updatedItem);
      embedding = await embeddingService.generateEmbedding(textForEmbedding);
    }

    const updated = store.update(itemId, { ...allowedUpdates, embedding });
    if (!updated) {
      throw new Error('Failed to update content item');
    }

    return updated;
  }

  /**
   * Delete a content item
   */
  async delete(userId: string, itemId: string): Promise<void> {
    const item = await this.get(userId, itemId);
    if (!item) {
      throw new Error('Content item not found');
    }

    const deleted = store.delete(itemId);
    if (!deleted) {
      throw new Error('Failed to delete content item');
    }
  }

  /**
   * Semantic search across content items
   */
  async search(
    userId: string,
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    // Generate embedding for search query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Perform vector similarity search
    const results = store.searchByEmbedding(userId, queryEmbedding, options);

    // Format results with snippets
    return results.map(({ item, score }) => ({
      item,
      score,
      snippet: this.generateSnippet(item, query),
      systemName: undefined // Will be filled by route handler with system lookup
    }));
  }

  /**
   * Search content items within a specific system
   */
  async searchBySystem(
    userId: string,
    systemId: string,
    query: string
  ): Promise<SearchResult[]> {
    return this.search(userId, query, { systemIds: [systemId] });
  }

  /**
   * Move content item to different system
   */
  async moveToSystem(
    userId: string,
    itemId: string,
    newSystemId: string
  ): Promise<ContentItem> {
    const item = await this.get(userId, itemId);
    if (!item) {
      throw new Error('Content item not found');
    }

    return this.update(userId, itemId, { systemId: newSystemId });
  }

  /**
   * Link content item to multiple systems
   */
  async linkToSystems(
    userId: string,
    itemId: string,
    systemIds: string[]
  ): Promise<ContentItem> {
    const item = await this.get(userId, itemId);
    if (!item) {
      throw new Error('Content item not found');
    }

    // Add new system IDs while preserving existing ones
    const linkedSystemIds = Array.from(
      new Set([...item.linkedSystemIds, ...systemIds])
    );

    return this.update(userId, itemId, { linkedSystemIds });
  }

  /**
   * Generate embedding for content
   */
  async generateEmbedding(content: string): Promise<number[]> {
    return embeddingService.generateEmbedding(content);
  }

  /**
   * Update embedding for existing content item
   */
  async updateEmbedding(userId: string, itemId: string): Promise<void> {
    const item = await this.get(userId, itemId);
    if (!item) {
      throw new Error('Content item not found');
    }

    const textForEmbedding = embeddingService.extractTextForEmbedding(item);
    const embedding = await embeddingService.generateEmbedding(textForEmbedding);

    await this.update(userId, itemId, { embedding });
  }

  /**
   * Generate snippet from content for search results
   */
  private generateSnippet(item: ContentItem, query: string): string {
    const text = item.content || item.personalNotes || item.title;
    if (!text) return '';

    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(queryLower);

    if (index === -1) {
      // Query not found, return first 150 chars
      return text.substring(0, 150) + (text.length > 150 ? '...' : '');
    }

    // Extract snippet around query match
    const start = Math.max(0, index - 60);
    const end = Math.min(text.length, index + query.length + 60);
    const snippet = text.substring(start, end);

    return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '');
  }
}

// ============================================================================
// Export Service Instance
// ============================================================================

export const contentService = new ContentService();
export default contentService;
