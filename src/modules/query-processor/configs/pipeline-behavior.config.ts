/**
 * Centralized behavioral configuration for the query pipeline.
 *
 * These values control the behavior of various pipeline steps including
 * timeouts, thresholds, limits, and feature flags.
 *
 * @example
 * Usage in AnswerQuestionUseCase:
 * ```ts
 * import { QueryPipelineConfig } from '../configs/pipeline-behavior.config';
 *
 * await this.courseRetrieverService.getCoursesWithLosBySkillsWithFilter({
 *   loThreshold: QueryPipelineConfig.COURSE_RETRIEVAL_LO_THRESHOLD,
 *   topNLos: QueryPipelineConfig.COURSE_RETRIEVAL_TOP_N_LOS,
 *   ...
 * });
 * ```
 */
export const QueryPipelineConfig = {
  /** ========================================================================
   * LLM TIMEOUT CONFIGURATION
   * ======================================================================== */

  /**
   * Per-step LLM request timeouts in milliseconds
   * Each pipeline step can have different timeout requirements based on complexity
   */
  LLM_STEP_TIMEOUTS: {
    /** Step 1: Question classification - 10s (simple classification) */
    QUESTION_CLASSIFICATION: 10_000,

    /** Step 1: Query profile building - 10s (language detection) */
    // Deprecated: QUERY PROFILE BUILDING step removed from pipeline
    QUERY_PROFILE_BUILDING: 10_000,

    /** Step 2: Skill expansion - 15s (skill extraction) */
    SKILL_EXPANSION: 15_000,

    /** Step 4: Course relevance filtering - 25s (filtering relevant courses with concurrency control) */
    COURSE_RELEVANCE_FILTERING: 25_000,

    /** Step 6: Answer synthesis - 45s (complex answer generation with courses) */
    ANSWER_SYNTHESIS: 45_000,
  } as const,

  /** ========================================================================
   * COURSE RETRIEVAL CONFIGURATION
   * ======================================================================== */

  /**
   * Learning outcome similarity threshold for course retrieval (0-1)
   * Lower values = more permissive matching, higher = stricter matching
   * @default 0 (accept all LOs regardless of similarity score)
   */
  COURSE_RETRIEVAL_LO_THRESHOLD: 0,

  /**
   * Maximum number of learning outcomes to retrieve per skill
   * @default 15
   */
  COURSE_RETRIEVAL_TOP_N_LOS: 15,

  /**
   * Enable LLM-based filtering of learning outcomes before course retrieval
   * @default false
   */
  COURSE_RETRIEVAL_ENABLE_LO_FILTER: false,

  /** ========================================================================
   * RELEVANCE SCORING CONFIGURATION
   * ======================================================================== */

  /**
   * Minimum relevance score for a course to be considered relevant
   * LLM returns scores 0-3 where:
   * - 0 = not relevant (dropped)
   * - 1 = minimally relevant
   * - 2 = moderately relevant
   * - 3 = highly relevant
   * @default 1
   */
  COURSE_RELEVANCE_MIN_SCORE: 1,

  /**
   * Default relevance score assigned when no LLM filter is applied
   * Used in aggregation step for courses that bypass relevance filtering
   * @default 3 (treat as highly relevant)
   */
  COURSE_AGGREGATION_DEFAULT_SCORE: 3,

  /**
   * Minimum relevance score threshold for answer synthesis
   * Only courses with score >= this value are included in the final answer
   * @default 1
   */
  ANSWER_SYNTHESIS_MIN_RELEVANCE_SCORE: 1,

  /** ========================================================================
   * LOGGING CONFIGURATION
   * ======================================================================== */

  /**
   * Maximum number of course data items to display in preview logs
   * Prevents log spam when processing large course lists
   * @default 100
   */
  LOGGING_COURSE_DATA_PREVIEW_LIMIT: 100,

  /** ========================================================================
   * CONCURRENCY CONFIGURATION
   * ======================================================================== */

  /**
   * Maximum number of concurrent LLM calls for course relevance filtering
   * Balances speed vs OpenRouter rate limits and reliability
   * @default 6 (higher concurrency for faster processing while maintaining stability)
   */
  COURSE_RELEVANCE_FILTER_CONCURRENCY: 6,

  /** ========================================================================
   * PIPELINE STRUCTURE
   * ======================================================================== */

  /**
   * Total number of steps in the query pipeline
   * Used for SSE progress reporting
   * @default 6
   */
  PIPELINE_TOTAL_STEPS: 6,
} as const;

/**
 * Type export for type inference
 */
export type QueryPipelineConfig = typeof QueryPipelineConfig;
