# Development Plan: Ranger Refactor (RKM v2)

This plan outlines the steps to refactor the current `ranger` codebase into the **Cognitive Knowledge Graph** architecture defined in `ARCHITECTURE.md`.

## Phase 1: Foundation & Structure

**Goal**: Prepare the directory structure and ensure dependencies are ready for the hybrid architecture.

1.  **Dependency Audit**:
    *   Verify `ruvector` exports required for Graph and Routing.
    *   Add specific packages if needed: `@ruvector/sona`, `@ruvector/graph-node`, `@ruvector/tiny-dancer`, `@ruvector/onnx-embeddings`.
    *   Update `package.json`.

2.  **Directory Restructuring**:
    *   Create the new folder hierarchy:
        ```text
        src/
        ├── ingestion/
        ├── memory/
        ├── tools/
        ├── mcp/
        └── cli.ts
        ```
    *   Move existing files to temporary locations or rename them to preserve logic during the transition.

## Phase 2: Core Memory Layer

**Goal**: Implement the "Hybrid Knowledge Store" (Vector + Graph).

3.  **Refactor Vector Store (`src/memory/vectorStore.ts`)**:
    *   Migrate logic from `ruvectorDb.ts`.
    *   Ensure strict typing for metadata.
    *   Implement the "Hot/Warm/Cold" tiering strategy (initially just by structure, later by compression).

4.  **Implement Graph Store (`src/memory/graphStore.ts`)**:
    *   Initialize `GraphDB` connection.
    *   Implement basic Cypher query execution methods.
    *   Create helper methods for node/edge creation (`createDocumentNode`, `createRelation`).

5.  **Unified Memory Interface (`src/memory/index.ts`)**:
    *   Create a facade that allows atomic operations (e.g., "Add Document" adds to both Vector and Graph stores).

## Phase 3: Cognitive Layer

**Goal**: Enable Active Learning and Semantic Routing.

6.  **Implement Cognitive Engine (`src/memory/cognitive.ts`)**:
    *   Migrate `sonaEngine.ts`.
    *   Integrate the GNN Layer for reranking search results.
    *   Implement `sona_begin`, `sona_step`, `sona_end` logic connecting to the RL engine.

7.  **Implement Router (`src/tools/router.ts`)**:
    *   Initialize the "Tiny Dancer" (FastGRNN) or Semantic Router.
    *   Define routes: `RETRIEVAL`, `RELATIONAL`, `SUMMARY`.
    *   Create the `routeQuery(query: string)` function.

## Phase 4: Data Processing Pipeline

**Goal**: Upgrade ingestion to support graph construction.

8.  **Enhanced Ingestion (`src/ingestion/`)**:
    *   **Reader (`reader.ts`)**: Standardize file walking (migrate from `ingest.ts`).
    *   **Parser (`parser.ts`)**: Clean text, extract metadata.
    *   **Graph Builder (`graphBuilder.ts`)**:
        *   Implement logic to detect links/citations.
        *   Create methods to derive edges (e.g., `[:CITES]`, `[:PARENT_OF]`).

9.  **Embedding Service Upgrade (`src/memory/embedding.ts`)**:
    *   Switch to `ruvector-onnx-embeddings` (if not already using the optimal local provider).
    *   Ensure consistent dimensions across all services.

## Phase 5: Application Layer Integration

**Goal**: Expose new capabilities to Users and Agents.

10. **MCP Server Upgrade (`src/mcp/server.ts`)**:
    *   Refactor `ruvector_search` to use the Unified Memory (Vector + Graph).
    *   Add `ruvector_graph_query` tool (Cypher).
    *   Add `ruvector_route` tool.
    *   Update SONA tools to use the new `cognitive.ts` module.

11. **CLI Refactor (`src/cli.ts`)**:
    *   Update `ingest` command to use the new pipeline.
    *   Update `query` command to show Graph results (if applicable).
    *   Add `status` command to show SONA learning stats.

## Phase 6: Testing & Validation

12. **Integration Tests**:
    *   Test the full loop: Ingest a file -> Query via Vector -> Query via Graph.
    *   Verify SONA learning loop (reward signals update weights).

13. **Performance Tuning**:
    *   Check memory usage with the dual store.
    *   Verify ingestion speed with graph overhead.