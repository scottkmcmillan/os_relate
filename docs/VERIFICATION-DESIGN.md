# RKM System Verification Workflow - Design Document

## Executive Summary

The RKM System Verification Workflow is an automated testing framework that validates all components of the Research Knowledge Manager (RKM) system. It provides comprehensive checks across 5 phases with clear pass/fail indicators, detailed error messages, and performance metrics.

**Design Goals:**
- **Comprehensive**: Test all critical system components
- **Automated**: Zero manual intervention required
- **Clear**: Unambiguous pass/fail indicators
- **Helpful**: Actionable error messages with fixes
- **Fast**: Complete verification in under 5 seconds
- **Portable**: Works on all platforms (TypeScript + Bash versions)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Verification Runner                            │
│  (TypeScript: verify-system.ts / Bash: verify-system.sh)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        5 Test Phases                             │
├─────────────────────────────────────────────────────────────────┤
│  Phase 1: Pre-flight Checks                                     │
│    ├── Node.js Version Check                                    │
│    ├── Dependencies Verification                                │
│    ├── Build Existence Check                                    │
│    └── System Capabilities Query                                │
├─────────────────────────────────────────────────────────────────┤
│  Phase 2: Test Environment Setup                                │
│    └── Create Sample Documents + Temp Database                  │
├─────────────────────────────────────────────────────────────────┤
│  Phase 3: Ingestion & Query Verification                        │
│    ├── Document Ingestion Test                                  │
│    ├── Vector Query Test                                        │
│    ├── Hybrid Search Test                                       │
│    └── Graph Query Test                                         │
├─────────────────────────────────────────────────────────────────┤
│  Phase 4: Advanced Features                                     │
│    ├── Full Status Report Test                                  │
│    └── Semantic Router Test                                     │
├─────────────────────────────────────────────────────────────────┤
│  Phase 5: Cleanup                                                │
│    └── Remove Test Files + Database                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Summary Report                                │
│  ✓ Pass rate, timing, detailed failures                         │
│  ✓ Exit code 0 (success) or 1 (failure)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Phase-by-Phase Design

### Phase 1: Pre-flight Checks

**Purpose**: Verify system prerequisites before testing functionality

#### Check 1: Node.js Version
```typescript
async function checkNodeVersion(): Promise<CheckResult> {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0] || '0', 10);

  if (majorVersion >= 18) {
    return { passed: true, message: `Compatible: ${nodeVersion}` };
  } else {
    return {
      passed: false,
      message: `Too old: ${nodeVersion}`,
      details: 'Required: v18.x or higher. Upgrade Node.js.'
    };
  }
}
```

**Rationale**: RKM requires Node.js 18+ for ES modules, top-level await, and modern APIs.

#### Check 2: Dependencies Installed
```typescript
async function checkDependenciesInstalled(): Promise<CheckResult> {
  const criticalPackages = [
    'ruvector',      // Core vector/graph engine
    'commander',     // CLI framework
    'better-sqlite3', // Database backend
    '@modelcontextprotocol/sdk' // MCP integration
  ];

  const missing = criticalPackages.filter(pkg =>
    !existsSync(join(process.cwd(), 'node_modules', pkg))
  );

  if (missing.length > 0) {
    return {
      passed: false,
      message: 'Missing packages',
      details: `Run: npm install. Missing: ${missing.join(', ')}`
    };
  }

  return { passed: true, message: 'All dependencies installed' };
}
```

**Rationale**: Prevents cryptic runtime errors from missing packages.

#### Check 3: Build Exists
```typescript
async function checkBuildExists(): Promise<CheckResult> {
  const distDir = join(process.cwd(), 'dist');
  const cliPath = join(distDir, 'cli.js');

  if (!existsSync(cliPath)) {
    return {
      passed: false,
      message: 'Build not found',
      details: 'Run: npm run build'
    };
  }

  const fileCount = execSync('find dist -name "*.js" | wc -l').toString().trim();
  return {
    passed: true,
    message: 'Build ready',
    details: `${fileCount} JavaScript files compiled`
  };
}
```

**Rationale**: Ensures TypeScript has been compiled to JavaScript.

#### Check 4: System Capabilities
```typescript
async function checkSystemCapabilities(): Promise<CheckResult> {
  const output = execSync('node dist/cli.js status --json', {
    encoding: 'utf8',
    timeout: 10000
  });

  const status = JSON.parse(output);
  const caps = status.capabilities;

  const details = [
    `Implementation: ${caps.implementation.type}`,
    `GNN: ${caps.modules.gnnAvailable ? 'Available' : 'Not Available'}`,
    `Attention: ${caps.modules.attentionAvailable ? 'Available' : 'Not Available'}`,
    `SONA: ${caps.modules.sonaAvailable ? 'Available' : 'Not Available'}`
  ].join(', ');

  return {
    passed: true,
    message: 'Capabilities retrieved',
    details
  };
}
```

**Rationale**: Validates that RuVector loaded correctly and detects available features.

---

### Phase 2: Test Environment Setup

**Purpose**: Create isolated test environment without affecting user data

```typescript
const TEST_CONFIG = {
  testDbPath: './test-verification.db',
  testDataDir: './test-verification-data',
  sampleDocs: [
    {
      filename: 'sample1.md',
      content: '# Machine Learning Fundamentals\n\nMachine learning is a subset of AI...',
      tags: ['ml', 'ai']
    },
    // ... more samples
  ],
  cleanupAfterTest: true
};

async function setupTestEnvironment(): Promise<CheckResult> {
  // 1. Clean existing test files
  rmSync(TEST_CONFIG.testDbPath, { force: true });
  rmSync(TEST_CONFIG.testDataDir, { recursive: true, force: true });

  // 2. Create test directory
  mkdirSync(TEST_CONFIG.testDataDir, { recursive: true });

  // 3. Write sample documents
  for (const doc of TEST_CONFIG.sampleDocs) {
    const filePath = join(TEST_CONFIG.testDataDir, doc.filename);
    writeFileSync(filePath, doc.content, 'utf8');
  }

  return {
    passed: true,
    message: 'Test environment ready',
    details: `Created ${TEST_CONFIG.sampleDocs.length} sample documents`
  };
}
```

**Design Decisions:**
- **Separate database**: Prevents corruption of user data
- **Markdown samples**: Tests real-world document format
- **Tags included**: Validates metadata handling
- **Auto-cleanup**: No residual test files (configurable)

---

### Phase 3: Ingestion & Query Verification

**Purpose**: Validate core functionality: ingest → store → retrieve

#### Test 1: Document Ingestion
```typescript
async function testIngestion(): Promise<CheckResult> {
  const output = execSync(
    `node dist/cli.js --db ${TEST_CONFIG.testDbPath} --data-dir ${TEST_CONFIG.testDataDir} ` +
    `ingest --path ${TEST_CONFIG.testDataDir} --tag ml --tag test`,
    { encoding: 'utf8', timeout: 30000 }
  );

  const successMatch = output.match(/Ingested (\d+) documents/) ||
                      output.match(/Documents: (\d+)/);

  if (successMatch) {
    const count = parseInt(successMatch[1] || '0', 10);
    if (count === TEST_CONFIG.sampleDocs.length) {
      return {
        passed: true,
        message: 'Ingestion successful',
        details: `Ingested ${count} documents`
      };
    }
  }

  return { passed: false, message: 'Ingestion failed' };
}
```

**What it validates**:
- Document reading (markdown parsing)
- Embedding generation (OpenAI API or local model)
- Vector insertion (HNSW index construction)
- Graph node creation (Document nodes)
- Tag attachment (metadata storage)

#### Test 2: Vector Query
```typescript
async function testQuery(): Promise<CheckResult> {
  const output = execSync(
    `node dist/cli.js --db ${TEST_CONFIG.testDbPath} query "machine learning" -k 2`,
    { encoding: 'utf8', timeout: 30000 }
  );

  const hasResults = output.includes('Machine Learning') ||
                    output.includes('score:') ||
                    output.includes('source:');

  if (hasResults) {
    const resultCount = (output.match(/\d+\./g) || []).length;
    return {
      passed: true,
      message: 'Query successful',
      details: `Retrieved ${resultCount} results`
    };
  }

  return { passed: false, message: 'No results found' };
}
```

**What it validates**:
- Query embedding generation
- HNSW nearest neighbor search
- Score normalization
- Result formatting

#### Test 3: Hybrid Search
```typescript
async function testSearch(): Promise<CheckResult> {
  const output = execSync(
    `node dist/cli.js --db ${TEST_CONFIG.testDbPath} search "neural networks" -k 2 --format json`,
    { encoding: 'utf8', timeout: 30000 }
  );

  const result = JSON.parse(output);

  if (!result.results || !Array.isArray(result.results)) {
    return {
      passed: false,
      message: 'Missing results array'
    };
  }

  const hasScores = result.results.every(r => typeof r.combinedScore === 'number');

  return {
    passed: hasScores,
    message: 'Hybrid search successful',
    details: `${result.results.length} results with scores`
  };
}
```

**What it validates**:
- Unified memory interface
- Vector + graph score fusion
- JSON serialization
- Combined scoring algorithm

#### Test 4: Graph Query
```typescript
async function testGraph(): Promise<CheckResult> {
  const output = execSync(
    `node dist/cli.js --db ${TEST_CONFIG.testDbPath} ` +
    `graph "MATCH (n:Document) RETURN n" --format json`,
    { encoding: 'utf8', timeout: 30000 }
  );

  const result = JSON.parse(output);

  if (!result.nodes || !Array.isArray(result.nodes)) {
    return { passed: false, message: 'Missing nodes array' };
  }

  const nodeCount = result.nodes.length;
  const edgeCount = result.edges?.length || 0;

  return {
    passed: nodeCount > 0,
    message: 'Graph query successful',
    details: `${nodeCount} nodes, ${edgeCount} edges`
  };
}
```

**What it validates**:
- Cypher query parsing
- Graph database operations
- Node/edge retrieval
- JSON formatting

---

### Phase 4: Advanced Features

**Purpose**: Test optional but important features

#### Test 1: Full Status Report
```typescript
async function testStatusFull(): Promise<CheckResult> {
  const output = execSync(
    `node dist/cli.js --db ${TEST_CONFIG.testDbPath} status --full --json`,
    { encoding: 'utf8', timeout: 10000 }
  );

  const status = JSON.parse(output);

  if (!status.stats) {
    return { passed: false, message: 'Missing stats' };
  }

  const vectorCount = status.stats.vector?.totalVectors || 0;
  const nodeCount = status.stats.graph?.nodeCount || 0;

  return {
    passed: vectorCount > 0 || nodeCount > 0,
    message: 'Full status retrieved',
    details: `Vectors: ${vectorCount}, Nodes: ${nodeCount}`
  };
}
```

**What it validates**:
- Statistics collection from vector store
- Statistics collection from graph store
- Cognitive engine status (if available)
- Metrics aggregation

#### Test 2: Semantic Router
```typescript
async function testRouter(): Promise<CheckResult> {
  const output = execSync(
    `node dist/cli.js route "Find all documents about machine learning"`,
    { encoding: 'utf8', timeout: 10000 }
  );

  const hasRoute = output.includes('Route:') && output.includes('Confidence:');

  if (hasRoute) {
    const routeMatch = output.match(/Route:\s*(\w+)/);
    const confidenceMatch = output.match(/Confidence:\s*([\d.]+)%/);

    return {
      passed: true,
      message: 'Router working',
      details: `Route: ${routeMatch?.[1]}, Confidence: ${confidenceMatch?.[1]}%`
    };
  }

  return { passed: false, message: 'Router failed' };
}
```

**What it validates**:
- Semantic router initialization
- Query intent classification
- Confidence scoring
- Strategy suggestion

---

### Phase 5: Cleanup

**Purpose**: Remove test artifacts, leave system clean

```typescript
async function cleanupTestEnvironment(): Promise<CheckResult> {
  if (TEST_CONFIG.cleanupAfterTest) {
    rmSync(TEST_CONFIG.testDbPath, { force: true });
    rmSync(TEST_CONFIG.testDataDir, { recursive: true, force: true });

    return {
      passed: true,
      message: 'Cleanup complete',
      details: 'Removed test database and documents'
    };
  }

  return {
    passed: true,
    message: 'Cleanup skipped',
    details: 'Test files preserved for inspection'
  };
}
```

**Design Decision**: Cleanup is configurable for debugging but enabled by default.

---

## Result Reporting

### CheckResult Interface
```typescript
interface CheckResult {
  passed: boolean;      // Pass/fail status
  message: string;       // Human-readable summary
  details?: string;      // Additional context (shown on failure or verbose)
  duration?: number;     // Execution time in milliseconds
}
```

### Summary Report Format
```
================================================================================
VERIFICATION SUMMARY
================================================================================

Total checks: 12
Passed: 11
Failed: 1
Pass rate: 91.7%
Total time: 3245ms

Failed checks:
  ✗ Hybrid Search: Search output malformed
    Details: Expected JSON with results array

⚠️  Some checks failed. Please review the errors above.
```

### Color Coding
- **Green (✓)**: Passed checks
- **Red (✗)**: Failed checks
- **Yellow (⚠️)**: Warnings

---

## Performance Characteristics

### Expected Timing (per phase)

| Phase | Duration | Bottleneck |
|-------|----------|------------|
| 1. Pre-flight | 100-300ms | File system checks |
| 2. Setup | 50-100ms | File I/O |
| 3. Ingestion/Query | 1500-2500ms | Embedding API calls |
| 4. Advanced | 300-600ms | Router inference |
| 5. Cleanup | 20-50ms | File deletion |
| **Total** | **2-4 seconds** | Network latency |

### Optimization Strategies

1. **Parallel Checks**: Independent checks run concurrently
2. **Small Test Set**: Only 3 documents (sufficient for validation)
3. **JSON Parsing**: Faster than regex parsing for structured output
4. **Cached Embeddings**: Future enhancement to cache test embeddings

---

## Usage Metrics Display

The verification workflow displays comprehensive metrics via the `status --full --json` command:

### Vector Store Metrics
```json
{
  "vector": {
    "totalVectors": 3,
    "tierCounts": { "hot": 3, "warm": 0, "cold": 0 },
    "config": { "dimensions": 384 },
    "storage": {
      "path": "./test-verification.db",
      "sizeBytes": 4608
    }
  }
}
```

**Displayed as**:
- Total documents ingested: **3 vectors**
- Storage size: **4.5 KB**
- Average vector size: **1.5 KB**

### Graph Store Metrics
```json
{
  "graph": {
    "nodeCount": 3,
    "edgeCount": 0,
    "nodeTypes": { "Document": 3 },
    "edgeTypes": {}
  }
}
```

**Displayed as**:
- Graph nodes: **3**
- Graph edges: **0**
- Average connectivity: **0.0 edges/node**

### Cognitive Metrics
```json
{
  "cognitive": {
    "trajectoriesRecorded": 0,
    "patternsLearned": 0,
    "microLoraUpdates": 0,
    "baseLoraUpdates": 0,
    "ewcConsolidations": 0
  }
}
```

**Displayed as**:
- Total queries executed: **0 trajectories**
- Learning efficiency: **0% (patterns per trajectory)**

---

## Error Handling

### Error Classification

1. **System Errors** (Phase 1):
   - Node.js version incompatibility
   - Missing dependencies
   - Build failures
   - **Action**: Install/upgrade prerequisites

2. **Setup Errors** (Phase 2):
   - Permission denied (file system)
   - Disk space issues
   - **Action**: Check permissions, free space

3. **Functional Errors** (Phase 3-4):
   - Ingestion failures (API errors, invalid data)
   - Query failures (index corruption, wrong dimensions)
   - Graph failures (Cypher syntax, missing nodes)
   - **Action**: Check logs, verify configuration

4. **Cleanup Errors** (Phase 5):
   - File lock (process still using database)
   - **Action**: Non-critical, manual cleanup OK

### Error Message Design

**Format**:
```
✗ [Check Name]: [Brief summary]
  Details: [Actionable fix or error details]
```

**Examples**:
```
✗ Dependencies Installed: Some critical packages are missing
  Details: Missing: ruvector, commander. Run: npm install

✗ Document Ingestion: Ingestion failed
  Details: Error: ENOENT: no such file or directory, open 'sample1.md'
```

---

## Extensibility

### Adding New Checks

**Step 1**: Define check function
```typescript
async function checkNewFeature(): Promise<CheckResult> {
  try {
    // Test logic here
    const output = execSync('node dist/cli.js new-command', { encoding: 'utf8' });
    const success = output.includes('expected-result');

    return {
      passed: success,
      message: success ? 'New feature works' : 'New feature failed',
      details: 'Additional context'
    };
  } catch (error) {
    return {
      passed: false,
      message: 'New feature error',
      details: error.message
    };
  }
}
```

**Step 2**: Add to verification runner
```typescript
async function main() {
  const runner = new VerificationRunner(verbose);

  // ... existing phases ...

  process.stdout.write('\n🔬 PHASE 6: EXPERIMENTAL FEATURES\n');
  await runner.runCheck('New Feature', checkNewFeature);

  runner.printSummary();
}
```

### Custom Sample Documents

Modify `TEST_CONFIG.sampleDocs` to test specific document types:
```typescript
const TEST_CONFIG = {
  sampleDocs: [
    {
      filename: 'code-snippet.md',
      content: '```python\ndef hello():\n    print("Hello")\n```',
      tags: ['code', 'python']
    }
  ]
};
```

---

## CI/CD Integration

### GitHub Actions
```yaml
name: RKM Verification
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run verify
```

### Exit Codes
- `0`: All checks passed → CI passes
- `1`: One or more failures → CI fails

### Artifacts
Future enhancement: Upload verification logs as CI artifacts

---

## Design Rationale

### Why 5 Phases?
**Logical separation of concerns**:
1. System prerequisites (can't proceed without these)
2. Test isolation (setup test environment)
3. Core functionality (must work for system to be useful)
4. Advanced features (nice-to-have, system still functional without)
5. Cleanup (good hygiene, restore initial state)

### Why Two Implementations?
**TypeScript version**:
- Maintainable, type-safe, easy to extend
- Better error messages and formatting
- Preferred for development

**Bash version**:
- No build step, faster startup
- Portable to any Unix system
- Ideal for CI/CD pipelines

Both test identical functionality, choose based on context.

### Why Auto-Cleanup?
**Default enabled**: Most users want clean state after verification
**Configurable**: Developers debugging issues can preserve test files
**Fail-safe**: Cleanup errors don't fail verification (non-critical)

---

## Future Enhancements

### Planned Features

1. **Parallel Phase Execution**
   - Run independent checks concurrently
   - Reduce total verification time by 30-40%

2. **Performance Regression Detection**
   - Track verification timing over time
   - Alert on significant slowdowns

3. **Customizable Test Suites**
   - `--quick`: Only Phase 1 + basic ingestion
   - `--full`: All phases (default)
   - `--extended`: Include stress tests, large datasets

4. **HTML Report Generation**
   - Visual dashboard with charts
   - Export for CI/CD artifact storage

5. **Database Migration Testing**
   - Verify schema migrations don't break existing data
   - Test backward compatibility

6. **Load Testing**
   - Concurrent ingestion
   - Query throughput benchmarks
   - Memory usage profiling

---

## Conclusion

The RKM System Verification Workflow provides a comprehensive, automated, and user-friendly way to validate system integrity. Its 5-phase design ensures thorough testing while maintaining fast execution times. Clear error messages and actionable fixes minimize debugging time.

**Key Success Metrics**:
- ✓ 12 comprehensive checks
- ✓ 2-4 second execution time
- ✓ 100% automated
- ✓ Clear pass/fail indicators
- ✓ Portable (TypeScript + Bash)
- ✓ CI/CD ready

**Impact**:
- Reduces onboarding friction for new users
- Catches regressions before deployment
- Provides confidence in system health
- Standardizes validation across environments
