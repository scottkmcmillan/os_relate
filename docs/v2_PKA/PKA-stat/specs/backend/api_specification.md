# PKA-STRAT Backend API Specification

## OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: PKA-STRAT Backend API
  version: 1.0.0
  description: |
    Document-centric strategic alignment platform API for Leaders, Team Managers, and Team Members.

    **Key Features:**
    - Document management with semantic chunking
    - Pyramid of Clarity hierarchical structure
    - Strategic Resonance Engine for alignment scoring
    - Market intelligence integration
    - Real-time updates via WebSocket

    **Authentication:**
    - JWT Bearer tokens for user authentication
    - API keys for service integrations
    - Role-based access control (RBAC)

  contact:
    name: PKA-STRAT API Support
    email: api-support@pka-strat.com

  license:
    name: Proprietary
    url: https://pka-strat.com/license

servers:
  - url: https://api.pka-strat.com/v1
    description: Production server
  - url: https://staging-api.pka-strat.com/v1
    description: Staging server
  - url: http://localhost:3000/v1
    description: Development server

tags:
  - name: Authentication
    description: User authentication and authorization operations
  - name: Documents
    description: Document upload, management, and processing
  - name: Pyramid of Clarity
    description: Hierarchical strategic structure management
  - name: Strategic Resonance
    description: Alignment scoring and mission drift detection
  - name: Dashboards
    description: Role-based dashboard data endpoints
  - name: Reports
    description: Report generation and board deck creation
  - name: Market Intelligence
    description: Market analysis and scenario simulation

security:
  - BearerAuth: []
  - ApiKeyAuth: []

paths:
  # ============================================================================
  # AUTHENTICATION & AUTHORIZATION
  # ============================================================================

  /auth/login:
    post:
      tags:
        - Authentication
      summary: User login
      description: Authenticate user and receive JWT access token
      operationId: loginUser
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                  example: john.doe@company.com
                password:
                  type: string
                  format: password
                  minLength: 8
                  example: SecureP@ssw0rd
                organizationId:
                  type: string
                  format: uuid
                  description: Optional organization ID for multi-tenant login
                  example: 123e4567-e89b-12d3-a456-426614174000
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '429':
          $ref: '#/components/responses/RateLimitError'
      x-rate-limit:
        limit: 5
        window: 60s

  /auth/logout:
    post:
      tags:
        - Authentication
      summary: User logout
      description: Invalidate current JWT token
      operationId: logoutUser
      responses:
        '204':
          description: Logout successful
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /auth/refresh:
    post:
      tags:
        - Authentication
      summary: Refresh access token
      description: Get new access token using refresh token
      operationId: refreshToken
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
                  example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      responses:
        '200':
          description: Token refreshed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /auth/api-keys:
    get:
      tags:
        - Authentication
      summary: List API keys
      description: Get all API keys for current organization
      operationId: listApiKeys
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: API keys retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/ApiKey'
                  pagination:
                    $ref: '#/components/schemas/PaginationMeta'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

    post:
      tags:
        - Authentication
      summary: Create API key
      description: Generate new API key for integrations
      operationId: createApiKey
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - scopes
              properties:
                name:
                  type: string
                  minLength: 1
                  maxLength: 100
                  example: Integration Service Key
                scopes:
                  type: array
                  items:
                    type: string
                    enum: [read:documents, write:documents, read:pyramid, write:pyramid, read:alignment, read:reports]
                  example: [read:documents, read:alignment]
                expiresAt:
                  type: string
                  format: date-time
                  nullable: true
                  example: '2025-12-31T23:59:59Z'
      responses:
        '201':
          description: API key created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiKeyWithSecret'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

  /auth/api-keys/{keyId}:
    delete:
      tags:
        - Authentication
      summary: Revoke API key
      description: Permanently revoke an API key
      operationId: revokeApiKey
      parameters:
        - name: keyId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: API key revoked successfully
        '404':
          $ref: '#/components/responses/NotFoundError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

  # ============================================================================
  # DOCUMENT MANAGEMENT
  # ============================================================================

  /documents:
    get:
      tags:
        - Documents
      summary: List documents
      description: Retrieve documents with optional filters
      operationId: listDocuments
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: type
          in: query
          schema:
            type: string
            enum: [strategic, operational, market, reference]
        - name: status
          in: query
          schema:
            type: string
            enum: [processing, ready, error]
        - name: search
          in: query
          schema:
            type: string
          description: Full-text search query
        - name: sortBy
          in: query
          schema:
            type: string
            enum: [createdAt, updatedAt, name, relevance]
            default: createdAt
        - name: sortOrder
          in: query
          schema:
            type: string
            enum: [asc, desc]
            default: desc
      responses:
        '200':
          description: Documents retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Document'
                  pagination:
                    $ref: '#/components/schemas/PaginationMeta'
              example:
                data:
                  - id: doc-123
                    name: Strategic Plan 2025
                    type: strategic
                    status: ready
                    uploadedAt: '2025-01-15T10:30:00Z'
                    uploadedBy:
                      id: user-456
                      name: Jane Smith
                      role: leader
                    size: 2457600
                    chunkCount: 47
                pagination:
                  page: 1
                  limit: 20
                  total: 156
                  totalPages: 8
        '401':
          $ref: '#/components/responses/UnauthorizedError'

    post:
      tags:
        - Documents
      summary: Upload document
      description: Upload a new document for processing
      operationId: uploadDocument
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - file
                - type
              properties:
                file:
                  type: string
                  format: binary
                  description: Document file (PDF, DOCX, TXT, MD)
                type:
                  type: string
                  enum: [strategic, operational, market, reference]
                  example: strategic
                name:
                  type: string
                  description: Optional custom name (defaults to filename)
                  example: Q1 2025 Strategic Plan
                metadata:
                  type: object
                  additionalProperties: true
                  example:
                    department: Engineering
                    quarter: Q1
                    year: 2025
      responses:
        '201':
          description: Document uploaded successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Document'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '413':
          description: File too large
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error:
                  code: FILE_TOO_LARGE
                  message: File size exceeds maximum allowed size of 50MB
        '415':
          description: Unsupported file type
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
      x-rate-limit:
        limit: 10
        window: 60s

  /documents/{id}:
    get:
      tags:
        - Documents
      summary: Get document details
      description: Retrieve detailed information about a specific document
      operationId: getDocument
      parameters:
        - $ref: '#/components/parameters/DocumentIdParam'
      responses:
        '200':
          description: Document details retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DocumentDetail'
        '404':
          $ref: '#/components/responses/NotFoundError'

    delete:
      tags:
        - Documents
      summary: Delete document
      description: Permanently remove a document and all associated data
      operationId: deleteDocument
      parameters:
        - $ref: '#/components/parameters/DocumentIdParam'
      responses:
        '204':
          description: Document deleted successfully
        '404':
          $ref: '#/components/responses/NotFoundError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

  /documents/{id}/chunks:
    get:
      tags:
        - Documents
      summary: Get document chunks
      description: Retrieve semantic chunks of a processed document
      operationId: getDocumentChunks
      parameters:
        - $ref: '#/components/parameters/DocumentIdParam'
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: Document chunks retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/DocumentChunk'
                  pagination:
                    $ref: '#/components/schemas/PaginationMeta'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /documents/{id}/embedding:
    get:
      tags:
        - Documents
      summary: Get document embedding
      description: Retrieve Ruvector embedding for semantic search
      operationId: getDocumentEmbedding
      parameters:
        - $ref: '#/components/parameters/DocumentIdParam'
      responses:
        '200':
          description: Document embedding retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DocumentEmbedding'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /documents/{id}/reprocess:
    post:
      tags:
        - Documents
      summary: Reprocess document
      description: Trigger reprocessing of document chunks and embeddings
      operationId: reprocessDocument
      parameters:
        - $ref: '#/components/parameters/DocumentIdParam'
      responses:
        '202':
          description: Reprocessing initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  jobId:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [queued]
                  estimatedCompletionTime:
                    type: string
                    format: date-time
        '404':
          $ref: '#/components/responses/NotFoundError'

  # ============================================================================
  # PYRAMID OF CLARITY
  # ============================================================================

  /pyramid:
    get:
      tags:
        - Pyramid of Clarity
      summary: Get full pyramid hierarchy
      description: Retrieve complete Pyramid of Clarity structure
      operationId: getPyramidHierarchy
      parameters:
        - name: depth
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 8
            default: 8
          description: Maximum depth to retrieve
        - name: includeArchived
          in: query
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: Pyramid hierarchy retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PyramidHierarchy'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /pyramid/{level}:
    get:
      tags:
        - Pyramid of Clarity
      summary: List items at pyramid level
      description: Get all items at a specific pyramid level
      operationId: getPyramidLevel
      parameters:
        - $ref: '#/components/parameters/PyramidLevelParam'
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: Pyramid level items retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/PyramidItem'
                  pagination:
                    $ref: '#/components/schemas/PaginationMeta'
        '400':
          $ref: '#/components/responses/BadRequestError'

    post:
      tags:
        - Pyramid of Clarity
      summary: Create pyramid item
      description: Create a new item at specified pyramid level
      operationId: createPyramidItem
      parameters:
        - $ref: '#/components/parameters/PyramidLevelParam'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PyramidItemCreate'
      responses:
        '201':
          description: Pyramid item created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PyramidItem'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

  /pyramid/{level}/{id}:
    get:
      tags:
        - Pyramid of Clarity
      summary: Get pyramid item
      description: Retrieve detailed information about a pyramid item
      operationId: getPyramidItem
      parameters:
        - $ref: '#/components/parameters/PyramidLevelParam'
        - $ref: '#/components/parameters/PyramidItemIdParam'
      responses:
        '200':
          description: Pyramid item retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PyramidItemDetail'
        '404':
          $ref: '#/components/responses/NotFoundError'

    put:
      tags:
        - Pyramid of Clarity
      summary: Update pyramid item
      description: Update an existing pyramid item
      operationId: updatePyramidItem
      parameters:
        - $ref: '#/components/parameters/PyramidLevelParam'
        - $ref: '#/components/parameters/PyramidItemIdParam'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PyramidItemUpdate'
      responses:
        '200':
          description: Pyramid item updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PyramidItem'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '404':
          $ref: '#/components/responses/NotFoundError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

    delete:
      tags:
        - Pyramid of Clarity
      summary: Delete pyramid item
      description: Archive or permanently delete a pyramid item
      operationId: deletePyramidItem
      parameters:
        - $ref: '#/components/parameters/PyramidLevelParam'
        - $ref: '#/components/parameters/PyramidItemIdParam'
        - name: permanent
          in: query
          schema:
            type: boolean
            default: false
          description: Permanently delete instead of archiving
      responses:
        '204':
          description: Pyramid item deleted successfully
        '404':
          $ref: '#/components/responses/NotFoundError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

  /pyramid/{level}/{id}/children:
    get:
      tags:
        - Pyramid of Clarity
      summary: Get children at next level
      description: Retrieve all children of a pyramid item at the next level
      operationId: getPyramidChildren
      parameters:
        - $ref: '#/components/parameters/PyramidLevelParam'
        - $ref: '#/components/parameters/PyramidItemIdParam'
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: Children retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/PyramidItem'
                  pagination:
                    $ref: '#/components/schemas/PaginationMeta'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /pyramid/{level}/{id}/ancestors:
    get:
      tags:
        - Pyramid of Clarity
      summary: Trace to mission
      description: Get all ancestor items up to mission level
      operationId: getPyramidAncestors
      parameters:
        - $ref: '#/components/parameters/PyramidLevelParam'
        - $ref: '#/components/parameters/PyramidItemIdParam'
      responses:
        '200':
          description: Ancestors retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/PyramidItem'
                    description: Ordered from mission (top) to immediate parent
        '404':
          $ref: '#/components/responses/NotFoundError'

  /pyramid/link:
    post:
      tags:
        - Pyramid of Clarity
      summary: Link pyramid items
      description: Create relationship between items at different levels
      operationId: linkPyramidItems
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - parentLevel
                - parentId
                - childLevel
                - childId
              properties:
                parentLevel:
                  $ref: '#/components/schemas/PyramidLevel'
                parentId:
                  type: string
                  format: uuid
                childLevel:
                  $ref: '#/components/schemas/PyramidLevel'
                childId:
                  type: string
                  format: uuid
      responses:
        '201':
          description: Link created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PyramidLink'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

  # ============================================================================
  # STRATEGIC RESONANCE ENGINE
  # ============================================================================

  /alignment/scores:
    get:
      tags:
        - Strategic Resonance
      summary: Get alignment scores
      description: Retrieve alignment scores across pyramid hierarchy
      operationId: getAlignmentScores
      parameters:
        - name: level
          in: query
          schema:
            $ref: '#/components/schemas/PyramidLevel'
          description: Filter by pyramid level
        - name: itemId
          in: query
          schema:
            type: string
            format: uuid
          description: Get scores for specific item
        - name: threshold
          in: query
          schema:
            type: number
            minimum: 0
            maximum: 1
          description: Minimum alignment score threshold
      responses:
        '200':
          description: Alignment scores retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/AlignmentScore'
                  summary:
                    type: object
                    properties:
                      averageScore:
                        type: number
                        example: 0.847
                      highAlignmentCount:
                        type: integer
                        example: 45
                      mediumAlignmentCount:
                        type: integer
                        example: 12
                      lowAlignmentCount:
                        type: integer
                        example: 3
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /alignment/drift:
    get:
      tags:
        - Strategic Resonance
      summary: Get mission drift alerts
      description: Retrieve items with significant mission drift
      operationId: getMissionDrift
      parameters:
        - name: severity
          in: query
          schema:
            type: string
            enum: [critical, high, medium, low]
        - name: level
          in: query
          schema:
            $ref: '#/components/schemas/PyramidLevel'
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: Mission drift alerts retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/DriftAlert'
                  pagination:
                    $ref: '#/components/schemas/PaginationMeta'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /alignment/provenance/{id}:
    get:
      tags:
        - Strategic Resonance
      summary: Get L-Score and provenance
      description: Get detailed alignment score with source tracking
      operationId: getAlignmentProvenance
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
          description: Pyramid item ID
      responses:
        '200':
          description: Provenance data retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AlignmentProvenance'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /alignment/analyze:
    post:
      tags:
        - Strategic Resonance
      summary: Trigger alignment analysis
      description: Initiate alignment score recalculation
      operationId: analyzeAlignment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                scope:
                  type: string
                  enum: [full, level, item]
                  default: full
                level:
                  $ref: '#/components/schemas/PyramidLevel'
                itemId:
                  type: string
                  format: uuid
      responses:
        '202':
          description: Analysis initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  jobId:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [queued, processing]
                  estimatedCompletionTime:
                    type: string
                    format: date-time
        '400':
          $ref: '#/components/responses/BadRequestError'
      x-rate-limit:
        limit: 3
        window: 300s

  /alignment/heatmap:
    get:
      tags:
        - Strategic Resonance
      summary: Get alignment heat map data
      description: Retrieve data for alignment visualization heat map
      operationId: getAlignmentHeatmap
      responses:
        '200':
          description: Heat map data retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AlignmentHeatmap'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  # ============================================================================
  # DASHBOARDS & REPORTS
  # ============================================================================

  /dashboards/leader:
    get:
      tags:
        - Dashboards
      summary: Leader dashboard data
      description: Get aggregated data for leader dashboard
      operationId: getLeaderDashboard
      parameters:
        - name: timeRange
          in: query
          schema:
            type: string
            enum: [7d, 30d, 90d, 1y]
            default: 30d
      responses:
        '200':
          description: Leader dashboard data retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LeaderDashboard'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

  /dashboards/manager:
    get:
      tags:
        - Dashboards
      summary: Manager dashboard data
      description: Get aggregated data for team manager dashboard
      operationId: getManagerDashboard
      parameters:
        - name: timeRange
          in: query
          schema:
            type: string
            enum: [7d, 30d, 90d]
            default: 30d
        - name: teamId
          in: query
          schema:
            type: string
            format: uuid
          description: Filter by specific team
      responses:
        '200':
          description: Manager dashboard data retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ManagerDashboard'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'

  /dashboards/member:
    get:
      tags:
        - Dashboards
      summary: Member dashboard data
      description: Get data for team member dashboard
      operationId: getMemberDashboard
      parameters:
        - name: timeRange
          in: query
          schema:
            type: string
            enum: [7d, 30d, 90d]
            default: 30d
      responses:
        '200':
          description: Member dashboard data retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MemberDashboard'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /reports/generate:
    post:
      tags:
        - Reports
      summary: Generate custom report
      description: Create a custom report based on specified parameters
      operationId: generateReport
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReportRequest'
      responses:
        '202':
          description: Report generation initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  reportId:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [queued, processing]
                  estimatedCompletionTime:
                    type: string
                    format: date-time
        '400':
          $ref: '#/components/responses/BadRequestError'
      x-rate-limit:
        limit: 10
        window: 3600s

  /reports/{reportId}:
    get:
      tags:
        - Reports
      summary: Get report
      description: Retrieve generated report
      operationId: getReport
      parameters:
        - name: reportId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Report retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Report'
            application/pdf:
              schema:
                type: string
                format: binary
        '404':
          $ref: '#/components/responses/NotFoundError'

  /reports/board-deck:
    post:
      tags:
        - Reports
      summary: Generate board deck narrative
      description: Create executive board deck with strategic narrative
      operationId: generateBoardDeck
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                timeRange:
                  type: object
                  required:
                    - start
                    - end
                  properties:
                    start:
                      type: string
                      format: date
                    end:
                      type: string
                      format: date
                includeSections:
                  type: array
                  items:
                    type: string
                    enum: [mission, vision, objectives, alignment, market, risks, opportunities]
                  default: [mission, vision, objectives, alignment, market]
                format:
                  type: string
                  enum: [pdf, pptx, html]
                  default: pdf
      responses:
        '202':
          description: Board deck generation initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  deckId:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [queued, processing]
        '400':
          $ref: '#/components/responses/BadRequestError'

  # ============================================================================
  # MARKET INTELLIGENCE
  # ============================================================================

  /market/analyze:
    post:
      tags:
        - Market Intelligence
      summary: Analyze market document
      description: Process market intelligence document for insights
      operationId: analyzeMarket
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: Market intelligence document
                category:
                  type: string
                  enum: [competitor, trend, regulation, technology, customer]
                  example: competitor
                metadata:
                  type: object
                  additionalProperties: true
      responses:
        '202':
          description: Market analysis initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  analysisId:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [queued, processing]
        '400':
          $ref: '#/components/responses/BadRequestError'

  /market/signals:
    get:
      tags:
        - Market Intelligence
      summary: Get market signals
      description: Retrieve current market signals and insights
      operationId: getMarketSignals
      parameters:
        - name: category
          in: query
          schema:
            type: string
            enum: [competitor, trend, regulation, technology, customer, all]
            default: all
        - name: priority
          in: query
          schema:
            type: string
            enum: [critical, high, medium, low]
        - name: timeRange
          in: query
          schema:
            type: string
            enum: [24h, 7d, 30d, 90d]
            default: 30d
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: Market signals retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/MarketSignal'
                  pagination:
                    $ref: '#/components/schemas/PaginationMeta'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /market/simulate:
    post:
      tags:
        - Market Intelligence
      summary: Run "What-If" scenario
      description: Simulate market scenario impact on strategic alignment
      operationId: simulateMarketScenario
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MarketScenario'
      responses:
        '200':
          description: Simulation completed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimulationResult'
        '400':
          $ref: '#/components/responses/BadRequestError'
      x-rate-limit:
        limit: 5
        window: 300s

  # ============================================================================
  # WEBSOCKET ENDPOINTS (documented as HTTP upgrade)
  # ============================================================================

  /ws/alignment:
    get:
      tags:
        - Strategic Resonance
      summary: WebSocket - Real-time alignment updates
      description: |
        WebSocket endpoint for real-time alignment score updates.

        **Connection**: Upgrade HTTP to WebSocket with Bearer token in query parameter

        **Message Format**:
        ```json
        {
          "type": "alignment_update",
          "timestamp": "2025-01-15T10:30:00Z",
          "data": {
            "itemId": "uuid",
            "level": "project",
            "score": 0.85,
            "previousScore": 0.78
          }
        }
        ```
      operationId: websocketAlignment
      parameters:
        - name: token
          in: query
          required: true
          schema:
            type: string
          description: JWT Bearer token for authentication
      responses:
        '101':
          description: Switching Protocols - WebSocket connection established
        '401':
          $ref: '#/components/responses/UnauthorizedError'
      x-websocket: true

  /ws/drift:
    get:
      tags:
        - Strategic Resonance
      summary: WebSocket - Real-time drift alerts
      description: |
        WebSocket endpoint for real-time mission drift notifications.

        **Message Format**:
        ```json
        {
          "type": "drift_alert",
          "timestamp": "2025-01-15T10:30:00Z",
          "data": {
            "itemId": "uuid",
            "level": "project",
            "severity": "high",
            "driftScore": 0.34,
            "recommendations": ["..."]
          }
        }
        ```
      operationId: websocketDrift
      parameters:
        - name: token
          in: query
          required: true
          schema:
            type: string
      responses:
        '101':
          description: Switching Protocols - WebSocket connection established
        '401':
          $ref: '#/components/responses/UnauthorizedError'
      x-websocket: true

# ============================================================================
# COMPONENTS
# ============================================================================

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtained from /auth/login endpoint

    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for service integrations

  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
      description: Page number for pagination

    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
      description: Number of items per page

    DocumentIdParam:
      name: id
      in: path
      required: true
      schema:
        type: string
        format: uuid
      description: Document unique identifier

    PyramidLevelParam:
      name: level
      in: path
      required: true
      schema:
        $ref: '#/components/schemas/PyramidLevel'
      description: Pyramid of Clarity level

    PyramidItemIdParam:
      name: id
      in: path
      required: true
      schema:
        type: string
        format: uuid
      description: Pyramid item unique identifier

  schemas:
    # Auth schemas
    AuthResponse:
      type: object
      required:
        - accessToken
        - refreshToken
        - tokenType
        - expiresIn
        - user
      properties:
        accessToken:
          type: string
          example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        refreshToken:
          type: string
          example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        tokenType:
          type: string
          enum: [Bearer]
          example: Bearer
        expiresIn:
          type: integer
          description: Token expiration in seconds
          example: 3600
        user:
          $ref: '#/components/schemas/User'

    User:
      type: object
      required:
        - id
        - email
        - name
        - role
        - organizationId
      properties:
        id:
          type: string
          format: uuid
          example: user-123e4567-e89b-12d3-a456-426614174000
        email:
          type: string
          format: email
          example: john.doe@company.com
        name:
          type: string
          example: John Doe
        role:
          type: string
          enum: [leader, manager, member]
          example: leader
        organizationId:
          type: string
          format: uuid
          example: org-123e4567-e89b-12d3-a456-426614174000
        permissions:
          type: array
          items:
            type: string
          example: [read:all, write:pyramid, manage:team]

    ApiKey:
      type: object
      required:
        - id
        - name
        - scopes
        - createdAt
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          example: Integration Service Key
        scopes:
          type: array
          items:
            type: string
          example: [read:documents, read:alignment]
        createdAt:
          type: string
          format: date-time
        lastUsedAt:
          type: string
          format: date-time
          nullable: true
        expiresAt:
          type: string
          format: date-time
          nullable: true

    ApiKeyWithSecret:
      allOf:
        - $ref: '#/components/schemas/ApiKey'
        - type: object
          required:
            - secret
          properties:
            secret:
              type: string
              description: API key secret (only shown once at creation)
              example: pk_live_abc123xyz789def456

    # Document schemas
    Document:
      type: object
      required:
        - id
        - name
        - type
        - status
        - uploadedAt
        - uploadedBy
      properties:
        id:
          type: string
          example: doc-123e4567-e89b-12d3-a456-426614174000
        name:
          type: string
          example: Strategic Plan 2025
        type:
          type: string
          enum: [strategic, operational, market, reference]
        status:
          type: string
          enum: [processing, ready, error]
        uploadedAt:
          type: string
          format: date-time
        uploadedBy:
          type: object
          properties:
            id:
              type: string
              format: uuid
            name:
              type: string
            role:
              type: string
              enum: [leader, manager, member]
        size:
          type: integer
          description: File size in bytes
        chunkCount:
          type: integer
          description: Number of semantic chunks

    DocumentDetail:
      allOf:
        - $ref: '#/components/schemas/Document'
        - type: object
          properties:
            metadata:
              type: object
              additionalProperties: true
            processingMetrics:
              type: object
              properties:
                processingTime:
                  type: number
                  description: Processing time in seconds
                embeddingModel:
                  type: string
                  example: ruvector-v1
                chunkStrategy:
                  type: string
                  example: semantic-paragraphs

    DocumentChunk:
      type: object
      required:
        - id
        - documentId
        - content
        - sequence
      properties:
        id:
          type: string
          format: uuid
        documentId:
          type: string
          format: uuid
        content:
          type: string
          description: Chunk text content
        sequence:
          type: integer
          description: Position in document
        embedding:
          type: array
          items:
            type: number
          description: Ruvector embedding (optional, large payload)
        metadata:
          type: object
          properties:
            pageNumber:
              type: integer
            section:
              type: string

    DocumentEmbedding:
      type: object
      required:
        - documentId
        - model
        - embedding
      properties:
        documentId:
          type: string
          format: uuid
        model:
          type: string
          example: ruvector-v1
        embedding:
          type: array
          items:
            type: number
          description: Full document embedding vector
        dimensions:
          type: integer
          example: 1536

    # Pyramid schemas
    PyramidLevel:
      type: string
      enum: [mission, vision, objectives, goals, portfolios, programs, projects, tasks]

    PyramidHierarchy:
      type: object
      required:
        - mission
      properties:
        mission:
          $ref: '#/components/schemas/PyramidItem'
        vision:
          type: array
          items:
            $ref: '#/components/schemas/PyramidItem'
        objectives:
          type: array
          items:
            $ref: '#/components/schemas/PyramidItem'
        goals:
          type: array
          items:
            $ref: '#/components/schemas/PyramidItem'
        portfolios:
          type: array
          items:
            $ref: '#/components/schemas/PyramidItem'
        programs:
          type: array
          items:
            $ref: '#/components/schemas/PyramidItem'
        projects:
          type: array
          items:
            $ref: '#/components/schemas/PyramidItem'
        tasks:
          type: array
          items:
            $ref: '#/components/schemas/PyramidItem'

    PyramidItem:
      type: object
      required:
        - id
        - level
        - title
        - createdAt
        - updatedAt
      properties:
        id:
          type: string
          format: uuid
        level:
          $ref: '#/components/schemas/PyramidLevel'
        title:
          type: string
          example: Become market leader in AI-driven strategic planning
        description:
          type: string
        status:
          type: string
          enum: [draft, active, on-hold, completed, archived]
          default: draft
        owner:
          type: object
          properties:
            id:
              type: string
              format: uuid
            name:
              type: string
        alignmentScore:
          type: number
          minimum: 0
          maximum: 1
          example: 0.847
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        metadata:
          type: object
          additionalProperties: true

    PyramidItemDetail:
      allOf:
        - $ref: '#/components/schemas/PyramidItem'
        - type: object
          properties:
            parentId:
              type: string
              format: uuid
              nullable: true
            childrenCount:
              type: integer
            documents:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                    format: uuid
                  name:
                    type: string
                  relevanceScore:
                    type: number
            history:
              type: array
              items:
                type: object
                properties:
                  timestamp:
                    type: string
                    format: date-time
                  action:
                    type: string
                  user:
                    type: string
                  changes:
                    type: object

    PyramidItemCreate:
      type: object
      required:
        - title
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 255
        description:
          type: string
        parentId:
          type: string
          format: uuid
          description: Parent item ID (required for levels below mission)
        status:
          type: string
          enum: [draft, active]
          default: draft
        ownerId:
          type: string
          format: uuid
        metadata:
          type: object
          additionalProperties: true

    PyramidItemUpdate:
      type: object
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 255
        description:
          type: string
        status:
          type: string
          enum: [draft, active, on-hold, completed, archived]
        ownerId:
          type: string
          format: uuid
        metadata:
          type: object
          additionalProperties: true

    PyramidLink:
      type: object
      required:
        - id
        - parentId
        - childId
        - createdAt
      properties:
        id:
          type: string
          format: uuid
        parentId:
          type: string
          format: uuid
        parentLevel:
          $ref: '#/components/schemas/PyramidLevel'
        childId:
          type: string
          format: uuid
        childLevel:
          $ref: '#/components/schemas/PyramidLevel'
        strength:
          type: number
          minimum: 0
          maximum: 1
          description: Link strength/relevance
        createdAt:
          type: string
          format: date-time

    # Alignment schemas
    AlignmentScore:
      type: object
      required:
        - itemId
        - level
        - score
        - calculatedAt
      properties:
        itemId:
          type: string
          format: uuid
        level:
          $ref: '#/components/schemas/PyramidLevel'
        score:
          type: number
          minimum: 0
          maximum: 1
          example: 0.847
        previousScore:
          type: number
          minimum: 0
          maximum: 1
          nullable: true
        trend:
          type: string
          enum: [improving, declining, stable]
        calculatedAt:
          type: string
          format: date-time
        components:
          type: object
          description: Score breakdown by component
          properties:
            documentAlignment:
              type: number
            hierarchyAlignment:
              type: number
            stakeholderAlignment:
              type: number

    DriftAlert:
      type: object
      required:
        - id
        - itemId
        - level
        - severity
        - driftScore
        - detectedAt
      properties:
        id:
          type: string
          format: uuid
        itemId:
          type: string
          format: uuid
        level:
          $ref: '#/components/schemas/PyramidLevel'
        severity:
          type: string
          enum: [critical, high, medium, low]
        driftScore:
          type: number
          minimum: 0
          maximum: 1
          description: Measure of drift from mission (higher = more drift)
          example: 0.34
        detectedAt:
          type: string
          format: date-time
        description:
          type: string
          example: Project objectives diverging from organizational mission
        recommendations:
          type: array
          items:
            type: string
          example:
            - Review project scope with mission alignment in mind
            - Update project description to clarify strategic value

    AlignmentProvenance:
      type: object
      required:
        - itemId
        - lScore
        - sources
      properties:
        itemId:
          type: string
          format: uuid
        lScore:
          type: number
          minimum: 0
          maximum: 1
          description: Loyalty score - alignment to mission
          example: 0.892
        sources:
          type: array
          items:
            type: object
            properties:
              documentId:
                type: string
                format: uuid
              documentName:
                type: string
              chunkId:
                type: string
                format: uuid
              content:
                type: string
                description: Relevant chunk content
              relevanceScore:
                type: number
              contribution:
                type: number
                description: Contribution to overall L-Score
        ancestorScores:
          type: array
          description: Alignment scores up the hierarchy
          items:
            type: object
            properties:
              level:
                $ref: '#/components/schemas/PyramidLevel'
              itemId:
                type: string
                format: uuid
              title:
                type: string
              score:
                type: number
        calculatedAt:
          type: string
          format: date-time

    AlignmentHeatmap:
      type: object
      required:
        - data
        - generatedAt
      properties:
        data:
          type: array
          items:
            type: object
            properties:
              level:
                $ref: '#/components/schemas/PyramidLevel'
              items:
                type: array
                items:
                  type: object
                  properties:
                    itemId:
                      type: string
                      format: uuid
                    title:
                      type: string
                    score:
                      type: number
                    position:
                      type: object
                      properties:
                        x:
                          type: integer
                        y:
                          type: integer
        colorScale:
          type: object
          properties:
            min:
              type: number
              example: 0
            max:
              type: number
              example: 1
            thresholds:
              type: object
              properties:
                high:
                  type: number
                  example: 0.8
                medium:
                  type: number
                  example: 0.5
                low:
                  type: number
                  example: 0.3
        generatedAt:
          type: string
          format: date-time

    # Dashboard schemas
    LeaderDashboard:
      type: object
      required:
        - organizationHealth
        - alignmentSummary
        - strategicMetrics
      properties:
        organizationHealth:
          type: object
          properties:
            overallScore:
              type: number
              example: 0.847
            trend:
              type: string
              enum: [improving, declining, stable]
            activeInitiatives:
              type: integer
              example: 47
            completedThisMonth:
              type: integer
              example: 12
        alignmentSummary:
          type: object
          properties:
            averageScore:
              type: number
              example: 0.823
            driftAlerts:
              type: integer
              example: 3
            topAligned:
              type: array
              items:
                $ref: '#/components/schemas/PyramidItem'
            needsAttention:
              type: array
              items:
                $ref: '#/components/schemas/PyramidItem'
        strategicMetrics:
          type: object
          properties:
            objectivesOnTrack:
              type: integer
            portfolioHealth:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                    format: uuid
                  name:
                    type: string
                  score:
                    type: number
                  budget:
                    type: object
                    properties:
                      allocated:
                        type: number
                      spent:
                        type: number
                      remaining:
                        type: number
        marketIntelligence:
          type: object
          properties:
            recentSignals:
              type: array
              items:
                $ref: '#/components/schemas/MarketSignal'
            criticalAlerts:
              type: integer
        recentActivity:
          type: array
          items:
            type: object
            properties:
              timestamp:
                type: string
                format: date-time
              type:
                type: string
              description:
                type: string
              user:
                type: string

    ManagerDashboard:
      type: object
      required:
        - teamPerformance
        - projectStatus
        - alignmentMetrics
      properties:
        teamPerformance:
          type: object
          properties:
            teamSize:
              type: integer
            activeProjects:
              type: integer
            completionRate:
              type: number
            averageAlignment:
              type: number
        projectStatus:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
                format: uuid
              name:
                type: string
              status:
                type: string
              alignmentScore:
                type: number
              progress:
                type: number
              dueDate:
                type: string
                format: date
        alignmentMetrics:
          type: object
          properties:
            teamAlignment:
              type: number
            improvementAreas:
              type: array
              items:
                type: string
        taskDistribution:
          type: object
          properties:
            total:
              type: integer
            completed:
              type: integer
            inProgress:
              type: integer
            blocked:
              type: integer

    MemberDashboard:
      type: object
      required:
        - myTasks
        - myProjects
        - alignmentInsights
      properties:
        myTasks:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
                format: uuid
              title:
                type: string
              status:
                type: string
              dueDate:
                type: string
                format: date
              priority:
                type: string
                enum: [critical, high, medium, low]
              alignmentScore:
                type: number
        myProjects:
          type: array
          items:
            $ref: '#/components/schemas/PyramidItem'
        alignmentInsights:
          type: object
          properties:
            personalAlignment:
              type: number
              description: How well member's work aligns with mission
            contributionImpact:
              type: string
              description: Narrative of member's strategic contribution
        recentUpdates:
          type: array
          items:
            type: object
            properties:
              timestamp:
                type: string
                format: date-time
              type:
                type: string
              message:
                type: string

    # Report schemas
    ReportRequest:
      type: object
      required:
        - type
        - timeRange
      properties:
        type:
          type: string
          enum: [alignment, performance, strategic, custom]
        timeRange:
          type: object
          required:
            - start
            - end
          properties:
            start:
              type: string
              format: date
            end:
              type: string
              format: date
        filters:
          type: object
          properties:
            levels:
              type: array
              items:
                $ref: '#/components/schemas/PyramidLevel'
            teams:
              type: array
              items:
                type: string
                format: uuid
            owners:
              type: array
              items:
                type: string
                format: uuid
        format:
          type: string
          enum: [json, pdf, csv, xlsx]
          default: json
        includeSections:
          type: array
          items:
            type: string

    Report:
      type: object
      required:
        - id
        - type
        - status
        - createdAt
      properties:
        id:
          type: string
          format: uuid
        type:
          type: string
        status:
          type: string
          enum: [generating, ready, error]
        createdAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
          nullable: true
        downloadUrl:
          type: string
          format: uri
          nullable: true
        expiresAt:
          type: string
          format: date-time
          description: URL expiration time
        metadata:
          type: object
          properties:
            size:
              type: integer
            pageCount:
              type: integer

    # Market Intelligence schemas
    MarketSignal:
      type: object
      required:
        - id
        - category
        - priority
        - title
        - detectedAt
      properties:
        id:
          type: string
          format: uuid
        category:
          type: string
          enum: [competitor, trend, regulation, technology, customer]
        priority:
          type: string
          enum: [critical, high, medium, low]
        title:
          type: string
          example: Competitor X launches AI-driven planning tool
        description:
          type: string
        source:
          type: object
          properties:
            documentId:
              type: string
              format: uuid
            url:
              type: string
              format: uri
        detectedAt:
          type: string
          format: date-time
        impact:
          type: object
          properties:
            score:
              type: number
              description: Potential impact score (0-1)
            affectedAreas:
              type: array
              items:
                type: string
        recommendations:
          type: array
          items:
            type: string

    MarketScenario:
      type: object
      required:
        - name
        - assumptions
      properties:
        name:
          type: string
          example: Aggressive Competitor Entry
        description:
          type: string
        assumptions:
          type: array
          items:
            type: object
            properties:
              parameter:
                type: string
                example: market_growth_rate
              value:
                type: number
              unit:
                type: string
                example: percentage
        timeHorizon:
          type: string
          enum: [3months, 6months, 1year, 2years]
          default: 1year
        impactAreas:
          type: array
          items:
            $ref: '#/components/schemas/PyramidLevel'

    SimulationResult:
      type: object
      required:
        - scenarioId
        - executedAt
        - impactAnalysis
      properties:
        scenarioId:
          type: string
          format: uuid
        executedAt:
          type: string
          format: date-time
        impactAnalysis:
          type: object
          properties:
            overallImpact:
              type: number
              description: Overall impact score (-1 to 1, negative is adverse)
              example: -0.23
            affectedItems:
              type: array
              items:
                type: object
                properties:
                  itemId:
                    type: string
                    format: uuid
                  level:
                    $ref: '#/components/schemas/PyramidLevel'
                  title:
                    type: string
                  currentScore:
                    type: number
                  projectedScore:
                    type: number
                  delta:
                    type: number
            recommendations:
              type: array
              items:
                type: object
                properties:
                  priority:
                    type: string
                    enum: [critical, high, medium, low]
                  action:
                    type: string
                  rationale:
                    type: string
                  estimatedEffort:
                    type: string
        confidenceLevel:
          type: number
          minimum: 0
          maximum: 1
          description: Simulation confidence level
          example: 0.78

    # Common schemas
    PaginationMeta:
      type: object
      required:
        - page
        - limit
        - total
        - totalPages
      properties:
        page:
          type: integer
          example: 1
        limit:
          type: integer
          example: 20
        total:
          type: integer
          example: 156
        totalPages:
          type: integer
          example: 8
        hasNext:
          type: boolean
          example: true
        hasPrevious:
          type: boolean
          example: false

    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              example: INVALID_REQUEST
            message:
              type: string
              example: Invalid request parameters
            details:
              type: object
              additionalProperties: true
            timestamp:
              type: string
              format: date-time

  responses:
    BadRequestError:
      description: Bad request - Invalid input parameters
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: INVALID_REQUEST
              message: Invalid request parameters
              details:
                field: email
                issue: Invalid email format

    UnauthorizedError:
      description: Unauthorized - Invalid or missing authentication
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: UNAUTHORIZED
              message: Invalid or expired authentication token

    ForbiddenError:
      description: Forbidden - Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: FORBIDDEN
              message: Insufficient permissions for this operation
              details:
                requiredRole: leader
                currentRole: member

    NotFoundError:
      description: Not found - Resource does not exist
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: NOT_FOUND
              message: Resource not found

    RateLimitError:
      description: Too many requests - Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
          description: Request limit per window
        X-RateLimit-Remaining:
          schema:
            type: integer
          description: Remaining requests in current window
        X-RateLimit-Reset:
          schema:
            type: integer
          description: Time when rate limit resets (Unix timestamp)
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: RATE_LIMIT_EXCEEDED
              message: Too many requests. Please try again later.
              details:
                retryAfter: 45

# Rate Limiting Policies

## Global Rate Limits
- **Authenticated Users**: 1000 requests/hour
- **API Keys**: 5000 requests/hour (configurable per key)
- **Anonymous**: 100 requests/hour (login/register only)

## Endpoint-Specific Limits
- **POST /auth/login**: 5 requests/60s per IP
- **POST /documents**: 10 uploads/60s per user
- **POST /alignment/analyze**: 3 requests/300s per organization
- **POST /market/simulate**: 5 requests/300s per organization
- **POST /reports/generate**: 10 requests/3600s per user

## Rate Limit Headers
All responses include rate limit information:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1642089600
```

# Pagination Strategy

## Cursor-Based Pagination (Preferred for large datasets)
For endpoints returning large result sets, cursor-based pagination is recommended:

```
GET /documents?cursor=eyJpZCI6ImRvYy0xMjMiLCJ0cyI6MTY0MjA4OTYwMH0&limit=20
```

Response includes next cursor:
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6ImRvYy0xNDMiLCJ0cyI6MTY0MjA4OTYyMH0",
    "hasMore": true
  }
}
```

## Offset-Based Pagination (Current implementation)
Standard page/limit pagination for simpler use cases.

# WebSocket Protocol

## Authentication
WebSocket connections authenticate via query parameter:
```
wss://api.pka-strat.com/v1/ws/alignment?token=<jwt-token>
```

## Message Format
All WebSocket messages follow this structure:
```json
{
  "type": "message_type",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": { ... }
}
```

## Client-to-Server Messages
```json
{
  "type": "subscribe",
  "channels": ["alignment", "drift"],
  "filters": {
    "levels": ["projects", "tasks"],
    "teams": ["team-123"]
  }
}
```

## Server-to-Client Messages
```json
{
  "type": "alignment_update",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "itemId": "uuid",
    "level": "project",
    "score": 0.85,
    "previousScore": 0.78
  }
}
```

## Heartbeat
Server sends heartbeat every 30 seconds:
```json
{
  "type": "ping",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

Client should respond with:
```json
{
  "type": "pong",
  "timestamp": "2025-01-15T10:30:01Z"
}
```

# Security Considerations

## HTTPS Required
All API endpoints must be accessed over HTTPS in production.

## CORS Policy
```
Access-Control-Allow-Origin: https://app.pka-strat.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-API-Key
Access-Control-Max-Age: 86400
```

## Content Security Policy
API responses include CSP headers for embedded content.

## Data Encryption
- All data in transit encrypted via TLS 1.3
- Sensitive data at rest encrypted using AES-256
- Document embeddings encrypted in vector database

## Audit Logging
All API operations are logged with:
- User/API key identification
- Timestamp
- Operation performed
- IP address
- Request/response status

# Versioning Strategy

## URL Versioning
Current: `/v1/...`
Future versions: `/v2/...`

## Deprecation Policy
- Minimum 6 months notice for breaking changes
- Deprecation warnings in response headers:
  ```
  Deprecation: true
  Sunset: Sat, 31 Dec 2025 23:59:59 GMT
  Link: </v2/documents>; rel="successor-version"
  ```

## Version Support
- Current version (v1): Full support
- Previous version: Security updates only for 12 months
- Older versions: Unsupported

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-15
**Status**: Draft for Review
```

## Implementation Notes

### Technology Recommendations

1. **API Framework**
   - Node.js with Express or Fastify
   - TypeScript for type safety
   - OpenAPI validation middleware

2. **Authentication**
   - JWT with RS256 signing
   - Redis for token blacklisting
   - Local authentication with optional SSO integration

3. **Database**
   - PostgreSQL for relational data (pyramid structure, users)
   - RuVector extension for embeddings and hypergraph (local)
   - Redis for caching and rate limiting

4. **File Storage**
   - Local file system (`./data/documents/`)
   - Nginx/Traefik for static file serving

5. **Real-time**
   - Socket.io or ws library for WebSocket
   - Redis pub/sub for horizontal scaling

6. **Background Jobs**
   - Bull Queue with Redis
   - Separate worker processes for document processing

### Next Steps

1. **Backend Implementation**
   - Set up Express/Fastify server
   - Implement authentication middleware
   - Create database schemas
   - Build API endpoints following this specification

2. **Integration**
   - Connect to vector database for Ruvector embeddings
   - Implement document processing pipeline
   - Build alignment scoring engine

3. **Testing**
   - Unit tests for all endpoints
   - Integration tests for workflows
   - Load testing for performance validation

4. **Documentation**
   - Generate interactive API docs (Swagger UI)
   - Create integration guides
   - Provide SDK/client library examples
