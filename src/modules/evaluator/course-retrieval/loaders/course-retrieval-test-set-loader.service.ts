import { Injectable, Logger } from '@nestjs/common';

import { FileHelper } from 'src/shared/utils/file';

import type { CourseRetrievalTestSetSerialized } from '../../shared/services/test-set.types';
import { CourseMapperHelper } from '../helpers/course-mapper.helper';
import { EvaluateRetrieverInput } from '../types/course-retrieval.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TEST_SET_DIR = 'data/evaluation/test-sets';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadCourseRetrievalTestSetOptions {
  /** Filter to specific queryLogId */
  queryLogId?: string;
  /** Filter to specific skill (requires queryLogId) */
  skill?: string;
}

// ============================================================================
// COURSE RETRIEVAL TEST SET LOADER SERVICE
// ============================================================================

/**
 * Course Retrieval Test Set Loader Service
 *
 * Loads CourseRetrieval test sets from JSON files and maps them to
 * course retriever evaluator input format.
 *
 * This service is specifically for course retrieval evaluation.
 * Other evaluators (e.g., question classification, skill expansion)
 * should have their own loader services.
 *
 * Supports filtering by queryLogId and/or skill for targeted evaluation.
 * Each skill is mapped to a separate evaluator input (per skill evaluation).
 *
 * @example
 * ```ts
 * // Load all skills from all entries
 * const inputs = await loader.loadForEvaluator('test-set-v1.json');
 *
 * // Load specific skill from specific entry
 * const filteredInputs = await loader.loadForEvaluator('test-set-v1.json', DEFAULT_TEST_SET_DIR, {
 *   queryLogId: 'abc123',
 *   skill: 'data analysis'
 * });
 * ```
 */
@Injectable()
export class CourseRetrievalTestSetLoaderService {
  private readonly logger = new Logger(
    CourseRetrievalTestSetLoaderService.name,
  );

  /**
   * Load a CourseRetrieval test set and map to evaluator inputs
   * Supports filtering by queryLogId and/or skill for targeted evaluation
   *
   * @param filename - Name of the JSON file (with or without .json extension)
   * @param directory - Directory path (defaults to DEFAULT_TEST_SET_DIR)
   * @param options - Optional filters (queryLogId, skill)
   * @returns Array of evaluator inputs
   */
  async loadForEvaluator(
    filename: string,
    directory: string = DEFAULT_TEST_SET_DIR,
    options?: LoadCourseRetrievalTestSetOptions,
  ): Promise<EvaluateRetrieverInput[]> {
    // Normalize filename
    const filepath = filename.endsWith('.json')
      ? `${directory}/${filename}`
      : `${directory}/${filename}.json`;

    this.logger.log(`Loading test set from: ${filepath}`);

    // Load JSON file
    const data =
      await FileHelper.loadJson<CourseRetrievalTestSetSerialized[]>(filepath);

    this.logger.log(`Loaded ${data.length} test entries`);

    // Apply filters if provided
    let filteredData = data;
    if (options?.queryLogId) {
      filteredData = filteredData.filter(
        (entry) => entry.queryLogId === options.queryLogId,
      );
      this.logger.log(
        `Filtered to ${filteredData.length} entries with queryLogId="${options.queryLogId}"`,
      );
    }

    // Map each entry to evaluator inputs (one per skill)
    const results: EvaluateRetrieverInput[] = [];

    for (const entry of filteredData) {
      const skillInputs = this.mapToEvaluatorInputs(entry, options?.skill);
      results.push(...skillInputs);
    }

    this.logger.log(`Mapped to ${results.length} evaluator inputs`);

    return results;
  }

  /**
   * Map CourseRetrievalTestSetSerialized to evaluator inputs
   * Creates one input per skill (or specific skill if provided)
   *
   * @param entry - Single test set entry
   * @param skillFilter - Optional skill filter
   * @returns Array of evaluator inputs
   */
  private mapToEvaluatorInputs(
    entry: CourseRetrievalTestSetSerialized,
    skillFilter?: string,
  ): EvaluateRetrieverInput[] {
    const inputs: EvaluateRetrieverInput[] = [];

    // Determine which skills to process
    const skillsToProcess = skillFilter
      ? entry.skills.filter((s) => s === skillFilter)
      : entry.skills;

    if (skillFilter && skillsToProcess.length === 0) {
      this.logger.warn(
        `Skill "${skillFilter}" not found in queryLog ${entry.queryLogId}`,
      );
      return inputs;
    }

    // Iterate through skills (filtered or all)
    for (const skill of skillsToProcess) {
      const courses = entry.skillCoursesMap[skill];

      if (!courses) {
        this.logger.warn(
          `No courses found for skill "${skill}" in queryLog ${entry.queryLogId}`,
        );
        continue;
      }

      inputs.push({
        testCaseId: entry.queryLogId,
        question: entry.question,
        skill,
        retrievedCourses: courses.map((course) =>
          CourseMapperHelper.toCourseInfo(course),
        ),
      });
    }

    return inputs;
  }
}
