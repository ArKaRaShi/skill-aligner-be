/**
 * Query Logging Step Definitions - Single source of truth for query logging steps.
 *
 * This file centralizes all step metadata used by QueryPipelineLoggerService.
 * All step-related constants should be imported from this file.
 *
 * @example
 * Usage in QueryPipelineLoggerService:
 * ```ts
 * import { LOGGING_STEPS } from '../configs/step-definitions.config';
 *
 * await this.logStep(
 *   LOGGING_STEPS.CLASSIFICATION.STEP_NAME,
 *   LOGGING_STEPS.CLASSIFICATION.ORDER,
 *   input,
 *   output,
 * );
 * ```
 */

// ============================================================================
// STEP DEFINITIONS
// ============================================================================

/**
 * Logging step configuration - Single source of truth for query pipeline steps.
 *
 * Each step contains:
 * - STEP_NAME: Database step name (matches Prisma enum and StepName type)
 * - ORDER: Sequential step order in the pipeline (1-6)
 * - CONFIG_KEY: Corresponding key from query-processor PIPELINE_STEPS
 * - DESCRIPTION: Human-readable description of the step
 */
export const LOGGING_STEPS = {
  /**
   * Step 1: Question Classification
   * Classifies questions as relevant/irrelevant/dangerous
   */
  CLASSIFICATION: {
    STEP_NAME: 'QUESTION_CLASSIFICATION',
    ORDER: 1,
    CONFIG_KEY: 'CLASSIFICATION',
    DESCRIPTION: 'Question Classification',
  },

  /**
   * Step 2: Skill Expansion
   * Extracts and expands skills from user questions
   */
  SKILL_EXPANSION: {
    STEP_NAME: 'SKILL_EXPANSION',
    ORDER: 2,
    CONFIG_KEY: 'SKILL_EXPANSION',
    DESCRIPTION: 'Skill Expansion',
  },

  /**
   * Step 3: Course Retrieval
   * Retrieves courses using vector embeddings
   */
  COURSE_RETRIEVAL: {
    STEP_NAME: 'COURSE_RETRIEVAL',
    ORDER: 3,
    CONFIG_KEY: 'COURSE_RETRIEVAL',
    DESCRIPTION: 'Course Retrieval',
  },

  /**
   * Step 4: Course Relevance Filter
   * Filters courses by relevance using LLM
   */
  RELEVANCE_FILTER: {
    STEP_NAME: 'COURSE_RELEVANCE_FILTER',
    ORDER: 4,
    CONFIG_KEY: 'RELEVANCE_FILTER',
    DESCRIPTION: 'Course Relevance Filter',
  },

  /**
   * Step 5: Course Aggregation
   * Merges and ranks courses across multiple skills
   */
  COURSE_AGGREGATION: {
    STEP_NAME: 'COURSE_AGGREGATION',
    ORDER: 5,
    CONFIG_KEY: 'COURSE_AGGREGATION',
    DESCRIPTION: 'Course Aggregation',
  },

  /**
   * Step 6: Answer Synthesis
   * Generates contextual answers using retrieved courses
   */
  ANSWER_SYNTHESIS: {
    STEP_NAME: 'ANSWER_SYNTHESIS',
    ORDER: 6,
    CONFIG_KEY: 'ANSWER_SYNTHESIS',
    DESCRIPTION: 'Answer Synthesis',
  },
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extract step names for type-safe usage.
 */
export type StepName =
  | 'QUESTION_CLASSIFICATION'
  | 'SKILL_EXPANSION'
  | 'COURSE_RETRIEVAL'
  | 'COURSE_RELEVANCE_FILTER'
  | 'COURSE_AGGREGATION'
  | 'ANSWER_SYNTHESIS';

/**
 * All logging step metadata.
 */
export type LoggingStep = (typeof LOGGING_STEPS)[keyof typeof LOGGING_STEPS];

/**
 * All step names array for iteration.
 */
export const STEP_NAMES: readonly StepName[] = [
  'QUESTION_CLASSIFICATION',
  'SKILL_EXPANSION',
  'COURSE_RETRIEVAL',
  'COURSE_RELEVANCE_FILTER',
  'COURSE_AGGREGATION',
  'ANSWER_SYNTHESIS',
] as const;

/**
 * Step name constants for type-safe usage.
 * Maintains backward compatibility with existing code.
 */
export const STEP_NAME = {
  QUESTION_CLASSIFICATION: 'QUESTION_CLASSIFICATION',
  SKILL_EXPANSION: 'SKILL_EXPANSION',
  COURSE_RETRIEVAL: 'COURSE_RETRIEVAL',
  COURSE_RELEVANCE_FILTER: 'COURSE_RELEVANCE_FILTER',
  COURSE_AGGREGATION: 'COURSE_AGGREGATION',
  ANSWER_SYNTHESIS: 'ANSWER_SYNTHESIS',
} as const satisfies Record<string, StepName>;
