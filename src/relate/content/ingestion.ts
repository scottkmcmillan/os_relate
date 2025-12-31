/**
 * File Ingestion Service - Process uploaded files and URLs
 *
 * Handles file uploads, URL scraping, text ingestion, and automatic tagging.
 * Supports PDF, JSON, Markdown, and plain text formats.
 *
 * @module relate/content/ingestion
 */

import { v4 as uuidv4 } from 'uuid';
import { ContentItem, ContentType, ContentMetadata } from './service';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface IngestionResult {
  contentItem: ContentItem;
  processingTime: number;
  metadata: {
    fileSize?: number;
    pageCount?: number;
    wordCount?: number;
    autoTags?: string[];
  };
}

export interface UrlIngestionOptions {
  extractMetadata?: boolean;
  followRedirects?: boolean;
  timeout?: number;
}

// ============================================================================
// File Type Detection
// ============================================================================

const MIME_TYPE_MAP: Record<string, ContentType> = {
  'application/pdf': 'article',
  'application/json': 'note',
  'text/markdown': 'note',
  'text/plain': 'note',
  'text/html': 'article',
  'video/mp4': 'video',
  'video/webm': 'video',
  'audio/mpeg': 'podcast',
  'audio/mp3': 'podcast'
};

const EXTENSION_MAP: Record<string, ContentType> = {
  '.pdf': 'article',
  '.json': 'note',
  '.md': 'note',
  '.txt': 'note',
  '.html': 'article',
  '.htm': 'article',
  '.mp4': 'video',
  '.webm': 'video',
  '.mp3': 'podcast',
  '.m4a': 'podcast'
};

// ============================================================================
// Text Extraction Utilities
// ============================================================================

class TextExtractor {
  /**
   * Extract text from PDF buffer
   */
  async extractFromPDF(buffer: Buffer): Promise<string> {
    // In production, use pdf-parse or similar library
    // Mock implementation
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000));
    return `[PDF Content]\n${text}\n[End PDF]`;
  }

  /**
   * Extract text from JSON
   */
  extractFromJSON(buffer: Buffer): string {
    try {
      const json = JSON.parse(buffer.toString('utf-8'));
      return JSON.stringify(json, null, 2);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Extract text from Markdown
   */
  extractFromMarkdown(buffer: Buffer): string {
    return buffer.toString('utf-8');
  }

  /**
   * Extract text from plain text
   */
  extractFromPlainText(buffer: Buffer): string {
    return buffer.toString('utf-8');
  }

  /**
   * Extract text from HTML
   */
  extractFromHTML(buffer: Buffer): string {
    // In production, use cheerio or jsdom
    // Mock: strip basic HTML tags
    const html = buffer.toString('utf-8');
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Main extraction method
   */
  async extract(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        return this.extractFromPDF(buffer);
      case 'application/json':
        return this.extractFromJSON(buffer);
      case 'text/markdown':
        return this.extractFromMarkdown(buffer);
      case 'text/plain':
        return this.extractFromPlainText(buffer);
      case 'text/html':
        return this.extractFromHTML(buffer);
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }
}

const textExtractor = new TextExtractor();

// ============================================================================
// URL Scraping Utilities
// ============================================================================

class UrlScraper {
  /**
   * Fetch and extract content from URL
   */
  async scrapeUrl(
    url: string,
    options?: UrlIngestionOptions
  ): Promise<{ content: string; metadata: ContentMetadata }> {
    // In production, use axios + cheerio
    // Mock implementation
    return {
      content: `Content scraped from ${url}`,
      metadata: {
        source: url,
        author: 'Unknown',
        publishedDate: new Date()
      }
    };
  }

  /**
   * Detect content type from URL
   */
  detectTypeFromUrl(url: string): ContentType {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('youtube.com') || urlLower.includes('vimeo.com')) {
      return 'video';
    }
    if (urlLower.includes('spotify.com') || urlLower.includes('podcast')) {
      return 'podcast';
    }
    if (urlLower.includes('amazon.com/dp') || urlLower.includes('goodreads.com')) {
      return 'book';
    }

    return 'article';
  }
}

const urlScraper = new UrlScraper();

// ============================================================================
// Auto-Tagging Service
// ============================================================================

class AutoTagging {
  private systemKeywords: Map<string, string[]> = new Map();

  /**
   * Initialize system-specific keywords
   */
  initializeSystemKeywords(systemId: string, systemDescription: string, systemName: string) {
    const keywords = this.extractKeywords(systemDescription + ' ' + systemName);
    this.systemKeywords.set(systemId, keywords);
  }

  /**
   * Generate tags based on content and system context
   */
  async generateTags(content: string, systemId: string): Promise<string[]> {
    const contentKeywords = this.extractKeywords(content);
    const systemKeywords = this.systemKeywords.get(systemId) || [];

    // Combine and deduplicate
    const allKeywords = Array.from(
      new Set([...contentKeywords, ...systemKeywords])
    );

    // Filter and rank by relevance
    const tags = allKeywords
      .filter(keyword => this.isRelevantTag(keyword))
      .slice(0, 10); // Max 10 tags

    return tags;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (in production, use NLP library)
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    // Count frequency
    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    // Sort by frequency and return top keywords
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 20);
  }

  /**
   * Check if keyword is relevant for tagging
   */
  private isRelevantTag(keyword: string): boolean {
    // Filter out numbers-only, too short, etc.
    return keyword.length >= 4 && !/^\d+$/.test(keyword);
  }
}

const autoTagging = new AutoTagging();

// ============================================================================
// File Ingestion Service Implementation
// ============================================================================

export class FileIngestionService {
  /**
   * Upload and process a file
   */
  async uploadFile(
    userId: string,
    systemId: string,
    file: UploadedFile
  ): Promise<ContentItem> {
    const startTime = Date.now();

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Detect content type
    const contentType = this.detectContentType(file.buffer, file.originalname);

    // Extract text from file
    const content = await this.extractText(file.buffer, file.mimetype);

    // Generate auto-tags
    const tags = await this.generateTags(content, systemId);

    // Create content item
    const item: ContentItem = {
      id: `cnt_${uuidv4()}`,
      userId,
      systemId,
      type: contentType,
      title: file.originalname,
      content,
      tags,
      linkedSystemIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const processingTime = Date.now() - startTime;

    return item;
  }

  /**
   * Ingest content from URL
   */
  async ingestUrl(
    userId: string,
    systemId: string,
    url: string,
    options?: UrlIngestionOptions
  ): Promise<ContentItem> {
    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Scrape URL
    const { content, metadata } = await urlScraper.scrapeUrl(url, options);

    // Detect content type from URL
    const contentType = urlScraper.detectTypeFromUrl(url);

    // Generate auto-tags
    const tags = await this.generateTags(content, systemId);

    // Create content item
    const item: ContentItem = {
      id: `cnt_${uuidv4()}`,
      userId,
      systemId,
      type: contentType,
      title: this.extractTitleFromUrl(url),
      content,
      url,
      tags,
      linkedSystemIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return item;
  }

  /**
   * Ingest text snippet directly
   */
  async ingestText(
    userId: string,
    systemId: string,
    text: string,
    metadata?: ContentMetadata
  ): Promise<ContentItem> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text content cannot be empty');
    }

    // Generate auto-tags
    const tags = await this.generateTags(text, systemId);

    // Extract title from first line or metadata
    const title = metadata?.title ||
      text.split('\n')[0].substring(0, 100) ||
      'Untitled Note';

    // Create content item
    const item: ContentItem = {
      id: `cnt_${uuidv4()}`,
      userId,
      systemId,
      type: 'note',
      title,
      content: text,
      tags,
      linkedSystemIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return item;
  }

  /**
   * Process document (background job for large files)
   */
  async processDocument(itemId: string): Promise<void> {
    // In production, implement background processing with queue
    // For now, this is a placeholder
    console.log(`Processing document: ${itemId}`);
  }

  /**
   * Extract text from file buffer
   */
  async extractText(file: Buffer, mimeType: string): Promise<string> {
    return textExtractor.extract(file, mimeType);
  }

  /**
   * Detect content type from file
   */
  detectContentType(file: Buffer, filename: string): ContentType {
    // Try MIME type detection first
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();

    if (EXTENSION_MAP[ext]) {
      return EXTENSION_MAP[ext];
    }

    // Default to note
    return 'note';
  }

  /**
   * Generate tags for content
   */
  async generateTags(content: string, systemId: string): Promise<string[]> {
    return autoTagging.generateTags(content, systemId);
  }

  /**
   * Extract title from URL
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/').filter(Boolean);

      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\.[^.]+$/, '') // Remove extension
          .replace(/\b\w/g, c => c.toUpperCase()); // Title case
      }

      return urlObj.hostname;
    } catch {
      return 'Untitled';
    }
  }
}

// ============================================================================
// Export Service Instance
// ============================================================================

export const fileIngestionService = new FileIngestionService();
export default fileIngestionService;
