import { Injectable, Logger } from '@nestjs/common';

import type { CourseRetrievalTestSetSerialized } from '../../shared/services/test-set.types';
import type {
  CourseRetrieverTestCase,
  CourseRetrieverTestSet,
} from '../types/course-retrieval.types';

// ============================================================================
// COURSE RETRIEVAL TEST SET TRANSFORMER SERVICE
// ============================================================================

/**
 * Test Set Transformer Service
 *
 * Transforms course retrieval test sets from the TestSetBuilderService output format
 * (CourseRetrievalTestSetSerialized array) into the evaluation format
 * (CourseRetrieverTestSet with TestCase array).
 *
 * Each skill in each question becomes a separate test case, allowing for
 * per-skill evaluation and progress tracking.
 *
 * @example
 * ```ts
 * const transformer = new CourseRetrievalTestSetTransformer();
 * const serialized = await loadTestSet('test-set-v1.json');
 * const testSet = await transformer.transformTestSet(serialized, 'my-test-set');
 * // testSet: CourseRetrieverTestSet { name, description, cases[] }
 * ```
 */
@Injectable()
export class CourseRetrievalTestSetTransformer {
  private readonly logger = new Logger(CourseRetrievalTestSetTransformer.name);

  /**
   * Transform test set from serialized format to evaluation format
   *
   * Creates one test case per (question, skill) combination, enabling
   * fine-grained evaluation and hash-based progress tracking.
   *
   * Implements within-sample deduplication: removes duplicate skills
   * from the skills array before creating test cases.
   *
   * @param serialized - Raw test set from TestSetBuilderService
   * @param name - Test set name for result grouping
   * @returns Transformed test set with test cases and deduplication info
   */
  transformTestSet(
    serialized: CourseRetrievalTestSetSerialized[],
    name: string,
  ): CourseRetrieverTestSet {
    this.logger.log(
      `Transforming ${serialized.length} test set entries to evaluation format`,
    );

    const cases: CourseRetrieverTestCase[] = [];
    let totalSkillsBeforeDedupe = 0;

    for (const entry of serialized) {
      // Count skills before deduplication
      totalSkillsBeforeDedupe += entry.skills.length;

      // Within-sample deduplication: remove duplicate skills
      const uniqueSkills = Array.from(new Set(entry.skills));

      this.logger.debug(
        `Entry ${entry.queryLogId}: ${entry.skills.length} skills -> ${uniqueSkills.length} unique`,
      );

      for (const skill of uniqueSkills) {
        const courses = entry.skillCoursesMap[skill] ?? [];

        // Skip if no courses retrieved for this skill
        if (courses.length === 0) {
          this.logger.debug(
            `Skipping skill "${skill}" for entry ${entry.queryLogId} - no courses retrieved`,
          );
          continue;
        }

        const testCase: CourseRetrieverTestCase = {
          id: `${entry.queryLogId}-${skill}`,
          question: entry.question,
          skill,
          retrievedCourses: courses.map((course) => ({
            subjectCode: course.subjectCode,
            subjectName: course.subjectName,
            cleanedLearningOutcomes: course.allLearningOutcomes.map(
              (lo) => lo.cleanedName,
            ),
          })),
        };

        cases.push(testCase);
      }
    }

    // Calculate deduplication statistics
    const totalSkillsAfterDedupe = cases.length;
    const duplicatesRemoved = totalSkillsBeforeDedupe - totalSkillsAfterDedupe;
    const deduplicationRate =
      totalSkillsBeforeDedupe > 0
        ? (duplicatesRemoved / totalSkillsBeforeDedupe) * 100
        : 0;

    const result: CourseRetrieverTestSet = {
      version: 1,
      name,
      description: `Course retrieval evaluation with ${cases.length} test cases`,
      cases,
      deduplicationInfo: {
        totalCases: totalSkillsBeforeDedupe,
        uniqueGroups: totalSkillsAfterDedupe,
        duplicateCount: duplicatesRemoved,
        deduplicationRate,
      },
    };

    this.logger.log(
      `Transformation complete: ${cases.length} test cases from ${serialized.length} entries`,
    );
    this.logger.log(
      `Within-sample deduplication: ${totalSkillsAfterDedupe}/${totalSkillsBeforeDedupe} unique skills (${deduplicationRate.toFixed(1)}% reduction)`,
    );

    return result;
  }
}
