# Document Ingestion Pipeline Specification
## PKA-STRAT System

**Document Version:** 1.0
**Date:** 2025-12-28
**Status:** Specification Phase
**Author:** SPARC Specification Agent

---

## 1. Introduction

### 1.1 Purpose

This specification defines the Document Ingestion Pipeline for PKA-STRAT—a comprehensive system for transforming organizational documents into semantically enriched, strategically aligned knowledge assets. The pipeline serves as the foundational intelligence layer, converting raw documents (PDFs, Word files, spreadsheets, text files) into a computable model of organizational strategy, execution, and alignment.

### 1.2 Scope

The Document Ingestion Pipeline encompasses:

1. **Upload Interface**: Multi-format document upload with batch processing
2. **Document Processing**: Format conversion, OCR, and text extraction
3. **Classification & Categorization**: Automatic document type identification and hierarchy placement
4. **Semantic Embedding**: Ruvector-based hypergraph construction for strategic reasoning
5. **Metadata Extraction**: Author, date, version, classification, and provenance tracking
6. **Story Extraction**: Narrative linkage from execution documents to strategic objectives
7. **Storage Architecture**: Layered storage for raw documents, processed chunks, and embeddings
8. **API Endpoints**: RESTful and streaming interfaces for document operations

### 1.3 System Context

PKA-STRAT is a **document-centric web application** where ALL organizational intelligence flows through intentional document uploads. The system does NOT access emails, calendars, messaging platforms, or other invasive data sources. This design ensures:

- **Data sovereignty**: Organizations control what the system knows
- **Privacy compliance**: No automated surveillance or monitoring
- **Controlled context boundaries**: Explicit knowledge boundaries
- **Strategic governance**: Leaders define direction, teams execute with visibility

The ingestion pipeline is the **SOLE interface** between the organization's knowledge and PKA-STRAT's analytical capabilities.

### 1.4 Definitions

- **Document**: Any uploaded file containing organizational knowledge (PDF, DOCX, XLSX, TXT, MD)
- **Chunk**: Semantically coherent segment of a document (paragraphs, sections, tables)
- **Embedding**: Vector representation of chunk meaning in hypergraph space
- **Story**: Extracted narrative linking execution work to strategic objectives
- **Provenance**: L-Score tracking from document to strategic source
- **Pyramid Level**: Position in the Pyramid of Clarity hierarchy (Mission → Vision → Objectives → Goals → Portfolios → Programs → Projects → Tasks)

---

## 2. Functional Requirements

### 2.1 Document Upload Interface (FR-UPLOAD)

#### FR-UPLOAD-001: Multi-Format Support
**Priority**: High
**Description**: System shall accept documents in multiple formats.

**Acceptance Criteria**:
- Support PDF files (including scanned/image PDFs)
- Support Microsoft Office formats (DOCX, XLSX, PPTX)
- Support plain text formats (TXT, MD, CSV)
- Support image formats with text (PNG, JPG) via OCR
- Reject unsupported formats with clear error messages
- Maximum file size: 100MB per document
- Maximum batch upload: 50 documents simultaneously

#### FR-UPLOAD-002: Web Upload Interface
**Priority**: High
**Description**: System shall provide a responsive web interface for document upload.

**Acceptance Criteria**:
- Drag-and-drop file upload
- Multi-file selection via file browser
- Upload progress indicators with percentage complete
- Ability to cancel in-progress uploads
- Resume capability for interrupted uploads
- Mobile-responsive design (tablet and desktop)

#### FR-UPLOAD-003: Batch Processing
**Priority**: High
**Description**: System shall process multiple documents concurrently with queue management.

**Acceptance Criteria**:
- Process up to 10 documents in parallel
- Queue excess documents with visible queue position
- Estimated time-to-completion based on document size
- Email/notification on batch completion
- Detailed processing logs per document

#### FR-UPLOAD-004: Document Metadata Capture
**Priority**: High
**Description**: System shall capture metadata at upload time.

**Acceptance Criteria**:
- User-provided document type selection (Leadership, Organizational, Execution, Market Intelligence)
- Optional fields: Title, Author, Date, Department, Tags
- Automatic capture: Upload timestamp, Uploader identity, File size, Format
- Ability to edit metadata post-upload
- Bulk metadata application for batch uploads

#### FR-UPLOAD-005: API Upload Endpoint
**Priority**: Medium
**Description**: System shall provide programmatic upload via REST API.

**Acceptance Criteria**:
- POST /api/v1/documents/upload endpoint
- Multipart form data support
- API key authentication
- Rate limiting: 100 uploads per hour per user
- JSON response with document ID and processing status

### 2.2 Document Processing Workflow (FR-PROCESS)

#### FR-PROCESS-001: Format Conversion
**Priority**: High
**Description**: System shall convert all document formats to normalized intermediate representation.

**Acceptance Criteria**:
- PDF → Extracted text with layout preservation
- DOCX → Structured text with heading hierarchy
- XLSX → Table extraction with column/row metadata
- TXT/MD → UTF-8 normalized text
- PPTX → Slide-by-slide text extraction
- Preserve document structure (headings, lists, tables, footnotes)

#### FR-PROCESS-002: OCR for Scanned Documents
**Priority**: High
**Description**: System shall apply OCR to image-based PDFs and image files.

**Acceptance Criteria**:
- Automatic detection of scanned PDFs (no selectable text)
- OCR processing with Tesseract 5.0+ or equivalent
- Confidence scores per text block (minimum 85% confidence)
- Flagging of low-confidence extractions for manual review
- Multi-language support (English, Spanish, French, German)
- Layout analysis for tables and multi-column documents

#### FR-PROCESS-003: Text Normalization
**Priority**: Medium
**Description**: System shall normalize extracted text for consistent processing.

**Acceptance Criteria**:
- UTF-8 encoding standardization
- Whitespace normalization (remove extra spaces, standardize line breaks)
- Special character handling (preserve meaning, remove artifacts)
- Hyphenation correction (end-of-line breaks)
- Header/footer removal (repeating page elements)
- Watermark text filtering

#### FR-PROCESS-004: Document Validation
**Priority**: High
**Description**: System shall validate document quality and flag issues.

**Acceptance Criteria**:
- Minimum text length: 100 characters (flag empty or near-empty documents)
- Language detection (flag non-English documents if unsupported)
- Corruption detection (unreadable files)
- OCR quality assessment (flag low-confidence extractions)
- Duplicate detection (compare against existing documents via hash)
- Generate validation report accessible to uploader

### 2.3 Classification & Categorization (FR-CLASSIFY)

#### FR-CLASSIFY-001: Document Type Classification
**Priority**: High
**Description**: System shall automatically classify documents into Pyramid of Clarity categories.

**Acceptance Criteria**:
- Primary categories: Leadership, Organizational, Execution, Market Intelligence
- Sub-categories per primary:
  - **Leadership**: Mission, Vision, Strategic Objectives, OKRs, Board Decks, Strategic Memos
  - **Organizational**: Product Specs, Product Roadmaps, Org Charts, Role Descriptions, Team Charters, Process Documentation
  - **Execution**: Program Briefs, Project Plans, Research Reports, Sprint Reports, Retrospectives, Outcome Documentation
  - **Market Intelligence**: Analyst Reports, Competitive Analyses, White Papers, Market Research
- Confidence score per classification (0-100%)
- Human override capability with audit trail
- Multi-label classification (document can belong to multiple sub-categories)

#### FR-CLASSIFY-002: Pyramid Level Assignment
**Priority**: High
**Description**: System shall map documents to Pyramid of Clarity levels.

**Acceptance Criteria**:
- Pyramid levels: Mission, Vision, Strategic Objectives, Goals/OKRs, Portfolios, Programs, Projects, Tasks
- Automatic level assignment based on document type
- Support for hierarchical relationships (Projects → Programs → Portfolios)
- Visual pyramid representation showing document distribution
- API to query documents by pyramid level

#### FR-CLASSIFY-003: Intent & Purpose Detection
**Priority**: Medium
**Description**: System shall detect document intent (Define, Execute, Report, Analyze).

**Acceptance Criteria**:
- Intent taxonomy:
  - **Define**: Mission statements, strategic plans, specifications
  - **Execute**: Project plans, task lists, implementation guides
  - **Report**: Status updates, retrospectives, outcome documentation
  - **Analyze**: Research reports, competitive analyses, data studies
- Intent influences downstream processing (execution docs trigger story extraction)
- Multiple intents per document supported

#### FR-CLASSIFY-004: Strategic Domain Tagging
**Priority**: Medium
**Description**: System shall tag documents with strategic domains.

**Acceptance Criteria**:
- Auto-detected tags: Product, Engineering, Marketing, Sales, Operations, Finance, HR, Legal
- Custom tag creation by administrators
- Tag hierarchy support (parent-child relationships)
- Tag-based search and filtering
- Tag co-occurrence analysis (which domains frequently interact)

### 2.4 Semantic Embedding Generation (FR-EMBED)

#### FR-EMBED-001: Semantic Chunking
**Priority**: High
**Description**: System shall segment documents into semantically coherent chunks.

**Acceptance Criteria**:
- Chunking strategies:
  - **Paragraph-based**: Preserve natural text boundaries
  - **Section-based**: Respect document structure (headings)
  - **Sliding window**: For dense documents (512-1024 token windows with 128 token overlap)
  - **Table-based**: Extract tables as discrete units
- Chunk size: 256-1024 tokens (configurable per document type)
- Maintain document context (chunk metadata includes document title, section hierarchy)
- Preserve cross-chunk references (footnotes, citations)

#### FR-EMBED-002: Ruvector Embedding Generation
**Priority**: High
**Description**: System shall generate Ruvector embeddings for semantic search and hypergraph construction.

**Acceptance Criteria**:
- Use Ruvector embedding API/library
- Generate embeddings per chunk (vector dimension per Ruvector spec, typically 768-1536)
- Batch embedding generation (process chunks in batches of 100)
- Embedding quality validation (detect degenerate embeddings)
- Store embeddings in Ruvector vector database

#### FR-EMBED-003: Hypergraph Construction
**Priority**: High
**Description**: System shall construct causal hypergraphs linking strategic concepts.

**Acceptance Criteria**:
- Hypergraph nodes: Chunks, Extracted entities (objectives, projects, initiatives)
- Hyperedges: Multi-entity relationships (e.g., {Product Feature X} ↔ {Q3 Revenue Goal} ↔ {Sustainability Mission})
- Edge types:
  - **Supports**: Execution supports objective
  - **Derives-from**: Objective derives from vision
  - **Conflicts-with**: Competing priorities
  - **Informs**: Research informs decision
- Use GNN-based relationship discovery (Ruvector capability)
- Hypergraph stored in ReasoningBank (SQLite + graph layer)

#### FR-EMBED-004: Cross-Document Relationship Discovery
**Priority**: Medium
**Description**: System shall discover semantic relationships across documents.

**Acceptance Criteria**:
- Cluster similar chunks across documents (thematic clustering)
- Identify duplicate or near-duplicate content (deduplication)
- Detect causal chains (Document A mentions initiative → Document B reports outcome)
- Citation analysis (explicit references between documents)
- Temporal relationship tracking (earlier strategy → later execution)

### 2.5 Metadata Extraction (FR-META)

#### FR-META-001: Structural Metadata
**Priority**: High
**Description**: System shall extract structural metadata from documents.

**Acceptance Criteria**:
- Heading hierarchy (H1, H2, H3...)
- Table of contents extraction (if present)
- Section boundaries and titles
- List structures (ordered, unordered)
- Table schemas (column headers, row count)
- Image/chart locations (for future visual processing)

#### FR-META-002: Temporal Metadata
**Priority**: High
**Description**: System shall extract and normalize temporal information.

**Acceptance Criteria**:
- Document creation date (from file metadata)
- Explicit dates mentioned in text (e.g., "Q3 2024", "March 15, 2023")
- Temporal expressions (e.g., "last quarter", "next year")
- Normalize to ISO 8601 format
- Associate dates with relevant chunks (e.g., milestone dates in project plans)
- Timeline construction for strategic initiatives

#### FR-META-003: Entity Extraction
**Priority**: High
**Description**: System shall extract named entities relevant to organizational strategy.

**Acceptance Criteria**:
- Entity types:
  - **People**: Names, roles, departments
  - **Organizations**: Company names, partners, competitors
  - **Products**: Product names, features, versions
  - **Initiatives**: Project names, program titles, objectives
  - **Metrics**: KPIs, OKRs, goals (with target values)
  - **Locations**: Offices, markets, regions
- Use NER (Named Entity Recognition) models fine-tuned for business language
- Confidence scores per entity (minimum 80%)
- Entity disambiguation (resolve "Smith" to "John Smith, VP Engineering")
- Entity linking (connect same entity across documents)

#### FR-META-004: Provenance Tracking
**Priority**: High
**Description**: System shall track document provenance with L-Score calculation.

**Acceptance Criteria**:
- Provenance chain: Document → Uploader → Source (if external)
- L-Score calculation: Quantifies "strategic distance" from mission statement
- L-Score formula: $L(d) = \min(\text{hops from } d \text{ to Mission document in hypergraph})$
- Track document versions (edits, updates)
- Audit trail: Who uploaded, when, from where (IP/location if available)
- Lineage tracking: If document references other documents, record dependency

#### FR-META-005: Classification Metadata
**Priority**: Medium
**Description**: System shall extract classification and sensitivity metadata.

**Acceptance Criteria**:
- Detect classification markings (e.g., "Confidential", "Internal Only", "Public")
- Compliance tags (e.g., "GDPR-relevant", "SOC2-controlled")
- Auto-detect sensitivity indicators (mentions of financials, personnel data, legal matters)
- Apply default classification based on document type (Leadership docs default to "Internal")
- Allow manual override with justification

### 2.6 Story Extraction (FR-STORY)

#### FR-STORY-001: Execution Document Story Extraction
**Priority**: High
**Description**: System shall extract narrative "stories" from execution documents linking work to strategic objectives.

**Acceptance Criteria**:
- Target document types: Program Briefs, Project Plans, Research Reports, Outcome Documentation
- Story components:
  - **What**: What was done (extracted objectives, deliverables)
  - **Why**: Why it was done (extracted goals, motivations)
  - **How**: How it was accomplished (extracted methods, approaches)
  - **Outcome**: What was achieved (extracted results, metrics)
  - **Strategic Link**: Which strategic objective it supports (via hypergraph relationship)
- Story confidence score (0-100%) based on completeness of components
- Stories stored as structured data (JSON) linked to source document

#### FR-STORY-002: Strategic Objective Mapping
**Priority**: High
**Description**: System shall map execution stories to strategic objectives.

**Acceptance Criteria**:
- Semantic similarity matching: Execution story embedding vs. Strategic objective embedding
- Hypergraph traversal: Find shortest path from execution document to strategic objective document
- Multi-objective mapping: Story can support multiple objectives
- Alignment score: Quantify strength of link (0.0 to 1.0)
- Visual mapping in UI: Show story-to-objective connections

#### FR-STORY-003: Narrative Generation
**Priority**: Medium
**Description**: System shall generate human-readable narrative summaries of stories.

**Acceptance Criteria**:
- Template-based generation: "Project X [what] was initiated to [why], achieving [outcome] in support of Strategic Objective Y [strategic link]."
- LLM-based enrichment: Use Claude/GPT to enhance narrative quality
- Story aggregation: Combine multiple related stories into cohesive narrative
- Board-ready summaries: Generate executive-level story summaries
- Citation of source documents in narratives

#### FR-STORY-004: Story Provenance & Verification
**Priority**: High
**Description**: System shall provide verifiable provenance for each story.

**Acceptance Criteria**:
- L-Score for stories: Calculate strategic distance from mission
- Source document links: Direct access to originating documents
- Chunk-level citations: Link story components to specific document chunks
- Verification status: Unverified, AI-Generated, Human-Verified
- Allow manual editing/correction of stories with audit trail

### 2.7 Storage Architecture (FR-STORAGE)

#### FR-STORAGE-001: Raw Document Storage
**Priority**: High
**Description**: System shall store original uploaded documents immutably.

**Acceptance Criteria**:
- Local file storage backend (`./data/documents/`)
- Immutable storage: Original files never modified
- Versioning support: If document re-uploaded, store as new version
- Retention policy: Configurable (default: indefinite retention)
- Compression: Optional gzip compression for text-heavy formats
- Encryption at rest: AES-256 encryption
- Backup strategy: Daily incremental, weekly full backups

#### FR-STORAGE-002: Processed Chunk Storage
**Priority**: High
**Description**: System shall store processed text chunks with metadata.

**Acceptance Criteria**:
- Database: PostgreSQL (primary storage) or MongoDB (document-oriented alternative)
- Schema:
  ```sql
  TABLE chunks (
    chunk_id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    chunk_index INT,
    chunk_text TEXT,
    chunk_tokens INT,
    chunk_type VARCHAR(50), -- paragraph, section, table
    section_hierarchy JSONB, -- [{"level": 1, "title": "Introduction"}, ...]
    metadata JSONB,
    created_at TIMESTAMP,
    l_score FLOAT
  )
  ```
- Indexing: Full-text search index on chunk_text (PostgreSQL tsvector or Elasticsearch)
- Partitioning: Partition by document_id for large-scale deployments

#### FR-STORAGE-003: Embedding & Hypergraph Storage
**Priority**: High
**Description**: System shall store embeddings and hypergraph structures in Ruvector.

**Acceptance Criteria**:
- Ruvector database integration
- Embedding storage: Vector per chunk (768-1536 dimensions)
- Hypergraph storage: ReasoningBank (SQLite + graph layer)
- Hypergraph schema:
  ```sql
  TABLE hypergraph_nodes (
    node_id UUID PRIMARY KEY,
    node_type VARCHAR(50), -- chunk, entity, objective
    node_data JSONB,
    embedding_id UUID -- link to Ruvector
  )

  TABLE hypergraph_edges (
    edge_id UUID PRIMARY KEY,
    edge_type VARCHAR(50), -- supports, derives-from, conflicts-with
    source_nodes UUID[], -- array of node_ids
    target_nodes UUID[], -- array of node_ids
    weight FLOAT,
    metadata JSONB
  )
  ```
- GNN-based index optimization (Ruvector capability)
- Min-cut monitoring: Use ruvector-mincut for graph structural integrity

#### FR-STORAGE-004: Metadata & Provenance Storage
**Priority**: High
**Description**: System shall store comprehensive metadata in relational database.

**Acceptance Criteria**:
- Database: PostgreSQL
- Schema:
  ```sql
  TABLE documents (
    id UUID PRIMARY KEY,
    title VARCHAR(500),
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    file_format VARCHAR(20),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP,
    document_type VARCHAR(100), -- Leadership.Mission, Execution.ProjectPlan, etc.
    pyramid_level VARCHAR(50),
    intent VARCHAR(50),
    tags TEXT[],
    classification VARCHAR(50),
    l_score FLOAT,
    processing_status VARCHAR(50), -- pending, processing, completed, failed
    storage_path TEXT, -- path to raw document in object storage
    metadata JSONB,
    version INT DEFAULT 1,
    parent_version_id UUID REFERENCES documents(id)
  )

  TABLE extracted_entities (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    chunk_id UUID REFERENCES chunks(chunk_id),
    entity_type VARCHAR(50),
    entity_text TEXT,
    normalized_value TEXT,
    confidence FLOAT,
    metadata JSONB
  )

  TABLE stories (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    what TEXT,
    why TEXT,
    how TEXT,
    outcome TEXT,
    strategic_link_objective_ids UUID[],
    alignment_scores FLOAT[],
    narrative TEXT,
    l_score FLOAT,
    confidence FLOAT,
    verification_status VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  )
  ```

#### FR-STORAGE-005: Cache Layer
**Priority**: Medium
**Description**: System shall implement caching for frequently accessed data.

**Acceptance Criteria**:
- Redis cache for:
  - Recently uploaded document metadata
  - Popular search queries and results
  - Frequently accessed chunks
  - User session data
- TTL policies: 1 hour for search results, 24 hours for document metadata
- Cache invalidation on document updates

### 2.8 API Endpoints (FR-API)

#### FR-API-001: Document Upload API
**Priority**: High
**Description**: RESTful API for document upload operations.

**Endpoints**:

```
POST /api/v1/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Request:
- file: (binary)
- document_type: string (optional, e.g., "Leadership.Mission")
- title: string (optional)
- metadata: JSON object (optional)

Response:
{
  "document_id": "uuid",
  "status": "processing",
  "estimated_completion_seconds": 120
}
```

**Acceptance Criteria**:
- Rate limiting: 100 uploads/hour per user
- Authentication required (JWT bearer token)
- Input validation (file size, format)
- Async processing (immediate response, background processing)

#### FR-API-002: Document Query API
**Priority**: High
**Description**: API for retrieving and searching documents.

**Endpoints**:

```
GET /api/v1/documents
Query Parameters:
- document_type: filter by type
- pyramid_level: filter by pyramid level
- tags: filter by tags (comma-separated)
- uploaded_after: ISO 8601 date
- uploaded_before: ISO 8601 date
- search: full-text search query
- limit: pagination limit (default 50)
- offset: pagination offset

Response:
{
  "total_count": 150,
  "documents": [
    {
      "id": "uuid",
      "title": "Q4 2024 Strategic Plan",
      "document_type": "Leadership.StrategicObjectives",
      "pyramid_level": "Strategic Objectives",
      "uploaded_at": "2024-10-01T12:00:00Z",
      "l_score": 0.05,
      "tags": ["2024", "Q4", "revenue-growth"]
    },
    ...
  ]
}

GET /api/v1/documents/{id}
Response:
{
  "id": "uuid",
  "title": "...",
  "metadata": {...},
  "download_url": "...",
  "chunks_count": 45,
  "stories_count": 8
}
```

#### FR-API-003: Story Retrieval API
**Priority**: High
**Description**: API for accessing extracted stories.

**Endpoints**:

```
GET /api/v1/stories
Query Parameters:
- document_id: filter by source document
- strategic_objective_id: filter by linked objective
- alignment_score_min: minimum alignment score
- verification_status: unverified, ai-generated, human-verified

Response:
{
  "stories": [
    {
      "id": "uuid",
      "what": "Launched new customer portal",
      "why": "Improve customer self-service capabilities",
      "how": "Agile development with React frontend",
      "outcome": "30% reduction in support tickets",
      "strategic_links": [
        {
          "objective_id": "uuid",
          "objective_title": "Enhance Customer Experience",
          "alignment_score": 0.89
        }
      ],
      "narrative": "The customer portal project...",
      "l_score": 0.15,
      "confidence": 0.85
    },
    ...
  ]
}
```

#### FR-API-004: Semantic Search API
**Priority**: High
**Description**: API for semantic search using Ruvector embeddings.

**Endpoints**:

```
POST /api/v1/search/semantic
Content-Type: application/json

Request:
{
  "query": "What are our sustainability initiatives?",
  "filters": {
    "document_types": ["Execution.ProjectPlan", "Execution.OutcomeDoc"],
    "pyramid_levels": ["Projects", "Programs"]
  },
  "top_k": 20,
  "include_chunks": true
}

Response:
{
  "results": [
    {
      "document_id": "uuid",
      "document_title": "Green Energy Transition Program",
      "chunk_id": "uuid",
      "chunk_text": "Our sustainability initiative focuses on...",
      "relevance_score": 0.92,
      "l_score": 0.12
    },
    ...
  ],
  "query_embedding_id": "uuid" // for debugging
}
```

#### FR-API-005: Processing Status API
**Priority**: Medium
**Description**: API for monitoring document processing status.

**Endpoints**:

```
GET /api/v1/documents/{id}/status
Response:
{
  "document_id": "uuid",
  "status": "processing",
  "progress_percent": 65,
  "stages": {
    "upload": "completed",
    "format_conversion": "completed",
    "text_extraction": "completed",
    "ocr": "not_applicable",
    "classification": "in_progress",
    "embedding_generation": "pending",
    "story_extraction": "pending"
  },
  "estimated_completion_seconds": 45,
  "errors": []
}

GET /api/v1/processing/queue
Response:
{
  "queue_length": 23,
  "processing_count": 10,
  "average_processing_time_seconds": 180
}
```

#### FR-API-006: Streaming API for Real-Time Updates
**Priority**: Low
**Description**: WebSocket API for real-time processing updates.

**Endpoints**:

```
WS /api/v1/documents/stream
Authorization: Bearer <token>

Client sends:
{
  "subscribe": ["document:uuid", "processing:all"]
}

Server sends:
{
  "event": "processing.progress",
  "document_id": "uuid",
  "progress_percent": 75,
  "stage": "embedding_generation"
}

{
  "event": "processing.completed",
  "document_id": "uuid",
  "stories_extracted": 5
}
```

---

## 3. Non-Functional Requirements

### 3.1 Performance (NFR-PERF)

#### NFR-PERF-001: Processing Throughput
**Category**: Performance
**Description**: System shall process documents within defined time bounds.

**Acceptance Criteria**:
- Small documents (<1MB, <50 pages): Process in <2 minutes
- Medium documents (1-10MB, 50-200 pages): Process in <10 minutes
- Large documents (10-50MB, 200-500 pages): Process in <30 minutes
- Extra-large documents (50-100MB, 500+ pages): Process in <60 minutes
- OCR-required documents: Add 50% to processing time
- Concurrent processing: Handle 10 documents simultaneously without degradation

#### NFR-PERF-002: API Response Time
**Category**: Performance
**Description**: API endpoints shall respond within latency bounds.

**Acceptance Criteria**:
- Simple GET requests (document metadata): p95 latency <100ms
- Search queries (semantic search): p95 latency <500ms
- Upload initiation: p95 latency <200ms
- Complex queries (multi-filter): p95 latency <1000ms
- Database queries optimized with indexes

#### NFR-PERF-003: Scalability
**Category**: Performance
**Description**: System shall scale to organizational document volumes.

**Acceptance Criteria**:
- Support 100,000 documents without performance degradation
- Support 1,000,000 chunks in database
- Support 10,000,000 hypergraph nodes/edges
- Horizontal scaling: Add processing workers to increase throughput
- Database partitioning strategy for >1M documents

### 3.2 Security (NFR-SEC)

#### NFR-SEC-001: Data Encryption
**Category**: Security
**Description**: All data encrypted in transit and at rest.

**Acceptance Criteria**:
- TLS 1.3 for all HTTPS endpoints
- AES-256 encryption for data at rest (object storage, database)
- Encrypted backups
- Key rotation policy: 90-day rotation for encryption keys

#### NFR-SEC-002: Access Control
**Category**: Security
**Description**: Role-based access control for document operations.

**Acceptance Criteria**:
- Authentication: JWT-based with refresh tokens
- Authorization: RBAC with roles (Admin, Leader, Manager, Member)
- Document-level permissions:
  - Leaders: Upload leadership documents, view all documents
  - Managers: Upload execution documents, view team documents
  - Members: View assigned documents
- API key management for programmatic access
- Audit logging of all access attempts

#### NFR-SEC-003: Sensitive Data Handling
**Category**: Security
**Description**: Detection and protection of sensitive information.

**Acceptance Criteria**:
- PII detection (names, emails, SSNs, phone numbers)
- Financial data detection (credit cards, bank accounts)
- Automatic flagging of sensitive documents
- Optional redaction of sensitive fields
- Compliance with GDPR, SOC2, HIPAA (configurable)

### 3.3 Reliability (NFR-REL)

#### NFR-REL-001: Fault Tolerance
**Category**: Reliability
**Description**: System shall handle failures gracefully.

**Acceptance Criteria**:
- Automatic retry on transient failures (network errors, API timeouts)
- Maximum 3 retries with exponential backoff
- Failure logging with detailed error messages
- User notification on permanent failures
- Partial processing: If embedding fails, document metadata still saved

#### NFR-REL-002: Data Integrity
**Category**: Reliability
**Description**: Ensure data consistency and integrity.

**Acceptance Criteria**:
- ACID transactions for database operations
- Checksums for uploaded files (SHA-256 hash)
- Duplicate detection based on content hash
- Version control for document updates
- Referential integrity in database (foreign key constraints)

#### NFR-REL-003: Availability
**Category**: Reliability
**Description**: System uptime and availability targets.

**Acceptance Criteria**:
- 99.5% uptime SLA (allows ~3.6 hours downtime/month)
- Scheduled maintenance windows (weekend, off-hours)
- Health check endpoints for monitoring
- Graceful degradation: Search works even if embedding generation is down

### 3.4 Usability (NFR-USE)

#### NFR-USE-001: User Feedback
**Category**: Usability
**Description**: Provide clear feedback on processing status.

**Acceptance Criteria**:
- Real-time progress indicators
- Estimated completion times
- Detailed error messages with resolution guidance
- Email/notification on completion
- Ability to view processing logs

#### NFR-USE-002: Documentation
**Category**: Usability
**Description**: Comprehensive API and user documentation.

**Acceptance Criteria**:
- OpenAPI 3.0 specification for all endpoints
- Interactive API documentation (Swagger UI)
- User guides for document upload best practices
- Example code snippets (Python, JavaScript, cURL)
- Troubleshooting guide for common issues

### 3.5 Maintainability (NFR-MAINT)

#### NFR-MAINT-001: Code Quality
**Category**: Maintainability
**Description**: Maintain high code quality standards.

**Acceptance Criteria**:
- Test coverage: >80% for core processing logic
- Linting: PEP 8 for Python, ESLint for JavaScript
- Type annotations: Use type hints (Python) and TypeScript
- Code review required for all changes
- CI/CD pipeline with automated testing

#### NFR-MAINT-002: Monitoring & Observability
**Category**: Maintainability
**Description**: Comprehensive monitoring and logging.

**Acceptance Criteria**:
- Structured logging (JSON format)
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Metrics collection (Prometheus or equivalent):
  - Documents processed per hour
  - Average processing time
  - Error rates by stage
  - API request rates and latencies
- Distributed tracing (OpenTelemetry)
- Alerting on critical errors (PagerDuty, Slack)

---

## 4. Use Cases

### 4.1 UC-001: Leader Uploads Mission Statement

**Actor**: Executive Leader
**Preconditions**: User authenticated with Leader role
**Trigger**: Leader navigates to upload page

**Main Flow**:
1. Leader selects "Upload Document" button
2. System displays upload interface
3. Leader drags PDF file (mission-statement-2025.pdf) into upload area
4. System prompts for document type selection
5. Leader selects "Leadership → Mission"
6. Leader optionally adds title: "Company Mission Statement 2025"
7. Leader clicks "Upload"
8. System validates file (format check, size check)
9. System initiates async processing:
   - Extracts text from PDF
   - Classifies as Leadership.Mission
   - Assigns Pyramid Level: Mission
   - Generates Ruvector embeddings
   - Constructs hypergraph root node
   - Calculates L-Score = 0.0 (mission is root)
10. System displays processing status with progress bar
11. System sends email notification on completion
12. Leader receives notification and views document details
13. System displays extracted key concepts (via entity extraction)

**Postconditions**:
- Mission statement stored in system
- Hypergraph root node created
- L-Score = 0.0 for this document
- Available as strategic anchor for future documents

**Exceptions**:
- E1: File format unsupported → System displays error "PDF format required"
- E2: File size exceeds limit → System displays error "Maximum 100MB"
- E3: OCR fails (scanned PDF) → System flags for manual review

### 4.2 UC-002: Team Manager Uploads Project Plan

**Actor**: Team Manager
**Preconditions**: User authenticated with Manager role; Mission statement exists in system
**Trigger**: Manager completes project planning

**Main Flow**:
1. Manager navigates to upload page
2. Manager uploads DOCX file (q1-customer-portal-project-plan.docx)
3. System prompts for document type
4. Manager selects "Execution → Project Plan"
5. Manager adds metadata:
   - Title: "Q1 Customer Portal Project"
   - Tags: "Q1-2025", "Customer Experience", "Engineering"
   - Department: "Product Engineering"
6. System processes document:
   - Converts DOCX to text with heading hierarchy
   - Classifies as Execution.ProjectPlan
   - Assigns Pyramid Level: Projects
   - Chunks document into sections (Introduction, Objectives, Timeline, Resources)
   - Generates embeddings per chunk
   - **Story Extraction**:
     - What: "Build customer self-service portal"
     - Why: "Reduce support team workload, improve customer satisfaction"
     - How: "Agile development, React frontend, REST API"
     - Outcome: "Target: 30% reduction in support tickets"
   - **Strategic Linking**:
     - Semantic search against existing strategic objectives
     - Finds match: "Enhance Customer Experience" (alignment score: 0.87)
     - Creates hypergraph edge: ProjectPlan ↔ StrategicObjective
   - Calculates L-Score = 3 (Projects → Programs → Objectives → Mission)
7. System displays extracted story for verification
8. Manager reviews story, confirms accuracy
9. Manager marks story as "Human-Verified"

**Postconditions**:
- Project plan stored and indexed
- Story extracted and linked to strategic objective
- Hypergraph updated with new node and edges
- L-Score calculated for strategic distance

**Alternative Flows**:
- A1: No matching strategic objective found → System flags for manual objective assignment
- A2: Manager uploads supporting documents (spreadsheets, diagrams) → System associates as related documents

### 4.3 UC-003: Researcher Uploads Market Analysis Report

**Actor**: Research Analyst
**Preconditions**: User authenticated with Member role
**Trigger**: Analyst completes competitive analysis research

**Main Flow**:
1. Analyst uploads PDF (gartner-market-analysis-2025.pdf)
2. System detects scanned PDF (no selectable text)
3. System initiates OCR processing
4. OCR extracts text with 92% average confidence
5. System flags 3 low-confidence blocks for manual review
6. Analyst reviews flagged text, makes corrections
7. System classifies as Market Intelligence → Analyst Report
8. System extracts entities:
   - Competitors: CompanyA, CompanyB, CompanyC
   - Market metrics: TAM = $5.2B, CAGR = 15%
   - Trends: "AI-powered automation", "Cloud migration"
9. System creates hypergraph nodes for extracted entities
10. System links report to relevant product specifications (via entity matching)
11. Analyst adds tags: "2025", "Competitive Intelligence", "Market Trends"

**Postconditions**:
- Market intelligence document stored
- Competitive entities added to knowledge graph
- Cross-document links established (report ↔ product specs)
- Available for future strategic planning queries

**Exceptions**:
- E1: OCR confidence <80% → System requires full manual review
- E2: Document language is non-English → System flags as unsupported

### 4.4 UC-004: Board Preparation Query

**Actor**: Executive (CEO/CFO)
**Preconditions**: Multiple execution documents uploaded over past quarter
**Trigger**: Upcoming board meeting requiring strategic alignment report

**Main Flow**:
1. Executive navigates to "Stories" dashboard
2. Executive filters stories:
   - Time range: Last Quarter (Q4 2024)
   - Strategic objective: "Expand Market Share"
   - Verification status: Human-Verified
3. System queries database:
   - Retrieves 12 stories linked to "Expand Market Share"
   - Aggregates outcomes (e.g., "New customer acquisition: +25%")
   - Calculates aggregate alignment score: 0.84 (high alignment)
4. System generates board narrative:
   - "In Q4 2024, 12 initiatives directly supported the Expand Market Share objective, achieving a collective 25% increase in new customer acquisition and 18% revenue growth in target segments. These initiatives demonstrate strong strategic alignment (0.84 alignment score) with our mission to become the market leader."
5. Executive exports narrative with citations (links to source documents)
6. Executive includes narrative in board deck with provenance chain

**Postconditions**:
- Board narrative generated with mathematical proof of alignment
- Source documents traceable via L-Score and citations
- Executive has data-driven strategic governance report

---

## 5. Data Model

### 5.1 Entity-Relationship Diagram

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    Documents    │────┬───▶│     Chunks      │────┬───▶│   Embeddings    │
└─────────────────┘    │    └─────────────────┘    │    └─────────────────┘
        │              │            │               │            │
        │              │            │               │            ▼
        │              │            │               │    ┌─────────────────┐
        │              │            │               └───▶│ Hypergraph Nodes│
        │              │            │                    └─────────────────┘
        │              │            │                            │
        │              │            ▼                            ▼
        │              │    ┌─────────────────┐         ┌─────────────────┐
        │              └───▶│    Entities     │         │ Hypergraph Edges│
        │                   └─────────────────┘         └─────────────────┘
        │                                                        │
        ▼                                                        │
┌─────────────────┐                                             │
│     Stories     │◀────────────────────────────────────────────┘
└─────────────────┘
        │
        ▼
┌─────────────────┐
│Strategic Objectives│
└─────────────────┘
```

### 5.2 Core Entities

#### Document
```json
{
  "id": "uuid",
  "title": "Q4 2024 Strategic Plan",
  "file_name": "strategic-plan-q4-2024.pdf",
  "file_size_bytes": 2457600,
  "file_format": "PDF",
  "uploaded_by": "user-uuid",
  "uploaded_at": "2024-10-01T09:30:00Z",
  "document_type": "Leadership.StrategicObjectives",
  "pyramid_level": "Strategic Objectives",
  "intent": "Define",
  "tags": ["2024", "Q4", "revenue-growth", "market-expansion"],
  "classification": "Internal",
  "l_score": 0.05,
  "processing_status": "completed",
  "storage_path": "s3://bucket/documents/uuid.pdf",
  "metadata": {
    "author": "Jane Smith, CEO",
    "department": "Executive",
    "version": 2,
    "parent_version_id": "uuid-of-v1"
  }
}
```

#### Chunk
```json
{
  "chunk_id": "uuid",
  "document_id": "document-uuid",
  "chunk_index": 3,
  "chunk_text": "Our strategic objective for Q4 is to expand market share in the enterprise segment by 15% through targeted sales initiatives and product enhancements.",
  "chunk_tokens": 32,
  "chunk_type": "section",
  "section_hierarchy": [
    {"level": 1, "title": "Strategic Objectives"},
    {"level": 2, "title": "Market Expansion"}
  ],
  "metadata": {
    "page_number": 5,
    "confidence": 1.0
  },
  "created_at": "2024-10-01T09:35:12Z",
  "l_score": 0.05
}
```

#### Story
```json
{
  "id": "uuid",
  "document_id": "document-uuid",
  "what": "Launched enterprise sales campaign targeting Fortune 500 companies",
  "why": "Expand market share in enterprise segment to achieve 15% growth target",
  "how": "Dedicated sales team, enhanced product features (SSO, advanced analytics), targeted marketing",
  "outcome": "Acquired 12 new enterprise customers, 18% market share growth",
  "strategic_link_objective_ids": ["objective-uuid-1"],
  "alignment_scores": [0.92],
  "narrative": "The enterprise sales campaign successfully targeted Fortune 500 companies with enhanced product features including SSO and advanced analytics. This initiative directly supported our Q4 strategic objective to expand market share, achieving 18% growth (exceeding the 15% target) through the acquisition of 12 new enterprise customers.",
  "l_score": 0.15,
  "confidence": 0.88,
  "verification_status": "human-verified",
  "created_at": "2024-12-15T14:20:00Z",
  "updated_at": "2024-12-16T10:05:00Z"
}
```

#### Hypergraph Node
```json
{
  "node_id": "uuid",
  "node_type": "strategic_objective",
  "node_data": {
    "title": "Expand Market Share in Enterprise Segment",
    "target_value": "15% growth",
    "time_frame": "Q4 2024",
    "source_document_id": "document-uuid"
  },
  "embedding_id": "embedding-uuid"
}
```

#### Hypergraph Edge
```json
{
  "edge_id": "uuid",
  "edge_type": "supports",
  "source_nodes": ["project-node-uuid"],
  "target_nodes": ["objective-node-uuid", "portfolio-node-uuid"],
  "weight": 0.92,
  "metadata": {
    "created_from": "story-uuid",
    "confidence": 0.88
  }
}
```

---

## 6. API Specification (OpenAPI 3.0 Summary)

### 6.1 Authentication

All API requests require JWT bearer token authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

Token obtained via:
```
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "secure_password"
}

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

### 6.2 Core Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/documents/upload` | POST | Upload document | Yes |
| `/api/v1/documents` | GET | List/search documents | Yes |
| `/api/v1/documents/{id}` | GET | Get document details | Yes |
| `/api/v1/documents/{id}/status` | GET | Get processing status | Yes |
| `/api/v1/documents/{id}/download` | GET | Download original file | Yes |
| `/api/v1/chunks` | GET | Query chunks | Yes |
| `/api/v1/stories` | GET | Query stories | Yes |
| `/api/v1/stories/{id}` | PATCH | Update/verify story | Yes (Manager+) |
| `/api/v1/search/semantic` | POST | Semantic search | Yes |
| `/api/v1/search/fulltext` | GET | Full-text search | Yes |
| `/api/v1/entities` | GET | Query extracted entities | Yes |
| `/api/v1/hypergraph/traverse` | POST | Traverse hypergraph | Yes |
| `/api/v1/processing/queue` | GET | View processing queue | Yes (Admin) |

### 6.3 Error Responses

All errors follow consistent format:

```json
{
  "error": {
    "code": "INVALID_DOCUMENT_TYPE",
    "message": "Document type must be one of: Leadership.Mission, Leadership.Vision, ...",
    "details": {
      "provided_value": "InvalidType",
      "valid_values": ["Leadership.Mission", "Leadership.Vision", "..."]
    },
    "request_id": "req-uuid"
  }
}
```

HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate)
- 422: Unprocessable Entity (semantic error)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error

---

## 7. Processing Pipeline Architecture

### 7.1 Pipeline Stages

```
┌──────────────┐
│   Upload     │
│   Handler    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Validation  │
│   & Storage  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Format     │
│ Conversion   │ ◀─── OCR if needed
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Text       │
│ Extraction   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Classification│
│   & Typing   │
└──────┬───────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
  │Chunking │   │ Entity  │   │ Metadata│   │  Story  │
  │         │   │Extraction│   │Extraction│  │Extraction│
  └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘
       │             │             │             │
       └─────────────┴─────────────┴─────────────┘
                      │
                      ▼
              ┌──────────────┐
              │  Embedding   │
              │  Generation  │
              └──────┬───────┘
                      │
                      ▼
              ┌──────────────┐
              │  Hypergraph  │
              │ Construction │
              └──────┬───────┘
                      │
                      ▼
              ┌──────────────┐
              │   L-Score    │
              │ Calculation  │
              └──────┬───────┘
                      │
                      ▼
              ┌──────────────┐
              │  Indexing    │
              │  & Storage   │
              └──────────────┘
```

### 7.2 Technology Stack

#### Processing Queue
- **Technology**: Celery + Redis or RabbitMQ
- **Purpose**: Async task queue for document processing
- **Workers**: Configurable (default 10 concurrent workers)
- **Retry Policy**: 3 retries with exponential backoff

#### Format Conversion
- **PDF**: PyPDF2, pdfplumber (text extraction), pdf2image + Tesseract (OCR)
- **DOCX**: python-docx
- **XLSX**: openpyxl, pandas
- **PPTX**: python-pptx
- **OCR**: Tesseract 5.0+ with tessdata language packs

#### Text Processing
- **NLP Library**: spaCy (entity extraction, language detection)
- **Embeddings**: Ruvector library/API
- **Chunking**: LangChain text splitters (configurable strategies)

#### Classification
- **Method**: Fine-tuned transformer model (BERT/RoBERTa) for document type classification
- **Training Data**: Labeled corpus of business documents
- **Fallback**: Rule-based heuristics (keyword matching)

#### Storage
- **File Storage**: Local filesystem (`./data/documents/`)
- **Relational DB**: PostgreSQL 14+ (JSONB, full-text search)
- **Vector DB**: RuVector PostgreSQL extension (SIMD-accelerated, hypergraph support)
- **Cache**: Redis 7+ (local)

#### API Framework
- **Backend**: FastAPI (Python) or Express.js (Node.js)
- **ORM**: SQLAlchemy (Python) or Prisma (Node.js)
- **Validation**: Pydantic (Python) or Zod (Node.js)

### 7.3 Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                     │
│                    (Nginx/HAProxy)                  │
└──────────────┬──────────────────────────┬───────────┘
               │                          │
       ┌───────▼────────┐        ┌────────▼────────┐
       │   API Server   │        │   API Server    │
       │    Instance 1  │        │   Instance 2    │
       └───────┬────────┘        └────────┬────────┘
               │                          │
               └──────────┬───────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌────▼────┐   ┌──────▼──────┐
    │PostgreSQL │   │  Redis  │   │  Ruvector   │
    │ (Primary) │   │  Cache  │   │   Database  │
    └───────────┘   └─────────┘   └─────────────┘
          │
    ┌─────▼─────┐
    │PostgreSQL │
    │ (Replica) │
    └───────────┘

┌─────────────────────────────────────────────────────┐
│              Processing Workers (Celery)            │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │Worker│  │Worker│  │Worker│  │Worker│  │Worker│ │
│  │  1   │  │  2   │  │  3   │  │  4   │  │  5   │ │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Message Queue  │
              │ (Redis/RabbitMQ)│
              └─────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Local File Storage                 │
│              (./data/documents/)                    │
└─────────────────────────────────────────────────────┘
```

---

## 8. Security Architecture

### 8.1 Data Protection

#### Encryption
- **In Transit**: TLS 1.3 for all API communication
- **At Rest**:
  - Object storage: AES-256 encryption
  - Database: Transparent Data Encryption (TDE)
  - Backups: Encrypted with separate keys

#### Key Management
- **Storage**: Local secrets file with restricted permissions (`./secrets/`)
- **Rotation**: 90-day automatic rotation
- **Access**: Principle of least privilege

### 8.2 Access Control

#### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Admin** | All operations, user management, system configuration |
| **Leader** | Upload leadership docs, view all docs, edit strategic objectives |
| **Manager** | Upload execution docs, view team docs, verify stories |
| **Member** | Upload execution docs, view assigned docs |
| **Viewer** | Read-only access to non-confidential docs |

#### Document-Level Permissions
- Documents inherit classification from type (Leadership → Internal)
- Manual override allowed with justification
- Access control list (ACL) per document:
  - Owner: Uploader (always has access)
  - Shared with: Specific users/roles
  - Public: Organization-wide visibility

### 8.3 Audit Logging

All operations logged with:
- User ID
- Action (upload, view, edit, delete)
- Resource ID (document, story, entity)
- Timestamp (ISO 8601)
- IP address / client identifier
- Success/failure status

Log retention: 2 years (configurable)

### 8.4 Compliance

#### GDPR Compliance
- Right to access: API endpoint to download user's data
- Right to erasure: Document deletion with cascading cleanup
- Data minimization: Only collect necessary metadata
- Consent tracking: User agreement to terms of service

#### SOC 2 Compliance
- Access control (Type 2 criteria)
- Encryption at rest and in transit
- Regular security audits
- Incident response plan

---

## 9. Edge Cases & Exception Handling

### 9.1 Document Processing Failures

#### EC-001: Corrupted File
**Scenario**: Uploaded file is corrupted or unreadable
**Detection**: Format conversion throws exception
**Handling**:
- Mark processing_status as "failed"
- Store error: "File corruption detected. Unable to read file."
- Notify user via email with troubleshooting steps
- Allow user to re-upload

#### EC-002: OCR Low Confidence
**Scenario**: Scanned PDF with average confidence <80%
**Detection**: Tesseract confidence scores
**Handling**:
- Mark processing_status as "needs_review"
- Store low-confidence blocks separately
- Flag for manual review in UI
- Send notification to uploader
- Allow manual text correction with original image side-by-side

#### EC-003: Classification Ambiguity
**Scenario**: Document type classifier returns multiple high-probability classes
**Detection**: Top 2 classification scores within 10% of each other
**Handling**:
- Present top 3 classification options to user
- Request manual selection
- Use manual selection as training data to improve classifier
- Default to most conservative classification (highest L-Score) if user doesn't respond in 24 hours

### 9.2 Storage & Scalability Edge Cases

#### EC-004: Storage Quota Exceeded
**Scenario**: Organization reaches storage limit
**Detection**: Pre-upload quota check
**Handling**:
- Reject upload with error: "Storage quota exceeded. Current usage: 95GB/100GB."
- Suggest cleanup actions (delete old documents)
- Offer upgrade to higher tier
- Admin notification

#### EC-005: Duplicate Document
**Scenario**: Exact same file uploaded twice (same SHA-256 hash)
**Detection**: Hash comparison against existing documents
**Handling**:
- Option 1: Reject with message: "This document already exists. View document: [link]"
- Option 2: Treat as new version if user confirms
- Option 3: Link to existing document instead of creating duplicate

#### EC-006: Massive Document (>100MB)
**Scenario**: User attempts to upload 200MB file
**Detection**: Pre-upload size check
**Handling**:
- Reject upload with error: "Maximum file size is 100MB. Current file: 200MB."
- Suggest document splitting or compression
- Offer API upload for enterprise customers with higher limits

### 9.3 Semantic Processing Edge Cases

#### EC-007: No Strategic Objective Match
**Scenario**: Execution document story doesn't semantically match any strategic objective
**Detection**: Max alignment score <0.5
**Handling**:
- Flag story as "unaligned"
- Display to managers in "Review Required" queue
- Prompt manual objective assignment
- Potential signal of strategic gap (team working on undefined priorities)

#### EC-008: Circular Dependencies in Hypergraph
**Scenario**: Document A references B, B references C, C references A
**Detection**: Cycle detection algorithm in hypergraph construction
**Handling**:
- Allow cycles (organizational reality)
- Flag as potential misalignment or circular reasoning
- Visualization shows cycles with warning indicator
- L-Score calculation uses shortest acyclic path

#### EC-009: Multi-Language Document
**Scenario**: Document contains sections in multiple languages
**Detection**: Language detection per chunk
**Handling**:
- Process English chunks normally
- Flag non-English chunks for translation
- Offer machine translation (Google Translate API) with confidence caveat
- Manual translation upload capability

### 9.4 API Edge Cases

#### EC-010: Concurrent Updates
**Scenario**: Two users editing same story simultaneously
**Detection**: Optimistic locking (version number check)
**Handling**:
- HTTP 409 Conflict response
- Return current version and user's conflicting changes
- Offer merge resolution interface
- Last-write-wins with notification to first user

#### EC-011: Rate Limit Exceeded
**Scenario**: User exceeds 100 uploads/hour
**Detection**: Redis rate limiter
**Handling**:
- HTTP 429 Too Many Requests
- Response includes `Retry-After` header (seconds until reset)
- Suggested action: "Rate limit exceeded. Please wait 45 minutes or contact support for higher limits."

---

## 10. Performance Optimization Strategies

### 10.1 Processing Optimizations

#### Parallel Chunk Processing
- Chunk document into segments
- Process chunks in parallel (embedding generation, entity extraction)
- Use thread pool or async workers
- Recombine results at end

#### Caching
- Cache classification model predictions for common document patterns
- Cache entity extraction results for similar text
- Cache embeddings for duplicate chunks (cross-document deduplication)

#### Lazy Loading
- Generate embeddings only when document searched (optional mode)
- Defer hypergraph construction for low-priority documents
- On-demand story extraction (user-initiated)

### 10.2 Storage Optimizations

#### Database Indexing
```sql
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_text_fts ON chunks USING GIN(to_tsvector('english', chunk_text));
CREATE INDEX idx_stories_objective_ids ON stories USING GIN(strategic_link_objective_ids);
```

#### Partitioning
- Partition `chunks` table by `document_id` (range partitioning)
- Partition `documents` table by `uploaded_at` (time-based partitioning)
- Archive old documents to cold storage after 2 years

#### Compression
- GZIP compression for large text fields in PostgreSQL
- File storage compression (GZIP for archived documents)
- Embedding quantization (reduce precision for faster search, optional)

### 10.3 Query Optimizations

#### Materialized Views
```sql
CREATE MATERIALIZED VIEW documents_summary AS
SELECT
  document_type,
  pyramid_level,
  COUNT(*) as doc_count,
  AVG(l_score) as avg_l_score,
  DATE_TRUNC('month', uploaded_at) as month
FROM documents
WHERE processing_status = 'completed'
GROUP BY document_type, pyramid_level, month;

REFRESH MATERIALIZED VIEW documents_summary; -- Daily refresh
```

#### Query Result Caching
- Cache search results in Redis (TTL: 1 hour)
- Cache document metadata for frequently accessed docs
- Cache API responses for identical requests

### 10.4 API Optimizations

#### Pagination
- Default page size: 50 documents
- Maximum page size: 200
- Use cursor-based pagination for large result sets (better performance than offset)

#### Field Selection
```
GET /api/v1/documents?fields=id,title,uploaded_at
```
- Return only requested fields (reduces payload size)

#### Compression
- Enable Gzip compression for API responses (Accept-Encoding: gzip)
- Reduces network transfer by 60-80% for JSON payloads

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Coverage Target**: 80%

**Key Test Areas**:
- Format conversion functions (PDF, DOCX, XLSX)
- OCR processing
- Text normalization
- Classification logic
- Chunking strategies
- Entity extraction
- L-Score calculation
- Story extraction logic

**Example Test**:
```python
def test_pdf_text_extraction():
    # Given
    pdf_file = load_test_file("mission-statement.pdf")

    # When
    extracted_text = extract_text_from_pdf(pdf_file)

    # Then
    assert "mission" in extracted_text.lower()
    assert len(extracted_text) > 100
    assert extracted_text.startswith("Our mission")
```

### 11.2 Integration Tests

**Test Areas**:
- End-to-end document upload flow
- Database interactions (CRUD operations)
- Ruvector embedding generation and retrieval
- Hypergraph construction
- API endpoint integration
- Authentication and authorization

**Example Test**:
```python
def test_document_upload_integration():
    # Given
    client = TestClient(app)
    auth_token = get_test_token(role="Leader")

    # When
    response = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {auth_token}"},
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"document_type": "Leadership.Mission"}
    )

    # Then
    assert response.status_code == 200
    document_id = response.json()["document_id"]

    # Wait for processing
    wait_for_processing_completion(document_id, timeout=30)

    # Verify document stored
    doc = get_document(document_id)
    assert doc.processing_status == "completed"
    assert doc.l_score == 0.0  # Mission is root
```

### 11.3 Performance Tests

**Test Scenarios**:
- Upload 100 small documents concurrently
- Upload 10 large documents (50MB each)
- Query 1000 documents with filters
- Semantic search with 10,000 indexed chunks
- Hypergraph traversal with 100,000 nodes

**Tools**: Locust, Apache JMeter

**Example Test**:
```python
class DocumentUploadLoadTest(HttpUser):
    @task
    def upload_document(self):
        with open("test-doc.pdf", "rb") as f:
            self.client.post(
                "/api/v1/documents/upload",
                files={"file": f},
                headers={"Authorization": f"Bearer {self.token}"}
            )
```

### 11.4 User Acceptance Tests (UAT)

**Test Scenarios**:
1. Leader uploads mission statement → Verify classification, L-Score = 0
2. Manager uploads project plan → Verify story extraction, strategic linking
3. Researcher uploads market report → Verify entity extraction, OCR quality
4. Executive queries stories for board report → Verify narrative generation

**Acceptance Criteria**: Each scenario completes successfully with expected results in UAT environment

---

## 12. Success Metrics

### 12.1 Processing Metrics

- **Processing Time**: Average time to process documents by size category
  - Target: <2 min for small, <10 min for medium, <30 min for large
- **Processing Success Rate**: % of documents successfully processed
  - Target: >95%
- **OCR Accuracy**: Average confidence score for OCR extractions
  - Target: >90%

### 12.2 Classification Metrics

- **Classification Accuracy**: % of documents correctly auto-classified
  - Target: >85% (measured against human-labeled test set)
- **Story Extraction Quality**: % of stories marked as human-verified
  - Target: >70% verification rate
- **Strategic Linking Accuracy**: % of stories correctly linked to objectives
  - Target: >80% (measured against manual review)

### 12.3 User Experience Metrics

- **Upload Success Rate**: % of uploads that complete without user intervention
  - Target: >90%
- **Time to First Result**: Time from upload to first accessible metadata
  - Target: <1 minute
- **User Satisfaction**: Post-upload survey score
  - Target: >4.0/5.0

### 12.4 System Health Metrics

- **API Availability**: % uptime for API endpoints
  - Target: >99.5%
- **API Response Time**: p95 latency for key endpoints
  - Target: <500ms
- **Error Rate**: % of API requests returning 5xx errors
  - Target: <0.5%

---

## 13. Deployment & Rollout Plan

### 13.1 Phase 1: Internal Testing (Weeks 1-2)

**Scope**: Development team + QA
**Activities**:
- Deploy to staging environment
- Execute full test suite (unit, integration, performance)
- Load test with synthetic documents
- Security scan (OWASP ZAP, dependency check)
- Documentation review

**Success Criteria**:
- All tests passing
- No critical security vulnerabilities
- Processing time targets met
- API documentation complete

### 13.2 Phase 2: Pilot Deployment (Weeks 3-4)

**Scope**: 1-2 pilot teams (10-20 users)
**Activities**:
- Deploy to production with limited user access
- Pilot teams upload real documents (100-200 documents)
- Daily monitoring of processing metrics
- Weekly feedback sessions with pilot users
- Iterate on UI/UX based on feedback

**Success Criteria**:
- Processing success rate >90%
- No data loss incidents
- Pilot user satisfaction >4.0/5.0
- Key features validated (upload, search, story extraction)

### 13.3 Phase 3: Gradual Rollout (Weeks 5-8)

**Scope**: Expand to 50% of organization
**Activities**:
- Increase user access weekly (25%, 50%, 75%, 100%)
- Monitor system load and scale resources as needed
- Provide training sessions (webinars, documentation)
- Support ticket resolution (target <24 hour response)
- Performance tuning based on real usage patterns

**Success Criteria**:
- System handles peak load without degradation
- User adoption rate >60%
- Average processing time within targets
- Support ticket volume declining week-over-week

### 13.4 Phase 4: Full Production (Week 9+)

**Scope**: All users, continuous operation
**Activities**:
- Full organizational access
- Ongoing monitoring and optimization
- Regular feature releases (bi-weekly sprint cycle)
- Monthly user feedback surveys
- Quarterly strategic reviews with leadership

**Success Criteria**:
- User adoption rate >80%
- Processing >1000 documents/month
- Strategic alignment metrics visible in dashboards
- Positive ROI (time savings, decision quality improvements)

---

## 14. Future Enhancements (Out of Scope for v1.0)

### 14.1 Advanced Features

- **Multi-modal Processing**: Video/audio transcription and analysis
- **Real-time Collaboration**: Multiple users editing/annotating documents simultaneously
- **Automated Workflow Triggers**: Auto-notify stakeholders when strategic drift detected
- **Custom ML Model Training**: Organization-specific classification models
- **Graph Visualization**: Interactive hypergraph exploration interface
- **Natural Language Queries**: "Show me all projects supporting customer satisfaction that started in Q3"

### 14.2 Integrations

- **Project Management Tools**: Jira, Asana, Monday.com integration (auto-import project data)
- **Document Repositories**: SharePoint, Google Drive auto-sync
- **BI Tools**: Tableau, Power BI connectors for dashboard integration
- **Slack/Teams**: Notifications and bot-based document queries
- **Email**: Auto-forward strategic emails for ingestion

### 14.3 Intelligence Enhancements

- **Predictive Analytics**: Forecast strategic alignment trends
- **Anomaly Detection**: Flag unusual patterns (e.g., sudden drop in alignment scores)
- **Recommendation Engine**: Suggest next strategic initiatives based on gaps
- **Automated Board Reports**: Schedule and auto-generate monthly board decks

---

## 15. Appendices

### Appendix A: Glossary

- **Chunk**: Semantically coherent segment of a document (paragraph, section, table)
- **Embedding**: Vector representation of text in high-dimensional space (768-1536 dimensions)
- **Hypergraph**: Graph structure where edges can connect more than two nodes simultaneously
- **L-Score**: Provenance metric measuring strategic distance from mission statement (0 = mission, higher = more distant)
- **Pyramid of Clarity**: Hierarchical framework: Mission → Vision → Objectives → Goals → Portfolios → Programs → Projects → Tasks
- **Story**: Extracted narrative from execution document linking work to strategic objectives
- **Ruvector**: Graph Neural Network-powered semantic database for embeddings and hypergraph storage

### Appendix B: Referenced Technologies

- **Ruvector**: Semantic vector database with GNN-based optimization
- **ReasoningBank**: SQLite + graph layer for hypergraph and pattern storage
- **Tesseract**: Open-source OCR engine (v5.0+)
- **spaCy**: Industrial-strength NLP library
- **FastAPI**: Modern Python web framework for APIs
- **PostgreSQL**: Advanced open-source relational database (v14+)
- **Celery**: Distributed task queue for Python
- **Redis**: In-memory data store for caching and message queuing

### Appendix C: Document Type Taxonomy

```
Leadership
├── Mission
├── Vision
├── Strategic Objectives
├── OKRs
├── Board Decks
└── Strategic Memos

Organizational
├── Product Specifications
├── Product Roadmaps
├── Org Charts
├── Role Descriptions
├── Team Charters
└── Process Documentation
    ├── Policies
    ├── Procedures
    └── Playbooks

Execution
├── Program Briefs
├── Program Charters
├── Project Plans
├── Project Proposals
├── Research Reports
├── Analysis Documents
├── Sprint Reports
├── Progress Updates
├── Retrospectives
├── Post-mortems
└── Outcome Documentation

Market Intelligence
├── Analyst Reports
├── Competitive Analyses
├── Industry White Papers
└── Market Research
```

### Appendix D: Sample API Requests

#### Upload Document
```bash
curl -X POST https://api.pka-strat.com/v1/documents/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@mission-statement.pdf" \
  -F "document_type=Leadership.Mission" \
  -F "title=Company Mission Statement 2025"
```

#### Semantic Search
```bash
curl -X POST https://api.pka-strat.com/v1/search/semantic \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are our customer satisfaction initiatives?",
    "filters": {
      "pyramid_levels": ["Projects", "Programs"],
      "uploaded_after": "2024-01-01"
    },
    "top_k": 10
  }'
```

#### Query Stories
```bash
curl -X GET "https://api.pka-strat.com/v1/stories?strategic_objective_id=uuid&verification_status=human-verified" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | ___________ | ___________ | ___/___/___ |
| Lead Engineer | ___________ | ___________ | ___/___/___ |
| Security Lead | ___________ | ___________ | ___/___/___ |
| QA Manager | ___________ | ___________ | ___/___/___ |

---

**End of Specification**
