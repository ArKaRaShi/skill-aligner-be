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
  COURSE_RELEVANCE_FILTER: CourseRelevanceFilterPromptVersions.V7,

  /**
   * Step 5: Course aggregation
   * Merges and ranks courses across multiple skills
   * (No LLM prompts used in this step)
   */

  /**
   * Step 6: Answer synthesis
   * Generates the final answer based on retrieved and filtered courses
   */
  ANSWER_SYNTHESIS: AnswerSynthesisPromptVersions.V11,
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

/**
 * Centralized numeric configuration for the query pipeline.
 *
 * These values control the behavior of various pipeline steps including
 * course retrieval, relevance filtering, and aggregation.
 *
 * @example
 * Usage in AnswerQuestionUseCase:
 * ```ts
 * import { QueryPipelineConfig } from '../constants/config.constant';
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
    QUERY_PROFILE_BUILDING: 10_000,

    /** Step 2: Skill expansion - 15s (skill extraction) */
    SKILL_EXPANSION: 15_000,

    /** Step 4: Course relevance filtering - 15s (filtering relevant courses) */
    COURSE_RELEVANCE_FILTERING: 15_000,

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
   * @default 10
   */
  COURSE_RETRIEVAL_TOP_N_LOS: 10,

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

/**
 * Centralized fallback response messages for the query pipeline.
 *
 * These messages are returned to users when the pipeline cannot complete
 * successfully (e.g., no courses found, irrelevant question, dangerous content).
 *
 * @example
 * Usage in AnswerQuestionUseCase:
 * ```ts
 * import { QueryPipelineFallbackMessages } from '../constants/config.constant';
 *
 * return {
 *   answer: QueryPipelineFallbackMessages.EMPTY_RESULTS,
 *   suggestQuestion: QueryPipelineFallbackMessages.SUGGEST_EMPTY_RESULTS,
 *   relatedCourses: [],
 * };
 * ```
 */
export const QueryPipelineFallbackMessages = {
  /**
   * Message when no courses are found after retrieval and filtering
   */
  EMPTY_RESULTS: 'ขออภัย เราไม่พบรายวิชาที่เกี่ยวข้องกับคำถามของคุณ',

  /**
   * Suggested question when no courses are found
   */
  SUGGEST_EMPTY_RESULTS: 'อยากเรียนการเงินส่วนบุคคล',

  /**
   * Message when question is classified as irrelevant (out of scope)
   */
  IRRELEVANT_QUESTION: 'ขออภัย คำถามของคุณอยู่นอกขอบเขตที่เราสามารถช่วยได้',

  /**
   * Suggested question when input is irrelevant
   */
  SUGGEST_IRRELEVANT: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',

  /**
   * Message when question is classified as dangerous/inappropriate
   */
  DANGEROUS_QUESTION: 'ขออภัย คำถามของคุณมีเนื้อหาที่ไม่เหมาะสมหรือเป็นอันตราย',

  /**
   * Suggested question when input is dangerous
   */
  SUGGEST_DANGEROUS: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
} as const;

/**
 * Type export for type inference
 */
export type QueryPipelineFallbackMessages =
  typeof QueryPipelineFallbackMessages;
