/**
 * Centralized token category keys for the query pipeline.
 *
 * All token category keys used with TokenLogger in AnswerQuestionUseCase
 * are defined here to avoid magic string typos and enable easy refactoring.
 *
 * @example
 * Usage in AnswerQuestionUseCase:
 * ```ts
 * import { QueryPipelineTokenCategories } from '../configs/token-categories.config';
 *
 * this.tokenLogger.addTokenUsage(
 *   tokenMap,
 *   QueryPipelineTokenCategories.STEP1_BASIC_PREPARATION,
 *   tokenUsage,
 * );
 * ```
 */
export const QueryPipelineTokenCategories = {
  /** Step 1: Classification + Query Profile */
  STEP1_BASIC_PREPARATION: 'step1-basic-preparation',

  /** Step 2: Skill Inference */
  STEP2_SKILL_INFERENCE: 'step2-skill-inference',

  /** Step 3: Course Retrieval (embedding tokens) */
  STEP3_COURSE_RETRIEVAL: 'step3-course-retrieval',

  /** Step 4: Course Relevance Filter */
  STEP4_COURSE_RELEVANCE_FILTER: 'step4-course-relevance-filter',

  /** Step 6: Answer Synthesis */
  STEP6_ANSWER_SYNTHESIS: 'step6-answer-synthesis',
} as const;

/**
 * Type export for type inference
 */
export type QueryPipelineTokenCategories = typeof QueryPipelineTokenCategories;
