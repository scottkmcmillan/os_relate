# Backlog

## Completed (2025-12-22 Hive-Mind Review)

- [x] Deep Claude-Flow integration so Claude-Flow agents can query/store RuVector during runs
  - [x] MCP tool/server that exposes: search, get, ingest, stats, context export (28 tools implemented)
  - [x] Enable Claude-Flow to pull RuVector context automatically for planning/research steps
- [x] Integrate RuVector learning subsystems into retrieval pipeline
  - [x] SONA: learn from query->result->user feedback and improve future retrieval
  - [x] GNN: differentiable re-ranking with attention-based reranking

## Higher priority

- Expose full RuVector surface area in the CLI (db/embed/gnn/attention/agentdb/sona)
- Add an internal reusable library module (`src/ruvector/*`) so CLI + future integrations share the same code

- AgentDB integration (deferred)
  - Store and query trajectories/episodes from Claude-Flow runs
  - Define reward/quality signals and replay strategy

## Medium priority

- Add `rkm research` wrapper command to run `claude-flow` and then automatically ingest produced artifacts
- Add a `rkm watch` command to watch a directory (Claude-Flow workspace) and auto-ingest new outputs continuously
- Add chunking + metadata enrichment pipeline for better RAG
  - split markdown into sections/chunks
  - store citations, urls, tags, project name

## Lower priority

- Add interactive mode (TUI) for browsing/querying and exporting context blocks
- Add exports: JSONL, markdown report synthesis, and "briefing packets"
- Add test suite + smoke tests for Windows + CI

---

## Future Work (Post-MVP) - Added 2024-12-22

*Items identified during hive-mind architecture review that are not required for MVP.*

### LLM integration for search and chat

### Claude-flow integration to make RKM agentic

### Embedding Layer Enhancements

- [ ] Implement proper ONNX embedding service (`@ruvector/onnx-embeddings`)
  - Replace hash-based fallback with semantic embeddings
  - Support models: `all-MiniLM-L6-v2`, `bge-small-en-v1.5`, `all-mpnet-base-v2`
  - Batch processing optimization
- [ ] Consolidate embedding service files (remove duplication between `src/embed.ts` and `src/memory/embedding.ts`)

### Graph Store Improvements

- [ ] Migrate GraphStore from SQLite to native `@ruvector/graph-node`
  - Move from devDependencies to production dependencies
  - 10x performance improvement expected
  - Full Cypher query language support
- [ ] Implement full Cypher query parser (currently only 3 basic patterns)
- [ ] Add Concept node extraction (currently only Document/Section nodes)
- [ ] Implement NER-based edge detection for entity relationships

### Memory Layer Optimizations

- [ ] Activate tier management (`manageTiers()` scheduling)
  - Implement Hot→Warm→Cold promotion/demotion based on access patterns
  - Add compression for cold tier (PQ4/Binary)
- [ ] Implement adaptive compression for hot/cold data
- [ ] Add memory profiling for large knowledge bases (100K+ documents)

### Router Enhancements

- [ ] Upgrade SemanticRouter to neural routing with `@ruvector/tiny-dancer`
  - FastGRNN-based intent classification (<1ms)
  - Uncertainty estimation
  - Hot-reload capability
- [ ] Add route training capability based on usage patterns

### Testing & Validation (Phase 6)

- [ ] Write integration tests for full ingestion loop
  - Test: Ingest file → Vector search → Graph query
  - Verify SONA learning loop updates weights
  - Router intent classification accuracy
- [ ] Add performance benchmarks
  - Vector search latency (<1ms target)
  - Graph traversal performance
  - Memory usage with dual store
  - Ingestion speed with graph overhead
- [ ] Add CI/CD pipeline for automated testing

### MCP Server Enhancements

- [ ] Add MCP tools for document ingestion (currently CLI-only)
- [ ] Add real-time learning statistics streaming
- [ ] Implement batch document ingestion optimization
- [ ] Add query result caching layer

### Advanced Features

- [ ] Horizontal scaling via Raft Consensus (`ruvector-raft`)
- [ ] Auto-sharding for distributed deployment (`ruvector-cluster`)
- [ ] Multi-agent coordination hooks via shared memory
- [ ] Real-time file watching with automatic re-ingestion
