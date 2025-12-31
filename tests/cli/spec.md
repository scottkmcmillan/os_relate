# RKM CLI User Test Specification

## Overview

This document defines acceptance criteria, test cases, and validation requirements for the Research Knowledge Manager (RKM) Command-Line Interface. The RKM CLI provides a cognitive knowledge graph system combining vector search, graph traversal, and SONA (Self-Optimizing Neural Architecture) learning capabilities.

**Version:** 0.3.0
**Test Target:** `/workspaces/ranger/src/cli.ts`
**Dependencies:** RuVector, SONA, GNN, Embedding Service

---

## Global Configuration Options

All commands support these global flags:

| Flag | Default | Description |
|------|---------|-------------|
| `--db <path>` | `./ruvector.db` | Path to RuVector storage file |
| `--data-dir <path>` | `./data` | Path to graph data directory |
| `--dims <number>` | `384` | Embedding dimensions |
| `--no-cognitive` | `false` | Disable cognitive features (SONA/GNN) |

### Global Configuration Tests

**Test: GC-001 - Default Configuration**
- **Input:** `rkm status`
- **Expected:** Uses `./ruvector.db`, `./data`, dims=384, cognitive enabled
- **Pass Criteria:** Status command shows correct default paths and cognitive features enabled
- **Fail Conditions:** Wrong defaults, missing directories cause error

**Test: GC-002 - Custom Configuration**
- **Input:** `rkm --db ./custom.db --data-dir ./custom_data --dims 768 status`
- **Expected:** Uses custom paths and dimensions
- **Pass Criteria:** Status output reflects custom configuration
- **Fail Conditions:** Ignores custom flags, uses defaults instead

**Test: GC-003 - Invalid Dimensions**
- **Input:** `rkm --dims invalid status`
- **Expected:** Error: "Invalid --dims"
- **Pass Criteria:** Rejects non-numeric dimension values
- **Fail Conditions:** Crashes, accepts invalid values, silent failure

**Test: GC-004 - Cognitive Disabled**
- **Input:** `rkm --no-cognitive status`
- **Expected:** Status shows cognitive features disabled
- **Pass Criteria:** SONA/GNN marked as disabled/unavailable
- **Fail Conditions:** Still attempts to use cognitive features

---

## Test Categories

### 1. Command: ingest

**Description:** Ingests documents into the cognitive knowledge graph with vector embeddings and graph relationships.

#### Inputs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--path <path>` | string | Yes | - | File or directory to ingest |
| `--tag <tag...>` | string[] | No | `[]` | Tags to attach (repeatable) |
| `--no-graph` | boolean | No | `false` | Disable knowledge graph building |
| `--legacy` | boolean | No | `false` | Use legacy ingestion pipeline |

#### Expected Output

```
Reading files...
Found N files
Parsing documents...
Building knowledge graph...
Graph: X nodes, Y edges
Adding documents to memory...
Adding relationships...

Ingestion complete:
  Documents: N
  Graph edges: Y
  Storage: ./ruvector.db
```

#### Test Cases

**Test: ING-001 - Single Markdown File**
- **Input:** `rkm ingest --path ./test.md`
- **Expected Output:** Successfully ingests 1 document, creates graph node, displays confirmation
- **Pass Criteria:**
  - File read successfully
  - Frontmatter and sections extracted
  - Vector embedding created
  - Graph node created with Document type
  - Confirmation shows 1 document ingested
- **Fail Conditions:**
  - File not found error
  - Parsing failure
  - Embedding service unavailable
  - No graph node created
  - Silent failure

**Test: ING-002 - Directory Ingestion**
- **Input:** `rkm ingest --path ./docs/`
- **Expected Output:** Recursively ingests all supported files (.md, .txt, .json, .jsonl)
- **Pass Criteria:**
  - All files in directory processed
  - Subdirectories traversed
  - Count matches actual file count
  - Each file creates vector + graph node
- **Fail Conditions:**
  - Skips subdirectories
  - Misses files
  - Incorrect count
  - Permission errors not handled

**Test: ING-003 - Multiple Tags**
- **Input:** `rkm ingest --path ./test.md --tag research --tag ml --tag 2024`
- **Expected Output:** Document tagged with all provided tags
- **Pass Criteria:**
  - Tags stored in vector metadata
  - Tags stored in graph node properties
  - Later queries can filter by tags
- **Fail Conditions:**
  - Tags dropped
  - Only first tag applied
  - Tags not searchable

**Test: ING-004 - Unsupported File Format**
- **Input:** `rkm ingest --path ./test.pdf`
- **Expected Output:** "No ingestible documents found. Supported: .md, .txt, .json"
- **Pass Criteria:**
  - Graceful message explaining supported formats
  - No crash or error
  - Exit code 0
- **Fail Conditions:**
  - Crash
  - Attempts to ingest unsupported format
  - Non-zero exit code

**Test: ING-005 - Graph Building Disabled**
- **Input:** `rkm ingest --path ./test.md --no-graph`
- **Expected Output:** Ingests vector only, no graph edges created
- **Pass Criteria:**
  - Vector created
  - No graph building step in output
  - No "Graph edges" count shown
- **Fail Conditions:**
  - Still builds graph
  - Crashes when graph disabled

**Test: ING-006 - Legacy Mode**
- **Input:** `rkm ingest --path ./test.md --legacy`
- **Expected Output:** Uses old ingestion pipeline, simpler output
- **Pass Criteria:**
  - Output shows "(legacy mode)"
  - No graph building
  - Simpler output format
- **Fail Conditions:**
  - Uses new pipeline despite flag
  - Different behavior than expected

**Test: ING-007 - JSON File with Custom Fields**
- **Input:** `rkm ingest --path ./data.json` (file contains: `{"title": "Test", "text": "Content", "custom": "value"}`)
- **Expected Output:** Extracts title, text, stores custom fields in metadata
- **Pass Criteria:**
  - Title extracted correctly
  - Text field used for embedding
  - Custom fields preserved in metadata.custom
- **Fail Conditions:**
  - Custom fields lost
  - Wrong field used for text
  - JSON parsing error

**Test: ING-008 - JSONL Multiple Items**
- **Input:** `rkm ingest --path ./items.jsonl` (3 JSON objects, one per line)
- **Expected Output:** Combines all items into single document with aggregated text
- **Pass Criteria:**
  - All valid JSON lines parsed
  - Invalid lines skipped gracefully
  - Combined text includes all items
- **Fail Conditions:**
  - Only first line processed
  - Crashes on invalid line
  - Items treated as separate documents

**Test: ING-009 - Markdown with Links**
- **Input:** `rkm ingest --path ./linked.md` (contains wikilinks [[other]], citations [1])
- **Expected Output:** Detects links, creates graph edges if targets exist
- **Pass Criteria:**
  - Links detected and parsed
  - Edges created for resolvable targets
  - External links don't cause errors
- **Fail Conditions:**
  - Links ignored
  - Crashes on missing targets
  - Wrong edge types

**Test: ING-010 - Empty Directory**
- **Input:** `rkm ingest --path ./empty_dir/`
- **Expected Output:** "No ingestible documents found."
- **Pass Criteria:**
  - Graceful message
  - No error
  - Exit code 0
- **Fail Conditions:**
  - Crash
  - Error message
  - Attempts to create empty embeddings

---

### 2. Command: query

**Description:** Semantic query over stored research with optional graph exploration.

#### Inputs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `<text>` | string | Yes | - | Query text |
| `-k, --k <number>` | number | No | `5` | Top K results |
| `--show-related` | boolean | No | `false` | Show graph-related nodes |
| `--graph-depth <number>` | number | No | `1` | Graph traversal depth |
| `--legacy` | boolean | No | `false` | Vector-only search |

#### Expected Output

```
1. Document Title
   source: /path/to/doc.md
   score: 0.8234 (vector: 0.8500, graph: 0.7500)
   related nodes: 3
     - [Document] related-doc-1
     - [Concept] machine-learning
     - [Citation] ref-2024
   Preview text...

2. Another Document
   ...
```

#### Test Cases

**Test: QRY-001 - Basic Semantic Query**
- **Input:** `rkm query "machine learning algorithms"`
- **Expected Output:** Returns 5 most similar documents ranked by cosine similarity
- **Pass Criteria:**
  - Returns exactly 5 results (or fewer if database smaller)
  - Scores in descending order (highest first)
  - Each result shows title, source, score, preview
  - Scores between 0 and 1
- **Fail Conditions:**
  - Wrong result count
  - Scores not sorted
  - Missing required fields
  - Scores out of range

**Test: QRY-002 - Custom K Value**
- **Input:** `rkm query "neural networks" -k 10`
- **Expected Output:** Returns top 10 results
- **Pass Criteria:**
  - Returns exactly 10 results (or fewer if not enough docs)
  - Respects custom K parameter
- **Fail Conditions:**
  - Ignores K parameter
  - Returns default 5 results

**Test: QRY-003 - Show Related Nodes**
- **Input:** `rkm query "research" --show-related`
- **Expected Output:** Each result includes graph-related nodes section
- **Pass Criteria:**
  - "related nodes: N" line appears
  - Lists related nodes with types and IDs
  - Shows "... and X more" if >3 related
- **Fail Conditions:**
  - No related nodes shown
  - Missing node types
  - Crashes if no graph data

**Test: QRY-004 - Graph Depth**
- **Input:** `rkm query "AI" --show-related --graph-depth 2`
- **Expected Output:** Traverses 2 hops in graph for related nodes
- **Pass Criteria:**
  - Deeper traversal finds more related nodes
  - Depth 2 should include 2-hop neighbors
- **Fail Conditions:**
  - Depth parameter ignored
  - Same results as depth 1
  - Infinite loop on circular references

**Test: QRY-005 - Legacy Vector-Only**
- **Input:** `rkm query "search term" --legacy`
- **Expected Output:** Simple vector search, no graph data, legacy format
- **Pass Criteria:**
  - Output format matches legacy (distance instead of score)
  - No vector/graph score breakdown
  - No related nodes
- **Fail Conditions:**
  - Uses new format
  - Includes graph data

**Test: QRY-006 - No Results**
- **Input:** `rkm query "zzzzxqwjklmnop"` (gibberish unlikely to match)
- **Expected Output:** "No results found."
- **Pass Criteria:**
  - Graceful message
  - No error
  - Exit code 0
- **Fail Conditions:**
  - Crash
  - Error message
  - Returns random results

**Test: QRY-007 - Combined Vector and Graph Scores**
- **Input:** `rkm query "test" --show-related` (on database with graph data)
- **Expected Output:** Shows both vector and graph scores in breakdown
- **Pass Criteria:**
  - Output includes: `score: 0.XX (vector: 0.YY, graph: 0.ZZ)`
  - Combined score is weighted average
  - All scores in valid range [0,1]
- **Fail Conditions:**
  - Missing score breakdown
  - Invalid score values
  - Wrong weighting calculation

**Test: QRY-008 - Empty Database**
- **Input:** `rkm --db ./empty.db query "test"`
- **Expected Output:** "No results found."
- **Pass Criteria:**
  - Handles empty database gracefully
  - No crash
- **Fail Conditions:**
  - Crash
  - Database initialization error

**Test: QRY-009 - Special Characters in Query**
- **Input:** `rkm query "test & <script> 'quotes' \"double\""`
- **Expected Output:** Handles special characters safely in query
- **Pass Criteria:**
  - Query processed correctly
  - Special chars don't break parsing
  - Results returned normally
- **Fail Conditions:**
  - Injection vulnerability
  - Parsing error
  - Crash

---

### 3. Command: search

**Description:** Hybrid search combining vector similarity and graph relationships with advanced options.

#### Inputs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `<text>` | string | Yes | - | Search query text |
| `-k, --k <number>` | number | No | `10` | Number of results |
| `--vector-weight <number>` | number | No | `0.7` | Weight for vector similarity (0-1) |
| `--include-related` | boolean | No | `false` | Include graph-related results |
| `--graph-depth <number>` | number | No | `1` | Graph traversal depth |
| `--rerank` | boolean | No | `false` | Use GNN for reranking |
| `--format <format>` | enum | No | `text` | Output format (json/text/markdown) |

#### Expected Output

**Text Format:**
```
Search: "query text"
Results: 10

1. Document Title
   source: /path/to/doc
   score: 0.8500 (vector: 0.9000, graph: 0.7000)
   related: 5 nodes
   Preview text...
```

**JSON Format:**
```json
{
  "query": "query text",
  "results": [
    {
      "id": "doc-1",
      "title": "Document Title",
      "text": "...",
      "combinedScore": 0.85,
      "vectorScore": 0.90,
      "graphScore": 0.70
    }
  ]
}
```

**Markdown Format:**
```markdown
# Search Results

> Query: "query text"

## 1. Document Title
- Source: /path/to/doc
- Score: 0.8500
...
```

#### Test Cases

**Test: SRC-001 - Basic Hybrid Search**
- **Input:** `rkm search "neural networks"`
- **Expected Output:** Returns 10 results with combined vector+graph scoring
- **Pass Criteria:**
  - Returns up to 10 results
  - Shows combined score for each result
  - Text format output
- **Fail Conditions:**
  - Wrong result count
  - Missing scores
  - Incorrect format

**Test: SRC-002 - Vector Weight Adjustment**
- **Input:** `rkm search "test" --vector-weight 0.9`
- **Expected Output:** Results weighted 90% vector, 10% graph
- **Pass Criteria:**
  - Vector similarity dominates ranking
  - Different results than default 0.7 weight
  - Combined score reflects weighting
- **Fail Conditions:**
  - Weight ignored
  - Same results as default
  - Invalid score calculation

**Test: SRC-003 - JSON Output Format**
- **Input:** `rkm search "test" --format json`
- **Expected Output:** Valid JSON with query and results array
- **Pass Criteria:**
  - Output is valid JSON
  - Includes "query" and "results" fields
  - Results array contains all expected fields
  - Can be parsed by `JSON.parse()`
- **Fail Conditions:**
  - Invalid JSON syntax
  - Missing fields
  - Parse errors

**Test: SRC-004 - Markdown Output Format**
- **Input:** `rkm search "test" --format markdown`
- **Expected Output:** Markdown-formatted results with headers
- **Pass Criteria:**
  - Valid Markdown syntax
  - Includes `# Search Results` header
  - Results formatted with `##` headers
  - Blockquote for query
- **Fail Conditions:**
  - Not valid Markdown
  - Missing formatting
  - Plain text output

**Test: SRC-005 - Include Related Nodes**
- **Input:** `rkm search "AI" --include-related`
- **Expected Output:** Results include "related: N nodes" indicator
- **Pass Criteria:**
  - Related nodes count shown
  - Graph traversal performed
  - More comprehensive results
- **Fail Conditions:**
  - No related info
  - Flag ignored
  - Crash if no graph data

**Test: SRC-006 - GNN Reranking**
- **Input:** `rkm search "machine learning" --rerank`
- **Expected Output:** Results reranked using GNN if available
- **Pass Criteria:**
  - Reranking applied (different order than without)
  - Falls back gracefully if GNN unavailable
  - No crash
- **Fail Conditions:**
  - Crash when GNN unavailable
  - No reranking applied
  - Different results but same order

**Test: SRC-007 - Combined Options**
- **Input:** `rkm search "test" -k 20 --vector-weight 0.5 --include-related --graph-depth 2 --format json`
- **Expected Output:** All options applied correctly in JSON format
- **Pass Criteria:**
  - 20 results
  - 50/50 vector/graph weighting
  - Related nodes included
  - 2-hop graph depth
  - Valid JSON output
- **Fail Conditions:**
  - Any option ignored
  - Options conflict
  - Invalid output

**Test: SRC-008 - Invalid Vector Weight**
- **Input:** `rkm search "test" --vector-weight 1.5`
- **Expected Output:** Clamps to valid range [0,1] or shows error
- **Pass Criteria:**
  - Either accepts and clamps to 1.0
  - Or shows validation error
  - No crash
- **Fail Conditions:**
  - Uses invalid weight
  - Crash
  - Silent failure

---

### 4. Command: graph

**Description:** Query the knowledge graph using Cypher-like syntax.

#### Inputs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `<cypher>` | string | Yes | - | Cypher query |
| `--format <format>` | enum | No | `summary` | Output format (json/summary) |

#### Expected Output

**Summary Format:**
```
Query: MATCH (n:Document) RETURN n

Nodes: 25
Edges: 47

Nodes:
  [Document] doc-1
    title: Document Title
  [Document] doc-2
    title: Another Doc
  ...
  ... and 23 more

Edges:
  doc-1 -[CITES]-> doc-2
  doc-2 -[RELATES_TO]-> doc-3
  ...
```

**JSON Format:**
```json
{
  "nodes": [
    {
      "id": "doc-1",
      "type": "Document",
      "properties": { "title": "..." }
    }
  ],
  "edges": [
    {
      "from_id": "doc-1",
      "to_id": "doc-2",
      "type": "CITES"
    }
  ]
}
```

#### Test Cases

**Test: GRP-001 - Match All Documents**
- **Input:** `rkm graph "MATCH (n:Document) RETURN n"`
- **Expected Output:** Returns all Document nodes in summary format
- **Pass Criteria:**
  - Nodes section lists all documents
  - Shows count
  - Displays first 20, then "... and X more"
  - Properties shown (at least title)
- **Fail Conditions:**
  - Missing nodes
  - No properties
  - Incorrect count
  - Query parse error

**Test: GRP-002 - Match with Edge Traversal**
- **Input:** `rkm graph "MATCH (a)-[r:CITES]->(b) RETURN a, r, b"`
- **Expected Output:** Returns nodes and edges matching pattern
- **Pass Criteria:**
  - Both nodes and edges sections populated
  - Edge types correct
  - Relationships preserved
- **Fail Conditions:**
  - Missing edges
  - Wrong edge types
  - Nodes without relationships

**Test: GRP-003 - JSON Output**
- **Input:** `rkm graph "MATCH (n) RETURN n" --format json`
- **Expected Output:** Valid JSON with nodes and edges arrays
- **Pass Criteria:**
  - Valid JSON structure
  - "nodes" array present
  - "edges" array present
  - All required fields (id, type, properties)
- **Fail Conditions:**
  - Invalid JSON
  - Missing arrays
  - Malformed structure

**Test: GRP-004 - No Results**
- **Input:** `rkm graph "MATCH (n:NonExistentType) RETURN n"`
- **Expected Output:** Nodes: 0, Edges: 0
- **Pass Criteria:**
  - Graceful empty result
  - No crash
  - Clear indication of no matches
- **Fail Conditions:**
  - Crash
  - Error message
  - Null/undefined results

**Test: GRP-005 - Invalid Cypher Syntax**
- **Input:** `rkm graph "INVALID QUERY SYNTAX"`
- **Expected Output:** "Query error: ..." message to stderr
- **Pass Criteria:**
  - Error message explains syntax issue
  - Exit code 1
  - Error goes to stderr, not stdout
- **Fail Conditions:**
  - Crash
  - Silent failure
  - Error on stdout
  - Exit code 0

**Test: GRP-006 - Complex Query with WHERE**
- **Input:** `rkm graph "MATCH (n:Document) WHERE n.category = 'research' RETURN n"`
- **Expected Output:** Filtered results matching WHERE clause
- **Pass Criteria:**
  - Only matching nodes returned
  - WHERE clause applied correctly
  - Results match filter criteria
- **Fail Conditions:**
  - WHERE ignored
  - All nodes returned
  - Wrong filter logic

**Test: GRP-007 - Relationship Type Filtering**
- **Input:** `rkm graph "MATCH (a)-[r:RELATES_TO|PARENT_OF]->(b) RETURN a, r, b"`
- **Expected Output:** Only edges of specified types
- **Pass Criteria:**
  - Edge type filtering works
  - Multiple types supported with |
  - Correct edges returned
- **Fail Conditions:**
  - Wrong edge types
  - Type filter ignored
  - Syntax error

---

### 5. Command: route

**Description:** Analyze query intent and suggest execution strategy using semantic routing.

#### Inputs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `<query>` | string | Yes | - | Query to analyze |
| `--verbose` | boolean | No | `false` | Show detailed analysis |

#### Expected Output

**Basic:**
```
Query: "find documents related to machine learning"

Route: RELATIONAL
Confidence: 85.0%
Reasoning: Query requires graph traversal...
```

**Verbose:**
```
Query: "find documents related to machine learning"

Route: RELATIONAL
Confidence: 85.0%
Reasoning: Query requires graph traversal...

Intent Analysis:
  Primary: RELATIONAL
  Secondary: RETRIEVAL
  Complexity: 0.65
  Multi-stage: false

Execution Strategy:
  Approach: single-stage
  Steps: 1
    1. [RELATIONAL] Execute relational operation as primary stage
  Complexity: medium
```

#### Test Cases

**Test: RTE-001 - Retrieval Query**
- **Input:** `rkm route "find document about neural networks"`
- **Expected Output:** Route: RETRIEVAL, high confidence
- **Pass Criteria:**
  - Route determined as RETRIEVAL
  - Confidence >60%
  - Reasoning mentions retrieval keywords
- **Fail Conditions:**
  - Wrong route type
  - Low confidence on clear query
  - No reasoning

**Test: RTE-002 - Relational Query**
- **Input:** `rkm route "show documents related to machine learning"`
- **Expected Output:** Route: RELATIONAL, high confidence
- **Pass Criteria:**
  - Route: RELATIONAL
  - Confidence >60%
  - Reasoning mentions relationships/graph
- **Fail Conditions:**
  - Classified as RETRIEVAL
  - Low confidence
  - Missing reasoning

**Test: RTE-003 - Summary Query**
- **Input:** `rkm route "summarize all documents about AI"`
- **Expected Output:** Route: SUMMARY, high confidence
- **Pass Criteria:**
  - Route: SUMMARY
  - Confidence >60%
  - Reasoning mentions aggregation/synthesis
- **Fail Conditions:**
  - Wrong route
  - Low confidence on clear summary intent

**Test: RTE-004 - Hybrid Query**
- **Input:** `rkm route "compare and analyze documents about deep learning and neural networks"`
- **Expected Output:** Route: HYBRID, moderate-high confidence
- **Pass Criteria:**
  - Route: HYBRID
  - Confidence reflects multiple intents
  - Reasoning explains hybrid nature
- **Fail Conditions:**
  - Single route chosen
  - Misses complexity
  - Low confidence

**Test: RTE-005 - Verbose Mode**
- **Input:** `rkm route "find related documents" --verbose`
- **Expected Output:** Detailed breakdown with intent analysis and strategy
- **Pass Criteria:**
  - Shows Intent Analysis section
  - Shows Execution Strategy section
  - Lists primary and secondary intents
  - Shows complexity score
  - Lists execution steps
- **Fail Conditions:**
  - Verbose output same as basic
  - Missing sections
  - No execution strategy

**Test: RTE-006 - Multi-stage Detection**
- **Input:** `rkm route "find documents about ML then summarize them" --verbose`
- **Expected Output:** Multi-stage: true, approach: multi-stage
- **Pass Criteria:**
  - Detects "then" keyword
  - requiresMultiStage: true
  - Multiple execution steps listed
  - Approach: multi-stage
- **Fail Conditions:**
  - Misses multi-stage nature
  - Single-stage execution
  - No step breakdown

**Test: RTE-007 - Complexity Calculation**
- **Input:** `rkm route "comprehensive detailed analysis of all various different machine learning algorithms" --verbose`
- **Expected Output:** High complexity score (>0.6)
- **Pass Criteria:**
  - Complexity score calculated
  - Reflects query complexity
  - Higher for complex queries
- **Fail Conditions:**
  - Low complexity on complex query
  - Complexity always same
  - No complexity shown

---

### 6. Command: context

**Description:** Print Claude-Flow-ready context block from RuVector search results.

#### Inputs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `<text>` | string | Yes | - | Query for context |
| `-k, --k <number>` | number | No | `6` | Top K results |
| `--max-chars <number>` | number | No | `12000` | Maximum characters |
| `--title <string>` | string | No | `RuVector Context` | Context block title |

#### Expected Output

````
```text
RuVector Context (generated from RuVector)
query: machine learning
db: ./ruvector.db

---
result: 1/6
title: Introduction to ML
source: /docs/ml-intro.md
distance: 0.0234

Full document text here...

---
result: 2/6
...
```
````

#### Test Cases

**Test: CTX-001 - Basic Context Block**
- **Input:** `rkm context "machine learning"`
- **Expected Output:** Formatted code block with 6 results
- **Pass Criteria:**
  - Output wrapped in ```text ... ```
  - Shows query, db path
  - Each result has title, source, distance, text
  - Results separated by ---
- **Fail Conditions:**
  - No code block wrapper
  - Missing metadata
  - Malformed structure

**Test: CTX-002 - Custom K Value**
- **Input:** `rkm context "AI" -k 10`
- **Expected Output:** Up to 10 results in context block
- **Pass Criteria:**
  - Returns up to 10 results
  - result: X/10 format
- **Fail Conditions:**
  - Ignores K parameter
  - Returns default 6

**Test: CTX-003 - Max Chars Limit**
- **Input:** `rkm context "test" --max-chars 1000`
- **Expected Output:** Output truncated to ~1000 characters
- **Pass Criteria:**
  - Total output ≤1000 chars (approximately)
  - Shows [truncated] indicator if needed
  - Doesn't cut mid-word awkwardly
- **Fail Conditions:**
  - Exceeds limit significantly
  - No truncation
  - Corrupted output

**Test: CTX-004 - Custom Title**
- **Input:** `rkm context "test" --title "Custom Research Context"`
- **Expected Output:** First line shows custom title
- **Pass Criteria:**
  - Title appears on line 2 (after ```)
  - Matches provided title
- **Fail Conditions:**
  - Default title used
  - Title missing
  - Wrong position

**Test: CTX-005 - No Results**
- **Input:** `rkm context "zzzzzzinvalidquery"`
- **Expected Output:** Context block with "No results found."
- **Pass Criteria:**
  - Still outputs valid code block
  - Contains "No results found." message
  - No crash
- **Fail Conditions:**
  - Crash
  - Empty output
  - Error message

**Test: CTX-006 - Long Documents Truncation**
- **Input:** `rkm context "test" --max-chars 500` (with long documents)
- **Expected Output:** Individual documents truncated with [truncated] marker
- **Pass Criteria:**
  - Shows [truncated] for cut documents
  - Fits within char limit
  - Shows at least partial content
- **Fail Conditions:**
  - No truncation indicator
  - Exceeds limit
  - Cuts headers instead of content

**Test: CTX-007 - Copy-Paste Ready Format**
- **Input:** `rkm context "machine learning" | pbcopy` (or similar)
- **Expected Output:** Output can be copied and pasted into prompts
- **Pass Criteria:**
  - No ANSI color codes in output
  - Clean text format
  - Preserves newlines
  - Valid markdown code block
- **Fail Conditions:**
  - Contains escape codes
  - Malformed when pasted
  - Extra formatting characters

---

### 7. Command: status

**Description:** Show system capabilities, memory statistics, and learning progress.

#### Inputs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--json` | boolean | No | `false` | Output as JSON |
| `--full` | boolean | No | `false` | Include full statistics |
| `--router` | boolean | No | `false` | Test router availability |

#### Expected Output

**Basic:**
```
=== RuVector Capabilities ===

Implementation: native
  Native: Yes
  WASM: No
  Version: 1.2.3

Modules:
  GNN (Graph Neural Network): Available
  Attention: Available
  SONA (Self-Optimizing): Available
```

**Full:**
```
[... basic output ...]

=== Memory Statistics ===

Vector Store:
  Total vectors: 150
  Tiers: Hot=50, Warm=75, Cold=25
  Dimensions: 384
  Storage: ./ruvector.db
  Average vector size: 1.5 KB
  Total storage: 225.0 KB

Graph Store:
  Nodes: 150
  Edges: 234
  Average connectivity: 1.56 edges/node
  Node types:
    Document: 140
    Concept: 8
    Citation: 2
  Edge types:
    CITES: 100
    RELATES_TO: 120
    PARENT_OF: 14

=== Cognitive Features ===

Cognitive engine: Enabled
  SONA: Available
  GNN: Available

=== SONA Learning Statistics ===

Trajectories recorded: 45
Patterns learned: 23
Micro-LoRA updates: 67
Base-LoRA updates: 12
EWC consolidations: 3

Learning efficiency: 51.1% (patterns per trajectory)
```

**JSON:**
```json
{
  "capabilities": {
    "implementation": {...},
    "modules": {...}
  },
  "stats": {
    "vector": {...},
    "graph": {...},
    "cognitive": {...}
  }
}
```

#### Test Cases

**Test: STS-001 - Basic Status**
- **Input:** `rkm status`
- **Expected Output:** Shows implementation type and module availability
- **Pass Criteria:**
  - Shows implementation (native/wasm)
  - Lists all 3 modules (GNN, Attention, SONA)
  - Each module shows Available/Not Available
  - Version displayed
- **Fail Conditions:**
  - Missing modules
  - No version
  - Crash
  - Incomplete info

**Test: STS-002 - Full Statistics**
- **Input:** `rkm status --full`
- **Expected Output:** Comprehensive stats including vector, graph, and cognitive
- **Pass Criteria:**
  - All 3 sections: RuVector Capabilities, Memory Statistics, Cognitive Features
  - Vector stats: count, tiers, dimensions, storage
  - Graph stats: nodes, edges, types
  - SONA stats: trajectories, patterns, updates
  - Learning efficiency calculated
- **Fail Conditions:**
  - Missing sections
  - Incomplete statistics
  - Calculation errors
  - No connectivity/efficiency metrics

**Test: STS-003 - JSON Output**
- **Input:** `rkm status --json`
- **Expected Output:** Valid JSON with capabilities object
- **Pass Criteria:**
  - Valid JSON syntax
  - "capabilities" key present
  - Can be parsed with JSON.parse()
  - Contains all capability info
- **Fail Conditions:**
  - Invalid JSON
  - Missing keys
  - Parse errors

**Test: STS-004 - JSON with Full Stats**
- **Input:** `rkm status --json --full`
- **Expected Output:** JSON including stats and cognitiveCapabilities
- **Pass Criteria:**
  - "stats" key present
  - "cognitiveCapabilities" key present
  - All nested data included
  - Valid structure
- **Fail Conditions:**
  - Missing nested keys
  - Incomplete data
  - JSON structure invalid

**Test: STS-005 - Router Test**
- **Input:** `rkm status --router`
- **Expected Output:** Semantic Router section with availability and test
- **Pass Criteria:**
  - "=== Semantic Router ===" section appears
  - Shows "Status: Available" or "Not Available"
  - Test query executed
  - Shows route, confidence for test query
- **Fail Conditions:**
  - No router section
  - Crash if router unavailable
  - No test query result

**Test: STS-006 - Empty Database Stats**
- **Input:** `rkm --db ./empty.db status --full`
- **Expected Output:** Shows 0 vectors, 0 nodes, 0 edges
- **Pass Criteria:**
  - Handles empty database gracefully
  - All counts show 0
  - No division by zero errors
  - No crash
- **Fail Conditions:**
  - Crash on empty DB
  - Math errors (NaN, Infinity)
  - Missing stats

**Test: STS-007 - Cognitive Disabled**
- **Input:** `rkm --no-cognitive status --full`
- **Expected Output:** Cognitive features marked as disabled
- **Pass Criteria:**
  - "Cognitive engine: Disabled"
  - SONA/GNN show as unavailable
  - No SONA statistics section
- **Fail Conditions:**
  - Shows enabled
  - Attempts to access cognitive features
  - Crash

**Test: STS-008 - Storage Size Calculations**
- **Input:** `rkm status --full` (with populated database)
- **Expected Output:** Correct byte formatting (B, KB, MB)
- **Pass Criteria:**
  - Sizes formatted correctly
  - Units chosen appropriately
  - Average size calculated correctly
  - Total storage accurate
- **Fail Conditions:**
  - Wrong units
  - Calculation errors
  - Negative/invalid values

---

### 8. Command: learn

**Description:** Trigger SONA learning from recorded trajectories.

#### Inputs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--force` | boolean | No | `false` | Force immediate learning |

#### Expected Output

```
Learning result: Micro-LoRA updated with 12 patterns (avg reward: 0.78)
```

Or:

```
Learning result: No learning triggered (queue empty or threshold not reached)
```

#### Test Cases

**Test: LRN-001 - Automatic Learning Tick**
- **Input:** `rkm learn`
- **Expected Output:** Learning result message (may indicate no learning if queue empty)
- **Pass Criteria:**
  - Shows learning status message
  - If learning occurs, shows pattern count and reward
  - If no learning, explains why
  - No crash
- **Fail Conditions:**
  - Crash
  - No output
  - Cryptic error

**Test: LRN-002 - Force Learning**
- **Input:** `rkm learn --force`
- **Expected Output:** Forces learning even if threshold not met
- **Pass Criteria:**
  - Triggers learning regardless of queue size
  - Shows learning result
  - Updates LoRA weights
- **Fail Conditions:**
  - Doesn't force learning
  - Same as normal tick
  - Crash

**Test: LRN-003 - Cognitive Disabled Error**
- **Input:** `rkm --no-cognitive learn`
- **Expected Output:** Error: "Cognitive features are disabled..."
- **Pass Criteria:**
  - Clear error message to stderr
  - Explains how to enable cognitive features
  - Exit code 1
- **Fail Conditions:**
  - Attempts to learn anyway
  - Crash
  - Exit code 0
  - Silent failure

**Test: LRN-004 - SONA Unavailable**
- **Input:** `rkm learn` (on system without SONA support)
- **Expected Output:** Error: "SONA is not available on this system."
- **Pass Criteria:**
  - Clear error message
  - Exit code 1
  - Graceful handling
- **Fail Conditions:**
  - Crash
  - Attempts to use SONA anyway
  - Silent failure

**Test: LRN-005 - Empty Trajectory Queue**
- **Input:** `rkm learn` (with no recorded trajectories)
- **Expected Output:** "No learning triggered (queue empty or threshold not reached)"
- **Pass Criteria:**
  - Clear message explaining no learning
  - No error
  - Exit code 0
- **Fail Conditions:**
  - Crash
  - Error message
  - Attempts to learn from nothing

**Test: LRN-006 - Successful Learning**
- **Input:** `rkm learn --force` (after recording trajectories)
- **Expected Output:** "Micro-LoRA updated with N patterns (avg reward: X.XX)"
- **Pass Criteria:**
  - Shows pattern count
  - Shows average reward
  - Reward in valid range [0,1]
  - Pattern count > 0
- **Fail Conditions:**
  - Missing metrics
  - Invalid values
  - No confirmation

**Test: LRN-007 - Learning Stats Update**
- **Input:** `rkm learn --force && rkm status --full`
- **Expected Output:** SONA statistics incremented after learning
- **Pass Criteria:**
  - Pattern count increased
  - Update counts incremented
  - Stats reflect recent learning
- **Fail Conditions:**
  - Stats unchanged
  - Incorrect counts
  - No stats update

---

## Edge Cases and Error Conditions

### Global Edge Cases

**Edge Case: EC-001 - Corrupted Database**
- **Test:** Use corrupted/invalid database file
- **Expected:** Clear error message, suggestion to recreate
- **Fail:** Crash, data corruption, silent failure

**Edge Case: EC-002 - Permission Denied**
- **Test:** Run commands on read-only database
- **Expected:** Permission error with clear message
- **Fail:** Crash, silent failure, data loss

**Edge Case: EC-003 - Disk Full**
- **Test:** Ingest when disk is full
- **Expected:** Disk space error, rollback
- **Fail:** Partial write, corruption, crash

**Edge Case: EC-004 - Concurrent Access**
- **Test:** Multiple CLI instances accessing same DB
- **Expected:** Database locking or safe concurrent access
- **Fail:** Data corruption, race conditions

**Edge Case: EC-005 - Very Large Files**
- **Test:** Ingest 100MB+ document
- **Expected:** Handles gracefully, may chunk or warn
- **Fail:** OOM crash, hang, silent truncation

**Edge Case: EC-006 - Unicode and Emoji**
- **Test:** Documents with Unicode, emoji, RTL text
- **Expected:** Handles correctly, preserves characters
- **Fail:** Mojibake, crashes, character loss

**Edge Case: EC-007 - Network Timeouts**
- **Test:** Embedding service timeout (if external)
- **Expected:** Retry logic or clear timeout error
- **Fail:** Hang forever, crash

**Edge Case: EC-008 - Memory Limits**
- **Test:** Process hundreds of documents at once
- **Expected:** Batch processing, memory management
- **Fail:** OOM crash, swap thrashing

### Command-Specific Edge Cases

**Ingest Edge Cases:**
- Circular links (A links to B links to A)
- Symbolic link loops
- Binary files in directory
- Empty files (0 bytes)
- Malformed JSON
- Mixed encoding files

**Query Edge Cases:**
- Extremely long query (10,000+ chars)
- Empty query string
- Query with only whitespace
- Non-ASCII query text
- SQL/Cypher injection attempts

**Graph Edge Cases:**
- Queries returning millions of nodes
- Circular graph patterns
- Disconnected graph components
- Self-referencing edges

---

## Performance Requirements

### Response Time Targets

| Operation | Target | Maximum Acceptable |
|-----------|--------|-------------------|
| `status` | <100ms | <500ms |
| `query` (10 docs) | <500ms | <2s |
| `search` (hybrid) | <1s | <5s |
| `ingest` (single file) | <1s | <5s |
| `ingest` (100 files) | <30s | <2min |
| `graph` (simple) | <200ms | <1s |
| `route` | <100ms | <500ms |
| `context` | <500ms | <2s |
| `learn` (force) | <2s | <10s |

### Memory Limits

- Single file ingest: Max 500MB file size
- Batch ingest: Process in chunks to stay under 2GB memory
- Query results: Limit to prevent unbounded memory growth

### Scalability Targets

- Database size: Support up to 100,000 documents
- Graph size: Support up to 1,000,000 edges
- Concurrent queries: Handle at least 5 simultaneous queries

---

## Security Requirements

### Input Validation

**SEC-001:** All file paths must be validated (no path traversal)
**SEC-002:** Cypher queries must be sanitized (no injection)
**SEC-003:** File size limits enforced
**SEC-004:** Resource limits (memory, CPU) enforced

### Data Protection

**SEC-005:** No secrets logged to stdout/stderr
**SEC-006:** Database files created with secure permissions (0600)
**SEC-007:** Temporary files cleaned up properly

### Error Handling

**SEC-008:** Error messages don't leak sensitive paths
**SEC-009:** Stack traces sanitized in production
**SEC-010:** No information disclosure in error messages

---

## Test Execution Guidelines

### Test Environment Setup

1. **Preparation:**
   - Clean test database for each test suite
   - Sample documents in `./test-fixtures/`
   - Isolated temp directory

2. **Test Data:**
   - 10 small docs (<10KB each)
   - 5 medium docs (100KB - 1MB)
   - 2 large docs (>5MB)
   - Documents with various formats (md, txt, json, jsonl)
   - Documents with links, citations, sections

3. **Verification:**
   - Exit codes checked (0 for success, 1 for errors)
   - stdout vs stderr separation
   - Output format validation
   - Side effects verified (files created, DB updated)

### Pass/Fail Criteria Summary

**PASS Criteria:**
- Correct output format
- Accurate results
- Proper error handling
- Expected exit codes
- Performance within limits
- No data corruption
- No memory leaks

**FAIL Criteria:**
- Crash/segfault
- Incorrect results
- Silent failures
- Data loss
- Security vulnerabilities
- Performance degradation
- Memory leaks

---

## Test Priority Levels

### P0 (Critical - Must Pass)
- All ingest basic functionality (ING-001, ING-002)
- All query basic functionality (QRY-001, QRY-002)
- Database integrity (no corruption)
- No crashes on valid input

### P1 (High - Should Pass)
- All search functionality
- Graph queries
- Status reporting
- Error handling for invalid input

### P2 (Medium - Nice to Have)
- Advanced features (reranking, router)
- Performance optimizations
- Edge case handling
- Output format options

### P3 (Low - Future)
- Cognitive learning features
- Advanced graph algorithms
- Optimization hints

---

## Automation Support

### Test Automation Hooks

Each test case can be automated using:

```bash
# Example test script structure
test_case() {
  local name=$1
  local command=$2
  local expected=$3

  output=$(eval "$command" 2>&1)
  exit_code=$?

  if [ $exit_code -eq 0 ] && echo "$output" | grep -q "$expected"; then
    echo "✓ $name PASSED"
  else
    echo "✗ $name FAILED"
    echo "  Expected: $expected"
    echo "  Got: $output"
  fi
}

# Run test
test_case "QRY-001" "rkm query 'test' -k 5" "score:"
```

### CI/CD Integration

- Tests run in Docker container for consistency
- Parallel test execution where possible
- Test results in JUnit XML format
- Code coverage reports for CLI routes

---

## Appendix: Test Data Fixtures

### Sample Documents Required

1. **simple.md** - Basic markdown with title and content
2. **linked.md** - Markdown with wikilinks and citations
3. **structured.json** - JSON with title, text, metadata
4. **items.jsonl** - 3 JSON objects on separate lines
5. **large.md** - 5MB+ markdown file
6. **unicode.txt** - Text with emoji and Unicode chars
7. **empty.md** - Empty file (0 bytes)
8. **malformed.json** - Invalid JSON syntax

### Database States

1. **empty.db** - Empty database (freshly initialized)
2. **populated.db** - Database with 100 documents and graph
3. **corrupted.db** - Intentionally corrupted for error testing
4. **readonly.db** - Database with read-only permissions

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-XX | Initial specification |

---

**End of Specification**
