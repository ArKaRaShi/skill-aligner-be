import { Injectable, Logger, Optional } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import { DistributionStatisticsHelper } from 'src/modules/query-logging/helpers/distribution-statistics.helper';

import type {
  CourseRetrievalFinalMetricsFile,
  CourseRetrievalIterationMetrics,
  CourseRetrievalProgressFile,
  EvaluateRetrieverOutput,
} from '../types/course-retrieval.types';
import { CourseRetrievalMetricsCalculator } from './course-retrieval-metrics-calculator.service';

/**
 * Service for managing evaluation result files
 *
 * Handles file I/O operations for course retrieval evaluations.
 * Simplified to work with single-score evaluation model.
 *
 * Output structure:
 * data/evaluation/course-retriever/
 * └── {testSetName}/
 *     ├── metrics/
 *     │   └── metrics-iteration-{N}.json
 *     ├── records/
 *     │   └── records-iteration-{N}.json
 *     ├── progress/
 *     │   └── progress-iteration-{N}.json
 *     ├── final-metrics/
 *     │   └── final-metrics-{N}.json
 *     ├── disagreements/
 *     │   └── disagreements-iteration-{N}.json
 *     ├── exploratory-delta/
 *     │   └── exploratory-delta-iteration-{N}.json
 *     └── cost/
 *         └── cost-iteration-{N}.json
 */
@Injectable()
export class CourseRetrievalResultManagerService {
  private readonly logger = new Logger(
    CourseRetrievalResultManagerService.name,
  );
  private readonly baseDir: string;

  constructor(@Optional() baseDir?: string) {
    this.baseDir = baseDir ?? 'data/evaluation/course-retriever';
  }

  /**
   * Ensure the directory structure exists for a test set
   *
   * Creates: metrics/, records/, progress/, final-metrics/, disagreements/, exploratory-delta/, cost/
   *
   * @param testSetName - Test set identifier
   */
  async ensureDirectoryStructure(testSetName: string): Promise<void> {
    const baseDir = path.join(this.baseDir, testSetName);
    const subdirs = [
      'metrics',
      'records',
      'progress',
      'final-metrics',
      'disagreements',
      'exploratory-delta',
      'cost',
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
   * Load progress file for crash recovery
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Iteration number
   * @returns Progress file or creates new one if not found
   */
  async loadProgress(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<CourseRetrievalProgressFile> {
    const { testSetName, iterationNumber } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'progress',
      `progress-iteration-${iterationNumber}.json`,
    );

    try {
      return await FileHelper.loadJson<CourseRetrievalProgressFile>(filePath);
    } catch {
      // Return new progress file if not found
      return {
        testSetName,
        iterationNumber,
        entries: [],
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalItems: 0,
          completedItems: 0,
          pendingItems: 0,
          completionPercentage: 0,
        },
      };
    }
  }

  /**
   * Save progress file for crash recovery
   *
   * @param progress - Progress file to save
   */
  async saveProgress(progress: CourseRetrievalProgressFile): Promise<void> {
    const filePath = path.join(
      this.baseDir,
      progress.testSetName,
      'progress',
      `progress-iteration-${progress.iterationNumber}.json`,
    );

    progress.lastUpdated = new Date().toISOString();
    progress.statistics.completedItems = progress.entries.length;
    progress.statistics.pendingItems =
      progress.statistics.totalItems - progress.entries.length;
    progress.statistics.completionPercentage =
      progress.statistics.totalItems > 0
        ? (progress.entries.length / progress.statistics.totalItems) * 100
        : 0;

    await FileHelper.saveJson(filePath, progress);
    this.logger.debug(
      `Saved progress: ${progress.statistics.completionPercentage.toFixed(1)}% complete (${progress.entries.length}/${progress.statistics.totalItems})`,
    );
  }

  /**
   * Load iteration records from file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Iteration number to load
   * @returns Array of evaluation records (empty array if not found)
   */
  async loadIterationRecords(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<EvaluateRetrieverOutput[]> {
    const { testSetName, iterationNumber } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `records-iteration-${iterationNumber}.json`,
    );

    try {
      return await FileHelper.loadJson<EvaluateRetrieverOutput[]>(filePath);
    } catch {
      // Return empty array if not found
      return [];
    }
  }

  /**
   * Get the base directory path for course retrieval evaluations
   *
   * @returns Base directory path
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Save metrics for a single iteration
   *
   * Calculates and saves metrics-iteration-{N}.json containing
   * aggregated statistics for that iteration.
   *
   * @param params.testSetName - Name of the test set
   * @param params.iterationNumber - Iteration number (1-indexed)
   * @param params.records - Evaluation records for this iteration
   * @returns Path to saved metrics file
   */
  async saveIterationMetrics(params: {
    testSetName: string;
    iterationNumber: number;
    records: EvaluateRetrieverOutput[];
  }): Promise<string> {
    // 1. Flatten all evaluations from this iteration
    const allEvaluations = params.records.flatMap((record) =>
      record.evaluations.map((e) => ({
        subjectCode: e.subjectCode,
        subjectName: e.subjectName,
        relevanceScore: e.relevanceScore as 0 | 1 | 2 | 3,
        reason: e.reason,
      })),
    );

    // 2. Calculate metrics for this iteration
    const metrics =
      CourseRetrievalMetricsCalculator.calculateMetrics(allEvaluations);

    // 3. Extract NDCG and Precision for iteration metrics
    const iterationMetrics: CourseRetrievalIterationMetrics = {
      iteration: params.iterationNumber,
      timestamp: new Date().toISOString(),
      sampleCount: params.records.length,
      totalCoursesEvaluated: metrics.totalCourses,
      averageRelevance: metrics.averageRelevance,
      highlyRelevantRate: metrics.highlyRelevantRate,
      irrelevantRate: metrics.irrelevantRate,
      ndcgAt5: metrics.ndcg.at5,
      ndcgAt10: metrics.ndcg.at10,
      ndcgAtAll: metrics.ndcg.atAll,
      precisionAt5: metrics.precision.at5,
      precisionAt10: metrics.precision.at10,
      precisionAtAll: metrics.precision.atAll,
    };

    // 4. Save to file
    const filePath = path.join(
      this.baseDir,
      params.testSetName,
      'metrics',
      `metrics-iteration-${params.iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, iterationMetrics);

    this.logger.log(
      `Saved iteration metrics: ${filePath} (${params.records.length} samples, ${metrics.totalCourses} courses)`,
    );

    return filePath;
  }

  /**
   * Calculate final metrics aggregated across all iterations
   *
   * Loads all per-iteration records and metrics, calculates statistical
   * aggregates (mean, min, max, stdDev), and saves to final-metrics/.
   *
   * @param params.testSetName - Name of the test set
   * @param params.totalIterations - Total number of iterations to aggregate
   * @returns Final metrics file with aggregate statistics
   */
  async calculateFinalMetrics(params: {
    testSetName: string;
    totalIterations: number;
  }): Promise<CourseRetrievalFinalMetricsFile> {
    this.logger.log(
      `Calculating final metrics for ${params.totalIterations} iteration(s)...`,
    );

    // 1. Validate: Check all iterations exist
    const missingIterations: number[] = [];
    for (let i = 1; i <= params.totalIterations; i++) {
      const recordsPath = path.join(
        this.baseDir,
        params.testSetName,
        'records',
        `records-iteration-${i}.json`,
      );
      if (!FileHelper.exists(recordsPath)) {
        missingIterations.push(i);
      }
    }

    if (missingIterations.length > 0) {
      this.logger.warn(`Missing iterations: ${missingIterations.join(', ')}.`);
    }

    // 2. Load all records and metrics
    const allRecords: EvaluateRetrieverOutput[] = [];
    const allMetrics: CourseRetrievalIterationMetrics[] = [];

    for (let i = 1; i <= params.totalIterations; i++) {
      const recordsPath = path.join(
        this.baseDir,
        params.testSetName,
        'records',
        `records-iteration-${i}.json`,
      );

      if (!FileHelper.exists(recordsPath)) {
        continue; // Skip missing iterations
      }

      const records =
        await FileHelper.loadJson<EvaluateRetrieverOutput[]>(recordsPath);
      allRecords.push(...records);

      const metricsPath = path.join(
        this.baseDir,
        params.testSetName,
        'metrics',
        `metrics-iteration-${i}.json`,
      );

      if (FileHelper.exists(metricsPath)) {
        const metrics =
          await FileHelper.loadJson<CourseRetrievalIterationMetrics>(
            metricsPath,
          );
        allMetrics.push(metrics);
      }
    }

    if (allRecords.length === 0) {
      throw new Error(
        `No data found for ${params.testSetName}. Cannot calculate final metrics.`,
      );
    }

    this.logger.log(
      `Loaded ${allRecords.length} records from ${allMetrics.length} iteration(s)`,
    );

    // 3. Calculate aggregate metrics using statistical helper
    const aggregateMetrics =
      this.calculateAggregateMetricsFromIterations(allMetrics);

    // 4. Build final metrics file
    const finalMetrics: CourseRetrievalFinalMetricsFile = {
      iterations: params.totalIterations,
      timestamp: new Date().toISOString(),
      aggregateMetrics,
      perIterationMetrics: allMetrics,
    };

    // 5. Save final metrics
    const finalMetricsPath = path.join(
      this.baseDir,
      params.testSetName,
      'final-metrics',
      `final-metrics-${params.totalIterations}.json`,
    );

    await FileHelper.saveJson(finalMetricsPath, finalMetrics);

    this.logger.log(`Saved final metrics: ${finalMetricsPath}`);

    return finalMetrics;
  }

  /**
   * Calculate aggregate statistics from iteration metrics
   *
   * Collects metric values across all iterations and calculates
   * statistical aggregates using DistributionStatisticsHelper.
   *
   * @param iterationMetrics - Array of iteration metrics
   * @returns Aggregate metrics with NDCG, Precision, and basic metrics
   */
  private calculateAggregateMetricsFromIterations(
    iterationMetrics: CourseRetrievalIterationMetrics[],
  ): CourseRetrievalFinalMetricsFile['aggregateMetrics'] {
    // Extract metric values across all iterations
    const ndcgAt5Values = iterationMetrics.map((m) => m.ndcgAt5);
    const ndcgAt10Values = iterationMetrics.map((m) => m.ndcgAt10);
    const ndcgAtAllValues = iterationMetrics.map((m) => m.ndcgAtAll);

    const precisionAt5Values = iterationMetrics.map((m) => m.precisionAt5);
    const precisionAt10Values = iterationMetrics.map((m) => m.precisionAt10);
    const precisionAtAllValues = iterationMetrics.map((m) => m.precisionAtAll);

    const totalCoursesValues = iterationMetrics.map(
      (m) => m.totalCoursesEvaluated,
    );
    const averageRelevanceValues = iterationMetrics.map(
      (m) => m.averageRelevance,
    );
    const highlyRelevantRateValues = iterationMetrics.map(
      (m) => m.highlyRelevantRate,
    );
    const irrelevantRateValues = iterationMetrics.map((m) => m.irrelevantRate);

    // Calculate statistics using DistributionStatisticsHelper
    const ndcgAt5Stats =
      DistributionStatisticsHelper.computeDistributionStats(ndcgAt5Values);
    const ndcgAt10Stats =
      DistributionStatisticsHelper.computeDistributionStats(ndcgAt10Values);
    const ndcgAtAllStats =
      DistributionStatisticsHelper.computeDistributionStats(ndcgAtAllValues);

    const precisionAt5Stats =
      DistributionStatisticsHelper.computeDistributionStats(precisionAt5Values);
    const precisionAt10Stats =
      DistributionStatisticsHelper.computeDistributionStats(
        precisionAt10Values,
      );
    const precisionAtAllStats =
      DistributionStatisticsHelper.computeDistributionStats(
        precisionAtAllValues,
      );

    const totalCoursesStats =
      DistributionStatisticsHelper.computeDistributionStats(totalCoursesValues);
    const averageRelevanceStats =
      DistributionStatisticsHelper.computeDistributionStats(
        averageRelevanceValues,
      );
    const highlyRelevantRateStats =
      DistributionStatisticsHelper.computeDistributionStats(
        highlyRelevantRateValues,
      );
    const irrelevantRateStats =
      DistributionStatisticsHelper.computeDistributionStats(
        irrelevantRateValues,
      );

    // Convert DistributionStatistics to StatisticalMetric format
    const toStatisticalMetric = (
      stats: ReturnType<
        typeof DistributionStatisticsHelper.computeDistributionStats
      >,
    ) => ({
      mean: stats.average,
      min: stats.min,
      max: stats.max,
      stdDev: stats.stdDev,
    });

    return {
      ndcgAt5: toStatisticalMetric(ndcgAt5Stats),
      ndcgAt10: toStatisticalMetric(ndcgAt10Stats),
      ndcgAtAll: toStatisticalMetric(ndcgAtAllStats),
      precisionAt5: toStatisticalMetric(precisionAt5Stats),
      precisionAt10: toStatisticalMetric(precisionAt10Stats),
      precisionAtAll: toStatisticalMetric(precisionAtAllStats),
      totalCoursesEvaluated: toStatisticalMetric(totalCoursesStats),
      averageRelevance: toStatisticalMetric(averageRelevanceStats),
      highlyRelevantRate: toStatisticalMetric(highlyRelevantRateStats),
      irrelevantRate: toStatisticalMetric(irrelevantRateStats),
    };
  }
}
