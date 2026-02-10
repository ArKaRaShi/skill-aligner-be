import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import type { CourseWithLearningOutcomeV2MatchWithRelevance } from '../../query-processor/types/course-aggregation.type';
import type { CourseRelevanceFilterResultV2 } from '../../query-processor/types/course-relevance-filter.type';
import type {
  CourseAggregationRawOutput,
  CourseRetrievalRawOutput,
} from '../types/query-log-step.type';

/**
 * Serialization Helper for Query Pipeline
 *
 * Converts JavaScript Maps to plain Objects for JSONB storage.
 * Maps are not directly JSON-serializable (JSON.stringify(new Map()) → {}).
 *
 * Pattern: Static helper class (consistent with module conventions)
 *
 * @example
 * ```ts
 * // Convert a Map to Object for database storage
 * const map = new Map([['skill', courses]]);
 * const obj = SerializationHelper.serializeMap(map);
 * // { skill: courses }
 * ```
 */
export class SerializationHelper {
  /**
   * Convert Map to plain Object for JSONB storage
   *
   * @param map - Map to serialize
   * @returns Plain object with same key-value pairs
   */
  static serializeMap<K, V>(map: Map<K, V>): Record<string, V> {
    const obj: Record<string, V> = {};
    for (const [key, value] of map.entries()) {
      obj[String(key)] = value;
    }
    return obj;
  }

  /**
   * Serialize CourseRelevanceFilterResultV2 Maps to Objects
   *
   * Converts three nested Maps in CourseRelevanceFilterResultV2:
   * - llmAcceptedCoursesBySkill
   * - llmRejectedCoursesBySkill
   * - llmMissingCoursesBySkill
   *
   * @param result - Filter result with Maps
   * @returns Same structure with Maps converted to Records
   */
  static serializeCourseFilterResult(
    result: CourseRelevanceFilterResultV2,
  ): Omit<
    CourseRelevanceFilterResultV2,
    | 'llmAcceptedCoursesBySkill'
    | 'llmRejectedCoursesBySkill'
    | 'llmMissingCoursesBySkill'
  > & {
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
  } {
    return {
      ...result,
      llmAcceptedCoursesBySkill: SerializationHelper.serializeMap(
        result.llmAcceptedCoursesBySkill,
      ),
      llmRejectedCoursesBySkill: SerializationHelper.serializeMap(
        result.llmRejectedCoursesBySkill,
      ),
      llmMissingCoursesBySkill: SerializationHelper.serializeMap(
        result.llmMissingCoursesBySkill,
      ),
    };
  }

  /**
   * Serialize CourseRetrievalRawOutput Map to Object
   *
   * Converts skillCoursesMap in CourseRetrievalRawOutput:
   * - skillCoursesMap: Map<string, CourseWithLearningOutcomeV2Match[]>
   *
   * @param result - Retrieval result with Map
   * @returns Same structure with Map converted to Record
   */
  static serializeCourseRetrievalResult(result: CourseRetrievalRawOutput): Omit<
    CourseRetrievalRawOutput,
    'skillCoursesMap'
  > & {
    skillCoursesMap: Record<string, CourseWithLearningOutcomeV2Match[]>;
  } {
    return {
      ...result,
      skillCoursesMap: SerializationHelper.serializeMap(result.skillCoursesMap),
    };
  }

  /**
   * Serialize CourseAggregationRawOutput Map to Object
   *
   * Converts filteredSkillCoursesMap in CourseAggregationRawOutput:
   * - filteredSkillCoursesMap: Map<string, CourseWithLearningOutcomeV2MatchWithRelevance[]>
   *
   * @param result - Aggregation result with Map
   * @returns Same structure with Map converted to Record
   */
  static serializeCourseAggregationResult(
    result: CourseAggregationRawOutput,
  ): Omit<CourseAggregationRawOutput, 'filteredSkillCoursesMap'> & {
    filteredSkillCoursesMap: Record<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >;
  } {
    return {
      ...result,
      filteredSkillCoursesMap: SerializationHelper.serializeMap(
        result.filteredSkillCoursesMap,
      ),
    };
  }
}
