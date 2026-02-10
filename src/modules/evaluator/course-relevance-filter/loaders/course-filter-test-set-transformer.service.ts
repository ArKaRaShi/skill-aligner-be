import { Injectable, Logger } from '@nestjs/common';

import type { CourseWithLearningOutcomeV2MatchWithRelevance } from 'src/modules/query-processor/types/course-aggregation.type';

import type { CourseFilterTestSetSerialized } from '../../shared/services/test-set.types';
import type {
  AggregatedCourseForEval,
  QuestionEvalSample,
  SystemAction,
  SystemRelevanceScore,
} from '../types/course-relevance-filter.types';

// ============================================================================
// COURSE FILTER TEST SET TRANSFORMER SERVICE
// ============================================================================

/**
 * Test Set Transformer Service
 *
 * Transforms course filter test sets from the TestSetBuilderService output format
 * (3 maps by skill with full CourseWithLearningOutcomeV2MatchWithRelevance objects)
 * into the evaluation format (deduplicated by subjectCode).
 *
 * This service follows the same deduplication pattern as CourseAggregationService:
 * - Key: subjectCode (per question)
 * - Score: MAX across all skills
 * - Preserves: All matchedSkills[] array for context
 *
 * @example
 * ```ts
 * const transformer = new CourseFilterTestSetTransformer();
 * const testSet = await loadTestSet('test-set-v1.json');
 * const samples = await transformer.transformTestSet(testSet);
 * // samples: QuestionEvalSample[] (deduplicated by subjectCode)
 * ```
 */
@Injectable()
export class CourseFilterTestSetTransformer {
  private readonly logger = new Logger(CourseFilterTestSetTransformer.name);

  /**
   * Transform test set from serialized format to evaluation format
   *
   * @param testSet - Raw test set from TestSetBuilderService
   * @returns Transformed samples with deduplicated courses
   */
  transformTestSet(
    testSet: CourseFilterTestSetSerialized[],
  ): QuestionEvalSample[] {
    this.logger.log(
      `Transforming ${testSet.length} test set entries to evaluation format`,
    );

    const results: QuestionEvalSample[] = [];

    for (const entry of testSet) {
      const courseMap = new Map<string, AggregatedCourseForEval>();

      // Extract raw output (type assertion matches test set builder pattern)

      const rawOutput = entry.rawOutput;

      // Process all 3 maps (accepted, rejected, missing)

      this.processCourseMap(
        courseMap,
        rawOutput?.llmAcceptedCoursesBySkill ?? {},
      );

      this.processCourseMap(
        courseMap,
        rawOutput?.llmRejectedCoursesBySkill ?? {},
      );

      this.processCourseMap(
        courseMap,
        rawOutput?.llmMissingCoursesBySkill ?? {},
      );

      // Convert map to array and rank by score
      const courses = Array.from(courseMap.values());
      this.rankByScore(courses);

      results.push({
        queryLogId: entry.queryLogId,
        question: entry.question,
        courses,
      });

      this.logger.debug(
        `Transformed entry ${entry.queryLogId}: ${courses.length} deduplicated courses`,
      );
    }

    this.logger.log(`Transformation complete: ${results.length} samples`);
    return results;
  }

  /**
   * Process a single skill-to-courses map
   * Merges courses into the deduplication map
   *
   * @param courseMap - Deduplication map
   * @param skillCoursesMap - Courses organized by skill (full course objects)
   */
  private processCourseMap(
    courseMap: Map<string, AggregatedCourseForEval>,
    skillCoursesMap: Record<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >,
  ): void {
    for (const [skill, courses] of Object.entries(skillCoursesMap)) {
      for (const course of courses) {
        this.mergeCourseIntoMap(courseMap, course, skill);
      }
    }
  }

  /**
   * Merge a single course into the deduplication map
   *
   * Deduplication rules (same as CourseAggregationService):
   * - Key: subjectCode (unique per question)
   * - Score: Keep MAX across all skills
   * - Preserves: All matchedSkills[] array
   *
   * @param courseMap - Deduplication map
   * @param course - Full course object from test set
   * @param skill - Skill that matched this course
   */
  private mergeCourseIntoMap(
    courseMap: Map<string, AggregatedCourseForEval>,
    course: CourseWithLearningOutcomeV2MatchWithRelevance,
    skill: string,
  ): void {
    const { subjectCode, score, reason } = course;

    if (!courseMap.has(subjectCode)) {
      // First time seeing this course - create new entry
      courseMap.set(subjectCode, this.createAggregatedCourse(course, skill));
      return;
    }

    // Course exists - update if this score is higher
    const aggregated = courseMap.get(subjectCode)!;

    // Add matched skill to array
    aggregated.matchedSkills.push({
      skill,
      score: score as SystemRelevanceScore,
      learningOutcomes: course.matchedLearningOutcomes.map((lo) => ({
        id: lo.loId,
        name: lo.cleanedName,
      })),
    });

    // Update MAX score if this one is higher
    if (score > aggregated.systemScore) {
      aggregated.systemScore = score as SystemRelevanceScore;
      aggregated.systemReason = reason;
    }
  }

  /**
   * Create a new aggregated course entry from full course object
   *
   * Extracts relevant fields from CourseWithLearningOutcomeV2MatchWithRelevance
   *
   * @param course - Full course object from test set
   * @param skill - Skill that matched this course
   * @returns New aggregated course
   */
  private createAggregatedCourse(
    course: CourseWithLearningOutcomeV2MatchWithRelevance,
    skill: string,
  ): AggregatedCourseForEval {
    const score = course.score as SystemRelevanceScore;

    return {
      subjectCode: course.subjectCode,
      subjectName: course.subjectName,
      systemAction: (score > 0 ? 'KEEP' : 'DROP') as SystemAction,
      systemScore: score,
      systemReason: course.reason,
      matchedSkills: [
        {
          skill,
          score: course.score as SystemRelevanceScore,
          learningOutcomes: course.matchedLearningOutcomes.map((lo) => ({
            id: lo.loId,
            name: lo.cleanedName,
          })),
        },
      ],
      allLearningOutcomes: course.allLearningOutcomes.map((lo) => ({
        id: lo.loId,
        name: lo.cleanedName,
      })),
    };
  }

  /**
   * Rank courses by system score (descending)
   * Higher scores first
   *
   * @param courses - Courses to rank (modified in-place)
   */
  private rankByScore(courses: AggregatedCourseForEval[]): void {
    courses.sort((a, b) => b.systemScore - a.systemScore);
  }
}
