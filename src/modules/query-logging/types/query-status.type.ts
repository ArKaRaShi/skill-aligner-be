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
 * Query status constants to avoid magic strings.
 */
export const QUERY_STATUS = {
  PENDING: 'PENDING' as const,
  COMPLETED: 'COMPLETED' as const,
  EARLY_EXIT: 'EARLY_EXIT' as const,
  FAILED: 'FAILED' as const,
  TIMEOUT: 'TIMEOUT' as const,
} as const;

/**
 * Type for query status constant values.
 */
export type QueryStatusConstant =
  (typeof QUERY_STATUS)[keyof typeof QUERY_STATUS];

// ============================================================================
// STEP NAMES - Re-exported from config for convenience
// ============================================================================

/**
 * Step names are now defined in ../configs/step-definitions.config.ts
 * This re-export maintains backward compatibility for existing imports.
 *
 * @deprecated Import STEP_NAME and StepName from ../configs/step-definitions.config.ts instead
 */
export type StepName =
  | 'QUESTION_CLASSIFICATION'
  | 'SKILL_EXPANSION'
  | 'COURSE_RETRIEVAL'
  | 'COURSE_RELEVANCE_FILTER'
  | 'COURSE_AGGREGATION'
  | 'ANSWER_SYNTHESIS';

/**
 * Step name constants.
 *
 * @deprecated Import STEP_NAME from ../configs/step-definitions.config.ts instead
 */
export const STEP_NAME = {
  QUESTION_CLASSIFICATION: 'QUESTION_CLASSIFICATION',
  SKILL_EXPANSION: 'SKILL_EXPANSION',
  COURSE_RETRIEVAL: 'COURSE_RETRIEVAL',
  COURSE_RELEVANCE_FILTER: 'COURSE_RELEVANCE_FILTER',
  COURSE_AGGREGATION: 'COURSE_AGGREGATION',
  ANSWER_SYNTHESIS: 'ANSWER_SYNTHESIS',
} as const satisfies Record<string, StepName>;

/**
 * Type for step name constant values.
 */
export type StepNameConstant = (typeof STEP_NAME)[keyof typeof STEP_NAME];
