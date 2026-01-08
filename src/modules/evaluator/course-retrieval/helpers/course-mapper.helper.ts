import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import type { CourseInfo } from '../types/course-retrieval.types';

/**
 * Course Mapper Helper
 *
 * Helper class to map between different course representations.
 * Converts CourseWithLearningOutcomeV2Match to CourseInfo format
 * expected by the course retriever evaluator.
 */
export class CourseMapperHelper {
  /**
   * Map CourseWithLearningOutcomeV2Match to CourseInfo
   *
   * Extracts and transforms:
   * - subjectCode → courseCode
   * - subjectName → courseName
   * - allLearningOutcomes[].cleanedName → cleanedLearningOutcomes
   *
   * @param course - Course with learning outcome v2 match data
   * @returns CourseInfo format for evaluator
   */
  static toCourseInfo(course: CourseWithLearningOutcomeV2Match): CourseInfo {
    return {
      courseCode: course.subjectCode,
      courseName: course.subjectName,
      cleanedLearningOutcomes: course.allLearningOutcomes.map(
        (lo) => lo.cleanedName,
      ),
    };
  }
}
