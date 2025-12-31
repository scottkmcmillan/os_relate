/**
 * Context Window Formatter
 *
 * Formats search results and graph data into coherent context blocks
 * for consumption by AI agents (specifically Claude-Flow).
 */

export type ContextSource = {
  id: string;
  title: string;
  content: string;
  source: string;
  score?: number;
  type: 'vector' | 'graph' | 'hybrid';
  metadata?: Record<string, unknown>;
};

export type GraphContext = {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    properties?: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: string;
    label?: string;
  }>;
};

export type ContextBlock = {
  title: string;
  query: string;
  sources: ContextSource[];
  graph?: GraphContext;
  totalChars: number;
  truncated: boolean;
  generatedAt: string;
};

export interface ContextFormatterOptions {
  maxChars?: number;
  includeMetadata?: boolean;
  includeScores?: boolean;
  format?: 'text' | 'markdown' | 'json';
  title?: string;
}

const DEFAULT_OPTIONS: Required<ContextFormatterOptions> = {
  maxChars: 12000,
  includeMetadata: false,
  includeScores: true,
  format: 'text',
  title: 'RuVector Context'
};

/**
 * ContextFormatter - Transforms search results into agent-consumable context
 */
export class ContextFormatter {
  private options: Required<ContextFormatterOptions>;

  constructor(options: ContextFormatterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Format vector search results into a context block
   */
  formatVectorResults(
    query: string,
    results: Array<{ score: number; metadata?: Record<string, unknown> }>
  ): ContextBlock {
    const sources: ContextSource[] = results.map((r, i) => ({
      id: `vec-${i}`,
      title: String(r.metadata?.title ?? '(untitled)'),
      content: String(r.metadata?.text ?? ''),
      source: String(r.metadata?.source ?? '(unknown)'),
      score: r.score,
      type: 'vector' as const,
      metadata: this.options.includeMetadata ? r.metadata : undefined
    }));

    return this.buildContextBlock(query, sources);
  }

  /**
   * Format graph traversal results into a context block
   */
  formatGraphResults(
    query: string,
    nodes: GraphContext['nodes'],
    edges: GraphContext['edges']
  ): ContextBlock {
    const sources: ContextSource[] = nodes.map((node) => ({
      id: node.id,
      title: node.label,
      content: JSON.stringify(node.properties ?? {}, null, 2),
      source: `graph:${node.type}`,
      type: 'graph' as const,
      metadata: node.properties
    }));

    const block = this.buildContextBlock(query, sources);
    block.graph = { nodes, edges };

    return block;
  }

  /**
   * Format hybrid (vector + graph) results
   */
  formatHybridResults(
    query: string,
    vectorResults: Array<{ score: number; metadata?: Record<string, unknown> }>,
    graphNodes: GraphContext['nodes'],
    graphEdges: GraphContext['edges']
  ): ContextBlock {
    const vectorSources: ContextSource[] = vectorResults.map((r, i) => ({
      id: `vec-${i}`,
      title: String(r.metadata?.title ?? '(untitled)'),
      content: String(r.metadata?.text ?? ''),
      source: String(r.metadata?.source ?? '(unknown)'),
      score: r.score,
      type: 'vector' as const
    }));

    const graphSources: ContextSource[] = graphNodes.map((node) => ({
      id: node.id,
      title: node.label,
      content: JSON.stringify(node.properties ?? {}, null, 2),
      source: `graph:${node.type}`,
      type: 'graph' as const
    }));

    // Interleave vector and graph results for diversity
    const sources = this.interleaveResults(vectorSources, graphSources);

    const block = this.buildContextBlock(query, sources);
    block.graph = { nodes: graphNodes, edges: graphEdges };

    return block;
  }

  /**
   * Render context block to string based on format option
   */
  render(block: ContextBlock): string {
    switch (this.options.format) {
      case 'json':
        return JSON.stringify(block, null, 2);
      case 'markdown':
        return this.renderMarkdown(block);
      case 'text':
      default:
        return this.renderText(block);
    }
  }

  /**
   * Quick helper to format and render in one step
   */
  formatAndRender(
    query: string,
    results: Array<{ score: number; metadata?: Record<string, unknown> }>
  ): string {
    const block = this.formatVectorResults(query, results);
    return this.render(block);
  }

  private buildContextBlock(query: string, sources: ContextSource[]): ContextBlock {
    let totalChars = 0;
    let truncated = false;
    const filteredSources: ContextSource[] = [];

    for (const source of sources) {
      const sourceChars = source.title.length + source.content.length + source.source.length;

      if (totalChars + sourceChars > this.options.maxChars) {
        // Truncate this source's content to fit
        const remaining = this.options.maxChars - totalChars;
        if (remaining > 100) {
          const truncatedContent = source.content.slice(0, remaining - 50) + '...[truncated]';
          filteredSources.push({ ...source, content: truncatedContent });
          totalChars += remaining;
        }
        truncated = true;
        break;
      }

      filteredSources.push(source);
      totalChars += sourceChars;
    }

    return {
      title: this.options.title,
      query,
      sources: filteredSources,
      totalChars,
      truncated,
      generatedAt: new Date().toISOString()
    };
  }

  private interleaveResults(a: ContextSource[], b: ContextSource[]): ContextSource[] {
    const result: ContextSource[] = [];
    const maxLen = Math.max(a.length, b.length);

    for (let i = 0; i < maxLen; i++) {
      if (i < a.length) result.push(a[i]!);
      if (i < b.length) result.push(b[i]!);
    }

    return result;
  }

  private renderText(block: ContextBlock): string {
    const lines: string[] = [];
    lines.push('```text');
    lines.push(`${block.title} (generated from RuVector)`);
    lines.push(`query: ${block.query}`);
    lines.push(`generated: ${block.generatedAt}`);
    lines.push('');

    if (block.sources.length === 0) {
      lines.push('No results found.');
      lines.push('```');
      return lines.join('\n');
    }

    for (let i = 0; i < block.sources.length; i++) {
      const source = block.sources[i]!;
      lines.push('---');
      lines.push(`result: ${i + 1}/${block.sources.length}`);
      lines.push(`title: ${source.title}`);
      lines.push(`source: ${source.source}`);
      lines.push(`type: ${source.type}`);
      if (this.options.includeScores && source.score !== undefined) {
        lines.push(`score: ${source.score.toFixed(4)}`);
      }
      lines.push('');
      lines.push(source.content);
      lines.push('');
    }

    if (block.graph && block.graph.edges.length > 0) {
      lines.push('---');
      lines.push('GRAPH RELATIONSHIPS:');
      for (const edge of block.graph.edges) {
        lines.push(`  [${edge.from}] --(${edge.type})--> [${edge.to}]`);
      }
      lines.push('');
    }

    if (block.truncated) {
      lines.push('[Output truncated due to size limits]');
    }

    lines.push('```');
    return lines.join('\n');
  }

  private renderMarkdown(block: ContextBlock): string {
    const lines: string[] = [];
    lines.push(`# ${block.title}`);
    lines.push('');
    lines.push(`> **Query:** ${block.query}`);
    lines.push(`> **Generated:** ${block.generatedAt}`);
    lines.push('');

    if (block.sources.length === 0) {
      lines.push('*No results found.*');
      return lines.join('\n');
    }

    for (let i = 0; i < block.sources.length; i++) {
      const source = block.sources[i]!;
      lines.push(`## ${i + 1}. ${source.title}`);
      lines.push('');
      lines.push(`- **Source:** \`${source.source}\``);
      lines.push(`- **Type:** ${source.type}`);
      if (this.options.includeScores && source.score !== undefined) {
        lines.push(`- **Score:** ${source.score.toFixed(4)}`);
      }
      lines.push('');
      lines.push(source.content);
      lines.push('');
    }

    if (block.graph && block.graph.edges.length > 0) {
      lines.push('## Graph Relationships');
      lines.push('');
      lines.push('```mermaid');
      lines.push('graph LR');
      for (const edge of block.graph.edges) {
        const label = edge.label ?? edge.type;
        lines.push(`  ${edge.from}["${edge.from}"] -->|${label}| ${edge.to}["${edge.to}"]`);
      }
      lines.push('```');
      lines.push('');
    }

    if (block.truncated) {
      lines.push('---');
      lines.push('*Output truncated due to size limits*');
    }

    return lines.join('\n');
  }
}

/**
 * Create a context formatter with default options
 */
export function createContextFormatter(options?: ContextFormatterOptions): ContextFormatter {
  return new ContextFormatter(options);
}

/**
 * Quick helper to format results as a text context block
 */
export function formatContextBlock(params: {
  query: string;
  results: Array<{ score: number; metadata?: Record<string, unknown> }>;
  maxChars?: number;
  title?: string;
}): string {
  const formatter = new ContextFormatter({
    maxChars: params.maxChars ?? 12000,
    title: params.title ?? 'RuVector Context'
  });

  return formatter.formatAndRender(params.query, params.results);
}
