/**
 * PKA-STRAT Alignment Module
 *
 * Provides alignment calculation and drift detection capabilities
 * for the Pyramid of Clarity framework.
 */

export { AlignmentCalculator, createAlignmentCalculator } from './calculator.js';
export { DriftDetector, createDriftDetector } from './drift-detector.js';
export type { AlignmentWeights } from './calculator.js';
export type { DriftThresholds } from './drift-detector.js';
