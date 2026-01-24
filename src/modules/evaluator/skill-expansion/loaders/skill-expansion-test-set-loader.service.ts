import { Injectable, Logger } from '@nestjs/common';

import { FileHelper } from '../../../../shared/utils/file';
import type {
  QuestionEvalSample,
  SkillExpansionTestSet,
} from '../types/skill-expansion.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TEST_SET_DIR = 'data/evaluation/test-sets';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadSkillExpansionTestSetOptions {
  /** Filter to specific queryLogId */
  queryLogId?: string;
}

// ============================================================================
// SKILL EXPANSION TEST SET LOADER SERVICE
// ============================================================================

/**
 * Skill Expansion Test Set Loader Service
 *
 * Loads skill expansion test sets from JSON files.
 *
 * The test set format is straightforward - an array of entries with:
 * - queryLogId: Unique identifier
 * - question: User's question
 * - rawOutput: { skillItems: [{ skill, reason, learningOutcome }] }
 *
 * No complex transformation needed (unlike course filtering with deduplication).
 *
 * @example
 * ```ts
 * // Load all test set entries
 * const samples = await loader.load('skill-expansion-test-set.json');
 *
 * // Load specific queryLogId
 * const filteredSamples = await loader.load('test-set-v1.json', DEFAULT_TEST_SET_DIR, {
 *   queryLogId: 'abc123'
 * });
 * ```
 */
@Injectable()
export class SkillExpansionTestSetLoaderService {
  private readonly logger = new Logger(SkillExpansionTestSetLoaderService.name);

  /**
   * Load a skill expansion test set and transform to evaluation samples
   * Supports filtering by queryLogId for targeted evaluation
   *
   * @param filename - Name of the JSON file (with or without .json extension)
   * @param directory - Directory path (defaults to DEFAULT_TEST_SET_DIR)
   * @param options - Optional filters (queryLogId)
   * @returns Array of evaluation samples
   */
  async load(
    filename: string,
    directory: string = DEFAULT_TEST_SET_DIR,
    options?: LoadSkillExpansionTestSetOptions,
  ): Promise<QuestionEvalSample[]> {
    // Normalize filename
    const filepath = filename.endsWith('.json')
      ? `${directory}/${filename}`
      : `${directory}/${filename}.json`;

    this.logger.log(`Loading test set from: ${filepath}`);

    // Load JSON file
    const data = await FileHelper.loadJson<SkillExpansionTestSet>(filepath);

    // Validate data structure
    if (!data.cases || !Array.isArray(data.cases)) {
      throw new Error(
        `Invalid test set format: expected "cases" array in ${filepath}`,
      );
    }

    this.logger.log(
      `Loaded test set "${data.name}" with ${data.cases.length} entries`,
    );

    // Apply filters if provided
    let filteredCases = data.cases;
    if (options?.queryLogId) {
      filteredCases = filteredCases.filter(
        (entry) => entry.queryLogId === options.queryLogId,
      );
      this.logger.log(
        `Filtered to ${filteredCases.length} entries with queryLogId="${options.queryLogId}"`,
      );
    }

    if (filteredCases.length === 0) {
      this.logger.warn('No entries to process after filtering');
      return [];
    }

    // Transform to evaluation samples
    const samples = this.transformToSamples(filteredCases);

    this.logger.log(`Transformed to ${samples.length} evaluation samples`);

    return samples;
  }

  /**
   * Transform test set cases to evaluation samples
   *
   * @param cases - Test set cases
   * @returns Array of evaluation samples
   */
  private transformToSamples(
    cases: SkillExpansionTestSet['cases'],
  ): QuestionEvalSample[] {
    return cases.map((testCase) => ({
      queryLogId: testCase.queryLogId,
      question: testCase.question,
      systemSkills: testCase.rawOutput.skillItems,
    }));
  }
}
