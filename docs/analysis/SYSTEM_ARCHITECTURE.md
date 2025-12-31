# Research Knowledge Manager - System Architecture Analysis

**Version:** 0.1.0
**Date:** 2025-12-30
**Analyst:** System Architect Agent

---

## Executive Summary

The Research Knowledge Manager (RKM) is a sophisticated knowledge management system that combines vector search, graph databases, and AI-powered cognitive learning. The architecture follows a **layered, modular design** with clear separation of concerns and three primary integration points: CLI, REST API, and MCP server.

**Key Architectural Characteristics:**
- **Pattern:** Layered architecture with modular components
- **Technology Stack:** TypeScript, Express 5, SQLite (better-sqlite3), RuVector
- **Total Components:** 45 TypeScript modules across 5 major subsystems
- **Integration Interfaces:** 3 (CLI, REST API, MCP)
- **Core Innovation:** Unified Memory Architecture combining vector + graph + cognitive learning

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTEGRATION LAYER                             │
├─────────────┬─────────────────────┬─────────────────────────────────┤
│   CLI       │    REST API         │    MCP Server                   │
│ (cli.ts)    │  (api/server.ts)    │  (mcp/server.ts)                │
│             │                     │                                  │
│ Commands:   │  Endpoints:         │  Tools:                         │
│ - ingest    │  - /api/collections │  - ruvector_search              │
│ - query     │  - /api/documents   │  - ruvector_hybrid_search       │
│ - search    │  - /api/chat        │  - ruvector_graph_query         │
│ - graph     │  - /api/metrics     │  - cognitive_begin_trajectory   │
│ - status    │  - /api/pyramid     │  - cognitive_rerank             │
│ - learn     │  - /api/alignment   │  - sona_* (legacy)              │
└─────────────┴─────────────────────┴─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED MEMORY FACADE                             │
│                    (memory/index.ts)                                 │
│                                                                      │
│  Purpose: Single interface coordinating vector, graph, cognitive    │
│  Key Operations:                                                     │
│    - addDocument()     → Updates BOTH vector + graph atomically     │
│    - search()          → Hybrid vector + graph search               │
│    - beginTrajectory() → Cognitive learning loop                    │
└──────────┬──────────────────────┬────────────────────┬──────────────┘
           ▼                      ▼                    ▼
┌──────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
│  VECTOR STORE    │  │   GRAPH STORE       │  │ COGNITIVE ENGINE │
│ (vectorStore.ts) │  │  (graphStore.ts)    │  │  (cognitive.ts)  │
│                  │  │                     │  │                  │
│ RuVector DB      │  │ SQLite (nodes/edges)│  │ SONA + GNN       │
│ - Embeddings     │  │ - 11 node types     │  │ - Trajectories   │
│ - HNSW Index     │  │ - 10 edge types     │  │ - Patterns       │
│ - Tiered Storage │  │ - Cypher-like query │  │ - Reranking      │
│ - 384 dims       │  │ - Graph traversal   │  │ - Active learning│
└──────────────────┘  └─────────────────────┘  └──────────────────┘
           ▲                      ▲                    ▲
           └──────────────────────┴────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPPORTING SUBSYSTEMS                            │
├─────────────────────┬────────────────────────┬──────────────────────┤
│  INGESTION PIPELINE │   PKA-STRAT ALIGNMENT  │  SEMANTIC TOOLS      │
│                     │                        │                      │
│ - reader.ts         │ - memory.ts (PKA Mgr)  │ - router.ts          │
│ - parser.ts         │ - alignment/calc.ts    │ - context.ts         │
│ - graphBuilder.ts   │ - alignment/drift.ts   │                      │
│                     │ - types.ts (Pyramid)   │                      │
│ Formats:            │                        │ Routes:              │
│ - Markdown          │ Pyramid Levels:        │ - Vector search      │
│ - JSON/JSONL        │ - Organization         │ - Graph query        │
│ - Text              │ - Mission/Vision       │ - Hybrid search      │
│ - Auto-detect       │ - Objectives/Goals     │ - Multi-stage        │
│                     │ - Programs/Projects    │                      │
└─────────────────────┴────────────────────────┴──────────────────────┘
