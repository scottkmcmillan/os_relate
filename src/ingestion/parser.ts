import path from 'node:path';

/**
 * Document metadata extracted from content
 */
export interface DocumentMetadata {
  /** Document title */
  title?: string;
  /** Author(s) */
  author?: string | string[];
  /** Publication or creation date */
  date?: Date;
  /** Tags or keywords */
  tags?: string[];
  /** Document description or summary */
  description?: string;
  /** Custom frontmatter fields */
  custom?: Record<string, unknown>;
}

/**
 * A section within a document
 */
export interface Section {
  /** Section heading */
  heading: string;
  /** Heading level (1-6 for markdown) */
  level: number;
  /** Section content (without heading) */
  content: string;
  /** Line number where section starts */
  startLine: number;
  /** Line number where section ends */
  endLine: number;
  /** Nested subsections */
  subsections?: Section[];
}

/**
 * A detected link within document content
 */
export interface DetectedLink {
  /** Link type */
  type: 'wikilink' | 'markdown' | 'citation' | 'url' | 'reference';
  /** Link target/destination */
  target: string;
  /** Link text or label (if applicable) */
  label?: string;
  /** Position in document */
  position: number;
  /** Context around the link */
  context?: string;
}

/**
 * Supported document content types
 */
export type DocumentType = 'markdown' | 'text' | 'json' | 'jsonl';

/**
 * Parsed document with extracted structure
 */
export interface ParsedDocument {
  /** Original file extension */
  type: DocumentType;
  /** Clean extracted text */
  text: string;
  /** Document sections (for structured formats) */
  sections: Section[];
  /** Extracted metadata */
  metadata: DocumentMetadata;
}

/**
 * Parse a document and extract structured content
 *
 * @param content - Raw document content
 * @param type - Document type/format
 * @returns Parsed document with extracted structure
 *
 * @example
 * ```typescript
 * const doc = parseDocument(markdownContent, 'markdown');
 * console.log(doc.metadata.title);
 * console.log(doc.sections.map(s => s.heading));
 * ```
 */
export function parseDocument(content: string, type: DocumentType): ParsedDocument {
  switch (type) {
    case 'markdown':
      return parseMarkdown(content);
    case 'json':
      return parseJson(content);
    case 'jsonl':
      return parseJsonLines(content);
    case 'text':
    default:
      return parseText(content);
  }
}

/**
 * Extract metadata from document content
 *
 * @param content - Raw document content
 * @returns Extracted metadata
 *
 * @example
 * ```typescript
 * const metadata = extractMetadata(content);
 * console.log(metadata.title, metadata.tags);
 * ```
 */
export function extractMetadata(content: string): DocumentMetadata {
  const metadata: DocumentMetadata = {};

  // Try to extract frontmatter (YAML between --- delimiters)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    const frontmatter = parseFrontmatter(frontmatterMatch[1]);
    Object.assign(metadata, frontmatter);
  }

  // If no title in frontmatter, try to extract from first heading
  if (!metadata.title) {
    const firstHeading = content.match(/^#\s+(.+)$/m);
    if (firstHeading) {
      metadata.title = firstHeading[1].trim();
    }
  }

  return metadata;
}

/**
 * Detect and extract links from document content
 *
 * @param content - Document content
 * @returns Array of detected links
 *
 * @example
 * ```typescript
 * const links = detectLinks(content);
 * links.forEach(link => {
 *   console.log(`${link.type}: ${link.target}`);
 * });
 * ```
 */
export function detectLinks(content: string): DetectedLink[] {
  const links: DetectedLink[] = [];

  // Detect wikilinks: [[target]] or [[target|label]]
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(content)) !== null) {
    links.push({
      type: 'wikilink',
      target: match[1].trim(),
      label: match[2]?.trim(),
      position: match.index,
      context: extractContext(content, match.index, 50)
    });
  }

  // Detect markdown links: [label](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const target = match[2].trim();

    // Classify as URL or internal reference
    const isUrl = /^(https?|ftp):\/\//i.test(target);

    links.push({
      type: isUrl ? 'url' : 'markdown',
      target,
      label: match[1].trim(),
      position: match.index,
      context: extractContext(content, match.index, 50)
    });
  }

  // Detect citations: [1], [Smith2020], [@ref], etc.
  const citationRegex = /\[(@?[\w\d]+)\]/g;

  while ((match = citationRegex.exec(content)) !== null) {
    links.push({
      type: 'citation',
      target: match[1].trim(),
      position: match.index,
      context: extractContext(content, match.index, 50)
    });
  }

  // Detect reference-style links: [label]: url
  const referenceRegex = /^\[([^\]]+)\]:\s*(.+)$/gm;

  while ((match = referenceRegex.exec(content)) !== null) {
    links.push({
      type: 'reference',
      target: match[2].trim(),
      label: match[1].trim(),
      position: match.index
    });
  }

  return links;
}

/**
 * Parse markdown content
 */
function parseMarkdown(content: string): ParsedDocument {
  const metadata = extractMetadata(content);

  // Remove frontmatter from content
  let cleanContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');

  // Extract sections
  const sections = extractSections(cleanContent);

  // Clean text (remove markdown formatting for plain text)
  const text = cleanMarkdown(cleanContent);

  return {
    type: 'markdown',
    text,
    sections,
    metadata
  };
}

/**
 * Parse plain text content
 */
function parseText(content: string): ParsedDocument {
  return {
    type: 'text',
    text: content,
    sections: [],
    metadata: {}
  };
}

/**
 * Parse JSON content
 */
function parseJson(content: string): ParsedDocument {
  try {
    const data = JSON.parse(content);

    // Extract common metadata fields
    const metadata: DocumentMetadata = {
      title: data.title || data.name,
      author: data.author,
      date: data.date ? new Date(data.date) : undefined,
      tags: Array.isArray(data.tags) ? data.tags : undefined,
      description: data.description || data.summary,
      custom: data
    };

    // Extract text content
    const text = data.text || data.content || data.summary || JSON.stringify(data, null, 2);

    return {
      type: 'json',
      text,
      sections: [],
      metadata
    };
  } catch (error) {
    // If parsing fails, treat as plain text
    return parseText(content);
  }
}

/**
 * Parse JSONL (JSON Lines) content
 */
function parseJsonLines(content: string): ParsedDocument {
  const lines = content.split('\n').filter(line => line.trim());
  const items: unknown[] = [];

  for (const line of lines) {
    try {
      items.push(JSON.parse(line));
    } catch {
      // Skip invalid JSON lines
      continue;
    }
  }

  // Combine all items
  const metadata: DocumentMetadata = {
    custom: { items, count: items.length }
  };

  const text = items
    .map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return obj.text || obj.content || obj.summary || JSON.stringify(item);
      }
      return String(item);
    })
    .join('\n\n');

  return {
    type: 'jsonl',
    text,
    sections: [],
    metadata
  };
}

/**
 * Extract sections from markdown content
 */
function extractSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  const sectionStack: Section[] = [];

  let currentSection: Section | null = null;
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    // Check if line is a heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim();

      // Close previous section
      if (currentSection) {
        currentSection.endLine = lineNumber - 1;
      }

      // Create new section
      const newSection: Section = {
        heading,
        level,
        content: '',
        startLine: lineNumber,
        endLine: lineNumber,
        subsections: []
      };

      // Handle section hierarchy
      while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
        sectionStack.pop();
      }

      if (sectionStack.length === 0) {
        // Top-level section
        sections.push(newSection);
      } else {
        // Nested section
        const parent = sectionStack[sectionStack.length - 1];
        if (!parent.subsections) {
          parent.subsections = [];
        }
        parent.subsections.push(newSection);
      }

      sectionStack.push(newSection);
      currentSection = newSection;
    } else if (currentSection) {
      // Add content to current section
      currentSection.content += (currentSection.content ? '\n' : '') + line;
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.endLine = lineNumber;
  }

  return sections;
}

/**
 * Parse YAML frontmatter
 */
function parseFrontmatter(yaml: string): DocumentMetadata {
  const metadata: DocumentMetadata = {
    custom: {}
  };

  const lines = yaml.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    // Parse common metadata fields
    switch (key.toLowerCase()) {
      case 'title':
        metadata.title = value;
        break;
      case 'author':
      case 'authors':
        metadata.author = value.includes(',') ? value.split(',').map(a => a.trim()) : value;
        break;
      case 'date':
        metadata.date = new Date(value);
        break;
      case 'tags':
      case 'keywords':
        metadata.tags = value.split(',').map(t => t.trim());
        break;
      case 'description':
      case 'summary':
        metadata.description = value;
        break;
      default:
        if (metadata.custom) {
          metadata.custom[key] = value;
        }
    }
  }

  return metadata;
}

/**
 * Remove markdown formatting to get clean text
 */
function cleanMarkdown(content: string): string {
  return content
    // Remove headings
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove horizontal rules
    .replace(/^(\*\*\*|---|___)\s*$/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract context around a position in text
 */
function extractContext(text: string, position: number, radius: number): string {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);

  let context = text.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';

  return context;
}
