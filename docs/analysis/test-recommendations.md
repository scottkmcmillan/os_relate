# Test Suite Implementation Recommendations
**Priority-Ordered Action Plan**

## Quick Stats
- **Total Tests:** 197 (196 passing, 1 failing)
- **Implementation Status:** 48% complete (95 real tests, 102 stubs)
- **Critical Gap:** Vector Store, Ingestion, Integration tests
- **Overall Health:** GOOD foundation, needs implementation work

---

## Priority 1: Critical Infrastructure (Week 1)

### 1.1 Install Coverage Tooling (30 mins)
```bash
npm install -D @vitest/coverage-v8
npm run test:coverage
```

**Deliverable:** Coverage reports showing actual code coverage percentages

### 1.2 Fix Failing CLI Test (1 hour)
**File:** `tests/cli/cli.test.ts`
**Issue:** Missing 'Cognitive Features:' in status output

**Options:**
- Add cognitive features to CLI status output
- Update test to match actual output format

### 1.3 Implement Vector Store Tests (8 hours)
**File:** `tests/memory/vectorStore.test.ts`
**Replace 17 stub tests with:**

```typescript
// Example implementation
it('should generate embeddings for text', async () => {
  const vectorStore = new VectorStore({ storagePath: ':memory:' });
  const text = 'This is a test document';

  const embedding = await vectorStore.generateEmbedding(text);

  expect(embedding).toBeInstanceOf(Float32Array);
  expect(embedding.length).toBe(384); // Or configured dimension
  expect(embedding.every(n => typeof n === 'number')).toBe(true);
});

it('should perform similarity search', async () => {
  const vectorStore = new VectorStore({ storagePath: ':memory:' });

  // Insert test vectors
  await vectorStore.insert('doc1', [0.1, 0.2, 0.3, ...]);
  await vectorStore.insert('doc2', [0.9, 0.8, 0.7, ...]);

  // Search
  const results = await vectorStore.search([0.1, 0.2, 0.3, ...], 5);

  expect(results).toHaveLength(2);
  expect(results[0].id).toBe('doc1');
  expect(results[0].score).toBeGreaterThan(results[1].score);
});
```

**Tests to implement:**
- Embedding generation
- Vector insertion with metadata
- Similarity search (cosine, dot product)
- Top-k retrieval
- Metadata filtering
- Batch operations
- Persistence and recovery

---

## Priority 2: Ingestion Pipeline (Week 2)

### 2.1 Implement Document Reader Tests (6 hours)
**File:** `tests/ingestion/reader.test.ts`

```typescript
it('should read markdown files', async () => {
  const reader = new DocumentReader();
  const content = await reader.readFile('test.md');

  expect(content).toHaveProperty('text');
  expect(content).toHaveProperty('metadata');
  expect(content.metadata.filename).toBe('test.md');
  expect(content.metadata.mimeType).toBe('text/markdown');
});

it('should handle large files efficiently', async () => {
  const reader = new DocumentReader();
  const largeFile = 'large-document.txt'; // 10MB+

  const startTime = Date.now();
  const content = await reader.readFile(largeFile);
  const duration = Date.now() - startTime;

  expect(content.text.length).toBeGreaterThan(10_000_000);
  expect(duration).toBeLessThan(5000); // Should complete in <5s
});
```

### 2.2 Implement Parser Tests (4 hours)
**File:** `tests/ingestion/parser.test.ts`

```typescript
it('should parse markdown with frontmatter', () => {
  const parser = new DocumentParser();
  const markdown = `---
title: Test Document
author: Jane Doe
---
# Heading
Content here`;

  const parsed = parser.parse(markdown, 'markdown');

  expect(parsed.metadata.title).toBe('Test Document');
  expect(parsed.metadata.author).toBe('Jane Doe');
  expect(parsed.sections).toHaveLength(1);
  expect(parsed.sections[0].heading).toBe('Heading');
});
```

---

## Priority 3: Integration & System Tests (Week 3)

### 3.1 Implement Full Loop Integration Tests (8 hours)
**File:** `tests/integration/fullLoop.test.ts`

```typescript
describe('Complete ingestion to retrieval flow', () => {
  let system: RKMSystem;

  beforeAll(async () => {
    system = new RKMSystem({
      vectorPath: ':memory:',
      graphPath: './test-data',
      enableCognitive: true
    });
  });

  it('should ingest, store, and retrieve document', async () => {
    // 1. Ingest
    const doc = {
      path: './test-docs/sample.md',
      content: '# Test\nThis is a test document about AI.'
    };

    const ingestResult = await system.ingest(doc);
    expect(ingestResult.success).toBe(true);
    expect(ingestResult.vectorCount).toBeGreaterThan(0);

    // 2. Query
    const results = await system.query('What is this document about?');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('AI');

    // 3. Verify graph
    const graphNodes = await system.getGraphNodes();
    expect(graphNodes.some(n => n.type === 'document')).toBe(true);
  });

  it('should handle 100 documents under 30 seconds', async () => {
    const docs = Array.from({ length: 100 }, (_, i) => ({
      id: `doc-${i}`,
      content: `Document ${i} content about topic ${i % 10}`
    }));

    const startTime = Date.now();
    await system.ingestBatch(docs);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(30000);
  });
});
```

---

## Priority 4: Cognitive Layer Tests (Week 4)

### 4.1 Implement Attention Mechanism Tests (4 hours)
**File:** `tests/memory/cognitive.test.ts`

```typescript
it('should apply attention to query context', async () => {
  const cognitive = new CognitiveLayer(vectorStore, graphStore);

  const query = 'machine learning algorithms';
  const memories = [
    { content: 'ML uses neural networks', embedding: [...] },
    { content: 'Cooking recipes for pasta', embedding: [...] },
    { content: 'Deep learning is subset of ML', embedding: [...] }
  ];

  const attended = await cognitive.applyAttention(query, memories);

  // ML-related memories should have higher attention scores
  expect(attended[0].attentionScore).toBeGreaterThan(0.7);
  expect(attended[2].attentionScore).toBeGreaterThan(0.7);
  expect(attended[1].attentionScore).toBeLessThan(0.3);
});
```

---

## Priority 5: Graph Store Tests (Week 5)

### 5.1 Implement Graph Operations Tests (6 hours)
**File:** `tests/memory/graphStore.test.ts`

```typescript
it('should create nodes and edges', async () => {
  const graph = new GraphStore('./test-graph');

  const node1 = await graph.addNode({
    id: 'n1',
    type: 'concept',
    label: 'Machine Learning'
  });

  const node2 = await graph.addNode({
    id: 'n2',
    type: 'concept',
    label: 'Neural Networks'
  });

  const edge = await graph.addEdge({
    from: 'n1',
    to: 'n2',
    relationship: 'includes'
  });

  expect(node1.id).toBe('n1');
  expect(edge.from).toBe('n1');
});

it('should traverse graph paths', async () => {
  const graph = new GraphStore('./test-graph');
  // Setup: A -> B -> C

  const paths = await graph.findPaths('A', 'C', { maxDepth: 3 });

  expect(paths.length).toBeGreaterThan(0);
  expect(paths[0]).toEqual(['A', 'B', 'C']);
});
```

---

## Testing Best Practices

### Test Data Management
```typescript
// Use test fixtures
const createTestDocument = (overrides = {}) => ({
  id: `doc-${Date.now()}`,
  title: 'Test Document',
  content: 'Test content',
  metadata: {},
  ...overrides
});

// Use beforeEach for cleanup
beforeEach(async () => {
  await testDatabase.clear();
  await testVectorStore.reset();
});
```

### Async Testing Patterns
```typescript
// Set appropriate timeouts
it('should complete heavy operation', async () => {
  // For slow operations
}, 30000); // 30 second timeout

// Handle promises correctly
it('should handle async errors', async () => {
  await expect(service.failingOperation())
    .rejects
    .toThrow('Expected error message');
});
```

### Mock Usage
```typescript
// Mock external dependencies
vi.mock('../../src/embedding', () => ({
  generateEmbedding: vi.fn(text =>
    new Float32Array(384).fill(0.1)
  )
}));

// Spy on internal methods
const spy = vi.spyOn(service, 'internalMethod');
await service.publicMethod();
expect(spy).toHaveBeenCalledTimes(1);
```

---

## Continuous Integration Setup

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Success Metrics

### Phase 1 Completion (Week 1)
- [ ] Coverage tooling installed
- [ ] CLI test fixed (1/1 failing)
- [ ] Vector Store tests implemented (17/17)
- [ ] Coverage report shows >60% line coverage

### Phase 2 Completion (Week 2)
- [ ] Reader tests implemented (18/18)
- [ ] Parser tests implemented (all)
- [ ] Coverage >70%

### Phase 3 Completion (Week 3)
- [ ] Integration tests implemented (29/29)
- [ ] All stub tests removed
- [ ] Coverage >80%

### Phase 4-5 Completion (Weeks 4-5)
- [ ] Cognitive tests implemented (20/20)
- [ ] Graph Store tests implemented (17/17)
- [ ] Performance benchmarks added
- [ ] Coverage >85%

### Final Target
- **Total Tests:** 197+ (all implemented, 0 stubs)
- **Pass Rate:** 100%
- **Line Coverage:** >85%
- **Branch Coverage:** >80%
- **CI/CD:** Automated testing on every commit

---

## Estimated Timeline

| Week | Focus | Hours | Deliverable |
|------|-------|-------|-------------|
| 1 | Critical Infrastructure | 10 | Coverage, Vector Store tests |
| 2 | Ingestion Pipeline | 10 | Reader, Parser tests |
| 3 | Integration Tests | 10 | Full loop validation |
| 4 | Cognitive Layer | 8 | Attention, reasoning tests |
| 5 | Graph Store | 8 | Graph operations tests |
| **Total** | **5 weeks** | **46 hours** | **Complete test suite** |

---

## Next Steps

1. **Immediate (Today):**
   - Install @vitest/coverage-v8
   - Generate coverage report
   - Fix CLI test

2. **This Week:**
   - Implement Vector Store tests
   - Document test patterns
   - Setup CI/CD

3. **Next 2 Weeks:**
   - Implement Ingestion tests
   - Implement Integration tests
   - Achieve >80% coverage

4. **Ongoing:**
   - Add performance regression tests
   - Monitor coverage trends
   - Refactor slow tests
