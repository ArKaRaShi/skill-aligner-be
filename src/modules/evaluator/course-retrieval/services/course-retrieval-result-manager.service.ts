import { Injectable, Logger, Optional } from '@nestjs/common';

import * as path from 'node:path';
import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { FileHelper } from 'src/shared/utils/file';
import { TokenCostCalculator } from 'src/shared/utils/token-cost-calculator.helper';

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
 *     ├── cost/
 *     │   └── cost-iteration-{N}.json
 *     └── final-cost/
 *         └── final-cost-{N}.json
 */
@Injectable()
export class CourseRetrievalResultManagerService {
  private readonly logger = new Logger(
    CourseRetrievalResultManagerService.name,
  );
  private readonly baseDir: string;
  /** Number of characters to display from question prefix in logs */
  private static readonly QUESTION_PREFIX_LENGTH = 30;
  /** Number of characters to display from hash prefix in logs */
  private static readonly HASH_PREFIX_LENGTH = 16;

  constructor(@Optional() baseDir?: string) {
    this.baseDir = baseDir ?? 'data/evaluation/course-retriever';
  }

  /**
   * Ensure the directory structure exists for a test set
   *
   * Creates: metrics/, records/, progress/, final-metrics/, cost/, final-cost/
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
      'cost',
      'final-cost',
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
   * Save a single record to a hash-based file
   *
   * This is used for incremental saving after each sample evaluation.
   * Uses hash-based filenames to enable parallel sample evaluation.
   *
   * Follows ADR-0002: Hash-Based Incremental Record Saving
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Iteration number
   * @param hash - SHA256 hash of sample-unique parameters (question + skill + testCaseId)
   * @param record - Single evaluation record to save
   */
  async saveRecord(params: {
    testSetName: string;
    iterationNumber: number;
    hash: string;
    record: EvaluateRetrieverOutput;
  }): Promise<void> {
    const { testSetName, iterationNumber, hash, record } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `iteration-${iterationNumber}`,
      `${hash}.json`,
    );

    await FileHelper.saveJson(filePath, record);

    this.logger.debug(
      `Saved record for sample: ${record.question.substring(0, CourseRetrievalResultManagerService.QUESTION_PREFIX_LENGTH)}... → ${hash.substring(0, CourseRetrievalResultManagerService.HASH_PREFIX_LENGTH)}...`,
    );
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
   * Load iteration records from hash-based files
   *
   * Loads all hash-based record files from the iteration directory.
   * Follows ADR-0002: Hash-Based Incremental Record Saving.
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Iteration number to load
   * @returns Array of evaluation records (empty array if directory not found)
   */
  async loadIterationRecords(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<EvaluateRetrieverOutput[]> {
    const { testSetName, iterationNumber } = params;
    const dirPath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `iteration-${iterationNumber}`,
    );

    try {
      return await FileHelper.loadJsonDirectory<EvaluateRetrieverOutput>(
        dirPath,
      );
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
    // 1. Use TREC-standard mean metrics calculation (averages per-sample metrics)
    const metrics = CourseRetrievalMetricsCalculator.calculateMeanMetrics(
      params.records,
    );

    // 2. Build enriched iteration metrics with descriptions
    const iterationMetrics =
      CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
        metrics,
        sampleCount: params.records.length,
        iterationNumber: params.iterationNumber,
      });

    // 3. Save to file
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
      const recordsDir = path.join(
        this.baseDir,
        params.testSetName,
        'records',
        `iteration-${i}`,
      );
      if (!FileHelper.exists(recordsDir)) {
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
      const recordsDir = path.join(
        this.baseDir,
        params.testSetName,
        'records',
        `iteration-${i}`,
      );

      if (!FileHelper.exists(recordsDir)) {
        continue; // Skip missing iterations
      }

      const records =
        await FileHelper.loadJsonDirectory<EvaluateRetrieverOutput>(recordsDir);
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
   * @param iterationMetrics - Array of iteration metrics (enriched format)
   * @returns Aggregate metrics with NDCG, Precision, and basic metrics
   */
  private calculateAggregateMetricsFromIterations(
    iterationMetrics: CourseRetrievalIterationMetrics[],
  ): CourseRetrievalFinalMetricsFile['aggregateMetrics'] {
    // Extract mean values from enriched metrics across all iterations
    const ndcgAt5Values = iterationMetrics.map((m) => m.ndcg.at5.proxyNdcg);
    const ndcgAt10Values = iterationMetrics.map((m) => m.ndcg.at10.proxyNdcg);
    const ndcgAt15Values = iterationMetrics.map((m) => m.ndcg.at15.proxyNdcg);
    const ndcgAtAllValues = iterationMetrics.map((m) => m.ndcg.atAll.proxyNdcg);

    const precisionAt5Values = iterationMetrics.map(
      (m) => m.precision.at5.meanPrecision,
    );
    const precisionAt10Values = iterationMetrics.map(
      (m) => m.precision.at10.meanPrecision,
    );
    const precisionAt15Values = iterationMetrics.map(
      (m) => m.precision.at15.meanPrecision,
    );
    const precisionAtAllValues = iterationMetrics.map(
      (m) => m.precision.atAll.meanPrecision,
    );

    const totalCoursesValues = iterationMetrics.map(
      (m) => m.totalCoursesEvaluated,
    );
    const averageRelevanceValues = iterationMetrics.map(
      (m) => m.meanRelevanceScore.meanRelevanceScore,
    );
    const highlyRelevantRateValues = iterationMetrics.map(
      (m) => m.perClassDistribution.score3.macroAverageRate,
    );
    const irrelevantRateValues = iterationMetrics.map(
      (m) => m.perClassDistribution.score0.macroAverageRate,
    );

    // Calculate statistics using DistributionStatisticsHelper
    const ndcgAt5Stats =
      DistributionStatisticsHelper.computeDistributionStats(ndcgAt5Values);
    const ndcgAt10Stats =
      DistributionStatisticsHelper.computeDistributionStats(ndcgAt10Values);
    const ndcgAt15Stats =
      DistributionStatisticsHelper.computeDistributionStats(ndcgAt15Values);
    const ndcgAtAllStats =
      DistributionStatisticsHelper.computeDistributionStats(ndcgAtAllValues);

    const precisionAt5Stats =
      DistributionStatisticsHelper.computeDistributionStats(precisionAt5Values);
    const precisionAt10Stats =
      DistributionStatisticsHelper.computeDistributionStats(
        precisionAt10Values,
      );
    const precisionAt15Stats =
      DistributionStatisticsHelper.computeDistributionStats(
        precisionAt15Values,
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
      ndcgAt15: toStatisticalMetric(ndcgAt15Stats),
      ndcgAtAll: toStatisticalMetric(ndcgAtAllStats),
      precisionAt5: toStatisticalMetric(precisionAt5Stats),
      precisionAt10: toStatisticalMetric(precisionAt10Stats),
      precisionAt15: toStatisticalMetric(precisionAt15Stats),
      precisionAtAll: toStatisticalMetric(precisionAtAllStats),
      totalCoursesEvaluated: toStatisticalMetric(totalCoursesStats),
      averageRelevance: toStatisticalMetric(averageRelevanceStats),
      highlyRelevantRate: toStatisticalMetric(highlyRelevantRateStats),
      irrelevantRate: toStatisticalMetric(irrelevantRateStats),
    };
  }

  /**
   * Save iteration cost data to file
   *
   * @param params.testSetName - Test set identifier
   * @param params.iterationNumber - Iteration number
   * @param params.judgeModel - Judge model used (fallback if records don't have model)
   * @param params.judgeProvider - Judge provider used (fallback if records don't have provider)
   * @param params.records - Evaluation records with token usage
   */
  async saveIterationCost(params: {
    testSetName: string;
    iterationNumber: number;
    judgeModel: string;
    judgeProvider: string;
    records: EvaluateRetrieverOutput[];
  }): Promise<void> {
    const { testSetName, iterationNumber, judgeModel, judgeProvider, records } =
      params;

    // Aggregate tokens from all records
    const allTokenUsage: TokenUsage[] = [];
    let totalEvaluations = 0;

    for (const record of records) {
      allTokenUsage.push({
        model: record.llmModel,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
      });
      totalEvaluations += record.evaluations.length;
    }

    // Use actual model from records (first non-empty record)
    // This ensures the cost file reflects the actual model used, not the config default
    const actualJudgeModel =
      records.length > 0 ? records[0].llmModel : judgeModel;
    const actualJudgeProvider =
      records.length > 0 ? records[0].llmProvider : judgeProvider;

    // Calculate total cost
    const costSummary = TokenCostCalculator.estimateTotalCost(allTokenUsage);
    const totalInputTokens = allTokenUsage.reduce(
      (sum, t) => sum + t.inputTokens,
      0,
    );
    const totalOutputTokens = allTokenUsage.reduce(
      (sum, t) => sum + t.outputTokens,
      0,
    );

    const costFile = {
      iteration: iterationNumber,
      timestamp: new Date().toISOString(),
      testSetName,
      judgeModel: actualJudgeModel,
      judgeProvider: actualJudgeProvider,
      samples: records.length,
      evaluations: totalEvaluations,
      totalTokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      totalCost: costSummary.totalEstimatedCost,
      tokenUsage: allTokenUsage,
    };

    const filePath = path.join(
      this.baseDir,
      testSetName,
      'cost',
      `cost-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, costFile);
    this.logger.log(
      `Saved iteration cost: ${costFile.samples} samples, ${costFile.evaluations} evaluations, $${costFile.totalCost.toFixed(6)} (${costFile.totalTokens.total} tokens)`,
    );
  }

  /**
   * Calculate and save final aggregated cost across all iterations
   *
   * Loads existing iteration cost files and calculates aggregate statistics.
   *
   * @param params.testSetName - Test set identifier
   * @param params.totalIterations - Total number of iterations
   * @param params.judgeModel - Judge model used
   * @param params.judgeProvider - Judge provider used
   * @returns Final cost file
   */
  async calculateFinalCost(params: {
    testSetName: string;
    totalIterations: number;
    judgeModel: string;
    judgeProvider: string;
  }): Promise<{
    iterations: number;
    timestamp: string;
    testSetName: string;
    judgeModel: string;
    judgeProvider: string;
    aggregateStats: {
      totalSamples: number;
      totalEvaluations: number;
      totalTokens: {
        input: number;
        output: number;
        total: number;
      };
      totalCost: number;
      averageCostPerSample: number;
      averageCostPerEvaluation: number;
    };
    perIterationCosts: unknown[];
  }> {
    const { testSetName, totalIterations, judgeModel, judgeProvider } = params;

    // Type for iteration cost file
    type IterationCostFile = {
      samples: number;
      evaluations: number;
      totalTokens: {
        input: number;
        output: number;
        total: number;
      };
      totalCost: number;
    };

    // Load all iteration cost files
    const iterationCosts: IterationCostFile[] = [];

    for (let i = 1; i <= totalIterations; i++) {
      try {
        const filePath = path.join(
          this.baseDir,
          testSetName,
          'cost',
          `cost-iteration-${i}.json`,
        );
        const costFile = await FileHelper.loadJson<IterationCostFile>(filePath);
        iterationCosts.push(costFile);
      } catch (error) {
        this.logger.warn(
          `Failed to load cost file for iteration ${i}: ${error}`,
        );
      }
    }

    if (iterationCosts.length === 0) {
      throw new Error('No iteration cost files found to aggregate');
    }

    // Calculate aggregates
    const totalSamples = iterationCosts.reduce(
      (sum, file) => sum + file.samples,
      0,
    );
    const totalEvaluations = iterationCosts.reduce(
      (sum, file) => sum + file.evaluations,
      0,
    );
    const totalInputTokens = iterationCosts.reduce(
      (sum, file) => sum + file.totalTokens.input,
      0,
    );
    const totalOutputTokens = iterationCosts.reduce(
      (sum, file) => sum + file.totalTokens.output,
      0,
    );
    const totalCost = iterationCosts.reduce(
      (sum, file) => sum + file.totalCost,
      0,
    );

    const finalCostFile = {
      iterations: iterationCosts.length,
      timestamp: new Date().toISOString(),
      testSetName,
      judgeModel,
      judgeProvider,
      aggregateStats: {
        totalSamples,
        totalEvaluations,
        totalTokens: {
          input: totalInputTokens,
          output: totalOutputTokens,
          total: totalInputTokens + totalOutputTokens,
        },
        totalCost,
        averageCostPerSample: totalSamples > 0 ? totalCost / totalSamples : 0,
        averageCostPerEvaluation:
          totalEvaluations > 0 ? totalCost / totalEvaluations : 0,
      },
      perIterationCosts: iterationCosts,
    };

    // Save final cost file
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'final-cost',
      `final-cost-${totalIterations}.json`,
    );

    await FileHelper.saveJson(filePath, finalCostFile);
    this.logger.log(
      `Saved final cost: ${finalCostFile.aggregateStats.totalSamples} samples, ${finalCostFile.aggregateStats.totalEvaluations} evaluations, $${finalCostFile.aggregateStats.totalCost.toFixed(6)} (${finalCostFile.aggregateStats.totalTokens.total} tokens)`,
    );

    return finalCostFile;
  }
}
