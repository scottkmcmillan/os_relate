/**
 * Semantic Router ("Tiny Dancer") - Query Intent Classification and Routing
 *
 * Acts as a traffic controller for agent queries, determining whether a query
 * requires vector search, graph traversal, or summary generation.
 *
 * @module router
 */

/**
 * Route types for query classification
 */
export type RouteType = 'RETRIEVAL' | 'RELATIONAL' | 'SUMMARY' | 'HYBRID';

/**
 * Result of query routing analysis
 */
export type RouteResult = {
  /** The determined route type */
  route: RouteType;
  /** Confidence score (0-1) in the routing decision */
  confidence: number;
  /** Human-readable explanation of the routing decision */
  reasoning: string;
  /** Optional parameters suggested for executing the query */
  suggestedParams?: Record<string, unknown>;
};

/**
 * Intent analysis result with detailed breakdown
 */
export type IntentAnalysis = {
  /** Primary intent category */
  primaryIntent: RouteType;
  /** Secondary intents detected */
  secondaryIntents: RouteType[];
  /** Detected keywords by category */
  keywords: {
    retrieval: string[];
    relational: string[];
    summary: string[];
  };
  /** Query complexity score (0-1) */
  complexity: number;
  /** Whether query requires multiple processing stages */
  requiresMultiStage: boolean;
};

/**
 * Execution strategy recommendation
 */
export type ExecutionStrategy = {
  /** Primary execution approach */
  approach: 'single-stage' | 'multi-stage' | 'parallel';
  /** Ordered steps for execution */
  steps: Array<{
    stage: number;
    route: RouteType;
    description: string;
    params?: Record<string, unknown>;
  }>;
  /** Estimated complexity */
  estimatedComplexity: 'low' | 'medium' | 'high';
  /** Additional optimization hints */
  hints: string[];
};

/**
 * Keyword patterns for intent classification
 */
const PATTERNS = {
  retrieval: [
    'find', 'search', 'get', 'show', 'list', 'fetch', 'retrieve',
    'look up', 'query', 'locate', 'access', 'obtain', 'display'
  ],
  relational: [
    'related to', 'connected', 'between', 'links', 'references',
    'associated with', 'depends on', 'linked to', 'relationship',
    'connection', 'path from', 'trace', 'navigate', 'graph',
    'upstream', 'downstream', 'neighbors', 'adjacent'
  ],
  summary: [
    'summarize', 'overview', 'explain', 'what is', 'describe',
    'tell me about', 'give me an overview', 'synthesis', 'aggregate',
    'combine', 'consolidate', 'brief', 'synopsis', 'abstract'
  ],
  hybrid: [
    'compare', 'analyze', 'evaluate', 'assess', 'contrast',
    'similarities', 'differences', 'explore', 'investigate'
  ]
} as const;

/**
 * Complexity indicators in queries
 */
const COMPLEXITY_INDICATORS = [
  'all', 'every', 'comprehensive', 'detailed', 'complete',
  'multiple', 'various', 'different', 'several', 'many'
];

/**
 * Multi-stage processing indicators
 */
const MULTI_STAGE_INDICATORS = [
  'then', 'after', 'next', 'followed by', 'subsequently',
  'and also', 'in addition', 'furthermore', 'moreover'
];

/**
 * SemanticRouter - Intelligent query routing and intent classification
 *
 * Uses keyword-based heuristics and pattern matching to determine
 * the optimal execution strategy for research queries.
 */
export class SemanticRouter {
  /**
   * Classify a query and determine its optimal routing
   *
   * @param query - The user query to analyze
   * @returns Routing decision with confidence and reasoning
   *
   * @example
   * ```typescript
   * const router = new SemanticRouter();
   * const result = router.routeQuery("Find documents related to machine learning");
   * console.log(result.route); // 'RELATIONAL'
   * console.log(result.confidence); // 0.85
   * ```
   */
  routeQuery(query: string): RouteResult {
    const normalizedQuery = query.toLowerCase().trim();

    // Score each route type
    const scores = {
      retrieval: this.scoreRetrieval(normalizedQuery),
      relational: this.scoreRelational(normalizedQuery),
      summary: this.scoreSummary(normalizedQuery),
      hybrid: this.scoreHybrid(normalizedQuery)
    };

    // Find the highest scoring route
    const entries = Object.entries(scores) as Array<[RouteType, number]>;
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const [topRoute, topScore] = sorted[0];
    const [secondRoute, secondScore] = sorted[1];

    // Determine if this is actually a hybrid query
    const isHybrid = (topScore - secondScore) < 0.2 && topScore > 0.3;
    // Convert to uppercase to match RouteType (topRoute is lowercase from scores object)
    const finalRoute: RouteType = isHybrid ? 'HYBRID' : topRoute.toUpperCase() as RouteType;
    const confidence = isHybrid ? (topScore + secondScore) / 2 : topScore;

    // Generate reasoning
    const reasoning = this.generateReasoning(finalRoute, normalizedQuery, scores);

    // Generate suggested parameters
    const suggestedParams = this.generateSuggestedParams(finalRoute, normalizedQuery);

    return {
      route: finalRoute,
      confidence: Math.min(confidence, 1.0),
      reasoning,
      suggestedParams
    };
  }

  /**
   * Perform deeper intent analysis on a query
   *
   * @param query - The user query to analyze
   * @returns Detailed intent breakdown with keywords and complexity
   *
   * @example
   * ```typescript
   * const router = new SemanticRouter();
   * const analysis = router.analyzeIntent("Summarize all documents related to AI");
   * console.log(analysis.primaryIntent); // 'SUMMARY'
   * console.log(analysis.secondaryIntents); // ['RELATIONAL', 'RETRIEVAL']
   * console.log(analysis.complexity); // 0.7
   * ```
   */
  analyzeIntent(query: string): IntentAnalysis {
    const normalizedQuery = query.toLowerCase().trim();

    // Extract keywords for each category
    const keywords = {
      retrieval: this.extractKeywords(normalizedQuery, PATTERNS.retrieval),
      relational: this.extractKeywords(normalizedQuery, PATTERNS.relational),
      summary: this.extractKeywords(normalizedQuery, PATTERNS.summary)
    };

    // Score each intent
    const scores = {
      retrieval: this.scoreRetrieval(normalizedQuery),
      relational: this.scoreRelational(normalizedQuery),
      summary: this.scoreSummary(normalizedQuery),
      hybrid: this.scoreHybrid(normalizedQuery)
    };

    // Determine primary and secondary intents
    const sortedIntents = (Object.entries(scores) as Array<[RouteType, number]>)
      .filter(([_, score]) => score > 0.2)
      .sort((a, b) => b[1] - a[1]);

    const primaryIntent = sortedIntents[0]?.[0] || 'RETRIEVAL';
    const secondaryIntents = sortedIntents.slice(1).map(([route]) => route);

    // Calculate complexity
    const complexity = this.calculateComplexity(normalizedQuery, keywords);

    // Check if multi-stage processing is needed
    const requiresMultiStage = this.requiresMultiStage(normalizedQuery);

    return {
      primaryIntent,
      secondaryIntents,
      keywords,
      complexity,
      requiresMultiStage
    };
  }

  /**
   * Suggest an execution strategy based on query analysis
   *
   * @param query - The user query
   * @param context - Optional context about available resources or constraints
   * @returns Recommended execution strategy with steps
   *
   * @example
   * ```typescript
   * const router = new SemanticRouter();
   * const strategy = router.suggestStrategy(
   *   "Find and summarize related documents",
   *   { maxResults: 10 }
   * );
   * console.log(strategy.approach); // 'multi-stage'
   * console.log(strategy.steps.length); // 2
   * ```
   */
  suggestStrategy(query: string, context?: Record<string, unknown>): ExecutionStrategy {
    const intent = this.analyzeIntent(query);
    const route = this.routeQuery(query);

    // Determine if single or multi-stage approach is needed
    const isMultiStage = intent.requiresMultiStage ||
                         route.route === 'HYBRID' ||
                         intent.secondaryIntents.length > 1;

    if (!isMultiStage) {
      // Single-stage execution
      return {
        approach: 'single-stage',
        steps: [{
          stage: 1,
          route: route.route,
          description: route.reasoning,
          params: { ...route.suggestedParams, ...context }
        }],
        estimatedComplexity: intent.complexity > 0.6 ? 'medium' : 'low',
        hints: this.generateOptimizationHints(route.route, intent)
      };
    }

    // Multi-stage execution
    const steps = this.planMultiStageExecution(intent, context);

    return {
      approach: steps.length > 2 ? 'multi-stage' : 'multi-stage',
      steps,
      estimatedComplexity: intent.complexity > 0.7 ? 'high' : 'medium',
      hints: this.generateOptimizationHints('HYBRID', intent)
    };
  }

  /**
   * Score query for retrieval intent
   */
  private scoreRetrieval(query: string): number {
    let score = 0;

    for (const keyword of PATTERNS.retrieval) {
      if (query.includes(keyword)) {
        score += 0.3;
      }
    }

    // Boost for specific identifiers (IDs, names, etc.)
    if (/\b[a-f0-9]{8,}\b|\b[A-Z][a-zA-Z0-9_-]+\b/.test(query)) {
      score += 0.2;
    }

    // Boost for simple, direct queries
    if (query.split(' ').length < 6) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Score query for relational/graph traversal intent
   */
  private scoreRelational(query: string): number {
    let score = 0;

    for (const keyword of PATTERNS.relational) {
      if (query.includes(keyword)) {
        score += 0.4;
      }
    }

    // Boost for relationship queries
    if (/\b(from|to|with|and)\b/.test(query)) {
      score += 0.1;
    }

    // Boost for multi-entity queries
    const entityCount = (query.match(/\band\b/g) || []).length;
    score += entityCount * 0.15;

    return Math.min(score, 1.0);
  }

  /**
   * Score query for summary intent
   */
  private scoreSummary(query: string): number {
    let score = 0;

    for (const keyword of PATTERNS.summary) {
      if (query.includes(keyword)) {
        score += 0.4;
      }
    }

    // Boost for aggregation indicators
    if (/\b(all|overall|total|entire|whole)\b/.test(query)) {
      score += 0.2;
    }

    // Boost for question words
    if (/^(what|why|how|when|where)\b/.test(query)) {
      score += 0.15;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Score query for hybrid intent
   */
  private scoreHybrid(query: string): number {
    let score = 0;

    for (const keyword of PATTERNS.hybrid) {
      if (query.includes(keyword)) {
        score += 0.3;
      }
    }

    // Boost for complex multi-part queries
    const clauseCount = (query.match(/\b(and|or|but|then)\b/g) || []).length;
    score += clauseCount * 0.2;

    // Boost for comparative language
    if (/\b(more|less|better|worse|versus|vs)\b/.test(query)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Extract matching keywords from query
   */
  private extractKeywords(query: string, patterns: readonly string[]): string[] {
    const found: string[] = [];
    for (const pattern of patterns) {
      if (query.includes(pattern)) {
        found.push(pattern);
      }
    }
    return found;
  }

  /**
   * Calculate query complexity score
   */
  private calculateComplexity(query: string, keywords: IntentAnalysis['keywords']): number {
    let complexity = 0;

    // Base complexity from query length
    const wordCount = query.split(/\s+/).length;
    complexity += Math.min(wordCount / 20, 0.3);

    // Complexity from keyword diversity
    const totalKeywords = keywords.retrieval.length +
                          keywords.relational.length +
                          keywords.summary.length;
    complexity += Math.min(totalKeywords / 10, 0.3);

    // Complexity from indicators
    for (const indicator of COMPLEXITY_INDICATORS) {
      if (query.includes(indicator)) {
        complexity += 0.1;
      }
    }

    return Math.min(complexity, 1.0);
  }

  /**
   * Check if query requires multi-stage processing
   */
  private requiresMultiStage(query: string): boolean {
    for (const indicator of MULTI_STAGE_INDICATORS) {
      if (query.includes(indicator)) {
        return true;
      }
    }

    // Check for sequential operations
    return /\bthen\b|\bafter\b|\bnext\b/.test(query);
  }

  /**
   * Generate human-readable reasoning for routing decision
   */
  private generateReasoning(route: RouteType, query: string, scores: Record<string, number>): string {
    const reasoningMap: Record<RouteType, string> = {
      RETRIEVAL: `Query appears to be a direct retrieval request. Detected keywords suggest simple document lookup. Confidence based on retrieval score of ${scores.retrieval.toFixed(2)}.`,
      RELATIONAL: `Query requires graph traversal and relationship exploration. Detected relational keywords indicating multi-hop navigation needed. Confidence based on relational score of ${scores.relational.toFixed(2)}.`,
      SUMMARY: `Query requests synthesis or aggregation. Detected summary keywords indicating need to consolidate multiple sources. Confidence based on summary score of ${scores.summary.toFixed(2)}.`,
      HYBRID: `Query has multiple intent components requiring combined approach. Scores are balanced across routes (R:${scores.retrieval.toFixed(2)}, Re:${scores.relational.toFixed(2)}, S:${scores.summary.toFixed(2)}), suggesting need for hybrid execution.`
    };

    return reasoningMap[route];
  }

  /**
   * Generate suggested parameters based on route type
   */
  private generateSuggestedParams(route: RouteType, query: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    switch (route) {
      case 'RETRIEVAL':
        params.limit = 10;
        params.similarityThreshold = 0.7;
        break;

      case 'RELATIONAL':
        params.maxHops = 3;
        params.traversalStrategy = 'breadth-first';
        params.includeEdgeWeights = true;
        break;

      case 'SUMMARY':
        params.aggregationMethod = 'weighted-average';
        params.maxSources = 20;
        params.summaryLength = 'medium';
        break;

      case 'HYBRID':
        params.enableVectorSearch = true;
        params.enableGraphTraversal = true;
        params.fusionMethod = 'reciprocal-rank';
        break;
    }

    // Extract potential numeric limits from query
    const limitMatch = query.match(/\b(\d+)\s+(results?|documents?|items?)\b/);
    if (limitMatch) {
      params.limit = parseInt(limitMatch[1], 10);
    }

    return params;
  }

  /**
   * Plan multi-stage execution steps
   */
  private planMultiStageExecution(
    intent: IntentAnalysis,
    context?: Record<string, unknown>
  ): ExecutionStrategy['steps'] {
    const steps: ExecutionStrategy['steps'] = [];

    // Start with primary intent
    steps.push({
      stage: 1,
      route: intent.primaryIntent,
      description: `Execute ${intent.primaryIntent.toLowerCase()} operation as primary stage`,
      params: context
    });

    // Add secondary intents as subsequent stages
    intent.secondaryIntents.forEach((secondaryIntent, index) => {
      steps.push({
        stage: steps.length + 1,
        route: secondaryIntent,
        description: `Follow up with ${secondaryIntent.toLowerCase()} to enrich results`,
        params: { usePreviousResults: true, ...context }
      });
    });

    return steps;
  }

  /**
   * Generate optimization hints for execution
   */
  private generateOptimizationHints(route: RouteType, intent: IntentAnalysis): string[] {
    const hints: string[] = [];

    if (intent.complexity > 0.7) {
      hints.push('Query is complex - consider breaking into smaller sub-queries');
    }

    if (route === 'RELATIONAL' || route === 'HYBRID') {
      hints.push('Cache intermediate graph traversal results for potential reuse');
    }

    if (route === 'SUMMARY' || route === 'HYBRID') {
      hints.push('Pre-filter documents by relevance before aggregation to reduce processing');
    }

    if (intent.requiresMultiStage) {
      hints.push('Pipeline stages can be optimized by sharing embeddings across stages');
    }

    if (intent.keywords.relational.length > 0 && intent.keywords.summary.length > 0) {
      hints.push('Consider parallel execution of graph traversal and summarization');
    }

    return hints;
  }
}

/**
 * Factory function to create a new SemanticRouter instance
 */
export function createSemanticRouter(): SemanticRouter {
  return new SemanticRouter();
}

/**
 * Convenience function to create and use a router in one call
 */
export function routeQuery(query: string): RouteResult {
  const router = new SemanticRouter();
  return router.routeQuery(query);
}

/**
 * Convenience function to analyze intent in one call
 */
export function analyzeIntent(query: string): IntentAnalysis {
  const router = new SemanticRouter();
  return router.analyzeIntent(query);
}

/**
 * Convenience function to suggest strategy in one call
 */
export function suggestStrategy(query: string, context?: Record<string, unknown>): ExecutionStrategy {
  const router = new SemanticRouter();
  return router.suggestStrategy(query, context);
}
