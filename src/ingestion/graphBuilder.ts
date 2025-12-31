import path from 'node:path';
import { ParsedDocument, DocumentMetadata, Section, DetectedLink, detectLinks } from './parser.js';

/**
 * Graph edge types representing relationships between documents
 */
export type EdgeType = 'CITES' | 'PARENT_OF' | 'RELATES_TO' | 'DERIVED_FROM' | 'LINKS_TO';

/**
 * A graph edge connecting two document nodes
 */
export interface GraphEdge {
  /** Source document ID */
  from: string;
  /** Target document ID */
  to: string;
  /** Relationship type */
  type: EdgeType;
  /** Edge weight/strength (0-1) */
  weight?: number;
  /** Additional edge metadata */
  metadata?: {
    /** Citation context or anchor text */
    context?: string;
    /** Section where the relationship was found */
    section?: string;
    /** Line number where the relationship was detected */
    line?: number;
  };
}

/**
 * A document node in the knowledge graph
 */
export interface DocumentNode {
  /** Unique document identifier */
  id: string;
  /** Document title */
  title: string;
  /** Document type */
  type: string;
  /** Document metadata */
  metadata: DocumentMetadata;
  /** Document file path */
  path?: string;
  /** Document sections (for hierarchical relationships) */
  sections?: Section[];
}

/**
 * Complete document graph structure
 */
export interface DocumentGraph {
  /** All document nodes */
  nodes: DocumentNode[];
  /** All relationships between documents */
  edges: GraphEdge[];
  /** Metadata about the graph */
  metadata: {
    /** Total number of nodes */
    nodeCount: number;
    /** Total number of edges */
    edgeCount: number;
    /** Graph creation timestamp */
    created: Date;
  };
}

/**
 * Citation detection patterns
 */
const CITATION_PATTERNS = {
  /** Numeric citations: [1], [12] */
  numeric: /\[(\d+)\]/g,
  /** Author-year citations: [Smith2020], [Jones et al. 2019] */
  authorYear: /\[([A-Z][a-z]+(?:\s+et\s+al\.?)?\s*\d{4})\]/g,
  /** BibTeX-style citations: [@smith2020], [@jones2019] */
  bibtex: /\[@([\w\d]+)\]/g,
  /** Wikilinks: [[Document Name]] */
  wikilink: /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g,
  /** Markdown links to local files */
  localLink: /\[([^\]]+)\]\(([^)]+\.(?:md|txt))\)/g
};

/**
 * Build a complete document graph from parsed documents
 *
 * @param documents - Array of parsed documents with metadata
 * @returns Complete document graph with nodes and edges
 *
 * @example
 * ```typescript
 * const graph = buildDocumentGraph(parsedDocs);
 * console.log(`Graph has ${graph.nodes.length} nodes and ${graph.edges.length} edges`);
 * ```
 */
export function buildDocumentGraph(
  documents: Array<{ id: string; parsed: ParsedDocument; path?: string }>
): DocumentGraph {
  // Create nodes from documents
  const nodes: DocumentNode[] = documents.map(doc => ({
    id: doc.id,
    title: doc.parsed.metadata.title || path.basename(doc.path || doc.id),
    type: doc.parsed.type,
    metadata: doc.parsed.metadata,
    path: doc.path,
    sections: doc.parsed.sections
  }));

  // Build edge list
  const edges: GraphEdge[] = [];

  // Derive edges from each document
  for (const doc of documents) {
    // Extract citation edges
    const citationEdges = detectCitations(doc.id, doc.parsed.text, documents);
    edges.push(...citationEdges);

    // Extract link edges
    const links = detectLinks(doc.parsed.text);
    const linkEdges = deriveEdgesFromLinks(doc.id, links, documents);
    edges.push(...linkEdges);

    // Extract hierarchical edges from sections
    const hierarchyEdges = buildHierarchy(doc.id, doc.parsed.sections);
    edges.push(...hierarchyEdges);

    // Detect semantic relationships
    const semanticEdges = detectSemanticRelationships(doc, documents);
    edges.push(...semanticEdges);
  }

  // Deduplicate edges
  const uniqueEdges = deduplicateEdges(edges);

  return {
    nodes,
    edges: uniqueEdges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: uniqueEdges.length,
      created: new Date()
    }
  };
}

/**
 * Detect citations within document text
 *
 * @param sourceId - Source document ID
 * @param text - Document text to analyze
 * @param allDocuments - All available documents for matching
 * @returns Array of citation edges
 *
 * @example
 * ```typescript
 * const citations = detectCitations('doc1', content, allDocs);
 * citations.forEach(edge => {
 *   console.log(`${edge.from} cites ${edge.to}`);
 * });
 * ```
 */
export function detectCitations(
  sourceId: string,
  text: string,
  allDocuments: Array<{ id: string; parsed: ParsedDocument; path?: string }>
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const documentMap = new Map(allDocuments.map(d => [d.id, d]));

  // Detect numeric citations
  let match: RegExpExecArray | null;

  // Numeric citations: [1], [2]
  const numericPattern = new RegExp(CITATION_PATTERNS.numeric);
  while ((match = numericPattern.exec(text)) !== null) {
    const citationNumber = match[1];
    const targetId = `ref-${citationNumber}`;

    edges.push({
      from: sourceId,
      to: targetId,
      type: 'CITES',
      weight: 0.8,
      metadata: {
        context: extractContext(text, match.index, 80),
        line: getLineNumber(text, match.index)
      }
    });
  }

  // Author-year citations: [Smith2020]
  const authorYearPattern = new RegExp(CITATION_PATTERNS.authorYear);
  while ((match = authorYearPattern.exec(text)) !== null) {
    const citation = match[1];
    const targetId = `cite-${citation.replace(/\s+/g, '-').toLowerCase()}`;

    edges.push({
      from: sourceId,
      to: targetId,
      type: 'CITES',
      weight: 0.9,
      metadata: {
        context: extractContext(text, match.index, 80),
        line: getLineNumber(text, match.index)
      }
    });
  }

  // BibTeX-style citations: [@smith2020]
  const bibtexPattern = new RegExp(CITATION_PATTERNS.bibtex);
  while ((match = bibtexPattern.exec(text)) !== null) {
    const citationKey = match[1];

    // Try to find matching document
    const targetDoc = allDocuments.find(d =>
      d.id.includes(citationKey) ||
      d.parsed.metadata.custom?.citationKey === citationKey
    );

    edges.push({
      from: sourceId,
      to: targetDoc?.id || `cite-${citationKey}`,
      type: 'CITES',
      weight: 0.95,
      metadata: {
        context: extractContext(text, match.index, 80),
        line: getLineNumber(text, match.index)
      }
    });
  }

  return edges;
}

/**
 * Derive edges from detected links
 */
function deriveEdgesFromLinks(
  sourceId: string,
  links: DetectedLink[],
  allDocuments: Array<{ id: string; parsed: ParsedDocument; path?: string }>
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  for (const link of links) {
    let targetId: string | null = null;
    let edgeType: EdgeType = 'LINKS_TO';
    let weight = 0.7;

    switch (link.type) {
      case 'wikilink':
        // Try to find document with matching title
        targetId = findDocumentByTitle(link.target, allDocuments);
        edgeType = 'LINKS_TO';
        weight = 0.85;
        break;

      case 'markdown':
        // Try to resolve relative path
        targetId = findDocumentByPath(link.target, allDocuments);
        edgeType = 'LINKS_TO';
        weight = 0.9;
        break;

      case 'citation':
        targetId = `cite-${link.target}`;
        edgeType = 'CITES';
        weight = 0.8;
        break;

      case 'reference':
        // Reference definitions create weaker links
        targetId = `ref-${link.label}`;
        edgeType = 'LINKS_TO';
        weight = 0.6;
        break;
    }

    if (targetId) {
      edges.push({
        from: sourceId,
        to: targetId,
        type: edgeType,
        weight,
        metadata: {
          context: link.context,
          line: link.position
        }
      });
    }
  }

  return edges;
}

/**
 * Build hierarchical relationships from document sections
 *
 * @param documentId - Parent document ID
 * @param sections - Document sections
 * @returns Array of parent-child edges
 *
 * @example
 * ```typescript
 * const hierarchy = buildHierarchy('doc1', sections);
 * hierarchy.forEach(edge => {
 *   console.log(`${edge.from} is parent of ${edge.to}`);
 * });
 * ```
 */
export function buildHierarchy(documentId: string, sections: Section[]): GraphEdge[] {
  const edges: GraphEdge[] = [];

  function processSections(sectionList: Section[], parentId: string) {
    for (const section of sectionList) {
      const sectionId = `${parentId}#${slugify(section.heading)}`;

      // Create parent-child edge
      edges.push({
        from: parentId,
        to: sectionId,
        type: 'PARENT_OF',
        weight: 1.0,
        metadata: {
          section: section.heading,
          line: section.startLine
        }
      });

      // Process subsections recursively
      if (section.subsections && section.subsections.length > 0) {
        processSections(section.subsections, sectionId);
      }
    }
  }

  processSections(sections, documentId);

  return edges;
}

/**
 * Detect semantic relationships between documents
 */
function detectSemanticRelationships(
  sourceDoc: { id: string; parsed: ParsedDocument; path?: string },
  allDocuments: Array<{ id: string; parsed: ParsedDocument; path?: string }>
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  // Check for shared tags
  const sourceTags = new Set(sourceDoc.parsed.metadata.tags || []);

  if (sourceTags.size > 0) {
    for (const targetDoc of allDocuments) {
      if (targetDoc.id === sourceDoc.id) continue;

      const targetTags = new Set(targetDoc.parsed.metadata.tags || []);
      const sharedTags = intersection(sourceTags, targetTags);

      if (sharedTags.size > 0) {
        const weight = sharedTags.size / Math.max(sourceTags.size, targetTags.size);

        edges.push({
          from: sourceDoc.id,
          to: targetDoc.id,
          type: 'RELATES_TO',
          weight: Math.min(weight, 0.9),
          metadata: {
            context: `Shared tags: ${Array.from(sharedTags).join(', ')}`
          }
        });
      }
    }
  }

  // Check for derived documents (e.g., summaries, translations)
  const derivedKeywords = ['summary', 'abstract', 'notes', 'translation', 'digest'];
  const sourceTitle = sourceDoc.parsed.metadata.title?.toLowerCase() || '';

  for (const keyword of derivedKeywords) {
    if (sourceTitle.includes(keyword)) {
      // Try to find the original document
      const baseTitle = sourceTitle.replace(new RegExp(keyword, 'gi'), '').trim();

      for (const targetDoc of allDocuments) {
        if (targetDoc.id === sourceDoc.id) continue;

        const targetTitle = targetDoc.parsed.metadata.title?.toLowerCase() || '';

        if (targetTitle.includes(baseTitle) || baseTitle.includes(targetTitle)) {
          edges.push({
            from: sourceDoc.id,
            to: targetDoc.id,
            type: 'DERIVED_FROM',
            weight: 0.85,
            metadata: {
              context: `Derived document type: ${keyword}`
            }
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Find document by title (fuzzy matching)
 */
function findDocumentByTitle(
  title: string,
  documents: Array<{ id: string; parsed: ParsedDocument; path?: string }>
): string | null {
  const normalizedTitle = title.toLowerCase().trim();

  // Exact match
  for (const doc of documents) {
    const docTitle = doc.parsed.metadata.title?.toLowerCase().trim();
    if (docTitle === normalizedTitle) {
      return doc.id;
    }
  }

  // Fuzzy match (contains)
  for (const doc of documents) {
    const docTitle = doc.parsed.metadata.title?.toLowerCase().trim();
    if (docTitle?.includes(normalizedTitle) || normalizedTitle.includes(docTitle || '')) {
      return doc.id;
    }
  }

  // Match by filename
  for (const doc of documents) {
    if (doc.path) {
      const filename = path.basename(doc.path, path.extname(doc.path)).toLowerCase();
      if (filename === normalizedTitle || normalizedTitle.includes(filename)) {
        return doc.id;
      }
    }
  }

  return null;
}

/**
 * Find document by file path
 */
function findDocumentByPath(
  linkPath: string,
  documents: Array<{ id: string; parsed: ParsedDocument; path?: string }>
): string | null {
  // Normalize the link path
  const normalizedLink = linkPath.replace(/\\/g, '/').toLowerCase();

  for (const doc of documents) {
    if (!doc.path) continue;

    const normalizedDocPath = doc.path.replace(/\\/g, '/').toLowerCase();

    // Check if paths match (exact or relative)
    if (normalizedDocPath.endsWith(normalizedLink) || normalizedDocPath === normalizedLink) {
      return doc.id;
    }

    // Check filename match
    const linkFilename = path.basename(normalizedLink);
    const docFilename = path.basename(normalizedDocPath);

    if (linkFilename === docFilename) {
      return doc.id;
    }
  }

  return null;
}

/**
 * Deduplicate edges (keep highest weight for duplicate source-target pairs)
 */
function deduplicateEdges(edges: GraphEdge[]): GraphEdge[] {
  const edgeMap = new Map<string, GraphEdge>();

  for (const edge of edges) {
    const key = `${edge.from}:${edge.to}:${edge.type}`;
    const existing = edgeMap.get(key);

    if (!existing || (edge.weight || 0) > (existing.weight || 0)) {
      edgeMap.set(key, edge);
    }
  }

  return Array.from(edgeMap.values());
}

/**
 * Extract context around a position in text
 */
function extractContext(text: string, position: number, radius: number): string {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);

  let context = text.slice(start, end);

  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';

  // Clean up whitespace
  return context.replace(/\s+/g, ' ').trim();
}

/**
 * Get line number for a position in text
 */
function getLineNumber(text: string, position: number): number {
  return text.slice(0, position).split('\n').length;
}

/**
 * Convert text to URL-safe slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get intersection of two sets
 */
function intersection<T>(set1: Set<T>, set2: Set<T>): Set<T> {
  const result = new Set<T>();

  for (const item of set1) {
    if (set2.has(item)) {
      result.add(item);
    }
  }

  return result;
}
