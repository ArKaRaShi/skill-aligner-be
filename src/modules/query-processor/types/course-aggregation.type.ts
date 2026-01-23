import {
  Course,
  CourseWithLearningOutcomeV2Match,
} from 'src/modules/course/types/course.type';
import { MatchedSkillLearningOutcomes } from 'src/modules/course/types/skill-learning-outcome.type';

/**
 * Relevance information from LLM filtering.
 * score: 0 (dropped), 1-3 (relevance levels)
 * reason: explanation from LLM, empty string if no LLM
 */
export type RelevanceResult = {
  score: number;
  reason: string;
};

/**
 * Course with LLM relevance filtering applied.
 * Used after course relevance filter step in query processing.
 */
export type CourseWithLearningOutcomeV2MatchWithRelevance =
  CourseWithLearningOutcomeV2Match & RelevanceResult;

/**
 * Aggregated course with matched skills and final relevance score.
 * Result of merging/filtering courses across multiple skills.
 */
export type AggregatedCourseSkills = Course & {
  matchedSkills: MatchedSkillLearningOutcomes[];
  /** Maximum relevance score across all matched skills. */
  maxRelevanceScore: number;
};

/**
 * Input for course aggregation service
 */
export type CourseAggregationInput = {
  /** Map of skill -> courses with LLM relevance scores (from filter step) */
  filteredSkillCoursesMap?: Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >;
  /** Map of skill -> courses without scores (fallback when filter disabled) */
  rawSkillCoursesMap: Map<string, CourseWithLearningOutcomeV2Match[]>;
};

/**
 * Output from course aggregation service
 */
export type CourseAggregationOutput = {
  /** Deduplicated and ranked courses */
  rankedCourses: AggregatedCourseSkills[];
};
