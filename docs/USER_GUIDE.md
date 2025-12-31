# Research Knowledge Manager (RKM) - User Guide

**Version:** 0.3.0
**Last Updated:** 2025-12-23

---

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Installation](#installation)
3. [Ingestion Workflow](#ingestion-workflow)
4. [Querying Data](#querying-data)
5. [Status & Monitoring](#status--monitoring)
6. [Advanced Features](#advanced-features)
7. [MCP Integration](#mcp-integration)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start Guide

**Get started in 5 minutes:**

```bash
# 1. Install and build
npm install
npm run build

# 2. Ingest your first document
rkm ingest --path ./my-research-notes.md --tag research

# 3. Query your knowledge base
rkm query "machine learning algorithms" -k 5

# 4. Check system status
rkm status
```

That's it! You now have a cognitive knowledge graph running locally.

---

## Installation

### Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- **Operating System:** Linux, macOS, or Windows (with WSL recommended)

### Installation Steps

#### 1. Clone or Download the Repository

```bash
git clone <repository-url>
cd research-knowledge-manager
```

#### 2. Install Dependencies

```bash
npm install
```

This will install:
- `ruvector` - High-performance vector database
- `@ruvector/gnn` - Graph Neural Network capabilities
- `@ruvector/attention` - Attention mechanism support
- `better-sqlite3` - SQLite bindings for graph storage
- `commander` - CLI framework
- And other dependencies

#### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

#### 4. Verify Installation

```bash
# Run using npm script
npm run start -- --help

# Or use the binary directly
node dist/cli.js --help

# If installed globally
rkm --help
```

You should see the CLI help menu with available commands.

### Optional: Global Installation

To use `rkm` command globally:

```bash
npm link
```

Now you can run `rkm` from anywhere on your system.

---

## Ingestion Workflow

The ingestion process converts your documents into a Cognitive Knowledge Graph, combining vector embeddings with graph relationships.

### Basic Ingestion

**Ingest a single file:**

```bash
rkm ingest --path ./document.md
```

**Ingest an entire directory:**

```bash
rkm ingest --path ./research_outputs/
```

### Supported File Formats

- **Markdown** (`.md`) - Full markdown parsing with headers, lists, and code blocks
- **Text** (`.txt`) - Plain text documents
- **JSON** (`.json`) - Single JSON objects or arrays
- **JSONL** (`.jsonl`) - Newline-delimited JSON

### Ingestion Options

#### Adding Tags

Tags help organize and filter documents:

```bash
rkm ingest --path ./docs/ --tag research --tag ai --tag 2025
```

#### Vector-Only Mode (Disable Graph)

For faster ingestion without graph relationships:

```bash
rkm ingest --path ./docs/ --no-graph
```

#### Legacy Mode

Use the older ingestion pipeline for backward compatibility:

```bash
rkm ingest --path ./docs/ --legacy
```

### Storage Locations

By default, RKM stores data in:
- **Vector Store:** `./ruvector.db` (SQLite database with vector embeddings)
- **Graph Store:** `./data/` (Directory with graph nodes and edges)

**Custom storage locations:**

```bash
rkm --db ./custom/path/vectors.db --data-dir ./custom/path/graph/ ingest --path ./docs/
```

### Ingestion Pipeline

When you run `rkm ingest`, here's what happens:

1. **File Discovery** - Scans directory for supported formats
2. **Parsing** - Extracts text, metadata, and structure from documents
3. **Graph Building** - Identifies citations, references, and hierarchical relationships
4. **Embedding Generation** - Creates 384-dimensional semantic vectors
5. **Storage** - Atomically stores in both vector and graph databases

### Example Workflows

**Academic Research Papers:**

```bash
rkm ingest --path ./papers/ --tag research --tag academic
```

**Project Documentation:**

```bash
rkm ingest --path ./docs/ --tag documentation --tag project-x
```

**Meeting Notes:**

```bash
rkm ingest --path ./notes/meetings/ --tag meetings --tag 2025-q4
```

**Code Documentation:**

```bash
rkm ingest --path ./src/ --tag codebase --no-graph
```

---

## Querying Data

RKM provides multiple ways to search and explore your knowledge graph.

### Basic Query

Simple semantic search:

```bash
rkm query "neural networks" -k 5
```

**Output:**
```
1. Introduction to Neural Networks
   source: ./papers/neural-nets-intro.md
   score: 0.9234 (vector: 0.8945, graph: 0.9523)
   related nodes: 3
   Neural networks are computational models inspired by biological neural...

2. Deep Learning Fundamentals
   source: ./papers/deep-learning.md
   score: 0.8876
   ...
```

### Query Options

**Control number of results:**

```bash
rkm query "machine learning" -k 10
```

**Show related graph nodes:**

```bash
rkm query "transformer architecture" --show-related
```

**Adjust graph traversal depth:**

```bash
rkm query "attention mechanism" --show-related --graph-depth 2
```

**Legacy vector-only search:**

```bash
rkm query "clustering algorithms" --legacy
```

### Hybrid Search

Advanced search combining vector similarity and graph relationships:

```bash
rkm search "reinforcement learning algorithms" -k 10
```

**Hybrid search options:**

```bash
# Adjust vector vs graph weighting (0-1, default 0.7)
rkm search "topic" --vector-weight 0.8

# Include graph-related results
rkm search "topic" --include-related

# Deeper graph traversal
rkm search "topic" --graph-depth 2

# Enable GNN reranking (if available)
rkm search "topic" --rerank
```

**Output formats:**

```bash
# JSON output
rkm search "machine learning" --format json

# Markdown output
rkm search "machine learning" --format markdown

# Text output (default)
rkm search "machine learning" --format text
```

### Graph Queries

Query the knowledge graph using Cypher-like syntax:

**Find all documents:**

```bash
rkm graph "MATCH (n:Document) RETURN n"
```

**Find citations:**

```bash
rkm graph "MATCH (a)-[r:CITES]->(b) RETURN a, r, b"
```

**Find related documents:**

```bash
rkm graph "MATCH (a:Document)-[r:RELATES_TO]->(b:Document) RETURN a.title, b.title"
```

**Output formats:**

```bash
# Summary format (default)
rkm graph "MATCH (n:Document) RETURN n"

# JSON format
rkm graph "MATCH (n:Document) RETURN n" --format json
```

### Context Block Export

Generate a context block for use in AI prompts:

```bash
rkm context "research on transformers" -k 6 --max-chars 12000
```

**Output:**
```text
RuVector Context (generated from RuVector)
query: research on transformers
db: ./ruvector.db

---
result: 1/6
title: Attention Is All You Need
source: ./papers/transformers.pdf
distance: 0.1234

The Transformer model architecture relies entirely on self-attention mechanisms...
[truncated]
```

**Options:**

```bash
# Custom title
rkm context "topic" --title "Background Knowledge"

# More results
rkm context "topic" -k 10

# Larger context window
rkm context "topic" --max-chars 20000
```

---

## Status & Monitoring

### Basic Status

Check system health and capabilities:

```bash
rkm status
```

**Output:**
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
```

### Full Statistics

View comprehensive memory and learning statistics:

```bash
rkm status --full
```

**Output:**
```
=== RuVector Capabilities ===
[... capabilities ...]

=== Memory Statistics ===

Vector Store:
  Total vectors: 1,247
  Tiers: Hot=45, Warm=312, Cold=890
  Dimensions: 384
  Storage: ./ruvector.db
  Average vector size: 1.5 KB
  Total storage: 1.8 MB

Graph Store:
  Nodes: 1,247
  Edges: 3,892
  Average connectivity: 3.12 edges/node
  Node types:
    Document: 1,200
    Section: 45
    Concept: 2
  Edge types:
    CITES: 234
    RELATES_TO: 3,456
    PARENT_OF: 202

=== Cognitive Features ===

Cognitive engine: Enabled
  SONA: Available
  GNN: Available

=== SONA Learning Statistics ===

Trajectories recorded: 127
Patterns learned: 89
Micro-LoRA updates: 234
Base-LoRA updates: 12
EWC consolidations: 3

Learning efficiency: 70.1% (patterns per trajectory)
```

### JSON Output

For programmatic access:

```bash
rkm status --json
```

```bash
rkm status --full --json
```

### Semantic Router Status

Test the query router availability:

```bash
rkm status --router
```

**Output:**
```
=== Semantic Router ===

Status: Available
Test query: "Find documents related to machine learning"
  Route: RELATIONAL
  Confidence: 85.3%
```

---

## Advanced Features

### Semantic Routing

The semantic router analyzes query intent and suggests optimal execution strategies.

**Analyze a query:**

```bash
rkm route "Find all documents related to neural networks"
```

**Output:**
```
Query: "Find all documents related to neural networks"

Route: RELATIONAL
Confidence: 85.3%
Reasoning: Query requires graph traversal and relationship exploration...
```

**Verbose analysis:**

```bash
rkm route "Compare transformer and RNN architectures" --verbose
```

**Output:**
```
Query: "Compare transformer and RNN architectures"

Route: HYBRID
Confidence: 78.5%
Reasoning: Query has multiple intent components requiring combined approach...

Intent Analysis:
  Primary: HYBRID
  Secondary: SUMMARY, RELATIONAL
  Complexity: 0.72
  Multi-stage: true

Execution Strategy:
  Approach: multi-stage
  Steps: 3
    1. [HYBRID] Execute hybrid operation as primary stage
    2. [SUMMARY] Follow up with summary to enrich results
    3. [RELATIONAL] Follow up with relational to enrich results
  Complexity: high
```

### SONA Learning

SONA (Self-Optimizing Neural Architecture) enables active learning from query patterns.

**Trigger learning from recorded trajectories:**

```bash
rkm learn
```

This processes queued trajectories and updates the neural model.

**Force immediate learning:**

```bash
rkm learn --force
```

**Note:** Learning requires cognitive features to be enabled (default). To disable:

```bash
rkm --no-cognitive query "test"  # Cognitive features disabled
```

### Graph Neural Networks (GNN)

GNN provides advanced reranking capabilities.

**Enable GNN reranking in search:**

```bash
rkm search "machine learning methods" --rerank
```

The GNN analyzes both vector similarity and graph structure to improve result ranking.

### Multi-Modal Search Strategies

**Vector-heavy search** (prioritize semantic similarity):

```bash
rkm search "topic" --vector-weight 0.9
```

**Graph-heavy search** (prioritize relationships):

```bash
rkm search "topic" --vector-weight 0.3 --include-related
```

**Balanced hybrid search** (default):

```bash
rkm search "topic" --vector-weight 0.7 --include-related
```

### Custom Dimensions

By default, RKM uses 384-dimensional embeddings. To use different dimensions:

```bash
rkm --dims 768 ingest --path ./docs/
rkm --dims 768 query "test"
```

**Note:** You must be consistent with dimensions across all operations.

---

## MCP Integration

RKM includes a Model Context Protocol (MCP) server for integration with Claude Code and other AI tools.

### Building the MCP Server

```bash
npm run build
```

The MCP server is built to `dist/mcp/server.js`.

### Registering with Claude Code

**Linux/macOS:**

```bash
claude mcp add ruvector-memory node dist/mcp/server.js
```

**Windows:**

```bash
claude mcp add ruvector-memory "cmd" "/c" "node dist\\mcp\\server.js"
```

### Available MCP Tools

**Core Tools:**
- `ruvector_search` - Semantic search over knowledge base
- `ruvector_context` - Generate context blocks for prompts
- `ruvector_status` - Check system capabilities and statistics

**SONA Learning Tools** (if available):
- `sona_begin` - Start a learning trajectory
- `sona_step` - Record a step in an active trajectory
- `sona_end` - End trajectory with quality assessment
- `sona_tick` - Trigger learning tick
- `sona_learn` - Force immediate learning
- `sona_stats` - Get learning statistics
- `sona_patterns` - Find similar reasoning patterns

**GNN Tools** (if available):
- `gnn_available` - Check GNN availability
- `gnn_rerank` - Rerank candidates using GNN

### Using from Claude Code

Example prompt for Claude Code agents:

```text
Before making a plan, call ruvector_context with the project topic
and incorporate the returned context into your analysis.

If you need specific past findings, call ruvector_search with a
focused query.

During execution, record a learning trace:
1. Call sona_begin with the research goal
2. After each major step, call sona_step with summary and reward (0-1)
3. At the end, call sona_end with overall quality score
4. Optionally call sona_learn to force a learning cycle
```

### MCP Tool Parameters

**ruvector_search:**
- `queryText` (string, required) - Search query
- `k` (number, default: 6) - Number of results
- `dbPath` (string, default: `./ruvector.db`) - Database path
- `dims` (number, default: 384) - Embedding dimensions

**ruvector_context:**
- `queryText` (string, required) - Context query
- `k` (number, default: 6) - Number of results
- `maxChars` (number, default: 12000) - Maximum characters
- `title` (string, default: "RuVector Context") - Context block title
- `dbPath` (string, default: `./ruvector.db`) - Database path
- `dims` (number, default: 384) - Embedding dimensions

**sona_begin:**
- `queryText` (string, required) - Initial query
- `dims` (number, optional) - Embedding dimensions
- `route` (string, optional) - Execution route
- `contextIds` (array, optional) - Context document IDs

**sona_step:**
- `trajectoryId` (number, required) - Trajectory ID
- `text` (string, required) - Step description
- `reward` (number, required) - Reward signal (0-1)
- `dims` (number, optional) - Embedding dimensions

**gnn_rerank:**
- `queryText` (string, required) - Query text
- `candidates` (array, required) - Candidate strings
- `k` (number, optional) - Number of results

---

## Troubleshooting

### Common Issues

**Problem: "SONA is not available"**

```
Error: SONA is not available in this RuVector installation
```

**Solution:** SONA requires native RuVector bindings. Ensure you're on a supported platform (Linux x64, macOS arm64/x64) and that `ruvector` installed correctly. Check with:

```bash
rkm status
```

Look for "SONA (Self-Optimizing): Available".

---

**Problem: "No results found"**

**Solution:**
1. Verify data was ingested: `rkm status --full`
2. Check database path matches: `rkm --db ./ruvector.db query "test"`
3. Try a broader query or increase `-k` parameter

---

**Problem: "Invalid --dims"**

**Solution:** Ensure dimensions are a positive integer:

```bash
rkm --dims 384 query "test"  # Correct
rkm --dims abc query "test"  # Wrong
```

Use consistent dimensions across all operations.

---

**Problem: Graph query syntax errors**

**Solution:** RKM uses a Cypher-like syntax. Ensure proper formatting:

```bash
# Correct
rkm graph "MATCH (n:Document) RETURN n"

# Wrong (missing quotes around node type)
rkm graph "MATCH (n:Document) RETURN n"
```

Refer to Cypher documentation for advanced queries.

---

**Problem: Memory/performance issues with large datasets**

**Solution:**
1. Use `--no-graph` for faster ingestion when graph features aren't needed
2. Ingest in smaller batches
3. Increase system memory allocation
4. Use `--legacy` mode for simpler processing

---

**Problem: MCP server not responding**

**Solution:**
1. Ensure server is built: `npm run build`
2. Test manually: `node dist/mcp/server.js`
3. Check Claude Code MCP registration: `claude mcp list`
4. Re-register with correct path

---

### Getting Help

- **Documentation:** Check `/workspaces/ranger/README.md`
- **Examples:** See command examples in this guide
- **Status Check:** Run `rkm status --full` for diagnostics
- **Issues:** Report bugs to the project repository

---

## Performance Tips

### Ingestion Performance

- Use batch ingestion instead of individual files
- Disable graph building (`--no-graph`) when not needed
- Use `--legacy` mode for simpler documents

### Query Performance

- Start with small `-k` values and increase if needed
- Use `--vector-weight 1.0` to skip graph traversal for faster results
- Cache frequently-used queries
- Limit graph depth (`--graph-depth 1`) for faster traversal

### Storage Optimization

- Regular vector store is ~1.5KB per document
- Graph store adds ~500 bytes per relationship
- For 1000 documents with 3 relationships each:
  - Vector: ~1.5MB
  - Graph: ~1.5MB
  - Total: ~3MB

---

## Best Practices

1. **Consistent Tagging** - Use meaningful, consistent tags for easier filtering
2. **Incremental Ingestion** - Ingest new documents regularly rather than bulk updates
3. **Monitor Learning** - Check `rkm status --full` periodically to track learning progress
4. **Test Queries** - Use `rkm route --verbose` to understand query routing before execution
5. **Backup Data** - Regularly backup `./ruvector.db` and `./data/` directories
6. **Version Control** - Track your ingestion scripts and query patterns
7. **Resource Management** - Close memory properly in scripts: `memory.close()`

---

## Appendix: Command Reference

### Global Options

```bash
rkm --db <path>          # Vector database path (default: ./ruvector.db)
rkm --data-dir <path>    # Graph directory (default: ./data)
rkm --dims <number>      # Embedding dimensions (default: 384)
rkm --no-cognitive       # Disable SONA/GNN features
```

### Commands

```bash
rkm ingest --path <path> [--tag <tag>] [--legacy] [--no-graph]
rkm query "<text>" [-k <num>] [--show-related] [--legacy]
rkm search "<text>" [-k <num>] [--format json|text|markdown] [--rerank]
rkm graph "<cypher>" [--format json|summary]
rkm context "<text>" [-k <num>] [--max-chars <num>]
rkm status [--full] [--json] [--router]
rkm route "<query>" [--verbose]
rkm learn [--force]
```

---

**End of User Guide**

For the latest updates and advanced usage, refer to the project documentation and source code.
