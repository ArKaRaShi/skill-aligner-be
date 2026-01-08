import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import type { Identifier } from '../../../shared/contracts/types/identifier';
import type {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from '../../query-processor/types/course-aggregation.type';
import type { CourseRelevanceFilterResultV2 } from '../../query-processor/types/course-relevance-filter.type';
import type { StepEmbeddingConfig } from './query-embedding-config.type';
import type { StepLlmConfig } from './query-llm-config.type';
import type { QueryProcessLog } from './query-log.type';
import type { StepName } from './query-status.type';

// ============================================================================
// RAW SERVICE OUTPUT TYPES
// ============================================================================

/**
 * Raw output from QUESTION_CLASSIFICATION step.
 * Directly from QuestionClassifierService - no transformation applied.
 */
export type ClassificationRawOutput = {
  category: string;
  reason: string;
};

/**
 * Raw output from QUERY_PROFILE_BUILDING step.
 * Logger stores the query profile data (intents, preferences, background, language).
 *
 * NOTE: llmInfo and tokenUsage are stored in the step's llm field, not in raw output.
 */
export type QueryProfileRawOutput = {
  intents: Array<{
    original: string;
    augmented: 'ask-skills' | 'ask-occupation' | 'unknown';
  }>;
  preferences: Array<{
    original: string;
    augmented: string;
  }>;
  background: Array<{
    original: string;
    augmented: string;
  }>;
  language: 'en' | 'th';
};

/**
 * Raw output from SKILL_EXPANSION step.
 * Logger extracts only skillItems from TSkillExpansion.
 *
 * NOTE: llmInfo and tokenUsage are stored in the step's llm field, not in raw output.
 */
export type SkillExpansionRawOutput = {
  skillItems: Array<{
    skill: string;
    reason: string;
  }>;
};

/**
 * Raw output from COURSE_RETRIEVAL step.
 * Directly from CourseRetrieverService - skill to courses mapping.
 *
 * NOTE: Map will be serialized to Object for JSONB storage.
 * Map<"python", Course[]> becomes {"python": [...]}
 */
export type CourseRetrievalRawOutput = {
  skills: string[];
  skillCoursesMap: Map<string, CourseWithLearningOutcomeV2Match[]>;
  embeddingUsage?: {
    bySkill: Array<{
      skill: string;
      model: string;
      provider: string;
      dimension: number;
      promptTokens: number;
      totalTokens: number;
    }>;
    totalTokens: number;
  };
};

/**
 * Raw output from COURSE_RELEVANCE_FILTER step.
 * Directly from CourseRelevanceFilterService - 3-category filter results.
 *
 * NOTE: Maps will be serialized to Objects for JSONB storage.
 * Map<"python", Course[]> becomes {"python": [...]}
 */
export type CourseFilterRawOutput = CourseRelevanceFilterResultV2;

/**
 * Raw output from COURSE_AGGREGATION step.
 * Directly from aggregation logic - input data for aggregation.
 *
 * NOTE: Map will be serialized to Object for JSONB storage.
 * Map<"python", Course[]> becomes {"python": [...]}
 */
export type CourseAggregationRawOutput = {
  filteredSkillCoursesMap: Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >;
  rankedCourses: AggregatedCourseSkills[];
};

/**
 * Raw output from ANSWER_SYNTHESIS step.
 * Logger extracts only the answer text from AnswerSynthesisResult.
 *
 * NOTE: llmInfo and tokenUsage are stored in the step's llm field, not in raw output.
 */
export type AnswerSynthesisRawOutput = {
  answer: string;
};

/**
 * Union of all possible raw service outputs.
 * One of these types will be stored in the `raw` field of QueryProcessStepOutput.
 */
export type ServiceRawOutput =
  | ClassificationRawOutput
  | QueryProfileRawOutput
  | SkillExpansionRawOutput
  | CourseRetrievalRawOutput
  | CourseFilterRawOutput
  | CourseAggregationRawOutput
  | AnswerSynthesisRawOutput;

// ============================================================================
// STEP METRICS TYPES
// ============================================================================

/**
 * Union of all possible calculated metrics.
 * These are derived from raw outputs by QueryPipelineMetrics helper.
 */
export type ServiceMetrics =
  | CourseFilterStepOutput
  | CourseAggregationStepOutput;

// ============================================================================
// STEP OUTPUT INTERFACE
// ============================================================================

/**
 * New step output structure that preserves both raw service output AND calculated metrics.
 *
 * Benefits:
 * - `raw`: Immutable source of truth for debugging and audit trail
 * - `metrics`: Calculated insights for analysis (optional, only for complex steps)
 *
 * Map Serialization:
 * Maps in raw outputs are automatically converted to Objects for JSONB storage.
 * Example: Map<"python", Course[]> → {"python": [...]}
 *
 * @see QueryPipelineLoggerService.serializeOutput() for implementation
 */
export interface QueryProcessStepOutput {
  /**
   * Raw service output - exact response from service layer.
   * Type-safe union of all possible service outputs.
   * Always present for all steps.
   */
  raw: ServiceRawOutput;

  /**
   * Calculated metrics derived from raw output.
   * Only present for complex steps that need aggregation/breakdown:
   * - COURSE_RELEVANCE_FILTER (3-category breakdown)
   * - COURSE_AGGREGATION (skill breakdowns, ties)
   *
   * Simple steps (classification, profile, expansion, retrieval, synthesis)
   * don't need metrics - raw output is sufficient.
   */
  metrics?: ServiceMetrics;
}

// ============================================================================
// QUERY PROCESS STEP
// ============================================================================

/**
 * Domain type for query process step.
 */
export interface QueryProcessStep {
  id: Identifier;
  queryLogId: Identifier;
  stepName: StepName;
  stepOrder: number;

  // Flexible JSONB fields
  input?: Record<string, any>;
  output?: QueryProcessStepOutput; // Raw service output + optional calculated metrics
  llm?: StepLlmConfig; // For LLM steps
  embedding?: StepEmbeddingConfig; // For COURSE_RETRIEVAL step
  metrics?: StepMetrics;
  error?: StepError;

  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Metrics stored in QueryProcessStep.metrics
 */
export interface StepMetrics {
  duration?: number;
}

/**
 * Error info stored in QueryProcessStep.error
 */
export interface StepError {
  code?: string;
  message: string;
  details?: any;
}

/**
 * Composite type for log with steps.
 */
export interface QueryProcessLogWithSteps extends QueryProcessLog {
  processSteps: QueryProcessStep[];
}

// ============================================================================
// FILTER STEP TYPES
// ============================================================================

/**
 * Learning outcome match - used in both filter and aggregation steps.
 */
export interface LearningOutcomeMatch {
  id: string;
  name: string;
}

/**
 * Single course in filter step output.
 */
export interface CourseFilterCourse {
  courseCode: string;
  courseName: string;
  score: number;
  reason: string;
  matchedLos: LearningOutcomeMatch[];
}

/**
 * Output for COURSE_RELEVANCE_FILTER step.
 */
export interface CourseFilterStepOutput {
  skill: string;

  // Input count
  inputCount: number;

  // 3-category breakdown (mutually exclusive)
  acceptedCourses: CourseFilterCourse[]; // LLM scored > 0
  rejectedCourses: CourseFilterCourse[]; // LLM scored = 0
  missingCourses: CourseFilterCourse[]; // Not in LLM response

  // Explicit counts (no calculation needed)
  acceptedCount: number;
  rejectedCount: number;
  missingCount: number;

  // Clear semantic metrics
  llmDecisionRate: number; // (accepted + rejected) / input
  llmRejectionRate: number; // rejected / (accepted + rejected)
  llmFallbackRate: number; // missing / input

  // Score distribution (for accepted courses only)
  scoreDistribution: {
    score1: number;
    score2: number;
    score3: number;
  };
  avgScore?: number;
}

// ============================================================================
// AGGREGATION STEP TYPES
// ============================================================================

/**
 * Skill contribution to a course in aggregation step.
 */
export interface SkillContributionBreakdown {
  skill: string;
  score: number;
  matchedLoCount: number;
  matchingLos: LearningOutcomeMatch[];
}

/**
 * Single course in aggregation step output.
 */
export interface AggregatedCourseBreakdown {
  courseId: string;
  courseCode: string;
  courseName: string;
  skillBreakdown: SkillContributionBreakdown[];
  finalScore: number;
  winningSkills: string[];
  otherSkills: string[];
  skillCount: number;
}

/**
 * Output for COURSE_AGGREGATION step.
 */
export interface CourseAggregationStepOutput {
  rawCourseCount: number;
  uniqueCourseCount: number;
  duplicateCount: number;
  duplicateRate: number;
  courses: AggregatedCourseBreakdown[];
  scoreDistribution: {
    score1: number;
    score2: number;
    score3: number;
  };
  contributingSkills: string[];
}
