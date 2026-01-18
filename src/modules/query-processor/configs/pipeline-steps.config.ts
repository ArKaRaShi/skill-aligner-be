/**
 * Pipeline step configuration - Single source of truth for all pipeline metadata.
 *
 * This file consolidates timing, token, and display configurations into one place.
 * All step-related constants should be imported from this file.
 *
 * @example
 * Usage in use cases:
 * ```ts
 * import { PIPELINE_STEPS } from './pipeline-steps.config';
 *
 * // Timing
 * this.timeLogger.startTiming(timing, PIPELINE_STEPS.CLASSIFICATION.TIMING_KEY);
 *
 * // Tokens
 * this.tokenLogger.addTokenUsage(tokenMap, PIPELINE_STEPS.ANSWER_SYNTHESIS.TOKEN_KEY, usage);
 *
 * // Display
 * results[PIPELINE_STEPS.OVERALL.DISPLAY_KEY] = value;
 * ```
 */

// ============================================================================
// PIPELINE STEP ENUMERATION
// ============================================================================

/**
 * Pipeline step enumeration.
 * Used for database step names and display purposes.
 *
 * Note: OVERALL is included for consistency across timing, token, and display configurations.
 */
export enum PipelineStep {
  OVERALL = 'OVERALL',
  CLASSIFICATION = 'CLASSIFICATION',
  SKILL_EXPANSION = 'SKILL_EXPANSION',
  COURSE_RETRIEVAL = 'COURSE_RETRIEVAL',
  RELEVANCE_FILTER = 'RELEVANCE_FILTER',
  COURSE_AGGREGATION = 'COURSE_AGGREGATION',
  ANSWER_SYNTHESIS = 'ANSWER_SYNTHESIS',
}

// ============================================================================
// PIPELINE STEPS CONFIGURATION
// ============================================================================

/**
 * Single source of truth for all pipeline step metadata.
 *
 * Each step contains:
 * - TIMING_KEY: Used with TimeLogger for performance tracking
 * - TOKEN_KEY: Used with TokenLogger for LLM token tracking
 * - DISPLAY_KEY: Used as object property keys in metrics output
 * - DATABASE_NAME: Corresponds to StepName enum in query-logging module (null for OVERALL)
 */
export const PIPELINE_STEPS = {
  /**
   * OVERALL - Aggregated metrics across all steps
   * Note: Not a real database step, but used for timing/token aggregation
   */
  OVERALL: {
    TIMING_KEY: 'overall',
    TOKEN_KEY: 'overall',
    DISPLAY_KEY: 'total',
    DATABASE_NAME: null,
  },

  /**
   * Step 1: Question Classification
   * Classifies questions as relevant/irrelevant/dangerous
   */
  CLASSIFICATION: {
    TIMING_KEY: 'step1-question-classification',
    TOKEN_KEY: 'step1-question-classification',
    DISPLAY_KEY: 'step1-question-classification',
    DATABASE_NAME: 'QUESTION_CLASSIFICATION' as const,
  },

  /**
   * Step 2: Skill Expansion
   * Extracts and expands skills from user questions
   */
  SKILL_EXPANSION: {
    TIMING_KEY: 'step2-skill-expansion',
    TOKEN_KEY: 'step2-skill-expansion',
    DISPLAY_KEY: 'step2-skill-expansion',
    DATABASE_NAME: 'SKILL_EXPANSION' as const,
  },

  /**
   * Step 3: Course Retrieval
   * Retrieves courses using vector embeddings
   */
  COURSE_RETRIEVAL: {
    TIMING_KEY: 'step3-course-retrieval',
    TOKEN_KEY: 'step3-course-retrieval',
    DISPLAY_KEY: 'step3-course-retrieval',
    DATABASE_NAME: 'COURSE_RETRIEVAL' as const,
  },

  /**
   * Step 4: Course Relevance Filter
   * Filters courses by relevance using LLM
   */
  RELEVANCE_FILTER: {
    TIMING_KEY: 'step4-course-relevance-filter',
    TOKEN_KEY: 'step4-course-relevance-filter',
    DISPLAY_KEY: 'step4-course-relevance-filter',
    DATABASE_NAME: 'COURSE_RELEVANCE_FILTER' as const,
  },

  /**
   * Step 5: Course Aggregation
   * Merges and ranks courses across multiple skills
   */
  COURSE_AGGREGATION: {
    TIMING_KEY: 'step5-course-aggregation',
    TOKEN_KEY: 'step5-course-aggregation',
    DISPLAY_KEY: 'step5-course-aggregation',
    DATABASE_NAME: 'COURSE_AGGREGATION' as const,
  },

  /**
   * Step 6: Answer Synthesis
   * Generates contextual answers using retrieved courses
   */
  ANSWER_SYNTHESIS: {
    TIMING_KEY: 'step6-answer-synthesis',
    TOKEN_KEY: 'step6-answer-synthesis',
    DISPLAY_KEY: 'step6-answer-synthesis',
    DATABASE_NAME: 'ANSWER_SYNTHESIS' as const,
  },
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Union type of all pipeline step enum values.
 */
export type PipelineStepValue =
  | 'OVERALL'
  | 'CLASSIFICATION'
  | 'SKILL_EXPANSION'
  | 'COURSE_RETRIEVAL'
  | 'RELEVANCE_FILTER'
  | 'COURSE_AGGREGATION'
  | 'ANSWER_SYNTHESIS';

/**
 * All timing step keys.
 */
export type TimingKey =
  | 'overall'
  | 'step1-question-classification'
  | 'step2-skill-expansion'
  | 'step3-course-retrieval'
  | 'step4-course-relevance-filter'
  | 'step5-course-aggregation'
  | 'step6-answer-synthesis';

/**
 * All token category keys.
 */
export type TokenKey =
  | 'overall'
  | 'step1-question-classification'
  | 'step2-skill-expansion'
  | 'step3-course-retrieval'
  | 'step4-course-relevance-filter'
  | 'step5-course-aggregation'
  | 'step6-answer-synthesis';

/**
 * All display keys.
 */
export type DisplayKey =
  | 'total'
  | 'step1-question-classification'
  | 'step2-skill-expansion'
  | 'step3-course-retrieval'
  | 'step4-course-relevance-filter'
  | 'step5-course-aggregation'
  | 'step6-answer-synthesis';

/**
 * Database step names (from query-logging StepName type).
 */
export type DatabaseStepName =
  | 'QUESTION_CLASSIFICATION'
  | 'SKILL_EXPANSION'
  | 'COURSE_RETRIEVAL'
  | 'COURSE_RELEVANCE_FILTER'
  | 'COURSE_AGGREGATION'
  | 'ANSWER_SYNTHESIS';
