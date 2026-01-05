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
  | 'ANSWER_SYNTHESIS';
