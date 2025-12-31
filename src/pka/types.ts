/**
 * PKA-STRAT Type Definitions
 * Implements the Pyramid of Clarity data model
 *
 * The PKA (Pyramid of Knowledge Alignment) framework organizes strategic entities
 * in a hierarchical structure from Mission down to Tasks, enabling alignment tracking,
 * drift detection, and provenance-based storytelling.
 */

/**
 * Represents the hierarchical levels in the Pyramid of Clarity.
 * Ordered from highest (mission) to lowest (task) strategic level.
 */
export type PyramidLevel =
  | 'mission'
  | 'vision'
  | 'objective'
  | 'goal'
  | 'portfolio'
  | 'program'
  | 'project'
  | 'task';

/**
 * Core entity within the Pyramid of Clarity.
 * Represents any strategic element from Mission down to Task.
 */
export interface PyramidEntity {
  /** Unique identifier for the entity */
  id: string;
  /** Organization this entity belongs to */
  organizationId: string;
  /** Hierarchical level in the pyramid */
  level: PyramidLevel;
  /** Human-readable name */
  name: string;
  /** Detailed description of the entity */
  description: string;
  /** Parent entity ID (null for mission-level entities) */
  parentId: string | null;
  /** Associated document IDs for provenance tracking */
  documentIds: string[];
  /** Computed alignment score (0-1) with parent entities */
  alignmentScore: number;
  /** Flexible metadata storage (optional) */
  metadata?: Record<string, unknown>;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
}

/**
 * Factor contributing to alignment score calculation.
 */
export interface AlignmentFactor {
  /** Factor name */
  name: string;
  /** Factor weight */
  weight: number;
  /** Factor score (0-1) */
  score: number;
  /** Explanation */
  reason: string;
}

/**
 * Quantified alignment measurement for a pyramid entity.
 * Combines vector similarity, graph connectivity, and drift analysis.
 */
export interface AlignmentScore {
  /** Entity this score applies to */
  entityId: string;
  /** Composite alignment score (0-1 or 0-100) */
  score: number;
  /** Semantic vector distance from parent */
  vectorDistance: number;
  /** Graph-based connectivity strength */
  graphConnectivity: number;
  /** Measure of strategic drift over time */
  driftIndicator: number;
  /** Confidence in the score calculation */
  confidence: number;
  /** ISO timestamp of last calculation */
  lastCalculated: string;
}

/**
 * Detailed alignment score breakdown with level-by-level analysis.
 * Used internally by the memory manager for calculation.
 */
export interface AlignmentScoreBreakdown {
  /** Entity this score applies to */
  entityId: string;
  /** Composite alignment score (0-1) - primary score field */
  score: number;
  /** Composite alignment score (0-1) - alias for score */
  overall: number;
  /** Score per pyramid level */
  byLevel: Partial<Record<PyramidLevel, number>>;
  /** Contributing factors */
  factors: AlignmentFactor[];
  /** ISO timestamp of calculation */
  calculatedAt: string;
}

/**
 * Extended alignment score that combines AlignmentScore with breakdown details.
 * Used for storing and displaying complete alignment analysis results.
 */
export interface StoredAlignmentScore extends AlignmentScore {
  /** Composite alignment score (0-1) - alias for score */
  overall: number;
  /** Score per pyramid level */
  byLevel: Partial<Record<PyramidLevel, number>>;
  /** Contributing factors */
  factors: AlignmentFactor[];
  /** ISO timestamp of calculation */
  calculatedAt: string;
}

/**
 * Alert raised when an entity drifts from strategic alignment.
 * Enables proactive realignment and organizational visibility.
 */
export interface DriftAlert {
  /** Unique alert identifier */
  id: string;
  /** Entity experiencing drift */
  entityId: string;
  /** Alert severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Quantified drift score */
  driftScore: number;
  /** Human-readable alert message */
  message: string;
  /** Recommended corrective action */
  suggestedAction: string;
  /** ISO timestamp when drift was detected */
  detectedAt: string;
  /** Whether the alert has been acknowledged */
  acknowledged: boolean;
}

/**
 * Tracks the ingestion status of uploaded documents.
 * Documents are processed, chunked, and linked to pyramid entities.
 */
export interface DocumentIngestion {
  /** Unique ingestion job identifier */
  id: string;
  /** Original filename */
  filename: string;
  /** Classified document type */
  documentType: DocumentType;
  /** Current processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Organization owning the document */
  organizationId: string;
  /** Optional pyramid entity this document is linked to */
  linkedEntityId?: string;
  /** Number of text chunks extracted */
  extractedChunks: number;
  /** Any errors encountered during processing */
  processingErrors: string[];
  /** ISO timestamp of upload */
  uploadedAt: string;
  /** ISO timestamp of completion (if applicable) */
  completedAt?: string;
}

/**
 * Classification of document types for strategic mapping.
 * Determines how documents are processed and linked.
 */
export type DocumentType =
  | 'mission_statement'
  | 'vision_document'
  | 'strategic_plan'
  | 'okr_framework'
  | 'project_plan'
  | 'research_report'
  | 'product_spec'
  | 'org_chart'
  | 'other';

/**
 * User role assignment within the organization hierarchy.
 * Controls access and visibility at different levels.
 */
export interface UserRole {
  /** Role type determining permissions */
  role: 'leader' | 'manager' | 'member';
  /** Organization scope */
  organizationId: string;
  /** Optional team scope for team-level roles */
  teamId?: string;
}

/**
 * Extracted narrative connecting work to strategic purpose.
 * Enables storytelling and provenance-based reporting.
 */
export interface StoryExtraction {
  /** Unique extraction identifier */
  id: string;
  /** Source document ID */
  documentId: string;
  /** Target pyramid entity */
  entityId: string;
  /** Human-readable narrative */
  narrative: string;
  /** Explanation of strategic connection */
  strategicConnection: string;
  /** Full provenance chain to mission */
  provenance: ProvenanceChain;
  /** ISO timestamp of extraction */
  extractedAt: string;
}

/**
 * Complete provenance chain from a work item to mission.
 * Enables "connect my work to mission" storytelling.
 */
export interface ProvenanceChain {
  /** Original document source */
  documentSource: string;
  /** Chunk IDs used for extraction */
  chunkIds: string[];
  /** Path of entities from current to mission */
  pathToMission: PyramidEntity[];
  /** Confidence scores at each level */
  confidenceScores: number[];
}

/**
 * Team within an organization.
 * Groups members, manages projects, and tracks collective alignment.
 */
export interface Team {
  /** Unique team identifier */
  id: string;
  /** Parent organization */
  organizationId: string;
  /** Team name */
  name: string;
  /** Team manager user ID */
  managerId: string;
  /** Member user IDs */
  memberIds: string[];
  /** Associated project IDs */
  projectIds: string[];
  /** Aggregate alignment score for the team */
  alignmentScore: number;
  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * Top-level organization entity.
 * Contains the mission and serves as the root of the pyramid.
 */
export interface Organization {
  /** Unique organization identifier */
  id: string;
  /** Organization name */
  name: string;
  /** Root mission entity ID */
  missionId: string;
  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * Filter criteria for pyramid entity queries.
 * Supports filtering by organization, level, parent, and alignment thresholds.
 */
export interface PyramidFilter {
  /** Filter by organization ID */
  organizationId?: string;
  /** Filter to specific pyramid levels */
  levels?: PyramidLevel[];
  /** Filter by parent entity ID */
  parentId?: string;
  /** Minimum alignment score threshold */
  minAlignmentScore?: number;
  /** Maximum alignment score threshold */
  maxAlignmentScore?: number;
}

/**
 * Paginated result wrapper for list queries.
 * Includes pagination metadata and result items.
 */
export interface PaginatedResult<T> {
  /** Result items for this page */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Whether more pages exist */
  hasMore: boolean;
}

/**
 * Strategic weights for each pyramid level.
 * Higher levels have greater weight in alignment calculations.
 */
export const PYRAMID_WEIGHTS: Record<PyramidLevel, number> = {
  mission: 1.0,
  vision: 0.95,
  objective: 0.85,
  goal: 0.75,
  portfolio: 0.65,
  program: 0.55,
  project: 0.45,
  task: 0.35
};
