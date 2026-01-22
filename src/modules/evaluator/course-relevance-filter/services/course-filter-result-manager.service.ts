import { Injectable, Logger } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import type {
  DisagreementsFile,
  ExploratoryDeltaFile,
  FinalMetricsFile,
  MetricsFile,
  SampleEvaluationRecord,
} from '../types/course-relevance-filter.types';
import { DisagreementAnalyzerService } from './disagreement-analyzer.service';
import { CourseFilterMetricsCalculator } from './metrics-calculator.service';

// ============================================================================
// COURSE FILTER RESULT MANAGER SERVICE
// ============================================================================

/**
 * Service for managing evaluation result files
 *
 * Handles all file I/O operations for course relevance filter evaluations,
 * including saving records, metrics, disagreements analysis, exploratory
 * delta analysis, and calculating aggregate metrics across iterations.
 *
 * Output structure:
 * data/evaluation/course-relevance-filter/
 * └── {testSetName}/
 *     ├── metrics/
 *     │   └── metrics-iteration-{N}.json
 *     ├── records/
 *     │   └── records-iteration-{N}.json
 *     ├── disagreements/
 *     │   └── disagreements-iteration-{N}.json
 *     ├── exploratory-delta/
 *     │   └── exploratory-delta-iteration-{N}.json
 *     └── final-metrics/
 *         └── final-metrics-{totalIterations}.json
 */
@Injectable()
export class CourseFilterResultManagerService {
  private readonly logger = new Logger(CourseFilterResultManagerService.name);
  private readonly baseDir = 'data/evaluation/course-relevance-filter';

  constructor(
    private readonly metricsCalculator: CourseFilterMetricsCalculator,
    private readonly disagreementAnalyzer: DisagreementAnalyzerService,
  ) {}

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
    this.logger.log(
      `Saved ${records.length} samples (${records.reduce((sum, r) => sum + r.courses.length, 0)} courses) to ${filePath}`,
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
    metrics: MetricsFile;
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
   * Save disagreements analysis to file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param disagreements - Disagreements analysis for this iteration
   */
  async saveDisagreements(params: {
    testSetName: string;
    iterationNumber: number;
    disagreements: DisagreementsFile;
  }): Promise<void> {
    const { testSetName, iterationNumber, disagreements } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'disagreements',
      `disagreements-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, disagreements);
    this.logger.log(`Saved disagreements analysis to ${filePath}`);
  }

  /**
   * Save exploratory delta analysis to file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Current iteration number
   * @param exploratoryDelta - Exploratory delta analysis for this iteration
   */
  async saveExploratoryDelta(params: {
    testSetName: string;
    iterationNumber: number;
    exploratoryDelta: ExploratoryDeltaFile;
  }): Promise<void> {
    const { testSetName, iterationNumber, exploratoryDelta } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'exploratory-delta',
      `exploratory-delta-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, exploratoryDelta);
    this.logger.log(`Saved exploratory delta analysis to ${filePath}`);
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
    metrics: FinalMetricsFile;
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
   * Calculate metrics for a single iteration
   *
   * @param iterationNumber - Current iteration number
   * @param records - Evaluation records for this iteration
   * @returns Metrics file output
   */
  calculateIterationMetrics(params: {
    iterationNumber: number;
    records: SampleEvaluationRecord[];
  }): MetricsFile {
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
   * Calculate disagreements analysis for a single iteration
   *
   * @param records - Evaluation records for this iteration
   * @returns Disagreements file output
   */
  calculateDisagreements(params: {
    records: SampleEvaluationRecord[];
  }): DisagreementsFile {
    const { records } = params;

    return this.disagreementAnalyzer.analyzeDisagreements(records);
  }

  /**
   * Calculate exploratory delta analysis for a single iteration
   *
   * @param records - Evaluation records for this iteration
   * @returns Exploratory delta file output
   */
  calculateExploratoryDelta(params: {
    records: SampleEvaluationRecord[];
  }): ExploratoryDeltaFile {
    const { records } = params;

    return this.disagreementAnalyzer.analyzeExploratoryDelta(records);
  }

  /**
   * Calculate final aggregated metrics across all iterations
   *
   * Loads existing iteration metrics files and calculates
   * statistical summary (mean, min, max, stdDev).
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @returns Final aggregated metrics
   */
  async calculateFinalMetrics(params: {
    testSetName: string;
    totalIterations: number;
  }): Promise<FinalMetricsFile> {
    const { testSetName, totalIterations } = params;

    // Load all iteration metrics files
    const iterationMetrics: MetricsFile[] = [];
    for (let i = 1; i <= totalIterations; i++) {
      try {
        const filePath = path.join(
          this.baseDir,
          testSetName,
          'metrics',
          `metrics-iteration-${i}.json`,
        );
        const metrics = await FileHelper.loadJson<MetricsFile>(filePath);
        iterationMetrics.push(metrics);
      } catch (error) {
        this.logger.warn(`Failed to load metrics for iteration ${i}: ${error}`);
      }
    }

    if (iterationMetrics.length === 0) {
      throw new Error('No iteration metrics found to aggregate');
    }

    // Calculate aggregates for overallAgreementRate
    const agreementValues = iterationMetrics.map(
      (m) => m.overallAgreementRate.value,
    );
    const overallAgreementRate = this.calculateStatistics(agreementValues);

    // Calculate aggregates for noiseRemovalEfficiency
    const noiseRemovalValues = iterationMetrics.map(
      (m) => m.noiseRemovalEfficiency.value,
    );
    const noiseRemovalEfficiency = this.calculateStatistics(noiseRemovalValues);

    // Calculate aggregates for exploratoryRecall
    const exploratoryRecallValues = iterationMetrics.map(
      (m) => m.exploratoryRecall.value,
    );
    const exploratoryRecall = this.calculateStatistics(exploratoryRecallValues);

    return {
      iterations: iterationMetrics.length,
      timestamp: new Date().toISOString(),
      aggregateMetrics: {
        overallAgreementRate,
        noiseRemovalEfficiency,
        exploratoryRecall,
      },
      perIterationMetrics: iterationMetrics,
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
   * Creates: metrics/, records/, disagreements/, exploratory-delta/, final-metrics/
   *
   * @param testSetName - Test set identifier
   */
  async ensureDirectoryStructure(testSetName: string): Promise<void> {
    const baseDir = path.join(this.baseDir, testSetName);
    const subdirs = [
      'metrics',
      'records',
      'disagreements',
      'exploratory-delta',
      'final-metrics',
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
