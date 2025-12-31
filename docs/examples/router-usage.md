# Semantic Router ("Tiny Dancer") Usage Examples

## Overview

The Semantic Router classifies query intent and determines optimal execution strategies for the Research Knowledge Manager.

## Basic Usage

```typescript
import { SemanticRouter, routeQuery } from '../../src/tools/router.js';

// Quick routing with convenience function
const result = routeQuery("Find documents about machine learning");
console.log(result);
// {
//   route: 'RETRIEVAL',
//   confidence: 0.85,
//   reasoning: 'Query appears to be a direct retrieval request...',
//   suggestedParams: { limit: 10, similarityThreshold: 0.7 }
// }

// Using the class for more control
const router = new SemanticRouter();
const result2 = router.routeQuery("Show me documents related to neural networks");
```

## Route Types

### RETRIEVAL - Direct Vector Search

**When**: Simple document lookup queries

**Examples**:
- "Find documents about transformers"
- "Search for papers on attention mechanisms"
- "Get document XYZ-123"

```typescript
const result = routeQuery("Find research papers on transformers");
// route: 'RETRIEVAL'
// suggestedParams: { limit: 10, similarityThreshold: 0.7 }
```

### RELATIONAL - Graph Traversal

**When**: Queries requiring relationship exploration

**Examples**:
- "Show documents related to paper ABC"
- "Find connections between concept A and concept B"
- "What papers reference this research?"

```typescript
const result = routeQuery("Find all documents related to transformer architecture");
// route: 'RELATIONAL'
// suggestedParams: { maxHops: 3, traversalStrategy: 'breadth-first' }
```

### SUMMARY - Aggregation & Synthesis

**When**: Queries requesting consolidated information

**Examples**:
- "Summarize research on attention mechanisms"
- "What is the overview of deep learning?"
- "Explain neural networks"

```typescript
const result = routeQuery("Summarize all research on GPT models");
// route: 'SUMMARY'
// suggestedParams: { aggregationMethod: 'weighted-average', maxSources: 20 }
```

### HYBRID - Combined Approach

**When**: Complex queries with multiple intents

**Examples**:
- "Compare transformer and RNN architectures"
- "Find and summarize related research"
- "Analyze connections between different models"

```typescript
const result = routeQuery("Compare BERT and GPT and explain their differences");
// route: 'HYBRID'
// suggestedParams: { enableVectorSearch: true, enableGraphTraversal: true }
```

## Intent Analysis

Get detailed breakdown of query intent:

```typescript
import { analyzeIntent } from '../../src/tools/router.js';

const analysis = analyzeIntent("Find and summarize all documents related to AI");
console.log(analysis);
// {
//   primaryIntent: 'SUMMARY',
//   secondaryIntents: ['RELATIONAL', 'RETRIEVAL'],
//   keywords: {
//     retrieval: ['find'],
//     relational: ['related to'],
//     summary: ['summarize', 'all']
//   },
//   complexity: 0.7,
//   requiresMultiStage: true
// }
```

## Execution Strategy

Get recommended execution plan:

```typescript
import { suggestStrategy } from '../../src/tools/router.js';

const strategy = suggestStrategy(
  "Find related papers, then summarize them",
  { maxResults: 20 }
);

console.log(strategy);
// {
//   approach: 'multi-stage',
//   steps: [
//     {
//       stage: 1,
//       route: 'RELATIONAL',
//       description: 'Execute relational operation as primary stage',
//       params: { maxResults: 20 }
//     },
//     {
//       stage: 2,
//       route: 'SUMMARY',
//       description: 'Follow up with summary to enrich results',
//       params: { usePreviousResults: true, maxResults: 20 }
//     }
//   ],
//   estimatedComplexity: 'medium',
//   hints: [
//     'Pipeline stages can be optimized by sharing embeddings across stages',
//     'Consider parallel execution of graph traversal and summarization'
//   ]
// }
```

## Advanced Examples

### Custom Context

```typescript
const router = new SemanticRouter();

// Provide context for better recommendations
const strategy = router.suggestStrategy(
  "Analyze all transformer papers",
  {
    vectorDimensions: 384,
    graphEnabled: true,
    maxMemory: '2GB'
  }
);
```

### Batch Processing

```typescript
const queries = [
  "Find papers on attention",
  "Summarize transformer research",
  "Compare BERT vs GPT"
];

const router = new SemanticRouter();
const results = queries.map(q => router.routeQuery(q));

results.forEach((result, i) => {
  console.log(`Query ${i + 1}: ${queries[i]}`);
  console.log(`Route: ${result.route} (${result.confidence.toFixed(2)} confidence)`);
  console.log(`Reasoning: ${result.reasoning}\n`);
});
```

## Integration with SONA Engine

```typescript
import { SemanticRouter } from '../../src/tools/router.js';
import { sonaBeginFromText } from '../../src/sonaEngine.js';

const router = new SemanticRouter();
const userQuery = "Find documents related to transformers";

// Route the query
const route = router.routeQuery(userQuery);

// Use route information with SONA
const trajectoryId = await sonaBeginFromText({
  queryText: userQuery,
  dims: 384,
  route: route.route,
  contextIds: []
});

console.log(`Started SONA trajectory ${trajectoryId} with route: ${route.route}`);
```

## Performance Tips

1. **Reuse Router Instance**: Create one router and reuse for multiple queries
2. **Cache Results**: Route decisions for similar queries can be cached
3. **Early Filtering**: Use suggested params to optimize downstream operations
4. **Parallel Execution**: For HYBRID routes, consider parallel processing

```typescript
// Good: Reuse instance
const router = new SemanticRouter();
const results = queries.map(q => router.routeQuery(q));

// Less optimal: Create new instance each time
const results2 = queries.map(q => routeQuery(q));
```
