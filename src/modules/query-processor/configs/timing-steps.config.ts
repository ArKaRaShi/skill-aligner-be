/**
 * Centralized timing step keys for the query pipeline.
 *
 * All timing step keys used with TimeLogger in AnswerQuestionUseCase
 * are defined here to avoid magic string typos and enable easy refactoring.
 *
 * @example
 * Usage in AnswerQuestionUseCase:
 * ```ts
 * import { QueryPipelineTimingSteps } from '../configs/timing-steps.config';
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
