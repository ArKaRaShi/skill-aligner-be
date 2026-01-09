/**
 * Question Analyses Module Types
 *
 * This barrel exports all types from the question-analyses module.
 * Import from individual files for better tree-shaking,
 * or import from here for convenience.
 *
 * @example
 * // Granular imports (recommended for better tree-shaking)
 * import type { EntityType, ConfidenceLevel } from './core.enums';
 * import type { ExtractedEntity } from './entity-types';
 *
 * @example
 * // Convenience import
 * import type { EntityType, ExtractedEntity, QuestionLogAnalysis } from './types';
 */

// Core enumerations
export type {
  EntityType,
  ConfidenceLevel,
  ExtractionSource,
  ExtractionQuality,
} from './core.enums';

// Entity types
export type {
  BaseExtractedEntity,
  TopicExtraction,
  SkillExtraction,
  TaskExtraction,
  RoleExtraction,
  ExtractedEntity,
  EntityCounts,
} from './entity-types';

// Extraction operation types
export type {
  LlmExtractedEntity,
  EntityExtractionResult,
  CreateExtractionInput,
  ExtractionResult,
  ExtractionHistoryEntry,
} from './extraction.types';

// Domain model types
export type { QuestionLogAnalysis, ExtractedEntityDb } from './domain.types';

// Analytics types
export type {
  TrendingResult,
  QualityDistribution,
  LifetimeStats,
  ExampleQuestion,
  EntityQuestionExamples,
  TopQuestion,
} from './analytics.types';
