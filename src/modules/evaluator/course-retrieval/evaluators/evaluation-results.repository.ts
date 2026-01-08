import { Injectable, Logger } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import {
  AggregateMetrics,
  ContextMismatchEntry,
  EnhancedIterationMetrics,
  FinalMetrics,
  TestCaseMetrics,
} from '../test-sets/test-set.type';
import { EvaluateRetrieverOutput } from '../types/course-retrieval.types';

/**
 * Repository for managing evaluation result files
 *
 * Handles all file I/O operations for course retriever evaluations.
 * Focused solely on persistence - no business logic or calculations.
 *
 * Output structure:
 * data/evaluation/course-retriever/
 * └── {testSetName}/
 *     ├── metrics/
 *     │   └── metrics-iteration-{N}.json
 *     ├── records/
 *     │   └── records-iteration-{N}.json
 *     ├── test-case-metrics/
 *     │   └── test-case-metrics-iteration-{N}.json
 *     ├── aggregate-metrics/
 *     │   └── final-metrics-{totalIterations}-{testSetSize}.json
 *     └── misalignments/
 *         └── context-mismatches.json
 */
@Injectable()
export class EvaluationResultsRepository {
  private readonly logger = new Logger(EvaluationResultsRepository.name);
  private readonly baseDir = 'data/evaluation/course-retriever';

  /**
   * Ensure the directory structure exists for a test set
   *
   * Creates: metrics/, records/, test-case-metrics/, aggregate-metrics/, misalignments/
   *
   * @param testSetName - Test set identifier
   */
  async ensureDirectoryStructure(testSetName: string): Promise<void> {
    const baseDir = path.join(this.baseDir, testSetName);
    const subdirs = [
      'metrics',
      'records',
      'test-case-metrics',
      'aggregate-metrics',
      'misalignments',
    ];

    for (const subdir of subdirs) {
      const dirPath = path.join(baseDir, subdir);
      await FileHelper.saveJson(path.join(dirPath, '.gitkeep'), '');
    }

    this.logger.log(`Ensured directory structure for ${testSetName}`);
  }

  /**
   * Save iteration records to file
   *
   * @param testSetName - Test set identifier (e.g., 'test-set-v1')
   * @param iterationNumber - Current iteration number
   * @param records - Array of evaluation results for this iteration
   */
  async saveIterationRecords(params: {
    testSetName: string;
    iterationNumber: number;
    records: EvaluateRetrieverOutput[];
  }): Promise<void> {
    const { testSetName, iterationNumber, records } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `records-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, records);
    this.logger.log(`Saved ${records.length} records to ${filePath}`);
  }

  /**
   * Save iteration metrics to file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param metrics - Enhanced iteration metrics with three-level aggregation
   */
  async saveIterationMetrics(params: {
    testSetName: string;
    iterationNumber: number;
    metrics: EnhancedIterationMetrics;
  }): Promise<void> {
    const { testSetName, iterationNumber, metrics } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'metrics',
      `metrics-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, metrics);
    this.logger.log(`Saved iteration metrics to ${filePath}`);
  }

  /**
   * Save test case metrics to file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param testCaseMetrics - Array of test case metrics to save
   */
  async saveTestCaseMetrics(params: {
    testSetName: string;
    iterationNumber: number;
    testCaseMetrics: TestCaseMetrics[];
  }): Promise<void> {
    const { testSetName, iterationNumber, testCaseMetrics } = params;

    const filePath = path.join(
      this.baseDir,
      testSetName,
      'test-case-metrics',
      `test-case-metrics-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, testCaseMetrics);
    this.logger.log(
      `Saved ${testCaseMetrics.length} test case metrics to ${filePath}`,
    );
  }

  /**
   * Save context mismatches to the global mismatches file
   *
   * Appends new mismatches to the existing array (if any).
   *
   * @param testSetName - Test set identifier
   * @param mismatches - Array of context mismatch entries
   */
  async saveContextMismatches(params: {
    testSetName: string;
    mismatches: ContextMismatchEntry[];
  }): Promise<void> {
    const { testSetName, mismatches } = params;

    if (mismatches.length === 0) {
      this.logger.debug('No context mismatches to save');
      return;
    }

    const filePath = path.join(
      this.baseDir,
      testSetName,
      'misalignments',
      'context-mismatches.json',
    );

    // Append each mismatch entry to the array
    for (const mismatch of mismatches) {
      await FileHelper.appendToJsonArray(filePath, mismatch);
    }

    this.logger.log(
      `Saved ${mismatches.length} context mismatches to ${filePath}`,
    );
  }

  /**
   * Save aggregate metrics to file
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @param testSetSize - Number of test cases
   * @param metrics - Aggregated metrics across all iterations
   */
  async saveAggregateMetrics(params: {
    testSetName: string;
    totalIterations: number;
    testSetSize: number;
    metrics: AggregateMetrics;
  }): Promise<void> {
    const { testSetName, totalIterations, testSetSize, metrics } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'aggregate-metrics',
      `aggregate-metrics-${totalIterations}-${testSetSize}.json`,
    );

    await FileHelper.saveJson(filePath, metrics);
    this.logger.log(`Saved aggregate metrics to ${filePath}`);
  }

  /**
   * Save final aggregate metrics
   *
   * This is the top-level summary file written after all iterations complete.
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @param testSetSize - Number of test cases
   * @param metrics - Final aggregated metrics
   */
  async saveFinalMetrics(params: {
    testSetName: string;
    totalIterations: number;
    testSetSize: number;
    metrics: FinalMetrics;
  }): Promise<void> {
    const { testSetName, totalIterations, testSetSize, metrics } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'aggregate-metrics',
      `final-metrics-${totalIterations}-${testSetSize}.json`,
    );

    await FileHelper.saveJson(filePath, metrics);
    this.logger.log(`Saved final metrics to ${filePath}`);
  }

  /**
   * Load iteration metrics from file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Iteration number to load
   * @returns Enhanced iteration metrics
   */
  async loadIterationMetrics(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<EnhancedIterationMetrics> {
    const { testSetName, iterationNumber } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'metrics',
      `metrics-iteration-${iterationNumber}.json`,
    );

    return FileHelper.loadJson<EnhancedIterationMetrics>(filePath);
  }
}
