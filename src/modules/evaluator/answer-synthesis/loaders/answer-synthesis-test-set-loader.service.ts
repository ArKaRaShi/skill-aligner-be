import { Injectable, Logger } from '@nestjs/common';

import { FileHelper } from 'src/shared/utils/file';

import type {
  AnswerSynthesisContextSet,
  AnswerSynthesisTestSet,
} from '../types/answer-synthesis.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TEST_SET_DIR = 'data/evaluation/test-sets';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadAnswerSynthesisTestSetOptions {
  /** Filter to specific queryLogId */
  queryLogId?: string;
}

// ============================================================================
// ANSWER SYNTHESIS TEST SET LOADER SERVICE
// ============================================================================

/**
 * Answer Synthesis Test Set Loader Service
 *
 * Loads AnswerSynthesis test sets from JSON files.
 *
 * This service handles file I/O for loading:
 * - Answer synthesis test sets (questions + answers)
 * - Course aggregation test sets (for context)
 *
 * The loaded data is then transformed by the transformer service.
 *
 * @example
 * ```ts
 * // Load answer synthesis test set
 * const answerSet = await loader.loadAnswerSynthesisSet('answer-synthesis-test-set.json');
 *
 * // Load course aggregation context set
 * const contextSet = await loader.loadContextSet('course-aggregation-test-set.json');
 * ```
 */
@Injectable()
export class AnswerSynthesisTestSetLoaderService {
  private readonly logger = new Logger(
    AnswerSynthesisTestSetLoaderService.name,
  );

  /**
   * Load an AnswerSynthesis test set from JSON file.
   *
   * @param filename - Name of the JSON file (with or without .json extension)
   * @param directory - Directory path (defaults to DEFAULT_TEST_SET_DIR)
   * @param options - Optional filters (queryLogId)
   * @returns Array of answer synthesis test set entries
   */
  async loadAnswerSynthesisSet(
    filename: string,
    directory: string = DEFAULT_TEST_SET_DIR,
    options?: LoadAnswerSynthesisTestSetOptions,
  ): Promise<AnswerSynthesisTestSet[]> {
    const filepath = this.normalizePath(filename, directory);

    this.logger.log(`Loading answer synthesis test set from: ${filepath}`);

    const data = await FileHelper.loadJson<AnswerSynthesisTestSet[]>(filepath);

    this.logger.log(`Loaded ${data.length} answer synthesis entries`);

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

    return filteredData;
  }

  /**
   * Load a CourseAggregation test set for context.
   *
   * The judge needs to see the course context (ranked courses with matched skills/LOs)
   * to evaluate if the answer uses only the provided context.
   *
   * @param filename - Name of the JSON file (with or without .json extension)
   * @param directory - Directory path (defaults to DEFAULT_TEST_SET_DIR)
   * @param options - Optional filters (queryLogId)
   * @returns Array of context set entries
   */
  async loadContextSet(
    filename: string,
    directory: string = DEFAULT_TEST_SET_DIR,
    options?: LoadAnswerSynthesisTestSetOptions,
  ): Promise<AnswerSynthesisContextSet[]> {
    const filepath = this.normalizePath(filename, directory);

    this.logger.log(`Loading context set from: ${filepath}`);

    const data =
      await FileHelper.loadJson<AnswerSynthesisContextSet[]>(filepath);

    this.logger.log(`Loaded ${data.length} context entries`);

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

    return filteredData;
  }

  /**
   * Normalize file path.
   */
  private normalizePath(filename: string, directory: string): string {
    return filename.endsWith('.json')
      ? `${directory}/${filename}`
      : `${directory}/${filename}.json`;
  }
}
