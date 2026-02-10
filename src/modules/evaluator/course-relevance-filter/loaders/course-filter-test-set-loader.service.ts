import { Injectable, Logger } from '@nestjs/common';

import { FileHelper } from 'src/shared/utils/file';

import { CourseFilterTestSetSerialized } from '../../shared/services/test-set.types';
import type { QuestionEvalSample } from '../types/course-relevance-filter.types';
import { CourseFilterTestSetTransformer } from './course-filter-test-set-transformer.service';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TEST_SET_DIR = 'data/evaluation/test-sets';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadCourseFilterTestSetOptions {
  /** Filter to specific queryLogId */
  queryLogId?: string;
}

// ============================================================================
// COURSE FILTER TEST SET LOADER SERVICE
// ============================================================================

/**
 * Course Filter Test Set Loader Service
 *
 * Loads CourseFilter test sets from JSON files and transforms them to
 * evaluation-ready format.
 *
 * This service handles file I/O (impure) and delegates transformation
 * to the pure transformer service. The separation allows for:
 * - Easy testing of transformation logic (unit tests)
 * - Easy testing of file loading (integration tests)
 * - Reusability of transformer in other contexts
 *
 * @example
 * ```ts
 * // Load all test set entries
 * const samples = await loader.loadForEvaluator('course-filter-test-set.json');
 *
 * // Load specific queryLogId
 * const filteredSamples = await loader.loadForEvaluator('test-set-v1.json', DEFAULT_TEST_SET_DIR, {
 *   queryLogId: 'abc123'
 * });
 * ```
 */
@Injectable()
export class CourseFilterTestSetLoaderService {
  private readonly logger = new Logger(CourseFilterTestSetLoaderService.name);

  constructor(private readonly transformer: CourseFilterTestSetTransformer) {}

  /**
   * Load a CourseFilter test set and transform to evaluation samples
   * Supports filtering by queryLogId for targeted evaluation
   *
   * @param filename - Name of the JSON file (with or without .json extension)
   * @param directory - Directory path (defaults to DEFAULT_TEST_SET_DIR)
   * @param options - Optional filters (queryLogId)
   * @returns Array of evaluation samples
   */
  async loadForEvaluator(
    filename: string,
    directory: string = DEFAULT_TEST_SET_DIR,
    options?: LoadCourseFilterTestSetOptions,
  ): Promise<QuestionEvalSample[]> {
    // Normalize filename
    const filepath = filename.endsWith('.json')
      ? `${directory}/${filename}`
      : `${directory}/${filename}.json`;

    this.logger.log(`Loading test set from: ${filepath}`);

    // Load JSON file
    const data =
      await FileHelper.loadJson<CourseFilterTestSetSerialized[]>(filepath);

    this.logger.log(`Loaded ${data.length} test set entries`);

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

    if (filteredData.length === 0) {
      this.logger.warn('No entries to process after filtering');
      return [];
    }

    // Transform to evaluation samples
    const samples = this.transformer.transformTestSet(filteredData);

    this.logger.log(`Transformed to ${samples.length} evaluation samples`);

    return samples;
  }
}
