import { Injectable, Logger, Optional } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';
import { TokenCostCalculator } from 'src/shared/utils/token-cost-calculator.helper';

import type {
  AnswerSynthesisComparisonRecord,
  AnswerSynthesisCostFile,
  AnswerSynthesisFinalCostFile,
  AnswerSynthesisFinalMetricsFile,
  AnswerSynthesisMetrics,
  AnswerSynthesisMetricsFile,
} from '../types/answer-synthesis.types';
import { AnswerSynthesisMetricsCalculator } from './answer-synthesis-metrics-calculator.service';

// ============================================================================
// ANSWER SYNTHESIS RESULT MANAGER SERVICE
// ============================================================================

/**
 * Service for managing evaluation result files
 *
 * Handles all file I/O operations for answer synthesis evaluations,
 * including saving records, metrics, costs, and calculating aggregate
 * metrics across iterations.
 *
 * Output structure:
 * data/evaluation/answer-synthesis/
 * └── {testSetName}/
 *     ├── metrics/
 *     │   └── metrics-iteration-{N}.json
 *     ├── records/
 *     │   └── records-iteration-{N}.json
 *     ├── cost/
 *     │   └── cost-iteration-{N}.json
 *     ├── low-faithfulness/
 *     │   └── low-faithfulness-iteration-{N}.json
 *     ├── final-metrics/
 *     │   └── final-metrics-{totalIterations}.json
 *     └── final-cost/
 *         └── final-cost-{totalIterations}.json
 */
@Injectable()
export class AnswerSynthesisResultManagerService {
  private readonly logger = new Logger(
    AnswerSynthesisResultManagerService.name,
  );
  private readonly baseDir: string;
  /** Number of characters to display from hash prefix in logs */
  private static readonly HASH_PREFIX_LENGTH = 16;

  constructor(
    private readonly metricsCalculator: AnswerSynthesisMetricsCalculator,
    @Optional() baseDir?: string,
  ) {
    this.baseDir = baseDir ?? 'data/evaluation/answer-synthesis';
  }

  /**
   * Ensure all required directories exist for a test set.
   *
   * @param testSetName - Test set identifier
   */
  async ensureDirectoryStructure(testSetName: string): Promise<void> {
    const dirs = [
      'records',
      'metrics',
      'low-faithfulness',
      'cost',
      'final-metrics',
      'final-cost',
    ];

    await Promise.all(
      dirs.map((dir) => {
        const dirPath = path.join(this.baseDir, testSetName, dir);
        return FileHelper.saveJson(path.join(dirPath, '.gitkeep'), '');
      }),
    );

    this.logger.debug(`Ensured directory structure for ${testSetName}`);
  }

  /**
   * Save iteration records to file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param records - Array of comparison records for this iteration
   */
  async saveIterationRecords(params: {
    testSetName: string;
    iterationNumber: number;
    records: AnswerSynthesisComparisonRecord[];
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
   * This is used for incremental saving - each completed sample is
   * immediately saved to its own file, preventing data loss
   * if the process crashes mid-iteration.
   *
   * Follows ADR-0002: Hash-Based Incremental Record Saving
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param hash - SHA256 hash of sample-unique parameters (queryLogId)
   * @param record - Single comparison record to save
   */
  async saveRecord(params: {
    testSetName: string;
    iterationNumber: number;
    hash: string;
    record: AnswerSynthesisComparisonRecord;
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
      `Saved 1 sample → ${hash.substring(0, AnswerSynthesisResultManagerService.HASH_PREFIX_LENGTH)}...`,
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
   * @returns Array of comparison records (empty array if directory not found)
   */
  async loadIterationRecords(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<AnswerSynthesisComparisonRecord[]> {
    const { testSetName, iterationNumber } = params;
    const dirPath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `iteration-${iterationNumber}`,
    );

    try {
      return await FileHelper.loadJsonDirectory<AnswerSynthesisComparisonRecord>(
        dirPath,
      );
    } catch {
      // Return empty array if not found
      return [];
    }
  }

  /**
   * Save iteration metrics to file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param metrics - Evaluation metrics for this iteration
   */
  async saveIterationMetrics(params: {
    testSetName: string;
    iterationNumber: number;
    metrics: AnswerSynthesisMetricsFile;
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
   * Save iteration cost to file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param cost - Cost file for this iteration
   */
  async saveIterationCost(params: {
    testSetName: string;
    iterationNumber: number;
    cost: AnswerSynthesisCostFile;
  }): Promise<void> {
    const { testSetName, iterationNumber, cost } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'cost',
      `cost-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, cost);
    this.logger.log(`Saved iteration cost to ${filePath}`);
  }

  /**
   * Save low-faithfulness analysis to file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param lowFaithfulness - Low-faithfulness analysis for this iteration
   */
  async saveLowFaithfulness(params: {
    testSetName: string;
    iterationNumber: number;
    lowFaithfulness: unknown;
  }): Promise<void> {
    const { testSetName, iterationNumber, lowFaithfulness } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'low-faithfulness',
      `low-faithfulness-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, lowFaithfulness);
    this.logger.log(`Saved low-faithfulness analysis to ${filePath}`);
  }

  /**
   * Save final aggregated metrics
   *
   * This is the top-level summary file written after all iterations complete.
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @param metrics - Final aggregated metrics
   */
  async saveFinalMetrics(params: {
    testSetName: string;
    totalIterations: number;
    metrics: AnswerSynthesisFinalMetricsFile;
  }): Promise<void> {
    const { testSetName, totalIterations, metrics } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'final-metrics',
      `final-metrics-${totalIterations}.json`,
    );

    await FileHelper.saveJson(filePath, metrics);
    this.logger.log(`Saved final metrics to ${filePath}`);
  }

  /**
   * Save final aggregated cost
   *
   * This is the top-level cost summary file written after all iterations complete.
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @param cost - Final aggregated cost
   */
  async saveFinalCost(params: {
    testSetName: string;
    totalIterations: number;
    cost: AnswerSynthesisFinalCostFile;
  }): Promise<void> {
    const { testSetName, totalIterations, cost } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'final-cost',
      `final-cost-${totalIterations}.json`,
    );

    await FileHelper.saveJson(filePath, cost);
    this.logger.log(`Saved final cost to ${filePath}`);
  }

  /**
   * Calculate metrics for a single iteration
   *
   * @param iterationNumber - Current iteration number
   * @param records - Comparison records for this iteration
   * @param config - Configuration for this iteration
   * @returns Metrics file output
   */
  calculateIterationMetrics(params: {
    iterationNumber: number;
    records: AnswerSynthesisComparisonRecord[];
    config: {
      systemPromptVersion?: string;
      judgeModel: string;
      judgeProvider: string;
    };
  }): AnswerSynthesisMetricsFile {
    const { iterationNumber, records } = params;

    if (records.length === 0) {
      this.logger.warn('No records to calculate metrics from');
      throw new Error('Cannot calculate metrics for empty records array');
    }

    const metrics: AnswerSynthesisMetrics =
      this.metricsCalculator.calculateFromRecords(records);

    return {
      iteration: iterationNumber,
      timestamp: new Date().toISOString(),
      ...metrics,
    };
  }

  /**
   * Calculate final aggregated metrics across all iterations
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @param perIterationMetrics - Array of metrics from each iteration
   * @returns Final aggregated metrics file
   */
  calculateFinalMetrics(params: {
    testSetName: string;
    totalIterations: number;
    perIterationMetrics: AnswerSynthesisMetricsFile[];
  }): AnswerSynthesisFinalMetricsFile {
    const { totalIterations, perIterationMetrics } = params;

    if (perIterationMetrics.length === 0) {
      this.logger.warn('No iteration metrics to aggregate');
      throw new Error('Cannot aggregate empty metrics array');
    }

    // Calculate aggregate statistics
    const faithfulnessScores = perIterationMetrics.map(
      (m) => m.averageFaithfulnessScore.value,
    );
    const completenessScores = perIterationMetrics.map(
      (m) => m.averageCompletenessScore.value,
    );
    const faithfulnessPassRates = perIterationMetrics.map(
      (m) => m.faithfulnessPassRate.value,
    );
    const completenessPassRates = perIterationMetrics.map(
      (m) => m.completenessPassRate.value,
    );
    const overallPassRates = perIterationMetrics.map(
      (m) => m.overallPassRate.value,
    );

    const aggregateMetrics = {
      averageFaithfulnessScore: this.calculateStats(faithfulnessScores),
      averageCompletenessScore: this.calculateStats(completenessScores),
      faithfulnessPassRate: this.calculateStats(faithfulnessPassRates),
      completenessPassRate: this.calculateStats(completenessPassRates),
      overallPassRate: this.calculateStats(overallPassRates),
    };

    return {
      iterations: totalIterations,
      timestamp: new Date().toISOString(),
      aggregateMetrics,
      perIterationMetrics,
    };
  }

  /**
   * Calculate cost for a single iteration
   *
   * @param iterationNumber - Current iteration number
   * @param records - Comparison records for this iteration
   * @param config - Configuration for this iteration
   * @returns Cost file output
   */
  calculateIterationCost(params: {
    iterationNumber: number;
    testSetName: string;
    records: AnswerSynthesisComparisonRecord[];
    config: {
      judgeModel: string;
      judgeProvider: string;
    };
  }): AnswerSynthesisCostFile {
    const { iterationNumber, testSetName, records, config } = params;

    // Aggregate token usage from all records
    const allTokenUsage = records.flatMap((r) => r.tokenUsage);
    const totalTokens = {
      input: allTokenUsage.reduce((sum, t) => sum + t.inputTokens, 0),
      output: allTokenUsage.reduce((sum, t) => sum + t.outputTokens, 0),
      total: allTokenUsage.reduce(
        (sum, t) => sum + t.inputTokens + t.outputTokens,
        0,
      ),
    };

    // Calculate cost
    const costSummary = TokenCostCalculator.estimateTotalCost(allTokenUsage);
    const totalCost = costSummary.totalEstimatedCost;

    return {
      iteration: iterationNumber,
      timestamp: new Date().toISOString(),
      testSetName,
      judgeModel: config.judgeModel,
      judgeProvider: config.judgeProvider,
      samples: records.length,
      totalTokens,
      totalCost,
      tokenUsage: allTokenUsage,
    };
  }

  /**
   * Calculate final aggregated cost across all iterations
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @param perIterationCosts - Array of costs from each iteration
   * @returns Final aggregated cost file
   */
  calculateFinalCost(params: {
    testSetName: string;
    totalIterations: number;
    perIterationCosts: AnswerSynthesisCostFile[];
  }): AnswerSynthesisFinalCostFile {
    const { testSetName, totalIterations, perIterationCosts } = params;

    if (perIterationCosts.length === 0) {
      this.logger.warn('No iteration costs to aggregate');
      throw new Error('Cannot aggregate empty costs array');
    }

    const totalSamples = perIterationCosts.reduce(
      (sum, c) => sum + c.samples,
      0,
    );
    const totalTokens = {
      input: perIterationCosts.reduce((sum, c) => sum + c.totalTokens.input, 0),
      output: perIterationCosts.reduce(
        (sum, c) => sum + c.totalTokens.output,
        0,
      ),
      total: perIterationCosts.reduce((sum, c) => sum + c.totalTokens.total, 0),
    };
    const totalCost = perIterationCosts.reduce(
      (sum, c) => sum + c.totalCost,
      0,
    );

    // Get judge model/provider from first iteration (should be consistent)
    const { judgeModel, judgeProvider } = perIterationCosts[0];

    return {
      iterations: totalIterations,
      timestamp: new Date().toISOString(),
      testSetName,
      judgeModel,
      judgeProvider,
      aggregateStats: {
        totalSamples,
        totalTokens,
        totalCost,
        averageCostPerSample: totalSamples > 0 ? totalCost / totalSamples : 0,
      },
      perIterationCosts,
    };
  }

  /**
   * Calculate statistics (mean, min, max, stdDev) from an array of numbers.
   */
  private calculateStats(values: number[]): {
    mean: number;
    min: number;
    max: number;
    stdDev: number;
  } {
    if (values.length === 0) {
      return { mean: 0, min: 0, max: 0, stdDev: 0 };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, min, max, stdDev };
  }
}
