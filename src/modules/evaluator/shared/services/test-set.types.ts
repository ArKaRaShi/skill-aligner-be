import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';
import {
  AnswerSynthesisRawOutput,
  ClassificationRawOutput,
  CourseRetrievalRawOutput,
  QueryProfileRawOutput,
  SkillExpansionRawOutput,
} from 'src/modules/query-logging/types/query-log-step.type';
import {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from 'src/modules/query-processor/types/course-aggregation.type';
import type { CourseRelevanceFilterResultV2 } from 'src/modules/query-processor/types/course-relevance-filter.type';

// ============================================================================
// SERIALIZED TEST SET TYPES (for JSON file storage)
// Maps are stored as plain Records for JSON serialization
// ============================================================================

/**
 * Serialized test set for COURSE_RETRIEVAL step (JSON storage)
 * skillCoursesMap is a Record (plain object), not a Map
 */
export type CourseRetrievalTestSetSerialized = {
  queryLogId: string;
  question: string;
  skills: string[];
  skillCoursesMap: Record<string, CourseWithLearningOutcomeV2Match[]>;
  embeddingUsage?: CourseRetrievalRawOutput['embeddingUsage'];
  duration?: number;
};

/**
 * Serialized test set for COURSE_RELEVANCE_FILTER step (JSON storage)
 * Comprehensive structure with raw output, LLM metadata, and metrics
 */
export type CourseFilterTestSetSerialized = {
  // Common fields (one per query log)
  queryLogId: string;
  question: string;
  llmModel?: string;
  llmProvider?: string;
  promptVersion?: string;
  duration?: number;

  // Raw LLM output (serialized Maps → Records for JSON)
  rawOutput?: {
    llmAcceptedCoursesBySkill: Record<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >;
    llmRejectedCoursesBySkill: Record<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >;
    llmMissingCoursesBySkill: Record<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >;
  };

  // LLM info broken down by skill (from each step's llm field)
  llmInfoBySkill: Record<
    string,
    {
      model?: string;
      provider?: string;
      systemPrompt?: string;
      userPrompt?: string;
      promptVersion?: string;
    }
  >;

  // Token usage (both total and per-skill)
  totalTokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  tokenUsageBySkill?: Record<
    string,
    {
      input: number;
      output: number;
      total: number;
    }
  >;

  // Calculated metrics per skill
  metricsBySkill: Record<
    string,
    {
      inputCount: number;
      acceptedCount: number;
      rejectedCount: number;
      missingCount: number;
      llmDecisionRate: number;
      llmRejectionRate: number;
      llmFallbackRate: number;
      scoreDistribution: {
        score1: number;
        score2: number;
        score3: number;
      };
      avgScore?: number;
      stepId?: string;
    }
  >;
};

/**
 * Serialized test set for COURSE_AGGREGATION step (JSON storage)
 * One entry per skill (flattened from the Map structure)
 */
export type CourseAggregationTestSetSerialized = {
  queryLogId: string;
  question: string;
  skill: string; // The skill name (key from the Map)
  courses: CourseWithLearningOutcomeV2MatchWithRelevance[];
  rankedCourses: AggregatedCourseSkills[];
  duration?: number;
};

/**
 * Test set for SKILL_EXPANSION step (no Maps, same for both)
 */
export type SkillExpansionTestSet = {
  queryLogId: string;
  question: string;
  skills: SkillExpansionRawOutput['skillItems'];
  llmModel?: string;
  llmProvider?: string;
  promptVersion?: string;
  duration?: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
};

/**
 * Test set for QUESTION_CLASSIFICATION step (no Maps, same for both)
 */
export type ClassificationTestSet = {
  queryLogId: string;
  question: string;
  category: ClassificationRawOutput['category'];
  reason: ClassificationRawOutput['reason'];
  llmModel?: string;
  llmProvider?: string;
  promptVersion?: string;
  duration?: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
};

/**
 * Test set for QUERY_PROFILE_BUILDING step (no Maps, same for both)
 */
export type QueryProfileTestSet = {
  queryLogId: string;
  question: string;
  queryProfile: QueryProfileRawOutput;
  llmModel?: string;
  llmProvider?: string;
  duration?: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
};

/**
 * Test set for ANSWER_SYNTHESIS step (no Maps, same for both)
 */
export type AnswerSynthesisTestSet = {
  queryLogId: string;
  question: string;
  answer: AnswerSynthesisRawOutput['answer'];
  llmModel?: string;
  llmProvider?: string;
  promptVersion?: string;
  duration?: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
};

// ============================================================================
// DESERIALIZED TEST SET TYPES (for in-memory use)
// Maps are properly typed as Map<K, V>
// ============================================================================

/**
 * Deserialized test set for COURSE_RETRIEVAL step (in-memory use)
 * skillCoursesMap is a proper Map
 */
export type CourseRetrievalTestSet = Omit<
  CourseRetrievalTestSetSerialized,
  'skillCoursesMap'
> & {
  skillCoursesMap: Map<string, CourseWithLearningOutcomeV2Match[]>;
};

/**
 * Deserialized test set for COURSE_RELEVANCE_FILTER step (in-memory use)
 * All Maps are proper Maps
 */
export type CourseFilterTestSet = Omit<
  CourseFilterTestSetSerialized,
  'rawOutput'
> & {
  rawOutput?: CourseRelevanceFilterResultV2;
};

/**
 * Deserialized test set for COURSE_AGGREGATION step (in-memory use)
 * filteredSkillCoursesMap is a proper Map
 */
export type CourseAggregationTestSet = Omit<
  CourseAggregationTestSetSerialized,
  'filteredSkillCoursesMap'
> & {
  filteredSkillCoursesMap: Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >;
};
