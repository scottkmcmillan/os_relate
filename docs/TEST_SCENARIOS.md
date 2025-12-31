# RKM Test Scenarios - Practical Verification Guide

This guide provides hands-on test scenarios you can run to verify your Research Knowledge Manager (RKM) installation works correctly.

## Prerequisites

Before running these tests, ensure:

1. **Dependencies installed**: `npm install`
2. **Project built**: `npm run build`
3. **Node.js 18+** installed
4. Clean test environment (no existing `test.db`)

---

## Test Scenario 1: Basic Ingestion Test

### Purpose
Verify that RKM can ingest markdown files and create a searchable database.

### Steps

1. **Create a test document**:
   ```bash
   mkdir -p /tmp/rkm-test
   cat > /tmp/rkm-test/test-doc.md << 'EOF'
   # Test Document for RKM

   This document tests the ingestion pipeline with known content.

   ## Key Topics
   - Vector embeddings
   - Knowledge graphs
   - Semantic search

   The RKM system should be able to find this content when searching for "vector embeddings" or "knowledge graphs".
   EOF
   ```

2. **Ingest the document**:
   ```bash
   node dist/cli.js ingest --path /tmp/rkm-test/test-doc.md --db ./test.db --tag test
   ```

3. **Expected Output**:
   ```
   Reading files...
   Found 1 files
   Parsing documents...
   Building knowledge graph...
   Graph: X nodes, Y edges
   Adding documents to memory...
   Adding relationships...

   Ingestion complete:
     Documents: 1
     Graph edges: Y
     Storage: ./test.db
   ```

4. **Success Indicators**:
   - Exit code: 0
   - Message shows "Ingested 1 documents" or "Documents: 1"
   - File `test.db` created in current directory
   - No error messages in output

5. **Common Failures**:
   - **"No ingestible documents found"**: Check file path and extension
   - **"ENOENT" error**: Verify the file exists at specified path
   - **Permission errors**: Ensure write access to current directory

---

## Test Scenario 2: Search Test

### Purpose
Verify semantic search returns relevant results from ingested documents.

### Steps

1. **Prerequisites**: Complete Test Scenario 1 first

2. **Run basic search**:
   ```bash
   node dist/cli.js search "vector embeddings" --db ./test.db -k 3
   ```

3. **Expected Output**:
   ```
   Search: "vector embeddings"
   Results: 1

   1. Test Document for RKM
      source: /tmp/rkm-test/test-doc.md
      score: 0.XXXX
      This document tests the ingestion pipeline with known content...
   ```

4. **Success Indicators**:
   - Exit code: 0
   - At least 1 result returned
   - Result contains content from test document
   - Score is a number between 0 and 1
   - Source path matches ingested file

5. **Verify with different queries**:
   ```bash
   # Should find the document
   node dist/cli.js search "knowledge graphs" --db ./test.db -k 3

   # Should find the document
   node dist/cli.js search "semantic search" --db ./test.db -k 3

   # Should return no results or low scores
   node dist/cli.js search "quantum physics" --db ./test.db -k 3
   ```

6. **Common Failures**:
   - **"No results found"**: Database might be empty, check ingestion
   - **Missing database error**: Verify `test.db` exists
   - **Connection errors**: Check file permissions

---

## Test Scenario 3: Status Test

### Purpose
Verify system capabilities and database statistics are reported correctly.

### Steps

1. **Check basic status**:
   ```bash
   node dist/cli.js status --db ./test.db
   ```

2. **Expected Output**:
   ```
   === RuVector Capabilities ===

   Implementation: [native|wasm]
     Native: [Yes|No]
     WASM: [Yes|No]
     Version: X.X.X

   Modules:
     GNN (Graph Neural Network): [Available|Not Available]
     Attention: [Available|Not Available]
     SONA (Self-Optimizing): [Available|Not Available]
   ```

3. **Check full statistics**:
   ```bash
   node dist/cli.js status --db ./test.db --full
   ```

4. **Expected Output (additional sections)**:
   ```
   === Memory Statistics ===

   Vector Store:
     Total vectors: 1
     Tiers: Hot=1, Warm=0, Cold=0
     Dimensions: 384
     Storage: ./test.db

   Graph Store:
     Nodes: X
     Edges: Y

   === Cognitive Features ===

   Cognitive engine: [Enabled|Disabled]
   ```

5. **Success Indicators**:
   - Exit code: 0
   - Shows implementation type (native or WASM)
   - Module availability clearly indicated
   - With `--full`: Shows document count matching ingested documents
   - Vector store shows at least 1 vector after ingestion

6. **JSON format test**:
   ```bash
   node dist/cli.js status --db ./test.db --full --json
   ```

   Verify output is valid JSON:
   ```bash
   node dist/cli.js status --db ./test.db --full --json | jq '.'
   ```

7. **Common Failures**:
   - **Empty statistics**: Database not initialized, run ingestion first
   - **Module "Not Available"**: Expected on some platforms, not an error
   - **Invalid JSON**: Check for extra output or errors mixed with JSON

---

## Test Scenario 4: Context Export Test

### Purpose
Verify Claude-Flow context block generation for AI prompts.

### Steps

1. **Prerequisites**: Complete Test Scenario 1 first

2. **Generate context block**:
   ```bash
   node dist/cli.js context "vector embeddings and knowledge graphs" --db ./test.db -k 3 --title "RKM Test Context"
   ```

3. **Expected Output**:
   ````
   ```text
   RKM Test Context (generated from RuVector)
   query: vector embeddings and knowledge graphs
   db: ./test.db

   ---
   result: 1/1
   title: Test Document for RKM
   source: /tmp/rkm-test/test-doc.md
   distance: 0.XXXX

   # Test Document for RKM

   This document tests the ingestion pipeline with known content...
   ```
   ````

4. **Success Indicators**:
   - Exit code: 0
   - Output is wrapped in triple backticks with `text` marker
   - Contains query, db path, and result metadata
   - Shows document title, source, and content
   - Format is ready to copy-paste into Claude prompts

5. **Test character limit**:
   ```bash
   node dist/cli.js context "test" --db ./test.db --max-chars 500
   ```

   Output should be truncated if content exceeds limit.

6. **Common Failures**:
   - **"No results found"**: Query doesn't match document content
   - **Empty context**: Database might be empty
   - **Format issues**: Check for extra output mixed with context block

---

## Test Scenario 5: Route Test

### Purpose
Verify semantic routing correctly classifies query intent.

### Steps

1. **Test vector search route**:
   ```bash
   node dist/cli.js route "find documents about machine learning"
   ```

2. **Expected Output**:
   ```
   Query: "find documents about machine learning"

   Route: vector
   Confidence: XX.X%
   Reasoning: Query contains search intent keywords...
   ```

3. **Test graph route**:
   ```bash
   node dist/cli.js route "show me all documents that cite document X"
   ```

4. **Expected Output**:
   ```
   Query: "show me all documents that cite document X"

   Route: graph
   Confidence: XX.X%
   Reasoning: Query contains graph relationship keywords...
   ```

5. **Test verbose mode**:
   ```bash
   node dist/cli.js route "find related papers and their citations" --verbose
   ```

6. **Expected Output (verbose)**:
   ```
   Query: "find related papers and their citations"

   Route: hybrid
   Confidence: XX.X%
   Reasoning: Query contains both search and graph intent...

   Intent Analysis:
     Primary: search
     Secondary: graph
     Complexity: X.XX
     Multi-stage: true

   Execution Strategy:
     Approach: [parallel|sequential|hybrid]
     Steps: X
       1. [vector] Find documents matching "related papers"
       2. [graph] Traverse citation relationships
     Complexity: [low|medium|high]
   ```

7. **Success Indicators**:
   - Exit code: 0
   - Route is one of: `vector`, `graph`, `hybrid`, `context`
   - Confidence is a percentage (0-100%)
   - Reasoning provides explanation
   - Verbose mode shows intent analysis and execution strategy

8. **Test various query types**:
   ```bash
   # Should route to 'vector'
   node dist/cli.js route "find documents about neural networks"

   # Should route to 'graph'
   node dist/cli.js route "MATCH (n:Document) RETURN n"

   # Should route to 'context'
   node dist/cli.js route "give me background on topic X"

   # Should route to 'hybrid'
   node dist/cli.js route "find papers about AI and their citations"
   ```

9. **Common Failures**:
   - **Low confidence**: Normal for ambiguous queries
   - **Unexpected route**: Not necessarily wrong, depends on keywords
   - **Missing verbose output**: Check `--verbose` flag is included

---

## Test Scenario 6: Graph Query Test

### Purpose
Verify Cypher-like graph queries work correctly.

### Steps

1. **Prerequisites**: Complete Test Scenario 1 first

2. **Query all documents**:
   ```bash
   node dist/cli.js graph "MATCH (n:Document) RETURN n" --db ./test.db
   ```

3. **Expected Output**:
   ```
   Query: MATCH (n:Document) RETURN n

   Nodes: 1
   Edges: 0

   Nodes:
     [Document] /tmp/rkm-test/test-doc.md
       title: Test Document for RKM
   ```

4. **Query with JSON format**:
   ```bash
   node dist/cli.js graph "MATCH (n:Document) RETURN n" --db ./test.db --format json
   ```

5. **Expected Output (JSON)**:
   ```json
   {
     "nodes": [
       {
         "id": "/tmp/rkm-test/test-doc.md",
         "type": "Document",
         "properties": {
           "title": "Test Document for RKM",
           ...
         }
       }
     ],
     "edges": []
   }
   ```

6. **Success Indicators**:
   - Exit code: 0
   - Shows count of nodes and edges
   - Lists nodes with type and properties
   - JSON format outputs valid JSON
   - Node count matches ingested documents

7. **Common Failures**:
   - **"Query error"**: Check Cypher syntax
   - **No nodes found**: Database might be empty or query too specific
   - **Invalid JSON**: Check for errors mixed with output

---

## Test Scenario 7: Multi-File Ingestion Test

### Purpose
Verify batch ingestion of multiple files and formats.

### Steps

1. **Create test directory with multiple files**:
   ```bash
   mkdir -p /tmp/rkm-multi-test

   # Create markdown file
   cat > /tmp/rkm-multi-test/doc1.md << 'EOF'
   # Machine Learning Document
   This document discusses machine learning algorithms.
   EOF

   # Create text file
   cat > /tmp/rkm-multi-test/doc2.txt << 'EOF'
   Neural Networks Research
   This is research on neural network architectures.
   EOF

   # Create JSON file
   cat > /tmp/rkm-multi-test/doc3.json << 'EOF'
   {
     "title": "Knowledge Graphs",
     "content": "This document covers knowledge graph fundamentals."
   }
   EOF
   ```

2. **Ingest entire directory**:
   ```bash
   node dist/cli.js ingest --path /tmp/rkm-multi-test --db ./test-multi.db --tag batch-test
   ```

3. **Expected Output**:
   ```
   Reading files...
   Found 3 files
   Parsing documents...
   Building knowledge graph...
   Graph: X nodes, Y edges
   Adding documents to memory...

   Ingestion complete:
     Documents: 3
     Graph edges: Y
     Storage: ./test-multi.db
   ```

4. **Verify all documents searchable**:
   ```bash
   # Should find doc1.md
   node dist/cli.js search "machine learning algorithms" --db ./test-multi.db -k 1

   # Should find doc2.txt
   node dist/cli.js search "neural network architectures" --db ./test-multi.db -k 1

   # Should find doc3.json
   node dist/cli.js search "knowledge graph fundamentals" --db ./test-multi.db -k 1
   ```

5. **Check statistics**:
   ```bash
   node dist/cli.js status --db ./test-multi.db --full
   ```

   Should show 3 vectors in vector store.

6. **Success Indicators**:
   - All 3 files ingested successfully
   - Each document is searchable with its unique content
   - Status shows correct document count
   - Different file formats (.md, .txt, .json) all processed

7. **Common Failures**:
   - **Fewer documents than expected**: Check file extensions are supported
   - **JSON parsing errors**: Verify JSON is valid
   - **Some documents not searchable**: Check ingestion logs for errors

---

## Test Scenario 8: Search Output Formats Test

### Purpose
Verify different output formats (text, JSON, markdown) work correctly.

### Steps

1. **Prerequisites**: Complete Test Scenario 1 first

2. **Test default text format**:
   ```bash
   node dist/cli.js search "vector embeddings" --db ./test.db -k 2
   ```

   Should output human-readable text.

3. **Test JSON format**:
   ```bash
   node dist/cli.js search "vector embeddings" --db ./test.db -k 2 --format json
   ```

4. **Expected JSON Output**:
   ```json
   {
     "query": "vector embeddings",
     "results": [
       {
         "id": "...",
         "title": "Test Document for RKM",
         "text": "...",
         "source": "/tmp/rkm-test/test-doc.md",
         "combinedScore": 0.XXXX,
         "vectorScore": 0.XXXX
       }
     ]
   }
   ```

5. **Test markdown format**:
   ```bash
   node dist/cli.js search "vector embeddings" --db ./test.db -k 2 --format markdown
   ```

6. **Expected Markdown Output**:
   ````markdown
   # Search Results

   **Query**: vector embeddings

   ## 1. Test Document for RKM
   **Source**: /tmp/rkm-test/test-doc.md
   **Score**: 0.XXXX

   This document tests the ingestion pipeline...
   ````

7. **Validate JSON format**:
   ```bash
   node dist/cli.js search "vector" --db ./test.db --format json | jq '.results | length'
   ```

   Should output a number without errors.

8. **Success Indicators**:
   - Each format produces valid output in expected structure
   - JSON format is valid and parseable
   - Markdown format uses proper markdown syntax
   - All formats contain same data, just different presentation

9. **Common Failures**:
   - **Invalid JSON**: Check for extra output or errors mixed in
   - **Malformed markdown**: Verify backticks and headers are correct

---

## Test Scenario 9: Legacy Mode Compatibility Test

### Purpose
Verify backward compatibility with legacy ingestion/search pipeline.

### Steps

1. **Ingest using legacy mode**:
   ```bash
   node dist/cli.js ingest --path /tmp/rkm-test/test-doc.md --db ./test-legacy.db --legacy
   ```

2. **Expected Output**:
   ```
   Ingested 1 documents into ./test-legacy.db (legacy mode)
   ```

3. **Query using legacy mode**:
   ```bash
   node dist/cli.js query "vector embeddings" --db ./test-legacy.db -k 3 --legacy
   ```

4. **Expected Output**:
   ```
   Test Document for RKM
   source: /tmp/rkm-test/test-doc.md
   distance: 0.XXXX
   This document tests the ingestion pipeline...
   ```

5. **Success Indicators**:
   - Legacy ingestion completes successfully
   - Legacy query returns results
   - Output format is simpler than non-legacy mode
   - No graph-related output (legacy is vector-only)

6. **Compare with modern mode**:
   ```bash
   # Modern mode (default)
   node dist/cli.js ingest --path /tmp/rkm-test/test-doc.md --db ./test-modern.db
   node dist/cli.js query "vector" --db ./test-modern.db -k 1

   # Legacy mode
   node dist/cli.js query "vector" --db ./test-legacy.db -k 1 --legacy
   ```

   Modern mode should show graph scores, legacy mode only vector scores.

---

## Test Scenario 10: Error Handling Test

### Purpose
Verify graceful error handling for common failure scenarios.

### Steps

1. **Test missing file**:
   ```bash
   node dist/cli.js ingest --path /nonexistent/path.md --db ./test.db 2>&1
   ```

   Should show error message without crashing.

2. **Test invalid database path**:
   ```bash
   node dist/cli.js search "test" --db /root/forbidden.db 2>&1
   ```

   Should show permission error gracefully.

3. **Test invalid command**:
   ```bash
   node dist/cli.js invalidcommand 2>&1
   ```

   Should show help message with available commands.

4. **Test malformed options**:
   ```bash
   node dist/cli.js search "test" -k notanumber --db ./test.db 2>&1
   ```

   Should show error about invalid number.

5. **Test empty database search**:
   ```bash
   rm -f ./empty.db
   node dist/cli.js search "test" --db ./empty.db 2>&1
   ```

   Should show "No results found" or similar message.

6. **Success Indicators**:
   - All errors produce clear, helpful messages
   - Exit codes are non-zero for errors
   - No stack traces in normal error cases
   - Application doesn't crash or hang

---

## Complete Integration Test Workflow

Run all scenarios in sequence to fully verify installation:

```bash
#!/bin/bash
set -e

echo "=== RKM Integration Test Suite ==="
echo

# Clean environment
rm -f ./test.db ./test-multi.db ./test-legacy.db ./test-modern.db

# Scenario 1: Basic Ingestion
echo "Test 1: Basic Ingestion"
mkdir -p /tmp/rkm-test
cat > /tmp/rkm-test/test-doc.md << 'EOF'
# Test Document
This tests vector embeddings and knowledge graphs.
EOF
node dist/cli.js ingest --path /tmp/rkm-test/test-doc.md --db ./test.db
echo "✓ Passed"
echo

# Scenario 2: Search
echo "Test 2: Search"
node dist/cli.js search "vector embeddings" --db ./test.db -k 3 | grep -q "Test Document"
echo "✓ Passed"
echo

# Scenario 3: Status
echo "Test 3: Status"
node dist/cli.js status --db ./test.db --full | grep -q "Total vectors: 1"
echo "✓ Passed"
echo

# Scenario 4: Context Export
echo "Test 4: Context Export"
node dist/cli.js context "vector" --db ./test.db | grep -q "RuVector Context"
echo "✓ Passed"
echo

# Scenario 5: Route
echo "Test 5: Route"
node dist/cli.js route "find documents about AI" | grep -q "Route: vector"
echo "✓ Passed"
echo

# Scenario 6: Graph Query
echo "Test 6: Graph Query"
node dist/cli.js graph "MATCH (n:Document) RETURN n" --db ./test.db | grep -q "Nodes:"
echo "✓ Passed"
echo

echo "=== All Tests Passed ==="
echo
echo "Cleanup:"
echo "  rm -f ./test.db ./test-multi.db ./test-legacy.db"
echo "  rm -rf /tmp/rkm-test /tmp/rkm-multi-test"
```

Save as `tests/integration-test.sh`, then run:

```bash
chmod +x tests/integration-test.sh
bash tests/integration-test.sh
```

---

## Automated Test Runner

For automated verification, use the existing test infrastructure:

```bash
# Run all CLI tests
npm test -- tests/cli/cli.test.ts

# Run with coverage
npm run test:coverage

# Run specific test suites
npm test -- tests/cli/cli.test.ts -t "status"
npm test -- tests/cli/cli.test.ts -t "ingest"
npm test -- tests/cli/cli.test.ts -t "search"
```

---

## Troubleshooting Guide

### General Issues

**Problem**: Command not found
- **Solution**: Run `npm run build` to compile TypeScript to JavaScript

**Problem**: Permission denied
- **Solution**: Check write permissions in current directory

**Problem**: Database locked
- **Solution**: Ensure no other processes are using the database file

### Ingestion Issues

**Problem**: "No ingestible documents found"
- **Cause**: File extension not supported or path incorrect
- **Solution**: Verify file exists and has extension: `.md`, `.txt`, `.json`, or `.jsonl`

**Problem**: JSON parsing error
- **Cause**: Invalid JSON syntax in `.json` file
- **Solution**: Validate JSON with `jq` or JSON validator

**Problem**: Slow ingestion
- **Cause**: Large files or many documents
- **Expected**: Normal behavior, embedding generation takes time

### Search Issues

**Problem**: No results found
- **Cause**: Query doesn't match document content or database empty
- **Solution**: Try broader queries, check database has documents with `status --full`

**Problem**: Unexpected results
- **Cause**: Semantic search may find conceptually similar content
- **Expected**: Normal behavior, not exact keyword matching

**Problem**: Low scores
- **Cause**: Query semantically distant from document content
- **Expected**: Normal, try different query phrasing

### Performance Issues

**Problem**: Slow status command
- **Cause**: Large database or slow disk I/O
- **Solution**: Normal for large datasets, consider using `--json` instead of `--full`

**Problem**: High memory usage
- **Cause**: Large embeddings or many concurrent operations
- **Solution**: Process fewer documents at once, upgrade RAM

---

## Next Steps

After verifying basic functionality:

1. **Integration with Claude-Flow**: Use MCP tools to connect RKM to Claude Code
2. **Production Deployment**: Move from test databases to production storage
3. **Performance Tuning**: Adjust embedding dimensions, tier settings
4. **Advanced Features**: Explore GNN reranking, SONA learning, graph queries

---

## Support

- **Documentation**: See `/docs/USER_TEST_GUIDE.md` for automated test runner
- **Examples**: Check `/tests/cli/example-usage.ts` for code examples
- **Test Suite**: Run `npm test` for comprehensive automated tests
- **Issues**: Report bugs with test output and system info
