/**
 * Status of a query process log.
 */
export type QueryStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'EARLY_EXIT'
  | 'FAILED'
  | 'TIMEOUT';

/**
 * Names of pipeline steps.
 */
export type StepName =
  | 'QUESTION_CLASSIFICATION'
  | 'QUERY_PROFILE_BUILDING'
  | 'SKILL_EXPANSION'
  | 'COURSE_RETRIEVAL'
  | 'COURSE_RELEVANCE_FILTER'
  | 'COURSE_AGGREGATION'
  | 'ANSWER_SYNTHESIS';

/**
 * Step name constants to avoid magic strings.
 */
export const STEP_NAME = {
  QUESTION_CLASSIFICATION: 'QUESTION_CLASSIFICATION' as const,
  QUERY_PROFILE_BUILDING: 'QUERY_PROFILE_BUILDING' as const,
  SKILL_EXPANSION: 'SKILL_EXPANSION' as const,
  COURSE_RETRIEVAL: 'COURSE_RETRIEVAL' as const,
  COURSE_RELEVANCE_FILTER: 'COURSE_RELEVANCE_FILTER' as const,
  COURSE_AGGREGATION: 'COURSE_AGGREGATION' as const,
  ANSWER_SYNTHESIS: 'ANSWER_SYNTHESIS' as const,
} as const;

/**
 * Type for step name constant values.
 */
export type StepNameConstant = (typeof STEP_NAME)[keyof typeof STEP_NAME];
