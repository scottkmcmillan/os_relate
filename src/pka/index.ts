/**
 * PKA-STRAT Module Index
 * Exports all types, interfaces, and utilities for the Pyramid of Clarity framework.
 */

// Type Definitions
export type {
  PyramidLevel,
  PyramidEntity,
  AlignmentFactor,
  AlignmentScore,
  AlignmentScoreBreakdown,
  StoredAlignmentScore,
  DriftAlert,
  DocumentIngestion,
  DocumentType,
  UserRole,
  StoryExtraction,
  ProvenanceChain,
  Team,
  Organization,
  PyramidFilter,
  PaginatedResult,
} from './types.js';

// Constants
export { PYRAMID_WEIGHTS } from './types.js';

// Memory Manager
export { PKAMemoryManager, createPKAMemoryManager } from './memory.js';

// Alignment Module
export {
  AlignmentCalculator,
  createAlignmentCalculator,
  DriftDetector,
  createDriftDetector,
} from './alignment/index.js';

export type {
  AlignmentWeights,
  DriftThresholds,
} from './alignment/index.js';
