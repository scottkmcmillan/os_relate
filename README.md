# Research Knowledge Manager (RKM)

A **Cognitive Knowledge Graph** CLI and API for intelligent research organization, combining vector embeddings, graph databases, and reinforcement learning.

## Features

- **Hybrid Search**: Combines semantic similarity (vector) with structural relationships (graph)
- **Knowledge Graph**: SQLite-based graph with Cypher-like query support
- **Active Learning**: SONA (Self-Optimizing Neural Attention) for continuous improvement
- **Multiple Interfaces**: CLI, MCP server (26 tools), REST API
- **Claude Integration**: Native support for Claude Code and Claude-Flow workflows

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
npm install
npm run build
```

## Quick Start

### 1. Ingest Research Documents

```bash
# Ingest with knowledge graph building
node dist/cli.js ingest --path ./research --tag my-project

# Vector-only mode (legacy)
node dist/cli.js ingest --path ./research --legacy
```

Supported formats: `.md`, `.txt`, `.json`, `.jsonl`

### 2. Search Your Knowledge Base

```bash
# Hybrid search (vector + graph)
node dist/cli.js search "machine learning architectures" -k 10

# With GNN reranking
node dist/cli.js search "neural networks" --rerank

# Show related nodes from graph
node dist/cli.js query "transformers" --show-related
```

### 3. Query the Knowledge Graph

```bash
# Find all documents
node dist/cli.js graph "MATCH (n:Document) RETURN n"

# Find citations
node dist/cli.js graph "MATCH (a)-[:CITES]->(b) RETURN a, b"
```

### 4. Export Context for Claude

```bash
node dist/cli.js context "background on topic X" -k 6 --max-chars 12000
```

### 5. Check System Status

```bash
node dist/cli.js status --full --router
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `ingest` | Ingest files into cognitive knowledge graph |
| `query` | Semantic search with optional graph exploration |
| `search` | Advanced hybrid search (vector + graph) |
| `graph` | Execute Cypher-like graph queries |
| `route` | Analyze query intent and suggest execution strategy |
| `context` | Export Claude-ready context blocks |
| `status` | Show system capabilities and statistics |
| `learn` | Trigger SONA learning from trajectories |

## MCP Server Integration

Register with Claude Code:

```bash
# Windows
claude mcp add ruvector-memory "cmd" "/c" "node dist\\mcp\\server.js"

# Linux/macOS
claude mcp add ruvector-memory node $(pwd)/dist/mcp/server.js
```

### Available MCP Tools (26 total)

**Core Search:**
- `ruvector_hybrid_search` - Vector + graph hybrid search
- `ruvector_graph_query` - Cypher-like graph queries
- `ruvector_graph_traverse` - Graph relationship navigation
- `ruvector_route` - Semantic query routing

**Document Management:**
- `ruvector_add_document` - Add document to vector + graph
- `ruvector_add_relationship` - Create graph edges
- `ruvector_delete_document` - Remove from both stores

**SONA Learning:**
- `sona_begin` / `cognitive_begin_trajectory` - Start learning trajectory
- `sona_step` / `cognitive_record_step` - Record step with reward
- `sona_end` / `cognitive_end_trajectory` - End with quality score
- `sona_learn` / `cognitive_force_learn` - Trigger learning cycle
- `sona_patterns` / `cognitive_find_patterns` - Pattern matching

**GNN Reranking:**
- `gnn_available` - Check GNN availability
- `gnn_rerank` - Neural reranking of candidates

**Legacy Compatible:**
- `ruvector_search` - Vector-only search
- `ruvector_context` - Context block generation
- `ruvector_status` - System capabilities

### Using from Claude-Flow Agents

```text
Before making a plan, call ruvector_hybrid_search with the project topic.
Use ruvector_graph_traverse to explore related documents.

During the run, record a learning trace:
- Call sona_begin with the research goal
- After each major step, call sona_step with summary and reward (0-1)
- At the end, call sona_end with an overall quality score
```

## REST API

Start the API server:

```bash
npm run api        # Production
npm run api:dev    # Development (watch mode)
```

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/collections` | POST | Create collection |
| `/api/collections` | GET | List collections |
| `/api/collections/:name/search` | POST | Hybrid search |
| `/api/documents/upload` | POST | Upload file |
| `/api/chat` | POST | RAG-powered chat |
| `/api/metrics` | GET | Performance metrics |

## Architecture

The system uses a three-layer cognitive architecture:

```
┌─────────────────────────────────────────────────┐
│              UNIFIED MEMORY                      │
│  Facade for atomic vector + graph operations     │
└───────────┬─────────────┬─────────────┬─────────┘
            │             │             │
   ┌────────▼────┐ ┌──────▼──────┐ ┌────▼────────┐
   │ Vector Store│ │ Graph Store │ │  Cognitive  │
   │  (ruvector) │ │  (SQLite)   │ │   Engine    │
   │  384-dim    │ │  Cypher-like│ │ SONA + GNN  │
   └─────────────┘ └─────────────┘ └─────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## Configuration

### CLI Options

```bash
--db <path>         # Vector database (default: ./ruvector.db)
--data-dir <path>   # Graph data directory (default: ./data)
--dims <number>     # Embedding dimensions (default: 384)
--no-cognitive      # Disable SONA/GNN features
```

### Environment Variables

```bash
CORS_ORIGIN=*       # CORS allowed origins
PORT=3000           # API server port
```

## Dependencies

**Core:**
- `ruvector` - Vector database with WASM acceleration
- `better-sqlite3` - Graph database
- `@modelcontextprotocol/sdk` - MCP server
- `express` - HTTP API
- `commander` - CLI framework

**Optional:**
- `@ruvector/gnn` - Neural reranking
- `@ruvector/attention` - Attention mechanisms
- `claude-flow` - Claude-Flow orchestration

## Scripts

```bash
npm run dev          # CLI development mode
npm run build        # Build TypeScript
npm start            # Run CLI
npm run mcp          # Start MCP server
npm run api          # Start API server
npm test             # Run tests
npm run test:ui      # Interactive test UI
```

## Claude-Flow Integration

```bash
# Install Claude Code and Claude-Flow globally
npm install -g @anthropic-ai/claude-code
npm install -g claude-flow@alpha

# Initialize Claude-Flow
claude-flow init

# Run research, then ingest results
npx claude-flow@alpha research "your topic"
node dist/cli.js ingest --path ./outputs --tag claude-flow

# Query and export for next task
node dist/cli.js context "findings about X" -k 10
```

## Development

```bash
# Run tests
npm test

# Test with UI
npm run test:ui

# Build and verify
npm run verify
```

## Backlog

See [BACKLOG.md](./BACKLOG.md) for planned features.

## License

Private - All rights reserved.
