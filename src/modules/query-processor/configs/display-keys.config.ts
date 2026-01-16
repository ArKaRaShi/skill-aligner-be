/**
 * Centralized display key constants for metrics output.
 *
 * These are used as object property keys in timing/token results for logging.
 * Separated from token categories because some steps (like aggregation) don't
 * have associated LLM or embedding tokens but still need display keys.
 *
 * @example
 * Usage in AnswerQuestionUseCase:
 * ```ts
 * import { QueryPipelineDisplayKeys } from '../configs/display-keys.config';
 *
 * const results = {
 *   [QueryPipelineDisplayKeys.STEP1_BASIC_PREPARATION]: value1,
 *   [QueryPipelineDisplayKeys.STEP5_COURSE_AGGREGATION]: value5,
 * };
 * ```
 */
export const QueryPipelineDisplayKeys = {
  /** Overall execution */
  TOTAL: 'total',

  /** Step 1: Classification + Query Profile */
  STEP1_BASIC_PREPARATION: 'step1-basic-preparation',

  /** Step 2: Skill Inference */
  STEP2_SKILL_INFERENCE: 'step2-skill-inference',

  /** Step 3: Course Retrieval */
  STEP3_COURSE_RETRIEVAL: 'step3-course-retrieval',

  /** Step 4: Course Relevance Filter */
  STEP4_COURSE_RELEVANCE_FILTER: 'step4-course-relevance-filter',

  /** Step 5: Course Aggregation */
  STEP5_COURSE_AGGREGATION: 'step5-course-aggregation',

  /** Step 6: Answer Synthesis */
  STEP6_ANSWER_SYNTHESIS: 'step6-answer-synthesis',
} as const;

/**
 * Type export for type inference
 */
export type QueryPipelineDisplayKeys = typeof QueryPipelineDisplayKeys;
