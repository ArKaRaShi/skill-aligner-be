import { Injectable, Logger, Optional } from '@nestjs/common';

import * as path from 'node:path';
import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { FileHelper } from 'src/shared/utils/file';
import { TokenCostCalculator } from 'src/shared/utils/token-cost-calculator.helper';

import type {
  SampleEvaluationRecord,
  SkillExpansionCostRecord,
  SkillExpansionFinalCost,
  SkillExpansionFinalMetrics,
  SkillExpansionMetrics,
} from '../types/skill-expansion.types';
import { SkillExpansionMetricsCalculator } from './skill-expansion-metrics-calculator.service';

// ============================================================================
// SKILL EXPANSION RESULT MANAGER SERVICE
// ============================================================================

/**
 * Service for managing evaluation result files
 *
 * Handles all file I/O operations for skill expansion evaluations,
 * including saving records, metrics, costs, and calculating aggregate
 * metrics across iterations.
 *
 * Output structure:
 * data/evaluation/skill-expansion/
 * └── {testSetName}/
 *     ├── records/
 *     │   └── records-iteration-{N}.json
 *     ├── metrics/
 *     │   └── metrics-iteration-{N}.json
 *     ├── cost/
 *     │   └── cost-iteration-{N}.json
 *     ├── final-metrics/
 *     │   └── final-metrics-{totalIterations}.json
 *     └── final-cost/
 *         └── final-cost-{totalIterations}.json
 */
@Injectable()
export class SkillExpansionResultManagerService {
  private readonly logger = new Logger(SkillExpansionResultManagerService.name);
  private readonly baseDir: string;
  /** Number of characters to display from hash prefix in logs */
  private static readonly HASH_PREFIX_LENGTH = 16;

  constructor(
    private readonly metricsCalculator: SkillExpansionMetricsCalculator,
    @Optional() baseDir?: string,
  ) {
    this.baseDir = baseDir ?? 'data/evaluation/skill-expansion';
  }

  /**
   * Save iteration records to file
   *
   * @param testSetName - Test set identifier (e.g., 'test-set-v1')
   * @param iterationNumber - Current iteration number
   * @param records - Array of evaluation records for this iteration
   */
  async saveIterationRecords(params: {
    testSetName: string;
    iterationNumber: number;
    records: SampleEvaluationRecord[];
  }): Promise<void> {
    const { testSetName, iterationNumber, records } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `records-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, records);

    const totalSkills = records.reduce(
      (sum, r) => sum + r.comparison.skills.length,
      0,
    );
    this.logger.log(
      `Saved ${records.length} samples (${totalSkills} skills) to ${filePath}`,
    );
  }

  /**
   * Load existing iteration records from hash-based files
   *
   * Loads all hash-based record files from the iteration directory.
   * Follows ADR-0002: Hash-Based Incremental Record Saving.
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @returns Array of existing records (empty if directory doesn't exist)
   */
  async loadIterationRecords(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<SampleEvaluationRecord[]> {
    const { testSetName, iterationNumber } = params;
    const dirPath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `iteration-${iterationNumber}`,
    );

    try {
      const records =
        await FileHelper.loadJsonDirectory<SampleEvaluationRecord>(dirPath);
      const totalSkills = records.reduce(
        (sum, r) => sum + r.comparison.skills.length,
        0,
      );
      this.logger.log(
        `Loaded ${records.length} samples (${totalSkills} skills) from existing records`,
      );
      return records;
    } catch {
      // No existing records directory
      this.logger.debug('No existing records found, starting fresh');
      return [];
    }
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
   * @param hash - SHA256 hash of sample-unique parameters (queryLogId + question + skill)
   * @param record - Single sample record to save
   */
  async saveRecord(params: {
    testSetName: string;
    iterationNumber: number;
    hash: string;
    record: SampleEvaluationRecord;
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

    const totalSkills = record.comparison.skills.length;
    this.logger.debug(
      `Saved 1 sample (${totalSkills} skills) → ${hash.substring(0, SkillExpansionResultManagerService.HASH_PREFIX_LENGTH)}...`,
    );
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
    metrics: SkillExpansionMetrics & { iteration: number; timestamp: string };
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
   * Save iteration cost data to file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param config - Evaluation configuration (for model info)
   * @param records - Evaluation records with token usage
   */
  async saveIterationCost(params: {
    testSetName: string;
    iterationNumber: number;
    config: {
      judgeModel: string;
      judgeProvider?: string;
    };
    records: SampleEvaluationRecord[];
  }): Promise<void> {
    const { testSetName, iterationNumber, config, records } = params;

    // Aggregate tokens from all samples
    const allTokenUsage: TokenUsage[] = [];
    let totalSkills = 0;

    for (const record of records) {
      allTokenUsage.push(...record.judgeResult.tokenUsage);
      totalSkills += record.comparison.skills.length;
    }

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

    const costRecord: SkillExpansionCostRecord = {
      iteration: iterationNumber,
      sampleCount: records.length,
      skillCount: totalSkills,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost: costSummary.totalEstimatedCost,
      averageCostPerSample:
        records.length > 0
          ? costSummary.totalEstimatedCost / records.length
          : 0,
      averageCostPerSkill:
        totalSkills > 0 ? costSummary.totalEstimatedCost / totalSkills : 0,
      model: config.judgeModel,
      provider: config.judgeProvider,
    };

    const filePath = path.join(
      this.baseDir,
      testSetName,
      'cost',
      `cost-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, costRecord);
    this.logger.log(
      `Saved iteration cost: ${costRecord.sampleCount} samples, ${costRecord.skillCount} skills, $${costRecord.totalCost.toFixed(6)} (${costRecord.totalTokens} tokens)`,
    );
  }

  /**
   * Calculate metrics for a single iteration
   *
   * @param iterationNumber - Current iteration number
   * @param records - Evaluation records for this iteration
   * @returns Metrics file output
   */
  calculateIterationMetrics(params: {
    iterationNumber: number;
    records: SampleEvaluationRecord[];
  }): SkillExpansionMetrics & { iteration: number; timestamp: string } {
    const { iterationNumber, records } = params;

    if (records.length === 0) {
      this.logger.warn('No records to calculate metrics from');
      throw new Error('Cannot calculate metrics for empty records array');
    }

    const evaluationMetrics =
      this.metricsCalculator.calculateFromRecords(records);

    return {
      iteration: iterationNumber,
      timestamp: new Date().toISOString(),
      ...evaluationMetrics,
    };
  }

  /**
   * Calculate final aggregated metrics across all iterations
   *
   * Loads existing iteration metrics files and calculates
   * statistical summary (mean, min, max, stdDev).
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @param totalSamples - Total number of samples across all iterations
   * @param totalSkills - Total number of skills across all iterations
   * @returns Final aggregated metrics
   */
  async calculateFinalMetrics(params: {
    testSetName: string;
    totalIterations: number;
    totalSamples: number;
    totalSkills: number;
  }): Promise<SkillExpansionFinalMetrics> {
    const { testSetName, totalIterations, totalSamples, totalSkills } = params;

    // Load all iteration metrics files
    const iterationMetrics: Array<
      SkillExpansionMetrics & { iteration: number; timestamp: string }
    > = [];
    for (let i = 1; i <= totalIterations; i++) {
      try {
        const filePath = path.join(
          this.baseDir,
          testSetName,
          'metrics',
          `metrics-iteration-${i}.json`,
        );
        const metrics = await FileHelper.loadJson<
          SkillExpansionMetrics & { iteration: number; timestamp: string }
        >(filePath);
        iterationMetrics.push(metrics);
      } catch (error) {
        this.logger.warn(`Failed to load metrics for iteration ${i}: ${error}`);
      }
    }

    if (iterationMetrics.length === 0) {
      throw new Error('No iteration metrics found to aggregate');
    }

    // Calculate aggregate metrics
    const aggregateMetrics = this.calculateAggregateMetrics(iterationMetrics);

    const finalMetrics: SkillExpansionFinalMetrics = {
      testSetName,
      totalIterations: iterationMetrics.length,
      totalSamples,
      totalSkills,
      metrics: aggregateMetrics,
      metricsByIteration: iterationMetrics.map((m) => ({
        iteration: m.iteration,
        metrics: { ...m },
      })),
      generatedAt: new Date().toISOString(),
    };

    // Save final metrics file
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'final-metrics',
      `final-metrics-${totalIterations}.json`,
    );

    await FileHelper.saveJson(filePath, finalMetrics);
    this.logger.log(`Saved final metrics to ${filePath}`);

    return finalMetrics;
  }

  /**
   * Calculate and save final aggregated cost across all iterations
   *
   * Loads existing iteration cost files and calculates aggregate statistics.
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @returns Final cost file
   */
  async calculateFinalCost(params: {
    testSetName: string;
    totalIterations: number;
  }): Promise<SkillExpansionFinalCost> {
    const { testSetName, totalIterations } = params;

    // Load all iteration cost files
    const iterationCosts: SkillExpansionCostRecord[] = [];

    for (let i = 1; i <= totalIterations; i++) {
      try {
        const filePath = path.join(
          this.baseDir,
          testSetName,
          'cost',
          `cost-iteration-${i}.json`,
        );
        const costFile =
          await FileHelper.loadJson<SkillExpansionCostRecord>(filePath);
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
      (sum, record) => sum + record.sampleCount,
      0,
    );
    const totalSkills = iterationCosts.reduce(
      (sum, record) => sum + record.skillCount,
      0,
    );
    const totalTokens = iterationCosts.reduce(
      (sum, record) => sum + record.totalTokens,
      0,
    );
    const totalCost = iterationCosts.reduce(
      (sum, record) => sum + record.totalCost,
      0,
    );

    const finalCost: SkillExpansionFinalCost = {
      testSetName,
      totalIterations: iterationCosts.length,
      totalSamples,
      totalSkills,
      totalTokens,
      totalCost,
      averageCostPerSample: totalSamples > 0 ? totalCost / totalSamples : 0,
      averageCostPerSkill: totalSkills > 0 ? totalCost / totalSkills : 0,
      costByIteration: iterationCosts,
      generatedAt: new Date().toISOString(),
    };

    // Save final cost file
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'final-cost',
      `final-cost-${totalIterations}.json`,
    );

    await FileHelper.saveJson(filePath, finalCost);
    this.logger.log(
      `Saved final cost: ${finalCost.totalSamples} samples, ${finalCost.totalSkills} skills, $${finalCost.totalCost.toFixed(6)} (${finalCost.totalTokens} tokens)`,
    );

    return finalCost;
  }

  /**
   * Calculate aggregate metrics from iteration metrics
   *
   * @param iterationMetrics - Array of iteration metrics
   * @returns Aggregated metrics
   */
  private calculateAggregateMetrics(
    iterationMetrics: Array<
      SkillExpansionMetrics & { iteration: number; timestamp: string }
    >,
  ): SkillExpansionMetrics {
    // Calculate averages for rate-based metrics
    const passRate = this.calculateStatistics(
      iterationMetrics.map((m) => m.passRate),
    );
    const conceptPreservationRate = this.calculateStatistics(
      iterationMetrics.map((m) => m.conceptPreservationRate),
    );
    const overallAgreementRate = this.calculateStatistics(
      iterationMetrics.map((m) => m.overallAgreementRate),
    );

    // Sum counts across all iterations
    const totalSkills = iterationMetrics.reduce(
      (sum, m) => sum + m.totalSkills,
      0,
    );
    const totalQuestions = iterationMetrics.reduce(
      (sum, m) => sum + m.totalQuestions,
      0,
    );
    const passedSkills = iterationMetrics.reduce(
      (sum, m) => sum + m.passedSkills,
      0,
    );
    const conceptPreservedQuestions = iterationMetrics.reduce(
      (sum, m) => sum + m.conceptPreservedQuestions,
      0,
    );
    const agreedSkills = iterationMetrics.reduce(
      (sum, m) => sum + m.agreedSkills,
      0,
    );

    // Merge skill count distributions
    const skillCountDistribution: Record<number, number> = {};

    for (const metrics of iterationMetrics) {
      for (const [count, num] of Object.entries(
        metrics.skillCountDistribution,
      )) {
        skillCountDistribution[Number(count)] =
          (skillCountDistribution[Number(count)] || 0) + num;
      }
    }

    // Sum confusion matrix values
    const truePositives = iterationMetrics.reduce(
      (sum, m) => sum + m.truePositives,
      0,
    );
    const falsePositives = iterationMetrics.reduce(
      (sum, m) => sum + m.falsePositives,
      0,
    );

    return {
      totalSkills,
      passedSkills,
      passRate: passRate.mean,
      totalQuestions,
      conceptPreservedQuestions,
      conceptPreservationRate: conceptPreservationRate.mean,
      agreedSkills,
      totalEvaluatedSkills: totalSkills,
      overallAgreementRate: overallAgreementRate.mean,
      skillCountDistribution,
      truePositives,
      falsePositives,
    };
  }

  /**
   * Calculate statistics (mean, min, max, stdDev) for an array of numbers
   *
   * @param values - Array of numeric values
   * @returns Statistical summary
   */
  private calculateStatistics(values: number[]): {
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

    // Calculate standard deviation
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Number(mean.toFixed(4)),
      min: Number(min.toFixed(4)),
      max: Number(max.toFixed(4)),
      stdDev: Number(stdDev.toFixed(4)),
    };
  }

  /**
   * Ensure the directory structure exists for a test set
   *
   * Creates: metrics/, records/, cost/, final-metrics/, final-cost/
   *
   * @param testSetName - Test set identifier
   */
  async ensureDirectoryStructure(testSetName: string): Promise<void> {
    const baseDir = path.join(this.baseDir, testSetName);
    const subdirs = [
      'metrics',
      'records',
      'cost',
      'final-metrics',
      'final-cost',
    ];

    for (const subdir of subdirs) {
      const dirPath = path.join(baseDir, subdir);
      await FileHelper.saveJson(path.join(dirPath, '.gitkeep'), '');
    }

    this.logger.log(
      `Ensured directory structure for ${testSetName} at ${baseDir}`,
    );
  }
}
