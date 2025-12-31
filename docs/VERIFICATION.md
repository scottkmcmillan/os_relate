# RKM System Verification Workflow

## Overview

The RKM System Verification Workflow is a comprehensive automated testing suite designed to verify that all components of the Research Knowledge Manager are functioning correctly. It provides clear pass/fail indicators and detailed error messages to help users quickly identify and resolve issues.

## Quick Start

### Run Full Verification (TypeScript)
```bash
npm run verify
```

### Run Quick Verification (Bash)
```bash
npm run verify:quick
# OR
bash scripts/verify-system.sh
```

### Run with Verbose Output
```bash
npx tsx scripts/verify-system.ts --verbose
```

## What Gets Verified

The verification workflow runs through **5 comprehensive phases**:

### Phase 1: Pre-flight Checks

1. **Node.js Version**
   - Verifies Node.js v18.x or higher is installed
   - Displays current version
   - **Why it matters**: RKM requires modern Node.js features

2. **Dependencies Installed**
   - Checks for `node_modules/` directory
   - Verifies critical packages: `ruvector`, `commander`, `better-sqlite3`, `@modelcontextprotocol/sdk`
   - **Fix**: Run `npm install` if failing

3. **Build Exists**
   - Verifies `dist/` directory exists
   - Checks for `dist/cli.js` entry point
   - Counts built JavaScript files
   - **Fix**: Run `npm run build` if failing

4. **System Capabilities**
   - Queries RuVector implementation type (native/WASM)
   - Checks availability of GNN, Attention, and SONA modules
   - **Why it matters**: Confirms advanced features are accessible

### Phase 2: Test Environment Setup

5. **Test Environment Creation**
   - Creates temporary test database (`test-verification.db`)
   - Creates temporary data directory (`test-verification-data/`)
   - Generates 3 sample markdown documents with tags
   - **Auto-cleanup**: Test files are removed after verification

### Phase 3: Ingestion & Query Verification

6. **Document Ingestion**
   - Ingests sample documents into vector and graph stores
   - Verifies document count matches expected (3 documents)
   - Tests tag attachment functionality
   - **Validates**: Core ingestion pipeline, vector embedding, graph construction

7. **Vector Query**
   - Executes semantic search query: "machine learning"
   - Verifies results are returned
   - Checks result format and scoring
   - **Validates**: HNSW vector search, embedding generation

8. **Hybrid Search**
   - Runs hybrid search: "neural networks"
   - Tests JSON output format
   - Verifies combined vector + graph scoring
   - **Validates**: Unified memory interface, score fusion

9. **Graph Query**
   - Executes Cypher query: `MATCH (n:Document) RETURN n`
   - Checks for node and edge results
   - Validates JSON output structure
   - **Validates**: Graph database, Cypher query engine

### Phase 4: Advanced Features

10. **Full Status Report**
    - Runs `status --full --json` command
    - Retrieves vector store statistics (total vectors, tier distribution)
    - Retrieves graph statistics (nodes, edges, types)
    - Checks cognitive capabilities (SONA, GNN availability)
    - **Validates**: Metrics collection, system introspection

11. **Semantic Router**
    - Tests query intent classification
    - Analyzes routing confidence
    - Verifies execution strategy recommendations
    - **Validates**: Tiny Dancer integration, query routing logic

### Phase 5: Cleanup

12. **Test File Cleanup**
    - Removes test database file
    - Removes test data directory
    - Confirms no residual test data
    - **Can be disabled**: Set `cleanupAfterTest: false` in script config

## Verification Output

### Success Example
```
╔═══════════════════════════════════════════════════════════════════════════╗
║     Research Knowledge Manager - System Verification Workflow            ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 PHASE 1: PRE-FLIGHT CHECKS
================================================================================
Node.js Version
================================================================================
✓ Node.js version is compatible: v22.0.0 (120ms)
  Details: Minimum required: v18.x

[... more checks ...]

================================================================================
VERIFICATION SUMMARY
================================================================================

Total checks: 12
Passed: 12
Pass rate: 100.0%
Total time: 4523ms

🎉 All verification checks passed! System is ready.
```

### Failure Example
```
================================================================================
Dependencies Installed
================================================================================
✗ Some critical packages are missing (15ms)
  Details: Missing: ruvector, commander. Run: npm install

[... summary ...]

⚠️  Some checks failed. Please review the errors above.
```

## Usage Metrics Display

The verification workflow also displays key usage metrics:

### From Status Command
```json
{
  "stats": {
    "vector": {
      "totalVectors": 3,
      "tierCounts": {
        "hot": 3,
        "warm": 0,
        "cold": 0
      },
      "storage": {
        "sizeBytes": 4608,
        "path": "./test-verification.db"
      }
    },
    "graph": {
      "nodeCount": 3,
      "edgeCount": 0,
      "nodeTypes": {
        "Document": 3
      }
    },
    "cognitive": {
      "trajectoriesRecorded": 0,
      "patternsLearned": 0,
      "microLoraUpdates": 0,
      "baseLoraUpdates": 0,
      "ewcConsolidations": 0
    }
  }
}
```

### Metrics Tracked
- **Total documents ingested**: Vector store `totalVectors`
- **Total queries executed**: (Trackable via SONA trajectories)
- **Vector store size**: Storage `sizeBytes` converted to KB/MB
- **Graph node/edge counts**: From graph statistics
- **Tier distribution**: Hot/Warm/Cold data classification
- **Learning progress**: SONA trajectories, patterns, LoRA updates

## Troubleshooting

### Common Issues

#### "Build not found"
**Solution**: Run `npm run build` before verification

#### "Dependencies missing"
**Solution**: Run `npm install` to install all dependencies

#### "Node.js version too old"
**Solution**: Upgrade to Node.js v18.x or higher using `nvm` or your package manager

#### "Ingestion failed"
**Possible causes**:
- Embedding service unavailable
- Database permission issues
- Memory constraints
**Solution**: Check logs for specific error, ensure write permissions on test directory

#### "Query returned no results"
**Possible causes**:
- Ingestion failed (check previous test)
- Embedding dimension mismatch
- Database corruption
**Solution**: Delete test database and re-run verification

#### "SONA/GNN not available"
**This is often normal**:
- SONA/GNN require native RuVector builds
- WASM fallback doesn't support all features
- System still functional without these features
**Solution**: Verify with `node dist/cli.js status` to see which implementation is active

### Debugging Options

#### Verbose Mode
```bash
npx tsx scripts/verify-system.ts --verbose
```
Shows additional details for all checks, even passing ones.

#### Preserve Test Files
Edit `scripts/verify-system.ts`:
```typescript
const TEST_CONFIG = {
  // ...
  cleanupAfterTest: false  // Keep test files for inspection
};
```

#### Manual Testing
Run individual CLI commands to debug specific features:
```bash
# Check status
node dist/cli.js status --full

# Test ingestion manually
node dist/cli.js ingest --path ./docs

# Test query manually
node dist/cli.js query "your search query" -k 5
```

## CI/CD Integration

### GitHub Actions Example
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
- `0`: All checks passed
- `1`: One or more checks failed

## Customization

### Adding Custom Checks

Edit `/workspaces/ranger/scripts/verify-system.ts`:

```typescript
async function checkCustomFeature(): Promise<CheckResult> {
  try {
    // Your custom verification logic here
    const output = execSync('node dist/cli.js your-command', {
      encoding: 'utf8',
      timeout: 10000
    });

    const success = output.includes('expected-output');

    return {
      passed: success,
      message: success ? 'Custom feature works' : 'Custom feature failed',
      details: 'Additional context here'
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Custom feature threw error',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Add to main():
await runner.runCheck('Custom Feature', checkCustomFeature);
```

### Modifying Sample Documents

Edit the `TEST_CONFIG.sampleDocs` array in the script to use different test data.

## Performance Benchmarks

Typical verification times on modern hardware:

| Phase | Duration | Notes |
|-------|----------|-------|
| Pre-flight | 100-300ms | Mostly file system checks |
| Test Setup | 50-100ms | Creates files and directories |
| Ingestion | 500-1500ms | Includes embedding generation |
| Query Tests | 200-800ms | 3-4 queries with scoring |
| Advanced Features | 300-600ms | Status + router tests |
| Cleanup | 20-50ms | File deletion |
| **Total** | **2-4 seconds** | Depends on system speed |

## Support

If verification consistently fails:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review build logs: `npm run build 2>&1 | tee build.log`
3. Check system logs for RuVector errors
4. Open an issue with verification output and system info:
   ```bash
   npm run verify 2>&1 | tee verification.log
   node --version
   uname -a
   ```

## Architecture Notes

### Why Two Scripts?

1. **TypeScript Version** (`verify-system.ts`):
   - More maintainable and type-safe
   - Better error handling and formatting
   - Easier to extend with new checks
   - **Preferred for development**

2. **Bash Version** (`verify-system.sh`):
   - No build step required
   - Faster execution (no TypeScript compilation)
   - Portable to any Unix-like system
   - **Preferred for CI/CD and quick checks**

Both scripts test the same functionality and should produce identical results.

## License

Same as parent project (Research Knowledge Manager)
