import { TokenMap } from 'src/shared/utils/token-logger.helper';
import { TokenLogger } from 'src/shared/utils/token-logger.helper';

import { CourseMatchWithRelevanceMap } from '../types/course-relevance-filter.type';
import { CourseRelevanceFilterResultV2 } from '../types/course-relevance-filter.type';

/**
 * Helper class for course filtering operations.
 *
 * Extracts complex filtering logic from use cases, providing:
 * - Aggregation of LLM-accepted courses from multiple filter results
 * - Token tracking integration for cost monitoring
 *
 * @example
 * ```ts
 * const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
 *   filterResults,
 *   tokenMap,
 *   'STEP4_COURSE_RELEVANCE_FILTER',
 *   tokenLogger
 * );
 * ```
 */
export class CourseFilterHelper {
  /**
   * Aggregates LLM-accepted courses from multiple relevance filter results
   * and records token usage for cost tracking.
   *
   * This processes results from `ICourseRelevanceFilterService.batchFilterCoursesBySkillV2`,
   * merging courses by skill across different filter batches.
   *
   * @param filterResults - Array of filter results containing accepted/rejected courses
   * @param tokenMap - Token tracking map to record usage
   * @param tokenCategory - Category key for token tracking (e.g., step name)
   * @param tokenLogger - Token logger instance for recording usage
   * @returns Aggregated map of skill -> LLM-accepted courses
   *
   * @remarks
   * - Preserves all LLM-accepted courses with their relevance scores
   * - Records token usage for each filter result batch
   * - Handles empty results gracefully
   */
  static aggregateFilteredCourses(
    filterResults: CourseRelevanceFilterResultV2[],
    tokenMap: TokenMap,
    tokenCategory: string,
    tokenLogger: TokenLogger,
  ): { aggregatedMap: CourseMatchWithRelevanceMap } {
    const aggregatedMap: CourseMatchWithRelevanceMap = new Map();

    for (const filterResult of filterResults) {
      // Record token usage for this batch
      tokenLogger.addTokenUsage(
        tokenMap,
        tokenCategory,
        filterResult.tokenUsage,
      );

      // Merge accepted courses into aggregated map
      for (const [
        skill,
        courses,
      ] of filterResult.llmAcceptedCoursesBySkill.entries()) {
        const existing = aggregatedMap.get(skill);
        if (existing) {
          // Append to existing skill entries
          existing.push(...courses);
        } else {
          // Create new skill entry with a copy
          aggregatedMap.set(skill, [...courses]);
        }
      }
    }

    return { aggregatedMap };
  }
}
