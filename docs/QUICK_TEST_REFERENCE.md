# RKM Quick Test Reference Card

Fast reference for testing your RKM installation. For detailed scenarios, see [TEST_SCENARIOS.md](./TEST_SCENARIOS.md).

## Quick Start (30 seconds)

```bash
# Build project
npm install && npm run build

# Create test file
mkdir -p /tmp/rkm-test
echo -e "# Test\nVector embeddings and knowledge graphs test." > /tmp/rkm-test/test.md

# Ingest
node dist/cli.js ingest --path /tmp/rkm-test/test.md --db ./test.db

# Search
node dist/cli.js search "vector embeddings" --db ./test.db -k 3

# Status
node dist/cli.js status --db ./test.db --full
```

✅ **Success**: Search returns results, status shows 1+ vectors

---

## Essential Commands Cheat Sheet

### Ingestion

```bash
# Single file
node dist/cli.js ingest --path FILE.md --db DB.db

# Directory (recursive)
node dist/cli.js ingest --path /path/to/docs/ --db DB.db

# With tags
node dist/cli.js ingest --path FILE.md --db DB.db --tag research --tag ai

# Legacy mode (vector-only, no graph)
node dist/cli.js ingest --path FILE.md --db DB.db --legacy
```

**Expected**: `Ingestion complete: Documents: X`

### Search

```bash
# Basic search
node dist/cli.js search "query text" --db DB.db

# Limit results
node dist/cli.js search "query" --db DB.db -k 5

# JSON output
node dist/cli.js search "query" --db DB.db --format json

# Markdown output
node dist/cli.js search "query" --db DB.db --format markdown

# With graph relationships
node dist/cli.js search "query" --db DB.db --include-related
```

**Expected**: List of results with scores (0-1), higher = better match

### Status

```bash
# Basic capabilities
node dist/cli.js status

# Full statistics
node dist/cli.js status --db DB.db --full

# JSON format
node dist/cli.js status --db DB.db --full --json

# Test router
node dist/cli.js status --router
```

**Expected**: Shows implementation type, module availability, document count

### Context Export

```bash
# Generate Claude context
node dist/cli.js context "topic" --db DB.db

# Custom parameters
node dist/cli.js context "topic" --db DB.db -k 10 --max-chars 15000 --title "Context"
```

**Expected**: Fenced code block ready to paste into Claude prompts

### Route Analysis

```bash
# Basic routing
node dist/cli.js route "find documents about AI"

# Verbose analysis
node dist/cli.js route "find papers and citations" --verbose
```

**Expected**: Route type (vector/graph/hybrid/context), confidence %, reasoning

### Graph Queries

```bash
# List all documents
node dist/cli.js graph "MATCH (n:Document) RETURN n" --db DB.db

# JSON output
node dist/cli.js graph "MATCH (n) RETURN n" --db DB.db --format json
```

**Expected**: Nodes and edges from graph store

---

## Quick Verification Checklist

Run these commands in order. All should succeed (exit code 0).

```bash
# ✓ 1. Build works
npm run build

# ✓ 2. Help displays
node dist/cli.js --help

# ✓ 3. Version shows
node dist/cli.js --version

# ✓ 4. Status runs
node dist/cli.js status

# ✓ 5. Create test data
mkdir -p /tmp/rkm-test && echo "# Test\nSample content for testing." > /tmp/rkm-test/test.md

# ✓ 6. Ingestion works
node dist/cli.js ingest --path /tmp/rkm-test/test.md --db ./test.db

# ✓ 7. Search works
node dist/cli.js search "testing" --db ./test.db -k 1

# ✓ 8. Status shows data
node dist/cli.js status --db ./test.db --full | grep "Total vectors: 1"

# ✓ 9. Context export works
node dist/cli.js context "test" --db ./test.db

# ✓ 10. Routing works
node dist/cli.js route "find documents"

# ✓ 11. Graph query works
node dist/cli.js graph "MATCH (n:Document) RETURN n" --db ./test.db

# ✓ Cleanup
rm -f ./test.db && rm -rf /tmp/rkm-test
```

---

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| `command not found` | Run `npm run build` |
| `No results found` | Check DB has documents: `status --full` |
| `No ingestible documents` | Verify file extension: `.md`, `.txt`, `.json`, `.jsonl` |
| `Database locked` | Close other processes using the DB |
| `Permission denied` | Check write permissions in current directory |
| `Invalid JSON output` | Separate stderr: `command 2>/dev/null` |
| `Module "Not Available"` | Normal on some platforms, not an error |
| `ENOENT: no such file` | Check file path exists |

---

## Output Format Examples

### Successful Ingestion
```
Reading files...
Found 3 files
Parsing documents...
Building knowledge graph...
Graph: 12 nodes, 8 edges
Adding documents to memory...

Ingestion complete:
  Documents: 3
  Graph edges: 8
  Storage: ./ruvector.db
```

### Successful Search
```
Search: "machine learning"
Results: 2

1. Introduction to ML
   source: /path/to/doc.md
   score: 0.8532 (vector: 0.8124, graph: 0.8940)
   Machine learning is a subset of AI...

2. Neural Networks
   source: /path/to/nn.md
   score: 0.7891 (vector: 0.7654, graph: 0.8128)
   Neural networks are computational models...
```

### Successful Status
```
=== RuVector Capabilities ===

Implementation: native
  Native: Yes
  WASM: No
  Version: 0.1.19

Modules:
  GNN (Graph Neural Network): Available
  Attention: Available
  SONA (Self-Optimizing): Available

=== Memory Statistics ===

Vector Store:
  Total vectors: 42
  Tiers: Hot=15, Warm=20, Cold=7
  Dimensions: 384
  Storage: ./ruvector.db

Graph Store:
  Nodes: 42
  Edges: 87
```

### Successful Route
```
Query: "find papers about AI and their citations"

Route: hybrid
Confidence: 87.5%
Reasoning: Query combines search intent ("find papers") with graph traversal ("citations")
```

---

## Expected Exit Codes

- **0**: Success
- **1**: Error (with descriptive message)
- **Non-zero**: Check error message in stderr

---

## Performance Benchmarks

Typical performance on modern hardware:

| Operation | Small Dataset (10 docs) | Medium Dataset (100 docs) | Large Dataset (1000 docs) |
|-----------|------------------------|---------------------------|---------------------------|
| Ingestion | 2-5s | 15-30s | 2-5min |
| Search | <100ms | <200ms | <500ms |
| Status | <50ms | <100ms | <300ms |
| Graph Query | <100ms | <300ms | <1s |

**Note**: First run includes model download/initialization (adds 5-10s)

---

## Testing with Real Data

### Small Test (5 documents)
```bash
# Prepare
mkdir -p /tmp/rkm-real-test && cd /tmp/rkm-real-test
for i in {1..5}; do
  echo -e "# Document $i\nContent about topic $i with keywords: AI, ML, data." > "doc$i.md"
done

# Ingest
node /workspaces/ranger/dist/cli.js ingest --path . --db ./real-test.db

# Verify
node /workspaces/ranger/dist/cli.js status --db ./real-test.db --full
node /workspaces/ranger/dist/cli.js search "AI and ML" --db ./real-test.db -k 3
```

### Medium Test (50 documents)
Use existing documentation or research papers:
```bash
# Example: Ingest project docs
node dist/cli.js ingest --path ./docs --db ./docs.db --tag documentation

# Search your docs
node dist/cli.js search "testing and verification" --db ./docs.db -k 5
```

---

## Automated Test Suite

Run comprehensive automated tests:

```bash
# All tests
npm test

# CLI-specific tests
npm test -- tests/cli/cli.test.ts

# With coverage report
npm run test:coverage

# User-facing test runner
npx tsx tests/cli/userTest.ts

# Verbose output
npx tsx tests/cli/userTest.ts --verbose
```

**Expected**: 90+ tests passing

---

## JSON Output Validation

Validate JSON outputs using `jq`:

```bash
# Status JSON
node dist/cli.js status --full --json | jq '.'

# Search JSON
node dist/cli.js search "test" --db ./test.db --format json | jq '.results | length'

# Graph JSON
node dist/cli.js graph "MATCH (n) RETURN n" --db ./test.db --format json | jq '.nodes | length'
```

**Expected**: Valid JSON structure, no parsing errors

---

## Minimal Working Example

Copy-paste this complete test:

```bash
#!/bin/bash
set -e

# Setup
npm install && npm run build
mkdir -p /tmp/rkm-minimal
echo "# Test Document" > /tmp/rkm-minimal/test.md
echo "This tests vector search functionality." >> /tmp/rkm-minimal/test.md

# Ingest
node dist/cli.js ingest --path /tmp/rkm-minimal/test.md --db ./minimal.db

# Search
RESULT=$(node dist/cli.js search "vector search" --db ./minimal.db -k 1)

# Verify
if echo "$RESULT" | grep -q "Test Document"; then
    echo "✅ RKM is working correctly!"
    rm -f ./minimal.db
    rm -rf /tmp/rkm-minimal
    exit 0
else
    echo "❌ Test failed"
    exit 1
fi
```

---

## Next Steps After Successful Tests

1. **Integrate with Claude-Flow**: Register MCP server
   ```bash
   claude mcp add ruvector-memory "cmd" "/c" "node dist/mcp/server.js"
   ```

2. **Ingest your research**: Replace test data with real documents

3. **Explore advanced features**: GNN reranking, SONA learning, graph queries

4. **Production deployment**: Configure persistent storage, backups

---

## Quick Reference Links

- **Full Test Scenarios**: [TEST_SCENARIOS.md](./TEST_SCENARIOS.md)
- **User Test Guide**: [USER_TEST_GUIDE.md](./USER_TEST_GUIDE.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **README**: [../README.md](../README.md)

---

**Last Updated**: 2024-12-23
**RKM Version**: 0.3.0
