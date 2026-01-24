import { Injectable, Logger, Optional } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import { AnswerSynthesisJudgeEvaluator } from '../evaluators/answer-synthesis-judge.evaluator';
import type {
  AnswerSynthesisComparisonRecord,
  AnswerSynthesisEvaluationConfig,
  AnswerSynthesisProgressEntry,
  AnswerSynthesisProgressFile,
  AnswerSynthesisTestCase,
} from '../types/answer-synthesis.types';
import { AnswerSynthesisHashUtil } from '../utils/answer-synthesis-hash.util';
import { AnswerSynthesisComparisonService } from './answer-synthesis-comparison.service';
import { AnswerSynthesisLowFaithfulnessAnalyzerService } from './answer-synthesis-low-faithfulness-analyzer.service';
import { AnswerSynthesisResultManagerService } from './answer-synthesis-result-manager.service';

// ============================================================================
// ANSWER SYNTHESIS EVALUATION RUNNER SERVICE
// ============================================================================

/**
 * Main orchestrator for answer synthesis evaluation.
 *
 * This service coordinates the entire evaluation pipeline:
 * 1. Load and transform test sets
 * 2. Evaluate samples with judge LLM
 * 3. Compare system vs judge results
 * 4. Calculate metrics and analyze patterns
 * 5. Save all results to files
 * 6. Track progress for crash recovery
 *
 * Progress tracking is done at QUESTION level (one entry per queryLogId).
 */
@Injectable()
export class AnswerSynthesisRunnerService {
  private readonly logger = new Logger(AnswerSynthesisRunnerService.name);
  private readonly baseDir: string;

  constructor(
    private readonly judgeEvaluator: AnswerSynthesisJudgeEvaluator,
    private readonly comparisonService: AnswerSynthesisComparisonService,
    private readonly lowFaithfulnessAnalyzer: AnswerSynthesisLowFaithfulnessAnalyzerService,
    private readonly resultManager: AnswerSynthesisResultManagerService,
    @Optional() baseDir?: string,
  ) {
    this.baseDir = baseDir ?? 'data/evaluation/answer-synthesis';
  }

  /**
   * Run a complete evaluation for a test set.
   *
   * @param testCases - Test cases with question, context, and answer
   * @param config - Evaluation configuration
   * @returns Complete evaluation results
   */
  async runEvaluation(params: {
    testCases: AnswerSynthesisTestCase[];
    config: AnswerSynthesisEvaluationConfig;
  }): Promise<{
    records: AnswerSynthesisComparisonRecord[];
  }> {
    const { testCases, config } = params;

    this.logger.log(
      `'${config.outputDirectory}': Starting evaluation for ${testCases.length} questions`,
    );

    // Ensure directory structure
    await this.resultManager.ensureDirectoryStructure(config.outputDirectory);

    // For multi-iteration evaluation, run each iteration
    const iterations = config.iterations ?? 1;
    this.logger.log(
      `'${config.outputDirectory}': Running ${iterations} iteration(s)`,
    );

    const allRecords: AnswerSynthesisComparisonRecord[][] = [];

    for (let iter = 1; iter <= iterations; iter++) {
      this.logger.log(
        `'${config.outputDirectory}': Starting iteration ${iter}/${iterations}`,
      );

      const records = await this.runIteration({
        iterationNumber: iter,
        testCases,
        config,
      });

      allRecords.push(records);
    }

    // Calculate and save final metrics
    const perIterationMetrics = allRecords.map((records, index) =>
      this.resultManager.calculateIterationMetrics({
        iterationNumber: index + 1,
        records,
        config: {
          systemPromptVersion: config.systemPromptVersion,
          judgeModel: config.judgeModel,
          judgeProvider: config.judgeProvider,
        },
      }),
    );

    const finalMetrics = this.resultManager.calculateFinalMetrics({
      testSetName: config.outputDirectory,
      totalIterations: iterations,
      perIterationMetrics,
    });

    await this.resultManager.saveFinalMetrics({
      testSetName: config.outputDirectory,
      totalIterations: iterations,
      metrics: finalMetrics,
    });

    // Calculate and save final cost
    const perIterationCosts = allRecords.map((records, index) =>
      this.resultManager.calculateIterationCost({
        iterationNumber: index + 1,
        testSetName: config.outputDirectory,
        records,
        config: {
          judgeModel: config.judgeModel,
          judgeProvider: config.judgeProvider,
        },
      }),
    );

    const finalCost = this.resultManager.calculateFinalCost({
      testSetName: config.outputDirectory,
      totalIterations: iterations,
      perIterationCosts,
    });

    await this.resultManager.saveFinalCost({
      testSetName: config.outputDirectory,
      totalIterations: iterations,
      cost: finalCost,
    });

    this.logger.log(
      `'${config.outputDirectory}': Evaluation complete (${iterations} iteration(s))`,
    );

    return {
      records: allRecords.flat(),
    };
  }

  /**
   * Run a single iteration of evaluation.
   *
   * @param iterationNumber - Current iteration number
   * @param testCases - Test cases to evaluate
   * @param config - Evaluation configuration
   * @returns Comparison records for this iteration
   */
  async runIteration(params: {
    iterationNumber: number;
    testCases: AnswerSynthesisTestCase[];
    config: AnswerSynthesisEvaluationConfig;
  }): Promise<AnswerSynthesisComparisonRecord[]> {
    const { iterationNumber, testCases, config } = params;

    const testSetName = config.outputDirectory;

    this.logger.log(
      `'${testSetName}': Iteration ${iterationNumber}: Evaluating ${testCases.length} questions`,
    );

    // Initialize or load progress
    const progressFile = await this.loadOrCreateProgress(
      testSetName,
      iterationNumber,
      testCases.length,
    );
    const completedHashes = new Set(progressFile.entries.map((e) => e.hash));

    // Filter out completed test cases
    const pendingTestCases = testCases.filter((tc) => {
      const hash = AnswerSynthesisHashUtil.generate({
        queryLogId: tc.queryLogId,
      });
      return !completedHashes.has(hash);
    });

    this.logger.log(
      `'${testSetName}': ${pendingTestCases.length} pending, ${testCases.length - pendingTestCases.length} already completed`,
    );

    if (pendingTestCases.length === 0) {
      this.logger.log(
        `'${testSetName}': All questions already evaluated, loading results...`,
      );
      // Load and return existing results
      return this.loadIterationResults(testSetName, iterationNumber);
    }

    // Evaluate pending test cases
    const records: AnswerSynthesisComparisonRecord[] = [];

    for (const testCase of pendingTestCases) {
      const hash = AnswerSynthesisHashUtil.generate({
        queryLogId: testCase.queryLogId,
      });

      try {
        // Call evaluator
        const judgeResult = await this.judgeEvaluator.evaluate(
          testCase,
          config.judgeModel,
        );

        // Compare
        const record = this.comparisonService.compareSample(
          testCase,
          judgeResult,
        );
        records.push(record);

        // Update progress
        const progressEntry: AnswerSynthesisProgressEntry = {
          hash,
          queryLogId: testCase.queryLogId,
          question: testCase.question,
          completedAt: new Date().toISOString(),
          result: {
            faithfulnessScore: record.judgeVerdict.faithfulness.score,
            completenessScore: record.judgeVerdict.completeness.score,
            passed: record.passed,
          },
        };

        progressFile.entries.push(progressEntry);
        progressFile.statistics.completedQuestions++;
        progressFile.statistics.pendingQuestions--;
        progressFile.statistics.completionPercentage =
          (progressFile.statistics.completedQuestions /
            progressFile.statistics.totalQuestions) *
          100;
        progressFile.lastUpdated = new Date().toISOString();

        // Save progress after EVERY sample for maximum crash recovery
        // I/O overhead (~1-5ms) is negligible compared to LLM evaluation (~1-5s)
        await this.saveProgress(testSetName, iterationNumber, progressFile);

        // NOTE: Records are NOT saved incrementally because that would overwrite
        // the file with only current records. Records are saved at the END after
        // combining with existing records from previous runs.

        const QUESTION_PREVIEW_LENGTH = 30;
        this.logger.debug(
          `'${testSetName}': Evaluated "${testCase.question.substring(0, QUESTION_PREVIEW_LENGTH)}..." → score=${record.overallScore.toFixed(2)}, passed=${record.passed}`,
        );
      } catch (error) {
        this.logger.error(
          `'${testSetName}': Error evaluating ${testCase.queryLogId}: ${error}`,
        );
        throw error;
      }
    }

    // Save final progress
    await this.saveProgress(testSetName, iterationNumber, progressFile);

    // Combine with previously completed records
    const allRecords = await this.combineWithCompletedRecords(
      testSetName,
      iterationNumber,
      records,
    );

    // Calculate and save metrics
    const metrics = this.resultManager.calculateIterationMetrics({
      iterationNumber,
      records: allRecords,
      config: {
        systemPromptVersion: config.systemPromptVersion,
        judgeModel: config.judgeModel,
        judgeProvider: config.judgeProvider,
      },
    });

    await this.resultManager.saveIterationMetrics({
      testSetName,
      iterationNumber,
      metrics,
    });

    // Calculate and save cost
    const cost = this.resultManager.calculateIterationCost({
      iterationNumber,
      testSetName,
      records: allRecords,
      config: {
        judgeModel: config.judgeModel,
        judgeProvider: config.judgeProvider,
      },
    });

    await this.resultManager.saveIterationCost({
      testSetName,
      iterationNumber,
      cost,
    });

    // Analyze low-faithfulness patterns
    const lowFaithfulnessAnalysis =
      this.lowFaithfulnessAnalyzer.analyzeLowFaithfulness(allRecords);

    await this.resultManager.saveLowFaithfulness({
      testSetName,
      iterationNumber,
      lowFaithfulness: lowFaithfulnessAnalysis,
    });

    // Save records
    await this.resultManager.saveIterationRecords({
      testSetName,
      iterationNumber,
      records: allRecords,
    });

    this.logger.log(
      `'${testSetName}': Iteration ${iterationNumber} complete: ${allRecords.length} records`,
    );

    return allRecords;
  }

  /**
   * Load existing progress file or create new one.
   */
  private async loadOrCreateProgress(
    testSetName: string,
    iterationNumber: number,
    totalQuestions: number,
  ): Promise<AnswerSynthesisProgressFile> {
    const progressPath = this.getProgressPath(testSetName, iterationNumber);

    try {
      const existing =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);
      this.logger.log(`'${testSetName}': Loaded existing progress file`);
      return existing;
    } catch {
      // Create new progress file
      const newProgress: AnswerSynthesisProgressFile = {
        testSetName,
        iterationNumber,
        entries: [],
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalQuestions,
          completedQuestions: 0,
          pendingQuestions: totalQuestions,
          completionPercentage: 0,
        },
      };

      // Ensure directory exists and save
      await FileHelper.saveJson(
        path.join(path.dirname(progressPath), '.gitkeep'),
        '',
      );
      await FileHelper.saveJson(progressPath, newProgress);

      this.logger.log(`'${testSetName}': Created new progress file`);
      return newProgress;
    }
  }

  /**
   * Save progress file.
   */
  private async saveProgress(
    testSetName: string,
    iterationNumber: number,
    progressFile: AnswerSynthesisProgressFile,
  ): Promise<void> {
    const progressPath = this.getProgressPath(testSetName, iterationNumber);
    await FileHelper.saveJson(progressPath, progressFile);
  }

  /**
   * Get path to progress file.
   */
  private getProgressPath(
    testSetName: string,
    iterationNumber: string | number,
  ): string {
    return path.join(
      this.baseDir,
      testSetName,
      `iteration-${iterationNumber}`,
      '.progress.json',
    );
  }

  /**
   * Load iteration results from file.
   */
  private async loadIterationResults(
    testSetName: string,
    iterationNumber: number,
  ): Promise<AnswerSynthesisComparisonRecord[]> {
    const recordsPath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `records-iteration-${iterationNumber}.json`,
    );

    try {
      const records =
        await FileHelper.loadJson<AnswerSynthesisComparisonRecord[]>(
          recordsPath,
        );
      this.logger.log(
        `'${testSetName}': Loaded ${records.length} existing records`,
      );
      return records;
    } catch {
      this.logger.warn(`'${testSetName}': No existing records found`);
      return [];
    }
  }

  /**
   * Combine new records with previously completed records.
   */
  private async combineWithCompletedRecords(
    testSetName: string,
    iterationNumber: number,
    newRecords: AnswerSynthesisComparisonRecord[],
  ): Promise<AnswerSynthesisComparisonRecord[]> {
    const existingRecords = await this.loadIterationResults(
      testSetName,
      iterationNumber,
    );

    // Create map of existing records by queryLogId
    const existingByQueryId = new Map(
      existingRecords.map((r) => [r.queryLogId, r]),
    );

    // Add new records (replace existing if any)
    for (const record of newRecords) {
      existingByQueryId.set(record.queryLogId, record);
    }

    return Array.from(existingByQueryId.values());
  }
}
