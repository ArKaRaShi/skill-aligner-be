import { Injectable, Logger } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import { AggregationService } from '../metrics/aggregation.service';
import {
  AggregateMetrics,
  ContextMismatchEntry,
  EnhancedIterationMetrics,
  FinalMetrics,
  SkillMetrics,
  TestCaseMetrics,
} from '../test-sets/test-set.type';
import { EvaluateRetrieverOutput } from '../types/course-retrieval.types';

/**
 * Service for managing evaluation result files
 *
 * Handles all file I/O operations for course retriever evaluations,
 * including saving records, metrics, context mismatches, and
 * calculating aggregate metrics across iterations.
 *
 * Output structure:
 * data/evaluation/course-retriever/
 * └── {testSetName}/
 *     ├── metrics/
 *     │   └── metrics-iteration-{N}.json
 *     ├── records/
 *     │   └── records-iteration-{N}.json
 *     ├── aggregate-metrics/
 *     │   └── final-metrics-{totalIterations}-{testSetSize}.json
 *     └── misalignments/
 *         └── context-mismatches.json
 */
@Injectable()
export class EvaluationResultManagerService {
  private readonly logger = new Logger(EvaluationResultManagerService.name);
  private readonly baseDir = 'data/evaluation/course-retriever';

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
   * Calculate metrics for a single iteration (three-level aggregation)
   *
   * Groups records by test case ID and produces both macro and micro averages
   * at the iteration level, along with test case level metrics.
   *
   * @param params - Iteration parameters and evaluation records
   * @returns Enhanced iteration metrics with macro/micro/pooled breakdown
   */
  calculateIterationMetrics(params: {
    iterationNumber: number;
    records: Array<EvaluateRetrieverOutput & { testCaseId?: string }>;
  }): EnhancedIterationMetrics {
    const { iterationNumber, records } = params;

    if (records.length === 0) {
      throw new Error('Cannot calculate metrics for empty records array');
    }

    // Group records by test case ID (if provided)
    const groupedByTestCase = new Map<string, EvaluateRetrieverOutput[]>();
    for (const record of records) {
      const testCaseId =
        record.testCaseId ?? `unknown-${records.indexOf(record)}`;
      if (!groupedByTestCase.has(testCaseId)) {
        groupedByTestCase.set(testCaseId, []);
      }
      groupedByTestCase.get(testCaseId)!.push(record);
    }

    // Convert each record to SkillMetrics and group by test case
    const testCaseMetrics: TestCaseMetrics[] = [];

    for (const [testCaseId, testCaseRecords] of groupedByTestCase.entries()) {
      // Convert each record to SkillMetrics
      const skillMetrics: SkillMetrics[] = testCaseRecords.map(
        (record) =>
          ({
            ...record.metrics,
            courseCount: record.retrievedCount,
            skillName: record.skill,
            evaluations: record.evaluations.map((e) => ({
              subjectCode: e.subjectCode,
              subjectName: e.subjectName,
              skillRelevance: e.skillRelevance,
              skillReason: e.skillReason,
              contextAlignment: e.contextAlignment,
              contextReason: e.contextReason,
            })),
          }) as SkillMetrics,
      );

      // Aggregate to test case level
      const testCaseMetric = AggregationService.aggregateToTestCaseLevel(
        testCaseId,
        testCaseRecords[0]?.question ?? '',
        skillMetrics,
      );
      testCaseMetrics.push(testCaseMetric);
    }

    // Calculate total tokens
    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = records.reduce(
      (sum, r) => sum + r.outputTokens,
      0,
    );

    // Aggregate to iteration level
    const iterationLevel = AggregationService.aggregateToIterationLevel(
      iterationNumber,
      testCaseMetrics,
    );

    return {
      iterationNumber,
      totalCases: testCaseMetrics.length,
      totalInputTokens,
      totalOutputTokens,
      timestamp: new Date().toISOString(),
      macroAvg: iterationLevel.macroAvg,
      microAvg: iterationLevel.microAvg,
      pooled: iterationLevel.pooled,
      totalContextMismatches: iterationLevel.totalContextMismatches,
      testCaseMetrics,
    };
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

    // Ensure directory exists
    const dirPath = path.join(this.baseDir, testSetName, 'test-case-metrics');
    await FileHelper.saveJson(path.join(dirPath, '.gitkeep'), '');

    // Save to file
    const filePath = path.join(
      dirPath,
      `test-case-metrics-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, testCaseMetrics);
    this.logger.log(
      `Saved ${testCaseMetrics.length} test case metrics to ${filePath}`,
    );
  }

  /**
   * Calculate aggregate metrics across all iterations
   *
   * Loads existing iteration metrics files and calculates
   * statistical summary (mean, min, max) for both macro and micro averages.
   *
   * @param testSetName - Test set identifier
   * @param totalIterations - Total number of iterations
   * @param testSetSize - Number of test cases per iteration
   * @returns Aggregated metrics across all iterations
   */
  async calculateAggregateMetrics(params: {
    testSetName: string;
    totalIterations: number;
    testSetSize: number;
  }): Promise<AggregateMetrics> {
    const { testSetName, totalIterations, testSetSize } = params;

    // Load all iteration metrics files
    const iterationMetrics: EnhancedIterationMetrics[] = [];
    for (let i = 1; i <= totalIterations; i++) {
      try {
        const filePath = path.join(
          this.baseDir,
          testSetName,
          'metrics',
          `metrics-iteration-${i}.json`,
        );
        const metrics =
          await FileHelper.loadJson<EnhancedIterationMetrics>(filePath);
        iterationMetrics.push(metrics);
      } catch (error) {
        this.logger.warn(`Failed to load metrics for iteration ${i}: ${error}`);
      }
    }

    if (iterationMetrics.length === 0) {
      throw new Error('No iteration metrics found to aggregate');
    }

    // Calculate macro aggregates
    const macroSumSkillRelevance = iterationMetrics.reduce(
      (sum, m) => sum + m.macroAvg.averageSkillRelevance,
      0,
    );
    const macroSumContextAlignment = iterationMetrics.reduce(
      (sum, m) => sum + m.macroAvg.averageContextAlignment,
      0,
    );
    const macroSumAlignmentGap = iterationMetrics.reduce(
      (sum, m) => sum + m.macroAvg.alignmentGap,
      0,
    );
    const macroSumMismatchRate = iterationMetrics.reduce(
      (sum, m) => sum + m.macroAvg.contextMismatchRate,
      0,
    );

    const macroMeanSkillRelevance = Number(
      (macroSumSkillRelevance / iterationMetrics.length).toFixed(3),
    );
    const macroMinSkillRelevance = Number(
      Math.min(
        ...iterationMetrics.map((m) => m.macroAvg.averageSkillRelevance),
      ).toFixed(3),
    );
    const macroMaxSkillRelevance = Number(
      Math.max(
        ...iterationMetrics.map((m) => m.macroAvg.averageSkillRelevance),
      ).toFixed(3),
    );

    const macroMeanContextAlignment = Number(
      (macroSumContextAlignment / iterationMetrics.length).toFixed(3),
    );
    const macroMinContextAlignment = Number(
      Math.min(
        ...iterationMetrics.map((m) => m.macroAvg.averageContextAlignment),
      ).toFixed(3),
    );
    const macroMaxContextAlignment = Number(
      Math.max(
        ...iterationMetrics.map((m) => m.macroAvg.averageContextAlignment),
      ).toFixed(3),
    );

    const macroMeanAlignmentGap = Number(
      (macroSumAlignmentGap / iterationMetrics.length).toFixed(3),
    );
    const macroMeanMismatchRate = Number(
      (macroSumMismatchRate / iterationMetrics.length).toFixed(1),
    );

    // Calculate micro aggregates
    const microSumSkillRelevance = iterationMetrics.reduce(
      (sum, m) => sum + m.microAvg.averageSkillRelevance,
      0,
    );
    const microSumContextAlignment = iterationMetrics.reduce(
      (sum, m) => sum + m.microAvg.averageContextAlignment,
      0,
    );
    const microSumAlignmentGap = iterationMetrics.reduce(
      (sum, m) => sum + m.microAvg.alignmentGap,
      0,
    );
    const microSumMismatchRate = iterationMetrics.reduce(
      (sum, m) => sum + m.microAvg.contextMismatchRate,
      0,
    );

    const microMeanSkillRelevance = Number(
      (microSumSkillRelevance / iterationMetrics.length).toFixed(3),
    );
    const microMinSkillRelevance = Number(
      Math.min(
        ...iterationMetrics.map((m) => m.microAvg.averageSkillRelevance),
      ).toFixed(3),
    );
    const microMaxSkillRelevance = Number(
      Math.max(
        ...iterationMetrics.map((m) => m.microAvg.averageSkillRelevance),
      ).toFixed(3),
    );

    const microMeanContextAlignment = Number(
      (microSumContextAlignment / iterationMetrics.length).toFixed(3),
    );
    const microMinContextAlignment = Number(
      Math.min(
        ...iterationMetrics.map((m) => m.microAvg.averageContextAlignment),
      ).toFixed(3),
    );
    const microMaxContextAlignment = Number(
      Math.max(
        ...iterationMetrics.map((m) => m.microAvg.averageContextAlignment),
      ).toFixed(3),
    );

    const microMeanAlignmentGap = Number(
      (microSumAlignmentGap / iterationMetrics.length).toFixed(3),
    );
    const microMeanMismatchRate = Number(
      (microSumMismatchRate / iterationMetrics.length).toFixed(1),
    );

    return {
      testSetName,
      totalIterations: iterationMetrics.length,
      testSetSize,
      macro: {
        meanSkillRelevance: macroMeanSkillRelevance,
        minSkillRelevance: macroMinSkillRelevance,
        maxSkillRelevance: macroMaxSkillRelevance,
        meanContextAlignment: macroMeanContextAlignment,
        minContextAlignment: macroMinContextAlignment,
        maxContextAlignment: macroMaxContextAlignment,
        meanAlignmentGap: macroMeanAlignmentGap,
        meanMismatchRate: macroMeanMismatchRate,
      },
      micro: {
        meanSkillRelevance: microMeanSkillRelevance,
        minSkillRelevance: microMinSkillRelevance,
        maxSkillRelevance: microMaxSkillRelevance,
        meanContextAlignment: microMeanContextAlignment,
        minContextAlignment: microMinContextAlignment,
        maxContextAlignment: microMaxContextAlignment,
        meanAlignmentGap: microMeanAlignmentGap,
        meanMismatchRate: microMeanMismatchRate,
      },
      iterationMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build final metrics from aggregate metrics
   *
   * Converts AggregateMetrics to FinalMetrics format for the top-level file.
   *
   * @param aggregate - Aggregated metrics
   * @returns Final metrics in the correct format
   */
  buildFinalMetrics(aggregate: AggregateMetrics): FinalMetrics {
    return {
      testSetName: aggregate.testSetName,
      totalIterations: aggregate.totalIterations,
      testSetSize: aggregate.testSetSize,
      macroOverall: {
        meanSkillRelevance: aggregate.macro.meanSkillRelevance,
        meanContextAlignment: aggregate.macro.meanContextAlignment,
        meanAlignmentGap: aggregate.macro.meanAlignmentGap,
        meanMismatchRate: aggregate.macro.meanMismatchRate,
      },
      microOverall: {
        meanSkillRelevance: aggregate.micro.meanSkillRelevance,
        meanContextAlignment: aggregate.micro.meanContextAlignment,
        meanAlignmentGap: aggregate.micro.meanAlignmentGap,
        meanMismatchRate: aggregate.micro.meanMismatchRate,
      },
      iterationMetrics: aggregate.iterationMetrics,
      timestamp: aggregate.timestamp,
    };
  }

  /**
   * Extract context mismatches from evaluation records
   *
   * Converts evaluation results with context mismatches into
   * ContextMismatchEntry objects for tracking.
   *
   * @param records - Evaluation records
   * @param iterationNumber - Current iteration number
   * @returns Array of context mismatch entries
   */
  extractContextMismatches(params: {
    records: EvaluateRetrieverOutput[];
    iterationNumber: number;
  }): ContextMismatchEntry[] {
    const { records, iterationNumber } = params;
    const entries: ContextMismatchEntry[] = [];

    for (const record of records) {
      if (record.metrics.contextMismatchCourses.length > 0) {
        entries.push({
          timestamp: new Date().toISOString(),
          question: record.question,
          skill: record.skill,
          retrievedCount: record.retrievedCount,
          mismatches: record.metrics.contextMismatchCourses.map((m) => ({
            subjectCode: m.subjectCode,
            subjectName: m.subjectName,
            skillRelevance: m.skillRelevance,
            contextAlignment: m.contextAlignment,
          })),
          iterationNumber,
        });
      }
    }

    return entries;
  }

  /**
   * Ensure the directory structure exists for a test set
   *
   * Creates: metrics/, records/, aggregate-metrics/, misalignments/
   *
   * @param testSetName - Test set identifier
   */
  async ensureDirectoryStructure(testSetName: string): Promise<void> {
    const baseDir = path.join(this.baseDir, testSetName);
    const subdirs = [
      'metrics',
      'records',
      'aggregate-metrics',
      'misalignments',
    ];

    for (const subdir of subdirs) {
      const dirPath = path.join(baseDir, subdir);
      await FileHelper.saveJson(path.join(dirPath, '.gitkeep'), '');
    }

    this.logger.log(`Ensured directory structure for ${testSetName}`);
  }
}
