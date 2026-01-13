import {
  CourseAggregationInput,
  CourseAggregationOutput,
} from '../types/course-aggregation.type';

export const I_COURSE_AGGREGATION_SERVICE_TOKEN = Symbol(
  'ICourseAggregationService',
);

/**
 * Course Aggregation Service
 *
 * Aggregates courses from multiple skills into deduplicated, ranked courses.
 * Handles both scored (after LLM filter) and unscored (raw retrieval) aggregation.
 * This is a synchronous service - no external calls.
 */
export interface ICourseAggregationService {
  /**
   * Aggregate courses from multiple skills into deduplicated, ranked courses
   * @param input - Aggregation input with skill-to-courses mapping
   * @returns Ranked aggregated courses with metrics
   */
  aggregate(input: CourseAggregationInput): CourseAggregationOutput;
}
