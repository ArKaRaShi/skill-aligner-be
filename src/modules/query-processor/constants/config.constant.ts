import { AnswerSynthesisPromptVersions } from '../prompts/answer-synthesis';
import { CourseRelevanceFilterPromptVersions } from '../prompts/course-relevance-filter';
import { QueryProfileBuilderPromptVersions } from '../prompts/query-profile-builder';
import { QuestionClassificationPromptVersions } from '../prompts/question-classification';
import { SkillExpansionPromptVersions } from '../prompts/skill-expansion';

/**
 * Centralized prompt version configuration for the query pipeline.
 *
 * All prompt versions used in AnswerQuestionUseCase are defined here
 * to avoid human error when updating versions across the pipeline.
 *
 * @example
 * To update all versions, modify this single file:
 * ```ts
 * const QueryPipelinePromptConfig = {
 *   classification: QuestionClassificationPromptVersions.V12, // Update here
 *   ...
 * };
 * ```
 */
export const QueryPipelinePromptConfig = {
  /**
   * Step 1: Question classification
   * Determines if the question is relevant, irrelevant, or dangerous
   */
  CLASSIFICATION: QuestionClassificationPromptVersions.V11,

  /**
   * Step 1: Query profile builder
   * Detects language and builds query profile (runs in parallel with classification)
   */
  QUERY_PROFILE_BUILDER: QueryProfileBuilderPromptVersions.V3,

  /**
   * Step 2: Skill expansion
   * Extracts skills from the user's question
   */
  SKILL_EXPANSION: SkillExpansionPromptVersions.V9,

  /**
   * Step 4: Course relevance filter
   * Filters courses by relevance to the question (runs after course retrieval)
   */
  COURSE_RELEVANCE_FILTER: CourseRelevanceFilterPromptVersions.V6,

  /**
   * Step 5: Course aggregation
   * Merges and ranks courses across multiple skills
   * (No LLM prompts used in this step)
   */

  /**
   * Step 6: Answer synthesis
   * Generates the final answer based on retrieved and filtered courses
   */
  ANSWER_SYNTHESIS: AnswerSynthesisPromptVersions.V9,
} as const;

/**
 * Type export for type inference
 */
export type QueryPipelinePromptConfig = typeof QueryPipelinePromptConfig;

/**
 * Centralized timing step keys for the query pipeline.
 *
 * All timing step keys used with TimeLogger in AnswerQuestionUseCase
 * are defined here to avoid magic string typos and enable easy refactoring.
 *
 * @example
 * Usage in AnswerQuestionUseCase:
 * ```ts
 * import { QueryPipelineTimingSteps } from '../constants/config.constant';
 *
 * this.timeLogger.startTiming(timing, QueryPipelineTimingSteps.STEP1_BASIC_PREPARATION);
 * this.timeLogger.endTiming(timing, QueryPipelineTimingSteps.STEP1_BASIC_PREPARATION);
 * ```
 */
export const QueryPipelineTimingSteps = {
  /** Overall pipeline execution */
  OVERALL: 'AnswerQuestionUseCaseExecute',

  /** Step 1: Classification + Query Profile */
  STEP1_BASIC_PREPARATION: 'AnswerQuestionUseCaseExecute_Step1',

  /** Step 2: Skill Inference */
  STEP2_SKILL_INFERENCE: 'AnswerQuestionUseCaseExecute_Step2',

  /** Step 3: Course Retrieval */
  STEP3_COURSE_RETRIEVAL: 'AnswerQuestionUseCaseExecute_Step3',

  /** Step 4: Course Relevance Filter */
  STEP4_COURSE_RELEVANCE_FILTER: 'AnswerQuestionUseCaseExecute_Step4',

  /** Step 5: Course Aggregation */
  STEP5_COURSE_AGGREGATION: 'AnswerQuestionUseCaseExecute_Step5',

  /** Step 6: Answer Synthesis */
  STEP6_ANSWER_SYNTHESIS: 'AnswerQuestionUseCaseExecute_Step6',
} as const;

/**
 * Type export for type inference
 */
export type QueryPipelineTimingSteps = typeof QueryPipelineTimingSteps;

/**
 * Centralized token category keys for the query pipeline.
 *
 * All token category keys used with TokenLogger in AnswerQuestionUseCase
 * are defined here to avoid magic string typos and enable easy refactoring.
 *
 * @example
 * Usage in AnswerQuestionUseCase:
 * ```ts
 * import { QueryPipelineTokenCategories } from '../constants/config.constant';
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
 * import { QueryPipelineDisplayKeys } from '../constants/config.constant';
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
